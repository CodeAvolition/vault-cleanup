import { App, TFile } from 'obsidian';
import { QueueType } from '../types';
import { getEmptyFiles } from './empty';
import { getUntaggedFiles } from './untagged';
import { getUnfiledFiles } from './unfiled';
import { getUnusedAttachments } from './unused';

export class QueueDetectors {
  constructor(private app: App) {}

  async getFilesForQueue(queueType: QueueType): Promise<TFile[]> {
    switch (queueType) {
      case 'empty':
        return getEmptyFiles(this.app);
      case 'untagged':
        return getUntaggedFiles(this.app);
      case 'unfiled':
        return getUnfiledFiles(this.app);
      case 'unused':
        return getUnusedAttachments(this.app);
    }
  }
}

// Re-export for convenience
export { getEmptyFiles } from './empty';
export { getUntaggedFiles } from './untagged';
export { getUnfiledFiles } from './unfiled';
export { getUnusedAttachments } from './unused';
