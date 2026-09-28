export type NavigationTab =
  | 'overview'
  | 'structure'
  | 'architecture'
  | 'graph'
  | 'technology'
  | 'dependencies'
  | 'apis'
  | 'configuration'
  | 'git';

export type TechnologyCategory =
  | 'language'
  | 'framework'
  | 'library'
  | 'runtime'
  | 'styling'
  | 'database'
  | 'backend'
  | 'buildTool'
  | 'packageManager'
  | 'cloud'
  | 'service'
  | 'testing'
  | 'tooling'
  | 'other';

export type EvidenceType =
  'dependency' | 'configuration' | 'file_extension' | 'lockfile' | 'schema' | 'script' | 'manifest';

export interface TechnologyEvidence {
  source: string;
  type: EvidenceType;
  detail: string;
}

export interface TechnologyInfo {
  id: string;
  name: string;
  category: TechnologyCategory;
  version?: string;
  confidence: number;
  evidence: TechnologyEvidence[];
  icon?: string;
  description?: string;
}

export type FileCategory =
  | 'source'
  | 'test'
  | 'config'
  | 'documentation'
  | 'asset'
  | 'style'
  | 'data'
  | 'lockfile'
  | 'unknown';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  relativePath: string;
  type: 'file' | 'directory';
  category?: FileCategory;
  extension?: string;
  size?: number;
  fileCount?: number;
  dirCount?: number;
  children?: FileNode[];
}

export interface DependencyNode {
  id: string;
  name: string;
  version: string;
  type: 'production' | 'development' | 'peer' | 'system' | 'transitive';
  ecosystem: 'npm' | 'pip' | 'cargo' | 'maven' | 'go' | 'gem' | 'nuget' | 'composer' | 'other';
  license?: string;
  description?: string;
}

export type ImportRelationType =
  'import' | 'export_from' | 'dynamic_import' | 'require' | 'type_import';

export type ResolutionStatus = 'resolved' | 'external' | 'unresolved';

export interface FileDependencyEdge {
  id: string;
  sourceFilePath: string;
  targetFilePath?: string;
  specifier: string;
  type: ImportRelationType;
  resolution: ResolutionStatus;
  isTypeOnly: boolean;
  lineNumber?: number;
}

export interface FileModuleNode {
  id: string;
  path: string;
  displayName: string;
  language: 'typescript' | 'javascript' | 'python' | 'unknown';
  dependenciesCount: number;
  importedByCount: number;
  outgoingEdges: FileDependencyEdge[];
  status: 'analyzed' | 'skipped' | 'error';
  errorMessage?: string;
}

export interface ExternalPackageUsage {
  name: string;
  importedBy: string[];
  count: number;
  isTypeOnly: boolean;
}

export interface CircularDependencyGroup {
  id: string;
  cycle: string[];
  length: number;
}

export interface DependencyStats {
  analyzedFilesCount: number;
  filesWithDependenciesCount: number;
  totalLocalEdges: number;
  totalExternalPackages: number;
  unresolvedImportsCount: number;
  filesWithNoIncomingCount: number;
  filesWithNoOutgoingCount: number;
  circularDependenciesCount: number;
  skippedFilesCount: number;
}

export interface DependencyAnalysisResult {
  nodes: Record<string, FileModuleNode>;
  edges: FileDependencyEdge[];
  externalPackages: ExternalPackageUsage[];
  unresolvedImports: FileDependencyEdge[];
  circularGroups: CircularDependencyGroup[];
  stats: DependencyStats;
}

export type ArchitecturalRole =
  | 'entry_point'
  | 'page'
  | 'route'
  | 'layout'
  | 'component'
  | 'ui_component'
  | 'hook'
  | 'context'
  | 'service'
  | 'api_client'
  | 'backend_route'
  | 'controller'
  | 'model'
  | 'repository'
  | 'utility'
  | 'config'
  | 'state_management'
  | 'test'
  | 'type_definition'
  | 'schema'
  | 'middleware'
  | 'worker'
  | 'constant'
  | 'asset_module'
  | 'unknown';

export type ArchitecturalLayer =
  | 'presentation'
  | 'routing'
  | 'application'
  | 'domain'
  | 'services'
  | 'data_access'
  | 'infrastructure'
  | 'configuration'
  | 'testing'
  | 'shared_utility'
  | 'unknown';

