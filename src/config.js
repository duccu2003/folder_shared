import crypto from 'node:crypto';
import { hashPassword } from './security.js';

export function parseBootstrapInput(input) {
  if (typeof input !== 'string') throw new Error('Configuration input must be text.');
  return JSON.parse(input.replace(/^\uFEFF/u, '').trim());
}

export async function buildEnvFile({ sharePath, username, password }) {
  if (typeof sharePath !== 'string' || !sharePath.trim() || /[\r\n#]/u.test(sharePath)) {
    throw new Error('Đường dẫn share không hợp lệ.');
  }
  if (typeof username !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/u.test(username)) {
    throw new Error('Tên đăng nhập chỉ được dùng chữ, số, dấu chấm, gạch ngang và gạch dưới.');
  }
  if (typeof password !== 'string' || password.length < 12) {
    throw new Error('Mật khẩu phải có ít nhất 12 ký tự.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await hashPassword(password, salt);
  const sessionSecret = crypto.randomBytes(48).toString('base64url');
  return [
    'PORT=8787',
    `SHARE_PATH=${sharePath.trim()}`,
    `ADMIN_USER=${username}`,
    `ADMIN_PASSWORD_SALT=${salt}`,
    `ADMIN_PASSWORD_HASH=${hash}`,
    `SESSION_SECRET=${sessionSecret}`,
    'TRUST_PROXY=1',
    'MAX_UPLOAD_MB=512',
    '',
  ].join('\n');
}
