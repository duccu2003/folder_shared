import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOfficeOpenPath, createOfficeToken, isExcelFile, verifyOfficeToken } from '../src/office-links.js';

test('isExcelFile accepts supported spreadsheet extensions only', () => {
  assert.equal(isExcelFile('Bao cao.xlsx'), true);
  assert.equal(isExcelFile('macro.XLSM'), true);
  assert.equal(isExcelFile('du-lieu.csv'), true);
  assert.equal(isExcelFile('ghi-chu.txt'), false);
  assert.equal(isExcelFile('fake.xlsx.exe'), false);
});

test('office token is bound to path and expiry', () => {
  const secret = 'test-secret-with-enough-entropy';
  const expires = 1_900_000_000_000;
  const token = createOfficeToken('Bao cao/2026.xlsx', expires, secret);
  assert.equal(verifyOfficeToken('Bao cao/2026.xlsx', expires, token, secret, expires - 1), true);
  assert.equal(verifyOfficeToken('Bao cao/other.xlsx', expires, token, secret, expires - 1), false);
  assert.equal(verifyOfficeToken('Bao cao/2026.xlsx', expires, token, secret, expires + 1), false);
});

test('office open path ends with the real spreadsheet filename', () => {
  const result = buildOfficeOpenPath('Bao cao/Doanh thu 2026.xlsx', 1_900_000_000_000, 'signed-token');
  assert.match(result, /^\/api\/office\/open\/1900000000000\/signed-token\/[A-Za-z0-9_-]+\/Doanh%20thu%202026\.xlsx$/u);
});
