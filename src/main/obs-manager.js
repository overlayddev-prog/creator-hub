/**
 * OBSManager — downloads, installs, and manages a bundled OBS Portable instance.
 *
 * Users never need to install OBS themselves. The app downloads OBS Portable
 * on first launch and runs it silently in the background.
 */

const path    = require('path');
const fs      = require('fs');
const https   = require('https');
const { spawn }        = require('child_process');
const { EventEmitter } = require('events');

const OBS_VERSION  = '32.1.0';
const OBS_FILENAME = `OBS-Studio-${OBS_VERSION}-Windows-x64.zip`;
const OBS_URL      = `https://github.com/obsproject/obs-studio/releases/download/${OBS_VERSION}/${OBS_FILENAME}`;

class OBSManager extends EventEmitter {
  constructor(userData) {
    super();
    this.installDir = path.join(userData, 'obs-portable');
    this._exe  = null;  // resolved after install
    this._proc = null;
  }

  // ── State ──────────────────────────────────────────────────────────────────
  get installed() {
    // Cache the exe path once found
    if (this._exe) return fs.existsSync(this._exe);
    const found = this._findExe(this.installDir);
    if (found) { this._exe = found; return true; }
    return false;
  }

  get running() {
    return !!(this._proc && !this._proc.killed);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Download, extract, and configure OBS. onProgress is called with 0‒1. */
  async setup(onProgress) {
    fs.mkdirSync(this.installDir, { recursive: true });

    const zipPath = path.join(this.installDir, 'obs.zip');

    // If a previous download was interrupted, clean it up
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    // 1. Download
    this.emit('status', { phase: 'downloading', progress: 0 });
    await this._download(OBS_URL, zipPath, (p) => {
      this.emit('status', { phase: 'downloading', progress: p });
      if (onProgress) onProgress(p);
    });

    // 2. Extract
    this.emit('status', { phase: 'extracting', progress: 1 });
    await this._extract(zipPath, this.installDir);
    fs.unlinkSync(zipPath);

    // 3. Find the exe (zip extracts into a versioned subfolder)
    this._exe = this._findExe(this.installDir);
    if (!this._exe) throw new Error('obs64.exe not found after extraction');

    // 4. Configure WebSocket (no auth, enabled by default)
    this._writeConfig();

    // 5. Install OBS Virtual Camera driver (requires UAC — user may decline, that's OK)
    this.emit('status', { phase: 'virtualcam', progress: 1 });
    await this._installVirtualCam();

    this.emit('status', { phase: 'ready', progress: 1 });
  }

  /** Spawn OBS silently in the background. */
  launch() {
    if (this.running) return;
    if (!this._exe) this._exe = this._findExe(this.installDir);
    if (!this._exe) throw new Error('OBS is not installed');

    const exeDir = path.dirname(this._exe);

    this._proc = spawn(this._exe, [
      '--portable',
      '--minimize-to-tray',
      '--disable-updater',
    ], {
      cwd: exeDir,
      detached: false,
      stdio: 'ignore',
    });

    this._proc.on('exit', () => {
      this._proc = null;
      this.emit('exited');
    });

    this.emit('launched');
  }

  /**
   * Strip OBS's chrome and position it at exact screen coordinates.
   * Called whenever the user switches to the Record/Stream module.
   */
  showAtPosition(x, y, w, h) {
    return new Promise((resolve) => {
      if (!this._proc) { resolve(); return; }
      const pid  = this._proc.pid;
      const os   = require('os');
      const spath = path.join(os.tmpdir(), 'obs-embed-show.ps1');
      const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class OBSEmbed {
  public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc e, IntPtr p);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr ins, int x, int y, int cx, int cy, uint f);
  [DllImport("user32.dll")] public static extern int  GetWindowLong(IntPtr hWnd, int i);
  [DllImport("user32.dll")] public static extern int  SetWindowLong(IntPtr hWnd, int i, int v);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  public static void ShowAt(int pid, int x, int y, int w, int h) {
    // First pass: restore any hidden/minimized OBS window so GetWindowRect returns real size
    EnumWindows((hWnd, p) => {
      uint wPid; GetWindowThreadProcessId(hWnd, out wPid);
      if ((int)wPid == pid) ShowWindow(hWnd, 9); // SW_RESTORE
      return true;
    }, IntPtr.Zero);

    System.Threading.Thread.Sleep(200); // let OBS redraw

    // Second pass: strip chrome and position the main window
    EnumWindows((hWnd, p) => {
      uint wPid; GetWindowThreadProcessId(hWnd, out wPid);
      if ((int)wPid != pid) return true;
      RECT r; GetWindowRect(hWnd, out r);
      if (r.R - r.L < 300) return true;          // skip tiny helper windows
      int s = GetWindowLong(hWnd, -16);           // GWL_STYLE
      s &= ~0x00C00000; s &= ~0x00040000;         // remove caption + thick frame
      s &= ~0x00020000; s &= ~0x00010000;         // remove min/max box
      SetWindowLong(hWnd, -16, s);
      int es = GetWindowLong(hWnd, -20);           // GWL_EXSTYLE
      es = (es | 0x00000080) & ~0x00040000;        // WS_EX_TOOLWINDOW, ~WS_EX_APPWINDOW
      SetWindowLong(hWnd, -20, es);
      SetWindowPos(hWnd, new IntPtr(-1), x, y, w, h, 0x0040); // HWND_TOPMOST + SWP_SHOWWINDOW
      return false;
    }, IntPtr.Zero);
  }
}
"@
[OBSEmbed]::ShowAt(${pid}, ${x}, ${y}, ${w}, ${h})`.trim();
      fs.writeFileSync(spath, script, 'utf8');
      const { exec } = require('child_process');
      exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${spath}"`, () => resolve());
      setTimeout(resolve, 4000);
    });
  }

  /** Remove OBS from app area and hide it. */
  hideFromApp() {
    return new Promise((resolve) => {
      if (!this._proc) { resolve(); return; }
      const pid  = this._proc.pid;
      const os   = require('os');
      const spath = path.join(os.tmpdir(), 'obs-embed-hide.ps1');
      const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class OBSHide {
  public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc e, IntPtr p);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr ins, int x, int y, int cx, int cy, uint f);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  public static void Hide(int pid) {
    EnumWindows((hWnd, p) => {
      uint wPid; GetWindowThreadProcessId(hWnd, out wPid);
      if ((int)wPid != pid) return true;
      RECT r; GetWindowRect(hWnd, out r);
      if (r.R - r.L < 300) return true;
      SetWindowPos(hWnd, new IntPtr(-2), 0, 0, 0, 0, 0x0013); // HWND_NOTOPMOST, NOMOVE|NOSIZE|NOACTIVATE
      ShowWindow(hWnd, 0);                                      // SW_HIDE
      return false;
    }, IntPtr.Zero);
  }
}
"@
[OBSHide]::Hide(${pid})`.trim();
      fs.writeFileSync(spath, script, 'utf8');
      const { exec } = require('child_process');
      exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${spath}"`, () => resolve());
      setTimeout(resolve, 4000);
    });
  }

  /** Shut down OBS gracefully so it doesn't show a crash/safe-mode dialog next launch. */
  stop() {
    if (!this._proc) return;
    const pid = this._proc.pid;
    this._proc = null;
    try {
      // taskkill without /f sends WM_CLOSE — OBS saves state cleanly
      require('child_process').execSync(`taskkill /pid ${pid}`, { timeout: 4000, stdio: 'ignore' });
    } catch (_) {
      // If graceful close times out or fails, force-terminate
      try { process.kill(pid); } catch (_) {}
    }
  }

  /**
   * Bring the OBS window to the foreground.
   * OBS starts minimised to tray — this restores and focuses it.
   */
  /**
   * Bring the OBS window to the foreground.
   * Uses EnumWindows to find ALL windows belonging to the OBS process —
   * this works even when OBS is minimised to the system tray (hidden window).
   */
  showWindow() {
    if (!this._proc) return;
    const pid = this._proc.pid;
    const os  = require('os');

    const scriptPath = path.join(os.tmpdir(), 'creatorhub-show-obs.ps1');
    const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinHelper {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);

  public static void ShowByPid(int targetPid) {
    EnumWindows((hWnd, lParam) => {
      uint wPid;
      GetWindowThreadProcessId(hWnd, out wPid);
      if ((int)wPid == targetPid) {
        ShowWindow(hWnd, 1);       // SW_SHOWNORMAL — restores hidden OR minimised
        SetForegroundWindow(hWnd);
      }
      return true;
    }, IntPtr.Zero);
  }
}
"@
[WinHelper]::ShowByPid(${pid})
`.trim();

    fs.writeFileSync(scriptPath, script, 'utf8');
    const { exec } = require('child_process');
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, () => {});
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Walk dir recursively to find obs64.exe (handles versioned subfolders). */
  _findExe(dir) {
    if (!fs.existsSync(dir)) return null;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch (_) { return null; }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isFile() && entry.name === 'obs64.exe') return full;
      if (entry.isDirectory()) {
        const found = this._findExe(full);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Write global.ini to enable WebSocket with no auth.
   * Config lives two levels above the exe: exe is at bin/64bit/obs64.exe,
   * so the OBS root is at exe/../../..
   */
  _writeConfig() {
    const obsRoot  = path.resolve(path.dirname(this._exe), '..', '..');
    const cfgDir   = path.join(obsRoot, 'config', 'obs-studio');
    fs.mkdirSync(cfgDir, { recursive: true });

    // portable_mode.txt tells OBS to store all config relative to itself
    fs.writeFileSync(path.join(obsRoot, 'portable_mode.txt'), '');

    fs.writeFileSync(path.join(cfgDir, 'global.ini'), [
      '[General]',
      'FirstRun=false',
      'EnableAutoUpdates=false',
      '',
      '[OBSWebSocket]',
      'ServerEnabled=true',
      'ServerPort=4455',
      'AuthRequired=false',
      'ServerPassword=',
    ].join('\n'));
  }

  /**
   * Install the OBS Virtual Camera driver so getUserMedia can access the virtual cam.
   * Runs obs64.exe --install-virtualcam via PowerShell RunAs (triggers UAC once).
   * If the user declines UAC or the install fails, the app still works — just no virtual cam.
   */
  _installVirtualCam() {
    if (!this._exe) return Promise.resolve();
    const exePath = this._exe.replace(/'/g, "''");
    const cmd = `Start-Process -FilePath '${exePath}' -ArgumentList '--install-virtualcam' -Verb RunAs -Wait -ErrorAction SilentlyContinue`;
    return new Promise((resolve) => {
      const ps = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', cmd], {
        windowsHide: true,
      });
      const timeout = setTimeout(resolve, 30000); // max 30s for UAC + install
      ps.on('close', () => { clearTimeout(timeout); resolve(); });
      ps.on('error', () => { clearTimeout(timeout); resolve(); });
    });
  }

  /** Download url → dest, following redirects, with progress callback. */
  _download(url, dest, onProgress) {
    return new Promise((resolve, reject) => {
      const get = (url) => {
        https.get(url, { headers: { 'User-Agent': 'CreatorHub/1.0' } }, (res) => {
          // Follow redirects (GitHub → CDN)
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume(); // drain response
            get(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`Download failed: HTTP ${res.statusCode}`));
            return;
          }

          const total    = parseInt(res.headers['content-length'] || '0', 10);
          let downloaded = 0;
          const file     = fs.createWriteStream(dest);

          res.on('data', (chunk) => {
            downloaded += chunk.length;
            if (total && onProgress) onProgress(downloaded / total);
            file.write(chunk);
          });

          res.on('end',   () => file.end(resolve));
          res.on('error', (e) => { file.destroy(); reject(e); });
          file.on('error', reject);
        }).on('error', reject);
      };

      get(url);
    });
  }

  /** Extract zipPath into destDir using PowerShell (built into Windows 10+). */
  _extract(zipPath, destDir) {
    return new Promise((resolve, reject) => {
      // Use single quotes inside the PS command to avoid escaping issues
      const cmd = `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destDir}' -Force`;
      const ps  = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', cmd], {
        windowsHide: true,
      });
      ps.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Extraction failed (PowerShell exit ${code})`));
      });
      ps.on('error', reject);
    });
  }
}

module.exports = OBSManager;
