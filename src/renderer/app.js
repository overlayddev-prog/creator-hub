/**
 * CreatorHub — Renderer process entry point
 */

// ── State ─────────────────────────────────────────────────────────────────────
let sessionToken  = null;
let userData      = null;
let overlays      = [];
let currentToken  = '';
let selectedPreset = null;
let baseUrl       = 'https://overlayd.gg';
let assetsLib     = [];
let recordingsLib = [];

// ── Patch Notes ───────────────────────────────────────────────────────────────
const PATCH_NOTES = {
  '0.10.8': {
    sections: [
      {
        title: 'Fix',
        items: [
          '<b>Transition hover previews</b> — user-created transitions now animate on hover in the Assets library',
        ],
      },
    ],
  },
  '0.10.7': {
    sections: [
      {
        title: 'Fix',
        items: [
          '<b>Audio preview</b> — audio files now have a play button in the list and detail panel',
          '<b>Detail play button</b> — play button in the detail panel now always shows for audio and video',
        ],
      },
    ],
  },
  '0.10.6': {
    sections: [
      {
        title: 'Fix',
        items: [
          '<b>Sign-in loop</b> — app no longer gets stuck on "Loading your account" after signing in',
        ],
      },
    ],
  },
  '0.10.5': {
    sections: [
      {
        title: 'App',
        items: [
          '<b>Manual update check</b> — new "Check for updates" button in the sidebar footer; shows live download progress and prompts restart when ready',
        ],
      },
    ],
  },
  '0.10.4': {
    sections: [
      {
        title: 'Fix',
        items: [
          '<b>Overlayd Add buttons</b> — Add buttons in the Record / Stream studio now correctly add overlays to the canvas',
        ],
      },
    ],
  },
  '0.10.3': {
    sections: [
      {
        title: 'Assets',
        items: [
          '<b>File-based persistence</b> — assets and recordings are now saved to disk and survive app restarts',
          '<b>Video & audio preview</b> — click the play button on any video or audio asset to open an inline preview modal',
          '<b>Transition hover preview</b> — hover any transition card to see an animated canvas preview of the transition',
        ],
      },
    ],
  },
  '0.10.2': {
    sections: [
      {
        title: 'Assets',
        items: [
          '<b>Recordings tab</b> — recordings now live inside Assets; the standalone Recordings page has been removed',
          '<b>Unified transitions</b> — built-in templates and saved transitions are now in one grid with preview thumbnails',
        ],
      },
    ],
  },
  '0.10.1': {
    sections: [
      {
        title: 'Assets',
        items: [
          '<b>Redesigned Assets module</b> — pill tabs, bigger cards, and a cleaner layout throughout',
          '<b>Play button on cards</b> — preview any clip directly from the asset grid',
          '<b>Detail panel</b> — Info and Notes tabs; add per-clip notes saved locally',
          '<b>Play button in detail panel</b> — preview the selected asset from the side panel',
        ],
      },
    ],
  },
  '0.10.0': {
    sections: [
      {
        title: 'App',
        items: [
          '<b>Home dashboard</b> — new landing page with module cards, live stat counts, and quick navigation',
          '<b>Stream Setup removed</b> — replaced with the Home dashboard as the default page',
          '<b>Sidebar accents</b> — each nav item glows its module color on hover',
        ],
      },
      {
        title: 'Fix',
        items: [
          '<b>Transition flicker</b> — FROM clip now pre-loads before the transition starts, eliminating the black flash',
          '<b>Transition null guard</b> — prevents crash on corrupted or incomplete transition files',
          '<b>Temp file cleanup</b> — thumbnail generation now always cleans up temp directories even on error',
          '<b>Volume clamp</b> — video and audio volumes are now safely clamped to valid range',
        ],
      },
    ],
  },
  '0.9.3': {
    sections: [
      {
        title: 'Transition Editor',
        items: [
          '<b>Frame-by-frame editor</b> — transitions are now built as explicit frames; each frame defines FROM and TO layer states',
          '<b>Smooth toggle</b> — Smooth ON interpolates between frames across the duration; Smooth OFF hard-cuts through each frame sequentially',
          '<b>Frame strip</b> — visual filmstrip of all frames; click to select, drag to reorder',
          '<b>Real-time preview</b> — transitions now preview in the video editor timeline, not just the transition editor',
          '<b>Scroll-wheel inputs</b> — scroll any property input to nudge values; hold Shift for ×10 step',
        ],
      },
    ],
  },
  '0.9.2': {
    sections: [
      {
        title: 'Editor',
        items: [
          '<b>Transition preview in editor</b> — transitions now animate in real-time in the video editor timeline',
        ],
      },
    ],
  },
  '0.9.1': {
    sections: [
      {
        title: 'Fix',
        items: [
          '<b>Transition picker</b> — fixed scope bug that prevented transitions from applying correctly',
        ],
      },
    ],
  },
  '0.9.0': {
    sections: [
      {
        title: 'Editor',
        items: [
          '<b>Transition Editor</b> — create custom transitions between V1 clips; keyframe position, size, opacity, and rotation for both FROM and TO layers',
          '<b>Built-in transitions</b> — Fade, Slide Left, Slide Right, and Zoom In available instantly from Assets → Transitions',
          '<b>Transition picker</b> — assign any saved or built-in transition to a V1 clip via the clip panel',
          '<b>Transition export</b> — transitions render in the final export using FFmpeg xfade and acrossfade filters',
        ],
      },
    ],
  },
  '0.8.0': {
    sections: [
      {
        title: 'Studio',
        items: [
          '<b>Mute per clip</b> — mute any clip with one click; unmute at any time. Works in playback and export',
          '<b>F9 record hotkey</b> — start and stop recording from any window, no need to switch focus',
          '<b>File size indicator</b> — see how large your recording is growing in real time',
        ],
      },
    ],
  },
  '0.7.0': {
    sections: [
      {
        title: 'Editor',
        items: [
          '<b>Timeline snapping</b> — clips snap to each other, the playhead, and timeline start while dragging',
          '<b>Export progress bar</b> — real-time % progress shown during export',
          '<b>Canvas size</b> — set project resolution per project (YouTube, Shorts, Instagram, 1440p, 4K)',
        ],
      },
    ],
  },
  '0.6.0': {
    sections: [
      {
        title: 'Fix',
        items: [
          '<b>Patch notes</b> — fixed popup not showing after login',
        ],
      },
    ],
  },
  '0.5.0': {
    sections: [
      {
        title: 'Fix',
        items: [
          '<b>Patch notes</b> — fixed popup not showing after auto-update',
        ],
      },
    ],
  },
  '0.4.0': {
    sections: [
      {
        title: 'App',
        items: [
          '<b>Auto-updater verified</b> — updates now download and apply automatically in the background',
        ],
      },
    ],
  },
  '0.3.0': {
    sections: [
      {
        title: 'App',
        items: [
          '<b>Auto-updater test</b> — verifying updates apply correctly in the background',
        ],
      },
    ],
  },
  '0.2.0': {
    sections: [
      {
        title: 'New',
        items: [
          '<b>Patch notes popup</b> — you\'ll now see what changed every time the app updates',
        ],
      },
    ],
  },
  '0.1.0': {
    sections: [
      {
        title: 'Editor',
        items: [
          '<b>Clip split</b> — press S or the ✂ button to split clips at the playhead',
          '<b>V1 gaps</b> — drag V1 clips apart to create blank space; clips snap back together',
          '<b>V1 on top</b> — V1 track now renders above all overlay layers',
          '<b>Blank screen in gaps</b> — no more frozen last frame when nothing is playing',
          '<b>V1 resizing</b> — resize V1 clips on the canvas just like overlay layers',
          '<b>Timeline padding</b> — 25% empty space at the right edge when zoomed out',
        ],
      },
      {
        title: 'App',
        items: [
          '<b>Desktop installer</b> — CreatorHub now ships as a proper Windows installer',
          '<b>Auto-updater</b> — the app will automatically download and apply updates',
        ],
      },
    ],
  },
};

function showPatchNotes(version) {
  const notes = PATCH_NOTES[version];
  if (!notes) return;
  $('pn-version').textContent = 'v' + version;
  $('pn-body').innerHTML = notes.sections.map(s => `
    <div class="pn-section">
      <div class="pn-section-title">${s.title}</div>
      <ul>${s.items.map(i => `<li>${i}</li>`).join('')}</ul>
    </div>
  `).join('');
  $('patchnotes-modal').style.display = 'flex';
}

function checkPatchNotes(version) {
  const seen = localStorage.getItem('creatorhub_seen_version');
  if (seen !== version) {
    setTimeout(() => showPatchNotes(version), 800);
    localStorage.setItem('creatorhub_seen_version', version);
  }
}

// ── DOM helpers ───────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function showToast(msg, duration = 2200) {
  const t = $('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.display = 'none'; }, duration);
}

function formatTimer(startMs) {
  const s  = Math.floor((Date.now() - startMs) / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}


// ── CORS-free fetch via main process ──────────────────────────────────────────
async function apiFetch(url, options = {}) {
  return window.creatorhub.api.fetch(url, {
    method:  options.method,
    headers: options.headers,
    body:    options.body,
  });
}

function authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (sessionToken) h['Authorization'] = 'Bearer ' + sessionToken;
  return h;
}

// ── Studio overlay panel ──────────────────────────────────────────────────────
function renderStudioOverlays(onAdd) {
  const list = $('studio-overlay-list');
  if (!list) return;
  if (!overlays.length) {
    list.innerHTML = '<div class="studio-audio-empty">No overlays — create one at overlayd.gg</div>';
    return;
  }
  list.innerHTML = '';
  overlays.forEach(o => {
    const item = document.createElement('div');
    item.className = 'studio-ov-item';
    item.innerHTML = `
      <div class="studio-ov-hdr">
        <span class="studio-ov-arrow">▶</span>
        <span class="studio-ov-name">${o.name}</span>
      </div>
      <div class="studio-ov-sources" style="display:none;">
        <div class="studio-ov-src-row" data-url="${baseUrl}/overlay/${o.token}" data-label="${o.name} — Alerts">
          <span class="studio-ov-src-icon">🔔</span><span class="studio-ov-src-name">Alerts / Overlay</span>
          <button class="studio-overlay-addbtn"${!onAdd ? ' disabled title="Open Record / Stream first"' : ''}>Add</button>
        </div>
        <div class="studio-ov-src-row" data-url="${baseUrl}/background/${o.token}" data-label="${o.name} — Background">
          <span class="studio-ov-src-icon">🖼️</span><span class="studio-ov-src-name">Background</span>
          <button class="studio-overlay-addbtn"${!onAdd ? ' disabled title="Open Record / Stream first"' : ''}>Add</button>
        </div>
        <div class="studio-ov-src-row" data-url="${baseUrl}/goals/${o.token}" data-label="${o.name} — Goals">
          <span class="studio-ov-src-icon">🎯</span><span class="studio-ov-src-name">Goals</span>
          <button class="studio-overlay-addbtn"${!onAdd ? ' disabled title="Open Record / Stream first"' : ''}>Add</button>
        </div>
      </div>`;
    const hdr     = item.querySelector('.studio-ov-hdr');
    const sources = item.querySelector('.studio-ov-sources');
    const arrow   = item.querySelector('.studio-ov-arrow');
    hdr.addEventListener('click', () => {
      const open = sources.style.display !== 'none';
      sources.style.display = open ? 'none' : 'block';
      arrow.textContent = open ? '▶' : '▼';
    });
    if (onAdd) {
      item.querySelectorAll('.studio-ov-src-row').forEach(row => {
        row.querySelector('.studio-overlay-addbtn').addEventListener('click', async (e) => {
          e.stopPropagation();
          const btn = e.currentTarget;
          btn.disabled = true;
          btn.textContent = '…';
          try {
            await onAdd(row.dataset.url, row.dataset.label);
            btn.textContent = '✓';
            setTimeout(() => { btn.textContent = 'Add'; btn.disabled = false; }, 1500);
          } catch (err) {
            console.error('browser source failed', err);
            btn.textContent = 'Add';
            btn.disabled = false;
          }
        });
      });
    }
    list.appendChild(item);
  });
}

// ── Load user data ────────────────────────────────────────────────────────────
async function loadUserData() {
  if (!sessionToken) return false;
  try {
    const r = await apiFetch(baseUrl + '/api/me', { headers: authHeaders() });
    if (!r.ok) return false;
    userData = r.data.user;
    overlays = r.data.overlays || [];
    return true;
  } catch (e) { return false; }
}

// ── Show main app ─────────────────────────────────────────────────────────────
async function showMainApp() {
  // Load persisted assets + recordings from disk
  const saved = await window.creatorhub.app.loadUserData().catch(() => ({}));
  if (saved.assets)     assetsLib     = saved.assets;
  if (saved.recordings) recordingsLib = saved.recordings;
  // Migrate from localStorage if file is empty
  if (!assetsLib.length) {
    const ls = localStorage.getItem('ch_assets');
    if (ls) { try { assetsLib = JSON.parse(ls); saveUserData(); localStorage.removeItem('ch_assets'); } catch {} }
  }
  if (!recordingsLib.length) {
    const ls = localStorage.getItem('ch_recordings');
    if (ls) { try { recordingsLib = JSON.parse(ls); saveUserData(); localStorage.removeItem('ch_recordings'); } catch {} }
  }

  $('auth-screen').style.display = 'none';
  $('main-app').style.display = 'flex';

  $('sidebar-username').textContent = userData.username || userData.email || 'User';
  const planBadge = $('sidebar-plan');
  planBadge.className = 'plan-badge ' + (userData.plan || 'free');
  planBadge.textContent = userData.plan || 'free';

  currentToken = overlays.length ? overlays[0].token : '';
  renderStudioOverlays();

  window.creatorhub.app.getAutoLaunch().then(enabled => {
    $('autolaunch-checkbox').checked = !!enabled;
  });

  if (!localStorage.getItem('creatorhub_onboarded')) {
    setTimeout(() => showOnboarding(), 600);
  }
  window.creatorhub.app.getVersion().then(v => setTimeout(() => checkPatchNotes(v), 2500));
  if (_switchModule) _switchModule('home');
}

// ── Source URLs ───────────────────────────────────────────────────────────────
function getSourceUrl(type) { return `${baseUrl}/${type}/${currentToken}`; }

function updateSourceUrls() {
  if (!currentToken) return;
  $('url-overlay').textContent    = getSourceUrl('overlay');
  $('url-background').textContent = getSourceUrl('background');
  $('url-goals').textContent      = getSourceUrl('goals');
}

// ── Presets ───────────────────────────────────────────────────────────────────
const PRESETS = [
  { name: 'Clean',   icon: '✨', desc: 'Simple and elegant' },
  { name: 'Bold',    icon: '🔥', desc: 'Big and loud' },
  { name: 'Minimal', icon: '◻️', desc: 'Understated and sleek' },
  { name: 'Neon',    icon: '💜', desc: 'Glowing and vibrant' },
  { name: 'Banner',  icon: '🏴', desc: 'Top-of-screen bar' },
  { name: 'Corner',  icon: '📌', desc: 'Bottom-right popup' },
];

function renderPresets() {
  $('preset-grid').innerHTML = PRESETS.map(p => `
    <div class="preset-item" data-name="${p.name}">
      <span class="preset-icon">${p.icon}</span>
      <div class="preset-info">
        <span class="preset-name">${p.name}</span>
        <span class="preset-desc">${p.desc}</span>
      </div>
      <span class="preset-check">✓</span>
    </div>
  `).join('');

  document.querySelectorAll('.preset-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.preset-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      selectedPreset = item.dataset.name;
      $('btn-apply-preset').disabled = false;
      $('btn-apply-preset').textContent = `Apply "${selectedPreset}" →`;
    });
  });
}

// ── Hype polling ──────────────────────────────────────────────────────────────
let hypeTimer = null;
async function pollHype() {
  clearTimeout(hypeTimer);
  if (!currentToken) return;
  try {
    const r = await apiFetch(`${baseUrl}/api/plugin/${currentToken}/hype`);
    const pct = Math.round(((r.data && r.data.hype) || 0) * 100);
    $('hype-slider').value = pct;
    $('hype-val').textContent = pct + '%';
  } catch (e) { /* silent */ }
  if (currentToken) hypeTimer = setTimeout(pollHype, 4000);
}

// Exposed so outer-scope functions (showMainApp) can call it after DOMContentLoaded wires it up
let _switchModule = null;

