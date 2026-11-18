import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');

for (const filename of ['START-NATA.bat', 'RUN-NATA-PORTABLE.bat']) {
  test(`${filename} uses ASCII and Windows CRLF line endings`, () => {
    const bytes = fs.readFileSync(path.join(root, filename));
    assert.equal([...bytes].every((byte) => byte < 128), true);
    for (let index = 0; index < bytes.length; index += 1) {
      if (bytes[index] === 0x0a) assert.equal(bytes[index - 1], 0x0d);
    }
  });
}

for (const filename of ['scripts/start-nata.ps1', 'scripts/run-portable.ps1']) {
  test(`${filename} is ASCII and parses in Windows PowerShell 5.1`, { skip: process.platform !== 'win32' }, () => {
    const fullPath = path.join(root, filename);
    const bytes = fs.readFileSync(fullPath);
    assert.equal([...bytes].every((byte) => byte < 128), true);
    const escapedPath = fullPath.replaceAll("'", "''");
    const command = `[scriptblock]::Create((Get-Content -LiteralPath '${escapedPath}' -Raw)) | Out-Null`;
    const result = spawnSync('powershell.exe', ['-NoLogo', '-NoProfile', '-Command', command], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  });
}
