import React from 'react';
import { FolderTree, Sparkles } from 'lucide-react';
import { FileTree } from '../components/FileTree';
import { ProjectStatePayload } from '../types';

interface StructurePageProps {
  state: ProjectStatePayload;
  onOpenFile: (path: string) => void;
  onAnalyze: () => void;
}

export const StructurePage: React.FC<StructurePageProps> = ({ state, onOpenFile, onAnalyze }) => {
  const { info, analysis, stats, isAnalyzing } = state;
  const fileTree = analysis?.fileTree;

  if (!info.isWorkspaceOpen || !info.isAnalyzed || !fileTree) {
    return (
      <div className="section-view">
        <div className="section-header">
          <div className="section-title-wrap">
            <FolderTree size={18} color="#3b82f6" />
            <h2 className="section-title">Project Structure</h2>
            <span className="section-badge">File Tree</span>
          </div>
        </div>

        <div className="empty-state-box">
          <Sparkles className="empty-state-icon" />
          <div className="empty-state-title">Project structure not analyzed yet.</div>
          <p className="empty-state-text">
            Run Project DNA analysis to scan directories and render the interactive file tree.
          </p>
          <button
            className="btn btn-primary"
            onClick={onAnalyze}
            disabled={!info.isWorkspaceOpen || isAnalyzing}
            style={{ marginTop: 8 }}
          >
            <span>{isAnalyzing ? 'Scanning...' : 'Scan Project Structure'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="section-view">
      <div className="section-header">
        <div className="section-title-wrap">
          <FolderTree size={18} color="#3b82f6" />
          <h2 className="section-title">Project Structure</h2>
          <span className="section-badge">
            {stats?.totalFiles || 0} Files • {stats?.totalDirectories || 0} Directories
          </span>
        </div>
      </div>

      <FileTree rootNode={fileTree} onOpenFile={onOpenFile} />
    </div>
  );
};
