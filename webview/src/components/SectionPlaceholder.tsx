import React from 'react';
import { Info } from 'lucide-react';

interface BlueprintItem {
  title: string;
  description: string;
}

interface SectionPlaceholderProps {
  title: string;
  badge: string;
  icon: React.ReactNode;
  description: string;
  blueprintItems: BlueprintItem[];
  isAnalyzed: boolean;
}

export const SectionPlaceholder: React.FC<SectionPlaceholderProps> = ({
  title,
  badge,
  icon,
  description,
  blueprintItems,
  isAnalyzed,
}) => {
  return (
    <div className="section-view">
      <div className="section-header">
        <div className="section-title-wrap">
          {icon}
          <h2 className="section-title">{title}</h2>
          <span className="section-badge">{badge}</span>
        </div>
      </div>

      <div className="info-callout">
        <Info className="info-callout-icon" />
        <div>
          <strong>Architecture Module Scaffold: </strong>
          {description}
          {!isAnalyzed && ' (Awaiting full scanner activation in Step 2).'}
        </div>
      </div>

      <div className="blueprint-grid">
        {blueprintItems.map((item, index) => (
          <div key={index} className="blueprint-card">
            <div className="blueprint-card-title">
              <span>{item.title}</span>
            </div>
            <div className="blueprint-card-body">{item.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
