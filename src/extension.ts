import * as vscode from 'vscode';
import { SkillFileSystemProvider } from './skill-fs-provider';

export function activate(context: vscode.ExtensionContext) {
    console.log('".Skill Editor" extension is now active!');

    const skillFileSystemProvider = new SkillFileSystemProvider();
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider('skill', skillFileSystemProvider, { isCaseSensitive: true }));

    // Mount the .skill file as a virtual folder
    const mountSkill = (uri: vscode.Uri) => {
        const skillUri = vscode.Uri.parse(`skill://${uri.fsPath}/`);
        vscode.workspace.updateWorkspaceFolders(
            vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0,
            0,
            { uri: skillUri, name: `[Skill] ${uri.fsPath.split(/[\\\/]/).pop()}` }
        );
        vscode.window.showInformationMessage(`Mounted ${uri.fsPath} in Skill Editor`);
    };

    let disposable = vscode.commands.registerCommand('skill-editor.openInEditor', (uri: vscode.Uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('No file selected.');
            return;
        }
        mountSkill(uri);
    });
    context.subscriptions.push(disposable);

    // Register Custom Editor Provider to handle "File > Open"
    const customEditorProvider = new class implements vscode.CustomReadonlyEditorProvider {
        async openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken): Promise<vscode.CustomDocument> {
            return { uri, dispose: () => {} };
        }
        async resolveCustomEditor(document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
            webviewPanel.webview.options = { enableScripts: true };
            webviewPanel.webview.html = `
                <!DOCTYPE html>
                <html>
                <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; text-align:center;">
                    <h2>.Skill Editor</h2>
                    <p>This skill archive has been mounted as a virtual folder in your Explorer.</p>
                    <p>Check the Explorer pane to browse and edit the files.</p>
                </body>
                </html>
            `;
            // Trigger the mount logic
            mountSkill(document.uri);
        }
    };
    
    context.subscriptions.push(vscode.window.registerCustomEditorProvider('skill-editor.editor', customEditorProvider));
}

export function deactivate() {}

// session:736fad55
