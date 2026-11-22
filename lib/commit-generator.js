/**
 * Commit message generator for LeetCodeSync.
 * Generates exact performance-based commit messages in compliance with FR-11.
 * Format: "Time: 59 ms (72.10%) | Memory: 52.2 MB (8.84%)"
 */

/**
 * Formats a metric value and optional percentile.
 * @param {string|number} value - e.g. "59 ms" or "52.2 MB"
 * @param {string|number|null|undefined} percentile - e.g. 72.1 or "72.10"
 * @param {string} label - "Time" or "Memory"
 * @returns {string|null}
 */
function formatMetric(value, percentile, label) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  let formattedValue = String(value).trim();
  let part = `${label}: ${formattedValue}`;

  if (percentile !== null && percentile !== undefined && percentile !== '') {
    const numericPercentile = typeof percentile === 'number' 
      ? percentile 
      : parseFloat(String(percentile).replace('%', '').trim());

    if (!isNaN(numericPercentile)) {
      part += ` (${numericPercentile.toFixed(2)}%)`;
    }
  }

  return part;
}

/**
 * Generate performance-based commit message.
 * @param {Object} stats
 * @param {string|number} [stats.runtime] - e.g. "59 ms"
 * @param {string|number} [stats.runtimePercentile] - e.g. 72.10
 * @param {string|number} [stats.memory] - e.g. "52.2 MB"
 * @param {string|number} [stats.memoryPercentile] - e.g. 8.84
 * @returns {string}
 */
export function generateCommitMessage(stats = {}) {
  const { runtime, runtimePercentile, memory, memoryPercentile } = stats;

  const timePart = formatMetric(runtime, runtimePercentile, 'Time');
  const memoryPart = formatMetric(memory, memoryPercentile, 'Memory');

  const parts = [];
  if (timePart) parts.push(timePart);
  if (memoryPart) parts.push(memoryPart);

  if (parts.length > 0) {
    return parts.join(' | ');
  }

  return 'Accepted solution';
}
