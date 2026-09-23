// ==============================================================================
// STATE MANAGEMENT
// ==============================================================================
const state = {
  token: localStorage.getItem('filetrack_token') || null,
  user: null,
  currentFolderId: null,
  sourceFilter: 'all', // 'all', 'scan', 'upload'
  breadcrumbs: [],
  folders: [],
  files: [],
  rawFiles: [], // Unfiltered files in current folder
  viewMode: localStorage.getItem('filetrack_view') || 'grid',
  activeScanJobId: null,
  scanPollInterval: null,
  scannerInfo: null,
  allFoldersCache: [],
  // Pagination
  currentPage: 1,
  PER_PAGE: 8,
  // Sorting
  sortField: 'date',   // 'date' | 'name' | 'size'
  sortOrder: 'desc'    // 'asc' | 'desc'
};

// ==============================================================================
// DOM SELECTORS
// ==============================================================================
const dom = {
  // Views & Layout
  loginView: document.getElementById('loginView'),
  appView: document.getElementById('appView'),
  sidebar: document.getElementById('sidebar'),
  sidebarBackdrop: document.getElementById('sidebarBackdrop'),
  mobileMenuBtn: document.getElementById('mobileMenuBtn'),
  closeSidebarBtn: document.getElementById('closeSidebarBtn'),

  // Auth
  loginForm: document.getElementById('loginForm'),
  loginUsername: document.getElementById('loginUsername'),
  loginPassword: document.getElementById('loginPassword'),
  loginBtn: document.getElementById('loginBtn'),
  loginError: document.getElementById('loginError'),
  logoutBtn: document.getElementById('logoutBtn'),
  userDisplayName: document.getElementById('userDisplayName'),
  userInitial: document.getElementById('userInitial'),

  // Auth Tabs & Extra Forms
  tabLogin: document.getElementById('tabLogin'),
  tabRegister: document.getElementById('tabRegister'),
  tabChangePass: document.getElementById('tabChangePass'),
  createAccountForm: document.getElementById('createAccountForm'),
  changePasswordForm: document.getElementById('changePasswordForm'),

  regAdminUsername: document.getElementById('regAdminUsername'),
  regAdminPassword: document.getElementById('regAdminPassword'),
  regNewUsername: document.getElementById('regNewUsername'),
  regDisplayName: document.getElementById('regDisplayName'),
  regNewPassword: document.getElementById('regNewPassword'),
  regConfirmPassword: document.getElementById('regConfirmPassword'),
  regStorageDefault: document.getElementById('regStorageDefault'),
  regStorageGroup: document.getElementById('regStorageGroup'),
  regStorageQuota: document.getElementById('regStorageQuota'),
  btnRegisterSubmit: document.getElementById('btnRegisterSubmit'),
  regError: document.getElementById('regError'),
  regSuccess: document.getElementById('regSuccess'),

  cpAdminUsername: document.getElementById('cpAdminUsername'),
  cpAdminPassword: document.getElementById('cpAdminPassword'),
  cpTargetUsername: document.getElementById('cpTargetUsername'),
  cpNewPassword: document.getElementById('cpNewPassword'),
  cpConfirmPassword: document.getElementById('cpConfirmPassword'),
  btnChangePassSubmit: document.getElementById('btnChangePassSubmit'),
  cpError: document.getElementById('cpError'),
  cpSuccess: document.getElementById('cpSuccess'),

  // Sidebar Nav & Filters
  navAllDocs: document.getElementById('navAllDocs'),
  navScansOnly: document.getElementById('navScansOnly'),
  navUploadsOnly: document.getElementById('navUploadsOnly'),
  navDocCount: document.getElementById('navDocCount'),
  navScanBadge: document.getElementById('navScanBadge'),
  navUploadBadge: document.getElementById('navUploadBadge'),
  sidebarFoldersList: document.getElementById('sidebarFoldersList'),
  btnSidebarNewFolder: document.getElementById('btnSidebarNewFolder'),

  // Sidebar Scanner Widget
  scannerStatusBadge: document.getElementById('scannerStatusBadge'),
  sidebarScannerTitle: document.getElementById('sidebarScannerTitle'),
  sidebarScannerSub: document.getElementById('sidebarScannerSub'),
  btnSidebarPingScanner: document.getElementById('btnSidebarPingScanner'),

  // Navigation & Search
  breadcrumbsNav: document.getElementById('breadcrumbsNav'),
  filterIndicator: document.getElementById('filterIndicator'),
  filterIndicatorText: document.getElementById('filterIndicatorText'),
  clearFilterBtn: document.getElementById('clearFilterBtn'),
  globalSearchInput: document.getElementById('globalSearchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),

  // Stats
  statTotalFiles: document.getElementById('statTotalFiles'),
  statScannedCount: document.getElementById('statScannedCount'),
  statStorageSize: document.getElementById('statStorageSize'),

  // Toolbar & Explorer
  btnNewFolder: document.getElementById('btnNewFolder'),
  btnUpload: document.getElementById('btnUpload'),
  fileUploadInput: document.getElementById('fileUploadInput'),
  btnScanTrigger: document.getElementById('btnScanTrigger'),
  btnViewGrid: document.getElementById('btnViewGrid'),
  btnViewList: document.getElementById('btnViewList'),

  dropZone: document.getElementById('dropZone'),
  uploadProgressContainer: document.getElementById('uploadProgressContainer'),
  uploadProgressBar: document.getElementById('uploadProgressBar'),
  uploadProgressText: document.getElementById('uploadProgressText'),

  foldersSection: document.getElementById('foldersSection'),
  foldersGrid: document.getElementById('foldersGrid'),
  foldersCountBadge: document.getElementById('foldersCountBadge'),

  filesSection: document.getElementById('filesSection'),
  filesContainer: document.getElementById('filesContainer'),
  filesCountBadge: document.getElementById('filesCountBadge'),
  emptyRepositoryNotice: document.getElementById('emptyRepositoryNotice'),

  // Scan Modal
  scanModal: document.getElementById('scanModal'),
  closeScanModal: document.getElementById('closeScanModal'),
  scanStepSettings: document.getElementById('scanStepSettings'),
  scanStepProgress: document.getElementById('scanStepProgress'),
  scanStepPreview: document.getElementById('scanStepPreview'),
  scannerIndicator: document.getElementById('scannerIndicator'),
  scannerModelName: document.getElementById('scannerModelName'),
  scannerNoticeText: document.getElementById('scannerNoticeText'),
  btnRefreshScanner: document.getElementById('btnRefreshScanner'),
  sourcePlatenLabel: document.getElementById('sourcePlatenLabel'),
  sourceFeederLabel: document.getElementById('sourceFeederLabel'),
  scanResolution: document.getElementById('scanResolution'),
  scanColorMode: document.getElementById('scanColorMode'),
  btnCancelScanSettings: document.getElementById('btnCancelScanSettings'),
  btnExecuteScan: document.getElementById('btnExecuteScan'),
  previewThumbnailsGrid: document.getElementById('previewThumbnailsGrid'),
  previewPageCount: document.getElementById('previewPageCount'),
  scanDocName: document.getElementById('scanDocName'),
  scanTargetFolder: document.getElementById('scanTargetFolder'),
  formatPdfPill: document.getElementById('formatPdfPill'),
  formatPngPill: document.getElementById('formatPngPill'),
  btnDiscardScan: document.getElementById('btnDiscardScan'),
  btnCommitScan: document.getElementById('btnCommitScan'),

  // File Viewer Modal
  fileViewerModal: document.getElementById('fileViewerModal'),
  closeViewerModal: document.getElementById('closeViewerModal'),
  viewerFileName: document.getElementById('viewerFileName'),
  viewerFileMeta: document.getElementById('viewerFileMeta'),
  viewerDownloadBtn: document.getElementById('viewerDownloadBtn'),
  viewerContent: document.getElementById('viewerContent'),

  // Folder Modal
  folderModal: document.getElementById('folderModal'),
  closeFolderModal: document.getElementById('closeFolderModal'),
  newFolderForm: document.getElementById('newFolderForm'),
  newFolderName: document.getElementById('newFolderName'),
  btnCancelFolder: document.getElementById('btnCancelFolder'),

  // Rename/Move Modal
  renameModal: document.getElementById('renameModal'),
  closeRenameModal: document.getElementById('closeRenameModal'),
  renameForm: document.getElementById('renameForm'),
  renameModalTitle: document.getElementById('renameModalTitle'),
  renameInput: document.getElementById('renameInput'),
  moveFolderGroup: document.getElementById('moveFolderGroup'),
  moveFolderSelect: document.getElementById('moveFolderSelect'),
  btnCancelRename: document.getElementById('btnCancelRename'),

  // Delete Confirm Modal
  confirmDeleteModal: document.getElementById('confirmDeleteModal'),
  closeDeleteModal: document.getElementById('closeDeleteModal'),
  deleteConfirmText: document.getElementById('deleteConfirmText'),
  btnCancelDelete: document.getElementById('btnCancelDelete'),
  btnConfirmDelete: document.getElementById('btnConfirmDelete'),

  // Toast Container
  toastContainer: document.getElementById('toastContainer'),

  // Sort controls
  sortField: document.getElementById('sortField'),
  sortOrderBtn: document.getElementById('sortOrderBtn'),
  sortOrderLabel: document.getElementById('sortOrderLabel'),
  sortAscIcon: document.getElementById('sortAscIcon'),
  sortDescIcon: document.getElementById('sortDescIcon'),

  // Pagination
  paginationContainer: document.getElementById('paginationContainer'),
  btnPrevPage: document.getElementById('btnPrevPage'),
  btnNextPage: document.getElementById('btnNextPage'),
  pageNumbersList: document.getElementById('pageNumbersList'),
  pageInfo: document.getElementById('pageInfo'),

  // Upload staging modal
  uploadStagingModal: document.getElementById('uploadStagingModal'),
  closeUploadStagingModal: document.getElementById('closeUploadStagingModal'),
  stagingFileList: document.getElementById('stagingFileList'),
  stagingAddMoreInput: document.getElementById('stagingAddMoreInput'),
  stagingSubtitle: document.getElementById('stagingSubtitle'),
  btnCancelUploadStaging: document.getElementById('btnCancelUploadStaging'),
  btnCommitUpload: document.getElementById('btnCommitUpload'),
  commitUploadLabel: document.getElementById('commitUploadLabel'),

  // User Management Modal
  btnManageUsers: document.getElementById('btnManageUsers'),
  userMgmtModal: document.getElementById('userMgmtModal'),
  closeUserMgmtModal: document.getElementById('closeUserMgmtModal'),
  closeBtnUserMgmt: document.getElementById('closeBtnUserMgmt'),
  btnRefreshUsers: document.getElementById('btnRefreshUsers'),
  userMgmtCount: document.getElementById('userMgmtCount'),
  btnToggleAddUser: document.getElementById('btnToggleAddUser'),
  toggleAddUserLabel: document.getElementById('toggleAddUserLabel'),
  userMgmtAddBox: document.getElementById('userMgmtAddBox'),
  btnCloseAddUserBox: document.getElementById('btnCloseAddUserBox'),
  userMgmtAddForm: document.getElementById('userMgmtAddForm'),
  umNewUsername: document.getElementById('umNewUsername'),
  umDisplayName: document.getElementById('umDisplayName'),
  umNewPassword: document.getElementById('umNewPassword'),
  umStorageQuota: document.getElementById('umStorageQuota'),
  umAddError: document.getElementById('umAddError'),
  btnCancelAddUser: document.getElementById('btnCancelAddUser'),
  btnSubmitAddUser: document.getElementById('btnSubmitAddUser'),
  userMgmtLoading: document.getElementById('userMgmtLoading'),
  userMgmtTable: document.getElementById('userMgmtTable'),
  userMgmtTableBody: document.getElementById('userMgmtTableBody'),
  userMgmtError: document.getElementById('userMgmtError')
};

// ==============================================================================
// UTILITIES & API CLIENT
// ==============================================================================

async function api(endpoint, options = {}) {
  const headers = options.headers || {};
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Session expired or unauthorized.');
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || data.message || 'API request failed.');
    }
    return data;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'API request failed.');
  }

  return response;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  dom.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ==============================================================================
