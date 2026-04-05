import { App, TFile } from 'obsidian';
import { QueueType } from './types';
import { getEmptyFiles } from './empty';
import { getUntaggedFiles } from './untagged';
import { getUnfiledFiles } from './unfiled';
import { getUnusedAttachments } from './unusedAttachments';
import { getOrphanFiles } from './orphan';
import { getMissingTypeFiles } from './missingType';
import { getMissingTopicFiles } from './missingTopic';
import { getMisfiledFiles } from './misfiled';
import { getDailyTemplateMismatchFiles, isDailyNotesPluginEnabled } from './dailyTemplate';
import { getExcludedFolders, isInExcludedFolder } from '../utils/excludedFolders';

export class QueueDetectors {
  constructor(private app: App, private getAllowedFolders: () => string[]) { }

  private filterExcluded(files: TFile[]): TFile[] {
    const excludedFolders = getExcludedFolders(this.app);
    return files.filter(file => !isInExcludedFolder(file, excludedFolders));
  }

  async getFilesForQueue(queueType: QueueType): Promise<TFile[]> {
    let files: TFile[];

    switch (queueType) {
      case 'empty':
        files = await getEmptyFiles(this.app);
        break;
      case 'untagged':
        files = await getUntaggedFiles(this.app);
        break;
      case 'unfiled':
        files = getUnfiledFiles(this.app);
        break;
      case 'unused':
        files = await getUnusedAttachments(this.app);
        break;
      case 'orphan':
        files = getOrphanFiles(this.app);
        break;
      case 'missingType':
        files = await getMissingTypeFiles(this.app);
        break;
      case 'missingTopic':
        files = await getMissingTopicFiles(this.app);
        break;
      case 'misfiled':
        files = await getMisfiledFiles(this.app, this.getAllowedFolders());
        break;
      case 'dailyTemplate':
        files = await getDailyTemplateMismatchFiles(this.app);
        break;
      default:
        files = [];
    }

    // Filter out files in excluded folders (templates, etc.)
    return this.filterExcluded(files);
  }

  isDailyTemplateQueueAvailable(): boolean {
    return isDailyNotesPluginEnabled();
  }
}
