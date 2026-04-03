import { QueueType } from '../queues/types';

export interface VaultCleanupSettings {
  enabledQueues: Record<QueueType, boolean>;
}

export const DEFAULT_SETTINGS: VaultCleanupSettings = {
  enabledQueues: {
    empty: true,
    untagged: true,
    unfiled: true,
    unused: true,
    orphan: true,
    missingType: true,
    missingTopic: true,
    misfiled: true,
  }
};
