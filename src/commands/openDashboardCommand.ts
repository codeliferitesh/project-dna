import * as vscode from 'vscode';
import { NavigationTab } from '../models';
import { WebviewService } from '../services';

export function registerOpenDashboardCommand(
  context: vscode.ExtensionContext,
  webviewService: WebviewService
): void {
  const disposable = vscode.commands.registerCommand(
    'project-dna.openDashboard',
    (tab?: NavigationTab) => {
      webviewService.showDashboard(tab);
    }
  );

  const openSectionDisposable = vscode.commands.registerCommand(
    'project-dna.openSection',
    (tab: NavigationTab) => {
      webviewService.navigateToTab(tab);
    }
  );

  context.subscriptions.push(disposable, openSectionDisposable);
}
