// Default to same-origin /api so production deployments work without env injection.
const apiBase = (import.meta?.env?.VITE_API_BASE ?? '') || '/api';

// DOM
const tableBody = document.querySelector('#feedTable tbody');
const form = document.getElementById('feedForm');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const typeSelect = document.getElementById('feedType');
const rssUrlGroup = document.getElementById('rssUrlGroup');
const configGroup = document.getElementById('configGroup');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminSection = document.getElementById('adminSection');
const adminContent = document.getElementById('adminContent');
const scopeHint = document.getElementById('scopeHint');
const signedInPill = document.getElementById('signedInPill');
const importJsonBtn = document.getElementById('importJsonBtn');
const importJsonInput = document.getElementById('importJsonInput');
const importJsonStatus = document.getElementById('importJsonStatus');

// Helper sections
const quickAddForm = document.getElementById('quickAddForm');
const quickAddUrlInput = document.getElementById('quickAddUrl');
const quickAddTitleInput = document.getElementById('quickAddTitle');
const quickAddTypeSelect = document.getElementById('quickAddType');
const quickAddStatus = document.getElementById('quickAddStatus');
const youtubeFillBtn = document.getElementById('youtubeFillBtn');
const headingTemplateBtn = document.getElementById('headingTemplateBtn');

const opmlFileInput = document.getElementById('opmlFile');
const opmlImportBtn = document.getElementById('opmlImportBtn');
const opmlResetBtn = document.getElementById('opmlResetBtn');
const opmlStatus = document.getElementById('opmlStatus');

const scrapeTemplateBtn = document.getElementById('scrapeTemplateBtn');
const filtersTemplateBtn = document.getElementById('filtersTemplateBtn');
const userTableBody = document.querySelector('#userTable tbody');
const userForm = document.getElementById('userForm');
const userFormTitle = document.getElementById('userFormTitle');
const userSubmitBtn = document.getElementById('userSubmitBtn');
const userResetBtn = document.getElementById('userResetBtn');
const userEmailInput = document.getElementById('userEmail');
const userDisplayNameInput = document.getElementById('userDisplayName');
const userRolesInput = document.getElementById('userRoles');
const userPasswordInput = document.getElementById('userPassword');
const userVerifiedInput = document.getElementById('userVerified');
const userFormNote = document.getElementById('userFormNote');

let editingId = null;
let feeds = [];
let currentUser = null;
let users = [];
let userEditingId = null;

function escapeHtml(text) {
  return (text || '').toString().replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

function slugify(text) {
  const slug = (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || `feed-${Date.now()}`;
}

function deriveTitleFromUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');
    const pathPart = parsed.pathname.replace(/\/$/, '');
    return hostname || pathPart || url;
  } catch {
    return url;
  }
}

function detectFeedTypeFromUrl(url) {
  if (!url) return 'native_rss';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  return 'native_rss';
}

function buildYoutubeFeedUrl(url) {
  if (!url) return null;
  const playlistMatch = url.match(/[?&]list=([^&]+)/i);
  const channelMatch = url.match(/(?:channel\/)([A-Za-z0-9_-]+)/i);
  const userMatch = url.match(/(?:user\/)([A-Za-z0-9_-]+)/i);
  if (playlistMatch?.[1]) return `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistMatch[1]}`;
  if (channelMatch?.[1]) return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelMatch[1]}`;
  if (userMatch?.[1]) return `https://www.youtube.com/feeds/videos.xml?user=${userMatch[1]}`;
  return null;
}

function isAdminUser(user = currentUser) {
  return Boolean(user && user.roles && user.roles.includes('admin'));
}

function ensureAdminAccess(message = 'Admin access required for this action.') {
  if (!currentUser || !isAdminUser()) {
    alert(message);
    return false;
  }
  return true;
}

function getCurrentUserId() {
  return currentUser?.id || currentUser?._id || null;
}

function parseRolesInput(value) {
  return (value || '')
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);
}

function rolesToString(roles) {
  return Array.isArray(roles) ? roles.join(', ') : '';
}

function setInlineStatus(el, message, isError = false) {
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? '#b91c1c' : '#666';
}

function setHelperEnabled(enabled) {
  const nodes = [
    quickAddUrlInput,
    quickAddTitleInput,
    quickAddTypeSelect,
    youtubeFillBtn,
    headingTemplateBtn,
    opmlFileInput,
    opmlImportBtn,
    opmlResetBtn,
    scrapeTemplateBtn,
    filtersTemplateBtn
  ];
  nodes.forEach(el => {
    if (!el) return;
    el.disabled = !enabled;
  });
}

