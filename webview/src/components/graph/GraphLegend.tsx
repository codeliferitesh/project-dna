import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { ArchitecturalRole } from '../../types';

interface GraphLegendProps {
  activeRoles: ArchitecturalRole[];
  activeRelationships: string[];
  showExternal: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  entry_point: '#10b981', // green
  page: '#3b82f6', // blue
  route: '#60a5fa', // light blue
  layout: '#06b6d4', // cyan
  component: '#8b5cf6', // purple
  ui_component: '#a855f7', // violet
  hook: '#ec4899', // pink
  context: '#f43f5e', // rose
  service: '#f59e0b', // amber
  api_client: '#eab308', // yellow
  controller: '#d97706', // dark amber
  model: '#14b8a6', // teal
  repository: '#0d9488', // dark teal
  utility: '#64748b', // slate
  config: '#94a3b8', // light slate
  type_definition: '#38bdf8', // sky
  schema: '#2dd4bf', // mint
  test: '#22c55e', // bright green
  unknown: '#71717a', // zinc
};

export const GraphLegend: React.FC<GraphLegendProps> = ({
  activeRoles,
  activeRelationships,
  showExternal,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="graph-legend-container">
      <div
        className="graph-legend-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
      >
        <div className="legend-header-left">
          <Info size={12} />
          <span>Graph Legend</span>
        </div>
        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </div>

      {isExpanded && (
        <div className="graph-legend-body">
          {/* Roles */}
          <div className="legend-section">
            <div className="legend-section-title">Node Roles</div>
            <div className="legend-items-grid">
              {activeRoles.map((role) => (
                <div key={role} className="legend-item">
                  <span
                    className="legend-dot"
                    style={{ backgroundColor: ROLE_COLORS[role] || '#71717a' }}
                  />
                  <span className="legend-label">{role.replace(/_/g, ' ')}</span>
                </div>
              ))}
              {showExternal && (
                <div className="legend-item">
                  <span
                    className="legend-dot"
                    style={{ backgroundColor: '#64748b', borderRadius: '2px' }}
                  />
                  <span className="legend-label">external package</span>
                </div>
              )}
            </div>
          </div>

          {/* Relationships */}
          {activeRelationships.length > 0 && (
            <div className="legend-section">
              <div className="legend-section-title">Relationship Edges</div>
              <div className="legend-items-grid">
                {activeRelationships.map((rel) => (
                  <div key={rel} className="legend-item">
                    <span className="legend-arrow">→</span>
                    <span className="legend-label">{rel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
