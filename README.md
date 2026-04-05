# Vault Cleanup

A cleanup dashboard for Obsidian that helps you organize and maintain your vault through interactive queues.
As my vault was growing, it became difficult to enforce some organization rules for it. many of the changes i wanted can't be automated so i came up with queues to make maintenance easier.

## Philosophy

This plugin is opinionated towards a specific workflow:

- **Root-based organization**: Notes live in the vault root, with special folders (`attachments/`, `daily/`, `templates/`, `archived/`) for specific purposes
- **Tag-driven categorization**: Notes are categorized using `type/*` and `topic/*` tags rather than folder hierarchies
- **Links over folders**: Relationships between notes are expressed through links, not folder structure

While the defaults reflect this workflow, settings are provided for those who prefer folder-based organization or have different needs.

## Getting Started

### 1. Enable Queues

Go to **Settings → Vault Cleanup** and enable the cleanup profiles you want:

| Queue | Description |
|-------|-------------|
| 📄 Empty files | Notes, canvas, and base files with no content |
| 🏷️ Missing type tag | Notes without a `type/*` tag |
| 📚 Missing topic tag | Notes without a `topic/*` tag |
| 🚫 Untagged files | Notes without any tags at all |
| 📂 Misfiled notes | Notes in non-standard folders (root-based org) |
| 📁 Unfiled files | Notes in the vault root (folder-based org) |
| 🖼️ Unused attachments | Images, videos, audio not linked anywhere |
| 🔗 Orphan notes | Notes with no links in or out |

### 2. Configure Organization Style

Choose how you organize your vault:

- **Notes in root, special folders only** — Shows "Misfiled notes" queue, configure allowed folders
- **Notes organized in folders** — Shows "Unfiled files" queue

### 3. Open the Dashboard

Click the 🗑️ icon in the ribbon or use the command palette: **Open cleanup dashboard**

The dashboard shows all enabled queues with file counts. Click **Start queue** to begin processing.

### 4. Work Through a Queue

![Queue workflow demo](docs/queue-demo.gif)

Each queue presents files one at a time with a preview. For each file you can:

| Action | Description |
|--------|-------------|
| **Edit / Add tag / Move** | Take the appropriate action for this queue type |
| **Delete** | Move the file to trash |
| **Keep** | Skip this file (it's fine as-is) |
| **Back** | Return to the previous file |
| **Exit** | Close the queue |

### 5. Optional: Enable Hotkeys

For faster processing, enable keyboard shortcuts in settings:

| Key | Action |
|-----|--------|
| `E` | Edit / Add tag / Move |
| `D` | Delete |
| `K` | Keep |
| `B` | Back |
| `Esc` | Exit queue |

Hotkeys only work when the queue view is focused.

## Settings

| Setting | Description |
|---------|-------------|
| **Organization style** | Choose root-based or folder-based organization |
| **Allowed folders** | Folders where notes are allowed (root-based only) |
| **Auto-advance after edit** | Automatically move to next file after edit action |
| **Enable keyboard shortcuts** | Enable hotkeys in queue view |

## Batch Actions

Some queues support batch operations from the dashboard:

- **Empty files** — Delete all
- **Unused attachments** — Delete all
- **Misfiled notes** — Move all to root

## Installation

### From Community Plugins

1. Open **Settings → Community plugins**
2. Click **Browse** and search for "Vault Cleanup"
3. Click **Install**, then **Enable**


## Feature Plans / TODO
- [ ] implement a queue to make sure all my daily files fit the same template (i changed templates in the past and i want an easy way to make sure they all still follow the current template)
