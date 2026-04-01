'use strict';
/* ── StudioSource ─────────────────────────────────────────────────────────── */
class StudioSource {
  constructor(id, name, type, element, stream) {
    this.id       = id;
    this.name     = name;
    this.type     = type;     // 'screen'|'window'|'camera'|'image'|'media'
    this.element  = element;  // HTMLVideoElement | HTMLImageElement
    this.stream   = stream || null;
    this.visible  = true;
    this.x        = 0;
    this.y        = 0;
    this.width    = 1920;
    this.height   = 1080;
    this.rotation = 0;
    this._sourceId = null;    // chromeMediaSourceId for screen/window, deviceId for camera
  }
}

/* ── StudioEngine ─────────────────────────────────────────────────────────── */
class StudioEngine {
  constructor() {
    this.canvas  = null;
    this.ctx     = null;
    this.outW    = 1920;
    this.outH    = 1080;
    this.sources = [];    // index 0 = bottom layer, last = top layer
    this._id     = 1;
    this._rafId  = null;
    this.running = false;
    this._selectedId = null;
    this.audioCtx   = null;
    this.audioDest  = null;   // MediaStreamAudioDestinationNode
    this._audioNodes = new Map(); // sourceId → { source, gain, stream }
  }

  select(id) { this._selectedId = id; }

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  init(canvas, w = 1920, h = 1080) {
    this.canvas = canvas;
    this.outW   = w;  this.outH = h;
    canvas.width  = w;
    canvas.height = h;
    this.ctx = canvas.getContext('2d');
    // Audio graph
    this.audioCtx  = new AudioContext();
    this.audioDest = this.audioCtx.createMediaStreamDestination();
    // Monitor node — connects to speakers so user can hear the mix locally
    this._monitorGain = this.audioCtx.createGain();
    this._monitorGain.gain.value = 0; // off by default
    this._monitorGain.connect(this.audioCtx.destination);
    this._monitoring = false;
  }

  setMonitor(enabled) {
    this._monitoring = enabled;
    this._monitorGain.gain.value = enabled ? 1 : 0;
  }

  isMonitoring() { return this._monitoring; }

  start() {
    if (this.running) return;
    this.running = true;
    if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
    this._loop();
  }

  stop() {
    this.running = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  }

  _loop() {
    if (!this.running) return;
    this._render();
    this._rafId = requestAnimationFrame(() => this._loop());
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  _render() {
    const { ctx, outW, outH } = this;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, outW, outH);
    for (const src of this.sources) {
      if (!src.visible || !src.element) continue;
      if (src.element.tagName === 'VIDEO' && src.element.readyState < 2) continue;
      if (src.type === 'browser' && !src._hasFrame) continue;
      ctx.save();
      if (src.rotation !== 0) {
        const cx = src.x + src.width  / 2;
        const cy = src.y + src.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate(src.rotation * Math.PI / 180);
        ctx.translate(-cx, -cy);
      }
      try { ctx.drawImage(src.element, src.x, src.y, src.width, src.height); }
      catch (e) { /* frame not ready */ }
      ctx.restore();
    }
    // Draw selection box + handles on top — skipped during recording/streaming
    if (this._selectedId != null && !this.outputActive) {
      const sel = this.sources.find(s => s.id === this._selectedId);
      if (sel) this._drawSelection(ctx, sel);
    }
  }

  _handlePositions(src) {
    const { x, y, width: w, height: h } = src;
    return [
      [x,       y      ], [x+w/2,   y      ], [x+w,     y      ],
      [x,       y+h/2  ],                      [x+w,     y+h/2  ],
      [x,       y+h    ], [x+w/2,   y+h    ], [x+w,     y+h    ],
    ];
  }

