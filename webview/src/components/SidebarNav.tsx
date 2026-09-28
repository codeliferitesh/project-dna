import React from 'react';
import {
  LayoutDashboard,
  FolderTree,
  Layers,
  Workflow,
  Cpu,
  Package,
  Network,
  Sliders,
  GitBranch,
} from 'lucide-react';
import { NavigationTab } from '../types';

interface SidebarNavProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

interface NavItemConfig {
  id: NavigationTab;
  label: string;
  icon: React.ReactNode;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ activeTab, onSelectTab }) => {
  const items: NavItemConfig[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="nav-icon" /> },
    { id: 'structure', label: 'Structure', icon: <FolderTree className="nav-icon" /> },
    { id: 'architecture', label: 'Architecture', icon: <Layers className="nav-icon" /> },
    { id: 'graph', label: 'Graph', icon: <Workflow className="nav-icon" /> },
    { id: 'technology', label: 'Technology', icon: <Cpu className="nav-icon" /> },
    { id: 'dependencies', label: 'Dependencies', icon: <Package className="nav-icon" /> },
    { id: 'apis', label: 'APIs', icon: <Network className="nav-icon" /> },
    { id: 'configuration', label: 'Configuration', icon: <Sliders className="nav-icon" /> },
    { id: 'git', label: 'Git', icon: <GitBranch className="nav-icon" /> },
  ];

  return (
    <nav className="app-nav" aria-label="Project DNA Navigation">
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
