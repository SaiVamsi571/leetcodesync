import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateCommitMessage } from '../lib/commit-generator.js';

describe('Commit Message Generator (FR-11)', () => {
  it('formats full runtime and memory with percentiles correctly', () => {
    const stats = {
      runtime: '59 ms',
      runtimePercentile: 72.10,
      memory: '52.2 MB',
      memoryPercentile: 8.84
    };
    const message = generateCommitMessage(stats);
    assert.equal(message, 'Time: 59 ms (72.10%) | Memory: 52.2 MB (8.84%)');
  });

  it('handles percentile strings with percent signs and formats to 2 decimals', () => {
    const stats = {
      runtime: '42 ms',
      runtimePercentile: '85.5%',
      memory: '45.1 MB',
      memoryPercentile: '92.1234%'
    };
    const message = generateCommitMessage(stats);
    assert.equal(message, 'Time: 42 ms (85.50%) | Memory: 45.1 MB (92.12%)');
  });

  it('handles missing percentiles gracefully without inventing values', () => {
    const stats = {
      runtime: '59 ms',
      memory: '52.2 MB'
    };
    const message = generateCommitMessage(stats);
    assert.equal(message, 'Time: 59 ms | Memory: 52.2 MB');
  });

  it('handles runtime-only stats', () => {
    const stats = {
      runtime: '12 ms',
      runtimePercentile: 95.0
    };
    const message = generateCommitMessage(stats);
    assert.equal(message, 'Time: 12 ms (95.00%)');
  });

  it('returns fallback message when empty', () => {
    const message = generateCommitMessage({});
    assert.equal(message, 'Accepted solution');
  });
});
