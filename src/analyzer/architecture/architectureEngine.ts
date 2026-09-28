import * as fs from 'fs';
import * as path from 'path';
import {
  ArchitecturalLayer,
  ArchitecturalModule,
  ArchitecturalRelationship,
  ArchitecturalRole,
  ArchitectureAnalysisResult,
  ArchitectureLayerGroup,
  ArchitectureSummary,
  FileInspectionContext,
} from './contracts';
import { EntryPointDetector } from './entryPointDetector';
import { LayerClassifier } from './layerClassifier';
import { RelationshipClassifier } from './relationshipClassifier';
import { RoleClassifier } from './roleClassifier';
import { DependencyAnalysisResult, FileNode } from '../../models';

export class ArchitectureEngine {
  private readonly roleClassifier = new RoleClassifier();
  private readonly layerClassifier = new LayerClassifier();
  private readonly relationshipClassifier = new RelationshipClassifier();
  private readonly entryPointDetector = new EntryPointDetector();

  /**
   * Analyzes the codebase architecture by combining scanner file trees and dependency graphs.
   */
  public async analyze(
    workspaceRoot: string,
    fileTree: FileNode | null,
    dependencyGraph: DependencyAnalysisResult | null
  ): Promise<ArchitectureAnalysisResult> {
    const modules: Record<string, ArchitecturalModule> = {};
    const relationships: ArchitecturalRelationship[] = [];

    const allFiles: FileNode[] = [];
    if (fileTree) {
      this.collectFiles(fileTree, allFiles);
    }

    const depNodes = dependencyGraph?.nodes || {};
    const depEdges = dependencyGraph?.edges || [];

    // 1. Process and classify every module
    let processedCount = 0;
    for (const file of allFiles) {
      processedCount++;
      if (processedCount % 25 === 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }

      const relPath = file.relativePath.replace(/\\/g, '/');
      const depNode = depNodes[relPath];

      let contentSnippet = '';
      try {
        const fullPath = path.join(workspaceRoot, file.relativePath);
        if (file.size && file.size < 500 * 1024) {
          contentSnippet = await fs.promises.readFile(fullPath, 'utf8');
        }
      } catch {
        // Continue with path-based classification if content unreadable
      }

      try {
        const ctx: FileInspectionContext = {
          relativePath: relPath,
          fileName: file.name,
          extension: file.extension || path.extname(file.name),
          category: file.category,
          content: contentSnippet,
          incomingCount: depNode?.importedByCount || 0,
          outgoingCount: depNode?.dependenciesCount || 0,
          outgoingTargets:
            depNode?.outgoingEdges?.map((e) => e.targetFilePath || e.specifier) || [],
        };

        const roleResult = this.roleClassifier.classify(ctx);
        const layer = this.layerClassifier.classifyLayer(roleResult.primaryRole, relPath);
        const isEntry = this.entryPointDetector.isEntryPoint(relPath, roleResult.primaryRole);

        modules[relPath] = {
          id: relPath,
          path: relPath,
          displayName: file.name,
          primaryRole: roleResult.primaryRole,
          layer,
          confidence: roleResult.confidence,
          confidenceLevel: roleResult.confidenceLevel,
          evidence: roleResult.evidence,
          isEntryPoint: isEntry,
          fanIn: depNode?.importedByCount || 0,
          fanOut: depNode?.dependenciesCount || 0,
          secondaryRoles: roleResult.secondaryRoles,
        };
      } catch {
        // Fallback for unclassified module on error
        modules[relPath] = {
          id: relPath,
          path: relPath,
          displayName: file.name,
          primaryRole: 'unknown',
          layer: 'unknown',
          confidence: 0,
          confidenceLevel: 'low',
          evidence: ['Classification fallback'],
          isEntryPoint: false,
          fanIn: depNode?.importedByCount || 0,
          fanOut: depNode?.dependenciesCount || 0,
          secondaryRoles: [],
        };
      }
    }

    // 2. Classify high-level relationships based on Step 4 dependency edges
    for (const edge of depEdges) {
      if (edge.resolution === 'resolved' && edge.targetFilePath) {
        const sourceMod = modules[edge.sourceFilePath];
        const targetMod = modules[edge.targetFilePath];

        const sourceRole = sourceMod?.primaryRole || 'unknown';
        const targetRole = targetMod?.primaryRole || 'unknown';

        const relationship = this.relationshipClassifier.classifyRelationship(
          edge,
          sourceRole,
          targetRole
        );
        relationships.push(relationship);
      }
    }

    // 3. Build Layer Groups
    const layerGroupsMap = new Map<ArchitecturalLayer, string[]>();
    for (const mod of Object.values(modules)) {
      if (!layerGroupsMap.has(mod.layer)) {
        layerGroupsMap.set(mod.layer, []);
      }
      layerGroupsMap.get(mod.layer)!.push(mod.path);
    }

    const layers: ArchitectureLayerGroup[] = [];
    for (const [layer, modulePaths] of layerGroupsMap.entries()) {
      if (modulePaths.length > 0 && layer !== 'unknown') {
        layers.push({
          id: `layer-${layer}`,
          name: this.formatLayerName(layer),
          layer,
          modulePaths: modulePaths.sort(),
          description: this.layerClassifier.getLayerDescription(layer),
        });
      }
    }
    layers.sort((a, b) => a.name.localeCompare(b.name));

    // 4. Extract Entry Points
    const entryPoints = this.entryPointDetector.filterEntryPoints(modules);

    // 5. Compute Role & Layer Distributions
    const roleDistribution: Record<ArchitecturalRole, number> = {
      entry_point: 0,
      page: 0,
      route: 0,
      layout: 0,
      component: 0,
      ui_component: 0,
      hook: 0,
      context: 0,
      service: 0,
      api_client: 0,
      backend_route: 0,
      controller: 0,
      model: 0,
      repository: 0,
      utility: 0,
      config: 0,
      state_management: 0,
      test: 0,
      type_definition: 0,
      schema: 0,
      middleware: 0,
      worker: 0,
      constant: 0,
      asset_module: 0,
      unknown: 0,
    };

    const layerDistribution: Record<ArchitecturalLayer, number> = {
      presentation: 0,
      routing: 0,
      application: 0,
      domain: 0,
      services: 0,
      data_access: 0,
      infrastructure: 0,
      configuration: 0,
      testing: 0,
      shared_utility: 0,
      unknown: 0,
    };

    let classifiedCount = 0;
    let unclassifiedCount = 0;

    for (const mod of Object.values(modules)) {
      roleDistribution[mod.primaryRole] = (roleDistribution[mod.primaryRole] || 0) + 1;
      layerDistribution[mod.layer] = (layerDistribution[mod.layer] || 0) + 1;

      if (mod.primaryRole !== 'unknown') {
        classifiedCount++;
      } else {
        unclassifiedCount++;
      }
    }

    // 6. Fan-in and Fan-out lists
    const sortedByFanIn = Object.values(modules)
      .filter((m) => m.fanIn > 0)
      .sort((a, b) => b.fanIn - a.fanIn)
      .slice(0, 10)
      .map((m) => ({ path: m.path, fanIn: m.fanIn, role: m.primaryRole }));

    const sortedByFanOut = Object.values(modules)
      .filter((m) => m.fanOut > 0)
      .sort((a, b) => b.fanOut - a.fanOut)
      .slice(0, 10)
      .map((m) => ({ path: m.path, fanOut: m.fanOut, role: m.primaryRole }));

    // 7. Generate Factual Observed Structure
    const observedStructure = this.generateObservedStructure(
      modules,
      relationships,
      entryPoints,
      layers
    );

    const summary: ArchitectureSummary = {
      totalModules: Object.keys(modules).length,
      classifiedModulesCount: classifiedCount,
      unclassifiedModulesCount: unclassifiedCount,
      layersCount: layers.length,
      entryPointsCount: entryPoints.length,
      relationshipsCount: relationships.length,
      roleDistribution,
      layerDistribution,
      highFanInModules: sortedByFanIn,
      highFanOutModules: sortedByFanOut,
      observedStructure,
    };

    return {
      modules,
      relationships,
      layers,
      entryPoints,
      summary,
    };
  }

