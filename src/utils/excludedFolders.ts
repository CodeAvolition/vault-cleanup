import { App, TFile } from 'obsidian';
import { getDailyNoteSettings, appHasDailyNotesPluginLoaded } from 'obsidian-daily-notes-interface';

export function getExcludedFolders(app: App): string[] {
  const excluded: string[] = [];

  // Get Templates core plugin folder
  const templatesPlugin = app.internalPlugins.getPluginById('templates');
  if (templatesPlugin?.enabled) {
    const folder = templatesPlugin.options?.folder;
    if (typeof folder === 'string' && folder.length > 0) {
      excluded.push(folder.toLowerCase());
    }
  }

  // Get Daily Notes template folder (the folder containing the template, not daily notes themselves)
  if (appHasDailyNotesPluginLoaded()) {
    const dailySettings = getDailyNoteSettings();
    if (dailySettings.template) {
      // Extract folder from template path (e.g., "templates/daily" -> "templates")
      const templateFolder = dailySettings.template.split('/').slice(0, -1).join('/');
      if (templateFolder) {
        excluded.push(templateFolder.toLowerCase());
      }
    }
  }

  return [...new Set(excluded)]; // Remove duplicates
}

export function isInExcludedFolder(file: TFile, excludedFolders: string[]): boolean {
  const filePath = file.path.toLowerCase();

  for (const folder of excludedFolders) {
    if (filePath.startsWith(folder + '/') || filePath === folder) {
      return true;
    }
  }

  return false;
}
