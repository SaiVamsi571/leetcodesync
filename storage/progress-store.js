/**
 * Daily consistency and streak progress store (FR-15 to FR-20).
 * Persists daily completion history and recalculates streaks dynamically.
 */

import {
  formatDateKey,
  recordAcceptedSubmission,
  calculateWeeklyStats,
  calculateStreak
} from '../lib/streak-calculator.js';

const PROGRESS_STORAGE_KEY = 'leetcode_sync_progress';

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
 * Retrieve current progress data.
 * @returns {Promise<{ dailyProgress: Record<string, any>, currentStreak: number, longestStreak: number, totalAccepted: number }>}
 */
export async function getProgressStore() {
  const storage = getStorage();
  const result = await storage.get(PROGRESS_STORAGE_KEY);
  const data = result[PROGRESS_STORAGE_KEY] || {
    dailyProgress: {},
    currentStreak: 0,
    longestStreak: 0,
    totalAccepted: 0
  };

  // Recalculate streak to ensure dynamic accuracy (FR-20)
  const streaks = calculateStreak(data.dailyProgress);
  return {
    dailyProgress: data.dailyProgress || {},
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    totalAccepted: data.totalAccepted || 0
  };
}

/**
 * Record an accepted submission into the daily progress tracker.
 * Operates independently of GitHub sync state (FR-15).
 * 
 * @param {string} submissionId
 * @param {Date|string} [date=new Date()]
 * @returns {Promise<{ currentStreak: number, longestStreak: number, completedToday: boolean, totalAccepted: number }>}
 */
export async function recordAcceptedProgress(submissionId, date = new Date()) {
  const storage = getStorage();
  const currentStore = await getProgressStore();
  const dateKey = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : formatDateKey(date);

  const updatedDaily = recordAcceptedSubmission(currentStore.dailyProgress, dateKey, submissionId);
  const streaks = calculateStreak(updatedDaily, typeof date === 'string' ? new Date() : date);

  const newStore = {
    dailyProgress: updatedDaily,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    totalAccepted: (currentStore.totalAccepted || 0) + 1
  };

  await storage.set({ [PROGRESS_STORAGE_KEY]: newStore });

  return {
    currentStreak: newStore.currentStreak,
    longestStreak: newStore.longestStreak,
    completedToday: Boolean(updatedDaily[dateKey]?.completed),
    totalAccepted: newStore.totalAccepted
  };
}

/**
 * Get formatted weekly stats for the popup dashboard.
 * @param {Date} [referenceDate=new Date()]
 * @returns {Promise<ReturnType<typeof calculateWeeklyStats>>}
 */
export async function getWeeklyDashboardStats(referenceDate = new Date()) {
  const store = await getProgressStore();
  return calculateWeeklyStats(store.dailyProgress, referenceDate);
}
