import React, { useState, useMemo } from 'react';
import {
  Sliders,
  FileCode,
  ShieldCheck,
  Lock,
  Search,
  ExternalLink,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Play,
  RefreshCw,
} from 'lucide-react';
import { ConfigCategory, ProjectConfigFile, ProjectStatePayload } from '../types';

interface PageProps {
  state: ProjectStatePayload;
  onOpenFile?: (path: string, line?: number) => void;
  onAnalyze?: () => void;
}

const CATEGORY_NAMES: Record<ConfigCategory, string> = {
  package: 'Package & Dependencies',
  compiler: 'Compiler & Transpilation',
  framework: 'Framework Configuration',
  build: 'Build Tools & Bundlers',
  styling: 'Styling & PostCSS',
  linting: 'Linting & Code Quality',
  formatting: 'Code Formatting',
  deployment: 'Deployment & Hosting',
  database: 'Database & Cloud Data',
  cloud: 'Cloud Infrastructure',
  container: 'Containers & Docker',
  runtime: 'Runtime Environments',
  testing: 'Testing Frameworks',
  other: 'Other Configurations',
};

export const ConfigurationPage: React.FC<PageProps> = ({ state, onOpenFile, onAnalyze }) => {
  const { info, analysis } = state;
  const configAnalysis = analysis?.configurationAnalysis;
  const envAnalysis = analysis?.environmentAnalysis;

  const [activeSubTab, setActiveSubTab] = useState<'configs' | 'environment'>('configs');
  const [configSearch, setConfigSearch] = useState('');
  const [selectedConfigCat, setSelectedConfigCat] = useState<string>('ALL');

  const [envSearch, setEnvSearch] = useState('');
  const [selectedEnvStatus, setSelectedEnvStatus] = useState<string>('ALL');
  const [selectedEnvScope, setSelectedEnvScope] = useState<string>('ALL');

  const configs = useMemo(() => configAnalysis?.configs || [], [configAnalysis]);
  const envVars = useMemo(() => envAnalysis?.variables || [], [envAnalysis]);

  // Filtered configurations
  const filteredConfigs = useMemo(() => {
    return configs.filter((cfg) => {
      if (selectedConfigCat !== 'ALL' && cfg.category !== selectedConfigCat) {
        return false;
      }
      if (configSearch.trim()) {
        const q = configSearch.toLowerCase().trim();
        const matchName = cfg.fileName.toLowerCase().includes(q);
        const matchPath = cfg.filePath.toLowerCase().includes(q);
        const matchTech = cfg.technology.toLowerCase().includes(q);
        const matchPurpose = cfg.purpose.toLowerCase().includes(q);
        return matchName || matchPath || matchTech || matchPurpose;
      }
      return true;
    });
  }, [configs, selectedConfigCat, configSearch]);

  // Group filtered configs by category
  const groupedConfigs = useMemo(() => {
    const groups: { category: ConfigCategory; title: string; items: ProjectConfigFile[] }[] = [];
    const catMap = new Map<ConfigCategory, ProjectConfigFile[]>();

    for (const cfg of filteredConfigs) {
      if (!catMap.has(cfg.category)) {
        catMap.set(cfg.category, []);
      }
      catMap.get(cfg.category)!.push(cfg);
    }

    const order: ConfigCategory[] = [
      'package',
      'compiler',
      'framework',
      'build',
      'styling',
      'linting',
      'formatting',
      'database',
      'deployment',
      'container',
      'cloud',
      'runtime',
      'testing',
      'other',
    ];

    for (const cat of order) {
      if (catMap.has(cat)) {
        groups.push({
          category: cat,
          title: CATEGORY_NAMES[cat] || cat,
          items: catMap.get(cat)!,
        });
      }
    }

    return groups;
  }, [filteredConfigs]);

  // Filtered environment variables
  const filteredEnvVars = useMemo(() => {
    return envVars.filter((v) => {
      if (selectedEnvStatus !== 'ALL' && v.status !== selectedEnvStatus) {
        return false;
      }
      if (selectedEnvScope !== 'ALL' && v.scope !== selectedEnvScope) {
        return false;
      }
      if (envSearch.trim()) {
        const q = envSearch.toLowerCase().trim();
        const matchName = v.name.toLowerCase().includes(q);
        const matchDefined = v.definedInFiles.some((f) => f.toLowerCase().includes(q));
        const matchRef = v.referencedInFiles.some((f) => f.toLowerCase().includes(q));
        return matchName || matchDefined || matchRef;
      }
      return true;
    });
  }, [envVars, selectedEnvStatus, selectedEnvScope, envSearch]);

  // 1. Loading State
  if (state.isAnalyzing) {
    return (
      <div className="section-view">
        <div className="placeholder-box">
          <RefreshCw size={36} color="var(--accent-amber)" className="spin-animation" />
          <h3>Auditing Configurations & Environment</h3>
          <p>Scanning project manifests, build setups, config rules, and environment keys...</p>
        </div>
      </div>
    );
  }

  // 2. Unanalyzed / No Workspace State
  if (!info.isWorkspaceOpen || !info.isAnalyzed || !analysis) {
    return (
      <div className="section-view">
        <div className="placeholder-box">
          <Sliders size={36} color="var(--accent-amber)" />
          <h3>Configuration & Environment Analysis Ready</h3>
          <p>
            {info.isWorkspaceOpen
              ? 'Click "Analyze Project" to inspect all workspace configuration files and safely audit environment variable usage.'
              : 'Open a project workspace in VS Code to analyze configurations.'}
          </p>
          {info.isWorkspaceOpen && onAnalyze && (
            <button
              className="btn btn-primary"
              onClick={onAnalyze}
              style={{
                marginTop: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Play size={13} />
              <span>Analyze Project</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="section-view config-page-container">
      {/* Top Banner */}
      <div className="overview-panel-header" style={{ marginBottom: '1.25rem' }}>
        <div className="overview-panel-title-group">
          <div className="overview-panel-title">
            <Sliders size={18} color="var(--accent-amber)" />
            <span>Configuration & Environment Inspector</span>
            <span className="section-badge">
              {configs.length} Configs • {envVars.length} Env Vars
            </span>
          </div>
          <p className="overview-panel-desc">
            Audits project configurations, build manifests, package rules, and environment variable
            references with strict secret value protection.
          </p>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="config-subtabs-row">
        <button
          className={`config-subtab-btn ${activeSubTab === 'configs' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('configs')}
        >
          <FileCode size={14} />
          <span>Project Configurations</span>
          <span className="subtab-badge">{configs.length}</span>
        </button>

        <button
          className={`config-subtab-btn ${activeSubTab === 'environment' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('environment')}
        >
          <ShieldCheck size={14} color="#10b981" />
          <span>Environment Variables (Secure)</span>
          <span className="subtab-badge">{envVars.length}</span>
        </button>
      </div>

      {/* ========================================== */}
      {/* TAB 1: PROJECT CONFIGURATIONS */}
      {/* ========================================== */}
      {activeSubTab === 'configs' && (
        <div className="config-tab-content">
          {/* Controls / Filter Bar */}
          <div className="api-controls-panel">
            <div className="api-search-wrapper">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search config file, technology, or purpose..."
                value={configSearch}
                onChange={(e) => setConfigSearch(e.target.value)}
              />
              {configSearch && (
                <button className="clear-btn" onClick={() => setConfigSearch('')}>
                  ×
                </button>
              )}
            </div>

            <div className="api-filters-row">
              <div className="filter-group">
                <span className="filter-group-label">
                  <Filter size={12} /> Category:
                </span>
                <button
                  className={`filter-pill ${selectedConfigCat === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSelectedConfigCat('ALL')}
                >
                  <span className="filter-pill-label">All</span>
                  <span className="pill-count">({configs.length})</span>
                </button>
                {Object.keys(configAnalysis?.categoryCounts || {}).map((cat) => {
                  const count = configAnalysis?.categoryCounts[cat as ConfigCategory] || 0;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat}
                      className={`filter-pill ${selectedConfigCat === cat ? 'active' : ''}`}
                      onClick={() => setSelectedConfigCat(cat)}
                    >
                      <span className="filter-pill-label">
                        {CATEGORY_NAMES[cat as ConfigCategory] || cat}
                      </span>
                      <span className="pill-count">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grouped Config Cards */}
          {groupedConfigs.length === 0 ? (
            <div className="empty-filter-state">
              <FileCode size={24} color="var(--text-muted)" />
              <p>No configuration files found matching your criteria.</p>
            </div>
          ) : (
            <div className="config-groups-container">
              {groupedConfigs.map((group) => (
                <div key={group.category} className="config-group-block">
                  <div className="config-group-title-row">
                    <div className="config-group-title">
                      <Layers size={14} color="var(--accent-amber)" />
                      <span>{group.title}</span>
                    </div>
                    <span className="config-group-count">{group.items.length} files</span>
                  </div>

                  <div className="config-cards-grid">
                    {group.items.map((cfg) => (
                      <div key={cfg.id} className="config-item-card">
                        <div className="config-card-header">
                          <div className="config-card-file-info">
                            <FileCode size={16} color="var(--accent-cyan)" />
                            <span className="config-file-name mono-text">{cfg.fileName}</span>
                          </div>
                          <span className="config-tech-badge">{cfg.technology}</span>
                        </div>

                        <div className="config-card-path mono-text" title={cfg.filePath}>
                          {cfg.filePath}
                        </div>

                        <p className="config-card-purpose">{cfg.purpose}</p>

                        <div className="config-card-footer">
                          <span className="config-category-tag">{cfg.category}</span>
                          <button
                            className="btn-open-source"
                            onClick={() => onOpenFile?.(cfg.filePath)}
                            title={`Open ${cfg.filePath}`}
                          >
                            <span>Open File</span>
                            <ExternalLink size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: ENVIRONMENT VARIABLES (SECURE) */}
      {/* ========================================== */}
      {activeSubTab === 'environment' && (
        <div className="env-tab-content">
          {/* Security Notice Callout */}
          <div className="env-security-callout">
            <div className="env-security-left">
              <Lock size={16} color="#10b981" />
              <div>
                <strong>Zero Secret Leakage Guarantee:</strong> Actual variable values and API
                secrets are never read, stored, transmitted, or displayed. Only variable keys and
                code references are audited.
              </div>
            </div>
            <div className="env-files-badge-list">
              <span className="env-files-title">Detected Env Files:</span>
              {envAnalysis?.envFiles && envAnalysis.envFiles.length > 0 ? (
                envAnalysis.envFiles.map((f) => (
                  <span
                    key={f}
                    className="env-file-chip"
                    onClick={() => onOpenFile?.(f)}
                    title={`Click to open ${f}`}
                  >
                    {f}
                  </span>
                ))
              ) : (
                <span className="env-none-text">No .env files detected</span>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="api-stats-grid" style={{ marginBottom: '1rem' }}>
            <div className="api-stat-card">
              <div className="api-stat-label">Total Variables</div>
              <div className="api-stat-val">{envAnalysis?.totalVariables ?? 0}</div>
              <div className="api-stat-sub">Identified environment keys</div>
            </div>
            <div className="api-stat-card">
              <div className="api-stat-label">Declared in .env</div>
              <div className="api-stat-val" style={{ color: '#34d399' }}>
                {envAnalysis?.declaredCount ?? 0}
              </div>
              <div className="api-stat-sub">Defined in project env files</div>
            </div>
            <div className="api-stat-card">
              <div className="api-stat-label">Referenced in Source</div>
              <div className="api-stat-val" style={{ color: '#60a5fa' }}>
                {envAnalysis?.referencedCount ?? 0}
              </div>
              <div className="api-stat-sub">Used via process.env / getenv</div>
            </div>
            <div className="api-stat-card">
              <div className="api-stat-label">Client / Public Scope</div>
              <div className="api-stat-val" style={{ color: 'var(--accent-purple)' }}>
                {envAnalysis?.publicCount ?? 0}
              </div>
              <div className="api-stat-sub">NEXT_PUBLIC_ / VITE_ prefixes</div>
            </div>
            <div className="api-stat-card">
              <div className="api-stat-label">Server / Private Context</div>
              <div className="api-stat-val" style={{ color: '#fb923c' }}>
                {envAnalysis?.privateCount ?? 0}
              </div>
              <div className="api-stat-sub">Server runtime only</div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="api-controls-panel">
            <div className="api-search-wrapper">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search variable name, defined file, or referenced file..."
                value={envSearch}
                onChange={(e) => setEnvSearch(e.target.value)}
              />
              {envSearch && (
                <button className="clear-btn" onClick={() => setEnvSearch('')}>
                  ×
                </button>
              )}
            </div>

            <div className="api-filters-row">
              <div className="filter-group">
                <span className="filter-group-label">
                  <Filter size={12} /> Status:
                </span>
                <button
                  className={`filter-pill ${selectedEnvStatus === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSelectedEnvStatus('ALL')}
                >
                  All ({envVars.length})
                </button>
                <button
                  className={`filter-pill ${selectedEnvStatus === 'declared_and_referenced' ? 'active' : ''}`}
                  onClick={() => setSelectedEnvStatus('declared_and_referenced')}
                >
                  Declared + Referenced
                </button>
                <button
                  className={`filter-pill ${selectedEnvStatus === 'declared_only' ? 'active' : ''}`}
                  onClick={() => setSelectedEnvStatus('declared_only')}
                >
                  Declared Only
                </button>
                <button
                  className={`filter-pill ${selectedEnvStatus === 'referenced_only' ? 'active' : ''}`}
                  onClick={() => setSelectedEnvStatus('referenced_only')}
                >
                  Referenced Only
                </button>
              </div>

              <div className="filter-group">
                <span className="filter-group-label">
                  <ShieldCheck size={12} /> Scope:
                </span>
                <button
                  className={`filter-pill ${selectedEnvScope === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSelectedEnvScope('ALL')}
                >
                  All
                </button>
                <button
                  className={`filter-pill ${selectedEnvScope === 'public' ? 'active' : ''}`}
                  onClick={() => setSelectedEnvScope('public')}
                >
                  Public / Client
                </button>
                <button
                  className={`filter-pill ${selectedEnvScope === 'private' ? 'active' : ''}`}
                  onClick={() => setSelectedEnvScope('private')}
                >
                  Server / Private
                </button>
              </div>
            </div>
          </div>

          {/* Env Vars Table */}
          {filteredEnvVars.length === 0 ? (
            <div className="empty-filter-state">
              <ShieldCheck size={24} color="var(--text-muted)" />
              <p>
                {envVars.length === 0
                  ? 'No environment variables detected in .env files or code references.'
                  : 'No variables match your current filter and search query.'}
              </p>
            </div>
          ) : (
            <div className="env-table-wrapper">
              <table className="env-table">
                <thead>
                  <tr>
                    <th>Variable Name</th>
                    <th>Status</th>
                    <th>Scope</th>
                    <th>Value Protection</th>
                    <th>Defined In</th>
                    <th>Referenced In</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnvVars.map((v) => {
                    const isPublic = v.scope === 'public';
                    return (
                      <tr key={v.name}>
                        <td className="env-var-name-cell">
                          <span className="mono-text env-var-name">{v.name}</span>
                        </td>
                        <td>
                          {v.status === 'declared_and_referenced' && (
                            <span className="env-status-badge status-good">
                              <CheckCircle2 size={11} /> Declared + Referenced
                            </span>
                          )}
                          {v.status === 'declared_only' && (
                            <span className="env-status-badge status-neutral">Declared Only</span>
                          )}
                          {v.status === 'referenced_only' && (
                            <span
                              className="env-status-badge status-warn"
                              title="Not found in analyzed environment files"
                            >
                              <AlertTriangle size={11} /> Not in .env files
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`env-scope-badge ${isPublic ? 'scope-public' : 'scope-private'}`}
                          >
                            {isPublic ? 'Client / Public' : 'Server / Private'}
                          </span>
                        </td>
                        <td>
                          <span className="env-value-masked">
                            <Lock size={10} />
                            <span>Hidden / Protected</span>
                          </span>
                        </td>
                        <td>
                          {v.definedInFiles.length > 0 ? (
                            <div className="env-file-links">
                              {v.definedInFiles.map((f) => (
                                <span
                                  key={f}
                                  className="file-link-chip"
                                  onClick={() => onOpenFile?.(f)}
                                  title={`Open ${f}`}
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          {v.referencedInFiles.length > 0 ? (
                            <div className="env-file-links">
                              {v.referencedInFiles.map((f) => (
                                <span
                                  key={f}
                                  className="file-link-chip"
                                  onClick={() => onOpenFile?.(f)}
                                  title={`Open ${f}`}
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
