export function normalizeSearchText(value) {
  return String(value ?? '')
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/đ/gu, 'd')
    .replace(/[_-]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function matchesSearch(value, query) {
  return normalizeSearchText(value).includes(normalizeSearchText(query));
}
