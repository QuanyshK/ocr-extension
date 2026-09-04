import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';

export default class EnkzTextExtractorPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'preferences-system-symbolic'
        });

        const shortcutsGroup = new Adw.PreferencesGroup({ title: _('Keyboard Shortcuts') });

        const shortcutRow = new Adw.ActionRow({
            title: _('OCR Shortcut'),
            subtitle: _('Click the button to record a new shortcut')
        });

        const shortcutLabel = new Gtk.ShortcutLabel({
            accelerator: this._formatShortcut(settings.get_strv('shortcut')),
            valign: Gtk.Align.CENTER
        });

        const editButton = new Gtk.Button({
            icon_name: 'document-edit-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: _('Edit shortcut')
        });

        editButton.connect('clicked', () => {
            this._showShortcutDialog(window, settings, shortcutLabel, editButton);
        });

        const resetButton = new Gtk.Button({
            icon_name: 'edit-undo-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: _('Reset to default')
        });

        resetButton.connect('clicked', () => {
            settings.reset('shortcut');
            shortcutLabel.accelerator = this._formatShortcut(settings.get_strv('shortcut'));
        });

        shortcutRow.add_suffix(shortcutLabel);
        shortcutRow.add_suffix(editButton);
        shortcutRow.add_suffix(resetButton);
        shortcutRow.activatable_widget = editButton;
        shortcutsGroup.add(shortcutRow);
        page.add(shortcutsGroup);

        const scriptGroup = new Adw.PreferencesGroup({ title: _('Script Path') });
        const scriptRow = new Adw.EntryRow({
            title: _('Custom OCR script path'),
            text: settings.get_string('custom-script-path')
        });
        scriptRow.connect('changed', (row) => {
            settings.set_string('custom-script-path', row.get_text());
        });
        scriptGroup.add(scriptRow);
        page.add(scriptGroup);

        const behaviorGroup = new Adw.PreferencesGroup({ title: _('Behavior') });

        const autoCopyRow = new Adw.SwitchRow({ title: _('Auto-copy to clipboard') });
        settings.bind('auto-copy', autoCopyRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(autoCopyRow);

        const notifyRow = new Adw.SwitchRow({ title: _('Show notifications') });
        settings.bind('show-notification', notifyRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(notifyRow);

        page.add(behaviorGroup);

        const langGroup = new Adw.PreferencesGroup({ title: _('Recognition Language') });
        const langRow = new Adw.ActionRow({
            title: _('Supported: en, ru, kk (rs_cyrillic), en+ru+cyrillic'),
            subtitle: _('Change requires OCR engine restart')
        });
        langGroup.add(langRow);
        page.add(langGroup);

        window.add(page);
    }

    _formatShortcut(accelerators) {
        if (!accelerators || accelerators.length === 0) {
            return '';
        }
        return accelerators[0];
    }

    _showShortcutDialog(parentWindow, settings, shortcutLabel, editButton) {
        const dialog = new Adw.MessageDialog({
            transient_for: parentWindow,
            heading: _('Record Shortcut'),
            body: _('Press the desired key combination...'),
            modal: true
        });

        dialog.add_response('cancel', _('Cancel'));
        dialog.add_response('save', _('Save'));
        dialog.set_response_appearance('save', Adw.ResponseAppearance.SUGGESTED);

        let captured = null;
        editButton.sensitive = false;

        const eventController = new Gtk.EventControllerKey();
        eventController.connect('key-pressed', (_controller, keyval, keycode, state) => {
            if (keyval === Gdk.KEY_Escape) {
                dialog.close();
                return Gdk.EVENT_STOP;
            }

            const mask = state & Gtk.accelerator_get_default_mod_mask();
            const accel = Gtk.accelerator_name(keyval, mask);

            if (accel && accel !== 'VoidSymbol') {
                captured = accel;
                dialog.body = _('Captured: ') + accel;
            }

            return Gdk.EVENT_STOP;
        });

        dialog.get_content_area().add_controller(eventController);

        dialog.connect('response', (_dlg, response) => {
            editButton.sensitive = true;
            if (response === 'save' && captured) {
                settings.set_strv('shortcut', [captured]);
                shortcutLabel.accelerator = captured;
            }
            dialog.destroy();
        });

        dialog.connect('close', () => {
            editButton.sensitive = true;
        });

        dialog.present();
    }
}