function toggleConfigFields(type) {
  if (type === 'native_rss' || type === 'youtube') {
    rssUrlGroup.style.display = 'block';
    configGroup.style.display = type === 'scraped' ? 'block' : 'none';
  } else {
    rssUrlGroup.style.display = 'none';
    configGroup.style.display = 'block';
  }
}

function resetForm() {
  form.reset();
  editingId = null;
  formTitle.textContent = 'Create Feed';
  submitBtn.textContent = 'Create';
  document.getElementById('feedId').disabled = false;
  toggleConfigFields(typeSelect.value);
}

async function api(path, options = {}) {
  const res = await fetch(`${apiBase}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

function setUser(user) {
  const isAuthed = Boolean(user);
  const isAdmin = isAdminUser(user);
  currentUser = isAuthed ? user : null;
  const adminVisible = isAuthed && isAdmin;

  form.querySelectorAll('input,textarea,select,button').forEach(el => {
    if (el === googleLoginBtn || el === logoutBtn) return;
    el.disabled = !adminVisible;
  });

  [exportJsonBtn, importJsonBtn].forEach(el => {
    if (!el) return;
    el.disabled = !adminVisible;
  });

  if (userForm) {
    userForm.querySelectorAll('input,textarea,select,button').forEach(el => {
      el.disabled = !adminVisible;
    });
  }

  setHelperEnabled(adminVisible);

  if (adminSection) adminSection.style.display = adminVisible ? 'grid' : 'none';
  if (adminContent) adminContent.style.display = adminVisible ? 'block' : 'none';
  if (logoutBtn) logoutBtn.style.display = isAuthed ? 'inline-flex' : 'none';
  if (googleLoginBtn) googleLoginBtn.style.display = adminVisible ? 'none' : 'inline-flex';
  if (signedInPill) signedInPill.style.display = adminVisible ? 'none' : 'inline-flex';

  if (scopeHint) {
    scopeHint.textContent = !isAuthed
      ? 'Sign in with the admin Google account to manage feeds.'
      : isAdmin
      ? 'You can manage shared/global feeds.'
      : 'You are signed in but lack admin access for this dashboard.';
  }

  if (!adminVisible) {
    feeds = [];
    renderTable();
    users = [];
    renderUsers();
    resetUserForm();
  }
}

async function fetchCurrentUser() {
  try {
    const data = await api('/auth/me');
    setUser(data.user);
  } catch {
    setUser(null);
  }
}

async function loadFeeds() {
  if (!currentUser || !isAdminUser()) return;
  const data = await api('/admin/feeds');
  feeds = data.feeds || [];
  renderTable();
}

async function loadUsers() {
  if (!currentUser || !isAdminUser()) return;
  const data = await api('/admin/users');
  users = data.users || [];
  renderUsers();
}

function renderTable() {
  tableBody.innerHTML = '';
  feeds
    .slice()
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .forEach(feed => {
      const userId = getCurrentUserId();
      const isAdmin = isAdminUser();
      const ownerId = feed.userId?._id || feed.userId;
      const ownerEmail = feed.userId?.email || (feed.userId?.toString ? feed.userId.toString() : '');
      const ownerName = feed.userId?.displayName || '';
      const isOwner = userId && ownerId && String(ownerId) === String(userId);
      const isGlobal = !feed.userId;
      const canEdit = isAdmin || isOwner || (isGlobal && isAdmin);
      const scopeLabel = isOwner ? 'Personal' : isGlobal ? 'Shared' : 'Team';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div><strong>${escapeHtml(feed.title)}</strong></div>
          <div class="muted">
            ${escapeHtml(feed.slug || feed._id)} • ${scopeLabel}${canEdit ? '' : ' (read-only)'}
            ${ownerEmail ? ` • Owner: ${escapeHtml(ownerName || ownerEmail)}` : ''}
          </div>
        </td>
        <td class="type-cell"><span class="badge">${escapeHtml(feed.type)}</span></td>
        <td class="status-cell">
          <div class="status-inline">
            <span class="status-dot ${feed.enabled ? '' : 'off'}"></span>
            <span class="chip ${feed.enabled ? 'on' : 'off'}">${feed.enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        </td>
        <td class="muted link-cell">${escapeHtml(feed.rssUrl || (feed.config?.url || ''))}</td>
        <td class="actions-cell">
          <div class="table-actions">
            <button class="btn" data-action="toggle" data-id="${feed._id}" ${!canEdit ? 'disabled' : ''}>${feed.enabled ? 'Disable' : 'Enable'}</button>
            <button class="btn" data-action="edit" data-id="${feed._id}" ${!canEdit ? 'disabled' : ''}>Edit</button>
            <button class="btn" data-action="delete" data-id="${feed._id}" ${!canEdit ? 'disabled' : ''}>Delete</button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });
}

function renderUsers() {
  if (!userTableBody) return;
  userTableBody.innerHTML = '';
  users.forEach(user => {
    const verified = user.emailVerified ? 'Verified' : 'Unverified';
    const created = user.createdAt ? new Date(user.createdAt).toLocaleString() : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div><strong>${escapeHtml(user.email)}</strong></div>
        <div class="muted">${escapeHtml(created)}</div>
      </td>
      <td>${escapeHtml(user.displayName || '')}</td>
      <td><span class="badge">${escapeHtml(rolesToString(user.roles || [])) || 'user'}</span></td>
      <td>
        <div class="status-inline">
          <span class="status-dot ${user.emailVerified ? '' : 'off'}"></span>
          <span class="chip ${user.emailVerified ? 'on' : 'off'}">${verified}</span>
        </div>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn" data-user-action="edit" data-id="${user._id}">Edit</button>
          <button class="btn" data-user-action="delete" data-id="${user._id}">Delete</button>
        </div>
      </td>
    `;
    userTableBody.appendChild(tr);
    });
}

