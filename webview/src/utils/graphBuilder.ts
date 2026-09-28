import {
  ArchitecturalLayer,
  ArchitecturalRole,
  GraphData,
  GraphEdge,
  GraphFilterState,
  GraphNode,
  ProjectAnalysis,
} from '../types';

export const ROLE_TIER_MAP: Record<ArchitecturalRole, number> = {
  entry_point: 0,
  layout: 1,
  page: 1,
  route: 1,
  backend_route: 1,
  component: 2,
  ui_component: 2,
  hook: 3,
  context: 3,
  state_management: 3,
  service: 4,
  api_client: 4,
  controller: 4,
  model: 5,
  repository: 5,
  schema: 5,
  type_definition: 6,
  utility: 6,
  constant: 6,
  middleware: 6,
  worker: 6,
  config: 6,
  asset_module: 6,
  test: 6,
  unknown: 6,
};

/**
 * Builds deterministic GraphData (nodes and edges) from ProjectAnalysis.
 */
export function buildGraphData(
  analysis: ProjectAnalysis | null,
  filters: GraphFilterState
): GraphData {
  if (!analysis) {
    return {
      nodes: [],
      edges: [],
      activeRoles: [],
      activeLayers: [],
      activeRelationships: [],
      cycleCount: 0,
      entryPointCount: 0,
    };
  }

  const depGraph = analysis.dependencyGraph;
  const arch = analysis.architecture;
  const rawNodesMap = new Map<string, GraphNode>();

  // 1. Identify cycle members from circular groups
  const cycleMembers = new Map<string, number>(); // path -> cycleLength
  const cycleEdgesSet = new Set<string>(); // "source->target"

  if (depGraph?.circularGroups) {
    for (const group of depGraph.circularGroups) {
      const cycle = group.cycle;
      for (let i = 0; i < cycle.length; i++) {
        const node = cycle[i];
        cycleMembers.set(node, group.length);
        if (i < cycle.length - 1) {
          cycleEdgesSet.add(`${cycle[i]}->${cycle[i + 1]}`);
        }
      }
    }
  }

  // 2. Build local module nodes from architecture modules or dependency nodes
  const archModules = arch?.modules || {};
  const depNodes = depGraph?.nodes || {};
  const allModulePaths = new Set<string>([...Object.keys(archModules), ...Object.keys(depNodes)]);

  for (const path of allModulePaths) {
    const archMod = archModules[path];
    const depMod = depNodes[path];

    const label = path.split('/').pop() || path;
    const role: ArchitecturalRole = archMod?.primaryRole || 'unknown';
    const layer: ArchitecturalLayer = archMod?.layer || 'unknown';
    const confidence = archMod?.confidence ?? 0.8;
    const isEntryPoint = archMod?.isEntryPoint || false;
    const fanIn = archMod?.fanIn ?? depMod?.importedByCount ?? 0;
    const fanOut = archMod?.fanOut ?? depMod?.dependenciesCount ?? 0;
    const isCycleMember = cycleMembers.has(path);
    const cycleLength = cycleMembers.get(path);

    const node: GraphNode = {
      id: path,
      label,
      filePath: path,
      role,
      layer,
      confidence,
      isEntryPoint,
      fanIn,
      fanOut,
      isExternal: false,
      isCycleMember,
      cycleLength,
      secondaryRoles: archMod?.secondaryRoles,
      tier: ROLE_TIER_MAP[role] ?? 4,
      x: 0,
      y: 0,
    };

    rawNodesMap.set(path, node);
  }

  // 3. Build edges from Architecture relationships or Dependency edges
  const archRelationships = arch?.relationships || [];
  const depEdges = depGraph?.edges || [];
  const edgeDeduplicationMap = new Map<string, GraphEdge>();

  // Use Step 5 architectural relationships when available
  for (const rel of archRelationships) {
    const isCycleEdge = cycleEdgesSet.has(`${rel.sourcePath}->${rel.targetPath}`);
    const edgeId = `${rel.sourcePath}->${rel.targetPath}`;

    edgeDeduplicationMap.set(edgeId, {
      id: edgeId,
      source: rel.sourcePath,
      target: rel.targetPath,
      relationshipType: rel.type,
      confidence: rel.confidence,
      isCycleEdge,
      isExternal: false,
      description: rel.description,
    });
  }

  // Fallback / supplement with Step 4 dependency edges
  for (const edge of depEdges) {
    if (edge.resolution === 'resolved' && edge.targetFilePath) {
      const edgeId = `${edge.sourceFilePath}->${edge.targetFilePath}`;
      if (!edgeDeduplicationMap.has(edgeId)) {
        const isCycleEdge = cycleEdgesSet.has(edgeId);
        edgeDeduplicationMap.set(edgeId, {
          id: edgeId,
          source: edge.sourceFilePath,
          target: edge.targetFilePath,
          relationshipType: edge.type || 'imports',
          confidence: 0.9,
          isCycleEdge,
          isExternal: false,
          isTypeOnly: edge.isTypeOnly,
        });
      }
    }
  }

  // 4. Optionally add external package nodes and edges
  if (filters.showExternal && depGraph?.externalPackages) {
    for (const pkg of depGraph.externalPackages) {
      const pkgId = `ext:${pkg.name}`;
      if (!rawNodesMap.has(pkgId)) {
        rawNodesMap.set(pkgId, {
          id: pkgId,
          label: pkg.name,
          filePath: pkg.name,
          role: 'unknown',
          layer: 'infrastructure',
          confidence: 1.0,
          isEntryPoint: false,
          fanIn: pkg.count,
          fanOut: 0,
          isExternal: true,
          isCycleMember: false,
          tier: 7,
          x: 0,
          y: 0,
        });
      }

      // Create edges from importing local modules to external package
      for (const importer of pkg.importedBy) {
        if (rawNodesMap.has(importer)) {
          const edgeId = `${importer}->${pkgId}`;
          if (!edgeDeduplicationMap.has(edgeId)) {
            edgeDeduplicationMap.set(edgeId, {
              id: edgeId,
              source: importer,
              target: pkgId,
              relationshipType: 'imports',
              confidence: 1.0,
              isCycleEdge: false,
              isExternal: true,
              isTypeOnly: pkg.isTypeOnly,
              description: `External dependency ${pkg.name}`,
            });
          }
        }
      }
    }
  }

  // Convert map to array
  let allNodes = Array.from(rawNodesMap.values());
  let allEdges = Array.from(edgeDeduplicationMap.values());

  // Collect active metadata before filtering
  const activeRoles = Array.from(
    new Set(allNodes.filter((n) => !n.isExternal).map((n) => n.role))
  ).sort();
  const activeLayers = Array.from(
    new Set(allNodes.filter((n) => !n.isExternal).map((n) => n.layer))
  ).sort();
  const activeRelationships = Array.from(new Set(allEdges.map((e) => e.relationshipType))).sort();

  // 5. Apply filters
  // A. Layer filter
  if (filters.selectedLayer !== 'all') {
    allNodes = allNodes.filter((n) => n.isExternal || n.layer === filters.selectedLayer);
  }

  // B. Role filter
  if (filters.selectedRole !== 'all') {
    allNodes = allNodes.filter((n) => n.isExternal || n.role === filters.selectedRole);
  }

  // C. Entry points only filter (includes entry points and their direct 1-hop connected neighborhood)
  if (filters.entryPointsOnly) {
    const entryPointPaths = new Set(allNodes.filter((n) => n.isEntryPoint).map((n) => n.id));
    const neighborhoodPaths = new Set(entryPointPaths);

    // Add 1-hop outgoing and incoming connections of entry points
    for (const edge of allEdges) {
      if (entryPointPaths.has(edge.source)) {
        neighborhoodPaths.add(edge.target);
      }
      if (entryPointPaths.has(edge.target)) {
        neighborhoodPaths.add(edge.source);
      }
    }

    allNodes = allNodes.filter((n) => neighborhoodPaths.has(n.id));
  }

  // Keep only edges where both source and target exist in allNodes
  const validNodeIds = new Set(allNodes.map((n) => n.id));
  allEdges = allEdges.filter((e) => validNodeIds.has(e.source) && validNodeIds.has(e.target));

  // D. Relationship filter
  if (filters.selectedRelationship !== 'all') {
    allEdges = allEdges.filter((e) => e.relationshipType === filters.selectedRelationship);
  }

  // 6. Compute Hierarchical Layout Coordinates (x, y)
  layoutGraphNodes(allNodes, allEdges);

  return {
    nodes: allNodes,
    edges: allEdges,
    activeRoles,
    activeLayers,
    activeRelationships,
    cycleCount: depGraph?.stats.circularDependenciesCount ?? 0,
    entryPointCount: arch?.summary.entryPointsCount ?? 0,
  };
}

