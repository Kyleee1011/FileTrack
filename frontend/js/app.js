/**
 * FileTrack Application Script
 * Frontend client for Sensitive Document Repository & Canon LAN Scanner
 * Features Modern Sidebar Navigation, Document Management & Scan Studio
 */

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
  allFoldersCache: []
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
  scanDuplexToggle: document.getElementById('scanDuplexToggle'),
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
  toastContainer: document.getElementById('toastContainer')
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

async function checkAuth() {
  if (!state.token) {
    showLoginView();
    return;
  }
  try {
    const user = await api('/api/me');
    state.user = user;
    dom.userDisplayName.textContent = user.username;
    dom.userInitial.textContent = user.username.charAt(0).toUpperCase();
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

    dom.userDisplayName.textContent = res.user.username;
    dom.userInitial.textContent = res.user.username.charAt(0).toUpperCase();

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
    state.files = [...state.rawFiles];
  } else {
    dom.filterIndicator.classList.remove('hidden');
    dom.filterIndicatorText.textContent = `Filtered by: ${filter === 'scan' ? 'Scanned Documents' : 'Direct Uploads'}`;
    state.files = state.rawFiles.filter(f => f.source === filter);
  }

  renderFiles();
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

    // Apply active source filter
    if (state.sourceFilter === 'all') {
      state.files = [...state.rawFiles];
    } else {
      state.files = state.rawFiles.filter(f => f.source === state.sourceFilter);
    }

    renderBreadcrumbs();
    renderFolders();
    renderFiles();
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

function renderFiles() {
  dom.filesContainer.innerHTML = '';
  dom.filesCountBadge.textContent = state.files.length;

  if (state.files.length === 0) {
    dom.emptyRepositoryNotice.classList.remove('hidden');
    return;
  }
  dom.emptyRepositoryNotice.classList.add('hidden');

  if (state.viewMode === 'list') {
    dom.filesContainer.className = 'files-list-view';
  } else {
    dom.filesContainer.className = 'files-grid';
  }

  state.files.forEach(file => {
    const card = document.createElement('div');
    card.className = 'file-card';

    const isPdf = file.file_format === 'pdf';
    const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(file.file_format);
    const sourceClass = file.source === 'scan' ? 'badge-source-scan' : 'badge-source-upload';
    const sourceLabel = file.source === 'scan' ? 'Scan' : 'Upload';

    let thumbHtml = '';
    if (isImage || isPdf) {
      thumbHtml = `
        <div class="file-thumb-wrap" onclick="openViewerModal(${file.id})">
          <img src="/api/files/${file.id}/thumbnail" alt="${escapeHtml(file.display_name)}" onerror="this.parentElement.innerHTML='<div class=\\'file-icon-placeholder file-icon-${isPdf ? 'pdf' : 'image'}\\'>📄</div>'">
        </div>
      `;
    } else {
      thumbHtml = `
        <div class="file-thumb-wrap" onclick="openViewerModal(${file.id})">
          <div class="file-icon-placeholder file-icon-default">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
        </div>
      `;
    }

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
// FILE UPLOAD (DRAG & DROP / BUTTON)
// ==============================================================================
dom.btnUpload.addEventListener('click', () => dom.fileUploadInput.click());

dom.fileUploadInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFileUpload(e.target.files);
  }
});

['dragenter', 'dragover'].forEach(eventName => {
  dom.dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dom.dropZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(eventName => {
  dom.dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dom.dropZone.classList.remove('dragover');
  });
});

dom.dropZone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files.length > 0) {
    handleFileUpload(files);
  }
});

