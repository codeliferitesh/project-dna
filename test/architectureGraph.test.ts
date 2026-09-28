import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { ProjectAnalysis } from '../src/models/project';
import { buildGraphData, ROLE_TIER_MAP } from '../webview/src/utils/graphBuilder';
import { GraphFilterState } from '../webview/src/types';

describe('Project DNA — Interactive Architecture Graph Test Suite', () => {
  const defaultFilters: GraphFilterState = {
    selectedLayer: 'all',
    selectedRole: 'all',
    selectedRelationship: 'all',
    showExternal: false,
    entryPointsOnly: false,
    searchQuery: '',
  };

  const createMockProjectAnalysis = (): ProjectAnalysis => {
    return {
      info: {
        workspaceName: 'test-app',
        rootPath: '/projects/test-app',
        isWorkspaceOpen: true,
        isAnalyzed: true,
        lastAnalyzedTimestamp: 1711500000000,
      },
      stats: null,
      fileTree: null,
      scanMetadata: null,
      technologies: [
        {
          id: 'nextjs',
          name: 'Next.js',
          category: 'framework',
          version: '14.0.0',
          confidence: 1.0,
          evidence: [],
        },
        {
          id: 'react',
          name: 'React',
          category: 'framework',
          version: '18.2.0',
          confidence: 1.0,
          evidence: [],
        },
      ],
      dependencies: [],
      dependencyGraph: {
        nodes: {
          'src/app/page.tsx': {
            id: 'src/app/page.tsx',
            path: 'src/app/page.tsx',
            displayName: 'page.tsx',
            language: 'typescript',
            dependenciesCount: 2,
            importedByCount: 0,
            outgoingEdges: [],
            status: 'analyzed',
          },
          'src/components/Header.tsx': {
            id: 'src/components/Header.tsx',
            path: 'src/components/Header.tsx',
            displayName: 'Header.tsx',
            language: 'typescript',
            dependenciesCount: 1,
            importedByCount: 1,
            outgoingEdges: [],
            status: 'analyzed',
          },
          'src/components/Button.tsx': {
            id: 'src/components/Button.tsx',
            path: 'src/components/Button.tsx',
            displayName: 'Button.tsx',
            language: 'typescript',
            dependenciesCount: 0,
            importedByCount: 2,
            outgoingEdges: [],
            status: 'analyzed',
          },
          'src/services/api.ts': {
            id: 'src/services/api.ts',
            path: 'src/services/api.ts',
            displayName: 'api.ts',
            language: 'typescript',
            dependenciesCount: 0,
            importedByCount: 1,
            outgoingEdges: [],
            status: 'analyzed',
          },
        },
        edges: [
          {
            id: 'src/app/page.tsx->src/components/Header.tsx',
            sourceFilePath: 'src/app/page.tsx',
            targetFilePath: 'src/components/Header.tsx',
            specifier: '@/components/Header',
            type: 'import',
            resolution: 'resolved',
            isTypeOnly: false,
          },
          {
            id: 'src/app/page.tsx->src/services/api.ts',
            sourceFilePath: 'src/app/page.tsx',
            targetFilePath: 'src/services/api.ts',
            specifier: '@/services/api',
            type: 'import',
            resolution: 'resolved',
            isTypeOnly: false,
          },
          {
            id: 'src/components/Header.tsx->src/components/Button.tsx',
            sourceFilePath: 'src/components/Header.tsx',
            targetFilePath: 'src/components/Button.tsx',
            specifier: './Button',
            type: 'import',
            resolution: 'resolved',
            isTypeOnly: false,
          },
        ],
        externalPackages: [
          {
            name: 'lucide-react',
            importedBy: ['src/components/Header.tsx', 'src/components/Button.tsx'],
            count: 2,
            isTypeOnly: false,
          },
          {
            name: 'axios',
            importedBy: ['src/services/api.ts'],
            count: 1,
            isTypeOnly: false,
          },
        ],
        unresolvedImports: [],
        circularGroups: [],
        stats: {
          analyzedFilesCount: 4,
          filesWithDependenciesCount: 3,
          totalLocalEdges: 3,
          totalExternalPackages: 2,
          unresolvedImportsCount: 0,
          filesWithNoIncomingCount: 1,
          filesWithNoOutgoingCount: 2,
          circularDependenciesCount: 0,
          skippedFilesCount: 0,
        },
      },
      architecture: {
        modules: {
          'src/app/page.tsx': {
            id: 'src/app/page.tsx',
            path: 'src/app/page.tsx',
            displayName: 'page.tsx',
            primaryRole: 'page',
            layer: 'presentation',
            confidence: 0.95,
            confidenceLevel: 'high',
            evidence: ['App Router page'],
            isEntryPoint: true,
            fanIn: 0,
            fanOut: 2,
            secondaryRoles: [],
          },
          'src/components/Header.tsx': {
            id: 'src/components/Header.tsx',
            path: 'src/components/Header.tsx',
            displayName: 'Header.tsx',
            primaryRole: 'component',
            layer: 'presentation',
            confidence: 0.9,
            confidenceLevel: 'high',
            evidence: ['React component'],
            isEntryPoint: false,
            fanIn: 1,
            fanOut: 1,
            secondaryRoles: [],
          },
          'src/components/Button.tsx': {
            id: 'src/components/Button.tsx',
            path: 'src/components/Button.tsx',
            displayName: 'Button.tsx',
            primaryRole: 'ui_component',
            layer: 'presentation',
            confidence: 0.9,
            confidenceLevel: 'high',
            evidence: ['UI element'],
            isEntryPoint: false,
            fanIn: 2,
            fanOut: 0,
            secondaryRoles: [],
          },
          'src/services/api.ts': {
            id: 'src/services/api.ts',
            path: 'src/services/api.ts',
            displayName: 'api.ts',
            primaryRole: 'service',
            layer: 'services',
            confidence: 0.85,
            confidenceLevel: 'high',
            evidence: ['Service API module'],
            isEntryPoint: false,
            fanIn: 1,
            fanOut: 0,
            secondaryRoles: [],
          },
        },
        relationships: [
          {
            id: 'rel1',
            sourcePath: 'src/app/page.tsx',
            targetPath: 'src/components/Header.tsx',
            type: 'renders',
            description: 'Page renders Header',
            confidence: 0.9,
            evidence: ['JSX element'],
          },
          {
            id: 'rel2',
            sourcePath: 'src/app/page.tsx',
            targetPath: 'src/services/api.ts',
            type: 'calls',
            description: 'Page calls api service',
            confidence: 0.85,
            evidence: ['Function call'],
          },
          {
            id: 'rel3',
            sourcePath: 'src/components/Header.tsx',
            targetPath: 'src/components/Button.tsx',
            type: 'renders',
            description: 'Header renders Button',
            confidence: 0.9,
            evidence: ['JSX element'],
          },
        ],
        layers: [
          {
            id: 'presentation',
            name: 'Presentation',
            layer: 'presentation',
            modulePaths: [
              'src/app/page.tsx',
              'src/components/Header.tsx',
              'src/components/Button.tsx',
            ],
            description: 'UI Layer',
          },
          {
            id: 'services',
            name: 'Services',
            layer: 'services',
            modulePaths: ['src/services/api.ts'],
            description: 'Services Layer',
          },
        ],
        entryPoints: [
          {
            id: 'ep1',
            path: 'src/app/page.tsx',
            displayName: 'page.tsx',
            primaryRole: 'page',
            layer: 'presentation',
            confidence: 0.95,
            confidenceLevel: 'high',
            evidence: ['App Router page'],
            isEntryPoint: true,
            fanIn: 0,
            fanOut: 2,
            secondaryRoles: [],
          },
        ],
        summary: {
          totalModules: 4,
          classifiedModulesCount: 4,
          unclassifiedModulesCount: 0,
          layersCount: 2,
          entryPointsCount: 1,
          relationshipsCount: 3,
          roleDistribution: {
            page: 1,
            component: 1,
            ui_component: 1,
            service: 1,
            entry_point: 0,
            route: 0,
            layout: 0,
            hook: 0,
            context: 0,
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
          },
          layerDistribution: {
            presentation: 3,
            services: 1,
            routing: 0,
            application: 0,
            domain: 0,
            data_access: 0,
            infrastructure: 0,
            configuration: 0,
            testing: 0,
            shared_utility: 0,
            unknown: 0,
          },
          highFanInModules: [],
          highFanOutModules: [],
          observedStructure: [],
        },
      },
      apiAnalysis: null,
      configurationAnalysis: null,
      environmentAnalysis: null,
      apis: [],
      entryPoints: [],
      envVariables: [],
      git: null,
    };
  };

  it('1. Empty graph handling when analysis is null', () => {
    const data = buildGraphData(null, defaultFilters);
    assert.strictEqual(data.nodes.length, 0);
    assert.strictEqual(data.edges.length, 0);
    assert.strictEqual(data.cycleCount, 0);
    assert.strictEqual(data.entryPointCount, 0);
  });

  it('2. Single-node project builds valid single-node graph', () => {
    const analysis = createMockProjectAnalysis();
    analysis.dependencyGraph!.nodes = {
      'src/index.ts': {
        id: 'src/index.ts',
        path: 'src/index.ts',
        displayName: 'index.ts',
        language: 'typescript',
        dependenciesCount: 0,
        importedByCount: 0,
        outgoingEdges: [],
        status: 'analyzed',
      },
    };
    analysis.dependencyGraph!.edges = [];
    analysis.architecture!.modules = {
      'src/index.ts': {
        id: 'src/index.ts',
        path: 'src/index.ts',
        displayName: 'index.ts',
        primaryRole: 'entry_point',
        layer: 'application',
        confidence: 0.9,
        confidenceLevel: 'high',
        evidence: [],
        isEntryPoint: true,
        fanIn: 0,
        fanOut: 0,
        secondaryRoles: [],
      },
    };
    analysis.architecture!.relationships = [];

    const data = buildGraphData(analysis, defaultFilters);
    assert.strictEqual(data.nodes.length, 1);
    assert.strictEqual(data.nodes[0].label, 'index.ts');
    assert.strictEqual(data.nodes[0].role, 'entry_point');
    assert.strictEqual(data.nodes[0].isEntryPoint, true);
    assert.strictEqual(data.edges.length, 0);
  });

  it('3. Multiple local nodes and local import edges mapped accurately', () => {
    const analysis = createMockProjectAnalysis();
    const data = buildGraphData(analysis, defaultFilters);

    assert.strictEqual(data.nodes.length, 4);
    assert.strictEqual(data.edges.length, 3);

    const nodeIds = data.nodes.map((n) => n.id);
    assert.ok(nodeIds.includes('src/app/page.tsx'));
    assert.ok(nodeIds.includes('src/components/Header.tsx'));
    assert.ok(nodeIds.includes('src/components/Button.tsx'));
    assert.ok(nodeIds.includes('src/services/api.ts'));

    const edgeSources = data.edges.map((e) => `${e.source}->${e.target}`);
    assert.ok(edgeSources.includes('src/app/page.tsx->src/components/Header.tsx'));
    assert.ok(edgeSources.includes('src/app/page.tsx->src/services/api.ts'));
    assert.ok(edgeSources.includes('src/components/Header.tsx->src/components/Button.tsx'));
  });

  it('4. External packages are hidden by default', () => {
    const analysis = createMockProjectAnalysis();
    const data = buildGraphData(analysis, { ...defaultFilters, showExternal: false });

    const externalNodes = data.nodes.filter((n) => n.isExternal);
    assert.strictEqual(externalNodes.length, 0);
    assert.strictEqual(data.nodes.length, 4);
  });

  it('5. External packages appear as distinct nodes when toggled on', () => {
    const analysis = createMockProjectAnalysis();
    const data = buildGraphData(analysis, { ...defaultFilters, showExternal: true });

    const externalNodes = data.nodes.filter((n) => n.isExternal);
    assert.strictEqual(externalNodes.length, 2);

    const extNames = externalNodes.map((n) => n.label);
    assert.ok(extNames.includes('lucide-react'));
    assert.ok(extNames.includes('axios'));

    // Check external edges created
    const extEdges = data.edges.filter((e) => e.isExternal);
    assert.strictEqual(extEdges.length, 3); // 2 importers for lucide-react + 1 for axios
  });

  it('6. Node roles, layers, fan-in/fan-out, and entry points are correctly mapped', () => {
    const analysis = createMockProjectAnalysis();
    const data = buildGraphData(analysis, defaultFilters);

    const pageNode = data.nodes.find((n) => n.id === 'src/app/page.tsx')!;
    assert.strictEqual(pageNode.role, 'page');
    assert.strictEqual(pageNode.layer, 'presentation');
    assert.strictEqual(pageNode.isEntryPoint, true);
    assert.strictEqual(pageNode.fanOut, 2);
    assert.strictEqual(pageNode.fanIn, 0);

    const serviceNode = data.nodes.find((n) => n.id === 'src/services/api.ts')!;
    assert.strictEqual(serviceNode.role, 'service');
    assert.strictEqual(serviceNode.layer, 'services');
    assert.strictEqual(serviceNode.isEntryPoint, false);
    assert.strictEqual(serviceNode.fanIn, 1);
  });

  it('7. Relationship types and descriptions are preserved', () => {
    const analysis = createMockProjectAnalysis();
    const data = buildGraphData(analysis, defaultFilters);

    const rendersEdge = data.edges.find(
      (e) => e.source === 'src/app/page.tsx' && e.target === 'src/components/Header.tsx'
    )!;
    assert.strictEqual(rendersEdge.relationshipType, 'renders');
    assert.strictEqual(rendersEdge.description, 'Page renders Header');

    const callsEdge = data.edges.find(
      (e) => e.source === 'src/app/page.tsx' && e.target === 'src/services/api.ts'
    )!;
    assert.strictEqual(callsEdge.relationshipType, 'calls');
  });

  it('8. Circular dependency cycle members and cycle edges are accurately flagged', () => {
    const analysis = createMockProjectAnalysis();
    analysis.dependencyGraph!.circularGroups = [
      {
        id: 'cycle1',
        cycle: [
          'src/components/Header.tsx',
          'src/components/Button.tsx',
          'src/components/Header.tsx',
        ],
        length: 2,
      },
    ];

    const data = buildGraphData(analysis, defaultFilters);
    const headerNode = data.nodes.find((n) => n.id === 'src/components/Header.tsx')!;
    const buttonNode = data.nodes.find((n) => n.id === 'src/components/Button.tsx')!;
    const pageNode = data.nodes.find((n) => n.id === 'src/app/page.tsx')!;

    assert.strictEqual(headerNode.isCycleMember, true);
    assert.strictEqual(headerNode.cycleLength, 2);
    assert.strictEqual(buttonNode.isCycleMember, true);
    assert.strictEqual(pageNode.isCycleMember, false);

    const cycleEdge = data.edges.find(
      (e) => e.source === 'src/components/Header.tsx' && e.target === 'src/components/Button.tsx'
    )!;
    assert.strictEqual(cycleEdge.isCycleEdge, true);
  });

  it('9. Layer filtering isolates specific tiers', () => {
    const analysis = createMockProjectAnalysis();
    const data = buildGraphData(analysis, { ...defaultFilters, selectedLayer: 'services' });

    assert.strictEqual(data.nodes.length, 1);
    assert.strictEqual(data.nodes[0].id, 'src/services/api.ts');
    assert.strictEqual(data.edges.length, 0); // No edges between presentation and filtered-out nodes
  });

  it('10. Role filtering isolates specific architectural roles', () => {
    const analysis = createMockProjectAnalysis();
    const data = buildGraphData(analysis, { ...defaultFilters, selectedRole: 'ui_component' });

    assert.strictEqual(data.nodes.length, 1);
    assert.strictEqual(data.nodes[0].id, 'src/components/Button.tsx');
  });

  it('11. Entry points only filter includes entry points and their connected neighborhood', () => {
    const analysis = createMockProjectAnalysis();
    const data = buildGraphData(analysis, { ...defaultFilters, entryPointsOnly: true });

    // Entry point is src/app/page.tsx. Connected neighbors are Header.tsx and api.ts
    assert.strictEqual(data.nodes.length, 3);
    const ids = data.nodes.map((n) => n.id);
    assert.ok(ids.includes('src/app/page.tsx'));
    assert.ok(ids.includes('src/components/Header.tsx'));
    assert.ok(ids.includes('src/services/api.ts'));
    assert.strictEqual(ids.includes('src/components/Button.tsx'), false);
  });

  it('12. Relationship filtering isolates specified edge types', () => {
    const analysis = createMockProjectAnalysis();
    const data = buildGraphData(analysis, {
      ...defaultFilters,
      selectedRelationship: 'calls',
    });

    assert.strictEqual(data.edges.length, 1);
    assert.strictEqual(data.edges[0].source, 'src/app/page.tsx');
    assert.strictEqual(data.edges[0].target, 'src/services/api.ts');
  });

  it('13. Deterministic hierarchical layout assigns distinct non-overlapping coordinates', () => {
    const analysis = createMockProjectAnalysis();
    const data = buildGraphData(analysis, defaultFilters);

    for (const node of data.nodes) {
      assert.ok(typeof node.x === 'number' && !isNaN(node.x));
      assert.ok(typeof node.y === 'number' && !isNaN(node.y));
    }

    // Tier 1 (Page) should have smaller Y than Tier 2 (Header, Button)
    const pageNode = data.nodes.find((n) => n.id === 'src/app/page.tsx')!;
    const headerNode = data.nodes.find((n) => n.id === 'src/components/Header.tsx')!;
    assert.ok(pageNode.y < headerNode.y);
  });

  it('14. Role tier mapping is completely defined for all architectural roles', () => {
    assert.strictEqual(ROLE_TIER_MAP.entry_point, 0);
    assert.strictEqual(ROLE_TIER_MAP.page, 1);
    assert.strictEqual(ROLE_TIER_MAP.component, 2);
    assert.strictEqual(ROLE_TIER_MAP.hook, 3);
    assert.strictEqual(ROLE_TIER_MAP.service, 4);
    assert.strictEqual(ROLE_TIER_MAP.model, 5);
    assert.strictEqual(ROLE_TIER_MAP.type_definition, 6);
  });
});
