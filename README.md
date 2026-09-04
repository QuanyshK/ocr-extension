# EN/KZ Text Extractor

Live Text OCR for GNOME — select any screen area, extract text, and copy it to the clipboard.

## Features

- Select screen area for text recognition
- Automatic clipboard copy
- Panel button with popup menu
- Configurable keyboard shortcut via Preferences
- Wayland and X11 support
- English, Russian, Kazakh recognition
- Desktop notifications

## Requirements

- GNOME Shell 45+
- Python 3.8+

### Supported Distributions

| Distribution | Package Manager | Status |
|--------------|-----------------|--------|
| Ubuntu 22.04+ | `apt` | ✅ Supported |
| Debian (testing/bookworm+) | `apt` | ✅ Supported |
| Fedora | `dnf` | ✅ Supported |
| Arch Linux | `pacman` | ✅ Supported |
| CachyOS | `pacman` | ✅ Supported |
| Manjaro | `pacman` | ✅ Supported |

## Installation

```bash
git clone git@github.com:QuanyshK/ocr-extension.git
cd ocr-extension
chmod +x install.sh
./install.sh
```

CPU-only PyTorch (smaller, faster install):

```bash
./install.sh --cpu
```

Restart GNOME Shell after installation:

- **X11:** Alt+F2 → `r` → Enter
- **Wayland:** log out and back in

## Building Extension Package

To create a `.zip` package for manual installation or submission to extensions.gnome.org:

```bash
chmod +x build.sh
./build.sh
```

The package will be created at `build/enkz-text-extractor@quanysh.github.io.shell-extension.zip`.

Install the package manually:

```bash
gnome-extensions install --force build/enkz-text-extractor@quanysh.github.io.shell-extension.zip
```

## Usage

1. Click the OCR icon in the top panel
2. Select the screen area containing text
3. Text is copied to the clipboard automatically

## Preferences

Open **Extension Manager** or **GNOME Extensions** app, click the gear icon on **EN/KZ Text Extractor**:

- **Keyboard Shortcut** — record a custom key combination
- **Custom Script Path** — override the default OCR script location
- **Auto-copy to clipboard** — toggle automatic clipboard copy
- **Show notifications** — toggle desktop notifications

## File Structure

```
~/.local/share/ocr-extension/
├── venv/                  # Python virtual environment
├── ocr_engine.py          # OCR engine (EasyOCR)
└── screenshot_ocr.sh      # Screenshot orchestrator

~/.local/share/gnome-shell/extensions/enkz-text-extractor@quanysh.github.io/
├── extension.js           # GNOME Shell extension (ESM)
├── prefs.js               # Preferences UI (Adw)
├── metadata.json          # Extension metadata
├── stylesheet.css         # Extension styles
└── schemas/
    ├── org.gnome.shell.extensions.enkz-text-extractor.gschema.xml
    └── gschemas.compiled
```

## Language Support

| Language | Code | Notes |
|----------|------|-------|
| English | `en` | Native EasyOCR model |
| Russian | `ru` | Native EasyOCR model |
| Kazakh | `kk` | Via `rs_cyrillic` proxy model (ә, ғ, қ, ң, ө, ұ, ү, һ, і) |

## Troubleshooting

```bash
# Check extension status
gnome-extensions list
gnome-extensions info enkz-text-extractor@quanysh.github.io

# Reload extension
gnome-extensions disable enkz-text-extractor@quanysh.github.io
gnome-extensions enable enkz-text-extractor@quanysh.github.io

# View GNOME Shell logs
journalctl -f -o cat /usr/bin/gnome-shell

# Test OCR engine directly
cd ~/.local/share/ocr-extension
source venv/bin/activate
python3 ocr_engine.py /tmp/test.png
```

**First run is slow** — EasyOCR downloads language models (~40 MB total) once.

## Uninstallation

```bash
gnome-extensions disable enkz-text-extractor@quanysh.github.io
rm -rf ~/.local/share/gnome-shell/extensions/enkz-text-extractor@quanysh.github.io
rm -rf ~/.local/share/ocr-extension
rm -f ~/.local/share/applications/enkz-text-extractor.desktop
```

## License

MIT
