import fs from 'node:fs/promises';
import path from 'node:path';
import { isValidName, resolveWithinRoot } from './security.js';

function toRelativeUrl(root, absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join('/');
}

const LOT_CODE_PATTERN = /\b(?:FE|FR)-(?:IM|EX)\d{6}\b/iu;

function getLotInfo(root, absolutePath) {
  const name = path.basename(absolutePath);
  const match = name.match(LOT_CODE_PATTERN);
  if (!match) return null;
  return {
    code: match[0].toUpperCase(),
    name,
    path: toRelativeUrl(root, absolutePath),
  };
}

async function assertRealPathWithinRoot(root, target) {
  const [realRoot, realTarget] = await Promise.all([fs.realpath(root), fs.realpath(target)]);
  const prefix = realRoot.endsWith(path.sep) ? realRoot : `${realRoot}${path.sep}`;
  if (realTarget !== realRoot && !realTarget.toLowerCase().startsWith(prefix.toLowerCase())) {
    throw new Error('Đường dẫn không hợp lệ');
  }
  return realTarget;
}

export async function listDirectory(root, relativePath = '') {
  const target = resolveWithinRoot(root, relativePath);
  await assertRealPathWithinRoot(root, target);
  const entries = await fs.readdir(target, { withFileTypes: true });
  const items = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(target, entry.name);
    const stat = await fs.stat(absolute);
    return {
      name: entry.name,
      path: toRelativeUrl(root, absolute),
      type: entry.isDirectory() ? 'folder' : 'file',
      size: entry.isDirectory() ? null : stat.size,
      modifiedAt: stat.mtime.toISOString(),
    };
  }));

  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' });
  });

  return { path: toRelativeUrl(root, target), items };
}

export async function listLots(root) {
  const realRoot = await fs.realpath(root);
  const lots = [];

  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const absolute = path.join(directory, entry.name);
      const lot = getLotInfo(realRoot, absolute);
      if (lot) {
        lots.push(lot);
      } else {
        await walk(absolute);
      }
    }
  }

  await walk(realRoot);
  lots.sort((a, b) => a.code.localeCompare(b.code, 'en', { sensitivity: 'base' })
    || a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));
  return lots;
}

export async function listLotFiles(root, relativePath) {
  const target = resolveWithinRoot(root, relativePath);
  const realTarget = await assertRealPathWithinRoot(root, target);
  const realRoot = await fs.realpath(root);
  const lot = getLotInfo(realRoot, realTarget);
  if (!lot) throw new Error('Lô không hợp lệ');
  const stat = await fs.stat(realTarget);
  if (!stat.isDirectory()) throw new Error('Lô không hợp lệ');

  const files = [];
  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile()) {
        const fileStat = await fs.stat(absolute);
        files.push({
          name: toRelativeUrl(realTarget, absolute),
          path: toRelativeUrl(realRoot, absolute),
          type: 'file',
          size: fileStat.size,
          modifiedAt: fileStat.mtime.toISOString(),
        });
      }
    }
  }

  await walk(realTarget);
  files.sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));
  return { lot, files };
}

export async function createFolder(root, parentPath, name) {
  if (!isValidName(name)) throw new Error('Tên thư mục không hợp lệ');
  const parent = resolveWithinRoot(root, parentPath);
  await assertRealPathWithinRoot(root, parent);
  await fs.mkdir(path.join(parent, name));
}

export async function renameEntry(root, relativePath, newName) {
  if (!relativePath) throw new Error('Không thể đổi tên thư mục gốc');
  if (!isValidName(newName)) throw new Error('Tên mới không hợp lệ');
  const source = resolveWithinRoot(root, relativePath);
  await assertRealPathWithinRoot(root, source);
  await fs.rename(source, path.join(path.dirname(source), newName));
}

export async function deleteEntry(root, relativePath) {
  if (!relativePath) throw new Error('Không thể xóa thư mục gốc');
  const target = resolveWithinRoot(root, relativePath);
  await assertRealPathWithinRoot(root, target);
  await fs.rm(target, { recursive: true, force: false });
}

export async function getDownloadPath(root, relativePath) {
  if (!relativePath) throw new Error('Tệp không hợp lệ');
  const target = resolveWithinRoot(root, relativePath);
  const realTarget = await assertRealPathWithinRoot(root, target);
  const stat = await fs.stat(realTarget);
  if (!stat.isFile()) throw new Error('Chỉ có thể tải xuống tệp');
  return realTarget;
}

export async function getUploadDestination(root, parentPath, name) {
  if (!isValidName(name)) throw new Error('Tên tệp không hợp lệ');
  const parent = resolveWithinRoot(root, parentPath);
  const realParent = await assertRealPathWithinRoot(root, parent);
  return path.join(realParent, name);
}