async function handleFileUpload(fileList) {
  const formData = new FormData();
  for (let i = 0; i < fileList.length; i++) {
    formData.append('files', fileList[i]);
  }
  if (state.currentFolderId !== null) {
    formData.append('folder_id', state.currentFolderId);
  }

  dom.uploadProgressContainer.classList.remove('hidden');
  dom.uploadProgressBar.style.width = '20%';
  dom.uploadProgressText.textContent = `Uploading ${fileList.length} file(s)...`;

  try {
    dom.uploadProgressBar.style.width = '65%';
    const res = await api('/api/upload', {
      method: 'POST',
      body: formData
    });

    dom.uploadProgressBar.style.width = '100%';
    dom.uploadProgressText.textContent = 'Upload complete!';
    showToast(`Successfully uploaded ${res.files.length} document(s).`, 'success');

    setTimeout(() => {
      dom.uploadProgressContainer.classList.add('hidden');
      dom.uploadProgressBar.style.width = '0%';
    }, 1200);

    loadFolder(state.currentFolderId);
    loadStats();
  } catch (err) {
    dom.uploadProgressContainer.classList.add('hidden');
    showToast(err.message, 'error');
  } finally {
    dom.fileUploadInput.value = '';
  }
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
      dom.scanDuplexToggle.disabled = false;
    } else {
      dom.sourcePlatenLabel.classList.add('active');
      dom.sourceFeederLabel.classList.remove('active');
      dom.scanDuplexToggle.disabled = true;
      dom.scanDuplexToggle.checked = false;
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
  const isDuplex = dom.scanDuplexToggle.checked;
  const resolution = parseInt(dom.scanResolution.value, 10);
  const colorMode = dom.scanColorMode.value;

  dom.scanStepSettings.classList.add('hidden');
  dom.scanStepProgress.classList.remove('hidden');

  try {
    const res = await api('/api/scan/trigger', {
      method: 'POST',
      body: JSON.stringify({
        source: selectedSource,
        duplex: isDuplex,
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
    showToast(job.notice, 'info');
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
// DOCUMENT PREVIEW VIEWER (PDF / Image)
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

  dom.viewerFileName.textContent = file.display_name;
  dom.viewerFileMeta.textContent = `${file.file_format.toUpperCase()} • ${formatBytes(file.size_bytes)} • Source: ${file.source.toUpperCase()}`;

  const tokenQuery = state.token ? `&token=${encodeURIComponent(state.token)}` : '';
  dom.viewerDownloadBtn.href = `/api/files/${file.id}?download=1${tokenQuery}`;

  dom.viewerContent.innerHTML = '<div class="viewer-loading"><div class="viewer-spinner"></div><p>Loading document preview...</p></div>';
  dom.fileViewerModal.classList.remove('hidden');

  const isPdf = file.file_format === 'pdf' || file.display_name.toLowerCase().endsWith('.pdf');
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(file.file_format.toLowerCase());

  if (isPdf) {
    // ===========================================================
    // PDF rendering via PDF.js canvas — completely bypasses IDM.
    // PDF.js fetches bytes internally and draws each page to a
    // <canvas> element, so IDM never sees a "download" trigger.
    // ===========================================================
    if (typeof pdfjsLib === 'undefined') {
      dom.viewerContent.innerHTML = `
        <div class="unsupported-viewer">
          <p>PDF viewer library failed to load. Please check your internet connection and reload the page.</p>
          <a href="${dom.viewerDownloadBtn.href}" class="btn btn-primary" style="margin-top:14px;">Download PDF</a>
        </div>
      `;
      return;
    }

    try {
      // Token passed as query param so PDF.js XHR request is authenticated.
      // IDM ignores XHR responses that are consumed by JavaScript (not navigations).
      const pdfUrl = `/api/files/${file.id}?token=${encodeURIComponent(state.token || '')}`;

      const loadingTask = pdfjsLib.getDocument({
        url: pdfUrl,
        httpHeaders: state.token ? { 'Authorization': `Bearer ${state.token}` } : {},
        withCredentials: true
      });

      const pdfDoc = await loadingTask.promise;
      const totalPages = pdfDoc.numPages;

      // Scrollable container for all pages
      const container = document.createElement('div');
      container.className = 'pdf-canvas-container';
      dom.viewerContent.innerHTML = '';
      dom.viewerContent.appendChild(container);

      // Render each page as its own canvas element
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);

        const viewportBase = page.getViewport({ scale: 1 });
        const containerWidth = dom.viewerContent.clientWidth || 780;
        const scale = Math.min(1.5, (containerWidth - 32) / viewportBase.width);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className = 'pdf-page-canvas';

        const pageWrap = document.createElement('div');
        pageWrap.className = 'pdf-page-wrap';

        const pageLabel = document.createElement('span');
        pageLabel.className = 'pdf-page-label';
        pageLabel.textContent = `Page ${pageNum} / ${totalPages}`;

        pageWrap.appendChild(canvas);
        pageWrap.appendChild(pageLabel);
        container.appendChild(pageWrap);

        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      }
    } catch (err) {
      dom.viewerContent.innerHTML = `
        <div class="unsupported-viewer">
          <p>Could not render PDF preview: ${escapeHtml(err.message)}</p>
          <a href="${dom.viewerDownloadBtn.href}" class="btn btn-primary" style="margin-top:14px;">Download PDF</a>
        </div>
      `;
    }

  } else if (isImage) {
    // Images: fetch with Authorization header → blob URL → <img>
    try {
      const rawResp = await fetch(`/api/files/${file.id}`, {
        headers: state.token ? { 'Authorization': `Bearer ${state.token}` } : {},
        credentials: 'include'
      });
      if (!rawResp.ok) throw new Error(`HTTP ${rawResp.status}`);
      const blob = await rawResp.blob();
      const imgBlob = new Blob([blob], { type: blob.type || 'image/*' });
      activeBlobUrl = URL.createObjectURL(imgBlob);
      dom.viewerContent.innerHTML = `<img src="${activeBlobUrl}" alt="${escapeHtml(file.display_name)}" class="img-viewer-display">`;
    } catch (err) {
      dom.viewerContent.innerHTML = `
        <div class="unsupported-viewer">
          <p>Error loading image: ${escapeHtml(err.message)}</p>
          <a href="${dom.viewerDownloadBtn.href}" class="btn btn-primary" style="margin-top:14px;">Download Image</a>
        </div>
      `;
    }

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
      if (state.sourceFilter === 'all') {
        state.files = [...state.rawFiles];
      } else {
        state.files = state.rawFiles.filter(f => f.source === state.sourceFilter);
      }
      renderFolders();
      renderFiles();
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
    closeMobileSidebar();
  }
});

[dom.scanModal, dom.fileViewerModal, dom.folderModal, dom.renameModal, dom.confirmDeleteModal].forEach(modal => {
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
