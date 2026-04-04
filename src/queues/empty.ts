import { App, TFile } from 'obsidian';

interface CanvasData {
  nodes?: unknown[];
}

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (match) {
    return content.slice(match[0].length);
  }
  return content;
}

function isInTemplatesFolder(file: TFile): boolean {
  return file.path.toLowerCase().startsWith('templates/');
}

export async function getEmptyFiles(app: App): Promise<TFile[]> {
  const result: TFile[] = [];
  const allFiles = app.vault.getFiles();

  for (const file of allFiles) {
    // Skip templates folder
    if (isInTemplatesFolder(file)) {
      continue;
    }

    if (file.extension === 'md') {
      const content = await app.vault.cachedRead(file);
      const contentWithoutFrontmatter = stripFrontmatter(content);
      if (contentWithoutFrontmatter.trim().length === 0) {
        result.push(file);
      }
    }
    else if (file.extension === 'canvas') {
      const content = await app.vault.cachedRead(file);
      try {
        const json: CanvasData = JSON.parse(content) as CanvasData;
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