function fillForm(feed) {
  editingId = feed._id;
  formTitle.textContent = 'Edit Feed';
  submitBtn.textContent = 'Update';
  document.getElementById('feedId').value = feed.slug || feed._id;
  document.getElementById('feedId').disabled = true;
  document.getElementById('feedTitle').value = feed.title;
  typeSelect.value = feed.type;
  document.getElementById('feedOrder').value = feed.displayOrder || 0;
  document.getElementById('rssUrl').value = feed.rssUrl || '';
  document.getElementById('configText').value = feed.config ? JSON.stringify(feed.config, null, 2) : '';
  toggleConfigFields(feed.type);
}

function resetUserForm() {
  if (!userForm) return;
  userForm.reset();
  userEditingId = null;
  if (userFormTitle) userFormTitle.textContent = 'Add User';
  if (userSubmitBtn) userSubmitBtn.textContent = 'Add user';
  if (userFormNote) setInlineStatus(userFormNote, 'Passwords are required when creating a user. Leave blank when editing to keep the existing password.', false);
}

function fillUserForm(user) {
  userEditingId = user._id;
  if (userFormTitle) userFormTitle.textContent = 'Edit User';
  if (userSubmitBtn) userSubmitBtn.textContent = 'Update user';
  if (userEmailInput) {
    userEmailInput.value = user.email || '';
  }
  if (userDisplayNameInput) {
    userDisplayNameInput.value = user.displayName || '';
  }
  if (userRolesInput) {
    userRolesInput.value = rolesToString(user.roles || []);
  }
  if (userVerifiedInput) {
    userVerifiedInput.checked = Boolean(user.emailVerified);
  }
  if (userPasswordInput) {
    userPasswordInput.value = '';
  }
}

function applyScrapeTemplate(includeFilters = false) {
  const template = {
    url: 'https://example.com',
    entrySelector: 'article',
    titleSelector: 'h2 a',
    linkSelector: 'h2 a',
    contentSelector: '.summary, p',
    dateSelector: 'time',
    dateFormat: 'MMM d, yyyy'
  };
  if (includeFilters) {
    template.filters = ['Sponsored', 'Advertisement'];
    template.matchOneOf = ['launch', 'release', 'update'];
  }
  const configText = document.getElementById('configText');
  if (configText) configText.value = JSON.stringify(template, null, 2);
  typeSelect.value = 'scraped';
  toggleConfigFields('scraped');
  setInlineStatus(quickAddStatus, includeFilters ? 'Inserted scrape template with filters.' : 'Inserted base scrape template.');
}

function applyHeadingTemplate() {
  const template = {
    url: 'https://example.com',
    headingSelectors: 'h1, h2, h3',
    maxItems: 100
  };
  const configText = document.getElementById('configText');
  if (configText) configText.value = JSON.stringify(template, null, 2);
  typeSelect.value = 'scraped';
  toggleConfigFields('scraped');
  setInlineStatus(quickAddStatus, 'Inserted headings-only template. Paste the target URL.', false);
}

