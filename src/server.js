import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import Busboy from 'busboy';
import express from 'express';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import helmet from 'helmet';
import {
  createFolder,
  deleteEntry,
  getDownloadPath,
  getUploadDestination,
  listDirectory,
  renameEntry,
} from './file-service.js';
import { createCsrfToken, verifyPassword } from './security.js';
import { buildOfficeOpenPath, createOfficeToken, isExcelFile, verifyOfficeToken } from './office-links.js';

const required = ['SHARE_PATH', 'ADMIN_USER', 'ADMIN_PASSWORD_SALT', 'ADMIN_PASSWORD_HASH', 'SESSION_SECRET'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Thiếu biến môi trường ${name}`);
}

const shareRoot = path.resolve(process.env.SHARE_PATH);
await fsPromises.access(shareRoot, fs.constants.R_OK | fs.constants.W_OK);

const app = express();
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
}));
app.use(express.json({ limit: '32kb' }));
app.use(session({
  name: 'nata.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: 'auto',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
  },
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Đăng nhập quá nhiều lần. Vui lòng thử lại sau.' },
});

function requireAuth(req, res, next) {
  if (req.session.authenticated === true) return next();
  return res.status(401).json({ error: 'Bạn cần đăng nhập.' });
}

function requireCsrf(req, res, next) {
  if (req.get('x-csrf-token') && req.get('x-csrf-token') === req.session.csrfToken) return next();
  return res.status(403).json({ error: 'Phiên thao tác không hợp lệ. Hãy tải lại trang.' });
}

app.get('/api/session', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    authenticated: req.session.authenticated === true,
    username: req.session.authenticated ? process.env.ADMIN_USER : null,
    csrfToken: req.session.authenticated ? req.session.csrfToken : null,
  });
});

app.post('/api/login', loginLimiter, async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const validPassword = await verifyPassword(
    password,
    process.env.ADMIN_PASSWORD_SALT,
    process.env.ADMIN_PASSWORD_HASH,
  );
  if (username !== process.env.ADMIN_USER || !validPassword) {
    return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
  }
  await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.authenticated = true;
  req.session.csrfToken = createCsrfToken();
  return res.json({ username, csrfToken: req.session.csrfToken });
});

app.post('/api/logout', requireAuth, requireCsrf, (req, res, next) => {
  req.session.destroy((error) => error ? next(error) : res.status(204).end());
});

app.get('/api/files', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await listDirectory(shareRoot, String(req.query.path ?? '')));
});

app.get('/api/download', requireAuth, async (req, res, next) => {
  try {
    const target = await getDownloadPath(shareRoot, String(req.query.path ?? ''));
    res.download(target, path.basename(target));
  } catch (error) {
    next(error);
  }
});

app.get('/api/office-link', requireAuth, async (req, res) => {
  const relativePath = String(req.query.path ?? '');
  if (!isExcelFile(relativePath)) return res.status(400).json({ error: 'Tệp này không được Excel hỗ trợ.' });
  await getDownloadPath(shareRoot, relativePath);
  const expires = Date.now() + 2 * 60 * 1000;
  const token = createOfficeToken(relativePath, expires, process.env.SESSION_SECRET);
  res.set('Cache-Control', 'no-store');
  return res.json({ url: buildOfficeOpenPath(relativePath, expires, token), expiresAt: new Date(expires).toISOString() });
});

app.get('/api/office/open/:expires/:token/:encodedPath/:filename', async (req, res, next) => {
  try {
    const relativePath = Buffer.from(req.params.encodedPath, 'base64url').toString('utf8');
    const expires = Number(req.params.expires);
    const token = String(req.params.token ?? '');
    const filenameMatches = req.params.filename === path.basename(relativePath);
    if (!filenameMatches || !isExcelFile(relativePath) || !verifyOfficeToken(relativePath, expires, token, process.env.SESSION_SECRET)) {
      return res.status(403).send('Liên kết mở Excel không hợp lệ hoặc đã hết hạn.');
    }
    const target = await getDownloadPath(shareRoot, relativePath);
    res.set('Cache-Control', 'private, no-store');
    return res.sendFile(target);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/folders', requireAuth, requireCsrf, async (req, res) => {
  await createFolder(shareRoot, String(req.body?.path ?? ''), req.body?.name);
  res.status(201).json({ ok: true });
});

app.patch('/api/entries', requireAuth, requireCsrf, async (req, res) => {
  await renameEntry(shareRoot, String(req.body?.path ?? ''), req.body?.name);
  res.json({ ok: true });
});

app.delete('/api/entries', requireAuth, requireCsrf, async (req, res) => {
  await deleteEntry(shareRoot, String(req.body?.path ?? ''));
  res.status(204).end();
});

app.post('/api/upload', requireAuth, requireCsrf, (req, res, next) => {
  const maxBytes = Number(process.env.MAX_UPLOAD_MB ?? 512) * 1024 * 1024;
  const parentPath = String(req.query.path ?? '');
  const busboy = Busboy({ headers: req.headers, limits: { files: 20, fileSize: maxBytes } });
  const tasks = [];
  let uploadError = null;

  busboy.on('file', (_field, file, info) => {
    const task = (async () => {
      const destination = await getUploadDestination(shareRoot, parentPath, info.filename);
      const temporary = `${destination}.upload-${crypto.randomUUID()}`;
      try {
        await pipeline(file, fs.createWriteStream(temporary, { flags: 'wx' }));
        if (file.truncated) {
          throw new Error(`Tệp ${info.filename} vượt quá giới hạn dung lượng.`);
        }
        await fsPromises.rename(temporary, destination);
      } catch (error) {
        file.resume();
        throw error;
      } finally {
        await fsPromises.rm(temporary, { force: true }).catch(() => {});
      }
    })();
    tasks.push(task);
  });
  busboy.on('filesLimit', () => { uploadError = new Error('Chỉ được tải tối đa 20 tệp mỗi lần.'); });
  busboy.on('error', next);
  busboy.on('close', async () => {
    try {
      if (uploadError) throw uploadError;
      await Promise.all(tasks);
      res.status(201).json({ uploaded: tasks.length });
    } catch (error) {
      next(error);
    }
  });
  req.pipe(busboy);
});

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
app.use(express.static(publicDir, { etag: true, maxAge: '1h' }));

app.use((error, _req, res, _next) => {
  const status = error.code === 'ENOENT' ? 404 : error.code === 'EEXIST' ? 409 : 400;
  console.error(`[${new Date().toISOString()}]`, error.code ?? error.name, error.message);
  const safeMessages = [
    'Đường dẫn không hợp lệ', 'Tên thư mục không hợp lệ', 'Tên tệp không hợp lệ',
    'Tên mới không hợp lệ', 'Không thể xóa thư mục gốc', 'Không thể đổi tên thư mục gốc',
    'Chỉ có thể tải xuống tệp', 'Tệp không hợp lệ',
  ];
  let message = 'Không thể thực hiện thao tác.';
  if (status === 404) message = 'Không tìm thấy tệp hoặc thư mục.';
  if (status === 409) message = 'Đã có tệp hoặc thư mục trùng tên.';
  if (safeMessages.includes(error.message) || /vượt quá giới hạn|tối đa 20 tệp/u.test(error.message)) message = error.message;
  res.status(status).json({ error: message });
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, '127.0.0.1', () => {
  console.log(`NATA File Portal đang chạy tại http://127.0.0.1:${port}`);
});
