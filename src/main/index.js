// ── Squirrel installer events (Windows) — must be first ──────────────────────
// Handles install/uninstall shortcuts. App quits immediately during these events.
if (require('electron-squirrel-startup')) process.exit(0);

const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const { app, BrowserWindow, ipcMain, shell, net, Tray, Menu, nativeImage, session, protocol, globalShortcut } = require('electron');

// ffmpeg-static returns a path inside app.asar in packaged builds — resolve to the unpacked copy
function getFFmpegPath() {
  let p = require('ffmpeg-static');
  if (p && p.includes('app.asar')) {
    p = p.replace('app.asar', 'app.asar.unpacked');
  }
  return p;
}


// --- Tiny local HTTP server so the renderer loads from http://localhost ---
const MIME = {
  '.html': 'text/html',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
};

let localPort = null;

function startLocalServer(rendererRoot) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let pathname = req.url.split('?')[0];
      if (pathname === '/') pathname = '/index.html';
      const filePath = path.join(rendererRoot, pathname);
      const ext = path.extname(filePath);
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      localPort = server.address().port;
      resolve(localPort);
    });
  });
}

// --- Build a 16x16 tray icon from raw RGBA pixels (no file needed) ---
function makeTrayIcon() {
  const size = 16;
  const pixels = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4]     = 0x00; // R
    pixels[i * 4 + 1] = 0xe5; // G  (#00e5ff = --cyan)
    pixels[i * 4 + 2] = 0xff; // B
    pixels[i * 4 + 3] = 0xff; // A
  }
  return nativeImage.createFromBitmap(pixels, { width: size, height: size });
}

let tray = null;
let mainWin = null;

function createTray(win) {
  tray = new Tray(makeTrayIcon());
  tray.setToolTip('CreatorHub');

  const buildMenu = () => Menu.buildFromTemplate([
    {
      label: win.isVisible() ? 'Hide CreatorHub' : 'Show CreatorHub',
      click: () => {
        if (win.isVisible()) { win.hide(); } else { win.show(); win.focus(); }
        tray.setContextMenu(buildMenu());
      },
    },
    { type: 'separator' },
    { label: 'Quit CreatorHub', click: () => { app.isQuitting = true; tray.destroy(); app.quit(); } },
  ]);

  tray.setContextMenu(buildMenu());
  tray.on('click', () => { win.show(); win.focus(); tray.setContextMenu(buildMenu()); });
}

async function createWindow() {
  const rendererRoot = path.join(__dirname, '..', 'renderer');
  const port = await startLocalServer(rendererRoot);

  const { Menu } = require('electron');
  Menu.setApplicationMenu(null);

  mainWin = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0a0e14',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
    },
  });

  // Minimize to tray instead of closing
  mainWin.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWin.hide();
if (tray) tray.setContextMenu(tray.getContextMenu ? tray.getContextMenu() : undefined);
    }
  });

  mainWin.loadURL(`http://127.0.0.1:${port}`);
  mainWin.webContents.once('did-finish-load', () => setTimeout(initAutoUpdater, 3000));
  mainWin.webContents.on('before-input-event', (_e, input) => {
    if (input.type !== 'keyDown') return;
    const isF12 = input.key === 'F12';
    const isCtrlShiftI = (input.control || input.meta) && input.shift && input.key === 'I';
    if (isF12 || isCtrlShiftI) {
      mainWin.webContents.isDevToolsOpened()
        ? mainWin.webContents.closeDevTools()
        : mainWin.webContents.openDevTools();
    }
  });
  createTray(mainWin);
}

