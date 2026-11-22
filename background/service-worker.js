/**
 * Background Service Worker for LeetCodeSync (MV3).
 * Orchestrates submission processing, GitHub synchronization, daily tracking, and retry queues.
 */

import { detectLanguage } from '../lib/language-detector.js';
import { generateCommitMessage } from '../lib/commit-generator.js';
import { generateReadme } from '../lib/markdown-generator.js';
import { GitHubClient } from '../lib/github.js';
import {
  getSettings,
  saveSettings,
  isGitHubConfigured
} from '../storage/config-store.js';
import {
  recordAcceptedProgress,
  getWeeklyDashboardStats
} from '../storage/progress-store.js';
import {
  isSubmissionSynced,
  markSubmissionSynced,
  recordRecentSubmission,
  getRecentSubmissions,
  getSyncStats,
  enqueuePendingTask,
  dequeuePendingTask,
  getPendingQueue,
  updatePendingTaskError
} from '../storage/submission-store.js';

console.log('[LeetCodeSync] Background Service Worker initialized.');

/**
 * Updates extension action badge on the toolbar with current streak.
 */
async function updateExtensionBadge() {
  try {
    const { currentStreak } = await getProgressStore();
    if (typeof chrome !== 'undefined' && chrome.action) {
      if (currentStreak > 0) {
        chrome.action.setBadgeText({ text: String(currentStreak) });
        chrome.action.setBadgeBackgroundColor({ color: '#f0883e' });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    }
  } catch (_) {}
}

// Initial badge update
updateExtensionBadge();

// Setup periodic alarm for pending queue retries
chrome.alarms.create('LEETCODE_SYNC_RETRY_ALARM', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'LEETCODE_SYNC_RETRY_ALARM') {
    processPendingQueue();
  }
});

/**
 * Sanitize folder and file names.
 */
