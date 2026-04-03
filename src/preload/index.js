const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Direct file writing for recording chunks (bypasses IPC for bulk binary data)
let _recStream = null;
let _recPath = null;
let _recChunks = 0;
let _recBytes = 0;

contextBridge.exposeInMainWorld('creatorhub', {
  // ── IPC event listener ─────────────────────────────────────────────────────
  ipc: {
    on: (channel, cb) => ipcRenderer.on(channel, cb),
  },

  // ── API proxy (CORS-free requests via main process) ───────────────────────
  api: {
    fetch: (url, options) => ipcRenderer.invoke('api:fetch', url, options),
  },

  // ── Auth (popup sign-in flow) ──────────────────────────────────────────────
  auth: {
    silent:  ()    => ipcRenderer.invoke('auth:silent'),
    signIn:  ()    => ipcRenderer.invoke('auth:sign-in'),
    onToken: (cb)  => ipcRenderer.on('auth:token', (_event, token) => cb(token)),
  },

  // ── Scene persistence ──────────────────────────────────────────────────────
  scenes: {
    load: ()     => ipcRenderer.invoke('scenes:load'),
    save: (data) => ipcRenderer.invoke('scenes:save', data),
  },

  // ── Window controls ────────────────────────────────────────────────────────
  win: {
    minimize: () => ipcRenderer.send('win:minimize'),
    maximize: () => ipcRenderer.send('win:maximize'),
    close:    () => ipcRenderer.send('win:close'),
  },

  // ── App config & utilities ─────────────────────────────────────────────────
  app: {
    getConfig:      ()       => ipcRenderer.invoke('app:config'),
    openExternal:   (url)    => ipcRenderer.invoke('app:open-external', url),
    setAutoLaunch:  (enable) => ipcRenderer.invoke('app:set-autolaunch', enable),
    getAutoLaunch:  ()       => ipcRenderer.invoke('app:get-autolaunch'),
    openFileDialog:  (opts)   => ipcRenderer.invoke('app:open-file-dialog', opts),
    getAssetMeta:    (fp, cat) => ipcRenderer.invoke('assets:get-metadata', fp, cat),
    readFile:        (fp)      => ipcRenderer.invoke('assets:read-file', fp),
    scanRecordings:  (dir)     => ipcRenderer.invoke('recordings:scan-dir', dir),
    openFolder:     (path)   => ipcRenderer.invoke('app:open-folder', path),
    getVersion:         ()     => ipcRenderer.invoke('app:get-version'),
    checkForUpdates:    ()     => ipcRenderer.invoke('updater:check'),
    onUpdaterStatus:    (cb)   => ipcRenderer.on('updater:status', (_e, data) => cb(data)),
    loadUserData:   ()       => ipcRenderer.invoke('userdata:load'),
    saveUserData:   (data)   => ipcRenderer.invoke('userdata:save', data),
  },

  // ── Video Editor ───────────────────────────────────────────────────────────
  videoeditor: {
    export:        (clips, format, outputDir, fadeIn, fadeOut, overlayClips, w, h) =>
      ipcRenderer.invoke('videoeditor:export', clips, format, outputDir, fadeIn, fadeOut, overlayClips, w, h),
    getThumbnails: (filePath, count, duration) =>
      ipcRenderer.invoke('videoeditor:get-thumbnails', filePath, count, duration),
    onProgress:    (cb) => ipcRenderer.on('export:progress', (_e, pct) => cb(pct)),
  },

  // ── Projects (.editor file persistence) ───────────────────────────────────
  project: {
    create:          (name)                      => ipcRenderer.invoke('project:create', name),
    save:            (filePath, name, state, fps) => ipcRenderer.invoke('project:save', filePath, name, state, fps),
    load:            (filePath)                  => ipcRenderer.invoke('project:load', filePath),
    list:            ()                          => ipcRenderer.invoke('project:list'),
    rename:          (filePath, newName)         => ipcRenderer.invoke('project:rename', filePath, newName),
    delete:          (filePath)                  => ipcRenderer.invoke('project:delete', filePath),
    updateThumbnail: (filePath, videoPath)       => ipcRenderer.invoke('project:updateThumbnail', filePath, videoPath),
  },

  // ── Transition files (.transition) ────────────────────────────────────────
  transitions: {
    getDir:  ()               => ipcRenderer.invoke('transitions:get-dir'),
    list:    ()               => ipcRenderer.invoke('transitions:list'),
    save:    (filePath, data) => ipcRenderer.invoke('transitions:save', filePath, data),
    load:    (filePath)       => ipcRenderer.invoke('transitions:load', filePath),
    delete:  (filePath)       => ipcRenderer.invoke('transitions:delete', filePath),
  },

  // ── Studio (FFmpeg-based recording / streaming) ────────────────────────────
  studio: {
    getDesktopSources:      (types)        => ipcRenderer.invoke('studio:desktop-sources', types),
    recordStart: () => {
      _recPath = path.join(os.tmpdir(), `ch-rec-${Date.now()}.webm`);
      _recStream = fs.createWriteStream(_recPath);
      _recChunks = 0;
      _recBytes = 0;
      console.log('[preload] recording to', _recPath);
      return { ok: true };
    },
    recordChunk: (b64) => {
      if (_recStream && !_recStream.destroyed) {
        const buf = Buffer.from(b64, 'base64');
        _recChunks++;
        _recBytes += buf.length;
        console.log(`[preload] chunk #${_recChunks} b64len=${b64.length} bytes=${buf.length} totalBytes=${_recBytes}`);
        _recStream.write(buf);
      } else {
        console.log('[preload] recordChunk DROPPED — stream closed');
      }
    },
    recordStop: async (fmt, dir) => {
      console.log(`[preload] recordStop — wrote ${_recChunks} chunks, ${_recBytes} bytes total`);
      const stream = _recStream;
      _recStream = null;
      if (stream && !stream.destroyed) {
        await new Promise(r => stream.end(r));
      }
      // Verify file size
      try { console.log('[preload] file size:', fs.statSync(_recPath).size); } catch(_) {}
      const tmpPath = _recPath;
      _recPath = null;
      return ipcRenderer.invoke('studio:record-stop', fmt, dir, tmpPath);
    },
    streamStart:            (destinations, opts) => ipcRenderer.invoke('studio:stream-start', destinations, opts),
    streamChunk: (b64) => ipcRenderer.send('studio:stream-chunk', b64),
    streamStop:             ()             => ipcRenderer.invoke('studio:stream-stop'),
    onStreamHealth:         (cb)           => ipcRenderer.on('studio:stream-health', (_e, data) => cb(data)),
    onStreamReconnecting:   (cb)           => ipcRenderer.on('studio:stream-reconnecting', (_e, data) => cb(data)),
    onStreamReconnected:    (cb)           => ipcRenderer.on('studio:stream-reconnected', (_e, data) => cb(data)),
    onStreamDropped:        (cb)           => ipcRenderer.on('studio:stream-dropped', (_e, data) => cb(data)),
    onStreamError:          (cb)           => ipcRenderer.on('studio:stream-error', (_e, data) => cb(data)),
    browserSourceCreate:  (id, url, w, h) => ipcRenderer.invoke('studio:browser-source-create', id, url, w, h),
    browserSourceDestroy: (id)            => ipcRenderer.invoke('studio:browser-source-destroy', id),
    onBrowserSourceFrame: (cb)            => ipcRenderer.on('studio:browser-frame', (_e, id, buf, w, h) => cb(id, buf, w, h)),
  },
});
