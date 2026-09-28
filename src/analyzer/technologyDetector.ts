import * as fs from 'fs/promises';
import * as path from 'path';
import { FileNode, ProjectStats, TechnologyInfo } from '../models';
import { ConfigFileDetector } from './detectors/configFileDetector';
import { DatabaseDetector } from './detectors/databaseDetector';
import { DetectionContext } from './detectors/detectorInterface';
import { DetectorRegistry } from './detectors/detectorRegistry';
import { FirebaseDetector } from './detectors/firebaseDetector';
import { JavaDetector } from './detectors/javaDetector';
import { LanguageDetector } from './detectors/languageDetector';
import { PackageJsonDetector } from './detectors/packageJsonDetector';
import { PackageManagerDetector } from './detectors/packageManagerDetector';
import { PythonDetector } from './detectors/pythonDetector';

export class TechnologyDetector {
  private readonly registry: DetectorRegistry;

  constructor() {
    this.registry = new DetectorRegistry();
    this.registry.register(new LanguageDetector());
    this.registry.register(new PackageJsonDetector());
    this.registry.register(new ConfigFileDetector());
    this.registry.register(new FirebaseDetector());
    this.registry.register(new PackageManagerDetector());
    this.registry.register(new DatabaseDetector());
    this.registry.register(new PythonDetector());
    this.registry.register(new JavaDetector());
  }

  public async detect(
    workspaceRoot: string,
    fileTree: FileNode,
    stats: ProjectStats
  ): Promise<TechnologyInfo[]> {
    const allRelativeFilePaths = new Set<string>();
    const fileNames = new Set<string>();

    const collectFiles = (node: FileNode) => {
      if (node.type === 'file') {
        const normRel = node.relativePath.split(path.sep).join('/');
        allRelativeFilePaths.add(normRel);
        fileNames.add(node.name.toLowerCase());
      } else if (node.children) {
        node.children.forEach(collectFiles);
      }
    };

    collectFiles(fileTree);

    const fileCache = new Map<string, string | null>();

    const readConfigFile = async (relativePath: string): Promise<string | null> => {
      const normalized = relativePath.split(path.sep).join('/');
      if (fileCache.has(normalized)) {
        return fileCache.get(normalized) ?? null;
      }

      const absPath = path.resolve(workspaceRoot, relativePath);
      // Security check: ensure path is within workspaceRoot
      if (!absPath.startsWith(path.resolve(workspaceRoot))) {
        return null;
      }

      try {
        const content = await fs.readFile(absPath, 'utf8');
        fileCache.set(normalized, content);
        return content;
      } catch {
        fileCache.set(normalized, null);
        return null;
      }
    };

    const readJsonConfig = async <T = unknown>(relativePath: string): Promise<T | null> => {
      const text = await readConfigFile(relativePath);
      if (!text) {
        return null;
      }
      try {
        return JSON.parse(text) as T;
      } catch {
        return null;
      }
    };

    const context: DetectionContext = {
      workspaceRoot,
      fileTree,
      stats,
      allRelativeFilePaths,
      fileNames,
      readConfigFile,
      readJsonConfig,
    };

    return this.registry.runAll(context);
  }
}
