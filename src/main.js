// Prefer build-time env; otherwise infer a sensible default for local dev.
const envApiBase = (import.meta?.env?.VITE_API_BASE ?? '').trim();
const apiBase = (() => {
  if (envApiBase) return envApiBase.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || '';
    if (host.includes('rss-agg-1.onrender.com')) return 'https://rss-agg.onrender.com/api';
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    if (isLocal) return 'http://localhost:4000/api';
  }
  return '/api';
})();

let availableFeeds = [];
let currentFeed = 'global';
let currentItems = [];
let currentTotal = 0;
let currentPage = 1;
const guestItemsPerPage = 7;
const authedItemsPerPage = 15;
let itemsPerPage = guestItemsPerPage;
let searchQuery = '';
let isUpdating = false;
let gateState = null;
let currentUser = null;
let guestPreview = null;
let currentFetchAbort = null;
let fetchSeq = 0;
const postsCache = new Map();
const POST_CACHE_TTL_MS = 60_000;
const SEARCH_DEBOUNCE_MS = 250;
const CHUNK_RENDER_THRESHOLD = 20;

const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authName = document.getElementById('authName');
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authOpenBtn = document.getElementById('authOpenBtn');
const updateBtn = document.getElementById('updateButton');
const authPanel = document.getElementById('authPanel');
const authStatus = document.getElementById('authStatus');
const authError = document.getElementById('authError');
const authInfo = document.getElementById('authInfo');
const authCard = document.querySelector('.auth-card');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const adminIndicator = document.getElementById('adminIndicator');
const adminIndicatorName = document.getElementById('adminIndicatorName');
const adminIndicatorLink = document.getElementById('adminIndicatorLink');
const authModal = document.getElementById('authModal');
const authCloseBtn = document.getElementById('authCloseBtn');
const accountPage = document.getElementById('accountPage');
const profilePanel = document.getElementById('profilePanel');
const feedPanel = document.getElementById('feedPanel');
const feedView = document.getElementById('feedView');
const backToFeedsBtn = document.getElementById('backToFeedsBtn');
const profileEmail = document.getElementById('profileEmail');
const profileNameInput = document.getElementById('profileNameInput');
const editNameBtn = document.getElementById('editNameBtn');
const saveNameBtn = document.getElementById('saveNameBtn');
const profileLogoutBtn = document.getElementById('profileLogoutBtn');
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
const profileError = document.getElementById('profileError');
const feedPreferencesList = document.getElementById('feedPreferencesList');
const saveFeedPrefsBtn = document.getElementById('saveFeedPrefsBtn');
const resendVerificationBtn = document.getElementById('resendVerificationBtn');
const myFeedsTableBody = document.querySelector('#myFeedsTable tbody');
const myFeedsStatus = document.getElementById('myFeedsStatus');
const myFeedForm = document.getElementById('myFeedForm');
const myFeedTitle = document.getElementById('myFeedTitle');
const myFeedType = document.getElementById('myFeedType');
const myFeedUrl = document.getElementById('myFeedUrl');
const myFeedUrlGroup = document.getElementById('myFeedUrlGroup');
const myFeedUrlLabel = document.getElementById('myFeedUrlLabel');
const myFeedUrlHint = document.getElementById('myFeedUrlHint');
const myFeedSubmit = document.getElementById('myFeedSubmit');
const myFeedReset = document.getElementById('myFeedReset');
const suggestedFeedButtons = document.querySelectorAll('[data-suggest-feed]');
let isEditingName = false;
let isSavingFeedPrefs = false;
let authStatusMessage = (authStatus?.textContent || '').trim();
let resendVerificationTimeout = null;
let myFeeds = [];
let myFeedEditingId = null;

function truncateText(text, maxLength = 200) {
  if (!text) return '';
  const stripped = text.replace(/<[^>]*>/g, '');
  if (stripped.length <= maxLength) return stripped;
  return stripped.substring(0, maxLength).trim() + '...';
}

