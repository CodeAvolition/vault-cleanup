import { App, TFile, CachedMetadata } from 'obsidian';

export async function getMissingTopicFiles(app: App): Promise<TFile[]> {
  const result: TFile[] = [];
  const markdownFiles = app.vault.getMarkdownFiles();

  for (const file of markdownFiles) {
    const cache: CachedMetadata | null = app.metadataCache.getFileCache(file);
    const frontmatterTags: string[] = Array.isArray(cache?.frontmatter?.tags)
      ? (cache.frontmatter.tags as string[])
      : [];
    const inlineTags: string[] = (cache?.tags ?? []).map(t => t.tag);
    const allTags: string[] = [...frontmatterTags, ...inlineTags];

    const hasTopicTag = allTags.some(tag =>
      tag.toLowerCase().startsWith('#topic/') || tag.toLowerCase().startsWith('topic/')
    );

    if (!hasTopicTag) {
      result.push(file);
    }
  }

  return result;
}
