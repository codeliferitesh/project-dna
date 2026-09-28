import {
  CircularDependencyGroup,
  DependencyAnalysisResult,
  DependencyStats,
  ExternalPackageUsage,
  FileDependencyEdge,
  FileModuleNode,
} from './contracts';

export class GraphAnalyzer {
  /**
   * Builds the complete dependency graph, calculates metrics, detects circular dependencies,
   * and produces the final DependencyAnalysisResult.
   */
  public analyze(
    nodes: Map<string, FileModuleNode>,
    edges: FileDependencyEdge[],
    externalPackagesMap: Map<string, ExternalPackageUsage>,
    unresolvedImports: FileDependencyEdge[],
    skippedCount: number
  ): DependencyAnalysisResult {
    // 1. Build adjacency maps for local file relationships
    const adjacency = new Map<string, Set<string>>();
    const reverseAdjacency = new Map<string, Set<string>>();

    for (const nodeId of nodes.keys()) {
      adjacency.set(nodeId, new Set());
      reverseAdjacency.set(nodeId, new Set());
    }

    const uniqueLocalEdges: FileDependencyEdge[] = [];
    const edgeKeySet = new Set<string>();

    for (const edge of edges) {
      if (edge.resolution === 'resolved' && edge.targetFilePath) {
        const source = edge.sourceFilePath;
        const target = edge.targetFilePath;

        // Ensure nodes exist in adjacency maps
        if (!adjacency.has(source)) {
          adjacency.set(source, new Set());
        }
        if (!adjacency.has(target)) {
          adjacency.set(target, new Set());
        }
        if (!reverseAdjacency.has(source)) {
          reverseAdjacency.set(source, new Set());
        }
        if (!reverseAdjacency.has(target)) {
          reverseAdjacency.set(target, new Set());
        }

        adjacency.get(source)!.add(target);
        reverseAdjacency.get(target)!.add(source);

        const edgeKey = `${source}->${target}`;
        if (!edgeKeySet.has(edgeKey)) {
          edgeKeySet.add(edgeKey);
          uniqueLocalEdges.push(edge);
        }
      }
    }

    // 2. Update incoming & outgoing counts for each module node
    for (const [nodeId, node] of nodes.entries()) {
      node.dependenciesCount = adjacency.get(nodeId)?.size || 0;
      node.importedByCount = reverseAdjacency.get(nodeId)?.size || 0;
    }

    // 3. Detect circular dependency cycles
    const circularGroups = this.detectCycles(adjacency);

    // 4. Calculate comprehensive dependency statistics
    let filesWithDeps = 0;
    let noIncoming = 0;
    let noOutgoing = 0;

    for (const node of nodes.values()) {
      if (node.dependenciesCount > 0) {
        filesWithDeps++;
      } else {
        noOutgoing++;
      }

      if (node.importedByCount === 0) {
        noIncoming++;
      }
    }

    const externalPackagesList = Array.from(externalPackagesMap.values()).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name)
    );

    const stats: DependencyStats = {
      analyzedFilesCount: nodes.size,
      filesWithDependenciesCount: filesWithDeps,
      totalLocalEdges: uniqueLocalEdges.length,
      totalExternalPackages: externalPackagesList.length,
      unresolvedImportsCount: unresolvedImports.length,
      filesWithNoIncomingCount: noIncoming,
      filesWithNoOutgoingCount: noOutgoing,
      circularDependenciesCount: circularGroups.length,
      skippedFilesCount: skippedCount,
    };

    const nodeRecord: Record<string, FileModuleNode> = {};
    for (const [k, v] of nodes.entries()) {
      nodeRecord[k] = v;
    }

    return {
      nodes: nodeRecord,
      edges: uniqueLocalEdges,
      externalPackages: externalPackagesList,
      unresolvedImports,
      circularGroups,
      stats,
    };
  }

  /**
   * Deterministically discovers all elementary cycles in the graph using Tarjan's SCC + cycle path search.
   * Duplicate rotations (e.g. A->B->A and B->A->B) are canonicalized and merged.
   */
  private detectCycles(adjacency: Map<string, Set<string>>): CircularDependencyGroup[] {
    const sccs = this.tarjanSCC(adjacency);
    const seenCycleSignatures = new Set<string>();
    const circularGroups: CircularDependencyGroup[] = [];

    for (const scc of sccs) {
      if (scc.length === 1) {
        const singleNode = scc[0];
        // Check for self-loop: A -> A
        if (adjacency.get(singleNode)?.has(singleNode)) {
          const cycle = [singleNode, singleNode];
          const sig = cycle.join('->');
          if (!seenCycleSignatures.has(sig)) {
            seenCycleSignatures.add(sig);
            circularGroups.push({
              id: `cycle-${circularGroups.length + 1}`,
              cycle,
              length: 1,
            });
          }
        }
        continue;
      }

      // Multi-node SCC: search elementary cycles
      const sccSet = new Set(scc);
      const visited = new Set<string>();
      const currentPath: string[] = [];

      const dfs = (currentNode: string, startNode: string, depth: number) => {
        if (depth > 20) {
          return;
        } // Safeguard against excessive cycle depth

        visited.add(currentNode);
        currentPath.push(currentNode);

        const neighbors = adjacency.get(currentNode) || new Set();
        for (const neighbor of neighbors) {
          if (!sccSet.has(neighbor)) {
            continue;
          }

          if (neighbor === startNode && currentPath.length >= 2) {
            // Found cycle returning to startNode
            const rawCycle = [...currentPath, startNode];
            const canonical = this.canonicalizeCycle(rawCycle);
            const signature = canonical.join('->');

            if (!seenCycleSignatures.has(signature)) {
              seenCycleSignatures.add(signature);
              circularGroups.push({
                id: `cycle-${circularGroups.length + 1}`,
                cycle: canonical,
                length: canonical.length - 1,
              });
            }
          } else if (!visited.has(neighbor)) {
            dfs(neighbor, startNode, depth + 1);
          }
        }

        currentPath.pop();
        visited.delete(currentNode);
      };

      for (const node of scc) {
        dfs(node, node, 0);
      }
    }

    // Sort cycles deterministically by length and first node
    return circularGroups.sort(
      (a, b) => a.length - b.length || a.cycle[0].localeCompare(b.cycle[0])
    );
  }

  /**
   * Tarjan's Strongly Connected Components algorithm.
   */
  private tarjanSCC(adjacency: Map<string, Set<string>>): string[][] {
    let index = 0;
    const indices = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const sccs: string[][] = [];

    const strongConnect = (v: string) => {
      indices.set(v, index);
      lowlink.set(v, index);
      index++;
      stack.push(v);
      onStack.add(v);

      const neighbors = adjacency.get(v) || new Set();
      for (const w of neighbors) {
        if (!indices.has(w)) {
          strongConnect(w);
          lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
        } else if (onStack.has(w)) {
          lowlink.set(v, Math.min(lowlink.get(v)!, indices.get(w)!));
        }
      }

      if (lowlink.get(v) === indices.get(v)) {
        const scc: string[] = [];
        let w = '';
        do {
          w = stack.pop()!;
          onStack.delete(w);
          scc.push(w);
        } while (w !== v);
        sccs.push(scc);
      }
    };

    for (const node of adjacency.keys()) {
      if (!indices.has(node)) {
        strongConnect(node);
      }
    }

    return sccs;
  }

  /**
   * Canonicalizes a cycle array by finding the lexicographically smallest node
   * and rotating the cycle so it starts and ends with that node.
   */
  private canonicalizeCycle(cycle: string[]): string[] {
    if (cycle.length <= 1) {
      return cycle;
    }
    // Remove duplicate end node
    const nodes = cycle.slice(0, -1);
    let minIndex = 0;
    let minVal = nodes[0];

    for (let i = 1; i < nodes.length; i++) {
      if (nodes[i] < minVal) {
        minVal = nodes[i];
        minIndex = i;
      }
    }

    const rotated = [...nodes.slice(minIndex), ...nodes.slice(0, minIndex)];
    rotated.push(rotated[0]); // close cycle
    return rotated;
  }
}
