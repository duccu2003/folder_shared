export function folderHash(path = '') {
  return `#/${encodeURIComponent(path)}`;
}

export function pathFromHash(hash = '') {
  if (!hash.startsWith('#/')) return '';
  try {
    return decodeURIComponent(hash.slice(2));
  } catch {
    return '';
  }
}
