/*
 * OCR Text Extractor - GNOME Shell Extension
 * Mimics macOS Live Text feature
 * 
 * Supported GNOME versions: 42-46+
 */

'use strict';

const { GObject, St, Clutter, Gio, GLib, Meta, Shell } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

// Paths to OCR scripts
const OCR_SCRIPT_PATH = GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'ocr-extension', 'screenshot_ocr.sh']);
const OCR_ENGINE_PATH = GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'ocr-extension', 'ocr_engine.py']);

// Panel button class
var OCRButton = GObject.registerClass(
    class OCRButton extends PanelMenu.Button {
        _init() {
            super._init(0.0, _('OCR Text Extractor'));
            
            // Create icon
            this._icon = new St.Icon({
                icon_name: 'edit-find-symbolic',
                style_class: 'system-status-icon'
            });
            this.add_child(this._icon);
            
            // Add menu items
            this._buildMenu();
            
            // Connect button click
            this.connect('button-press-event', () => {
                this._runOCR();
            });
        }
        
        _buildMenu() {
            // "Run OCR" menu item
            let runItem = new PopupMenu.PopupMenuItem(_('Select area for OCR'));
            runItem.connect('activate', () => {
                this._runOCR();
            });
            this.menu.addMenuItem(runItem);
            
            // Separator
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            
            // "Settings" menu item (placeholder)
            let settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
            settingsItem.connect('activate', () => {
                this._showNotification('Settings', 'Settings will be available in next version');
            });
            this.menu.addMenuItem(settingsItem);
            
            // "About" menu item
            let aboutItem = new PopupMenu.PopupMenuItem(_('About'));
            aboutItem.connect('activate', () => {
                this._showNotification('OCR Text Extractor', 'Version 1.0 - Live Text for GNOME');
            });
            this.menu.addMenuItem(aboutItem);
        }
        
        _runOCR() {
            // Close menu if open
            this.menu.close();
            
            // Check if scripts exist
            if (!GLib.file_test(OCR_SCRIPT_PATH, GLib.FileTest.EXISTS)) {
                this._showNotification('OCR Error', 'Script not found: ' + OCR_SCRIPT_PATH, true);
                return;
            }
            
            // Show start notification
            this._showNotification('OCR', 'Select screen area...');
            
            // Run OCR script in background
            try {
                let proc = Gio.Subprocess.new(
                    ['bash', OCR_SCRIPT_PATH],
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                );
                
                // Process result asynchronously
                proc.communicate_utf8_async(null, null, (proc, res) => {
                    try {
                        let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                        let success = proc.get_successful();
                        
                        if (success) {
                            log('OCR completed successfully');
                        } else {
                            log('OCR failed with error: ' + stderr);
                        }
                    } catch (e) {
                        log('Error during OCR execution: ' + e.message);
                    }
                });
                
            } catch (e) {
                this._showNotification('OCR Error', 'Failed to run script: ' + e.message, true);
                log('OCR launch error: ' + e.message);
            }
        }
        
        _showNotification(title, message, isError = false) {
            // Use system notifications via notify-send
            try {
                let urgency = isError ? 'critical' : 'normal';
                Gio.Subprocess.new(
                    ['notify-send', '-u', urgency, title, message],
                    Gio.SubprocessFlags.NONE
                );
            } catch (e) {
                log('Failed to show notification: ' + e.message);
            }
        }
        
        destroy() {
            super.destroy();
        }
    }
);

// Main extension class
class Extension {
    constructor() {
        this._ocrButton = null;
        this._keybindingId = null;
    }
    
    enable() {
        log('OCR Text Extractor: enabling extension');
        
        // Create panel button
        this._ocrButton = new OCRButton();
        Main.panel.addToStatusArea('ocr-text', this._ocrButton);
        
        // Add Super+Shift+O hotkey
        this._addKeybinding();
    }
    
    disable() {
        log('OCR Text Extractor: disabling extension');
        
        // Remove hotkey
        this._removeKeybinding();
        
        // Remove button
        if (this._ocrButton) {
            this._ocrButton.destroy();
            this._ocrButton = null;
        }
    }
    
    _addKeybinding() {
        // For GNOME 45+ different API is used
        if (global.display && Meta.KeyBindingFlags) {
            try {
                Main.wm.addKeybinding(
                    'ocr-shortcut',
                    ExtensionUtils.getSettings(),
                    Meta.KeyBindingFlags.NONE,
                    Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                    () => {
                        if (this._ocrButton) {
                            this._ocrButton._runOCR();
                        }
                    }
                );
                this._keybindingId = 'ocr-shortcut';
            } catch (e) {
                log('Failed to add hotkey: ' + e.message);
            }
        }
    }
    
    _removeKeybinding() {
        if (this._keybindingId) {
            try {
                Main.wm.removeKeybinding(this._keybindingId);
            } catch (e) {
                log('Failed to remove hotkey: ' + e.message);
            }
            this._keybindingId = null;
        }
    }
}

function init() {
    log('OCR Text Extractor: initialization');
    return new Extension();
}
