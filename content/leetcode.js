/**
 * LeetCode Content Script (content/leetcode.js)
 * Injected into https://leetcode.com/problems/* in ISOLATED world.
 * Paired with content/bridge.js (MAIN world) for zero-CSP, zero-DOM-thrashing submission detection.
 * 
 * Responsibilities:
 * 1. Listen for LEETCODE_SYNC_VERDICT messages posted by the MAIN-world bridge (FR-01, FR-02).
 * 2. Detect submissions when visiting or navigating to /submissions/<id>/ URL directly.
 * 3. Extract submission ID, problem metadata, source code, language, and runtime/memory stats (FR-03, FR-04, FR-05).
 * 4. Send SUBMISSION_ACCEPTED message safely to background service worker with context protection.
 */

(() => {
  if (window.__LEETCODE_SYNC_CONTENT_INJECTED__) return;
  window.__LEETCODE_SYNC_CONTENT_INJECTED__ = true;

  console.log('[LeetCodeSync] Content script initialized on:', window.location.pathname);

  const processedSubmissionIds = new Set();
  let isAwaitingSubmission = false;
  let awaitTimeout = null;

  /**
   * Check if extension context is valid.
   */
  function isContextValid() {
    try {
      return Boolean(typeof chrome !== 'undefined' && chrome?.runtime && chrome.runtime.id);
    } catch (_) {
      return false;
    }
  }

  /**
   * Safe wrapper for chrome.runtime.sendMessage.
   * Prevents "Extension context invalidated" and "Could not establish connection" uncaught errors.
   */
  function safeSendMessage(message) {
    return new Promise((resolve) => {
      try {
        if (!isContextValid()) {
          console.log('[LeetCodeSync] Extension context was updated. Please refresh this tab to reconnect.');
          return resolve(null);
        }

        chrome.runtime.sendMessage(message, (response) => {
          try {
            if (chrome.runtime.lastError) {
              console.log('[LeetCodeSync] Message status:', chrome.runtime.lastError.message);
              return resolve(null);
            }
          } catch (_) {}
          resolve(response);
        });
      } catch (err) {
        console.log('[LeetCodeSync] Safe send caught error:', err?.message || err);
        resolve(null);
      }
    });
  }

  /**
   * Extract problem slug from URL (e.g. /problems/two-sum/ -> "two-sum").
   */
  function getProblemSlug() {
    const match = window.location.pathname.match(/\/problems\/([^/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract submission ID from URL if present (e.g. /submissions/2201502615/ -> "2201502615").
   */
  function extractSubmissionIdFromUrl() {
    const match = window.location.pathname.match(/\/submissions\/(?:detail\/)?(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract CSRF token from document cookies for LeetCode GraphQL calls.
   */
  function getCsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  /**
   * Query LeetCode GraphQL API with CSRF token authentication.
   */
  async function queryGraphQL(query, variables = {}) {
    try {
      const csrfToken = getCsrfToken();
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (csrfToken) {
        headers['x-csrftoken'] = csrfToken;
      }

      const response = await fetch('/graphql', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables }),
        credentials: 'same-origin'
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (_) {
      return null;
    }
  }

  /**
   * Fetch problem metadata (title, questionFrontendId, difficulty, content) via GraphQL.
   */
  async function fetchProblemMetadata(slug) {
    const query = `
      query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          questionFrontendId
          title
          titleSlug
          content
          difficulty
        }
      }
    `;
    const res = await queryGraphQL(query, { titleSlug: slug });
    return res?.data?.question || null;
  }

  /**
   * Fetch submission details (code, status, runtime, memory, percentiles) via GraphQL.
   */
  async function fetchSubmissionDetails(submissionId) {
    const query = `
      query submissionDetails($submissionId: Int!) {
        submissionDetails(submissionId: $submissionId) {
          runtime
          runtimeDisplay
          runtimePercentile
          memory
          memoryDisplay
          memoryPercentile
          code
          lang {
            name
            verboseName
          }
        }
      }
    `;
    const res = await queryGraphQL(query, { submissionId: parseInt(submissionId, 10) });
    return res?.data?.submissionDetails || null;
  }

  /**
   * Fallback code extraction from active Monaco Editor or DOM code viewer.
   */
  function extractCodeFromDOM() {
    try {
      const lines = document.querySelectorAll('.monaco-editor .view-lines .view-line, pre code, pre');
      if (lines && lines.length > 0) {
        return Array.from(lines).map(line => line.textContent).join('\n');
      }
    } catch (_) {}
    return '';
  }

  /**
   * Process accepted submission and dispatch to background service worker.
   */
  async function handleAcceptedVerdict({ submissionId, data = null }) {
    if (!submissionId) return;

    if (processedSubmissionIds.has(String(submissionId))) {
      return;
    }
    processedSubmissionIds.add(String(submissionId));

    const slug = getProblemSlug();
    if (!slug) return;

    console.log('[LeetCodeSync] Accepted submission received for:', slug, 'ID:', submissionId);

    // Fetch Problem metadata
    const questionMeta = await fetchProblemMetadata(slug);

    const title = questionMeta?.title || 
      slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    const id = questionMeta?.questionFrontendId || questionMeta?.questionId || '0';
    const description = questionMeta?.content || '';
    const difficulty = questionMeta?.difficulty || 'Medium';

    // If source code not directly in payload, fetch via GraphQL
    let submissionDetails = null;
    if (!data?.code && /^\d+$/.test(String(submissionId))) {
      submissionDetails = await fetchSubmissionDetails(submissionId);
    }

    // Extract performance stats and solution code
    const code = data?.code || submissionDetails?.code || extractCodeFromDOM();
    const runtime = data?.status_runtime || data?.runtime || submissionDetails?.runtimeDisplay || submissionDetails?.runtime || '0 ms';
    const runtimePercentile = data?.runtime_percentile !== undefined 
      ? data.runtime_percentile 
      : (submissionDetails?.runtimePercentile !== undefined ? submissionDetails.runtimePercentile : null);
    const memory = data?.status_memory || data?.memory || submissionDetails?.memoryDisplay || submissionDetails?.memory || '0 MB';
    const memoryPercentile = data?.memory_percentile !== undefined 
      ? data.memory_percentile 
      : (submissionDetails?.memoryPercentile !== undefined ? submissionDetails.memoryPercentile : null);
    const language = data?.lang || submissionDetails?.lang?.name || submissionDetails?.lang?.verboseName || 'javascript';

    const payload = {
      submissionId: String(submissionId),
      problem: {
        id,
        title,
        slug,
        url: `https://leetcode.com/problems/${slug}/`,
        description,
        difficulty
      },
      solution: {
        code,
        language
      },
      performance: {
        runtime: String(runtime),
        runtimePercentile,
        memory: String(memory),
        memoryPercentile
      },
      timestamp: Date.now()
    };

    console.log('[LeetCodeSync] Dispatching payload to background:', payload);
    const res = await safeSendMessage({
      type: 'SUBMISSION_ACCEPTED',
      payload
    });
    console.log('[LeetCodeSync] Background sync response:', res);
  }

  // --- 1. Primary: Listen to Bridge Messages from MAIN world ---
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'LEETCODE_SYNC_VERDICT') {
      const { submissionId, data } = event.data;
      if (data && (data.status_msg === 'Accepted' || data.status_code === 10)) {
        isAwaitingSubmission = false;
        if (awaitTimeout) clearTimeout(awaitTimeout);
        handleAcceptedVerdict({ submissionId, data });
      } else {
        // Unsuccessful verdict: Wrong Answer, TLE, etc.
        isAwaitingSubmission = false;
      }
    }
  });

  // --- 2. Fallback: Listen to Submit Button Click ---
  document.addEventListener('click', (e) => {
    if (!e.target || typeof e.target.closest !== 'function') return;

    const btn = e.target.closest('button');
    if (!btn) return;

    const isSubmitBtn = btn.getAttribute('data-e2e-locator') === 'console-submit-button' ||
      (btn.textContent && btn.textContent.trim().toLowerCase() === 'submit');

    if (isSubmitBtn) {
      console.log('[LeetCodeSync] Submit button clicked. Awaiting verdict...');
      isAwaitingSubmission = true;

      if (awaitTimeout) clearTimeout(awaitTimeout);
      awaitTimeout = setTimeout(() => {
        isAwaitingSubmission = false;
      }, 45000); // 45-second timeout
    }
  }, true);

  // --- 3. Direct/SPA Submission URL Check ---
  function checkUrlForSubmission() {
    const subId = extractSubmissionIdFromUrl();
    if (!subId) return;

    const checkVerdict = () => {
      const resultEl = document.querySelector('[data-e2e-locator="submission-result"], [class*="result-status"], [class*="status-accepted"], [class*="text-green"]');
      if (resultEl && resultEl.textContent && resultEl.textContent.trim().toLowerCase().includes('accepted')) {
        handleAcceptedVerdict({ submissionId: subId });
        return true;
      }
      return false;
    };

    if (!checkVerdict()) {
      setTimeout(checkVerdict, 1000);
      setTimeout(checkVerdict, 2500);
    }
  }

  // Check immediately if page loaded directly on a submission detail URL
  checkUrlForSubmission();

  // Watch URL changes for SPA client-side navigations to /submissions/<id>/
  let lastUrl = window.location.href;
  setInterval(() => {
    if (!isContextValid()) return;
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      checkUrlForSubmission();
    }
  }, 1000);

  // --- 4. Fallback: Targeted DOM Observer (Active ONLY when awaiting submission) ---
  const observer = new MutationObserver(() => {
    if (!isContextValid()) {
      observer.disconnect();
      return;
    }

    if (!isAwaitingSubmission) return;

    const resultEl = document.querySelector('[data-e2e-locator="submission-result"]');
    if (resultEl && resultEl.textContent && resultEl.textContent.trim().toLowerCase().includes('accepted')) {
      isAwaitingSubmission = false;
      if (awaitTimeout) clearTimeout(awaitTimeout);

      const subId = extractSubmissionIdFromUrl() || `${getProblemSlug()}-${Date.now()}`;
      handleAcceptedVerdict({ submissionId: subId });
    }
  });

  const targetNode = document.body || document.documentElement;
  if (targetNode) {
    observer.observe(targetNode, {
      childList: true,
      subtree: true
    });
  }

})();
