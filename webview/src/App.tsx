import React from 'react';
import { Header } from './components/Header';
import { SidebarNav } from './components/SidebarNav';
import { useExtensionMessage } from './hooks/useExtensionMessage';
import { OverviewPage } from './pages/OverviewPage';
import { StructurePage } from './pages/StructurePage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { GraphPage } from './pages/GraphPage';
import { TechnologyPage } from './pages/TechnologyPage';
import { DependenciesPage } from './pages/DependenciesPage';
import { ApisPage } from './pages/ApisPage';
import { ConfigurationPage } from './pages/ConfigurationPage';
import { GitPage } from './pages/GitPage';

export const App: React.FC = () => {
  const { state, triggerAnalyze, triggerRefresh, navigateTab, triggerSettings, openFile } =
    useExtensionMessage();

  const renderContent = () => {
    switch (state.activeTab) {
      case 'overview':
        return (
          <OverviewPage
            state={state}
            onAnalyze={triggerAnalyze}
            onRefresh={triggerRefresh}
            onNavigateTab={navigateTab}
            onOpenFile={openFile}
          />
        );
      case 'structure':
        return <StructurePage state={state} onOpenFile={openFile} onAnalyze={triggerAnalyze} />;
      case 'architecture':
        return (
          <ArchitecturePage
            state={state}
            onOpenFile={openFile}
            onAnalyze={triggerAnalyze}
            onNavigateTab={navigateTab}
          />
        );
      case 'graph':
        return <GraphPage state={state} onOpenFile={openFile} onAnalyze={triggerAnalyze} />;
      case 'technology':
        return <TechnologyPage state={state} onOpenFile={openFile} onAnalyze={triggerAnalyze} />;
      case 'dependencies':
        return <DependenciesPage state={state} onOpenFile={openFile} onAnalyze={triggerAnalyze} />;
      case 'apis':
        return <ApisPage state={state} onOpenFile={openFile} onAnalyze={triggerAnalyze} />;
      case 'configuration':
        return <ConfigurationPage state={state} onOpenFile={openFile} onAnalyze={triggerAnalyze} />;
      case 'git':
        return <GitPage state={state} />;
      default:
        return (
          <OverviewPage
            state={state}
            onAnalyze={triggerAnalyze}
            onRefresh={triggerRefresh}
            onNavigateTab={navigateTab}
            onOpenFile={openFile}
          />
        );
    }
  };

  return (
    <div className="app-container">
      <Header
        info={state.info}
        isAnalyzing={state.isAnalyzing}
        onAnalyze={triggerAnalyze}
        onRefresh={triggerRefresh}
        onOpenSettings={triggerSettings}
      />

      <div className="app-body">
        <SidebarNav activeTab={state.activeTab} onSelectTab={navigateTab} />
        <main className="app-content">{renderContent()}</main>
      </div>

      <footer className="app-statusbar">
        <div className="statusbar-left">
          <span>
            {state.info.isWorkspaceOpen
              ? `Workspace: ${state.info.workspaceName}`
              : 'No Workspace Open'}
          </span>
          {state.isAnalyzing && <span>• Analyzing project...</span>}
        </div>
        <div className="statusbar-right">
          <span>Project DNA v0.1.0 • Foundation Shell</span>
        </div>
      </footer>
    </div>
  );
};
