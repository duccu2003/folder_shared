import crypto from 'node:crypto';
import path from 'node:path';

const EXCEL_EXTENSIONS = new Set(['.xlsx', '.xls', '.xlsm', '.xlsb', '.csv']);

export function isExcelFile(filename) {
  return typeof filename === 'string' && EXCEL_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

function signature(relativePath, expires, secret) {
  return crypto.createHmac('sha256', secret).update(`${expires}\n${relativePath}`).digest('base64url');
}

export function createOfficeToken(relativePath, expires, secret) {
  if (!relativePath || !Number.isSafeInteger(expires) || !secret) throw new Error('Invalid office link input');
  return signature(relativePath, expires, secret);
}

export function verifyOfficeToken(relativePath, expires, token, secret, now = Date.now()) {
  if (!relativePath || !Number.isSafeInteger(expires) || expires < now || !token || !secret) return false;
  const expected = Buffer.from(signature(relativePath, expires, secret));
  const actual = Buffer.from(token);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function buildOfficeOpenPath(relativePath, expires, token) {
  const filename = path.basename(relativePath);
  if (!isExcelFile(filename)) throw new Error('Unsupported spreadsheet file');
  const encodedPath = Buffer.from(relativePath, 'utf8').toString('base64url');
  return `/api/office/open/${encodeURIComponent(String(expires))}/${encodeURIComponent(token)}/${encodedPath}/${encodeURIComponent(filename)}`;
}
