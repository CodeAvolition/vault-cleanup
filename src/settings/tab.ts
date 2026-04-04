import { App, PluginSettingTab, Setting } from 'obsidian';
import type VaultCleanupPlugin from '../main';
import { QueueType } from '../queues/types';
import { QUEUE_CONFIGS } from '../queues/configs';
import { VaultOrganization } from './types';

export class VaultCleanupSettingTab extends PluginSettingTab {
  plugin: VaultCleanupPlugin;

  constructor(app: App, plugin: VaultCleanupPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Cleanup profile toggles (excluding unfiled/misfiled)
    for (const [id, config] of Object.entries(QUEUE_CONFIGS)) {
      if (id === 'unfiled' || id === 'misfiled') continue;

      new Setting(containerEl)
        .setName(`${config.icon} ${config.title}`)
        .setDesc(config.description)
        .addToggle(toggle => toggle
          .setValue(this.plugin.settings.enabledQueues[id as QueueType])
          .onChange(async (value) => {
            this.plugin.settings.enabledQueues[id as QueueType] = value;
            await this.plugin.saveSettings();
            this.display();
          })
        );
    }

    // Vault organization section
    new Setting(containerEl)
      .setName('Vault organization')
      .setHeading();

    new Setting(containerEl)
      .setName('Organization style')
      .setDesc('How do you organize notes in your vault?')
      .addDropdown(dropdown => dropdown
        .addOption('root', 'Notes in root, special folders only')
        .addOption('folders', 'Notes organized in folders')
        .setValue(this.plugin.settings.vaultOrganization)
        .onChange(async (value: string) => {
          this.plugin.settings.vaultOrganization = value as VaultOrganization;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    // Show allowed folders only for root-based organization
    if (this.plugin.settings.vaultOrganization === 'root') {
      new Setting(containerEl)
        .setName('Allowed folders')
        .setDesc('Comma-separated folder names where notes are allowed')
        .addText(text => text
          .setPlaceholder('Attachments, daily, templates, archived')
          .setValue(this.plugin.settings.allowedFolders.join(', '))
          .onChange(async (value) => {
            this.plugin.settings.allowedFolders = value
              .split(',')
              .map(f => f.trim().toLowerCase())
              .filter(f => f.length > 0);
            await this.plugin.saveSettings();
          })
        );
    }

    // Hotkeys section
    new Setting(containerEl)
      .setName('Keyboard shortcuts')
      .setHeading();

    new Setting(containerEl)
      .setName('Enable keyboard shortcuts')
      .setDesc('Hotkeys only work when a queue view is focused')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableQueueHotkeys)
        .onChange(async (value) => {
          this.plugin.settings.enableQueueHotkeys = value;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    if (this.plugin.settings.enableQueueHotkeys) {
      const hotkeySettings = [
        { key: 'hotkeyEdit', name: 'Edit / Move / Add tag', desc: 'Key for the primary action' },
        { key: 'hotkeyDelete', name: 'Delete', desc: 'Key to delete the current file' },
        { key: 'hotkeyKeep', name: 'Keep', desc: 'Key to keep the file as-is and move on' },
        { key: 'hotkeyExit', name: 'Exit', desc: 'Key to exit the queue' },
      ] as const;

      for (const { key, name, desc } of hotkeySettings) {
        new Setting(containerEl)
          .setName(name)
          .setDesc(desc)
          .addText(text => text
            .setValue(this.plugin.settings[key])
            .onChange(async (value) => {
              this.plugin.settings[key] = value || this.getDefaultHotkey(key);
              await this.plugin.saveSettings();
            })
          );
      }
    }
  }

  private getDefaultHotkey(key: string): string {
    const defaults: Record<string, string> = {
      hotkeyEdit: 'e',
      hotkeyDelete: 'd',
      hotkeyKeep: 'k',
      hotkeyExit: 'Escape',
    };
    return defaults[key] || '';
  }
}
