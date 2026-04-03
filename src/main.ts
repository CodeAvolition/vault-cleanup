import {
  App,
  ItemView,
  Plugin,
  TFile,
  WorkspaceLeaf,
  Notice,
  MarkdownRenderer,
  Component,
  debounce
} from 'obsidian';

const VIEW_TYPE_DASHBOARD = 'vault-cleanup-dashboard';
const VIEW_TYPE_QUEUE = 'vault-cleanup-queue';

// ============ QUEUE CONFIGURATION ============
type QueueType = 'untagged' | 'unfiled' | 'empty' | 'unused';

interface QueueConfig {
  id: QueueType;
  title: string;
  icon: string;
  description: string;
}

const QUEUE_CONFIGS: Record<QueueType, QueueConfig> = {
  empty: {
    id: 'empty',
    title: 'Empty Files',
    icon: '📄',
    description: 'Notes with no content'
  },
  untagged: {
    id: 'untagged',
    title: 'Untagged Files',
    icon: '🏷️',
    description: 'Notes without any tags'
  },
  unfiled: {
    id: 'unfiled',
    title: 'Unfiled Files',
    icon: '📁',
    description: 'Notes in the vault root'
  },
  unused: {
    id: 'unused',
    title: 'Unused Attachments',
    icon: '🖼️',
    description: 'Images, videos, audio, and drawings not linked anywhere'
  }
};

