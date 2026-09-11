# QK Text Extractor

Live Text OCR for GNOME — select any screen area, extract text, and copy it to the clipboard.

Built strictly according to [extensions.gnome.org (EGO)](https://extensions.gnome.org/) standards: pure GJS extension without external Python scripts, virtual environments, or heavy dependencies.

## Features

- Native GNOME Shell (GJS / ESM) implementation without external python/bash wrappers
- Area selection with crosshair cursor and translucent red highlight (clean before drag)
- Built-in screenshot capture via `Shell.Screenshot`
- High-speed recognition using system Tesseract OCR (`kaz+eng+rus`) with automatic PSM fallback (PSM 6 → PSM 3)
- Instant clipboard write via native `St.Clipboard`
- Desktop notifications via `Main.notify`
- Panel button with popup menu and configurable keyboard shortcut (`<Super><Shift>o` default)
- Modern Preferences window built with `Adw` (GTK4 / Libadwaita)
- Wayland and X11 compatible (GNOME Shell 45–50)
- **Dependency check on startup** — detects whether Tesseract is installed and shows a distro-aware install notification if not, without crashing

## Requirements

- GNOME Shell 45, 46, 47, 48, 49, 50
- Tesseract OCR with Kazakh, English, and Russian language packs:
  - **Arch Linux / CachyOS:** `sudo pacman -S tesseract tesseract-data-kaz tesseract-data-eng tesseract-data-rus`
  - **Ubuntu / Debian:** `sudo apt install tesseract-ocr tesseract-ocr-kaz tesseract-ocr-eng tesseract-ocr-rus`
  - **Fedora:** `sudo dnf install tesseract tesseract-langpack-kaz tesseract-langpack-eng tesseract-langpack-rus`

> **Note:** If Tesseract is not installed, the extension will display a desktop notification with the exact install command for your distro instead of silently failing.


## Installation

### Automated via install script

```bash
git clone git@github.com:QuanyshK/ocr-extension.git
cd ocr-extension
chmod +x install.sh
./install.sh
```

### Building and installing via build.sh

Build and install in one step:

```bash
chmod +x build.sh
./build.sh --install
```

Or build the package only:

```bash
./build.sh
gnome-extensions install --force build/qk-text-extractor@quanysh.github.io.shell-extension.zip
```

> **Note for VS Code / Snap users:** If you run `gnome-extensions install` inside an integrated terminal of a Snap app (like VS Code), run with `env XDG_DATA_HOME="$HOME/.local/share"` or simply use `./build.sh --install` which handles this automatically.

After installing, restart GNOME Shell to discover the extension:
- **X11:** Press `Alt+F2`, type `r`, and press `Enter`.
- **Wayland:** Log out and log back in.

## Usage

1. Click the OCR icon in the top panel or press `<Super><Shift>o`
2. Drag to select any screen area
3. Recognized text is immediately copied to your clipboard, and a notification appears

## Preferences

Open **Extension Manager** or **GNOME Extensions** app and click settings on **QK Text Extractor**:

- **Keyboard Shortcut** — record a custom key combination
- **Auto-copy to clipboard** — toggle automatic clipboard copy
- **Show notifications** — toggle desktop notifications
- **Dependencies** — live Tesseract status badge (✓ Installed / ✗ Not found), Re-check button, and distro-aware install command with one-click copy


## Extension Structure

```
gnome-shell-extension/qk-text-extractor@quanysh.github.io/
├── extension.js           # Full extension lifecycle, overlay & OCR runner (ESM)
├── prefs.js               # Preferences window (Adw / GTK4)
├── metadata.json          # Extension metadata (GNOME 45–50)
├── stylesheet.css         # Selection box styling
└── schemas/
    ├── org.gnome.shell.extensions.qk-text-extractor.gschema.xml
    └── gschemas.compiled
```

## Language Support

| Language | Code | Package Name |
|----------|------|--------------|
| Kazakh | `kaz` | `tesseract-data-kaz` / `tesseract-ocr-kaz` |
| English | `eng` | `tesseract-data-eng` / `tesseract-ocr-eng` |
| Russian | `rus` | `tesseract-data-rus` / `tesseract-ocr-rus` |

Verify installed languages:

```bash
tesseract --list-langs
```

## Troubleshooting

```bash
# Check extension status
gnome-extensions list
gnome-extensions info qk-text-extractor@quanysh.github.io

# Reload extension
gnome-extensions disable qk-text-extractor@quanysh.github.io
gnome-extensions enable qk-text-extractor@quanysh.github.io

# View GNOME Shell logs
journalctl -f -o cat /usr/bin/gnome-shell
```

## Uninstallation

```bash
gnome-extensions disable qk-text-extractor@quanysh.github.io
rm -rf ~/.local/share/gnome-shell/extensions/qk-text-extractor@quanysh.github.io
```

## License

MIT
