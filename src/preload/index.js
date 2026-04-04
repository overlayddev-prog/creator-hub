const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// ── FFmpeg path resolution (same logic as main process) ─────────────────────
function getFFmpegPath() {
  let p = require('ffmpeg-static');
  if (p && p.includes('app.asar')) {
    p = p.replace('app.asar', 'app.asar.unpacked');
  }
  return p;
}

// ── Recording — direct file write (bypasses IPC for bulk binary data) ───────
let _recStream = null;
let _recPath = null;
let _recChunks = 0;
let _recBytes = 0;
let _recH264 = false;

// ── Streaming — FFmpeg spawned directly in preload (bypasses IPC entirely) ──
let _streamProcs = [];       // [{ proc, dest, opts, reconnecting, reconnectAttempts }]
let _streamStopping = false;
let _streamChunkCount = 0;

// Callbacks registered by the renderer via onStreamHealth/onStreamError/etc.
let _healthCb = null;
let _errorCb = null;
let _reconnectCb = null;
let _reconnectedCb = null;
let _droppedCb = null;

function buildStreamArgs(dest, opts) {
  const rtmp = `${dest.server}/${dest.key}`;
  const bitrateKbps = parseInt(opts.videoBitrate) || 6000;
  const gop = String((opts.fps || 30) * 2);
  const args = ['-fflags', '+genpts', '-i', 'pipe:0'];

  if (opts.h264Passthrough) {
    // MediaRecorder is already outputting H.264 — just copy it to FLV
    args.push('-c:v', 'copy');
  } else if (opts.encoder === 'h264_nvenc') {
    args.push(
      '-c:v', 'h264_nvenc', '-preset', 'p4', '-rc', 'cbr',
      '-b:v', bitrateKbps + 'k', '-maxrate', bitrateKbps + 'k',
      '-bufsize', (bitrateKbps * 2) + 'k',
    );
  } else if (opts.encoder === 'h264_amf') {
    args.push(
      '-c:v', 'h264_amf', '-quality', 'speed', '-rc', 'cbr',
      '-b:v', bitrateKbps + 'k', '-maxrate', bitrateKbps + 'k',
      '-bufsize', (bitrateKbps * 2) + 'k',
    );
  } else {
    args.push(
      '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
      '-b:v', bitrateKbps + 'k', '-maxrate', bitrateKbps + 'k',
      '-bufsize', (bitrateKbps * 2) + 'k',
    );
  }
  if (!opts.h264Passthrough) {
    args.push('-pix_fmt', 'yuv420p', '-g', gop);
  }
  args.push(
    '-c:a', 'aac', '-b:a', opts.audioBitrate || '192k', '-ar', '48000',
    '-f', 'flv', rtmp,
  );
  return args;
}

// Spawn a single FFmpeg process for one RTMP destination.
// Attaches stderr parsing (health/errors) and reconnection logic.
function spawnStreamFFmpeg(dest, opts, entry) {
  const ffmpegPath = getFFmpegPath();
  const args = buildStreamArgs(dest, opts);
  console.log('[preload FFmpeg] cmd:', ffmpegPath, args.join(' '));
  const proc = spawn(ffmpegPath, args);
  let stderrBuf = '';

  proc.stdin.on('error', () => {});

  proc.stderr.on('data', (data) => {
    const text = data.toString();
    stderrBuf += text;
    // FFmpeg uses \r to overwrite progress lines, but on Windows pipes we may
    // see \r\n or just \n.  Split on any combination.
    const lines = stderrBuf.split(/\r\n|\r|\n/);
    stderrBuf = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      // Only log non-progress lines (version info, errors) to avoid console spam
      if (!line.includes('frame=')) console.log('[preload FFmpeg]', line.trim());
      const fps    = line.match(/fps=\s*([\d.]+)/);
      const br     = line.match(/bitrate=\s*([\d.]+)kbits\/s/);
      const frames = line.match(/frame=\s*(\d+)/);
      const speed  = line.match(/speed=\s*([\d.]+)x/);
      if (fps || br || frames) {
        const health = {
          destId: dest.id,
          fps:    fps ? parseFloat(fps[1]) : null,
          bitrate: br ? parseFloat(br[1]) : null,
          frames: frames ? parseInt(frames[1]) : null,
          speed:  speed ? parseFloat(speed[1]) : null,
        };
        if (_healthCb) try { _healthCb(health); } catch (_) {}
      }
      if (!_streamStopping && (line.includes('Error') || line.includes('error') || line.includes('failed'))) {
        if (_errorCb) try { _errorCb({ destId: dest.id, message: line.trim() }); } catch (_) {}
      }
    }
  });

  proc.on('close', (code) => {
    const idx = _streamProcs.indexOf(entry);
    if (idx === -1) return;

    if (!_streamStopping && code !== 0 && entry.reconnectAttempts < 5) {
      entry.reconnecting = true;
      entry.reconnectAttempts++;
      if (_reconnectCb) try { _reconnectCb({ destId: dest.id, attempt: entry.reconnectAttempts }); } catch (_) {}
      const delay = Math.min(2000 * Math.pow(2, entry.reconnectAttempts - 1), 32000);
      setTimeout(() => {
        if (_streamStopping) return;
        // Respawn FFmpeg into the SAME entry (don't create a new one)
        entry.proc = spawnStreamFFmpeg(dest, opts, entry);
        entry.reconnecting = false;
        if (_reconnectedCb) try { _reconnectedCb({ destId: dest.id }); } catch (_) {}
      }, delay);
    } else if (!_streamStopping) {
      _streamProcs.splice(idx, 1);
      if (_droppedCb) try { _droppedCb({ destId: dest.id }); } catch (_) {}
    } else {
      _streamProcs.splice(idx, 1);
    }
  });

  return proc;
}

