
A dashboard plugin for Obsidian that helps you clean up your vault by finding and managing problematic files.

## Features

- **Dashboard view** — Overview of all cleanup categories with file counts
- **Queue system** — Work through files one-by-one with a Tinder-like interface
- **Live preview** — See file contents (markdown, images, video, audio) directly in the queue
- **Auto-refresh** — Dashboard updates automatically when files change
- **Keyboard shortcuts** — Speed through queues with `E` (Edit), `D` (Delete), `S` (Skip)
- **Batch delete** — "Delete All" button for empty files and unused attachments

## Cleanup Profiles

|Profile|Description|
|---|---|
|📄 **Empty Files**|Notes, canvas, and base files with no content|
|🏷️ **Untagged Files**|Markdown notes without any tags|
|📁 **Unfiled Files**|Notes sitting in the vault root (no folder)|
|🖼️ **Unused Attachments**|Images, videos, audio, and Excalidraw files not linked anywhere|

## Usage

1. Click the 🗑️ icon in the ribbon, or use command palette: `Open Cleanup Dashboard`
2. See an overview of files needing attention in each category
3. Click **Start Queue** to work through files one-by-one
4. Use **Delete All** for batch operations (empty files & unused attachments)

## Credits

The **Unused Attachments** detection is inspired by [Clear Unused Images](https://github.com/ozntel/oz-clear-unused-images-obsidian) by [ozntel](https://github.com/ozntel). Consider [supporting their work](https://ko-fi.com/L3L356V6Q)!

## TODO
- [ ] we need to make sure that empty files also counts files that just contain our base template (or only tags and no content to be clear)
this should be configureable through settings but use my defaults:

const ALLOWED_FOLDERS = new Set([
  'attachments',
  'daily',
  'templates',
  'archived',
]);

- [ ] Add settings to enable/disable individual cleanup profiles
- [ ] rethink the keybinds (can we make them only work while on a queue view?) because i cant bind s d or e globally

- [ ] publish workflows von lucEast übernehmen .releaserc
- [ ] For Unfiled Files queue: "Edit" should open Obsidian's built-in "Move file" dialog
- [ ] Publish this plugin to the community plugin list once im done with it

---

## Releasing New Releases

- Update your `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
- Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
- Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.  
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

## Adding Your Plugin to the Community Plugin List

- Check the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at https://github.com/obsidianmd/obsidian-releases to add your plugin.

## Manual Installation

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/vault-cleanup/`.

## Development

- Clone this repo into your vault's `.obsidian/plugins/` folder
- `npm install` to install dependencies
- `npm run dev` to start compilation in watch mode