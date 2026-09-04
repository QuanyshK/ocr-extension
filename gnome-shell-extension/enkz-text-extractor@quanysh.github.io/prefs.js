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
            const defaultShortcut = settings.get_strv('shortcut');
            shortcutLabel.accelerator = this._formatShortcut(defaultShortcut);
        });

        shortcutRow.add_suffix(shortcutLabel);
        shortcutRow.add_suffix(editButton);
        shortcutRow.add_suffix(resetButton);
        shortcutRow.activatable_widget = editButton;
        shortcutsGroup.add(shortcutRow);
        page.add(shortcutsGroup);

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
            heading: _('Set Shortcut'),
            body: _('Press the key combination you want to use'),
            modal: true
        });

        dialog.add_response('cancel', _('Cancel'));
        dialog.add_response('save', _('Set'));
        dialog.set_response_appearance('save', Adw.ResponseAppearance.SUGGESTED);
        dialog.set_response_enabled('save', false);

        const previewLabel = new Gtk.ShortcutLabel({
            accelerator: '',
            halign: Gtk.Align.CENTER,
            margin_top: 18,
            margin_bottom: 12
        });

        const statusLabel = new Gtk.Label({
            label: _('Waiting for key combination…'),
            css_classes: ['dim-label'],
            halign: Gtk.Align.CENTER
        });

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8
        });
        box.append(previewLabel);
        box.append(statusLabel);

        dialog.set_extra_child(box);

        let captured = null;
        editButton.sensitive = false;

        const eventController = new Gtk.EventControllerKey();
        eventController.connect('key-pressed', (_controller, keyval, _keycode, state) => {
            if (keyval === Gdk.KEY_Escape) {
                dialog.response('cancel');
                return Gdk.EVENT_STOP;
            }

            const isModifier = [
                Gdk.KEY_Shift_L, Gdk.KEY_Shift_R,
                Gdk.KEY_Control_L, Gdk.KEY_Control_R,
                Gdk.KEY_Alt_L, Gdk.KEY_Alt_R,
                Gdk.KEY_Super_L, Gdk.KEY_Super_R,
                Gdk.KEY_Meta_L, Gdk.KEY_Meta_R
            ].includes(keyval);

            if (isModifier) {
                return Gdk.EVENT_STOP;
            }

            const mask = state & Gtk.accelerator_get_default_mod_mask();
            const accel = Gtk.accelerator_name(keyval, mask);

            if (accel && accel !== 'VoidSymbol' && mask > 0) {
                captured = accel;
                previewLabel.accelerator = accel;
                statusLabel.label = _('New shortcut ready to apply');
                dialog.set_response_enabled('save', true);
            }

            return Gdk.EVENT_STOP;
        });

        dialog.add_controller(eventController);

        dialog.connect('response', (_dlg, response) => {
            editButton.sensitive = true;
            if (response === 'save' && captured) {
                let normalized = captured
                    .replace('<Primary>', '<Control>')
                    .replace('<Ctrl>', '<Control>');

                settings.set_strv('shortcut', [normalized]);
                shortcutLabel.accelerator = normalized;
            }
            dialog.destroy();
        });

        dialog.present();
    }
}
