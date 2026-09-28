import { ProjectAnalysis, ProjectInfo } from '../models';

/**
 * Options for project analysis execution
 */
export interface AnalysisOptions {
  workspaceRoot: string;
  maxFileDepth?: number;
  excludedPatterns?: string[];
  includeGit?: boolean;
}

/**
 * Progress reporter contract for analysis tasks
 */
export interface AnalysisProgressReporter {
  report(message: string, increment?: number): void;
}

/**
 * Core interface for domain analyzers (Technology, File Structure, Dependencies, APIs, etc.)
 */
export interface IProjectAnalyzer {
  readonly id: string;
  readonly name: string;
  analyze(
    context: AnalysisContext,
    progress?: AnalysisProgressReporter
  ): Promise<Partial<ProjectAnalysis>>;
}

/**
 * Shared context passed to modular analyzers
 */
export interface AnalysisContext {
  workspaceRoot: string;
  projectInfo: ProjectInfo;
  options: AnalysisOptions;
}
