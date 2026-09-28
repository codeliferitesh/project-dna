import React, { useState, useMemo } from 'react';
import {
  Network,
  Search,
  ExternalLink,
  Filter,
  CheckCircle2,
  AlertCircle,
  Code,
  Layers,
  ChevronDown,
  ChevronRight,
  Zap,
  RefreshCw,
  Play,
  Info,
} from 'lucide-react';
import { HttpMethod, ProjectStatePayload } from '../types';

interface PageProps {
  state: ProjectStatePayload;
  onOpenFile?: (path: string, line?: number) => void;
  onAnalyze?: () => void;
}

const METHOD_COLORS: Record<HttpMethod, { bg: string; text: string; border: string }> = {
  GET: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  POST: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  PUT: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  PATCH: { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' },
  DELETE: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  OPTIONS: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
  HEAD: { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.3)' },
  GRAPHQL: { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
  RPC: { bg: 'rgba(20, 184, 166, 0.15)', text: '#2dd4bf', border: 'rgba(20, 184, 166, 0.3)' },
  OTHER: { bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)' },
};

export const ApisPage: React.FC<PageProps> = ({ state, onOpenFile, onAnalyze }) => {
  const { info, analysis, isAnalyzing, errorMessage } = state;
  const apiAnalysis = analysis?.apiAnalysis;
  const endpoints = useMemo(
    () => apiAnalysis?.endpoints || analysis?.apis || [],
    [apiAnalysis, analysis]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedFramework, setSelectedFramework] = useState<string>('ALL');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());

  // Derive detected frameworks from apiAnalysis, endpoints, and project technologies
  const frameworks = useMemo(() => {
    const s = new Set<string>();
    if (apiAnalysis?.frameworksDetected) {
      apiAnalysis.frameworksDetected.forEach((fw) => s.add(fw));
    }
    endpoints.forEach((e) => e.framework && s.add(e.framework));

    // Also include any recognized web/backend frameworks detected in the project
    const supportedFrameworks = [
      'Next.js',
      'Express',
      'FastAPI',
      'Flask',
      'Spring Boot',
      'NestJS',
      'Fastify',
      'Django',
      'Remix',
      'Nuxt',
      'Astro',
      'SvelteKit',
    ];
    (analysis?.technologies || []).forEach((t) => {
      if (
        (t.category === 'framework' || t.category === 'backend') &&
        supportedFrameworks.includes(t.name)
      ) {
        s.add(t.name);
      }
    });

    return Array.from(s);
  }, [apiAnalysis, endpoints, analysis?.technologies]);

  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((ep) => {
      // Method filter
      if (selectedMethod !== 'ALL' && ep.method !== selectedMethod) {
        return false;
      }

      // Framework filter
      if (selectedFramework !== 'ALL' && ep.framework !== selectedFramework) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesPath = ep.path.toLowerCase().includes(q);
        const matchesFile = ep.sourceFile.toLowerCase().includes(q);
        const matchesFramework = ep.framework.toLowerCase().includes(q);
        const matchesHandler = ep.handlerName?.toLowerCase().includes(q) || false;
        return matchesPath || matchesFile || matchesFramework || matchesHandler;
      }

      return true;
    });
  }, [endpoints, selectedMethod, selectedFramework, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedEndpoints((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedEndpoints(new Set(filteredEndpoints.map((e) => e.id)));
  };

  const collapseAll = () => {
    setExpandedEndpoints(new Set());
  };

  const resetFilters = () => {
    setSelectedMethod('ALL');
    setSelectedFramework('ALL');
    setSearchQuery('');
  };

  // Method counts
  const methodCounts = useMemo(() => {
    const counts: Record<string, number> = {
      GET: 0,
      POST: 0,
      PUT: 0,
      PATCH: 0,
      DELETE: 0,
      OTHER: 0,
    };

    endpoints.forEach((ep) => {
      if (ep.method in counts) {
        counts[ep.method]++;
      } else {
        counts.OTHER++;
      }
    });

    return counts;
  }, [endpoints]);

  // 1. Loading State
  if (isAnalyzing) {
    return (
      <div className="section-view">
        <div className="placeholder-box">
          <RefreshCw size={36} color="var(--accent-cyan)" className="spin-animation" />
          <h3>Analyzing API Endpoints & Routes</h3>
          <p>Scanning source files, route handlers, decorators, and controllers...</p>
        </div>
      </div>
    );
  }

  // 2. Unanalyzed / No Workspace State
  if (!info.isWorkspaceOpen || !info.isAnalyzed || !analysis) {
    return (
      <div className="section-view">
        <div className="placeholder-box">
          <Network size={36} color="var(--accent-cyan)" />
          <h3>API & Route Catalog Ready</h3>
          <p>
            {info.isWorkspaceOpen
              ? 'Click "Analyze Project" to discover all REST endpoints, route handlers, and server controllers.'
              : 'Open a project workspace in VS Code to analyze API routes.'}
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
    <div className="section-view apis-page-container">
      {/* Analysis Warning/Error Notification */}
      {errorMessage && (
        <div
          className="info-callout"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '1rem',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <div>
            <strong>API Analysis Notice: </strong>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Top Banner Stats */}
      <div className="overview-panel-header" style={{ marginBottom: '1.25rem' }}>
        <div className="overview-panel-title-group">
          <div className="overview-panel-title">
            <Network size={18} color="var(--accent-cyan)" />
            <span>API & Server Route Catalog</span>
            <span className="section-badge">{endpoints.length} Endpoints</span>
          </div>
          <p className="overview-panel-desc">
            Deterministically detected HTTP endpoints, REST handlers, and route controllers across
            Next.js, Express, FastAPI, Flask, and Spring Boot.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="api-stats-grid">
        <div className="api-stat-card">
          <div className="api-stat-label">Total APIs</div>
          <div className="api-stat-val">{endpoints.length}</div>
          <div className="api-stat-sub">Across all frameworks</div>
        </div>
        <div className="api-stat-card">
          <div className="api-stat-label">GET Endpoints</div>
          <div className="api-stat-val" style={{ color: '#34d399' }}>
            {methodCounts.GET}
          </div>
          <div className="api-stat-sub">Read operations</div>
        </div>
        <div className="api-stat-card">
          <div className="api-stat-label">POST Endpoints</div>
          <div className="api-stat-val" style={{ color: '#60a5fa' }}>
            {methodCounts.POST}
          </div>
          <div className="api-stat-sub">Create operations</div>
        </div>
        <div className="api-stat-card">
          <div className="api-stat-label">PUT / PATCH / DELETE</div>
          <div className="api-stat-val" style={{ color: '#fb923c' }}>
            {methodCounts.PUT + methodCounts.PATCH + methodCounts.DELETE}
          </div>
          <div className="api-stat-sub">Mutation & removal</div>
        </div>
        <div className="api-stat-card">
          <div className="api-stat-label">Frameworks Detected</div>
          <div className="api-stat-val" style={{ color: 'var(--accent-purple)' }}>
            {frameworks.length > 0 ? frameworks.join(', ') : 'None'}
          </div>
          <div className="api-stat-sub">
            {apiAnalysis?.dynamicEndpointsCount
              ? `${apiAnalysis.dynamicEndpointsCount} dynamic routes`
              : 'All routes static'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="api-controls-panel">
        <div className="api-search-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search endpoint path, file, handler or framework..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={endpoints.length === 0}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery('')}>
              ×
            </button>
          )}
        </div>

        {/* HTTP Method Filters */}
        <div className="api-filters-row">
          <div className="filter-group">
            <span className="filter-group-label">
              <Filter size={12} /> Method:
            </span>
            {['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OTHER'].map((method) => {
              const count =
                method === 'ALL'
                  ? endpoints.length
                  : method === 'OTHER'
                    ? methodCounts.OTHER
                    : methodCounts[method] || 0;

              return (
                <button
                  key={method}
                  className={`filter-pill ${selectedMethod === method ? 'active' : ''}`}
                  onClick={() => setSelectedMethod(method)}
                  title={`Filter by ${method} (${count} endpoint${count === 1 ? '' : 's'})`}
                >
                  <span className="filter-pill-label">{method}</span>
                  <span className="pill-count">({count})</span>
                </button>
              );
            })}
          </div>

          {frameworks.length > 1 && (
            <div className="filter-group">
              <span className="filter-group-label">
                <Layers size={12} /> Framework:
              </span>
              <button
                className={`filter-pill ${selectedFramework === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedFramework('ALL')}
              >
                All
              </button>
              {frameworks.map((fw) => (
                <button
                  key={fw}
                  className={`filter-pill ${selectedFramework === fw ? 'active' : ''}`}
                  onClick={() => setSelectedFramework(fw)}
                >
                  {fw}
                </button>
              ))}
            </div>
          )}

          <div className="api-action-buttons">
            <button
              className="btn btn-secondary btn-sm"
              onClick={expandAll}
              disabled={filteredEndpoints.length === 0}
            >
              Expand All
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={collapseAll}
              disabled={filteredEndpoints.length === 0}
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Endpoint List Area */}
      <div className="api-endpoint-list">
        {endpoints.length === 0 ? (
          /* Clean, informative zero-endpoints card */
          <div
            className="empty-filter-state"
            style={{
              padding: '2.5rem 1.5rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-blue)',
              }}
            >
              <Info size={22} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No API endpoints detected in this workspace.
            </div>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                maxWidth: '520px',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              This workspace uses{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {frameworks.length > 0 ? frameworks.join(', ') : 'client-side presentation'}
              </strong>{' '}
              without dedicated server route handlers (such as Next.js{' '}
              <code className="mono-text">app/api/**/route.ts</code> or{' '}
              <code className="mono-text">pages/api/**</code>). Application pages, components, and
              services are fully indexed in the Overview and Architecture views.
            </p>
          </div>
        ) : filteredEndpoints.length === 0 ? (
          /* Filtered search with 0 matches */
          <div
            className="empty-filter-state"
            style={{
              padding: '2rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              textAlign: 'center',
            }}
          >
            <AlertCircle
              size={24}
              color="var(--text-muted)"
              style={{ marginBottom: '8px', display: 'inline-block' }}
            />
            <p style={{ color: 'var(--text-primary)', fontWeight: 500, margin: '0 0 6px 0' }}>
              No endpoints match your current filter and search query.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '0 0 12px 0' }}>
              Try adjusting the HTTP method filter or clearing the search text.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={resetFilters}>
              Reset Filters
            </button>
          </div>
        ) : (
          filteredEndpoints.map((ep) => {
            const isExpanded = expandedEndpoints.has(ep.id);
            const methodStyle = METHOD_COLORS[ep.method] || METHOD_COLORS.OTHER;

            return (
              <div
                key={ep.id}
                className={`api-endpoint-card ${ep.isDynamic ? 'dynamic-route' : ''}`}
              >
                <div className="api-card-main-row" onClick={() => toggleExpand(ep.id)}>
                  <div className="api-card-left">
                    <button className="expand-chevron-btn" aria-label="Toggle details">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {/* Method Tag */}
                    <span
                      className="http-method-tag"
                      style={{
                        backgroundColor: methodStyle.bg,
                        color: methodStyle.text,
                        borderColor: methodStyle.border,
                      }}
                    >
                      {ep.method}
                    </span>

                    {/* Route Path */}
                    <span className="api-route-path mono-text" title={ep.path}>
                      {ep.path}
                    </span>

                    {ep.isDynamic && (
                      <span className="dynamic-badge" title="Route path is constructed dynamically">
                        <Zap size={11} /> Dynamic
                      </span>
                    )}
                  </div>

                  <div className="api-card-right" onClick={(e) => e.stopPropagation()}>
                    <span className="framework-badge">{ep.framework}</span>

                    <span
                      className="confidence-meter"
                      title={`Confidence: ${Math.round(ep.confidence * 100)}%`}
                    >
                      <CheckCircle2 size={12} color="var(--accent-green)" />
                      <span>{Math.round(ep.confidence * 100)}%</span>
                    </span>

                    <button
                      className="btn-open-source"
                      onClick={() => onOpenFile?.(ep.sourceFile, ep.lineNumber)}
                      title={`Open ${ep.sourceFile}${ep.lineNumber ? ` (line ${ep.lineNumber})` : ''}`}
                    >
                      <Code size={12} />
                      <span className="open-file-label">{ep.sourceFile}</span>
                      <ExternalLink size={11} />
                    </button>
                  </div>
                </div>

                {/* Expanded Details / Evidence */}
                {isExpanded && (
                  <div className="api-card-details">
                    <div className="api-detail-grid">
                      <div className="api-detail-item">
                        <span className="api-detail-label">Source File:</span>
                        <span
                          className="api-detail-val file-link"
                          onClick={() => onOpenFile?.(ep.sourceFile, ep.lineNumber)}
                        >
                          {ep.sourceFile} {ep.lineNumber ? `(line ${ep.lineNumber})` : ''}
                        </span>
                      </div>

                      {ep.handlerName && (
                        <div className="api-detail-item">
                          <span className="api-detail-label">Handler:</span>
                          <span className="api-detail-val mono-text">{ep.handlerName}</span>
                        </div>
                      )}

                      <div className="api-detail-item">
                        <span className="api-detail-label">Framework:</span>
                        <span className="api-detail-val">{ep.framework}</span>
                      </div>
                    </div>

                    <div className="api-evidence-section">
                      <div className="api-evidence-title">Verifiable Evidence:</div>
                      <ul className="api-evidence-list">
                        {ep.evidence.map((ev, idx) => (
                          <li key={idx} className="api-evidence-item">
                            <CheckCircle2 size={12} color="var(--accent-green)" />
                            <span>{ev}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
