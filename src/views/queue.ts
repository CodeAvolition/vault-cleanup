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
  private history: number[] = [];
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
      this.history = [];
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

    // Re-focus when layout changes
    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        // Check if this view's leaf is the active one
        if (this.app.workspace.getMostRecentLeaf() === this.leaf) {
          this.contentEl.focus();
        }
      })
    );

    await this.render();
  }


  async onClose(): Promise<void> {
    this.renderer.cleanup();
    this.contentEl.empty();
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (!this.plugin.settings.enableQueueHotkeys) return;

    const file = this.files[this.currentIndex];
    const { hotkeyEdit, hotkeyDelete, hotkeyKeep, hotkeyBack, hotkeyExit } = this.plugin.settings;

    if (e.key === hotkeyEdit && file) {
      e.preventDefault();
      void this.editFile(file);
    } else if (e.key === hotkeyDelete && file) {
      e.preventDefault();
      void this.deleteFile(file);
    } else if (e.key === hotkeyKeep && file) {
      e.preventDefault();
      this.keepFile();
    } else if (e.key === hotkeyBack) {
      e.preventDefault();
      this.goBack();
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
    const hotkeysEnabled = this.plugin.settings.enableQueueHotkeys;

    // Edit button
    const editKey = hotkeysEnabled ? ` (${this.plugin.settings.hotkeyEdit.toUpperCase()})` : '';
    const editBtn = actions.createEl('button', { text: `${config.editLabel}${editKey}` });
    editBtn.addEventListener('click', () => { void this.editFile(file); });

    // Delete button
    const deleteKey = hotkeysEnabled ? ` (${this.plugin.settings.hotkeyDelete.toUpperCase()})` : '';
    const deleteBtn = actions.createEl('button', { text: `Delete${deleteKey}` });
    deleteBtn.addClass('vault-cleanup-btn-delete');
    deleteBtn.addEventListener('click', () => { void this.deleteFile(file); });

    // Keep button
    const keepKey = hotkeysEnabled ? ` (${this.plugin.settings.hotkeyKeep.toUpperCase()})` : '';
    const keepBtn = actions.createEl('button', { text: `Keep${keepKey}` });
    keepBtn.addEventListener('click', () => { this.keepFile(); });

    // Back button
    const backKey = hotkeysEnabled ? ` (${this.plugin.settings.hotkeyBack.toUpperCase()})` : '';
    const backBtn = actions.createEl('button', { text: `← Back${backKey}` });
    backBtn.addEventListener('click', () => { this.goBack(); });
    if (this.history.length === 0) {
      backBtn.disabled = true;
      backBtn.addClass('vault-cleanup-btn-disabled');
    }

    // Exit button
    const exitKey = hotkeysEnabled ? ' (Esc)' : '';
    const exitBtn = actions.createEl('button', { text: `Exit${exitKey}` });
    exitBtn.addClass('vault-cleanup-btn-exit');
    exitBtn.addEventListener('click', () => { this.exitQueue(); });

    // Preview
    const preview = container.createEl('div', { cls: 'vault-cleanup-preview' });
    await this.renderer.render(file, preview);

    // Focus for hotkeys
    this.contentEl.focus();
  }

  private async editFile(file: TFile): Promise<void> {
    const config = this.queueType ? QUEUE_CONFIGS[this.queueType] : null;

    // Open the file
    await this.app.workspace.openLinkText(file.path, '', false);

    // Execute custom command if specified
    if (config?.editCommand) {
      this.app.commands.executeCommandById(config.editCommand);
    }

    // Auto-advance if enabled
    if (this.plugin.settings.autoAdvanceOnEdit) {
      this.advanceQueue();
    }
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
    this.history.push(this.currentIndex);
    this.currentIndex++;
    if (this.currentIndex >= this.files.length) {
      this.currentIndex = 0;
      this.files = [];
      this.history = [];
    }
    void this.render();
  }

  private goBack(): void {
    if (this.history.length === 0) return;
    const previousIndex = this.history.pop();
    if (previousIndex !== undefined) {
      this.currentIndex = previousIndex;
      void this.render();
    }
  }

  private exitQueue(): void {
    this.leaf.detach();
  }
}
