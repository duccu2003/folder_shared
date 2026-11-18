import { matchesSearch } from './search.js?v=20261118-1';
import { folderHash, pathFromHash } from './folder-route.js?v=20261118-1';

const state = {
  path: '',
  items: [],
  lots: [],
  selectedLotPath: '',
  csrfToken: null,
  username: null,
};

const SESSION_REFRESH_INTERVAL_MS = 15 * 60 * 1000;
let sessionRefreshTimer = null;
let sessionRefreshPromise = null;

const $ = (selector) => document.querySelector(selector);
const loginView = $('#login-view');
const appView = $('#app-view');
const loginForm = $('#login-form');
const fileList = $('#file-list');
const loadingState = $('#loading-state');
const emptyState = $('#empty-state');
const notice = $('#notice');
const dialog = $('#name-dialog');

async function refreshSession() {
  if (!sessionRefreshPromise) {
    sessionRefreshPromise = (async () => {
      const response = await fetch('/api/session/refresh', { method: 'POST' });
      if (response.status === 401) {
        showLogin();
        throw new Error('Phiên đăng nhập đã hết hạn.');
      }
      if (!response.ok) throw new Error('Không thể làm mới phiên đăng nhập.');
      const session = await response.json();
      state.csrfToken = session.csrfToken;
      return session;
    })().finally(() => { sessionRefreshPromise = null; });
  }
  return sessionRefreshPromise;
}

function stopSessionRefresh() {
  window.clearInterval(sessionRefreshTimer);
  sessionRefreshTimer = null;
}

function startSessionRefresh() {
  stopSessionRefresh();
  sessionRefreshTimer = window.setInterval(() => {
    if (!document.hidden && state.csrfToken) refreshSession().catch(() => {});
  }, SESSION_REFRESH_INTERVAL_MS);
}

async function api(url, options = {}, retryCsrf = true) {
  const headers = new Headers(options.headers);
  const csrfTokenUsed = state.csrfToken;
  if (options.body && !(options.body instanceof FormData)) headers.set('content-type', 'application/json');
  if (options.method && options.method !== 'GET' && csrfTokenUsed) headers.set('x-csrf-token', csrfTokenUsed);
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    showLogin();
    throw new Error('Phiên đăng nhập đã hết hạn.');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 403 && data.code === 'CSRF_INVALID' && retryCsrf) {
      if (state.csrfToken === csrfTokenUsed) await refreshSession();
      return api(url, options, false);
    }
    throw new Error(data.error || 'Không thể thực hiện thao tác.');
  }
  return response.status === 204 ? null : response.json();
}

function showLogin() {
  stopSessionRefresh();
  appView.hidden = true;
  loginView.hidden = false;
  state.csrfToken = null;
  $('#password').value = '';
  $('#username').focus();
}

function showApp(session) {
  state.csrfToken = session.csrfToken;
  state.username = session.username;
  $('#username-display').textContent = session.username;
  loginView.hidden = true;
  appView.hidden = false;
  startSessionRefresh();
}

function showNotice(message, kind = 'success') {
  notice.textContent = message;
  notice.dataset.kind = kind;
  notice.hidden = false;
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(() => { notice.hidden = true; }, 5000);
}

function formatBytes(bytes) {
  if (bytes === null) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} ${units[index]}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function isExcelFile(name) {
  return /\.(xlsx|xls|xlsm|xlsb|csv)$/iu.test(name);
}

async function openInExcel(path) {
  const data = await api(`/api/office-link?path=${encodeURIComponent(path)}`);
  const fileUrl = new URL(data.url, window.location.origin).href;
  window.location.assign(`ms-excel:ofv|u|${fileUrl}`);
  showNotice('Đang mở tệp bằng Microsoft Excel…', 'working');
}

