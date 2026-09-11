#!/usr/bin/env bash
set -euo pipefail

SCRIPT_SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_UUID="qk-text-extractor@quanysh.github.io"
EXTENSION_DIR="${HOME}/.local/share/gnome-shell/extensions/${EXTENSION_UUID}"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

detect_pkg_manager() {
    if command -v pacman &>/dev/null; then
        echo "pacman"
    elif command -v apt-get &>/dev/null; then
        echo "apt"
    elif command -v dnf &>/dev/null; then
        echo "dnf"
    else
        echo "unknown"
    fi
}

install_packages() {
    local pkg_manager="$1"
    shift
    local pkgs=("$@")

    case "$pkg_manager" in
        pacman)
            sudo pacman -Sy --noconfirm --needed "${pkgs[@]}"
            ;;
        apt)
            sudo apt-get update -qq
            sudo apt-get install -y -qq "${pkgs[@]}"
            ;;
        dnf)
            sudo dnf install -y "${pkgs[@]}"
            ;;
        *)
            log_error "Unsupported package manager: $pkg_manager"
            exit 1
            ;;
    esac
}

PKG_MANAGER=$(detect_pkg_manager)

if [[ "$PKG_MANAGER" == "unknown" ]]; then
    log_error "Unsupported package manager"
    exit 1
fi

log_info "Installing system dependencies..."

case "$PKG_MANAGER" in
    pacman)
        install_packages pacman tesseract tesseract-data-kaz tesseract-data-eng tesseract-data-rus
        ;;
    apt)
        install_packages apt tesseract-ocr tesseract-ocr-kaz tesseract-ocr-eng tesseract-ocr-rus
        ;;
    dnf)
        install_packages dnf tesseract tesseract-langpack-kaz tesseract-langpack-eng tesseract-langpack-rus
        ;;
esac

log_ok "System dependencies installed"

log_info "Installing GNOME Shell extension..."

gnome-extensions disable "$EXTENSION_UUID" 2>/dev/null || true
rm -rf "$EXTENSION_DIR"
mkdir -p "${EXTENSION_DIR}/schemas"

cp "${SCRIPT_SOURCE}/gnome-shell-extension/${EXTENSION_UUID}/metadata.json" "$EXTENSION_DIR/"
cp "${SCRIPT_SOURCE}/gnome-shell-extension/${EXTENSION_UUID}/extension.js"  "$EXTENSION_DIR/"
cp "${SCRIPT_SOURCE}/gnome-shell-extension/${EXTENSION_UUID}/prefs.js"      "$EXTENSION_DIR/"
cp "${SCRIPT_SOURCE}/gnome-shell-extension/${EXTENSION_UUID}/stylesheet.css" "$EXTENSION_DIR/"
cp "${SCRIPT_SOURCE}/gnome-shell-extension/${EXTENSION_UUID}/schemas/org.gnome.shell.extensions.qk-text-extractor.gschema.xml" "${EXTENSION_DIR}/schemas/"

glib-compile-schemas "${EXTENSION_DIR}/schemas/"
gnome-extensions enable "$EXTENSION_UUID" 2>/dev/null || true

log_ok "Extension installed and enabled successfully"