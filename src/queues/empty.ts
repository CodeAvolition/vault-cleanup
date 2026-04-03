import { App, TFile } from 'obsidian';

export async function getEmptyFiles(app: App): Promise<TFile[]> {
  const result: TFile[] = [];
  const allFiles = app.vault.getFiles();

  for (const file of allFiles) {
    if (file.extension === 'md') {
      const content = await app.vault.cachedRead(file);
      if (content.trim().length === 0) {
        result.push(file);
      }
    } 
    else if (file.extension === 'canvas') {
      const content = await app.vault.cachedRead(file);
      try {
        const json = JSON.parse(content);
        if (!json.nodes || json.nodes.length === 0) {
          result.push(file);
        }
      } catch {
        result.push(file);
      }
    } 
    else if (file.extension === 'base') {
      const content = await app.vault.cachedRead(file);
      const trimmed = content.trim();
      const defaultBase = `views:\n  - type: table\n    name: Table`;
      if (trimmed.length === 0 || trimmed === '{}' || trimmed === defaultBase) {
        result.push(file);
      }
    }
  }

  return result;
}