  _drawSelection(ctx, src) {
    const R = 14; // handle draw radius in canvas units
    ctx.save();
    ctx.strokeStyle = '#5b9cf6';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeRect(src.x, src.y, src.width, src.height);
    this._handlePositions(src).forEach(([hx, hy]) => {
      ctx.beginPath();
      ctx.arc(hx, hy, R, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#5b9cf6';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    ctx.restore();
  }

  // ── Output stream (for recording / streaming) ────────────────────────────
  captureStream(fps = 30) {
    const videoStream = this.canvas.captureStream(fps);
    const combined   = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...this.audioDest.stream.getAudioTracks(),
    ]);
    return combined;
  }

  // ── Add sources ──────────────────────────────────────────────────────────────
  async addDesktopSource(chromeSourceId, name, type) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: type === 'screen' ? {
        mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: chromeSourceId },
      } : false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: chromeSourceId,
          minWidth: 1, maxWidth: 4096,
          minHeight: 1, maxHeight: 2160,
        },
      },
    });
    const video = this._makeVideo(stream);
    await video.play().catch(() => {});
    const src = new StudioSource(this._id++, name, type, video, stream);
    src._sourceId = chromeSourceId;
    src.width = this.outW;  src.height = this.outH;
    this._pushTop(src);
    // Route any audio tracks into the audio graph
    this._connectAudio(src.id, stream);
    return src;
  }

  async addCameraSource(deviceId, name) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: deviceId ? { deviceId: { exact: deviceId } } : true,
    });
    const video = this._makeVideo(stream);
    await video.play().catch(() => {});
    const src = new StudioSource(this._id++, name, 'camera', video, stream);
    src._sourceId = deviceId;
    // Default: bottom-left quarter
    src.width  = Math.round(this.outW * 0.25);
    src.height = Math.round(this.outH * 0.25);
    src.x = 0;  src.y = this.outH - src.height;
    this._pushTop(src);
    return src;
  }

  async addImageSource(filePath, name) {
    const url = filePath.includes('://') ? filePath
      : 'asset:///' + filePath.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1');
    const isGif = url.toLowerCase().endsWith('.gif');

    if (isGif && typeof ImageDecoder !== 'undefined') {
      // Read via IPC — avoids fetch() issues with custom protocols
      const buf = await window.creatorhub.app.readFile(filePath);

      // Probe first frame for natural dimensions
      const decoder = new ImageDecoder({ data: new Blob([buf], { type: 'image/gif' }).stream(), type: 'image/gif' });
      await decoder.completed.catch(() => {});
      const firstResult = await decoder.decode({ frameIndex: 0 });
      const natW = firstResult.image.displayWidth;
      const natH = firstResult.image.displayHeight;
      firstResult.image.close();
      const frameCount = decoder.tracks.selectedTrack.frameCount;
      decoder.close();

      // Second decoder for the animation loop (stream already consumed above)
      const decoder2 = new ImageDecoder({ data: new Blob([buf], { type: 'image/gif' }).stream(), type: 'image/gif' });

      const offscreen = new OffscreenCanvas(natW, natH);
      const octx = offscreen.getContext('2d');

      const src = new StudioSource(this._id++, name, 'image', offscreen);
      src.width = this.outW; src.height = this.outH;

      let cancelled = false;
      let frameIndex = 0;

      const advanceFrame = async () => {
        if (cancelled) return;
        try {
          const result = await decoder2.decode({ frameIndex });
          octx.clearRect(0, 0, natW, natH);
          octx.drawImage(result.image, 0, 0);
          const delayMs = Math.max(20, (result.image.duration ?? 100000) / 1000);
          result.image.close();
          frameIndex = (frameIndex + 1) % frameCount;
          setTimeout(advanceFrame, delayMs);
        } catch (_) {
          frameIndex = 0;
          if (!cancelled) setTimeout(advanceFrame, 100);
        }
      };
      advanceFrame();

      src._gifCleanup = () => { cancelled = true; decoder2.close(); };
      this._pushTop(src);
      return src;
    }

    // Static images (PNG, JPG, WebP, SVG, etc.)
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const src = new StudioSource(this._id++, name, 'image', img);
    src.width = this.outW; src.height = this.outH;
    this._pushTop(src);
    return src;
  }

  async addMediaSource(filePath, name) {
    const url = filePath.includes('://') ? filePath
      : 'asset:///' + filePath.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1');
    const video = document.createElement('video');
    video.src        = url;
    video.autoplay   = true;
    video.loop       = true;
    video.muted      = false;
    video.playsInline = true;
    await video.play().catch(() => {});
    const src = new StudioSource(this._id++, name, 'media', video);
    src.width = this.outW;  src.height = this.outH;
    this._pushTop(src);
    // Route media audio into the mix
    const mediaStream = video.captureStream ? video.captureStream() : null;
    if (mediaStream) this._connectAudio(src.id, mediaStream);
    return src;
  }

  async addBrowserSource(url, name) {
    const id = this._id++;
    // OffscreenCanvas as the drawable element — atomic frame updates, no flicker
    const offscreen = new OffscreenCanvas(this.outW, this.outH);
    const src = new StudioSource(id, name, 'browser', offscreen);
    src.width = this.outW;  src.height = this.outH;
    src._browserId = id;
    src._hasFrame  = false;
    // One shared IPC listener for all browser sources
    if (!this._browserFrameListenerSet) {
      this._browserFrameListenerSet = true;
      window.creatorhub.studio.onBrowserSourceFrame(async (srcId, buf) => {
        const s = this.sources.find(s => s._browserId === srcId);
        if (!s) return;
        try {
          const bitmap = await createImageBitmap(new Blob([buf], { type: 'image/png' }));
          const ctx = s.element.getContext('2d');
          ctx.clearRect(0, 0, s.element.width, s.element.height);
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
          s._hasFrame = true;
        } catch (_) {}
      });
    }
    await window.creatorhub.studio.browserSourceCreate(id, url, this.outW, this.outH);
    this._pushTop(src);
    return src;
  }

  // ── Audio-only media file (not a visual source, just audio in the mix) ───
  async addMediaAudioTrack(filePath, name) {
    const url = filePath.includes('://') ? filePath
      : 'asset:///' + filePath.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1');
    const audio = document.createElement('audio');
    audio.src        = url;
    audio.autoplay   = true;
    audio.loop       = true;
    audio.playsInline = true;
    await audio.play().catch(() => {});
    const key = 'media_' + Date.now();
    const mediaStream = audio.captureStream ? audio.captureStream() : null;
    if (mediaStream) {
      this._connectAudio(key, mediaStream);
      this._audioNodes.get(key)._audioEl = audio;
    }
    return { key, audio };
  }

  // ── Microphone (standalone, not tied to a scene source) ───────────────────
  async addMicrophoneTrack(deviceId) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      video: false,
    });
    const key = deviceId ? 'mic_' + deviceId : 'mic';
    this._connectAudio(key, stream, stream);
    return stream;
  }

  setMicVolume(deviceId, vol) {
    const node = this._audioNodes.get('mic_' + deviceId);
    if (node) node.gain.gain.value = vol;
  }

  setMicMuted(deviceId, muted) {
    const node = this._audioNodes.get('mic_' + deviceId);
    if (node) node.gain.gain.value = muted ? 0 : (node._lastVol || 1);
  }

  // ── Source management ────────────────────────────────────────────────────────
  _makeVideo(stream) {
    const v = document.createElement('video');
    v.srcObject   = stream;
    v.autoplay    = true;
    v.muted       = true;
    v.playsInline = true;
    return v;
  }

  _pushTop(src) { this.sources.push(src); }

  _connectAudio(id, stream, ownedStream) {
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length || !this.audioCtx) return;
    const srcNode  = this.audioCtx.createMediaStreamSource(stream);
    const gainNode = this.audioCtx.createGain();
    gainNode._lastVol = 1;
    srcNode.connect(gainNode);
    gainNode.connect(this.audioDest);
    // Also route to monitor so user can hear when monitoring is on
    if (this._monitorGain) gainNode.connect(this._monitorGain);
    this._audioNodes.set(id, { source: srcNode, gain: gainNode, stream: ownedStream || null });
  }

  removeAudioSource(key) {
    const node = this._audioNodes.get(key);
    if (!node) return;
    try { node.source.disconnect(); node.gain.disconnect(); } catch (e) {}
    if (node.stream) node.stream.getTracks().forEach(t => t.stop());
    this._audioNodes.delete(key);
  }

  removeSource(id) {
    const i = this.sources.findIndex(s => s.id === id);
    if (i === -1) return;
    const src = this.sources[i];
    if (src._browserId !== undefined) {
      window.creatorhub.studio.browserSourceDestroy(src._browserId);
    }
    if (src._gifCleanup) src._gifCleanup();
    if (src.stream) src.stream.getTracks().forEach(t => t.stop());
    if (src.element) {
      if (src.element.tagName === 'VIDEO') { src.element.srcObject = null; src.element.src = ''; }
    }
    const node = this._audioNodes.get(id);
    if (node) { try { node.source.disconnect(); node.gain.disconnect(); } catch(e){} this._audioNodes.delete(id); }
    this.sources.splice(i, 1);
  }

  setTransform(id, props) {
    const src = this.sources.find(s => s.id === id);
    if (src) Object.assign(src, props);
  }

  setVisible(id, v) {
    const src = this.sources.find(s => s.id === id);
    if (src) src.visible = v;
  }

  setVolume(id, vol) {
    const node = this._audioNodes.get(id);
    if (node) { node.gain.gain.value = vol; node.gain._lastVol = vol; }
  }

  // 'up' = move toward top of stack (higher index), 'down' = toward bottom
  reorder(id, dir) {
    const i = this.sources.findIndex(s => s.id === id);
    if (i === -1) return;
    if (dir === 'up'   && i < this.sources.length - 1) [this.sources[i], this.sources[i+1]] = [this.sources[i+1], this.sources[i]];
    if (dir === 'down' && i > 0)                       [this.sources[i], this.sources[i-1]] = [this.sources[i-1], this.sources[i]];
  }
}

window.StudioEngine = StudioEngine;
