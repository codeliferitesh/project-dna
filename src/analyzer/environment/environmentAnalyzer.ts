import * as fs from 'fs';
import * as path from 'path';
import {
  EnvironmentAnalysisResult,
  EnvironmentVariableInfo,
  EnvVarScope,
  EnvVarStatus,
  FileNode,
} from '../../models';

export class EnvironmentAnalyzer {
  private static readonly MAX_FILE_SIZE_BYTES = 1.5 * 1024 * 1024; // 1.5MB safeguard

  // Public/Client prefixes
  private static readonly PUBLIC_PREFIXES = [
    'NEXT_PUBLIC_',
    'VITE_',
    'REACT_APP_',
    'PUBLIC_',
    'GATSBY_',
    'NUXT_PUBLIC_',
  ];

  /**
   * Analyzes declared environment variables in .env* files and references in source code.
   *
   * SECURITY GUARANTEE:
   * Values are NEVER read, extracted, stored, logged, or returned. Only variable names (keys).
   */
  public async analyze(
    workspaceRoot: string,
    fileTree: FileNode | null
  ): Promise<EnvironmentAnalysisResult> {
    if (!fileTree) {
      return this.emptyResult();
    }

    const allFiles: FileNode[] = [];
    this.collectFiles(fileTree, allFiles);

    const declaredMap = new Map<string, Set<string>>(); // varName -> Set of env file paths
    const referencedMap = new Map<string, Set<string>>(); // varName -> Set of source file paths
    const envFilesFound: string[] = [];

    // 1. Identify and parse .env files
    let processedEnvCount = 0;
    for (const file of allFiles) {
      processedEnvCount++;
      if (processedEnvCount % 25 === 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }

      try {
        const relPath = file.relativePath.replace(/\\/g, '/');
        const fileName = file.name.toLowerCase();

        if (this.isEnvFile(fileName)) {
          envFilesFound.push(relPath);
          const fullPath = path.join(workspaceRoot, file.relativePath);
          const varNames = await this.extractDeclaredEnvKeys(fullPath);

          for (const key of varNames) {
            if (!declaredMap.has(key)) {
              declaredMap.set(key, new Set());
            }
            declaredMap.get(key)!.add(relPath);
          }
        }
      } catch {
        // Safe fallback
      }
    }

    // 2. Scan code files for environment references
    let processedRefCount = 0;
    for (const file of allFiles) {
      processedRefCount++;
      if (processedRefCount % 25 === 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }

      try {
        const relPath = file.relativePath.replace(/\\/g, '/');
        const ext = (file.extension || path.extname(file.name)).toLowerCase();

        // Only scan source code files
        if (
          [
            '.ts',
            '.tsx',
            '.js',
            '.jsx',
            '.mjs',
            '.cjs',
            '.py',
            '.java',
            '.kt',
            '.go',
            '.rs',
            '.php',
            '.rb',
            '.cs',
          ].includes(ext)
        ) {
          const fullPath = path.join(workspaceRoot, file.relativePath);
          const referencedKeys = await this.extractReferencedEnvKeys(fullPath, ext);

          for (const key of referencedKeys) {
            // Exclude built-in generic or empty keys
            if (!this.isValidEnvKey(key)) {
              continue;
            }
            if (!referencedMap.has(key)) {
              referencedMap.set(key, new Set());
            }
            referencedMap.get(key)!.add(relPath);
          }
        }
      } catch {
        // Safe fallback
      }
    }

    // 3. Merge declared and referenced variables
    const allVariableNames = new Set<string>([...declaredMap.keys(), ...referencedMap.keys()]);

    const variables: EnvironmentVariableInfo[] = [];
    let publicCount = 0;
    let privateCount = 0;
    let declaredCount = 0;
    let referencedCount = 0;

    for (const name of Array.from(allVariableNames).sort()) {
      const isDeclared = declaredMap.has(name);
      const isReferenced = referencedMap.has(name);

      let status: EnvVarStatus;
      if (isDeclared && isReferenced) {
        status = 'declared_and_referenced';
        declaredCount++;
        referencedCount++;
      } else if (isDeclared) {
        status = 'declared_only';
        declaredCount++;
      } else {
        status = 'referenced_only';
        referencedCount++;
      }

      const scope: EnvVarScope = this.isPublicVariable(name) ? 'public' : 'private';
      if (scope === 'public') {
        publicCount++;
      } else {
        privateCount++;
      }

      variables.push({
        name,
        status,
        scope,
        definedInFiles: isDeclared ? Array.from(declaredMap.get(name)!) : [],
        referencedInFiles: isReferenced ? Array.from(referencedMap.get(name)!) : [],
        description: scope === 'public' ? 'Client / Public Variable' : 'Server / Private Context',
      });
    }

    return {
      variables,
      envFiles: envFilesFound,
      totalVariables: variables.length,
      declaredCount,
      referencedCount,
      publicCount,
      privateCount,
    };
  }

