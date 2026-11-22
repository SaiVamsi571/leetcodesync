/**
 * GitHub REST and Git Data API client for LeetCodeSync (FR-11 to FR-14).
 * Performs atomic multi-file commits using Git Data API:
 * Blobs -> Tree -> Commit -> Reference update.
 */

export class GitHubClient {
  /**
   * @param {Object} options
   * @param {string} options.token - GitHub fine-grained PAT
   * @param {string} options.owner - Repository owner
   * @param {string} options.repo - Repository name
   * @param {string} [options.branch="main"] - Target branch
   * @param {string} [options.baseUrl="https://api.github.com"] - Base API URL
   */
  constructor({ token, owner, repo, branch = 'main', baseUrl = 'https://api.github.com' }) {
    this.token = token?.trim();
    this.owner = owner?.trim();
    this.repo = repo?.trim();
    this.branch = branch?.trim() || 'main';
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Internal request wrapper with headers & error handling.
   * @private
   */
  async _request(path, method = 'GET', body = null) {
    if (!this.token) {
      throw new Error('GitHub Personal Access Token is required.');
    }

    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${this.token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const options = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (response.status === 401) {
      throw new Error('GitHub authentication failed: Invalid or expired token.');
    }
    if (response.status === 404) {
      throw new Error(`GitHub resource not found at ${path}. Verify repository and branch exist.`);
    }
    if (response.status === 403 || response.status === 429) {
      const rateLimitReset = response.headers.get('x-ratelimit-reset');
      throw new Error(`GitHub API rate limit exceeded or access forbidden. Reset at: ${rateLimitReset || 'unknown'}`);
    }
    if (!response.ok) {
      let errorMsg = `GitHub API error (${response.status}): ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson.message) {
          errorMsg = `GitHub API error: ${errJson.message}`;
        }
      } catch (_) {
        // ignore JSON parse error
      }
      throw new Error(errorMsg);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  }

  /**
   * Test connection and permissions to the repository.
   * @returns {Promise<{ success: boolean, login: string, repo: string, defaultBranch: string }>}
   */
  async testConnection() {
    const user = await this._request('/user');
    const repoData = await this._request(`/repos/${this.owner}/${this.repo}`);
    return {
      success: true,
      login: user.login,
      repo: repoData.full_name,
      defaultBranch: repoData.default_branch,
      permissions: repoData.permissions
    };
  }

  /**
   * Get target branch reference (head commit SHA).
   * @returns {Promise<string>}
   */
  async getBranchHeadSha() {
    const refData = await this._request(`/repos/${this.owner}/${this.repo}/git/ref/heads/${this.branch}`);
    return refData.object.sha;
  }

  /**
   * Get base tree SHA for a given commit SHA.
   * @param {string} commitSha
   * @returns {Promise<string>}
   */
  async getCommitTreeSha(commitSha) {
    const commitData = await this._request(`/repos/${this.owner}/${this.repo}/git/commits/${commitSha}`);
    return commitData.tree.sha;
  }

  /**
   * Calculate Git blob SHA-1 hash for a string content.
   * Format: sha1("blob " + size + "\0" + content)
   * @param {string} content
   * @returns {Promise<string>}
   */
  async calculateGitBlobSha(content) {
    const encoder = new TextEncoder();
    const contentBytes = encoder.encode(content);
    const header = encoder.encode(`blob ${contentBytes.length}\0`);
    
    const fullBuffer = new Uint8Array(header.length + contentBytes.length);
    fullBuffer.set(header);
    fullBuffer.set(contentBytes, header.length);

    // crypto.subtle is available in browser and Node.js >= 19
    const hashBuffer = await crypto.subtle.digest('SHA-1', fullBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create a Git blob for file content.
   * @param {string} content
   * @returns {Promise<string>} Blob SHA
   */
  async createBlob(content) {
    const blobData = await this._request(`/repos/${this.owner}/${this.repo}/git/blobs`, 'POST', {
      content,
      encoding: 'utf-8'
    });
    return blobData.sha;
  }

  /**
   * Fetch file metadata if it exists in the repo tree.
   * @param {string} path
   * @returns {Promise<{ sha: string, content?: string } | null>}
   */
  async getFileMetadata(path) {
    try {
      const data = await this._request(`/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(path)}?ref=${this.branch}`);
      return {
        sha: data.sha,
        size: data.size
      };
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('404')) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Atomic commit of multiple files (e.g. README.md and solution file) using Git Data API.
   * Checks file SHAs to avoid redundant zero-diff commits (FR-09, FR-11).
   * 
   * @param {Object} params
   * @param {string} params.commitMessage
   * @param {Array<{ path: string, content: string }>} params.files
   * @returns {Promise<{ committed: boolean, commitSha?: string, commitUrl?: string, reason?: string }>}
   */
  async commitFiles({ commitMessage, files }) {
    if (!files || files.length === 0) {
      return { committed: false, reason: 'no_files' };
    }

    // 1. Get Head commit and Base Tree SHA
    const headCommitSha = await this.getBranchHeadSha();
    const baseTreeSha = await this.getCommitTreeSha(headCommitSha);

    // 2. Check if all target files already have identical content
    const treeUpdates = [];
    let hasAnyChanges = false;

    for (const file of files) {
      const targetPath = file.path.replace(/^\/+/, '');
      const localSha = await this.calculateGitBlobSha(file.content);
      const remoteMeta = await this.getFileMetadata(targetPath);

      if (remoteMeta && remoteMeta.sha === localSha) {
        // Content already matches remote
        continue;
      }

      // Content changed or file is new: create blob
      hasAnyChanges = true;
      const blobSha = await this.createBlob(file.content);
      treeUpdates.push({
        path: targetPath,
        mode: '100644', // normal file
        type: 'blob',
        sha: blobSha
      });
    }

    if (!hasAnyChanges) {
      return {
        committed: false,
        reason: 'identical_content',
        commitSha: headCommitSha
      };
    }

    // 3. Create new tree based on baseTreeSha
    const newTree = await this._request(`/repos/${this.owner}/${this.repo}/git/trees`, 'POST', {
      base_tree: baseTreeSha,
      tree: treeUpdates
    });

    // 4. Create new commit
    const newCommit = await this._request(`/repos/${this.owner}/${this.repo}/git/commits`, 'POST', {
      message: commitMessage,
      tree: newTree.sha,
      parents: [headCommitSha]
    });

    // 5. Update branch reference
    await this._request(`/repos/${this.owner}/${this.repo}/git/refs/heads/${this.branch}`, 'PATCH', {
      sha: newCommit.sha,
      force: false
    });

    return {
      committed: true,
      commitSha: newCommit.sha,
      commitUrl: `https://github.com/${this.owner}/${this.repo}/commit/${newCommit.sha}`
    };
  }

  /**
   * Commit a single file using Git Data API if its content differs from remote.
   * 
   * @param {Object} params
   * @param {string} params.path - target file path (e.g. "leetcode/0001 - Two Sum/README.md")
   * @param {string} params.content - file content string
   * @param {string} params.commitMessage - exact commit message
   * @returns {Promise<{ committed: boolean, commitSha?: string, commitUrl?: string, reason?: string }>}
   */
  async commitFile({ path, content, commitMessage }) {
    if (!path || content === undefined || content === null) {
      return { committed: false, reason: 'invalid_params' };
    }

    const targetPath = path.replace(/^\/+/, '');
    const localSha = await this.calculateGitBlobSha(content);
    const remoteMeta = await this.getFileMetadata(targetPath);

    if (remoteMeta && remoteMeta.sha === localSha) {
      return {
        committed: false,
        reason: 'identical_content'
      };
    }

    // 1. Get current branch head & tree
    const headCommitSha = await this.getBranchHeadSha();
    const baseTreeSha = await this.getCommitTreeSha(headCommitSha);

    // 2. Create blob
    const blobSha = await this.createBlob(content);

    // 3. Create tree with base_tree so all other files in repo are preserved
    const newTree = await this._request(`/repos/${this.owner}/${this.repo}/git/trees`, 'POST', {
      base_tree: baseTreeSha,
      tree: [
        {
          path: targetPath,
          mode: '100644',
          type: 'blob',
          sha: blobSha
        }
      ]
    });

    // 4. Create commit
    const newCommit = await this._request(`/repos/${this.owner}/${this.repo}/git/commits`, 'POST', {
      message: commitMessage,
      tree: newTree.sha,
      parents: [headCommitSha]
    });

    // 5. Update branch reference
    await this._request(`/repos/${this.owner}/${this.repo}/git/refs/heads/${this.branch}`, 'PATCH', {
      sha: newCommit.sha,
      force: false
    });

    return {
      committed: true,
      commitSha: newCommit.sha,
      commitUrl: `https://github.com/${this.owner}/${this.repo}/commit/${newCommit.sha}`
    };
  }
}
