/**
 * Supported programming languages registry and detector for LeetCodeSync.
 */

export const SUPPORTED_LANGUAGES = {
  javascript: { name: 'JavaScript', extension: 'js', comment: '//' },
  js: { name: 'JavaScript', extension: 'js', comment: '//' },
  typescript: { name: 'TypeScript', extension: 'ts', comment: '//' },
  ts: { name: 'TypeScript', extension: 'ts', comment: '//' },
  python: { name: 'Python', extension: 'py', comment: '#' },
  python3: { name: 'Python', extension: 'py', comment: '#' },
  py: { name: 'Python', extension: 'py', comment: '#' },
  java: { name: 'Java', extension: 'java', comment: '//' },
  golang: { name: 'Go', extension: 'go', comment: '//' },
  go: { name: 'Go', extension: 'go', comment: '//' },
  rust: { name: 'Rust', extension: 'rs', comment: '//' },
  rs: { name: 'Rust', extension: 'rs', comment: '//' }
};

/**
 * Detect and normalize language information from raw LeetCode metadata.
 * @param {string} rawLanguage
 * @returns {{ name: string, extension: string, comment: string } | null}
 */
export function detectLanguage(rawLanguage) {
  if (!rawLanguage || typeof rawLanguage !== 'string') return null;
  const key = rawLanguage.trim().toLowerCase();
  return SUPPORTED_LANGUAGES[key] || null;
}

/**
 * Check if a language is supported.
 * @param {string} rawLanguage
 * @returns {boolean}
 */
export function isLanguageSupported(rawLanguage) {
  return detectLanguage(rawLanguage) !== null;
}

/**
 * Return list of distinct supported languages.
 * @returns {Array<{ name: string, extension: string }>}
 */
export function getSupportedLanguages() {
  return [
    { name: 'JavaScript', extension: 'js' },
    { name: 'Python', extension: 'py' },
    { name: 'TypeScript', extension: 'ts' },
    { name: 'Java', extension: 'java' },
    { name: 'Go', extension: 'go' },
    { name: 'Rust', extension: 'rs' }
  ];
}
