const { app, BrowserWindow, shell, session } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const HOST = '127.0.0.1';
const PORT = 41387;
const DIST_DIR = path.join(__dirname, 'dist');
let server;
let mainWindow;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function resolveRequestPath(requestUrl) {
  const parsed = new URL(requestUrl, `http://${HOST}:${PORT}`);
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/index.html';
  const absolute = path.resolve(DIST_DIR, `.${pathname}`);
  if (!absolute.startsWith(DIST_DIR + path.sep) && absolute !== DIST_DIR) return null;
  return absolute;
}

function sendFile(req, res, filePath) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      const fallback = path.join(DIST_DIR, 'index.html');
      if (filePath !== fallback && !path.extname(filePath)) return sendFile(req, res, fallback);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const range = req.headers.range;
    const baseHeaders = {
      'Content-Type': type,
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
      'Service-Worker-Allowed': '/'
    };

    if (path.basename(filePath).includes('service-worker')) {
      baseHeaders['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    }

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
        res.end();
        return;
      }
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : stat.size - 1;
      if (start > end || start >= stat.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        ...baseHeaders,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': end - start + 1
      });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, { ...baseHeaders, 'Content-Length': stat.size });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      const filePath = resolveRequestPath(req.url || '/');
      if (!filePath) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }
      sendFile(req, res, filePath);
    });
    server.once('error', reject);
    server.listen(PORT, HOST, () => resolve());
  });
}

async function createWindow() {
  try {
    await session.defaultSession.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] });
  } catch (_) {}

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#0b100d',
    autoHideMenuBar: true,
    title: 'If I Can Shoot Rabbits',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      autoplayPolicy: 'document-user-activation-required'
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://${HOST}:${PORT}`)) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  await mainWindow.loadURL(`http://${HOST}:${PORT}/`);
}

app.whenReady().then(async () => {
  await startServer();
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
}).catch((error) => {
  console.error(error);
  app.quit();
});

app.on('before-quit', () => {
  if (server) server.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
