import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { ArchitecturalLayer, ArchitecturalRole, GraphFilterState, GraphNode } from '../../types';

interface GraphFiltersProps {
  filters: GraphFilterState;
  onFilterChange: (filters: Partial<GraphFilterState>) => void;
  activeLayers: ArchitecturalLayer[];
  activeRoles: ArchitecturalRole[];
  activeRelationships: string[];
  nodes: GraphNode[];
  onSelectNode: (node: GraphNode) => void;
}

const LAYER_LABELS: Record<ArchitecturalLayer, string> = {
  presentation: 'Presentation Tier',
  routing: 'Routing Tier',
  application: 'Application Tier',
  domain: 'Domain & Types',
  services: 'Services & Logic',
  data_access: 'Data Access Tier',
  infrastructure: 'Infrastructure Tier',
  configuration: 'Configuration',
  testing: 'Testing',
  shared_utility: 'Shared Utilities',
  unknown: 'Unclassified Tier',
};

const ROLE_LABELS: Record<ArchitecturalRole, string> = {
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
  constant: 'Constant',
  asset_module: 'Asset Module',
  unknown: 'Unclassified Role',
};

export const GraphFilters: React.FC<GraphFiltersProps> = ({
  filters,
  onFilterChange,
  activeLayers,
  activeRoles,
  activeRelationships,
  nodes,
  onSelectNode,
}) => {
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Search matches
  const searchResults = React.useMemo(() => {
    if (!filters.searchQuery.trim()) return [];
    const query = filters.searchQuery.toLowerCase().trim();
    return nodes
      .filter(
        (n) =>
          n.label.toLowerCase().includes(query) ||
          n.filePath.toLowerCase().includes(query) ||
          n.role.toLowerCase().includes(query) ||
          n.layer.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [filters.searchQuery, nodes]);

  // Click outside listener for search suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="graph-filters-bar">
      {/* Search Bar with Autocomplete */}
      <div className="graph-search-container" ref={searchContainerRef}>
        <Search size={13} className="graph-search-icon" />
        <input
          type="text"
          className="graph-search-input"
          placeholder="Search file, path, role, or layer..."
          value={filters.searchQuery}
          onChange={(e) => {
            onFilterChange({ searchQuery: e.target.value });
            setShowSearchDropdown(true);
          }}
          onFocus={() => setShowSearchDropdown(true)}
        />
        {filters.searchQuery && (
          <button
            className="graph-search-clear"
            onClick={() => onFilterChange({ searchQuery: '' })}
            title="Clear search"
          >
            <X size={12} />
          </button>
        )}

        {/* Dropdown Suggestions */}
        {showSearchDropdown && searchResults.length > 0 && (
          <div className="graph-search-dropdown">
            {searchResults.map((node) => (
              <div
                key={node.id}
                className="graph-search-result-item"
                onClick={() => {
                  onSelectNode(node);
                  setShowSearchDropdown(false);
                }}
              >
                <div className="search-result-name">{node.label}</div>
                <div className="search-result-meta">
                  <span className="search-result-role">{ROLE_LABELS[node.role] || node.role}</span>
                  <span className="search-result-path">{node.filePath}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Layer Filter Dropdown */}
      <div className="graph-filter-select-wrap">
        <label className="filter-select-label">Layer:</label>
        <select
          className="graph-select"
          value={filters.selectedLayer}
          onChange={(e) => onFilterChange({ selectedLayer: e.target.value })}
        >
          <option value="all">All Layers ({activeLayers.length})</option>
          {activeLayers.map((layer) => (
            <option key={layer} value={layer}>
              {LAYER_LABELS[layer] || layer}
            </option>
          ))}
        </select>
      </div>

      {/* Role Filter Dropdown */}
      <div className="graph-filter-select-wrap">
        <label className="filter-select-label">Role:</label>
        <select
          className="graph-select"
          value={filters.selectedRole}
          onChange={(e) => onFilterChange({ selectedRole: e.target.value })}
        >
          <option value="all">All Roles ({activeRoles.length})</option>
          {activeRoles.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role] || role}
            </option>
          ))}
        </select>
      </div>

      {/* Relationship Filter Dropdown */}
      <div className="graph-filter-select-wrap">
        <label className="filter-select-label">Relationship:</label>
        <select
          className="graph-select"
          value={filters.selectedRelationship}
          onChange={(e) => onFilterChange({ selectedRelationship: e.target.value })}
        >
          <option value="all">All Relationships ({activeRelationships.length})</option>
          {activeRelationships.map((rel) => (
            <option key={rel} value={rel}>
              {rel}
            </option>
          ))}
        </select>
      </div>

      {/* Reset Filters button if any filter active */}
      {(filters.selectedLayer !== 'all' ||
        filters.selectedRole !== 'all' ||
        filters.selectedRelationship !== 'all' ||
        filters.entryPointsOnly ||
        filters.searchQuery) && (
        <button
          className="btn btn-secondary btn-sm"
          onClick={() =>
            onFilterChange({
              selectedLayer: 'all',
              selectedRole: 'all',
              selectedRelationship: 'all',
              entryPointsOnly: false,
              searchQuery: '',
            })
          }
          title="Clear all active graph filters"
        >
          <span>Reset Filters</span>
        </button>
      )}
    </div>
  );
};
