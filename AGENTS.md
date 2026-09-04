<!-- From: /home/quanysh/Documents/GitHub/ocr-extension/AGENTS.md -->
# EN/KZ Text Extractor — Agent Guide

## Project Overview

GNOME Shell extension that mimics macOS Live Text. Select a screen area, run OCR, copy recognized text to the clipboard.

**Supported languages:** English, Russian, Kazakh (EasyOCR with `en`, `ru`, `rs_cyrillic`).

**Supported platforms:** Ubuntu 22.04+, Fedora, Arch/CachyOS/Manjaro, GNOME Shell 45–47, Wayland and X11.

**Repository:** `git@github.com:QuanyshK/ocr-extension.git`

## Architecture

```
┌─────────────────────────────────────────┐
│  GNOME Shell Extension (GJS / ESM)      │  UI: panel button, prefs, shortcut recorder
│  gnome-shell-extension/enkz-text-extractor@quanysh.github.io/  │
├─────────────────────────────────────────┤
│  Screenshot + OCR Orchestrator (Bash)   │  Coordination
│  screenshot_ocr.sh                      │
├─────────────────────────────────────────┤
│  OCR Engine (Python 3)                  │  Processing
│  ocr_engine.py                          │
└─────────────────────────────────────────┘
```

### File Responsibilities

| File | Purpose |
|------|---------|
| `extension.js` | Panel button, popup menu, configurable hotkey via GSettings, launches `screenshot_ocr.sh` via `Gio.Subprocess`. ESM: `export default class extends Extension` |
| `prefs.js` | Preferences UI using `Adw` (`Adw.PreferencesPage`, `Adw.SwitchRow`, `Adw.EntryRow`, shortcut recorder dialog). ESM: `export default class extends ExtensionPreferences` |
| `stylesheet.css` | Extension styling (`enkz-text-*` prefixed classes) |
| `metadata.json` | Extension metadata; `shell-version`: `["45", "46", "47"]`, `uuid`: `enkz-text-extractor@quanysh.github.io` |
| `schemas/org.gnome.shell.extensions.enkz-text-extractor.gschema.xml` | GSettings schema: `shortcut` (as), `custom-script-path` (s), `auto-copy` (b), `show-notification` (b) |
| `screenshot_ocr.sh` | Detects Wayland/X11, takes area screenshot, calls `ocr_engine.py`, shows notifications |
| `ocr_engine.py` | Loads EasyOCR (`en`, `ru`, `rs_cyrillic`), runs inference, copies result to clipboard |
| `install.sh` | Unified installer. Supports APT, DNF, PACMAN. GPU-capable PyTorch by default; `./install.sh --cpu` for CPU-only wheel |
| `build.sh` | Builds `.shell-extension.zip` package via `gnome-extensions pack` |

### Runtime Paths

- `~/.local/share/ocr-extension/` — OCR scripts and Python venv
- `~/.local/share/gnome-shell/extensions/enkz-text-extractor@quanysh.github.io/` — GNOME extension files
- `/tmp/ocr_shot.png` — temporary screenshot file

## Technology Stack

| Layer | Technology |
|-------|-----------|
| OCR Engine | Python 3.8+ with EasyOCR |
| ML Framework | PyTorch / TorchVision (CPU-only option via `--cpu`) |
| Screenshot | Wayland: `grim` + `slurp`; X11: `gnome-screenshot`, `maim`, or `scrot` |
| Clipboard | Wayland: `wl-copy`; X11: `xclip`; Fallback: `pyperclip` |
| Desktop Integration | GNOME Shell Extension (GJS ESM) |
| Notifications | `libnotify-bin` / `notify-send` |
| UI Toolkit | GTK4 / Adwaita (GNOME 45+) |

## Installation

```bash
# Full install (GPU-capable PyTorch, ~2 GB)
./install.sh

# CPU-only install (~200 MB)
./install.sh --cpu
```

