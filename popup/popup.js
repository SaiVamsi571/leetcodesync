/**
 * Popup Dashboard Controller (popup/popup.js)
 * Implements FR-21: Popup Dashboard view, Stats View switching & state binding.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Views
  const mainView = document.getElementById('mainView');
  const statsView = document.getElementById('statsView');

  // Navigation Buttons
  const openStatsBtn = document.getElementById('openStatsBtn');
  const footerStatsBtn = document.getElementById('footerStatsBtn');
  const backFromStatsBtn = document.getElementById('backFromStatsBtn');
  const statsDoneBtn = document.getElementById('statsDoneBtn');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const footerSettingsBtn = document.getElementById('footerSettingsBtn');

  // Header Elements
  const connectionBadge = document.getElementById('connectionBadge');
  const connectionText = document.getElementById('connectionText');

  // Main View Elements
  const autoSyncToggle = document.getElementById('autoSyncToggle');
  const streakBadge = document.getElementById('streakBadge');
  const weekGrid = document.getElementById('weekGrid');
  const weeklyProgressBar = document.getElementById('weeklyProgressBar');
  const completedDaysSummary = document.getElementById('completedDaysSummary');
  const streakSummary = document.getElementById('streakSummary');

  const repoNameDisplay = document.getElementById('repoNameDisplay');
  const repoBranchDisplay = document.getElementById('repoBranchDisplay');
  const testConnectionBtn = document.getElementById('testConnectionBtn');
  const testConnectionResult = document.getElementById('testConnectionResult');
  const viewGitHubBtn = document.getElementById('viewGitHubBtn');

  // Stats View Elements
  const totalSyncedDisplay = document.getElementById('totalSyncedDisplay');
  const lastSyncDisplay = document.getElementById('lastSyncDisplay');
  const totalSolvedDisplay = document.getElementById('totalSolvedDisplay');
  const recentCountBadge = document.getElementById('recentCountBadge');
  const recentList = document.getElementById('recentList');
  const retryPendingBtn = document.getElementById('retryPendingBtn');

  let currentSettings = null;

  /**
   * Switch between Main Dashboard and Stats View.
   */
  function showView(viewName) {
    if (viewName === 'stats') {
      mainView.style.display = 'none';
      statsView.style.display = 'flex';
      openStatsBtn.style.color = 'var(--accent-blue)';
    } else {
      statsView.style.display = 'none';
      mainView.style.display = 'flex';
      openStatsBtn.style.color = '';
    }
  }

  openStatsBtn.addEventListener('click', () => showView('stats'));
  footerStatsBtn.addEventListener('click', () => showView('stats'));
  backFromStatsBtn.addEventListener('click', () => showView('main'));
  statsDoneBtn.addEventListener('click', () => showView('main'));

  /**
   * Format relative time (e.g., "2 min ago", "Just now", "Never").
   */
  function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diffSec = Math.floor((now - timestamp) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} d ago`;
  }

  /**
   * Render weekly challenge 7-day indicators (M T W T F S S).
   */
  function renderWeeklyIndicators(weeklyStats) {
    if (!weeklyStats || !weeklyStats.weekDays) return;

    streakBadge.textContent = `🔥 ${weeklyStats.currentStreak}`;
    weeklyProgressBar.style.width = `${weeklyStats.weeklyPercentage}%`;
    completedDaysSummary.textContent = `${weeklyStats.completedDays} / 7 DAYS COMPLETED`;
    streakSummary.textContent = `Current Streak: ${weeklyStats.currentStreak} days • Longest: ${weeklyStats.longestStreak} days`;

    weekGrid.innerHTML = '';
    for (const day of weeklyStats.weekDays) {
      const col = document.createElement('div');
      col.className = 'day-col' + (day.isToday ? ' today' : '');

      const lbl = document.createElement('span');
      lbl.className = 'day-lbl';
      lbl.textContent = day.dayLabel;

      const status = document.createElement('span');
      if (day.completed) {
        status.className = 'day-status completed';
        status.textContent = '✓';
      } else {
        status.className = 'day-status empty';
        status.textContent = '○';
      }

      col.appendChild(lbl);
      col.appendChild(status);
      weekGrid.appendChild(col);
    }
  }

  /**
   * Render recent submissions list in the Stats view.
   */
  function renderRecentSubmissions(submissions) {
    if (!submissions || submissions.length === 0) {
      recentList.innerHTML = '<div class="empty-state">No submissions recorded yet.</div>';
      if (recentCountBadge) recentCountBadge.textContent = '0 items';
      return;
    }

    if (recentCountBadge) {
      recentCountBadge.textContent = `${submissions.length} item${submissions.length === 1 ? '' : 's'}`;
    }

    recentList.innerHTML = '';
    for (const item of submissions) {
      const row = document.createElement('div');
      row.className = 'recent-item';

      const left = document.createElement('div');
      left.className = 'recent-item-left';

      const statusIcon = document.createElement('span');
      statusIcon.className = `status-icon ${item.status || 'synced'}`;
      statusIcon.textContent = item.status === 'synced' ? '✓' : item.status === 'failed' ? '✗' : '○';

      const title = document.createElement('span');
      title.className = 'recent-title';
      title.textContent = item.title || 'Untitled';
      title.title = item.title || '';

      left.appendChild(statusIcon);
      left.appendChild(title);

      const right = document.createElement('div');
      right.className = 'recent-item-right';

      const langTag = document.createElement('span');
      langTag.className = 'lang-tag';
      langTag.textContent = item.language || 'Code';

      const runtimeSpan = document.createElement('span');
      runtimeSpan.textContent = item.runtime || '-';

      right.appendChild(langTag);
      right.appendChild(runtimeSpan);

      // If commitUrl is present, make row clickable
      if (item.commitUrl) {
        row.style.cursor = 'pointer';
        row.title = 'Click to view commit on GitHub';
        row.addEventListener('click', () => {
          chrome.tabs.create({ url: item.commitUrl });
        });
      }

      row.appendChild(left);
      row.appendChild(right);
      recentList.appendChild(row);
    }
  }

  /**
   * Load and render full state from background service worker.
   */
  function loadDashboardState() {
    chrome.runtime.sendMessage({ type: 'GET_POPUP_STATE' }, response => {
      if (!response) {
        console.warn('Failed to load state from background service worker');
        return;
      }

      const { settings, weeklyStats, recentSubmissions, syncStats, isConnected } = response;
      currentSettings = settings;

      // 1. Connection status
      if (isConnected) {
        connectionBadge.className = 'connection-badge connected';
        connectionText.textContent = 'GitHub Connected';
      } else {
        connectionBadge.className = 'connection-badge disconnected';
        connectionText.textContent = 'GitHub Disconnected';
      }

      // 2. Auto Sync Toggle
      autoSyncToggle.checked = Boolean(settings.autoSync);

      // 3. Weekly Challenge
      renderWeeklyIndicators(weeklyStats);

      // 4. GitHub Repository Details
      if (settings.owner && settings.repo) {
        repoNameDisplay.textContent = `${settings.owner}/${settings.repo}`;
        repoBranchDisplay.textContent = `Branch: ${settings.branch || 'main'}`;
        viewGitHubBtn.disabled = false;
        viewGitHubBtn.onclick = () => {
          chrome.tabs.create({ url: `https://github.com/${settings.owner}/${settings.repo}` });
        };
      } else {
        repoNameDisplay.textContent = 'Not configured';
        repoBranchDisplay.textContent = 'Configure in Settings';
        viewGitHubBtn.disabled = true;
      }

      // 5. Statistics (Stats View)
      totalSyncedDisplay.textContent = syncStats.totalSynced || 0;
      lastSyncDisplay.textContent = formatRelativeTime(syncStats.lastSyncTime);
      totalSolvedDisplay.textContent = weeklyStats.totalAcceptedAllTime || 0;

      // 6. Recent Submissions (Stats View)
      renderRecentSubmissions(recentSubmissions);
    });
  }

  // --- Event Listeners ---

  // Auto-sync Toggle change
  autoSyncToggle.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      payload: { autoSync: autoSyncToggle.checked }
    });
  });

  // Open Settings view
  const openSettings = () => {
    window.location.href = 'settings.html';
  };
  openSettingsBtn.addEventListener('click', openSettings);
  footerSettingsBtn.addEventListener('click', openSettings);

  // Retry Pending Tasks in Stats View
  retryPendingBtn.addEventListener('click', () => {
    retryPendingBtn.disabled = true;
    retryPendingBtn.textContent = 'Retrying...';
    chrome.runtime.sendMessage({ type: 'TRIGGER_RETRY' }, () => {
      setTimeout(() => {
        retryPendingBtn.disabled = false;
        retryPendingBtn.textContent = 'Retry Pending';
        loadDashboardState();
      }, 1000);
    });
  });

  // Test Connection
  testConnectionBtn.addEventListener('click', async () => {
    if (!currentSettings || !currentSettings.githubToken) {
      testConnectionResult.style.display = 'block';
      testConnectionResult.className = 'test-result-box error';
      testConnectionResult.textContent = 'Please configure a GitHub token first in Settings.';
      return;
    }

    testConnectionBtn.disabled = true;
    testConnectionBtn.textContent = 'Testing...';
    testConnectionResult.style.display = 'none';

    chrome.runtime.sendMessage({
      type: 'TEST_GITHUB_CONNECTION',
      payload: {
        token: currentSettings.githubToken,
        owner: currentSettings.owner,
        repo: currentSettings.repo,
        branch: currentSettings.branch
      }
    }, response => {
      testConnectionBtn.disabled = false;
      testConnectionBtn.textContent = 'Test Connection';
      testConnectionResult.style.display = 'block';

      if (response && response.success) {
        testConnectionResult.className = 'test-result-box success';
        testConnectionResult.textContent = `✓ Connected successfully to ${response.result.repo} (${response.result.defaultBranch})`;
        connectionBadge.className = 'connection-badge connected';
        connectionText.textContent = 'GitHub Connected';
      } else {
        testConnectionResult.className = 'test-result-box error';
        testConnectionResult.textContent = `✗ ${response?.error || 'Connection failed'}`;
      }
    });
  });

  // Real-time updates: Automatically re-render dashboard whenever streak or sync status changes
  if (typeof chrome !== 'undefined' && chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        loadDashboardState();
      }
    });
  }

  // Initial load
  loadDashboardState();
});
