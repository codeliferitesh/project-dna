import React, { useState, useMemo } from 'react';
import { Cpu, Sparkles } from 'lucide-react';
import { TechnologyCard } from '../components/TechnologyCard';
import { TechnologyDetailModal } from '../components/TechnologyDetailModal';
import { ProjectStatePayload, TechnologyCategory, TechnologyInfo } from '../types';

interface TechnologyPageProps {
  state: ProjectStatePayload;
  onOpenFile: (path: string) => void;
  onAnalyze: () => void;
}

const CATEGORY_TITLES: Record<TechnologyCategory, string> = {
  language: 'Languages',
  framework: 'Frameworks',
  library: 'Libraries & Components',
  runtime: 'Runtime Environments',
  styling: 'Styling & Design',
  backend: 'Backend & APIs',
  database: 'Databases & ORMs',
  buildTool: 'Build Tools & Bundlers',
  packageManager: 'Package Managers',
  cloud: 'Cloud & Deployment',
  service: 'Platform Services',
  testing: 'Testing & QA',
  tooling: 'Tooling & Formatters',
  other: 'Other Technologies',
};

export const TechnologyPage: React.FC<TechnologyPageProps> = ({ state, onOpenFile, onAnalyze }) => {
  const { info, analysis, isAnalyzing } = state;
  const technologies = analysis?.technologies || [];

  const [selectedTech, setSelectedTech] = useState<TechnologyInfo | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  // Available categories in the detected list
  const availableCategories = useMemo(() => {
    const cats = new Set<TechnologyCategory>();
    technologies.forEach((t) => cats.add(t.category));
    return Array.from(cats);
  }, [technologies]);

  // Filtered technologies
  const filteredTechs = useMemo(() => {
    if (activeCategoryFilter === 'all') {
      return technologies;
    }
    return technologies.filter((t) => t.category === activeCategoryFilter);
  }, [technologies, activeCategoryFilter]);

  // Grouped technologies
  const groupedTechs = useMemo(() => {
    const groups: Record<string, TechnologyInfo[]> = {};
    for (const tech of filteredTechs) {
      if (!groups[tech.category]) {
        groups[tech.category] = [];
      }
      groups[tech.category].push(tech);
    }
    return groups;
  }, [filteredTechs]);

  if (!info.isWorkspaceOpen || !info.isAnalyzed) {
    return (
      <div className="section-view">
        <div className="section-header">
          <div className="section-title-wrap">
            <Cpu size={18} color="#06b6d4" />
            <h2 className="section-title">Technology Stack</h2>
            <span className="section-badge">Evidence-Based</span>
          </div>
        </div>

        <div className="empty-state-box">
          <Sparkles className="empty-state-icon" />
          <div className="empty-state-title">Technology stack not analyzed yet.</div>
          <p className="empty-state-text">
            Run Project DNA analysis to detect programming languages, frameworks, styling systems,
            build tools, and databases with verifiable evidence.
          </p>
          <button
            className="btn btn-primary"
            onClick={onAnalyze}
            disabled={!info.isWorkspaceOpen || isAnalyzing}
            style={{ marginTop: 8 }}
          >
            <span>{isAnalyzing ? 'Analyzing...' : 'Detect Technologies'}</span>
          </button>
        </div>
      </div>
    );
  }

  if (technologies.length === 0) {
    return (
      <div className="section-view">
        <div className="section-header">
          <div className="section-title-wrap">
            <Cpu size={18} color="#06b6d4" />
            <h2 className="section-title">Technology Stack</h2>
            <span className="section-badge">0 Detected</span>
          </div>
        </div>

        <div className="empty-state-box">
          <Cpu className="empty-state-icon" />
          <div className="empty-state-title">No recognized technologies found.</div>
          <p className="empty-state-text">
            No known frameworks, configuration signatures, or language manifests were detected in
            this workspace.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-view">
      <div className="section-header">
        <div className="section-title-wrap">
          <Cpu size={18} color="#06b6d4" />
          <h2 className="section-title">Technology Stack</h2>
          <span className="section-badge">
            {technologies.length} Detected • {availableCategories.length} Categories
          </span>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="tech-filter-bar">
        <button
          className={`filter-btn ${activeCategoryFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategoryFilter('all')}
        >
          <span>All</span>
          <span className="filter-count">{technologies.length}</span>
        </button>

        {availableCategories.map((cat) => {
          const count = technologies.filter((t) => t.category === cat).length;
          return (
            <button
              key={cat}
              className={`filter-btn ${activeCategoryFilter === cat ? 'active' : ''}`}
              onClick={() => setActiveCategoryFilter(cat)}
            >
              <span>{CATEGORY_TITLES[cat] || cat}</span>
              <span className="filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Grouped Category Sections */}
      {Object.entries(groupedTechs).map(([category, items]) => (
        <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="tech-group-title">
            <span>{CATEGORY_TITLES[category as TechnologyCategory] || category}</span>
            <span className="tech-group-divider" />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({items.length})</span>
          </div>

          <div className="tech-grid">
            {items.map((tech) => (
              <TechnologyCard
                key={tech.id + ':' + tech.category}
                tech={tech}
                onClick={() => setSelectedTech(tech)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Detail Evidence Modal */}
      <TechnologyDetailModal
        tech={selectedTech}
        onClose={() => setSelectedTech(null)}
        onOpenFile={onOpenFile}
      />
    </div>
  );
};
