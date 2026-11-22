import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  getSettings,
  saveSettings,
  isGitHubConfigured,
  DEFAULT_SETTINGS
} from '../storage/config-store.js';

import {
  getProgressStore,
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
  getPendingQueue
} from '../storage/submission-store.js';

describe('Config Store (FR-13, FR-22)', () => {
  beforeEach(() => {
    globalThis._mockStorage = {};
  });

  it('loads default settings when empty', async () => {
    const settings = await getSettings();
    assert.deepEqual(settings, DEFAULT_SETTINGS);
    assert.equal(isGitHubConfigured(settings), false);
  });

  it('saves and merges settings updates', async () => {
    await saveSettings({
      githubToken: 'ghp_test12345',
      owner: 'testuser',
      repo: 'leetcode-repo'
    });

    const updated = await getSettings();
    assert.equal(updated.githubToken, 'ghp_test12345');
    assert.equal(updated.owner, 'testuser');
    assert.equal(updated.repo, 'leetcode-repo');
    assert.equal(updated.branch, 'main'); // default preserved
    assert.equal(isGitHubConfigured(updated), true);
  });
});

describe('Progress Store (FR-15 to FR-20)', () => {
  beforeEach(() => {
    globalThis._mockStorage = {};
  });

  it('records accepted submission and updates streaks', async () => {
    const date1 = '2026-11-22';
    const date2 = '2026-11-23';

    await recordAcceptedProgress('sub-1', date1);
    const res2 = await recordAcceptedProgress('sub-2', date2);

    assert.equal(res2.currentStreak, 2);
    assert.equal(res2.longestStreak, 2);
    assert.equal(res2.completedToday, true);
    assert.equal(res2.totalAccepted, 2);

    const store = await getProgressStore();
    assert.equal(store.dailyProgress[date1].completed, true);
    assert.equal(store.dailyProgress[date2].completed, true);
  });

  it('produces formatted weekly stats for popup', async () => {
    await recordAcceptedProgress('sub-1', '2026-11-23'); // Monday
    const stats = await getWeeklyDashboardStats(new Date(2026, 10, 23));

    assert.equal(stats.completedDays, 1);
    assert.equal(stats.weeklyPercentage, 14); // 1/7 = 14%
    assert.equal(stats.weekDays.length, 7);
  });
});

describe('Submission Store & Deduplication (FR-10, FR-21)', () => {
  beforeEach(() => {
    globalThis._mockStorage = {};
  });

  it('tracks synced submissions and prevents duplicate marking', async () => {
    assert.equal(await isSubmissionSynced('sub-100'), false);

    await markSubmissionSynced('sub-100', {
      problemId: '1',
      problemTitle: 'Two Sum',
      language: 'JavaScript',
      commitSha: 'sha123'
    });

    assert.equal(await isSubmissionSynced('sub-100'), true);

    const stats = await getSyncStats();
    assert.equal(stats.totalSynced, 1);
    assert.ok(stats.lastSyncTime > 0);
  });

  it('records and caps recent submissions list', async () => {
    for (let i = 1; i <= 25; i++) {
      await recordRecentSubmission({
        submissionId: `sub-${i}`,
        title: `Problem ${i}`,
        language: 'Python',
        status: 'synced'
      });
    }

    const list = await getRecentSubmissions(5);
    assert.equal(list.length, 5);
    assert.equal(list[0].submissionId, 'sub-25'); // latest first

    // Full list capped at 20
    const fullQueue = globalThis._mockStorage['leetcode_recent_submissions'];
    assert.equal(fullQueue.length, 20);
  });

  it('manages pending retry queue for failed or offline tasks', async () => {
    const task = {
      submissionId: 'task-1',
      problem: { title: 'Two Sum' }
    };

    await enqueuePendingTask(task);
    let queue = await getPendingQueue();
    assert.equal(queue.length, 1);
    assert.equal(queue[0].submissionId, 'task-1');

    await dequeuePendingTask('task-1');
    queue = await getPendingQueue();
    assert.equal(queue.length, 0);
  });
});
