import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('login page is minimal and titled Folder chung NATA', async () => {
  const [html, css] = await Promise.all([
    fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/styles.css', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /<h1 id="login-title">Folder chung NATA<\/h1>/u);
  assert.doesNotMatch(html, /NATA FILE PORTAL|Truy cập kho dữ liệu|login-visual|visual-copy/u);
  assert.match(css, /\.login-shell\s*\{[^}]*display:\s*grid[^}]*place-items:\s*center/isu);
  assert.doesNotMatch(css, /\.login-visual|\.visual-copy/isu);
});
