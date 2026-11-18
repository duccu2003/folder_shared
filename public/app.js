const state = { path: '', items: [], csrfToken: null, username: null };

const $ = (selector) => document.querySelector(selector);
const loginView = $('#login-view');
const appView = $('#app-view');
const loginForm = $('#login-form');
const fileList = $('#file-list');
const loadingState = $('#loading-state');
const emptyState = $('#empty-state');
const notice = $('#notice');
const dialog = $('#name-dialog');

async function api(url, options = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set('content-type', 'application/json');
  if (options.method && options.method !== 'GET' && state.csrfToken) headers.set('x-csrf-token', state.csrfToken);
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    showLogin();
    throw new Error('Phiên đăng nhập đã hết hạn.');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Không thể thực hiện thao tác.');
  }
  return response.status === 204 ? null : response.json();
}

function showLogin() {
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
    link.href = `#/${encodeURIComponent(part.path)}`;
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
  const query = $('#search-input').value.trim().toLocaleLowerCase('vi');
  const items = state.items.filter((item) => item.name.toLocaleLowerCase('vi').includes(query));
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
    if (excelFile) actionCell.append(createActionButton('Mở Excel', 'open-excel', item));
    if (item.type === 'file') actionCell.append(createActionButton('Tải xuống', 'download', item));
    actionCell.append(createActionButton('Đổi tên', 'rename', item), createActionButton('Xóa', 'delete', item));
    row.append(nameCell, sizeCell, dateCell, actionCell);
    fileList.append(row);
  });
  $('#item-count').textContent = `${items.length} mục`;
  emptyState.hidden = items.length !== 0 || query.length > 0;
}

async function loadFiles(path = '') {
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
    await loadFiles('');
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
    await api('/api/folders', { method: 'POST', body: JSON.stringify({ path: state.path, name }) });
    showNotice(`Đã tạo thư mục “${name}”.`);
    await loadFiles(state.path);
  } catch (error) { showNotice(error.message, 'error'); }
});

$('#upload-input').addEventListener('change', async (event) => {
  const files = [...event.target.files];
  if (!files.length) return;
  const body = new FormData();
  files.forEach((file) => body.append('files', file));
  showNotice(`Đang tải lên ${files.length} tệp…`, 'working');
  try {
    await api(`/api/upload?path=${encodeURIComponent(state.path)}`, { method: 'POST', body });
    showNotice(`Đã tải lên ${files.length} tệp.`);
    await loadFiles(state.path);
  } catch (error) { showNotice(error.message, 'error'); }
  event.target.value = '';
});

fileList.addEventListener('click', async (event) => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const { action, path, name } = control.dataset;
  if (action === 'open') return loadFiles(path);
  if (action === 'open-excel') {
    try { await openInExcel(path); } catch (error) { showNotice(error.message, 'error'); }
    return;
  }
  if (action === 'download') {
    window.location.assign(`/api/download?path=${encodeURIComponent(path)}`);
    return;
  }
  if (action === 'rename') {
    const newName = await askForName({ title: 'Đổi tên', label: 'Tên mới', value: name, submitLabel: 'Lưu thay đổi' });
    if (!newName || newName === name) return;
    try {
      await api('/api/entries', { method: 'PATCH', body: JSON.stringify({ path, name: newName }) });
      showNotice('Đã đổi tên.');
      await loadFiles(state.path);
    } catch (error) { showNotice(error.message, 'error'); }
    return;
  }
  if (action === 'delete' && window.confirm(`Xóa “${name}”? Thao tác này không thể hoàn tác.`)) {
    try {
      await api('/api/entries', { method: 'DELETE', body: JSON.stringify({ path }) });
      showNotice(`Đã xóa “${name}”.`);
      await loadFiles(state.path);
    } catch (error) { showNotice(error.message, 'error'); }
  }
});

$('#search-input').addEventListener('input', renderItems);
$('#breadcrumbs').addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (!link) return;
  event.preventDefault();
  const encoded = link.getAttribute('href').slice(2);
  loadFiles(decodeURIComponent(encoded));
});

const session = await api('/api/session').catch(() => ({ authenticated: false }));
if (session.authenticated) {
  showApp(session);
  await loadFiles('');
} else {
  showLogin();
}
