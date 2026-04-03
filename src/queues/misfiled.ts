import { App, TFile } from 'obsidian';

// Allowed top-level folders (add more as needed)
const ALLOWED_FOLDERS = new Set([
  'assets',
  'daily',
  'templates',
  'archived',
]);

export function getMisfiledFiles(app: App): TFile[] {
  return app.vault.getMarkdownFiles().filter(file => {
    const path = file.path;

    // Root files are allowed (no "/" in path)
    if (!path.includes('/')) {
      return false;
    }

    // Get top-level folder
    const topFolder = path.split('/')[0].toLowerCase();

    // Misfiled if not in allowed folders
    return !ALLOWED_FOLDERS.has(topFolder);
  });
}
