import * as fs from 'fs/promises';
import * as path from 'path';
import { FileCategory, FileNode, ProjectStats, ScanMetadata } from '../models';
import { FileClassifier } from './fileClassifier';
import { IgnoreManager } from './ignoreManager';

export interface ScanOptions {
  workspaceRoot: string;
  maxDepth?: number;
  maxFiles?: number;
  customIgnorePatterns?: string[];
  onProgress?: (scannedCount: number, currentDir: string) => void;
}

export interface ScanResult {
  rootNode: FileNode;
  stats: ProjectStats;
  metadata: ScanMetadata;
}

export class FileScanner {
  private readonly ignoreManager: IgnoreManager;
  private readonly visitedRealPaths = new Set<string>();
  private readonly warnings: string[] = [];

  private totalFiles = 0;
  private totalDirectories = 0;
  private totalSizeBytes = 0;
  private ignoredDirsCount = 0;

  private categoryCounts: Record<FileCategory, number> = {
    source: 0,
    test: 0,
    config: 0,
    documentation: 0,
    asset: 0,
    style: 0,
    data: 0,
    lockfile: 0,
    unknown: 0,
  };

  private extensionCounts: Record<string, number> = {};

  constructor(customIgnorePatterns: string[] = []) {
    this.ignoreManager = new IgnoreManager(customIgnorePatterns);
  }

  public async scan(options: ScanOptions): Promise<ScanResult> {
    const startTime = Date.now();
    const maxDepth = options.maxDepth ?? 20;
    const maxFiles = options.maxFiles ?? 50000;
    const workspaceRoot = path.resolve(options.workspaceRoot);

    this.totalFiles = 0;
    this.totalDirectories = 0;
    this.totalSizeBytes = 0;
    this.ignoredDirsCount = 0;
    this.visitedRealPaths.clear();
    this.warnings.length = 0;

    Object.keys(this.categoryCounts).forEach((k) => {
      this.categoryCounts[k as FileCategory] = 0;
    });
    this.extensionCounts = {};

    try {
      const realRoot = await fs.realpath(workspaceRoot);
      this.visitedRealPaths.add(realRoot);
    } catch {
      this.visitedRealPaths.add(workspaceRoot);
    }

    const rootNode = await this.scanDirectory(
      workspaceRoot,
      '',
      0,
      maxDepth,
      maxFiles,
      options.onProgress
    );

    const endTime = Date.now();
    const durationMs = endTime - startTime;

    const stats: ProjectStats = {
      totalFiles: this.totalFiles,
      totalDirectories: this.totalDirectories,
      sourceFiles: this.categoryCounts.source,
      testFiles: this.categoryCounts.test,
      configFiles: this.categoryCounts.config,
      docFiles: this.categoryCounts.documentation,
      assetFiles: this.categoryCounts.asset,
      styleFiles: this.categoryCounts.style,
      dataFiles: this.categoryCounts.data,
      lockfiles: this.categoryCounts.lockfile,
      unknownFiles: this.categoryCounts.unknown,
      totalSizeBytes: this.totalSizeBytes,
      formattedTotalSize: this.formatBytes(this.totalSizeBytes),
      categoryBreakdown: { ...this.categoryCounts },
      extensionBreakdown: { ...this.extensionCounts },
      codeLines: null,
      totalTechnologies: null,
      totalDependencies: null,
      totalApis: null,
      totalConfigs: null,
      totalEnvVariables: null,
      entryPointsCount: null,
    };

    const metadata: ScanMetadata = {
      scanStartTime: startTime,
      scanEndTime: endTime,
      durationMs,
      scannerVersion: '1.0.0',
      scannedRoot: workspaceRoot,
      ignoredDirectoriesCount: this.ignoredDirsCount,
      hasWarnings: this.warnings.length > 0,
      warnings: [...this.warnings],
    };

    return {
      rootNode,
      stats,
      metadata,
    };
  }