// Create a new stream entry + spawn FFmpeg for it
function addStreamDest(dest, opts) {
  const entry = { proc: null, dest, opts, reconnecting: false, reconnectAttempts: 0 };
  entry.proc = spawnStreamFFmpeg(dest, opts, entry);
  _streamProcs.push(entry);
}

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

  // ── Studio (recording / streaming) ────────────────────────────────────────
  studio: {
    getDesktopSources: (types) => ipcRenderer.invoke('studio:desktop-sources', types),

    // ── Recording (direct file write in preload — no IPC for bulk data) ─────
    recordStart: (h264) => {
      _recPath = path.join(os.tmpdir(), `ch-rec-${Date.now()}.webm`);
      _recH264 = !!h264;
      _recStream = fs.createWriteStream(_recPath);
      _recChunks = 0;
      _recBytes = 0;
      console.log('[preload] recording to', _recPath, _recH264 ? '(h264)' : '(vp8)');
      return { ok: true };
    },
    recordChunk: (data) => {
      if (_recStream && !_recStream.destroyed) {
        const buf = Buffer.from(data);
        _recChunks++;
        _recBytes += buf.length;
        _recStream.write(buf);
      }
    },
    recordStop: async (fmt, dir) => {
      console.log(`[preload] recordStop — wrote ${_recChunks} chunks, ${_recBytes} bytes total`);
      const stream = _recStream;
      _recStream = null;
      if (stream && !stream.destroyed) {
        await new Promise(r => stream.end(r));
      }
      try { console.log('[preload] file size:', fs.statSync(_recPath).size); } catch(_) {}
      const tmpPath = _recPath;
      _recPath = null;
      return ipcRenderer.invoke('studio:record-stop', fmt, dir, tmpPath, _recH264);
    },

    // ── Streaming (FFmpeg spawned directly in preload — no IPC for data) ────
    streamStart: (destinations, opts) => {
      if (_streamProcs.length > 0) return { ok: false, error: 'Already streaming' };
      _streamStopping = false;
      _streamChunkCount = 0;
      for (const dest of destinations) {
        addStreamDest(dest, opts);
      }
      return { ok: true };
    },
    streamChunk: (data) => {
      const buf = Buffer.from(data);
      _streamChunkCount++;
      if (_streamChunkCount <= 5) {
        console.log(`[preload FFmpeg pipe] chunk #${_streamChunkCount}, size=${buf.length}, first8=${buf.subarray(0, 8).toString('hex')}`);
      }
      for (const entry of _streamProcs) {
        if (entry.proc && !entry.proc.stdin.destroyed && !entry.reconnecting) {
          entry.proc.stdin.write(buf);
        }
      }
    },
    streamStop: () => {
      _streamStopping = true;
      for (const entry of _streamProcs) {
        try { entry.proc.stdin.end(); } catch (_) {}
      }
      _streamProcs = [];
      return { ok: true };
    },

    // ── Stream health / event callbacks ─────────────────────────────────────
    onStreamHealth:       (cb) => { _healthCb = cb; },
    onStreamReconnecting: (cb) => { _reconnectCb = cb; },
    onStreamReconnected:  (cb) => { _reconnectedCb = cb; },
    onStreamDropped:      (cb) => { _droppedCb = cb; },
    onStreamError:        (cb) => { _errorCb = cb; },

    // ── Browser sources (still via main process IPC) ────────────────────────
    browserSourceCreate:  (id, url, w, h) => ipcRenderer.invoke('studio:browser-source-create', id, url, w, h),
    browserSourceDestroy: (id)            => ipcRenderer.invoke('studio:browser-source-destroy', id),
    onBrowserSourceFrame: (cb)            => ipcRenderer.on('studio:browser-frame', (_e, id, buf, w, h) => cb(id, buf, w, h)),
  },
});
