import React, { useMemo, useState } from 'react';
import {
  Package,
  FileCode,
  ArrowRight,
  GitCommit,
  AlertTriangle,
  CheckCircle2,
  Search,
  ExternalLink,
  HelpCircle,
  FolderSync,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { MetricCard } from '../components/MetricCard';
import { FileModuleNode, ProjectStatePayload } from '../types';

interface PageProps {
  state: ProjectStatePayload;
  onOpenFile: (path: string, line?: number) => void;
  onAnalyze: () => void;
}

type DepSubView = 'local' | 'external' | 'circular' | 'unresolved';
type LocalFilterType = 'all' | 'has_outgoing' | 'has_incoming' | 'isolated';

export const DependenciesPage: React.FC<PageProps> = ({ state, onOpenFile, onAnalyze }) => {
  const { info, analysis, isAnalyzing } = state;
  const depGraph = analysis?.dependencyGraph;
  const stats = depGraph?.stats;

  const [activeSubView, setActiveSubView] = useState<DepSubView>('local');
  const [searchTerm, setSearchTerm] = useState('');
  const [localFilter, setLocalFilter] = useState<LocalFilterType>('all');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // Toggle file expansion
  const toggleExpand = (filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!depGraph) {
      return;
    }
    const all = new Set(Object.keys(depGraph.nodes));
    setExpandedFiles(all);
  };

  const collapseAll = () => {
    setExpandedFiles(new Set());
  };

  // Filtered Local Nodes
  const filteredNodes = useMemo(() => {
    if (!depGraph) {
      return [];
    }
    const list = Object.values(depGraph.nodes);
    return list.filter((node: FileModuleNode) => {
      // Search match
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = node.path.toLowerCase().includes(query);
        const matchesEdge = node.outgoingEdges.some(
          (e) =>
            e.specifier.toLowerCase().includes(query) ||
            (e.targetFilePath && e.targetFilePath.toLowerCase().includes(query))
        );
        if (!matchesName && !matchesEdge) {
          return false;
        }
      }

      // Filter match
      if (localFilter === 'has_outgoing') {
        return node.dependenciesCount > 0;
      }
      if (localFilter === 'has_incoming') {
        return node.importedByCount > 0;
      }
      if (localFilter === 'isolated') {
        return node.dependenciesCount === 0 && node.importedByCount === 0;
      }

      return true;
    });
  }, [depGraph, searchTerm, localFilter]);

  // Filtered External Packages
  const filteredPackages = useMemo(() => {
    if (!depGraph) {
      return [];
    }
    return depGraph.externalPackages.filter((pkg) => {
      if (!searchTerm) {
        return true;
      }
      const query = searchTerm.toLowerCase();
      return (
        pkg.name.toLowerCase().includes(query) ||
        pkg.importedBy.some((f) => f.toLowerCase().includes(query))
      );
    });
  }, [depGraph, searchTerm]);

  // Filtered Unresolved Imports
  const filteredUnresolved = useMemo(() => {
    if (!depGraph) {
      return [];
    }
    return depGraph.unresolvedImports.filter((item) => {
      if (!searchTerm) {
        return true;
      }
      const query = searchTerm.toLowerCase();
      return (
        item.specifier.toLowerCase().includes(query) ||
        item.sourceFilePath.toLowerCase().includes(query)
      );
    });
  }, [depGraph, searchTerm]);

  if (!info.isWorkspaceOpen || !info.isAnalyzed || !depGraph) {
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

  return (
    <div className="section-view">
      {/* Section Header */}
      <div className="section-header">
        <div className="section-title-wrap">
          <Package size={18} color="#8b5cf6" />
          <h2 className="section-title">Code Dependencies & Import Graph</h2>
          <span className="section-badge">{stats?.totalLocalEdges || 0} Local Edges</span>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="overview-grid">
        <MetricCard
          label="Local Edges"
          value={stats?.totalLocalEdges ?? 0}
          subtitle="Direct file-to-file relationships"
          icon={<GitCommit />}
        />
        <MetricCard
          label="Analyzed Files"
          value={stats?.analyzedFilesCount ?? 0}
          subtitle="Parsed source modules"
          icon={<FileCode />}
        />
        <MetricCard
          label="External Packages"
          value={stats?.totalExternalPackages ?? 0}
          subtitle="Third-party & runtime libraries"
          icon={<Package />}
        />
        <MetricCard
          label="Circular Cycles"
          value={stats?.circularDependenciesCount ?? 0}
          subtitle={
            (stats?.circularDependenciesCount ?? 0) > 0
              ? 'Cyclic dependency groups found'
              : 'Acyclic architecture'
          }
          icon={
            (stats?.circularDependenciesCount ?? 0) > 0 ? (
              <AlertTriangle color="#f59e0b" />
            ) : (
              <CheckCircle2 color="#22c55e" />
            )
          }
        />
        <MetricCard
          label="With Dependencies"
          value={stats?.filesWithDependenciesCount ?? 0}
          subtitle="Modules with outgoing imports"
          icon={<ArrowRight />}
        />
        <MetricCard
          label="Unresolved Imports"
          value={stats?.unresolvedImportsCount ?? 0}
          subtitle="Missing or broken local paths"
          icon={
            (stats?.unresolvedImportsCount ?? 0) > 0 ? (
              <HelpCircle color="#f87171" />
            ) : (
              <CheckCircle2 color="#22c55e" />
            )
          }
        />
        <MetricCard
          label="Root Entry Modules"
          value={stats?.filesWithNoIncomingCount ?? 0}
          subtitle="0 incoming importers"
          icon={<Layers />}
        />
        <MetricCard
          label="Leaf Modules"
          value={stats?.filesWithNoOutgoingCount ?? 0}
          subtitle="0 outgoing imports"
          icon={<CheckCircle2 />}
        />
      </div>

      {/* Sub-view Navigation Toolbar */}
      <div className="dep-tabs-bar">
        <button
          className={`dep-tab-btn ${activeSubView === 'local' ? 'active' : ''}`}
          onClick={() => {
            setActiveSubView('local');
            setSearchTerm('');
          }}
        >
          <FileCode size={14} />
          <span>Local File Imports</span>
          <span className="dep-badge">{stats?.totalLocalEdges || 0}</span>
        </button>

        <button
          className={`dep-tab-btn ${activeSubView === 'external' ? 'active' : ''}`}
          onClick={() => {
            setActiveSubView('external');
            setSearchTerm('');
          }}
        >
          <Package size={14} />
          <span>External Packages</span>
          <span className="dep-badge">{stats?.totalExternalPackages || 0}</span>
        </button>

        <button
          className={`dep-tab-btn ${activeSubView === 'circular' ? 'active' : ''}`}
          onClick={() => {
            setActiveSubView('circular');
            setSearchTerm('');
          }}
        >
          <FolderSync size={14} />
          <span>Circular Cycles</span>
          <span
            className={`dep-badge ${(stats?.circularDependenciesCount ?? 0) > 0 ? 'warning' : ''}`}
          >
            {stats?.circularDependenciesCount || 0}
          </span>
        </button>

        <button
          className={`dep-tab-btn ${activeSubView === 'unresolved' ? 'active' : ''}`}
          onClick={() => {
            setActiveSubView('unresolved');
            setSearchTerm('');
          }}
        >
          <HelpCircle size={14} />
          <span>Unresolved</span>
          <span className={`dep-badge ${(stats?.unresolvedImportsCount ?? 0) > 0 ? 'danger' : ''}`}>
            {stats?.unresolvedImportsCount || 0}
          </span>
        </button>
      </div>

      {/* SUBVIEW 1: LOCAL FILE IMPORTS */}
      {activeSubView === 'local' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Filter & Search Bar */}
          <div className="tree-toolbar">
            <div className="tree-search-wrap">
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                className="tree-search-input"
                placeholder="Search files or import specifiers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                className={`filter-btn ${localFilter === 'all' ? 'active' : ''}`}
                onClick={() => setLocalFilter('all')}
              >
                All ({Object.keys(depGraph.nodes).length})
              </button>
              <button
                className={`filter-btn ${localFilter === 'has_outgoing' ? 'active' : ''}`}
                onClick={() => setLocalFilter('has_outgoing')}
              >
                Has Outgoing ({stats?.filesWithDependenciesCount || 0})
              </button>
              <button
                className={`filter-btn ${localFilter === 'has_incoming' ? 'active' : ''}`}
                onClick={() => setLocalFilter('has_incoming')}
              >
                Has Importers (
                {(stats?.analyzedFilesCount || 0) - (stats?.filesWithNoIncomingCount || 0)})
              </button>
              <button
                className={`filter-btn ${localFilter === 'isolated' ? 'active' : ''}`}
                onClick={() => setLocalFilter('isolated')}
              >
                Isolated
              </button>
            </div>

            <div className="tree-actions">
              <button
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={expandAll}
              >
                Expand All
              </button>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={collapseAll}
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* List of File Modules */}
          {filteredNodes.length === 0 ? (
            <div className="empty-state-box">
              <FileCode className="empty-state-icon" />
              <div className="empty-state-title">No matching source files</div>
              <div className="empty-state-text">
                No files matched your search or filter criteria.
              </div>
            </div>
          ) : (
            <div className="dep-card-list">
              {filteredNodes.map((node) => {
                const isExpanded = expandedFiles.has(node.path);
                const resolvedOutgoing = node.outgoingEdges.filter(
                  (e) => e.resolution === 'resolved'
                );

                return (
                  <div key={node.id} className="dep-file-card">
                    <div className="dep-file-header">
                      <div className="dep-file-name-wrap" onClick={() => toggleExpand(node.path)}>
                        {resolvedOutgoing.length > 0 ? (
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
                            onOpenFile(node.path);
                          }}
                          title="Click to open file in VS Code editor"
                        >
                          {node.path}
                        </span>
                        <span className={`category-badge ${node.language}`}>{node.language}</span>
                      </div>

                      <div className="dep-counts-row">
                        <span
                          className="dep-pill outgoing"
                          title="Outgoing local file dependencies"
                        >
                          <ArrowRight size={12} />
                          {node.dependenciesCount} imports
                        </span>
                        <span
                          className="dep-pill incoming"
                          title="Incoming modules importing this file"
                        >
                          <GitCommit size={12} />
                          {node.importedByCount} imported by
                        </span>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '10px', padding: '2px 6px' }}
                          onClick={() => onOpenFile(node.path)}
                          title="Open file in editor"
                        >
                          <ExternalLink size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Outgoing Dependencies */}
                    {isExpanded && resolvedOutgoing.length > 0 && (
                      <div className="dep-edges-list">
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            marginBottom: '4px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Direct Imports ({resolvedOutgoing.length})
                        </div>
                        {resolvedOutgoing.map((edge) => (
                          <div key={edge.id} className="dep-edge-row">
                            <div
                              className="dep-edge-target"
                              onClick={() => {
                                if (edge.targetFilePath) {
                                  onOpenFile(edge.targetFilePath, edge.lineNumber);
                                }
                              }}
                              title={`Open ${edge.targetFilePath} in editor`}
                            >
                              <ArrowRight size={12} color="var(--text-muted)" />
                              <span>{edge.targetFilePath}</span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  color: 'var(--text-muted)',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                (from &apos;{edge.specifier}&apos;)
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {edge.isTypeOnly && (
                                <span className="dep-type-chip type-only">type</span>
                              )}
                              <span className="dep-type-chip">{edge.type}</span>
                              {edge.lineNumber && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    color: 'var(--text-muted)',
                                    fontFamily: 'var(--font-mono)',
                                  }}
                                >
                                  L:{edge.lineNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 2: EXTERNAL PACKAGES */}
      {activeSubView === 'external' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="tree-toolbar">
            <div className="tree-search-wrap">
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                className="tree-search-input"
                placeholder="Search packages or importing files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing {filteredPackages.length} packages
            </div>
          </div>

          {filteredPackages.length === 0 ? (
            <div className="empty-state-box">
              <Package className="empty-state-icon" />
              <div className="empty-state-title">No external packages found</div>
              <div className="empty-state-text">No third-party packages matched your filter.</div>
            </div>
          ) : (
            <div className="pkg-grid">
              {filteredPackages.map((pkg) => (
                <div key={pkg.name} className="pkg-card">
                  <div className="pkg-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={15} color="#8b5cf6" />
                      <span className="pkg-name">{pkg.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {pkg.isTypeOnly && <span className="dep-type-chip type-only">type</span>}
                      <span className="dep-badge">
                        {pkg.count} {pkg.count === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                  </div>

                  <div className="pkg-importers">
                    <div
                      style={{
                        fontSize: '10px',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        marginBottom: '2px',
                      }}
                    >
                      Imported in:
                    </div>
                    {pkg.importedBy.map((importer) => (
                      <div
                        key={importer}
                        className="pkg-importer-item"
                        onClick={() => onOpenFile(importer)}
                        title={`Click to open ${importer}`}
                      >
                        📄 {importer}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 3: CIRCULAR DEPENDENCIES */}
      {activeSubView === 'circular' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {depGraph.circularGroups.length === 0 ? (
            <div className="empty-state-box" style={{ borderColor: 'rgba(34, 197, 94, 0.3)' }}>
              <CheckCircle2 size={32} color="var(--accent-green)" />
              <div className="empty-state-title">No Circular Dependencies Detected</div>
              <div className="empty-state-text">
                Great architecture! Project DNA verified that all local imports in your codebase
                form a strictly acyclic dependency graph.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                className="info-callout"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  borderColor: 'rgba(245, 158, 11, 0.25)',
                  color: '#fbbf24',
                }}
              >
                <AlertTriangle size={16} />
                <div>
                  <strong>{depGraph.circularGroups.length} Circular Cycles Detected: </strong>
                  Modules that circularly depend on each other can cause runtime initialization
                  delays or undefined exports.
                </div>
              </div>

              {depGraph.circularGroups.map((group, index) => (
                <div key={group.id} className="dep-cycle-box">
                  <div className="dep-cycle-header">
                    <FolderSync size={15} />
                    <span>
                      Cycle #{index + 1} ({group.length} {group.length === 1 ? 'node' : 'nodes'})
                    </span>
                  </div>

                  <div className="dep-cycle-chain">
                    {group.cycle.map((nodePath, i) => (
                      <React.Fragment key={nodePath + ':' + i}>
                        <span
                          className="dep-cycle-node"
                          onClick={() => onOpenFile(nodePath)}
                          title={`Open ${nodePath} in editor`}
                        >
                          {nodePath}
                        </span>
                        {i < group.cycle.length - 1 && <span className="dep-cycle-arrow">➔</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 4: UNRESOLVED IMPORTS */}
      {activeSubView === 'unresolved' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredUnresolved.length === 0 ? (
            <div className="empty-state-box" style={{ borderColor: 'rgba(34, 197, 94, 0.3)' }}>
              <CheckCircle2 size={32} color="var(--accent-green)" />
              <div className="empty-state-title">All Local Imports Resolved</div>
              <div className="empty-state-text">
                Every relative import and path alias in your project resolves to an existing file in
                the workspace.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                className="info-callout"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderColor: 'rgba(239, 68, 68, 0.25)',
                  color: '#f87171',
                }}
              >
                <HelpCircle size={16} />
                <div>
                  <strong>{filteredUnresolved.length} Unresolved Import Specifiers: </strong>
                  These relative or alias imports could not be mapped to existing files on disk.
                </div>
              </div>

              <div className="dep-card-list">
                {filteredUnresolved.map((item) => (
                  <div key={item.id} className="dep-file-card">
                    <div className="dep-file-header">
                      <div
                        className="dep-file-name-wrap"
                        onClick={() => onOpenFile(item.sourceFilePath, item.lineNumber)}
                      >
                        <AlertTriangle size={15} color="#f87171" />
                        <span className="dep-file-path">{item.sourceFilePath}</span>
                        {item.lineNumber && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            Line {item.lineNumber}
                          </span>
                        )}
                      </div>

                      <span className="dep-badge danger">Unresolved</span>
                    </div>

                    <div
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '4px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        color: '#fca5a5',
                      }}
                    >
                      Import specifier: <code>&apos;{item.specifier}&apos;</code>
                    </div>
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
