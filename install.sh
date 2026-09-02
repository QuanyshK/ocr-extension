#!/usr/bin/env bash
set -euo pipefail

SCRIPT_SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${HOME}/.local/share/ocr-extension"
EXTENSION_DIR="${HOME}/.local/share/gnome-shell/extensions/ocr-text@local"
EXTENSION_UUID="ocr-text@local"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

CPU_ONLY=false
for arg in "$@"; do
    case "$arg" in
        --cpu|-c) CPU_ONLY=true ;;
    esac
done

detect_session() {
    if [[ -n "${WAYLAND_DISPLAY:-}" ]] || [[ "${XDG_SESSION_TYPE:-}" == "wayland" ]]; then
        echo "wayland"
    else
        echo "x11"
    fi
}

SESSION_TYPE=$(detect_session)

log_info "Installing OCR Text Extractor"
[[ "$CPU_ONLY" == true ]] && log_info "Mode: CPU-only PyTorch"
log_info "Session: $SESSION_TYPE"

log_info "Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq python3 python3-pip python3-venv libnotify-bin xclip

if [[ "$SESSION_TYPE" == "wayland" ]]; then
    sudo apt-get install -y -qq grim slurp wl-clipboard
else
    sudo apt-get install -y -qq gnome-screenshot
fi
log_ok "System dependencies installed"

log_info "Setting up Python virtual environment..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

if [[ ! -d "venv" ]]; then
    python3 -m venv venv
fi
source venv/bin/activate

pip install --quiet --upgrade pip

if [[ "$CPU_ONLY" == true ]]; then
    log_info "Installing CPU-only PyTorch..."
    pip install --quiet torch torchvision --index-url https://download.pytorch.org/whl/cpu
else
    log_info "Installing PyTorch (GPU-capable)..."
    pip install --quiet torch torchvision
fi

pip install --quiet easyocr pyperclip Pillow numpy
log_ok "Python dependencies installed"

log_info "Copying OCR scripts..."
cp "${SCRIPT_SOURCE}/ocr_engine.py" "$INSTALL_DIR/"
cp "${SCRIPT_SOURCE}/screenshot_ocr.sh" "$INSTALL_DIR/"
chmod +x "${INSTALL_DIR}/ocr_engine.py" "${INSTALL_DIR}/screenshot_ocr.sh"
log_ok "Scripts copied"

log_info "Installing GNOME Shell Extension..."
gnome-extensions disable "$EXTENSION_UUID" 2>/dev/null || true
rm -rf "$EXTENSION_DIR"
mkdir -p "${EXTENSION_DIR}/schemas"

cp "${SCRIPT_SOURCE}/gnome-shell-extension/ocr-text@local/metadata.json" "$EXTENSION_DIR/"
cp "${SCRIPT_SOURCE}/gnome-shell-extension/ocr-text@local/extension.js"  "$EXTENSION_DIR/"
cp "${SCRIPT_SOURCE}/gnome-shell-extension/ocr-text@local/prefs.js"      "$EXTENSION_DIR/"
cp "${SCRIPT_SOURCE}/gnome-shell-extension/ocr-text@local/stylesheet.css" "$EXTENSION_DIR/"
cp "${SCRIPT_SOURCE}/gnome-shell-extension/ocr-text@local/schemas/org.gnome.shell.extensions.ocr-text.gschema.xml" "${EXTENSION_DIR}/schemas/"

glib-compile-schemas "${EXTENSION_DIR}/schemas/"
gnome-extensions enable "$EXTENSION_UUID" 2>/dev/null || true
log_ok "Extension installed and enabled"

log_info "Creating desktop entry..."
mkdir -p "${HOME}/.local/share/applications"
cat > "${HOME}/.local/share/applications/ocr-text.desktop" <<EOF
[Desktop Entry]
Name=OCR Text Extractor
Comment=Extract text from screen area
Exec=${INSTALL_DIR}/screenshot_ocr.sh
Icon=edit-find
Type=Application
Terminal=false
Categories=Utility;
Keywords=OCR;text;recognition;
EOF
log_ok "Desktop entry created"

echo ""
log_ok "Installation complete!"
echo ""
echo "  Hotkey: Super+Shift+O"
echo "  Extension: $EXTENSION_UUID"
echo "  OCR dir:   $INSTALL_DIR"
echo "  Extension: $EXTENSION_DIR"
echo ""
echo "  Restart GNOME Shell to apply:"
echo "    X11:    Alt+F2 → r → Enter"
echo "    Wayland: log out and back in"
echo ""
echo "  View logs:"
echo "    journalctl -f -o cat /usr/bin/gnome-shell"
echo ""
