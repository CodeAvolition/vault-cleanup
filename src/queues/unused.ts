import { App, TFile } from 'obsidian';

const ATTACHMENT_EXTENSIONS = new Set([
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico',
  // Video
  'mp4', 'webm', 'mov', 'avi', 'mkv',
  // Audio
  'mp3', 'wav', 'ogg', 'm4a', 'flac',
  // Excalidraw
  'excalidraw',
]);

export async function getUnusedAttachments(app: App): Promise<TFile[]> {
  // Collect all linked paths
  const linkedPaths = new Set<string>();
  const resolvedLinks = app.metadataCache.resolvedLinks;

  for (const sourcePath in resolvedLinks) {
    for (const destPath in resolvedLinks[sourcePath]) {
      linkedPaths.add(destPath);
    }
  }

  // Check canvas files
  const canvasFiles = app.vault.getFiles().filter(f => f.extension === 'canvas');
  for (const canvas of canvasFiles) {
    try {
      const content = await app.vault.cachedRead(canvas);
      const json = JSON.parse(content);
      if (json.nodes) {
        for (const node of json.nodes) {
          if (node.file) linkedPaths.add(node.file);
        }
      }
    } catch { /* skip */ }
  }

  // Check excalidraw.md files
  const excalidrawFiles = app.vault.getMarkdownFiles()
    .filter(f => f.path.endsWith('.excalidraw.md'));

  for (const file of excalidrawFiles) {
    try {
      const content = await app.vault.cachedRead(file);
      const linkRegex = /!?\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
      let match;
      while ((match = linkRegex.exec(content)) !== null) {
        const linked = app.metadataCache.getFirstLinkpathDest(match[1], file.path);
        if (linked) linkedPaths.add(linked.path);
      }
    } catch { /* skip */ }
  }

  // Find unused
  return app.vault.getFiles().filter(file => {
    const ext = file.extension.toLowerCase();
    const isAttachment = ATTACHMENT_EXTENSIONS.has(ext) || file.path.endsWith('.excalidraw.md');
    return isAttachment && !linkedPaths.has(file.path);
  });
}
