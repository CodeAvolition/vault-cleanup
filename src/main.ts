import { 
  App, 
  ItemView, 
  Plugin, 
  TFile, 
  WorkspaceLeaf,
  Notice,
  setIcon
} from 'obsidian';

const VIEW_TYPE_CLEANUP = 'vault-cleanup-view';

// ============ CLEANUP VIEW ============
class CleanupView extends ItemView {
  plugin: VaultCleanupPlugin;

  // Queue state
  private currentQueue: TFile[] = [];
  private currentQueueType: string = '';
  private currentQueueIndex: number = 0;

  constructor(leaf: WorkspaceLeaf, plugin: VaultCleanupPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_CLEANUP;
  }

  getDisplayText(): string {
    return 'Vault Cleanup';
  }

  getIcon(): string {
    return 'trash-2';
  }

  async onOpen() {
    await this.render();
  }

  async onClose() {
    this.contentEl.empty();
  }

  // ============ MAIN RENDER ============
  async render() {
    const container = this.contentEl;
    container.empty();
    container.addClass('vault-cleanup-container');

    // Header
    container.createEl('h2', { text: '🧹 Vault Cleanup' });

    // Stats overview
    const stats = await this.getStats();
    const statsEl = container.createDiv({ cls: 'cleanup-stats' });
    statsEl.createEl('p', { text: `Total notes: ${stats.total}` });

    // ---- SECTION 1: Empty Files (Simple batch) ----
    await this.renderSimpleSection(container, {
      title: '📄 Empty Files',
      description: 'Notes with no content',
      getFiles: () => this.getEmptyFiles(),
      emptyMessage: 'No empty files found!'
    });

    // ---- SECTION 2: Untagged Files (Queue) ----
    await this.renderQueueSection(container, {
      title: '🏷️ Untagged Files',
      description: 'Notes without any tags',
      queueType: 'untagged',
      getFiles: () => this.getUntaggedFiles(),
      emptyMessage: 'All files are tagged!'
    });

    // ---- SECTION 3: Unfiled Files (Queue) ----
    await this.renderQueueSection(container, {
      title: '📁 Unfiled Files',
      description: 'Notes in the vault root (no folder)',
      queueType: 'unfiled',
      getFiles: () => this.getUnfiledFiles(),
      emptyMessage: 'All files are organized!'
    });
  }

  // ============ SIMPLE BATCH SECTION ============
  async renderSimpleSection(container: HTMLElement, config: {
    title: string;
    description: string;
    getFiles: () => Promise<TFile[]>;
    emptyMessage: string;
  }) {
    const section = container.createDiv({ cls: 'cleanup-section' });
    section.createEl('h3', { text: config.title });
    section.createEl('p', { text: config.description, cls: 'cleanup-description' });

    const files = await config.getFiles();
    const countEl = section.createEl('p', { cls: 'cleanup-count' });
    countEl.setText(`Found: ${files.length} files`);

    if (files.length === 0) {
      section.createEl('p', { text: config.emptyMessage, cls: 'cleanup-success' });
      return;
    }

    // File list (collapsible)
    const listContainer = section.createDiv({ cls: 'cleanup-list-container' });
    const toggleBtn = section.createEl('button', { text: 'Show files', cls: 'cleanup-toggle' });
    const listEl = listContainer.createEl('ul', { cls: 'cleanup-list hidden' });

    files.forEach(file => {
      const li = listEl.createEl('li');
      li.createEl('a', { 
        text: file.path, 
        cls: 'cleanup-file-link',
        href: '#'
      }).addEventListener('click', (e) => {
        e.preventDefault();
        this.app.workspace.openLinkText(file.path, '');
      });
    });

    toggleBtn.addEventListener('click', () => {
      listEl.classList.toggle('hidden');
      toggleBtn.setText(listEl.classList.contains('hidden') ? 'Show files' : 'Hide files');
    });

    // Action buttons
    const actions = section.createDiv({ cls: 'cleanup-actions' });

    const deleteAllBtn = actions.createEl('button', { 
      text: '🗑️ Delete All', 
      cls: 'cleanup-btn cleanup-btn-danger' 
    });
    deleteAllBtn.addEventListener('click', async () => {
      if (confirm(`Delete ${files.length} empty files? This moves them to trash.`)) {
        for (const file of files) {
          await this.app.vault.trash(file, true);
        }
        new Notice(`Deleted ${files.length} empty files`);
        await this.render();
      }
    });
  }

  // ============ QUEUE SECTION ============
  async renderQueueSection(container: HTMLElement, config: {
    title: string;
    description: string;
    queueType: string;
    getFiles: () => Promise<TFile[]>;
    emptyMessage: string;
  }) {
    const section = container.createDiv({ cls: 'cleanup-section' });
    section.createEl('h3', { text: config.title });
    section.createEl('p', { text: config.description, cls: 'cleanup-description' });

    const files = await config.getFiles();
    const countEl = section.createEl('p', { cls: 'cleanup-count' });
    countEl.setText(`Found: ${files.length} files`);

    if (files.length === 0) {
      section.createEl('p', { text: config.emptyMessage, cls: 'cleanup-success' });
      return;
    }

    // Start queue button
    const startQueueBtn = section.createEl('button', { 
      text: '▶️ Start Queue', 
      cls: 'cleanup-btn cleanup-btn-primary' 
    });

    // Queue container (hidden initially)
    const queueContainer = section.createDiv({ cls: 'cleanup-queue hidden' });

    startQueueBtn.addEventListener('click', () => {
      this.currentQueue = [...files];
      this.currentQueueType = config.queueType;
      this.currentQueueIndex = 0;
      startQueueBtn.classList.add('hidden');
      queueContainer.classList.remove('hidden');
      this.renderQueueItem(queueContainer);
    });
  }