// ── Dashboard countUp helper ──────────────────────────────────────────────────
function dashCountUp(el, target) {
  const duration = 900;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(ease * target);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Onboarding ────────────────────────────────────────────────────────────────
function showOnboarding() { $('onboarding').style.display = 'flex'; }
function closeOnboarding() {
  localStorage.setItem('creatorhub_onboarded', '1');
  $('onboarding').style.display = 'none';
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function boot() {
  $('auth-status').textContent = 'Starting…';
  $('sign-in-btn').style.display = 'none';
  try {
    const config = await window.creatorhub.app.getConfig();
    baseUrl = config.baseUrl || 'https://overlayd.gg';

    window.creatorhub.auth.onToken(async (token) => {
      sessionToken = token;
      $('auth-status').textContent = 'Loading your account…';
      const ok = await loadUserData();
      if (ok) { showMainApp(); }
      else { $('auth-status').textContent = 'Could not load data — try again'; }
    });

    $('auth-status').textContent = 'Signing you in…';
    const savedToken = await window.creatorhub.auth.silent();
    if (savedToken) {
      sessionToken = savedToken;
      const ok = await loadUserData();
      if (ok) { showMainApp(); return; }
    }
    $('auth-status').textContent = '';
    $('sign-in-btn').style.display = '';
  } catch (e) {
    $('auth-status').textContent = 'Error: ' + e.message;
    $('sign-in-btn').style.display = '';
  }
}

// ── Wire up all events ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  window.creatorhub?.ipc?.on('updater:log', (_e, msg) => console.log(msg));


  // Patch notes
  const closePn = () => { $('patchnotes-modal').style.display = 'none'; };
  $('pn-close').addEventListener('click', closePn);
  $('pn-ok').addEventListener('click', closePn);
  $('pn-backdrop').addEventListener('click', closePn);

  // Auth
  $('sign-in-btn').addEventListener('click', () => {
    $('auth-status').textContent = 'Opening sign-in…';
    window.creatorhub.auth.signIn();
  });

  $('win-minimize').addEventListener('click', () => window.creatorhub.win.minimize());
  $('win-maximize').addEventListener('click', () => window.creatorhub.win.maximize());
  $('win-close').addEventListener('click',    () => window.creatorhub.win.close());

  $('sign-out-btn').addEventListener('click', () => {
    sessionToken = null; userData = null; overlays = [];
    currentToken = ''; selectedPreset = null;
    clearTimeout(hypeTimer); hypeTimer = null;
    $('main-app').style.display = 'none';
    $('auth-screen').style.display = 'flex';
    $('auth-status').textContent = '';
  });

  // Auto-launch
  $('autolaunch-checkbox').addEventListener('change', function () {
    window.creatorhub.app.setAutoLaunch(this.checked);
    showToast(this.checked ? 'Will launch on startup' : 'Startup launch disabled');
  });

  // ── Check for updates button ──────────────────────────────────────────────
  const updateBtn   = $('update-check-btn');
  const updateLabel = $('update-check-label');

  updateBtn.addEventListener('click', async () => {
    updateBtn.classList.add('spinning');
    updateBtn.disabled = true;
    updateLabel.textContent = 'Checking…';

    const res = await window.creatorhub.app.checkForUpdates();
    updateBtn.classList.remove('spinning');
    updateBtn.disabled = false;

    if (!res.ok) {
      updateLabel.textContent = 'Check failed';
      setTimeout(() => { updateLabel.textContent = 'Check for updates'; }, 3000);
      return;
    }
    if (res.hasUpdate) {
      updateBtn.classList.add('has-update');
      updateLabel.textContent = `v${res.latest} available — Download`;
      updateBtn.onclick = () => window.creatorhub.app.openExternal(res.url);
    } else {
      updateBtn.classList.add('success');
      updateLabel.textContent = 'Up to date ✓';
      setTimeout(() => {
        updateBtn.classList.remove('success');
        updateLabel.textContent = 'Check for updates';
        updateBtn.onclick = null;
      }, 3000);
    }
  });

  // ── Module routing ────────────────────────────────────────────────────────
  const modules = {
    home:               $('module-home'),
    recstream:          $('module-recstream'),
    editor:             $('module-editor'),
    assets:             $('module-assets'),
    videoeditor:        $('module-videoeditor'),
    'transition-editor': $('module-transition-editor'),
  };

  function switchModule(name) {
    document.querySelectorAll('.nav-item[data-module]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.module === name);
    });
    const leaving = Object.keys(modules).find(k => modules[k] && modules[k].style.display !== 'none');
    Object.entries(modules).forEach(([key, el]) => {
      if (!el) return;
      el.style.display = key === name ? 'flex' : 'none';
    });
    if (name === 'home') {
      initDashboard();
    }
    if (name === 'editor') {
      const webview = $('editor-webview');
      const target = currentToken ? `${baseUrl}/editor/${currentToken}` : `${baseUrl}/dashboard`;
      if (webview.src !== target) webview.src = target;
    }
    if (name === 'recstream') {
      setTimeout(() => initStudio(), 100);
    }
    if (name === 'assets') renderAssets();
    if (name === 'videoeditor' && !switchModule._veInited) {
      switchModule._veInited = true;
      initVideoEditor();
    }
  }

  _switchModule = switchModule;

  document.querySelectorAll('.nav-item[data-module]').forEach(btn => {
    btn.addEventListener('click', () => switchModule(btn.dataset.module));
  });

  // ── Home Dashboard ──────────────────────────────────────────────────────────
  let _dashInited = false;

  async function initDashboard() {
    // Greeting
    $('dash-greeting').textContent = 'Welcome back, ' + (userData?.username || userData?.email || 'there');

    // Count stats
    const recCount = recordingsLib.length;
    const assetsCount = assetsLib.length;

    let projectCount = 0;
    try {
      const projects = await window.creatorhub.project.list().catch(() => []);
      projectCount = (projects || []).length;
    } catch (e) { projectCount = 0; }

    let transitionCount = 0;
    try {
      const transList = await window.creatorhub.transitions.list().catch(() => []);
      transitionCount = (transList || []).length;
    } catch (e) { transitionCount = 0; }

    dashCountUp($('dash-stat-recordings'),  recCount);
    dashCountUp($('dash-stat-projects'),    projectCount);
    dashCountUp($('dash-stat-transitions'), transitionCount);
    dashCountUp($('dash-stat-assets'),      assetsCount);

    // Wire up card clicks (only once)
    if (!_dashInited) {
      _dashInited = true;
      document.querySelectorAll('.dash-module-card[data-nav]').forEach(card => {
        card.addEventListener('click', () => {
          const nav = card.dataset.nav;
          if (nav === 'assets-recordings') {
            switchModule('assets');
            setTimeout(() => { const t = document.querySelector('[data-assets-tab="recordings"]'); if (t) t.click(); }, 50);
          } else {
            switchModule(nav);
          }
        });
      });
    }

    // Shimmer entrance on cards
    document.querySelectorAll('.dash-module-card:not(.dash-card-disabled)').forEach((card, i) => {
      setTimeout(() => {
        card.classList.add('dash-shimmer-go');
        setTimeout(() => card.classList.remove('dash-shimmer-go'), 700);
      }, i * 80);
    });
  }

  // ── Assets Module ──────────────────────────────────────────────────────────
  let assetsTab    = 'images';
  let assetsView   = 'grid';
  let assetsSelected = null;

  function saveUserData() {
    window.creatorhub.app.saveUserData({ assets: assetsLib, recordings: recordingsLib });
  }

  async function addRecording(outputPath) {
    // Skip if already tracked
    if (recordingsLib.find(r => r.path === outputPath)) return;
    const name = outputPath.split(/[\\/]/).pop();
    const ext  = name.split('.').pop().toLowerCase();
    const meta = await window.creatorhub.app.getAssetMeta(outputPath, 'videos').catch(() => ({ size: 0 }));
    recordingsLib.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name, ext, path: outputPath,
      size: meta.size || 0,
      thumb: meta.thumb || null,
      duration: meta.duration || null,
      addedAt: Date.now(),
    });
    saveUserData();
    // Update count badge if assets panel is open on recordings tab
    const badge = document.getElementById('assets-count-recordings');
    if (badge) badge.textContent = recordingsLib.length;
  }

  async function scanRecordingsDir(dir) {
    const files = await window.creatorhub.app.scanRecordings(dir).catch(() => []);
    let added = 0;
    for (const f of files) {
      if (recordingsLib.find(r => r.path === f.path)) continue;
      const ext  = f.name.split('.').pop().toLowerCase();
      const meta = await window.creatorhub.app.getAssetMeta(f.path, 'videos').catch(() => ({ size: f.size }));
      recordingsLib.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: f.name, ext, path: f.path,
        size: meta.size || f.size,
        thumb: meta.thumb || null,
        duration: meta.duration || null,
        addedAt: f.mtime,
      });
      added++;
    }
    if (added > 0) { recordingsLib.sort((a,b) => b.addedAt - a.addedAt); saveUserData(); }
  }

  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function assetUrl(filePath) {
    // Convert absolute path to asset:// URL served by Electron's custom protocol
    return 'asset:///' + filePath.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1');
  }

  function showAssetPreview(asset) {
    const modal   = $('asset-preview-modal');
    const title   = $('asset-preview-title');
    const content = $('asset-preview-content');
    const close   = $('asset-preview-close');

    title.textContent = asset.name;
    modal.style.display = 'flex';

    const url = assetUrl(asset.path);

    if (asset.category === 'videos') {
      content.innerHTML = `<video controls autoplay style="width:100%;display:block;max-height:450px;background:#000;" src="${url}"></video>`;
    } else if (asset.category === 'audio') {
      content.innerHTML = `
        <div style="padding:24px 20px; display:flex; flex-direction:column; align-items:center; gap:16px;">
          <div style="font-size:48px;">🎵</div>
          <div style="font-size:13px; color:rgba(232,237,245,0.7);">${asset.name}</div>
          <audio controls autoplay style="width:100%;" src="${url}"></audio>
        </div>`;
    }

    const closeModal = () => {
      modal.style.display = 'none';
      content.innerHTML = ''; // stop playback by removing element
    };

    close.onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
  }

  function assetTypeFromExt(ext) {
    if (/png|jpg|jpeg|gif|webp|svg|bmp/.test(ext)) return 'images';
    if (/mp4|mov|mkv|webm|avi/.test(ext)) return 'videos';
    if (/mp3|wav|ogg|flac|aac|m4a/.test(ext)) return 'audio';
    return 'images';
  }

  // ── Transitions Assets Tab ────────────────────────────────────────────────
  const TE_TEMPLATES = [
    {
      id: 'fade', name: 'Fade', duration: 1.0, smooth: true,
      frames: [
        { id:'f1', from:{x:0,y:0,w:100,h:100,opacity:100,rotation:0}, to:{x:0,y:0,w:100,h:100,opacity:0,  rotation:0} },
        { id:'f2', from:{x:0,y:0,w:100,h:100,opacity:0,  rotation:0}, to:{x:0,y:0,w:100,h:100,opacity:100,rotation:0} },
      ],
    },
    {
      id: 'slide-left', name: 'Slide Left', duration: 0.7, smooth: true,
      frames: [
        { id:'f1', from:{x:0,  y:0,w:100,h:100,opacity:100,rotation:0}, to:{x:100, y:0,w:100,h:100,opacity:100,rotation:0} },
        { id:'f2', from:{x:-100,y:0,w:100,h:100,opacity:100,rotation:0}, to:{x:0,   y:0,w:100,h:100,opacity:100,rotation:0} },
      ],
    },
    {
      id: 'slide-right', name: 'Slide Right', duration: 0.7, smooth: true,
      frames: [
        { id:'f1', from:{x:0,  y:0,w:100,h:100,opacity:100,rotation:0}, to:{x:-100,y:0,w:100,h:100,opacity:100,rotation:0} },
        { id:'f2', from:{x:100,y:0,w:100,h:100,opacity:100,rotation:0}, to:{x:0,   y:0,w:100,h:100,opacity:100,rotation:0} },
      ],
    },
    {
      id: 'zoom-in', name: 'Zoom In', duration: 0.8, smooth: true,
      frames: [
        { id:'f1', from:{x:0, y:0, w:100,h:100,opacity:100,rotation:0}, to:{x:10,y:10,w:80, h:80, opacity:0,  rotation:0} },
        { id:'f2', from:{x:-5,y:-5,w:110,h:110,opacity:0,  rotation:0}, to:{x:0, y:0, w:100,h:100,opacity:100,rotation:0} },
      ],
    },
  ];

  async function loadTransitionsList() {
    return renderAllTransitions();
  }

  function renderTransitionTemplates() {
    return renderAllTransitions();
  }

  function teTransitionPreviewCSS(tpl) {
    const name = (tpl.name || '').toLowerCase();
    let style = '';
    if (name.includes('fade')) {
      style = 'background: linear-gradient(to right, rgba(59,130,246,0.6) 0%, rgba(239,68,68,0.6) 100%);';
    } else if (name.includes('slide') && name.includes('left')) {
      style = 'background: linear-gradient(to right, rgba(239,68,68,0.6) 0%, rgba(59,130,246,0.6) 100%);';
    } else if (name.includes('slide') && name.includes('right')) {
      style = 'background: linear-gradient(to right, rgba(59,130,246,0.6) 0%, rgba(239,68,68,0.6) 100%);';
    } else if (name.includes('zoom')) {
      style = 'background: radial-gradient(circle, rgba(139,92,246,0.7) 0%, rgba(59,130,246,0.5) 60%, rgba(239,68,68,0.4) 100%);';
    } else {
      style = 'background: linear-gradient(135deg, rgba(59,130,246,0.6) 50%, rgba(239,68,68,0.6) 50%);';
    }
    return `<div style="width:100%;height:100%;${style}"></div>`;
  }

  async function renderAllTransitions() {
    const grid = $('te-unified-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Templates first
    TE_TEMPLATES.forEach(tpl => {
      const card = document.createElement('div');
      card.className = 'asset-card';
      card.innerHTML = `
        <div class="asset-thumb" style="position:relative;">
          ${teTransitionPreviewCSS(tpl)}
          <span class="asset-type-badge" style="background:rgba(139,92,246,0.7);color:#fff;">Built-in</span>
        </div>
        <div class="asset-info">
          <div class="asset-name">${tpl.name}</div>
          <div class="asset-meta">${tpl.duration}s · Smooth</div>
        </div>`;
      // Canvas hover preview
      const thumb = card.querySelector('.asset-thumb');
      const previewDiv = document.createElement('div');
      previewDiv.className = 'te-hover-preview';
      const cvs = document.createElement('canvas');
      cvs.width = 160; cvs.height = 90;
      previewDiv.appendChild(cvs);
      thumb.appendChild(previewDiv);
      let rafId = null, startTime = null;
      const transData = tpl;
      const dur = transData.duration || 1;
      card.addEventListener('mouseenter', () => {
        startTime = performance.now();
        function animate(now) {
          const t = ((now - startTime) / 1000) % dur;
          teDrawPreviewOnCanvas(cvs, transData, t);
          rafId = requestAnimationFrame(animate);
        }
        rafId = requestAnimationFrame(animate);
      });
      card.addEventListener('mouseleave', () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      });
      card.addEventListener('click', () => {
        const data = JSON.parse(JSON.stringify(tpl));
        delete data.id;
        openTransitionEditor(null, data);
      });
      grid.appendChild(card);
    });

    // Saved transitions
    const list = await window.creatorhub.transitions.list().catch(() => []);
    const total = TE_TEMPLATES.length + list.length;
    const countEl = $('assets-count-transitions');
    if (countEl) countEl.textContent = total;

    const emptyEl = $('te-saved-empty');
    if (emptyEl) emptyEl.style.display = list.length === 0 && TE_TEMPLATES.length === 0 ? '' : 'none';

    list.forEach(t => {
      const card = document.createElement('div');
      card.className = 'asset-card';
      card.innerHTML = `
        <div class="asset-thumb" style="position:relative;">
          ${teTransitionPreviewCSS(t)}
          <span class="asset-type-badge">${t.data && t.data.smooth !== false ? 'Smooth' : 'Hard cut'}</span>
        </div>
        <div class="asset-info">
          <div class="asset-name">${t.name}</div>
          <div class="asset-meta">${(t.duration||1).toFixed(1)}s · ${t.data && t.data.frames ? t.data.frames.length + ' frames' : ''}</div>
        </div>`;
      // Canvas hover preview
      const thumb = card.querySelector('.asset-thumb');
      const previewDiv = document.createElement('div');
      previewDiv.className = 'te-hover-preview';
      const cvs = document.createElement('canvas');
      cvs.width = 160; cvs.height = 90;
      previewDiv.appendChild(cvs);
      thumb.appendChild(previewDiv);
      let rafId = null, startTime = null;
      const transData = t.data || t;
      const dur = (transData.duration || t.duration || 1);
      card.addEventListener('mouseenter', () => {
        startTime = performance.now();
        function animate(now) {
          const t2 = ((now - startTime) / 1000) % dur;
          teDrawPreviewOnCanvas(cvs, transData, t2);
          rafId = requestAnimationFrame(animate);
        }
        rafId = requestAnimationFrame(animate);
      });
      card.addEventListener('mouseleave', () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      });
      card.addEventListener('click', async () => {
        const res = await window.creatorhub.transitions.load(t.filePath);
        if (res.ok) openTransitionEditor(t.filePath, res.data);
        else showToast('Failed to load transition');
      });
      grid.appendChild(card);
    });
  }

  let _recScanDone = false;

  function renderAssetsRecordings() {
    // Trigger a scan the first time the tab is opened
    if (!_recScanDone) {
      _recScanDone = true;
      scanRecordingsDir(studioRecDir).then(() => _renderAssetsRecordingsList());
    } else {
      _renderAssetsRecordingsList();
    }
  }

  function _renderAssetsRecordingsList() {
    const list = $('assets-recordings-list');
    if (!list) return;
    list.innerHTML = '';

    // Update badge
    const badge = $('assets-count-recordings');
    if (badge) badge.textContent = recordingsLib.length;

    const items = recordingsLib.slice().sort((a, b) => b.addedAt - a.addedAt);

    if (items.length === 0) {
      list.innerHTML = `<div class="assets-empty">
        <div class="assets-empty-icon">⏺</div>
        <div class="assets-empty-text">No recordings yet — hit Record to start</div>
      </div>`;
      _renderAssetsRecordingDetail(null);
      return;
    }

    items.forEach(rec => {
      const sel = recSelected === rec.id;
      const row = document.createElement('div');
      row.className = 'audio-row' + (sel ? ' selected' : '');
      row.innerHTML = `
        ${rec.thumb
          ? `<img src="${rec.thumb}" style="width:80px;height:45px;object-fit:cover;border-radius:5px;flex-shrink:0;" alt="">`
          : `<div class="audio-icon">🎬</div>`}
        <div class="audio-info">
          <div class="audio-name">${rec.name}</div>
          <div class="audio-meta">${formatBytes(rec.size)}${rec.duration ? ' · ' + rec.duration : ''} · ${new Date(rec.addedAt).toLocaleDateString()}</div>
        </div>
        <button class="audio-add-btn">Add to Canvas</button>`;
      row.addEventListener('click', () => {
        recSelected = recSelected === rec.id ? null : rec.id;
        _renderAssetsRecordingsList();
      });
      row.querySelector('.audio-add-btn').addEventListener('click', e => {
        e.stopPropagation();
        addAssetToCanvas({ ...rec, category: 'videos' });
      });
      list.appendChild(row);
    });

    _renderAssetsRecordingDetail(recSelected ? recordingsLib.find(r => r.id === recSelected) : null);
  }

  function _renderAssetsRecordingDetail(rec) {
    const panel = $('assets-detail');
    if (!rec) { panel.style.display = 'none'; return; }
    panel.style.display = 'flex';

    const infoSection = $('detail-info-section');
    if (infoSection) {
      infoSection.innerHTML = `
        <div class="detail-thumb">${rec.thumb ? `<img src="${rec.thumb}" alt="" onerror="this.style.display='none'">` : ''}<span>🎬</span></div>
        <div class="detail-name">${rec.name}</div>
        <div class="detail-row"><span class="detail-row-label">Type</span><span class="detail-row-val">${rec.ext.toUpperCase()}</span></div>
        <div class="detail-row"><span class="detail-row-label">Size</span><span class="detail-row-val">${formatBytes(rec.size)}</span></div>
        ${rec.duration ? `<div class="detail-row"><span class="detail-row-label">Duration</span><span class="detail-row-val">${rec.duration}</span></div>` : ''}
        <div class="detail-row"><span class="detail-row-label">Recorded</span><span class="detail-row-val">${new Date(rec.addedAt).toLocaleDateString()}</span></div>
        <div class="detail-actions" style="margin-top:auto;">
          <button class="detail-add-btn" id="rec-asset-add">Add to Canvas</button>
          <button class="studio-btn" id="rec-asset-folder" style="font-size:11px;padding:7px;">📂 Show in Folder</button>
          <button class="detail-remove-btn" id="rec-asset-remove">Delete Recording</button>
        </div>`;
      infoSection.querySelector('#rec-asset-add').addEventListener('click', () => addAssetToCanvas({ ...rec, category: 'videos' }));
      infoSection.querySelector('#rec-asset-folder').addEventListener('click', () => {
        window.creatorhub.app.openFolder(rec.path.replace(/[\\/][^\\/]+$/, ''));
      });
      infoSection.querySelector('#rec-asset-remove').addEventListener('click', () => {
        recordingsLib = recordingsLib.filter(r => r.id !== rec.id);
        recSelected = null;
        saveUserData();
        _renderAssetsRecordingsList();
      });
    }

    // Reset to Info tab
    const dTabInfo  = $('detail-tab-info');
    const dTabNotes = $('detail-tab-notes');
    const dSecInfo  = $('detail-info-section');
    const dSecNotes = $('detail-notes-section');
    if (dTabInfo) {
      dTabInfo.classList.add('active');
      dTabNotes.classList.remove('active');
      dSecInfo.style.display = 'flex';
      dSecNotes.style.display = 'none';
      dTabInfo.onclick  = () => { dTabInfo.classList.add('active'); dTabNotes.classList.remove('active'); dSecInfo.style.display = 'flex'; dSecNotes.style.display = 'none'; };
      dTabNotes.onclick = () => { dTabNotes.classList.add('active'); dTabInfo.classList.remove('active'); dSecNotes.style.display = 'flex'; dSecInfo.style.display = 'none'; };
    }
  }

  function renderAssets() {
    const search = $('assets-search').value.toLowerCase();
    const sort = $('assets-sort').value;
    const isRecordings = assetsTab === 'recordings';
    const isTransitions = assetsTab === 'transitions';

    // Update counts
    const counts = { images: 0, videos: 0, audio: 0 };
    assetsLib.forEach(a => counts[a.category] = (counts[a.category] || 0) + 1);
    ['images','videos','audio'].forEach(k => { $('assets-count-' + k).textContent = counts[k] || 0; });
    const recBadge = $('assets-count-recordings');
    if (recBadge) recBadge.textContent = recordingsLib.length;

    // Show/hide panels
    $('assets-transitions-wrap').style.display = isTransitions ? 'flex' : 'none';
    const recWrap = $('assets-recordings-wrap');
    if (recWrap) recWrap.style.display = isRecordings ? 'flex' : 'none';
    $('assets-grid-wrap').style.display = (isTransitions || isRecordings) ? 'none' : '';
    const filterbarEl = document.querySelector('.assets-filterbar');
    if (filterbarEl) filterbarEl.style.display = (isTransitions || isRecordings) ? 'none' : '';

    if (isTransitions) { renderAllTransitions(); return; }

    if (isRecordings) {
      renderAssetsRecordings();
      return;
    }

    let items = assetsLib.filter(a => a.category === assetsTab && a.name.toLowerCase().includes(search));
    if (sort === 'newest') items = items.sort((a,b) => b.addedAt - a.addedAt);
    else if (sort === 'oldest') items = items.sort((a,b) => a.addedAt - b.addedAt);
    else if (sort === 'name') items = items.sort((a,b) => a.name.localeCompare(b.name));
    else if (sort === 'size') items = items.sort((a,b) => b.size - a.size);

    const grid = $('assets-grid');
    grid.innerHTML = '';
    const useList = assetsTab === 'audio' || assetsView === 'list';
    grid.className = useList ? 'assets-list' : 'assets-grid';

    if (items.length === 0) {
      const emptyIcon = assetsTab === 'audio' ? '🎵' : assetsTab === 'videos' ? '🎬' : '🖼️';
      grid.innerHTML = `<div class="assets-empty">
        <div class="assets-empty-icon">${emptyIcon}</div>
        <div class="assets-empty-text">No ${assetsTab} yet</div>
        <button class="assets-empty-btn" id="assets-empty-import">Import Files</button>
      </div>`;
      grid.querySelector('#assets-empty-import')?.addEventListener('click', doImport);
      renderDetail(null);
      return;
    }

    items.forEach(asset => {
      const sel = assetsSelected === asset.id;
      const isAudio = asset.category === 'audio';
      const isVideo = asset.category === 'videos';

      if (useList) {
        // List row for all types
        const thumbSrc = asset.thumb || (isAudio ? null : assetUrl(asset.path));
        const row = document.createElement('div');
        row.className = 'audio-row' + (sel ? ' selected' : '');
        row.innerHTML = `
          ${thumbSrc && !isAudio
            ? `<img src="${thumbSrc}" style="width:56px;height:32px;object-fit:cover;border-radius:5px;flex-shrink:0;" alt="">`
            : `<div class="audio-icon">${isAudio ? '🎵' : isVideo ? '🎬' : '🖼️'}</div>`}
          <div class="audio-info">
            <div class="audio-name">${asset.name}</div>
            <div class="audio-meta">${formatBytes(asset.size)}${asset.dims ? ' · ' + asset.dims : ''}${asset.duration ? ' · ' + asset.duration : ''}</div>
          </div>
          ${isAudio ? `<button class="audio-play-btn" title="Preview">
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>` : ''}
          <button class="audio-add-btn">${isAudio ? '+ Add' : 'Add to Canvas'}</button>`;
        row.addEventListener('click', () => selectAsset(asset.id));
        row.querySelector('.audio-add-btn').addEventListener('click', e => { e.stopPropagation(); addAssetToCanvas(asset); });
        row.querySelector('.audio-play-btn')?.addEventListener('click', e => { e.stopPropagation(); showAssetPreview(asset); });
        grid.appendChild(row);
      } else {
        // Grid card for images / videos
        const isPng = /png|gif|webp|svg/.test(asset.ext);
        const thumbSrc = asset.thumb || assetUrl(asset.path);
        const card = document.createElement('div');
        card.className = 'asset-card' + (sel ? ' selected' : '');
        card.innerHTML = `
          <div class="asset-thumb${isPng ? ' checker' : ''}">
            <img src="${thumbSrc}" alt="" onerror="this.style.display='none'">
            <div class="asset-type-badge">${asset.ext.toUpperCase()}</div>
            ${isVideo && asset.duration ? `<div class="asset-dur">${asset.duration}</div>` : ''}
            <div class="asset-play-btn">
              <div class="asset-play-circle">
                <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
            </div>
            <div class="asset-thumb-overlay">
              <button class="asset-thumb-btn">Add to Canvas</button>
            </div>
          </div>
          <div class="asset-info">
            <div class="asset-name">${asset.name}</div>
            <div class="asset-meta">${formatBytes(asset.size)}${asset.dims ? ' · ' + asset.dims : ''}</div>
          </div>`;
        card.addEventListener('click', () => selectAsset(asset.id));
        card.querySelector('.asset-play-circle').addEventListener('click', e => { e.stopPropagation(); showAssetPreview(asset); });
        card.querySelector('.asset-thumb-btn').addEventListener('click', e => { e.stopPropagation(); addAssetToCanvas(asset); });
        grid.appendChild(card);
      }
    });

    renderDetail(assetsSelected ? assetsLib.find(a => a.id === assetsSelected) : null);
  }

  function selectAsset(id) {
    assetsSelected = assetsSelected === id ? null : id;
    renderAssets();
  }

  function renderDetail(asset) {
    const panel = $('assets-detail');
    if (!asset) { panel.style.display = 'none'; return; }
    panel.style.display = 'flex';
    const isVideo = asset.category === 'videos';
    const isAudio = asset.category === 'audio';
    const detailThumbSrc = asset.thumb || (!isAudio ? assetUrl(asset.path) : null);

    // Populate the info section (already in HTML from index.html)
    const infoSection = $('detail-info-section');
    if (infoSection) {
      const playBtnHtml = (isVideo || isAudio) ? `
        <div class="detail-play">
          <div class="detail-play-circle">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>` : '';
      infoSection.innerHTML = `
        <div class="detail-thumb" id="detail-thumb-wrap">
          ${detailThumbSrc ? `<img src="${detailThumbSrc}" alt="" onerror="this.style.display='none'">` : ''}
          <span>${isAudio ? '🎵' : isVideo ? '🎬' : '🖼️'}</span>
          ${playBtnHtml}
        </div>
        <div class="detail-name">${asset.name}</div>
        <div class="detail-row"><span class="detail-row-label">Type</span><span class="detail-row-val">${asset.ext.toUpperCase()}</span></div>
        <div class="detail-row"><span class="detail-row-label">Size</span><span class="detail-row-val">${formatBytes(asset.size)}</span></div>
        ${asset.dims ? `<div class="detail-row"><span class="detail-row-label">Dims</span><span class="detail-row-val">${asset.dims}</span></div>` : ''}
        ${asset.duration ? `<div class="detail-row"><span class="detail-row-label">Duration</span><span class="detail-row-val">${asset.duration}</span></div>` : ''}
        <div class="detail-row"><span class="detail-row-label">Added</span><span class="detail-row-val">${new Date(asset.addedAt).toLocaleDateString()}</span></div>
        <div class="detail-actions" style="margin-top:auto;">
          ${!isAudio ? `<button class="detail-add-btn" id="detail-add">Add to Canvas</button>` : `<button class="detail-add-btn" id="detail-add">Add to Scene</button>`}
          <button class="detail-remove-btn" id="detail-remove">Remove from Library</button>
        </div>`;

      infoSection.querySelector('#detail-add')?.addEventListener('click', () => addAssetToCanvas(asset));
      infoSection.querySelector('#detail-remove')?.addEventListener('click', () => {
        assetsLib = assetsLib.filter(a => a.id !== asset.id);
        assetsSelected = null;
        saveUserData();
        renderAssets();
      });

      // Play button in detail thumb
      const detailThumbWrap = infoSection.querySelector('#detail-thumb-wrap');
      if (detailThumbWrap && (isVideo || isAudio)) {
        detailThumbWrap.addEventListener('click', () => {
          showAssetPreview(asset);
        });
      }
    }

    // Reset to Info tab on new selection
    const dTabInfo  = $('detail-tab-info');
    const dTabNotes = $('detail-tab-notes');
    const dSecInfo  = $('detail-info-section');
    const dSecNotes = $('detail-notes-section');
    if (dTabInfo) {
      dTabInfo.classList.add('active');
      dTabNotes.classList.remove('active');
      dSecInfo.style.display = 'flex';
      dSecNotes.style.display = 'none';

      dTabInfo.onclick  = () => {
        dTabInfo.classList.add('active'); dTabNotes.classList.remove('active');
        dSecInfo.style.display = 'flex'; dSecNotes.style.display = 'none';
      };
      dTabNotes.onclick = () => {
        dTabNotes.classList.add('active'); dTabInfo.classList.remove('active');
        dSecNotes.style.display = 'flex'; dSecInfo.style.display = 'none';
        // Load saved note
        const noteKey = 'ch_asset_note_' + asset.path;
        const noteInput = $('asset-notes-input');
        if (noteInput) noteInput.value = localStorage.getItem(noteKey) || '';
      };
    }

    // Wire up notes save
    const noteSaveBtn = $('asset-notes-save');
    if (noteSaveBtn) {
      noteSaveBtn.onclick = () => {
        const noteKey = 'ch_asset_note_' + asset.path;
        const val = $('asset-notes-input')?.value || '';
        localStorage.setItem(noteKey, val);
        showToast('Note saved');
      };
    }
  }

  function addAssetToCanvas(asset) {
    if (asset.category === 'audio') { showToast('Audio sources coming soon'); return; }
    switchModule('recstream');
    setTimeout(async () => {
      try {
        const isImg = asset.category === 'images';
        const src = isImg
          ? await engine.addImageSource(asset.path, asset.name)
          : await engine.addMediaSource(asset.path, asset.name);
        renderLayerList();
        selectSource(src.id);
        showToast(`Added "${asset.name}" to canvas`);
      } catch (e) {
        console.error('addAssetToCanvas error:', e);
        showToast('Failed to add to canvas: ' + e.message);
      }
    }, 150);
  }

  async function doImport() {
    const result = await window.creatorhub.app.openFileDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: ['png','jpg','jpeg','gif','webp','svg'] },
        { name: 'Videos', extensions: ['mp4','mov','mkv','webm','avi'] },
        { name: 'Audio',  extensions: ['mp3','wav','ogg','flac','aac','m4a'] },
        { name: 'All Media', extensions: ['png','jpg','jpeg','gif','webp','svg','mp4','mov','mkv','webm','avi','mp3','wav','ogg','flac','aac','m4a'] },
      ]
    });
    if (!result || !result.filePaths || !result.filePaths.length) return;

    showToast(`Importing ${result.filePaths.length} file${result.filePaths.length > 1 ? 's' : ''}…`);
    let added = 0;
    for (const fp of result.filePaths) {
      const name = fp.split(/[\\/]/).pop();
      const ext = name.split('.').pop().toLowerCase();
      const category = assetTypeFromExt(ext);
      // Skip duplicates by path
      if (assetsLib.find(a => a.path === fp)) continue;
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
      const meta = await window.creatorhub.app.getAssetMeta(fp, category);
      assetsLib.push({
        id, name, ext, category, path: fp,
        size: meta.size || 0,
        dims: meta.dims || null,
        thumb: meta.thumb || null,
        duration: meta.duration || null,
        addedAt: Date.now(),
      });
      added++;
    }
    saveUserData();
    renderAssets();
    if (added > 0) showToast(`Imported ${added} file${added > 1 ? 's' : ''}`);
    else showToast('Files already in library');
  }

  $('assets-import-btn').addEventListener('click', doImport);

  document.querySelectorAll('.assets-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      assetsTab = tab.dataset.assetsTab;
      assetsSelected = null;
      document.querySelectorAll('.assets-tab').forEach(t => t.classList.toggle('active', t === tab));
      renderAssets();
    });
  });

  $('assets-search').addEventListener('input', renderAssets);
  $('assets-sort').addEventListener('change', renderAssets);

  $('assets-view-grid').addEventListener('click', () => {
    assetsView = 'grid';
    $('assets-view-grid').classList.add('active');
    $('assets-view-list').classList.remove('active');
    renderAssets();
  });
  $('assets-view-list').addEventListener('click', () => {
    assetsView = 'list';
    $('assets-view-list').classList.add('active');
    $('assets-view-grid').classList.remove('active');
    renderAssets();
  });

  // ── Transition Editor ─────────────────────────────────────────────────────
  let teData        = null;  // { name, duration, smooth, frames:[{id,from:{},to:{}}] }
  let teFilePath    = null;
  let tePlayPos     = 0;
  let teRafId       = null;
  let teLastTs      = 0;
  let teSelFrameIdx = 0;
  let tePickerClip  = null;

  // Shared state interpolator — called from both editor and syncAllLayers in initVideoEditor
  function teGetTransitionStateAt(data, t) {
    // backward-compat: convert old keyframe format on the fly
    if (data && !data.frames && data.from && data.from.keyframes) {
      const fkfs = (data.from.keyframes || []).slice().sort((a,b)=>a.time-b.time);
      const tkfs = (data.to.keyframes   || []).slice().sort((a,b)=>a.time-b.time);
      const def  = {x:0,y:0,w:100,h:100,opacity:100,rotation:0};
      const n    = Math.max(fkfs.length, tkfs.length, 2);
      data = { ...data, smooth: true, frames: Array.from({length:n},(_,i)=>({ id:'f'+i, from:{...(fkfs[i]||def)}, to:{...(tkfs[i]||def)} })) };
    }
    const frames = (data && data.frames) || [];
    const dur    = (data && data.duration) || 1;
    const smooth = data ? data.smooth !== false : true;
    const def    = {x:0,y:0,w:100,h:100,opacity:100,rotation:0};
    if (!frames.length) return { from:{...def}, to:{...def} };
    if (frames.length === 1) return { from:{...frames[0].from}, to:{...frames[0].to} };
    if (!smooth) {
      const idx = Math.min(frames.length-1, Math.floor(t / (dur / frames.length)));
      return { from:{...frames[idx].from}, to:{...frames[idx].to} };
    }
    const N = frames.length - 1;
    const raw = Math.min(N - 0.00001, Math.max(0, (t / dur) * N));
    const a   = Math.floor(raw), alpha = raw - a;
    const fa  = frames[a], fb = frames[Math.min(N, a+1)];
    function lerp(k) {
      const sa = (fa && fa[k]) ? fa[k] : def;
      const sb = (fb && fb[k]) ? fb[k] : def;
      return {
        x:        sa.x        + (sb.x        - sa.x)        * alpha,
        y:        sa.y        + (sb.y        - sa.y)        * alpha,
        w:        sa.w        + (sb.w        - sa.w)        * alpha,
        h:        sa.h        + (sb.h        - sa.h)        * alpha,
        opacity:  sa.opacity  + (sb.opacity  - sa.opacity)  * alpha,
        rotation: sa.rotation + (sb.rotation - sa.rotation) * alpha,
      };
    }
    return { from: lerp('from'), to: lerp('to') };
  }

  function teDrawPreviewOnCanvas(canvas, data, t) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const state = teGetTransitionStateAt(data, t);
    if (!state) return;
    const { from: f, to: to_ } = state;
    ctx.clearRect(0, 0, W, H);

    // Draw FROM layer (blue-tinted rect)
    ctx.save();
    ctx.globalAlpha = (f.opacity ?? 100) / 100;
    const fx = (f.x / 100) * W, fy = (f.y / 100) * H;
    const fw = (f.w / 100) * W, fh = (f.h / 100) * H;
    ctx.translate(fx + fw/2, fy + fh/2);
    ctx.rotate((f.rotation || 0) * Math.PI / 180);
    ctx.fillStyle = 'rgba(59,130,246,0.75)';
    ctx.fillRect(-fw/2, -fh/2, fw, fh);
    ctx.restore();

    // Draw TO layer (red-tinted rect)
    ctx.save();
    ctx.globalAlpha = (to_.opacity ?? 100) / 100;
    const tx = (to_.x / 100) * W, ty = (to_.y / 100) * H;
    const tw = (to_.w / 100) * W, th = (to_.h / 100) * H;
    ctx.translate(tx + tw/2, ty + th/2);
    ctx.rotate((to_.rotation || 0) * Math.PI / 180);
    ctx.fillStyle = 'rgba(239,68,68,0.75)';
    ctx.fillRect(-tw/2, -th/2, tw, th);
    ctx.restore();
  }

  function teDrawPreview() {
    const cv = $('te-canvas'), wrap = $('te-canvas-wrap');
    if (!cv || !wrap) return;
    const W = wrap.clientWidth || 480, H = wrap.clientHeight || 270;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#111827'; ctx.fillRect(0, 0, W, H);
    for (let gx = 0; gx < W; gx += 40) for (let gy = 0; gy < H; gy += 40)
      if (((gx/40)+(gy/40))%2===0) { ctx.fillStyle='rgba(255,255,255,0.02)'; ctx.fillRect(gx,gy,40,40); }
    if (!teData) return;
    const state = teGetTransitionStateAt(teData, tePlayPos);
    function drawL(s, fill, stroke, lbl) {
      const lx=(s.x/100)*W, ly=(s.y/100)*H, lw=(s.w/100)*W, lh=(s.h/100)*H;
      ctx.save(); ctx.globalAlpha=Math.max(0,Math.min(1,s.opacity/100));
      ctx.translate(lx+lw/2,ly+lh/2); ctx.rotate((s.rotation*Math.PI)/180);
      ctx.fillStyle=fill; ctx.fillRect(-lw/2,-lh/2,lw,lh);
      ctx.strokeStyle=stroke; ctx.lineWidth=2; ctx.strokeRect(-lw/2,-lh/2,lw,lh);
      ctx.fillStyle=stroke; ctx.font='bold 13px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(lbl,0,0); ctx.restore();
    }
    drawL(state.to,   'rgba(239,68,68,0.35)',  '#ef4444','TO');
    drawL(state.from, 'rgba(59,130,246,0.35)', '#3b82f6','FROM');
  }

  function teDrawFrameCard(canvas, frame) {
    canvas.width = 64; canvas.height = 36;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f1520'; ctx.fillRect(0,0,64,36);
    function drawM(s, color) {
      const lx=(s.x/100)*64,ly=(s.y/100)*36,lw=(s.w/100)*64,lh=(s.h/100)*36;
      ctx.save(); ctx.globalAlpha=Math.max(0,Math.min(1,s.opacity/100));
      ctx.translate(lx+lw/2,ly+lh/2); ctx.rotate((s.rotation*Math.PI)/180);
      ctx.fillStyle=color; ctx.fillRect(-lw/2,-lh/2,lw,lh); ctx.restore();
    }
    drawM(frame.to,   'rgba(239,68,68,0.55)');
    drawM(frame.from, 'rgba(59,130,246,0.55)');
  }

  function teDrawFrameStrip() {
    const strip = $('te-frame-strip');
    if (!strip || !teData) return;
    strip.innerHTML = '';
    teData.frames.forEach((frame, idx) => {
      const card = document.createElement('div');
      card.className = 'te-frame-card' + (idx === teSelFrameIdx ? ' selected' : '');
      card.draggable = true;
      const cv = document.createElement('canvas');
      cv.className = 'te-frame-canvas';
      teDrawFrameCard(cv, frame);
      const lbl = document.createElement('div');
      lbl.className = 'te-frame-label'; lbl.textContent = idx + 1;
      card.appendChild(cv); card.appendChild(lbl);
      card.addEventListener('click', () => teSelectFrame(idx));
      card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', String(idx)); card.classList.add('dragging'); });
      card.addEventListener('dragend',   () => card.classList.remove('dragging'));
      card.addEventListener('dragover',  e => e.preventDefault());
      card.addEventListener('drop', e => {
        e.preventDefault();
        const from = parseInt(e.dataTransfer.getData('text/plain'));
        if (from === idx) return;
        const moved = teData.frames.splice(from, 1)[0];
        teData.frames.splice(idx, 0, moved);
        teSelFrameIdx = idx;
        teDrawFrameStrip(); teRefreshPropsPanel();
      });
      strip.appendChild(card);
    });
    $('te-frame-num').textContent   = teSelFrameIdx + 1;
    $('te-frame-total').textContent = teData.frames.length;
    $('te-del-frame').style.display = teData.frames.length > 1 ? '' : 'none';
  }

  function teSelectFrame(idx) {
    if (!teData || !teData.frames.length) return;
    teSelFrameIdx = Math.max(0, Math.min(teData.frames.length - 1, idx));
    teDrawFrameStrip();
    teRefreshPropsPanel();
    const N = teData.frames.length, dur = teData.duration || 1;
    tePlayPos = N > 1 ? (teSelFrameIdx / (N - 1)) * dur : 0;
    teDrawPreview();
    const fill = $('te-loop-fill');
    if (fill) fill.style.width = ((tePlayPos / dur) * 100).toFixed(1) + '%';
  }

  function teRefreshPropsPanel() {
    if (!teData || !teData.frames[teSelFrameIdx]) return;
    const f = teData.frames[teSelFrameIdx];
    $('te-from-opacity').value  = Math.round(f.from.opacity);
    $('te-from-x').value        = Math.round(f.from.x);
    $('te-from-y').value        = Math.round(f.from.y);
    $('te-from-w').value        = Math.round(f.from.w);
    $('te-from-h').value        = Math.round(f.from.h);
    $('te-from-rotation').value = Math.round(f.from.rotation);
    $('te-to-opacity').value    = Math.round(f.to.opacity);
    $('te-to-x').value          = Math.round(f.to.x);
    $('te-to-y').value          = Math.round(f.to.y);
    $('te-to-w').value          = Math.round(f.to.w);
    $('te-to-h').value          = Math.round(f.to.h);
    $('te-to-rotation').value   = Math.round(f.to.rotation);
  }

  function teReadPropsIntoFrame() {
    if (!teData || !teData.frames[teSelFrameIdx]) return;
    const f = teData.frames[teSelFrameIdx];
    f.from = {
      opacity:  parseFloat($('te-from-opacity').value)  || 0,
      x:        parseFloat($('te-from-x').value)        || 0,
      y:        parseFloat($('te-from-y').value)        || 0,
      w:        parseFloat($('te-from-w').value)        || 100,
      h:        parseFloat($('te-from-h').value)        || 100,
      rotation: parseFloat($('te-from-rotation').value) || 0,
    };
    f.to = {
      opacity:  parseFloat($('te-to-opacity').value)    || 0,
      x:        parseFloat($('te-to-x').value)          || 0,
      y:        parseFloat($('te-to-y').value)          || 0,
      w:        parseFloat($('te-to-w').value)          || 100,
      h:        parseFloat($('te-to-h').value)          || 100,
      rotation: parseFloat($('te-to-rotation').value)   || 0,
    };
  }

  function teAddFrame() {
    if (!teData) return;
    const defFrame = {x:0,y:0,w:100,h:100,opacity:100,rotation:0};
    const last = teData.frames.length ? teData.frames[teData.frames.length - 1] : { from:{...defFrame}, to:{...defFrame} };
    teData.frames.push({ id: Date.now().toString(36), from:{...last.from}, to:{...last.to} });
    teSelectFrame(teData.frames.length - 1);
  }

  function teDeleteFrame() {
    if (!teData || teData.frames.length <= 1) return;
    teData.frames.splice(teSelFrameIdx, 1);
    teSelectFrame(Math.min(teSelFrameIdx, teData.frames.length - 1));
  }

  function teTick(ts) {
    if (!teRafId) return;
    const dur = teData ? (teData.duration || 1) : 1;
    const dt  = Math.min((ts - teLastTs) / 1000, 0.1);
    teLastTs  = ts;
    tePlayPos += dt;
    if (tePlayPos >= dur) tePlayPos = 0;
    const fill = $('te-loop-fill');
    if (fill) fill.style.width = ((tePlayPos / dur) * 100).toFixed(1) + '%';
    teDrawPreview();
    teRafId = requestAnimationFrame(teTick);
  }

  function openTransitionEditor(filePath, data) {
    teFilePath    = filePath;
    teData        = JSON.parse(JSON.stringify(data));
    tePlayPos     = 0; teSelFrameIdx = 0;
    if (teRafId) { cancelAnimationFrame(teRafId); teRafId = null; }
    $('te-name').value     = teData.name     || '';
    $('te-duration').value = teData.duration || 1.0;
    $('te-smooth').checked = teData.smooth !== false;
    if (!teData.frames) teData.frames = [{ id:'f1', from:{x:0,y:0,w:100,h:100,opacity:100,rotation:0}, to:{x:0,y:0,w:100,h:100,opacity:100,rotation:0} }];
    switchModule('transition-editor');
    setTimeout(() => {
      teDrawPreview(); teDrawFrameStrip(); teRefreshPropsPanel();
      teLastTs = performance.now();
      teRafId  = requestAnimationFrame(teTick);
    }, 50);
  }

  function closeTransitionEditor() {
    if (teRafId) { cancelAnimationFrame(teRafId); teRafId = null; }
    teData = null;
    assetsTab = 'transitions';
    document.querySelectorAll('.assets-tab').forEach(t => t.classList.toggle('active', t.dataset.assetsTab === 'transitions'));
    switchModule('assets');
  }

  async function saveTransition() {
    const name = $('te-name').value.trim();
    if (!name) { showToast('Enter a name first'); return; }
    teData.name     = name;
    teData.duration = parseFloat($('te-duration').value) || 1.0;
    teData.smooth   = $('te-smooth').checked;
    const dir = await window.creatorhub.transitions.getDir().catch(() => null);
    if (!dir) { showToast('Could not get transitions folder'); return; }
    const fp = dir + '\\' + name.replace(/[^a-z0-9_\- ]/gi, '_') + '.transition';
    const result = await window.creatorhub.transitions.save(fp, teData).catch(() => ({ ok: false }));
    if (result && result.ok) { teFilePath = fp; showToast('Transition saved!'); }
    else showToast('Save failed');
  }

  async function openTransitionPicker(clip, onPick) {
    tePickerClip = clip;
    const list = $('te-picker-list');
    list.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px;">Loading…</div>';
    $('te-picker-modal').style.display = 'flex';
    list.innerHTML = '';
    TE_TEMPLATES.forEach(tpl => {
      const card = document.createElement('div');
      card.className = 'te-template-card'; card.style.cursor = 'pointer';
      card.innerHTML = `<div class="te-template-preview" style="background:linear-gradient(to right,rgba(59,130,246,0.5),rgba(239,68,68,0.5));"></div><div class="te-template-name">${tpl.name}</div><div class="te-template-dur">${tpl.duration}s</div>`;
      card.addEventListener('click', () => {
        clip.transitionIn = { name: tpl.name, duration: tpl.duration, data: JSON.parse(JSON.stringify(tpl)) };
        $('te-picker-modal').style.display = 'none';
        if (onPick) onPick();
      });
      list.appendChild(card);
    });
    const saved = await window.creatorhub.transitions.list().catch(() => []);
    for (const t of saved) {
      const res = await window.creatorhub.transitions.load(t.filePath).catch(() => null);
      if (!res || !res.ok) continue;
      const card = document.createElement('div');
      card.className = 'te-template-card'; card.style.cursor = 'pointer';
      card.innerHTML = `<div class="te-template-preview" style="background:linear-gradient(135deg,rgba(59,130,246,0.5),rgba(239,68,68,0.5));"></div><div class="te-template-name">${t.name}</div><div class="te-template-dur">${t.duration}s · Custom</div>`;
      card.addEventListener('click', () => {
        clip.transitionIn = { name: t.name, duration: t.duration, data: res.data };
        $('te-picker-modal').style.display = 'none';
        if (onPick) onPick();
      });
      list.appendChild(card);
    }
    if (!list.children.length) list.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px;">No transitions available. Create one in Assets → Transitions.</div>';
  }

  // ── Transition editor event listeners ────────────────────────────────────
  $('te-back').addEventListener('click',  () => closeTransitionEditor());
  $('te-save').addEventListener('click',  () => saveTransition());
  $('te-add-frame').addEventListener('click', () => teAddFrame());
  $('te-del-frame').addEventListener('click', () => teDeleteFrame());

  $('te-new-blank').addEventListener('click', () => {
    openTransitionEditor(null, { name:'', duration:1.0, smooth:true, frames:[
      { id:'f1', from:{x:0,y:0,w:100,h:100,opacity:100,rotation:0}, to:{x:0,y:0,w:100,h:100,opacity:0,  rotation:0} },
      { id:'f2', from:{x:0,y:0,w:100,h:100,opacity:0,  rotation:0}, to:{x:0,y:0,w:100,h:100,opacity:100,rotation:0} },
    ]});
  });

  $('te-duration').addEventListener('change', function() { if (teData) teData.duration = parseFloat(this.value) || 1.0; });
  $('te-smooth').addEventListener('change',   function() { if (teData) teData.smooth = this.checked; });

  const TE_PROP_IDS = ['te-from-opacity','te-from-x','te-from-y','te-from-w','te-from-h','te-from-rotation','te-to-opacity','te-to-x','te-to-y','te-to-w','te-to-h','te-to-rotation'];
  TE_PROP_IDS.forEach(id => {
    $(id).addEventListener('input', () => {
      teReadPropsIntoFrame();
      const card = $('te-frame-strip').children[teSelFrameIdx];
      if (card && teData) teDrawFrameCard(card.querySelector('canvas'), teData.frames[teSelFrameIdx]);
    });
    $(id).addEventListener('wheel', function(e) {
      e.preventDefault();
      this.value = (parseFloat(this.value)||0) + (e.deltaY < 0 ? (e.shiftKey?10:1) : -(e.shiftKey?10:1));
      this.dispatchEvent(new Event('input'));
    }, { passive: false });
  });

  $('te-picker-close').addEventListener('click', () => { $('te-picker-modal').style.display = 'none'; });

  new ResizeObserver(() => { if (teData) teDrawPreview(); }).observe($('te-canvas-wrap'));

  // ── Recordings Module ─────────────────────────────────────────────────────
  let recSelected = null;

  function renderRecordings() {
    const search = ($('recordings-search')?.value || '').toLowerCase();
    const sort   = $('recordings-sort')?.value || 'newest';

    let items = recordingsLib.filter(r => r.name.toLowerCase().includes(search));
    if (sort === 'newest') items = items.sort((a,b) => b.addedAt - a.addedAt);
    else if (sort === 'oldest') items = items.sort((a,b) => a.addedAt - b.addedAt);
    else if (sort === 'name') items = items.sort((a,b) => a.name.localeCompare(b.name));
    else if (sort === 'size') items = items.sort((a,b) => b.size - a.size);

    const list = $('recordings-list');
    list.innerHTML = '';

    if (items.length === 0) {
      list.innerHTML = `<div class="assets-empty">
        <div class="assets-empty-icon">⏺</div>
        <div class="assets-empty-text">No recordings yet — hit Record to start</div>
      </div>`;
      renderRecordingDetail(null);
      return;
    }

    items.forEach(rec => {
      const sel = recSelected === rec.id;
      const row = document.createElement('div');
      row.className = 'audio-row' + (sel ? ' selected' : '');
      row.innerHTML = `
        ${rec.thumb
          ? `<img src="${rec.thumb}" style="width:80px;height:45px;object-fit:cover;border-radius:5px;flex-shrink:0;" alt="">`
          : `<div class="audio-icon">🎬</div>`}
        <div class="audio-info">
          <div class="audio-name">${rec.name}</div>
          <div class="audio-meta">${formatBytes(rec.size)}${rec.duration ? ' · ' + rec.duration : ''} · ${new Date(rec.addedAt).toLocaleDateString()}</div>
        </div>
        <button class="audio-add-btn">Add to Canvas</button>`;
      row.addEventListener('click', () => { recSelected = recSelected === rec.id ? null : rec.id; renderRecordings(); });
      row.querySelector('.audio-add-btn').addEventListener('click', e => {
        e.stopPropagation();
        addAssetToCanvas({ ...rec, category: 'videos' });
      });
      list.appendChild(row);
    });

    renderRecordingDetail(recSelected ? recordingsLib.find(r => r.id === recSelected) : null);
  }

  function renderRecordingDetail(rec) {
    const panel = $('recordings-detail');
    if (!rec) { panel.style.display = 'none'; return; }
    panel.style.display = 'flex';
    panel.innerHTML = `
      <div class="detail-thumb">${rec.thumb ? `<img src="${rec.thumb}" alt="" onerror="this.style.display='none'">` : ''}<span>🎬</span></div>
      <div class="detail-name">${rec.name}</div>
      <div class="detail-row"><span class="detail-row-label">Type</span><span class="detail-row-val">${rec.ext.toUpperCase()}</span></div>
      <div class="detail-row"><span class="detail-row-label">Size</span><span class="detail-row-val">${formatBytes(rec.size)}</span></div>
      ${rec.duration ? `<div class="detail-row"><span class="detail-row-label">Duration</span><span class="detail-row-val">${rec.duration}</span></div>` : ''}
      <div class="detail-row"><span class="detail-row-label">Recorded</span><span class="detail-row-val">${new Date(rec.addedAt).toLocaleDateString()}</span></div>
      <button class="detail-add-btn" id="rec-detail-add">Add to Canvas</button>
      <button class="studio-btn" id="rec-detail-folder" style="font-size:11px;padding:7px;">📂 Show in Folder</button>
      <button class="detail-remove-btn" id="rec-detail-remove">Delete Recording</button>`;
    panel.querySelector('#rec-detail-add').addEventListener('click', () => addAssetToCanvas({ ...rec, category: 'videos' }));
    panel.querySelector('#rec-detail-folder').addEventListener('click', () => {
      window.creatorhub.app.openFolder(rec.path.replace(/[\\/][^\\/]+$/, ''));
    });
    panel.querySelector('#rec-detail-remove').addEventListener('click', () => {
      recordingsLib = recordingsLib.filter(r => r.id !== rec.id);
      recSelected = null;
      saveUserData();
      renderRecordings();
    });
  }

  $('recordings-search')?.addEventListener('input', renderRecordings);
  $('recordings-sort')?.addEventListener('change', renderRecordings);
  $('recordings-open-folder')?.addEventListener('click', () => {
    window.creatorhub.app.openFolder(studioRecDir || '');
  });

  // Test alerts (studio module)
  const TEST_DATA = {
    follower:   { user: 'TestViewer',     label: 'FOLLOWER' },
    subscriber: { user: 'TestSubscriber', label: 'SUBSCRIBER' },
    raid:       { user: 'TestRaider',     label: 'RAID',     viewers: '42' },
    bits:       { user: 'TestCheerer',    label: 'BITS',     amount: '500' },
    giftsub:    { user: 'TestGifter',     label: 'GIFT SUB', amount: '5' },
    donation:   { user: 'TestDonor',      label: 'DONATION', amount: '$10.00' },
  };
  async function sendTestAlert(type, btn) {
    if (!currentToken) { showToast('Select an overlay first'); return; }
    try {
      const r = await apiFetch(`${baseUrl}/api/plugin/${currentToken}/test-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data: TEST_DATA[type] }),
      });
      if (r.ok) {
        showToast('Sent ' + type + ' test!');
        btn.classList.add('sent');
        setTimeout(() => btn.classList.remove('sent'), 1000);
      } else { showToast((r.data && r.data.error) || 'Failed to send'); }
    } catch (e) { showToast('Could not send test alert'); }
  }

  document.querySelectorAll('.studio-test-btn').forEach(btn => {
    btn.addEventListener('click', () => sendTestAlert(btn.dataset.type, btn));
  });

  // ── Record / Stream module ────────────────────────────────────────────────

  // ── Studio — real implementation ──────────────────────────────────────────

  const engine = new StudioEngine();
  let studioReady = false;
  let studioSelectedId = null;   // selected source id
  let studioRecDir = null;       // custom output folder
  let mediaRecorder = null;      // current MediaRecorder (record or stream)
  let streamMediaRecorder = null;

  const QUALITY_BITS = { high: 10_000_000, medium: 5_000_000, low: 2_500_000 };
  const PLATFORM_META = {
    twitch:   { label: 'Twitch',       icon: '🟣', server: 'rtmp://live.twitch.tv/app' },
    youtube:  { label: 'YouTube',      icon: '🔴', server: 'rtmp://a.rtmp.youtube.com/live2' },
    kick:     { label: 'Kick',         icon: '🟢', server: 'rtmp://fa723fc1b171.global-contribute.live-video.net/app' },
    facebook: { label: 'Facebook Live',icon: '🔵', server: 'rtmps://live-api-s.facebook.com:443/rtmp' },
  };

  // ── Engine init (called once when the recstream module first becomes visible)
  function initStudio() {
    if (studioReady) return;
    studioReady = true;
    const canvas = $('studio-canvas');
    engine.init(canvas, 1920, 1080);
    engine.start();

    // ── Scene persistence ─────────────────────────────────────────────────────
    // Only image/media/browser sources can be restored — live captures (screen/window/camera) can't
    const RESTORABLE = ['image', 'media', 'browser'];

    function serializeScenes() {
      const tabs = [...studioSceneTabs.querySelectorAll('.studio-scene-tab')];
      const activeTab = studioSceneTabs.querySelector('.studio-scene-tab.active');
      return {
        activeScene: activeTab?.dataset.scene || null,
        scenes: tabs.map(t => ({
          name: t.dataset.scene,
          sources: t === activeTab
            ? engine.sources
                .filter(s => RESTORABLE.includes(s.type))
                .map(s => ({
                  type: s.type, name: s.name,
                  path: s.element?.src || s.element?.currentSrc || s._browserUrl || null,
                  x: s.x, y: s.y, width: s.width, height: s.height,
                  rotation: s.rotation, visible: s.visible,
                }))
            : (t._savedSources || []),
        })),
        resolution: { w: engine.outW, h: engine.outH },
      };
    }

    async function saveScenes() {
      await window.creatorhub.scenes.save(serializeScenes());
    }

    async function restoreScenes(data) {
      if (!data) return;
      // Restore scene tabs
      studioSceneTabs.querySelectorAll('.studio-scene-tab').forEach(t => t.remove());
      const addBtn = $('studio-add-scene');
      for (const scene of data.scenes) {
        const tab = document.createElement('div');
        tab.className = 'studio-scene-tab' + (scene.name === data.activeScene ? ' active' : '');
        tab.dataset.scene = scene.name;
        tab._savedSources = scene.sources || [];
        tab.innerHTML = `<span class="studio-tab-dot"></span><span class="studio-tab-name">${scene.name}</span><button class="studio-tab-del" tabindex="-1">×</button>`;
        addBtn.before(tab);
      }
      // Restore sources for the active scene
      const activeScene = data.scenes.find(s => s.name === data.activeScene);
      if (activeScene) {
        for (const s of activeScene.sources || []) {
          try {
            if (s.type === 'image') await engine.addImageSource(s.path, s.name);
            else if (s.type === 'media') await engine.addMediaSource(s.path, s.name);
            else if (s.type === 'browser') await engine.addBrowserSource(s.path, s.name);
            const src = engine.sources[engine.sources.length - 1];
            engine.setTransform(src.id, { x: s.x, y: s.y, width: s.width, height: s.height, rotation: s.rotation });
            if (!s.visible) src.visible = false;
          } catch (_) {}
        }
        renderLayerList();
      }
    }

    // Load saved scenes on first init
    window.creatorhub.scenes.load().then(data => restoreScenes(data));

    // ── Canvas move + resize ──────────────────────────────────────────────────
    const HANDLE_CURSORS = ['nw-resize','n-resize','ne-resize','w-resize','e-resize','sw-resize','s-resize','se-resize'];
    let canvasDrag = null;

    function toEngineCoords(e) {
      const r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * (engine.outW / r.width),
        y: (e.clientY - r.top)  * (engine.outH / r.height),
      };
    }
    // Hit radius in engine-space (≈8px on screen at typical window size)
    function handleHitRadius() {
      const r = canvas.getBoundingClientRect();
      return 10 * (engine.outW / r.width);
    }
    function hitTestHandle(src, ex, ey) {
      const hr = handleHitRadius();
      return engine._handlePositions(src).findIndex(([hx, hy]) =>
        Math.abs(ex - hx) < hr && Math.abs(ey - hy) < hr
      );
    }
    function hitTestCanvas(ex, ey) {
      for (let i = engine.sources.length - 1; i >= 0; i--) {
        const s = engine.sources[i];
        if (!s.visible) continue;
        if (ex >= s.x && ex <= s.x + s.width && ey >= s.y && ey <= s.y + s.height) return s;
      }
      return null;
    }

    canvas.addEventListener('mousedown', e => {
      const { x, y } = toEngineCoords(e);
      // Check resize handles on selected source first
      if (studioSelectedId != null) {
        const sel = engine.sources.find(s => s.id === studioSelectedId);
        if (sel) {
          const hi = hitTestHandle(sel, x, y);
          if (hi >= 0) {
            canvasDrag = { mode: 'resize', id: sel.id, handle: hi,
              startX: x, startY: y,
              origX: sel.x, origY: sel.y, origW: sel.width, origH: sel.height };
            canvas.style.cursor = HANDLE_CURSORS[hi];
            return;
          }
        }
      }
      // Check move
      const src = hitTestCanvas(x, y);
      if (!src) { selectSource(null); return; }
      selectSource(src.id);
      canvasDrag = { mode: 'move', id: src.id, startX: x, startY: y, origX: src.x, origY: src.y };
      canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('mousemove', e => {
      const { x, y } = toEngineCoords(e);
      if (!canvasDrag) {
        // Hover cursor hint
        if (studioSelectedId != null) {
          const sel = engine.sources.find(s => s.id === studioSelectedId);
          if (sel) {
            const hi = hitTestHandle(sel, x, y);
            if (hi >= 0) { canvas.style.cursor = HANDLE_CURSORS[hi]; return; }
          }
        }
        canvas.style.cursor = hitTestCanvas(x, y) ? 'grab' : 'default';
        return;
      }
      const dx = x - canvasDrag.startX, dy = y - canvasDrag.startY;

      // Collect snap lines from canvas edges + other sources
      function snapVal(val, lines, threshold) {
        let best = val, bestDist = threshold;
        for (const line of lines) {
          const d = Math.abs(val - line);
          if (d < bestDist) { best = line; bestDist = d; }
        }
        return best;
      }
      const SNAP = 20; // snap threshold in canvas units
      const others = engine.sources.filter(s => s.id !== canvasDrag.id && s.visible);
      const xLines = [0, engine.outW, ...others.flatMap(s => [s.x, s.x + s.width])];
      const yLines = [0, engine.outH, ...others.flatMap(s => [s.y, s.y + s.height])];

      if (canvasDrag.mode === 'move') {
        let nx = canvasDrag.origX + dx, ny = canvasDrag.origY + dy;
        const src = engine.sources.find(s => s.id === canvasDrag.id);
        const w = src ? src.width : 0, h = src ? src.height : 0;
        // Snap left or right edge, top or bottom edge
        const snappedL = snapVal(nx,     xLines, SNAP);
        const snappedR = snapVal(nx + w, xLines, SNAP);
        if (snappedL !== nx)       nx = snappedL;
        else if (snappedR !== nx+w) nx = snappedR - w;
        const snappedT = snapVal(ny,     yLines, SNAP);
        const snappedB = snapVal(ny + h, yLines, SNAP);
        if (snappedT !== ny)       ny = snappedT;
        else if (snappedB !== ny+h) ny = snappedB - h;
        engine.setTransform(canvasDrag.id, { x: nx, y: ny });
        $('studio-tx-x').value = Math.round(nx);
        $('studio-tx-y').value = Math.round(ny);
      } else {
        const h = canvasDrag.handle;
        let { origX: nx, origY: ny, origW: nw, origH: nh } = canvasDrag;
        if      (h === 0) { nx+=dx; ny+=dy; nw-=dx; nh-=dy; }
        else if (h === 1) {         ny+=dy;          nh-=dy; }
        else if (h === 2) {         ny+=dy; nw+=dx;  nh-=dy; }
        else if (h === 3) { nx+=dx;         nw-=dx;          }
        else if (h === 4) {                 nw+=dx;          }
        else if (h === 5) { nx+=dx;         nw-=dx;  nh+=dy; }
        else if (h === 6) {                          nh+=dy; }
        else if (h === 7) {                 nw+=dx;  nh+=dy; }
        nw = Math.max(50, nw); nh = Math.max(50, nh);
        // Snap the edge(s) being dragged
        if (h === 0 || h === 3 || h === 5) { const s = snapVal(nx, xLines, SNAP);      nw += nx - s; nx = s; }
        if (h === 2 || h === 4 || h === 7) { const s = snapVal(nx+nw, xLines, SNAP);   nw = s - nx; }
        if (h === 0 || h === 1 || h === 2) { const s = snapVal(ny, yLines, SNAP);      nh += ny - s; ny = s; }
        if (h === 5 || h === 6 || h === 7) { const s = snapVal(ny+nh, yLines, SNAP);   nh = s - ny; }
        nw = Math.max(50, nw); nh = Math.max(50, nh);
        engine.setTransform(canvasDrag.id, { x: nx, y: ny, width: nw, height: nh });
        $('studio-tx-x').value = Math.round(nx); $('studio-tx-y').value = Math.round(ny);
        $('studio-tx-w').value = Math.round(nw); $('studio-tx-h').value = Math.round(nh);
      }
    });
    canvas.addEventListener('mouseup',    () => { if (canvasDrag) saveScenes(); canvasDrag = null; canvas.style.cursor = ''; });
    canvas.addEventListener('mouseleave', () => { canvasDrag = null; canvas.style.cursor = ''; });

    // Wire up Overlayd Add buttons now that engine is ready
    renderStudioOverlays(async (url, label) => {
      const src = await engine.addBrowserSource(url, label);
      renderLayerList();
      selectSource(src.id);
    });
  }

  // ── Layer list helpers ────────────────────────────────────────────────────
  function renderLayerList() {
    const list = $('studio-layer-list');
    if (!list) return;
    list.innerHTML = '';
    // Render top-to-bottom (last source = top layer)
    const reversed = [...engine.sources].reverse();
    for (const src of reversed) {
      const TYPE_ICONS = { screen:'🖥️', window:'🪟', camera:'📷', image:'🖼️', media:'🎵', browser:'🌐' };
      const icon = TYPE_ICONS[src.type] || '📄';
      const row = document.createElement('div');
      row.className = 'studio-layer' + (src.id === studioSelectedId ? ' selected' : '');
      row.dataset.id = src.id;
      row.innerHTML = `
        <span class="studio-layer-drag">⠿</span>
        <span class="studio-layer-icon">${icon}</span>
        <span class="studio-layer-name">${src.name}</span>
        <span class="studio-layer-vis ${src.visible ? 'active' : ''}" title="Toggle visibility">👁</span>`;
      list.appendChild(row);
    }
  }

  function selectSource(id) {
    studioSelectedId = id;
    engine.select(id);
    renderLayerList();
    const src = id != null ? engine.sources.find(s => s.id === id) : null;
    if (src) {
      $('studio-tx-x').value   = Math.round(src.x);
      $('studio-tx-y').value   = Math.round(src.y);
      $('studio-tx-w').value   = Math.round(src.width);
      $('studio-tx-h').value   = Math.round(src.height);
      $('studio-tx-rot').value = Math.round(src.rotation);
    }
  }

  // ── Studio overlay panel ──────────────────────────────────────────────────

  // ── Layer list click ──────────────────────────────────────────────────────
  const studioLayerList = $('studio-layer-list');
  if (studioLayerList) {
    studioLayerList.addEventListener('click', (e) => {
      const row = e.target.closest('.studio-layer');
      if (!row) return;
      const id = Number(row.dataset.id);
      if (e.target.classList.contains('studio-layer-vis')) {
        const src = engine.sources.find(s => s.id === id);
        if (src) {
          engine.setVisible(id, !src.visible);
          renderLayerList();
        }
        return;
      }
      selectSource(id);
    });
  }

  // ── Remove source ─────────────────────────────────────────────────────────
  const studioRemoveSource = $('studio-remove-source');
  if (studioRemoveSource) {
    studioRemoveSource.addEventListener('click', () => {
      if (!studioSelectedId) return;
      engine.removeSource(studioSelectedId);
      studioSelectedId = null;
      renderLayerList();
      saveScenes();
    });
  }

  // ── Transform panel ───────────────────────────────────────────────────────
  const studioApplyTransform = $('studio-apply-transform');
  if (studioApplyTransform) {
    studioApplyTransform.addEventListener('click', () => {
      if (!studioSelectedId) return;
      engine.setTransform(studioSelectedId, {
        x:        Number($('studio-tx-x').value),
        y:        Number($('studio-tx-y').value),
        width:    Number($('studio-tx-w').value),
        height:   Number($('studio-tx-h').value),
        rotation: Number($('studio-tx-rot').value),
      });
      saveScenes();
    });
  }
  const studioResetTransform = $('studio-reset-transform');
  if (studioResetTransform) {
    studioResetTransform.addEventListener('click', () => {
      if (!studioSelectedId) return;
      engine.setTransform(studioSelectedId, { x: 0, y: 0, width: 1920, height: 1080, rotation: 0 });
      selectSource(studioSelectedId);
    });
  }

  // ── Source picker ─────────────────────────────────────────────────────────
  const SOURCE_TYPES_DEF = [
    { icon: '🖥️', label: 'Display',  kind: 'screen'  },
    { icon: '🪟', label: 'Window',   kind: 'window'  },
    { icon: '📷', label: 'Webcam',   kind: 'camera'  },
    { icon: '🖼️', label: 'Image',    kind: 'image'   },
    { icon: '🎵', label: 'Media',    kind: 'media'   },
  ];

  let pickerKind    = null;
  let pickerDevice  = null; // { id, name } for desktop/camera sources

  const studioAddSource    = $('studio-add-source');
  const studioSourcePicker = $('studio-source-picker');
  const studioSourceTypes  = $('studio-source-types');
  const studioDeviceList   = $('studio-device-list');
  const studioSourceName   = $('studio-source-name');
  const studioConfirmAdd   = $('studio-confirm-add-source');
  const studioCancelAdd    = $('studio-cancel-add-source');

  function pickerReset() {
    pickerKind = null; pickerDevice = null;
    $('studio-picker-label').textContent = 'Choose type';
    studioSourceTypes.style.display  = '';
    studioDeviceList.style.display   = 'none';
    studioSourceName.style.display   = 'none';
    studioConfirmAdd.style.display   = 'none';
    studioSourceName.value           = '';
    studioDeviceList.innerHTML       = '';
    studioSourceTypes.querySelectorAll('.studio-source-type-item').forEach(el => el.classList.remove('selected'));
  }

  // Build type grid once
  if (studioSourceTypes) {
    SOURCE_TYPES_DEF.forEach(t => {
      const el = document.createElement('div');
      el.className   = 'studio-source-type-item';
      el.dataset.kind = t.kind;
      el.innerHTML   = `<span class="sti-icon">${t.icon}</span><span>${t.label}</span>`;
      el.addEventListener('click', () => onPickType(t.kind, t.label));
      studioSourceTypes.appendChild(el);
    });
  }

  async function onPickType(kind, label) {
    pickerKind = kind;
    pickerDevice = null;
    studioSourceTypes.querySelectorAll('.studio-source-type-item').forEach(el =>
      el.classList.toggle('selected', el.dataset.kind === kind));

    // Image / Media: open file dialog immediately
    if (kind === 'image') {
      const file = await window.creatorhub.app.openFileDialog({
        filters: [{ name: 'Images', extensions: ['png','jpg','jpeg','gif','webp','bmp'] }],
      });
      if (!file) { pickerReset(); return; }
      pickerDevice = { id: file, name: file.replace(/.*[\\/]/, '') };
      studioSourceName.value = pickerDevice.name;
      studioSourceName.style.display = '';
      studioConfirmAdd.style.display = '';
      return;
    }
    if (kind === 'media') {
      const file = await window.creatorhub.app.openFileDialog({
        filters: [{ name: 'Video / Audio', extensions: ['mp4','mkv','mov','avi','webm','mp3','wav','aac'] }],
      });
      if (!file) { pickerReset(); return; }
      pickerDevice = { id: file, name: file.replace(/.*[\\/]/, '') };
      studioSourceName.value = pickerDevice.name;
      studioSourceName.style.display = '';
      studioConfirmAdd.style.display = '';
      return;
    }

    // Screen / Window / Camera: load device list
    $('studio-picker-label').textContent = `Select ${label}`;
    studioSourceTypes.style.display = 'none';
    studioDeviceList.style.display  = '';
    studioDeviceList.innerHTML      = '<div style="color:var(--muted);font-size:11px;padding:4px 0">Loading…</div>';

    try {
      let devices = [];
      if (kind === 'screen' || kind === 'window') {
        const types = kind === 'screen' ? ['screen'] : ['window'];
        const raw = await window.creatorhub.studio.getDesktopSources(types);
        devices = raw.map(s => ({ id: s.id, name: s.name, thumb: s.thumbnail }));
      } else { // camera
        const all = await navigator.mediaDevices.enumerateDevices();
        devices = all.filter(d => d.kind === 'videoinput')
          .map(d => ({ id: d.deviceId, name: d.label || 'Camera ' + d.deviceId.slice(0,6) }));
      }

      studioDeviceList.innerHTML = '';
      if (!devices.length) {
        studioDeviceList.innerHTML = '<div style="color:var(--muted);font-size:11px;padding:4px 0">No sources found</div>';
        return;
      }
      devices.forEach(dev => {
        const row = document.createElement('div');
        row.className = 'studio-device-item';
        row.innerHTML = dev.thumb
          ? `<img class="studio-device-thumb" src="${dev.thumb}"><span class="studio-device-name">${dev.name}</span>`
          : `<span class="studio-device-name">${dev.name}</span>`;
        row.addEventListener('click', () => {
          studioDeviceList.querySelectorAll('.studio-device-item').forEach(r => r.classList.remove('selected'));
          row.classList.add('selected');
          pickerDevice = dev;
          studioSourceName.value          = dev.name;
          studioSourceName.style.display  = '';
          studioConfirmAdd.style.display  = '';
        });
        studioDeviceList.appendChild(row);
      });
    } catch (e) {
      studioDeviceList.innerHTML = `<div style="color:var(--red);font-size:11px;">${e.message}</div>`;
    }
  }

  if (studioAddSource) {
    studioAddSource.addEventListener('click', () => {
      if (studioSourcePicker.style.display === 'none') {
        pickerReset();
        studioSourcePicker.style.display = '';
      } else {
        studioSourcePicker.style.display = 'none';
      }
    });
  }

  if (studioCancelAdd) studioCancelAdd.addEventListener('click', () => {
    studioSourcePicker.style.display = 'none';
    pickerReset();
  });

  if (studioConfirmAdd) studioConfirmAdd.addEventListener('click', async () => {
    if (!pickerKind || !pickerDevice) return;
    const name = studioSourceName.value.trim() || pickerDevice.name;
    studioConfirmAdd.disabled = true;
    studioConfirmAdd.textContent = 'Adding…';
    try {
      let src;
      if (pickerKind === 'screen' || pickerKind === 'window') {
        src = await engine.addDesktopSource(pickerDevice.id, name, pickerKind);
      } else if (pickerKind === 'camera') {
        src = await engine.addCameraSource(pickerDevice.id, name);
      } else if (pickerKind === 'image') {
        src = await engine.addImageSource(pickerDevice.id, name);
      } else if (pickerKind === 'media') {
        src = await engine.addMediaSource(pickerDevice.id, name);
      }
      studioSourcePicker.style.display = 'none';
      pickerReset();
      renderLayerList();
      if (src) selectSource(src.id);
      saveScenes();
    } catch (e) {
      showToast('Could not add source: ' + e.message);
    } finally {
      studioConfirmAdd.disabled = false;
      studioConfirmAdd.textContent = 'Add';
    }
  });

  // ── Scene tab switching (visual only for now) ─────────────────────────────
  const studioSceneTabs = $('studio-scene-tabs');
  if (studioSceneTabs) {
    studioSceneTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.studio-scene-tab');
      if (!tab) return;
      if (e.target.classList.contains('studio-tab-del')) {
        // Double-click to delete (arm pattern)
        if (tab.dataset.armed) {
          tab.remove();
          saveScenes();
        } else {
          tab.dataset.armed = '1';
          tab.querySelector('.studio-tab-del').textContent = '✓';
          setTimeout(() => { delete tab.dataset.armed; const d = tab.querySelector('.studio-tab-del'); if (d) d.textContent = '×'; }, 2000);
        }
        return;
      }
      studioSceneTabs.querySelectorAll('.studio-scene-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });

    // Refresh overlays button
    const refreshOverlaysBtn = $('studio-refresh-overlays');
    if (refreshOverlaysBtn) {
      refreshOverlaysBtn.addEventListener('click', async () => {
        refreshOverlaysBtn.disabled = true;
        await loadUserData();
        renderStudioOverlays(async (url, label) => {
          const src = await engine.addBrowserSource(url, label);
          renderLayerList();
          selectSource(src.id);
        });
        refreshOverlaysBtn.disabled = false;
      });
    }

    // Add new scene tab
    const addSceneBtn = $('studio-add-scene');
    if (addSceneBtn) {
      addSceneBtn.addEventListener('click', () => {
        const name = 'Scene ' + (studioSceneTabs.querySelectorAll('.studio-scene-tab').length + 1);
        const tab = document.createElement('div');
        tab.className = 'studio-scene-tab';
        tab.dataset.scene = name;
        tab.innerHTML = `<span class="studio-tab-dot"></span><span class="studio-tab-name">${name}</span><button class="studio-tab-del" tabindex="-1">×</button>`;
        addSceneBtn.before(tab);
        studioSceneTabs.querySelectorAll('.studio-scene-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        saveScenes();
      });
    }
  }

  // Transition picker (clamp duration input to 0.1–5s)
  const transDurInput = $('studio-trans-dur');
  if (transDurInput) {
    transDurInput.addEventListener('change', () => {
      const v = parseFloat(transDurInput.value);
      if (isNaN(v) || v < 0.1) transDurInput.value = '0.1';
      else if (v > 5) transDurInput.value = '5';
    });
  }

  // ── Audio device picker ───────────────────────────────────────────────────
  function addAudioTrackUI(key, name, analyser) {
    const tracksEl = $('studio-audio-tracks');
    tracksEl.querySelector('.studio-audio-empty')?.remove();
    const meterId = 'meter-' + key.replace(/[^a-z0-9]/gi, '-');
    const row = document.createElement('div');
    row.className = 'studio-track';
    row.dataset.key = key;
    row.innerHTML = `
      <span class="studio-track-icon">🎤</span>
      <div class="studio-track-body">
        <span class="studio-track-name">${name}</span>
        <div class="studio-meter" id="${meterId}">
          ${Array(10).fill('<div class="studio-meter-bar"></div>').join('')}
        </div>
      </div>
      <input type="range" class="studio-vol" min="0" max="100" value="80">
      <button class="studio-mute-btn" title="Mute">🔊</button>
      <button class="studio-rm-btn" title="Remove">✕</button>`;
    let lastVol = 0.8;
    row.querySelector('.studio-vol').addEventListener('input', function () {
      lastVol = Number(this.value) / 100;
      engine.setVolume(key, lastVol);
    });
    row.querySelector('.studio-mute-btn').addEventListener('click', function () {
      const muted = this.textContent === '🔇';
      this.textContent = muted ? '🔊' : '🔇';
      engine.setVolume(key, muted ? lastVol : 0);
      row.querySelector('.studio-meter').classList.toggle('muted', !muted);
    });
    row.querySelector('.studio-rm-btn').addEventListener('click', () => {
      engine.removeAudioSource(key);
      row.remove();
      if (!tracksEl.querySelector('.studio-track')) {
        tracksEl.innerHTML = '<div class="studio-audio-empty">No audio — click + to add a mic or input</div>';
      }
    });
    if (analyser) {
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const bars = [...row.querySelectorAll('.studio-meter-bar')];
      (function tick() {
        if (!row.isConnected) return;
        analyser.getByteFrequencyData(freqData);
        bars.forEach((bar, i) => {
          const v = (freqData[i % freqData.length] || 0) / 255;
          const h = Math.max(5, Math.round(v * 100));
          bar.style.height = h + '%';
          bar.style.background = h > 80 ? 'var(--red)' : h > 45 ? 'var(--amber)' : 'var(--green)';
        });
        requestAnimationFrame(tick);
      })();
    }
    tracksEl.appendChild(row);
  }

  const studioAddAudio   = $('studio-add-audio');
  const studioAudioPicker = $('studio-audio-picker');

  if (studioAddAudio) {
    studioAddAudio.addEventListener('click', async () => {
      if (studioAudioPicker.style.display !== 'none') {
        studioAudioPicker.style.display = 'none';
        return;
      }
      studioAudioPicker.innerHTML = '<div style="color:var(--muted);font-size:11px;padding:4px 0;">Loading devices…</div>';
      studioAudioPicker.style.display = '';
      try {
        // Request permission so labels are populated
        const tmp = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        tmp.getTracks().forEach(t => t.stop());
      } catch (e) { showToast('Microphone permission denied'); studioAudioPicker.style.display = 'none'; return; }

      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all.filter(d => d.kind === 'audioinput');
      studioAudioPicker.innerHTML = '';
      inputs.forEach(dev => {
        const item = document.createElement('div');
        item.className = 'studio-device-item';
        item.innerHTML = `<span class="studio-device-name">${dev.label || dev.deviceId.slice(0,12)}</span>`;
        item.addEventListener('click', async () => {
          studioAudioPicker.style.display = 'none';
          const key = 'mic_' + dev.deviceId;
          if ($('studio-audio-tracks').querySelector(`[data-key="${key}"]`)) {
            showToast('That device is already added'); return;
          }
          try {
            const stream = await engine.addMicrophoneTrack(dev.deviceId);
            const analyser = engine.audioCtx.createAnalyser();
            analyser.fftSize = 32;
            engine.audioCtx.createMediaStreamSource(stream).connect(analyser);
            addAudioTrackUI(key, dev.label || dev.deviceId.slice(0, 16), analyser);
          } catch (err) { showToast('Could not open device: ' + err.message); }
        });
        studioAudioPicker.appendChild(item);
      });
      if (!inputs.length) studioAudioPicker.innerHTML = '<div style="color:var(--muted);font-size:11px;padding:4px 0;">No audio inputs found</div>';
    });
  }

  // ── Timer helper ──────────────────────────────────────────────────────────
  function makeClock(onTick) {
    let secs = 0;
    const fmt = s => [Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(n=>String(n).padStart(2,'0')).join(':');
    const id = setInterval(() => { secs++; onTick(fmt(secs)); }, 1000);
    return () => clearInterval(id);
  }

  // ── Recording ─────────────────────────────────────────────────────────────
  const studioStartRec  = $('studio-start-rec');
  const studioStopRec   = $('studio-stop-rec');
  let stopRecClock = null;
  let recTotalBytes = 0;

  // F9 global hotkey → toggle record
  window.creatorhub.ipc.on('hotkey:toggle-record', () => {
    if (!mediaRecorder && studioStartRec && !studioStartRec.disabled) studioStartRec.click();
    else if (mediaRecorder && studioStopRec && !studioStopRec.disabled) studioStopRec.click();
  });

  if (studioStartRec) {
    studioStartRec.addEventListener('click', async () => {
      if (!studioReady) { showToast('No sources added yet'); return; }
      const fmt  = $('studio-rec-format').value;
      const qual = $('studio-rec-quality').value;
      const bps  = QUALITY_BITS[qual] || 8_000_000;

      await window.creatorhub.studio.recordStart();
      const stream = engine.captureStream(30);
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: bps,
      });
      recTotalBytes = 0;
      mediaRecorder.ondataavailable = async e => {
        if (e.data.size > 0) {
          recTotalBytes += e.data.size;
          const mb = (recTotalBytes / 1048576).toFixed(1);
          const sizeEl = $('studio-rec-size');
          if (sizeEl) { sizeEl.textContent = mb + ' MB'; sizeEl.style.display = ''; }
          const buf = await e.data.arrayBuffer();
          await window.creatorhub.studio.recordChunk(buf);
        }
      };
      mediaRecorder.start(500);
      engine.outputActive = true;

      studioStartRec.disabled = true;
      studioStopRec.disabled  = false;
      $('studio-rec-dot').className = 'status-dot';
      $('studio-rec-dot').style.background = 'var(--red)';
      $('studio-rec-label').textContent = 'Recording…';
      $('studio-rec-badge').style.display = '';
      const recSizeEl = $('studio-rec-size');
      if (recSizeEl) { recSizeEl.textContent = '0.0 MB'; recSizeEl.style.display = ''; }
      stopRecClock = makeClock(t => {
        $('studio-rec-timer').textContent = t;
        $('studio-rec-clock').textContent = t;
      });
    });
  }

  if (studioStopRec) {
    studioStopRec.addEventListener('click', async () => {
      if (!mediaRecorder) return;
      // Wait for the final ondataavailable chunk before telling main to close
      await new Promise(res => { mediaRecorder.addEventListener('stop', res, { once: true }); mediaRecorder.stop(); });
      mediaRecorder = null;
      engine.outputActive = false;
      if (stopRecClock) { stopRecClock(); stopRecClock = null; }

      const fmt = $('studio-rec-format').value;
      $('studio-rec-label').textContent = 'Saving…';
      const res = await window.creatorhub.studio.recordStop(fmt, studioRecDir);

      studioStartRec.disabled = false;
      studioStopRec.disabled  = true;
      $('studio-rec-dot').style.background = '';
      $('studio-rec-dot').className = 'status-dot disconnected';
      $('studio-rec-label').textContent = 'Not recording';
      $('studio-rec-timer').textContent  = '';
      $('studio-rec-badge').style.display = 'none';
      const recSizeElStop = $('studio-rec-size');
      if (recSizeElStop) { recSizeElStop.style.display = 'none'; recSizeElStop.textContent = ''; }
      recTotalBytes = 0;

      if (res.ok) {
        showToast('Saved: ' + res.outputPath.replace(/.*[\\/]/, ''));
        addRecording(res.outputPath);
      } else showToast('Recording error: ' + res.error);
    });
  }

  // ── Output folder ─────────────────────────────────────────────────────────
  const studioChangeDir = $('studio-change-dir');
  if (studioChangeDir) {
    studioChangeDir.addEventListener('click', async () => {
      const dir = await window.creatorhub.app.openFileDialog({ properties: ['openDirectory'] });
      if (!dir) return;
      studioRecDir = dir;
      $('studio-rec-dir').textContent = '📁 ' + (dir.replace(/.*[\\/]/, '') || dir);
      $('studio-rec-dir').title = dir;
    });
  }

  // ── Streaming ─────────────────────────────────────────────────────────────
  const studioGoLive    = $('studio-go-live');
  const studioEndStream = $('studio-end-stream');
  let stopStreamClock   = null;
  let destIdCounter     = 0;
  const destinations    = [];

  function addDestination(platform, key, label, server, channelId) {
    destinations.push({ id: ++destIdCounter, platform, key: key || '', label: label || '', server: server || '', channelId: channelId || '', enabled: true });
  }

  function renderDestinations() {
    const container = $('studio-destinations');
    if (!container) return;
    if (!destinations.length) {
      container.innerHTML = '<div class="studio-audio-empty">No destinations — add one below</div>';
      return;
    }
    container.innerHTML = '';
    destinations.forEach(d => {
      const meta = PLATFORM_META[d.platform] || { label: 'Custom RTMP', icon: '📡' };
      const row  = document.createElement('div');
      row.className = 'studio-dest-row';
      row.innerHTML = `
        <input type="checkbox" class="studio-dest-check" ${d.enabled ? 'checked' : ''}>
        <span class="studio-dest-icon">${meta.icon}</span>
        <span class="studio-dest-name">${d.label || meta.label}</span>
        <input class="studio-input studio-dest-key" type="password" value="${d.key}" placeholder="${d.key ? '' : 'Paste stream key…'}">
        ${d.platform === 'custom' ? `<input class="studio-input studio-dest-server" type="text" value="${d.server}" placeholder="rtmp://…">` : ''}
        <button class="studio-rm-btn studio-dest-rm" title="Remove">×</button>`;
      row.querySelector('.studio-dest-check').addEventListener('change', e => { d.enabled = e.target.checked; });
      row.querySelector('.studio-dest-key').addEventListener('input',  e => {
        d.key = e.target.value;
        if (d.channelId) saveKey(d.platform, d.channelId, d.key);
      });
      const sv = row.querySelector('.studio-dest-server');
      if (sv) sv.addEventListener('input', e => { d.server = e.target.value; });
      row.querySelector('.studio-dest-rm').addEventListener('click', () => {
        destinations.splice(destinations.indexOf(d), 1);
        renderDestinations();
      });
      container.appendChild(row);
    });
  }

  // Stream keys persisted locally (users enter once, app remembers)
  function savedKey(platform, channelId) {
    return localStorage.getItem(`streamkey_${platform}_${channelId}`) || '';
  }
  function saveKey(platform, channelId, key) {
    if (key) localStorage.setItem(`streamkey_${platform}_${channelId}`, key);
    else localStorage.removeItem(`streamkey_${platform}_${channelId}`);
  }

  // Auto-populate from Overlayd connected platforms
  async function loadConnectedDestinations() {
    try {
      const r = await apiFetch(`${baseUrl}/api/connections`, { headers: authHeaders() });
      if (!r.ok || !r.data) return;
      const conns = Array.isArray(r.data) ? r.data : (r.data.connections || []);
      for (const conn of conns) {
        if (!PLATFORM_META[conn.platform]) continue;
        const label = `${PLATFORM_META[conn.platform].label} — ${conn.channel_name}`;
        // Try to load a saved key, then fall back to auto-fetching from Overlayd
        let key = savedKey(conn.platform, conn.channel_id);
        if (!key) {
          try {
            const kr = await apiFetch(
              `${baseUrl}/api/connections/${conn.platform}/stream-key`,
              { headers: authHeaders() }
            );
            if (kr.ok && kr.data && kr.data.stream_key) {
              key = kr.data.stream_key;
              saveKey(conn.platform, conn.channel_id, key);
              // For YouTube, also use the RTMP server from the response
              if (conn.platform === 'youtube' && kr.data.rtmp_server) {
                PLATFORM_META.youtube.server = kr.data.rtmp_server;
              }
            }
          } catch (_) {}
        }
        addDestination(conn.platform, key, label, '', conn.channel_id);
      }
      if (conns.length) renderDestinations();
    } catch (_) {}
  }
  loadConnectedDestinations();

  // Add destination picker
  const studioAddDest = $('studio-add-destination');
  if (studioAddDest) {
    studioAddDest.addEventListener('click', () => {
      if ($('studio-dest-picker')) return; // already open
      const picker = document.createElement('div');
      picker.id = 'studio-dest-picker';
      picker.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:4px;';
      picker.innerHTML = `
        <select class="studio-select" style="flex:1;">
          ${Object.entries(PLATFORM_META).map(([k,v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
          <option value="custom">📡 Custom RTMP</option>
        </select>
        <button class="studio-icon-btn" id="studio-dest-confirm">✓</button>
        <button class="studio-icon-btn" id="studio-dest-cancel">✕</button>`;
      studioAddDest.after(picker);
      picker.querySelector('#studio-dest-confirm').addEventListener('click', () => {
        addDestination(picker.querySelector('select').value, '', '', '');
        picker.remove();
        renderDestinations();
      });
      picker.querySelector('#studio-dest-cancel').addEventListener('click', () => picker.remove());
    });
  }

  if (studioGoLive) {
    studioGoLive.addEventListener('click', async () => {
      if (!studioReady) { showToast('No sources added yet'); return; }
      const active = destinations.filter(d => d.enabled && d.key.trim());
      if (!active.length) { showToast('Enable at least one destination with a stream key'); return; }
      const dests = active.map(d => ({
        id:     d.id,
        server: d.platform === 'custom' ? d.server.trim() : PLATFORM_META[d.platform].server,
        key:    d.key.trim(),
      })).filter(d => d.server);
      if (!dests.length) { showToast('Custom destination needs an RTMP server URL'); return; }

      const res = await window.creatorhub.studio.streamStart(dests);
      if (!res.ok) { showToast('Stream error: ' + res.error); return; }

      const stream = engine.captureStream(30);
      streamMediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus', videoBitsPerSecond: 4_000_000 });
      streamMediaRecorder.ondataavailable = async e => {
        if (e.data.size > 0) await window.creatorhub.studio.streamChunk(await e.data.arrayBuffer());
      };
      streamMediaRecorder.start(100);
      engine.outputActive = true;

      studioGoLive.disabled    = true;
      studioEndStream.disabled = false;
      $('studio-stream-dot').className = 'status-dot';
      $('studio-stream-dot').style.background = 'var(--green)';
      $('studio-stream-label').textContent = `Live → ${dests.length} destination${dests.length > 1 ? 's' : ''}`;
      if ($('studio-live-badge')) $('studio-live-badge').style.display = '';
      stopStreamClock = makeClock(t => {
        $('studio-stream-timer').textContent = t;
        if ($('studio-live-clock')) $('studio-live-clock').textContent = t;
      });
    });
  }

  if (studioEndStream) {
    studioEndStream.addEventListener('click', async () => {
      if (streamMediaRecorder) {
        await new Promise(res => { streamMediaRecorder.addEventListener('stop', res, { once: true }); streamMediaRecorder.stop(); });
        streamMediaRecorder = null;
        engine.outputActive = false;
      }
      await window.creatorhub.studio.streamStop();
      if (stopStreamClock) { stopStreamClock(); stopStreamClock = null; }
      studioGoLive.disabled    = false;
      studioEndStream.disabled = true;
      $('studio-stream-dot').style.background = '';
      $('studio-stream-dot').className = 'status-dot disconnected';
      $('studio-stream-label').textContent = 'Not streaming';
      $('studio-stream-timer').textContent  = '';
      if ($('studio-live-badge')) $('studio-live-badge').style.display = 'none';
    });
  }

  // ── Video Editor Module ────────────────────────────────────────────────────
  function initVideoEditor() { // eslint-disable-line max-lines-per-function
    const canvas        = $('ve-timeline-canvas');
    const overlayCanvas = $('ve-overlay-canvas');
    const video         = $('ve-video');

    // ── State ──────────────────────────────────────────────────────────────────
    // veClips: {id, filePath, fileName, fileUrl, fileDuration, track (0=V1 seq, 1+=V2+ free),
    //           timelineStart, timelineDuration, inPoint, outPoint, speed, volume,
    //           audioDetached, x, y, w, h, waveform, thumbnails, textOverlays, dims}
    // veAudioClips: {id, sourceClipId, filePath, fileName, fileUrl, fileDuration,
    //                audioTrack, timelineStart, timelineDuration, inPoint, outPoint, volume, waveform}
    let veClips        = [];
    let veAudioClips   = [];
    let veSelId        = null;
    let vePlayPos      = 0;
    let veActiveClip   = null;
    let veTotalDur     = 0;
    let veFormat       = 'mp4';
    let veDragging     = null;
    let veDragClip     = null;
    let veDragOffsetSec = 0;
    let veDragTargetTrack = null;
    let veDragCurrentX = 0;
    let veDragCurrentY = 0;
    let veRafId        = null;
    let transVideoReady = false; // true once transVideo has decoded at least one frame
    let veLoop         = false;
    let veFadeInEn     = false, veFadeInDur  = 0.5;
    let veFadeOutEn    = false, veFadeOutDur = 0.5;
    let veScrubTimer   = null;
    let veZoom         = 1;
    let veScrollOff    = 0;
    let veCanvasW      = 1920;
    let veCanvasH      = 1080;
    let veSnapPos      = null;
    let veHistory      = [];
    let veHistIdx      = -1;
    let veHypeMarkers  = [];
    let veTextOverlays = [];
    let veOvDrag       = null;
    let veIdSeq        = 0;
    let veProjectName  = 'Untitled Project';
    let veProjectPath  = null;
    let veTimelineBg   = null;   // offscreen canvas cache for static timeline content

    // ── Preview layer pool (V2+ tracks) ────────────────────────────────────────
    const MAX_LAYERS = 5;
    const veLayers = [];
    const layersContainer = $('ve-layers-container');
    for (let li = 0; li < MAX_LAYERS; li++) {
      const wrap = document.createElement('div');
      wrap.className = 've-ov-wrap';
      wrap.dataset.li = String(li);
      wrap.style.display = 'none';
      const vid = document.createElement('video');
      vid.muted = true; vid.playsInline = true;
      const ph = document.createElement('div');
      ph.className = 've-ov-placeholder';
      ph.innerHTML = '<span class="ve-ov-placeholder-hint">outside active range</span>';
      ['nw','ne','sw','se'].forEach(corner => {
        const h = document.createElement('div'); h.className = `ve-ov-handle ${corner}`; wrap.appendChild(h);
      });
      wrap.appendChild(vid); wrap.appendChild(ph);
      layersContainer.appendChild(wrap);
      veLayers.push({ wrap, video: vid, placeholder: ph });
    }
    layersContainer.style.pointerEvents = 'none';

    // ── Audio element pool (detached audio tracks) ─────────────────────────────
    const MAX_AUDIO_TRACKS = 4;
    const veAudioEls = [];
    for (let ai = 0; ai < MAX_AUDIO_TRACKS; ai++) { veAudioEls.push(new Audio()); }

    // ── Timeline geometry ──────────────────────────────────────────────────────
    const LW = 48, RULER_H = 22, VID_H = 50, AUD_H = 28, TRACK_GAP = 8, HANDLE_W = 12;
    function numVideoTracks() {
      const mx = veClips.reduce((m, c) => Math.max(m, c.track || 0), 0);
      return mx + 2;
    }
    function numAudioTracks() {
      if (!veAudioClips.length) return 1;
      const mx = veAudioClips.reduce((m, a) => Math.max(m, a.audioTrack || 0), 0);
      return mx + 2;
    }
    function videoRowY(track) { return RULER_H + 6 + track * VID_H; }
    function audioRowY(track) { return RULER_H + 6 + numVideoTracks() * VID_H + TRACK_GAP + track * AUD_H; }
    function totalCanvasH()   { return audioRowY(numAudioTracks()) + 8; }
    function getVideoTrackAtY(y) {
      const n = numVideoTracks();
      for (let t = 0; t < n; t++) { const ry = videoRowY(t); if (y >= ry && y < ry + VID_H) return t; }
      return null;
    }
    function getAudioTrackAtY(y) {
      const n = numAudioTracks();
      for (let t = 0; t < n; t++) { const ry = audioRowY(t); if (y >= ry && y < ry + AUD_H) return t; }
      return null;
    }

    function tw() { return canvas.width - LW; }
    function visibleDur() { return veTotalDur > 0 ? (veTotalDur / veZoom) * 1.25 : 60; }
    function timeToX(t)   { return LW + (t - veScrollOff) / visibleDur() * tw(); }
    function xToTime(x)   { return veScrollOff + (x - LW) / tw() * visibleDur(); }

    function getSnapPos(rawStart, clipDur, excludeId) {
      const thresh = visibleDur() * 0.015;
      const points = [0, vePlayPos];
      for (const c of veClips) {
        if (c.id === excludeId) continue;
        points.push(c.timelineStart, c.timelineStart + c.timelineDuration);
      }
      for (const a of veAudioClips) {
        if (a.id === excludeId) continue;
        points.push(a.timelineStart, a.timelineStart + a.timelineDuration);
      }
      let best = thresh, snapped = rawStart, indicator = null;
      for (const p of points) {
        const d1 = Math.abs(rawStart - p);
        if (d1 < best) { best = d1; snapped = p; indicator = p; }
        const d2 = Math.abs((rawStart + clipDur) - p);
        if (d2 < best) { best = d2; snapped = p - clipDur; indicator = p; }
      }
      veSnapPos = indicator;
      return Math.max(0, snapped);
    }

    function updateCanvasAspectRatio() {
      const c = $('ve-video-container');
      if (!c) return;
      c.style.aspectRatio = veCanvasW + '/' + veCanvasH;
      const sel = $('ve-canvas-select');
      if (sel) sel.value = veCanvasW + 'x' + veCanvasH;
    }

    function clampScroll() {
      const maxOff = Math.max(0, veTotalDur - visibleDur());
      veScrollOff = Math.max(0, Math.min(maxOff, veScrollOff));
    }

    function veSecsToHMS(s) {
      s = Math.max(0, s || 0);
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    }
    function veStrToSecs(str) {
      const p = (str || '').split(':').map(Number);
      if (p.length === 3) return p[0]*3600 + p[1]*60 + p[2];
      if (p.length === 2) return p[0]*60 + p[1];
      return parseFloat(str) || 0;
    }

    // ── Clip helpers ──────────────────────────────────────────────────────────
    function genId() { return 've' + (++veIdSeq); }

    function computeLayout() {
      // All clips keep their own timelineStart — just recalculate duration
      for (const c of veClips) {
        c.timelineDuration = (c.outPoint - c.inPoint) / (c.speed || 1);
      }
      // Audio clips: recalc duration
      for (const a of veAudioClips) {
        a.timelineDuration = (a.outPoint - a.inPoint);
      }
      const allEnds = [
        ...veClips.map(c => c.timelineStart + c.timelineDuration),
        ...veAudioClips.map(a => a.timelineStart + a.timelineDuration),
      ];
      veTotalDur = allEnds.length ? Math.max(...allEnds) : 0;
      $('ve-info-duration').textContent = veSecsToHMS(veTotalDur);
      $('ve-info-clips').textContent    = String(veClips.length);
    }

    function getClipAt(timelinePos) {
      // Only searches V1 (track 0) clips for sequential playback
      const v1 = veClips.filter(c => !c.track);
      for (const c of v1) {
        if (timelinePos >= c.timelineStart && timelinePos < c.timelineStart + c.timelineDuration) return c;
      }
      return v1.length ? v1[v1.length - 1] : null;
    }

    function selectedClip()      { return veClips.find(c => c.id === veSelId) || null; }
    function selectedAudioClip() { return veAudioClips.find(a => a.id === veSelId) || null; }

    // ── Keyframe interpolation ────────────────────────────────────────────────
    // Returns the interpolated {x,y,w,h} for a V2+ clip at a given timeline position.
    // Falls back to clip.x/y/w/h if no keyframes exist.
    function getClipPosAt(clip, timelinePos) {
      const kfs = clip.keyframes;
      if (!kfs || !kfs.length) return { x: clip.x ?? 50, y: clip.y ?? 5, w: clip.w ?? 35, h: clip.h ?? 35 };
      const t = timelinePos - clip.timelineStart;
      const sorted = [...kfs].sort((a, b) => a.time - b.time);
      if (t <= sorted[0].time) return { x: sorted[0].x, y: sorted[0].y, w: sorted[0].w, h: sorted[0].h };
      const last = sorted[sorted.length - 1];
      if (t >= last.time) return { x: last.x, y: last.y, w: last.w, h: last.h };
      for (let i = 0; i < sorted.length - 1; i++) {
        if (t >= sorted[i].time && t < sorted[i + 1].time) {
          const a = (t - sorted[i].time) / (sorted[i + 1].time - sorted[i].time);
          // Ease-in-out
          const e = a < 0.5 ? 2 * a * a : 1 - Math.pow(-2 * a + 2, 2) / 2;
          const lerp = (p, q) => p + (q - p) * e;
          return { x: lerp(sorted[i].x, sorted[i+1].x), y: lerp(sorted[i].y, sorted[i+1].y),
                   w: lerp(sorted[i].w, sorted[i+1].w), h: lerp(sorted[i].h, sorted[i+1].h) };
        }
      }
      return { x: clip.x ?? 50, y: clip.y ?? 5, w: clip.w ?? 35, h: clip.h ?? 35 };
    }

    // Record a keyframe at the current playhead position for a V2+ clip.
    function addKeyframeToClip(clip) {
      if (!clip || clip.track === 0) return;
      if (!clip.keyframes) clip.keyframes = [];
      const t = Math.max(0, Math.min(clip.timelineDuration, vePlayPos - clip.timelineStart));
      const pos = getClipPosAt(clip, vePlayPos);
      // Replace any keyframe within 0.15s of current time
      clip.keyframes = clip.keyframes.filter(k => Math.abs(k.time - t) > 0.15);
      clip.keyframes.push({ time: parseFloat(t.toFixed(3)), x: pos.x, y: pos.y, w: pos.w, h: pos.h });
      clip.keyframes.sort((a, b) => a.time - b.time);
      pushHistory(); refreshClipPanel(); drawTimeline();
      showToast('◆ Keyframe recorded');
    }

    function deleteKeyframeFromClip(clip, idx) {
      if (!clip || !clip.keyframes) return;
      clip.keyframes.splice(idx, 1);
      pushHistory(); refreshClipPanel(); drawTimeline();
    }

    // Get or create a keyframe at the current time for live-drag editing.
    // If clip has no keyframes this returns null (static mode).
    function getOrCreateDragKeyframe(clip) {
      if (!clip.keyframes || !clip.keyframes.length) return null;
      const t = parseFloat(Math.max(0, Math.min(clip.timelineDuration, vePlayPos - clip.timelineStart)).toFixed(3));
      let kf = clip.keyframes.find(k => Math.abs(k.time - t) <= 0.15);
      if (!kf) {
        const pos = getClipPosAt(clip, vePlayPos);
        kf = { time: t, x: pos.x, y: pos.y, w: pos.w, h: pos.h };
        clip.keyframes.push(kf);
        clip.keyframes.sort((a, b) => a.time - b.time);
      }
      return kf;
    }

    // ── History ───────────────────────────────────────────────────────────────
    // Strip non-serializable / bulky properties before JSON.stringify.
    // Waveform (Float32Array ~600 values) and thumbnails (Image objects) are
    // rebuilt lazily and must not pollute the history buffer.
    function _serializeClip(c) {
      const { waveform, thumbnails, ...rest } = c; return rest;
    }
    function _serializeAudio(a) {
      const { waveform, ...rest } = a; return rest;
    }

    function splitClipsAtPlayhead() {
      const t = vePlayPos;
      let didSplit = false;
      const newClips = [];
      for (const clip of veClips) {
        const start = clip.timelineStart;
        const end   = clip.timelineStart + clip.timelineDuration;
        // Must be strictly inside — not at the very edges
        if (t <= start + 0.02 || t >= end - 0.02) { newClips.push(clip); continue; }
        const speed       = clip.speed || 1;
        const splitInFile = clip.inPoint + (t - start) * speed;
        const splitLocalT = t - start; // time relative to clip start, in timeline seconds
        // Split keyframes: left gets kfs before split, right gets kfs after (times shifted)
        const kfs = clip.keyframes || [];
        const leftKfs  = kfs.filter(k => k.time <  splitLocalT).map(k => ({ ...k }));
        const rightKfs = kfs.filter(k => k.time >= splitLocalT).map(k => ({ ...k, time: k.time - splitLocalT }));
        // Left half — same clip, outPoint moved to split
        const left = { ...clip, outPoint: splitInFile, keyframes: leftKfs };
        // Right half — new id, inPoint moved to split, timelineStart at playhead
        const right = {
          ...clip,
          id:            'c' + Date.now() + Math.random().toString(36).slice(2),
          inPoint:       splitInFile,
          outPoint:      clip.outPoint,
          timelineStart: t,
          keyframes:     rightKfs,
          thumbnails:    clip.thumbnails ? [...clip.thumbnails] : [],
          waveform:      clip.waveform   ? clip.waveform        : null,
        };
        newClips.push(left, right);
        didSplit = true;
      }
      // Split detached audio clips too
      const newAudio = [];
      for (const a of veAudioClips) {
        const start = a.timelineStart;
        const end   = a.timelineStart + a.timelineDuration;
        if (t <= start + 0.02 || t >= end - 0.02) { newAudio.push(a); continue; }
        const splitInFile = a.inPoint + (t - start);
        const left  = { ...a, outPoint: splitInFile };
        const right = {
          ...a,
          id:            'a' + Date.now() + Math.random().toString(36).slice(2),
          inPoint:       splitInFile,
          timelineStart: t,
          waveform:      a.waveform ? a.waveform : null,
        };
        newAudio.push(left, right);
        didSplit = true;
      }
      if (!didSplit) return;
      veClips      = newClips;
      veAudioClips = newAudio;
      computeLayout(); pushHistory();
      veTimelineDirty = true; drawTimeline(); syncAllLayers();
      showToast('Split at ' + veSecsToHMS(t));
    }

    function pushHistory() {
      veHistory = veHistory.slice(0, veHistIdx + 1);
      veHistory.push(JSON.stringify({
        clips:      veClips.map(_serializeClip),
        audioClips: veAudioClips.map(_serializeAudio),
        overlays:   veTextOverlays,
      }));
      veHistIdx = veHistory.length - 1;
      updateUndoRedo();
    }
    function updateUndoRedo() {
      $('ve-btn-undo').disabled = veHistIdx <= 0;
      $('ve-btn-redo').disabled = veHistIdx >= veHistory.length - 1;
    }
    function applySnapshot(snap) {
      const s = JSON.parse(snap);
      // Reattach waveform/thumbnail data from the live arrays (unchanged by undo/redo)
      const clipCache  = new Map(veClips.map(c => [c.id, c]));
      const audioCache = new Map(veAudioClips.map(a => [a.id, a]));
      veClips = s.clips.map(c => ({
        ...c,
        waveform:   clipCache.get(c.id)?.waveform   ?? null,
        thumbnails: clipCache.get(c.id)?.thumbnails ?? [],
      }));
      veAudioClips = (s.audioClips || []).map(a => ({
        ...a,
        waveform: audioCache.get(a.id)?.waveform ?? null,
      }));
      veTextOverlays = s.overlays;
      veTimelineBg = null; // invalidate static bg cache
      computeLayout(); clampScroll();
      refreshClipPanel(); renderTextList();
      drawTimeline(); updateTimecode(); updateAllLayerVideos();
    }

    // ── Waveform & thumbnails ─────────────────────────────────────────────────
    async function loadWaveform(clip) {
      try {
        const buf = await window.creatorhub.app.readFile(clip.filePath);
        const audioCtx = new AudioContext();
        const decoded  = await audioCtx.decodeAudioData(buf.buffer);
        audioCtx.close();
        const ch = decoded.getChannelData(0);
        const SAMPLES = 600;
        const block = Math.floor(ch.length / SAMPLES);
        const peaks = new Float32Array(SAMPLES);
        for (let i = 0; i < SAMPLES; i++) {
          let max = 0;
          for (let j = 0; j < block; j++) { const v = Math.abs(ch[i*block+j]); if (v > max) max = v; }
          peaks[i] = max;
        }
        clip.waveform = peaks;
      } catch { clip.waveform = null; }
      drawTimeline();
    }

    async function loadThumbnails(clip) {
      const count = 16;
      try {
        const thumbs = await window.creatorhub.videoeditor.getThumbnails(clip.filePath, count, clip.fileDuration);
        clip.thumbnails = thumbs.map(url => {
          if (!url) return null;
          const img = new Image(); img.src = url; return img;
        });
      } catch { clip.thumbnails = []; }
      drawTimeline();
    }

    // ── Timeline drawing ──────────────────────────────────────────────────────
    function rrect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
      ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
      ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    }

    // drawTimeline(fastPath) — fastPath=true skips static bg rebuild (playhead-only update during tick)
    function drawTimeline(fastPath = false) {
      if (!canvas || canvas.width < 10) return;
      const neededH = totalCanvasH();
      if (Math.abs(canvas.height - neededH) > 2) {
        canvas.height = neededH;
        veTimelineBg = null; // size changed — force rebuild
      }
      const W = canvas.width, H = canvas.height;
      const ctx = canvas.getContext('2d');

      // ── Rebuild static background only when not in fast playback path ─────────
      if (!fastPath || !veTimelineBg || veTimelineBg.width !== W || veTimelineBg.height !== H) {
        if (!veTimelineBg || veTimelineBg.width !== W || veTimelineBg.height !== H) {
          veTimelineBg = document.createElement('canvas');
          veTimelineBg.width = W; veTimelineBg.height = H;
        }
        const bgCtx = veTimelineBg.getContext('2d');
        bgCtx.clearRect(0, 0, W, H);

        // Background
        bgCtx.fillStyle = '#0f1520'; bgCtx.fillRect(0, 0, W, H);
        bgCtx.fillStyle = '#151d2b'; bgCtx.fillRect(0, 0, LW, H);

        // Ruler
        bgCtx.fillStyle = '#151d2b'; bgCtx.fillRect(LW, 0, tw(), RULER_H);
        bgCtx.strokeStyle = 'rgba(255,255,255,0.06)'; bgCtx.lineWidth = 1;
        bgCtx.beginPath(); bgCtx.moveTo(LW, RULER_H); bgCtx.lineTo(W, RULER_H); bgCtx.stroke();
        const vd = visibleDur();
        if (vd > 0) {
          const rawInterval = vd / 7;
          const candidates = [0.5,1,2,5,10,15,30,60,120,300,600,1800,3600];
          const interval = candidates.find(i => i >= rawInterval) || 3600;
          bgCtx.fillStyle = 'rgba(232,237,245,0.28)'; bgCtx.font = '9px monospace'; bgCtx.textAlign = 'left';
          for (let t = Math.ceil(veScrollOff/interval)*interval; t <= veScrollOff+vd+interval; t += interval) {
            const x = timeToX(t); if (x < LW || x > W) continue;
            bgCtx.strokeStyle = 'rgba(255,255,255,0.15)'; bgCtx.lineWidth = 1;
            bgCtx.beginPath(); bgCtx.moveTo(x,RULER_H-5); bgCtx.lineTo(x,RULER_H); bgCtx.stroke();
            const lbl = vd >= 3600 ? veSecsToHMS(t) : `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.round(t%60)).padStart(2,'0')}`;
            bgCtx.fillText(lbl, Math.min(x+2,W-40), RULER_H-7);
          }
        }

        // Separator line
        bgCtx.strokeStyle = 'rgba(255,255,255,0.06)'; bgCtx.lineWidth = 1;
        bgCtx.beginPath(); bgCtx.moveTo(LW,0); bgCtx.lineTo(LW,H); bgCtx.stroke();

        const nVT = numVideoTracks(), nAT = numAudioTracks();

        // Video track rows
        for (let track = 0; track < nVT; track++) {
          const ry = videoRowY(track);
          const label = track === 0 ? 'V1' : `V${track+1}`;
          const isDropTarget = veDragging === 'clipMove' && veDragTargetTrack === track && veDragClip && (veDragClip.track || 0) !== track;

          bgCtx.fillStyle = isDropTarget ? 'rgba(0,229,255,0.07)' : (track % 2 === 0 ? '#0d1118' : '#0a0e14');
          bgCtx.fillRect(LW, ry, tw(), VID_H);
          bgCtx.strokeStyle = 'rgba(255,255,255,0.04)'; bgCtx.lineWidth = 1;
          bgCtx.beginPath(); bgCtx.moveTo(LW, ry+VID_H); bgCtx.lineTo(W, ry+VID_H); bgCtx.stroke();
          bgCtx.fillStyle = isDropTarget ? 'rgba(0,229,255,0.6)' : 'rgba(232,237,245,0.2)';
          bgCtx.font = 'bold 9px sans-serif'; bgCtx.textAlign = 'center';
          bgCtx.fillText(label, LW/2, ry + VID_H/2 + 3);

          if (isDropTarget && veDragClip) {
            const ghostStart = Math.max(0, xToTime(veDragCurrentX) - veDragOffsetSec);
            const gx1 = timeToX(ghostStart), gx2 = timeToX(ghostStart + veDragClip.timelineDuration);
            bgCtx.globalAlpha = 0.55;
            bgCtx.fillStyle = 'rgba(0,229,255,0.25)'; bgCtx.fillRect(Math.max(LW,gx1), ry+2, gx2-gx1, VID_H-4);
            bgCtx.strokeStyle = '#00e5ff'; bgCtx.lineWidth = 2;
            rrect(bgCtx, gx1, ry+2, gx2-gx1, VID_H-4, 3); bgCtx.stroke();
            bgCtx.globalAlpha = 1;
          }
        }

        // Audio section divider
        const audSecY = audioRowY(0) - TRACK_GAP;
        bgCtx.strokeStyle = 'rgba(255,255,255,0.06)'; bgCtx.lineWidth = 1;
        bgCtx.beginPath(); bgCtx.moveTo(0, audSecY+TRACK_GAP/2); bgCtx.lineTo(W, audSecY+TRACK_GAP/2); bgCtx.stroke();

        // Audio track rows
        for (let track = 0; track < nAT; track++) {
          const ry = audioRowY(track);
          bgCtx.fillStyle = track % 2 === 0 ? '#090d14' : '#070b10';
          bgCtx.fillRect(LW, ry, tw(), AUD_H);
          bgCtx.strokeStyle = 'rgba(255,255,255,0.03)'; bgCtx.lineWidth = 1;
          bgCtx.beginPath(); bgCtx.moveTo(LW, ry+AUD_H); bgCtx.lineTo(W, ry+AUD_H); bgCtx.stroke();
          bgCtx.fillStyle = 'rgba(139,92,246,0.35)';
          bgCtx.font = 'bold 9px sans-serif'; bgCtx.textAlign = 'center';
          bgCtx.fillText(`A${track+1}`, LW/2, ry + AUD_H/2 + 3);
        }

        // Draw video clips
        for (const clip of veClips) {
          const track = clip.track || 0;
          const ry = videoRowY(track);
          const cx1 = timeToX(clip.timelineStart);
          const cx2 = timeToX(clip.timelineStart + clip.timelineDuration);
          const cw  = cx2 - cx1;
          if (cx2 < LW || cx1 > W) continue;
          const isSel = clip.id === veSelId;

          bgCtx.save();
          bgCtx.beginPath(); bgCtx.rect(Math.max(LW,cx1), ry, Math.min(cw, W-Math.max(LW,cx1)), VID_H); bgCtx.clip();
          if (clip.thumbnails && clip.thumbnails.length) {
            const thumbW = cw / clip.thumbnails.length;
            clip.thumbnails.forEach((img, ti) => {
              if (!img || !img.complete || !img.naturalWidth) return;
              const tx = cx1 + ti*thumbW; if (tx+thumbW < LW || tx > W) return;
              try { bgCtx.drawImage(img, tx, ry, thumbW+1, VID_H); } catch {}
            });
            bgCtx.fillStyle = isSel ? 'rgba(0,229,255,0.1)' : 'rgba(0,0,0,0.32)';
            bgCtx.fillRect(Math.max(LW,cx1), ry, cw, VID_H);
          } else {
            const g = bgCtx.createLinearGradient(cx1,0,cx2,0);
            g.addColorStop(0, isSel ? 'rgba(0,229,255,0.28)' : 'rgba(0,229,255,0.16)');
            g.addColorStop(1, isSel ? 'rgba(139,92,246,0.28)' : 'rgba(139,92,246,0.16)');
            bgCtx.fillStyle = g; bgCtx.fillRect(Math.max(LW,cx1), ry, cw, VID_H);
            bgCtx.strokeStyle = 'rgba(0,0,0,0.18)'; bgCtx.lineWidth = 1;
            for (let x = cx1+40; x < cx2-2; x += 40) {
              bgCtx.beginPath(); bgCtx.moveTo(x,ry+1); bgCtx.lineTo(x,ry+VID_H-1); bgCtx.stroke();
            }
          }
          bgCtx.restore();

          bgCtx.strokeStyle = isSel ? '#00e5ff' : 'rgba(0,229,255,0.3)';
          bgCtx.lineWidth = isSel ? 2 : 1;
          rrect(bgCtx, cx1, ry, cw, VID_H, 4); bgCtx.stroke();

          bgCtx.save();
          bgCtx.beginPath(); bgCtx.rect(Math.max(LW,cx1)+4, ry, cw-8, VID_H); bgCtx.clip();
          bgCtx.fillStyle = 'rgba(232,237,245,0.75)'; bgCtx.font = 'bold 9px sans-serif'; bgCtx.textAlign = 'left';
          bgCtx.fillText(clip.fileName, Math.max(LW,cx1)+6, ry+13);
          if (clip.speed !== 1) { bgCtx.fillStyle = '#f59e0b'; bgCtx.fillText(`${clip.speed}×`, Math.max(LW,cx1)+6, ry+24); }
          if (clip.audioDetached) { bgCtx.fillStyle = '#a78bfa'; bgCtx.fillText('⚟ audio detached', Math.max(LW,cx1)+6, ry+35); }
          if (clip.muted) { bgCtx.fillStyle = '#f87171'; bgCtx.fillText('🔇 muted', Math.max(LW,cx1)+6, ry+35 + (clip.audioDetached ? 11 : 0)); }
          bgCtx.restore();

          // Transition-in indicator (yellow bar at start of clip)
          if (clip.track === 0 && clip.transitionIn) {
            const tDurPx = (clip.transitionIn.duration / (clip.timelineDuration || 1)) * cw;
            bgCtx.fillStyle = 'rgba(251,191,36,0.25)';
            bgCtx.fillRect(Math.max(LW, cx1), ry + 2, Math.min(tDurPx, cw - 4), VID_H - 4);
            bgCtx.fillStyle = '#fbbf24';
            bgCtx.font = 'bold 8px sans-serif'; bgCtx.textAlign = 'left';
            bgCtx.fillText('T↓', Math.max(LW, cx1) + 2, ry + VID_H - 5);
          }

          if (!clip.audioDetached) {
            const aud_ry = ry + VID_H - 14;
            bgCtx.save();
            bgCtx.beginPath(); bgCtx.rect(Math.max(LW,cx1), aud_ry, cw, 12); bgCtx.clip();
            bgCtx.fillStyle = isSel ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.18)';
            bgCtx.fillRect(Math.max(LW,cx1), aud_ry, cw, 12);
            if (clip.waveform) {
              const peaks = clip.waveform, maxP = Math.max(...peaks, 0.001);
              bgCtx.fillStyle = isSel ? 'rgba(139,92,246,0.9)' : 'rgba(139,92,246,0.6)';
              const sw = cw / peaks.length;
              for (let si = 0; si < peaks.length; si++) {
                const sx = cx1 + si*sw; if (sx+sw < LW || sx > W) continue;
                const bh = (peaks[si]/maxP) * 8;
                bgCtx.fillRect(sx, aud_ry + (12-bh)/2, Math.max(1, sw-0.5), bh);
              }
            }
            bgCtx.restore();
          }

          if (isSel) {
            const lx = timeToX(clip.timelineStart);
            const rx2 = timeToX(clip.timelineStart + clip.timelineDuration);
            bgCtx.fillStyle = '#00e5ff';
            rrect(bgCtx, lx-HANDLE_W/2, ry, HANDLE_W, VID_H, 3); bgCtx.fill();
            rrect(bgCtx, rx2-HANDLE_W/2, ry, HANDLE_W, VID_H, 3); bgCtx.fill();
            bgCtx.fillStyle = '#0a0e14'; bgCtx.font = 'bold 11px monospace'; bgCtx.textAlign = 'center';
            bgCtx.fillText('⋮', lx, ry+VID_H/2+4);
            bgCtx.fillText('⋮', rx2, ry+VID_H/2+4);
          }

          if (clip.track > 0 && clip.keyframes && clip.keyframes.length) {
            for (const kf of clip.keyframes) {
              const kx = timeToX(clip.timelineStart + kf.time);
              if (kx < LW || kx > W) continue;
              const ky = ry + VID_H / 2;
              bgCtx.save();
              bgCtx.translate(kx, ky); bgCtx.rotate(Math.PI / 4);
              const ks = isSel ? 5 : 4;
              bgCtx.fillStyle = isSel ? '#f59e0b' : 'rgba(245,158,11,0.7)';
              bgCtx.strokeStyle = '#0a0e14'; bgCtx.lineWidth = 1;
              bgCtx.fillRect(-ks/2, -ks/2, ks, ks); bgCtx.strokeRect(-ks/2, -ks/2, ks, ks);
              bgCtx.restore();
            }
          }

          if (!clip.track) {
            const gx = timeToX(clip.timelineStart);
            if (gx > LW+2) {
              bgCtx.strokeStyle = 'rgba(255,255,255,0.1)'; bgCtx.lineWidth = 1;
              bgCtx.beginPath(); bgCtx.moveTo(gx, videoRowY(0)); bgCtx.lineTo(gx, videoRowY(0)+VID_H); bgCtx.stroke();
            }
          }
        }

        // Draw audio clips (detached)
        for (const a of veAudioClips) {
          const ry  = audioRowY(a.audioTrack || 0);
          const ax1 = timeToX(a.timelineStart);
          const ax2 = timeToX(a.timelineStart + a.timelineDuration);
          const aw  = ax2 - ax1;
          if (ax2 < LW || ax1 > W) continue;
          const isSel = a.id === veSelId;

          bgCtx.save();
          bgCtx.beginPath(); bgCtx.rect(Math.max(LW,ax1), ry, Math.min(aw, W-Math.max(LW,ax1)), AUD_H); bgCtx.clip();
          bgCtx.fillStyle = isSel ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.18)';
          bgCtx.fillRect(Math.max(LW,ax1), ry, aw, AUD_H);
          if (a.waveform) {
            const peaks = a.waveform, maxP = Math.max(...peaks, 0.001);
            bgCtx.fillStyle = isSel ? 'rgba(167,139,250,0.9)' : 'rgba(139,92,246,0.65)';
            const sw = aw / peaks.length;
            for (let si = 0; si < peaks.length; si++) {
              const sx = ax1 + si*sw; if (sx+sw < LW || sx > W) continue;
              const bh = (peaks[si]/maxP) * (AUD_H-6);
              bgCtx.fillRect(sx, ry + (AUD_H-bh)/2, Math.max(1,sw-0.5), bh);
            }
          } else {
            bgCtx.fillStyle = 'rgba(139,92,246,0.45)';
            for (let x = ax1+4; x < ax2-2; x += 6) {
              const h = (Math.abs(Math.sin(x*0.17))*0.7+0.3)*(AUD_H-8);
              bgCtx.fillRect(x, ry+(AUD_H-h)/2, 3, h);
            }
          }
          bgCtx.restore();
          bgCtx.strokeStyle = isSel ? '#a78bfa' : 'rgba(139,92,246,0.4)';
          bgCtx.lineWidth = isSel ? 2 : 1;
          rrect(bgCtx, ax1, ry, aw, AUD_H, 3); bgCtx.stroke();
          bgCtx.save();
          bgCtx.beginPath(); bgCtx.rect(Math.max(LW,ax1)+3, ry, aw-6, AUD_H); bgCtx.clip();
          bgCtx.fillStyle = 'rgba(232,237,245,0.6)'; bgCtx.font = '9px sans-serif'; bgCtx.textAlign = 'left';
          bgCtx.fillText(a.fileName, Math.max(LW,ax1)+5, ry+AUD_H/2+3);
          bgCtx.restore();
          if (isSel) {
            bgCtx.fillStyle = '#a78bfa';
            rrect(bgCtx, ax1-HANDLE_W/2, ry, HANDLE_W, AUD_H, 3); bgCtx.fill();
            rrect(bgCtx, ax2-HANDLE_W/2, ry, HANDLE_W, AUD_H, 3); bgCtx.fill();
            bgCtx.fillStyle = '#0a0e14'; bgCtx.font = 'bold 10px monospace'; bgCtx.textAlign = 'center';
            bgCtx.fillText('⋮', ax1, ry+AUD_H/2+3); bgCtx.fillText('⋮', ax2, ry+AUD_H/2+3);
          }
        }

        // Hype markers
        for (const m of veHypeMarkers) {
          const mx = timeToX(m.timelinePos); if (mx < LW || mx > W) continue;
          bgCtx.strokeStyle = `rgba(245,158,11,${0.5+m.intensity*0.5})`; bgCtx.lineWidth = 2;
          bgCtx.beginPath(); bgCtx.moveTo(mx, RULER_H); bgCtx.lineTo(mx, H); bgCtx.stroke();
          bgCtx.fillStyle = '#f59e0b';
          bgCtx.beginPath(); bgCtx.arc(mx, RULER_H+6, 4, 0, Math.PI*2); bgCtx.fill();
        }
      }

      // ── Blit cached background + draw dynamic playhead ────────────────────────
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(veTimelineBg, 0, 0);

      const phX = timeToX(vePlayPos);
      if (phX >= LW && phX <= W) {
        ctx.strokeStyle = '#ff3355'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(phX, 0); ctx.lineTo(phX, H); ctx.stroke();
        ctx.fillStyle = '#ff3355';
        ctx.beginPath(); ctx.moveTo(phX-5,RULER_H-8); ctx.lineTo(phX+5,RULER_H-8); ctx.lineTo(phX,RULER_H+2); ctx.closePath(); ctx.fill();
      }
      if (veSnapPos !== null) {
        const sx = timeToX(veSnapPos);
        if (sx >= LW && sx <= W) {
          ctx.save();
          ctx.strokeStyle = 'rgba(0,229,255,0.7)'; ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          ctx.beginPath(); ctx.moveTo(sx, RULER_H); ctx.lineTo(sx, H); ctx.stroke();
          ctx.restore();
        }
      }
    }

    // ── Canvas/overlay resize ─────────────────────────────────────────────────
    function resizeCanvas() {
      const wrap = canvas.parentElement;
      if (!wrap) return;
      canvas.width  = wrap.clientWidth;
      canvas.height = totalCanvasH();
      drawTimeline();
    }

    function resizeOverlay() {
      if (!overlayCanvas) return;
      const vc = overlayCanvas.parentElement;
      if (!vc) return;
      overlayCanvas.width  = vc.clientWidth;
      overlayCanvas.height = vc.clientHeight;
    }

    function updateTimecode() {
      $('ve-timecode').textContent = veSecsToHMS(vePlayPos) + ' / ' + veSecsToHMS(veTotalDur);
    }

    // ── Layer video sync ──────────────────────────────────────────────────────
    // syncAllLayers: called every frame from tick() — updates CSS position AND video state/drift
    function syncAllLayers() {
      const isPlaying = !video.paused;
      const pct = (v, lo=0, hi=100) => Math.max(lo, Math.min(hi, v));
      // ── V1 wrap positioning ─────────────────────────────────────────────────
      const v1Wrap     = $('ve-v1-wrap');
      const transWrap  = $('ve-v1-trans-wrap');
      const transVideo = $('ve-v1-trans-video');
      const v1Sorted   = veClips.filter(c => !c.track).sort((a, b) => a.timelineStart - b.timelineStart);
      const v1Active   = v1Sorted.find(c =>
        vePlayPos >= c.timelineStart && vePlayPos < c.timelineStart + c.timelineDuration);

      if (!v1Active) {
        v1Wrap.style.display = 'none';
        transWrap.style.display = 'none';
        if (!transVideo.paused) transVideo.pause();
        transVideoReady = false;
      } else {
        const tOffset    = vePlayPos - v1Active.timelineStart;
        const transIn    = v1Active.transitionIn;
        const inTransition = transIn && transIn.data && tOffset < transIn.duration;

        if (inTransition) {
          const tDur      = transIn.duration;
          const _tState   = teGetTransitionStateAt(transIn.data, tOffset);
          const toState   = _tState.to;
          const fromState = _tState.from;

          // TO layer — main v1Wrap
          v1Wrap.style.display   = 'block';
          v1Wrap.style.left      = pct(toState.x)       + '%';
          v1Wrap.style.top       = pct(toState.y)       + '%';
          v1Wrap.style.width     = pct(toState.w,  1)   + '%';
          v1Wrap.style.height    = pct(toState.h,  1)   + '%';
          v1Wrap.style.opacity   = (pct(toState.opacity, 0, 100) / 100).toFixed(3);
          v1Wrap.style.transform = `rotate(${toState.rotation}deg)`;
          v1Wrap.classList.toggle('ve-ov-selected', v1Active.id === veSelId);

          // FROM layer — transWrap with previous clip
          const prevClip = v1Sorted[v1Sorted.findIndex(c => c.id === v1Active.id) - 1];
          if (prevClip) {
            transWrap.style.display   = 'block';
            transWrap.style.left      = pct(fromState.x)      + '%';
            transWrap.style.top       = pct(fromState.y)      + '%';
            transWrap.style.width     = pct(fromState.w, 1)   + '%';
            transWrap.style.height    = pct(fromState.h, 1)   + '%';
            transWrap.style.opacity   = (pct(fromState.opacity, 0, 100) / 100).toFixed(3);
            transWrap.style.transform = `rotate(${fromState.rotation}deg)`;

            // FROM video is the last `tDur` seconds of prevClip
            const fromFileTime  = prevClip.outPoint - (tDur - tOffset) * (prevClip.speed || 1);
            const clampedFromTime = Math.max(prevClip.inPoint, Math.min(prevClip.outPoint, fromFileTime));
            transVideo.volume = 0; // mute FROM — only TO audio plays
            if (transVideo.src !== prevClip.fileUrl) {
              transVideoReady = false;
              transVideo.src = prevClip.fileUrl;
              transVideo.load();
              transVideo.playbackRate = prevClip.speed || 1;
              transVideo.addEventListener('loadeddata', () => {
                transVideoReady = true;
                transVideo.currentTime = clampedFromTime;
                if (isPlaying) transVideo.play().catch(() => {});
              }, { once: true });
            } else if (transVideoReady) {
              if (!isPlaying) {
                if (!transVideo.paused) transVideo.pause();
                if (Math.abs(transVideo.currentTime - clampedFromTime) > 0.05) transVideo.currentTime = clampedFromTime;
              } else {
                if (transVideo.paused) { transVideo.currentTime = clampedFromTime; transVideo.play().catch(() => {}); }
                else if (Math.abs(transVideo.currentTime - clampedFromTime) > 0.25) transVideo.currentTime = clampedFromTime;
              }
            }
            // hide transWrap until video has decoded a frame to avoid black flash
            if (!transVideoReady) transWrap.style.display = 'none';
          } else {
            transWrap.style.display = 'none';
          }
        } else {
          // Normal — no active transition
          transWrap.style.display = 'none';
          if (!transVideo.paused) transVideo.pause();
          v1Wrap.style.opacity   = '';
          v1Wrap.style.transform = '';

          // Pre-roll: if the next clip has a transitionIn and we're within PREROLL of this clip ending,
          // silently load transVideo now so it's decoded and ready when the transition starts
          const PRE_ROLL = 0.75; // seconds before transition starts to begin loading
          const timeToEnd = (v1Active.timelineStart + v1Active.timelineDuration) - vePlayPos;
          const nextClip  = v1Sorted[v1Sorted.findIndex(c => c.id === v1Active.id) + 1];
          if (nextClip && nextClip.transitionIn && nextClip.transitionIn.data && timeToEnd <= PRE_ROLL) {
            if (transVideo.src !== v1Active.fileUrl) {
              transVideoReady = false;
              transVideo.src = v1Active.fileUrl;
              transVideo.load();
              transVideo.addEventListener('loadeddata', () => { transVideoReady = true; }, { once: true });
            }
          }
          const kPos = getClipPosAt(v1Active, vePlayPos);
          v1Wrap.style.display  = 'block';
          v1Wrap.style.left     = pct(kPos.x)    + '%';
          v1Wrap.style.top      = pct(kPos.y)    + '%';
          v1Wrap.style.width    = pct(kPos.w, 5) + '%';
          v1Wrap.style.height   = pct(kPos.h, 5) + '%';
          v1Wrap.classList.toggle('ve-ov-selected', v1Active.id === veSelId);
        }
      }
      // ── V2+ layers ──────────────────────────────────────────────────────────
      for (let li = 0; li < MAX_LAYERS; li++) {
        const trackIdx   = li + 1;
        const layer      = veLayers[li];
        const activeClip  = veClips.find(c => c.track === trackIdx &&
          vePlayPos >= c.timelineStart && vePlayPos < c.timelineStart + c.timelineDuration);
        const selClip     = veClips.find(c => c.id === veSelId && c.track === trackIdx);
        const displayClip = activeClip; // only show when playhead is inside the clip

        if (!displayClip) {
          layer.wrap.style.display = 'none';
          if (!layer.video.paused) layer.video.pause();
          continue;
        }

        // ── CSS position / visibility — uses keyframe interpolation ───────────
        const kPos = getClipPosAt(displayClip, vePlayPos);
        layer.wrap.style.display  = 'block';
        layer.wrap.style.left     = pct(kPos.x)    + '%';
        layer.wrap.style.top      = pct(kPos.y)     + '%';
        layer.wrap.style.width    = pct(kPos.w, 5) + '%';
        layer.wrap.style.height   = pct(kPos.h, 5) + '%';
        layer.wrap.classList.toggle('ve-ov-selected', displayClip.id === veSelId);

        // ── Video state sync ───────────────────────────────────────────────────
        const outOfRange  = !activeClip && !!selClip;
        const inPt        = displayClip.inPoint  || 0;
        const outPt       = displayClip.outPoint || displayClip.fileDuration;
        const speed       = displayClip.speed    || 1;
        const expectedTime = outOfRange
          ? inPt
          : Math.max(inPt, Math.min(outPt, inPt + (vePlayPos - displayClip.timelineStart) * speed));

        if (layer.video.src !== displayClip.fileUrl) {
          // ── New file: load then seek + conditionally play ──────────────────
          layer.video.src = displayClip.fileUrl;
          layer.video.load();
          layer.video.playbackRate = speed;
          layer.video.volume = outOfRange ? 0 : (displayClip.muted || displayClip.audioDetached ? 0 : Math.max(0, Math.min(1, displayClip.volume || 1)));
          layer.video.addEventListener('loadedmetadata', () => {
            layer.video.currentTime = expectedTime;
            if (!outOfRange && isPlaying) layer.video.play().catch(() => {});
          }, { once: true });
        } else if (outOfRange || !isPlaying) {
          // ── Paused / out-of-range: hold at correct frame ───────────────────
          if (!layer.video.paused) layer.video.pause();
          if (Math.abs(layer.video.currentTime - expectedTime) > 0.05) {
            layer.video.currentTime = expectedTime;
          }
        } else {
          // ── Playing: start if stopped, correct drift if needed ─────────────
          if (layer.video.playbackRate !== speed) layer.video.playbackRate = speed;
          if (layer.video.paused) {
            layer.video.currentTime = expectedTime;
            layer.video.play().catch(() => {});
          } else {
            const drift = Math.abs(layer.video.currentTime - expectedTime);
            if (drift > 0.25) layer.video.currentTime = expectedTime;
          }
        }
      }
    }

    // updateLayerVideo / updateAllLayerVideos: called on explicit state changes (seek, selection change)
    // Delegates to syncAllLayers — no duplication needed.
    function updateLayerVideo(_trackIdx) { syncAllLayers(); }
    function updateAllLayerVideos()      { syncAllLayers(); }

    // syncAudioElements: per-frame sync for detached audio tracks
    function syncAudioElements() {
      for (let track = 0; track < MAX_AUDIO_TRACKS; track++) {
        const aud = veAudioEls[track];
        const activeAudio = veAudioClips.find(a => (a.audioTrack || 0) === track &&
          vePlayPos >= a.timelineStart && vePlayPos < a.timelineStart + a.timelineDuration);
        if (!activeAudio) { if (!aud.paused) aud.pause(); continue; }
        const targetTime = (activeAudio.inPoint || 0) + (vePlayPos - activeAudio.timelineStart);
        aud.volume = activeAudio.muted ? 0 : Math.max(0, Math.min(1, activeAudio.volume || 1));
        if (aud.src !== activeAudio.fileUrl) {
          aud.src = activeAudio.fileUrl; aud.load();
          aud.addEventListener('canplay', () => {
            aud.currentTime = targetTime;
            if (!video.paused) aud.play().catch(() => {});
          }, { once: true });
        } else if (video.paused) {
          aud.pause(); aud.currentTime = targetTime;
        } else if (aud.paused) {
          aud.currentTime = targetTime; aud.play().catch(() => {});
        } else {
          // Correct drift while playing
          if (Math.abs(aud.currentTime - targetTime) > 0.3) aud.currentTime = targetTime;
        }
      }
    }

    let veGapLastTs  = null;
    let veIsPlaying  = false;

    function startPlayback() {
      if (veIsPlaying) return;
      veIsPlaying = true;
      $('ve-btn-play').textContent = '⏸';
      cancelAnimationFrame(veRafId);
      veGapLastTs = null;
      const clip = getClipAt(vePlayPos);
      if (!clip) {
        // Playhead is in a gap — start the tick loop directly without touching video
        veActiveClip = null;
        veRafId = requestAnimationFrame(tick);
      } else {
        const doPlay = () => video.play().catch(() => {});
        if (video.seeking) video.addEventListener('seeked', doPlay, { once: true });
        else doPlay();
        // tick will be started by the 'play' event
      }
    }

    function stopPlayback() {
      veIsPlaying = false;
      $('ve-btn-play').textContent = '▶';
      cancelAnimationFrame(veRafId);
      veRafId = null;
      veGapLastTs = null;
      if (!video.paused) video.pause();
      drawTimeline(); updateTimecode(); updateAllLayerVideos();
    }

    function tick() {
      if (veActiveClip) {
        veGapLastTs = null;
        const relFile = video.currentTime - veActiveClip.inPoint;
        vePlayPos     = veActiveClip.timelineStart + relFile / (veActiveClip.speed || 1);
        if (video.currentTime >= veActiveClip.outPoint - 0.05) {
          const v1Sorted = veClips.filter(c => !c.track).sort((a, b) => a.timelineStart - b.timelineStart);
          const idx  = v1Sorted.findIndex(c => c.id === veActiveClip.id);
          const next = v1Sorted[idx + 1];
          if (next) {
            if (next.timelineStart <= vePlayPos + 0.05) {
              // Next clip is right here — load it immediately
              veActiveClip = next; loadClipIntoPlayer(next, next.inPoint); video.play().catch(() => {});
            } else {
              // Gap before next clip — enter gap mode
              veActiveClip = null;
              if (!video.paused) video.pause();
            }
          } else if (vePlayPos < veTotalDur - 0.05) {
            // No more V1 clips but V2+ extends the timeline — gap to the end
            veActiveClip = null;
            if (!video.paused) video.pause();
          } else {
            // Truly at the end
            if (veLoop) { stopPlayback(); seekToPos(0); startPlayback(); }
            else { stopPlayback(); vePlayPos = veTotalDur; }
          }
        }
      } else if (veIsPlaying) {
        // Gap mode: advance vePlayPos with wall clock
        const now = performance.now();
        if (veGapLastTs !== null) vePlayPos += (now - veGapLastTs) / 1000;
        veGapLastTs = now;
        const nextClip = veClips.filter(c => !c.track)
          .sort((a, b) => a.timelineStart - b.timelineStart)
          .find(c => c.timelineStart >= vePlayPos - 0.05);
        if (nextClip && vePlayPos >= nextClip.timelineStart - 0.05) {
          veActiveClip = nextClip; veGapLastTs = null;
          loadClipIntoPlayer(nextClip, nextClip.inPoint);
          video.play().catch(() => {});
        } else if (vePlayPos >= veTotalDur) {
          if (veLoop) { stopPlayback(); seekToPos(0); startPlayback(); }
          else { stopPlayback(); vePlayPos = veTotalDur; }
        }
      }
      drawTimeline(true); updateTimecode(); updateFadeOverlay(); updateTextOverlay();
      syncAllLayers(); syncAudioElements();
      if ((!video.paused && !video.ended) || (veIsPlaying && !veActiveClip)) {
        veRafId = requestAnimationFrame(tick);
      }
    }

    // ── Playback helpers ──────────────────────────────────────────────────────
    function loadClipIntoPlayer(clip, fileTime) {
      const target = Math.max(clip.inPoint, Math.min(clip.outPoint, fileTime));
      veActiveClip       = clip;
      video.playbackRate = clip.speed;
      video.volume       = clip.muted ? 0 : Math.max(0, Math.min(1, clip.volume || 1));
      if (video.src !== clip.fileUrl) {
        // Must wait for metadata before setting currentTime — browser ignores it otherwise
        const onMeta = () => {
          video.removeEventListener('loadedmetadata', onMeta);
          video.currentTime = target;
          drawTimeline(); updateTimecode();
        };
        video.addEventListener('loadedmetadata', onMeta);
        video.src  = clip.fileUrl;
        video.load();
      } else {
        video.currentTime = target;
      }
    }

    function seekToPos(pos) {
      pos = Math.max(0, Math.min(veTotalDur, pos));
      vePlayPos   = pos;
      veGapLastTs = null; // reset gap clock on any seek
      const clip = getClipAt(pos);
      if (clip) {
        const fileTime = clip.inPoint + (pos - clip.timelineStart) * clip.speed;
        loadClipIntoPlayer(clip, fileTime);
      } else {
        // Seeked into a gap — clear active clip so gap mode takes over if playing
        veActiveClip = null;
      }
      drawTimeline(); updateTimecode(); updateAllLayerVideos();
    }

    // ── Fade & text overlay ───────────────────────────────────────────────────
    function updateFadeOverlay() {
      const el = $('ve-fade-overlay');
      if (!el || veTotalDur === 0) { if (el) el.style.opacity = '0'; return; }
      let opacity = 0;
      if (veFadeInEn  && veFadeInDur  > 0 && vePlayPos < veFadeInDur)             opacity = Math.max(opacity, 1 - vePlayPos / veFadeInDur);
      if (veFadeOutEn && veFadeOutDur > 0 && vePlayPos > veTotalDur - veFadeOutDur) opacity = Math.max(opacity, 1 - (veTotalDur - vePlayPos) / veFadeOutDur);
      el.style.opacity = Math.max(0, Math.min(1, opacity)).toFixed(3);
    }

    function updateTextOverlay() {
      if (!overlayCanvas || !overlayCanvas.width) return;
      const ctx = overlayCanvas.getContext('2d');
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      const active = veTextOverlays.filter(o => vePlayPos >= o.startSec && vePlayPos < o.endSec);
      for (const ov of active) {
        ctx.font = 'bold 28px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8;
        const x = overlayCanvas.width / 2;
        const y = ov.pos === 'top' ? 52 : ov.pos === 'center' ? overlayCanvas.height/2 : overlayCanvas.height - 52;
        ctx.fillStyle = ov.color || '#ffffff';
        ctx.fillText(ov.text, x, y);
        ctx.shadowBlur = 0;
      }
    }

    // (syncOvWrap/updateOvVideo/addOverlayFromFile/refreshOvlPanel removed — replaced by layer system)

    // ── UI: clip panel ────────────────────────────────────────────────────────
    function refreshClipPanel() {
      const clip = selectedClip();
      const isV2plus = clip && (clip.track > 0);
      $('ve-clip-name').textContent = clip ? clip.fileName : '—';
      $('ve-in-input').value        = clip ? veSecsToHMS(clip.inPoint)  : '00:00:00';
      $('ve-out-input').value       = clip ? veSecsToHMS(clip.outPoint) : '00:00:00';
      document.querySelectorAll('.ve-speed-btn').forEach(b => {
        b.classList.toggle('active', clip ? parseFloat(b.dataset.speed) === clip.speed : b.dataset.speed === '1');
      });
      $('ve-info-dims').textContent = clip ? (clip.dims || '—') : '—';

      // Separate audio button — only for video clips that haven't detached audio yet
      const sepBtn = $('ve-sep-audio-btn');
      if (sepBtn) sepBtn.style.display = (clip && !clip.audioDetached) ? '' : 'none';

      // Mute button — shown for any selected clip
      const muteBtn = $('ve-mute-btn');
      if (muteBtn) {
        muteBtn.style.display = clip ? '' : 'none';
        muteBtn.textContent   = (clip && clip.muted) ? '🔊 Unmute Clip' : '🔇 Mute Clip';
        muteBtn.classList.toggle('active', !!(clip && clip.muted));
      }

      // Transition panel — show for V1 clips that are not the first clip
      const transPanel = $('ve-transition-panel');
      if (transPanel) {
        let showTrans = false;
        if (clip && clip.track === 0) {
          const v1clips = veClips.filter(c => c.track === 0).sort((a, b) => a.timelineStart - b.timelineStart);
          showTrans = v1clips.indexOf(clip) > 0;
        }
        transPanel.style.display = showTrans ? '' : 'none';
        if (showTrans) {
          $('ve-trans-name').textContent = clip.transitionIn ? clip.transitionIn.name : 'None';
          $('ve-trans-remove').style.display = clip.transitionIn ? '' : 'none';
        }
      }

      // Layer clip panel — for V2+ clips
      const layerPanel = $('ve-layer-panel');
      if (isV2plus) maybeShowKfOnboarding();
      if (layerPanel) {
        layerPanel.style.display = isV2plus ? 'block' : 'none';
        if (isV2plus) {
          const pos = getClipPosAt(clip, vePlayPos);
          $('ve-layer-name').textContent = clip.fileName;
          $('ve-layer-pos').textContent  = `X ${Math.round(pos.x)}% · Y ${Math.round(pos.y)}%`;
          $('ve-layer-size').textContent = `${Math.round(pos.w)}% × ${Math.round(pos.h)}%`;
          // Render keyframe list
          const kfs = clip.keyframes || [];
          const kfList  = $('ve-kf-list');
          const kfEmpty = $('ve-kf-empty');
          const kfClear = $('ve-kf-clear');
          if (kfList) {
            kfList.innerHTML = '';
            kfEmpty.style.display = kfs.length ? 'none' : 'block';
            kfClear.style.display = kfs.length ? 'inline' : 'none';
            kfs.forEach((kf, idx) => {
              const t = clip.timelineStart + kf.time;
              const isActive = Math.abs(vePlayPos - t) < 0.15;
              const item = document.createElement('div');
              item.className = 've-kf-item' + (isActive ? ' active' : '');
              item.innerHTML = `<span class="ve-kf-diamond">◆</span><span class="ve-kf-time">${veSecsToHMS(kf.time)}</span><span class="ve-kf-pos">${Math.round(kf.x)}%,${Math.round(kf.y)}%</span><button class="ve-kf-del" data-idx="${idx}" title="Delete keyframe">×</button>`;
              item.querySelector('.ve-kf-time').addEventListener('click', () => seekToPos(t));
              item.querySelector('.ve-kf-diamond').addEventListener('click', () => seekToPos(t));
              item.querySelector('.ve-kf-del').addEventListener('click', e => { e.stopPropagation(); deleteKeyframeFromClip(clip, idx); });
              kfList.appendChild(item);
            });
          }
        }
      }
      // Enable overlay interaction for V2+ layers; V1 wrap always accepts events when visible
      layersContainer.style.pointerEvents = isV2plus ? 'auto' : 'none';
      const v1WrapEl = $('ve-v1-wrap');
      if (v1WrapEl) v1WrapEl.style.pointerEvents = (clip && clip.track === 0) ? 'auto' : 'none';
    }

    function renderTextList() {
      const list = $('ve-text-list');
      list.innerHTML = '';
      veTextOverlays.forEach(ov => {
        const el = document.createElement('div');
        el.className = 've-text-item';
        el.innerHTML = `
          <span class="ve-text-item-label" title="${ov.text} (${veSecsToHMS(ov.startSec)}–${veSecsToHMS(ov.endSec)})">${ov.text}</span>
          <button class="ve-text-item-del" data-id="${ov.id}">×</button>`;
        el.querySelector('.ve-text-item-del').addEventListener('click', () => {
          veTextOverlays = veTextOverlays.filter(o => o.id !== ov.id);
          pushHistory(); renderTextList(); drawTimeline();
        });
        list.appendChild(el);
      });
    }

    // ── Timeline mouse interactions ───────────────────────────────────────────
    canvas.addEventListener('mousedown', e => {
      if (!veClips.length && !veAudioClips.length) return;
      const rect = canvas.getBoundingClientRect();
      const x    = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y    = (e.clientY - rect.top)  * (canvas.height / rect.height);
      const t    = xToTime(x);

      // Trim handles on selected clip (priority)
      const clip = selectedClip();
      if (clip && x > LW) {
        const lx = timeToX(clip.timelineStart);
        const rx = timeToX(clip.timelineStart + clip.timelineDuration);
        if (Math.abs(x - lx) < HANDLE_W + 4) { veDragging = 'trimL'; e.preventDefault(); return; }
        if (Math.abs(x - rx) < HANDLE_W + 4) { veDragging = 'trimR'; e.preventDefault(); return; }
      }
      const aclip = selectedAudioClip();
      if (aclip && x > LW) {
        const lx = timeToX(aclip.timelineStart);
        const rx = timeToX(aclip.timelineStart + aclip.timelineDuration);
        if (Math.abs(x - lx) < HANDLE_W + 4) { veDragging = 'audioTrimL'; e.preventDefault(); return; }
        if (Math.abs(x - rx) < HANDLE_W + 4) { veDragging = 'audioTrimR'; e.preventDefault(); return; }
      }

      if (x > LW) {
        // Check audio track click
        const audioTrack = getAudioTrackAtY(y);
        if (audioTrack !== null) {
          const clickedAudio = veAudioClips.find(a => (a.audioTrack||0) === audioTrack && t >= a.timelineStart && t < a.timelineStart + a.timelineDuration);
          if (clickedAudio) {
            veSelId = clickedAudio.id; refreshClipPanel();
            veDragging = 'audioMove'; veDragClip = clickedAudio; veDragOffsetSec = t - clickedAudio.timelineStart;
          } else {
            veSelId = null; refreshClipPanel();
            if (!video.paused) video.pause();
            veDragging = 'seek'; seekToPos(Math.max(0, Math.min(veTotalDur, t)));
          }
          drawTimeline(); e.preventDefault(); return;
        }

        // Check video track click
        const videoTrack = getVideoTrackAtY(y);
        if (videoTrack !== null) {
          const clickedClip = veClips.find(c => (c.track||0) === videoTrack && t >= c.timelineStart && t < c.timelineStart + c.timelineDuration);
          if (clickedClip) {
            veSelId = clickedClip.id; refreshClipPanel();
            veDragging = 'clipMove'; veDragClip = clickedClip;
            veDragOffsetSec = t - clickedClip.timelineStart;
            veDragTargetTrack = clickedClip.track || 0;
            // Auto-seek to V2+ clip when clicked so it shows in preview
            if (clickedClip.track > 0 && (vePlayPos < clickedClip.timelineStart || vePlayPos >= clickedClip.timelineStart + clickedClip.timelineDuration)) {
              seekToPos(clickedClip.timelineStart);
            }
          } else {
            veSelId = null; refreshClipPanel();
            if (!video.paused) video.pause();
            veDragging = 'seek'; seekToPos(Math.max(0, Math.min(veTotalDur, t)));
          }
          drawTimeline(); e.preventDefault(); return;
        }

        // Ruler area — seek
        if (y <= RULER_H) {
          if (!video.paused) video.pause();
          veDragging = 'seek'; seekToPos(Math.max(0, Math.min(veTotalDur, t)));
        }
      }
      e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
      if (!veDragging && !veOvDrag) return;
      const rect = canvas.getBoundingClientRect();
      const x    = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y    = (e.clientY - rect.top)  * (canvas.height / rect.height);
      const t     = xToTime(x);
      const clip  = selectedClip();
      const aclip = selectedAudioClip();
      veDragCurrentX = x; veDragCurrentY = y;

      if (veOvDrag) {
        // Preview layer drag/resize
        const cRect = $('ve-video-container').getBoundingClientRect();
        if (!cRect.width) return;
        const mx = (e.clientX - cRect.left) / cRect.width * 100;
        const my = (e.clientY - cRect.top)  / cRect.height * 100;
        const dx = mx - veOvDrag.startX, dy = my - veOvDrag.startY;
        // Write to keyframe if one is active, otherwise write to clip directly (static mode)
        const tgt = veOvDrag.kf || veOvDrag.clip;
        if (veOvDrag.type === 'move') {
          tgt.x = Math.max(0, Math.min(100 - (tgt.w||35), veOvDrag.origX + dx));
          tgt.y = Math.max(0, Math.min(100 - (tgt.h||35), veOvDrag.origY + dy));
        } else {
          const corner = veOvDrag.corner;
          if (corner === 'se') { tgt.w = Math.max(5, veOvDrag.origW + dx); tgt.h = Math.max(5, veOvDrag.origH + dy); }
          else if (corner === 'sw') { tgt.x = Math.max(0, veOvDrag.origX + dx); tgt.w = Math.max(5, veOvDrag.origW - dx); tgt.h = Math.max(5, veOvDrag.origH + dy); }
          else if (corner === 'ne') { tgt.w = Math.max(5, veOvDrag.origW + dx); tgt.y = Math.max(0, veOvDrag.origY + dy); tgt.h = Math.max(5, veOvDrag.origH - dy); }
          else if (corner === 'nw') { tgt.x = Math.max(0, veOvDrag.origX + dx); tgt.w = Math.max(5, veOvDrag.origW - dx); tgt.y = Math.max(0, veOvDrag.origY + dy); tgt.h = Math.max(5, veOvDrag.origH - dy); }
        }
        syncAllLayers(); // apply new position to overlay CSS immediately
        if (veOvDrag.kf) drawTimeline(); // redraw so keyframe diamond updates
        refreshClipPanel();
        return;
      }

      if (veDragging === 'trimL' && clip) {
        clip.inPoint = Math.max(0, Math.min(clip.outPoint - 0.1, (t - clip.timelineStart) * clip.speed));
        computeLayout(); clampScroll();
        $('ve-in-input').value = veSecsToHMS(clip.inPoint);
      } else if (veDragging === 'trimR' && clip) {
        const relEnd = t - clip.timelineStart;
        clip.outPoint = Math.max(clip.inPoint + 0.1, Math.min(clip.fileDuration, clip.inPoint + relEnd * clip.speed));
        computeLayout(); clampScroll();
        $('ve-out-input').value = veSecsToHMS(clip.outPoint);
      } else if (veDragging === 'audioTrimL' && aclip) {
        aclip.inPoint = Math.max(0, Math.min(aclip.outPoint - 0.1, t - aclip.timelineStart));
        computeLayout(); clampScroll();
      } else if (veDragging === 'audioTrimR' && aclip) {
        aclip.outPoint = Math.max(aclip.inPoint + 0.1, Math.min(aclip.fileDuration, aclip.inPoint + (t - aclip.timelineStart)));
        computeLayout(); clampScroll();
      } else if (veDragging === 'seek') {
        seekToPos(Math.max(0, Math.min(veTotalDur, t)));
      } else if (veDragging === 'audioMove' && veDragClip) {
        veDragClip.timelineStart = getSnapPos(t - veDragOffsetSec, veDragClip.timelineDuration, veDragClip.id);
        computeLayout();
      } else if (veDragging === 'clipMove' && veDragClip) {
        const hovTrack = getVideoTrackAtY(y);
        veDragTargetTrack = (hovTrack !== null) ? hovTrack : (veDragClip.track || 0);
        if (veDragTargetTrack === (veDragClip.track || 0)) {
          if (veDragTargetTrack === 0) {
            veDragClip.timelineStart = getSnapPos(t - veDragOffsetSec, veDragClip.timelineDuration, veDragClip.id);
            computeLayout();
          } else {
            veDragClip.timelineStart = getSnapPos(t - veDragOffsetSec, veDragClip.timelineDuration, veDragClip.id);
            computeLayout();
          }
        }
      }
      drawTimeline();
    });

    window.addEventListener('mouseup', () => {
      if (veOvDrag) { pushHistory(); veOvDrag = null; refreshClipPanel(); return; }
      if (veDragging === 'seek') {
        // Final precise seek — ensures video.currentTime matches vePlayPos
        const clip = getClipAt(vePlayPos);
        if (clip) {
          const ft = clip.inPoint + (vePlayPos - clip.timelineStart) * clip.speed;
          loadClipIntoPlayer(clip, ft);
        }
        updateAllLayerVideos();
      }
      if (veDragging === 'trimL' || veDragging === 'trimR' || veDragging === 'audioTrimL' || veDragging === 'audioTrimR') pushHistory();
      if (veDragging === 'audioMove') { pushHistory(); veDragClip = null; }
      if (veDragging === 'clipMove' && veDragClip) {
        const srcTrack = veDragClip.track || 0;
        if (veDragTargetTrack !== null && veDragTargetTrack !== srcTrack) {
          if (veDragTargetTrack === 0) {
            // Moving V2+ clip back to V1 — preserve its current size/position
            veDragClip.track = 0;
            showToast(`${veDragClip.fileName} moved to V1`);
          } else {
            // Moving to V2+ row — keep x/y/w/h as-is (already meaningful)
            if (!veDragClip.track || veDragClip.track === 0) {
              veDragClip.timelineStart = Math.max(0, xToTime(veDragCurrentX) - veDragOffsetSec);
            }
            veDragClip.track = veDragTargetTrack;
            veSelId = veDragClip.id;
            showToast(`${veDragClip.fileName} → V${veDragTargetTrack+1}`);
          }
          computeLayout(); updateAllLayerVideos();
        }
        veDragTargetTrack = null; pushHistory(); veDragClip = null;
        refreshClipPanel();
      }
      veDragging = null; veSnapPos = null;
    });

    // ── V1 wrap drag & resize ─────────────────────────────────────────────────
    const v1Wrap = $('ve-v1-wrap');
    v1Wrap.addEventListener('mousedown', e => {
      if (e.target.dataset.corner) return; // handles handled below
      e.stopPropagation(); e.preventDefault();
      const clip1 = veClips.filter(c => !c.track).find(c =>
        vePlayPos >= c.timelineStart && vePlayPos < c.timelineStart + c.timelineDuration);
      if (!clip1) return;
      veSelId = clip1.id; drawTimeline(); refreshClipPanel();
      const cRect = $('ve-video-container').getBoundingClientRect();
      veOvDrag = { type: 'move',
        startX: (e.clientX-cRect.left)/cRect.width*100,
        startY: (e.clientY-cRect.top)/cRect.height*100,
        origX: clip1.x ?? 0, origY: clip1.y ?? 0, clip: clip1, kf: null };
    });
    v1Wrap.querySelectorAll('[data-corner]').forEach(handle => {
      handle.addEventListener('mousedown', e => {
        e.stopPropagation(); e.preventDefault();
        const clip1 = veClips.filter(c => !c.track).find(c =>
          vePlayPos >= c.timelineStart && vePlayPos < c.timelineStart + c.timelineDuration);
        if (!clip1) return;
        const corner = handle.dataset.corner;
        const cRect  = $('ve-video-container').getBoundingClientRect();
        veOvDrag = { type: 'resize', corner,
          startX: (e.clientX-cRect.left)/cRect.width*100,
          startY: (e.clientY-cRect.top)/cRect.height*100,
          origX: clip1.x ?? 0, origY: clip1.y ?? 0,
          origW: clip1.w ?? 100, origH: clip1.h ?? 100, clip: clip1, kf: null };
      });
    });

    // ── Layer preview drag & resize ────────────────────────────────────────────
    // Attach to each dynamically created layer wrap
    veLayers.forEach(({ wrap, video: lv }) => {
      wrap.addEventListener('mousedown', e => {
        if (e.target.classList.contains('ve-ov-handle')) return;
        e.stopPropagation(); e.preventDefault();
        const li = parseInt(wrap.dataset.li, 10);
        const trackIdx = li + 1;
        const clip2 = veClips.find(c => c.id === veSelId && c.track === trackIdx) ||
                     veClips.find(c => c.track === trackIdx && vePlayPos >= c.timelineStart && vePlayPos < c.timelineStart + c.timelineDuration);
        if (!clip2) return;
        veSelId = clip2.id; drawTimeline(); refreshClipPanel();
        const cRect = $('ve-video-container').getBoundingClientRect();
        const kf = getOrCreateDragKeyframe(clip2);
        const src = kf || clip2;
        veOvDrag = { type: 'move', startX: (e.clientX-cRect.left)/cRect.width*100, startY: (e.clientY-cRect.top)/cRect.height*100, origX: src.x??50, origY: src.y??5, clip: clip2, kf };
      });
      wrap.querySelectorAll('.ve-ov-handle').forEach(handle => {
        handle.addEventListener('mousedown', e => {
          e.stopPropagation(); e.preventDefault();
          const li = parseInt(wrap.dataset.li, 10);
          const trackIdx = li + 1;
          const clip2 = veClips.find(c => c.id === veSelId && c.track === trackIdx) ||
                       veClips.find(c => c.track === trackIdx && vePlayPos >= c.timelineStart && vePlayPos < c.timelineStart + c.timelineDuration);
          if (!clip2) return;
          const corner = [...handle.classList].find(c => ['nw','ne','sw','se'].includes(c));
          const cRect = $('ve-video-container').getBoundingClientRect();
          const kf = getOrCreateDragKeyframe(clip2);
          const src = kf || clip2;
          veOvDrag = { type: 'resize', corner, startX: (e.clientX-cRect.left)/cRect.width*100, startY: (e.clientY-cRect.top)/cRect.height*100, origX: src.x??50, origY: src.y??5, origW: src.w??35, origH: src.h??35, clip: clip2, kf };
        });
      });
    });

    canvas.addEventListener('mousemove', e => {
      if (!veClips.length && !veAudioClips.length) return;
      const rect = canvas.getBoundingClientRect();
      const x    = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y    = (e.clientY - rect.top)  * (canvas.height / rect.height);
      const t    = xToTime(x);
      const clip = selectedClip();
      let cur = 'default';
      if (clip && x > LW) {
        const lx = timeToX(clip.timelineStart), rx = timeToX(clip.timelineStart + clip.timelineDuration);
        if (Math.abs(x - lx) < HANDLE_W+4 || Math.abs(x - rx) < HANDLE_W+4) cur = 'ew-resize';
        else if (y > RULER_H && veClips.some(c => t >= c.timelineStart && t < c.timelineStart + c.timelineDuration)) cur = veDragging === 'clipMove' ? 'grabbing' : 'grab';
        else cur = 'pointer';
      } else if (x > LW) {
        const onClip = veClips.some(c => t >= c.timelineStart && t < c.timelineStart + c.timelineDuration) ||
                       veAudioClips.some(a => t >= a.timelineStart && t < a.timelineStart + a.timelineDuration);
        cur = onClip && y > RULER_H ? 'grab' : 'pointer';
      }
      canvas.style.cursor = cur;
    });

    // Zoom via scroll wheel on timeline
    $('ve-timeline-wrap').addEventListener('wheel', e => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const factor = e.deltaY > 0 ? 0.85 : 1.18;
        veZoom = Math.max(1, Math.min(40, veZoom * factor));
        $('ve-zoom-slider').value = String(veZoom);
      } else {
        // Scroll
        veScrollOff += (e.deltaY / canvas.width) * visibleDur() * 3;
        clampScroll();
      }
      drawTimeline();
    }, { passive: false });

    // ── Video element events ──────────────────────────────────────────────────
    video.addEventListener('play', () => {
      veIsPlaying = true;
      $('ve-btn-play').textContent = '⏸';
      cancelAnimationFrame(veRafId);
      veRafId = requestAnimationFrame(tick);
      updateAllLayerVideos();
    });
    video.addEventListener('pause', () => {
      // Don't update the button if we paused internally for a gap — veIsPlaying is still true
      if (!veIsPlaying) $('ve-btn-play').textContent = '▶';
      drawTimeline(); updateTimecode(); updateAllLayerVideos();
    });
    video.addEventListener('ended', () => {
      if (!veIsPlaying) { $('ve-btn-play').textContent = '▶'; drawTimeline(); }
    });

    // (transport/zoom/undo listeners registered below near end of init)

    // ── Fade controls ─────────────────────────────────────────────────────────
    $('ve-fade-in-en').addEventListener('change',  function() { veFadeInEn  = this.checked; updateFadeOverlay(); });
    $('ve-fade-out-en').addEventListener('change', function() { veFadeOutEn = this.checked; updateFadeOverlay(); });
    $('ve-fade-in-dur').addEventListener('input',  function() { veFadeInDur  = parseFloat(this.value) || 0.5; });
    $('ve-fade-out-dur').addEventListener('input', function() { veFadeOutDur = parseFloat(this.value) || 0.5; });

    // ── Trim inputs ───────────────────────────────────────────────────────────
    $('ve-in-input').addEventListener('change', function() {
      const clip = selectedClip(); if (!clip) return;
      clip.inPoint = Math.max(0, Math.min(clip.outPoint - 0.1, veStrToSecs(this.value)));
      this.value = veSecsToHMS(clip.inPoint);
      computeLayout(); pushHistory(); drawTimeline();
    });
    $('ve-out-input').addEventListener('change', function() {
      const clip = selectedClip(); if (!clip) return;
      clip.outPoint = Math.max(clip.inPoint + 0.1, Math.min(clip.fileDuration, veStrToSecs(this.value)));
      this.value = veSecsToHMS(clip.outPoint);
      computeLayout(); pushHistory(); drawTimeline();
    });

    // ── Speed buttons ─────────────────────────────────────────────────────────
    document.querySelectorAll('.ve-speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const clip = selectedClip(); if (!clip) return;
        clip.speed = parseFloat(btn.dataset.speed);
        video.playbackRate = clip.speed;
        computeLayout(); pushHistory(); refreshClipPanel(); drawTimeline();
      });
    });

    // ── Text overlays ─────────────────────────────────────────────────────────
    $('ve-text-add-btn').addEventListener('click', () => {
      const text  = $('ve-text-input').value.trim();
      if (!text) { showToast('Enter text first'); return; }
      const start = veStrToSecs($('ve-text-start').value) || vePlayPos;
      const end   = veStrToSecs($('ve-text-end').value)   || Math.min(vePlayPos + 5, veTotalDur);
      veTextOverlays.push({
        id: genId(), text,
        pos:      $('ve-text-pos').value,
        color:    $('ve-text-color').value,
        startSec: start,
        endSec:   end,
      });
      $('ve-text-input').value = '';
      pushHistory(); renderTextList(); drawTimeline();
    });

    // ── Format buttons ────────────────────────────────────────────────────────
    document.querySelectorAll('.ve-format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ve-format-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active'); veFormat = btn.dataset.fmt;
      });
    });

    // ── Hype detection ────────────────────────────────────────────────────────
    $('ve-btn-hype').addEventListener('click', async () => {
      if (!veClips.length) return;
      $('ve-btn-hype').disabled = true; $('ve-btn-hype').textContent = '⚡ Analyzing…';
      // Ensure waveforms loaded
      for (const c of veClips) { if (!c.waveform) await loadWaveform(c); }
      veHypeMarkers = [];
      for (const clip of veClips) {
        if (!clip.waveform) continue;
        const peaks = clip.waveform;
        const maxPeak = Math.max(...peaks, 0.001);
        const thresh = maxPeak * 0.75;
        let inHype = false, lastT = -999;
        for (let i = 0; i < peaks.length; i++) {
          const t = clip.timelineStart + (i / peaks.length) * clip.timelineDuration;
          if (peaks[i] >= thresh && !inHype && t - lastT > 5) {
            veHypeMarkers.push({ timelinePos: t, intensity: peaks[i] / maxPeak });
            lastT = t; inHype = true;
          } else if (peaks[i] < thresh * 0.5) { inHype = false; }
        }
      }
      drawTimeline();
      showToast(`Found ${veHypeMarkers.length} hype moment${veHypeMarkers.length !== 1 ? 's' : ''} — click ⚡ markers on timeline`);
      $('ve-btn-hype').disabled = false; $('ve-btn-hype').textContent = '⚡ Find Hype';
    });

    // ── Add / load clip ───────────────────────────────────────────────────────
    async function addClipFromFile(fp, targetTrack = 0) {
      const fileName = fp.split(/[\\/]/).pop();
      const fileUrl  = assetUrl(fp);
      const dur = await new Promise(resolve => {
        const tmp = document.createElement('video');
        tmp.preload = 'metadata'; tmp.src = fileUrl;
        tmp.onloadedmetadata = () => resolve(tmp.duration || 0);
        tmp.onerror = () => resolve(0);
      });
      const meta = await window.creatorhub.app.getAssetMeta(fp, 'videos').catch(() => ({}));
      const clip = {
        id: genId(), filePath: fp, fileName, fileUrl,
        fileDuration: dur, inPoint: 0, outPoint: dur,
        track: targetTrack, speed: 1, volume: 1, muted: false, audioDetached: false,
        x: targetTrack === 0 ? 0 : 50, y: targetTrack === 0 ? 0 : 5,
        w: targetTrack === 0 ? 100 : 35, h: targetTrack === 0 ? 100 : 35,
        waveform: null, thumbnails: [],
        dims: meta.dims || '—',
        timelineStart: targetTrack > 0 ? vePlayPos :
          veClips.filter(c => !c.track).reduce((end, c) => Math.max(end, c.timelineStart + (c.outPoint - c.inPoint) / (c.speed || 1)), 0),
        timelineDuration: dur,
      };
      veClips.push(clip);
      veSelId = clip.id;
      computeLayout(); pushHistory();
      refreshClipPanel(); drawTimeline();
      seekToPos(clip.timelineStart);
      resizeCanvas(); resizeOverlay();
      loadWaveform(clip);
      loadThumbnails(clip);
    }

    async function openVeFilePicker() {
      const result = await window.creatorhub.app.openFileDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Videos', extensions: ['mp4','mov','mkv','webm','avi'] }],
      });
      if (!result) return;
      const fps = result.filePaths || (typeof result === 'string' ? [result] : []);
      for (const fp of fps) await addClipFromFile(fp, 0);
    }

    function openVeFromRecordings() {
      if (!recordingsLib.length) { showToast('No recordings yet'); return; }
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;';
      const box = document.createElement('div');
      box.style.cssText = 'background:#0f1520;border:1px solid rgba(255,255,255,0.08);border-radius:12px;width:500px;max-height:420px;display:flex;flex-direction:column;overflow:hidden;';
      box.innerHTML = `<div style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.06);font-weight:700;font-size:13px;display:flex;justify-content:space-between;align-items:center;">Pick a Recording <button id="_ve-rc-close" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:15px;">✕</button></div><div style="overflow-y:auto;padding:8px;" id="_ve-rc-list"></div>`;
      const list = box.querySelector('#_ve-rc-list');
      recordingsLib.forEach(rec => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:pointer;';
        row.innerHTML = `${rec.thumb ? `<img src="${rec.thumb}" style="width:80px;height:45px;object-fit:cover;border-radius:5px;flex-shrink:0;">` : `<div style="width:80px;height:45px;background:#151d2b;border-radius:5px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;">🎬</div>`}<div><div style="font-size:12px;font-weight:600;">${rec.name}</div><div style="font-size:11px;color:var(--muted);">${formatBytes(rec.size)}${rec.duration ? ' · ' + rec.duration : ''}</div></div>`;
        row.addEventListener('mouseenter', () => row.style.background = 'rgba(255,255,255,0.04)');
        row.addEventListener('mouseleave', () => row.style.background = '');
        row.addEventListener('click', () => { document.body.removeChild(overlay); addClipFromFile(rec.path, 0); });
        list.appendChild(row);
      });
      box.querySelector('#_ve-rc-close').addEventListener('click', () => document.body.removeChild(overlay));
      overlay.addEventListener('click', ev => { if (ev.target === overlay) document.body.removeChild(overlay); });
      overlay.appendChild(box); document.body.appendChild(overlay);
    }

    // ── Export ────────────────────────────────────────────────────────────────
    async function doVeExport() {
      const v1Clips = veClips.filter(c => !c.track);
      if (!v1Clips.length) { showToast('Add at least one clip to V1 before exporting'); return; }
      const dir = await window.creatorhub.app.openFileDialog({ properties: ['openDirectory'], title: 'Choose Export Folder' });
      if (!dir) return;
      const outputDir = typeof dir === 'string' ? dir : (dir.filePaths && dir.filePaths[0]);
      if (!outputDir) return;

      const exportClips = v1Clips.map(c => ({
        filePath: c.filePath, inPoint: c.inPoint, outPoint: c.outPoint, speed: c.speed,
        muted: c.muted || false,
        transitionIn: c.transitionIn || null,
        textOverlays: veTextOverlays.filter(o => o.startSec < c.timelineStart + c.timelineDuration && o.endSec > c.timelineStart)
          .map(o => ({ ...o, startSec: o.startSec - c.timelineStart, endSec: o.endSec - c.timelineStart })),
      }));
      // V2+ clips as overlay clips
      const overlayClips = veClips.filter(c => c.track > 0).map(c => ({
        filePath: c.filePath, startSec: c.timelineStart, endSec: c.timelineStart + c.timelineDuration,
        x: c.x ?? 50, y: c.y ?? 5, w: c.w ?? 35, h: c.h ?? 35,
        inPoint: c.inPoint, outPoint: c.outPoint,
      }));

      [$('ve-export-btn'), $('ve-btn-export-top')].forEach(b => { if (b) { b.disabled = true; b.textContent = '⏳ Exporting…'; } });
      $('ve-export-progress').style.display = 'block';
      $('ve-progress-fill').style.width = '0%';
      $('ve-progress-label').textContent = '0%';
      showToast('Exporting…');
      const result = await window.creatorhub.videoeditor.export(
        exportClips, veFormat, outputDir,
        veFadeInEn ? veFadeInDur : 0, veFadeOutEn ? veFadeOutDur : 0, overlayClips,
        veCanvasW, veCanvasH,
      ).catch(e => ({ ok: false, error: e.message }));
      $('ve-export-progress').style.display = 'none';
      [$('ve-export-btn'), $('ve-btn-export-top')].forEach(b => { if (b) { b.disabled = false; b.textContent = b.id === 've-export-btn' ? '⬇ Export' : 'Export'; } });
      if (result.ok) { showToast('Exported: ' + result.outputPath.split(/[\\/]/).pop()); addRecording(result.outputPath); }
      else showToast('Export failed: ' + (result.error || 'Unknown error'));
    }

    // ── Project save/load ─────────────────────────────────────────────────────
    function getTimelineState() {
      return {
        clips: veClips.map(c => ({ ...c, waveform: null, thumbnails: [] })),
        audioClips: veAudioClips.map(a => ({ ...a, waveform: null })),
        textOverlays: veTextOverlays,
        hypeMarkers: veHypeMarkers,
        zoom: veZoom, scrollOff: veScrollOff,
        fadeInEn: veFadeInEn, fadeInDur: veFadeInDur,
        fadeOutEn: veFadeOutEn, fadeOutDur: veFadeOutDur,
        format: veFormat,
        canvasW: veCanvasW, canvasH: veCanvasH,
      };
    }

    async function saveProject() {
      if (!veProjectPath) return;
      const state = getTimelineState();
      const allPaths = [...new Set([
        ...veClips.map(c => c.filePath),
        ...veAudioClips.map(a => a.filePath),
      ])];
      const result = await window.creatorhub.project.save(veProjectPath, veProjectName, state, allPaths)
        .catch(() => ({ ok: false }));
      if (result && result.ok) {
        showToast('Project saved');
        // After save, reload thumbnails for first frame (for dashboard card)
        window.creatorhub.project.updateThumbnail(veProjectPath, allPaths[0] || null).catch(() => {});
      } else {
        showToast('Save failed');
      }
    }

    async function loadProjectState(state, pathMap) {
      // pathMap: { originalPath -> extractedTempPath }
      if (!state) { computeLayout(); updateUndoRedo(); refreshClipPanel(); renderTextList(); drawTimeline(); return; }
      veClips = (state.clips || []).map(c => ({
        ...c, fileUrl: assetUrl(pathMap[c.filePath] || c.filePath),
        filePath: pathMap[c.filePath] || c.filePath,
        waveform: null, thumbnails: [],
      }));
      veAudioClips = (state.audioClips || []).map(a => ({
        ...a, fileUrl: assetUrl(pathMap[a.filePath] || a.filePath),
        filePath: pathMap[a.filePath] || a.filePath,
        waveform: null,
      }));
      veTextOverlays = state.textOverlays || [];
      veHypeMarkers  = state.hypeMarkers  || [];
      veZoom = state.zoom || 1; veScrollOff = state.scrollOff || 0;
      veFadeInEn = state.fadeInEn || false; veFadeInDur = state.fadeInDur || 0.5;
      veFadeOutEn = state.fadeOutEn || false; veFadeOutDur = state.fadeOutDur || 0.5;
      veFormat  = state.format  || 'mp4';
      veCanvasW = state.canvasW || 1920;
      veCanvasH = state.canvasH || 1080;
      updateCanvasAspectRatio();
      veSelId = null; veHistory = []; veHistIdx = -1; vePlayPos = 0;
      computeLayout(); clampScroll();
      updateUndoRedo(); refreshClipPanel(); renderTextList(); drawTimeline();
      // Reload waveforms + thumbnails async
      for (const c of veClips) { loadWaveform(c); loadThumbnails(c); }
      for (const a of veAudioClips) { loadWaveform(a); }
      seekToPos(0);
    }

    function openEditor(projectPath, projectName) {
      veProjectPath = projectPath;
      veProjectName = projectName || 'Untitled Project';
      $('ve-project-name-display').textContent = veProjectName;
      $('ve-dashboard').style.display = 'none';
      $('ve-editor').style.display    = 'flex';
      veCanvasW = 1920; veCanvasH = 1080;
      resizeCanvas(); resizeOverlay();
      updateCanvasAspectRatio();
    }

    function backToDashboard() {
      $('ve-editor').style.display    = 'none';
      $('ve-dashboard').style.display = 'flex';
      loadDashboard();
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────
    function formatDate(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    async function loadDashboard() {
      const projects = await window.creatorhub.project.list().catch(() => []);
      renderDashboard(projects || []);
    }

    function renderDashboard(projects) {
      const grid = $('ve-dash-grid');
      grid.innerHTML = '';
      if (!projects.length) {
        const empty = document.createElement('div');
        empty.className = 've-dash-empty';
        empty.innerHTML = `<div class="ve-dash-empty-card"><div class="ve-dash-empty-plus">+</div><div class="ve-dash-empty-text">New Project</div></div>`;
        empty.querySelector('.ve-dash-empty-card').addEventListener('click', showNameDialog);
        grid.appendChild(empty);
        return;
      }
      projects.forEach(p => {
        const card = document.createElement('div');
        card.className = 've-dash-card';
        const thumbHtml = p.thumbnail
          ? `<img src="${p.thumbnail}" alt="">`
          : `<div class="ve-dash-thumb-empty">🎬</div>`;
        card.innerHTML = `
          <div class="ve-dash-thumb">${thumbHtml}</div>
          <div class="ve-dash-info">
            <div class="ve-dash-card-name">${p.name || 'Untitled'}</div>
            <div class="ve-dash-card-date">${formatDate(p.modified)}</div>
          </div>
          <div class="ve-dash-card-actions">
            <button class="ve-dash-card-rename" title="Rename">✏</button>
            <button class="ve-dash-card-delete" title="Delete">×</button>
          </div>`;
        ['.ve-dash-thumb', '.ve-dash-info'].forEach(sel => card.querySelector(sel).addEventListener('click', () => openProjectFromDash(p)));
        card.querySelector('.ve-dash-card-rename').addEventListener('click', e => { e.stopPropagation(); renameProjectDash(p); });
        card.querySelector('.ve-dash-card-delete').addEventListener('click', e => { e.stopPropagation(); deleteProjectDash(p); });
        grid.appendChild(card);
      });
      // Add "New Project" card at end
      const addCard = document.createElement('div');
      addCard.className = 've-dash-card ve-dash-add-card';
      addCard.innerHTML = '<div class="ve-dash-plus">+</div><div class="ve-dash-card-name" style="font-size:11px;color:var(--dim)">New Project</div>';
      addCard.addEventListener('click', showNameDialog);
      grid.appendChild(addCard);
    }

    function showNameDialog() {
      const dlg = $('ve-name-dialog');
      dlg.style.display = 'flex';
      const input = $('ve-name-input');
      input.value = '';
      setTimeout(() => input.focus(), 50);
    }

    $('ve-name-cancel').addEventListener('click', () => { $('ve-name-dialog').style.display = 'none'; });
    $('ve-name-dialog').addEventListener('click', e => { if (e.target === $('ve-name-dialog')) $('ve-name-dialog').style.display = 'none'; });
    $('ve-name-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('ve-name-confirm').click(); });
    $('ve-name-confirm').addEventListener('click', async () => {
      const name = $('ve-name-input').value.trim();
      if (!name) { $('ve-name-input').focus(); return; }
      $('ve-name-dialog').style.display = 'none';
      const result = await window.creatorhub.project.create(name).catch(() => null);
      if (!result || !result.ok) { showToast('Could not create project'); return; }
      // Reset editor state for new project
      veClips = []; veAudioClips = []; veTextOverlays = []; veHypeMarkers = [];
      veSelId = null; veHistory = []; veHistIdx = -1; vePlayPos = 0;
      veTotalDur = 0; veZoom = 1; veScrollOff = 0;
      video.src = ''; video.load();
      veLayers.forEach(l => { l.wrap.style.display = 'none'; if (!l.video.paused) l.video.pause(); l.video.src = ''; });
      computeLayout(); updateUndoRedo(); refreshClipPanel(); renderTextList();
      openEditor(result.path, name);
      drawTimeline();
    });
    $('ve-dash-new').addEventListener('click', showNameDialog);

    async function openProjectFromDash(p) {
      const result = await window.creatorhub.project.load(p.path).catch(() => null);
      if (!result || !result.ok) { showToast('Could not open project'); return; }
      openEditor(p.path, p.name);
      await loadProjectState(result.state, result.pathMap || {});
    }

    async function renameProjectDash(p) {
      const newName = prompt('Rename project:', p.name);
      if (!newName || !newName.trim()) return;
      await window.creatorhub.project.rename(p.path, newName.trim()).catch(() => {});
      loadDashboard();
      if (veProjectPath === p.path) {
        veProjectName = newName.trim();
        $('ve-project-name-display').textContent = veProjectName;
      }
    }

    async function deleteProjectDash(p) {
      if (!confirm(`Delete project "${p.name}"? This cannot be undone.`)) return;
      await window.creatorhub.project.delete(p.path).catch(() => {});
      loadDashboard();
    }

    // ── Transport controls ─────────────────────────────────────────────────────
    $('ve-btn-play').addEventListener('click', () => {
      if (!veClips.length) return;
      if (veIsPlaying) { stopPlayback(); return; }
      if (vePlayPos >= veTotalDur - 0.1) seekToPos(0);
      startPlayback();
    });
    $('ve-btn-tostart').addEventListener('click',    () => { if (veClips.length) seekToPos(0); });
    $('ve-btn-toend').addEventListener('click',      () => { if (veClips.length) seekToPos(veTotalDur); });
    $('ve-btn-back5').addEventListener('click',      () => { if (veClips.length) seekToPos(vePlayPos - 5); });
    $('ve-btn-fwd5').addEventListener('click',       () => { if (veClips.length) seekToPos(vePlayPos + 5); });
    $('ve-btn-prev-frame').addEventListener('click', () => { if (veClips.length) { stopPlayback(); seekToPos(vePlayPos - 1/30); } });
    $('ve-btn-next-frame').addEventListener('click', () => { if (veClips.length) { stopPlayback(); seekToPos(vePlayPos + 1/30); } });
    $('ve-btn-loop').addEventListener('click',  () => { veLoop = !veLoop; $('ve-btn-loop').classList.toggle('ve-btn-active', veLoop); });
    $('ve-btn-split').addEventListener('click', () => splitClipsAtPlayhead());
    $('ve-volume').addEventListener('input', function() { video.volume = this.value / 100; });

    // ── Zoom controls ──────────────────────────────────────────────────────────
    $('ve-zoom-slider').addEventListener('input', function() { veZoom = parseFloat(this.value); clampScroll(); drawTimeline(); });
    $('ve-btn-zoom-in').addEventListener('click',  () => { veZoom = Math.min(40, veZoom*1.5); $('ve-zoom-slider').value = String(veZoom); clampScroll(); drawTimeline(); });
    $('ve-btn-zoom-out').addEventListener('click', () => { veZoom = Math.max(1, veZoom/1.5);  $('ve-zoom-slider').value = String(veZoom); clampScroll(); drawTimeline(); });

    // ── Undo/Redo ──────────────────────────────────────────────────────────────
    $('ve-btn-undo').addEventListener('click', () => { if (veHistIdx <= 0) return; veHistIdx--; applySnapshot(veHistory[veHistIdx]); updateUndoRedo(); });
    $('ve-btn-redo').addEventListener('click', () => { if (veHistIdx >= veHistory.length-1) return; veHistIdx++; applySnapshot(veHistory[veHistIdx]); updateUndoRedo(); });

    // Ctrl+S save / S split
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveProject(); return; }
      const tag = document.activeElement?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
      if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping) {
        e.preventDefault(); splitClipsAtPlayhead();
      }
    });

    // ── Fade controls ──────────────────────────────────────────────────────────
    $('ve-fade-in-en').addEventListener('change',  function() { veFadeInEn  = this.checked; updateFadeOverlay(); });
    $('ve-fade-out-en').addEventListener('change', function() { veFadeOutEn = this.checked; updateFadeOverlay(); });
    $('ve-fade-in-dur').addEventListener('input',  function() { veFadeInDur  = parseFloat(this.value) || 0.5; });
    $('ve-fade-out-dur').addEventListener('input', function() { veFadeOutDur = parseFloat(this.value) || 0.5; });

    // ── Trim inputs ────────────────────────────────────────────────────────────
    $('ve-in-input').addEventListener('change', function() {
      const clip = selectedClip(); if (!clip) return;
      clip.inPoint = Math.max(0, Math.min(clip.outPoint - 0.1, veStrToSecs(this.value)));
      this.value = veSecsToHMS(clip.inPoint);
      computeLayout(); pushHistory(); drawTimeline();
    });
    $('ve-out-input').addEventListener('change', function() {
      const clip = selectedClip(); if (!clip) return;
      clip.outPoint = Math.max(clip.inPoint + 0.1, Math.min(clip.fileDuration, veStrToSecs(this.value)));
      this.value = veSecsToHMS(clip.outPoint);
      computeLayout(); pushHistory(); drawTimeline();
    });

    // ── Speed buttons ──────────────────────────────────────────────────────────
    document.querySelectorAll('.ve-speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const clip = selectedClip(); if (!clip) return;
        clip.speed = parseFloat(btn.dataset.speed);
        video.playbackRate = clip.speed;
        computeLayout(); pushHistory(); refreshClipPanel(); drawTimeline();
      });
    });

    // ── Mute clip ──────────────────────────────────────────────────────────────
    $('ve-mute-btn').addEventListener('click', () => {
      const clip = selectedClip() || selectedAudioClip(); if (!clip) return;
      clip.muted = !clip.muted;
      syncAllLayers(); syncAudioElements();
      pushHistory(); refreshClipPanel(); drawTimeline();
    });

    // ── Transition in (V1 clip) ────────────────────────────────────────────────
    $('ve-trans-pick').addEventListener('click', () => {
      const clip = selectedClip(); if (!clip) return;
      openTransitionPicker(clip, () => { pushHistory(); refreshClipPanel(); drawTimeline(); });
    });
    $('ve-trans-remove').addEventListener('click', () => {
      const clip = selectedClip(); if (!clip) return;
      delete clip.transitionIn;
      pushHistory(); refreshClipPanel(); drawTimeline();
    });

    // ── Separate audio ─────────────────────────────────────────────────────────
    $('ve-sep-audio-btn').addEventListener('click', () => {
      const clip = selectedClip(); if (!clip || clip.audioDetached) return;
      clip.audioDetached = true;
      // Find first empty audio track
      const usedTracks = new Set(veAudioClips.map(a => a.audioTrack || 0));
      let audioTrack = 0;
      while (usedTracks.has(audioTrack)) audioTrack++;
      const aclip = {
        id: genId(), sourceClipId: clip.id,
        filePath: clip.filePath, fileName: clip.fileName, fileUrl: clip.fileUrl,
        fileDuration: clip.fileDuration, audioTrack,
        timelineStart: clip.timelineStart, timelineDuration: clip.timelineDuration,
        inPoint: clip.inPoint, outPoint: clip.outPoint,
        volume: clip.volume || 1, waveform: null,
      };
      veAudioClips.push(aclip);
      loadWaveform(aclip);
      computeLayout(); pushHistory(); refreshClipPanel(); drawTimeline();
      showToast(`Audio from "${clip.fileName}" separated to A${audioTrack+1}`);
    });

    // ── Layer clip panel buttons ────────────────────────────────────────────────
    $('ve-layer-goto').addEventListener('click', () => {
      const clip = selectedClip(); if (clip && clip.track > 0) seekToPos(clip.timelineStart);
    });
    $('ve-layer-toV1').addEventListener('click', () => {
      const clip = selectedClip(); if (!clip || !clip.track) return;
      clip.track = 0; clip.keyframes = []; delete clip.x; delete clip.y; delete clip.w; delete clip.h;
      computeLayout(); updateAllLayerVideos(); refreshClipPanel(); drawTimeline(); pushHistory();
      showToast(`${clip.fileName} moved to V1`);
    });
    $('ve-layer-delete').addEventListener('click', () => {
      const clip = selectedClip(); if (!clip) return;
      veClips = veClips.filter(c => c !== clip);
      veSelId = null; computeLayout(); updateAllLayerVideos(); refreshClipPanel(); drawTimeline(); pushHistory();
      showToast('Clip removed');
    });

    // ── Keyframe buttons ───────────────────────────────────────────────────────
    $('ve-kf-add').addEventListener('click', () => {
      const clip = selectedClip();
      if (!clip || clip.track === 0) return;
      addKeyframeToClip(clip);
    });
    $('ve-kf-clear').addEventListener('click', () => {
      const clip = selectedClip();
      if (!clip || !clip.keyframes || !clip.keyframes.length) return;
      if (!confirm('Remove all keyframes from this clip?')) return;
      clip.keyframes = [];
      pushHistory(); refreshClipPanel(); drawTimeline();
      showToast('Keyframes cleared');
    });
    $('ve-kf-help').addEventListener('click', () => showKfOnboarding());

    // ── Keyframe onboarding ────────────────────────────────────────────────────
    const KF_STEPS = [
      { icon: '🎬', title: 'Layer Clips Can Animate!',
        body: 'You\'ve added a clip to a V2+ layer. By default it sits at a <b>fixed position</b>. Keyframes let it <b>smoothly move</b> to different positions at different moments in time.' },
      { icon: '📍', title: 'Step 1 — Position Your Clip',
        body: 'Drag the clip in the <b>preview</b> to where you want it to start, or end up. You can also resize it by dragging the corner handles.' },
      { icon: '◆', title: 'Step 2 — Record a Keyframe',
        body: 'Move the playhead to the exact moment, then click <b>"◆ Record Keyframe Here"</b>. This saves the clip\'s position at that point in time.' },
      { icon: '➡️', title: 'Step 3 — Add More Keyframes',
        body: 'Move the playhead to a <b>new time</b>, reposition the clip in the preview, and record again. Each ◆ diamond on the timeline is one keyframe.' },
      { icon: '▶', title: 'Step 4 — Watch It Move!',
        body: 'Press <b>Play</b> and the clip will glide smoothly between all your keyframe positions using ease-in-out interpolation. Click any keyframe in the list to jump to it.' },
    ];
    let kfObStep = 0;

    function showKfOnboarding(startStep = 0) {
      kfObStep = startStep;
      const el = $('ve-kf-onboard');
      el.style.display = 'flex';
      renderKfOnboardStep();
    }

    function renderKfOnboardStep() {
      const s = KF_STEPS[kfObStep];
      $('ve-kf-ob-content').innerHTML = `<div class="ve-kf-ob-icon">${s.icon}</div><div class="ve-kf-ob-title">${s.title}</div><div class="ve-kf-ob-body">${s.body}</div>`;
      const dots = $('ve-kf-ob-dots');
      dots.innerHTML = '';
      KF_STEPS.forEach((_, i) => {
        const d = document.createElement('div');
        d.className = 've-kf-ob-dot' + (i === kfObStep ? ' active' : '');
        dots.appendChild(d);
      });
      $('ve-kf-ob-prev').style.opacity  = kfObStep === 0 ? '0.3' : '1';
      $('ve-kf-ob-prev').style.pointerEvents = kfObStep === 0 ? 'none' : 'auto';
      $('ve-kf-ob-next').textContent = kfObStep === KF_STEPS.length - 1 ? 'Got it!' : 'Next →';
    }

    $('ve-kf-ob-next').addEventListener('click', () => {
      if (kfObStep < KF_STEPS.length - 1) { kfObStep++; renderKfOnboardStep(); }
      else { $('ve-kf-onboard').style.display = 'none'; localStorage.setItem('ve-kf-seen', '1'); }
    });
    $('ve-kf-ob-prev').addEventListener('click', () => {
      if (kfObStep > 0) { kfObStep--; renderKfOnboardStep(); }
    });
    $('ve-kf-ob-x').addEventListener('click', () => {
      $('ve-kf-onboard').style.display = 'none';
      localStorage.setItem('ve-kf-seen', '1');
    });

    // Show onboarding first time a V2+ clip is selected
    let kfOnboardTriggered = false;
    function maybeShowKfOnboarding() {
      if (kfOnboardTriggered) return;
      if (localStorage.getItem('ve-kf-seen')) return;
      const clip = selectedClip();
      if (!clip || clip.track === 0) return;
      kfOnboardTriggered = true;
      setTimeout(() => showKfOnboarding(0), 400); // slight delay so UI settles
    }

    // ── Text overlays ──────────────────────────────────────────────────────────
    $('ve-text-add-btn').addEventListener('click', () => {
      const text = $('ve-text-input').value.trim();
      if (!text) { showToast('Enter text first'); return; }
      const start = veStrToSecs($('ve-text-start').value) || vePlayPos;
      const end   = veStrToSecs($('ve-text-end').value)   || Math.min(vePlayPos + 5, veTotalDur);
      veTextOverlays.push({ id: genId(), text, pos: $('ve-text-pos').value, color: $('ve-text-color').value, startSec: start, endSec: end });
      $('ve-text-input').value = '';
      pushHistory(); renderTextList(); drawTimeline();
    });

    // ── Format buttons ─────────────────────────────────────────────────────────
    document.querySelectorAll('.ve-format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ve-format-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active'); veFormat = btn.dataset.fmt;
      });
    });

    // ── Hype detection ─────────────────────────────────────────────────────────
    $('ve-btn-hype').addEventListener('click', async () => {
      if (!veClips.length) return;
      $('ve-btn-hype').disabled = true; $('ve-btn-hype').textContent = '⚡ Analyzing…';
      for (const c of veClips) { if (!c.waveform) await loadWaveform(c); }
      veHypeMarkers = [];
      for (const clip of veClips) {
        if (!clip.waveform) continue;
        const peaks = clip.waveform, maxPeak = Math.max(...peaks, 0.001), thresh = maxPeak * 0.75;
        let inHype = false, lastT = -999;
        for (let i = 0; i < peaks.length; i++) {
          const t = clip.timelineStart + (i / peaks.length) * clip.timelineDuration;
          if (peaks[i] >= thresh && !inHype && t - lastT > 5) { veHypeMarkers.push({ timelinePos: t, intensity: peaks[i]/maxPeak }); lastT = t; inHype = true; }
          else if (peaks[i] < thresh * 0.5) { inHype = false; }
        }
      }
      drawTimeline();
      showToast(`Found ${veHypeMarkers.length} hype moment${veHypeMarkers.length !== 1 ? 's' : ''}`);
      $('ve-btn-hype').disabled = false; $('ve-btn-hype').textContent = '⚡ Find Hype';
    });

    // ── Wire up buttons ────────────────────────────────────────────────────────
    $('ve-btn-addclip').addEventListener('click',    () => openVeFilePicker());
    $('ve-btn-fromrec').addEventListener('click',    () => openVeFromRecordings());
    $('ve-btn-export-top').addEventListener('click', doVeExport);
    $('ve-export-btn').addEventListener('click',     doVeExport);
    $('ve-btn-save').addEventListener('click',       saveProject);

    $('ve-canvas-select').addEventListener('change', function() {
      const [w, h] = this.value.split('x').map(Number);
      veCanvasW = w; veCanvasH = h;
      updateCanvasAspectRatio();
    });

    window.creatorhub.videoeditor.onProgress(pct => {
      $('ve-progress-fill').style.width = pct + '%';
      $('ve-progress-label').textContent = pct + '%';
    });
    $('ve-btn-back-dash').addEventListener('click',  backToDashboard);

    // ── Init ───────────────────────────────────────────────────────────────────
    updateUndoRedo();
    refreshClipPanel();
    new ResizeObserver(() => { resizeCanvas(); resizeOverlay(); }).observe(canvas.parentElement);
    resizeCanvas(); resizeOverlay();
    // Show dashboard on load
    $('ve-dashboard').style.display = 'flex';
    loadDashboard();
  }

  // ── Onboarding ────────────────────────────────────────────────────────────
  $('ob-next-1').addEventListener('click', () => {
    $('ob-step-1').classList.remove('active');
    $('ob-step-2').classList.add('active');
    document.querySelectorAll('.ob-dot').forEach((d, i) => d.classList.toggle('active', i < 2));
  });
  $('ob-done-2').addEventListener('click', () => closeOnboarding());

  // ── Boot ─────────────────────────────────────────────────────────────────
  boot();
});
