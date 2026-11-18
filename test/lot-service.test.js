import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { listLotFiles, listLots } from '../src/file-service.js';

async function withShare(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nata-lots-'));
  try {
    await run(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('listLots finds job folders recursively and ignores ordinary folders', async () => {
  await withShare(async (root) => {
    await fs.mkdir(path.join(root, 'THÁNG 5', 'NHẬP', 'FE-IM230501 NGU KIM'), { recursive: true });
    await fs.mkdir(path.join(root, 'THANG 11', 'FR-EX231108, 08x40HC+01x20DC, HMM'), { recursive: true });
    await fs.mkdir(path.join(root, 'THANG 11', 'TÀI LIỆU CHUNG'), { recursive: true });

    const lots = await listLots(root);

    assert.deepEqual(lots, [
      {
        code: 'FE-IM230501',
        name: 'FE-IM230501 NGU KIM',
        path: 'THÁNG 5/NHẬP/FE-IM230501 NGU KIM',
      },
      {
        code: 'FR-EX231108',
        name: 'FR-EX231108, 08x40HC+01x20DC, HMM',
        path: 'THANG 11/FR-EX231108, 08x40HC+01x20DC, HMM',
      },
    ]);
  });
});

test('listLotFiles includes files in nested folders and exposes relative locations', async () => {
  await withShare(async (root) => {
    const lotPath = path.join(root, 'THANG 11', 'FR-EX231108, HMM');
    await fs.mkdir(path.join(lotPath, '4 cont'), { recursive: true });
    await fs.mkdir(path.join(lotPath, '5 cont'), { recursive: true });
    await fs.writeFile(path.join(lotPath, 'invoice.xlsx'), 'xlsx');
    await fs.writeFile(path.join(lotPath, '4 cont', 'packing.pdf'), 'pdf');
    await fs.writeFile(path.join(lotPath, '5 cont', 'booking.txt'), 'txt');

    const result = await listLotFiles(root, 'THANG 11/FR-EX231108, HMM');

    assert.equal(result.lot.code, 'FR-EX231108');
    assert.deepEqual(result.files.map((file) => file.name), [
      '4 cont/packing.pdf',
      '5 cont/booking.txt',
      'invoice.xlsx',
    ]);
    assert.equal(result.files.every((file) => file.type === 'file'), true);
    assert.equal(result.files[0].path, 'THANG 11/FR-EX231108, HMM/4 cont/packing.pdf');
  });
});

test('listLotFiles rejects a path that is not a recognized lot', async () => {
  await withShare(async (root) => {
    await fs.mkdir(path.join(root, 'THANG 11', 'TÀI LIỆU CHUNG'), { recursive: true });
    await assert.rejects(
      listLotFiles(root, 'THANG 11/TÀI LIỆU CHUNG'),
      /lô không hợp lệ/i,
    );
  });
});
