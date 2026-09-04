import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const DEFAULT_SCRIPT_PATH = GLib.build_filenamev([
    GLib.get_home_dir(), '.local', 'share', 'ocr-extension', 'screenshot_ocr.sh'
]);

const OCRButton = GObject.registerClass(
    class OCRButton extends PanelMenu.Button {
        _init(extension) {
            super._init(0.0, 'EN/KZ Text Extractor');
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
                Main.notify('EN/KZ Text Extractor', 'Version 3.0 – Live Text for GNOME');
            });
            this.menu.addMenuItem(aboutItem);
        }

        _getScriptPath() {
            if (GLib.file_test(DEFAULT_SCRIPT_PATH, GLib.FileTest.EXISTS)) {
                return DEFAULT_SCRIPT_PATH;
            }

            const pathProgram = GLib.find_program_in_path('screenshot_ocr.sh');
            if (pathProgram) {
                return pathProgram;
            }

            return null;
        }

        _runOCR() {
            this.menu.close();

            const scriptPath = this._getScriptPath();

            if (!scriptPath) {
                Main.notify('EN/KZ Text Extractor', 'Backend script not found. Check settings.');
                return;
            }

            Main.notify('OCR', 'Select screen area…');

            try {
                const proc = Gio.Subprocess.new(
                    ['bash', scriptPath],
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
                Main.notify('OCR Error', `Failed to run script: ${e.message}`);
                console.error(`OCR launch error: ${e.message}`);
            }
        }
    }
);

export default class EnkzTextExtractorExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._ocrButton = new OCRButton(this);
        Main.panel.addToStatusArea('enkz-text-extractor', this._ocrButton);

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
