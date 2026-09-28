import * as vscode from 'vscode';
import { AnalysisService, WebviewService } from '../services';
import { registerAnalyzeProjectCommand } from './analyzeProjectCommand';
import { registerOpenDashboardCommand } from './openDashboardCommand';
import { registerRefreshAnalysisCommand } from './refreshAnalysisCommand';

export function registerCommands(
  context: vscode.ExtensionContext,
  webviewService: WebviewService,
  analysisService: AnalysisService
): void {
  registerOpenDashboardCommand(context, webviewService);
  registerAnalyzeProjectCommand(context, analysisService);
  registerRefreshAnalysisCommand(context, analysisService);
}
