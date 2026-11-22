/**
 * Submission deduplication, pending queue, and recent submissions store (FR-10, FR-21).
 */

const SYNCED_IDS_KEY = 'leetcode_synced_submission_ids';
const RECENT_SUBMISSIONS_KEY = 'leetcode_recent_submissions';
const PENDING_QUEUE_KEY = 'leetcode_pending_sync_queue';
const STATS_KEY = 'leetcode_sync_stats';

function getStorage() {
  if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
    return chrome.storage.local;
  }
  if (!globalThis._mockStorage) {
    globalThis._mockStorage = {};
  }
  return {
    async get(key) {
      if (typeof key === 'string') {
        return { [key]: globalThis._mockStorage[key] };
      }
      return globalThis._mockStorage;
    },
    async set(items) {
      Object.assign(globalThis._mockStorage, items);
    }
  };
}

/**
 * Check if a submission ID has already been successfully synced.
 * @param {string} submissionId
 * @returns {Promise<boolean>}
 */
export async function isSubmissionSynced(submissionId) {
  if (!submissionId) return false;
  const storage = getStorage();
  const result = await storage.get(SYNCED_IDS_KEY);
  const syncedMap = result[SYNCED_IDS_KEY] || {};
  return Boolean(syncedMap[String(submissionId)]);
}

/**
 * Mark a submission ID as successfully synchronized to GitHub.
 * @param {string} submissionId
 * @param {Object} metadata
 * @returns {Promise<void>}
 */
export async function markSubmissionSynced(submissionId, metadata = {}) {
  if (!submissionId) return;
  const storage = getStorage();
  const result = await storage.get(SYNCED_IDS_KEY);
  const syncedMap = result[SYNCED_IDS_KEY] || {};

  syncedMap[String(submissionId)] = {
    ...metadata,
    syncedAt: Date.now()
  };

  await storage.set({ [SYNCED_IDS_KEY]: syncedMap });

  // Update sync statistics
  const statsRes = await storage.get(STATS_KEY);
  const currentStats = statsRes[STATS_KEY] || { totalSynced: 0, lastSyncTime: null };
  await storage.set({
    [STATS_KEY]: {
      totalSynced: currentStats.totalSynced + 1,
      lastSyncTime: Date.now()
    }
  });
}

/**
 * Get overall sync stats (total synced, last sync time).
 * @returns {Promise<{ totalSynced: number, lastSyncTime: number | null }>}
 */
export async function getSyncStats() {
  const storage = getStorage();
  const res = await storage.get(STATS_KEY);
  return res[STATS_KEY] || { totalSynced: 0, lastSyncTime: null };
}

/**
 * Add or update an entry in the recent submissions list (capped at 20).
 * @param {Object} entry
 * @returns {Promise<void>}
 */
export async function recordRecentSubmission(entry) {
  const storage = getStorage();
  const result = await storage.get(RECENT_SUBMISSIONS_KEY);
  let list = result[RECENT_SUBMISSIONS_KEY] || [];

  // Filter out any existing item with same submissionId
  list = list.filter(item => item.submissionId !== entry.submissionId);

  // Add new item to front
  list.unshift({
    ...entry,
    timestamp: entry.timestamp || Date.now()
  });

  // Keep max 20 items
  if (list.length > 20) {
    list = list.slice(0, 20);
  }

  await storage.set({ [RECENT_SUBMISSIONS_KEY]: list });
}

/**
 * Retrieve recent submissions list.
 * @param {number} [limit=5]
 * @returns {Promise<Array<Object>>}
 */
export async function getRecentSubmissions(limit = 5) {
  const storage = getStorage();
  const result = await storage.get(RECENT_SUBMISSIONS_KEY);
  const list = result[RECENT_SUBMISSIONS_KEY] || [];
  return list.slice(0, limit);
}

/**
 * Retrieve pending queue for failed/offline sync tasks.
 * @returns {Promise<Array<Object>>}
 */
export async function getPendingQueue() {
  const storage = getStorage();
  const result = await storage.get(PENDING_QUEUE_KEY);
  return result[PENDING_QUEUE_KEY] || [];
}

/**
 * Enqueue a task to the pending retry queue.
 * @param {Object} task
 * @returns {Promise<void>}
 */
export async function enqueuePendingTask(task) {
  const storage = getStorage();
  const queue = await getPendingQueue();
  
  // Avoid re-enqueuing duplicate submissionId
  const exists = queue.some(t => t.submissionId === task.submissionId);
  if (!exists) {
    queue.push({
      ...task,
      queuedAt: Date.now(),
      attempts: 0
    });
    await storage.set({ [PENDING_QUEUE_KEY]: queue });
  }
}

/**
 * Remove a completed task from the pending queue.
 * @param {string} submissionId
 * @returns {Promise<void>}
 */
export async function dequeuePendingTask(submissionId) {
  const storage = getStorage();
  const queue = await getPendingQueue();
  const updated = queue.filter(t => t.submissionId !== submissionId);
  await storage.set({ [PENDING_QUEUE_KEY]: updated });
}

/**
 * Update error info and increment attempt count for a task in the queue.
 * @param {string} submissionId
 * @param {string} error
 * @returns {Promise<void>}
 */
export async function updatePendingTaskError(submissionId, error) {
  const storage = getStorage();
  const queue = await getPendingQueue();
  const task = queue.find(t => t.submissionId === submissionId);
  if (task) {
    task.attempts = (task.attempts || 0) + 1;
    task.lastError = error;
    task.lastAttempt = Date.now();
    await storage.set({ [PENDING_QUEUE_KEY]: queue });
  }
}