export type ArchitecturalRelationshipType =
  | 'imports'
  | 'renders'
  | 'uses'
  | 'calls'
  | 'provides'
  | 'consumes'
  | 'extends'
  | 'implements'
  | 'configures'
  | 'tests'
  | 'routes_to'
  | 'depends_on';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ArchitecturalModule {
  id: string;
  path: string;
  displayName: string;
  primaryRole: ArchitecturalRole;
  layer: ArchitecturalLayer;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  evidence: string[];
  isEntryPoint: boolean;
  fanIn: number;
  fanOut: number;
  secondaryRoles: ArchitecturalRole[];
}

export interface ArchitecturalRelationship {
  id: string;
  sourcePath: string;
  targetPath: string;
  type: ArchitecturalRelationshipType;
  description: string;
  confidence: number;
  evidence: string[];
  lineNumber?: number;
}

export interface ArchitectureLayerGroup {
  id: string;
  name: string;
  layer: ArchitecturalLayer;
  modulePaths: string[];
  description: string;
}

export interface ArchitectureSummary {
  totalModules: number;
  classifiedModulesCount: number;
  unclassifiedModulesCount: number;
  layersCount: number;
  entryPointsCount: number;
  relationshipsCount: number;
  roleDistribution: Record<ArchitecturalRole, number>;
  layerDistribution: Record<ArchitecturalLayer, number>;
  highFanInModules: { path: string; fanIn: number; role: ArchitecturalRole }[];
  highFanOutModules: { path: string; fanOut: number; role: ArchitecturalRole }[];
  observedStructure: string[];
}

export interface ArchitectureAnalysisResult {
  modules: Record<string, ArchitecturalModule>;
  relationships: ArchitecturalRelationship[];
  layers: ArchitectureLayerGroup[];
  entryPoints: ArchitecturalModule[];
  summary: ArchitectureSummary;
}

export type HttpMethod =
  'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'GRAPHQL' | 'RPC' | 'OTHER';

export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  sourceFile: string;
  framework: string;
  confidence: number;
  evidence: string[];
  filePath?: string; // backwards compatibility
  lineNumber?: number;
  handlerName?: string;
  isDynamic?: boolean;
  summary?: string;
}

export interface ApiAnalysisResult {
  endpoints: ApiEndpoint[];
  totalEndpoints: number;
  methodCounts: Record<HttpMethod, number>;
  frameworksDetected: string[];
  dynamicEndpointsCount: number;
}

export type ConfigCategory =
  | 'package'
  | 'compiler'
  | 'framework'
  | 'build'
  | 'styling'
  | 'linting'
  | 'formatting'
  | 'deployment'
  | 'database'
  | 'cloud'
  | 'container'
  | 'runtime'
  | 'testing'
  | 'other';

export interface ProjectConfigFile {
  id: string;
  filePath: string;
  fileName: string;
  category: ConfigCategory;
  technology: string;
  purpose: string;
  evidence: string[];
}

export interface ConfigurationAnalysisResult {
  configs: ProjectConfigFile[];
  categoryCounts: Record<ConfigCategory, number>;
  totalConfigs: number;
}

export type EnvVarStatus = 'declared_and_referenced' | 'declared_only' | 'referenced_only';
export type EnvVarScope = 'public' | 'private';

export interface EnvironmentVariableInfo {
  name: string;
  status: EnvVarStatus;
  scope: EnvVarScope;
  definedInFiles: string[];
  referencedInFiles: string[];
  description?: string;
}

export interface EnvironmentAnalysisResult {
  variables: EnvironmentVariableInfo[];
  envFiles: string[];
  totalVariables: number;
  declaredCount: number;
  referencedCount: number;
  publicCount: number;
  privateCount: number;
}

export interface EntryPoint {
  id: string;
  name: string;
  filePath: string;
  type: 'client' | 'server' | 'cli' | 'library' | 'worker' | 'test' | 'other';
  description?: string;
}

export interface EnvironmentVariable {
  name: string;
  isRequired: boolean;
  defaultValue?: string;
  description?: string;
  definedInFiles?: string[];
}

