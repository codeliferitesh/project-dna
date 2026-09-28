import React from 'react';
import { GitBranch, GitCommit, Link2, CheckCircle2, Sparkles } from 'lucide-react';
import { ProjectStatePayload } from '../types';

interface PageProps {
  state: ProjectStatePayload;
}

export const GitPage: React.FC<PageProps> = ({ state }) => {
  const { info, analysis } = state;
  const git = analysis?.git;

  if (!info.isWorkspaceOpen || !info.isAnalyzed) {
    return (
      <div className="section-view">
        <div className="section-header">
          <div className="section-title-wrap">
            <GitBranch size={18} color="#f43f5e" />
            <h2 className="section-title">Git & Repository</h2>
            <span className="section-badge">Local Version Control</span>
          </div>
        </div>

        <div className="empty-state-box">
          <Sparkles className="empty-state-icon" />
          <div className="empty-state-title">Project not analyzed yet.</div>
          <p className="empty-state-text">
            Run Project DNA analysis to detect local repository status, active branch, and remote
            origin references.
          </p>
        </div>
      </div>
    );
  }

  if (!git || !git.isGitRepo) {
    return (
      <div className="section-view">
        <div className="section-header">
          <div className="section-title-wrap">
            <GitBranch size={18} color="#f43f5e" />
            <h2 className="section-title">Git & Repository</h2>
            <span className="section-badge">Not a Git Repository</span>
          </div>
        </div>

        <div className="empty-state-box">
          <GitBranch className="empty-state-icon" style={{ opacity: 0.5 }} />
          <div className="empty-state-title">No Git repository found in this workspace.</div>
          <p className="empty-state-text">
            This workspace folder is not currently initialized as a Git version control repository.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-view">
      <div className="section-header">
        <div className="section-title-wrap">
          <GitBranch size={18} color="#f43f5e" />
          <h2 className="section-title">Git & Repository</h2>
          <span className="section-badge" style={{ color: '#fb7185' }}>
            Branch: {git.currentBranch || 'main'}
          </span>
        </div>
      </div>

      <div
        className="overview-blueprint-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
        }}
      >
        <div className="blueprint-card">
          <div className="blueprint-card-title">
            <GitBranch size={16} color="var(--accent-rose)" />
            <span>Active Branch</span>
          </div>
          <div
            className="blueprint-card-body"
            style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}
          >
            {git.currentBranch || 'main'}
          </div>
        </div>

        {git.lastCommitHash && (
          <div className="blueprint-card">
            <div className="blueprint-card-title">
              <GitCommit size={16} color="var(--accent-cyan)" />
              <span>HEAD Commit</span>
            </div>
            <div
              className="blueprint-card-body"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                color: 'var(--accent-cyan)',
              }}
            >
              {git.lastCommitHash}
            </div>
          </div>
        )}

        <div className="blueprint-card">
          <div className="blueprint-card-title">
            <Link2 size={16} color="var(--accent-blue)" />
            <span>Remote Origin</span>
          </div>
          <div className="blueprint-card-body" style={{ wordBreak: 'break-all', fontSize: '12px' }}>
            {git.remoteUrl ? git.remoteUrl : 'No remote origin configured'}
          </div>
        </div>

        <div className="blueprint-card">
          <div className="blueprint-card-title">
            <CheckCircle2 size={16} color="var(--accent-emerald)" />
            <span>Working Tree Status</span>
          </div>
          <div
            className="blueprint-card-body"
            style={{ fontSize: '13px', color: 'var(--accent-emerald)' }}
          >
            Clean / Monitored Locally
          </div>
        </div>
      </div>
    </div>
  );
};