  private async scanDirectory(
    dirPath: string,
    relativePath: string,
    currentDepth: number,
    maxDepth: number,
    maxFiles: number,
    onProgress?: (scannedCount: number, currentDir: string) => void
  ): Promise<FileNode> {
    const dirName = path.basename(dirPath) || dirPath;
    const normalizedRelPath = relativePath.split(path.sep).join('/');

    const dirNode: FileNode = {
      id: normalizedRelPath || '.',
      name: dirName,
      path: dirPath,
      relativePath: normalizedRelPath,
      type: 'directory',
      size: 0,
      fileCount: 0,
      dirCount: 0,
      children: [],
    };

    if (currentDepth >= maxDepth) {
      this.warnings.push(`Maximum depth of ${maxDepth} reached at: ${normalizedRelPath}`);
      return dirNode;
    }

    if (this.totalFiles >= maxFiles) {
      this.warnings.push(`File limit cap of ${maxFiles} reached.`);
      return dirNode;
    }

    let entries: import('fs').Dirent[];
    try {
      entries = (await fs.readdir(dirPath, { withFileTypes: true })) as import('fs').Dirent[];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.warnings.push(`Unable to read directory '${normalizedRelPath}': ${msg}`);
      return dirNode;
    }

    if (onProgress && this.totalFiles % 25 === 0) {
      onProgress(this.totalFiles, normalizedRelPath || dirName);
    }

    // Yield control to event loop every 50 files to keep host & webview UI responsive
    if (this.totalFiles > 0 && this.totalFiles % 50 === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    const subDirs: FileNode[] = [];
    const files: FileNode[] = [];

    for (const entry of entries) {
      if (this.totalFiles >= maxFiles) {
        break;
      }

      const entryName = entry.name;
      const entryRelPath = relativePath ? path.join(relativePath, entryName) : entryName;
      const entryAbsPath = path.join(dirPath, entryName);
      const entryNormalizedRel = entryRelPath.split(path.sep).join('/');

      try {
        if (entry.isDirectory()) {
          if (this.ignoreManager.shouldIgnoreDirectory(entryName, entryNormalizedRel)) {
            this.ignoredDirsCount++;
            continue;
          }

          // Protect against recursive symlinks
          try {
            const real = await fs.realpath(entryAbsPath);
            if (this.visitedRealPaths.has(real)) {
              this.warnings.push(`Cyclic or visited symlink detected at: ${entryNormalizedRel}`);
              continue;
            }
            this.visitedRealPaths.add(real);
          } catch {
            // If realpath fails, proceed cautiously
          }

          this.totalDirectories++;
          const childDirNode = await this.scanDirectory(
            entryAbsPath,
            entryRelPath,
            currentDepth + 1,
            maxDepth,
            maxFiles,
            onProgress
          );

          dirNode.size = (dirNode.size || 0) + (childDirNode.size || 0);
          dirNode.fileCount = (dirNode.fileCount || 0) + (childDirNode.fileCount || 0);
          dirNode.dirCount = (dirNode.dirCount || 0) + 1 + (childDirNode.dirCount || 0);
          subDirs.push(childDirNode);
        } else if (entry.isFile()) {
          if (this.ignoreManager.shouldIgnoreFile(entryName, entryNormalizedRel)) {
            continue;
          }

          let size = 0;
          try {
            const stats = await fs.stat(entryAbsPath);
            size = stats.size;
          } catch {
            // If stat fails (e.g. broken symlink), record 0 size
          }

          const ext = path.extname(entryName).toLowerCase();
          const category = FileClassifier.classify(entryName, entryNormalizedRel);

          this.totalFiles++;
          this.totalSizeBytes += size;
          this.categoryCounts[category]++;
          this.extensionCounts[ext || '(none)'] = (this.extensionCounts[ext || '(none)'] || 0) + 1;

          dirNode.size = (dirNode.size || 0) + size;
          dirNode.fileCount = (dirNode.fileCount || 0) + 1;

          const fileNode: FileNode = {
            id: entryNormalizedRel,
            name: entryName,
            path: entryAbsPath,
            relativePath: entryNormalizedRel,
            type: 'file',
            category,
            extension: ext,
            size,
          };

          files.push(fileNode);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.warnings.push(`Error processing '${entryNormalizedRel}': ${msg}`);
      }
    }

    // Sort deterministically: subdirectories first alphabetically, then files alphabetically
    subDirs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    dirNode.children = [...subDirs, ...files];
    return dirNode;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) {
      return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const formatted = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${formatted} ${sizes[i]}`;
  }
}
