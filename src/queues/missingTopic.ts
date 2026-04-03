import { App, TFile } from 'obsidian';

export function getMissingTopicFiles(app: App): TFile[] {
  return app.vault.getMarkdownFiles().filter(file => {
    const cache = app.metadataCache.getFileCache(file);

    const allTags: string[] = [];

    if (cache?.frontmatter?.tags) {
      const fmTags = cache.frontmatter.tags;
      if (Array.isArray(fmTags)) {
        allTags.push(...fmTags);
      } else if (typeof fmTags === 'string') {
        allTags.push(fmTags);
      }
    }

    if (cache?.tags) {
      allTags.push(...cache.tags.map(t => t.tag.replace(/^#/, '')));
    }

    const hasTopicTag = allTags.some(tag => tag.startsWith('topic/'));

    return !hasTopicTag;
  });
}
