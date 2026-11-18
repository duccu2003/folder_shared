import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { rotateCsrfToken } from '../src/session-token.js';

test('rotateCsrfToken replaces the current token with a fresh value', () => {
  const session = { csrfToken: 'old-token' };
  const token = rotateCsrfToken(session);

  assert.equal(session.csrfToken, token);
  assert.notEqual(token, 'old-token');
  assert.match(token, /^[A-Za-z0-9_-]{40,}$/u);
});

test('the browser refreshes and retries once when a CSRF token is stale', async () => {
  const app = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');

  assert.match(app, /response\.status\s*===\s*403[^]*refreshSession\(\)[^]*api\(url, options, false\)/u);
  assert.match(app, /setInterval\([^]*refreshSession/u);
  assert.doesNotMatch(app, /localStorage|sessionStorage/u);
});
