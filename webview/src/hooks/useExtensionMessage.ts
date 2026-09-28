import { useEffect, useState, useCallback } from 'react';
import { postToExtension } from '../services/vscodeBridge';
import { ExtensionMessage, NavigationTab, ProjectStatePayload } from '../types';

const defaultState: ProjectStatePayload = {
  info: {
    workspaceName: null,
    rootPath: null,
    isWorkspaceOpen: false,
    isAnalyzed: false,
    lastAnalyzedTimestamp: null,
  },
  stats: null,
  analysis: null,
  isAnalyzing: false,
  activeTab: 'overview',
  errorMessage: null,
};

export function useExtensionMessage() {
  const [state, setState] = useState<ProjectStatePayload>(defaultState);

  useEffect(() => {
    // Request current state from extension host upon mount
    postToExtension({ type: 'getState' });

    const handleMessage = (event: MessageEvent) => {
      const message = event.data as ExtensionMessage;
      if (!message || !message.type) {
        return;
      }

      switch (message.type) {
        case 'projectState':
          setState(message.state);
          break;

        case 'analysisStarted':
          setState((prev) => ({
            ...prev,
            isAnalyzing: true,
            errorMessage: null,
          }));
          break;

        case 'analysisCompleted':
          setState((prev) => ({
            ...prev,
            info: message.analysis.info,
            stats: message.analysis.stats,
            analysis: message.analysis,
            isAnalyzing: false,
            errorMessage: null,
          }));
          break;

        case 'analysisError':
          setState((prev) => ({
            ...prev,
            isAnalyzing: false,
            errorMessage: message.error,
          }));
          break;

        case 'workspaceChanged':
          setState((prev) => ({
            ...prev,
            info: {
              ...prev.info,
              workspaceName: message.workspaceName,
              isWorkspaceOpen: message.isWorkspaceOpen,
              isAnalyzed: false,
            },
            stats: null,
            analysis: null,
            isAnalyzing: false,
            errorMessage: null,
          }));
          break;

        case 'setActiveTab':
          setState((prev) => ({
            ...prev,
            activeTab: message.tab,
          }));
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const triggerAnalyze = useCallback(() => {
    postToExtension({ type: 'analyzeProject' });
  }, []);

  const triggerRefresh = useCallback(() => {
    postToExtension({ type: 'refreshProject' });
  }, []);

  const navigateTab = useCallback((tab: NavigationTab) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
    postToExtension({ type: 'navigateTab', tab });
  }, []);

  const triggerSettings = useCallback(() => {
    postToExtension({ type: 'openSettings' });
  }, []);

  const openFile = useCallback((path: string, line?: number) => {
    postToExtension({ type: 'openFile', path, line });
  }, []);

  return {
    state,
    triggerAnalyze,
    triggerRefresh,
    navigateTab,
    triggerSettings,
    openFile,
  };
}
