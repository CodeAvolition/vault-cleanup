import { App, TFile } from 'obsidian';

interface CanvasNode {
  file?: string;
}

interface CanvasData {
  nodes?: CanvasNode[];
}

const ATTACHMENT_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'mp4', 'webm', 'mov', 'mp3', 'wav', 'ogg', 'm4a', 'pdf', 'excalidraw'];

export async function getUnusedAttachments(app: App): Promise<TFile[]> {
  const linkedFiles = new Set<string>();

  // Collect all linked files from markdown
  const markdownFiles = app.vault.getMarkdownFiles();
  for (const file of markdownFiles) {
    const cache = app.metadataCache.getFileCache(file);
    if (cache?.embeds) {
      for (const embed of cache.embeds) {
        linkedFiles.add(embed.link);
      }
    }
    if (cache?.links) {
      for (const link of cache.links) {
        linkedFiles.add(link.link);
      }
    }
  }

  // Collect linked files from canvas files
  const allFiles = app.vault.getFiles();
  for (const file of allFiles) {
    if (file.extension === 'canvas') {
      const content = await app.vault.cachedRead(file);
      try {
        const json: CanvasData = JSON.parse(content) as CanvasData;
        if (json.nodes) {
          for (const node of json.nodes) {
            if (node.file) {
              linkedFiles.add(node.file);
            }
          }
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  // Find attachments not in linkedFiles
  const result: TFile[] = [];
  for (const file of allFiles) {
    if (!ATTACHMENT_EXTENSIONS.includes(file.extension.toLowerCase())) {
      continue;
    }

    const isLinked =
      linkedFiles.has(file.path) ||
      linkedFiles.has(file.name) ||
      linkedFiles.has(file.basename);

    if (!isLinked) {
      result.push(file);
    }
  }

  return result;
}
