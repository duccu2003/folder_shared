import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEnvFile, parseBootstrapInput } from '../src/config.js';

test('buildEnvFile stores a hash and never stores the plaintext password', async () => {
  const output = await buildEnvFile({
    sharePath: '\\\\SERVER\\Data\\NATA',
    username: 'admin',
    password: 'mat-khau-thu-nghiem-123',
  });
  assert.match(output, /^SHARE_PATH=\\\\SERVER\\Data\\NATA$/m);
  assert.match(output, /^ADMIN_PASSWORD_HASH=[0-9a-f]{128}$/m);
  assert.doesNotMatch(output, /mat-khau-thu-nghiem-123/);
});

test('buildEnvFile rejects unsafe usernames and short passwords', async () => {
  await assert.rejects(buildEnvFile({ sharePath: '\\\\SERVER\\Share', username: 'bad name', password: '123456789012' }));
  await assert.rejects(buildEnvFile({ sharePath: '\\\\SERVER\\Share', username: 'admin', password: 'short' }));
});

test('parseBootstrapInput accepts the BOM emitted by Windows PowerShell 5.1', () => {
  const input = '\uFEFF{"username":"admin","sharePath":"D:\\\\Datanew\\\\NATA","password":"natapc209210"}\r\n';
  assert.deepEqual(parseBootstrapInput(input), {
    username: 'admin',
    sharePath: 'D:\\Datanew\\NATA',
    password: 'natapc209210',
  });
});
