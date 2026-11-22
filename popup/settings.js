/**
 * Settings Page Controller (popup/settings.js)
 * Implements FR-13 & FR-22: GitHub configuration & connection testing.
 */

document.addEventListener('DOMContentLoaded', () => {
  const backBtn = document.getElementById('backBtn');
  const settingsForm = document.getElementById('settingsForm');
  const githubTokenInput = document.getElementById('githubToken');
  const toggleTokenBtn = document.getElementById('toggleTokenVisibility');
  const ownerInput = document.getElementById('owner');
  const repoInput = document.getElementById('repo');
  const branchInput = document.getElementById('branch');
  const targetDirectoryInput = document.getElementById('targetDirectory');
  const autoSyncCheckbox = document.getElementById('settingsAutoSync');
  const testSettingsBtn = document.getElementById('testSettingsBtn');
  const settingsAlert = document.getElementById('settingsAlert');

  const eyeIcon = document.getElementById('eyeIcon');
  const EYE_PATH = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
  const EYE_OFF_PATH = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';

  // Toggle token visibility
  toggleTokenBtn.addEventListener('click', () => {
    if (githubTokenInput.type === 'password') {
      githubTokenInput.type = 'text';
      if (eyeIcon) eyeIcon.innerHTML = EYE_OFF_PATH;
      toggleTokenBtn.title = 'Hide Token';
    } else {
      githubTokenInput.type = 'password';
      if (eyeIcon) eyeIcon.innerHTML = EYE_PATH;
      toggleTokenBtn.title = 'Show Token';
    }
  });

  // Navigate back to popup dashboard
  backBtn.addEventListener('click', () => {
    window.location.href = 'popup.html';
  });

  // Load existing settings
  chrome.runtime.sendMessage({ type: 'GET_POPUP_STATE' }, response => {
    if (!response || !response.settings) return;
    const { settings } = response;

    githubTokenInput.value = settings.githubToken || '';
    ownerInput.value = settings.owner || '';
    repoInput.value = settings.repo || '';
    branchInput.value = settings.branch || 'main';
    targetDirectoryInput.value = settings.targetDirectory !== undefined ? settings.targetDirectory : 'leetcode';
    autoSyncCheckbox.checked = Boolean(settings.autoSync);

    const folderRadios = document.querySelectorAll('input[name="folderNaming"]');
    for (const radio of folderRadios) {
      if (radio.value === (settings.folderNamingConvention || 'padded')) {
        radio.checked = true;
      }
    }
  });

  function getFormData() {
    const selectedFolderNaming = document.querySelector('input[name="folderNaming"]:checked')?.value || 'padded';
    return {
      githubToken: githubTokenInput.value.trim(),
      owner: ownerInput.value.trim(),
      repo: repoInput.value.trim(),
      branch: branchInput.value.trim() || 'main',
      targetDirectory: targetDirectoryInput.value.trim(),
      folderNamingConvention: selectedFolderNaming,
      autoSync: autoSyncCheckbox.checked
    };
  }

  function showAlert(message, type = 'success') {
    settingsAlert.style.display = 'block';
    settingsAlert.className = `alert-box ${type}`;
    settingsAlert.textContent = message;
  }

  // Test Connection
  testSettingsBtn.addEventListener('click', () => {
    const data = getFormData();
    if (!data.githubToken) {
      showAlert('Please enter a GitHub Access Token before testing.', 'error');
      return;
    }
    if (!data.owner || !data.repo) {
      showAlert('Please specify repository Owner and Name.', 'error');
      return;
    }

    testSettingsBtn.disabled = true;
    testSettingsBtn.textContent = 'Testing...';
    settingsAlert.style.display = 'none';

    chrome.runtime.sendMessage({
      type: 'TEST_GITHUB_CONNECTION',
      payload: {
        token: data.githubToken,
        owner: data.owner,
        repo: data.repo,
        branch: data.branch
      }
    }, response => {
      testSettingsBtn.disabled = false;
      testSettingsBtn.textContent = 'Test Connection';

      if (response && response.success) {
        showAlert(`✓ Connection successful! Verified repository ${response.result.repo} (Branch: ${data.branch})`, 'success');
      } else {
        showAlert(`✗ Connection failed: ${response?.error || 'Unknown error'}`, 'error');
      }
    });
  });

  // Save Settings
  settingsForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = getFormData();

    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      payload: data
    }, response => {
      if (response && response.success) {
        showAlert('✓ Settings saved successfully!', 'success');
        setTimeout(() => {
          window.location.href = 'popup.html';
        }, 800);
      } else {
        showAlert('Failed to save settings.', 'error');
      }
    });
  });
});
