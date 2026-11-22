import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { htmlToMarkdown, generateReadme } from '../lib/markdown-generator.js';

describe('Markdown Generator (FR-07)', () => {
  it('converts LeetCode HTML description tags into Markdown', () => {
    const html = '<p>Given an array of integers <code>nums</code> and an integer <code>target</code>.</p>' +
      '<p><strong>Example 1:</strong></p>' +
      '<pre>Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]</pre>' +
      '<p><strong>Constraints:</strong></p>' +
      '<ul><li><code>2 &lt;= nums.length &lt;= 10<sup>4</sup></code></li></ul>';

    const md = htmlToMarkdown(html);
    assert.ok(md.includes('Given an array of integers `nums` and an integer `target`.'));
    assert.ok(md.includes('**Example 1:**'));
    assert.ok(md.includes('```\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\n```'));
    assert.ok(md.includes('- `2 <= nums.length <= 10^4`'));
  });

  it('generates compliant README with problem metadata and solution language', () => {
    const problem = {
      id: '1',
      title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/',
      description: '<p>Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.</p>',
      difficulty: 'Easy',
      language: 'JavaScript'
    };

    const readme = generateReadme(problem);

    assert.ok(readme.startsWith('# Two Sum'));
    assert.ok(readme.includes('**Problem Number:** 1'));
    assert.ok(readme.includes('**LeetCode:** https://leetcode.com/problems/two-sum/'));
    assert.ok(readme.includes('**Difficulty:** Easy'));
    assert.ok(readme.includes('## Problem Description'));
    assert.ok(readme.includes('Given an array of integers nums and an integer target'));
    assert.ok(readme.includes('## Solution'));
    assert.ok(readme.includes('Language: JavaScript'));
  });
});
