import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Gio from 'gi://Gio';
import Adw from 'gi://Adw';

export default class OcrTextPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'preferences-system-symbolic'
        });

        const shortcutsGroup = new Adw.PreferencesGroup({ title: _('Keyboard Shortcuts') });
        const shortcutRow = new Adw.ActionRow({
            title: _('OCR Shortcut'),
            subtitle: _('Default: Super+Shift+O')
        });
        const shortcutSwitch = new Adw.SwitchRow({
            title: _('Enabled'),
            active: true
        });
        shortcutSwitch.sensitive = false;
        shortcutRow.add_suffix(shortcutSwitch);
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
}
