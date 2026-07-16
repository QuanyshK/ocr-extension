#!/bin/bash
#
# Screenshot script for OCR
# Supports Wayland and X11
#

set -e

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OCR_ENGINE="$SCRIPT_DIR/ocr_engine.py"
SCREENSHOT_PATH="/tmp/ocr_shot.png"

# Use Python from venv if available
if [ -f "$SCRIPT_DIR/venv/bin/python3" ]; then
    PYTHON="$SCRIPT_DIR/venv/bin/python3"
else
    PYTHON="python3"
fi

# Detect session type
detect_session_type() {
    if [ -n "$WAYLAND_DISPLAY" ] || [ "$XDG_SESSION_TYPE" = "wayland" ]; then
        echo "wayland"
    else
        echo "x11"
    fi
}

# Take area screenshot
take_screenshot() {
    local session_type=$1
    
    # Remove old screenshot if exists
    rm -f "$SCREENSHOT_PATH"
    
    if [ "$session_type" = "wayland" ]; then
        # Wayland: use grim + slurp
        if ! command -v grim &> /dev/null || ! command -v slurp &> /dev/null; then
            echo "Error: grim and slurp packages required for Wayland"
            echo "Install: sudo apt install grim slurp"
            exit 1
        fi
        
        # slurp allows area selection, grim takes screenshot
        grim -g "$(slurp)" "$SCREENSHOT_PATH"
    else
        # X11: use maim, scrot or gnome-screenshot as fallback
        if command -v maim &> /dev/null; then
            maim -s "$SCREENSHOT_PATH"
        elif command -v scrot &> /dev/null; then
            scrot -s "$SCREENSHOT_PATH"
        elif command -v gnome-screenshot &> /dev/null; then
            gnome-screenshot -a -f "$SCREENSHOT_PATH"
        else
            echo "Error: no screenshot utility found"
            echo "Install one of: gnome-screenshot, scrot, maim"
            echo "Recommended: sudo apt install gnome-screenshot"
            exit 1
        fi
    fi
    
    # Check if screenshot was created
    if [ ! -f "$SCREENSHOT_PATH" ]; then
        echo "Error: failed to create screenshot"
        exit 1
    fi
}

# Show notification
show_notification() {
    local title="$1"
    local message="$2"
    local urgency="${3:-normal}"
    
    if command -v notify-send &> /dev/null; then
        notify-send -u "$urgency" "$title" "$message"
    fi
}

# Main logic
main() {
    local session_type
    session_type=$(detect_session_type)
    
    echo "Session type: $session_type"
    echo "Select area for OCR..."
    
    # Take screenshot
    if ! take_screenshot "$session_type"; then
        show_notification "OCR" "Screenshot cancelled or error occurred" "low"
        exit 1
    fi
    
    echo "Screenshot saved: $SCREENSHOT_PATH"
    show_notification "OCR" "Recognizing text..." "low"
    
    # Run OCR
    local ocr_result
    if ! ocr_result=$($PYTHON "$OCR_ENGINE" "$SCREENSHOT_PATH" 2>&1); then
        show_notification "OCR" "Text recognition failed" "critical"
        echo "OCR error:"
        echo "$ocr_result"
        exit 1
    fi
    
    # Check result
    if [ -z "$ocr_result" ]; then
        show_notification "OCR" "No text found in image" "normal"
        echo "No text found in image"
    else
        # Show notification with first 100 characters
        local preview
        preview=$(echo "$ocr_result" | head -c 100)
        if [ ${#ocr_result} -gt 100 ]; then
            preview="${preview}..."
        fi
        show_notification "OCR - Text copied" "$preview" "normal"
        
        echo ""
        echo "=== Recognized text ==="
        echo "$ocr_result"
        echo "======================="
        echo ""
        echo "Text copied to clipboard!"
    fi
    
    # Optional: remove screenshot after processing
    # rm -f "$SCREENSHOT_PATH"
}

# Run
main "$@"
