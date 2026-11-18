import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesSearch, normalizeSearchText } from '../public/search.js';

test('search ignores Vietnamese accents, case and filename separators', () => {
  assert.equal(normalizeSearchText('  BÁO_cáo--Tháng 11  '), 'bao cao thang 11');
  assert.equal(matchesSearch('Báo_cáo_Doanh-thu.xlsx', 'bao cao'), true);
  assert.equal(matchesSearch('Đối chiếu công nợ.xlsx', 'doi chieu'), true);
});

test('search still rejects unrelated names', () => {
  assert.equal(matchesSearch('Báo_cáo_Doanh-thu.xlsx', 'nhan su'), false);
});