/**
 * Computes deterministic hierarchical layout positions for nodes to avoid overlaps.
 */
function layoutGraphNodes(nodes: GraphNode[], _edges: GraphEdge[]): void {
  if (nodes.length === 0) return;

  // Group nodes by tier (0 to 7)
  const tierGroups = new Map<number, GraphNode[]>();
  for (let i = 0; i <= 7; i++) {
    tierGroups.set(i, []);
  }

  for (const node of nodes) {
    const tier = node.tier ?? 4;
    const group = tierGroups.get(tier) || [];
    group.push(node);
    tierGroups.set(tier, group);
  }

  const nodeWidth = 170;
  const nodeHeight = 46;
  const xSpacing = 36;
  const subRowSpacing = 16;
  const tierGap = 54;
  const maxCols = 4; // Maximum nodes per row in a single tier

  // Find non-empty tiers
  const activeTiers = Array.from(tierGroups.keys())
    .filter((tier) => (tierGroups.get(tier)?.length || 0) > 0)
    .sort((a, b) => a - b);

  // Determine max grid width for centering
  let maxGridWidth = 0;
  for (const tier of activeTiers) {
    const group = tierGroups.get(tier)!;
    const cols = Math.min(group.length, maxCols);
    const tierWidth = cols * nodeWidth + (cols - 1) * xSpacing;
    if (tierWidth > maxGridWidth) {
      maxGridWidth = tierWidth;
    }
  }

  let currentY = 40;

  // Assign (x, y) coordinates per tier with multi-row wrapping
  activeTiers.forEach((tier) => {
    const group = tierGroups.get(tier)!;

    // Sort nodes within tier alphabetically for deterministic ordering
    group.sort((a, b) => a.label.localeCompare(b.label));

    const totalNodes = group.length;
    const totalSubRows = Math.ceil(totalNodes / maxCols);

    for (let subRow = 0; subRow < totalSubRows; subRow++) {
      const startIndex = subRow * maxCols;
      const subRowNodes = group.slice(startIndex, startIndex + maxCols);
      const colsInSubRow = subRowNodes.length;

      const subRowWidth = colsInSubRow * nodeWidth + (colsInSubRow - 1) * xSpacing;
      const startX = (maxGridWidth - subRowWidth) / 2 + 40;

      subRowNodes.forEach((node, colIndex) => {
        node.x = startX + colIndex * (nodeWidth + xSpacing);
        node.y = currentY + subRow * (nodeHeight + subRowSpacing);
      });
    }

    currentY += totalSubRows * nodeHeight + (totalSubRows - 1) * subRowSpacing + tierGap;
  });
}
