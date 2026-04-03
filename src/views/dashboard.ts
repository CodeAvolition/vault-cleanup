import { ItemView, WorkspaceLeaf, debounce, Notice } from 'obsidian';
import type VaultCleanupPlugin from '../main';
import { QUEUE_CONFIGS } from '../queues/configs';
import { VIEW_TYPE_DASHBOARD } from './types';
import { QueueConfig } from '../queues/types';

export class CleanupDashboardView extends ItemView {
  plugin: VaultCleanupPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: VaultCleanupPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string { return VIEW_TYPE_DASHBOARD; }
  getDisplayText(): string { return 'Vault Cleanup'; }
  getIcon(): string { return 'trash-2'; }

  async onOpen() {
    this.registerEvent(this.app.metadataCache.on('changed', this.debouncedRefresh));
    this.registerEvent(this.app.vault.on('delete', this.debouncedRefresh));
    this.registerEvent(this.app.vault.on('create', this.debouncedRefresh));
    await this.render();
  }

  debouncedRefresh = debounce(async () => await this.render(), 500, true);

  async onClose() {
    this.contentEl.empty();
  }

  async render() {
    const container = this.contentEl;
    container.empty();
    container.style.padding = '20px';

    // Header
    const header = container.createEl('div', { 
      attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 1em;' } 
    });
    header.createEl('h2', { text: '🧹 Vault Cleanup', attr: { style: 'margin: 0;' } });

    const refreshBtn = header.createEl('button', { text: '↻ Refresh' });
    refreshBtn.addEventListener('click', () => this.render());

    // Stats
    const total = this.app.vault.getMarkdownFiles().length;
    container.createEl('p', { 
      text: `Total notes: ${total}`, 
      attr: { style: 'color: var(--text-muted); margin-bottom: 1.5em;' } 
    });

    // Grid
    const grid = container.createEl('div', {
      attr: { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;' }
    });

    // Only show enabled queues
    for (const config of Object.values(QUEUE_CONFIGS)) {
      if (this.plugin.settings.enabledQueues[config.id]) {
        await this.renderCard(grid, config);
      }
    }

    // Show message if all disabled
    const enabledCount = Object.values(this.plugin.settings.enabledQueues).filter(Boolean).length;
    if (enabledCount === 0) {
      container.createEl('p', { 
        text: 'All cleanup profiles are disabled. Enable them in Settings → Vault Cleanup.',
        attr: { style: 'color: var(--text-muted); font-style: italic;' }
      });
    }
  }

  async renderCard(container: HTMLElement, config: QueueConfig) {
    const files = await this.plugin.detectors.getFilesForQueue(config.id);

    const card = container.createEl('div', {
      attr: {
        style: `
          background: var(--background-secondary);
          border-radius: 8px;
          padding: 16px;
          border: 1px solid var(--background-modifier-border);
        `
      }
    });

    // Title row
    const titleRow = card.createEl('div', { 
      attr: { style: 'display: flex; justify-content: space-between; align-items: center;' } 
    });
    titleRow.createEl('strong', { text: `${config.icon} ${config.title}` });
    titleRow.createEl('span', {
      text: String(files.length),
      attr: { style: 'background: var(--background-modifier-border); padding: 2px 10px; border-radius: 10px;' }
    });

    card.createEl('p', { 
      text: config.description, 
      attr: { style: 'color: var(--text-muted); font-size: 0.9em; margin: 8px 0;' } 
    });

    if (files.length === 0) {
      card.createEl('p', { text: '✅ All clean!', attr: { style: 'color: var(--text-success);' } });
      return;
    }

    const btnRow = card.createEl('div', { attr: { style: 'display: flex; gap: 8px; margin-top: 8px;' } });

    const startBtn = btnRow.createEl('button', { text: '▶ Start Queue' });
    startBtn.addEventListener('click', () => this.plugin.openQueueView(config.id));

    // Batch delete for applicable queues
    if (config.hasBatchDelete) {
      const deleteAllBtn = btnRow.createEl('button', { text: '🗑️ Delete All' });
      deleteAllBtn.style.color = 'var(--text-error)';
      deleteAllBtn.addEventListener('click', async () => {
        if (confirm(`Delete ${files.length} ${config.title.toLowerCase()}?\n\nThis moves them to trash.`)) {
          for (const file of files) {
            await this.app.vault.trash(file, true);
          }
          new Notice(`Deleted ${files.length} files`);
          await this.render();
        }
      });
    }
  }
}
