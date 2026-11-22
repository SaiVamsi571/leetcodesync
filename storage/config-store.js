/**
 * Configuration & Settings storage manager for LeetCodeSync (FR-13, FR-22).
 */

export const DEFAULT_SETTINGS = {
  githubToken: '',
  owner: '',
  repo: '',
  branch: 'main',
  targetDirectory: 'leetcode',
  folderNamingConvention: 'padded', // 'padded' ("0001 - Two Sum") or 'plain' ("Two Sum")
  autoSync: true
};

const STORAGE_KEY = 'leetcode_sync_settings';

/**
 * Helper to access storage safely in Chrome extension or mock environment.
 */
function getStorage() {
  if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
    return chrome.storage.local;
  }
  // Memory fallback for tests
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
 * Retrieve current extension settings.
 * @returns {Promise<typeof DEFAULT_SETTINGS>}
 */
export async function getSettings() {
  const storage = getStorage();
  const result = await storage.get(STORAGE_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...(result[STORAGE_KEY] || {})
  };
}

/**
 * Save partial or full extension settings.
 * @param {Partial<typeof DEFAULT_SETTINGS>} partialSettings
 * @returns {Promise<typeof DEFAULT_SETTINGS>}
 */
export async function saveSettings(partialSettings) {
  const current = await getSettings();
  const updated = {
    ...current,
    ...partialSettings
  };
  const storage = getStorage();
  await storage.set({ [STORAGE_KEY]: updated });
  return updated;
}

/**
 * Check if extension has sufficient settings configured to perform GitHub sync.
 * @param {typeof DEFAULT_SETTINGS} settings
 * @returns {boolean}
 */
export function isGitHubConfigured(settings) {
  return Boolean(
    settings &&
    settings.githubToken &&
    settings.githubToken.trim().length > 0 &&
    settings.owner &&
    settings.owner.trim().length > 0 &&
    settings.repo &&
    settings.repo.trim().length > 0
  );
}
