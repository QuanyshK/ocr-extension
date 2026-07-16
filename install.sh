#!/bin/bash
#
# OCR Text Extractor installation script for Ubuntu 22.04+
# Supports Wayland and X11
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Installation paths
INSTALL_DIR="$HOME/.local/share/ocr-extension"
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/ocr-text@local"

echo -e "${BLUE}=== Installing OCR Text Extractor ===${NC}"
echo ""

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect session type
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

# ============================================
# STEP 1: Install system dependencies
# ============================================
echo -e "${BLUE}[1/6] Installing system dependencies...${NC}"

# Update package lists
sudo apt update

# Install basic dependencies
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    libnotify-bin \
    xclip

# Install session-specific dependencies
if [ "$SESSION_TYPE" = "wayland" ]; then
    echo -e "${YELLOW}Installing Wayland dependencies...${NC}"
    sudo apt install -y grim slurp wl-clipboard
else
    echo -e "${YELLOW}Installing X11 dependencies...${NC}"
    sudo apt install -y gnome-screenshot
fi

echo -e "${GREEN}✓ System dependencies installed${NC}"
echo ""

# ============================================
# STEP 2: Install Python dependencies
# ============================================
echo -e "${BLUE}[2/6] Installing Python dependencies...${NC}"

# Create virtual environment
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python packages
echo -e "${YELLOW}Installing EasyOCR and dependencies...${NC}"
pip install --upgrade pip
pip install easyocr pyperclip Pillow numpy torch torchvision

# Alternative: transformers (if fallback needed)
# pip install transformers

echo -e "${GREEN}✓ Python dependencies installed${NC}"
echo ""

# ============================================
# STEP 3: Copy OCR scripts
# ============================================
echo -e "${BLUE}[3/6] Copying OCR scripts...${NC}"

# Copy scripts from current directory
SCRIPT_SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cp "$SCRIPT_SOURCE/ocr_engine.py" "$INSTALL_DIR/"
cp "$SCRIPT_SOURCE/screenshot_ocr.sh" "$INSTALL_DIR/"

# Make scripts executable
chmod +x "$INSTALL_DIR/ocr_engine.py"
chmod +x "$INSTALL_DIR/screenshot_ocr.sh"

echo -e "${GREEN}✓ Scripts copied to $INSTALL_DIR${NC}"
echo ""

# ============================================
# STEP 4: Install GNOME Shell Extension
# ============================================
echo -e "${BLUE}[4/6] Installing GNOME Shell Extension...${NC}"

# Create extension directory
mkdir -p "$EXTENSION_DIR"

# Copy extension files
cp -r "$SCRIPT_SOURCE/gnome-shell-extension/ocr-text@local/"* "$EXTENSION_DIR/"

# Compile gschema (for settings)
if [ -f "$EXTENSION_DIR/schemas/org.gnome.shell.extensions.ocr-text.gschema.xml" ]; then
    echo -e "${YELLOW}Compiling gschema...${NC}"
    glib-compile-schemas "$EXTENSION_DIR/schemas/"
fi

echo -e "${GREEN}✓ Extension installed to $EXTENSION_DIR${NC}"
echo ""

# ============================================
# STEP 5: Create desktop file (optional)
# ============================================
echo -e "${BLUE}[5/6] Creating desktop file...${NC}"

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
Keywords=OCR;text;recognition;
EOF

echo -e "${GREEN}✓ Desktop file created${NC}"
echo ""

# ============================================
# STEP 6: Activation instructions
# ============================================
echo -e "${BLUE}[6/6] Finishing installation...${NC}"
echo ""

echo -e "${GREEN}=== Installation complete! ===${NC}"
echo ""
echo -e "${YELLOW}To activate the extension, follow these steps:${NC}"
echo ""
echo "1. ${BLUE}Enable the extension:${NC}"
echo "   gnome-extensions enable ocr-text@local"
echo ""
echo "2. ${BLUE}Or restart GNOME Shell:${NC}"
echo "   - Press Alt+F2, type 'r' and Enter (X11 only)"
echo "   - Or log out and log back in"
echo ""
echo "3. ${BLUE}Check the extension in 'Extensions' application${NC}"
echo ""
echo "4. ${BLUE}Usage:${NC}"
echo "   • Click the OCR icon in the top panel"
echo "   • Or use the Super+Shift+O hotkey"
echo "   • Select screen area"
echo "   • Text will be automatically copied to clipboard"
echo ""
echo -e "${YELLOW}Note:${NC} First OCR launch may take some time"
echo "             (downloading recognition models)."
echo ""
echo -e "${BLUE}Installation directory:${NC} $INSTALL_DIR"
echo -e "${BLUE}Extension directory:${NC} $EXTENSION_DIR"
echo ""

# Check GNOME version
if command_exists gnome-shell; then
    GNOME_VERSION=$(gnome-shell --version | grep -oP '\d+\.\d+' | head -1)
    echo -e "${BLUE}GNOME Shell version:${NC} $GNOME_VERSION"
    
    # Check compatibility
    GNOME_MAJOR=$(echo "$GNOME_VERSION" | cut -d. -f1)
    if [ "$GNOME_MAJOR" -lt 42 ]; then
        echo -e "${YELLOW}Warning: Your GNOME version may be incompatible.${NC}"
        echo "Extension supports GNOME 42+"
    fi
fi

echo ""
echo -e "${GREEN}Done!${NC}"
