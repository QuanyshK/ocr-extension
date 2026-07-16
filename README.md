# OCR Text Extractor for Ubuntu

Live Text OCR for Ubuntu 22.04+ with support for Wayland and X11.

## Features

- 🔍 Select screen area for text recognition
- 📋 Automatic copying to clipboard
- ⌨️ Hotkey Super+Shift+O
- 🐧 Support for Wayland and X11
- 🌍 Recognition of English, Russian and Kazakh languages
- 🔔 Notifications about results

## Requirements

- Ubuntu 22.04 or newer
- GNOME Shell 42+
- Python 3.8+

## Quick Installation

```bash
# Clone or download the repository
cd ocr-extension

# Run the installer
chmod +x install.sh
./install.sh
```

## Manual Installation

### 1. System Dependencies

```bash
# Update packages
sudo apt update

# Basic dependencies
sudo apt install -y python3 python3-pip python3-venv libnotify-bin xclip

# For Wayland:
sudo apt install -y grim slurp wl-clipboard

# For X11:
sudo apt install -y gnome-screenshot
```

### 2. Python Dependencies

```bash
# Create virtual environment
mkdir -p ~/.local/share/ocr-extension
cd ~/.local/share/ocr-extension
python3 -m venv venv
source venv/bin/activate

# Install packages
pip install easyocr pyperclip Pillow numpy torch torchvision
```

### 3. OCR Scripts

```bash
# Copy scripts
cp ocr_engine.py ~/.local/share/ocr-extension/
cp screenshot_ocr.sh ~/.local/share/ocr-extension/

# Make them executable
chmod +x ~/.local/share/ocr-extension/*.py
chmod +x ~/.local/share/ocr-extension/*.sh
```

### 4. GNOME Shell Extension

```bash
# Create extension directory
mkdir -p ~/.local/share/gnome-shell/extensions/ocr-text@local

# Copy extension files
cp -r gnome-shell-extension/ocr-text@local/* \
    ~/.local/share/gnome-shell/extensions/ocr-text@local/

# Compile gschema
glib-compile-schemas ~/.local/share/gnome-shell/extensions/ocr-text@local/schemas/

# Enable extension
gnome-extensions enable ocr-text@local
```

### 5. Restart GNOME Shell

```bash
# For X11:
Alt+F2, type 'r', press Enter

# For Wayland:
# Log out and log back in
```

## Usage

### Via GNOME Extension

1. Click the OCR icon in the top panel
2. Or press Super+Shift+O
3. Select the screen area
4. Text will be automatically copied to clipboard

### Via Command Line

```bash
# Run OCR
~/.local/share/ocr-extension/screenshot_ocr.sh

# Or directly via Python script
python3 ~/.local/share/ocr-extension/ocr_engine.py /path/to/image.png
```

## File Structure

```
~/.local/share/ocr-extension/
├── venv/                   # Python virtual environment
├── ocr_engine.py          # OCR engine
└── screenshot_ocr.sh      # Screenshot script

~/.local/share/gnome-shell/extensions/ocr-text@local/
├── extension.js           # Main extension code
├── metadata.json          # Extension metadata
├── prefs.js              # Settings (GNOME 45+)
├── stylesheet.css        # Styles
└── schemas/
    ├── org.gnome.shell.extensions.ocr-text.gschema.xml
    └── gschemas.compiled
```

## Language Support

The OCR engine supports the following languages:

| Language | Code | Status |
|----------|------|--------|
| English | `en` | ✅ Perfect recognition |
| Russian | `ru` | ✅ Full support |
| Kazakh | `kk` | ✅ Full support (including specific characters: ә, ғ, қ, ң, ө, ұ, ү, h, і) |

## Troubleshooting

### Extension Not Appearing

```bash
# Check status
gnome-extensions list

# Reload extension
gnome-extensions disable ocr-text@local
gnome-extensions enable ocr-text@local

# Check logs
journalctl -f -o cat /usr/bin/gnome-shell
```

### OCR Not Working

```bash
# Check Python dependencies
cd ~/.local/share/ocr-extension
source venv/bin/activate
python3 ocr_engine.py --help

# Check screenshot utility
# For Wayland:
grim -g "$(slurp)" /tmp/test.png

# For X11:
gnome-screenshot -a -f /tmp/test.png
```

### Clipboard Issues

```bash
# Make sure utilities are installed
# For Wayland:
which wl-copy

# For X11:
which xclip
```

### First Run is Slow

The first time you run OCR, EasyOCR will download language models:
- English: ~10 MB
- Russian: ~15 MB
- Kazakh: ~15 MB

This is a one-time download. Subsequent launches will be much faster.

## Uninstallation

```bash
# Disable extension
gnome-extensions disable ocr-text@local

# Remove extension
rm -rf ~/.local/share/gnome-shell/extensions/ocr-text@local

# Remove OCR scripts
rm -rf ~/.local/share/ocr-extension

# Remove desktop file
rm -f ~/.local/share/applications/ocr-text.desktop
```

## License

MIT License

## Credits

- OCR Engine: [EasyOCR](https://github.com/JaidedAI/EasyOCR)
