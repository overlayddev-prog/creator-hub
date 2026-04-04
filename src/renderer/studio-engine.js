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
    // Bind once to avoid allocating a new closure every rAF tick (reduces GC stutter)
    this._boundLoop = this._loop.bind(this);
  }

  select(id) { this._selectedId = id; }

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  init(canvas, w = 1920, h = 1080) {
    this.canvas = canvas;
    this.outW   = w;  this.outH = h;
    canvas.width  = w;
    canvas.height = h;
    this.ctx = canvas.getContext('2d', { alpha: false });
    // Audio graph
    this.audioCtx  = new AudioContext();
    this.audioDest = this.audioCtx.createMediaStreamDestination();
    // Silent tone keeps audioDest producing audio data at all times.
    // Without this, MediaRecorder (vp8+opus) stalls when no real audio
    // sources are connected — it waits for audio packets that never come,
    // producing only 1-2 chunks regardless of recording duration.
    this._silenceOsc  = this.audioCtx.createOscillator();
    this._silenceGain = this.audioCtx.createGain();
    this._silenceGain.gain.value = 0;          // inaudible
    this._silenceOsc.connect(this._silenceGain);
    this._silenceGain.connect(this.audioDest);
    this._silenceOsc.start();
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
    this._rafId = requestAnimationFrame(this._boundLoop);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  _render() {
    const ctx  = this.ctx;
    const outW = this.outW;
    const outH = this.outH;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, outW, outH);

    for (let i = 0, len = this.sources.length; i < len; i++) {
      const src = this.sources[i];
      if (!src.visible) continue;
      const el = src.element;
      if (!el) continue;
      // Skip videos that haven't decoded a frame yet
      if (el.tagName === 'VIDEO' && el.readyState < 2) continue;
      if (src.type === 'browser' && !src._hasFrame) continue;

      if (src.rotation !== 0) {
        // Only save/restore canvas state when we actually need rotation
        ctx.save();
        const cx = src.x + src.width  / 2;
        const cy = src.y + src.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate(src.rotation * Math.PI / 180);
        ctx.translate(-cx, -cy);
        ctx.drawImage(el, src.x, src.y, src.width, src.height);
        ctx.restore();
      } else {
        ctx.drawImage(el, src.x, src.y, src.width, src.height);
      }
    }

    // Force captureStream to detect a change every frame via a tiny pixel block
    // whose colour encodes a frame counter.  Uses pre-allocated ImageData to
    // avoid string alloc + colour parsing every frame.
    if (this.outputActive) {
      if (!this._counterImg) this._counterImg = ctx.createImageData(2, 2);
      this._frameCtr = ((this._frameCtr || 0) + 1) & 0xFF;
      const v = this._frameCtr;
      const d = this._counterImg.data;
      for (let p = 0; p < 16; p += 4) {
        d[p] = v; d[p + 1] = (v * 7) & 0xFF; d[p + 2] = (v * 13) & 0xFF; d[p + 3] = 255;
      }
      ctx.putImageData(this._counterImg, 0, 0);
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
    // captureStream(30) auto-detects canvas changes up to 30fps.
    // The pixel-counter pattern in _render() guarantees every frame is unique
    // so Chrome always has a change to detect.
    const videoStream = this.canvas.captureStream(fps);
    const combined = new MediaStream([
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
    const constraints = {
      audio: false,
      video: {
        width:  { ideal: this.outW },
        height: { ideal: this.outH },
      },
    };
    if (deviceId) constraints.video.deviceId = { exact: deviceId };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = this._makeVideo(stream);
    await video.play().catch(() => {});
    // Wait for the video to decode at least one frame so we get real dimensions
    if (!video.videoWidth) {
      await new Promise(r => { video.addEventListener('loadedmetadata', r, { once: true }); });
    }
    const src = new StudioSource(this._id++, name, 'camera', video, stream);
    src._sourceId = deviceId;
    // Use the actual decoded video dimensions for the native aspect ratio
    const natW = video.videoWidth  || this.outW;
    const natH = video.videoHeight || this.outH;
    src._aspectRatio = natW / natH;
    // Default: bottom-left, sized to native ratio at 25% of canvas width
    src.width  = Math.round(this.outW * 0.25);
    src.height = Math.round(src.width / src._aspectRatio);
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
    src._browserId  = id;
    src._browserUrl = url;
    src._hasFrame   = false;
    // One shared IPC listener + Web Worker for all browser sources.
    // Main process sends only the dirty region (cropped), so goal updates are
    // ~120KB instead of 8MB.  The worker does the BGRA→RGBA swap off-thread,
    // then main thread does a fast putImageData at the dirty rect offset.
    if (!this._browserFrameListenerSet) {
      this._browserFrameListenerSet = true;

      const workerCode = `
        self.onmessage = function(e) {
          var d = e.data, u8 = new Uint8ClampedArray(d.buf);
          var u32 = new Uint32Array(u8.buffer);
          for (var i = 0, len = u32.length; i < len; i++) {
            var px = u32[i];
            u32[i] = (px & 0xFF00FF00) | ((px & 0xFF) << 16) | ((px >> 16) & 0xFF);
          }
          self.postMessage({ srcId: d.srcId, buf: u8.buffer, dx: d.dx, dy: d.dy, dw: d.dw, dh: d.dh }, [u8.buffer]);
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));

      worker.onmessage = (e) => {
        const { srcId, buf, dx, dy, dw, dh } = e.data;
        const s = this.sources.find(s => s._browserId === srcId);
        if (!s) return;
        const ctx = s.element.getContext('2d');
        ctx.putImageData(new ImageData(new Uint8ClampedArray(buf), dw, dh), dx, dy);
        s._hasFrame = true;
      };

      window.creatorhub.studio.onBrowserSourceFrame((srcId, buf, dx, dy, dw, dh) => {
        const s = this.sources.find(s => s._browserId === srcId);
        if (!s) return;
        const copy = new Uint8ClampedArray(buf).buffer;
        worker.postMessage({ buf: copy, srcId, dx, dy, dw, dh }, [copy]);
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
    audio.crossOrigin = 'anonymous';
    await audio.play().catch(() => {});
    const key = 'media_' + Date.now();
    // Route through Web Audio graph — MediaElementSource disconnects the
    // element from default output, so we reconnect to speakers via a gain node
    // AND route to audioDest for recording/streaming.
    const srcNode  = this.audioCtx.createMediaElementSource(audio);
    const gainNode = this.audioCtx.createGain();
    gainNode._lastVol = 1;
    srcNode.connect(gainNode);
    gainNode.connect(this.audioDest);
    gainNode.connect(this.audioCtx.destination); // play through speakers
    // Analyser tapped off the gain node (NOT from captureStream — that causes glitching)
    const analyser = this.audioCtx.createAnalyser();
    analyser.fftSize = 32;
    gainNode.connect(analyser);
    this._audioNodes.set(key, { source: srcNode, gain: gainNode, stream: null, _audioEl: audio });
    return { key, audio, analyser };
  }

  // Get an analyser for any audio source key (tapped off its gain node)
  getAnalyser(key) {
    const node = this._audioNodes.get(key);
    if (!node) return null;
    const analyser = this.audioCtx.createAnalyser();
    analyser.fftSize = 32;
    node.gain.connect(analyser);
    return analyser;
  }

  // ── Microphone (standalone, not tied to a scene source) ───────────────────
  async addMicrophoneTrack(deviceId) {
    const sampleRate = this.audioCtx ? this.audioCtx.sampleRate : 48000;
    const audioConstraints = deviceId
      ? { deviceId: { exact: deviceId }, sampleRate, echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      : { sampleRate, echoCancellation: false, noiseSuppression: false, autoGainControl: false };
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
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
    if (node._audioEl) { node._audioEl.pause(); node._audioEl.src = ''; }
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
