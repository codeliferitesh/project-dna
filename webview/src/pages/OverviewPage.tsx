import React, { useMemo } from 'react';
import {
  Files,
  FolderTree,
  FileCode,
  HardDrive,
  Clock,
  Timer,
  AlertCircle,
  FolderGit2,
  Cpu,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  GitFork,
  Compass,
  Link2,
  Workflow,
  CheckCircle2,
  RefreshCw,
  Play,
  FileText,
  Boxes,
  HelpCircle,
  Network,
  Sliders,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { MetricCard } from '../components/MetricCard';
import {
  ArchitecturalRole,
  NavigationTab,
  ProjectStatePayload,
  TechnologyCategory,
  TechnologyInfo,
} from '../types';

interface OverviewPageProps {
  state: ProjectStatePayload;
  onAnalyze: () => void;
  onRefresh: () => void;
  onNavigateTab: (tab: NavigationTab) => void;
  onOpenFile?: (path: string, line?: number) => void;
}

const CATEGORY_DISPLAY_NAMES: Record<TechnologyCategory, string> = {
  framework: 'Frameworks',
  language: 'Languages',
  library: 'Libraries',
  runtime: 'Runtime Environments',
  styling: 'Styling & CSS',
  database: 'Databases & ORMs',
  backend: 'Backend & Server',
  buildTool: 'Build Tools & Bundlers',
  packageManager: 'Package Managers',
  cloud: 'Cloud & Hosting',
  service: 'Services & APIs',
  testing: 'Testing Frameworks',
  tooling: 'Developer Tooling',
  other: 'Other Technologies',
};

const ROLE_DISPLAY_NAMES: Record<ArchitecturalRole, string> = {
  entry_point: 'Entry Point',
  page: 'Page',
  route: 'Route',
  layout: 'Layout',
  component: 'Component',
  ui_component: 'UI Component',
  hook: 'Custom Hook',
  context: 'Context / State',
  service: 'Service',
  api_client: 'API Client',
  backend_route: 'Backend Endpoint',
  controller: 'Controller',
  model: 'Model',
  repository: 'Repository',
  utility: 'Utility',
  config: 'Configuration',
  state_management: 'State Store',
  test: 'Test Suite',
  type_definition: 'Type Definition',
  schema: 'Schema',
  middleware: 'Middleware',
  worker: 'Worker',
  constant: 'Constants',
  asset_module: 'Asset Module',
  unknown: 'Unclassified',
};

export const OverviewPage: React.FC<OverviewPageProps> = ({
  state,
  onAnalyze,
  onRefresh,
  onNavigateTab,
  onOpenFile,
}) => {
  const { info, stats, analysis, isAnalyzing, errorMessage } = state;
  const scanMeta = analysis?.scanMetadata;
  const technologies = useMemo(() => analysis?.technologies || [], [analysis]);
  const depGraph = analysis?.dependencyGraph;
  const arch = analysis?.architecture;

  // Helper to format language list naturally (e.g. "TypeScript", "JavaScript and TypeScript", "Python, Go, and Rust")
  const formatLanguageList = (langs: string[]) => {
    if (langs.length === 0) return '';
    if (langs.length === 1) return langs[0];
    if (langs.length === 2) return `${langs[0]} and ${langs[1]}`;
    return `${langs.slice(0, -1).join(', ')}, and ${langs[langs.length - 1]}`;
  };

  // 1. Dynamic synthesized project headline from actual analysis facts
  const projectHeadline = useMemo(() => {
    if (!info.isAnalyzed || !analysis) {
      return 'Project workspace ready for analysis.';
    }

    const frameworks = technologies.filter((t) => t.category === 'framework').map((t) => t.name);
    const languages = technologies.filter((t) => t.category === 'language').map((t) => t.name);
    const backends = technologies.filter((t) => t.category === 'backend').map((t) => t.name);
    const moduleCount =
      arch?.summary?.totalModules ?? depGraph?.stats.analyzedFilesCount ?? stats?.sourceFiles ?? 0;
    const layersCount = arch?.summary?.layersCount ?? 0;

    const primaryFramework =
      frameworks.find((f) => /next|remix|nuxt|astro|sveltekit/i.test(f)) ||
      (frameworks.length > 0 ? frameworks[0] : null);

    let base = 'Codebase';
    if (primaryFramework) {
      let descriptor = 'application';
      if (/next|remix|nuxt|astro|sveltekit/i.test(primaryFramework)) {
        descriptor = 'web application';
      } else if (/react|vue|angular|svelte/i.test(primaryFramework)) {
        descriptor = 'frontend application';
      }

      if (languages.length > 0) {
        base = `${primaryFramework} ${descriptor} using ${formatLanguageList(languages)}`;
      } else {
        base = `${primaryFramework} ${descriptor}`;
      }
    } else if (backends.length > 0) {
      const backendName = backends[0];
      if (languages.length > 0) {
        base = `${backendName} backend service using ${formatLanguageList(languages)}`;
      } else {
        base = `${backendName} backend service`;
      }
    } else if (languages.length > 0) {
      base = `${formatLanguageList(languages)} project`;
    }

    const moduleText =
      moduleCount > 0
        ? ` with ${moduleCount} analyzed module${moduleCount === 1 ? '' : 's'}`
        : ` with ${stats?.totalFiles ?? 0} files`;
    const layerText =
      layersCount > 0
        ? ` across ${layersCount} architectural layer${layersCount === 1 ? '' : 's'}`
        : '';

    return `${base}${moduleText}${layerText}.`;
  }, [info.isAnalyzed, analysis, technologies, arch, depGraph, stats]);

  // 2. Format helpers
  const formatDate = (timestamp?: number | null) => {
    if (!timestamp) {
      return '—';
    }
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (ms?: number | null) => {
    if (ms === undefined || ms === null) {
      return '—';
    }
    if (ms < 1000) {
      return `${ms} ms`;
    }
    return `${(ms / 1000).toFixed(2)} s`;
  };

  // 3. Group detected technologies by category (only non-empty categories)
  const groupedTechnologies = useMemo(() => {
    const groups: { category: TechnologyCategory; title: string; items: TechnologyInfo[] }[] = [];
    const catMap = new Map<TechnologyCategory, TechnologyInfo[]>();

    for (const tech of technologies) {
      const existing = catMap.get(tech.category) || [];
      existing.push(tech);
      catMap.set(tech.category, existing);
    }

    // Preferred ordering of categories for clean developer presentation
    const preferredOrder: TechnologyCategory[] = [
      'framework',
      'language',
      'backend',
      'styling',
      'database',
      'library',
      'buildTool',
      'packageManager',
      'testing',
      'cloud',
      'service',
      'runtime',
      'tooling',
      'other',
    ];

    for (const cat of preferredOrder) {
      const items = catMap.get(cat);
      if (items && items.length > 0) {
        groups.push({
          category: cat,
          title: CATEGORY_DISPLAY_NAMES[cat] || cat,
          items,
        });
      }
    }

    // Include any other categories not in the preferred order list
    for (const [cat, items] of catMap.entries()) {
      if (!preferredOrder.includes(cat) && items.length > 0) {
        groups.push({
          category: cat,
          title: CATEGORY_DISPLAY_NAMES[cat] || cat,
          items,
        });
      }
    }

    return groups;
  }, [technologies]);

  // 4. Non-empty architectural roles sorted by count
  const activeRoles = useMemo(() => {
    if (!arch?.summary?.roleDistribution) {
      return [];
    }
    const dist = arch.summary.roleDistribution;
    const totalClassified = arch.summary.classifiedModulesCount || 1;

    return (Object.keys(dist) as ArchitecturalRole[])
      .filter((role) => (dist[role] || 0) > 0)
      .map((role) => ({
        role,
        name: ROLE_DISPLAY_NAMES[role] || role,
        count: dist[role] || 0,
        percentage: Math.round(((dist[role] || 0) / totalClassified) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [arch]);

  // 5. Root file/dir preview
  const rootTreePreview = useMemo(() => {
    if (!analysis?.fileTree?.children) {
      return [];
    }
    return [...analysis.fileTree.children].sort((a, b) => {
      // Directories first, then alphabetically
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [analysis?.fileTree]);

  // 6. Subsystem status indicators
  const scanStatus = info.isAnalyzed ? 'Ready' : isAnalyzing ? 'Analyzing' : 'Not analyzed';
  const techStatus =
    technologies.length > 0
      ? 'Ready'
      : isAnalyzing
        ? 'Analyzing'
        : info.isAnalyzed
          ? 'Ready'
          : 'Not analyzed';
  const depStatus = depGraph
    ? 'Ready'
    : isAnalyzing
      ? 'Analyzing'
      : info.isAnalyzed
        ? 'Ready'
        : 'Not analyzed';
  const archStatus = arch
    ? 'Ready'
    : isAnalyzing
      ? 'Analyzing'
      : info.isAnalyzed
        ? 'Ready'
        : 'Not analyzed';
  const apiStatus = analysis?.apiAnalysis
    ? 'Ready'
    : isAnalyzing
      ? 'Analyzing'
      : info.isAnalyzed
        ? 'Ready'
        : 'Not analyzed';
  const configStatus = analysis?.configurationAnalysis
    ? 'Ready'
    : isAnalyzing
      ? 'Analyzing'
      : info.isAnalyzed
        ? 'Ready'
        : 'Not analyzed';
  const envStatus = analysis?.environmentAnalysis
    ? 'Ready'
    : isAnalyzing
      ? 'Analyzing'
      : info.isAnalyzed
        ? 'Ready'
        : 'Not analyzed';

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="section-view overview-command-center">
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
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <div>
            <strong>Analysis Notification: </strong>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Analysis Warnings Banner */}
      {scanMeta?.hasWarnings && scanMeta.warnings && scanMeta.warnings.length > 0 && (
        <div
          className="info-callout"
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            borderColor: 'rgba(245, 158, 11, 0.25)',
            color: '#fbbf24',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>Analysis Notes & Warnings ({scanMeta.warnings.length})</span>
          </div>
          <ul style={{ margin: '4px 0 0 20px', padding: 0, fontSize: '12px', lineHeight: '1.5' }}>
            {scanMeta.warnings.slice(0, 5).map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
            {scanMeta.warnings.length > 5 && (
              <li>+{scanMeta.warnings.length - 5} additional warnings</li>
            )}
          </ul>
        </div>
      )}

      {/* Hero Header Section */}
      <div className="overview-hero-card">
        <div className="overview-hero-top">
          <div className="overview-hero-branding">
            <div className="overview-badge-tag">
              <Compass size={12} />
              <span>Project DNA Intelligence</span>
            </div>
            <h1 className="overview-hero-title">
              {info.workspaceName ? info.workspaceName : 'No Workspace Open'}
            </h1>
            <p className="overview-hero-subtitle">{projectHeadline}</p>
          </div>

          <div className="overview-hero-actions">
            <button
              className="btn btn-primary"
              onClick={onAnalyze}
              disabled={isAnalyzing || !info.isWorkspaceOpen}
              title="Run complete workspace analysis"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw size={13} className="spin-animation" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Play size={13} />
                  <span>Analyze Project</span>
                </>
              )}
            </button>
            <button
              className="btn btn-secondary"
              onClick={onRefresh}
              disabled={isAnalyzing || !info.isWorkspaceOpen}
              title="Refresh current state"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="overview-hero-meta-bar">
          <div className="overview-meta-item">
            <span className="overview-meta-label">Workspace Status</span>
            <span className="overview-meta-value">
              <span
                className={`status-dot ${info.isAnalyzed ? 'active' : isAnalyzing ? 'warning' : 'inactive'}`}
              />
              {info.isAnalyzed
                ? 'Analyzed & Indexed'
                : isAnalyzing
                  ? 'Analysis in progress'
                  : 'Not analyzed'}
            </span>
          </div>
          <div className="overview-meta-item">
            <span className="overview-meta-label">Last Analyzed</span>
            <span className="overview-meta-value">
              <Clock size={12} style={{ opacity: 0.7 }} />
              {formatDate(info.lastAnalyzedTimestamp)}
            </span>
          </div>
          <div className="overview-meta-item">
            <span className="overview-meta-label">Scan Duration</span>
            <span className="overview-meta-value">
              <Timer size={12} style={{ opacity: 0.7 }} />
              {formatDuration(scanMeta?.durationMs)}
            </span>
          </div>
          <div className="overview-meta-item">
            <span className="overview-meta-label">Workspace</span>
            <span
              className="overview-meta-value mono-text"
              title={info.workspaceName || undefined}
              style={{
                maxWidth: '240px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {info.workspaceName || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Subsystem Pipeline Status Badges */}
      <div className="pipeline-status-card">
        <div className="pipeline-status-header">
          <Workflow size={14} />
          <span>Analysis Subsystems Status</span>
        </div>
        <div className="pipeline-status-grid">
          <div className="pipeline-pill">
            <div className="pipeline-pill-left">
              <span
                className={`pipeline-indicator ${scanStatus === 'Ready' ? 'ready' : scanStatus === 'Analyzing' ? 'running' : 'idle'}`}
              />
              <span className="pipeline-name">Workspace Scanner</span>
            </div>
            <span className="pipeline-status-text">{scanStatus}</span>
          </div>

          <div className="pipeline-pill">
            <div className="pipeline-pill-left">
              <span
                className={`pipeline-indicator ${techStatus === 'Ready' ? 'ready' : techStatus === 'Analyzing' ? 'running' : 'idle'}`}
              />
              <span className="pipeline-name">Technology Detection</span>
            </div>
            <span className="pipeline-status-text">{techStatus}</span>
          </div>

          <div className="pipeline-pill">
            <div className="pipeline-pill-left">
              <span
                className={`pipeline-indicator ${depStatus === 'Ready' ? 'ready' : depStatus === 'Analyzing' ? 'running' : 'idle'}`}
              />
              <span className="pipeline-name">Dependency Graph</span>
            </div>
            <span className="pipeline-status-text">{depStatus}</span>
          </div>

          <div className="pipeline-pill">
            <div className="pipeline-pill-left">
              <span
                className={`pipeline-indicator ${archStatus === 'Ready' ? 'ready' : archStatus === 'Analyzing' ? 'running' : 'idle'}`}
              />
              <span className="pipeline-name">Architecture & Roles</span>
            </div>
            <span className="pipeline-status-text">{archStatus}</span>
          </div>

          <div className="pipeline-pill">
            <div className="pipeline-pill-left">
              <span
                className={`pipeline-indicator ${apiStatus === 'Ready' ? 'ready' : apiStatus === 'Analyzing' ? 'running' : 'idle'}`}
              />
              <span className="pipeline-name">API Endpoints</span>
            </div>
            <span className="pipeline-status-text">{apiStatus}</span>
          </div>

          <div className="pipeline-pill">
            <div className="pipeline-pill-left">
              <span
                className={`pipeline-indicator ${configStatus === 'Ready' ? 'ready' : configStatus === 'Analyzing' ? 'running' : 'idle'}`}
              />
              <span className="pipeline-name">Configuration</span>
            </div>
            <span className="pipeline-status-text">{configStatus}</span>
          </div>

          <div className="pipeline-pill">
            <div className="pipeline-pill-left">
              <span
                className={`pipeline-indicator ${envStatus === 'Ready' ? 'ready' : envStatus === 'Analyzing' ? 'running' : 'idle'}`}
              />
              <span className="pipeline-name">Environment Security</span>
            </div>
            <span className="pipeline-status-text">{envStatus}</span>
          </div>
        </div>
      </div>

      {/* Primary Project Metric Grid */}
      <div className="overview-grid">
        <MetricCard
          label="Total Files"
          value={stats?.totalFiles ?? null}
          subtitle="Discovered project files"
          icon={<Files />}
          onClick={() => onNavigateTab('structure')}
        />
        <MetricCard
          label="Analyzed Modules"
          value={
            arch?.summary?.totalModules ??
            depGraph?.stats.analyzedFilesCount ??
            stats?.sourceFiles ??
            null
          }
          subtitle="Code modules in graph"
          icon={<Boxes />}
          onClick={() => onNavigateTab('architecture')}
        />
        <MetricCard
          label="Technologies"
          value={technologies.length > 0 ? technologies.length : (stats?.totalTechnologies ?? null)}
          subtitle="Detected frameworks & tools"
          icon={<Cpu />}
          onClick={() => onNavigateTab('technology')}
        />
        <MetricCard
          label="API Endpoints"
          value={
            analysis?.apiAnalysis?.totalEndpoints ??
            stats?.totalApis ??
            (info.isAnalyzed ? 0 : null)
          }
          subtitle="HTTP routes & endpoints"
          icon={<Network color="var(--accent-cyan)" />}
          onClick={() => onNavigateTab('apis')}
        />
        <MetricCard
          label="Configuration"
          value={
            analysis?.configurationAnalysis?.totalConfigs ??
            stats?.totalConfigs ??
            (info.isAnalyzed ? 0 : null)
          }
          subtitle="Project manifests & configs"
          icon={<Sliders color="var(--accent-amber)" />}
          onClick={() => onNavigateTab('configuration')}
        />
        <MetricCard
          label="Environment Variables"
          value={
            analysis?.environmentAnalysis?.totalVariables ??
            stats?.totalEnvVariables ??
            (info.isAnalyzed ? 0 : null)
          }
          subtitle="Audited keys & references"
          icon={<ShieldCheck color="var(--accent-green)" />}
          onClick={() => onNavigateTab('configuration')}
        />
        <MetricCard
          label="Local Dependencies"
          value={depGraph?.stats.totalLocalEdges ?? null}
          subtitle="Resolved local import edges"
          icon={<Link2 />}
          onClick={() => onNavigateTab('dependencies')}
        />
        <MetricCard
          label="External Packages"
          value={depGraph?.stats.totalExternalPackages ?? null}
          subtitle="External third-party packages"
          icon={<Package />}
          onClick={() => onNavigateTab('dependencies')}
        />
        <MetricCard
          label="Architectural Layers"
          value={arch?.summary?.layersCount ?? null}
          subtitle="Identified architectural tiers"
          icon={<Layers />}
          onClick={() => onNavigateTab('architecture')}
        />
        <MetricCard
          label="Entry Points"
          value={arch?.summary?.entryPointsCount ?? stats?.entryPointsCount ?? null}
          subtitle="App & client entry points"
          icon={<GitFork />}
          onClick={() => onNavigateTab('architecture')}
        />
        <MetricCard
          label="Circular Dependencies"
          value={depGraph?.stats.circularDependenciesCount ?? null}
          subtitle={
            depGraph?.stats.circularDependenciesCount === 0
              ? 'No cyclic loops detected'
              : 'Cyclic dependency components'
          }
          icon={
            depGraph?.stats.circularDependenciesCount === 0 ? (
              <ShieldCheck color="var(--accent-green)" />
            ) : (
              <ShieldAlert color="var(--accent-amber)" />
            )
          }
          statusVariant={
            depGraph?.stats.circularDependenciesCount === 0
              ? 'success'
              : depGraph?.stats.circularDependenciesCount &&
                  depGraph.stats.circularDependenciesCount > 0
                ? 'warning'
                : 'normal'
          }
          onClick={() => onNavigateTab('dependencies')}
        />
        <MetricCard
          label="Unresolved Imports"
          value={depGraph?.stats.unresolvedImportsCount ?? null}
          subtitle={
            depGraph?.stats.unresolvedImportsCount === 0
              ? 'All imports resolved'
              : 'Missing or unmapped paths'
          }
          icon={
            depGraph?.stats.unresolvedImportsCount === 0 ? (
              <CheckCircle2 color="var(--accent-green)" />
            ) : (
              <AlertCircle color="var(--accent-amber)" />
            )
          }
          statusVariant={
            depGraph?.stats.unresolvedImportsCount === 0
              ? 'success'
              : depGraph?.stats.unresolvedImportsCount && depGraph.stats.unresolvedImportsCount > 0
                ? 'warning'
                : 'normal'
          }
          onClick={() => onNavigateTab('dependencies')}
        />
        <MetricCard
          label="Directories"
          value={stats?.totalDirectories ?? null}
          subtitle="Indexed directory folders"
          icon={<FolderTree />}
          onClick={() => onNavigateTab('structure')}
        />
        <MetricCard
          label="Source Files"
          value={stats?.sourceFiles ?? null}
          subtitle="Application code files"
          icon={<FileCode />}
          onClick={() => onNavigateTab('structure')}
        />
        <MetricCard
          label="Total Size"
          value={stats?.formattedTotalSize ?? null}
          subtitle="Workspace disk footprint"
          icon={<HardDrive />}
          onClick={() => onNavigateTab('structure')}
        />
      </div>

      {/* Main Content Area: First-run Empty State vs. Analyzed Dashboard */}
      {!info.isWorkspaceOpen || !info.isAnalyzed ? (
        <EmptyState
          isWorkspaceOpen={info.isWorkspaceOpen}
          isAnalyzed={info.isAnalyzed}
          isAnalyzing={isAnalyzing}
          onAnalyze={onAnalyze}
        />
      ) : (
        <div className="overview-dashboard-sections">
          {/* Section 1: Technology Stack Snapshot */}
          <div className="overview-section-panel">
            <div className="overview-panel-header">
              <div className="overview-panel-title-group">
                <div className="overview-panel-title">
                  <Cpu size={16} color="var(--accent-cyan)" />
                  <span>Technology Stack Snapshot</span>
                  <span className="section-badge">{technologies.length} Detected</span>
                </div>
                <p className="overview-panel-desc">
                  Verifiable frameworks, languages, libraries, and tools discovered from manifests,
                  configurations, and code patterns.
                </p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateTab('technology')}
              >
                <span>View Full Technology Stack & Evidence</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {groupedTechnologies.length > 0 ? (
              <div className="overview-tech-categories-grid">
                {groupedTechnologies.map((group) => (
                  <div key={group.category} className="overview-tech-category-card">
                    <div className="overview-tech-category-header">
                      <span className="overview-tech-category-title">{group.title}</span>
                      <span className="overview-tech-category-count">{group.items.length}</span>
                    </div>
                    <div className="overview-tech-items-wrap">
                      {group.items.map((tech) => (
                        <div
                          key={tech.id + ':' + tech.category}
                          className="overview-tech-item-chip"
                          onClick={() => onNavigateTab('technology')}
                          title={`Click to inspect evidence for ${tech.name} (Confidence: ${Math.round(tech.confidence * 100)}%)`}
                        >
                          <span className="tech-chip-name">{tech.name}</span>
                          {tech.version && (
                            <span className="tech-chip-version">{tech.version}</span>
                          )}
                          <span className="tech-chip-confidence">
                            {tech.confidence >= 0.9
                              ? 'High'
                              : tech.confidence >= 0.7
                                ? 'Med'
                                : 'Low'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overview-empty-notice">
                <HelpCircle size={15} />
                <span>No specific technology signatures detected yet.</span>
              </div>
            )}
          </div>

          {/* Section 2: Architecture & Relationships Snapshot */}
          <div className="overview-section-panel">
            <div className="overview-panel-header">
              <div className="overview-panel-title-group">
                <div className="overview-panel-title">
                  <Layers size={16} color="var(--accent-blue)" />
                  <span>Architecture & Structural Roles Snapshot</span>
                  <span className="section-badge">
                    {arch?.summary?.layersCount ?? 0} Layers •{' '}
                    {arch?.summary?.classifiedModulesCount ?? 0} Classified Modules
                  </span>
                </div>
                <p className="overview-panel-desc">
                  Synthesized structural layers, role assignments, and higher-level architectural
                  abstractions.
                </p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateTab('architecture')}
              >
                <span>Explore Architecture Explorer</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="overview-arch-dual-grid">
              {/* Left Column: Role Distribution */}
              <div className="overview-arch-card">
                <div className="overview-subcard-title">Architectural Role Distribution</div>
                {activeRoles.length > 0 ? (
                  <div className="overview-role-bars-list">
                    {activeRoles.map((roleItem) => (
                      <div key={roleItem.role} className="overview-role-bar-row">
                        <div className="overview-role-bar-labels">
                          <span className="overview-role-name">{roleItem.name}</span>
                          <span className="overview-role-count">
                            {roleItem.count} ({roleItem.percentage}%)
                          </span>
                        </div>
                        <div className="overview-role-progress-track">
                          <div
                            className="overview-role-progress-fill"
                            style={{ width: `${Math.max(roleItem.percentage, 4)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overview-empty-notice">
                    <span>No classified module roles detected.</span>
                  </div>
                )}
              </div>

              {/* Right Column: Factual Observed Structure */}
              <div className="overview-arch-card">
                <div className="overview-subcard-title">Observed Structural Patterns</div>
                {arch?.summary?.observedStructure && arch.summary.observedStructure.length > 0 ? (
                  <div className="overview-observed-list">
                    {arch.summary.observedStructure.map((obs, index) => (
                      <div key={index} className="overview-observed-item">
                        <div className="overview-observed-bullet" />
                        <span className="overview-observed-text">{obs}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overview-empty-notice">
                    <span>No distinctive architectural patterns identified.</span>
                  </div>
                )}

                {/* Additional Layer summary pills */}
                {arch?.layers && arch.layers.length > 0 && (
                  <div style={{ marginTop: '14px' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        color: 'var(--text-secondary)',
                        letterSpacing: '0.05em',
                        marginBottom: '8px',
                      }}
                    >
                      Identified Tiers ({arch.layers.length})
                    </div>
                    <div className="overview-tier-chips">
                      {arch.layers.map((layer) => (
                        <div
                          key={layer.id}
                          className="overview-tier-chip"
                          onClick={() => onNavigateTab('architecture')}
                        >
                          <span className="tier-chip-name">{layer.name}</span>
                          <span className="tier-chip-count">{layer.modulePaths.length}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Dependency Graph Snapshot */}
          <div className="overview-section-panel">
            <div className="overview-panel-header">
              <div className="overview-panel-title-group">
                <div className="overview-panel-title">
                  <Link2 size={16} color="var(--accent-purple)" />
                  <span>Dependency Graph & Module Coupling Snapshot</span>
                  <span className="section-badge">
                    {depGraph?.stats.totalLocalEdges ?? 0} Local Edges •{' '}
                    {depGraph?.stats.totalExternalPackages ?? 0} External Packages
                  </span>
                </div>
                <p className="overview-panel-desc">
                  Code-level import graph, external dependencies, circular cycles, and resolution
                  health.
                </p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateTab('dependencies')}
              >
                <span>View Full Dependency Graph</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="overview-dep-summary-grid">
              {/* Fact 1: Circular Dependencies Callout */}
              <div
                className={`overview-fact-card ${
                  depGraph?.stats.circularDependenciesCount === 0 ? 'fact-success' : 'fact-warning'
                }`}
              >
                <div className="fact-header">
                  {depGraph?.stats.circularDependenciesCount === 0 ? (
                    <ShieldCheck size={18} color="var(--accent-green)" />
                  ) : (
                    <ShieldAlert size={18} color="var(--accent-amber)" />
                  )}
                  <span className="fact-title">Circular Dependencies</span>
                </div>
                <div className="fact-body">
                  {depGraph?.stats.circularDependenciesCount === 0
                    ? '0 circular dependency components detected. Clean acyclic module dependency structure.'
                    : `${depGraph?.stats.circularDependenciesCount} circular dependency cycle group(s) detected.`}
                </div>
              </div>

              {/* Fact 2: Import Resolution Callout */}
              <div
                className={`overview-fact-card ${
                  depGraph?.stats.unresolvedImportsCount === 0 ? 'fact-success' : 'fact-warning'
                }`}
              >
                <div className="fact-header">
                  {depGraph?.stats.unresolvedImportsCount === 0 ? (
                    <CheckCircle2 size={18} color="var(--accent-green)" />
                  ) : (
                    <AlertCircle size={18} color="var(--accent-amber)" />
                  )}
                  <span className="fact-title">Import Resolution Health</span>
                </div>
                <div className="fact-body">
                  {depGraph?.stats.unresolvedImportsCount === 0
                    ? '0 unresolved imports detected. All local module specifiers and path aliases resolved.'
                    : `${depGraph?.stats.unresolvedImportsCount} unresolved import specifier(s) detected.`}
                </div>
              </div>

              {/* Fact 3: Root & Leaf Modules */}
              <div className="overview-fact-card fact-neutral">
                <div className="fact-header">
                  <Workflow size={18} color="var(--accent-blue)" />
                  <span className="fact-title">Topological Distribution</span>
                </div>
                <div className="fact-body">
                  {depGraph?.stats.filesWithNoIncomingCount ?? 0} root entry module(s) (no incoming
                  local imports) and {depGraph?.stats.filesWithNoOutgoingCount ?? 0} leaf module(s)
                  (no outgoing local imports).
                </div>
              </div>
            </div>

            {/* External packages preview chips */}
            {depGraph?.externalPackages && depGraph.externalPackages.length > 0 && (
              <div style={{ marginTop: '14px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                  }}
                >
                  Top External Packages ({depGraph.externalPackages.length})
                </div>
                <div className="overview-pkg-chips-wrap">
                  {depGraph.externalPackages.slice(0, 16).map((pkg) => (
                    <div
                      key={pkg.name}
                      className="overview-pkg-chip"
                      onClick={() => onNavigateTab('dependencies')}
                      title={`Imported by ${pkg.importedBy.length} module(s)`}
                    >
                      <Package size={11} style={{ opacity: 0.6 }} />
                      <span className="pkg-chip-name">{pkg.name}</span>
                      <span className="pkg-chip-usage">{pkg.count}×</span>
                    </div>
                  ))}
                  {depGraph.externalPackages.length > 16 && (
                    <div
                      className="overview-pkg-chip-more"
                      onClick={() => onNavigateTab('dependencies')}
                    >
                      +{depGraph.externalPackages.length - 16} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Structural Hotspots & Entry Points */}
          <div className="overview-section-panel">
            <div className="overview-panel-header">
              <div className="overview-panel-title-group">
                <div className="overview-panel-title">
                  <Compass size={16} color="var(--accent-amber)" />
                  <span>Important Modules & Structural Hotspots</span>
                </div>
                <p className="overview-panel-desc">
                  Key foundational modules with high fan-in, orchestrators with high fan-out, and
                  application entry points.
                </p>
              </div>
            </div>

            <div className="overview-hotspots-grid">
              {/* Column 1: High Fan-In (Core Foundational Modules) */}
              <div className="overview-hotspot-column">
                <div className="overview-hotspot-header">
                  <div className="hotspot-header-left">
                    <Link2 size={14} color="var(--accent-cyan)" />
                    <span className="hotspot-header-title">Highly Imported (Fan-In)</span>
                  </div>
                  <span className="hotspot-badge">Core Foundation</span>
                </div>
                {arch?.summary?.highFanInModules && arch.summary.highFanInModules.length > 0 ? (
                  <div className="overview-hotspot-list">
                    {arch.summary.highFanInModules.slice(0, 5).map((item) => (
                      <div
                        key={item.path}
                        className="overview-hotspot-row"
                        onClick={() => onOpenFile?.(item.path)}
                        title={`Click to open ${item.path} in editor`}
                      >
                        <div className="hotspot-row-info">
                          <FileCode size={13} className="hotspot-row-icon" />
                          <span className="hotspot-row-path">{item.path}</span>
                        </div>
                        <div className="hotspot-row-meta">
                          <span className="hotspot-role-tag">
                            {ROLE_DISPLAY_NAMES[item.role] || item.role}
                          </span>
                          <span className="hotspot-count-pill" title="Incoming imports">
                            {item.fanIn} in
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overview-empty-notice">
                    <span>No high fan-in hotspots identified.</span>
                  </div>
                )}
              </div>

              {/* Column 2: High Fan-Out (Orchestrators) */}
              <div className="overview-hotspot-column">
                <div className="overview-hotspot-header">
                  <div className="hotspot-header-left">
                    <GitFork size={14} color="var(--accent-purple)" />
                    <span className="hotspot-header-title">Highly Connected (Fan-Out)</span>
                  </div>
                  <span className="hotspot-badge">Orchestrators</span>
                </div>
                {arch?.summary?.highFanOutModules && arch.summary.highFanOutModules.length > 0 ? (
                  <div className="overview-hotspot-list">
                    {arch.summary.highFanOutModules.slice(0, 5).map((item) => (
                      <div
                        key={item.path}
                        className="overview-hotspot-row"
                        onClick={() => onOpenFile?.(item.path)}
                        title={`Click to open ${item.path} in editor`}
                      >
                        <div className="hotspot-row-info">
                          <FileCode size={13} className="hotspot-row-icon" />
                          <span className="hotspot-row-path">{item.path}</span>
                        </div>
                        <div className="hotspot-row-meta">
                          <span className="hotspot-role-tag">
                            {ROLE_DISPLAY_NAMES[item.role] || item.role}
                          </span>
                          <span className="hotspot-count-pill" title="Outgoing imports">
                            {item.fanOut} out
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overview-empty-notice">
                    <span>No high fan-out orchestrators identified.</span>
                  </div>
                )}
              </div>

              {/* Column 3: Application Entry Points */}
              <div className="overview-hotspot-column">
                <div className="overview-hotspot-header">
                  <div className="hotspot-header-left">
                    <Compass size={14} color="var(--accent-green)" />
                    <span className="hotspot-header-title">Application Entry Points</span>
                  </div>
                  <span className="hotspot-badge">{arch?.entryPoints?.length ?? 0} Found</span>
                </div>
                {arch?.entryPoints && arch.entryPoints.length > 0 ? (
                  <div className="overview-hotspot-list">
                    {arch.entryPoints.slice(0, 5).map((ep) => (
                      <div
                        key={ep.path}
                        className="overview-hotspot-row"
                        onClick={() => onOpenFile?.(ep.path)}
                        title={`Click to open ${ep.path} in editor`}
                      >
                        <div className="hotspot-row-info">
                          <FileCode size={13} className="hotspot-row-icon" />
                          <span className="hotspot-row-path">{ep.displayName || ep.path}</span>
                        </div>
                        <div className="hotspot-row-meta">
                          <span className="hotspot-role-tag">
                            {ROLE_DISPLAY_NAMES[ep.primaryRole] || ep.primaryRole}
                          </span>
                          <span className="hotspot-entry-badge">Entry</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overview-empty-notice">
                    <span>No application entry points detected.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Structure Preview & Category Distribution */}
          <div className="overview-section-panel">
            <div className="overview-panel-header">
              <div className="overview-panel-title-group">
                <div className="overview-panel-title">
                  <FolderGit2 size={16} color="var(--accent-blue)" />
                  <span>Workspace Structure Preview</span>
                  <span className="section-badge">
                    {stats?.totalFiles ?? 0} Files • {stats?.totalDirectories ?? 0} Directories
                  </span>
                </div>
                <p className="overview-panel-desc">
                  Top-level directory hierarchy and file type distribution breakdown.
                </p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateTab('structure')}
              >
                <span>Open Full Structure Explorer</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="overview-structure-preview-grid">
              {/* Left side: Root tree list */}
              <div className="overview-root-tree-card">
                <div className="overview-subcard-title">Top-Level Workspace Items</div>
                {rootTreePreview.length > 0 ? (
                  <div className="overview-root-items-list">
                    {rootTreePreview.slice(0, 10).map((item) => (
                      <div
                        key={item.id}
                        className="overview-root-item-row"
                        onClick={() =>
                          item.type === 'file'
                            ? onOpenFile?.(item.path)
                            : onNavigateTab('structure')
                        }
                      >
                        <div className="root-item-left">
                          {item.type === 'directory' ? (
                            <FolderTree size={14} color="var(--accent-blue)" />
                          ) : (
                            <FileText size={14} style={{ opacity: 0.7 }} />
                          )}
                          <span className="root-item-name">{item.name}</span>
                        </div>
                        <div className="root-item-right">
                          {item.type === 'directory' ? (
                            <span className="root-item-count">
                              {item.fileCount ?? (item.children?.length || 0)} items
                            </span>
                          ) : (
                            <span className="root-item-size">{formatFileSize(item.size)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {rootTreePreview.length > 10 && (
                      <div
                        className="overview-root-more-link"
                        onClick={() => onNavigateTab('structure')}
                      >
                        +{rootTreePreview.length - 10} more items in full structure explorer...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overview-empty-notice">
                    <span>No workspace root files or folders.</span>
                  </div>
                )}
              </div>

              {/* Right side: Category Breakdown */}
              <div className="overview-breakdown-card">
                <div className="overview-subcard-title">File Category Breakdown</div>
                {stats?.categoryBreakdown ? (
                  <div className="breakdown-grid">
                    <div className="breakdown-item">
                      <div className="breakdown-item-left">
                        <span className="category-dot source" />
                        <span>Source Code</span>
                      </div>
                      <span className="breakdown-count">{stats.sourceFiles || 0}</span>
                    </div>

                    <div className="breakdown-item">
                      <div className="breakdown-item-left">
                        <span className="category-dot test" />
                        <span>Tests & Specs</span>
                      </div>
                      <span className="breakdown-count">{stats.testFiles || 0}</span>
                    </div>

                    <div className="breakdown-item">
                      <div className="breakdown-item-left">
                        <span className="category-dot config" />
                        <span>Configuration</span>
                      </div>
                      <span className="breakdown-count">{stats.configFiles || 0}</span>
                    </div>

                    <div className="breakdown-item">
                      <div className="breakdown-item-left">
                        <span className="category-dot documentation" />
                        <span>Documentation</span>
                      </div>
                      <span className="breakdown-count">{stats.docFiles || 0}</span>
                    </div>

                    <div className="breakdown-item">
                      <div className="breakdown-item-left">
                        <span className="category-dot style" />
                        <span>Stylesheets</span>
                      </div>
                      <span className="breakdown-count">{stats.styleFiles || 0}</span>
                    </div>

                    <div className="breakdown-item">
                      <div className="breakdown-item-left">
                        <span className="category-dot asset" />
                        <span>Assets & Media</span>
                      </div>
                      <span className="breakdown-count">{stats.assetFiles || 0}</span>
                    </div>

                    <div className="breakdown-item">
                      <div className="breakdown-item-left">
                        <span className="category-dot lockfile" />
                        <span>Lockfiles</span>
                      </div>
                      <span className="breakdown-count">{stats.lockfiles || 0}</span>
                    </div>

                    <div className="breakdown-item">
                      <div className="breakdown-item-left">
                        <span className="category-dot data" />
                        <span>Data & Schema</span>
                      </div>
                      <span className="breakdown-count">{stats.dataFiles || 0}</span>
                    </div>
                  </div>
                ) : (
                  <div className="overview-empty-notice">
                    <span>No category statistics available.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 6: Quick Navigation Blueprint Grid */}
          <div className="blueprint-grid" style={{ marginTop: '8px' }}>
            <div
              className="blueprint-card"
              style={{ cursor: 'pointer' }}
              onClick={() => onNavigateTab('structure')}
            >
              <div className="blueprint-card-title">
                <FolderGit2 size={16} color="var(--accent-blue)" />
                <span>Explore Project Structure</span>
                <ArrowRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />
              </div>
              <div className="blueprint-card-body">
                View the interactive directory tree with {stats?.totalFiles || 0} discovered files.
              </div>
            </div>

            <div
              className="blueprint-card"
              style={{ cursor: 'pointer' }}
              onClick={() => onNavigateTab('architecture')}
            >
              <div className="blueprint-card-title">
                <Layers size={16} color="var(--accent-cyan)" />
                <span>Architecture & Roles</span>
                <span className="section-badge" style={{ color: '#67e8f9' }}>
                  {arch?.summary?.layersCount ?? 0} Layers
                </span>
                <ArrowRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />
              </div>
              <div className="blueprint-card-body">
                Explore {arch?.summary?.classifiedModulesCount ?? 0} classified roles,{' '}
                {arch?.summary?.layersCount ?? 0} architectural tiers, and higher-level
                interactions.
              </div>
            </div>

            <div
              className="blueprint-card"
              style={{ cursor: 'pointer' }}
              onClick={() => onNavigateTab('technology')}
            >
              <div className="blueprint-card-title">
                <Cpu size={16} color="var(--accent-cyan)" />
                <span>Technology Stack & Evidence</span>
                <ArrowRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />
              </div>
              <div className="blueprint-card-body">
                Inspect all {technologies.length} detected technologies and evidence sources.
              </div>
            </div>

            <div
              className="blueprint-card"
              style={{ cursor: 'pointer' }}
              onClick={() => onNavigateTab('dependencies')}
            >
              <div className="blueprint-card-title">
                <Package size={16} color="var(--accent-purple)" />
                <span>Code Dependencies & Imports</span>
                <span className="section-badge" style={{ color: '#c4b5fd' }}>
                  {depGraph?.stats.totalLocalEdges ?? 0} Local Edges
                </span>
                <ArrowRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />
              </div>
              <div className="blueprint-card-body">
                Inspect {depGraph?.stats.totalLocalEdges ?? 0} local module relationships,{' '}
                {depGraph?.stats.totalExternalPackages ?? 0} external packages, and cycle
                detections.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
