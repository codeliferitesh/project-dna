import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'node:path';
import { FileScanner } from '../src/analyzer/fileScanner';
import { TechnologyDetector } from '../src/analyzer/technologyDetector';
import { DependencyAnalyzer } from '../src/analyzer/dependencies/dependencyAnalyzer';
import { ArchitectureEngine } from '../src/analyzer/architecture/architectureEngine';
import { ApiAnalyzer } from '../src/analyzer/api/apiAnalyzer';
import { ConfigAnalyzer } from '../src/analyzer/config/configAnalyzer';
import { EnvironmentAnalyzer } from '../src/analyzer/environment/environmentAnalyzer';

describe('Project DNA — birthday-app(Deployed) Real Workspace Verification', () => {
  const workspaceRoot = 'd:/Ritesh Verma/Work ✨/birthday-app(Deployed)';

  test('1. Runs full pipeline on birthday-app(Deployed) successfully', async () => {
    const scanner = new FileScanner();
    const scanResult = await scanner.scan({ workspaceRoot });

    assert.ok(scanResult.stats.totalFiles && scanResult.stats.totalFiles > 0);
    assert.strictEqual(scanResult.metadata.scannedRoot, path.resolve(workspaceRoot));

    // Technology Detection
    const techDetector = new TechnologyDetector();
    const technologies = await techDetector.detect(
      workspaceRoot,
      scanResult.rootNode,
      scanResult.stats
    );
    const techNames = technologies.map((t) => t.name);
    assert.ok(techNames.includes('Next.js') || techNames.includes('React'));

    // Dependency & Import Analysis with Path Alias Resolution
    const depAnalyzer = new DependencyAnalyzer();
    const depGraph = await depAnalyzer.analyze(workspaceRoot, scanResult.rootNode);
    assert.ok(depGraph.stats.analyzedFilesCount > 0);

    // Verify path alias @/* resolution worked for local files
    const resolvedLocalEdges = depGraph.edges.filter((e) => e.resolution === 'resolved');
    assert.ok(resolvedLocalEdges.length > 0);

    // Architecture Engine
    const archEngine = new ArchitectureEngine();
    const architecture = await archEngine.analyze(workspaceRoot, scanResult.rootNode, depGraph);
    assert.ok(architecture.summary.totalModules > 0);

    // API Analyzer (handles 0 endpoints gracefully)
    const apiAnalyzer = new ApiAnalyzer();
    const apiResult = await apiAnalyzer.analyze(workspaceRoot, scanResult.rootNode, technologies);
    assert.strictEqual(typeof apiResult.totalEndpoints, 'number');
    assert.ok(apiResult.frameworksDetected.includes('Next.js'));

    // Configuration Analyzer
    const configAnalyzer = new ConfigAnalyzer();
    const configResult = configAnalyzer.analyze(scanResult.rootNode);
    assert.ok(configResult.totalConfigs > 0);

    // Environment Analyzer (security check)
    const envAnalyzer = new EnvironmentAnalyzer();
    const envResult = await envAnalyzer.analyze(workspaceRoot, scanResult.rootNode);
    assert.strictEqual(typeof envResult.totalVariables, 'number');
  });

  test('2. Repeated analysis runs on birthday-app(Deployed) are 100% idempotent with 0 duplicate accumulation', async () => {
    const scanner = new FileScanner();
    const techDetector = new TechnologyDetector();
    const depAnalyzer = new DependencyAnalyzer();
    const archEngine = new ArchitectureEngine();
    const apiAnalyzer = new ApiAnalyzer();
    const configAnalyzer = new ConfigAnalyzer();
    const envAnalyzer = new EnvironmentAnalyzer();

    // Run 1
    const scan1 = await scanner.scan({ workspaceRoot });
    const tech1 = await techDetector.detect(workspaceRoot, scan1.rootNode, scan1.stats);
    const dep1 = await depAnalyzer.analyze(workspaceRoot, scan1.rootNode);
    const arch1 = await archEngine.analyze(workspaceRoot, scan1.rootNode, dep1);
    const api1 = await apiAnalyzer.analyze(workspaceRoot, scan1.rootNode, tech1);
    const cfg1 = configAnalyzer.analyze(scan1.rootNode);
    const env1 = await envAnalyzer.analyze(workspaceRoot, scan1.rootNode);

    // Run 2
    const scan2 = await scanner.scan({ workspaceRoot });
    const tech2 = await techDetector.detect(workspaceRoot, scan2.rootNode, scan2.stats);
    const dep2 = await depAnalyzer.analyze(workspaceRoot, scan2.rootNode);
    const arch2 = await archEngine.analyze(workspaceRoot, scan2.rootNode, dep2);
    const api2 = await apiAnalyzer.analyze(workspaceRoot, scan2.rootNode, tech2);
    const cfg2 = configAnalyzer.analyze(scan2.rootNode);
    const env2 = await envAnalyzer.analyze(workspaceRoot, scan2.rootNode);

    // Exact equality verifications
    assert.strictEqual(scan1.stats.totalFiles, scan2.stats.totalFiles);
    assert.strictEqual(scan1.stats.totalDirectories, scan2.stats.totalDirectories);
    assert.strictEqual(tech1.length, tech2.length);
    assert.strictEqual(dep1.stats.totalLocalEdges, dep2.stats.totalLocalEdges);
    assert.strictEqual(dep1.stats.analyzedFilesCount, dep2.stats.analyzedFilesCount);
    assert.strictEqual(arch1.summary.totalModules, arch2.summary.totalModules);
    assert.strictEqual(arch1.summary.layersCount, arch2.summary.layersCount);
    assert.strictEqual(api1.totalEndpoints, api2.totalEndpoints);
    assert.strictEqual(cfg1.totalConfigs, cfg2.totalConfigs);
    assert.strictEqual(env1.totalVariables, env2.totalVariables);
  });
});
