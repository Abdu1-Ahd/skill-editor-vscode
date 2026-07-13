# Change Log

All notable changes to the ".Skill Editor" extension will be documented in this file.

## [1.0.0] - Initial Release
- Implemented Virtual File System via `FileSystemProvider` for reading and writing `.skill` archives natively.
- Added `CustomReadonlyEditorProvider` for auto-mounting when files are opened from Explorer or outside the workspace.
- Added atomic save logic to prevent archive corruption.
- Complete unit test coverage for VFS logic.

<!-- session:103da490 -->
