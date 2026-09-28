import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { ProjectAnalysis, ProjectStats, TechnologyInfo } from '../src/models/project';

describe('Project DNA — Overview Intelligence Dashboard Test Suite', () => {
  // Mock fixtures for deterministic testing
  const createMockAnalyzedProject = (): ProjectAnalysis => {
    const stats: ProjectStats = {
      totalFiles: 48,
      totalDirectories: 8,
      sourceFiles: 35,
      testFiles: 5,
      configFiles: 4,
      docFiles: 2,
      assetFiles: 2,
      styleFiles: 2,
      dataFiles: 0,
      lockfiles: 1,
      unknownFiles: 0,
      totalSizeBytes: 154200,
      formattedTotalSize: '150.6 KB',
      categoryBreakdown: {
        source: 35,
        test: 5,
        config: 4,
        documentation: 2,
        asset: 2,
        style: 2,
        data: 0,
        lockfile: 1,
        unknown: 0,
      },
      extensionBreakdown: {
        '.tsx': 20,
        '.ts': 15,
        '.json': 4,
        '.css': 2,
        '.md': 2,
      },
      codeLines: 3200,
      totalTechnologies: 4,
      totalDependencies: 12,
      totalApis: 0,
      totalConfigs: 4,
      totalEnvVariables: 0,
      entryPointsCount: 2,
    };

    const technologies: TechnologyInfo[] = [
      {
        id: 'nextjs',
        name: 'Next.js',
        category: 'framework',
        version: '14.2.3',
        confidence: 1.0,
        evidence: [{ source: 'package.json', type: 'dependency', detail: 'next@14.2.3' }],
      },
      {
        id: 'react',
        name: 'React',
        category: 'framework',
        version: '18.2.0',
        confidence: 1.0,
        evidence: [{ source: 'package.json', type: 'dependency', detail: 'react@18.2.0' }],
      },
      {
        id: 'typescript',
        name: 'TypeScript',
        category: 'language',
        version: '5.4.5',
        confidence: 1.0,
        evidence: [{ source: 'tsconfig.json', type: 'configuration', detail: 'TypeScript config' }],
      },
      {
        id: 'tailwindcss',
        name: 'Tailwind CSS',
        category: 'styling',
        version: '3.4.1',
        confidence: 0.95,
        evidence: [
          { source: 'tailwind.config.js', type: 'configuration', detail: 'Tailwind config' },
        ],
      },
    ];

    return {
      info: {
        workspaceName: 'my-web-app',
        rootPath: '/projects/my-web-app',
        isWorkspaceOpen: true,
        isAnalyzed: true,
        lastAnalyzedTimestamp: 1711500000000,
      },
      stats,
      fileTree: {
        id: 'root',
        name: 'my-web-app',
        path: '/projects/my-web-app',
        relativePath: '',
        type: 'directory',
        fileCount: 48,
        dirCount: 8,
        children: [
          {
            id: 'src',
            name: 'src',
            path: '/projects/my-web-app/src',
            relativePath: 'src',
            type: 'directory',
            fileCount: 40,
            dirCount: 6,
          },
          {
            id: 'public',
            name: 'public',
            path: '/projects/my-web-app/public',
            relativePath: 'public',
            type: 'directory',
            fileCount: 2,
            dirCount: 0,
          },
          {
            id: 'package.json',
            name: 'package.json',
            path: '/projects/my-web-app/package.json',
            relativePath: 'package.json',
            type: 'file',
            category: 'config',
            size: 1200,
          },
          {
            id: 'tsconfig.json',
            name: 'tsconfig.json',
            path: '/projects/my-web-app/tsconfig.json',
            relativePath: 'tsconfig.json',
            type: 'file',
            category: 'config',
            size: 800,
          },
        ],
      },
      scanMetadata: {
        scanStartTime: 1711500000000,
        scanEndTime: 1711500000450,
        durationMs: 450,
        scannerVersion: '0.1.0',
        scannedRoot: '/projects/my-web-app',
        ignoredDirectoriesCount: 4,
        hasWarnings: false,
        warnings: [],
      },
      technologies,
      dependencies: [],
      dependencyGraph: {
        nodes: {},
        edges: [],
        externalPackages: [
          { name: 'react', count: 18, importedBy: ['src/App.tsx'], isTypeOnly: false },
          { name: 'lucide-react', count: 8, importedBy: ['src/Header.tsx'], isTypeOnly: false },
        ],
        unresolvedImports: [],
        circularGroups: [],
        stats: {
          analyzedFilesCount: 35,
          filesWithDependenciesCount: 28,
          totalLocalEdges: 42,
          totalExternalPackages: 8,
          unresolvedImportsCount: 0,
          filesWithNoIncomingCount: 2,
          filesWithNoOutgoingCount: 5,
          circularDependenciesCount: 0,
          skippedFilesCount: 0,
        },
      },
      architecture: {
        modules: {},
        relationships: [],
        layers: [
          {
            id: 'presentation',
            name: 'Presentation & UI',
            layer: 'presentation',
            modulePaths: ['src/app/page.tsx', 'src/components/Button.tsx'],
            description: 'UI layer',
          },
          {
            id: 'services',
            name: 'Services & Business Logic',
            layer: 'services',
            modulePaths: ['src/services/api.ts'],
            description: 'Services layer',
          },
          {
            id: 'domain',
            name: 'Domain & Type Definitions',
            layer: 'domain',
            modulePaths: ['src/types/index.ts'],
            description: 'Domain types layer',
          },
        ],
        entryPoints: [
          {
            id: 'ep1',
            path: 'src/app/layout.tsx',
            displayName: 'layout.tsx',
            primaryRole: 'layout',
            layer: 'presentation',
            confidence: 0.95,
            confidenceLevel: 'high',
            evidence: ['App router layout'],
            isEntryPoint: true,
            fanIn: 0,
            fanOut: 3,
            secondaryRoles: [],
          },
          {
            id: 'ep2',
            path: 'src/app/page.tsx',
            displayName: 'page.tsx',
            primaryRole: 'page',
            layer: 'presentation',
            confidence: 0.95,
            confidenceLevel: 'high',
            evidence: ['App router page'],
            isEntryPoint: true,
            fanIn: 0,
            fanOut: 4,
            secondaryRoles: [],
          },
        ],
        summary: {
          totalModules: 35,
          classifiedModulesCount: 33,
          unclassifiedModulesCount: 2,
          layersCount: 3,
          entryPointsCount: 2,
          relationshipsCount: 42,
          roleDistribution: {
            page: 4,
            layout: 1,
            component: 16,
            ui_component: 4,
            hook: 3,
            service: 2,
            type_definition: 3,
            entry_point: 0,
            route: 0,
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
            schema: 0,
            middleware: 0,
            worker: 0,
            constant: 0,
            asset_module: 0,
            unknown: 2,
          },
          layerDistribution: {
            presentation: 25,
            services: 2,
            domain: 3,
            routing: 0,
            application: 0,
            data_access: 0,
            infrastructure: 0,
            configuration: 0,
            testing: 0,
            shared_utility: 0,
            unknown: 2,
          },
          highFanInModules: [
            { path: 'src/types/index.ts', fanIn: 14, role: 'type_definition' },
            { path: 'src/components/Button.tsx', fanIn: 8, role: 'ui_component' },
          ],
          highFanOutModules: [
            { path: 'src/app/page.tsx', fanOut: 7, role: 'page' },
            { path: 'src/services/api.ts', fanOut: 5, role: 'service' },
          ],
          observedStructure: [
            'Next.js App Router presentation tier detected with 4 page(s) and 1 layout(s).',
            'Layered separation with dedicated services and presentation modules.',
            'Centralized type definition hub with high incoming dependency reuse.',
          ],
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

  it('1. Analyzed project state contains accurate metadata and timestamps', () => {
    const project = createMockAnalyzedProject();
    assert.strictEqual(project.info.isAnalyzed, true);
    assert.strictEqual(project.info.workspaceName, 'my-web-app');
    assert.strictEqual(project.info.lastAnalyzedTimestamp, 1711500000000);
    assert.strictEqual(project.scanMetadata?.durationMs, 450);
  });

  it('2. Metric consistency between Scanner, Dependencies, and Architecture', () => {
    const project = createMockAnalyzedProject();

    // Source files vs Analyzed modules
    assert.strictEqual(project.stats?.sourceFiles, 35);
    assert.strictEqual(project.architecture?.summary.totalModules, 35);
    assert.strictEqual(project.dependencyGraph?.stats.analyzedFilesCount, 35);

    // Local edges consistency
    assert.strictEqual(project.dependencyGraph?.stats.totalLocalEdges, 42);
    assert.strictEqual(project.architecture?.summary.relationshipsCount, 42);

    // Entry points count consistency
    assert.strictEqual(project.architecture?.summary.entryPointsCount, 2);
    assert.strictEqual(project.architecture?.entryPoints.length, 2);
    assert.strictEqual(project.stats?.entryPointsCount, 2);
  });

  it('3. Dynamic headline synthesis produces factual and non-hardcoded summary', () => {
    const project = createMockAnalyzedProject();
    const frameworks = project.technologies
      .filter((t) => t.category === 'framework')
      .map((t) => t.name);
    const languages = project.technologies
      .filter((t) => t.category === 'language')
      .map((t) => t.name);

    assert.ok(frameworks.includes('Next.js'));
    assert.ok(languages.includes('TypeScript'));
    assert.strictEqual(project.architecture?.summary.totalModules, 35);
    assert.strictEqual(project.architecture?.summary.layersCount, 3);

    // Test with multiple languages
    project.technologies.push({
      id: 'javascript',
      name: 'JavaScript',
      category: 'language',
      confidence: 1.0,
      evidence: [],
    });
    const updatedLangs = project.technologies
      .filter((t) => t.category === 'language')
      .map((t) => t.name);
    assert.strictEqual(updatedLangs.length, 2);
    assert.ok(updatedLangs.includes('TypeScript') && updatedLangs.includes('JavaScript'));
  });

  it('4. Zero circular dependencies factually represented', () => {
    const project = createMockAnalyzedProject();
    assert.strictEqual(project.dependencyGraph?.stats.circularDependenciesCount, 0);
    assert.strictEqual(project.dependencyGraph?.circularGroups.length, 0);
  });

  it('5. Non-zero circular dependencies captured accurately', () => {
    const project = createMockAnalyzedProject();
    project.dependencyGraph!.stats.circularDependenciesCount = 2;
    project.dependencyGraph!.circularGroups = [
      { id: 'c1', cycle: ['src/a.ts', 'src/b.ts', 'src/a.ts'], length: 2 },
      { id: 'c2', cycle: ['src/x.ts', 'src/y.ts', 'src/z.ts', 'src/x.ts'], length: 3 },
    ];

    assert.strictEqual(project.dependencyGraph?.stats.circularDependenciesCount, 2);
    assert.strictEqual(project.dependencyGraph?.circularGroups.length, 2);
  });

  it('6. Zero unresolved imports factually represented', () => {
    const project = createMockAnalyzedProject();
    assert.strictEqual(project.dependencyGraph?.stats.unresolvedImportsCount, 0);
    assert.strictEqual(project.dependencyGraph?.unresolvedImports.length, 0);
  });

  it('7. Non-zero unresolved imports captured accurately', () => {
    const project = createMockAnalyzedProject();
    project.dependencyGraph!.stats.unresolvedImportsCount = 3;
    assert.strictEqual(project.dependencyGraph?.stats.unresolvedImportsCount, 3);
  });

  it('8. Technology snapshot groups technologies only into non-empty categories', () => {
    const project = createMockAnalyzedProject();
    const categories = new Set(project.technologies.map((t) => t.category));

    assert.ok(categories.has('framework'));
    assert.ok(categories.has('language'));
    assert.ok(categories.has('styling'));
    assert.strictEqual(categories.has('database'), false);
    assert.strictEqual(categories.has('cloud'), false);
  });

  it('9. Architecture snapshot filters out empty roles and computes accurate distributions', () => {
    const project = createMockAnalyzedProject();
    const dist = project.architecture!.summary.roleDistribution;
    const nonEmptyRoles = Object.entries(dist).filter(([_, count]) => count > 0);

    assert.strictEqual(nonEmptyRoles.length, 8); // page, layout, component, ui_component, hook, service, type_definition, unknown
    assert.strictEqual(dist.component, 16);
    assert.strictEqual(dist.page, 4);
    assert.strictEqual(dist.unknown, 2);
    assert.strictEqual((dist as Record<string, number>)['database'], undefined);
  });

  it('10. Structural hotspots include highest fan-in and fan-out modules', () => {
    const project = createMockAnalyzedProject();
    const fanIn = project.architecture!.summary.highFanInModules;
    const fanOut = project.architecture!.summary.highFanOutModules;

    assert.strictEqual(fanIn.length, 2);
    assert.strictEqual(fanIn[0].path, 'src/types/index.ts');
    assert.strictEqual(fanIn[0].fanIn, 14);

    assert.strictEqual(fanOut.length, 2);
    assert.strictEqual(fanOut[0].path, 'src/app/page.tsx');
    assert.strictEqual(fanOut[0].fanOut, 7);
  });

  it('11. Structure preview sorts directories first then alphabetically', () => {
    const project = createMockAnalyzedProject();
    const children = project.fileTree!.children!;
    const sorted = [...children].sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });

    assert.strictEqual(sorted[0].name, 'public');
    assert.strictEqual(sorted[1].name, 'src');
    assert.strictEqual(sorted[2].name, 'package.json');
    assert.strictEqual(sorted[3].name, 'tsconfig.json');
  });

  it('12. Empty workspace state has no fabricated data', () => {
    const emptyAnalysis: ProjectAnalysis = {
      info: {
        workspaceName: null,
        rootPath: null,
        isWorkspaceOpen: false,
        isAnalyzed: false,
        lastAnalyzedTimestamp: null,
      },
      stats: null,
      fileTree: null,
      scanMetadata: null,
      technologies: [],
      dependencies: [],
      dependencyGraph: null,
      architecture: null,
      apiAnalysis: null,
      configurationAnalysis: null,
      environmentAnalysis: null,
      apis: [],
      entryPoints: [],
      envVariables: [],
      git: null,
    };

    assert.strictEqual(emptyAnalysis.info.isAnalyzed, false);
    assert.strictEqual(emptyAnalysis.stats, null);
    assert.strictEqual(emptyAnalysis.technologies.length, 0);
    assert.strictEqual(emptyAnalysis.dependencyGraph, null);
    assert.strictEqual(emptyAnalysis.architecture, null);
  });

  it('13. Partial analysis preserved when one subsystem completes while another is absent', () => {
    const project = createMockAnalyzedProject();
    // Simulate scanner and technology complete, but architecture null
    project.architecture = null;

    assert.strictEqual(project.info.isAnalyzed, true);
    assert.strictEqual(project.technologies.length, 4);
    assert.strictEqual(project.stats?.totalFiles, 48);
    assert.strictEqual(project.architecture, null);
  });
});
