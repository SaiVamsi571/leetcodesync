/**
 * Markdown generator for problem README files (FR-07).
 */

/**
 * Converts basic HTML strings from LeetCode descriptions to clean Markdown.
 * @param {string} html
 * @returns {string}
 */
export function htmlToMarkdown(html) {
  if (!html) return '';

  let md = html;

  // Replace <pre> ... </pre> blocks preserving line breaks
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (match, p1) => {
    // Strip inner HTML tags from pre content
    const code = p1.replace(/<[^>]+>/g, '');
    return `\n\`\`\`\n${code.trim()}\n\`\`\`\n`;
  });

  // Code inline
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Bold & Strong
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi, '**$2**');

  // Italic & Em
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi, '*$2*');

  // Headers
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');

  // Unordered list items
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?ul[^>]*>/gi, '\n');
  md = md.replace(/<\/?ol[^>]*>/gi, '\n');

  // Paragraphs & Line breaks
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Superscripts & Subscripts
  md = md.replace(/<sup>([\s\S]*?)<\/sup>/gi, '^$1');
  md = md.replace(/<sub>([\s\S]*?)<\/sub>/gi, '_$1');

  // Remove any remaining tags
  md = md.replace(/<[^>]+>/g, '');

  // HTML entity decode
  md = md
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&le;/g, '<=')
    .replace(/&ge;/g, '>=');

  // Clean excessive blank lines
  md = md.replace(/\n{3,}/g, '\n\n').trim();

  return md;
}

/**
 * Generate README.md content for a LeetCode problem.
 * @param {Object} problem
 * @param {string|number} problem.id - e.g. "1" or 1
 * @param {string} problem.title - e.g. "Two Sum"
 * @param {string} problem.url - e.g. "https://leetcode.com/problems/two-sum/"
 * @param {string} problem.description - raw or markdown description
 * @param {string} [problem.difficulty] - "Easy", "Medium", "Hard"
 * @param {string} [problem.language] - "JavaScript", "Python", etc.
 * @returns {string}
 */
export function generateReadme(problem) {
  const {
    id = '',
    title = '',
    url = '',
    description = '',
    difficulty = '',
    language = ''
  } = problem;

  const cleanDescription = description.includes('<')
    ? htmlToMarkdown(description)
    : description.trim();

  const lines = [
    `# ${title}`,
    '',
    `**Problem Number:** ${id}`,
    '',
    `**LeetCode:** ${url}`
  ];

  if (difficulty) {
    lines.push('', `**Difficulty:** ${difficulty}`);
  }

  lines.push(
    '',
    '## Problem Description',
    '',
    cleanDescription
  );

  if (language) {
    lines.push(
      '',
      '## Solution',
      '',
      `Language: ${language}`
    );
  }

  return lines.join('\n') + '\n';
}
