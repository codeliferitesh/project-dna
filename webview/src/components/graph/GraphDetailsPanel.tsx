import React from 'react';
import {
  FileCode,
  Package,
  ExternalLink,
  ShieldAlert,
  X,
  Crosshair,
  Maximize,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { GraphEdge, GraphNode } from '../../types';

interface GraphDetailsPanelProps {
  node: GraphNode | null;
  edges: GraphEdge[];
  nodesMap: Map<string, GraphNode>;
  onOpenFile?: (path: string) => void;
  onFocusNode: (node: GraphNode) => void;
  onFocusNeighborhood: (node: GraphNode) => void;
  onSelectNode: (node: GraphNode) => void;
  onClose: () => void;
}

export const GraphDetailsPanel: React.FC<GraphDetailsPanelProps> = ({
  node,
  edges,
  nodesMap,
  onOpenFile,
  onFocusNode,
  onFocusNeighborhood,
  onSelectNode,
  onClose,
}) => {
  if (!node) return null;

  // Find incoming and outgoing edges for this node
  const incomingEdges = edges.filter((e) => e.target === node.id);
  const outgoingEdges = edges.filter((e) => e.source === node.id);

  return (
    <div className="graph-details-panel">
      {/* Panel Header */}
      <div className="graph-details-header">
        <div className="details-header-title">
          {node.isExternal ? (
            <Package size={16} color="#94a3b8" />
          ) : (
            <FileCode size={16} color="var(--accent-blue)" />
          )}
          <span className="details-file-name" title={node.filePath}>
            {node.label}
          </span>
        </div>
        <button className="graph-details-close-btn" onClick={onClose} title="Close details panel">
          <X size={14} />
        </button>
      </div>

      {/* Primary Path */}
      <div className="details-path-row">
        <span className="details-path-text mono-text" title={node.filePath}>
          {node.filePath}
        </span>
      </div>

      {/* Cycle Warning Banner */}
      {node.isCycleMember && (
        <div className="details-cycle-banner">
          <ShieldAlert size={14} />
          <div>
            <strong>Cycle Member: </strong>
            Part of a {node.cycleLength || 'cyclic'}-module circular dependency loop.
          </div>
        </div>
      )}

      {/* Metadata Badges Grid */}
      <div className="details-meta-grid">
        <div className="details-meta-card">
          <span className="details-meta-label">Architectural Role</span>
          <span className="details-meta-value role-badge">{node.role.replace(/_/g, ' ')}</span>
        </div>

        <div className="details-meta-card">
          <span className="details-meta-label">Layer Tier</span>
          <span className="details-meta-value layer-badge">{node.layer.replace(/_/g, ' ')}</span>
        </div>

        <div className="details-meta-card">
          <span className="details-meta-label">Confidence</span>
          <span className="details-meta-value">{Math.round(node.confidence * 100)}%</span>
        </div>

        <div className="details-meta-card">
          <span className="details-meta-label">Entry Point</span>
          <span
            className="details-meta-value"
            style={{ color: node.isEntryPoint ? 'var(--accent-green)' : 'var(--text-muted)' }}
          >
            {node.isEntryPoint ? 'Yes (Detected)' : 'No'}
          </span>
        </div>

        <div className="details-meta-card">
          <span className="details-meta-label">Fan-In (Incoming)</span>
          <span className="details-meta-value font-mono">{node.fanIn}</span>
        </div>

        <div className="details-meta-card">
          <span className="details-meta-label">Fan-Out (Outgoing)</span>
          <span className="details-meta-value font-mono">{node.fanOut}</span>
        </div>
      </div>

      {/* Actions Row */}
      <div className="details-actions-bar">
        {!node.isExternal && onOpenFile && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onOpenFile(node.filePath)}
            title="Open this file in VS Code editor"
          >
            <ExternalLink size={12} />
            <span>Open File</span>
          </button>
        )}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onFocusNode(node)}
          title="Center canvas on this node"
        >
          <Crosshair size={12} />
          <span>Center</span>
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onFocusNeighborhood(node)}
          title="Focus on this node and its 1-hop connected neighbors"
        >
          <Maximize size={12} />
          <span>Neighborhood</span>
        </button>
      </div>

      {/* Outgoing Relationships */}
      <div className="details-relations-section">
        <div className="details-section-title">
          <ArrowRight size={13} color="var(--accent-purple)" />
          <span>Outgoing Dependencies ({outgoingEdges.length})</span>
        </div>
        {outgoingEdges.length > 0 ? (
          <div className="details-relation-list">
            {outgoingEdges.map((edge) => {
              const targetNode = nodesMap.get(edge.target);
              return (
                <div
                  key={edge.id}
                  className="details-relation-row"
                  onClick={() => targetNode && onSelectNode(targetNode)}
                  title={targetNode ? `Click to inspect ${targetNode.label}` : undefined}
                >
                  <div className="relation-target-info">
                    <span className="relation-type-chip">{edge.relationshipType}</span>
                    <span className="relation-target-label">
                      {targetNode ? targetNode.label : edge.target}
                    </span>
                  </div>
                  {edge.isCycleEdge && <span className="cycle-edge-badge">Cycle</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="details-empty-subtext">No outgoing local dependencies.</div>
        )}
      </div>

      {/* Incoming Relationships */}
      <div className="details-relations-section">
        <div className="details-section-title">
          <ArrowLeft size={13} color="var(--accent-cyan)" />
          <span>Incoming Dependents ({incomingEdges.length})</span>
        </div>
        {incomingEdges.length > 0 ? (
          <div className="details-relation-list">
            {incomingEdges.map((edge) => {
              const sourceNode = nodesMap.get(edge.source);
              return (
                <div
                  key={edge.id}
                  className="details-relation-row"
                  onClick={() => sourceNode && onSelectNode(sourceNode)}
                  title={sourceNode ? `Click to inspect ${sourceNode.label}` : undefined}
                >
                  <div className="relation-target-info">
                    <span className="relation-type-chip">{edge.relationshipType}</span>
                    <span className="relation-target-label">
                      {sourceNode ? sourceNode.label : edge.source}
                    </span>
                  </div>
                  {edge.isCycleEdge && <span className="cycle-edge-badge">Cycle</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="details-empty-subtext">No incoming local dependents.</div>
        )}
      </div>
    </div>
  );
};
