import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('one combobox searches files and filters the lot picker', async () => {
  const [html, css, app] = await Promise.all([
    fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/styles.css', import.meta.url), 'utf8'),
    fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="search-input"[^>]+role="combobox"[^>]+aria-controls="lot-popup"/u);
  assert.doesNotMatch(html, /id="lot-trigger"/u);
  assert.doesNotMatch(html, /id="lot-search"/u);
  assert.match(html, /id="lot-options"/u);
  assert.doesNotMatch(html, /<select[^>]+id="lot-select"/u);
  assert.match(css, /\.lot-options\s*\{[^}]*max-height:[^}]*overflow-y:\s*auto/isu);
  assert.match(css, /\.lot-picker\s*\{[^}]*width:\s*22rem/isu);
  assert.match(css, /\.lot-popup\s*\{[^}]*width:\s*100%/isu);
  assert.match(css, /\.lot-options\s*\{[^}]*max-height:\s*14rem/isu);
  assert.match(html, /class="workspace-actions"/u);
  assert.doesNotMatch(html, /TỆP DÙNG CHUNG/u);
  assert.doesNotMatch(html, /<h1>Kho dữ liệu NATA<\/h1>/u);
  assert.match(html, /<nav id="breadcrumbs" class="breadcrumbs" aria-label="Đường dẫn thư mục"><\/nav>/u);
  assert.match(html, /Tìm file hoặc chọn lô/u);
  assert.match(css, /\.workspace-actions\s*\{[^}]*display:\s*flex[^}]*align-items:\s*end/isu);
  assert.match(css, /\.lot-browser\s*\{[^}]*padding:\s*0[^}]*background:\s*transparent[^}]*border:\s*0/isu);
  assert.doesNotMatch(css, /\.lot-search-box/u);
  assert.ok(
    html.indexOf('class="lot-browser"') < html.indexOf('class="toolbar"'),
    'lot picker should appear above the search toolbar',
  );
  assert.match(app, /function\s+renderLotOptions/u);
  assert.doesNotMatch(app, /#lot-search/u);
  assert.doesNotMatch(app, /#lot-trigger/u);
  assert.doesNotMatch(app, /container\.hidden\s*=\s*segments\.length\s*===\s*0/u);
});
