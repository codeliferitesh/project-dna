import * as vscode from 'vscode';
import { AnalysisService } from '../services';

export function registerAnalyzeProjectCommand(
  context: vscode.ExtensionContext,
  analysisService: AnalysisService
): void {
  const disposable = vscode.commands.registerCommand('project-dna.analyzeProject', async () => {
    await analysisService.analyzeProject();
  });

  context.subscriptions.push(disposable);
}
