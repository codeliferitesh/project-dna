import * as vscode from 'vscode';
import { NavigationTab, ProjectAnalysis, ProjectInfo, ProjectStatePayload } from '../models';

export class ProjectStateService {
  private _state: ProjectStatePayload;
  private _onDidChangeState = new vscode.EventEmitter<ProjectStatePayload>();
  public readonly onDidChangeState = this._onDidChangeState.event;

  constructor(initialInfo: ProjectInfo) {
    this._state = {
      info: initialInfo,
      stats: null,
      analysis: null,
      isAnalyzing: false,
      activeTab: 'overview',
      errorMessage: null,
    };
  }

  public getState(): ProjectStatePayload {
    return { ...this._state };
  }

  public setWorkspaceInfo(info: ProjectInfo): void {
    this._state = {
      ...this._state,
      info,
      stats: null,
      analysis: null,
      isAnalyzing: false,
      errorMessage: null,
    };
    this._onDidChangeState.fire(this.getState());
  }

  public setActiveTab(tab: NavigationTab): void {
    if (this._state.activeTab !== tab) {
      this._state = {
        ...this._state,
        activeTab: tab,
      };
      this._onDidChangeState.fire(this.getState());
    }
  }

  public startAnalysis(): void {
    this._state = {
      ...this._state,
      isAnalyzing: true,
      errorMessage: null,
    };
    this._onDidChangeState.fire(this.getState());
  }

  public completeAnalysis(analysis: ProjectAnalysis): void {
    this._state = {
      ...this._state,
      info: analysis.info,
      stats: analysis.stats,
      analysis,
      isAnalyzing: false,
      errorMessage: null,
    };
    this._onDidChangeState.fire(this.getState());
  }

  public failAnalysis(errorMessage: string): void {
    this._state = {
      ...this._state,
      isAnalyzing: false,
      errorMessage,
    };
    this._onDidChangeState.fire(this.getState());
  }

  public dispose(): void {
    this._onDidChangeState.dispose();
  }
}
