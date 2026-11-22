/**
 * Main-World Network Interceptor Bridge (content/bridge.js)
 * Injected natively into the page context (world: "MAIN") via manifest.json.
 * Bypasses page CSP inline-script restrictions completely.
 * 
 * Intercepts LeetCode submission check requests to capture exact verdict, code, and metrics.
 */

(() => {
  if (window.__LEETCODE_SYNC_BRIDGE__) return;
  window.__LEETCODE_SYNC_BRIDGE__ = true;

  console.log('[LeetCodeSync] Main-world bridge initialized on:', window.location.pathname);

  // 1. Intercept window.fetch
  const origFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await origFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      if (url.includes('/submissions/detail/') && url.includes('/check/')) {
        const clone = response.clone();
        clone.json().then(data => {
          if (data && data.state === 'SUCCESS') {
            const idMatch = url.match(/\/submissions\/detail\/(\d+)\/check\//);
            window.postMessage({
              type: 'LEETCODE_SYNC_VERDICT',
              submissionId: idMatch ? idMatch[1] : (data.submission_id ? String(data.submission_id) : null),
              data
            }, '*');
          }
        }).catch(() => {});
      }
    } catch (_) {}
    return response;
  };

  // 2. Intercept XMLHttpRequest
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    this.addEventListener('load', function() {
      try {
        if (this._url && this._url.includes('/submissions/detail/') && this._url.includes('/check/')) {
          const data = JSON.parse(this.responseText);
          if (data && data.state === 'SUCCESS') {
            const idMatch = this._url.match(/\/submissions\/detail\/(\d+)\/check\//);
            window.postMessage({
              type: 'LEETCODE_SYNC_VERDICT',
              submissionId: idMatch ? idMatch[1] : (data.submission_id ? String(data.submission_id) : null),
              data
            }, '*');
          }
        }
      } catch (_) {}
    });
    return origSend.apply(this, arguments);
  };
})();
