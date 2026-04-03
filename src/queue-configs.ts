import { QueueConfig, QueueType } from './types';

export const QUEUE_CONFIGS: Record<QueueType, QueueConfig> = {
  empty: {
    id: 'empty',
    title: 'Empty Files',
    icon: '📄',
    description: 'Notes, canvas, and base files with no content',
    hasBatchDelete: true,
    editAction: 'open',
  },
  untagged: {
    id: 'untagged',
    title: 'Untagged Files',
    icon: '🏷️',
    description: 'Notes without any tags',
    hasBatchDelete: false,
    editAction: 'open',
  },
  unfiled: {
    id: 'unfiled',
    title: 'Unfiled Files',
    icon: '📁',
    description: 'Notes in the vault root (no folder)',
    hasBatchDelete: false,
    editAction: 'move',
  },
  unused: {
    id: 'unused',
    title: 'Unused Attachments',
    icon: '🖼️',
    description: 'Images, videos, audio, and drawings not linked anywhere',
    hasBatchDelete: true,
    editAction: 'open',
  },
};
