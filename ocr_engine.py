#!/usr/bin/env python3
import sys
import os
import subprocess
import argparse

DEFAULT_SCREENSHOT_PATH = "/tmp/ocr_shot.png"


def detect_display_server():
    session = os.environ.get("XDG_SESSION_TYPE", "").lower()
    if session == "wayland" or os.environ.get("WAYLAND_DISPLAY"):
        return "wayland"
    return "x11"


def copy_to_clipboard(text):
    server = detect_display_server()
    try:
        if server == "wayland":
            proc = subprocess.Popen(["wl-copy"], stdin=subprocess.PIPE, text=True)
        else:
            proc = subprocess.Popen(["xclip", "-selection", "clipboard"], stdin=subprocess.PIPE, text=True)
        proc.communicate(input=text)
        return True
    except Exception as e:
        print(f"Clipboard error: {e}", file=sys.stderr)
        try:
            import pyperclip
            pyperclip.copy(text)
            return True
        except ImportError:
            pass
        return False


def run_ocr(image_path):
    try:
        import easyocr
        reader = easyocr.Reader(["en", "ru", "rs_cyrillic"], gpu=False, verbose=False)
        results = reader.readtext(image_path, detail=0)
        return "\n".join(results) if results else ""
    except ImportError:
        print("EasyOCR not installed", file=sys.stderr)
        return None
    except Exception as e:
        print(f"OCR error: {e}", file=sys.stderr)
        return None


def main():
    parser = argparse.ArgumentParser(description="OCR Engine — extract text from image")
    parser.add_argument("image_path", nargs="?", default=DEFAULT_SCREENSHOT_PATH, help="Path to image")
    parser.add_argument("--no-clipboard", action="store_true", help="Skip clipboard copy")
    parser.add_argument("-o", "--output", help="Save result to file")
    args = parser.parse_args()

    if not os.path.exists(args.image_path):
        print(f"Error: file not found: {args.image_path}", file=sys.stderr)
        sys.exit(1)

    text = run_ocr(args.image_path)
    if text is None:
        print("Error: OCR failed", file=sys.stderr)
        sys.exit(1)

    if not text.strip():
        print("No text found")
        sys.exit(0)

    print(text)

    if not args.no_clipboard:
        server = detect_display_server()
        if copy_to_clipboard(text):
            print(f"[Copied to clipboard ({server})]", file=sys.stderr)
        else:
            print("[Clipboard copy failed]", file=sys.stderr)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"[Saved to: {args.output}]", file=sys.stderr)


if __name__ == "__main__":
    main()
