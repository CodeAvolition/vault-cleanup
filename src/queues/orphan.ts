import { App, TFile } from 'obsidian';

export function getOrphanFiles(app: App): TFile[] {
  const resolvedLinks = app.metadataCache.resolvedLinks;

  // Build set of all files that have incoming links
  const hasIncomingLinks = new Set<string>();
  for (const sourcePath in resolvedLinks) {
    for (const destPath in resolvedLinks[sourcePath]) {
      hasIncomingLinks.add(destPath);
    }
  }

  return app.vault.getMarkdownFiles().filter(file => {
    // Check outgoing links
    const outgoing = resolvedLinks[file.path];
    const hasOutgoing = outgoing && Object.keys(outgoing).length > 0;

    // Check incoming links
    const hasIncoming = hasIncomingLinks.has(file.path);

    // Orphan = no links in either direction
    return !hasOutgoing && !hasIncoming;
  });
}
