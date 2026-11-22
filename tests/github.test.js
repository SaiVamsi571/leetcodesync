import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GitHubClient } from '../lib/github.js';

describe('GitHub Client (FR-11 to FR-14)', () => {
  it('correctly calculates Git blob SHA using git blob hashing algorithm', async () => {
    const client = new GitHubClient({
      token: 'fake-token',
      owner: 'octocat',
      repo: 'hello-world'
    });

    // Git blob format: sha1("blob " + size + "\0" + content)
    // For content "hello world\n", size is 12 bytes
    // git hash-object -t blob of "hello world\n" is 3b18e512dba79e4c8300dd08aeb37f8e728b8dad
    const sha = await client.calculateGitBlobSha('hello world\n');
    assert.equal(sha, '3b18e512dba79e4c8300dd08aeb37f8e728b8dad');
  });

  it('fails with clear error if token is missing', async () => {
    const client = new GitHubClient({
      token: '',
      owner: 'octocat',
      repo: 'hello-world'
    });

    await assert.rejects(
      async () => await client.testConnection(),
      /GitHub Personal Access Token is required/
    );
  });

  it('detects unchanged files and skips zero-diff commits', async () => {
    const client = new GitHubClient({
      token: 'valid-token',
      owner: 'octocat',
      repo: 'leetcode'
    });

    const testContent = 'console.log("hello");\n';
    const blobSha = await client.calculateGitBlobSha(testContent);

    // Mock internal methods
    client.getBranchHeadSha = async () => 'head-commit-123';
    client.getCommitTreeSha = async () => 'base-tree-456';
    client.getFileMetadata = async (path) => {
      // simulate remote file having exact same blob SHA
      return { sha: blobSha, size: 22 };
    };

    const result = await client.commitFiles({
      commitMessage: 'Time: 40 ms | Memory: 50 MB',
      files: [{ path: 'leetcode/0001 - Two Sum/two_sum.js', content: testContent }]
    });

    assert.equal(result.committed, false);
    assert.equal(result.reason, 'identical_content');
  });

  it('performs atomic Git Data API commit sequence when content changes', async () => {
    const client = new GitHubClient({
      token: 'valid-token',
      owner: 'octocat',
      repo: 'leetcode'
    });

    client.getBranchHeadSha = async () => 'head-sha';
    client.getCommitTreeSha = async () => 'base-tree-sha';
    client.getFileMetadata = async () => null; // new file
    client.createBlob = async () => 'new-blob-sha';

    let treePayload = null;
    let commitPayload = null;
    let refUpdated = false;

    client._request = async (path, method, body) => {
      if (path.includes('/git/trees')) {
        treePayload = body;
        return { sha: 'new-tree-sha' };
      }
      if (path.includes('/git/commits')) {
        commitPayload = body;
        return { sha: 'new-commit-sha' };
      }
      if (path.includes('/git/refs/heads')) {
        refUpdated = true;
        return { object: { sha: body.sha } };
      }
      return {};
    };

    const result = await client.commitFiles({
      commitMessage: 'Time: 59 ms (72.10%) | Memory: 52.2 MB (8.84%)',
      files: [
        { path: 'leetcode/0001 - Two Sum/README.md', content: '# Two Sum' },
        { path: 'leetcode/0001 - Two Sum/two_sum.js', content: 'console.log("solution");' }
      ]
    });

    assert.equal(result.committed, true);
    assert.equal(result.commitSha, 'new-commit-sha');
    assert.equal(refUpdated, true);
    assert.equal(treePayload.base_tree, 'base-tree-sha');
    assert.equal(treePayload.tree.length, 2);
    assert.equal(commitPayload.message, 'Time: 59 ms (72.10%) | Memory: 52.2 MB (8.84%)');
  });

  it('commits a single file with custom message and skips if unchanged', async () => {
    const client = new GitHubClient({
      token: 'valid-token',
      owner: 'octocat',
      repo: 'leetcode'
    });

    client.getBranchHeadSha = async () => 'head-sha-1';
    client.getCommitTreeSha = async () => 'tree-sha-1';
    client.createBlob = async () => 'blob-readme-sha';

    let lastCommitMessage = null;
    client._request = async (path, method, body) => {
      if (path.includes('/git/trees')) {
        return { sha: 'new-tree-sha' };
      }
      if (path.includes('/git/commits')) {
        lastCommitMessage = body.message;
        return { sha: 'commit-readme-sha' };
      }
      if (path.includes('/git/refs/heads')) {
        return { object: { sha: body.sha } };
      }
      return {};
    };

    // 1. Commit new file
    client.getFileMetadata = async () => null; // not on remote
    const resNew = await client.commitFile({
      path: 'leetcode/0001 - Two Sum/README.md',
      content: '# Two Sum Description',
      commitMessage: 'Added README.md file for Two Sum'
    });
    assert.equal(resNew.committed, true);
    assert.equal(lastCommitMessage, 'Added README.md file for Two Sum');

    // 2. Commit unchanged file -> skips
    const sha = await client.calculateGitBlobSha('# Two Sum Description');
    client.getFileMetadata = async () => ({ sha });
    const resSame = await client.commitFile({
      path: 'leetcode/0001 - Two Sum/README.md',
      content: '# Two Sum Description',
      commitMessage: 'Added README.md file for Two Sum'
    });
    assert.equal(resSame.committed, false);
    assert.equal(resSame.reason, 'identical_content');
  });
});
