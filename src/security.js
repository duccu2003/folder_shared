import crypto from 'node:crypto';
import path from 'node:path';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

export function resolveWithinRoot(root, relativePath = '') {
  if (typeof relativePath !== 'string' || relativePath.includes('\0') || path.isAbsolute(relativePath)) {
    throw new Error('Đường dẫn không hợp lệ');
  }

  const normalizedRoot = path.resolve(root);
  const resolved = path.resolve(normalizedRoot, relativePath.replaceAll('/', path.sep));
  const rootPrefix = normalizedRoot.endsWith(path.sep) ? normalizedRoot : `${normalizedRoot}${path.sep}`;

  if (resolved !== normalizedRoot && !resolved.toLowerCase().startsWith(rootPrefix.toLowerCase())) {
    throw new Error('Đường dẫn không hợp lệ');
  }

  return resolved;
}

export function isValidName(name) {
  return typeof name === 'string'
    && name.length > 0
    && name.length <= 240
    && name !== '.'
    && name !== '..'
    && !/[\\/:*?"<>|\u0000-\u001f]/u.test(name)
    && !/[. ]$/u.test(name);
}

export async function hashPassword(password, saltHex) {
  const derived = await scrypt(password, Buffer.from(saltHex, 'hex'), 64);
  return derived.toString('hex');
}

export async function verifyPassword(password, saltHex, expectedHashHex) {
  if (!password || !saltHex || !expectedHashHex) return false;
  const actual = Buffer.from(await hashPassword(password, saltHex), 'hex');
  const expected = Buffer.from(expectedHashHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function createCsrfToken() {
  return crypto.randomBytes(32).toString('base64url');
}