function renderBreadcrumbs() {
  const container = $('#breadcrumbs');
  container.replaceChildren();
  const segments = state.path ? state.path.split('/') : [];
  const parts = [{ name: 'NATA', path: '' }];
  segments.forEach((name, index) => parts.push({ name, path: segments.slice(0, index + 1).join('/') }));
  parts.forEach((part, index) => {
    if (index) container.append(document.createTextNode(' / '));
    const link = document.createElement('a');
    link.href = folderHash(part.path);
    link.textContent = part.name;
    if (index === parts.length - 1) link.setAttribute('aria-current', 'page');
    container.append(link);
  });
}

function createActionButton(label, action, item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'row-action';
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.path = item.path;
  button.dataset.name = item.name;
  return button;
}

function renderItems() {
  const query = $('#search-input').value.trim();
  const items = state.items.filter((item) => matchesSearch(item.name, query));
  fileList.replaceChildren();
  items.forEach((item) => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const excelFile = item.type === 'file' && isExcelFile(item.name);
    const entry = document.createElement(item.type === 'folder' || excelFile ? 'button' : 'a');
    entry.className = 'entry-link';
    const icon = document.createElement('span');
    icon.className = `file-icon ${excelFile ? 'excel' : item.type}`;
    icon.textContent = item.type === 'folder' ? '▰' : excelFile ? 'X' : '▤';
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent = item.name;
    entry.append(icon, text);
    if (item.type === 'folder') {
      entry.type = 'button';
      entry.dataset.action = 'open';
      entry.dataset.path = item.path;
    } else if (excelFile) {
      entry.type = 'button';
      entry.dataset.action = 'open-excel';
      entry.dataset.path = item.path;
      entry.setAttribute('aria-label', `Mở ${item.name} bằng Microsoft Excel`);
    } else {
      entry.href = `/api/download?path=${encodeURIComponent(item.path)}`;
    }
    nameCell.append(entry);
    const sizeCell = document.createElement('td');
    sizeCell.textContent = formatBytes(item.size);
    const dateCell = document.createElement('td');
    dateCell.textContent = formatDate(item.modifiedAt);
    const actionCell = document.createElement('td');
    actionCell.className = 'actions-cell';
    if (item.type === 'file') actionCell.append(createActionButton('Tải xuống', 'download', item));
    actionCell.append(createActionButton('Đổi tên', 'rename', item), createActionButton('Xóa', 'delete', item));
    row.append(nameCell, sizeCell, dateCell, actionCell);
    fileList.append(row);
  });
  $('#item-count').textContent = query ? `${items.length}/${state.items.length} mục` : `${items.length} mục`;
  const emptyTitle = emptyState.querySelector('strong');
  const emptyHint = emptyState.querySelector('span');
  if (query) {
    emptyTitle.textContent = 'Không tìm thấy kết quả';
    emptyHint.textContent = `Không có mục nào khớp với “${query}”.`;
  } else if (state.selectedLotPath) {
    emptyTitle.textContent = 'Lô chưa có tệp';
    emptyHint.textContent = 'Không tìm thấy tệp nào trong lô này.';
  } else {
    emptyTitle.textContent = 'Thư mục đang trống';
    emptyHint.textContent = 'Tải tệp lên hoặc tạo một thư mục mới.';
  }
  emptyState.hidden = items.length !== 0;
}

function clearLotView() {
  state.selectedLotPath = '';
  $('#search-input').placeholder = 'Tìm file hoặc chọn lô…';
  $('#lot-location').hidden = true;
  $('#file-list-title').textContent = 'Nội dung';
  renderLotOptions();
}

async function loadFiles(path = '') {
  clearLotView();
  loadingState.hidden = false;
  emptyState.hidden = true;
  fileList.replaceChildren();
  try {
    const data = await api(`/api/files?path=${encodeURIComponent(path)}`);
    state.path = data.path;
    state.items = data.items;
    renderBreadcrumbs();
    renderItems();
  } catch (error) {
    showNotice(error.message, 'error');
  } finally {
    loadingState.hidden = true;
  }
}

