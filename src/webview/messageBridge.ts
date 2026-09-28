import * as vscode from 'vscode';
import { ExtensionMessage, NavigationTab, WebviewMessage } from '../models';
import { AnalysisService } from '../services/analysisService';
import { ProjectStateService } from '../services/projectStateService';
import { WorkspaceService } from '../services/workspaceService';

export class MessageBridge {
  constructor(
    private readonly webview: vscode.Webview,
    private readonly stateService: ProjectStateService,
    private readonly workspaceService: WorkspaceService,
    private readonly analysisService: AnalysisService
  ) {}

  /**
   * Dispatches an outgoing message to the webview.
   */
  public sendMessage(message: ExtensionMessage): void {
    try {
      this.webview.postMessage(message);
    } catch (error) {
      console.error('Failed to post message to webview:', error);
    }
  }

  /**
   * Centralized receiver for incoming messages from webview.
   */
  public async handleIncomingMessage(rawMessage: unknown): Promise<void> {
    if (!rawMessage || typeof rawMessage !== 'object' || !('type' in rawMessage)) {
      console.warn('Invalid message format received from webview:', rawMessage);
      return;
    }

    const message = rawMessage as WebviewMessage;

    switch (message.type) {
      case 'getState': {
        this.sendMessage({
          type: 'projectState',
          state: this.stateService.getState(),
        });
        break;
      }

      case 'analyzeProject': {
        await this.analysisService.analyzeProject();
        break;
      }

      case 'refreshProject': {
        await this.analysisService.refreshAnalysis();
        break;
      }

      case 'navigateTab': {
        if (message.tab) {
          this.stateService.setActiveTab(message.tab as NavigationTab);
        }
        break;
      }

      case 'openFile': {
        if (message.path) {
          await this.workspaceService.openFileInEditor(message.path, message.line);
        }
        break;
      }

      case 'openSettings': {
        vscode.commands.executeCommand('workbench.action.openSettings', 'project-dna');
        break;
      }

      default: {
        console.warn('Unknown message type received from webview:', message);
      }
    }
  }
}
