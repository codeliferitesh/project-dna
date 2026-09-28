import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Layers,
  Package,
  Boxes,
  GitFork,
  ShieldAlert,
} from 'lucide-react';
import { GraphFilterState, GraphMode } from '../../types';

interface GraphControlsProps {
  mode: GraphMode;
  onModeChange: (mode: GraphMode) => void;
  filters: GraphFilterState;
  onFilterChange: (filters: Partial<GraphFilterState>) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitGraph: () => void;
  onResetView: () => void;
  totalNodes: number;
  totalEdges: number;
  cycleCount: number;
  entryPointCount: number;
}

export const GraphControls: React.FC<GraphControlsProps> = ({
  mode,
  onModeChange,
  filters,
  onFilterChange,
  onZoomIn,
  onZoomOut,
  onFitGraph,
  onResetView,
  totalNodes,
  totalEdges,
  cycleCount,
  entryPointCount,
}) => {
  return (
    <div className="graph-controls-toolbar">
      {/* Mode Switcher */}
      <div className="graph-mode-switch">
        <button
          className={`graph-mode-btn ${mode === 'architecture' ? 'active' : ''}`}
          onClick={() => onModeChange('architecture')}
          title="Architecture Mode: Emphasizes roles, layers, and structural relationships"
        >
          <Layers size={13} />
          <span>Architecture</span>
        </button>
        <button
          className={`graph-mode-btn ${mode === 'dependencies' ? 'active' : ''}`}
          onClick={() => onModeChange('dependencies')}
          title="Dependencies Mode: Emphasizes import paths, coupling, and cycle detection"
        >
          <Boxes size={13} />
          <span>Dependencies</span>
        </button>
      </div>

      <div className="graph-toolbar-divider" />

      {/* Quick Toggles */}
      <div className="graph-toggles-group">
        <label
          className={`graph-toggle-chip ${filters.showExternal ? 'active' : ''}`}
          title="Toggle display of external npm packages"
        >
          <input
            type="checkbox"
            checked={filters.showExternal}
            onChange={(e) => onFilterChange({ showExternal: e.target.checked })}
          />
          <Package size={12} />
          <span>External Packages</span>
        </label>

        <label
          className={`graph-toggle-chip ${filters.entryPointsOnly ? 'active' : ''}`}
          title="Filter to entry points and their connected neighborhood"
        >
          <input
            type="checkbox"
            checked={filters.entryPointsOnly}
            onChange={(e) => onFilterChange({ entryPointsOnly: e.target.checked })}
          />
          <GitFork size={12} />
          <span>Entry Points Only</span>
        </label>
      </div>

      <div className="graph-toolbar-divider" />

      {/* Zoom / View Controls */}
      <div className="graph-view-btn-group">
        <button className="graph-btn-icon" onClick={onZoomIn} title="Zoom In">
          <ZoomIn size={14} />
        </button>
        <button className="graph-btn-icon" onClick={onZoomOut} title="Zoom Out">
          <ZoomOut size={14} />
        </button>
        <button className="graph-btn-icon" onClick={onFitGraph} title="Fit Graph in View">
          <Maximize2 size={14} />
        </button>
        <button className="graph-btn-icon" onClick={onResetView} title="Reset View">
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Live Graph Stats Badge */}
      <div className="graph-stats-badge">
        <span>{totalNodes} Nodes</span>
        <span>•</span>
        <span>{totalEdges} Edges</span>
        {entryPointCount > 0 && (
          <>
            <span>•</span>
            <span style={{ color: 'var(--accent-green)' }}>{entryPointCount} Entry Points</span>
          </>
        )}
        {cycleCount > 0 && (
          <>
            <span>•</span>
            <span
              style={{
                color: 'var(--accent-amber)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <ShieldAlert size={11} />
              {cycleCount} Cycles
            </span>
          </>
        )}
      </div>
    </div>
  );
};
