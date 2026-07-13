# Design Specification: .Skill Editor

**Product Name**: .Skill Editor  
**Version**: 1.0.0 (Planning Phase)  
**Target Platform**: Visual Studio Code

---

## 1. Overview
The **.Skill Editor** is a VS Code extension designed to provide a native, folder-like experience for interacting with `.skill` files. Instead of treating these files as opaque binary blobs, the extension unmasks their internal structure (ZIP archives) and allows developers to view, edit, and organize skill resources (instructions, scripts, assets) directly within the VS Code Explorer.

---

## 2. Core Mechanism (Architecture)
The extension implements a **Virtual File System (VFS)** using the `vscode.FileSystemProvider` API.

### 2.1 Mounting Logic
- **Trigger**: 
    - When a `.skill` file is opened directly (via the `CustomEditor` file association).
    - Opening via "File > Open File..." or double-clicking in the OS explorer.
    - Right-click context menu: "Open in .Skill Editor".
    - Automatic detection by "Other IDE Agents" via the `skill://` scheme.
- **Protocol**: The extension registers a custom URI scheme: `skill://`.
- **Mounting**: A workspace folder is dynamically added to the Explorer pointing to `skill://<absolute_path_to_zip>`.

### 2.2 Synchronization Strategy (In-Memory vs. On-Disk)
1. **Read Path**: The extension reads the `.skill` file using Node.js filesystem APIs, buffers it, and parses it using `adm-zip`.
2. **Virtualization**: Files inside the ZIP are presented as virtual entries.
3. **Write Path**: 
   - When a user saves a virtual file, the extension updates the in-memory ZIP buffer.
   - To ensure data integrity, the physical `.skill` file on disk is only overwritten after the in-memory update succeeds.
   - **Atomic Writes**: A `.skill.tmp` file is created during the packing process and moved to the final destination to prevent corruption during power loss or crashes.

---

## 3. Detailed Logic Flow
1. **Bootstrap**: Extension activates when a `.skill` file is opened, detected in the workspace, or manually invoked.
2. **Indexing**: Scans the archive to build a directory tree metadata object.
3. **Virtual Service**: FS Provider responds to `stat`, `readDirectory`, and `readFile` requests from VS Code by pulling data from the `adm-zip` buffer.
4. **Lifecycle**: If the original `.skill` file is moved or renamed outside of VS Code, the extension detects the change and updates the virtual mount or warns the user.

---

## 4. Exceptional Handling (Error Mitigation)
| Scenario | Strategy |
| :--- | :--- |
| **Corrupt Archive** | Detect `PK` header failure and surface a high-priority warning with an option to attempt "Repair" or "Open as Binary". |
| **Concurrent Access** | Use a file lock mechanism (`.skill.lock`) to prevent two instances of VS Code (or an external tool) from writing to the archive simultaneously. |
| **Permission Denied** | Surface OS-level permission errors clearly to the user with a "Retry as Administrator" suggestion (where applicable). |
| **Large Files** | Implement streaming for large assets inside the skill to avoid memory exhaustion (Heap Overflow). |
| **Missing SKILL.md** | Surface a "Lint Warning" in the explorer if the archive lacks the mandatory `SKILL.md` entry. |

---

## 5. Bonus Features (The "Extra Mile")
- **Intelligent Validation**: Real-time linting of the `SKILL.md` file against the Antigravity schema (checking for required frontmatter fields).
- **Skill Templates**: A "New Skill" command that scaffolds a standard directory structure and zips it into a `.skill` file.
- **Resource Thumbnails**: Preview support for images and SVGs stored deep inside the `.skill` archive.
- **Integrated Test Runner**: A button in the status bar to run `rtk test` specifically on the skill currently being edited.
- **Automatic Versioning**: Optional "Shadow Backups" created in the `.agent/backups` folder every time a `.skill` file is overwritten.

---

## 6. Implementation Roadmap
1. **Phase 1**: Research `adm-zip` limitations and VS Code URI quoting.
2. **Phase 2**: Build the "Read-Only" VFS (mounting and browsing).
3. **Phase 3**: Implement "Write/Save" logic with atomic commit.
4. **Phase 4**: Add UI flourishes (icons, status bar indicators).

<!-- session:db7418be -->