// AUTHENTICATION LOGIC
// ==============================================================================

function applyUserData(user) {
  if (!user) return;
  const displayName = user.display_name || user.username || 'User';
  if (dom.userDisplayName) dom.userDisplayName.textContent = displayName;
  if (dom.userInitial) dom.userInitial.textContent = displayName.charAt(0).toUpperCase();

  const isAdmin = user.username === 'admin';
  const roleLabel = document.getElementById('userRoleLabel');
  if (roleLabel) {
    roleLabel.textContent = isAdmin ? 'Administrator' : 'User';
  }
  if (dom.btnManageUsers) {
    dom.btnManageUsers.classList.toggle('hidden', !isAdmin);
  }
}

async function checkAuth() {
  if (!state.token) {
    showLoginView();
    return;
  }
  try {
    const user = await api('/api/me');
    state.user = user;
    applyUserData(user);
    showAppView();
    loadFolder(null);
    loadStats();
    checkScannerStatus();
  } catch (err) {
    showLoginView();
  }
}

function showLoginView() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('filetrack_token');
  dom.loginView.classList.remove('hidden');
  dom.loginView.classList.add('active');
  dom.appView.classList.add('hidden');
  if (dom.btnManageUsers) dom.btnManageUsers.classList.add('hidden');
  if (dom.userMgmtModal) dom.userMgmtModal.classList.add('hidden');
}

function showAppView() {
  dom.loginView.classList.remove('active');
  dom.loginView.classList.add('hidden');
  dom.appView.classList.remove('hidden');
}

function handleUnauthorized() {
  showLoginView();
  showToast('Please log in to continue.', 'error');
}

dom.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = dom.loginUsername.value.trim();
  const password = dom.loginPassword.value;

  dom.loginError.classList.add('hidden');
  dom.loginBtn.disabled = true;
  dom.loginBtn.querySelector('span').textContent = 'Authenticating...';

  try {
    const res = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    state.token = res.token;
    state.user = res.user;
    localStorage.setItem('filetrack_token', res.token);

    applyUserData(res.user);

    showAppView();
    loadFolder(null);
    loadStats();
    checkScannerStatus();
    showToast('Signed in to repository.', 'success');
  } catch (err) {
    dom.loginError.textContent = err.message || 'Login failed.';
    dom.loginError.classList.remove('hidden');
  } finally {
    dom.loginBtn.disabled = false;
    dom.loginBtn.querySelector('span').textContent = 'Sign In to Repository';
  }
});

// ==============================================================================
// AUTH TABS & ADMIN-AUTHORIZED USER MANAGEMENT
// ==============================================================================

function switchAuthTab(tab) {
  // Tabs
  dom.tabLogin.classList.toggle('active', tab === 'login');
  dom.tabRegister.classList.toggle('active', tab === 'register');
  dom.tabChangePass.classList.toggle('active', tab === 'changepass');

  // Forms
  dom.loginForm.classList.toggle('hidden', tab !== 'login');
  dom.createAccountForm.classList.toggle('hidden', tab !== 'register');
  dom.changePasswordForm.classList.toggle('hidden', tab !== 'changepass');

  // Clear notices
  dom.loginError.classList.add('hidden');
  dom.regError.classList.add('hidden');
  dom.regSuccess.classList.add('hidden');
  dom.cpError.classList.add('hidden');
  dom.cpSuccess.classList.add('hidden');

  // Set default admin username if empty
  if (tab === 'register' && !dom.regAdminUsername.value) {
    dom.regAdminUsername.value = 'admin';
  }
  if (tab === 'changepass' && !dom.cpAdminUsername.value) {
    dom.cpAdminUsername.value = 'admin';
  }
}

dom.tabLogin.addEventListener('click', () => switchAuthTab('login'));
dom.tabRegister.addEventListener('click', () => switchAuthTab('register'));
dom.tabChangePass.addEventListener('click', () => switchAuthTab('changepass'));

