import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Excel links use view mode for a plain HTTPS file server', async () => {
  const appSource = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(appSource, /ms-excel:ofv\|u\|\$\{fileUrl\}/u);
  assert.doesNotMatch(appSource, /ms-excel:ofe\|u\|/u);
});

test('Excel files do not render a duplicate open action button', async () => {
  const appSource = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(appSource, /createActionButton\('Mở Excel'/u);
});
