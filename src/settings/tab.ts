import { App, PluginSettingTab, Setting } from 'obsidian';
import type VaultCleanupPlugin from '../main';
import { QueueType } from '../queues/types';
import { QUEUE_CONFIGS } from '../queues/configs';

export class VaultCleanupSettingTab extends PluginSettingTab {
  plugin: VaultCleanupPlugin;

  constructor(app: App, plugin: VaultCleanupPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Vault Cleanup Settings' });
    containerEl.createEl('p', {
      text: 'Enable or disable individual cleanup profiles.',
      attr: { style: 'color: var(--text-muted); margin-bottom: 1em;' }
    });

    for (const [id, config] of Object.entries(QUEUE_CONFIGS)) {
      new Setting(containerEl)
        .setName(`${config.icon} ${config.title}`)
        .setDesc(config.description)
        .addToggle(toggle => toggle
          .setValue(this.plugin.settings.enabledQueues[id as QueueType])
          .onChange(async (value) => {
            this.plugin.settings.enabledQueues[id as QueueType] = value;
            await this.plugin.saveSettings();
          })
        );
    }
  }
}