// CREATE NEW ACCOUNT (ADMIN AUTHORIZED)
dom.createAccountForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  dom.regError.classList.add('hidden');
  dom.regSuccess.classList.add('hidden');

  const adminUsername = dom.regAdminUsername.value.trim();
  const adminPassword = dom.regAdminPassword.value;
  const newUsername = dom.regNewUsername.value.trim();
  const displayName = dom.regDisplayName ? dom.regDisplayName.value.trim() : '';
  const newPassword = dom.regNewPassword.value;
  const confirmPassword = dom.regConfirmPassword.value;

  if (!adminUsername || !adminPassword) {
    dom.regError.textContent = 'Admin credentials are required to authorize account creation.';
    dom.regError.classList.remove('hidden');
    return;
  }

  if (newPassword.length < 6) {
    dom.regError.textContent = 'New password must be at least 6 characters long.';
    dom.regError.classList.remove('hidden');
    return;
  }

  if (newPassword !== confirmPassword) {
    dom.regError.textContent = 'New passwords do not match. Please verify.';
    dom.regError.classList.remove('hidden');
    return;
  }

  let storageQuotaMb = null;
  if (dom.regStorageDefault && !dom.regStorageDefault.checked) {
    const parsedQuota = parseInt(dom.regStorageQuota.value, 10);
    if (isNaN(parsedQuota) || parsedQuota <= 0) {
      dom.regError.textContent = 'Please enter a valid positive storage limit in MB, or select system default.';
      dom.regError.classList.remove('hidden');
      return;
    }
    storageQuotaMb = parsedQuota;
  }

  dom.btnRegisterSubmit.disabled = true;
  dom.btnRegisterSubmit.querySelector('span').textContent = 'Creating account...';

  try {
    const payload = {
      admin_username: adminUsername,
      admin_password: adminPassword,
      new_username: newUsername,
      new_password: newPassword
    };
    if (displayName) payload.display_name = displayName;
    if (storageQuotaMb) payload.storage_quota_mb = storageQuotaMb;

    const res = await api('/api/auth/create-account', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const successMsg = res.message || `Account '${displayName || newUsername}' created successfully!`;
    dom.regSuccess.textContent = successMsg;
    dom.regSuccess.classList.remove('hidden');
    showToast(`Account '${displayName || newUsername}' created! You may now sign in.`, 'success');

    // Reset fields
    dom.regNewUsername.value = '';
    if (dom.regDisplayName) dom.regDisplayName.value = '';
    dom.regNewPassword.value = '';
    dom.regConfirmPassword.value = '';
    dom.regAdminPassword.value = '';
    if (dom.regStorageDefault) dom.regStorageDefault.checked = true;
    if (dom.regStorageGroup) dom.regStorageGroup.classList.add('hidden');
    if (dom.regStorageQuota) dom.regStorageQuota.value = '';

    // If user management table is open, reload it
    if (dom.userMgmtModal && !dom.userMgmtModal.classList.contains('hidden')) {
      loadUserManagementTable();
    }

    // Automatically switch to login tab with the new username pre-filled
    setTimeout(() => {
      switchAuthTab('login');
      dom.loginUsername.value = newUsername;
      dom.loginPassword.value = '';
      dom.loginPassword.focus();
    }, 1800);

  } catch (err) {
    dom.regError.textContent = err.message || 'Failed to create account.';
    dom.regError.classList.remove('hidden');
  } finally {
    dom.btnRegisterSubmit.disabled = false;
    dom.btnRegisterSubmit.querySelector('span').textContent = 'Create Account';
  }
});

// Storage Default Checkbox Toggle
if (dom.regStorageDefault && dom.regStorageGroup) {
  dom.regStorageDefault.addEventListener('change', () => {
    const isCustom = !dom.regStorageDefault.checked;
    dom.regStorageGroup.classList.toggle('hidden', !isCustom);
    if (isCustom && dom.regStorageQuota) {
      dom.regStorageQuota.focus();
    }
  });
}

// CHANGE PASSWORD (ADMIN AUTHORIZED)
dom.changePasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  dom.cpError.classList.add('hidden');
  dom.cpSuccess.classList.add('hidden');

  const adminUsername = dom.cpAdminUsername.value.trim();
  const adminPassword = dom.cpAdminPassword.value;
  const targetUsername = dom.cpTargetUsername.value.trim();
  const newPassword = dom.cpNewPassword.value;
  const confirmPassword = dom.cpConfirmPassword.value;

  if (!adminUsername || !adminPassword) {
    dom.cpError.textContent = 'Admin credentials are required to authorize password change.';
    dom.cpError.classList.remove('hidden');
    return;
  }

  if (!targetUsername) {
    dom.cpError.textContent = 'Target account username is required.';
    dom.cpError.classList.remove('hidden');
    return;
  }

  if (newPassword.length < 6) {
    dom.cpError.textContent = 'New password must be at least 6 characters long.';
    dom.cpError.classList.remove('hidden');
    return;
  }

  if (newPassword !== confirmPassword) {
    dom.cpError.textContent = 'New passwords do not match. Please verify.';
    dom.cpError.classList.remove('hidden');
    return;
  }

  dom.btnChangePassSubmit.disabled = true;
  dom.btnChangePassSubmit.querySelector('span').textContent = 'Updating password...';

  try {
    const res = await api('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        admin_username: adminUsername,
        admin_password: adminPassword,
        target_username: targetUsername,
        new_password: newPassword
      })
    });

    dom.cpSuccess.textContent = res.message || `Password for '${targetUsername}' updated successfully!`;
    dom.cpSuccess.classList.remove('hidden');
    showToast(`Password for '${targetUsername}' updated!`, 'success');

    // Reset fields
    dom.cpTargetUsername.value = '';
    dom.cpNewPassword.value = '';
    dom.cpConfirmPassword.value = '';
    dom.cpAdminPassword.value = '';

    // Automatically switch to login tab with the target username pre-filled
    setTimeout(() => {
      switchAuthTab('login');
      dom.loginUsername.value = targetUsername;
      dom.loginPassword.value = '';
      dom.loginPassword.focus();
    }, 1800);

  } catch (err) {
    dom.cpError.textContent = err.message || 'Failed to update password.';
    dom.cpError.classList.remove('hidden');
  } finally {
    dom.btnChangePassSubmit.disabled = false;
    dom.btnChangePassSubmit.querySelector('span').textContent = 'Update Password';
  }
});


dom.logoutBtn.addEventListener('click', async () => {
  try {
    await api('/api/logout', { method: 'POST' });
  } catch (e) {
    // Ignore logout error
  }
  showLoginView();
  showToast('Logged out successfully.');
});

// ==============================================================================
// USER MANAGEMENT (ADMIN ONLY)
// ==============================================================================

