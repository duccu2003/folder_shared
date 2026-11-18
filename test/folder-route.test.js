import test from 'node:test';
import assert from 'node:assert/strict';
import { folderHash, pathFromHash } from '../public/folder-route.js';

test('folderHash creates a shareable URL fragment for a folder path', () => {
  assert.equal(folderHash('THÁNG 5/NHẬP'), '#/TH%C3%81NG%205%2FNH%E1%BA%ACP');
  assert.equal(folderHash(''), '#/');
});

test('pathFromHash restores the folder path from the URL fragment', () => {
  assert.equal(pathFromHash('#/THANG%2011%2FFR-EX231108'), 'THANG 11/FR-EX231108');
  assert.equal(pathFromHash('#/'), '');
  assert.equal(pathFromHash(''), '');
});

test('pathFromHash safely ignores malformed URL fragments', () => {
  assert.equal(pathFromHash('#/%E0%A4%A'), '');
  assert.equal(pathFromHash('#other'), '');
});
