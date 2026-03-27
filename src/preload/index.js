const { contextBridge, ipcRenderer } = require('electron');

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
    getVersion:     ()       => ipcRenderer.invoke('app:get-version'),
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

  // ── Studio (FFmpeg-based recording / streaming) ────────────────────────────
  studio: {
    getDesktopSources:      (types)        => ipcRenderer.invoke('studio:desktop-sources', types),
    recordStart:            ()             => ipcRenderer.invoke('studio:record-start'),
    recordChunk:            (chunk)        => ipcRenderer.invoke('studio:record-chunk', chunk),
    recordStop:             (fmt, dir)     => ipcRenderer.invoke('studio:record-stop', fmt, dir),
    streamStart:            (destinations) => ipcRenderer.invoke('studio:stream-start', destinations),
    streamChunk:            (chunk)        => ipcRenderer.invoke('studio:stream-chunk', chunk),
    streamStop:             ()             => ipcRenderer.invoke('studio:stream-stop'),
    browserSourceCreate:  (id, url, w, h) => ipcRenderer.invoke('studio:browser-source-create', id, url, w, h),
    browserSourceDestroy: (id)            => ipcRenderer.invoke('studio:browser-source-destroy', id),
    onBrowserSourceFrame: (cb)            => ipcRenderer.on('studio:browser-frame', (_e, id, buf) => cb(id, buf)),
  },
});