  renderQueueItem(container: HTMLElement) {
    container.empty();

    if (this.currentQueueIndex >= this.currentQueue.length) {
      container.createEl('p', { text: '✅ Queue complete!', cls: 'cleanup-success' });
      const doneBtn = container.createEl('button', { text: 'Refresh', cls: 'cleanup-btn' });
      doneBtn.addEventListener('click', () => this.render());
      return;
    }

    const file = this.currentQueue[this.currentQueueIndex];
    const remaining = this.currentQueue.length - this.currentQueueIndex;

    // Progress
    container.createEl('p', { 
      text: `${this.currentQueueIndex + 1} / ${this.currentQueue.length} (${remaining} remaining)`,
      cls: 'cleanup-progress'
    });

    // Current file
    const fileInfo = container.createDiv({ cls: 'cleanup-current-file' });
    const fileLink = fileInfo.createEl('a', { 
      text: file.path,
      cls: 'cleanup-file-link',
      href: '#'
    });
    fileLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.app.workspace.openLinkText(file.path, '');
    });

    // Action buttons
    const actions = container.createDiv({ cls: 'cleanup-queue-actions' });

    // Skip button
    const skipBtn = actions.createEl('button', { text: '⏭️ Skip', cls: 'cleanup-btn' });
    skipBtn.addEventListener('click', () => {
      this.currentQueueIndex++;
      this.renderQueueItem(container);
    });

    // Open & Next button
    const openBtn = actions.createEl('button', { text: '📂 Open', cls: 'cleanup-btn cleanup-btn-primary' });
    openBtn.addEventListener('click', async () => {
      await this.app.workspace.openLinkText(file.path, '');
    });

    // Delete button
    const deleteBtn = actions.createEl('button', { text: '🗑️ Delete', cls: 'cleanup-btn cleanup-btn-danger' });
    deleteBtn.addEventListener('click', async () => {
      await this.app.vault.trash(file, true);
      new Notice(`Deleted: ${file.basename}`);
      this.currentQueue.splice(this.currentQueueIndex, 1);
      this.renderQueueItem(container);
    });

    // Abort button
    const abortBtn = actions.createEl('button', { text: '❌ Abort Queue', cls: 'cleanup-btn' });
    abortBtn.addEventListener('click', () => {
      this.currentQueue = [];
      this.render();
    });
  }

  // ============ FILE DETECTION METHODS ============

  async getStats() {
    const files = this.app.vault.getMarkdownFiles();
    return { total: files.length };
  }

  async getEmptyFiles(): Promise<TFile[]> {
    const files = this.app.vault.getMarkdownFiles();
    const emptyFiles: TFile[] = [];

    for (const file of files) {
      const content = await this.app.vault.cachedRead(file);
      // Consider file empty if it has no content or only whitespace
      if (content.trim().length === 0) {
        emptyFiles.push(file);
      }
    }
    return emptyFiles;
  }

  async getUntaggedFiles(): Promise<TFile[]> {
    const files = this.app.vault.getMarkdownFiles();
    const untagged: TFile[] = [];

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      // Check both inline tags and frontmatter tags
      const hasTags = cache?.tags && cache.tags.length > 0;
      const hasFrontmatterTags = cache?.frontmatter?.tags && 
        (Array.isArray(cache.frontmatter.tags) 
          ? cache.frontmatter.tags.length > 0 
          : true);

      if (!hasTags && !hasFrontmatterTags) {
        untagged.push(file);
      }
    }
    return untagged;
  }

  async getUnfiledFiles(): Promise<TFile[]> {
    const files = this.app.vault.getMarkdownFiles();
    // Files in root have parent === vault root folder
    // We check if the path contains no folder separator
    return files.filter(file => !file.path.includes('/'));
  }
}

// ============ MAIN PLUGIN ============
export default class VaultCleanupPlugin extends Plugin {
  async onload() {
    // Register the custom view
    this.registerView(
      VIEW_TYPE_CLEANUP,
      (leaf) => new CleanupView(leaf, this)
    );

    // Add ribbon icon to open the view
    this.addRibbonIcon('trash-2', 'Open Vault Cleanup', () => {
      this.activateView();
    });

    // Add command
    this.addCommand({
      id: 'open-vault-cleanup',
      name: 'Open Vault Cleanup Dashboard',
      callback: () => this.activateView()
    });
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CLEANUP);
  }

async activateView() {
  const { workspace } = this.app;

  let leaf = workspace.getLeavesOfType(VIEW_TYPE_CLEANUP)[0];

  if (!leaf) {
    // Open in main editor area as a new tab
    leaf = workspace.getLeaf('tab');
    await leaf.setViewState({ type: VIEW_TYPE_CLEANUP, active: true });
  }

  workspace.revealLeaf(leaf);
}
}
