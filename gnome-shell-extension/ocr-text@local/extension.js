import { Extension, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/extension.js';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const OCR_SCRIPT_PATH = GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'ocr-extension', 'screenshot_ocr.sh']);

const OCRButton = GObject.registerClass(
    class OCRButton extends PanelMenu.Button {
        _init(extension) {
            super._init(0.0, _('OCR Text Extractor'));
            this._extension = extension;

            this._icon = new St.Icon({
                icon_name: 'edit-find-symbolic',
                style_class: 'system-status-icon'
            });
            this.add_child(this._icon);

            this._buildMenu();
            this.connect('button-press-event', () => this._runOCR());
        }

        _buildMenu() {
            const runItem = new PopupMenu.PopupMenuItem(_('Select area for OCR'));
            runItem.connect('activate', () => this._runOCR());
            this.menu.addMenuItem(runItem);

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            const aboutItem = new PopupMenu.PopupMenuItem(_('About'));
            aboutItem.connect('activate', () => {
                this._showNotification('OCR Text Extractor', 'Version 2.0 – Live Text for GNOME');
            });
            this.menu.addMenuItem(aboutItem);
        }

        _runOCR() {
            this.menu.close();

            if (!GLib.file_test(OCR_SCRIPT_PATH, GLib.FileTest.EXISTS)) {
                this._showNotification('OCR Error', `Script not found: ${OCR_SCRIPT_PATH}`, true);
                return;
            }

            this._showNotification('OCR', 'Select screen area…');

            try {
                const proc = Gio.Subprocess.new(
                    ['bash', OCR_SCRIPT_PATH],
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                );

                proc.communicate_utf8_async(null, null, (proc, res) => {
                    try {
                        proc.communicate_utf8_finish(res);
                    } catch (e) {
                        console.error(`OCR execution error: ${e.message}`);
                    }
                });
            } catch (e) {
                this._showNotification('OCR Error', `Failed to run script: ${e.message}`, true);
                console.error(`OCR launch error: ${e.message}`);
            }
        }

        _showNotification(title, message, isError = false) {
            try {
                const urgency = isError ? 'critical' : 'normal';
                Gio.Subprocess.new(
                    ['notify-send', '-u', urgency, title, message],
                    Gio.SubprocessFlags.NONE
                );
            } catch (e) {
                console.error(`Notification error: ${e.message}`);
            }
        }
    }
);

export default class OcrTextExtension extends Extension {
    enable() {
        this._ocrButton = new OCRButton(this);
        Main.panel.addToStatusArea('ocr-text', this._ocrButton);

        Main.wm.addKeybinding(
            'shortcut',
            this.getSettings(),
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => this._ocrButton._runOCR()
        );
    }

    disable() {
        Main.wm.removeKeybinding('shortcut');

        if (this._ocrButton) {
            this._ocrButton.destroy();
            this._ocrButton = null;
        }
    }
}