async function loadUserManagementTable() {
  if (!dom.userMgmtTableBody) return;

  if (dom.userMgmtLoading) dom.userMgmtLoading.classList.remove('hidden');
  if (dom.userMgmtTable) dom.userMgmtTable.classList.add('hidden');
  if (dom.userMgmtError) dom.userMgmtError.classList.add('hidden');

  try {
    const res = await api('/api/auth/users');
    const users = res.users || [];

    if (dom.userMgmtCount) {
      dom.userMgmtCount.textContent = users.length;
    }

    if (users.length === 0) {
      dom.userMgmtTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">
            No registered users found.
          </td>
        </tr>
      `;
    } else {
      dom.userMgmtTableBody.innerHTML = users.map(u => {
        const isSelf = state.user && (state.user.id === u.id || state.user.username === u.username);
        const isAdminAccount = u.username === 'admin';
        const createdStr = u.created_at
          ? new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
          : '—';
        const storageBadge = u.storage_quota_mb
          ? `<span class="badge" style="background:rgba(99,102,241,0.12);color:#6366f1;font-weight:600;padding:3px 8px;border-radius:12px;font-size:12px;">${escapeHtml(u.storage_label || (u.storage_quota_mb + ' MB'))}</span>`
          : `<span class="badge" style="background:rgba(100,116,139,0.1);color:var(--text-muted);padding:3px 8px;border-radius:12px;font-size:12px;">Default</span>`;

        let actionHtml = '';
        if (isAdminAccount) {
          actionHtml = `<span style="font-size:12px;color:var(--text-muted);font-style:italic;">Admin (Protected)</span>`;
        } else if (isSelf) {
          actionHtml = `<span style="font-size:12px;color:var(--text-muted);font-style:italic;">Current User</span>`;
        } else {
          actionHtml = `
            <button class="btn btn-xs btn-danger btn-delete-user" data-id="${u.id}" data-username="${escapeHtml(u.username)}" style="padding:4px 10px;font-size:12px;background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;cursor:pointer;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;vertical-align:middle;">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Delete
            </button>
          `;
        }

        return `
          <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:10px 12px;color:var(--text-muted);font-size:12px;">#${u.id}</td>
            <td style="padding:10px 12px;font-weight:600;color:var(--text-primary);">${escapeHtml(u.display_name || u.username)}</td>
            <td style="padding:10px 12px;color:var(--text-muted);font-family:monospace;font-size:13px;">${escapeHtml(u.username)}</td>
            <td style="padding:10px 12px;">${storageBadge}</td>
            <td style="padding:10px 12px;font-size:13px;color:var(--text-muted);">${createdStr}</td>
            <td style="padding:10px 12px;">${actionHtml}</td>
          </tr>
        `;
      }).join('');

      // Wire up delete buttons
      dom.userMgmtTableBody.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', async () => {
          const uid = btn.getAttribute('data-id');
          const uname = btn.getAttribute('data-username');
          if (!confirm(`Are you sure you want to permanently delete the user account "${uname}"?`)) {
            return;
          }
          btn.disabled = true;
          try {
            const delRes = await api(`/api/auth/users/${uid}`, { method: 'DELETE' });
            showToast(delRes.message || `User '${uname}' deleted.`, 'success');
            await loadUserManagementTable();
          } catch (err) {
            showToast(err.message || 'Failed to delete user.', 'error');
            btn.disabled = false;
          }
        });
      });
    }

    if (dom.userMgmtLoading) dom.userMgmtLoading.classList.add('hidden');
    if (dom.userMgmtTable) dom.userMgmtTable.classList.remove('hidden');

  } catch (err) {
    if (dom.userMgmtLoading) dom.userMgmtLoading.classList.add('hidden');
    if (dom.userMgmtError) {
      dom.userMgmtError.textContent = err.message || 'Failed to load user accounts.';
      dom.userMgmtError.classList.remove('hidden');
    }
  }
}

// User Management Modal Open / Close / Refresh
if (dom.btnManageUsers) {
  dom.btnManageUsers.addEventListener('click', () => {
    if (dom.userMgmtModal) {
      dom.userMgmtModal.classList.remove('hidden');
      if (dom.userMgmtAddBox) dom.userMgmtAddBox.classList.add('hidden');
      if (dom.toggleAddUserLabel) dom.toggleAddUserLabel.textContent = 'Add User';
      loadUserManagementTable();
    }
  });
}

if (dom.closeUserMgmtModal) {
  dom.closeUserMgmtModal.addEventListener('click', () => {
    if (dom.userMgmtModal) dom.userMgmtModal.classList.add('hidden');
  });
}

if (dom.closeBtnUserMgmt) {
  dom.closeBtnUserMgmt.addEventListener('click', () => {
    if (dom.userMgmtModal) dom.userMgmtModal.classList.add('hidden');
  });
}

if (dom.btnRefreshUsers) {
  dom.btnRefreshUsers.addEventListener('click', () => {
    loadUserManagementTable();
  });
}

// Collapsible Add User Form in Modal
function toggleAddUserBox(forceState) {
  if (!dom.userMgmtAddBox) return;
  const isHidden = dom.userMgmtAddBox.classList.contains('hidden');
  const shouldOpen = typeof forceState === 'boolean' ? forceState : isHidden;
  dom.userMgmtAddBox.classList.toggle('hidden', !shouldOpen);
  if (dom.toggleAddUserLabel) {
    dom.toggleAddUserLabel.textContent = shouldOpen ? 'Close Form' : 'Add User';
  }
  if (shouldOpen && dom.umNewUsername) {
    dom.umNewUsername.focus();
  }
}

if (dom.btnToggleAddUser) {
  dom.btnToggleAddUser.addEventListener('click', () => toggleAddUserBox());
}

if (dom.btnCloseAddUserBox) {
  dom.btnCloseAddUserBox.addEventListener('click', () => toggleAddUserBox(false));
}

if (dom.btnCancelAddUser) {
  dom.btnCancelAddUser.addEventListener('click', () => toggleAddUserBox(false));
}

if (dom.userMgmtAddForm) {
  dom.userMgmtAddForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (dom.umAddError) dom.umAddError.classList.add('hidden');

    const newUsername = dom.umNewUsername.value.trim();
    const displayName = dom.umDisplayName.value.trim();
    const newPassword = dom.umNewPassword.value;
    const rawQuota = dom.umStorageQuota.value.trim();

    if (!newUsername) {
      if (dom.umAddError) {
        dom.umAddError.textContent = 'Username is required.';
        dom.umAddError.classList.remove('hidden');
      }
      return;
    }

    if (newPassword.length < 6) {
      if (dom.umAddError) {
        dom.umAddError.textContent = 'Password must be at least 6 characters.';
        dom.umAddError.classList.remove('hidden');
      }
      return;
    }

    let storageQuotaMb = null;
    if (rawQuota) {
      const parsed = parseInt(rawQuota, 10);
      if (isNaN(parsed) || parsed <= 0) {
        if (dom.umAddError) {
          dom.umAddError.textContent = 'Please enter a valid positive storage limit in MB.';
          dom.umAddError.classList.remove('hidden');
        }
        return;
      }
      storageQuotaMb = parsed;
    }

    dom.btnSubmitAddUser.disabled = true;
    dom.btnSubmitAddUser.textContent = 'Creating...';

    try {
      const payload = {
        new_username: newUsername,
        new_password: newPassword
      };
      if (displayName) payload.display_name = displayName;
      if (storageQuotaMb) payload.storage_quota_mb = storageQuotaMb;

      const res = await api('/api/auth/create-account', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      showToast(res.message || `User '${displayName || newUsername}' created!`, 'success');

      // Reset form
      dom.umNewUsername.value = '';
      dom.umDisplayName.value = '';
      dom.umNewPassword.value = '';
      dom.umStorageQuota.value = '';
      toggleAddUserBox(false);

      await loadUserManagementTable();

    } catch (err) {
      if (dom.umAddError) {
        dom.umAddError.textContent = err.message || 'Failed to create user account.';
        dom.umAddError.classList.remove('hidden');
      }
    } finally {
      dom.btnSubmitAddUser.disabled = false;
      dom.btnSubmitAddUser.textContent = 'Create Account';
    }
  });
}


// ==============================================================================
// SIDEBAR TOGGLE (MOBILE / RESPONSIVE)
// ==============================================================================
dom.mobileMenuBtn.addEventListener('click', () => {
  dom.sidebar.classList.add('open');
  dom.sidebarBackdrop.classList.remove('hidden');
});

dom.closeSidebarBtn.addEventListener('click', closeMobileSidebar);
dom.sidebarBackdrop.addEventListener('click', closeMobileSidebar);

function closeMobileSidebar() {
  dom.sidebar.classList.remove('open');
  dom.sidebarBackdrop.classList.add('hidden');
}

// ==============================================================================
// SIDEBAR FILTERS & NAVIGATION
// ==============================================================================
dom.navAllDocs.addEventListener('click', (e) => {
  e.preventDefault();
  setSourceFilter('all');
  loadFolder(null);
  closeMobileSidebar();
});

dom.navScansOnly.addEventListener('click', (e) => {
  e.preventDefault();
  setSourceFilter('scan');
  closeMobileSidebar();
});

dom.navUploadsOnly.addEventListener('click', (e) => {
  e.preventDefault();
  setSourceFilter('upload');
  closeMobileSidebar();
});

dom.clearFilterBtn.addEventListener('click', () => {
  setSourceFilter('all');
});

function setSourceFilter(filter) {
  state.sourceFilter = filter;
  dom.navAllDocs.classList.toggle('active', filter === 'all');
  dom.navScansOnly.classList.toggle('active', filter === 'scan');
  dom.navUploadsOnly.classList.toggle('active', filter === 'upload');

  if (filter === 'all') {
    dom.filterIndicator.classList.add('hidden');
  } else {
    dom.filterIndicator.classList.remove('hidden');
    dom.filterIndicatorText.textContent = `Filtered by: ${filter === 'scan' ? 'Scanned Documents' : 'Direct Uploads'}`;
  }

  applySortAndFilter();
}

// ==============================================================================
// FOLDER & FILE EXPLORATION
// ==============================================================================

async function loadFolder(folderId = null) {
  state.currentFolderId = folderId;
  const endpoint = folderId !== null ? `/api/folders?parent_id=${folderId}` : '/api/folders';

  try {
    const data = await api(endpoint);
    state.breadcrumbs = data.breadcrumbs || [];
    state.folders = data.folders || [];
    state.rawFiles = data.files || [];

    renderBreadcrumbs();
    renderFolders();
    applySortAndFilter();
    fetchAllFoldersTree(); // Updates sidebar quick folders and move dropdown
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderBreadcrumbs() {
  dom.breadcrumbsNav.innerHTML = '';
  state.breadcrumbs.forEach((crumb, idx) => {
    const isLast = idx === state.breadcrumbs.length - 1;
    const item = document.createElement('span');
    item.className = `crumb-item ${isLast ? 'active' : ''}`;
    item.textContent = crumb.name;

    if (!isLast) {
      item.onclick = () => loadFolder(crumb.id);
    }
    dom.breadcrumbsNav.appendChild(item);

    if (!isLast) {
      const sep = document.createElement('span');
      sep.className = 'crumb-separator';
      sep.textContent = '>';
      dom.breadcrumbsNav.appendChild(sep);
    }
  });
}

function renderSidebarFolders() {
  dom.sidebarFoldersList.innerHTML = '';
  if (state.allFoldersCache.length === 0) {
    dom.sidebarFoldersList.innerHTML = '<span style="font-size:0.75rem; color:#94a3b8; padding-left:8px;">No folders yet</span>';
    return;
  }

  state.allFoldersCache.forEach(f => {
    const item = document.createElement('div');
    const isActive = state.currentFolderId === f.id;
    item.className = `sidebar-folder-item ${isActive ? 'active' : ''}`;
    item.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
      <span class="sidebar-folder-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
    `;
    item.onclick = () => {
      loadFolder(f.id);
      closeMobileSidebar();
    };
    dom.sidebarFoldersList.appendChild(item);
  });
}

