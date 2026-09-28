import {
  CircularDependencyGroup,
  DependencyAnalysisResult,
  DependencyStats,
  ExternalPackageUsage,
  FileDependencyEdge,
  FileModuleNode,
  ImportRelationType,
  ResolutionStatus,
} from '../../models';

export interface RawImportSpecifier {
  specifier: string;
  type: ImportRelationType;
  isTypeOnly: boolean;
  lineNumber?: number;
  importedNames?: string[];
}

export interface IFileDependencyParser {
  readonly language: 'typescript' | 'javascript' | 'python' | 'unknown';
  supports(extension: string): boolean;
  parse(filePath: string, content: string): RawImportSpecifier[];
}

export interface ResolvedImport {
  raw: RawImportSpecifier;
  resolution: ResolutionStatus;
  targetFilePath?: string; // workspace-relative
  packageName?: string;
}

export interface ModuleResolverOptions {
  workspaceRoot: string;
  knownFiles: Set<string>; // Set of workspace-relative paths
  tsconfigPaths?: Record<string, string[]>;
  baseUrl?: string;
}

export {
  CircularDependencyGroup,
  DependencyAnalysisResult,
  DependencyStats,
  ExternalPackageUsage,
  FileDependencyEdge,
  FileModuleNode,
  ImportRelationType,
  ResolutionStatus,
};
