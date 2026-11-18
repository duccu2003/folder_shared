import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createFolder, deleteEntry, listDirectory, renameEntry } from '../src/file-service.js';

async function withShare(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nata-portal-'));
  try {
    await run(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('listDirectory returns folders first and exposes file metadata', async () => {
  await withShare(async (root) => {
    await fs.writeFile(path.join(root, 'z.txt'), 'hello');
    await fs.mkdir(path.join(root, 'A folder'));
    const result = await listDirectory(root, '');
    assert.deepEqual(result.items.map((item) => [item.name, item.type]), [
      ['A folder', 'folder'],
      ['z.txt', 'file'],
    ]);
    assert.equal(result.items[1].size, 5);
  });
});

test('folder creation, rename and deletion stay inside the share', async () => {
  await withShare(async (root) => {
    await createFolder(root, '', 'Hồ sơ');
    await renameEntry(root, 'Hồ sơ', 'Hồ sơ mới');
    assert.equal((await fs.stat(path.join(root, 'Hồ sơ mới'))).isDirectory(), true);
    await deleteEntry(root, 'Hồ sơ mới');
    await assert.rejects(fs.stat(path.join(root, 'Hồ sơ mới')));
  });
});

test('deleteEntry rejects the root itself', async () => {
  await withShare(async (root) => {
    await assert.rejects(deleteEntry(root, ''), /thư mục gốc/i);
  });
});