function renderFolders() {
  dom.foldersGrid.innerHTML = '';
  dom.foldersCountBadge.textContent = state.folders.length;

  if (state.folders.length === 0) {
    dom.foldersSection.classList.add('hidden');
    return;
  }
  dom.foldersSection.classList.remove('hidden');

  state.folders.forEach(f => {
    const card = document.createElement('div');
    card.className = 'folder-card';
    card.innerHTML = `
      <div class="folder-info">
        <div class="folder-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div class="folder-text">
          <div class="folder-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
          <div class="folder-meta">${f.file_count || 0} file(s) &bull; ${f.subfolder_count || 0} subfolder(s)</div>
        </div>
      </div>
      <div class="folder-actions" onclick="event.stopPropagation()">
        <button class="btn-icon" title="Rename Folder" onclick="openRenameModal('folder', ${f.id}, '${escapeHtml(f.name)}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon" title="Delete Folder" onclick="openDeleteModal('folder', ${f.id}, '${escapeHtml(f.name)}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;
    card.onclick = () => loadFolder(f.id);
    dom.foldersGrid.appendChild(card);
  });
}

// ==============================================================================
// SORT + FILTER APPLICATION
// ==============================================================================
function applySortAndFilter() {
  // Apply source filter
  if (state.sourceFilter === 'all') {
    state.files = [...state.rawFiles];
  } else {
    state.files = state.rawFiles.filter(f => f.source === state.sourceFilter);
  }

  // Apply sort
  state.files.sort((a, b) => {
    let valA, valB;
    if (state.sortField === 'name') {
      valA = (a.display_name || '').toLowerCase();
      valB = (b.display_name || '').toLowerCase();
      return state.sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else if (state.sortField === 'size') {
      valA = a.size_bytes || 0;
      valB = b.size_bytes || 0;
    } else { // date
      valA = new Date(a.created_at || 0).getTime();
      valB = new Date(b.created_at || 0).getTime();
    }
    return state.sortOrder === 'asc' ? valA - valB : valB - valA;
  });

  // Reset to page 1 when filter/sort changes
  state.currentPage = 1;
  renderFiles();
}

// ==============================================================================
// RENDER FILES WITH PAGINATION (max 8 per page)
// ==============================================================================
function renderFiles() {
  dom.filesContainer.innerHTML = '';
  dom.filesCountBadge.textContent = state.files.length;

  if (state.files.length === 0) {
    dom.emptyRepositoryNotice.classList.remove('hidden');
    dom.filesContainer.classList.add('hidden');
    dom.paginationContainer.classList.add('hidden');
    return;
  }
  dom.emptyRepositoryNotice.classList.add('hidden');
  dom.filesContainer.classList.remove('hidden');

  if (state.viewMode === 'list') {
    dom.filesContainer.className = 'files-list-view';
  } else {
    dom.filesContainer.className = 'files-grid';
  }

  // Slice to current page
  const totalPages = Math.ceil(state.files.length / state.PER_PAGE);
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  if (state.currentPage < 1) state.currentPage = 1;

  const startIdx = (state.currentPage - 1) * state.PER_PAGE;
  const pageFiles = state.files.slice(startIdx, startIdx + state.PER_PAGE);

  pageFiles.forEach(file => {
    const card = document.createElement('div');
    card.className = 'file-card';

    const isPdf = file.file_format === 'pdf';
    const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(file.file_format);
    const sourceClass = file.source === 'scan' ? 'badge-source-scan' : 'badge-source-upload';
    const sourceLabel = file.source === 'scan' ? 'Scan' : 'Upload';

    let thumbHtml = `
      <div class="file-thumb-wrap" onclick="openViewerModal(${file.id})">
        <img src="/static/asset/confidential.png" alt="Confidential" class="file-icon-placeholder" style="object-fit: cover; width: 100%; height: 100%;">
      </div>
    `;

    card.innerHTML = `
      ${thumbHtml}
      <div class="file-details">
        <div class="file-title-wrap">
          <span class="file-title" onclick="openViewerModal(${file.id})" title="${escapeHtml(file.display_name)}">
            ${escapeHtml(file.display_name)}
          </span>
        </div>
        <div class="file-badges">
          <span class="badge-source ${sourceClass}">${sourceLabel}</span>
          <span class="badge-format">${escapeHtml(file.file_format)}</span>
        </div>
        <div class="file-meta-row">
          <span>${formatBytes(file.size_bytes)}</span>
          <span>${formatDate(file.created_at)}</span>
        </div>
      </div>
      <div class="file-actions-bar">
        <button class="btn-icon" title="View Document" onclick="openViewerModal(${file.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
        <a href="/api/files/${file.id}?download=1" class="btn-icon" title="Download File">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </a>
        <button class="btn-icon" title="Rename or Move" onclick="openRenameModal('file', ${file.id}, '${escapeHtml(file.display_name)}', ${file.folder_id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon" title="Delete File" onclick="openDeleteModal('file', ${file.id}, '${escapeHtml(file.display_name)}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;
    dom.filesContainer.appendChild(card);
  });

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  if (totalPages <= 1) {
    dom.paginationContainer.classList.add('hidden');
    return;
  }
  dom.paginationContainer.classList.remove('hidden');

  const cur = state.currentPage;
  dom.pageInfo.textContent = `Page ${cur} of ${totalPages}`;
  dom.btnPrevPage.disabled = cur === 1;
  dom.btnNextPage.disabled = cur === totalPages;

  // Build page number buttons (show up to 5 around current)
  dom.pageNumbersList.innerHTML = '';
  let startPage = Math.max(1, cur - 2);
  let endPage   = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

  if (startPage > 1) {
    appendPageBtn(1, totalPages);
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'page-ellipsis';
      ellipsis.textContent = '…';
      dom.pageNumbersList.appendChild(ellipsis);
    }
  }

  for (let p = startPage; p <= endPage; p++) {
    appendPageBtn(p, totalPages);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'page-ellipsis';
      ellipsis.textContent = '…';
      dom.pageNumbersList.appendChild(ellipsis);
    }
    appendPageBtn(totalPages, totalPages);
  }
}

function appendPageBtn(p, totalPages) {
  const btn = document.createElement('button');
  btn.className = `page-num-btn ${p === state.currentPage ? 'active' : ''}`;
  btn.textContent = p;
  btn.onclick = () => { state.currentPage = p; renderFiles(); };
  dom.pageNumbersList.appendChild(btn);
}

// ==============================================================================
// VIEW TOGGLE (GRID / LIST)
// ==============================================================================
dom.btnViewGrid.addEventListener('click', () => {
  state.viewMode = 'grid';
  localStorage.setItem('filetrack_view', 'grid');
  dom.btnViewGrid.classList.add('active');
  dom.btnViewList.classList.remove('active');
  renderFiles();
});

