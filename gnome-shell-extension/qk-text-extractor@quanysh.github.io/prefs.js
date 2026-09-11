import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';

export default class QkTextExtractorPreferences extends ExtensionPreferences {
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
            title: _('Languages: kaz + eng + rus'),
            subtitle: _('Tesseract OCR (Kazakh, English, Russian)')
        });
        langGroup.add(langRow);
        page.add(langGroup);

        const aboutGroup = new Adw.PreferencesGroup({ title: _('About') });
        const versionRow = new Adw.ActionRow({
            title: _('Version')
        });
        const versionLabel = new Gtk.Label({
            label: String(this.metadata.version),
            css_classes: ['dim-label'],
            valign: Gtk.Align.CENTER
        });
        versionRow.add_suffix(versionLabel);
        aboutGroup.add(versionRow);
        page.add(aboutGroup);

        // ── Dependencies ────────────────────────────────────────────────────
        const depsGroup = new Adw.PreferencesGroup({ title: _('Dependencies') });

        const statusRow = new Adw.ActionRow({
            title: _('Tesseract OCR'),
            subtitle: _('Required for text recognition'),
        });

        const statusBadge = new Gtk.Label({
            valign: Gtk.Align.CENTER,
            use_markup: true,
        });

        const recheckButton = new Gtk.Button({
            label: _('Re-check'),
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
        });

        const updateTesseractStatus = () => {
            const found = GLib.find_program_in_path('tesseract') !== null;
            if (found) {
                statusBadge.label = '<span foreground="#26a269">✓ Installed</span>';
                statusRow.subtitle = _('Tesseract is ready');
            } else {
                statusBadge.label = '<span foreground="#c01c28">✗ Not found</span>';
                statusRow.subtitle = _('Tesseract is not installed — see command below');
            }
        };

        updateTesseractStatus();
        recheckButton.connect('clicked', updateTesseractStatus);

        statusRow.add_suffix(statusBadge);
        statusRow.add_suffix(recheckButton);
        depsGroup.add(statusRow);

        // Distro-aware install command row
        const installCmd = this._getInstallCommand();
        const installRow = new Adw.ActionRow({
            title: _('Install command'),
            subtitle: installCmd,
            selectable: false,
        });

        const copyButton = new Gtk.Button({
            icon_name: 'edit-copy-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: _('Copy to clipboard'),
            css_classes: ['flat'],
        });
        copyButton.connect('clicked', () => {
            const clipboard = window.get_clipboard();
            clipboard.set(installCmd);
            copyButton.icon_name = 'object-select-symbolic';
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
                copyButton.icon_name = 'edit-copy-symbolic';
                return GLib.SOURCE_REMOVE;
            });
        });
        installRow.add_suffix(copyButton);
        depsGroup.add(installRow);

        page.add(depsGroup);

        window.add(page);
    }

    _detectDistro() {
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

    _getInstallCommand() {
        switch (this._detectDistro()) {
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