  private collectFiles(node: FileNode, result: FileNode[]): void {
    if (node.type === 'file') {
      result.push(node);
      return;
    }
    if (node.children) {
      for (const child of node.children) {
        this.collectFiles(child, result);
      }
    }
  }

  private formatLayerName(layer: ArchitecturalLayer): string {
    return layer
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private generateObservedStructure(
    modules: Record<string, ArchitecturalModule>,
    relationships: ArchitecturalRelationship[],
    entryPoints: ArchitecturalModule[],
    layers: ArchitectureLayerGroup[]
  ): string[] {
    const observations: string[] = [];
    const moduleList = Object.values(modules);

    // Routes / Entry points
    if (entryPoints.length > 0) {
      observations.push(
        `Discovered ${entryPoints.length} application entry points and routing boundaries.`
      );
    }

    // Presentation Layer
    const components = moduleList.filter(
      (m) => m.primaryRole === 'component' || m.primaryRole === 'ui_component'
    );
    if (components.length > 0) {
      observations.push(
        `Presentation tier consists of ${components.length} reusable UI and view components.`
      );
    }

    // Hooks
    const hooks = moduleList.filter((m) => m.primaryRole === 'hook');
    if (hooks.length > 0) {
      observations.push(
        `Custom hooks (${hooks.length} modules) encapsulate reusable frontend logic.`
      );
    }

    // Context / State
    const contexts = moduleList.filter((m) => m.primaryRole === 'context');
    if (contexts.length > 0) {
      observations.push(
        `Global and scoped state managed via ${contexts.length} React Context providers.`
      );
    }

    // Services
    const services = moduleList.filter((m) => m.primaryRole === 'service');
    if (services.length > 0) {
      observations.push(
        `Business domain actions and external communication coordinated by ${services.length} services.`
      );
    }

    // Relationships
    const rendersCount = relationships.filter((r) => r.type === 'renders').length;
    const usesCount = relationships.filter((r) => r.type === 'uses').length;
    const callsCount = relationships.filter((r) => r.type === 'calls').length;

    if (rendersCount > 0) {
      observations.push(
        `Identified ${rendersCount} direct component-rendering relationship edges.`
      );
    }
    if (usesCount > 0) {
      observations.push(
        `Identified ${usesCount} hook and context state consumption relationships.`
      );
    }
    if (callsCount > 0) {
      observations.push(
        `Identified ${callsCount} service and data-access invocation relationships.`
      );
    }

    if (layers.length > 0) {
      observations.push(
        `Codebase organized across ${layers.length} distinct structural architectural layers.`
      );
    }

    return observations;
  }
}
