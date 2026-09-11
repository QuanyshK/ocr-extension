import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

/**
 * Detect the host distro family by reading /etc/os-release.
 * Returns 'arch' | 'debian' | 'fedora' | 'unknown'.
 */
function _detectDistro() {
    try {
        const [ok, contents] = GLib.file_get_contents('/etc/os-release');
        if (!ok) return 'unknown';
        const text = new TextDecoder().decode(contents);
        if (/ID(_LIKE)?\s*=.*arch/i.test(text)) return 'arch';
        if (/ID(_LIKE)?\s*=.*(ubuntu|debian)/i.test(text)) return 'debian';
        if (/ID(_LIKE)?\s*=.*(fedora|rhel|centos)/i.test(text)) return 'fedora';
    } catch (_) {}
    return 'unknown';
}

/** Return the install command for the current distro. */
function _installCommand() {
    const distro = _detectDistro();
    switch (distro) {
    case 'arch':
        return 'sudo pacman -S tesseract tesseract-data-kaz tesseract-data-eng tesseract-data-rus';
    case 'debian':
        return 'sudo apt install tesseract-ocr tesseract-ocr-kaz tesseract-ocr-eng tesseract-ocr-rus';
    case 'fedora':
        return 'sudo dnf install tesseract tesseract-langpack-kaz tesseract-langpack-eng tesseract-langpack-rus';
    default:
        return 'Install tesseract with kaz, eng and rus language packs';
    }
}

/**
 * Check whether tesseract is present in PATH.
 * If not — show an informative system notification and return false.
 * @returns {boolean}
 */
function checkTesseractOrNotify() {
    if (GLib.find_program_in_path('tesseract') !== null) return true;

    const cmd = _installCommand();
    Main.notify(
        'QK Text Extractor — Tesseract not found',
        `Install Tesseract OCR to use this extension:\n${cmd}`
    );
    return false;
}