dom.btnViewList.addEventListener('click', () => {
  state.viewMode = 'list';
  localStorage.setItem('filetrack_view', 'list');
  dom.btnViewList.classList.add('active');
  dom.btnViewGrid.classList.remove('active');
  renderFiles();
});

if (state.viewMode === 'list') {
  dom.btnViewList.classList.add('active');
  dom.btnViewGrid.classList.remove('active');
}

// ==============================================================================
// SORT CONTROLS
// ==============================================================================
dom.sortField.addEventListener('change', () => {
  state.sortField = dom.sortField.value;
  state.currentPage = 1;
  applySortAndFilter();
});

dom.sortOrderBtn.addEventListener('click', () => {
  state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
  dom.sortOrderLabel.textContent = state.sortOrder === 'asc' ? 'ASC' : 'DESC';
  dom.sortAscIcon.classList.toggle('hidden', state.sortOrder !== 'asc');
  dom.sortDescIcon.classList.toggle('hidden', state.sortOrder !== 'desc');
  state.currentPage = 1;
  applySortAndFilter();
});

// ==============================================================================
// PAGINATION CONTROLS
// ==============================================================================
dom.btnPrevPage.addEventListener('click', () => {
  if (state.currentPage > 1) { state.currentPage--; renderFiles(); }
});
dom.btnNextPage.addEventListener('click', () => {
  const totalPages = Math.ceil(state.files.length / state.PER_PAGE);
  if (state.currentPage < totalPages) { state.currentPage++; renderFiles(); }
});

// ==============================================================================
// REPOSITORY STATS & BADGES
// ==============================================================================
async function loadStats() {
  try {
    const stats = await api('/api/stats');
    dom.statTotalFiles.textContent = stats.total_files || 0;
    dom.statScannedCount.textContent = stats.scanned_count || 0;
    dom.statStorageSize.textContent = formatBytes(stats.total_bytes || 0);

    // Update sidebar navigation badges
    dom.navDocCount.textContent = stats.total_files || 0;
    dom.navScanBadge.textContent = stats.scanned_count || 0;
    dom.navUploadBadge.textContent = stats.uploaded_count || 0;
  } catch (err) {
    // Non-blocking
  }
}

// ==============================================================================
// FILE UPLOAD — STAGING MODAL (Select → Review → Upload)
// ==============================================================================

// Staged file list: array of File objects
let stagedFiles = [];

function openUploadStagingModal(newFiles = []) {
  // Merge new files with existing staged (avoid duplicates by name+size)
  newFiles.forEach(f => {
    const already = stagedFiles.some(s => s.name === f.name && s.size === f.size);
    if (!already) stagedFiles.push(f);
  });
  renderStagingList();
  dom.uploadStagingModal.classList.remove('hidden');
}

function renderStagingList() {
  dom.stagingSubtitle.textContent = `${stagedFiles.length} file(s) selected`;
  dom.commitUploadLabel.textContent = `Upload ${stagedFiles.length} File${stagedFiles.length !== 1 ? 's' : ''}`;
  dom.stagingFileList.innerHTML = '';

  if (stagedFiles.length === 0) {
    dom.stagingFileList.innerHTML = '<p class="staging-empty">No files selected. Click "Add More Files" below.</p>';
    return;
  }

  stagedFiles.forEach((file, idx) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const row = document.createElement('div');
    row.className = 'staging-file-row';
    row.innerHTML = `
      <div class="staging-file-icon staging-icon-${['pdf'].includes(ext) ? 'pdf' : ['png','jpg','jpeg','webp'].includes(ext) ? 'image' : 'doc'}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      </div>
      <div class="staging-file-info">
        <span class="staging-file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
        <span class="staging-file-meta">${formatBytes(file.size)} &bull; ${ext.toUpperCase()}</span>
      </div>
      <span class="staging-file-status" id="stage-status-${idx}"></span>
      <button class="staging-remove-btn" onclick="removeStagedFile(${idx})" title="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
    dom.stagingFileList.appendChild(row);
  });
}

function removeStagedFile(idx) {
  stagedFiles.splice(idx, 1);
  renderStagingList();
}

function closeUploadStagingModal() {
  stagedFiles = [];
  dom.uploadStagingModal.classList.add('hidden');
  dom.stagingFileList.innerHTML = '';
  dom.fileUploadInput.value = '';
  dom.stagingAddMoreInput.value = '';
}

// Main upload button → open staging modal
dom.btnUpload.addEventListener('click', () => dom.fileUploadInput.click());

dom.fileUploadInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    openUploadStagingModal(Array.from(e.target.files));
  }
});

// "Add More Files" inside staging modal
dom.stagingAddMoreInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    openUploadStagingModal(Array.from(e.target.files));
    e.target.value = '';
  }
});

dom.closeUploadStagingModal.addEventListener('click', closeUploadStagingModal);
dom.btnCancelUploadStaging.addEventListener('click', closeUploadStagingModal);

// Click outside modal to close
dom.uploadStagingModal.addEventListener('click', (e) => {
  if (e.target === dom.uploadStagingModal) closeUploadStagingModal();
});

// Commit upload
dom.btnCommitUpload.addEventListener('click', async () => {
  if (stagedFiles.length === 0) {
    showToast('No files selected.', 'error');
    return;
  }

  dom.btnCommitUpload.disabled = true;
  dom.commitUploadLabel.textContent = 'Uploading...';

  // Show progress bar
  dom.uploadProgressContainer.classList.remove('hidden');
  dom.uploadProgressBar.style.width = '10%';
  dom.uploadProgressText.textContent = `Uploading ${stagedFiles.length} file(s)...`;

  const formData = new FormData();
  stagedFiles.forEach(f => formData.append('files', f));
  if (state.currentFolderId !== null) {
    formData.append('folder_id', state.currentFolderId);
  }

  try {
    dom.uploadProgressBar.style.width = '60%';
    const res = await api('/api/upload', { method: 'POST', body: formData });
    dom.uploadProgressBar.style.width = '100%';
    dom.uploadProgressText.textContent = 'Upload complete!';
    showToast(`Successfully uploaded ${res.files.length} document(s).`, 'success');

    setTimeout(() => {
      dom.uploadProgressContainer.classList.add('hidden');
      dom.uploadProgressBar.style.width = '0%';
    }, 1400);

    closeUploadStagingModal();
    loadFolder(state.currentFolderId);
    loadStats();
  } catch (err) {
    dom.uploadProgressContainer.classList.add('hidden');
    showToast(err.message, 'error');
  } finally {
    dom.btnCommitUpload.disabled = false;
    dom.commitUploadLabel.textContent = `Upload ${stagedFiles.length} File${stagedFiles.length !== 1 ? 's' : ''}`;
    dom.fileUploadInput.value = '';
  }
});

async function handleFileUpload(fileList) {
  // Legacy shim — redirects to staging modal
  openUploadStagingModal(Array.from(fileList));
}

// ==============================================================================
// SCANNER INTEGRATION & SCAN STUDIO
// ==============================================================================

async function checkScannerStatus() {
  try {
    const caps = await api('/api/scan/capabilities');
    state.scannerInfo = caps;

    if (caps.online) {
      dom.scannerStatusBadge.className = 'sidebar-scanner-card status-online';
      dom.sidebarScannerTitle.textContent = caps.model || 'Canon Scanner';
      dom.sidebarScannerSub.textContent = 'eSCL: Online';

      dom.scannerIndicator.className = 'device-indicator online';
      dom.scannerModelName.textContent = caps.model || 'Canon Network Scanner';
      dom.scannerNoticeText.textContent = 'Ready for eSCL trigger at current LAN IP';
    } else {
      dom.scannerStatusBadge.className = 'sidebar-scanner-card status-offline';
      dom.sidebarScannerTitle.textContent = caps.model || 'Canon Scanner';
      dom.sidebarScannerSub.textContent = 'eSCL: Offline';

      dom.scannerIndicator.className = 'device-indicator offline';
      dom.scannerModelName.textContent = caps.model || 'Scanner (LAN Offline)';
      dom.scannerNoticeText.textContent = caps.message || 'Printer not responding at configured IP.';
    }
  } catch (err) {
    dom.scannerStatusBadge.className = 'sidebar-scanner-card status-offline';
    dom.sidebarScannerSub.textContent = 'eSCL: Error';
  }
}

dom.btnSidebarPingScanner.addEventListener('click', async (e) => {
  e.stopPropagation();
  dom.sidebarScannerSub.textContent = 'Testing...';
  await checkScannerStatus();
  showToast('Scanner status refreshed.');
});

dom.btnRefreshScanner.addEventListener('click', async () => {
  dom.scannerNoticeText.textContent = 'Testing connection to printer...';
  await checkScannerStatus();
  showToast('Scanner status refreshed.');
});

// Source toggle (Platen vs Feeder)
const sourceInputs = document.querySelectorAll('input[name="scanSource"]');
sourceInputs.forEach(input => {
  input.addEventListener('change', () => {
    if (input.value === 'Feeder') {
      dom.sourceFeederLabel.classList.add('active');
      dom.sourcePlatenLabel.classList.remove('active');
    } else {
      dom.sourcePlatenLabel.classList.add('active');
      dom.sourceFeederLabel.classList.remove('active');
    }
  });
});

// Open Scan Studio
dom.btnScanTrigger.addEventListener('click', () => {
  openScanStudio();
  closeMobileSidebar();
});

function openScanStudio() {
  resetScanStudio();
  populateFolderPicker(dom.scanTargetFolder, state.currentFolderId);
  dom.scanModal.classList.remove('hidden');
}

function resetScanStudio() {
  if (state.scanPollInterval) {
    clearInterval(state.scanPollInterval);
    state.scanPollInterval = null;
  }
  state.activeScanJobId = null;

  dom.scanStepSettings.classList.remove('hidden');
  dom.scanStepProgress.classList.add('hidden');
  dom.scanStepPreview.classList.add('hidden');

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  dom.scanDocName.value = `Scan_${ts}.pdf`;

  setFormatChoice('pdf');
}

dom.formatPdfPill.addEventListener('click', () => setFormatChoice('pdf'));
dom.formatPngPill.addEventListener('click', () => setFormatChoice('png'));

function setFormatChoice(fmt) {
  if (fmt === 'pdf') {
    dom.formatPdfPill.classList.add('active');
    dom.formatPngPill.classList.remove('active');
    document.querySelector('input[name="scanFormat"][value="pdf"]').checked = true;
    if (dom.scanDocName.value.endsWith('.png')) {
      dom.scanDocName.value = dom.scanDocName.value.replace(/\.png$/i, '.pdf');
    }
  } else {
    dom.formatPngPill.classList.add('active');
    dom.formatPdfPill.classList.remove('active');
    document.querySelector('input[name="scanFormat"][value="png"]').checked = true;
    if (dom.scanDocName.value.endsWith('.pdf')) {
      dom.scanDocName.value = dom.scanDocName.value.replace(/\.pdf$/i, '.png');
    }
  }
}

dom.btnExecuteScan.addEventListener('click', async () => {
  const selectedSource = document.querySelector('input[name="scanSource"]:checked').value;
  const resolution = parseInt(dom.scanResolution.value, 10);
  const colorMode = dom.scanColorMode.value;

  dom.scanStepSettings.classList.add('hidden');
  dom.scanStepProgress.classList.remove('hidden');

  try {
    const res = await api('/api/scan/trigger', {
      method: 'POST',
      body: JSON.stringify({
        source: selectedSource,
        duplex: false,
        resolution: resolution,
        color_mode: colorMode
      })
    });

    state.activeScanJobId = res.job_id;
    startScanPolling(res.job_id);
  } catch (err) {
    showToast(err.message, 'error');
    resetScanStudio();
  }
});

function startScanPolling(jobId) {
  state.scanPollInterval = setInterval(async () => {
    try {
      const job = await api(`/api/scan/${jobId}/status`);
      if (job.status === 'ready') {
        clearInterval(state.scanPollInterval);
        state.scanPollInterval = null;
        renderScanPreview(job);
      } else if (job.status === 'error') {
        clearInterval(state.scanPollInterval);
        state.scanPollInterval = null;
        showToast(job.error || 'Scanner job failed.', 'error');
        resetScanStudio();
      }
    } catch (err) {
      clearInterval(state.scanPollInterval);
      state.scanPollInterval = null;
      showToast('Error checking scan progress.', 'error');
      resetScanStudio();
    }
  }, 1500);
}

function renderScanPreview(job) {
  dom.scanStepProgress.classList.add('hidden');
  dom.scanStepPreview.classList.remove('hidden');

  const pages = job.pages || [];
  dom.previewPageCount.textContent = pages.length;
  dom.previewThumbnailsGrid.innerHTML = '';

  pages.forEach(p => {
    const card = document.createElement('div');
    card.className = 'scan-thumb-card';
    card.innerHTML = `
      <img src="${p.thumbnail_url}" alt="Page ${p.page_num}">
      <span class="scan-page-label">Page ${p.page_num}</span>
    `;
    dom.previewThumbnailsGrid.appendChild(card);
  });

  if (job.notice) {
    // Show a prominent blocking banner — not just a dismissible toast
    const warningBanner = document.createElement('div');
    warningBanner.className = 'scan-fallback-warning';
    warningBanner.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <span><strong>Scanner Unreachable — Cannot Save:</strong> ${escapeHtml(job.notice)}</span>
    `;
    dom.previewThumbnailsGrid.parentNode.insertBefore(warningBanner, dom.previewThumbnailsGrid);
    // Block saving — the pages shown are not real scans
    dom.btnCommitScan.disabled = true;
    dom.btnCommitScan.title = 'Cannot save: scanner was unreachable, pages shown are not real.';
    showToast('Scanner unreachable — save is blocked.', 'error');
  }
}