function escapeHtml(text = '') {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function formatNumber(num) {
  if (!num) return '0';
  const n = parseInt(num, 10);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

async function api(path, options = {}) {
  const res = await fetch(`${apiBase}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function requestFeedRefresh() {
  try {
    await api('/feeds/refresh', { method: 'POST' });
  } catch (err) {
    console.warn('Feed refresh request failed', err);
  }
}

function setAuthError(message = '') {
  if (authError) authError.textContent = message;
}

function setAuthStatus(message = '') {
  authStatusMessage = message || '';
  if (authStatus) authStatus.textContent = authStatusMessage;
}

function setAuthInfo(message = '') {
  if (authInfo) {
    authInfo.textContent = message;
    authInfo.style.display = message ? 'block' : 'none';
  }
}

function setMyFeedsStatus(message = '', isError = false) {
  if (!myFeedsStatus) return;
  myFeedsStatus.textContent = message;
  myFeedsStatus.style.color = isError ? '#b91c1c' : '#666';
}

function showLoadingSkeleton(count = itemsPerPage) {
  const feedContent = document.getElementById('feedContent');
  const skeleton = document.createElement('div');
  skeleton.className = 'feed-items';
  for (let i = 0; i < count; i++) {
    const item = document.createElement('div');
    item.className = 'feed-item skeleton';
    item.innerHTML = `
      <div class="feed-source skeleton-bar"></div>
      <div class="skeleton-bar title"></div>
      <div class="skeleton-bar subtitle"></div>
      <div class="skeleton-bar body"></div>
    `;
    skeleton.appendChild(item);
  }
  feedContent.innerHTML = '';
  feedContent.appendChild(skeleton);
}

function toggleMyFeedFields(type) {
  if (!myFeedUrlGroup) return;
  if (myFeedUrlLabel && myFeedUrl) {
    if (type === 'youtube') {
      myFeedUrlLabel.textContent = 'YouTube channel/playlist URL';
      myFeedUrl.placeholder = 'https://www.youtube.com/channel/ID or playlist link';
      if (myFeedUrlHint) myFeedUrlHint.textContent = 'Paste a full YouTube channel or playlist link.';
    } else if (type === 'scraped') {
      myFeedUrlLabel.textContent = 'Website URL (Link feed)';
      myFeedUrl.placeholder = 'https://example.com';
      if (myFeedUrlHint) myFeedUrlHint.textContent = 'We will auto-detect headings and store titles + links only.';
    } else {
      myFeedUrlLabel.textContent = 'RSS/Atom URL';
      myFeedUrl.placeholder = 'https://example.com/feed.xml';
      if (myFeedUrlHint) myFeedUrlHint.textContent = 'Paste a full RSS/Atom URL.';
    }
  }
}

function isYoutubeUrl(url = '') {
  return /youtube\.com|youtu\.be/i.test(url);
}

function normalizeUrl(url = '') {
  if (!url) return url;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function hideResendVerificationButton() {
  if (resendVerificationBtn) {
    resendVerificationBtn.style.display = 'none';
    resendVerificationBtn.disabled = false;
  }
}

function showResendVerificationButton() {
  if (!currentUser && resendVerificationBtn) {
    resendVerificationBtn.style.display = 'inline-flex';
  }
}

function scheduleResendVerificationButton(delayMs = 30_000) {
  hideResendVerificationButton();
  if (resendVerificationTimeout) {
    clearTimeout(resendVerificationTimeout);
  }
  resendVerificationTimeout = setTimeout(() => {
    showResendVerificationButton();
  }, delayMs);
}

function setProfileError(message = '') {
  if (profileError) profileError.textContent = message;
}

function showAccountView({ focus = 'auth' } = {}) {
  if (accountPage) {
    accountPage.classList.add('visible');
    accountPage.removeAttribute('hidden');
  }
  if (feedView) {
    feedView.classList.add('view-hidden');
    feedView.setAttribute('aria-hidden', 'true');
  }
  if (backToFeedsBtn) {
    backToFeedsBtn.style.display = 'inline-flex';
  }
  const authVisible = authPanel && authPanel.style.display !== 'none';
  if (focus === 'auth' && authVisible) {
    authEmail?.focus();
  } else if (focus === 'profile' || !authVisible) {
    profileNameInput?.focus();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  hideResendVerificationButton();
}

function showFeedView() {
  if (accountPage) {
    accountPage.classList.remove('visible');
    accountPage.setAttribute('hidden', 'true');
  }
  if (feedView) {
    feedView.classList.remove('view-hidden');
    feedView.removeAttribute('aria-hidden');
  }
  if (backToFeedsBtn) {
    backToFeedsBtn.style.display = 'none';
  }
}

function openAuthModal() {
  if (authModal) {
    authModal.classList.add('visible');
    authModal.removeAttribute('hidden');
  }
  hideResendVerificationButton();
  authEmail?.focus();
}

function closeAuthModal() {
  if (authModal) {
    authModal.classList.remove('visible');
    authModal.setAttribute('hidden', 'true');
  }
}

function openProfileModal() {
  if (!currentUser) {
    openAuthModal();
    return;
  }
  updateProfileUI(currentUser);
  showAccountView({ focus: 'profile' });
}

function closeProfileModal() {
  showFeedView();
}

function updateProfileUI(user) {
  if (profileEmail) profileEmail.textContent = user?.email || '—';
  if (profileNameInput) {
    profileNameInput.value = user?.displayName || '—';
    profileNameInput.disabled = true;
  }
  isEditingName = false;
  toggleNameEditing(false);
  if (!user) {
    closeProfileModal();
  }
  setProfileError('');
  renderFeedPreferences();
}

function toggleNameEditing(enabled) {
  isEditingName = enabled;
  if (profileNameInput) {
    profileNameInput.disabled = !enabled;
    if (enabled) profileNameInput.focus();
  }
  if (editNameBtn) editNameBtn.style.display = enabled ? 'none' : 'inline-flex';
  if (saveNameBtn) saveNameBtn.style.display = enabled ? 'inline-flex' : 'none';
}

function getPreferredFeedSlugs(user = currentUser) {
  const prefs = user?.settings?.preferredFeeds;
  return Array.isArray(prefs) ? prefs : [];
}

function getVisibleFeeds() {
  const preferred = getPreferredFeedSlugs();
  if (preferred.length) {
    const preferredSet = new Set(preferred);
    const filtered = availableFeeds.filter(feed => preferredSet.has(feed.slug));
    if (filtered.length) return filtered;
  }
  return availableFeeds;
}

function renderFeedPreferences() {
  if (!feedPreferencesList) return;
  feedPreferencesList.innerHTML = '';

  if (!currentUser) {
    feedPreferencesList.innerHTML = '<div class="profile-note">Sign in to choose feeds.</div>';
    return;
  }

  if (!availableFeeds.length) {
    feedPreferencesList.innerHTML = '<div class="profile-note">No feeds available yet.</div>';
    return;
  }

  const preferred = new Set(getPreferredFeedSlugs());
  const defaultChecked = preferred.size === 0;

  availableFeeds.forEach(feed => {
    if (!feed?.slug) return;
    const wrapper = document.createElement('label');
    wrapper.className = 'feed-pref';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = feed.slug;
    checkbox.checked = defaultChecked || preferred.has(feed.slug);

    const label = document.createElement('div');
    label.className = 'feed-pref-label';
    const title = document.createElement('span');
    title.textContent = feed.title || feed.slug;
    const meta = document.createElement('small');
    meta.textContent = feed.slug;
    label.appendChild(title);
    label.appendChild(meta);

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    feedPreferencesList.appendChild(wrapper);
  });
}

function resetMyFeedForm() {
  if (!myFeedForm) return;
  myFeedForm.reset();
  myFeedEditingId = null;
  toggleMyFeedFields(myFeedType?.value || 'native_rss');
  if (myFeedSubmit) myFeedSubmit.textContent = 'Save feed';
  setMyFeedsStatus('Create or edit your personal feeds. You will only see your own feeds.');
}

function applySuggestedFeed(button) {
  if (!button) return;
  const title = button.dataset.title || '';
  const url = button.dataset.url || '';
  const type = button.dataset.type || 'native_rss';
  if (myFeedTitle) myFeedTitle.value = title;
  if (myFeedUrl) myFeedUrl.value = url;
  if (myFeedType) {
    myFeedType.value = type;
    toggleMyFeedFields(type);
  }
  setMyFeedsStatus(`Prepared "${title}" (${type === 'youtube' ? 'YouTube' : 'RSS'})`, false);
}

function renderMyFeeds() {
  if (!myFeedsTableBody) return;
  myFeedsTableBody.innerHTML = '';
  const feeds = (myFeeds || []).slice().sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  feeds.forEach(feed => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(feed.title || feed.slug || 'Feed')}</strong></td>
      <td>${escapeHtml(feed.type || '')}</td>
      <td class="muted">${escapeHtml(feed.rssUrl || feed.config?.url || '')}</td>
      <td>${feed.enabled ? 'Enabled' : 'Disabled'}</td>
      <td>
        <div class="actions">
          <button class="auth-btn secondary" data-action="edit-my-feed" data-id="${feed._id}">Edit</button>
          <button class="auth-btn danger" data-action="delete-my-feed" data-id="${feed._id}">Delete</button>
        </div>
      </td>
    `;
    myFeedsTableBody.appendChild(tr);
  });
  if (myFeedsStatus) {
    myFeedsStatus.textContent = `You have ${feeds.length}/10 feeds.`;
    myFeedsStatus.style.color = feeds.length >= 10 ? '#b91c1c' : '#666';
  }
  if (myFeedSubmit) {
    myFeedSubmit.disabled = feeds.length >= 10 && !myFeedEditingId;
  }
}

function updateAuthUI(user) {
  currentUser = user || null;
  const isAdmin = Boolean(user?.roles?.includes('admin'));
  if (authStatus) authStatus.textContent = authStatusMessage || '';
  const isAuthed = Boolean(user);
  const targetItemsPerPage = isAuthed ? authedItemsPerPage : guestItemsPerPage;
  if (itemsPerPage !== targetItemsPerPage) {
    itemsPerPage = targetItemsPerPage;
    currentPage = 1;
  }
  if (!isAuthed && currentFeed === 'all') {
    currentFeed = 'global';
  }
  if (authOpenBtn) {
    authOpenBtn.textContent = isAuthed ? 'Account & feeds' : 'Sign in / Register';
  }
  if (profilePanel) {
    profilePanel.style.display = isAuthed ? 'grid' : 'none';
  }
  if (feedPanel) {
    feedPanel.style.display = isAuthed ? 'grid' : 'none';
  }
  if (updateBtn) {
    updateBtn.style.display = isAuthed ? 'inline-flex' : 'none';
  }
  hideResendVerificationButton();
  [authEmail, authPassword, authName, loginBtn, registerBtn].forEach(el => {
    if (el) el.disabled = isAuthed;
  });
  if (logoutBtn) logoutBtn.style.display = isAuthed ? 'inline-flex' : 'none';
  if (!isAuthed && authPassword) authPassword.value = '';
  if (adminIndicator) {
    adminIndicator.style.display = isAuthed ? 'inline-flex' : 'none';
  }
  if (adminIndicatorName) {
    adminIndicatorName.textContent = user?.displayName || user?.email || 'Admin';
  }
  if (adminIndicatorLink) {
    adminIndicatorLink.style.display = isAdmin ? 'inline-flex' : 'none';
  }
  setAuthError('');
  updateProfileUI(user);
  if (!isAuthed) {
    myFeeds = [];
    renderMyFeeds();
    resetMyFeedForm();
  } else {
    loadMyFeeds();
  }
}

function focusAuthPanel() {
  openAuthModal();
}

async function fetchCurrentUser() {
  try {
    const data = await api('/auth/me');
    updateAuthUI(data.user);
  } catch {
    updateAuthUI(null);
  }
}

async function loadMyFeeds() {
  if (!currentUser) {
    myFeeds = [];
    renderMyFeeds();
    return;
  }
  try {
    const data = await api('/feeds');
    myFeeds = data.feeds || [];
    renderMyFeeds();
  } catch (err) {
    setMyFeedsStatus(err.message || 'Could not load your feeds.', true);
  }
}

function fillMyFeedForm(feed) {
  myFeedEditingId = feed._id;
  if (myFeedSubmit) myFeedSubmit.textContent = 'Update feed';
  if (myFeedTitle) myFeedTitle.value = feed.title || '';
  if (myFeedType) myFeedType.value = feed.type || 'native_rss';
  toggleMyFeedFields(feed.type || 'native_rss');
  if (myFeedUrl) myFeedUrl.value = feed.rssUrl || '';
  if (myFeedConfig) {
    myFeedConfig.value = feed.config ? JSON.stringify(feed.config, null, 2) : '';
  }
}

async function handleVerificationFromUrl() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('verifyToken');
  if (!token) return;

  setAuthError('');
  setAuthInfo('Verifying your email, please wait...');
  setAuthStatus('Verifying email...');

  try {
    const res = await api('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
    updateAuthUI(res.user);
    gateState = null;
    setAuthInfo('Email verified! You are now signed in.');
  } catch (err) {
    setAuthError(err.message || 'Verification failed.');
    openAuthModal();
  } finally {
    url.searchParams.delete('verifyToken');
    window.history.replaceState({}, document.title, url.toString());
  }
}

async function handleHandshakeFromUrl() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('handshake');
  if (!token) return;
  try {
    await api('/auth/handshake', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
    await fetchCurrentUser();
  } catch (err) {
    console.warn('Handshake failed', err);
  } finally {
    url.searchParams.delete('handshake');
    window.history.replaceState({}, document.title, url.toString());
  }
}

async function handleRegister() {
  try {
    setAuthError('');
    setAuthInfo('');
    const body = {
      email: authEmail?.value?.trim(),
      password: authPassword?.value?.trim(),
      displayName: authName?.value?.trim()
    };
    if (!body.email || !body.password) {
      setAuthError('Email and password are required.');
      return;
    }
    const res = await api('/auth/register', { method: 'POST', body: JSON.stringify(body) });
    if (res.requiresVerification) {
      setAuthStatus('');
      setAuthInfo(res.message || 'Check your email to confirm your account.');
      scheduleResendVerificationButton();
      authPassword.value = '';
      return;
    }
    await fetchCurrentUser();
    currentFeed = 'all';
    closeAuthModal();
    currentPage = 1;
    await loadFeedsList();
    await loadFeed(currentFeed);
  } catch (err) {
    setAuthError(err.message);
  }
}

async function handleLogin() {
  try {
    setAuthError('');
    setAuthInfo('');
    const body = {
      email: authEmail?.value?.trim(),
      password: authPassword?.value?.trim()
    };
    if (!body.email || !body.password) {
      setAuthError('Email and password are required.');
      return;
    }
    await api('/auth/login', { method: 'POST', body: JSON.stringify(body) });
    await fetchCurrentUser();
    setAuthStatus('');
    setAuthInfo('');
    closeAuthModal();
    gateState = null;
    currentPage = 1;
    currentFeed = 'all';
    await loadFeedsList();
    await loadFeed(currentFeed);
  } catch (err) {
    setAuthError(err.message);
    if (err?.data?.requiresVerification) {
      setAuthInfo('Please confirm your email. Need a new link? Resend below.');
      setAuthStatus('Email confirmation required before you can sign in.');
    }
  }
}

async function handleLogout() {
  try {
    setAuthError('');
    setAuthInfo('');
    await api('/auth/logout', { method: 'POST' });
    updateAuthUI(null);
    gateState = null;
    currentFeed = 'global';
    currentPage = 1;
    closeProfileModal();
    await loadFeedsList();
    await loadFeed(currentFeed);
  } catch (err) {
    setAuthError(err.message);
    setProfileError(err.message);
  }
}

async function handleMyFeedSubmit(event) {
  event.preventDefault();
  if (!currentUser) {
    openAuthModal();
    return;
  }
  const title = myFeedTitle?.value?.trim();
  let type = myFeedType?.value || 'native_rss';
  let rssUrl = myFeedUrl?.value?.trim();
  if (!title) {
    setMyFeedsStatus('Title is required.', true);
    return;
  }
  const payload = { title, type };
  if (!rssUrl) {
    setMyFeedsStatus('Feed URL is required.', true);
    return;
  }
  rssUrl = normalizeUrl(rssUrl);
  if (isYoutubeUrl(rssUrl)) {
    type = 'youtube';
    if (myFeedType) myFeedType.value = 'youtube';
    toggleMyFeedFields(type);
  }
  payload.type = type;
  payload.rssUrl = rssUrl;

  try {
    setMyFeedsStatus('Saving feed...');
    let savedFeed = null;
    if (myFeedEditingId) {
      const res = await api(`/feeds/${myFeedEditingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      savedFeed = res.feed;
    } else {
      const res = await api('/feeds', { method: 'POST', body: JSON.stringify(payload) });
      savedFeed = res.feed;
    }
    resetMyFeedForm();
    await Promise.all([loadMyFeeds(), loadFeedsList()]);
    postsCache.clear();
    const shouldReload = currentFeed === 'all' || currentFeed === 'global' || (savedFeed?.slug && currentFeed === savedFeed.slug);
    if (shouldReload) {
      await loadFeed(currentFeed, false, { allowCached: false });
    }
    setMyFeedsStatus('Saved.');
  } catch (err) {
    setMyFeedsStatus(err.message || 'Could not save feed.', true);
  }
}

async function handleMyFeedTableClick(event) {
  const action = event.target.dataset.action;
  const id = event.target.dataset.id;
  if (!action || !id) return;
  const feed = myFeeds.find(f => f._id === id);
  if (!feed) return;

  if (action === 'edit-my-feed') {
    fillMyFeedForm(feed);
  }

  if (action === 'delete-my-feed') {
    const confirmed = window.confirm(`Delete feed "${feed.title || feed.slug}"?`);
    if (!confirmed) return;
    try {
      await api(`/feeds/${id}`, { method: 'DELETE' });
      if (myFeedEditingId === id) resetMyFeedForm();
      await Promise.all([loadMyFeeds(), loadFeedsList()]);
      postsCache.clear();
      const targetFeed = currentFeed === feed.slug ? 'global' : currentFeed;
      await loadFeed(targetFeed, false, { allowCached: false });
      setMyFeedsStatus('Feed deleted.');
    } catch (err) {
      setMyFeedsStatus(err.message || 'Could not delete feed.', true);
    }
  }
}

async function handleResendVerification() {
  try {
    setAuthError('');
    setAuthInfo('');
    const email = authEmail?.value?.trim();
    if (!email) {
      setAuthError('Enter your email to resend the confirmation link.');
      return;
    }
    await api('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    setAuthInfo('Verification email re-sent. Please check your inbox.');
    setAuthStatus('');
    scheduleResendVerificationButton();
  } catch (err) {
    setAuthError(err.message || 'Could not resend verification email.');
  }
}

async function handleDeleteAccount() {
  if (!currentUser) {
    openAuthModal();
    return;
  }
  const confirmed = window.confirm('This will permanently delete your account and sign you out. Continue?');
  if (!confirmed) return;
  try {
    setProfileError('');
    await api('/auth/me', { method: 'DELETE' });
    updateAuthUI(null);
    gateState = null;
    currentFeed = 'global';
    currentPage = 1;
    closeProfileModal();
    await loadFeedsList();
    await loadFeed(currentFeed);
  } catch (err) {
    setProfileError(err.message || 'Could not delete account.');
  }
}

function handleEditDisplayName() {
  toggleNameEditing(true);
}

async function handleSaveDisplayName() {
  if (!currentUser) {
    openAuthModal();
    return;
  }
  const displayName = profileNameInput?.value?.trim();
  if (!displayName) {
    setProfileError('Display name cannot be empty.');
    return;
  }
  try {
    setProfileError('');
    const res = await api('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ displayName })
    });
    updateAuthUI(res.user);
    toggleNameEditing(false);
  } catch (err) {
    setProfileError(err.message || 'Could not update name.');
  }
}

function handleGoogleSignIn() {
  const redirect = encodeURIComponent(window.location.href);
  const authBase = apiBase.replace(/\/$/, '');
  window.location.href = `${authBase}/auth/google/start?redirect=${redirect}`;
}

function renderGate(message) {
  const feedContent = document.getElementById('feedContent');
  feedContent.innerHTML = `
    <div class="error">
      <strong>${escapeHtml(message || 'Sign in to continue')}</strong><br>
      <small>Create a free account or log in to view more posts.</small><br>
      <button class="auth-btn secondary" id="authPromptBtn" type="button">Go to account page</button>
    </div>
  `;
  const authPrompt = document.getElementById('authPromptBtn');
  if (authPrompt) authPrompt.addEventListener('click', focusAuthPanel);
}

function renderPreviewGate(preview) {
  if (!preview || !preview.remaining) return '';
  return `
    <div class="preview-gate">
      <div class="preview-gate-title">Continue to the full feed</div>
      <p class="preview-gate-copy">
        Sign in or create a free account to read the rest of this feed and stay updated.
      </p>
      <div class="preview-gate-actions">
        <button class="auth-btn" id="previewGateLogin" type="button">Sign in</button>
        <button class="auth-btn secondary" id="previewGateRegister" type="button">Create free account</button>
      </div>
      <small class="preview-gate-note">
        Free accounts unlock full feed access and keep your reading progress synced.
      </small>
    </div>
  `;
}

function renderPagination() {
  const totalPages = Math.max(Math.ceil(currentTotal / itemsPerPage), 1);
  if (totalPages <= 1) return '';
  let html = '<div class="pagination">';
  html += `<button class="pagination-button" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>← Prev</button>`;
  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  if (endPage - startPage < maxPagesToShow - 1) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination-button ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
  }
  html += `<button class="pagination-button" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>`;
  html += `<span class="pagination-info">Page ${currentPage} of ${totalPages}</span>`;
  html += '</div>';
  return html;
}

function displayCurrentPage() {
  const feedContent = document.getElementById('feedContent');
  if (gateState?.showSignInGate) {
    renderGate(gateState.message);
    return;
  }
  if (!currentItems.length) {
    feedContent.innerHTML = '<div class="loading">No posts found.</div>';
    return;
  }

  feedContent.innerHTML = '';
  const listContainer = document.createElement('div');
  listContainer.className = 'feed-items';
  feedContent.appendChild(listContainer);

  const buildItemElement = (item) => {
    const title = item.title || 'No title';
    const link = item.link || '#';
    const date = item.publishedAt ? new Date(item.publishedAt).toLocaleString() : '';
    const isVideo = item.media?.type === 'video' || link.includes('youtube.com') || link.includes('youtu.be');
    const truncatedContent = truncateText(item.summary || item.content || '', 200);
    const source = item.source || 'Feed';
    const thumbnailUrl = item.media?.thumbnail || '';
    const views = item.media?.views || '';

    const wrapper = document.createElement('div');
    wrapper.className = `feed-item${isVideo && thumbnailUrl ? ' video' : ''}`;

    if (isVideo && thumbnailUrl) {
      wrapper.innerHTML = `
        <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">
          <img src="${escapeHtml(thumbnailUrl)}" alt="${escapeHtml(title)}" class="video-thumbnail">
        </a>
        <div class="video-content">
          <span class="feed-source">${escapeHtml(source)}</span>
          <h3>
            <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>
            <span class="video-indicator">▶ Video</span>
          </h3>
          ${date ? `<div class="feed-date">${escapeHtml(date)}</div>` : ''}
          ${truncatedContent ? `<div class="feed-content">${escapeHtml(truncatedContent)}</div>` : ''}
          ${views ? `
            <div class="video-stats">
              <div class="video-stat">
                <span>👁 Views:</span>
                <span class="video-stat-value">${formatNumber(views)}</span>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    } else {
      wrapper.innerHTML = `
        <span class="feed-source">${escapeHtml(source)}</span>
        <h3>
          <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>
        </h3>
        ${date ? `<div class="feed-date">${escapeHtml(date)}</div>` : ''}
        ${truncatedContent ? `<div class="feed-content">${escapeHtml(truncatedContent)}</div>` : ''}
      `;
    }
    return wrapper;
  };

  const appendItemsChunked = (items) => {
    const fragment = document.createDocumentFragment();
    let index = 0;
    const processChunk = () => {
      const end = Math.min(index + 10, items.length);
      for (; index < end; index++) {
        fragment.appendChild(buildItemElement(items[index]));
      }
      if (index < items.length) {
        requestAnimationFrame(processChunk);
      } else {
        listContainer.appendChild(fragment);
      }
    };
    processChunk();
  };

  if (currentItems.length > CHUNK_RENDER_THRESHOLD) {
    appendItemsChunked(currentItems);
  } else {
    const fragment = document.createDocumentFragment();
    currentItems.forEach(item => fragment.appendChild(buildItemElement(item)));
    listContainer.appendChild(fragment);
  }

  if (!currentUser && guestPreview?.remaining > 0) {
    const gateWrap = document.createElement('div');
    gateWrap.innerHTML = renderPreviewGate(guestPreview);
    feedContent.appendChild(gateWrap);
  }

  const paginationWrap = document.createElement('div');
  paginationWrap.innerHTML = renderPagination();
  feedContent.appendChild(paginationWrap);
  const gateButtons = [
    document.getElementById('previewGateLogin'),
    document.getElementById('previewGateRegister')
  ];
  gateButtons.forEach(btn => btn?.addEventListener('click', focusAuthPanel));
}

function getCacheKey() {
  return `${currentFeed}|${currentPage}|${itemsPerPage}|${searchQuery}`;
}

function readCache() {
  const key = getCacheKey();
  const entry = postsCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > POST_CACHE_TTL_MS) {
    postsCache.delete(key);
    return null;
  }
  return entry.data;
}

async function fetchPosts({ allowCached = true } = {}) {
  const cached = allowCached ? readCache() : null;
  const feedContent = document.getElementById('feedContent');
  if (!cached) {
    showLoadingSkeleton();
  }
  guestPreview = null;

  const params = new URLSearchParams({
    page: currentPage.toString(),
    limit: itemsPerPage.toString()
  });
  if (currentFeed) params.set('feed', currentFeed);
  if (searchQuery) params.set('search', searchQuery);

  const cacheKey = getCacheKey();
  fetchSeq += 1;
  const seq = fetchSeq;
  currentFetchAbort?.abort();
  currentFetchAbort = new AbortController();

  if (cached) {
    currentItems = cached.posts || [];
    currentTotal = cached.total || currentItems.length;
    gateState = cached.gateState || null;
    guestPreview = cached.guestPreview || null;
    updateStats(currentTotal);
    displayCurrentPage();
  }

  let res;
  try {
    res = await fetch(`${apiBase}/posts?${params.toString()}`, {
      credentials: 'include',
      signal: currentFetchAbort.signal
    });
  } catch (err) {
    if (err.name === 'AbortError') return;
    throw err;
  }
  const data = await res.json();

  if (seq !== fetchSeq) return; // stale response

  if (res.status === 401 || res.status === 429 || data.showSignInGate) {
    gateState = { ...data, showSignInGate: true };
    guestPreview = null;
    currentItems = [];
    currentTotal = 0;
    updateStats(0);
    displayCurrentPage();
    return;
  }

  if (!res.ok) {
    throw new Error(data.error || 'Failed to load posts');
  }

  gateState = null;
  guestPreview = data.guestPreview || null;
  currentItems = data.posts || [];
  currentTotal = data.total || currentItems.length;
  postsCache.set(cacheKey, {
    timestamp: Date.now(),
    data: {
      posts: currentItems,
      total: currentTotal,
      guestPreview,
      gateState
    }
  });
  updateStats(currentTotal);
  displayCurrentPage();
}

async function loadFeed(feedName = currentFeed, forceUpdate = false, options = {}) {
  const updateButton = document.getElementById('updateButton');
  if (forceUpdate) {
    isUpdating = true;
    updateButton.classList.add('updating');
    updateButton.textContent = '⟳ Updating...';
  }
  currentFeed = feedName;
  try {
    await fetchPosts({ allowCached: !forceUpdate && options.allowCached !== false });
  } catch (error) {
    console.error('Error loading feed:', error);
    document.getElementById('feedContent').innerHTML = `
      <div class="error">
        <strong>Error loading feed</strong><br>
        ${error.message}
      </div>
    `;
  } finally {
    if (forceUpdate) {
      isUpdating = false;
      updateButton.classList.remove('updating');
      updateButton.textContent = '↻ Update';
    }
  }
}

function updateStats(itemCount) {
  const stats = document.getElementById('stats');
  stats.innerHTML = `
    <span class="stat-number">${itemCount}</span>
    <span>item${itemCount !== 1 ? 's' : ''}</span>
  `;
}

function handleSearch() {
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearch');
  searchQuery = searchInput.value.toLowerCase().trim();
  clearBtn.classList.toggle('visible', Boolean(searchQuery));
  currentPage = 1;
  loadFeed(currentFeed, false, { allowCached: false });
}

function clearSearch() {
  const searchInput = document.getElementById('searchInput');
  searchInput.value = '';
  searchQuery = '';
  handleSearch();
}

let searchDebounceTimer = null;
function scheduleSearch() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    handleSearch();
  }, SEARCH_DEBOUNCE_MS);
}

function changePage(page) {
  const totalPages = Math.max(Math.ceil(currentTotal / itemsPerPage), 1);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  loadFeed(currentFeed);
  if (totalPages > 1) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function buildFeedSelectors(feeds) {
  const buttonsContainer = document.querySelector('.feed-selector');
  const mobileSelect = document.getElementById('feedSelectorMobile');
  buttonsContainer.innerHTML = '';
  mobileSelect.innerHTML = '';

  const baseOptions = [{ slug: 'global', title: 'Global feed' }];
  if (currentUser) {
    baseOptions.push({ slug: 'all', title: 'My feeds (all)' });
  }
  const list = [...baseOptions, ...feeds];
  const visibleSlugs = new Set(list.map(feed => feed.slug));
  if (!visibleSlugs.has(currentFeed)) {
    currentFeed = 'global';
  }
  const maxVisibleButtons = 5;
  const visibleFeeds = list.slice(0, maxVisibleButtons);
  const overflowFeeds = list.slice(maxVisibleButtons);
  const overflowSlugs = new Set(overflowFeeds.map(feed => feed.slug));
  let overflowDropdown = null;

  const syncActiveFeed = (selectedSlug) => {
    document.querySelectorAll('.feed-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.feed === selectedSlug);
    });
    if (overflowDropdown) {
      overflowDropdown.value = overflowSlugs.has(selectedSlug) ? selectedSlug : '';
    }
    mobileSelect.value = selectedSlug;
  };

  const selectFeed = (slug) => {
    if (!slug) return;
    currentFeed = slug;
    currentPage = 1;
    syncActiveFeed(slug);
    loadFeed(currentFeed);
  };

  visibleFeeds.forEach(feed => {
    const btn = document.createElement('button');
    btn.className = 'feed-button';
    btn.dataset.feed = feed.slug;
    btn.textContent = feed.title;
    btn.addEventListener('click', () => selectFeed(feed.slug));
    buttonsContainer.appendChild(btn);
  });

  if (overflowFeeds.length) {
    overflowDropdown = document.createElement('select');
    overflowDropdown.className = 'feed-dropdown';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'More feeds';
    placeholder.disabled = true;
    placeholder.selected = true;
    overflowDropdown.appendChild(placeholder);

    overflowFeeds.forEach(feed => {
      const opt = document.createElement('option');
      opt.value = feed.slug;
      opt.textContent = feed.title;
      overflowDropdown.appendChild(opt);
    });

    overflowDropdown.addEventListener('change', () => {
      const selectedFeed = overflowDropdown.value;
      if (selectedFeed) selectFeed(selectedFeed);
    });

    buttonsContainer.appendChild(overflowDropdown);
  }

  list.forEach(feed => {
    const opt = document.createElement('option');
    opt.value = feed.slug;
    opt.textContent = feed.title;
    mobileSelect.appendChild(opt);
  });

  mobileSelect.onchange = () => {
    const selectedFeed = mobileSelect.value;
    syncActiveFeed(selectedFeed);
    currentFeed = selectedFeed;
    currentPage = 1;
    loadFeed(currentFeed);
  };

  syncActiveFeed(currentFeed || 'all');
}

async function loadFeedsList() {
  // If signed in, show personal + shared feeds; otherwise only public/shared.
  const path = currentUser ? '/feeds' : '/feeds/public';
  const res = await fetch(`${apiBase}${path}`, { credentials: 'include' });
  const data = await res.json();
  availableFeeds = data.feeds || [];
  buildFeedSelectors(getVisibleFeeds());
  renderFeedPreferences();
}

async function handleSaveFeedPreferences() {
  if (!currentUser) {
    openAuthModal();
    return;
  }
  if (!feedPreferencesList || isSavingFeedPrefs) return;

  const selected = Array.from(feedPreferencesList.querySelectorAll('input[type="checkbox"]'))
    .filter(cb => cb.checked && cb.value)
    .map(cb => cb.value);

  try {
    isSavingFeedPrefs = true;
    if (saveFeedPrefsBtn) {
      saveFeedPrefsBtn.classList.add('updating');
      saveFeedPrefsBtn.textContent = 'Saving...';
    }
    setProfileError('');
    const res = await api('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ preferredFeeds: selected })
    });
    updateAuthUI(res.user);
    await loadFeedsList();
    currentFeed = 'all';
    currentPage = 1;
    await loadFeed(currentFeed);
  } catch (err) {
    setProfileError(err.message || 'Could not save feed preferences.');
  } finally {
    isSavingFeedPrefs = false;
    if (saveFeedPrefsBtn) {
      saveFeedPrefsBtn.classList.remove('updating');
      saveFeedPrefsBtn.textContent = 'Save feed choices';
    }
  }
}

document.getElementById('updateButton').addEventListener('click', () => {
  if (isUpdating) return;
  requestFeedRefresh();
  loadFeed(currentFeed, true);
});

document.getElementById('searchInput').addEventListener('input', scheduleSearch);
document.getElementById('clearSearch').addEventListener('click', clearSearch);

// Expose for inline handlers
window.changePage = changePage;

authOpenBtn?.addEventListener('click', () => {
  setAuthError('');
  setAuthInfo('');
  if (currentUser) {
    openProfileModal();
  } else {
    openAuthModal();
  }
});

authCloseBtn?.addEventListener('click', closeAuthModal);

authModal?.addEventListener('click', (event) => {
  if (event.target === authModal) closeAuthModal();
});

backToFeedsBtn?.addEventListener('click', showFeedView);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeAuthModal();
    showFeedView();
  }
});

registerBtn?.addEventListener('click', handleRegister);
loginBtn?.addEventListener('click', handleLogin);
logoutBtn?.addEventListener('click', handleLogout);
googleSignInBtn?.addEventListener('click', handleGoogleSignIn);
profileLogoutBtn?.addEventListener('click', handleLogout);
deleteAccountBtn?.addEventListener('click', handleDeleteAccount);
editNameBtn?.addEventListener('click', handleEditDisplayName);
saveNameBtn?.addEventListener('click', handleSaveDisplayName);
saveFeedPrefsBtn?.addEventListener('click', handleSaveFeedPreferences);
resendVerificationBtn?.addEventListener('click', handleResendVerification);
myFeedForm?.addEventListener('submit', handleMyFeedSubmit);
myFeedReset?.addEventListener('click', resetMyFeedForm);
myFeedType?.addEventListener('change', () => toggleMyFeedFields(myFeedType.value));
myFeedUrl?.addEventListener('input', () => {
  const url = myFeedUrl.value;
  if (isYoutubeUrl(url) && myFeedType.value !== 'youtube') {
    myFeedType.value = 'youtube';
    toggleMyFeedFields('youtube');
  }
});
suggestedFeedButtons?.forEach(btn => {
  btn.addEventListener('click', () => applySuggestedFeed(btn));
});
myFeedsTableBody?.addEventListener('click', handleMyFeedTableClick);

async function init() {
  setAuthInfo('');
  try {
    await handleVerificationFromUrl();
    await handleHandshakeFromUrl();
    await fetchCurrentUser();
  } catch {
    updateAuthUI(null);
  } finally {
    setAuthStatus('');
    hideResendVerificationButton();
    await loadFeedsList();
    await loadFeed(currentFeed);
  }
}

init();

