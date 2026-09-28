import { FileNode, ProjectStats, TechnologyInfo } from '../../models';

export interface DetectionContext {
  workspaceRoot: string;
  fileTree: FileNode;
  stats: ProjectStats;
  allRelativeFilePaths: Set<string>;
  fileNames: Set<string>;
  readConfigFile(relativePath: string): Promise<string | null>;
  readJsonConfig<T = unknown>(relativePath: string): Promise<T | null>;
}

export interface ITechnologyDetector {
  readonly id: string;
  readonly name: string;
  detect(context: DetectionContext): Promise<TechnologyInfo[]>;
}
