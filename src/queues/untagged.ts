import { App, TFile } from 'obsidian';

export function getUntaggedFiles(app: App): TFile[] {
  return app.vault.getMarkdownFiles().filter(file => {
    const cache = app.metadataCache.getFileCache(file);
    const hasTags = cache?.tags && cache.tags.length > 0;
    const hasFrontmatter = cache?.frontmatter?.tags &&
      (Array.isArray(cache.frontmatter.tags) ? cache.frontmatter.tags.length > 0 : true);
    return !hasTags && !hasFrontmatter;
  });
}
