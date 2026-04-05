import { App, TFile, MarkdownRenderer, Component } from 'obsidian';

export class FilePreviewRenderer extends Component {
  private app: App;

  constructor(app: App) {
    super();
    this.app = app;
  }

  async render(file: TFile, container: HTMLElement): Promise<void> {
    container.empty();

    if (file.extension === 'md') {
      await this.renderMarkdown(file, container);
    } else if (file.extension === 'canvas') {
      await this.renderCanvas(file, container);
    } else if (file.extension === 'base') {
      await this.renderBase(file, container);
    } else if (file.extension === 'pdf') {
      this.renderPdf(file, container);
    } else if (this.isImage(file)) {
      this.renderImage(file, container);
    } else if (this.isAudio(file)) {
      this.renderAudio(file, container);
    } else if (this.isVideo(file)) {
      this.renderVideo(file, container);
    } else {
      container.createEl('p', { text: 'No preview available' });
    }
  }

  private async renderMarkdown(file: TFile, container: HTMLElement): Promise<void> {
    const content = await this.app.vault.cachedRead(file);
    await MarkdownRenderer.render(this.app, content, container, file.path, this);
  }

  private async renderCanvas(file: TFile, container: HTMLElement): Promise<void> {
    const content = await this.app.vault.cachedRead(file);
    container.createEl('pre', { text: content });
  }

  private async renderBase(file: TFile, container: HTMLElement): Promise<void> {
    const content = await this.app.vault.cachedRead(file);
    container.createEl('pre', { text: content });
  }

  private renderPdf(file: TFile, container: HTMLElement): void {
    const resourcePath = this.app.vault.getResourcePath(file);

    container.createEl('iframe', {
      cls: 'vault-cleanup-pdf-preview',
      attr: {
        src: resourcePath,
        frameborder: '0',
      }
    });
  }

  private renderImage(file: TFile, container: HTMLElement): void {
    const img = container.createEl('img');
    img.src = this.app.vault.getResourcePath(file);
    img.addClass('vault-cleanup-preview-image');
  }

  private renderAudio(file: TFile, container: HTMLElement): void {
    const audio = container.createEl('audio', { attr: { controls: '' } });
    audio.src = this.app.vault.getResourcePath(file);
  }

  private renderVideo(file: TFile, container: HTMLElement): void {
    const video = container.createEl('video', { attr: { controls: '' } });
    video.src = this.app.vault.getResourcePath(file);
    video.addClass('vault-cleanup-preview-video');
  }

  private isImage(file: TFile): boolean {
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(file.extension.toLowerCase());
  }

  private isAudio(file: TFile): boolean {
    return ['mp3', 'wav', 'ogg', 'm4a'].includes(file.extension.toLowerCase());
  }

  private isVideo(file: TFile): boolean {
    return ['mp4', 'webm', 'mov'].includes(file.extension.toLowerCase());
  }

  cleanup(): void {
    this.unload();
  }
}
