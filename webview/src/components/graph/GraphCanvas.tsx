import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Package, ShieldAlert, GitFork, FileCode } from 'lucide-react';
import { GraphEdge, GraphMode, GraphNode } from '../../types';

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  mode: GraphMode;
  selectedNode: GraphNode | null;
  onSelectNode: (node: GraphNode | null) => void;
  zoomAction: { type: 'in' | 'out' | 'fit' | 'reset' | 'center'; targetNode?: GraphNode } | null;
  onZoomActionHandled: () => void;
}

const ROLE_COLORS: Record<string, { bg: string; border: string; text: string; iconColor: string }> =
  {
    entry_point: {
      bg: 'rgba(16, 185, 129, 0.12)',
      border: '#10b981',
      text: '#6ee7b7',
      iconColor: '#10b981',
    },
    page: {
      bg: 'rgba(59, 130, 246, 0.12)',
      border: '#3b82f6',
      text: '#93c5fd',
      iconColor: '#3b82f6',
    },
    route: {
      bg: 'rgba(96, 165, 250, 0.12)',
      border: '#60a5fa',
      text: '#bfdbfe',
      iconColor: '#60a5fa',
    },
    layout: {
      bg: 'rgba(6, 182, 212, 0.12)',
      border: '#06b6d4',
      text: '#67e8f9',
      iconColor: '#06b6d4',
    },
    component: {
      bg: 'rgba(139, 92, 246, 0.12)',
      border: '#8b5cf6',
      text: '#c4b5fd',
      iconColor: '#8b5cf6',
    },
    ui_component: {
      bg: 'rgba(168, 85, 247, 0.12)',
      border: '#a855f7',
      text: '#d8b4fe',
      iconColor: '#a855f7',
    },
    hook: {
      bg: 'rgba(236, 72, 153, 0.12)',
      border: '#ec4899',
      text: '#fbcfe8',
      iconColor: '#ec4899',
    },
    context: {
      bg: 'rgba(244, 63, 94, 0.12)',
      border: '#f43f5e',
      text: '#fecdd3',
      iconColor: '#f43f5e',
    },
    service: {
      bg: 'rgba(245, 158, 11, 0.12)',
      border: '#f59e0b',
      text: '#fde68a',
      iconColor: '#f59e0b',
    },
    api_client: {
      bg: 'rgba(234, 179, 8, 0.12)',
      border: '#eab308',
      text: '#fef08a',
      iconColor: '#eab308',
    },
    controller: {
      bg: 'rgba(217, 119, 6, 0.12)',
      border: '#d97706',
      text: '#fed7aa',
      iconColor: '#d97706',
    },
    model: {
      bg: 'rgba(20, 184, 166, 0.12)',
      border: '#14b8a6',
      text: '#99f6e4',
      iconColor: '#14b8a6',
    },
    repository: {
      bg: 'rgba(13, 148, 136, 0.12)',
      border: '#0d9488',
      text: '#5eead4',
      iconColor: '#0d9488',
    },
    utility: {
      bg: 'rgba(100, 116, 139, 0.12)',
      border: '#64748b',
      text: '#cbd5e1',
      iconColor: '#94a3b8',
    },
    config: {
      bg: 'rgba(148, 163, 184, 0.12)',
      border: '#94a3b8',
      text: '#e2e8f0',
      iconColor: '#94a3b8',
    },
    type_definition: {
      bg: 'rgba(56, 189, 248, 0.12)',
      border: '#38bdf8',
      text: '#bae6fd',
      iconColor: '#38bdf8',
    },
    schema: {
      bg: 'rgba(45, 212, 191, 0.12)',
      border: '#2dd4bf',
      text: '#a7f3d0',
      iconColor: '#2dd4bf',
    },
    test: {
      bg: 'rgba(34, 197, 94, 0.12)',
      border: '#22c55e',
      text: '#bbf7d0',
      iconColor: '#22c55e',
    },
    unknown: {
      bg: 'rgba(113, 113, 122, 0.12)',
      border: '#71717a',
      text: '#d4d4d8',
      iconColor: '#a1a1aa',
    },
  };

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  mode,
  selectedNode,
  onSelectNode,
  zoomAction,
  onZoomActionHandled,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 40, y: 40, scale: 0.85 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging individual node
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Sync node positions when nodes change
  useEffect(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    for (const n of nodes) {
      pos[n.id] = { x: n.x, y: n.y };
    }
    setNodePositions(pos);
  }, [nodes]);

  // Handle Zoom Actions triggered from controls/parent
  useEffect(() => {
    if (!zoomAction) return;

    if (zoomAction.type === 'in') {
      setTransform((prev) => ({
        ...prev,
        scale: Math.min(prev.scale * 1.25, 3.0),
      }));
    } else if (zoomAction.type === 'out') {
      setTransform((prev) => ({
        ...prev,
        scale: Math.max(prev.scale / 1.25, 0.2),
      }));
    } else if (zoomAction.type === 'reset') {
      setTransform({ x: 40, y: 40, scale: 0.85 });
    } else if (zoomAction.type === 'fit') {
      fitToScreen();
    } else if (zoomAction.type === 'center' && zoomAction.targetNode) {
      const pos = nodePositions[zoomAction.targetNode.id] || {
        x: zoomAction.targetNode.x,
        y: zoomAction.targetNode.y,
      };
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setTransform({
          x: rect.width / 2 - pos.x * 1.0 - 85,
          y: rect.height / 2 - pos.y * 1.0 - 25,
          scale: 1.0,
        });
      }
    }

    onZoomActionHandled();
  }, [zoomAction, nodePositions, onZoomActionHandled]);

  const fitToScreen = useCallback(() => {
    if (!containerRef.current || nodes.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const n of nodes) {
      const pos = nodePositions[n.id] || { x: n.x, y: n.y };
      if (pos.x < minX) minX = pos.x;
      if (pos.x + 170 > maxX) maxX = pos.x + 170;
      if (pos.y < minY) minY = pos.y;
      if (pos.y + 46 > maxY) maxY = pos.y + 46;
    }

    const graphWidth = Math.max(maxX - minX, 100);
    const graphHeight = Math.max(maxY - minY, 100);
    const padding = 48;

    const availableW = Math.max(rect.width - padding * 2, 100);
    const availableH = Math.max(rect.height - padding * 2, 100);

    const scaleX = availableW / graphWidth;
    const scaleY = availableH / graphHeight;
    const rawScale = Math.min(scaleX, scaleY);
    // Ensure readable minimum scale
    const scale = Math.min(Math.max(rawScale, 0.72), 1.15);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const x = rect.width / 2 - centerX * scale;
    const y = rect.height / 2 - centerY * scale;

    setTransform({ x, y, scale });
  }, [nodes, nodePositions]);

  // Initial fit on mount or nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      fitToScreen();
    }
  }, [nodes.length, fitToScreen]);

  // ResizeObserver for dynamic window/sidebar resizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      // Re-fit when container size changes meaningfully
      fitToScreen();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitToScreen]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(Math.max(transform.scale * zoomFactor, 0.2), 3.0);

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
    const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);

    setTransform({ x: newX, y: newY, scale: newScale });
  };

  // Canvas pan mousedown
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  // Canvas mousemove for pan or node drag
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }));
    } else if (draggedNodeId) {
      const pos = {
        x: (e.clientX - transform.x - dragOffset.x) / transform.scale,
        y: (e.clientY - transform.y - dragOffset.y) / transform.scale,
      };
      setNodePositions((prev) => ({ ...prev, [draggedNodeId]: pos }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  // Neighborhood identification when a node is selected
  const { connectedNodeIds, connectedEdgeIds } = useMemo(() => {
    if (!selectedNode) {
      return { connectedNodeIds: new Set<string>(), connectedEdgeIds: new Set<string>() };
    }
    const nodeIds = new Set<string>([selectedNode.id]);
    const edgeIds = new Set<string>();

    for (const edge of edges) {
      if (edge.source === selectedNode.id) {
        nodeIds.add(edge.target);
        edgeIds.add(edge.id);
      }
      if (edge.target === selectedNode.id) {
        nodeIds.add(edge.source);
        edgeIds.add(edge.id);
      }
    }

    return { connectedNodeIds: nodeIds, connectedEdgeIds: edgeIds };
  }, [selectedNode, edges]);

  // Compute curved Bezier edge path
  const getEdgePath = (sourceId: string, targetId: string) => {
    const sPos = nodePositions[sourceId] || { x: 0, y: 0 };
    const tPos = nodePositions[targetId] || { x: 0, y: 0 };

    const sx = sPos.x + 85;
    const sy = sPos.y + 44;
    const tx = tPos.x + 85;
    const ty = tPos.y;

    const dy = ty - sy;
    const cy1 = sy + Math.max(dy / 2, 40);
    const cy2 = ty - Math.max(dy / 2, 40);

    return `M ${sx} ${sy} C ${sx} ${cy1}, ${tx} ${cy2}, ${tx} ${ty}`;
  };

  return (
    <div
      className="graph-canvas-wrapper"
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={(e) => {
        if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
          onSelectNode(null);
        }
      }}
    >
      <svg className="graph-svg-layer">
        <defs>
          {/* Arrowhead Markers */}
          <marker
            id="arrow-default"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" opacity="0.8" />
          </marker>

          <marker
            id="arrow-active-out"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#8b5cf6" />
          </marker>

          <marker
            id="arrow-active-in"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#06b6d4" />
          </marker>

          <marker
            id="arrow-cycle"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
          </marker>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Render Edges */}
          {edges.map((edge) => {
            const isHighlighted = selectedNode && connectedEdgeIds.has(edge.id);
            const isDimmed = selectedNode && !connectedEdgeIds.has(edge.id);
            const isOutgoing = selectedNode && edge.source === selectedNode.id;
            const isIncoming = selectedNode && edge.target === selectedNode.id;

            let strokeColor = '#475569';
            let markerId = 'arrow-default';

            if (edge.isCycleEdge) {
              strokeColor = '#f59e0b';
              markerId = 'arrow-cycle';
            } else if (isOutgoing) {
              strokeColor = '#8b5cf6';
              markerId = 'arrow-active-out';
            } else if (isIncoming) {
              strokeColor = '#06b6d4';
              markerId = 'arrow-active-in';
            }

            const pathData = getEdgePath(edge.source, edge.target);

            return (
              <g key={edge.id} className="graph-edge-group">
                <path
                  d={pathData}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isHighlighted ? 2.5 : edge.isCycleEdge ? 2 : 1.5}
                  strokeDasharray={edge.isCycleEdge ? '5,4' : undefined}
                  opacity={isDimmed ? 0.12 : 0.85}
                  markerEnd={`url(#${markerId})`}
                  className={edge.isCycleEdge ? 'edge-cycle-pulse' : undefined}
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* Render Interactive DOM Nodes */}
      <div
        className="graph-nodes-layer"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
        }}
      >
        {nodes.map((node) => {
          const pos = nodePositions[node.id] || { x: node.x, y: node.y };
          const isSelected = selectedNode?.id === node.id;
          const isConnected = selectedNode && connectedNodeIds.has(node.id);
          const isDimmed = selectedNode && !isSelected && !isConnected;

          const roleTheme = ROLE_COLORS[node.role] || ROLE_COLORS.unknown;

          return (
            <div
              key={node.id}
              className={`graph-node-card ${isSelected ? 'selected' : ''} ${
                node.isExternal ? 'external-node' : ''
              } ${node.isCycleMember ? 'cycle-member' : ''} ${isDimmed ? 'dimmed' : ''}`}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                borderColor: isSelected
                  ? 'var(--accent-blue)'
                  : node.isCycleMember
                    ? 'var(--accent-amber)'
                    : roleTheme.border,
                backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : roleTheme.bg,
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggedNodeId(node.id);
                setDragOffset({
                  x: e.clientX - transform.x - pos.x * transform.scale,
                  y: e.clientY - transform.y - pos.y * transform.scale,
                });
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(node);
              }}
              title={`${node.filePath} (${node.role})`}
            >
              <div className="node-card-header">
                <div className="node-icon-wrap" style={{ color: roleTheme.iconColor }}>
                  {node.isExternal ? (
                    <Package size={13} />
                  ) : node.isEntryPoint ? (
                    <GitFork size={13} color="var(--accent-green)" />
                  ) : (
                    <FileCode size={13} />
                  )}
                </div>
                <div className="node-label" title={node.label}>
                  {node.label}
                </div>
                {node.isCycleMember && (
                  <span
                    title="In circular cycle"
                    className="cycle-icon-indicator"
                    style={{ display: 'inline-flex' }}
                  >
                    <ShieldAlert size={13} color="var(--accent-amber)" />
                  </span>
                )}
              </div>

              <div className="node-card-footer">
                {mode === 'architecture' ? (
                  <>
                    <span className="node-role-chip" style={{ color: roleTheme.text }}>
                      {node.role.replace(/_/g, ' ')}
                    </span>
                    {node.isEntryPoint && <span className="node-entry-badge">ENTRY</span>}
                  </>
                ) : (
                  <div className="node-dep-counts">
                    <span>{node.fanIn} in</span>
                    <span>•</span>
                    <span>{node.fanOut} out</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* No Relationships Notice overlay if nodes exist but 0 edges */}
      {nodes.length > 0 && edges.length === 0 && (
        <div className="graph-no-edges-notice">
          <div className="no-edges-card">
            <span>No local dependency relationships were detected for the current filter.</span>
          </div>
        </div>
      )}
    </div>
  );
};
