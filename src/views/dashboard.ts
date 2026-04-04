import { ItemView, WorkspaceLeaf, debounce, Notice, TFile } from 'obsidian';
import type VaultCleanupPlugin from '../main';
import { QUEUE_CONFIGS } from '../queues/configs';
import { VIEW_TYPE_DASHBOARD, VIEW_TYPE_QUEUE } from './types';
import { QueueType } from '../queues/types';
import { ConfirmModal } from '../modals/confirm';

export class CleanupDashboardView extends ItemView {
  plugin: VaultCleanupPlugin;
  private debouncedRefresh: () => void;

  constructor(leaf: WorkspaceLeaf, plugin: VaultCleanupPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.debouncedRefresh = debounce(() => { void this.render(); }, 500, true);
  }

  getViewType(): string { return VIEW_TYPE_DASHBOARD; }
  getDisplayText(): string { return 'Cleanup dashboard'; }
  getIcon(): string { return 'trash-2'; }

  async onOpen(): Promise<void> {
    this.contentEl.addClass('vault-cleanup-dashboard');
    this.registerEvent(this.app.metadataCache.on('changed', this.debouncedRefresh));
    this.registerEvent(this.app.vault.on('delete', this.debouncedRefresh));
    this.registerEvent(this.app.vault.on('create', this.debouncedRefresh));
    this.registerEvent(this.app.vault.on('rename', this.debouncedRefresh));
    await this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  async render(): Promise<void> {
    const container = this.contentEl;
    container.empty();
    container.addClass('vault-cleanup-dashboard-container');

    container.createEl('h2', { text: 'Cleanup dashboard', cls: 'vault-cleanup-dashboard-title' });

    const grid = container.createEl('div', { cls: 'vault-cleanup-grid' });

    for (const [id, config] of Object.entries(QUEUE_CONFIGS)) {
      if (!this.plugin.settings.enabledQueues[id as QueueType]) continue;

      // Handle mutually exclusive unfiled/misfiled based on organization preference
      if (id === 'unfiled' && this.plugin.settings.vaultOrganization !== 'folders') continue;
      if (id === 'misfiled' && this.plugin.settings.vaultOrganization !== 'root') continue;

      const files = await this.plugin.detectors.getFilesForQueue(id as QueueType);
      const count = files.length;

      const card = grid.createEl('div', { cls: 'vault-cleanup-card' });

      card.createEl('div', {
        text: `${config.icon} ${config.title}`,
        cls: 'vault-cleanup-card-title'
      });

      card.createEl('div', {
        text: config.description,
        cls: 'vault-cleanup-card-description'
      });

      card.createEl('div', {
        text: `${count} file${count === 1 ? '' : 's'}`,
        cls: 'vault-cleanup-card-count'
      });

      const actions = card.createEl('div', { cls: 'vault-cleanup-actions' });

      if (count > 0) {
        const startBtn = actions.createEl('button', { text: 'Start queue' });
        startBtn.addEventListener('click', () => { void this.openQueue(id as QueueType); });

        // Batch action button
        if (config.batchAction) {
          const batchBtn = actions.createEl('button', { text: config.batchAction.label });
          if (config.batchAction.type === 'delete') {
            batchBtn.addClass('vault-cleanup-btn-delete');
          }
          batchBtn.addEventListener('click', () => { void this.executeBatchAction(id as QueueType, files); });
        }
      } else {
        card.createEl('span', {
          text: 'All clear',
          cls: 'vault-cleanup-card-clear'
        });
      }
    }
  }

  async openQueue(queueType: QueueType): Promise<void> {
    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({
      type: VIEW_TYPE_QUEUE,
      state: { queueType },
    });
  }

  async executeBatchAction(queueType: QueueType, files: TFile[]): Promise<void> {
    const config = QUEUE_CONFIGS[queueType];
    if (!config.batchAction) return;

    const count = files.length;
    const confirmMsg = config.batchAction.type === 'delete'
      ? `Delete ${count} file${count === 1 ? '' : 's'}? This will move them to trash.`
      : `Move ${count} file${count === 1 ? '' : 's'} to vault root?`;

    new ConfirmModal(this.app, confirmMsg, () => {
      void (async () => {
        switch (config.batchAction?.type) {
          case 'delete':
            for (const file of files) {
              await this.app.fileManager.trashFile(file);
            }
            new Notice(`Deleted ${count} file${count === 1 ? '' : 's'}`);
            break;

          case 'moveToRoot':
            for (const file of files) {
              const newPath = file.name;
              if (this.app.vault.getAbstractFileByPath(newPath)) {
                new Notice(`Skipped ${file.name}: file already exists at root`);
                continue;
              }
              await this.app.vault.rename(file, newPath);
            }
            new Notice(`Moved ${count} file${count === 1 ? '' : 's'} to root`);
            break;
        }

        await this.render();
      })();
    }).open();

  }
}
