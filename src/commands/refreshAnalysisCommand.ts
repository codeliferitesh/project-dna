import * as vscode from 'vscode';
import { AnalysisService } from '../services';

export function registerRefreshAnalysisCommand(
  context: vscode.ExtensionContext,
  analysisService: AnalysisService
): void {
  const disposable = vscode.commands.registerCommand('project-dna.refreshAnalysis', async () => {
    await analysisService.refreshAnalysis();
  });

  context.subscriptions.push(disposable);
}