  // ==========================================
  // ENV FILE KEY PARSER (SECURITY CRITICAL)
  // ==========================================

  private isEnvFile(fileName: string): boolean {
    return (
      fileName === '.env' ||
      fileName.startsWith('.env.') ||
      fileName === 'env.example' ||
      fileName === 'env.sample'
    );
  }

  /**
   * Safely reads only the keys on the left side of the equals sign.
   * Values are discarded immediately and never captured.
   */
  private async extractDeclaredEnvKeys(fullPath: string): Promise<string[]> {
    const keys: string[] = [];
    try {
      const stats = await fs.promises.stat(fullPath);
      if (stats.size > EnvironmentAnalyzer.MAX_FILE_SIZE_BYTES) {
        return keys;
      }

      const content = await fs.promises.readFile(fullPath, 'utf8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        // Match export? KEY=...
        const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
        if (match && match[1]) {
          const varName = match[1].trim();
          if (this.isValidEnvKey(varName)) {
            keys.push(varName);
          }
        }
      }
    } catch {
      // Safe fallback on file read error
    }
    return keys;
  }

  // ==========================================
  // SOURCE CODE REFERENCE PARSER
  // ==========================================

  private async extractReferencedEnvKeys(fullPath: string, ext: string): Promise<string[]> {
    const keys: string[] = [];
    try {
      const stats = await fs.promises.stat(fullPath);
      if (stats.size > EnvironmentAnalyzer.MAX_FILE_SIZE_BYTES) {
        return keys;
      }

      const content = await fs.promises.readFile(fullPath, 'utf8');

      // JS / TS patterns
      if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
        // process.env.VAR_NAME
        const processDotMatches = content.matchAll(/process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g);
        for (const m of processDotMatches) {
          keys.push(m[1]);
        }

        // process.env['VAR_NAME'] or process.env["VAR_NAME"]
        const processBracketMatches = content.matchAll(
          /process\.env\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]/g
        );
        for (const m of processBracketMatches) {
          keys.push(m[1]);
        }

        // import.meta.env.VAR_NAME
        const viteDotMatches = content.matchAll(/import\.meta\.env\.([A-Za-z_][A-Za-z0-9_]*)/g);
        for (const m of viteDotMatches) {
          keys.push(m[1]);
        }

        // import.meta.env['VAR_NAME']
        const viteBracketMatches = content.matchAll(
          /import\.meta\.env\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]/g
        );
        for (const m of viteBracketMatches) {
          keys.push(m[1]);
        }
      }

      // Python patterns
      if (ext === '.py') {
        // os.getenv("VAR_NAME")
        const osGetenvMatches = content.matchAll(
          /os\.getenv\s*\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g
        );
        for (const m of osGetenvMatches) {
          keys.push(m[1]);
        }

        // os.environ.get("VAR_NAME")
        const osEnvironGetMatches = content.matchAll(
          /os\.environ\.get\s*\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g
        );
        for (const m of osEnvironGetMatches) {
          keys.push(m[1]);
        }

        // os.environ["VAR_NAME"]
        const osEnvironBracketMatches = content.matchAll(
          /os\.environ\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]/g
        );
        for (const m of osEnvironBracketMatches) {
          keys.push(m[1]);
        }
      }

      // Java / Kotlin patterns
      if (ext === '.java' || ext === '.kt') {
        // System.getenv("VAR_NAME")
        const javaGetenvMatches = content.matchAll(
          /System\.getenv\s*\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g
        );
        for (const m of javaGetenvMatches) {
          keys.push(m[1]);
        }
      }
    } catch {
      // Safe fallback on file read error
    }

    return keys;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private isPublicVariable(name: string): boolean {
    return EnvironmentAnalyzer.PUBLIC_PREFIXES.some((prefix) => name.startsWith(prefix));
  }

  private isValidEnvKey(name: string): boolean {
    // Filter out common false positives like process.env.NODE_ENV is valid, but avoid single char or language keywords
    if (!name || name.length < 2) {
      return false;
    }
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
  }

  private emptyResult(): EnvironmentAnalysisResult {
    return {
      variables: [],
      envFiles: [],
      totalVariables: 0,
      declaredCount: 0,
      referencedCount: 0,
      publicCount: 0,
      privateCount: 0,
    };
  }

  private collectFiles(node: FileNode, list: FileNode[]): void {
    if (node.type === 'file') {
      list.push(node);
    } else if (node.children) {
      for (const child of node.children) {
        this.collectFiles(child, list);
      }
    }
  }
}
