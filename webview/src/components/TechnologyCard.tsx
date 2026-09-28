import { ShieldCheck } from 'lucide-react';
import { TechnologyInfo } from '../types';

interface TechnologyCardProps {
  tech: TechnologyInfo;
  onClick: () => void;
}

export const TechnologyCard: React.FC<TechnologyCardProps> = ({ tech, onClick }) => {
  const confidencePercent = Math.round(tech.confidence * 100);
  const dotCount = 5;
  const activeDots = Math.round(tech.confidence * dotCount);

  return (
    <div className="tech-card" onClick={onClick} title={`Click to view evidence for ${tech.name}`}>
      <div className="tech-card-header">
        <div className="tech-card-title">
          <span className="tech-name">{tech.name}</span>
          <span className="tech-category-label">{tech.category}</span>
        </div>

        {tech.version && <span className="tech-version-pill">{tech.version}</span>}
      </div>

      {tech.description && <p className="tech-card-desc">{tech.description}</p>}

      <div className="tech-card-footer">
        <div className="tech-confidence" title={`Confidence: ${confidencePercent}%`}>
          <div className="confidence-dots">
            {Array.from({ length: dotCount }).map((_, i) => (
              <span key={i} className={`conf-dot ${i < activeDots ? 'active' : ''}`} />
            ))}
          </div>
          <span>{confidencePercent}%</span>
        </div>

        <span className="tech-evidence-badge">
          <ShieldCheck size={12} />
          <span>{tech.evidence.length} Evidence</span>
        </span>
      </div>
    </div>
  );
};
