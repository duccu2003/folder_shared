import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEnvFile, parseBootstrapInput } from '../src/config.js';

let input = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) input += chunk;

const settings = parseBootstrapInput(input);
const contents = await buildEnvFile(settings);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
await fs.writeFile(path.join(root, '.env'), contents, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
console.log('Đã tạo cấu hình an toàn.');
