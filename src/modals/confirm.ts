import { App, Modal } from 'obsidian';

export class ConfirmModal extends Modal {
  private message: string;
  private onConfirm: () => void;

  constructor(app: App, message: string, onConfirm: () => void) {
    super(app);
    this.message = message;
    this.onConfirm = onConfirm;
  }

  onOpen(): void {
    const { contentEl } = this;

    contentEl.createEl('p', { text: this.message });

    const buttonContainer = contentEl.createEl('div', { cls: 'vault-cleanup-modal-buttons' });

    const confirmBtn = buttonContainer.createEl('button', { text: 'Confirm', cls: 'mod-warning' });
    confirmBtn.addEventListener('click', () => {
      this.close();
      this.onConfirm();
    });

    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => {
      this.close();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
