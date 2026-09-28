import * as vscode from 'vscode';
import { NavigationTab } from '../models';
import { DashboardPanel } from '../webview/dashboardPanel';
import { AnalysisService } from './analysisService';
import { ProjectStateService } from './projectStateService';
import { WorkspaceService } from './workspaceService';

export class WebviewService {
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly stateService: ProjectStateService,
    private readonly workspaceService: WorkspaceService,
    private readonly analysisService: AnalysisService
  ) {}

  public showDashboard(tab?: NavigationTab): DashboardPanel {
    if (tab) {
      this.stateService.setActiveTab(tab);
    }
    return DashboardPanel.createOrShow(
      this.extensionUri,
      this.stateService,
      this.workspaceService,
      this.analysisService
    );
  }

  public navigateToTab(tab: NavigationTab): void {
    this.stateService.setActiveTab(tab);
    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel.postMessage({
        type: 'setActiveTab',
        tab,
      });
    } else {
      this.showDashboard(tab);
    }
  }
}
