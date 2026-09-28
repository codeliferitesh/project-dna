import * as vscode from 'vscode';
import { ApiAnalyzer } from '../analyzer/api/apiAnalyzer';
import { ArchitectureEngine } from '../analyzer/architecture/architectureEngine';
import { ConfigAnalyzer } from '../analyzer/config/configAnalyzer';
import { DependencyAnalyzer } from '../analyzer/dependencies/dependencyAnalyzer';
import { EnvironmentAnalyzer } from '../analyzer/environment/environmentAnalyzer';
import { FileScanner } from '../analyzer/fileScanner';
import { GitDetector } from '../analyzer/git/gitDetector';
import { TechnologyDetector } from '../analyzer/technologyDetector';
import { ProjectAnalysis } from '../models';
import { ProjectStateService } from './projectStateService';
import { WorkspaceService } from './workspaceService';

export class AnalysisService {
  private readonly fileScanner: FileScanner;
  private readonly technologyDetector: TechnologyDetector;
  private readonly dependencyAnalyzer: DependencyAnalyzer;
  private readonly architectureEngine: ArchitectureEngine;
  private readonly apiAnalyzer: ApiAnalyzer;
  private readonly configAnalyzer: ConfigAnalyzer;
  private readonly environmentAnalyzer: EnvironmentAnalyzer;
  private readonly gitDetector: GitDetector;

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly stateService: ProjectStateService
  ) {
    this.fileScanner = new FileScanner();
    this.technologyDetector = new TechnologyDetector();
    this.dependencyAnalyzer = new DependencyAnalyzer();
    this.architectureEngine = new ArchitectureEngine();
    this.apiAnalyzer = new ApiAnalyzer();
    this.configAnalyzer = new ConfigAnalyzer();
    this.environmentAnalyzer = new EnvironmentAnalyzer();
    this.gitDetector = new GitDetector();
  }

  /**
   * Runs the complete Project DNA analysis pipeline:
   * 1. Workspace File Scan
   * 2. Technology Detection
   * 3. Dependency & Import Analysis
   * 4. Architecture & Role Analysis
   * 5. API & Route Analysis
   * 6. Configuration Analysis
   * 7. Environment Variable Analysis
   */
  public async analyzeProject(): Promise<boolean> {
    if (!this.workspaceService.isWorkspaceOpen()) {
      vscode.window.showWarningMessage('No workspace is currently open.');
      return false;
    }

    const projectInfo = this.workspaceService.getProjectInfo();
    const workspaceRoot = projectInfo.rootPath;

    if (!workspaceRoot) {
      vscode.window.showWarningMessage('No workspace is currently open.');
      return false;
    }

    try {
      this.stateService.startAnalysis();

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Project DNA: Analyzing workspace (${projectInfo.workspaceName})...`,
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: 'Scanning files and directory hierarchy...' });

          const scanResult = await this.fileScanner.scan({
            workspaceRoot,
            onProgress: (scannedCount, currentDir) => {
              progress.report({
                message: `Scanning files... (${scannedCount} files found in ${currentDir})`,
              });
            },
          });

          progress.report({ message: 'Detecting technologies, frameworks & configurations...' });

          const detectedTechnologies = await this.technologyDetector.detect(
            workspaceRoot,
            scanResult.rootNode,
            scanResult.stats
          );

          scanResult.stats.totalTechnologies = detectedTechnologies.length;

          progress.report({ message: 'Analyzing code dependencies & import relationships...' });

          const dependencyGraph = await this.dependencyAnalyzer.analyze(
            workspaceRoot,
            scanResult.rootNode
          );

          scanResult.stats.totalDependencies = dependencyGraph.stats.totalLocalEdges;

          progress.report({ message: 'Deriving architecture layers, roles & relationships...' });

          const architecture = await this.architectureEngine.analyze(
            workspaceRoot,
            scanResult.rootNode,
            dependencyGraph
          );

          scanResult.stats.entryPointsCount = architecture.summary.entryPointsCount;

          progress.report({ message: 'Analyzing API endpoints & server routes...' });

          const apiAnalysis = await this.apiAnalyzer.analyze(
            workspaceRoot,
            scanResult.rootNode,
            detectedTechnologies
          );

          scanResult.stats.totalApis = apiAnalysis.totalEndpoints;

          progress.report({ message: 'Analyzing configuration files & project manifests...' });

          const configurationAnalysis = this.configAnalyzer.analyze(scanResult.rootNode);

          scanResult.stats.totalConfigs = configurationAnalysis.totalConfigs;

          progress.report({ message: 'Auditing environment variables & references (secure)...' });

          const environmentAnalysis = await this.environmentAnalyzer.analyze(
            workspaceRoot,
            scanResult.rootNode
          );

          scanResult.stats.totalEnvVariables = environmentAnalysis.totalVariables;

          // Consolidate parser and size warnings into scan metadata
          if (dependencyGraph.stats.skippedFilesCount > 0) {
            scanResult.metadata.warnings.push(
              `${dependencyGraph.stats.skippedFilesCount} oversized source file(s) (>1.5MB) skipped for deep AST analysis.`
            );
          }

          const erroredModules = Object.values(dependencyGraph.nodes).filter(
            (n) => n.status === 'error'
          );
          if (erroredModules.length > 0) {
            scanResult.metadata.warnings.push(
              `${erroredModules.length} source file(s) could not be fully parsed due to syntax/unsupported constructs.`
            );
          }

          if (scanResult.metadata.warnings.length > 0) {
            scanResult.metadata.hasWarnings = true;
          }

          progress.report({ message: 'Checking repository status (local)...' });
          const gitInfo = await this.gitDetector.detect(workspaceRoot);

          const completedAnalysis: ProjectAnalysis = {
            info: {
              ...projectInfo,
              isAnalyzed: true,
              lastAnalyzedTimestamp: Date.now(),
            },
            stats: scanResult.stats,
            fileTree: scanResult.rootNode,
            scanMetadata: scanResult.metadata,
            technologies: detectedTechnologies,
            dependencies: [],
            dependencyGraph,
            architecture,
            apiAnalysis,
            configurationAnalysis,
            environmentAnalysis,
            apis: apiAnalysis.endpoints,
            entryPoints: [],
            envVariables: environmentAnalysis.variables.map((v) => ({
              name: v.name,
              isRequired: false,
              description: v.description,
              definedInFiles: v.definedInFiles,
            })),
            git: gitInfo,
          };

          this.stateService.completeAnalysis(completedAnalysis);
        }
      );

      vscode.window.showInformationMessage('Project DNA: Analysis complete.');
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.stateService.failAnalysis(msg);
      vscode.window.showErrorMessage(`Project DNA: Analysis failed. ${msg}`);
      return false;
    }
  }

  /**
   * Refreshes the analysis and re-scans the active workspace.
   */
  public async refreshAnalysis(): Promise<void> {
    if (!this.workspaceService.isWorkspaceOpen()) {
      vscode.window.showWarningMessage('No workspace is currently open.');
      return;
    }
    await this.analyzeProject();
  }
}