Steps performed:
1. Detect package manager (apt/dnf/pacman) and install system dependencies
2. Create Python venv at `~/.local/share/ocr-extension/venv`
3. Install Python packages (`easyocr`, `pyperclip`, `Pillow`, `numpy`, `torch`, `torchvision`)
4. Copy `ocr_engine.py` and `screenshot_ocr.sh` to `~/.local/share/ocr-extension/`
5. Copy extension files to `~/.local/share/gnome-shell/extensions/enkz-text-extractor@quanysh.github.io/`
6. Compile gschema with `glib-compile-schemas`
7. Create `.desktop` file at `~/.local/share/applications/enkz-text-extractor.desktop`
8. Enable extension via `gnome-extensions enable`

Restart GNOME Shell after install (X11: Alt+F2 → `r`; Wayland: re-login).

## Building Extension Package

```bash
./build.sh
```

Produces `build/enkz-text-extractor@quanysh.github.io.shell-extension.zip`.

Install manually:
```bash
gnome-extensions install --force build/enkz-text-extractor@quanysh.github.io.shell-extension.zip
```

## Development

No formal build system. After editing extension files:

```bash
# Re-compile gschema
glib-compile-schemas ~/.local/share/gnome-shell/extensions/enkz-text-extractor@quanysh.github.io/schemas/

# Reload extension
gnome-extensions disable enkz-text-extractor@quanysh.github.io
gnome-extensions enable enkz-text-extractor@quanysh.github.io

# View logs
journalctl -f -o cat /usr/bin/gnome-shell
```

Python changes take effect immediately (no rebuild).

## Code Style

- **Bash:** `set -euo pipefail`, color-coded output (`RED`, `GREEN`, `YELLOW`, `BLUE`, `NC`), `log_*` helpers.
- **Python:** PEP 8, `argparse`, errors to `stderr`, `main()` guard, executable shebang.
- **JavaScript/GJS:** ESM imports only (`import ... from 'gi://...'` or `resource:///...'`), `export default class`, no `imports.gi` / `imports.ui` / `ExtensionUtils` legacy.
- **CSS:** Kebab-case classes prefixed with `enkz-text-`.

## Testing

No automated tests. Manual verification:

1. Run `./install.sh`.
2. Click the panel icon or set a hotkey in Preferences.
3. Select a screen area with text.
4. Verify clipboard contains the recognized text and a notification appears.

Component tests:

```bash
# Screenshot tool
# Wayland:
grim -g "$(slurp)" /tmp/test.png
# X11:
gnome-screenshot -a -f /tmp/test.png

# OCR engine
cd ~/.local/share/ocr-extension
source venv/bin/activate
python3 ocr_engine.py /tmp/test.png

# Extension status
gnome-extensions list
gnome-extensions info enkz-text-extractor@quanysh.github.io
```

## Deployment

Distribution is via Git clone + `./install.sh` or `.shell-extension.zip` package. No `.deb`, Flatpak, or GNOME Extensions website packaging yet.

## Security

- Bash scripts use `set -euo pipefail` for fail-fast.
- Installer runs `sudo apt-get/dnf/pacman` — requires root for system dependencies.
- Python venv is isolated in the user's home directory.
- `/tmp/ocr_shot.png` is a predictable path; overwritten on each run.
- No network-exposed services; all communication is local.

## Implementation Notes

- **Kazakh support:** EasyOCR has no dedicated Kazakh model. Uses `rs_cyrillic` (Serbian Cyrillic) as a proxy for Kazakh-specific characters (`ә`, `ғ`, `қ`, `ң`, `ө`, `ұ`, `ү`, `һ`, `і`).
- **First-run delay:** EasyOCR downloads language models (~40 MB) on first launch. Subsequent runs are fast.
- **No lock files:** There is no `requirements.txt`, `Pipfile`, or `poetry.lock`. Python dependencies are pinned only by `install.sh`.
- **Custom script path:** Users can override the default `~/.local/share/ocr-extension/screenshot_ocr.sh` via the `custom-script-path` GSettings key.

## Uninstallation

```bash
gnome-extensions disable enkz-text-extractor@quanysh.github.io
rm -rf ~/.local/share/gnome-shell/extensions/enkz-text-extractor@quanysh.github.io
rm -rf ~/.local/share/ocr-extension
rm -f ~/.local/share/applications/enkz-text-extractor.desktop
```