dom.btnCommitScan.addEventListener('click', async () => {
  if (!state.activeScanJobId) return;

  const docName = dom.scanDocName.value.trim();
  if (!docName) {
    showToast('Please enter a document name.', 'error');
    dom.scanDocName.focus();
    return;
  }

  const targetFolderId = dom.scanTargetFolder.value ? parseInt(dom.scanTargetFolder.value, 10) : null;
  const format = document.querySelector('input[name="scanFormat"]:checked').value;

  dom.btnCommitScan.disabled = true;
  dom.btnCommitScan.querySelector('span').textContent = 'Saving...';

  try {
    const res = await api(`/api/scan/${state.activeScanJobId}/save`, {
      method: 'POST',
      body: JSON.stringify({
        display_name: docName,
        folder_id: targetFolderId,
        format: format
      })
    });

    showToast(`Document '${res.file.display_name}' saved to repository!`, 'success');
    closeScanModal();
    loadFolder(state.currentFolderId);
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    dom.btnCommitScan.disabled = false;
    dom.btnCommitScan.querySelector('span').textContent = 'Save to Repository';
  }
});

dom.btnDiscardScan.addEventListener('click', async () => {
  if (state.activeScanJobId) {
    try {
      await api(`/api/scan/${state.activeScanJobId}/discard`, { method: 'POST' });
    } catch (e) {
      // Ignore discard error
    }
  }
  closeScanModal();
  showToast('Scanned document discarded.');
});

dom.btnCancelScanSettings.addEventListener('click', closeScanModal);
dom.closeScanModal.addEventListener('click', closeScanModal);

function closeScanModal() {
  if (state.scanPollInterval) {
    clearInterval(state.scanPollInterval);
    state.scanPollInterval = null;
  }
  dom.scanModal.classList.add('hidden');
}

// ==============================================================================
// DOCUMENT PREVIEW VIEWER (PDF / IMAGE)
// ==============================================================================

let activeBlobUrl = null;

