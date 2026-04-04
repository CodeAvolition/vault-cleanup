import { App, TFile, CachedMetadata } from 'obsidian';

export async function getUntaggedFiles(app: App): Promise<TFile[]> {
  const result: TFile[] = [];
  const markdownFiles = app.vault.getMarkdownFiles();

  for (const file of markdownFiles) {
    const cache: CachedMetadata | null = app.metadataCache.getFileCache(file);
    const frontmatterTags: string[] = Array.isArray(cache?.frontmatter?.tags)
      ? (cache.frontmatter.tags as string[])
      : [];
    const inlineTags: string[] = (cache?.tags ?? []).map(t => t.tag);
    const allTags: string[] = [...frontmatterTags, ...inlineTags];

    if (allTags.length === 0) {
      result.push(file);
    }
  }

  return result;
}
