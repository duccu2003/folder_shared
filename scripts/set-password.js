import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '../src/security.js';

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Cách dùng: npm run set-password -- "mat-khau-moi-it-nhat-12-ky-tu"');
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');
const salt = crypto.randomBytes(16).toString('hex');
const hash = await hashPassword(password, salt);
let contents = await fs.readFile(envPath, 'utf8');
contents = contents.replace(/^ADMIN_PASSWORD_SALT=.*$/m, `ADMIN_PASSWORD_SALT=${salt}`);
contents = contents.replace(/^ADMIN_PASSWORD_HASH=.*$/m, `ADMIN_PASSWORD_HASH=${hash}`);
await fs.writeFile(envPath, contents, { encoding: 'utf8', mode: 0o600 });
console.log('Đã cập nhật mật khẩu. Hãy khởi động lại máy chủ web.');
