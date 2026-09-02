#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OCR_ENGINE="${SCRIPT_DIR}/ocr_engine.py"
SCREENSHOT_PATH="/tmp/ocr_shot.png"

if [[ -f "${SCRIPT_DIR}/venv/bin/python3" ]]; then
    PYTHON="${SCRIPT_DIR}/venv/bin/python3"
else
    PYTHON="python3"
fi

detect_session() {
    if [[ -n "${WAYLAND_DISPLAY:-}" ]] || [[ "${XDG_SESSION_TYPE:-}" == "wayland" ]]; then
        echo "wayland"
    else
        echo "x11"
    fi
}

take_screenshot() {
    local session_type="$1"
    rm -f "$SCREENSHOT_PATH"

    if [[ "$session_type" == "wayland" ]]; then
        if ! command -v grim &>/dev/null || ! command -v slurp &>/dev/null; then
            echo "Error: grim and slurp required for Wayland" >&2
            exit 1
        fi
        grim -g "$(slurp)" "$SCREENSHOT_PATH"
    else
        if command -v maim &>/dev/null; then
            maim -s "$SCREENSHOT_PATH"
        elif command -v scrot &>/dev/null; then
            scrot -s "$SCREENSHOT_PATH"
        elif command -v gnome-screenshot &>/dev/null; then
            gnome-screenshot -a -f "$SCREENSHOT_PATH"
        else
            echo "Error: no screenshot utility found (install gnome-screenshot, maim, or scrot)" >&2
            exit 1
        fi
    fi

    if [[ ! -f "$SCREENSHOT_PATH" ]]; then
        echo "Error: screenshot failed" >&2
        exit 1
    fi
}

notify() {
    local title="$1"
    local message="$2"
    local urgency="${3:-normal}"
    if command -v notify-send &>/dev/null; then
        notify-send -u "$urgency" "$title" "$message"
    fi
}

main() {
    local session_type
    session_type=$(detect_session)

    echo "Session: $session_type"
    echo "Select area for OCR..."

    if ! take_screenshot "$session_type"; then
        notify "OCR" "Screenshot cancelled" "low"
        exit 1
    fi

    echo "Screenshot: $SCREENSHOT_PATH"
    notify "OCR" "Recognizing text..." "low"

    local ocr_result
    if ! ocr_result=$("$PYTHON" "$OCR_ENGINE" "$SCREENSHOT_PATH" 2>&1); then
        notify "OCR" "Recognition failed" "critical"
        echo "$ocr_result" >&2
        exit 1
    fi

    if [[ -z "$ocr_result" ]]; then
        notify "OCR" "No text found" "normal"
        echo "No text found"
        exit 0
    fi

    local preview
    preview=$(echo "$ocr_result" | head -c 100)
    [[ ${#ocr_result} -gt 100 ]] && preview="${preview}..."
    notify "OCR — Text copied" "$preview" "normal"

    echo ""
    echo "=== Recognized text ==="
    echo "$ocr_result"
    echo "======================="
    echo ""
    echo "Text copied to clipboard"
}

main "$@"
