import { App, TFile, CachedMetadata } from 'obsidian';

export async function getMissingTypeFiles(app: App): Promise<TFile[]> {
  const result: TFile[] = [];
  const markdownFiles = app.vault.getMarkdownFiles();

  for (const file of markdownFiles) {
    const cache: CachedMetadata | null = app.metadataCache.getFileCache(file);
    const frontmatterTags: string[] = Array.isArray(cache?.frontmatter?.tags)
      ? (cache.frontmatter.tags as string[])
      : [];
    const inlineTags: string[] = (cache?.tags ?? []).map(t => t.tag);
    const allTags: string[] = [...frontmatterTags, ...inlineTags];

    const hasTypeTag = allTags.some(tag =>
      tag.toLowerCase().startsWith('#type/') || tag.toLowerCase().startsWith('type/')
    );

    if (!hasTypeTag) {
      result.push(file);
    }
  }

  return result;
}
