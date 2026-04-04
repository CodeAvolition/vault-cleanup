import { ItemView, WorkspaceLeaf, TFile, Notice, ViewStateResult } from 'obsidian';
import type VaultCleanupPlugin from '../main';
import { QUEUE_CONFIGS } from '../queues/configs';
import { VIEW_TYPE_QUEUE } from './types';
import { QueueType } from '../queues/types';
import { FilePreviewRenderer } from '../renderer';

interface QueueViewState {
  queueType?: QueueType;
  [key: string]: unknown;
}

export class CleanupQueueView extends ItemView {
  plugin: VaultCleanupPlugin;
  private queueType: QueueType | null = null;
  private files: TFile[] = [];
  private currentIndex = 0;
  private renderer: FilePreviewRenderer;

  constructor(leaf: WorkspaceLeaf, plugin: VaultCleanupPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.renderer = new FilePreviewRenderer(this.app);
  }

  getViewType(): string { return VIEW_TYPE_QUEUE; }
  getDisplayText(): string { return 'Cleanup queue'; }
  getIcon(): string { return 'list-checks'; }

  async setState(state: QueueViewState, result: ViewStateResult): Promise<void> {
    if (state.queueType) {
      this.queueType = state.queueType;
      this.files = await this.plugin.detectors.getFilesForQueue(this.queueType);
      this.currentIndex = 0;
    }
    await super.setState(state, result);
    void this.render();
  }

  getState(): Record<string, unknown> {
    return { queueType: this.queueType ?? undefined };
  }


  async onOpen(): Promise<void> {
    this.contentEl.addClass('vault-cleanup-queue');
    this.contentEl.setAttribute('tabindex', '0');
    this.registerDomEvent(this.contentEl, 'keydown', (e) => { this.handleKeydown(e); });
    await this.render();
  }

  async onClose(): Promise<void> {
    this.renderer.cleanup();
    this.contentEl.empty();
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (!this.plugin.settings.enableQueueHotkeys) return;

    const file = this.files[this.currentIndex];
    if (!file) return;

    const { hotkeyEdit, hotkeyDelete, hotkeyKeep, hotkeyExit } = this.plugin.settings;

    if (e.key === hotkeyEdit) {
      e.preventDefault();
      void this.editFile(file);
    } else if (e.key === hotkeyDelete) {
      e.preventDefault();
      void this.deleteFile(file);
    } else if (e.key === hotkeyKeep) {
      e.preventDefault();
      this.keepFile();
    } else if (e.key === hotkeyExit) {
      e.preventDefault();
      this.exitQueue();
    }
  }


  async render(): Promise<void> {
    const container = this.contentEl;
    container.empty();
    container.addClass('vault-cleanup-queue-container');

    if (!this.queueType || this.files.length === 0) {
      container.createEl('p', { text: 'Queue complete! 🎉' });
      return;
    }

    const config = QUEUE_CONFIGS[this.queueType];
    const file = this.files[this.currentIndex];

    // Guard against undefined file
    if (!file) {
      container.createEl('p', { text: 'Queue complete! 🎉' });
      return;
    }

    // Header
    const header = container.createEl('div', { cls: 'vault-cleanup-header' });

    header.createEl('h3', {
      text: `${config.icon} ${config.title}`,
      cls: 'vault-cleanup-queue-title'
    });

    // Progress
    const progress = (this.currentIndex + 1) / this.files.length;
    const progressContainer = header.createEl('div', { cls: 'vault-cleanup-progress' });
    const progressBar = progressContainer.createEl('div', { cls: 'vault-cleanup-progress-bar' });
    const progressFill = progressBar.createEl('div', { cls: 'vault-cleanup-progress-fill' });
    progressFill.style.width = `${progress * 100}%`;
    progressContainer.createEl('div', {
      text: `${this.currentIndex + 1} / ${this.files.length}`,
      cls: 'vault-cleanup-progress-text'
    });

    // File info
    const fileInfo = header.createEl('div', { cls: 'vault-cleanup-file-info' });
    fileInfo.createEl('strong', { text: file.basename });
    fileInfo.createEl('span', {
      text: ` — ${file.parent?.path || '/'}`,
      cls: 'vault-cleanup-file-path'
    });

    // Action hint
    header.createEl('div', {
      text: `💡 ${config.action}`,
      cls: 'vault-cleanup-action-hint'
    });

    // Action buttons
    const actions = header.createEl('div', { cls: 'vault-cleanup-actions' });

    const editBtn = actions.createEl('button', { text: config.editLabel });
    editBtn.addEventListener('click', () => { void this.editFile(file); });

    const deleteBtn = actions.createEl('button', { text: 'Delete' });
    deleteBtn.addClass('vault-cleanup-btn-delete');
    deleteBtn.addEventListener('click', () => { void this.deleteFile(file); });

    const keepKey = this.plugin.settings.enableQueueHotkeys ? this.plugin.settings.hotkeyKeep : '';
    const keepLabel = keepKey ? `Keep (${keepKey})` : 'Keep';
    const keepBtn = actions.createEl('button', { text: `⏭️ ${keepLabel}` });
    keepBtn.addEventListener('click', () => { this.keepFile(); });

    const exitBtn = actions.createEl('button', { text: 'Exit' });
    exitBtn.addClass('vault-cleanup-btn-exit');
    exitBtn.addEventListener('click', () => { this.exitQueue(); });

    // Preview
    const preview = container.createEl('div', { cls: 'vault-cleanup-preview' });
    await this.renderer.render(file, preview);
  }

  private async editFile(file: TFile): Promise<void> {
    const config = this.queueType ? QUEUE_CONFIGS[this.queueType] : null;

    // Open the file
    await this.app.workspace.openLinkText(file.path, '', false);

    // Execute custom command if specified
    if (config?.editCommand) {
      this.app.commands.executeCommandById(config.editCommand);
    }

    // Auto-advance to next file
    this.advanceQueue();
  }

  private async deleteFile(file: TFile): Promise<void> {
    await this.app.fileManager.trashFile(file);
    new Notice(`Deleted: ${file.basename}`);
    this.files.splice(this.currentIndex, 1);
    if (this.currentIndex >= this.files.length) {
      this.currentIndex = Math.max(0, this.files.length - 1);
    }
    void this.render();
  }

  private keepFile(): void {
    this.advanceQueue();
  }

  private advanceQueue(): void {
    this.currentIndex++;
    if (this.currentIndex >= this.files.length) {
      this.currentIndex = 0;
      this.files = [];
    }
    void this.render();
  }

  private exitQueue(): void {
    this.leaf.detach();
  }
}