// Must be called before app is ready — makes asset:// trusted in renderer contexts
protocol.registerSchemesAsPrivileged([
  { scheme: 'asset', privileges: { secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

app.isQuitting = false;
app.on('before-quit', () => {
  app.isQuitting = true;
});

// ── Auto-updater ──────────────────────────────────────────────────────────────
// Checks GitHub Releases on launch and downloads updates in the background.
let _autoUpdater = null;
function initAutoUpdater() {
  if (!app.isPackaged) return;
  const { updateElectronApp } = require('update-electron-app');
  const { autoUpdater } = require('electron');
  _autoUpdater = autoUpdater;
  const send = (status, detail) => {
    console.log('[updater]', status, detail || '');
    mainWin?.webContents?.send('updater:status', { status, detail });
  };
  autoUpdater.on('checking-for-update',  ()  => send('checking'));
  autoUpdater.on('update-available',     ()  => send('available'));
  autoUpdater.on('update-not-available', ()  => send('up-to-date'));
  autoUpdater.on('update-downloaded',    ()  => send('downloaded'));
  autoUpdater.on('error',                (e) => send('error', e.message));
  updateElectronApp({ updateInterval: '1 hour' });
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

ipcMain.handle('updater:check', async () => {
  if (!_autoUpdater) return { ok: false, reason: 'dev' };
  try {
    // First confirm via GitHub API that a newer version actually exists
    const res = await net.fetch('https://api.github.com/repos/overlayddev-prog/creator-hub/releases/latest', {
      headers: { 'User-Agent': 'CreatorHub-App', 'Accept': 'application/vnd.github+json' },
    });
    if (!res.ok) throw new Error('GitHub API error ' + res.status);
    const release = await res.json();
    const latest  = (release.tag_name || '').replace(/^v/, '');
    const current = app.getVersion();
    if (!latest || compareVersions(latest, current) <= 0) {
      // Already up to date — fire the event so the UI updates
      mainWin?.webContents?.send('updater:status', { status: 'up-to-date' });
      return { ok: true };
    }
    // Newer version exists — hand off to auto-updater to download + install
    _autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (e) {
    mainWin?.webContents?.send('updater:status', { status: 'error', detail: e.message });
    return { ok: false, reason: e.message };
  }
});

app.whenReady().then(() => {
  // ── asset:// protocol — serves local media files with Range support ──────────
  // Handles Range requests so video/audio elements can seek in large files.
  protocol.handle('asset', (request) => {
    const { Readable } = require('stream');
    const url      = request.url.slice('asset:///'.length);
    const decoded  = decodeURIComponent(url);
    const filePath = decoded.match(/^[a-zA-Z]\//) ? decoded[0] + ':' + decoded.slice(1) : decoded;

    const MIME = {
      '.mp4': 'video/mp4', '.mkv': 'video/x-matroska', '.mov': 'video/quicktime',
      '.webm': 'video/webm', '.avi': 'video/x-msvideo',
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
      '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
      '.flac': 'audio/flac', '.aac': 'audio/aac', '.m4a': 'audio/mp4',
    };
    const ext         = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    try {
      const stat     = fs.statSync(filePath);
      const fileSize = stat.size;
      const range    = request.headers.get('range');

      if (range) {
        const match = /bytes=(\d+)-(\d*)/.exec(range);
        if (match) {
          const start      = parseInt(match[1], 10);
          const end        = match[2] ? parseInt(match[2], 10) : fileSize - 1;
          const chunkSize  = end - start + 1;
          const nodeStream = fs.createReadStream(filePath, { start, end });
          // Suppress errors from requests cancelled mid-stream (fast scrubbing)
          nodeStream.on('error', () => {});
          return new Response(Readable.toWeb(nodeStream), {
            status: 206,
            headers: {
              'Content-Range':  `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges':  'bytes',
              'Content-Length': String(chunkSize),
              'Content-Type':   contentType,
            },
          });
        }
      }

      const nodeStream = fs.createReadStream(filePath);
      nodeStream.on('error', () => {});
      return new Response(Readable.toWeb(nodeStream), {
        status: 200,
        headers: {
          'Accept-Ranges':  'bytes',
          'Content-Length': String(fileSize),
          'Content-Type':   contentType,
        },
      });
    } catch (e) {
      return new Response(null, { status: 404 });
    }
  });

  // Auto-approve camera/microphone for OBS virtual camera access
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') callback(true);
    else callback(false);
  });

  createWindow();

  // ── Global hotkeys ───────────────────────────────────────────────────────────
  globalShortcut.register('F9', () => {
    if (mainWin) mainWin.webContents.send('hotkey:toggle-record');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (mainWin) { mainWin.show(); mainWin.focus(); }
  });
});

// On Windows/Linux: hide to tray instead of quitting when all windows closed
app.on('window-all-closed', () => {
  if (process.platform === 'darwin') app.quit();
  // else: do nothing — tray keeps the app alive
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// ── API proxy (routes renderer fetch calls through Node — no CORS) ────────────
ipcMain.handle('api:fetch', async (_event, url, options = {}) => {
  try {
    const res = await net.fetch(url, {
      method:  options.method  || 'GET',
      headers: options.headers || {},
      body:    options.body    || undefined,
    });
    let data = null;
    try { data = await res.json(); } catch { /* not JSON */ }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ── Config ────────────────────────────────────────────────────────────────────
ipcMain.handle('app:config', () => ({
  clerkKey: 'pk_test_aW1tZW5zZS1lZ3JldC04MC5jbGVyay5hY2NvdW50cy5kZXYk',
  baseUrl:  'https://overlayd.gg',
}));

ipcMain.handle('app:get-version', () => app.getVersion());

// ── Auto-launch on login ───────────────────────────────────────────────────────
ipcMain.handle('app:set-autolaunch', (_event, enable) => {
  app.setLoginItemSettings({ openAtLogin: !!enable });
  return { ok: true };
});

ipcMain.handle('app:get-autolaunch', () => {
  return app.getLoginItemSettings().openAtLogin;
});

// ── Shell ─────────────────────────────────────────────────────────────────────
ipcMain.handle('app:open-folder', async (_event, folderPath) => {
  try {
    await shell.openPath(folderPath);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle('app:open-external', async (_event, url) => {
  try {
    await shell.openExternal(url);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

// ── Auth — silent on startup ──────────────────────────────────────────────────
ipcMain.handle('auth:silent', () => {
  return new Promise((resolve) => {
    const hidden = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    hidden.loadURL('https://overlayd.gg/obs-panel');

    const poll = setInterval(async () => {
      try {
        const token = await hidden.webContents.executeJavaScript(
          'window.Clerk && window.Clerk.session ? window.Clerk.session.getToken() : null'
        );
        if (token) {
          clearInterval(poll);
          clearTimeout(giveUp);
          hidden.destroy();
          resolve(token);
        }
      } catch (e) { /* page still loading */ }
    }, 600);

    const giveUp = setTimeout(() => {
      clearInterval(poll);
      if (!hidden.isDestroyed()) hidden.destroy();
      resolve(null);
    }, 12000);

    hidden.on('closed', () => { clearInterval(poll); clearTimeout(giveUp); resolve(null); });
  });
});

// ── Auth (popup to overlayd.gg/obs-panel) ─────────────────────────────────────
ipcMain.handle('auth:sign-in', async () => {
  const popup = new BrowserWindow({
    width: 420,
    height: 650,
    title: 'Sign in to Overlayd',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  popup.loadURL('https://overlayd.gg/obs-panel');
  popup.setMenuBarVisibility(false);

  let resolved = false;

  const sendToken = (token) => {
    if (resolved) return;
    resolved = true;
    clearInterval(poll);
    BrowserWindow.getAllWindows().forEach(w => {
      if (!w.isDestroyed() && w !== popup) w.webContents.send('auth:token', token);
    });
    if (!popup.isDestroyed()) popup.close();
  };

  const tryGetToken = async () => {
    if (resolved || popup.isDestroyed()) return;
    try {
      const token = await popup.webContents.executeJavaScript(
        'window.Clerk && window.Clerk.session ? window.Clerk.session.getToken() : null'
      );
      if (token) sendToken(token);
    } catch (e) { /* page still navigating */ }
  };

  const poll = setInterval(tryGetToken, 1000);

  popup.webContents.on('did-finish-load', () => setTimeout(tryGetToken, 500));

  popup.on('closed', () => clearInterval(poll));
});


// ── File dialog ───────────────────────────────────────────────────────────────
ipcMain.handle('app:open-file-dialog', async (_e, options = {}) => {
  const { dialog } = require('electron');
  const isDir = (options.properties || []).includes('openDirectory');
  const multi = (options.properties || []).includes('multiSelections');
  const props = isDir ? ['openDirectory'] : ['openFile'];
  if (multi) props.push('multiSelections');
  const result = await dialog.showOpenDialog(mainWin, {
    properties: props,
    filters: options.filters || [],
    title: options.title || (isDir ? 'Select Folder' : 'Open File'),
  });
  if (result.canceled) return null;
  return multi ? { filePaths: result.filePaths } : result.filePaths[0];
});

// ── User data persistence (assets + recordings) ───────────────────────────────
const USER_DATA_PATH = path.join(app.getPath('userData'), 'userdata.json');

function readUserData() {
  try { return JSON.parse(fs.readFileSync(USER_DATA_PATH, 'utf8')); }
  catch { return {}; }
}
function writeUserData(data) {
  fs.writeFileSync(USER_DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

ipcMain.handle('userdata:load', () => readUserData());
ipcMain.handle('userdata:save', (_, data) => { writeUserData(data); return true; });

// ── Scene persistence ─────────────────────────────────────────────────────────
const scenesFilePath = () => path.join(app.getPath('userData'), 'scenes.json');

ipcMain.handle('scenes:load', () => {
  try { return JSON.parse(fs.readFileSync(scenesFilePath(), 'utf8')); }
  catch (_) { return null; }
});

ipcMain.handle('scenes:save', (_e, data) => {
  fs.writeFileSync(scenesFilePath(), JSON.stringify(data, null, 2));
  return { ok: true };
});

// ── Window controls (frameless) ───────────────────────────────────────────────
ipcMain.on('win:minimize', () => mainWin?.minimize());
ipcMain.on('win:maximize', () => mainWin?.isMaximized() ? mainWin.unmaximize() : mainWin.maximize());
ipcMain.on('win:close',    () => { app.isQuitting = true; mainWin?.close(); });

// ── Recordings — scan a directory for CreatorHub recording files ──────────────
ipcMain.handle('recordings:scan-dir', async (_e, dir) => {
  const scanDir = dir || app.getPath('videos');
  try {
    const files = fs.readdirSync(scanDir);
    return files
      .filter(f => /^CreatorHub-.*\.(mp4|mkv|mov|webm)$/i.test(f))
      .map(f => {
        const fp = path.join(scanDir, f);
        const stat = fs.statSync(fp);
        return { name: f, path: fp, size: stat.size, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch (_) { return []; }
});

// ── Assets — read file as buffer (used for GIF ImageDecoder in renderer) ─────
ipcMain.handle('assets:read-file', async (_e, filePath) => {
  return fs.readFileSync(filePath); // returns Buffer, serialised as ArrayBuffer over IPC
});

// ── Assets — metadata (size, dims, thumbnail) ─────────────────────────────────
ipcMain.handle('assets:get-metadata', async (_e, filePath, category) => {
  const stat = fs.statSync(filePath);
  const meta = { size: stat.size, dims: null, thumb: null, duration: null };

  if (category === 'images') {
    try {
      const ext = filePath.split('.').pop().toLowerCase();
      const img = nativeImage.createFromPath(filePath);
      const size = img.getSize();
      meta.dims = `${size.width} × ${size.height}`;
      // GIFs: skip thumbnail — let renderer use asset:// URL directly so animation plays
      if (ext !== 'gif') {
        const thumbW = Math.min(280, size.width);
        const thumbH = Math.round(size.height * (thumbW / size.width));
        meta.thumb = img.resize({ width: thumbW, height: thumbH }).toDataURL();
      }
    } catch (_) {}
  } else if (category === 'videos') {
    // Extract frame at 0s using FFmpeg, output as PNG to stdout
    try {
      const ffmpegBin = getFFmpegPath();
      meta.thumb = await new Promise((resolve) => {
        const chunks = [];
        const proc = spawn(ffmpegBin, [
          '-ss', '0', '-i', filePath,
          '-vframes', '1', '-vf', 'scale=280:-1',
          '-f', 'image2', '-vcodec', 'png', 'pipe:1',
        ], { stdio: ['ignore', 'pipe', 'ignore'] });
        proc.stdout.on('data', c => chunks.push(c));
        proc.on('close', () => {
          if (chunks.length === 0) { resolve(null); return; }
          const b64 = Buffer.concat(chunks).toString('base64');
          resolve('data:image/png;base64,' + b64);
        });
        proc.on('error', () => resolve(null));
      });
      // Get duration using ffprobe-style ffmpeg output
      meta.duration = await new Promise((resolve) => {
        let out = '';
        const proc = spawn(getFFmpegPath(), [
          '-i', filePath,
        ], { stdio: ['ignore', 'ignore', 'pipe'] });
        proc.stderr.on('data', d => out += d.toString());
        proc.on('close', () => {
          const m = out.match(/Duration:\s*(\d+):(\d+):(\d+)/);
          if (m) {
            const h = parseInt(m[1]), min = parseInt(m[2]), s = parseInt(m[3]);
            const total = h * 3600 + min * 60 + s;
            if (h > 0) resolve(`${h}:${String(min).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
            else resolve(`${min}:${String(s).padStart(2,'0')}`);
          } else resolve(null);
        });
        proc.on('error', () => resolve(null));
      });
    } catch (_) {}
  }
  return meta;
});

// ── Video Editor — thumbnail extraction ───────────────────────────────────────
ipcMain.handle('videoeditor:get-thumbnails', async (_e, filePath, count, duration) => {
  const ffmpegPath = getFFmpegPath();
  const os = require('os');
  const tmpDir = path.join(os.tmpdir(), `ch-thumbs-${Date.now()}`);
  let dirCreated = false;
  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    dirCreated = true;
    const fps = count / Math.max(duration, 1);
    await new Promise((resolve) => {
      const proc = spawn(ffmpegPath, [
        '-i', filePath,
        '-vf', `fps=${fps},scale=80:-1`,
        '-vframes', String(count),
        '-f', 'image2',
        path.join(tmpDir, 'thumb%04d.png'),
        '-y',
      ], { stdio: ['ignore', 'ignore', 'ignore'] });
      proc.on('close', resolve);
      proc.on('error', resolve);
    });
    const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.png')).sort();
    const dataUrls = files.map(f => {
      try {
        const data = fs.readFileSync(path.join(tmpDir, f));
        return 'data:image/png;base64,' + data.toString('base64');
      } catch { return null; }
    }).filter(Boolean);
    return dataUrls;
  } catch (e) {
    return [];
  } finally {
    if (dirCreated) {
      try {
        const leftover = fs.readdirSync(tmpDir);
        leftover.forEach(f => { try { fs.unlinkSync(path.join(tmpDir, f)); } catch {} });
        fs.rmdirSync(tmpDir);
      } catch {}
    }
  }
});

// ── Video Editor — multi-clip export via FFmpeg ───────────────────────────────
// clips = [{ filePath, inPoint, outPoint, speed, textOverlays }]
ipcMain.handle('videoeditor:export', async (event, clips, format, outputDir, fadeIn, fadeOut, overlayClips, canvasW, canvasH) => {
  const ffmpegPath = getFFmpegPath();
  if (!clips || !clips.length) return { ok: false, error: 'No clips' };

  const ts  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const ext = (format || 'mp4').toLowerCase();
  const dir = outputDir || path.dirname(clips[0].filePath);
  const outPath = path.join(dir, `Edited-${ts}.${ext}`);
  const sendProgress = (pct) => { try { event.sender.send('export:progress', pct); } catch {} };

  const hasOverlays = Array.isArray(overlayClips) && overlayClips.length > 0;
  const hasCanvas   = !!(canvasW && canvasH);
  const needsEncode = fadeIn > 0 || fadeOut > 0 || hasOverlays || hasCanvas ||
    clips.length > 1 ||
    clips.some(c => c.speed !== 1 || c.muted || (c.textOverlays && c.textOverlays.length) || c.transitionIn);

  if (!needsEncode && clips.length === 1) {
    // Fast path: single clip, stream copy
    const c = clips[0];
    return new Promise(resolve => {
      const proc = spawn(ffmpegPath,
        ['-ss', String(c.inPoint), '-to', String(c.outPoint), '-i', c.filePath, '-c', 'copy', outPath, '-y'],
        { stdio: ['ignore', 'ignore', 'ignore'] });
      proc.on('close', code => { sendProgress(100); resolve(code === 0 ? { ok: true, outputPath: outPath } : { ok: false, error: `FFmpeg exited ${code}` }); });
      proc.on('error', e => resolve({ ok: false, error: e.message }));
    });
  }

  // Complex path: concat + filters
  const inputs = [];
  const filterParts = [];
  let totalDur = 0;

  clips.forEach((c, i) => {
    inputs.push('-ss', String(c.inPoint), '-to', String(c.outPoint), '-i', c.filePath);
    const clipDur = (c.outPoint - c.inPoint) / (c.speed || 1);
    let vChain = `[${i}:v]`;
    let aChain = `[${i}:a]`;

    if (c.muted) {
      filterParts.push(`${aChain}volume=0[a${i}]`);
      aChain = `[a${i}]`;
    }

    if (c.speed && c.speed !== 1) {
      filterParts.push(`${vChain}setpts=${1/c.speed}*PTS[v${i}]`);
      // atempo max is 2.0, chain for >2x
      const rate = c.speed;
      let aTempo = '';
      if (rate <= 2) {
        aTempo = `atempo=${rate}`;
      } else {
        aTempo = `atempo=2.0,atempo=${(rate/2).toFixed(3)}`;
      }
      filterParts.push(`${aChain}${aTempo}[a${i}]`);
      vChain = `[v${i}]`; aChain = `[a${i}]`;
    }

    if (c.textOverlays && c.textOverlays.length) {
      let chain = vChain;
      c.textOverlays.forEach((ov, j) => {
        const txt   = ov.text.replace(/'/g, "\\'").replace(/:/g, '\\:');
        const yExpr = ov.pos === 'top' ? '50' : ov.pos === 'center' ? '(h-text_h)/2' : 'h-text_h-50';
        const color = (ov.color || '#ffffff').replace('#', '0x');
        const tStart = (ov.startSec || 0) - (c.inPoint || 0);
        const tEnd   = (ov.endSec   || 9999) - (c.inPoint || 0);
        const out = `[vt${i}_${j}]`;
        filterParts.push(
          `${chain}drawtext=text='${txt}':x=(w-text_w)/2:y=${yExpr}:fontsize=36:fontcolor=${color}:shadowx=2:shadowy=2:shadowcolor=black:enable='between(t\\,${tStart}\\,${tEnd})'${out}`
        );
        chain = out;
      });
      vChain = chain;
    }

    filterParts.push(`${vChain}${aChain}concat=n=1:v=1:a=1[vc${i}][ac${i}]`);
    totalDur += clipDur;
  });

  // Concat / xfade all clips
  const hasTransitions = clips.some((c, i) => i > 0 && c.transitionIn);
  if (!hasTransitions) {
    const concatV = clips.map((_,i) => `[vc${i}]`).join('');
    const concatA = clips.map((_,i) => `[ac${i}]`).join('');
    filterParts.push(`${concatV}${concatA}concat=n=${clips.length}:v=1:a=1[vout][aout]`);
  } else {
    // Chain clips with xfade where transitionIn is set, concat otherwise
    function deriveXfadeType(ti) {
      if (!ti || !ti.data) return 'fade';
      const frames = (ti.data.frames) || [];
      if (frames.length >= 2) {
        const dx = frames[frames.length-1].from.x - frames[0].from.x;
        if (dx < -50) return 'slideleft';
        if (dx > 50)  return 'slideright';
      }
      return 'fade';
    }
    let curV = '[vc0]', curA = '[ac0]';
    let cumDur = (clips[0].outPoint - clips[0].inPoint) / (clips[0].speed || 1);
    for (let i = 1; i < clips.length; i++) {
      const clipDur = (clips[i].outPoint - clips[i].inPoint) / (clips[i].speed || 1);
      const isLast  = i === clips.length - 1;
      const vOut = isLast ? '[vout]' : `[xfv${i}]`;
      const aOut = isLast ? '[aout]' : `[xfa${i}]`;
      if (clips[i].transitionIn) {
        const tDur   = Math.min(clips[i].transitionIn.duration || 0.5, clipDur * 0.9, cumDur * 0.9);
        const offset = (cumDur - tDur).toFixed(3);
        const xfType = deriveXfadeType(clips[i].transitionIn);
        filterParts.push(`${curV}[vc${i}]xfade=transition=${xfType}:duration=${tDur.toFixed(3)}:offset=${offset}${vOut}`);
        filterParts.push(`${curA}[ac${i}]acrossfade=d=${tDur.toFixed(3)}${aOut}`);
        cumDur += clipDur - tDur;
      } else {
        filterParts.push(`${curV}[vc${i}]concat=n=2:v=1:a=0${vOut}`);
        filterParts.push(`${curA}[ac${i}]concat=n=2:v=0:a=1${aOut}`);
        cumDur += clipDur;
      }
      curV = vOut; curA = aOut;
    }
    // Single clip fallback (shouldn't reach here normally)
    if (clips.length === 1) {
      filterParts.push(`[vc0][ac0]concat=n=1:v=1:a=1[vout][aout]`);
    }
    totalDur = cumDur; // update for fade calculations
  }

  // Fades on final output
  let finalV = '[vout]', finalA = '[aout]';
  const vf = [], af = [];
  if (fadeIn  > 0) { vf.push(`fade=type=in:start_time=0:duration=${fadeIn}`);                    af.push(`afade=type=in:start_time=0:duration=${fadeIn}`); }
  if (fadeOut > 0) { vf.push(`fade=type=out:start_time=${totalDur - fadeOut}:duration=${fadeOut}`); af.push(`afade=type=out:start_time=${totalDur - fadeOut}:duration=${fadeOut}`); }
  if (vf.length) { filterParts.push(`${finalV}${vf.join(',')}[vfades]`); filterParts.push(`${finalA}${af.join(',')}[afades]`); finalV = '[vfades]'; finalA = '[afades]'; }

  // Overlay (PiP) clips — added as extra inputs after the main clips
  if (hasOverlays) {
    const baseIdx = clips.length;
    overlayClips.forEach((ov, oi) => {
      const idx = baseIdx + oi;
      inputs.push('-i', ov.filePath);
      const xExpr  = `main_w*${((ov.x || 0) / 100).toFixed(4)}`;
      const yExpr  = `main_h*${((ov.y || 0) / 100).toFixed(4)}`;
      const wExpr  = `main_w*${((ov.w || 30) / 100).toFixed(4)}`;
      const hExpr  = `main_h*${((ov.h || 30) / 100).toFixed(4)}`;
      const tStart = (ov.startSec || 0).toFixed(3);
      const tEnd   = (ov.endSec   || 9999).toFixed(3);
      const shifted = `[ovshift${oi}]`;
      const scaled  = `[ovscaled${oi}]`;
      const out     = `[vwith_ov${oi}]`;
      filterParts.push(`[${idx}:v]setpts=PTS+${tStart}/TB${shifted}`);
      filterParts.push(`${shifted}scale=${wExpr}:${hExpr}${scaled}`);
      filterParts.push(`${finalV}${scaled}overlay=x=${xExpr}:y=${yExpr}:enable='between(t\\,${tStart}\\,${tEnd})'${out}`);
      finalV = out;
    });
  }

  // Canvas size — scale + letterbox/pillarbox to fit exactly
  if (hasCanvas) {
    filterParts.push(`${finalV}scale=${canvasW}:${canvasH}:force_original_aspect_ratio=decrease,pad=${canvasW}:${canvasH}:(ow-iw)/2:(oh-ih)/2[vcanvas]`);
    finalV = '[vcanvas]';
  }

  const args = [
    ...inputs,
    '-filter_complex', filterParts.join(';'),
    '-map', finalV, '-map', finalA,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
    '-c:a', 'aac', '-b:a', '192k',
    outPath, '-y',
  ];

  return new Promise(resolve => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    proc.stderr.on('data', (data) => {
      const m = data.toString().match(/time=(\d+):(\d+):(\d+\.?\d*)/);
      if (m && totalDur > 0) {
        const elapsed = parseInt(m[1])*3600 + parseInt(m[2])*60 + parseFloat(m[3]);
        sendProgress(Math.min(99, Math.round(elapsed / totalDur * 100)));
      }
    });
    proc.on('close', code => { sendProgress(100); resolve(code === 0 ? { ok: true, outputPath: outPath } : { ok: false, error: `FFmpeg exited ${code}` }); });
    proc.on('error', e => resolve({ ok: false, error: e.message }));
  });
});

// ── Studio — desktop source list ─────────────────────────────────────────────
ipcMain.handle('studio:desktop-sources', async (_e, types) => {
  const { desktopCapturer } = require('electron');
  const sources = await desktopCapturer.getSources({
    types: types || ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: true,
  });
  return sources.map(s => ({
    id:       s.id,
    name:     s.name,
    thumbnail: s.thumbnail.toDataURL(),
    appIcon:  s.appIcon ? s.appIcon.toDataURL() : null,
  }));
});

// ── Studio — recording ────────────────────────────────────────────────────────
// Recording: preload writes chunks directly to disk, main only does FFmpeg conversion
ipcMain.handle('studio:record-stop', async (_e, format, outputDir, tmpPath, isH264) => {
  if (!tmpPath) return { ok: false, error: 'No recording file' };

  const ts  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const ext = (format || 'mp4').toLowerCase();
  const dir = outputDir || app.getPath('videos');
  const outPath = path.join(dir, `CreatorHub-${ts}.${ext}`);

  let args;
  if (['webm', 'mkv'].includes(ext)) {
    // Container supports the source codecs directly — just copy everything
    args = ['-fflags', '+genpts', '-i', tmpPath, '-c', 'copy', outPath, '-y'];
  } else if (isH264) {
    // MediaRecorder produced H.264 — copy video, only transcode audio to AAC
    // This is nearly instant even for multi-hour recordings
    args = ['-fflags', '+genpts', '-i', tmpPath,
            '-c:v', 'copy',
            '-c:a', 'aac', '-b:a', '192k',
            outPath, '-y'];
  } else {
    // VP8 source — must re-encode video to H.264 for MP4/MOV
    args = ['-fflags', '+genpts', '-i', tmpPath,
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
            '-c:a', 'aac', '-b:a', '192k',
            outPath, '-y'];
  }

  const ffmpegPath = getFFmpegPath();
  try {
    const stat = fs.statSync(tmpPath);
    console.log('[FFmpeg rec] temp file:', tmpPath, 'size:', stat.size, 'bytes');
    console.log('[FFmpeg rec] cmd:', ffmpegPath, args.join(' '));
  } catch (e) { console.log('[FFmpeg rec] stat error:', e.message); }

  return new Promise(resolve => {
    const proc = spawn(ffmpegPath, args);
    let stderrOut = '';
    proc.stderr.on('data', d => { stderrOut += d.toString(); });
    proc.on('close', code => {
      if (code !== 0) console.log('[FFmpeg rec] FAILED code:', code, '\nstderr:', stderrOut);
      else console.log('[FFmpeg rec] OK →', outPath);
      try { fs.unlinkSync(tmpPath); } catch(e) {}
      if (code === 0) resolve({ ok: true, outputPath: outPath });
      else resolve({ ok: false, error: `FFmpeg exited ${code}` });
    });
  });
});

// ── Studio — streaming ───────────────────────────────────────────────────────
// Streaming is now handled entirely in the preload process (src/preload/index.js)
// to bypass Electron IPC serialization issues with binary data.
// FFmpeg is spawned directly in the preload, which has sandbox: false access.

// ── Browser sources (offscreen render → paint → IPC → OffscreenCanvas) ───────
const browserSourceWins = new Map();

ipcMain.handle('studio:browser-source-create', (_e, id, url, w, h) => {
  const win = new BrowserWindow({
    width: w, height: h,
    show: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { offscreen: true, contextIsolation: true, nodeIntegration: false },
  });
  win.webContents.setFrameRate(30);
  win.webContents.on('paint', (_evt, _dirty, image) => {
    if (!mainWin || mainWin.isDestroyed()) return;
    const size = image.getSize();
    mainWin.webContents.send('studio:browser-frame', id, image.toBitmap(), size.width, size.height);
  });
  win.loadURL(url);
  browserSourceWins.set(id, win);
});

ipcMain.handle('studio:browser-source-destroy', (_e, id) => {
  const win = browserSourceWins.get(id);
  if (win && !win.isDestroyed()) win.destroy();
  browserSourceWins.delete(id);
});

// ── Projects — .editor file format ───────────────────────────────────────────
// Format: "EDIT" (4 bytes) + uint32 header length LE (4 bytes) + JSON header + binary media blobs
// Header JSON: { name, version, thumbnail, state, files:[{originalPath, size, ext}] }

const PROJECTS_DIR = () => {
  const dir = path.join(app.getPath('userData'), 'projects');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

function readEditorHeader(filePath) {
  const data = fs.readFileSync(filePath);
  if (data.slice(0, 4).toString('ascii') !== 'EDIT') throw new Error('Invalid .editor file');
  const headerLen = data.readUInt32LE(4);
  const header = JSON.parse(data.slice(8, 8 + headerLen).toString('utf8'));
  return { data, headerLen, header };
}

function writeEditorFile(filePath, header, mediaBuffers) {
  const headerBuf = Buffer.from(JSON.stringify(header), 'utf8');
  const totalSize = 8 + headerBuf.length + (mediaBuffers || []).reduce((s, b) => s + b.length, 0);
  const out = Buffer.alloc(totalSize);
  let offset = 0;
  out.write('EDIT', offset, 'ascii'); offset += 4;
  out.writeUInt32LE(headerBuf.length, offset); offset += 4;
  headerBuf.copy(out, offset); offset += headerBuf.length;
  for (const mb of (mediaBuffers || [])) { mb.copy(out, offset); offset += mb.length; }
  fs.writeFileSync(filePath, out);
}

ipcMain.handle('project:create', async (_e, name) => {
  try {
    const safeName = (name || 'Untitled').replace(/[<>:"/\\|?*]/g, '_').slice(0, 60);
    const filePath = path.join(PROJECTS_DIR(), `${safeName}-${Date.now()}.editor`);
    writeEditorFile(filePath, { name, version: 1, thumbnail: null, state: null, files: [] }, []);
    return { ok: true, path: filePath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('project:save', async (_e, filePath, projectName, state, allFilePaths) => {
  try {
    const fileEntries = [];
    const fileBuffers = [];
    for (const fp of (allFilePaths || [])) {
      try {
        const buf = fs.readFileSync(fp);
        fileEntries.push({ originalPath: fp, size: buf.length, ext: path.extname(fp).slice(1) || 'bin' });
        fileBuffers.push(buf);
      } catch (_) {
        fileEntries.push({ originalPath: fp, size: 0, ext: path.extname(fp).slice(1) || 'bin' });
        fileBuffers.push(Buffer.alloc(0));
      }
    }
    // Preserve existing thumbnail if present
    let thumbnail = null;
    try { ({ header: { thumbnail } } = readEditorHeader(filePath)); } catch (_) {}
    writeEditorFile(filePath, { name: projectName, version: 1, thumbnail, state, files: fileEntries }, fileBuffers);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('project:load', async (_e, filePath) => {
  try {
    const { data, headerLen, header } = readEditorHeader(filePath);
    const os = require('os');
    const tmpDir = path.join(os.tmpdir(), `ch-proj-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const pathMap = {};
    let blobOffset = 8 + headerLen;
    for (const entry of (header.files || [])) {
      if (entry.size > 0) {
        const tmpPath = path.join(tmpDir, `file_${blobOffset}.${entry.ext || 'bin'}`);
        fs.writeFileSync(tmpPath, data.slice(blobOffset, blobOffset + entry.size));
        pathMap[entry.originalPath] = tmpPath;
      }
      blobOffset += entry.size;
    }
    return { ok: true, name: header.name, state: header.state, pathMap, thumbnail: header.thumbnail || null };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('project:list', async () => {
  try {
    const dir = PROJECTS_DIR();
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.editor'));
    const projects = [];
    for (const f of files) {
      const fp = path.join(dir, f);
      try {
        const { header } = readEditorHeader(fp);
        const stat = fs.statSync(fp);
        projects.push({ name: header.name || f, path: fp, modified: stat.mtimeMs, thumbnail: header.thumbnail || null });
      } catch (_) {}
    }
    return projects.sort((a, b) => b.modified - a.modified);
  } catch (_) { return []; }
});

ipcMain.handle('project:rename', async (_e, filePath, newName) => {
  try {
    const { data, headerLen, header } = readEditorHeader(filePath);
    header.name = newName;
    const rest = data.slice(8 + headerLen);
    const newHeaderBuf = Buffer.from(JSON.stringify(header), 'utf8');
    const out = Buffer.alloc(8 + newHeaderBuf.length + rest.length);
    out.write('EDIT', 0, 'ascii');
    out.writeUInt32LE(newHeaderBuf.length, 4);
    newHeaderBuf.copy(out, 8);
    rest.copy(out, 8 + newHeaderBuf.length);
    fs.writeFileSync(filePath, out);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('project:delete', async (_e, filePath) => {
  try { fs.unlinkSync(filePath); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});

// ── Transition files (.transition format) ────────────────────────────────────
const TRANSITIONS_DIR = path.join(app.getPath('documents'), 'CreatorHub', 'Transitions');
function ensureTransDir() {
  if (!fs.existsSync(TRANSITIONS_DIR)) fs.mkdirSync(TRANSITIONS_DIR, { recursive: true });
  return TRANSITIONS_DIR;
}

ipcMain.handle('transitions:get-dir', () => ensureTransDir());

ipcMain.handle('transitions:list', () => {
  const dir = ensureTransDir();
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.transition'))
    .map(f => {
      const fp = path.join(dir, f);
      try {
        const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
        return { name: data.name || f.replace('.transition', ''), duration: data.duration || 1, filePath: fp, data };
      } catch { return { name: f.replace('.transition', ''), duration: 1, filePath: fp, data: null }; }
    });
});

ipcMain.handle('transitions:save', (_e, filePath, data) => {
  try {
    const dir = ensureTransDir();
    const safeName = (data.name || 'Untitled').replace(/[\\/:*?"<>|]/g, '_');
    const fp = filePath || path.join(dir, safeName + '.transition');
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true, filePath: fp };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('transitions:load', (_e, filePath) => {
  try { return { ok: true, data: JSON.parse(fs.readFileSync(filePath, 'utf8')) }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('transitions:delete', (_e, filePath) => {
  try { fs.unlinkSync(filePath); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('project:updateThumbnail', async (_e, filePath, videoPath) => {
  try {
    const ffmpegPath = getFFmpegPath();
    const thumb = await new Promise((resolve) => {
      const chunks = [];
      const proc = spawn(ffmpegPath, [
        '-ss', '0', '-i', videoPath,
        '-vframes', '1', '-vf', 'scale=320:-1',
        '-f', 'image2', '-vcodec', 'png', 'pipe:1',
      ], { stdio: ['ignore', 'pipe', 'ignore'] });
      proc.stdout.on('data', c => chunks.push(c));
      proc.on('close', () => resolve(chunks.length ? 'data:image/png;base64,' + Buffer.concat(chunks).toString('base64') : null));
      proc.on('error', () => resolve(null));
    });
    if (!thumb) return { ok: false, error: 'FFmpeg produced no output' };
    const { data, headerLen, header } = readEditorHeader(filePath);
    header.thumbnail = thumb;
    const rest = data.slice(8 + headerLen);
    const newHeaderBuf = Buffer.from(JSON.stringify(header), 'utf8');
    const out = Buffer.alloc(8 + newHeaderBuf.length + rest.length);
    out.write('EDIT', 0, 'ascii');
    out.writeUInt32LE(newHeaderBuf.length, 4);
    newHeaderBuf.copy(out, 8);
    rest.copy(out, 8 + newHeaderBuf.length);
    fs.writeFileSync(filePath, out);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
