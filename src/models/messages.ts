import { NavigationTab, ProjectAnalysis, ProjectInfo, ProjectStats } from './project';

/**
 * Messages sent from Webview to Extension Host
 */
export type WebviewMessage =
  | { type: 'analyzeProject' }
  | { type: 'refreshProject' }
  | { type: 'openFile'; path: string; line?: number }
  | { type: 'navigateTab'; tab: NavigationTab }
  | { type: 'getState' }
  | { type: 'openSettings' };

/**
 * Payload representing current project state sent to webview
 */
export interface ProjectStatePayload {
  info: ProjectInfo;
  stats: ProjectStats | null;
  analysis: ProjectAnalysis | null;
  isAnalyzing: boolean;
  activeTab: NavigationTab;
  errorMessage: string | null;
}

/**
 * Messages sent from Extension Host to Webview
 */
export type ExtensionMessage =
  | { type: 'projectState'; state: ProjectStatePayload }
  | { type: 'analysisStarted' }
  | { type: 'analysisCompleted'; analysis: ProjectAnalysis }
  | { type: 'analysisError'; error: string }
  | { type: 'workspaceChanged'; workspaceName: string | null; isWorkspaceOpen: boolean }
  | { type: 'setActiveTab'; tab: NavigationTab };
