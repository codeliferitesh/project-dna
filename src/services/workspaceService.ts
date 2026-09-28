import * as vscode from 'vscode';
import { ProjectInfo } from '../models';

export class WorkspaceService {
  private _onDidChangeWorkspace = new vscode.EventEmitter<ProjectInfo>();
  public readonly onDidChangeWorkspace = this._onDidChangeWorkspace.event;

  constructor(context: vscode.ExtensionContext) {
    const watcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this._onDidChangeWorkspace.fire(this.getProjectInfo());
    });
    context.subscriptions.push(watcher, this._onDidChangeWorkspace);
  }

  public isWorkspaceOpen(): boolean {
    return (
      vscode.workspace.workspaceFolders !== undefined &&
      vscode.workspace.workspaceFolders.length > 0
    );
  }

  public getWorkspaceRoot(): string | null {
    if (!this.isWorkspaceOpen()) {
      return null;
    }
    return vscode.workspace.workspaceFolders![0].uri.fsPath;
  }

  public getWorkspaceName(): string | null {
    if (!this.isWorkspaceOpen()) {
      return null;
    }
    return vscode.workspace.workspaceFolders![0].name;
  }

  public getProjectInfo(): ProjectInfo {
    const isOpen = this.isWorkspaceOpen();
    return {
      workspaceName: this.getWorkspaceName(),
      rootPath: this.getWorkspaceRoot(),
      isWorkspaceOpen: isOpen,
      isAnalyzed: false,
      lastAnalyzedTimestamp: null,
    };
  }

  public async openFileInEditor(filePath: string, line?: number): Promise<void> {
    try {
      const uri = vscode.Uri.file(filePath);
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document, {
        preview: true,
        preserveFocus: false,
      });

      if (line !== undefined && line > 0) {
        const targetLine = Math.max(0, line - 1);
        const position = new vscode.Position(targetLine, 0);
        const range = new vscode.Range(position, position);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Unable to open file: ${filePath}. ${msg}`);
    }
  }
}
