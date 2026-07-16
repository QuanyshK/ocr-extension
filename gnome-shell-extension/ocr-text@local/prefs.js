/*
 * OCR Text Extractor Extension preferences
 * For GNOME 45+ (uses GTK4)
 * For older versions uses GTK3
 */

'use strict';

const { GObject, Gtk, Gio, GLib } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

// Default settings
const DEFAULT_SETTINGS = {
    'shortcut': '<Super><Shift>o',
    'auto-copy': true,
    'show-notification': true,
    'ocr-language': 'en+ru+kk'
};

function init() {
    log('OCR Text Extractor: preferences initialization');
}

function fillPreferencesWindow(window) {
    // Get settings
    const settings = ExtensionUtils.getSettings();
    
    // Create preferences page
    const page = new Gtk.ScrolledWindow({
        hscrollbar_policy: Gtk.PolicyType.NEVER,
        vexpand: true
    });
    
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 12,
        margin_top: 24,
        margin_bottom: 24,
        margin_start: 24,
        margin_end: 24
    });
    
    page.set_child(box);
    
    // Header
    const headerLabel = new Gtk.Label({
        label: '<b>OCR Text Extractor - Settings</b>',
        use_markup: true,
        halign: Gtk.Align.START
    });
    box.append(headerLabel);
    
    // Description
    const descLabel = new Gtk.Label({
        label: 'Configure OCR extension behavior',
        halign: Gtk.Align.START,
        margin_bottom: 12
    });
    box.append(descLabel);
    
    // Group: Hotkeys
    const shortcutGroup = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 6
    });
    box.append(shortcutGroup);
    
    const shortcutLabel = new Gtk.Label({
        label: '<b>Keyboard Shortcuts</b>',
        use_markup: true,
        halign: Gtk.Align.START
    });
    shortcutGroup.append(shortcutLabel);
    
    const shortcutInfo = new Gtk.Label({
        label: 'Default hotkey: Super+Shift+O\n\nTo change hotkey use:\nSettings → Keyboard → View and Customize Shortcuts → Additional Shortcuts',
        halign: Gtk.Align.START,
        wrap: true,
        margin_bottom: 12
    });
    shortcutGroup.append(shortcutInfo);
    
    // Group: OCR Behavior
    const behaviorGroup = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 6
    });
    box.append(behaviorGroup);
    
    const behaviorLabel = new Gtk.Label({
        label: '<b>Behavior</b>',
        use_markup: true,
        halign: Gtk.Align.START
    });
    behaviorGroup.append(behaviorLabel);
    
    // Checkbox: Auto-copy
    const autoCopyBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 12
    });
    behaviorGroup.append(autoCopyBox);
    
    const autoCopySwitch = new Gtk.Switch({
        active: settings.get_boolean('auto-copy'),
        valign: Gtk.Align.CENTER
    });
    settings.bind(
        'auto-copy',
        autoCopySwitch,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );
    
    const autoCopyLabel = new Gtk.Label({
        label: 'Automatically copy text to clipboard',
        halign: Gtk.Align.START
    });
    
    autoCopyBox.append(autoCopySwitch);
    autoCopyBox.append(autoCopyLabel);
    
    // Checkbox: Show notifications
    const notifyBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 12,
        margin_top: 6
    });
    behaviorGroup.append(notifyBox);
    
    const notifySwitch = new Gtk.Switch({
        active: settings.get_boolean('show-notification'),
        valign: Gtk.Align.CENTER
    });
    settings.bind(
        'show-notification',
        notifySwitch,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );
    
    const notifyLabel = new Gtk.Label({
        label: 'Show notifications',
        halign: Gtk.Align.START
    });
    
    notifyBox.append(notifySwitch);
    notifyBox.append(notifyLabel);
    
    // Group: OCR Language
    const langGroup = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 6,
        margin_top: 12
    });
    box.append(langGroup);
    
    const langLabel = new Gtk.Label({
        label: '<b>Recognition Language</b>',
        use_markup: true,
        halign: Gtk.Align.START
    });
    langGroup.append(langLabel);
    
    const langInfo = new Gtk.Label({
        label: 'Supported languages:\n• en (English)\n• ru (Russian)\n• kk (Kazakh)\n• en+ru+kk (all languages)\n\nNote: changing requires OCR restart',
        halign: Gtk.Align.START,
        wrap: true,
        margin_bottom: 6
    });
    langGroup.append(langInfo);
    
    // Add page to window
    window.add(page);
}

// For compatibility with older GNOME versions (before 45)
function buildPrefsWidget() {
    const settings = ExtensionUtils.getSettings();
    
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 12,
        margin: 24
    });
    
    const label = new Gtk.Label({
        label: 'OCR Text Extractor\n\nHotkey: Super+Shift+O\n\nSettings available in GNOME 45+',
        wrap: true
    });
    
    box.append(label);
    box.show();
    
    return box;
}
