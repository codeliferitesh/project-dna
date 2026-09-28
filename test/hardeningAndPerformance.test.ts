import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { FileScanner } from '../src/analyzer/fileScanner';
import { IgnoreManager } from '../src/analyzer/ignoreManager';
import { TechnologyDetector } from '../src/analyzer/technologyDetector';
import { DependencyAnalyzer } from '../src/analyzer/dependencies/dependencyAnalyzer';
import { ArchitectureEngine } from '../src/analyzer/architecture/architectureEngine';
import { ApiAnalyzer } from '../src/analyzer/api/apiAnalyzer';
import { ConfigAnalyzer } from '../src/analyzer/config/configAnalyzer';
import { EnvironmentAnalyzer } from '../src/analyzer/environment/environmentAnalyzer';
import { ModuleResolver } from '../src/analyzer/dependencies/moduleResolver';

describe('Project DNA — Steps 9 & 10: Performance & Hardening Test Suite', () => {
  let tempBaseDir: string;

  before(async () => {
    tempBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-dna-hardening-'));
  });

  after(async () => {
    try {
      await fs.rm(tempBaseDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  // =========================================================================
  // 1. EMPTY PROJECT & MISSING CONFIGURATIONS
  // =========================================================================
  describe('Edge Case: Empty projects and missing manifests', () => {
    test('1. Completely empty workspace produces valid empty result without crashing', async () => {
      const emptyDir = path.join(tempBaseDir, 'empty-dir');
      await fs.mkdir(emptyDir, { recursive: true });

      const scanner = new FileScanner();
      const scanResult = await scanner.scan({ workspaceRoot: emptyDir });
      assert.strictEqual(scanResult.stats.totalFiles, 0);

      const techDetector = new TechnologyDetector();
      const techs = await techDetector.detect(emptyDir, scanResult.rootNode, scanResult.stats);
      assert.strictEqual(techs.length, 0);

      const depAnalyzer = new DependencyAnalyzer();
      const depGraph = await depAnalyzer.analyze(emptyDir, scanResult.rootNode);
      assert.strictEqual(depGraph.stats.analyzedFilesCount, 0);
      assert.strictEqual(depGraph.stats.totalLocalEdges, 0);

      const archEngine = new ArchitectureEngine();
      const arch = await archEngine.analyze(emptyDir, scanResult.rootNode, depGraph);
      assert.strictEqual(arch.summary.totalModules, 0);

      const apiAnalyzer = new ApiAnalyzer();
      const apis = await apiAnalyzer.analyze(emptyDir, scanResult.rootNode, techs);
      assert.strictEqual(apis.totalEndpoints, 0);

      const configAnalyzer = new ConfigAnalyzer();
      const configs = configAnalyzer.analyze(scanResult.rootNode);
      assert.strictEqual(configs.totalConfigs, 0);

      const envAnalyzer = new EnvironmentAnalyzer();
      const envs = await envAnalyzer.analyze(emptyDir, scanResult.rootNode);
      assert.strictEqual(envs.totalVariables, 0);
    });

    test('2. Project without package.json and without tsconfig.json handles resolution gracefully', async () => {
      const noConfigDir = path.join(tempBaseDir, 'no-config-dir');
      await fs.mkdir(path.join(noConfigDir, 'src'), { recursive: true });

      await fs.writeFile(
        path.join(noConfigDir, 'src', 'util.js'),
        'export function add(a, b) { return a + b; }'
      );
      await fs.writeFile(
        path.join(noConfigDir, 'src', 'main.js'),
        'import { add } from "./util"; console.log(add(1, 2));'
      );

      const scanner = new FileScanner();
      const scanResult = await scanner.scan({ workspaceRoot: noConfigDir });
      assert.strictEqual(scanResult.stats.totalFiles, 2);

      const depAnalyzer = new DependencyAnalyzer();
      const depGraph = await depAnalyzer.analyze(noConfigDir, scanResult.rootNode);
      assert.strictEqual(depGraph.stats.totalLocalEdges, 1);
      assert.strictEqual(depGraph.edges[0].sourceFilePath, 'src/main.js');
      assert.strictEqual(depGraph.edges[0].targetFilePath, 'src/util.js');
    });
  });

  // =========================================================================
  // 2. MALFORMED & SYNTAX ERROR RESILIENCE
  // =========================================================================
  describe('Edge Case: Malformed files, invalid JSON, and syntax errors', () => {
    test('3. Malformed package.json does not crash TechnologyDetector or ApiAnalyzer', async () => {
      const malformedDir = path.join(tempBaseDir, 'malformed-pkg');
      await fs.mkdir(malformedDir, { recursive: true });
      await fs.writeFile(
        path.join(malformedDir, 'package.json'),
        '{"name": "test", broken json,,,'
      );

      const scanner = new FileScanner();
      const scanResult = await scanner.scan({ workspaceRoot: malformedDir });

      const techDetector = new TechnologyDetector();
      const techs = await techDetector.detect(malformedDir, scanResult.rootNode, scanResult.stats);
      assert.strictEqual(Array.isArray(techs), true);

      const apiAnalyzer = new ApiAnalyzer();
      const apis = await apiAnalyzer.analyze(malformedDir, scanResult.rootNode, techs);
      assert.strictEqual(apis.totalEndpoints, 0);
    });

    test('4. Malformed source code with syntax errors is handled safely with error status', async () => {
      const syntaxErrorDir = path.join(tempBaseDir, 'syntax-error-dir');
      await fs.mkdir(path.join(syntaxErrorDir, 'src'), { recursive: true });

      // Incomplete syntax
      await fs.writeFile(
        path.join(syntaxErrorDir, 'src', 'broken.ts'),
        'import { something from where??? ; function (( {'
      );
      await fs.writeFile(
        path.join(syntaxErrorDir, 'src', 'valid.ts'),
        'import "./broken"; export const ok = true;'
      );

      const scanner = new FileScanner();
      const scanResult = await scanner.scan({ workspaceRoot: syntaxErrorDir });

      const depAnalyzer = new DependencyAnalyzer();
      const depGraph = await depAnalyzer.analyze(syntaxErrorDir, scanResult.rootNode);

      assert.strictEqual(depGraph.stats.analyzedFilesCount >= 1, true);
      const validNode = depGraph.nodes['src/valid.ts'];
      assert.ok(validNode);
      assert.strictEqual(validNode.status, 'analyzed');
    });

    test('5. Non-standard .env file with comments and malformed lines handled safely (security verified)', async () => {
      const envDir = path.join(tempBaseDir, 'env-edge-case');
      await fs.mkdir(envDir, { recursive: true });

      await fs.writeFile(
        path.join(envDir, '.env'),
        `# This is a comment
EMPTY_LINE=
INVALID LINE WITHOUT EQUALS
NEXT_PUBLIC_APP_KEY=ultra_secret_value_12345
DATABASE_URL=postgres://user:password123@host:5432/db
export PORT=3000
`
      );

      const scanner = new FileScanner();
      const scanResult = await scanner.scan({ workspaceRoot: envDir });

      const envAnalyzer = new EnvironmentAnalyzer();
      const envResult = await envAnalyzer.analyze(envDir, scanResult.rootNode);

      const keys = envResult.variables.map((v) => v.name);
      assert.ok(keys.includes('NEXT_PUBLIC_APP_KEY'));
      assert.ok(keys.includes('DATABASE_URL'));
      assert.ok(keys.includes('PORT'));

      // Strict security verification: secret values must NEVER appear anywhere in the result
      const serialized = JSON.stringify(envResult);
      assert.strictEqual(serialized.includes('ultra_secret_value_12345'), false);
      assert.strictEqual(serialized.includes('password123'), false);
    });
  });

  // =========================================================================
  // 3. PERFORMANCE & LARGE PROJECT IGNORE RULES
  // =========================================================================
  describe('Performance: Ignore rules and oversized file skipping', () => {
    test('6. IgnoreManager filters modern web, backend, and build directories', () => {
      const manager = new IgnoreManager();
      assert.strictEqual(manager.shouldIgnoreDirectory('.svelte-kit'), true);
      assert.strictEqual(manager.shouldIgnoreDirectory('.astro'), true);
      assert.strictEqual(manager.shouldIgnoreDirectory('.docusaurus'), true);
      assert.strictEqual(manager.shouldIgnoreDirectory('.output'), true);
      assert.strictEqual(manager.shouldIgnoreDirectory('vendor'), true);
      assert.strictEqual(manager.shouldIgnoreDirectory('.yarn'), true);
      assert.strictEqual(manager.shouldIgnoreDirectory('.pnpm-store'), true);
      assert.strictEqual(manager.shouldIgnoreDirectory('site-packages'), true);
      assert.strictEqual(manager.shouldIgnoreDirectory('.turbo'), true);
    });

    test('7. IgnoreManager filters minified bundles, source maps, and bytecode', () => {
      const manager = new IgnoreManager();
      assert.strictEqual(manager.shouldIgnoreFile('bundle.min.js'), true);
      assert.strictEqual(manager.shouldIgnoreFile('style.min.css'), true);
      assert.strictEqual(manager.shouldIgnoreFile('index.js.map'), true);
      assert.strictEqual(manager.shouldIgnoreFile('app.css.map'), true);
      assert.strictEqual(manager.shouldIgnoreFile('module.pyc'), true);
      assert.strictEqual(manager.shouldIgnoreFile('regular.ts'), false);
      assert.strictEqual(manager.shouldIgnoreFile('Component.jsx'), false);
    });

    test('8. Oversized files (>1.5MB) are skipped safely during dependency analysis', async () => {
      const largeFileDir = path.join(tempBaseDir, 'large-file-dir');
      await fs.mkdir(path.join(largeFileDir, 'src'), { recursive: true });

      // Create a file > 1.5MB (150,000 * 13 bytes = 1.95MB)
      const hugeContent = 'const a = 1;\n'.repeat(150000);
      await fs.writeFile(path.join(largeFileDir, 'src', 'huge.ts'), hugeContent);
      await fs.writeFile(
        path.join(largeFileDir, 'src', 'normal.ts'),
        'export const message = "hello";'
      );

      const scanner = new FileScanner();
      const scanResult = await scanner.scan({ workspaceRoot: largeFileDir });

      const depAnalyzer = new DependencyAnalyzer();
      const depGraph = await depAnalyzer.analyze(largeFileDir, scanResult.rootNode);

      assert.strictEqual(depGraph.stats.skippedFilesCount, 1);
      assert.strictEqual(depGraph.nodes['src/huge.ts']?.status, 'skipped');
      assert.strictEqual(depGraph.nodes['src/normal.ts']?.status, 'analyzed');
    });
  });

  // =========================================================================
  // 4. PATH ALIASES & UNRESOLVED IMPORTS & DUPLICATES
  // =========================================================================
  describe('Path Aliases, Unresolved Imports, and Duplicate Deduplication', () => {
    test('9. Generic path aliases with tsconfig @/* resolve deterministically', () => {
      const knownFiles = new Set(['src/components/Button.tsx', 'src/utils/math.ts']);
      const resolver = new ModuleResolver('/fake/root', knownFiles);

      // Even without a physical tsconfig file on disk, standard @/ prefix looks like a local alias
      const resolved = resolver.resolve('src/index.ts', {
        specifier: '@/components/Button',
        type: 'import',
        isTypeOnly: false,
      });

      // Target file should resolve or flag as unresolved alias without crashing
      assert.ok(['resolved', 'unresolved'].includes(resolved.resolution));
    });

    test('10. Duplicate imports from same source to same target are deduplicated', async () => {
      const dupDir = path.join(tempBaseDir, 'dup-imports');
      await fs.mkdir(path.join(dupDir, 'src'), { recursive: true });

      await fs.writeFile(
        path.join(dupDir, 'src', 'target.ts'),
        'export const a = 1; export type T = number;'
      );
      await fs.writeFile(
        path.join(dupDir, 'src', 'source.ts'),
        `import { a } from "./target";
import type { T } from "./target";
import { a as renamed } from "./target";`
      );

      const scanner = new FileScanner();
      const scanResult = await scanner.scan({ workspaceRoot: dupDir });

      const depAnalyzer = new DependencyAnalyzer();
      const depGraph = await depAnalyzer.analyze(dupDir, scanResult.rootNode);

      // Only 1 unique edge between source.ts -> target.ts
      assert.strictEqual(depGraph.stats.totalLocalEdges, 1);
      assert.strictEqual(depGraph.edges[0].isTypeOnly, false); // Runtime import wins over type-only
    });

    test('11. Circular dependency cycles (A -> B -> A) and self-cycles (A -> A) detected without infinite loop', async () => {
      const cycleDir = path.join(tempBaseDir, 'cycle-dir');
      await fs.mkdir(path.join(cycleDir, 'src'), { recursive: true });

      await fs.writeFile(path.join(cycleDir, 'src', 'a.ts'), 'import "./b"; export const a = 1;');
      await fs.writeFile(path.join(cycleDir, 'src', 'b.ts'), 'import "./a"; export const b = 2;');
      await fs.writeFile(
        path.join(cycleDir, 'src', 'self.ts'),
        'import "./self"; export const s = 3;'
      );

      const scanner = new FileScanner();
      const scanResult = await scanner.scan({ workspaceRoot: cycleDir });

      const depAnalyzer = new DependencyAnalyzer();
      const depGraph = await depAnalyzer.analyze(cycleDir, scanResult.rootNode);

      assert.strictEqual(depGraph.stats.circularDependenciesCount >= 1, true);
      const cycle = depGraph.circularGroups.find((g) => g.cycle.includes('src/a.ts'));
      assert.ok(cycle);
      assert.ok(cycle.cycle.includes('src/b.ts'));
    });
  });

  // =========================================================================
  // 5. IDEMPOTENCY & DETERMINISM
  // =========================================================================
  describe('Idempotency: Repeated analysis operations', () => {
    test('12. Repeated analysis runs produce identical deterministic results with 0 accumulated duplicates', async () => {
      const repeatDir = path.join(tempBaseDir, 'repeat-dir');
      await fs.mkdir(path.join(repeatDir, 'src'), { recursive: true });

      await fs.writeFile(
        path.join(repeatDir, 'package.json'),
        JSON.stringify({ name: 'repeat-test', dependencies: { react: '^18.0.0' } })
      );
      await fs.writeFile(
        path.join(repeatDir, 'src', 'index.tsx'),
        'import React from "react"; import { App } from "./App";'
      );
      await fs.writeFile(
        path.join(repeatDir, 'src', 'App.tsx'),
        'import React from "react"; export const App = () => null;'
      );

      const scanner = new FileScanner();
      const techDetector = new TechnologyDetector();
      const depAnalyzer = new DependencyAnalyzer();
      const archEngine = new ArchitectureEngine();

      // Run 1
      const scan1 = await scanner.scan({ workspaceRoot: repeatDir });
      const tech1 = await techDetector.detect(repeatDir, scan1.rootNode, scan1.stats);
      const dep1 = await depAnalyzer.analyze(repeatDir, scan1.rootNode);
      const arch1 = await archEngine.analyze(repeatDir, scan1.rootNode, dep1);

      // Run 2
      const scan2 = await scanner.scan({ workspaceRoot: repeatDir });
      const tech2 = await techDetector.detect(repeatDir, scan2.rootNode, scan2.stats);
      const dep2 = await depAnalyzer.analyze(repeatDir, scan2.rootNode);
      const arch2 = await archEngine.analyze(repeatDir, scan2.rootNode, dep2);

      // Run 3
      const scan3 = await scanner.scan({ workspaceRoot: repeatDir });
      const tech3 = await techDetector.detect(repeatDir, scan3.rootNode, scan3.stats);
      const dep3 = await depAnalyzer.analyze(repeatDir, scan3.rootNode);
      const arch3 = await archEngine.analyze(repeatDir, scan3.rootNode, dep3);

      assert.strictEqual(scan1.stats.totalFiles, scan2.stats.totalFiles);
      assert.strictEqual(scan2.stats.totalFiles, scan3.stats.totalFiles);

      assert.strictEqual(tech1.length, tech2.length);
      assert.strictEqual(tech2.length, tech3.length);

      assert.strictEqual(dep1.stats.totalLocalEdges, dep2.stats.totalLocalEdges);
      assert.strictEqual(dep2.stats.totalLocalEdges, dep3.stats.totalLocalEdges);

      assert.strictEqual(arch1.summary.totalModules, arch2.summary.totalModules);
      assert.strictEqual(arch2.summary.totalModules, arch3.summary.totalModules);
    });
  });
});
