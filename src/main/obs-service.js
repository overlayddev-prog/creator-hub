const { EventEmitter } = require('events');
const OBSWebSocket = require('obs-websocket-js').default;

class OBSService extends EventEmitter {
  constructor() {
    super();
    this.obs = new OBSWebSocket();
    this.connected = false;
    this.lastPassword = undefined;

    // When OBS closes or connection drops, update state and notify main process
    this.obs.on('ConnectionClosed', () => {
      this.connected = false;
      this.emit('disconnected');
    });
  }

  async connect(password) {
    try {
      this.lastPassword = password || undefined;
      await this.obs.connect('ws://127.0.0.1:4455', this.lastPassword);
      this.connected = true;
      return { ok: true };
    } catch (e) {
      this.connected = false;
      // Give the user a helpful message depending on the error
      const msg = e.message || String(e);
      if (msg.includes('ECONNREFUSED') || msg.includes('connect')) {
        return { ok: false, error: 'OBS is not open — start OBS first' };
      }
      if (msg.includes('Authentication') || msg.includes('auth') || msg.includes('4009')) {
        return { ok: false, error: 'Wrong OBS WebSocket password' };
      }
      return { ok: false, error: msg };
    }
  }

  async disconnect() {
    try {
      await this.obs.disconnect();
      this.connected = false;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  }

  async getCurrentScene() {
    const data = await this.obs.call('GetCurrentProgramScene');
    return data.currentProgramSceneName;
  }

  async createOrUpdateBrowserSource(sceneName, sourceName, url) {
    try {
      await this.obs.call('GetInputSettings', { inputName: sourceName });
      await this.obs.call('SetInputSettings', { inputName: sourceName, inputSettings: { url } });
      return { updated: true };
    } catch (err) {
      await this.obs.call('CreateInput', {
        sceneName,
        inputName: sourceName,
        inputKind: 'browser_source',
        inputSettings: {
          url,
          width: 1920,
          height: 1080,
          css: 'body { background: transparent !important; margin: 0; overflow: hidden; }',
          shutdown: false,
          reroute_audio: true,
        },
      });
      return { created: true };
    }
  }

  // ── Scenes (extended) ───────────────────────────────────────────────────────
  async createScene(sceneName) {
    await this.obs.call('CreateScene', { sceneName });
    return { ok: true };
  }

  async removeScene(sceneName) {
    await this.obs.call('RemoveScene', { sceneName });
    return { ok: true };
  }

  // ── Sources ──────────────────────────────────────────────────────────────────
  async getSceneItemList(sceneName) {
    const data = await this.obs.call('GetSceneItemList', { sceneName });
    return { ok: true, items: data.sceneItems };
  }

  async setSceneItemEnabled(sceneName, sceneItemId, enabled) {
    await this.obs.call('SetSceneItemEnabled', { sceneName, sceneItemId, sceneItemEnabled: enabled });
    return { ok: true };
  }

  async removeSceneItem(sceneName, sceneItemId) {
    await this.obs.call('RemoveSceneItem', { sceneName, sceneItemId });
    return { ok: true };
  }

  async addInput(sceneName, inputName, inputKind) {
    await this.obs.call('CreateInput', {
      sceneName, inputName, inputKind,
      inputSettings: {},
      sceneItemEnabled: true,
    });
    return { ok: true };
  }

  // ── Audio ────────────────────────────────────────────────────────────────────
  async getAudioInputs() {
    const AUDIO_KINDS = new Set([
      'wasapi_input_capture', 'wasapi_output_capture',
      'coreaudio_input_capture', 'coreaudio_output_capture',
      'pulse_input_capture', 'pulse_output_capture',
    ]);
    const data = await this.obs.call('GetInputList');
    const audioInputs = data.inputs.filter(i => AUDIO_KINDS.has(i.inputKind));
    const results = await Promise.all(audioInputs.map(async (input) => {
      const [vol, muted] = await Promise.all([
        this.obs.call('GetInputVolume',  { inputName: input.inputName }),
        this.obs.call('GetInputMuted',   { inputName: input.inputName }),
      ]);
      return {
        name:      input.inputName,
        kind:      input.inputKind,
        volumeMul: vol.inputVolumeMul,
        muted:     muted.inputMuted,
      };
    }));
    return { ok: true, inputs: results };
  }

  async setInputVolume(inputName, volumeMul) {
    await this.obs.call('SetInputVolume', { inputName, inputVolumeMul: Math.max(0, Math.min(1, volumeMul)) });
    return { ok: true };
  }

  async setInputMuted(inputName, muted) {
    await this.obs.call('SetInputMuted', { inputName, inputMuted: muted });
    return { ok: true };
  }

  // ── Recording ───────────────────────────────────────────────────────────────
  async getRecordDirectory() {
    const data = await this.obs.call('GetRecordDirectory');
    return { ok: true, directory: data.recordDirectory };
  }

  async setRecordDirectory(directory) {
    await this.obs.call('SetRecordDirectory', { recordDirectory: directory });
    return { ok: true };
  }

  async startRecord() {
    await this.obs.call('StartRecord');
    return { ok: true };
  }

  async stopRecord() {
    const data = await this.obs.call('StopRecord');
    return { ok: true, outputPath: data.outputPath };
  }

  async getRecordStatus() {
    const data = await this.obs.call('GetRecordStatus');
    return { ok: true, recording: data.outputActive, paused: data.outputPaused, timecode: data.outputTimecode };
  }

  // ── Source properties ────────────────────────────────────────────────────────
  async getInputSettings(inputName) {
    const data = await this.obs.call('GetInputSettings', { inputName });
    return { ok: true, settings: data.inputSettings, kind: data.inputKind };
  }

  async setInputSettings(inputName, settings) {
    await this.obs.call('SetInputSettings', { inputName, inputSettings: settings });
    return { ok: true };
  }

  async getInputPropertyItems(inputName, propertyName) {
    const data = await this.obs.call('GetInputPropertiesListPropertyItems', { inputName, propertyName });
    return { ok: true, items: data.propertyItems };
  }

  // ── Video settings ────────────────────────────────────────────────────────────
  async getVideoSettings() {
    const data = await this.obs.call('GetVideoSettings');
    return { ok: true, ...data };
  }

  async setVideoSettings(settings) {
    await this.obs.call('SetVideoSettings', settings);
    return { ok: true };
  }

  // ── Streaming ────────────────────────────────────────────────────────────────
  async setStreamDestination(server, key) {
    await this.obs.call('SetStreamServiceSettings', {
      streamServiceType: 'rtmp_custom',
      streamServiceSettings: { server, key },
    });
    return { ok: true };
  }

  async startStream() {
    await this.obs.call('StartStream');
    return { ok: true };
  }

  async stopStream() {
    await this.obs.call('StopStream');
    return { ok: true };
  }

  async getStreamStatus() {
    const data = await this.obs.call('GetStreamStatus');
    return { ok: true, streaming: data.outputActive, timecode: data.outputTimecode, bytes: data.outputBytes };
  }

  async getScenes() {
    const data = await this.obs.call('GetSceneList');
    return {
      ok: true,
      scenes: data.scenes.map(s => s.sceneName).reverse(),
      current: data.currentProgramSceneName,
    };
  }

  async setCurrentScene(name) {
    await this.obs.call('SetCurrentProgramScene', { sceneName: name });
    return { ok: true };
  }

  async startVirtualCam() {
    await this.obs.call('StartVirtualCam');
    return { ok: true };
  }

  async stopVirtualCam() {
    await this.obs.call('StopVirtualCam');
    return { ok: true };
  }

  async getVirtualCamStatus() {
    const data = await this.obs.call('GetVirtualCamStatus');
    return { ok: true, active: data.outputActive };
  }

  async getSceneItemTransform(sceneName, sceneItemId) {
    const data = await this.obs.call('GetSceneItemTransform', { sceneName, sceneItemId });
    return { ok: true, transform: data.sceneItemTransform };
  }

  async setSceneItemTransform(sceneName, sceneItemId, transform) {
    console.log('[OBS] SetSceneItemTransform', sceneName, sceneItemId, JSON.stringify(transform));
    await this.obs.call('SetSceneItemTransform', { sceneName, sceneItemId, sceneItemTransform: transform });
    return { ok: true };
  }

  async createOverlaydSources(token, baseUrl) {
    const scene = await this.getCurrentScene();
    await this.createOrUpdateBrowserSource(scene, 'Overlayd Alerts',     `${baseUrl}/overlay/${token}`);
    await this.createOrUpdateBrowserSource(scene, 'Overlayd Background', `${baseUrl}/background/${token}`);
    await this.createOrUpdateBrowserSource(scene, 'Overlayd Goals',      `${baseUrl}/goals/${token}`);
    return { ok: true, scene };
  }

  async getScreenshot(sourceName) {
    const data = await this.obs.call('GetSourceScreenshot', {
      sourceName,
      imageFormat: 'jpg',
      imageWidth: 640,      // height omitted — OBS calculates it from the canvas aspect ratio
      imageCompressionQuality: 75,
    });
    return { ok: true, imageData: data.imageData };
  }
}

module.exports = new OBSService();
