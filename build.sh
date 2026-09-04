#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UUID="enkz-text-extractor@quanysh.github.io"
SRC_DIR="${SCRIPT_DIR}/gnome-shell-extension/${UUID}"
BUILD_DIR="${SCRIPT_DIR}/build"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

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

gnome-extensions pack \
    --force \
    --extra-source=stylesheet.css \
    --schema="schemas/org.gnome.shell.extensions.enkz-text-extractor.gschema.xml" \
    --out-dir="$BUILD_DIR" \
    "$SRC_DIR"

PACKAGE_PATH="${BUILD_DIR}/${UUID}.shell-extension.zip"

if [[ -f "$PACKAGE_PATH" ]]; then
    log_ok "Package built successfully: $PACKAGE_PATH"
    echo ""
    echo "  Install with:"
    echo "    gnome-extensions install --force ${PACKAGE_PATH}"
    echo ""
else
    log_error "Package build failed."
    exit 1
fi
