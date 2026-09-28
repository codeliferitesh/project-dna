import * as vscode from 'vscode';
import { ExtensionMessage } from '../models';
import { AnalysisService } from '../services/analysisService';
import { ProjectStateService } from '../services/projectStateService';
import { WorkspaceService } from '../services/workspaceService';
import { MessageBridge } from './messageBridge';
import { getWebviewHtml } from './webviewUtils';

export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;
  public static readonly viewType = 'projectDnaDashboard';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _messageBridge: MessageBridge;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(
    extensionUri: vscode.Uri,
    stateService: ProjectStateService,
    workspaceService: WorkspaceService,
    analysisService: AnalysisService
  ): DashboardPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, reveal it.
    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel._panel.reveal(column);
      return DashboardPanel.currentPanel;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      DashboardPanel.viewType,
      '🧬 Project DNA',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist', 'webview-ui'),
          vscode.Uri.joinPath(extensionUri, 'media'),
        ],
      }
    );

    DashboardPanel.currentPanel = new DashboardPanel(
      panel,
      extensionUri,
      stateService,
      workspaceService,
      analysisService
    );

    return DashboardPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    stateService: ProjectStateService,
    workspaceService: WorkspaceService,
    analysisService: AnalysisService
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set panel icon
    this._panel.iconPath = {
      light: vscode.Uri.joinPath(this._extensionUri, 'media', 'dna-icon.svg'),
      dark: vscode.Uri.joinPath(this._extensionUri, 'media', 'dna-icon.svg'),
    };

    // Initialize HTML
    this._updateHtml();

    // Create message bridge
    this._messageBridge = new MessageBridge(
      this._panel.webview,
      stateService,
      workspaceService,
      analysisService
    );

    // Listen for messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (msg) => this._messageBridge.handleIncomingMessage(msg),
      null,
      this._disposables
    );

    // Listen for state changes from the extension host
    stateService.onDidChangeState(
      (newState) => {
        this._messageBridge.sendMessage({
          type: 'projectState',
          state: newState,
        });
      },
      null,
      this._disposables
    );

    // Listen for panel disposal
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public postMessage(message: ExtensionMessage): void {
    this._messageBridge.sendMessage(message);
  }

  private _updateHtml(): void {
    this._panel.webview.html = getWebviewHtml(
      this._panel.webview,
      this._extensionUri,
      '🧬 Project DNA'
    );
  }

  public dispose(): void {
    DashboardPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}
