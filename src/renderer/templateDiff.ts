import { App, TFile } from 'obsidian';
import { diffLines } from 'diff';
import { getDailyNoteSettings } from 'obsidian-daily-notes-interface';

export class TemplateDiffRenderer {
    private app: App;
    private templateContent: string | null = null;

    constructor(app: App) {
        this.app = app;
    }

    async loadTemplate(): Promise<string | null> {
        const settings = getDailyNoteSettings();
        if (!settings.template) return null;

        const templatePath = settings.template.endsWith('.md')
            ? settings.template
            : settings.template + '.md';

        const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
        if (!templateFile || !(templateFile instanceof TFile)) return null;

        this.templateContent = await this.app.vault.cachedRead(templateFile);
        return this.templateContent;
    }

    private normalizeTemplate(content: string): string {
        // Replace {{content}} placeholders with a marker that won't match user content
        // This way, lines with {{content}} become "expected structure" lines
        return content
            .split('\n')
            .map(line => {
                if (line.includes('{{content}}')) {
                    // Keep the line structure but mark it as a content placeholder
                    return line.replace('{{content}}', '⟨content⟩');
                }
                return line;
            })
            .join('\n');
    }

    private extractStructure(content: string): string {
        // Extract only structural lines (headers, fixed text)
        // Skip lines that are pure user content (list items with actual content, quotes, etc.)
        return content
            .split('\n')
            .map(line => {
                const trimmed = line.trim();
                // Keep headers
                if (trimmed.startsWith('#')) return line;
                // Keep empty lines (structure)
                if (trimmed === '') return line;
                // Keep lines with known fixed text patterns
                if (trimmed.startsWith('Counter:')) return line;
                // Mark content lines
                if (trimmed.startsWith('- ') && trimmed.length > 2) return '- ⟨content⟩';
                if (trimmed.startsWith('> ') && trimmed.length > 2) return '> ⟨content⟩';
                if (trimmed === '-' || trimmed === '>') return line;
                return line;
            })
            .join('\n');
    }

    async render(file: TFile, container: HTMLElement): Promise<void> {
        container.empty();
        container.addClass('vault-cleanup-diff-container');

        // Load template if not already loaded
        if (!this.templateContent) {
            await this.loadTemplate();
        }

        if (!this.templateContent) {
            container.createEl('p', { text: 'Could not load daily template' });
            return;
        }

        const noteContent = await this.app.vault.cachedRead(file);

        // Normalize both for comparison
        const normalizedTemplate = this.normalizeTemplate(this.templateContent);
        const normalizedNote = this.extractStructure(noteContent);

        // Generate diff
        const changes = diffLines(normalizedTemplate, normalizedNote);

        // Create header
        const header = container.createEl('div', { cls: 'vault-cleanup-diff-header' });
        header.createEl('span', { text: 'Missing from note 🔴', cls: 'vault-cleanup-diff-legend-removed' });
        header.createEl('span', { text: 'Extra in note 🟢', cls: 'vault-cleanup-diff-legend-added' });
        header.createEl('span', { text: 'Matching ⚪', cls: 'vault-cleanup-diff-legend-same' });

        // Create diff view
        const diffView = container.createEl('div', { cls: 'vault-cleanup-diff-view' });

        for (const change of changes) {
            const lines = change.value.split('\n');

            for (const line of lines) {
                if (line === '' && lines.indexOf(line) === lines.length - 1) continue;

                const lineEl = diffView.createEl('div', { cls: 'vault-cleanup-diff-line' });

                if (change.added) {
                    lineEl.addClass('vault-cleanup-diff-added');
                    lineEl.createEl('span', { text: '+ ', cls: 'vault-cleanup-diff-marker' });
                } else if (change.removed) {
                    lineEl.addClass('vault-cleanup-diff-removed');
                    lineEl.createEl('span', { text: '- ', cls: 'vault-cleanup-diff-marker' });
                } else {
                    lineEl.addClass('vault-cleanup-diff-same');
                    lineEl.createEl('span', { text: '  ', cls: 'vault-cleanup-diff-marker' });
                }

                lineEl.createEl('span', { text: line || ' ' });
            }
        }

        // Show original note below for reference
        const originalHeader = container.createEl('h4', { text: 'Original note content' });
        originalHeader.addClass('vault-cleanup-diff-original-header');

        const originalView = container.createEl('pre', { cls: 'vault-cleanup-diff-original' });
        originalView.setText(noteContent);
    }
}
