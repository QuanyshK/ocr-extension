#!/usr/bin/env python3
"""
OCR Engine - extracts text from image and copies to clipboard.
Uses lightweight EasyOCR model (or transformers as fallback).
Supported languages: English (en), Russian (ru), Kazakh (kk).
"""

import sys
import os
import subprocess
import argparse

# Default screenshot path
DEFAULT_SCREENSHOT_PATH = "/tmp/ocr_shot.png"


def detect_display_server():
    """Detect display server type (Wayland or X11)."""
    session_type = os.environ.get("XDG_SESSION_TYPE", "").lower()
    wayland_display = os.environ.get("WAYLAND_DISPLAY", "")
    
    if session_type == "wayland" or wayland_display:
        return "wayland"
    return "x11"


def copy_to_clipboard(text, display_server=None):
    """Copy text to system clipboard."""
    if display_server is None:
        display_server = detect_display_server()
    
    try:
        if display_server == "wayland":
            # Use wl-copy for Wayland
            proc = subprocess.Popen(
                ["wl-copy"],
                stdin=subprocess.PIPE,
                text=True
            )
            proc.communicate(input=text)
        else:
            # Use xclip for X11
            proc = subprocess.Popen(
                ["xclip", "-selection", "clipboard"],
                stdin=subprocess.PIPE,
                text=True
            )
            proc.communicate(input=text)
        return True
    except Exception as e:
        print(f"Clipboard copy error: {e}", file=sys.stderr)
        # Fallback to pyperclip if available
        try:
            import pyperclip
            pyperclip.copy(text)
            return True
        except ImportError:
            pass
        return False


def run_ocr(image_path):
    """Run OCR on image and return extracted text."""
    
    # Try EasyOCR (recommended - fast and lightweight)
    try:
        import easyocr
        
        # Initialize reader for English, Russian and Cyrillic languages
        # rs_cyrillic helps with Kazakh-specific characters (ә, ғ, қ, ң, ө, ұ, ү, һ, і)
        reader = easyocr.Reader(['en', 'ru', 'rs_cyrillic'], gpu=False, verbose=False)
        
        # Recognize text
        results = reader.readtext(image_path, detail=0)
        
        if results:
            return '\n'.join(results)
        return ""
        
    except ImportError:
        print("EasyOCR not installed, trying transformers...", file=sys.stderr)
    
    # Fallback to transformers (heavier option)
    try:
        from transformers import pipeline
        from PIL import Image
        
        # Load image
        image = Image.open(image_path).convert('RGB')
        
        # Create OCR pipeline
        ocr_pipeline = pipeline(
            "image-to-text",
            model="microsoft/trocr-base-printed",
            trust_remote_code=True
        )
        
        # Recognize text
        result = ocr_pipeline(image)
        
        if result and len(result) > 0:
            return result[0].get('generated_text', '')
        return ""
        
    except Exception as e:
        print(f"OCR error: {e}", file=sys.stderr)
        return None


def main():
    parser = argparse.ArgumentParser(
        description="OCR Engine - extracts text from image (supports en, ru, kk)"
    )
    parser.add_argument(
        "image_path",
        nargs="?",
        default=DEFAULT_SCREENSHOT_PATH,
        help=f"Path to image (default: {DEFAULT_SCREENSHOT_PATH})"
    )
    parser.add_argument(
        "--no-clipboard",
        action="store_true",
        help="Do not copy result to clipboard"
    )
    parser.add_argument(
        "--output",
        "-o",
        help="Save result to file"
    )
    
    args = parser.parse_args()
    
    # Check if file exists
    if not os.path.exists(args.image_path):
        print(f"Error: file not found: {args.image_path}", file=sys.stderr)
        sys.exit(1)
    
    # Run OCR
    text = run_ocr(args.image_path)
    
    if text is None:
        print("Error: OCR failed", file=sys.stderr)
        sys.exit(1)
    
    if not text.strip():
        print("No text found in image")
        sys.exit(0)
    
    # Print result
    print(text)
    
    # Copy to clipboard
    if not args.no_clipboard:
        display_server = detect_display_server()
        if copy_to_clipboard(text, display_server):
            print(f"\n[Copied to clipboard ({display_server})]", file=sys.stderr)
        else:
            print("\n[Failed to copy to clipboard]", file=sys.stderr)
    
    # Save to file if specified
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"\n[Saved to: {args.output}]", file=sys.stderr)


if __name__ == "__main__":
    main()