async function openViewerModal(fileId) {
  const file = state.rawFiles.find(f => f.id === fileId) || state.files.find(f => f.id === fileId);
  if (!file) return;

  // Revoke any previous object URL to free memory
  if (activeBlobUrl) {
    URL.revokeObjectURL(activeBlobUrl);
    activeBlobUrl = null;
  }

  const safeFileFormat = (file.file_format || '').toLowerCase();
  const safeSource = (file.source || '').toUpperCase();
  dom.viewerFileName.textContent = file.display_name;
  dom.viewerFileMeta.textContent = `${safeFileFormat.toUpperCase()} • ${formatBytes(file.size_bytes)} • Source: ${safeSource}`;

  const tokenQuery = state.token ? `&token=${encodeURIComponent(state.token)}` : '';
  dom.viewerDownloadBtn.href = `/api/files/${file.id}?download=1${tokenQuery}`;

  dom.viewerContent.innerHTML = '<div class="viewer-loading"><div class="viewer-spinner"></div><p>Loading document preview...</p></div>';
  dom.fileViewerModal.classList.remove('hidden');

  const isPdf = safeFileFormat === 'pdf' || (file.display_name || '').toLowerCase().endsWith('.pdf');
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(safeFileFormat);

  try {
    if (isPdf) {
      // Use preview-data endpoint to bypass download managers
      const previewData = await api(`/api/files/${file.id}/preview-data`);
      const binaryString = atob(previewData.data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('File response was empty. The server may have returned no data.');
      }

      if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js is not loaded. Check your internet connection and reload the page.');
      }

      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      dom.viewerContent.innerHTML = '<div id="pdfCanvasContainer" class="pdf-canvas-container"></div>';
      const container = document.getElementById('pdfCanvasContainer');

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const wrapper = document.createElement('div');
        wrapper.className = 'pdf-page-wrapper';
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className = 'pdf-page-canvas';
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      }

    } else if (isImage) {
      // Use preview-data endpoint to bypass download managers
      const previewData = await api(`/api/files/${file.id}/preview-data`);
      const mimeType = previewData.mime || 'image/jpeg';
      activeBlobUrl = `data:${mimeType};base64,${previewData.data}`;
      dom.viewerContent.innerHTML = `<img src="${activeBlobUrl}" alt="${escapeHtml(file.display_name)}" class="img-viewer-display">`;
    } else {
      dom.viewerContent.innerHTML = `
        <div class="unsupported-viewer">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <p>Direct in-browser preview is not supported for <strong>.${escapeHtml(file.file_format)}</strong> files.</p>
          <a href="${dom.viewerDownloadBtn.href}" class="btn btn-primary" style="margin-top:14px;">Download Document</a>
        </div>
      `;
    }
  } catch (err) {
    // Fallback error state
    dom.viewerContent.innerHTML = `
      <div class="unsupported-viewer">
        <p>Error loading preview: ${escapeHtml(err.message)}</p>
        <a href="${dom.viewerDownloadBtn.href}" class="btn btn-primary" style="margin-top:14px;">Download Document</a>
      </div>
    `;
  }
}

dom.closeViewerModal.addEventListener('click', () => {
  dom.fileViewerModal.classList.add('hidden');
  dom.viewerContent.innerHTML = '';
  if (activeBlobUrl) {
    URL.revokeObjectURL(activeBlobUrl);
    activeBlobUrl = null;
  }
});

// ==============================================================================
// FOLDER CREATION
// ==============================================================================

dom.btnNewFolder.addEventListener('click', openNewFolderModal);
dom.btnSidebarNewFolder.addEventListener('click', openNewFolderModal);

function openNewFolderModal() {
  dom.newFolderName.value = '';
  dom.folderModal.classList.remove('hidden');
  dom.newFolderName.focus();
}

dom.closeFolderModal.addEventListener('click', () => dom.folderModal.classList.add('hidden'));
dom.btnCancelFolder.addEventListener('click', () => dom.folderModal.classList.add('hidden'));

dom.newFolderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = dom.newFolderName.value.trim();
  if (!name) return;

  try {
    await api('/api/folders', {
      method: 'POST',
      body: JSON.stringify({
        name: name,
        parent_id: state.currentFolderId
      })
    });

    dom.folderModal.classList.add('hidden');
    showToast(`Folder '${name}' created.`, 'success');
    loadFolder(state.currentFolderId);
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ==============================================================================
// RENAME & MOVE MODAL
// ==============================================================================
let renameTarget = null;

function openRenameModal(type, id, currentName, currentFolderId = null) {
  renameTarget = { type, id };
  dom.renameInput.value = currentName;
  dom.renameModalTitle.textContent = type === 'folder' ? 'Rename Folder' : 'Rename / Move Document';

  if (type === 'file') {
    dom.moveFolderGroup.classList.remove('hidden');
    populateFolderPicker(dom.moveFolderSelect, currentFolderId);
  } else {
    dom.moveFolderGroup.classList.add('hidden');
  }

  dom.renameModal.classList.remove('hidden');
  dom.renameInput.focus();
}

dom.closeRenameModal.addEventListener('click', () => dom.renameModal.classList.add('hidden'));
dom.btnCancelRename.addEventListener('click', () => dom.renameModal.classList.add('hidden'));

dom.renameForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!renameTarget) return;

  const newName = dom.renameInput.value.trim();
  if (!newName) return;

  try {
    if (renameTarget.type === 'folder') {
      await api(`/api/folders/${renameTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: newName })
      });
      showToast('Folder renamed.', 'success');
    } else {
      const newFolderId = dom.moveFolderSelect.value ? parseInt(dom.moveFolderSelect.value, 10) : null;
      await api(`/api/files/${renameTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          display_name: newName,
          folder_id: newFolderId
        })
      });
      showToast('File updated.', 'success');
    }

    dom.renameModal.classList.add('hidden');
    loadFolder(state.currentFolderId);
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ==============================================================================
// DELETE CONFIRMATION MODAL
// ==============================================================================
let deleteTarget = null;

function openDeleteModal(type, id, name) {
  deleteTarget = { type, id, name };
  dom.deleteConfirmText.textContent = `Are you sure you want to permanently delete the ${type} "${name}"? This action cannot be undone.`;
  dom.confirmDeleteModal.classList.remove('hidden');
}

dom.closeDeleteModal.addEventListener('click', () => dom.confirmDeleteModal.classList.add('hidden'));
dom.btnCancelDelete.addEventListener('click', () => dom.confirmDeleteModal.classList.add('hidden'));

dom.btnConfirmDelete.addEventListener('click', async () => {
  if (!deleteTarget) return;

  try {
    if (deleteTarget.type === 'folder') {
      await api(`/api/folders/${deleteTarget.id}`, { method: 'DELETE' });
      showToast(`Folder "${deleteTarget.name}" deleted.`, 'info');
    } else {
      await api(`/api/files/${deleteTarget.id}`, { method: 'DELETE' });
      showToast(`File "${deleteTarget.name}" deleted.`, 'info');
    }

    dom.confirmDeleteModal.classList.add('hidden');
    loadFolder(state.currentFolderId);
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ==============================================================================
// SEARCH IMPLEMENTATION
// ==============================================================================
let searchDebounce = null;
dom.globalSearchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim();
  if (query.length > 0) {
    dom.clearSearchBtn.classList.remove('hidden');
  } else {
    dom.clearSearchBtn.classList.add('hidden');
    loadFolder(state.currentFolderId);
    return;
  }

  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(async () => {
    try {
      const res = await api(`/api/search?q=${encodeURIComponent(query)}`);
      state.folders = res.folders || [];
      state.rawFiles = res.files || [];
      renderFolders();
      applySortAndFilter();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }, 300);
});

dom.clearSearchBtn.addEventListener('click', () => {
  dom.globalSearchInput.value = '';
  dom.clearSearchBtn.classList.add('hidden');
  loadFolder(state.currentFolderId);
});

// ==============================================================================
// FOLDER PICKER & SIDEBAR TREE HELPER
// ==============================================================================
async function fetchAllFoldersTree() {
  try {
    const list = await api('/api/folders/all');
    state.allFoldersCache = list || [];
    renderSidebarFolders();
  } catch (e) {
    // Non-blocking
  }
}

function populateFolderPicker(selectElem, selectedId = null) {
  selectElem.innerHTML = '<option value="">Repository Root</option>';
  state.allFoldersCache.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    if (selectedId && f.id === selectedId) {
      opt.selected = true;
    }
    selectElem.appendChild(opt);
  });
}

// Keyboard shortcuts & click-outside dismiss
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    dom.scanModal.classList.add('hidden');
    dom.fileViewerModal.classList.add('hidden');
    dom.folderModal.classList.add('hidden');
    dom.renameModal.classList.add('hidden');
    dom.confirmDeleteModal.classList.add('hidden');
    if (dom.userMgmtModal) dom.userMgmtModal.classList.add('hidden');
    if (!dom.uploadStagingModal.classList.contains('hidden')) closeUploadStagingModal();
    closeMobileSidebar();
  }
});

[dom.scanModal, dom.fileViewerModal, dom.folderModal, dom.renameModal, dom.confirmDeleteModal, dom.userMgmtModal].forEach(modal => {
  if (!modal) return;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
});

// ==============================================================================
// INITIALIZATION
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});