export interface GitInfo {
  isGitRepo: boolean;
  currentBranch?: string;
  lastCommitHash?: string;
  lastCommitAuthor?: string;
  lastCommitDate?: string;
  lastCommitMessage?: string;
  remoteUrl?: string;
  status?: 'clean' | 'dirty' | 'unknown';
}

export interface ProjectStats {
  totalFiles: number | null;
  totalDirectories: number | null;
  sourceFiles: number | null;
  testFiles: number | null;
  configFiles: number | null;
  docFiles: number | null;
  assetFiles: number | null;
  styleFiles: number | null;
  dataFiles: number | null;
  lockfiles: number | null;
  unknownFiles: number | null;
  totalSizeBytes: number | null;
  formattedTotalSize: string | null;
  categoryBreakdown: Record<FileCategory, number> | null;
  extensionBreakdown: Record<string, number> | null;
  codeLines: number | null;
  totalTechnologies: number | null;
  totalDependencies: number | null;
  totalApis: number | null;
  totalConfigs: number | null;
  totalEnvVariables: number | null;
  entryPointsCount: number | null;
}

export interface ScanMetadata {
  scanStartTime: number;
  scanEndTime: number;
  durationMs: number;
  scannerVersion: string;
  scannedRoot: string;
  ignoredDirectoriesCount: number;
  hasWarnings: boolean;
  warnings: string[];
}

export interface ProjectInfo {
  workspaceName: string | null;
  rootPath: string | null;
  isWorkspaceOpen: boolean;
  isAnalyzed: boolean;
  lastAnalyzedTimestamp: number | null;
}

export interface ProjectAnalysis {
  info: ProjectInfo;
  stats: ProjectStats | null;
  fileTree: FileNode | null;
  scanMetadata: ScanMetadata | null;
  technologies: TechnologyInfo[];
  dependencies: DependencyNode[];
  dependencyGraph: DependencyAnalysisResult | null;
  architecture: ArchitectureAnalysisResult | null;
  apiAnalysis: ApiAnalysisResult | null;
  configurationAnalysis: ConfigurationAnalysisResult | null;
  environmentAnalysis: EnvironmentAnalysisResult | null;
  apis: ApiEndpoint[];
  entryPoints: EntryPoint[];
  envVariables: EnvironmentVariable[];
  git: GitInfo | null;
}

export interface ProjectStatePayload {
  info: ProjectInfo;
  stats: ProjectStats | null;
  analysis: ProjectAnalysis | null;
  isAnalyzing: boolean;
  activeTab: NavigationTab;
  errorMessage: string | null;
}

export type WebviewMessage =
  | { type: 'analyzeProject' }
  | { type: 'refreshProject' }
  | { type: 'openFile'; path: string; line?: number }
  | { type: 'navigateTab'; tab: NavigationTab }
  | { type: 'getState' }
  | { type: 'openSettings' };

export type ExtensionMessage =
  | { type: 'projectState'; state: ProjectStatePayload }
  | { type: 'analysisStarted' }
  | { type: 'analysisCompleted'; analysis: ProjectAnalysis }
  | { type: 'analysisError'; error: string }
  | { type: 'workspaceChanged'; workspaceName: string | null; isWorkspaceOpen: boolean }
  | { type: 'setActiveTab'; tab: NavigationTab };

export type GraphMode = 'architecture' | 'dependencies';

export interface GraphNode {
  id: string;
  label: string;
  filePath: string;
  role: ArchitecturalRole;
  layer: ArchitecturalLayer;
  confidence: number;
  isEntryPoint: boolean;
  fanIn: number;
  fanOut: number;
  isExternal: boolean;
  isCycleMember: boolean;
  cycleLength?: number;
  secondaryRoles?: ArchitecturalRole[];
  x: number;
  y: number;
  tier?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
  confidence: number;
  isCycleEdge: boolean;
  isExternal: boolean;
  isTypeOnly?: boolean;
  description?: string;
}

export interface GraphFilterState {
  selectedLayer: string;
  selectedRole: string;
  selectedRelationship: string;
  showExternal: boolean;
  entryPointsOnly: boolean;
  searchQuery: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  activeRoles: ArchitecturalRole[];
  activeLayers: ArchitecturalLayer[];
  activeRelationships: string[];
  cycleCount: number;
  entryPointCount: number;
}
