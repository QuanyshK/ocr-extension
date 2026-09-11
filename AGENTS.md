# QK Text Extractor — Agent Guide

## Project Overview

GNOME Shell extension that mimics macOS Live Text. Select a screen area, run OCR, copy recognized text to the clipboard.

Built strictly according to [extensions.gnome.org (EGO)](https://extensions.gnome.org/) standards as a self-contained GJS extension without external Python scripts, virtual environments, or wrapper bash daemons.

**Supported languages:** Kazakh (`kaz`), English (`eng`), Russian (`rus`) via system Tesseract OCR.

**Supported platforms:** Ubuntu 22.04+, Fedora, Arch/CachyOS/Manjaro, GNOME Shell 45–50, Wayland and X11.

**Repository:** `git@github.com:QuanyshK/ocr-extension.git`

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  GNOME Shell Extension (GJS / ESM)                           │
│  gnome-shell-extension/qk-text-extractor@quanysh.github.io/  │
├──────────────────────────────────────────────────────────────┤
│  • Dependency Check: GLib.find_program_in_path('tesseract')  │
│    → distro-aware notification via /etc/os-release           │
│  • Area Selection: Clutter.Actor overlay + St.Widget box     │
│  • Cursor: Meta.Cursor.CROSSHAIR on activation               │
│  • Screenshot: Shell.Screenshot.screenshot_area              │
│  • OCR Process: Gio.Subprocess -> tesseract (kaz+eng+rus)    │
│  • Clipboard: St.Clipboard.set_text                          │
│  • Notifications: Main.notify                                │
│  • Preferences: Adw (GTK4 / Libadwaita)                      │
└──────────────────────────────────────────────────────────────┘
```

### File Responsibilities

| File | Purpose |
|------|---------|
| `extension.js` | Panel button, popup menu, configurable hotkey via GSettings, area selection, screenshot capture, `Gio.Subprocess` tesseract runner, native `St.Clipboard` and `Main.notify`. Exports module-level `checkTesseractOrNotify()` (reads `/etc/os-release`, detects distro, notifies with install command). Guards `enable()`, `_runOCR()`, and `_runTesseract()`. ESM: `export default class extends Extension` |
| `prefs.js` | Preferences UI using `Adw`. Includes **Dependencies group**: live Tesseract status badge (green ✓ / red ✗), Re-check button, distro-aware install command row with one-click clipboard copy. Shortcut recorder dialog. ESM: `export default class extends ExtensionPreferences` |
| `stylesheet.css` | Extension styling (`ocr-selection-box` class) |
| `metadata.json` | Extension metadata; `shell-version`: `["45", "46", "47", "48", "49", "50"]`, `uuid`: `qk-text-extractor@quanysh.github.io` |
| `schemas/org.gnome.shell.extensions.qk-text-extractor.gschema.xml` | GSettings schema: `shortcut` (as), `auto-copy` (b), `show-notification` (b) |
| `install.sh` | System package installer (tesseract + language packs), compiles gschema and enables extension |
| `build.sh` | Builds `.shell-extension.zip` package via standard `gnome-extensions pack` |

### Runtime Paths

- `~/.local/share/gnome-shell/extensions/qk-text-extractor@quanysh.github.io/` — Extension files
- `/tmp/ocr_<user>_<timestamp>.png` — Temporary screenshot cleaned up immediately after inference

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Extension Runtime | GNOME Shell GJS (ESM) |
| OCR Engine | System Tesseract CLI (`tesseract <file> stdout -l kaz+eng+rus --psm 6`) |
| Screenshot | Native `Shell.Screenshot.screenshot_area` |
| Selection Overlay | Native `Clutter.Actor` + `St.Widget` (`ocr-selection-box`) |
| Clipboard | Native GNOME Shell `St.Clipboard` |
| Notifications | Native GNOME Shell `Main.notify` |
| UI Toolkit | GTK4 / Libadwaita (Adw) |

## Installation

```bash
./install.sh
```

Steps performed:
1. Detect package manager (pacman/apt/dnf) and install `tesseract` with `kaz`, `eng`, `rus` packages
2. Copy extension files to `~/.local/share/gnome-shell/extensions/qk-text-extractor@quanysh.github.io/`
3. Compile gschema with `glib-compile-schemas`
4. Enable extension via `gnome-extensions enable`

## Building and Installing Extension Package

```bash
# Build package and install in one step:
./build.sh --install

# Or build only:
./build.sh
```

Produces `build/qk-text-extractor@quanysh.github.io.shell-extension.zip`.

Install manually:
```bash
gnome-extensions install --force build/qk-text-extractor@quanysh.github.io.shell-extension.zip
```

## Development

```bash
# Re-compile gschema
glib-compile-schemas ~/.local/share/gnome-shell/extensions/qk-text-extractor@quanysh.github.io/schemas/

# Reload extension
gnome-extensions disable qk-text-extractor@quanysh.github.io
gnome-extensions enable qk-text-extractor@quanysh.github.io

# View logs
journalctl -f -o cat /usr/bin/gnome-shell
```

## Code Style

- **Bash:** `set -euo pipefail`, color-coded output (`RED`, `GREEN`, `YELLOW`, `BLUE`, `NC`), `log_*` helpers.
- **JavaScript/GJS:** ESM imports only (`import ... from 'gi://...'` or `resource:///...'`), `export default class`, no legacy `imports.gi`.
- **CSS:** Clean CSS classes without unnecessary styling.

## Dependency Check Pattern

The extension follows the canonical GNOME UX pattern for optional system dependencies:

### `checkTesseractOrNotify()` (extension.js, module scope)

```js
// Reads /etc/os-release, maps to 'arch' | 'debian' | 'fedora' | 'unknown'
// Returns true if tesseract is in PATH, otherwise shows Main.notify() with
// the exact distro-specific install command and returns false.
const ok = checkTesseractOrNotify();
```

**Three guard points** — all call `checkTesseractOrNotify()`:

| Point | Why |
|-------|-----|
| `enable()` | Surface the issue immediately on login/session start |
| `_runOCR()` | Prevent the crosshair overlay from ever opening |
| `_runTesseract()` | Safety net after screenshot is taken |

### Preferences Dependencies group (prefs.js)

- `Adw.ActionRow` "Tesseract OCR" with a `Gtk.Label` badge using Pango `<span foreground="…">` markup
  - Green `#26a269` → ✓ Installed
  - Red `#c01c28` → ✗ Not found
- **Re-check** `Gtk.Button` (flat) — calls `GLib.find_program_in_path()` inline, updates badge and subtitle without closing prefs
- `Adw.ActionRow` "Install command" — subtitle shows the distro-specific command; copy `Gtk.Button` writes to `window.get_clipboard()` and briefly swaps to `object-select-symbolic`

## Security

- No persistent daemons or background sockets.
- Temporary files are named uniquely per user and timestamp (`/tmp/ocr_${GLib.get_user_name()}_${Date.now()}.png`) and deleted immediately after OCR inference.
- Pure GJS implementation fully reviewable by extensions.gnome.org reviewers.

## Uninstallation

```bash
gnome-extensions disable qk-text-extractor@quanysh.github.io
rm -rf ~/.local/share/gnome-shell/extensions/qk-text-extractor@quanysh.github.io
```