async function loadFolderFromUrl() {
  if (!window.location.hash.startsWith('#/')) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${folderHash('')}`);
  }
  await loadFiles(pathFromHash(window.location.hash));
}

function navigateToFolder(path = '') {
  const hash = folderHash(path);
  if (window.location.hash === hash) return loadFiles(path);
  window.location.hash = hash;
  return undefined;
}

async function loadLots() {
  try {
    const data = await api('/api/lots');
    state.lots = data.lots;
    renderLotOptions();
  } catch (error) {
    showNotice(`Không thể tải danh sách lô: ${error.message}`, 'error');
  }
}

async function loadLotFiles(lotPath) {
  loadingState.hidden = false;
  emptyState.hidden = true;
  fileList.replaceChildren();
  try {
    const data = await api(`/api/lot-files?path=${encodeURIComponent(lotPath)}`);
    state.selectedLotPath = data.lot.path;
    state.items = data.files;
    $('#search-input').placeholder = `Tìm trong lô ${data.lot.code}…`;
    $('#lot-location-path').textContent = data.lot.path;
    $('#lot-location').hidden = false;
    $('#file-list-title').textContent = `Tệp trong lô ${data.lot.code}`;
    renderItems();
  } catch (error) {
    showNotice(error.message, 'error');
  } finally {
    loadingState.hidden = true;
  }
}

function lotDetails(lot) {
  return lot.name.replace(new RegExp(`^${lot.code}\\s*[-—,:]*\\s*`, 'iu'), '') || 'Không có mô tả';
}

function setLotPickerOpen(open) {
  const searchInput = $('#search-input');
  searchInput.setAttribute('aria-expanded', String(open));
  $('#lot-popup').hidden = !open;
  if (open) {
    renderLotOptions();
  }
}

function createLotOption(lot) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'lot-option';
  button.setAttribute('role', 'option');
  button.dataset.lotPath = lot.path;
  button.setAttribute('aria-current', String(lot.path === state.selectedLotPath));
  button.setAttribute('aria-selected', String(lot.path === state.selectedLotPath));
  const code = document.createElement('strong');
  code.textContent = lot.code;
  const details = document.createElement('span');
  details.textContent = lotDetails(lot);
  button.append(code, details);
  return button;
}

function renderLotOptions() {
  const container = $('#lot-options');
  if (!container) return;
  const query = $('#search-input').value.trim();
  const lots = state.lots.filter((lot) => matchesSearch(`${lot.code} ${lot.name}`, query));
  container.replaceChildren();
  if (state.selectedLotPath && !query) {
    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'lot-option lot-clear-option';
    clearButton.setAttribute('role', 'option');
    clearButton.setAttribute('aria-selected', 'false');
    clearButton.dataset.lotPath = '';
    clearButton.textContent = 'Bỏ chọn lô';
    container.append(clearButton);
  }
  lots.forEach((lot) => container.append(createLotOption(lot)));
  $('#lot-no-results').hidden = lots.length !== 0;
}

async function refreshActiveView() {
  if (state.selectedLotPath) return loadLotFiles(state.selectedLotPath);
  return loadFiles(state.path);
}

function activeFolderPath() {
  return state.selectedLotPath || state.path;
}

function askForName({ title, label, value = '', submitLabel }) {
  $('#dialog-title').textContent = title;
  $('#dialog-label').textContent = label;
  $('#dialog-submit').textContent = submitLabel;
  $('#name-input').value = value;
  $('#dialog-error').hidden = true;
  dialog.showModal();
  $('#name-input').focus();
  $('#name-input').select();
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'default' ? $('#name-input').value.trim() : null), { once: true });
  });
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = loginForm.querySelector('button[type="submit"]');
  const errorNode = $('#login-error');
  submit.disabled = true;
  errorNode.hidden = true;
  try {
    const session = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username: $('#username').value.trim(), password: $('#password').value }),
    });
    showApp(session);
    await loadLots();
    await loadFolderFromUrl();
  } catch (error) {
    errorNode.textContent = error.message;
    errorNode.hidden = false;
  } finally {
    submit.disabled = false;
  }
});

$('#logout-button').addEventListener('click', async () => {
  try { await api('/api/logout', { method: 'POST' }); } finally { showLogin(); }
});

$('#new-folder-button').addEventListener('click', async () => {
  const name = await askForName({ title: 'Tạo thư mục mới', label: 'Tên thư mục', submitLabel: 'Tạo thư mục' });
  if (!name) return;
  try {
    await api('/api/folders', { method: 'POST', body: JSON.stringify({ path: activeFolderPath(), name }) });
    showNotice(`Đã tạo thư mục “${name}”.`);
    await refreshActiveView();
  } catch (error) { showNotice(error.message, 'error'); }
});

$('#upload-input').addEventListener('change', async (event) => {
  const files = [...event.target.files];
  if (!files.length) return;
  const body = new FormData();
  files.forEach((file) => body.append('files', file));
  showNotice(`Đang tải lên ${files.length} tệp…`, 'working');
  try {
    await api(`/api/upload?path=${encodeURIComponent(activeFolderPath())}`, { method: 'POST', body });
    showNotice(`Đã tải lên ${files.length} tệp.`);
    await refreshActiveView();
  } catch (error) { showNotice(error.message, 'error'); }
  event.target.value = '';
});

fileList.addEventListener('click', async (event) => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const { action, path, name } = control.dataset;
  if (action === 'open') return navigateToFolder(path);
  if (action === 'open-excel') {
    try { await openInExcel(path); } catch (error) { showNotice(error.message, 'error'); }
    return;
  }
  if (action === 'download') {
    window.location.assign(`/api/download?path=${encodeURIComponent(path)}`);
    return;
  }
  if (action === 'rename') {
    const currentName = name.split('/').at(-1);
    const newName = await askForName({ title: 'Đổi tên', label: 'Tên mới', value: currentName, submitLabel: 'Lưu thay đổi' });
    if (!newName || newName === currentName) return;
    try {
      await api('/api/entries', { method: 'PATCH', body: JSON.stringify({ path, name: newName }) });
      showNotice('Đã đổi tên.');
      await refreshActiveView();
    } catch (error) { showNotice(error.message, 'error'); }
    return;
  }
  if (action === 'delete' && window.confirm(`Xóa “${name}”? Thao tác này không thể hoàn tác.`)) {
    try {
      await api('/api/entries', { method: 'DELETE', body: JSON.stringify({ path }) });
      showNotice(`Đã xóa “${name}”.`);
      await refreshActiveView();
    } catch (error) { showNotice(error.message, 'error'); }
  }
});

$('#search-input').addEventListener('focus', () => setLotPickerOpen(true));
$('#search-input').addEventListener('click', () => setLotPickerOpen(true));
$('#search-input').addEventListener('input', () => {
  renderItems();
  setLotPickerOpen(true);
});
$('#lot-options').addEventListener('click', async (event) => {
  const option = event.target.closest('[data-lot-path]');
  if (!option) return;
  const lotPath = option.dataset.lotPath;
  setLotPickerOpen(false);
  $('#search-input').value = '';
  if (lotPath) await loadLotFiles(lotPath);
  else await loadFiles(state.path);
});
$('.lot-picker').addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || $('#lot-popup').hidden) return;
  event.preventDefault();
  setLotPickerOpen(false);
  $('#search-input').focus();
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.lot-picker')) setLotPickerOpen(false);
});
window.addEventListener('hashchange', () => {
  if (state.csrfToken) loadFolderFromUrl();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.csrfToken) refreshSession().catch(() => {});
});

const session = await api('/api/session').catch(() => ({ authenticated: false }));
if (session.authenticated) {
  showApp(session);
  await loadLots();
  await loadFolderFromUrl();
} else {
  showLogin();
}
