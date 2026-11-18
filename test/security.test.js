import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { hashPassword, isValidName, resolveWithinRoot, verifyPassword } from '../src/security.js';

test('resolveWithinRoot accepts a normal nested relative path', () => {
  const root = path.resolve('C:\\share');
  assert.equal(resolveWithinRoot(root, 'photos/2026'), path.resolve(root, 'photos/2026'));
});

test('resolveWithinRoot rejects parent traversal', () => {
  const root = path.resolve('C:\\share');
  assert.throws(() => resolveWithinRoot(root, '../secret.txt'), /không hợp lệ/i);
});

test('resolveWithinRoot rejects absolute paths', () => {
  const root = path.resolve('C:\\share');
  assert.throws(() => resolveWithinRoot(root, 'C:\\Windows\\System32'), /không hợp lệ/i);
});

test('isValidName rejects separators and dot segments', () => {
  assert.equal(isValidName('../secret.txt'), false);
  assert.equal(isValidName('folder/name.txt'), false);
  assert.equal(isValidName('..'), false);
  assert.equal(isValidName('bao-cao 2026.pdf'), true);
});

test('password hash verifies only the original password', async () => {
  const salt = '00112233445566778899aabbccddeeff';
  const hash = await hashPassword('Mật-khẩu-rất-mạnh', salt);
  assert.equal(await verifyPassword('Mật-khẩu-rất-mạnh', salt, hash), true);
  assert.equal(await verifyPassword('sai-mật-khẩu', salt, hash), false);
});