// ============ DASHBOARD VIEW ============
class CleanupDashboardView extends ItemView {
  plugin: VaultCleanupPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: VaultCleanupPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_DASHBOARD;
  }

  getDisplayText(): string {
    return 'Vault Cleanup';
  }

  getIcon(): string {
    return 'trash-2';
  }

  async onOpen() {
    this.registerEvent(
      this.app.metadataCache.on('changed', this.debouncedRefresh)
    );
    this.registerEvent(
      this.app.vault.on('delete', this.debouncedRefresh)
    );
    this.registerEvent(
      this.app.vault.on('create', this.debouncedRefresh)
    );

    await this.render();
  }

  debouncedRefresh = debounce(async () => {
    await this.render();
  }, 500, true);

  async onClose() {
    this.contentEl.empty();
  }

  async render() {
    const container = this.contentEl;
    container.empty();
    container.style.padding = '20px';

    // Header
    const header = container.createEl('div', { attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 1em;' } });
    header.createEl('h2', { text: '🧹 Vault Cleanup', attr: { style: 'margin: 0;' } });

    const refreshBtn = header.createEl('button', { text: '↻ Refresh' });
    refreshBtn.addEventListener('click', () => this.render());

    // Stats
    const total = this.app.vault.getMarkdownFiles().length;
    container.createEl('p', { text: `Total notes: ${total}`, attr: { style: 'color: var(--text-muted); margin-bottom: 1.5em;' } });

    // Grid of queue cards
    const grid = container.createEl('div', {
      attr: { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;' }
    });

    for (const config of Object.values(QUEUE_CONFIGS)) {
      await this.renderCard(grid, config);
    }
  }

  async renderCard(container: HTMLElement, config: QueueConfig) {
    const files = await this.plugin.getFilesForQueue(config.id);

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
    const titleRow = card.createEl('div', { attr: { style: 'display: flex; justify-content: space-between; align-items: center;' } });
    titleRow.createEl('strong', { text: `${config.icon} ${config.title}` });
    titleRow.createEl('span', {
      text: String(files.length),
      attr: { style: 'background: var(--background-modifier-border); padding: 2px 10px; border-radius: 10px;' }
    });

    card.createEl('p', { text: config.description, attr: { style: 'color: var(--text-muted); font-size: 0.9em; margin: 8px 0;' } });

    if (files.length === 0) {
      card.createEl('p', { text: '✅ All clean!', attr: { style: 'color: var(--text-success);' } });
      return;
    }

    // Button container
    const btnRow = card.createEl('div', { attr: { style: 'display: flex; gap: 8px; margin-top: 8px;' } });

    const startBtn = btnRow.createEl('button', { text: '▶ Start Queue' });
    startBtn.addEventListener('click', () => this.plugin.openQueueView(config.id));

    // Add "Delete All" for empty files and unused attachments
    if (config.id === 'empty' || config.id === 'unused') {
      const deleteAllBtn = btnRow.createEl('button', { text: '🗑️ Delete All' });
      deleteAllBtn.style.color = 'var(--text-error)';
      deleteAllBtn.addEventListener('click', async () => {
        const confirmMsg = `Delete ${files.length} ${config.title.toLowerCase()}?\n\nThis moves them to trash.`;
        if (confirm(confirmMsg)) {
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

// ============ QUEUE VIEW ============
class CleanupQueueView extends ItemView {
  plugin: VaultCleanupPlugin;
  queueType: QueueType = 'untagged';
  queue: TFile[] = [];
  currentIndex: number = 0;
  previewComponent: Component | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: VaultCleanupPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_QUEUE;
  }

  getDisplayText(): string {
    return QUEUE_CONFIGS[this.queueType]?.title || 'Cleanup Queue';
  }

  getIcon(): string {
    return 'layers';
  }

  async setState(state: { queueType?: QueueType }, result: any) {
    if (state.queueType) {
      this.queueType = state.queueType;
      // Update the tab title
      this.leaf.updateHeader();
      await this.loadQueue();
    }
    return super.setState(state, result);
  }

  getState() {
    return { queueType: this.queueType };
  }

  async onOpen() {
    await this.loadQueue();
  }

  async loadQueue() {
    this.queue = await this.plugin.getFilesForQueue(this.queueType);
    this.currentIndex = 0;
    await this.render();
  }

  async onClose() {
    this.cleanupPreview();
    this.contentEl.empty();
  }

  cleanupPreview() {
    if (this.previewComponent) {
      this.previewComponent.unload();
      this.previewComponent = null;
    }
  }

  async render() {
    this.cleanupPreview();
    const container = this.contentEl;
    container.empty();

    // Main layout: flex column, full height
    container.style.cssText = 'display: flex; flex-direction: column; height: 100%; padding: 16px;';

    const config = QUEUE_CONFIGS[this.queueType];

    // ===== FIXED HEADER SECTION =====
    const header = container.createEl('div', { attr: { style: 'flex-shrink: 0;' } });

    // Title
    header.createEl('h2', { text: `${config.icon} ${config.title}`, attr: { style: 'margin: 0 0 12px 0;' } });

    // Queue complete?
    if (this.currentIndex >= this.queue.length) {
      header.createEl('p', { text: '✅ Queue complete! All files processed.', attr: { style: 'color: var(--text-success);' } });
      const closeBtn = header.createEl('button', { text: 'Close' });
      closeBtn.addEventListener('click', () => this.leaf.detach());
      return;
    }

    const file = this.queue[this.currentIndex];

    // Progress
    const progressText = `${this.currentIndex + 1} / ${this.queue.length}`;
    const progressPct = ((this.currentIndex / this.queue.length) * 100).toFixed(0);

    const progressRow = header.createEl('div', { attr: { style: 'margin-bottom: 12px;' } });
    progressRow.createEl('div', {
      attr: { style: 'background: var(--background-modifier-border); border-radius: 4px; height: 6px; margin-bottom: 4px;' }
    }).createEl('div', {
      attr: { style: `background: var(--interactive-accent); height: 100%; width: ${progressPct}%; border-radius: 4px;` }
    });
    progressRow.createEl('small', { text: progressText, attr: { style: 'color: var(--text-muted);' } });

    // File info
    header.createEl('div', {
      attr: { style: 'background: var(--background-secondary); padding: 8px 12px; border-radius: 6px; margin-bottom: 12px;' }
    }).innerHTML = `<strong>${file.basename}</strong> <span style="color: var(--text-muted); font-size: 0.85em;">${file.parent?.path || '/'}</span>`;

    // ===== ACTION BUTTONS (FIXED) =====
    const actions = header.createEl('div', { attr: { style: 'display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;' } });

    const makeBtn = (text: string, onClick: () => void, style?: string) => {
      const btn = actions.createEl('button', { text });
      if (style) btn.style.cssText = style;
      btn.addEventListener('click', onClick);
      return btn;
    };

    makeBtn('✏️ Edit (E)', () => this.openFile(file));
    makeBtn('🗑️ Delete (D)', () => this.deleteFile(file), 'color: var(--text-error);');
    makeBtn('⏭️ Skip (S)', () => this.next());
    makeBtn('✕ Exit', () => this.leaf.detach(), 'margin-left: auto; opacity: 0.7;');

    // Keyboard hint
    header.createEl('small', { text: 'Keys: E=Edit, D=Delete, S=Skip, Esc=Exit', attr: { style: 'color: var(--text-faint);' } });

    // ===== SEPARATOR =====
    header.createEl('hr', { attr: { style: 'margin: 16px 0; border: none; border-top: 1px solid var(--background-modifier-border);' } });

    // ===== SCROLLABLE PREVIEW =====
    const preview = container.createEl('div', {
      attr: { style: 'flex: 1; overflow-y: auto; padding: 16px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 8px;' }
    });

    await this.renderFilePreview(file, preview);
  }

async renderFilePreview(file: TFile, container: HTMLElement) {
  const ext = file.extension.toLowerCase();

  // Image files
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'];
  if (imageExts.includes(ext)) {
    const img = container.createEl('img', {
      attr: {
        src: this.app.vault.getResourcePath(file),
        style: 'max-width: 100%; max-height: 500px; object-fit: contain;'
      }
    });
    return;
  }

  // Video files
  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
  if (videoExts.includes(ext)) {
    const video = container.createEl('video', {
      attr: {
        src: this.app.vault.getResourcePath(file),
        controls: 'true',
        style: 'max-width: 100%; max-height: 500px;'
      }
    });
    return;
  }

  // Audio files
  const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
  if (audioExts.includes(ext)) {
    const audio = container.createEl('audio', {
      attr: {
        src: this.app.vault.getResourcePath(file),
        controls: 'true',
        style: 'width: 100%;'
      }
    });
    return;
  }

  // Excalidraw files (raw .excalidraw JSON)
  if (ext === 'excalidraw') {
    container.createEl('p', { 
      text: '🎨 Excalidraw drawing (open to preview)', 
      attr: { style: 'color: var(--text-muted); font-style: italic;' } 
    });
    return;
  }

  // Markdown / Excalidraw.md / other text files
  const content = await this.app.vault.cachedRead(file);

  if (content.trim().length === 0) {
    container.createEl('p', { 
      text: '(Empty file)', 
      attr: { style: 'color: var(--text-muted); font-style: italic;' } 
    });
    return;
  }

  this.previewComponent = new Component();
  this.previewComponent.load();

  await MarkdownRenderer.render(
    this.app,
    content,
    container,
    file.path,
    this.previewComponent
  );
}


  async openFile(file: TFile) {
    await this.app.workspace.openLinkText(file.path, '', true);
  }

  async deleteFile(file: TFile) {
    await this.app.vault.trash(file, true);
    new Notice(`Deleted: ${file.basename}`);
    this.queue.splice(this.currentIndex, 1);
    await this.render();
  }

  next() {
    this.currentIndex++;
    this.render();
  }
}

// ============ MAIN PLUGIN ============
export default class VaultCleanupPlugin extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE_DASHBOARD, (leaf) => new CleanupDashboardView(leaf, this));
    this.registerView(VIEW_TYPE_QUEUE, (leaf) => new CleanupQueueView(leaf, this));

    this.addRibbonIcon('trash-2', 'Open Vault Cleanup', () => this.activateDashboard());

    this.addCommand({
      id: 'open-cleanup-dashboard',
      name: 'Open Cleanup Dashboard',
      callback: () => this.activateDashboard()
    });

    // Queue commands
    for (const config of Object.values(QUEUE_CONFIGS)) {
      this.addCommand({
        id: `open-${config.id}-queue`,
        name: `Open ${config.title} Queue`,
        callback: () => this.openQueueView(config.id)
      });
    }

    // Keyboard shortcuts for queue actions
    this.addCommand({
      id: 'queue-skip',
      name: 'Queue: Skip',
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(CleanupQueueView);
        if (view) { if (!checking) view.next(); return true; }
        return false;
      }
    });

    this.addCommand({
      id: 'queue-delete',
      name: 'Queue: Delete',
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(CleanupQueueView);
        if (view?.queue[view.currentIndex]) {
          if (!checking) view.deleteFile(view.queue[view.currentIndex]);
          return true;
        }
        return false;
      }
    });

    this.addCommand({
      id: 'queue-edit',
      name: 'Queue: Edit',
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(CleanupQueueView);
        if (view?.queue[view.currentIndex]) {
          if (!checking) view.openFile(view.queue[view.currentIndex]);
          return true;
        }
        return false;
      }
    });
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DASHBOARD);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_QUEUE);
  }

  async activateDashboard() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD)[0];
    if (!leaf) {
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE_DASHBOARD, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  async openQueueView(queueType: QueueType) {
    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({
      type: VIEW_TYPE_QUEUE,
      active: true,
      state: { queueType }
    });
    this.app.workspace.revealLeaf(leaf);
  }

  // ============ FILE DETECTION ============
  async getFilesForQueue(queueType: QueueType): Promise<TFile[]> {
    switch (queueType) {
      case 'empty': return this.getEmptyFiles();
      case 'untagged': return this.getUntaggedFiles();
      case 'unfiled': return this.getUnfiledFiles();
      case 'unused': return this.getUnusedAttachments();
    }
  }

  async getEmptyFiles(): Promise<TFile[]> {
    const result: TFile[] = [];
    const allFiles = this.app.vault.getFiles();

    for (const file of allFiles) {
      // Markdown files
      if (file.extension === 'md') {
        const content = await this.app.vault.cachedRead(file);
        if (content.trim().length === 0) {
          result.push(file);
        }
      }
      // Canvas files
      else if (file.extension === 'canvas') {
        const content = await this.app.vault.cachedRead(file);
        try {
          const json = JSON.parse(content);
          const hasNodes = json.nodes && json.nodes.length > 0;
          if (!hasNodes) {
            result.push(file);
          }
        } catch {
          result.push(file); // Invalid JSON = broken
        }
      }
      // Base files (YAML)
      else if (file.extension === 'base') {
        const content = await this.app.vault.cachedRead(file);
        const trimmed = content.trim();

        // Normalize whitespace for comparison
        const normalized = trimmed.replace(/\s+/g, ' ');
        const defaultNormalized = 'views: - type: table name: Table';

        if (
          trimmed.length === 0 ||
          trimmed === '{}' ||
          normalized === defaultNormalized
        ) {
          result.push(file);
        }
      }
    }

    return result;
  }

  async getUnusedAttachments(): Promise<TFile[]> {
    // Extensions to check
    const attachmentExtensions = new Set([
      // Images
      'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico',
      // Video
      'mp4', 'webm', 'mov', 'avi', 'mkv',
      // Audio
      'mp3', 'wav', 'ogg', 'm4a', 'flac',
      // Excalidraw
      'excalidraw',
    ]);

    // Collect all linked file paths from resolvedLinks
    const linkedPaths = new Set<string>();
    const resolvedLinks = this.app.metadataCache.resolvedLinks;

    for (const sourcePath in resolvedLinks) {
      const destinations = resolvedLinks[sourcePath];
      for (const destPath in destinations) {
        linkedPaths.add(destPath);
      }
    }

    // Also check canvas files (they store links in JSON, not in resolvedLinks)
    const canvasFiles = this.app.vault.getFiles().filter(f => f.extension === 'canvas');
    for (const canvas of canvasFiles) {
      try {
        const content = await this.app.vault.cachedRead(canvas);
        const json = JSON.parse(content);

        // Canvas nodes can have "file" property for embedded files
        if (json.nodes) {
          for (const node of json.nodes) {
            if (node.file) {
              linkedPaths.add(node.file);
            }
          }
        }
      } catch {
        // Invalid canvas, skip
      }
    }

    // Also check excalidraw.md files (they embed images)
    const excalidrawMdFiles = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.endsWith('.excalidraw.md'));

    for (const file of excalidrawMdFiles) {
      try {
        const content = await this.app.vault.cachedRead(file);
        // Excalidraw embeds files as [[filename]] or ![[filename]]
        const linkRegex = /!?\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
        let match;
        while ((match = linkRegex.exec(content)) !== null) {
          const linkedFile = this.app.metadataCache.getFirstLinkpathDest(match[1], file.path);
          if (linkedFile) {
            linkedPaths.add(linkedFile.path);
          }
        }
      } catch {
        // Skip on error
      }
    }

    // Find attachment files that are NOT linked
    const allFiles = this.app.vault.getFiles();
    const unused: TFile[] = [];

    for (const file of allFiles) {
      // Check if it's an attachment type
      const ext = file.extension.toLowerCase();
      const isAttachment = attachmentExtensions.has(ext) ||
        file.path.endsWith('.excalidraw.md');

      if (isAttachment && !linkedPaths.has(file.path)) {
        unused.push(file);
      }
    }

    return unused;
  }




  async getUntaggedFiles(): Promise<TFile[]> {
    return this.app.vault.getMarkdownFiles().filter(file => {
      const cache = this.app.metadataCache.getFileCache(file);
      const hasTags = cache?.tags && cache.tags.length > 0;
      const hasFrontmatter = cache?.frontmatter?.tags &&
        (Array.isArray(cache.frontmatter.tags) ? cache.frontmatter.tags.length > 0 : true);
      return !hasTags && !hasFrontmatter;
    });
  }

  async getUnfiledFiles(): Promise<TFile[]> {
    return this.app.vault.getMarkdownFiles().filter(file => !file.path.includes('/'));
  }
}
