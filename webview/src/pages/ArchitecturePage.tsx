import React, { useMemo, useState } from 'react';
import {
  Layers,
  FileCode,
  ArrowRight,
  GitCommit,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Compass,
  Zap,
  Boxes,
  Network,
  HelpCircle,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { MetricCard } from '../components/MetricCard';
import {
  ArchitecturalModule,
  ArchitecturalRelationshipType,
  NavigationTab,
  ProjectStatePayload,
} from '../types';

interface PageProps {
  state: ProjectStatePayload;
  onOpenFile: (path: string, line?: number) => void;
  onAnalyze: () => void;
  onNavigateTab?: (tab: NavigationTab) => void;
}

type ArchSubView = 'layers' | 'modules' | 'relationships' | 'entrypoints';

export const ArchitecturePage: React.FC<PageProps> = ({ state, onOpenFile, onAnalyze }) => {
  const { info, analysis, isAnalyzing } = state;
  const arch = analysis?.architecture;
  const summary = arch?.summary;

  const [activeSubView, setActiveSubView] = useState<ArchSubView>('layers');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedRelTypeFilter, setSelectedRelTypeFilter] = useState<string>('all');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const toggleExpand = (modPath: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(modPath)) {
        next.delete(modPath);
      } else {
        next.add(modPath);
      }
      return next;
    });
  };

  // Filtered Modules
  const filteredModules = useMemo(() => {
    if (!arch) {
      return [];
    }
    const list = Object.values(arch.modules);
    return list.filter((mod: ArchitecturalModule) => {
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = mod.path.toLowerCase().includes(query);
        const matchesRole = mod.primaryRole.toLowerCase().includes(query);
        if (!matchesName && !matchesRole) {
          return false;
        }
      }

      if (selectedRoleFilter !== 'all' && mod.primaryRole !== selectedRoleFilter) {
        return false;
      }

      return true;
    });
  }, [arch, searchTerm, selectedRoleFilter]);

  // Filtered Relationships
  const filteredRelationships = useMemo(() => {
    if (!arch) {
      return [];
    }
    return arch.relationships.filter((rel) => {
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesSource = rel.sourcePath.toLowerCase().includes(query);
        const matchesTarget = rel.targetPath.toLowerCase().includes(query);
        const matchesType = rel.type.toLowerCase().includes(query);
        if (!matchesSource && !matchesTarget && !matchesType) {
          return false;
        }
      }

      if (selectedRelTypeFilter !== 'all' && rel.type !== selectedRelTypeFilter) {
        return false;
      }

      return true;
    });
  }, [arch, searchTerm, selectedRelTypeFilter]);

  if (!info.isWorkspaceOpen || !info.isAnalyzed || !arch) {
    return (
      <div className="section-view">
        <EmptyState
          isWorkspaceOpen={info.isWorkspaceOpen}
          isAnalyzed={info.isAnalyzed}
          isAnalyzing={isAnalyzing}
          onAnalyze={onAnalyze}
        />
      </div>
    );
  }

  const activeRoles = Object.entries(summary?.roleDistribution || {}).filter(
    ([, count]) => (count as number) > 0
  );

  return (
    <div className="section-view">
      {/* Section Header */}
      <div className="section-header">
        <div className="section-title-wrap">
          <Layers size={18} color="#06b6d4" />
          <h2 className="section-title">Architecture & Structural Relationships</h2>
          <span className="section-badge">{summary?.layersCount || 0} Layers Observable</span>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="overview-grid">
        <MetricCard
          label="Total Modules"
          value={summary?.totalModules ?? 0}
          subtitle="Analyzed codebase files"
          icon={<FileCode />}
        />
        <MetricCard
          label="Classified Roles"
          value={summary?.classifiedModulesCount ?? 0}
          subtitle={
            summary?.totalModules
              ? `${Math.round(((summary.classifiedModulesCount || 0) / summary.totalModules) * 100)}% classified`
              : 'Role classification'
          }
          icon={<Boxes />}
        />
        <MetricCard
          label="Architectural Layers"
          value={summary?.layersCount ?? 0}
          subtitle="Observable tiers"
          icon={<Layers />}
        />
        <MetricCard
          label="Derived Relationships"
          value={summary?.relationshipsCount ?? 0}
          subtitle="High-level interactions"
          icon={<Network />}
        />
        <MetricCard
          label="Entry Points"
          value={summary?.entryPointsCount ?? 0}
          subtitle="App routes & main scripts"
          icon={<Compass />}
        />
        <MetricCard
          label="Unclassified"
          value={summary?.unclassifiedModulesCount ?? 0}
          subtitle="Neutral/generic files"
          icon={<HelpCircle />}
        />
      </div>

      {/* Sub-view Navigation Toolbar */}
      <div className="dep-tabs-bar">
        <button
          className={`dep-tab-btn ${activeSubView === 'layers' ? 'active' : ''}`}
          onClick={() => {
            setActiveSubView('layers');
            setSearchTerm('');
          }}
        >
          <Layers size={14} />
          <span>Observed Layers & Structure</span>
          <span className="dep-badge">{summary?.layersCount || 0}</span>
        </button>

        <button
          className={`dep-tab-btn ${activeSubView === 'modules' ? 'active' : ''}`}
          onClick={() => {
            setActiveSubView('modules');
            setSearchTerm('');
          }}
        >
          <Boxes size={14} />
          <span>Module Roles</span>
          <span className="dep-badge">{summary?.classifiedModulesCount || 0}</span>
        </button>

        <button
          className={`dep-tab-btn ${activeSubView === 'relationships' ? 'active' : ''}`}
          onClick={() => {
            setActiveSubView('relationships');
            setSearchTerm('');
          }}
        >
          <Network size={14} />
          <span>Relationships</span>
          <span className="dep-badge">{summary?.relationshipsCount || 0}</span>
        </button>

        <button
          className={`dep-tab-btn ${activeSubView === 'entrypoints' ? 'active' : ''}`}
          onClick={() => {
            setActiveSubView('entrypoints');
            setSearchTerm('');
          }}
        >
          <Zap size={14} />
          <span>Entry Points & Hotspots</span>
          <span className="dep-badge">{summary?.entryPointsCount || 0}</span>
        </button>
      </div>

      {/* SUBVIEW 1: OBSERVED STRUCTURE & LAYERS */}
      {activeSubView === 'layers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Factual Observed Structure Box */}
          {summary?.observedStructure && summary.observedStructure.length > 0 && (
            <div className="arch-obs-box">
              <div className="arch-obs-title">
                <ShieldCheck size={16} />
                <span>Observed Codebase Architecture</span>
              </div>
              <ul className="arch-obs-list">
                {summary.observedStructure.map((obs, i) => (
                  <li key={i}>{obs}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Architectural Layer Cards */}
          <div className="arch-layers-grid">
            {arch.layers.map((layerGroup) => (
              <div key={layerGroup.id} className="arch-layer-card">
                <div className="arch-layer-header">
                  <div className="arch-layer-title">
                    <Layers size={16} color="var(--accent-blue)" />
                    <span>{layerGroup.name}</span>
                  </div>
                  <span className="dep-badge">{layerGroup.modulePaths.length} modules</span>
                </div>

                <div className="arch-layer-desc">{layerGroup.description}</div>

                <div className="arch-layer-chips">
                  {layerGroup.modulePaths.map((modPath) => (
                    <span
                      key={modPath}
                      className="arch-module-chip"
                      onClick={() => onOpenFile(modPath)}
                      title={`Open ${modPath} in VS Code editor`}
                    >
                      {modPath}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 2: MODULE ROLES */}
      {activeSubView === 'modules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="tree-toolbar">
            <div className="tree-search-wrap">
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                className="tree-search-input"
                placeholder="Search module path or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                overflowX: 'auto',
                maxWidth: '100%',
              }}
            >
              <button
                className={`filter-btn ${selectedRoleFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedRoleFilter('all')}
              >
                All ({summary?.totalModules || 0})
              </button>
              {activeRoles.map(([role, count]) => (
                <button
                  key={role}
                  className={`filter-btn ${selectedRoleFilter === role ? 'active' : ''}`}
                  onClick={() => setSelectedRoleFilter(role)}
                >
                  {role.replace('_', ' ')} ({count})
                </button>
              ))}
            </div>
          </div>

          <div className="dep-card-list">
            {filteredModules.map((mod) => {
              const isExpanded = expandedModules.has(mod.path);
              return (
                <div key={mod.id} className="dep-file-card">
                  <div className="dep-file-header">
                    <div className="dep-file-name-wrap" onClick={() => toggleExpand(mod.path)}>
                      {mod.evidence.length > 0 ? (
                        isExpanded ? (
                          <ChevronDown size={14} color="var(--text-muted)" />
                        ) : (
                          <ChevronRight size={14} color="var(--text-muted)" />
                        )
                      ) : (
                        <span style={{ width: '14px' }} />
                      )}
                      <FileCode size={15} color="var(--accent-blue)" />
                      <span
                        className="dep-file-path"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenFile(mod.path);
                        }}
                        title="Click to open file in editor"
                      >
                        {mod.path}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`arch-role-badge ${mod.primaryRole}`}>
                        {mod.primaryRole.replace('_', ' ')}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {mod.layer.replace('_', ' ')}
                      </span>
                      <span
                        className="dep-pill outgoing"
                        title="Outgoing local imports"
                        style={{ fontSize: '10px', padding: '1px 6px' }}
                      >
                        <ArrowRight size={10} /> {mod.fanOut}
                      </span>
                      <span
                        className="dep-pill incoming"
                        title="Incoming importers"
                        style={{ fontSize: '10px', padding: '1px 6px' }}
                      >
                        <GitCommit size={10} /> {mod.fanIn}
                      </span>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '10px', padding: '2px 6px' }}
                        onClick={() => onOpenFile(mod.path)}
                        title="Open file in editor"
                      >
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Classification Evidence */}
                  {isExpanded && (
                    <div className="dep-edges-list">
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                          marginBottom: '2px',
                        }}
                      >
                        Classification Evidence ({Math.round(mod.confidence * 100)}% Confidence •{' '}
                        {mod.confidenceLevel.toUpperCase()}):
                      </div>
                      {mod.evidence.map((ev, i) => (
                        <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          ✓ {ev}
                        </div>
                      ))}
                      {mod.secondaryRoles.length > 0 && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            marginTop: '4px',
                          }}
                        >
                          Secondary roles:{' '}
                          {mod.secondaryRoles.map((r) => r.replace('_', ' ')).join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBVIEW 3: RELATIONSHIPS */}
      {activeSubView === 'relationships' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="tree-toolbar">
            <div className="tree-search-wrap">
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                className="tree-search-input"
                placeholder="Search source or target..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                className={`filter-btn ${selectedRelTypeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedRelTypeFilter('all')}
              >
                All ({arch.relationships.length})
              </button>
              {(
                [
                  'renders',
                  'uses',
                  'calls',
                  'consumes',
                  'provides',
                  'tests',
                  'implements',
                  'imports',
                ] as ArchitecturalRelationshipType[]
              ).map((type) => {
                const count = arch.relationships.filter((r) => r.type === type).length;
                if (count === 0) {
                  return null;
                }
                return (
                  <button
                    key={type}
                    className={`filter-btn ${selectedRelTypeFilter === type ? 'active' : ''}`}
                    onClick={() => setSelectedRelTypeFilter(type)}
                  >
                    {type} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="arch-rel-list">
            {filteredRelationships.map((rel) => (
              <div key={rel.id} className="arch-rel-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="arch-rel-badge">{rel.type}</span>
                  <span
                    className="arch-rel-path"
                    onClick={() => onOpenFile(rel.sourcePath, rel.lineNumber)}
                    title={`Open ${rel.sourcePath}`}
                  >
                    {rel.sourcePath}
                  </span>
                  <ArrowRight size={12} color="var(--text-muted)" />
                  <span
                    className="arch-rel-path"
                    onClick={() => onOpenFile(rel.targetPath)}
                    title={`Open ${rel.targetPath}`}
                  >
                    {rel.targetPath}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {rel.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 4: ENTRY POINTS & HOTSPOTS */}
      {activeSubView === 'entrypoints' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Entry Points */}
          <div className="status-panel">
            <div className="status-title-group">
              <h3 className="status-title" style={{ fontSize: '14px' }}>
                Application Entry Points ({arch.entryPoints.length})
              </h3>
              <p className="status-description">
                Discovered HTTP route controllers, main scripts, and root layout handlers.
              </p>
            </div>

            <div className="dep-card-list">
              {arch.entryPoints.map((entry) => (
                <div key={entry.id} className="dep-file-card">
                  <div className="dep-file-header">
                    <div
                      className="dep-file-name-wrap"
                      onClick={() => onOpenFile(entry.path)}
                      title="Open in editor"
                    >
                      <Compass size={15} color="var(--accent-green)" />
                      <span className="dep-file-path">{entry.path}</span>
                      <span className={`arch-role-badge ${entry.primaryRole}`}>
                        {entry.primaryRole.replace('_', ' ')}
                      </span>
                    </div>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '10px', padding: '2px 6px' }}
                      onClick={() => onOpenFile(entry.path)}
                    >
                      <ExternalLink size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Fan-In and Fan-Out Hotspots */}
          <div className="blueprint-grid">
            <div className="blueprint-card">
              <div className="blueprint-card-title">
                <GitCommit size={16} color="#3b82f6" />
                <span>High Fan-In Modules (Core Dependencies)</span>
              </div>
              <div className="blueprint-card-body">
                Modules imported most frequently across the codebase:
              </div>
              <div className="dep-card-list" style={{ marginTop: '8px' }}>
                {summary?.highFanInModules.map((m) => (
                  <div
                    key={m.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <span
                      className="arch-rel-path"
                      onClick={() => onOpenFile(m.path)}
                      title="Open in editor"
                    >
                      {m.path}
                    </span>
                    <span className="dep-pill incoming">{m.fanIn} importers</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="blueprint-card">
              <div className="blueprint-card-title">
                <ArrowRight size={16} color="#ec4899" />
                <span>High Fan-Out Modules (High Orchestration)</span>
              </div>
              <div className="blueprint-card-body">
                Modules with the greatest number of outgoing dependencies:
              </div>
              <div className="dep-card-list" style={{ marginTop: '8px' }}>
                {summary?.highFanOutModules.map((m) => (
                  <div
                    key={m.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <span
                      className="arch-rel-path"
                      onClick={() => onOpenFile(m.path)}
                      title="Open in editor"
                    >
                      {m.path}
                    </span>
                    <span className="dep-pill outgoing">{m.fanOut} imports</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
