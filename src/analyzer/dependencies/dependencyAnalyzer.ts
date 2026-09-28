import * as fs from 'fs';
import * as path from 'path';
import { FileNode } from '../../models';
import {
  DependencyAnalysisResult,
  ExternalPackageUsage,
  FileDependencyEdge,
  FileModuleNode,
  IFileDependencyParser,
} from './contracts';
import { GraphAnalyzer } from './graphAnalyzer';
import { ModuleResolver } from './moduleResolver';
import { JsTsParser } from './parsers/jsTsParser';
import { PythonParser } from './parsers/pythonParser';

export class DependencyAnalyzer {
  private static readonly MAX_FILE_SIZE_BYTES = 1.5 * 1024 * 1024; // 1.5 MB safeguard

  private readonly parsers: IFileDependencyParser[] = [new JsTsParser(), new PythonParser()];

  private readonly graphAnalyzer: GraphAnalyzer = new GraphAnalyzer();

  /**
   * Analyzes real code imports across all supported source files in the project.
   */
  public async analyze(
    workspaceRoot: string,
    fileTree: FileNode | null
  ): Promise<DependencyAnalysisResult> {
    if (!fileTree) {
      return this.graphAnalyzer.analyze(new Map(), [], new Map(), [], 0);
    }

    // 1. Collect all files from the workspace file tree
    const allFiles: FileNode[] = [];
    this.collectFiles(fileTree, allFiles);

    const knownFilesSet = new Set<string>();
    for (const file of allFiles) {
      knownFilesSet.add(file.relativePath.replace(/\\/g, '/'));
    }

    const resolver = new ModuleResolver(workspaceRoot, knownFilesSet);
    const nodesMap = new Map<string, FileModuleNode>();
    const allLocalEdges: FileDependencyEdge[] = [];
    const unresolvedImports: FileDependencyEdge[] = [];
    const externalPackagesMap = new Map<string, ExternalPackageUsage>();
    let skippedCount = 0;
    let processedCount = 0;

    // 2. Iterate through discovered source files
    for (const file of allFiles) {
      processedCount++;
      if (processedCount % 25 === 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }

      const ext = file.extension?.toLowerCase() || path.extname(file.name).toLowerCase();
      const parser = this.parsers.find((p) => p.supports(ext));

      if (!parser) {
        continue; // Unsupported file type (assets, markdown, etc.)
      }

      const relPath = file.relativePath.replace(/\\/g, '/');
      const fullPath = path.join(workspaceRoot, file.relativePath);

      // Check for oversized file
      if (file.size && file.size > DependencyAnalyzer.MAX_FILE_SIZE_BYTES) {
        skippedCount++;
        nodesMap.set(relPath, {
          id: relPath,
          path: relPath,
          displayName: file.name,
          language: parser.language,
          dependenciesCount: 0,
          importedByCount: 0,
          outgoingEdges: [],
          status: 'skipped',
          errorMessage: 'File exceeds maximum size limit (1.5MB)',
        });
        continue;
      }

      try {
        const content = await fs.promises.readFile(fullPath, 'utf8');
        const rawImports = parser.parse(fullPath, content);

        const fileOutgoingEdges: FileDependencyEdge[] = [];
        const seenTargetMap = new Map<string, FileDependencyEdge>();

        for (const raw of rawImports) {
          const resolved = resolver.resolve(relPath, raw);

          if (resolved.resolution === 'resolved' && resolved.targetFilePath) {
            const target = resolved.targetFilePath;
            const edgeId = `${relPath}->${target}`;

            // Deduplicate multiple imports to same target while tracking attributes
            if (seenTargetMap.has(edgeId)) {
              const existing = seenTargetMap.get(edgeId)!;
              // If any import is runtime (not type-only), the edge is runtime
              if (!raw.isTypeOnly) {
                existing.isTypeOnly = false;
              }
            } else {
              const edge: FileDependencyEdge = {
                id: edgeId,
                sourceFilePath: relPath,
                targetFilePath: target,
                specifier: raw.specifier,
                type: raw.type,
                resolution: 'resolved',
                isTypeOnly: raw.isTypeOnly,
                lineNumber: raw.lineNumber,
              };
              seenTargetMap.set(edgeId, edge);
              fileOutgoingEdges.push(edge);
              allLocalEdges.push(edge);
            }
          } else if (resolved.resolution === 'external' && resolved.packageName) {
            const pkgName = resolved.packageName;
            if (!externalPackagesMap.has(pkgName)) {
              externalPackagesMap.set(pkgName, {
                name: pkgName,
                importedBy: [relPath],
                count: 1,
                isTypeOnly: raw.isTypeOnly,
              });
            } else {
              const pkgUsage = externalPackagesMap.get(pkgName)!;
              if (!pkgUsage.importedBy.includes(relPath)) {
                pkgUsage.importedBy.push(relPath);
                pkgUsage.count++;
              }
              if (!raw.isTypeOnly) {
                pkgUsage.isTypeOnly = false;
              }
            }
          } else if (resolved.resolution === 'unresolved') {
            const edgeId = `unresolved:${relPath}:${raw.specifier}:${raw.lineNumber || 0}`;
            const unresolvedEdge: FileDependencyEdge = {
              id: edgeId,
              sourceFilePath: relPath,
              specifier: raw.specifier,
              type: raw.type,
              resolution: 'unresolved',
              isTypeOnly: raw.isTypeOnly,
              lineNumber: raw.lineNumber,
            };
            unresolvedImports.push(unresolvedEdge);
            fileOutgoingEdges.push(unresolvedEdge);
          }
        }

        nodesMap.set(relPath, {
          id: relPath,
          path: relPath,
          displayName: file.name,
          language: parser.language,
          dependenciesCount: fileOutgoingEdges.filter((e) => e.resolution === 'resolved').length,
          importedByCount: 0,
          outgoingEdges: fileOutgoingEdges,
          status: 'analyzed',
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        nodesMap.set(relPath, {
          id: relPath,
          path: relPath,
          displayName: file.name,
          language: parser.language,
          dependenciesCount: 0,
          importedByCount: 0,
          outgoingEdges: [],
          status: 'error',
          errorMessage: errorMsg,
        });
      }
    }

    // 3. Perform graph analysis & calculate metrics
    return this.graphAnalyzer.analyze(
      nodesMap,
      allLocalEdges,
      externalPackagesMap,
      unresolvedImports,
      skippedCount
    );
  }

  private collectFiles(node: FileNode, result: FileNode[]): void {
    if (node.type === 'file') {
      result.push(node);
      return;
    }
    if (node.children) {
      for (const child of node.children) {
        this.collectFiles(child, result);
      }
    }
  }
}
