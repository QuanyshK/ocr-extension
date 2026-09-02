# OCR Text Extractor — Agent Guide

## Project Overview

GNOME Shell extension that mimics macOS Live Text. Select a screen area, run OCR, copy recognized text to the clipboard.

**Supported languages:** English, Russian, Kazakh (EasyOCR with `en`, `ru`, `rs_cyrillic`).

**Supported platforms:** Ubuntu 22.04+, GNOME Shell 45–47, Wayland and X11.

**Repository:** `git@github.com:QuanyshK/ocr-extension.git`

## Architecture

```
┌─────────────────────────────────────────┐
│  GNOME Shell Extension (GJS / ESM)      │  UI: panel button, hotkey, menu, prefs
│  gnome-shell-extension/ocr-text@local/  │
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
| `extension.js` | Panel button, popup menu, hotkey (`Super+Shift+O`), launches `screenshot_ocr.sh` via `Gio.Subprocess`. ESM: `export default class extends Extension` |
| `prefs.js` | Preferences UI using `Adw` (`Adw.PreferencesPage`, `Adw.SwitchRow`). ESM: `export default class extends ExtensionPreferences` |
| `stylesheet.css` | Extension styling (`ocr-text-*` prefixed classes) |
| `metadata.json` | Extension metadata; `shell-version`: `["45", "46", "47"]` |
| `schemas/org.gnome.shell.extensions.ocr-text.gschema.xml` | GSettings schema: `shortcut`, `auto-copy`, `show-notification`, `ocr-language` |
| `screenshot_ocr.sh` | Detects Wayland/X11, takes area screenshot, calls `ocr_engine.py`, shows notifications |
| `ocr_engine.py` | Loads EasyOCR (`en`, `ru`, `rs_cyrillic`), runs inference, copies result to clipboard |
| `install.sh` | Unified installer. GPU-capable PyTorch by default; `./install.sh --cpu` for CPU-only wheel |

### Runtime Paths

- `~/.local/share/ocr-extension/` — OCR scripts and Python venv
- `~/.local/share/gnome-shell/extensions/ocr-text@local/` — GNOME extension files
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
1. Install system dependencies (`apt`)
2. Create Python venv at `~/.local/share/ocr-extension/venv`
3. Install Python packages (`easyocr`, `pyperclip`, `Pillow`, `numpy`, `torch`, `torchvision`)
4. Copy `ocr_engine.py` and `screenshot_ocr.sh` to `~/.local/share/ocr-extension/`
5. Copy extension files to `~/.local/share/gnome-shell/extensions/ocr-text@local/`
6. Compile gschema with `glib-compile-schemas`
7. Create `.desktop` file at `~/.local/share/applications/ocr-text.desktop`
8. Enable extension via `gnome-extensions enable`

Restart GNOME Shell after install (X11: Alt+F2 → `r`; Wayland: re-login).

## Development

No formal build system. After editing extension files:

```bash
# Re-compile gschema
glib-compile-schemas ~/.local/share/gnome-shell/extensions/ocr-text@local/schemas/

# Reload extension
gnome-extensions disable ocr-text@local
gnome-extensions enable ocr-text@local

# View logs
journalctl -f -o cat /usr/bin/gnome-shell
```

Python changes take effect immediately (no rebuild).

## Code Style

- **Bash:** `set -euo pipefail`, color-coded output (`RED`, `GREEN`, `YELLOW`, `BLUE`, `NC`), `log_*` helpers.
- **Python:** PEP 8, `argparse`, errors to `stderr`, `main()` guard, executable shebang.
- **JavaScript/GJS:** ESM imports only (`import ... from 'gi://...'` or `resource:///...`), `export default class`, no `imports.gi` / `imports.ui` / `ExtensionUtils` legacy.
- **CSS:** Kebab-case classes prefixed with `ocr-text-`.

## Testing

No automated tests. Manual verification:

1. Run `./install.sh`.
2. Press `Super+Shift+O` or click the panel icon.
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
gnome-extensions info ocr-text@local
```

## Deployment

Distribution is via Git clone + `./install.sh`. No `.deb`, Flatpak, or GNOME Extensions website packaging.

## Security

- Bash scripts use `set -euo pipefail` for fail-fast.
- Installer runs `sudo apt-get` — requires root for system dependencies.
- Python venv is isolated in the user's home directory.
- `/tmp/ocr_shot.png` is a predictable path; overwritten on each run.
- No network-exposed services; all communication is local.

## Implementation Notes

- **Kazakh support:** EasyOCR has no dedicated Kazakh model. Uses `rs_cyrillic` (Serbian Cyrillic) as a proxy for Kazakh-specific characters (`ә`, `ғ`, `қ`, `ң`, `ө`, `ұ`, `ү`, `һ`, `і`).
- **First-run delay:** EasyOCR downloads language models (~40 MB) on first launch. Subsequent runs are fast.
- **No lock files:** There is no `requirements.txt`, `Pipfile`, or `poetry.lock`. Python dependencies are pinned only by `install.sh`.

## Uninstallation

```bash
gnome-extensions disable ocr-text@local
rm -rf ~/.local/share/gnome-shell/extensions/ocr-text@local
rm -rf ~/.local/share/ocr-extension
rm -f ~/.local/share/applications/ocr-text.desktop
```
