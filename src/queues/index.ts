import { App, TFile } from 'obsidian';
import { QueueType } from './types';
import { getEmptyFiles } from './empty';
import { getUntaggedFiles } from './untagged';
import { getUnfiledFiles } from './unfiled';
import { getUnusedAttachments } from './unused';
import { getOrphanFiles } from './orphan';
import { getMissingTypeFiles } from './missingType';
import { getMissingTopicFiles } from './missingTopic';
import { getMisfiledFiles } from './misfiled';

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
      case 'orphan':
        return getOrphanFiles(this.app);
      case 'missingType':
        return getMissingTypeFiles(this.app);
      case 'missingTopic':
        return getMissingTopicFiles(this.app);
      case 'misfiled':
        return getMisfiledFiles(this.app);
    }
  }
}
