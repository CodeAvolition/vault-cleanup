import { App, TFile } from 'obsidian';

export async function getMisfiledFiles(app: App, allowedFolders: string[]): Promise<TFile[]> {
  const result: TFile[] = [];
  const markdownFiles = app.vault.getMarkdownFiles();

  for (const file of markdownFiles) {
    const path = file.path;

    // Skip files in root
    if (!path.includes('/')) continue;

    const topFolder = path.split('/')[0];
    if (!topFolder) continue;

    const folderLower = topFolder.toLowerCase();

    if (!allowedFolders.includes(folderLower)) {
      result.push(file);
    }
  }

  return result;
}
