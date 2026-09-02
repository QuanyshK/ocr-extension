# OCR Text Extractor

Live Text OCR for Ubuntu — select any screen area, extract text, and copy it to the clipboard.

## Features

- Select screen area for text recognition
- Automatic clipboard copy
- Hotkey **Super+Shift+O**
- Wayland and X11 support
- English, Russian, Kazakh recognition
- Desktop notifications

## Requirements

- Ubuntu 22.04+
- GNOME Shell 45+
- Python 3.8+

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

## Usage

1. Click the OCR icon in the top panel, or press **Super+Shift+O**
2. Select the screen area containing text
3. Text is copied to the clipboard automatically

## File Structure

```
~/.local/share/ocr-extension/
├── venv/                  # Python virtual environment
├── ocr_engine.py          # OCR engine (EasyOCR)
└── screenshot_ocr.sh      # Screenshot orchestrator

~/.local/share/gnome-shell/extensions/ocr-text@local/
├── extension.js           # GNOME Shell extension (ESM)
├── prefs.js               # Preferences UI (Adw)
├── metadata.json          # Extension metadata
├── stylesheet.css         # Extension styles
└── schemas/
    ├── org.gnome.shell.extensions.ocr-text.gschema.xml
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
gnome-extensions info ocr-text@local

# Reload extension
gnome-extensions disable ocr-text@local
gnome-extensions enable ocr-text@local

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
gnome-extensions disable ocr-text@local
rm -rf ~/.local/share/gnome-shell/extensions/ocr-text@local
rm -rf ~/.local/share/ocr-extension
rm -f ~/.local/share/applications/ocr-text.desktop
```

## License

MIT