function sanitizeName(name) {
  return (name || '').replace(/[/\\?%*:|"<>]/g, '').trim();
}

/**
 * Build folder path based on user naming preference.
 */
function buildProblemFolderPath(problem, settings) {
  const cleanTitle = sanitizeName(problem.title);
  let folderName;

  if (settings.folderNamingConvention === 'plain') {
    folderName = cleanTitle;
  } else {
    // Default: '0001 - Two Sum'
    const paddedId = String(problem.id || '0').padStart(4, '0');
    folderName = `${paddedId} - ${cleanTitle}`;
  }

  const baseDir = (settings.targetDirectory || '').replace(/^\/+|\/+$/g, '');
  return baseDir ? `${baseDir}/${folderName}` : folderName;
}

/**
 * Build solution file name based on problem slug and detected language.
 */
function buildSolutionFileName(problem, langInfo) {
  const slug = (problem.slug || sanitizeName(problem.title))
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  return `${slug}.${langInfo.extension}`;
}

/**
 * Core submission sync handler.
 */
async function handleSubmission(payload) {
  const { submissionId, problem, solution, performance } = payload;
  console.log('[LeetCodeSync] Handling accepted submission:', submissionId, problem.title);

  // 1. INDEPENDENT TRACK: Record daily progress & update streaks (FR-15, FR-20)
  try {
    const progressResult = await recordAcceptedProgress(submissionId);
    console.log('[LeetCodeSync] Consistency progress recorded:', progressResult);
    updateExtensionBadge();
  } catch (err) {
    console.error('[LeetCodeSync] Error recording streak progress:', err);
  }

  // 2. Check if this submission was already synced to GitHub (FR-10)
  const alreadySynced = await isSubmissionSynced(submissionId);
  if (alreadySynced) {
    console.log('[LeetCodeSync] Submission already synced, skipping GitHub commit:', submissionId);
    return { status: 'already_synced' };
  }

  // 3. Resolve language
  const langInfo = detectLanguage(solution.language) || {
    name: solution.language || 'Unknown',
    extension: 'txt'
  };

  const settings = await getSettings();

  // 4. Verify GitHub configuration and AutoSync setting
  if (!settings.autoSync) {
    console.log('[LeetCodeSync] Auto-sync is OFF. Adding to pending list.');
    await recordRecentSubmission({
      submissionId,
      title: problem.title,
      language: langInfo.name,
      runtime: performance.runtime || '-',
      memory: performance.memory || '-',
      status: 'pending',
      note: 'Auto-sync is disabled'
    });
    return { status: 'auto_sync_disabled' };
  }

  if (!isGitHubConfigured(settings)) {
    console.warn('[LeetCodeSync] GitHub repository or token is not configured.');
    await enqueuePendingTask(payload);
    await recordRecentSubmission({
      submissionId,
      title: problem.title,
      language: langInfo.name,
      runtime: performance.runtime || '-',
      memory: performance.memory || '-',
      status: 'unconfigured'
    });
    return { status: 'unconfigured' };
  }

  // 5. Build files and commit message
  const folderPath = buildProblemFolderPath(problem, settings);
  const solutionFileName = buildSolutionFileName(problem, langInfo);
  const solutionPath = `${folderPath}/${solutionFileName}`;
  const readmePath = `${folderPath}/README.md`;

  const readmeContent = generateReadme({
    id: problem.id,
    title: problem.title,
    url: problem.url,
    description: problem.description,
    difficulty: problem.difficulty,
    language: langInfo.name
  });

  // 6. Execute GitHub commits with separate descriptive messages (FR-11, FR-14)
  try {
    const ghClient = new GitHubClient({
      token: settings.githubToken,
      owner: settings.owner,
      repo: settings.repo,
      branch: settings.branch
    });

    // 6a. Commit README.md if new or modified
    const readmeCommitMessage = `Added README.md file for ${problem.title}`;
    const readmeResult = await ghClient.commitFile({
      path: readmePath,
      content: readmeContent,
      commitMessage: readmeCommitMessage
    });
    console.log('[LeetCodeSync] README commit result:', readmeResult);

    // 6b. Commit Solution file with performance stats
    const solutionCommitMessage = generateCommitMessage(performance);
    const solutionResult = await ghClient.commitFile({
      path: solutionPath,
      content: solution.code,
      commitMessage: solutionCommitMessage
    });
    console.log('[LeetCodeSync] Solution commit result:', solutionResult);

    const latestCommitSha = solutionResult.commitSha || readmeResult.commitSha;
    const latestCommitUrl = solutionResult.commitUrl || readmeResult.commitUrl;

    // 7. Mark submission as synced (FR-10)
    await markSubmissionSynced(submissionId, {
      problemId: problem.id,
      problemTitle: problem.title,
      language: langInfo.name,
      commitSha: latestCommitSha,
      commitUrl: latestCommitUrl
    });

    await dequeuePendingTask(submissionId);

    await recordRecentSubmission({
      submissionId,
      title: problem.title,
      language: langInfo.name,
      runtime: performance.runtime || '-',
      memory: performance.memory || '-',
      status: 'synced',
      commitUrl: latestCommitUrl
    });

    // Update real-time streak badge on Chrome action toolbar
    updateExtensionBadge();

    return {
      status: 'success',
      readmeResult,
      solutionResult
    };
  } catch (err) {
    console.error('[LeetCodeSync] GitHub sync failed:', err);
    await enqueuePendingTask(payload);
    await updatePendingTaskError(submissionId, err.message);

    await recordRecentSubmission({
      submissionId,
      title: problem.title,
      language: langInfo.name,
      runtime: performance.runtime || '-',
      memory: performance.memory || '-',
      status: 'failed',
      error: err.message
    });

    return { status: 'failed', error: err.message };
  }
}

/**
 * Process pending queue tasks (retries).
 */
async function processPendingQueue() {
  const queue = await getPendingQueue();
  if (queue.length === 0) return;

  const settings = await getSettings();
  if (!isGitHubConfigured(settings) || !settings.autoSync) return;

  console.log(`[LeetCodeSync] Processing ${queue.length} pending sync tasks...`);
  for (const task of queue) {
    try {
      await handleSubmission(task);
    } catch (err) {
      console.warn(`[LeetCodeSync] Retry failed for task ${task.submissionId}:`, err);
    }
  }
}

// Runtime Message Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SUBMISSION_ACCEPTED') {
    handleSubmission(message.payload)
      .then(res => sendResponse(res || { status: 'ok' }))
      .catch(err => sendResponse({ status: 'failed', error: err.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_POPUP_STATE') {
    (async () => {
      try {
        const settings = await getSettings();
        const weeklyStats = await getWeeklyDashboardStats();
        const recent = await getRecentSubmissions(10);
        const stats = await getSyncStats();
        const isConnected = isGitHubConfigured(settings);

        sendResponse({
          settings,
          weeklyStats,
          recentSubmissions: recent,
          syncStats: stats,
          isConnected
        });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    })();
    return true;
  }

  if (message.type === 'TEST_GITHUB_CONNECTION') {
    (async () => {
      try {
        const ghClient = new GitHubClient(message.payload);
        const result = await ghClient.testConnection();
        sendResponse({ success: true, result });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.type === 'UPDATE_SETTINGS') {
    saveSettings(message.payload)
      .then(updated => sendResponse({ success: true, settings: updated }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'TRIGGER_RETRY') {
    processPendingQueue()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  return false;
});
