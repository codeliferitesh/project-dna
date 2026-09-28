import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { GraphControls } from '../components/graph/GraphControls';
import { GraphFilters } from '../components/graph/GraphFilters';
import { GraphCanvas } from '../components/graph/GraphCanvas';
import { GraphDetailsPanel } from '../components/graph/GraphDetailsPanel';
import { GraphLegend } from '../components/graph/GraphLegend';
import { GraphFilterState, GraphMode, GraphNode, ProjectStatePayload } from '../types';
import { buildGraphData } from '../utils/graphBuilder';

interface GraphPageProps {
  state: ProjectStatePayload;
  onOpenFile?: (path: string, line?: number) => void;
  onAnalyze: () => void;
}

const INITIAL_FILTERS: GraphFilterState = {
  selectedLayer: 'all',
  selectedRole: 'all',
  selectedRelationship: 'all',
  showExternal: false,
  entryPointsOnly: false,
  searchQuery: '',
};

export const GraphPage: React.FC<GraphPageProps> = ({ state, onOpenFile, onAnalyze }) => {
  const { info, analysis, isAnalyzing } = state;
  const [mode, setMode] = useState<GraphMode>('architecture');
  const [filters, setFilters] = useState<GraphFilterState>(INITIAL_FILTERS);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoomAction, setZoomAction] = useState<{
    type: 'in' | 'out' | 'fit' | 'reset' | 'center';
    targetNode?: GraphNode;
  } | null>(null);

  const handleFilterChange = useCallback((partial: Partial<GraphFilterState>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  // Compute graph data using memoized builder
  const graphData = useMemo(() => {
    return buildGraphData(analysis, filters);
  }, [analysis, filters]);

  // Fast node lookup map
  const nodesMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const n of graphData.nodes) {
      map.set(n.id, n);
    }
    return map;
  }, [graphData.nodes]);

  // Update selectedNode instance if graphData updates
  useEffect(() => {
    if (selectedNode) {
      const updated = nodesMap.get(selectedNode.id);
      if (updated) {
        setSelectedNode(updated);
      }
    }
  }, [nodesMap]);

  const handleFocusNode = (node: GraphNode) => {
    setSelectedNode(node);
    setZoomAction({ type: 'center', targetNode: node });
  };

  const handleFocusNeighborhood = (node: GraphNode) => {
    setSelectedNode(node);
    // Focus neighborhood: select node and center
    setZoomAction({ type: 'center', targetNode: node });
  };

  // Check for large graph safeguard
  const isLargeGraph = graphData.nodes.length > 80;

  if (!info.isWorkspaceOpen || !info.isAnalyzed) {
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
    <div className="graph-page-container">
      {/* Top Header & Controls */}
      <div className="graph-top-header">
        <GraphControls
          mode={mode}
          onModeChange={setMode}
          filters={filters}
          onFilterChange={handleFilterChange}
          onZoomIn={() => setZoomAction({ type: 'in' })}
          onZoomOut={() => setZoomAction({ type: 'out' })}
          onFitGraph={() => setZoomAction({ type: 'fit' })}
          onResetView={() => setZoomAction({ type: 'reset' })}
          totalNodes={graphData.nodes.length}
          totalEdges={graphData.edges.length}
          cycleCount={graphData.cycleCount}
          entryPointCount={graphData.entryPointCount}
        />

        <GraphFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          activeLayers={graphData.activeLayers}
          activeRoles={graphData.activeRoles}
          activeRelationships={graphData.activeRelationships}
          nodes={graphData.nodes}
          onSelectNode={handleFocusNode}
        />
      </div>

      {/* Large Graph Advisory Notice */}
      {isLargeGraph && (
        <div className="graph-large-advisory">
          <AlertCircle size={13} />
          <span>
            Large graph detected ({graphData.nodes.length} nodes). Use role, layer, or search
            filters to focus your view.
          </span>
        </div>
      )}

      {/* Main Workspace: Canvas + Docked Details Panel */}
      <div className="graph-main-workspace">
        <div className="graph-canvas-area">
          <GraphCanvas
            nodes={graphData.nodes}
            edges={graphData.edges}
            mode={mode}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            zoomAction={zoomAction}
            onZoomActionHandled={() => setZoomAction(null)}
          />

          {/* Floating Legend in Corner */}
          <GraphLegend
            activeRoles={graphData.activeRoles}
            activeRelationships={graphData.activeRelationships}
            showExternal={filters.showExternal}
          />
        </div>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <GraphDetailsPanel
            node={selectedNode}
            edges={graphData.edges}
            nodesMap={nodesMap}
            onOpenFile={onOpenFile}
            onFocusNode={handleFocusNode}
            onFocusNeighborhood={handleFocusNeighborhood}
            onSelectNode={handleFocusNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
};
