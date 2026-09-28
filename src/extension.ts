import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { AnalysisService, ProjectStateService, WebviewService, WorkspaceService } from './services';
import { ProjectDnaTreeDataProvider } from './tree/projectDnaTreeDataProvider';

export function activate(context: vscode.ExtensionContext): void {
  try {
    // 1. Initialize core services
    const workspaceService = new WorkspaceService(context);
    const initialProjectInfo = workspaceService.getProjectInfo();
    const stateService = new ProjectStateService(initialProjectInfo);
    const analysisService = new AnalysisService(workspaceService, stateService);
    const webviewService = new WebviewService(
      context.extensionUri,
      stateService,
      workspaceService,
      analysisService
    );

    // 2. React to workspace folder changes
    const workspaceChangeSub = workspaceService.onDidChangeWorkspace((info) => {
      stateService.setWorkspaceInfo(info);
    });
    context.subscriptions.push(workspaceChangeSub);

    // 3. Register Activity Bar TreeDataProvider
    const treeDataProvider = new ProjectDnaTreeDataProvider(stateService);
    const treeView = vscode.window.registerTreeDataProvider(
      'project-dna-explorer',
      treeDataProvider
    );
    context.subscriptions.push(treeView);

    // 4. Register commands
    registerCommands(context, webviewService, analysisService);

    // 5. Cleanup on deactivation
    context.subscriptions.push({
      dispose: () => {
        stateService.dispose();
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to activate Project DNA: ${msg}`);
  }
}

export function deactivate(): void {
  // Clean up any remaining resources
}
