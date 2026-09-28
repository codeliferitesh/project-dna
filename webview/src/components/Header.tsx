import React from 'react';
import { RefreshCw, Play, Settings, Dna } from 'lucide-react';
import { ProjectInfo } from '../types';

interface HeaderProps {
  info: ProjectInfo;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  info,
  isAnalyzing,
  onAnalyze,
  onRefresh,
  onOpenSettings,
}) => {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo">
          <Dna className="brand-helix-icon" size={18} />
          <span>Project DNA</span>
        </div>

        <div className="workspace-badge" title={info.rootPath || 'No Workspace'}>
          <span className={`workspace-dot ${info.isWorkspaceOpen ? '' : 'inactive'}`} />
          <span>{info.isWorkspaceOpen ? info.workspaceName : 'No workspace open'}</span>
        </div>
      </div>

      <div className="header-actions">
        <button
          className="btn btn-primary"
          onClick={onAnalyze}
          disabled={!info.isWorkspaceOpen || isAnalyzing}
          title="Analyze Project"
        >
          <Play size={13} fill={isAnalyzing ? 'none' : 'currentColor'} />
          <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Project'}</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={onRefresh}
          disabled={!info.isWorkspaceOpen || isAnalyzing}
          title="Refresh Analysis"
        >
          <RefreshCw size={13} className={isAnalyzing ? 'spin' : ''} />
          <span>Refresh</span>
        </button>

        <button
          className="btn btn-icon-only"
          onClick={onOpenSettings}
          title="Project DNA Settings"
          aria-label="Settings"
        >
          <Settings size={15} />
        </button>
      </div>

      {isAnalyzing && <div className="header-loading-bar" />}
    </header>
  );
};