async function handleQuickAdd(e) {
  e.preventDefault();
  if (!ensureAdminAccess()) return;
  const rawUrl = quickAddUrlInput?.value?.trim();
  if (!rawUrl) {
    setInlineStatus(quickAddStatus, 'URL is required.', true);
    return;
  }
  const typeOverride = quickAddTypeSelect?.value || 'auto';
  const detectedType = typeOverride === 'auto' ? detectFeedTypeFromUrl(rawUrl) : typeOverride;
  let rssUrl = rawUrl;
  if (detectedType === 'youtube') {
    const converted = buildYoutubeFeedUrl(rawUrl);
    rssUrl = converted || rawUrl; // allow @handle to be resolved server-side
    if (!converted) {
      setInlineStatus(quickAddStatus, 'Will resolve YouTube handle/channel server-side.', false);
    }
  }
  if (detectedType === 'scraped_headings') {
    const title = quickAddTitleInput?.value?.trim() || deriveTitleFromUrl(rawUrl);
    const payload = {
      slug: slugify(title),
      title,
      type: 'scraped',
      displayOrder: feeds.length + 1,
      enabled: true,
      config: {
        url: rawUrl,
        headingSelectors: 'h1, h2, h3',
        maxItems: 100
      }
    };
    try {
      setInlineStatus(quickAddStatus, 'Saving feed...');
      await api('/feeds', { method: 'POST', body: JSON.stringify(payload) });
      setInlineStatus(quickAddStatus, 'Feed saved. Headings will be ingested as titles.', false);
      quickAddForm?.reset();
      await loadFeeds();
    } catch (err) {
      setInlineStatus(quickAddStatus, err.message || 'Could not save feed.', true);
    }
    return;
  }
  const title = quickAddTitleInput?.value?.trim() || deriveTitleFromUrl(rssUrl);
  const payload = {
    slug: slugify(title),
    title,
    type: detectedType,
    displayOrder: feeds.length + 1,
    enabled: true,
    rssUrl
  };
  try {
    setInlineStatus(quickAddStatus, 'Saving feed...');
    await api('/feeds', { method: 'POST', body: JSON.stringify(payload) });
    setInlineStatus(quickAddStatus, 'Feed saved. You can refine it in the form below.');
    quickAddForm?.reset();
    await loadFeeds();
  } catch (err) {
    setInlineStatus(quickAddStatus, err.message || 'Could not save feed.', true);
  }
}

function handleYoutubeFill() {
  const rawUrl = quickAddUrlInput?.value?.trim();
  if (!rawUrl) {
    setInlineStatus(quickAddStatus, 'Paste a YouTube channel or playlist link first.', true);
    return;
  }
  const rss = buildYoutubeFeedUrl(rawUrl);
  if (!rss) {
    setInlineStatus(quickAddStatus, 'Could not detect a channel/playlist id from this link.', true);
    return;
  }
  const title = quickAddTitleInput?.value?.trim() || deriveTitleFromUrl(rawUrl);
  document.getElementById('feedTitle').value = title;
  document.getElementById('feedId').value = slugify(title);
  document.getElementById('rssUrl').value = rss;
  typeSelect.value = 'youtube';
  toggleConfigFields('youtube');
  setInlineStatus(quickAddStatus, 'Converted to YouTube RSS. Review and click Create/Update.');
}

async function importOpml() {
  if (!ensureAdminAccess()) return;
  const file = opmlFileInput?.files?.[0];
  if (!file) {
    setInlineStatus(opmlStatus, 'Select an OPML/XML file first.', true);
    return;
  }
  try {
    setInlineStatus(opmlStatus, 'Parsing OPML...');
    const text = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    const outlines = Array.from(doc.querySelectorAll('outline[xmlUrl]'));
    if (!outlines.length) {
      setInlineStatus(opmlStatus, 'No xmlUrl entries found in the OPML.', true);
      return;
    }
    let imported = 0;
    let skipped = 0;
    for (const node of outlines) {
      const rssUrl = node.getAttribute('xmlUrl');
      if (!rssUrl) continue;
      const title = node.getAttribute('text') || node.getAttribute('title') || rssUrl;
      const slug = slugify(title);
      const alreadyExists = feeds.some(f => f.slug === slug || f.rssUrl === rssUrl);
      if (alreadyExists) {
        skipped += 1;
        continue;
      }
      const payload = { slug, title, type: 'native_rss', rssUrl, enabled: true };
      try {
        await api('/feeds', { method: 'POST', body: JSON.stringify(payload) });
        imported += 1;
      } catch (err) {
        skipped += 1;
      }
    }
    setInlineStatus(opmlStatus, `Imported ${imported} feed(s). Skipped ${skipped} existing/failed entries.`);
    await loadFeeds();
  } catch (err) {
    setInlineStatus(opmlStatus, err.message || 'Could not import OPML.', true);
  }
}

