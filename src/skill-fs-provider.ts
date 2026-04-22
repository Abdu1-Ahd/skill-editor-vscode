import * as vscode from 'vscode';
import * as AdmZip from 'adm-zip';
import * as path from 'path';
import * as fs from 'fs';

export class SkillFileSystemProvider implements vscode.FileSystemProvider {

    private _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFile.event;

    private zipBuffers: Map<string, AdmZip> = new Map();

    private getZip(uri: vscode.Uri): AdmZip {
        const zipPath = uri.authority; // Assuming URI is skill://<zip_path>/internal_path
        if (!this.zipBuffers.has(zipPath)) {
            if (!fs.existsSync(zipPath)) {
                throw vscode.FileSystemError.FileNotFound(uri);
            }
            this.zipBuffers.set(zipPath, new AdmZip(zipPath));
        }
        return this.zipBuffers.get(zipPath)!;
    }

    watch(_uri: vscode.Uri, _options: { recursive: boolean; excludes: string[] }): vscode.Disposable {
        return new vscode.Disposable(() => { });
    }

    stat(uri: vscode.Uri): vscode.FileStat {
        const zip = this.getZip(uri);
        const internalPath = uri.path.startsWith('/') ? uri.path.substring(1) : uri.path;

        if (internalPath === '') {
            return {
                type: vscode.FileType.Directory,
                ctime: 0,
                mtime: 0,
                size: 0
            };
        }

        const entry = zip.getEntry(internalPath);
        if (entry) {
            return {
                type: entry.isDirectory ? vscode.FileType.Directory : vscode.FileType.File,
                ctime: entry.header.time.getTime(),
                mtime: entry.header.time.getTime(),
                size: entry.header.size
            };
        }

        // Check if it's a directory (PKZIP entries sometimes only exist for files)
        const entries = zip.getEntries();
        const isDir = entries.some(e => e.entryName.startsWith(internalPath + '/'));
        if (isDir) {
            return {
                type: vscode.FileType.Directory,
                ctime: 0,
                mtime: 0,
                size: 0
            };
        }

        throw vscode.FileSystemError.FileNotFound(uri);
    }

    readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
        const zip = this.getZip(uri);
        const internalPath = uri.path.startsWith('/') ? uri.path.substring(1) : uri.path;
        const prefix = internalPath === '' ? '' : internalPath + '/';

        const result: Map<string, vscode.FileType> = new Map();
        const entries = zip.getEntries();

        for (const entry of entries) {
            if (entry.entryName.startsWith(prefix)) {
                const relativePath = entry.entryName.substring(prefix.length);
                if (relativePath === '') continue;

                const parts = relativePath.split('/');
                const name = parts[0];
                const type = (parts.length > 1 || entry.isDirectory) ? vscode.FileType.Directory : vscode.FileType.File;
                
                if (!result.has(name) || type === vscode.FileType.Directory) {
                    result.set(name, type);
                }
            }
        }

        return Array.from(result.entries());
    }

    createDirectory(_uri: vscode.Uri): void {
        throw new Error('Method not implemented.');
    }

    readFile(uri: vscode.Uri): Uint8Array {
        const zip = this.getZip(uri);
        const internalPath = uri.path.startsWith('/') ? uri.path.substring(1) : uri.path;
        const entry = zip.getEntry(internalPath);

        if (!entry || entry.isDirectory) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }

        const buffer = zip.readFile(entry);
        if (!buffer) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        return new Uint8Array(buffer);
    }

    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean }): void {
        const zipPath = uri.authority;
        const zip = this.getZip(uri);
        const internalPath = uri.path.startsWith('/') ? uri.path.substring(1) : uri.path;

        const entry = zip.getEntry(internalPath);
        if (!entry && !options.create) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        if (entry && !options.overwrite) {
            throw vscode.FileSystemError.FileExists(uri);
        }

        if (entry) {
            zip.updateFile(entry, Buffer.from(content));
        } else {
            zip.addFile(internalPath, Buffer.from(content));
        }

        // Persistent save
        zip.writeZip(zipPath);
        
        this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Changed, uri }]);
    }

    delete(uri: vscode.Uri, _options: { recursive: boolean }): void {
        const zipPath = uri.authority;
        const zip = this.getZip(uri);
        const internalPath = uri.path.startsWith('/') ? uri.path.substring(1) : uri.path;

        const entry = zip.getEntry(internalPath);
        if (!entry) {
            // Check if it's a directory
            const entries = zip.getEntries();
            const toDelete = entries.filter(e => e.entryName.startsWith(internalPath + '/'));
            if (toDelete.length === 0) {
                throw vscode.FileSystemError.FileNotFound(uri);
            }
            toDelete.forEach(e => zip.deleteFile(e));
        } else {
            zip.deleteFile(entry);
        }

        zip.writeZip(zipPath);
        this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Deleted, uri }]);
    }

    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
        // Simple rename logic: read, delete, write
        const content = this.readFile(oldUri);
        this.delete(oldUri, { recursive: true });
        this.writeFile(newUri, content, { create: true, overwrite: options.overwrite });
    }
}
