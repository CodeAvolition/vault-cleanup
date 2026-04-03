import { TFile } from 'obsidian';

export type QueueType =
  | 'empty'
  | 'untagged'
  | 'unfiled'
  | 'unused'
  | 'orphan'
  | 'missingType'
  | 'missingTopic'
  | 'misfiled';

export interface QueueConfig {
  id: QueueType;
  title: string;
  icon: string;
  description: string;
  hasBatchDelete: boolean;
  editAction: 'open' | 'move';
}

export interface QueueDetector {
  getFiles(): Promise<TFile[]>;
}
