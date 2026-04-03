import { Plugin } from 'obsidian';
import { QueueDetectors } from './queues';
import { QUEUE_CONFIGS } from './queue-configs';
import { CleanupDashboardView } from './views/dashboard';
import { VaultCleanupSettingTab } from './settings';
import { 
  VIEW_TYPE_DASHBOARD, 
  VIEW_TYPE_QUEUE, 
  QueueType, 
  VaultCleanupSettings, 
  DEFAULT_SETTINGS 
} from './types';
import { CleanupQueueView } from './views/queue';

export default class VaultCleanupPlugin extends Plugin {
  settings: VaultCleanupSettings;
  detectors: QueueDetectors;

  async onload() {
    await this.loadSettings();

    this.detectors = new QueueDetectors(this.app);

    // Register views
    this.registerView(VIEW_TYPE_DASHBOARD, (leaf) => new CleanupDashboardView(leaf, this));
    this.registerView(VIEW_TYPE_QUEUE, (leaf) => new CleanupQueueView(leaf, this));

    // Settings tab
    this.addSettingTab(new VaultCleanupSettingTab(this.app, this));

    // Ribbon icon
    this.addRibbonIcon('trash-2', 'Open Vault Cleanup', () => this.activateDashboard());

    // Commands
    this.addCommand({
      id: 'open-cleanup-dashboard',
      name: 'Open Cleanup Dashboard',
      callback: () => this.activateDashboard()
    });

    for (const config of Object.values(QUEUE_CONFIGS)) {
      this.addCommand({
        id: `open-${config.id}-queue`,
        name: `Open ${config.title} Queue`,
        checkCallback: (checking) => {
          if (!this.settings.enabledQueues[config.id]) return false;
          if (!checking) this.openQueueView(config.id);
          return true;
        }
      });
    }

    // Queue keyboard shortcuts
    this.addCommand({
      id: 'queue-skip',
      name: 'Queue: Skip',
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(CleanupQueueView);
        if (view) { if (!checking) view.next(); return true; }
        return false;
      }
    });

    this.addCommand({
      id: 'queue-delete',
      name: 'Queue: Delete',
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(CleanupQueueView);
        if (view?.queue[view.currentIndex]) {
          if (!checking) view.deleteFile(view.queue[view.currentIndex]);
          return true;
        }
        return false;
      }
    });

    this.addCommand({
      id: 'queue-edit',
      name: 'Queue: Edit / Move',
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(CleanupQueueView);
        if (view?.queue[view.currentIndex]) {
          if (!checking) {
            const config = QUEUE_CONFIGS[view.queueType];
            if (config.editAction === 'move') {
              view.moveFile(view.queue[view.currentIndex]);
            } else {
              view.openFile(view.queue[view.currentIndex]);
            }
          }
          return true;
        }
        return false;
      }
    });
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DASHBOARD);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_QUEUE);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async activateDashboard() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD)[0];
    if (!leaf) {
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE_DASHBOARD, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  async openQueueView(queueType: QueueType) {
    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({
      type: VIEW_TYPE_QUEUE,
      active: true,
      state: { queueType }
    });
    this.app.workspace.revealLeaf(leaf);
  }
}
