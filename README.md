# .Skill Editor

**Seamlessly browse and edit Antigravity `.skill` (ZIP) archives natively in VS Code.**

`.Skill Editor` is a lightweight, high-impact Virtual File System (VFS) extension designed to automatically mount binary `.skill` files into your VS Code Explorer. Instead of extracting archives manually or dealing with raw binary text, this extension provides a transparent folder-like editing experience with atomic write safety.

## Features

- **Instant Auto-Mounting**: Automatically triggers when you open any `.skill` file from your workspace or OS Explorer (e.g., from your Downloads folder).
- **Virtual File System**: Transparently maps `.skill` archives into the Explorer pane.
- **Native Editing**: Read, edit, create, rename, and delete files inside the archive as if they were standard files.
- **Atomic Saves**: Edits are updated in memory and atomically committed back to the `.skill` file upon saving to guarantee no data corruption.

## Usage

1. Locate a `.skill` file anywhere on your system or inside your VS Code workspace.
2. Double-click to open it, or right-click and select **"Open in .Skill Editor"**.
3. A new workspace folder titled `[Skill] <filename>.skill` will appear in your Explorer.
4. Expand the folder to browse its contents, edit files, and save them.

## Requirements

- Visual Studio Code version `1.80.0` or higher.

## Release Notes

### 1.0.0
Initial release of the `.Skill Editor` with full Virtual File System integration and automatic Custom Editor mounting logic.

---

**Built for Antigravity Agents**



<!-- session:9189bba9 -->
