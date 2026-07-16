#!/bin/bash
#
# OCR Text Extractor installation script (CPU-only, faster, smaller)
# Supports Wayland and X11
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Save the real path to git repository directory (BEFORE any cd commands)
SCRIPT_SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

INSTALL_DIR="$HOME/.local/share/ocr-extension"
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/ocr-text@local"

echo -e "${BLUE}=== Installing OCR Text Extractor (CPU-only) ===${NC}"
echo ""
echo -e "${BLUE}Script source:${NC} $SCRIPT_SOURCE"
echo ""

detect_session() {
    if [ -n "$WAYLAND_DISPLAY" ] || [ "$XDG_SESSION_TYPE" = "wayland" ]; then
        echo "wayland"
    else
        echo "x11"
    fi
}

SESSION_TYPE=$(detect_session)
echo -e "${BLUE}Detected session:${NC} $SESSION_TYPE"
echo ""

# STEP 1: System dependencies
echo -e "${BLUE}[1/5] Installing system dependencies...${NC}"
sudo apt update
sudo apt install -y python3 python3-pip python3-venv libnotify-bin xclip

if [ "$SESSION_TYPE" = "wayland" ]; then
    sudo apt install -y grim slurp wl-clipboard
else
    sudo apt install -y gnome-screenshot
fi

echo -e "${GREEN}✓ System dependencies installed${NC}"
echo ""

# STEP 2: Python dependencies (CPU-only torch)
echo -e "${BLUE}[2/5] Installing Python dependencies (CPU-only)...${NC}"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate

echo -e "${YELLOW}Installing CPU-only PyTorch (smaller, faster download)...${NC}"
pip install --upgrade pip

# CPU-only torch (no CUDA, ~200MB instead of ~2GB)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install other packages
pip install easyocr pyperclip Pillow numpy

echo -e "${GREEN}✓ Python dependencies installed${NC}"
echo ""

# STEP 3: Copy scripts
echo -e "${BLUE}[3/5] Copying OCR scripts...${NC}"
echo -e "${BLUE}Copying from:${NC} $SCRIPT_SOURCE"

# Copy from git repo to install directory
cp "$SCRIPT_SOURCE/ocr_engine.py" "$INSTALL_DIR/"
cp "$SCRIPT_SOURCE/screenshot_ocr.sh" "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/ocr_engine.py" "$INSTALL_DIR/screenshot_ocr.sh"

echo -e "${GREEN}✓ Scripts copied${NC}"
echo ""

# STEP 4: Install GNOME extension
echo -e "${BLUE}[4/5] Installing GNOME Shell Extension...${NC}"
mkdir -p "$EXTENSION_DIR"
cp -r "$SCRIPT_SOURCE/gnome-shell-extension/ocr-text@local/"* "$EXTENSION_DIR/"
if [ -f "$EXTENSION_DIR/schemas/org.gnome.shell.extensions.ocr-text.gschema.xml" ]; then
    glib-compile-schemas "$EXTENSION_DIR/schemas/"
fi

echo -e "${GREEN}✓ Extension installed${NC}"
echo ""

# STEP 5: Desktop file
echo -e "${BLUE}[5/5] Creating desktop file...${NC}"
mkdir -p "$HOME/.local/share/applications"
cat > "$HOME/.local/share/applications/ocr-text.desktop" << EOF
[Desktop Entry]
Name=OCR Text Extractor
Comment=Extract text from screen area
Exec=$INSTALL_DIR/screenshot_ocr.sh
Icon=edit-find
Type=Application
Terminal=false
Categories=Utility;
EOF

echo -e "${GREEN}✓ Desktop file created${NC}"
echo ""

# Done
echo -e "${GREEN}=== Installation complete! ===${NC}"
echo ""
echo "Enable extension: gnome-extensions enable ocr-text@local"
echo "Hotkey: Super+Shift+O"
echo ""
echo -e "${YELLOW}Note:${NC} First launch will download OCR models (~40MB)"
echo ""
