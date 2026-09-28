import React from 'react';
import { X, CheckCircle2, FileCode, Shield, ExternalLink } from 'lucide-react';
import { TechnologyInfo } from '../types';

interface TechnologyDetailModalProps {
  tech: TechnologyInfo | null;
  onClose: () => void;
  onOpenFile: (path: string) => void;
}

export const TechnologyDetailModal: React.FC<TechnologyDetailModalProps> = ({
  tech,
  onClose,
  onOpenFile,
}) => {
  if (!tech) {
    return null;
  }

  const confidencePercent = Math.round(tech.confidence * 100);

  return (
    <div className="tech-modal-overlay" onClick={onClose}>
      <div className="tech-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tech-modal-header">
          <div className="tech-modal-title">
            <span>{tech.name}</span>
            <span className="category-badge source" style={{ textTransform: 'capitalize' }}>
              {tech.category}
            </span>
            {tech.version && <span className="tech-version-pill">{tech.version}</span>}
          </div>

          <button className="btn btn-icon-only" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="tech-modal-body">
          {tech.description && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{tech.description}</p>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Shield size={16} color="var(--accent-green)" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Detection Confidence
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                {confidencePercent}% (Deterministic Evidence)
              </span>
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                letterSpacing: '0.05em',
                marginBottom: '10px',
              }}
            >
              Detected Because ({tech.evidence.length} pieces of evidence):
            </div>

            <div className="evidence-list">
              {tech.evidence.map((ev, index) => (
                <div key={index} className="evidence-item">
                  <CheckCircle2 size={15} className="evidence-item-icon" />
                  <div className="evidence-item-content">
                    <span
                      className="evidence-source"
                      onClick={() => onOpenFile(ev.source)}
                      title={`Open ${ev.source} in VS Code editor`}
                    >
                      <FileCode size={12} />
                      <span>{ev.source}</span>
                      <ExternalLink size={10} style={{ opacity: 0.7 }} />
                    </span>
                    <span className="evidence-detail">{ev.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