const OCRButton = GObject.registerClass(
    class OCRButton extends PanelMenu.Button {
        _init(extension) {
            super._init(0.0, 'QK Text Extractor');
            this._extension = extension;

            this._icon = new St.Icon({
                icon_name: 'edit-find-symbolic',
                style_class: 'system-status-icon'
            });
            this.add_child(this._icon);

            this._buildMenu();
        }

        _buildMenu() {
            const runItem = new PopupMenu.PopupMenuItem('Select area for OCR');
            runItem.connect('activate', () => this._runOCR());
            this.menu.addMenuItem(runItem);

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            const prefsItem = new PopupMenu.PopupMenuItem('Preferences');
            prefsItem.connect('activate', () => {
                this._extension.openPreferences();
            });
            this.menu.addMenuItem(prefsItem);

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            const aboutItem = new PopupMenu.PopupMenuItem('About');
            aboutItem.connect('activate', () => {
                Main.notify('QK Text Extractor', `Version ${this._extension.metadata.version} – Live Text for GNOME`);
            });
            this.menu.addMenuItem(aboutItem);
        }

        _cleanupFile(path) {
            try {
                const file = Gio.File.new_for_path(path);
                if (file.query_exists(null)) {
                    file.delete(null);
                }
            } catch (_) {
            }
        }

        _executeTesseract(tmpPath, psm) {
            return new Promise((resolve, reject) => {
                try {
                    const proc = Gio.Subprocess.new(
                        ['tesseract', tmpPath, 'stdout', '-l', 'kaz+eng+rus', '--psm', String(psm)],
                        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                    );
                    proc.communicate_utf8_async(null, null, (p, res) => {
                        try {
                            const [, stdout, stderr] = p.communicate_utf8_finish(res);
                            if (p.get_successful()) {
                                resolve(stdout ? stdout.trim() : '');
                            } else {
                                reject(new Error(stderr ? stderr.trim() : 'Tesseract failed'));
                            }
                        } catch (err) {
                            reject(err);
                        }
                    });
                } catch (err) {
                    reject(err);
                }
            });
        }

        async _runTesseract(tmpPath) {
            if (!checkTesseractOrNotify()) {
                this._cleanupFile(tmpPath);
                return;
            }

            try {
                let text = await this._executeTesseract(tmpPath, 6);
                if (!text) {
                    text = await this._executeTesseract(tmpPath, 3);
                }

                this._cleanupFile(tmpPath);

                if (!text) {
                    const showNotification = this._extension.getSettings().get_boolean('show-notification');
                    if (showNotification) {
                        Main.notify('QK Text Extractor', 'No text recognized.');
                    }
                    return;
                }

                const autoCopy = this._extension.getSettings().get_boolean('auto-copy');
                if (autoCopy) {
                    const clipboard = St.Clipboard.get_default();
                    clipboard.set_text(St.ClipboardType.CLIPBOARD, text);
                }

                const showNotification = this._extension.getSettings().get_boolean('show-notification');
                if (showNotification) {
                    const preview = text.length > 100 ? `${text.substring(0, 100)}...` : text;
                    Main.notify('QK Text Extractor', preview);
                }
            } catch (e) {
                this._cleanupFile(tmpPath);
                Main.notify('QK Text Extractor', 'Recognition failed. Please verify tesseract-ocr-kaz is installed.');
            }
        }

        _captureAreaAndRun(x, y, w, h) {
            const tmpPath = `/tmp/ocr_${GLib.get_user_name()}_${Date.now()}.png`;
            try {
                const screenshot = new Shell.Screenshot();
                const file = Gio.File.new_for_path(tmpPath);
                const stream = file.replace(null, false, Gio.FileCreateFlags.PRIVATE, null);
                screenshot.screenshot_area(x, y, w, h, stream, (obj, res) => {
                    try {
                        screenshot.screenshot_area_finish(res);
                        stream.close(null);
                        this._runTesseract(tmpPath);
                    } catch (e) {
                        try {
                            stream.close(null);
                        } catch (_) {
                        }
                        this._cleanupFile(tmpPath);
                        Main.notify('QK Text Extractor', `Failed to capture area: ${e.message}`);
                    }
                });
            } catch (e) {
                this._cleanupFile(tmpPath);
                Main.notify('QK Text Extractor', `Failed to capture area: ${e.message}`);
            }
        }

        _runOCR() {
            if (!checkTesseractOrNotify()) return;

            this.menu.close();

            const overlay = new Clutter.Actor({
                reactive: true,
                x: 0,
                y: 0,
                width: global.stage.width,
                height: global.stage.height,
            });

            Main.uiGroup.add_child(overlay);
            const grab = Main.pushModal(overlay);
            try {
                global.display.set_cursor(Meta.Cursor.CROSSHAIR);
            } catch (e) {
            }

            let startX = 0;
            let startY = 0;
            let isDragging = false;
            let selectionBox = null;

            const cleanup = () => {
                try {
                    global.display.set_cursor(Meta.Cursor.DEFAULT);
                } catch (e) {
                }
                if (grab) {
                    Main.popModal(grab);
                }
                if (selectionBox) {
                    selectionBox.destroy();
                    selectionBox = null;
                }
                overlay.destroy();
            };

            overlay.connect('button-press-event', (actor, event) => {
                if (event.get_button() !== 1) {
                    cleanup();
                    return Clutter.EVENT_STOP;
                }
                const [x, y] = event.get_coords();
                startX = x;
                startY = y;
                isDragging = true;

                selectionBox = new St.Widget({
                    style_class: 'ocr-selection-box',
                    x: startX,
                    y: startY,
                    width: 0,
                    height: 0,
                });
                overlay.add_child(selectionBox);
                return Clutter.EVENT_STOP;
            });

            overlay.connect('motion-event', (actor, event) => {
                if (!isDragging || !selectionBox) {
                    return Clutter.EVENT_STOP;
                }
                const [currentX, currentY] = event.get_coords();
                const x = Math.min(startX, currentX);
                const y = Math.min(startY, currentY);
                const w = Math.abs(currentX - startX);
                const h = Math.abs(currentY - startY);

                selectionBox.set_position(x, y);
                selectionBox.set_size(w, h);
                return Clutter.EVENT_STOP;
            });

            overlay.connect('button-release-event', (actor, event) => {
                if (!isDragging) {
                    cleanup();
                    return Clutter.EVENT_STOP;
                }
                const [endX, endY] = event.get_coords();
                const x = Math.floor(Math.min(startX, endX));
                const y = Math.floor(Math.min(startY, endY));
                const w = Math.floor(Math.abs(endX - startX));
                const h = Math.floor(Math.abs(endY - startY));

                cleanup();

                if (w > 8 && h > 8) {
                    this._captureAreaAndRun(x, y, w, h);
                }
                return Clutter.EVENT_STOP;
            });

            overlay.connect('key-press-event', (actor, event) => {
                if (event.get_key_symbol() === Clutter.KEY_Escape) {
                    cleanup();
                }
                return Clutter.EVENT_STOP;
            });
        }
    }
);

export default class QkTextExtractorExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._ocrButton = new OCRButton(this);
        Main.panel.addToStatusArea('qk-text-extractor', this._ocrButton);

        // Notify once on load if Tesseract is missing so the user knows
        // without needing to trigger OCR first.
        checkTesseractOrNotify();

        this._bindShortcut();

        this._shortcutChangedId = this._settings.connect('changed::shortcut', () => {
            this._bindShortcut();
        });
    }

    disable() {
        if (this._shortcutChangedId) {
            this._settings.disconnect(this._shortcutChangedId);
            this._shortcutChangedId = null;
        }

        this._unbindShortcut();

        if (this._ocrButton) {
            this._ocrButton.destroy();
            this._ocrButton = null;
        }

        this._settings = null;
    }

    _bindShortcut() {
        this._unbindShortcut();

        const shortcuts = this._settings.get_strv('shortcut');
        if (!shortcuts || shortcuts.length === 0 || shortcuts[0].trim() === '') {
            return;
        }

        Main.wm.addKeybinding(
            'shortcut',
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => {
                if (this._ocrButton) {
                    this._ocrButton._runOCR();
                }
            }
        );
    }

    _unbindShortcut() {
        Main.wm.removeKeybinding('shortcut');
    }
}