import { App, TFile } from 'obsidian';

export function getUnfiledFiles(app: App): TFile[] {
  return app.vault.getMarkdownFiles().filter(file => !file.path.includes('/'));
}
