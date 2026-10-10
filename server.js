import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Небольшой сервер оболочки: отдаёт страницу из public/ и запускает демо из src/.
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const config = JSON.parse(await fs.readFile(path.join(ROOT, 'project.config.json'), 'utf8'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

const IGNORED = new Set(['node_modules', '.git']);

async function buildTree(dir, prefix = '') {
  const entries = (await fs.readdir(dir, { withFileTypes: true }))
    .filter((entry) => !IGNORED.has(entry.name))
    .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
  let text = '';
  for (const [index, entry] of entries.entries()) {
    const last = index === entries.length - 1;
    text += prefix + (last ? '└── ' : '├── ') + entry.name + (entry.isDirectory() ? '/' : '') + '\n';
    if (entry.isDirectory()) {
      text += await buildTree(path.join(dir, entry.name), prefix + (last ? '    ' : '│   '));
    }
  }
  return text;
}

function runDemo() {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const child = spawn(process.execPath, [config.demo], { cwd: ROOT });
    const timer = setTimeout(() => child.kill(), 15000);
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: String(error), code: -1 });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });
  });
}

async function listFiles(dir) {
  try {
    return await fs.readdir(path.join(ROOT, dir));
  } catch {
    return [];
  }
}

// Демо может создавать файлы (например, архивы): показываем их и удаляем, чтобы запуск можно было повторять.
async function runWithCleanup() {
  const cleanup = config.cleanup;
  const before = cleanup ? await listFiles(cleanup.dir) : [];
  const result = await runDemo();
  if (cleanup) {
    const after = await listFiles(cleanup.dir);
    result.created = after.filter((name) => !before.includes(name) && !cleanup.keep.includes(name));
    for (const name of result.created) {
      await fs.rm(path.join(ROOT, cleanup.dir, name), { force: true });
    }
  }
  return result;
}

function sendJson(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function serveStatic(res, urlPath) {
  const publicDir = path.join(ROOT, 'public');
  const name = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath.slice(1));
  const filePath = path.join(publicDir, name);
  if (!filePath.startsWith(publicDir + path.sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const body = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && pathname === '/api/info') {
      const demoSource = await fs.readFile(path.join(ROOT, config.demo), 'utf8');
      sendJson(res, { ...config, demoSource, tree: await buildTree(ROOT) });
    } else if (req.method === 'POST' && pathname === '/api/run') {
      sendJson(res, await runWithCleanup());
    } else if (req.method === 'GET') {
      await serveStatic(res, pathname);
    } else {
      res.writeHead(405).end('Method Not Allowed');
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end(String(error));
  }
});

server.listen(PORT, () => {
  console.log(`Оболочка запущена: http://localhost:${PORT}`);
});
