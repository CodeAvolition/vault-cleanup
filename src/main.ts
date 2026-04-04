import { Plugin } from 'obsidian';
import { CleanupDashboardView } from './views/dashboard';
import { CleanupQueueView } from './views/queue';
import { VIEW_TYPE_DASHBOARD, VIEW_TYPE_QUEUE } from './views/types';
import { VaultCleanupSettings, DEFAULT_SETTINGS } from './settings/types';
import { VaultCleanupSettingTab } from './settings/tab';
import { QueueDetectors } from './queues';
import { QueueType } from './queues/types';
import { QUEUE_CONFIGS } from './queues/configs';

export default class VaultCleanupPlugin extends Plugin {
  settings: VaultCleanupSettings = DEFAULT_SETTINGS;
  detectors!: QueueDetectors;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.detectors = new QueueDetectors(
      this.app,
      () => this.settings.allowedFolders
    );

    this.registerView(VIEW_TYPE_DASHBOARD, (leaf) => new CleanupDashboardView(leaf, this));
    this.registerView(VIEW_TYPE_QUEUE, (leaf) => new CleanupQueueView(leaf, this));

    this.addRibbonIcon('trash-2', 'Open cleanup dashboard', () => {
      void this.activateDashboard();
    });

    this.addCommand({
      id: 'open-dashboard',
      name: 'Open cleanup dashboard',
      callback: () => {
        void this.activateDashboard();
      },
    });

    for (const [id, config] of Object.entries(QUEUE_CONFIGS)) {
      this.addCommand({
        id: `open-${id}-queue`,
        name: `Open ${config.title.toLowerCase()} queue`,
        callback: () => {
          void this.openQueue(id as QueueType);
        },
      });
    }

    this.addSettingTab(new VaultCleanupSettingTab(this.app, this));
  }

  // Removed onunload() - don't detach leaves as it resets their position

  async loadSettings(): Promise<void> {
    const data = await this.loadData() as VaultCleanupSettings | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.refreshDashboards();
    this.refreshQueues();
  }

  refreshDashboards(): void {
    this.app.workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD).forEach(leaf => {
      const view = leaf.view;
      if (view instanceof CleanupDashboardView) {
        void view.render();
      }
    });
  }

  refreshQueues(): void {
    this.app.workspace.getLeavesOfType(VIEW_TYPE_QUEUE).forEach(leaf => {
      const view = leaf.view;
      if (view instanceof CleanupQueueView) {
        void view.render();
      }
    });
  }

async activateDashboard(): Promise<void> {
  const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD);
  if (existing.length > 0 && existing[0]) {
    void this.app.workspace.revealLeaf(existing[0]);
    return;
  }

  const leaf = this.app.workspace.getLeaf('tab');
  await leaf.setViewState({
    type: VIEW_TYPE_DASHBOARD,
    active: true,
  });
}

  async openQueue(queueType: QueueType): Promise<void> {
    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({
      type: VIEW_TYPE_QUEUE,
      state: { queueType },
    });
  }
}
