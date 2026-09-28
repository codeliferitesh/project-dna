import React from 'react';
import { FolderSearch, Sparkles, Play } from 'lucide-react';

interface EmptyStateProps {
  isWorkspaceOpen: boolean;
  isAnalyzed: boolean;
  isAnalyzing: boolean;
  onAnalyze: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  isWorkspaceOpen,
  isAnalyzed: _isAnalyzed,
  isAnalyzing,
  onAnalyze,
}) => {
  if (!isWorkspaceOpen) {
    return (
      <div className="empty-state-box">
        <FolderSearch className="empty-state-icon" />
        <div className="empty-state-title">No Workspace Open</div>
        <p className="empty-state-text">
          Open a workspace folder to analyze your project architecture, dependencies, and APIs.
        </p>
      </div>
    );
  }

  return (
    <div className="empty-state-box">
      <Sparkles className="empty-state-icon" />
      <div className="empty-state-title">Project not analyzed yet.</div>
      <p className="empty-state-text">
        Run Project DNA analysis to discover technologies, map directory hierarchy, index APIs, and
        visualize architecture.
      </p>
      <button
        className="btn btn-primary"
        onClick={onAnalyze}
        disabled={isAnalyzing}
        style={{ marginTop: 8 }}
      >
        <Play size={13} fill="currentColor" />
        <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Project Now'}</span>
      </button>
    </div>
  );
};
