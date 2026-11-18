import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('lot picker uses a compact searchable popup instead of the native select menu', async () => {
  const [html, css, app] = await Promise.all([
    fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/styles.css', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="lot-trigger"/u);
  assert.match(html, /id="lot-search"/u);
  assert.match(html, /id="lot-options"/u);
  assert.doesNotMatch(html, /<select[^>]+id="lot-select"/u);
  assert.match(css, /\.lot-options\s*\{[^}]*max-height:[^}]*overflow-y:\s*auto/isu);
  assert.match(app, /function\s+renderLotOptions/u);
});