function resetOpml() {
  if (opmlFileInput) opmlFileInput.value = '';
  setInlineStatus(opmlStatus, 'OPML is the industry standard export/import format for feed readers.');
}

async function handleUserSubmit(e) {
  e.preventDefault();
  if (!ensureAdminAccess()) return;
  const email = userEmailInput?.value?.trim();
  const displayName = userDisplayNameInput?.value?.trim();
  const roles = parseRolesInput(userRolesInput?.value);
  const password = userPasswordInput?.value?.trim();
  const emailVerified = userVerifiedInput?.checked || false;

  if (!email) {
    alert('Email is required.');
    return;
  }

  const payload = { email, displayName, roles, emailVerified };

  try {
    if (userEditingId) {
      if (password) payload.password = password;
      await api(`/admin/users/${userEditingId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      if (!password) {
        alert('Password is required when creating a user.');
        return;
      }
      payload.password = password;
      await api('/admin/users', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetUserForm();
    await loadUsers();
  } catch (err) {
    alert(err.message || 'Failed to save user.');
  }
}

function normalizeImportedFeed(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const normalized = {
    slug: raw.slug || raw.id || raw._id || '',
    title: raw.title,
    type: raw.type,
    rssUrl: raw.rssUrl || raw.rss_url,
    config: raw.config ?? null,
    enabled: raw.enabled !== undefined ? Boolean(raw.enabled) : true,
    displayOrder: Number(raw.displayOrder ?? raw.display_order ?? 0)
  };
  if (typeof normalized.config === 'string') {
    try {
      normalized.config = JSON.parse(normalized.config);
    } catch {
      // keep raw string if parsing fails
    }
  }
  if (Number.isNaN(normalized.displayOrder)) normalized.displayOrder = 0;

  if (!normalized.title || !normalized.type) return null;
  if ((normalized.type === 'native_rss' || normalized.type === 'youtube') && !normalized.rssUrl) return null;
  if (normalized.type === 'scraped' && (!normalized.config || !normalized.config.url)) return null;
  return normalized;
}

async function handleJsonImport(file) {
  if (!ensureAdminAccess()) return;
  setInlineStatus(importJsonStatus, 'Reading JSON file...');
  let parsed;
  try {
    const text = await file.text();
    parsed = JSON.parse(text);
  } catch {
    setInlineStatus(importJsonStatus, 'Invalid JSON file.', true);
    return;
  }

  const items = Array.isArray(parsed) ? parsed : parsed?.feeds;
  if (!Array.isArray(items)) {
    setInlineStatus(importJsonStatus, 'JSON must be an array of feed objects.', true);
    return;
  }

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const item of items) {
    const normalized = normalizeImportedFeed(item);
    if (!normalized) {
      failed += 1;
      continue;
    }
    const existing = feeds.find(
      f => (normalized.slug && f.slug === normalized.slug) || (item._id && f._id === item._id)
    );
    try {
      if (existing) {
        await api(`/feeds/${existing._id}`, { method: 'PUT', body: JSON.stringify(normalized) });
        updated += 1;
      } else {
        await api('/feeds', { method: 'POST', body: JSON.stringify(normalized) });
        created += 1;
      }
    } catch (err) {
      failed += 1;
    }
  }

  await loadFeeds();
  setInlineStatus(
    importJsonStatus,
    `Import finished: ${created} created, ${updated} updated, ${failed} skipped/failed.`,
    failed > 0
  );
}

tableBody.addEventListener('click', async e => {
  if (e.target.disabled) return;
  const action = e.target.dataset.action;
  const id = e.target.dataset.id;
  if (!action || !id) return;
  const feed = feeds.find(f => f._id === id);
  if (!feed) return;
  const userId = getCurrentUserId();
  const isOwner = userId && feed.userId && String(feed.userId) === String(userId);
  const canEdit = isOwner || isAdminUser();
  if (!ensureAdminAccess()) return;
  if (!canEdit) {
    alert('This feed is shared/read-only. Ask an admin to edit shared feeds.');
    return;
  }

  if (action === 'toggle') {
    try {
      await api(`/feeds/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !feed.enabled })
      });
      await loadFeeds();
    } catch (err) {
      alert(err.message);
    }
  }
  if (action === 'edit') {
    fillForm(feed);
  }
  if (action === 'delete') {
    if (confirm(`Delete feed "${feed.title}"?`)) {
      try {
        await api(`/feeds/${id}`, { method: 'DELETE' });
        if (editingId === id) resetForm();
        await loadFeeds();
      } catch (err) {
        alert(err.message);
      }
    }
  }
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!ensureAdminAccess()) return;
  const data = new FormData(form);
  const rawTitle = (data.get('title') || '').toString().trim();
  const rawSlug = (data.get('id') || '').toString().trim();
  if (!rawTitle) {
    alert('Title is required.');
    return;
  }
  const payload = {
    slug: rawSlug || (editingId ? undefined : slugify(rawTitle)),
    title: rawTitle,
    type: data.get('type'),
    displayOrder: Number(data.get('display_order') || 0),
    enabled: true,
    rssUrl: data.get('rss_url')?.trim() || '',
    config: null
  };
  if (payload.type === 'scraped') {
    try {
      payload.config = JSON.parse(data.get('config') || '{}');
    } catch (err) {
      alert('Invalid JSON in Scrape Config');
      return;
    }
  } else if (payload.type === 'youtube' || payload.type === 'native_rss') {
    if (!payload.rssUrl) {
      alert('RSS/Atom URL is required for this type');
      return;
    }
  }

  try {
    if (editingId) {
      await api(`/feeds/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/feeds', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetForm();
    await loadFeeds();
  } catch (err) {
    alert(err.message);
  }
});

resetBtn.addEventListener('click', resetForm);
typeSelect.addEventListener('change', e => toggleConfigFields(e.target.value));

quickAddForm?.addEventListener('submit', handleQuickAdd);
youtubeFillBtn?.addEventListener('click', handleYoutubeFill);
opmlImportBtn?.addEventListener('click', importOpml);
opmlResetBtn?.addEventListener('click', resetOpml);
scrapeTemplateBtn?.addEventListener('click', () => applyScrapeTemplate(false));
filtersTemplateBtn?.addEventListener('click', () => applyScrapeTemplate(true));
headingTemplateBtn?.addEventListener('click', applyHeadingTemplate);

userForm?.addEventListener('submit', handleUserSubmit);
userResetBtn?.addEventListener('click', resetUserForm);

userTableBody?.addEventListener('click', async e => {
  const action = e.target.dataset.userAction;
  const id = e.target.dataset.id;
  if (!action || !id) return;
  if (!ensureAdminAccess()) return;
  const user = users.find(u => u._id === id);
  if (!user) return;

  if (action === 'edit') {
    fillUserForm(user);
  }

  if (action === 'delete') {
    if (confirm(`Delete user "${user.email}"? This will end their sessions.`)) {
      try {
        await api(`/admin/users/${id}`, { method: 'DELETE' });
        if (userEditingId === id) resetUserForm();
        await loadUsers();
      } catch (err) {
        alert(err.message || 'Failed to delete user.');
      }
    }
  }
});

exportJsonBtn.addEventListener('click', () => {
  if (!ensureAdminAccess()) return;
  const payload = JSON.stringify(feeds, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'feeds-export.json';
  a.click();
  URL.revokeObjectURL(url);
});

googleLoginBtn.addEventListener('click', () => {
  const redirect = encodeURIComponent(window.location.href);
  window.location.href = `${apiBase}/auth/google/start?redirect=${redirect}`;
});

logoutBtn.addEventListener('click', async () => {
  try {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    feeds = [];
    renderTable();
  } catch (err) {
    alert(err.message);
  }
});

importJsonBtn?.addEventListener('click', () => {
  if (!ensureAdminAccess()) return;
  importJsonInput?.click();
});

importJsonInput?.addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (file) await handleJsonImport(file);
  e.target.value = '';
});

// Init
toggleConfigFields(typeSelect.value);
fetchCurrentUser().then(() => {
  loadFeeds();
  loadUsers();
});

