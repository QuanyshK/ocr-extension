#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UUID="qk-text-extractor@quanysh.github.io"
SRC_DIR="${SCRIPT_DIR}/gnome-shell-extension/${UUID}"
BUILD_DIR="${SCRIPT_DIR}/build"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

DO_INSTALL=false
for arg in "$@"; do
    case "$arg" in
        -i|--install)
            DO_INSTALL=true
            ;;
        -h|--help)
            echo "Usage: $0 [--install|-i]"
            echo ""
            echo "Options:"
            echo "  -i, --install   Build and install the extension to ~/.local/share/gnome-shell/extensions/"
            echo "  -h, --help      Show this help message"
            exit 0
            ;;
    esac
done

if ! command -v gnome-extensions &>/dev/null; then
    log_error "gnome-extensions command not found. Install gnome-shell."
    exit 1
fi

if [[ ! -d "$SRC_DIR" ]]; then
    log_error "Source directory not found: $SRC_DIR"
    exit 1
fi

log_info "Building extension package: $UUID"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

cd "$SRC_DIR"

gnome-extensions pack \
    --force \
    --extra-source=stylesheet.css \
    --schema="schemas/org.gnome.shell.extensions.qk-text-extractor.gschema.xml" \
    --out-dir="$BUILD_DIR" \
    .

PACKAGE_PATH="${BUILD_DIR}/${UUID}.shell-extension.zip"

if [[ ! -f "$PACKAGE_PATH" ]]; then
    log_error "Package build failed."
    exit 1
fi

log_ok "Package built successfully: $PACKAGE_PATH"

# Ensure XDG_DATA_HOME points to real user directory (fixes VS Code / Snap terminal sandbox isolation)
REAL_XDG_DATA_HOME="${HOME}/.local/share"

if [[ "$DO_INSTALL" == true ]]; then
    log_info "Installing extension to ${REAL_XDG_DATA_HOME}/gnome-shell/extensions/${UUID}..."
    env XDG_DATA_HOME="$REAL_XDG_DATA_HOME" gnome-extensions install --force "$PACKAGE_PATH"

    # Add to org.gnome.shell enabled-extensions in GSettings
    CURRENT_ENABLED=$(gsettings get org.gnome.shell enabled-extensions 2>/dev/null || echo "[]")
    if [[ "$CURRENT_ENABLED" != *"'${UUID}'"* ]]; then
        NEW_ENABLED=$(echo "$CURRENT_ENABLED" | sed "s/]/, '${UUID}']/" | sed "s/\[, /\[/")
        gsettings set org.gnome.shell enabled-extensions "$NEW_ENABLED" 2>/dev/null || true
    fi

    # Try enabling via gnome-extensions command
    env XDG_DATA_HOME="$REAL_XDG_DATA_HOME" gnome-extensions enable "$UUID" 2>/dev/null || true

    log_ok "Extension installed successfully!"
    echo ""
    echo "  Restart GNOME Shell to activate:"
    if [[ "${XDG_SESSION_TYPE:-}" == "x11" ]]; then
        echo "    Press Alt+F2, type 'r', and press Enter."
    else
        echo "    Log out and log back into your session (Wayland)."
    fi
    echo ""
else
    echo ""
    echo "  To install the extension, run:"
    echo "    ./build.sh --install"
    echo ""
    echo "  Or manually:"
    if [[ "${XDG_DATA_HOME:-}" == *"/snap/"* ]]; then
        echo "    env XDG_DATA_HOME=\"\$HOME/.local/share\" gnome-extensions install --force ${PACKAGE_PATH}"
    else
        echo "    gnome-extensions install --force ${PACKAGE_PATH}"
    fi
    echo ""
fi