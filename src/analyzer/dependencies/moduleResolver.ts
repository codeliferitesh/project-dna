import * as fs from 'fs';
import * as path from 'path';
import { RawImportSpecifier, ResolvedImport } from './contracts';

export class ModuleResolver {
  private readonly workspaceRoot: string;
  private readonly knownFiles: Set<string>;
  private readonly tsconfigPaths: Map<string, string[]> = new Map();
  private baseUrl?: string;

  private static readonly JS_TS_EXTENSIONS = [
    '',
    '.ts',
    '.tsx',
    '.d.ts',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
    '.mts',
    '.cts',
    '.json',
    '.css',
    '.scss',
    '.sass',
    '.less',
    '.svg',
  ];

  private static readonly JS_TS_INDEX_FILES = [
    'index.ts',
    'index.tsx',
    'index.d.ts',
    'index.js',
    'index.jsx',
    'index.mjs',
    'index.cjs',
    'index.json',
  ];

  private static readonly PYTHON_EXTENSIONS = ['', '.py'];
  private static readonly PYTHON_INDEX_FILES = ['__init__.py'];

  constructor(workspaceRoot: string, knownFiles: Set<string>) {
    this.workspaceRoot = workspaceRoot;
    this.knownFiles = new Set(Array.from(knownFiles).map((f) => this.normalizePath(f)));
    this.loadCompilerConfigs();
  }

  /**
   * Resolves a raw import specifier from a source file into a local file path, external package, or unresolved.
   */
  public resolve(sourceRelativePath: string, raw: RawImportSpecifier): ResolvedImport {
    const specifier = raw.specifier.trim();
    if (!specifier) {
      return { raw, resolution: 'unresolved' };
    }

    const sourceNormalized = this.normalizePath(sourceRelativePath);
    const sourceDir = path.posix.dirname(sourceNormalized);
    const sourceExt = path.posix.extname(sourceNormalized).toLowerCase();
    const isPython = sourceExt === '.py';

    // 1. Relative imports (./..., ../..., . for python)
    if (this.isRelativeSpecifier(specifier, isPython)) {
      const resolvedLocal = this.resolveRelativeImport(sourceDir, specifier, isPython);
      if (resolvedLocal) {
        return {
          raw,
          resolution: 'resolved',
          targetFilePath: resolvedLocal,
        };
      }
      return {
        raw,
        resolution: 'unresolved',
      };
    }

    // 2. TypeScript / JavaScript path aliases (e.g. @/*, ~/*, @components/*)
    if (!isPython && this.tsconfigPaths.size > 0) {
      const aliasResolved = this.resolvePathAlias(specifier);
      if (aliasResolved) {
        return {
          raw,
          resolution: 'resolved',
          targetFilePath: aliasResolved,
        };
      }
    }

    // 3. baseUrl resolution if configured
    if (!isPython && this.baseUrl) {
      const candidate = path.posix.join(this.baseUrl, specifier);
      const baseUrlResolved = this.tryCandidatePath(candidate, isPython);
      if (baseUrlResolved) {
        return {
          raw,
          resolution: 'resolved',
          targetFilePath: baseUrlResolved,
        };
      }
    }

    // 4. Direct workspace root file match
    const directRootResolved = this.tryCandidatePath(specifier, isPython);
    if (directRootResolved) {
      return {
        raw,
        resolution: 'resolved',
        targetFilePath: directRootResolved,
      };
    }

    // 5. If it looks like a local alias but failed to resolve to any file on disk
    if (this.looksLikeLocalAlias(specifier)) {
      return {
        raw,
        resolution: 'unresolved',
      };
    }

    // 6. External package resolution
    const packageName = this.extractPackageName(specifier, isPython);
    return {
      raw,
      resolution: 'external',
      packageName,
    };
  }

  private isRelativeSpecifier(specifier: string, isPython: boolean): boolean {
    if (
      specifier.startsWith('./') ||
      specifier.startsWith('../') ||
      specifier === '.' ||
      specifier === '..'
    ) {
      return true;
    }
    if (isPython && specifier.startsWith('.')) {
      return true;
    }
    return false;
  }

  private resolveRelativeImport(
    sourceDir: string,
    specifier: string,
    isPython: boolean
  ): string | null {
    if (isPython) {
      return this.resolvePythonRelative(sourceDir, specifier);
    }

    const basePath = path.posix.normalize(path.posix.join(sourceDir, specifier));
    return this.tryCandidatePath(basePath, false);
  }

  private resolvePythonRelative(sourceDir: string, specifier: string): string | null {
    const match = specifier.match(/^(\.+)(.*)$/);
    if (!match) {
      return null;
    }

    const dots = match[1].length;
    const remainder = match[2].replace(/\./g, '/');

    let targetDir = sourceDir;
    for (let i = 1; i < dots; i++) {
      targetDir = path.posix.dirname(targetDir);
    }

    const candidate = remainder
      ? path.posix.normalize(path.posix.join(targetDir, remainder))
      : targetDir;

    return this.tryCandidatePath(candidate, true);
  }

  private resolvePathAlias(specifier: string): string | null {
    // Sort alias patterns by specificity (longer pattern prefixes first)
    const sortedEntries = Array.from(this.tsconfigPaths.entries()).sort(
      (a, b) => b[0].length - a[0].length
    );

    for (const [aliasPattern, targetPatterns] of sortedEntries) {
      if (aliasPattern.endsWith('*')) {
        const prefix = aliasPattern.slice(0, -1);
        if (specifier.startsWith(prefix)) {
          const suffix = specifier.slice(prefix.length);
          for (const targetPattern of targetPatterns) {
            const candidateBase = targetPattern.replace('*', suffix);
            const resolved = this.tryCandidatePath(candidateBase, false);
            if (resolved) {
              return resolved;
            }
          }
        }
      } else if (aliasPattern === specifier) {
        for (const targetPattern of targetPatterns) {
          const resolved = this.tryCandidatePath(targetPattern, false);
          if (resolved) {
            return resolved;
          }
        }
      } else if (specifier.startsWith(aliasPattern + '/')) {
        const suffix = specifier.slice((aliasPattern + '/').length);
        for (const targetPattern of targetPatterns) {
          const candidateBase = path.posix.join(targetPattern, suffix);
          const resolved = this.tryCandidatePath(candidateBase, false);
          if (resolved) {
            return resolved;
          }
        }
      }
    }
    return null;
  }

  private looksLikeLocalAlias(specifier: string): boolean {
    if (specifier.startsWith('@/') || specifier.startsWith('~/')) {
      return true;
    }
    for (const aliasKey of this.tsconfigPaths.keys()) {
      const prefix = aliasKey.replace(/\*$/, '');
      if (prefix && specifier.startsWith(prefix)) {
        return true;
      }
    }
    return false;
  }

  private tryCandidatePath(candidate: string, isPython: boolean): string | null {
    const normalized = this.normalizePath(candidate);
    const extensions = isPython
      ? ModuleResolver.PYTHON_EXTENSIONS
      : ModuleResolver.JS_TS_EXTENSIONS;
    const indexFiles = isPython
      ? ModuleResolver.PYTHON_INDEX_FILES
      : ModuleResolver.JS_TS_INDEX_FILES;

    // 1. Direct match with extension or exact path
    for (const ext of extensions) {
      const withExt = normalized + ext;
      if (this.knownFiles.has(withExt)) {
        return withExt;
      }
      if (this.fileExistsOnDisk(withExt)) {
        this.knownFiles.add(withExt);
        return withExt;
      }
    }

    // 2. Directory index match
    for (const indexFile of indexFiles) {
      const asIndex = path.posix.join(normalized, indexFile);
      if (this.knownFiles.has(asIndex)) {
        return asIndex;
      }
      if (this.fileExistsOnDisk(asIndex)) {
        this.knownFiles.add(asIndex);
        return asIndex;
      }
    }

    return null;
  }

  private fileExistsOnDisk(relativePath: string): boolean {
    try {
      const fullPath = path.join(this.workspaceRoot, relativePath);
      if (fs.existsSync(fullPath)) {
        return fs.statSync(fullPath).isFile();
      }
    } catch {
      // ignore
    }
    return false;
  }

  private extractPackageName(specifier: string, isPython: boolean): string {
    if (isPython) {
      const parts = specifier.split('.');
      return parts[0] || specifier;
    }

    // Scoped package: @org/pkg/subpath -> @org/pkg
    if (specifier.startsWith('@')) {
      const parts = specifier.split('/');
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
      return specifier;
    }

    // Unscoped package: pkg/subpath -> pkg
    const parts = specifier.split('/');
    return parts[0] || specifier;
  }

  private loadCompilerConfigs(): void {
    const configCandidates = [
      'tsconfig.json',
      'jsconfig.json',
      'tsconfig.app.json',
      'tsconfig.base.json',
    ];

    for (const configFile of configCandidates) {
      const fullPath = path.join(this.workspaceRoot, configFile);
      if (fs.existsSync(fullPath)) {
        const config = this.loadConfigFileWithExtends(fullPath);
        if (config && config.compilerOptions) {
          const compilerOptions = config.compilerOptions;
          const configDirRel = this.normalizePath(
            path.relative(this.workspaceRoot, path.dirname(fullPath))
          );

          if (typeof compilerOptions.baseUrl === 'string') {
            const rawBase = compilerOptions.baseUrl;
            const combinedBase = configDirRel ? path.posix.join(configDirRel, rawBase) : rawBase;
            this.baseUrl = this.normalizePath(combinedBase);
          }

          if (compilerOptions.paths && typeof compilerOptions.paths === 'object') {
            for (const [key, val] of Object.entries(compilerOptions.paths)) {
              if (Array.isArray(val)) {
                const normalizedTargets = (val as unknown[]).map((target) => {
                  let t = String(target);
                  if (this.baseUrl) {
                    t = path.posix.join(this.baseUrl, t);
                  } else if (configDirRel) {
                    t = path.posix.join(configDirRel, t);
                  }
                  return this.normalizePath(t);
                });
                this.tsconfigPaths.set(key, normalizedTargets);
              }
            }
          }

          // If valid paths or baseUrl were loaded from primary config, stop candidate search
          if (this.tsconfigPaths.size > 0 || this.baseUrl) {
            break;
          }
        }
      }
    }
  }

  /**
   * Parses a tsconfig/jsconfig JSON file that may contain comments and trailing commas.
   * Uses string-aware stripping so glob patterns like @/* are not confused with comments.
   */
  private parseJsonWithComments(filePath: string): Record<string, unknown> | null {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let result = '';
      let i = 0;
      const len = content.length;

      while (i < len) {
        const ch = content[i];
        const next = i + 1 < len ? content[i + 1] : '';

        // Quoted string (single or double) - preserve content intact
        if (ch === '"' || ch === "'") {
          let end = i + 1;
          while (end < len) {
            if (content[end] === '\\') {
              end += 2;
              continue;
            }
            if (content[end] === ch) {
              end++;
              break;
            }
            end++;
          }
          result += content.slice(i, end);
          i = end;
          continue;
        }

        // Block comment /* ... */
        if (ch === '/' && next === '*') {
          let end = i + 2;
          while (end < len) {
            if (content[end] === '*' && end + 1 < len && content[end + 1] === '/') {
              end += 2;
              break;
            }
            end++;
          }
          i = end;
          continue;
        }

        // Line comment // ...
        if (ch === '/' && next === '/') {
          let end = i + 2;
          while (end < len && content[end] !== '\n') {
            end++;
          }
          i = end;
          continue;
        }

        result += ch;
        i++;
      }

      // Remove trailing commas before } or ]
      let prev = '';
      do {
        prev = result;
        result = result.replace(/,\s*([\]}])/g, '$1');
      } while (result !== prev);

      return JSON.parse(result);
    } catch {
      return null;
    }
  }

  private loadConfigFileWithExtends(
    configPath: string,
    visited = new Set<string>()
  ): {
    compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> };
    extends?: string;
  } | null {
    const normalized = path.normalize(configPath);
    if (visited.has(normalized) || !fs.existsSync(normalized)) {
      return null;
    }
    visited.add(normalized);

    try {
      // Parse JSON with comments and trailing commas (no external dependency required)
      const parsed = this.parseJsonWithComments(normalized);
      if (!parsed) {
        return null;
      }

      let config: {
        compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> };
        extends?: string;
      } = parsed as typeof config;

      // 2. Resolve extends if present
      if (typeof config.extends === 'string') {
        const extendsSpecifier = config.extends;
        let candidateExtends = path.isAbsolute(extendsSpecifier)
          ? extendsSpecifier
          : path.resolve(path.dirname(normalized), extendsSpecifier);

        if (!fs.existsSync(candidateExtends) && fs.existsSync(candidateExtends + '.json')) {
          candidateExtends = candidateExtends + '.json';
        }

        const baseConfig = this.loadConfigFileWithExtends(candidateExtends, visited);
        if (baseConfig) {
          config = {
            ...baseConfig,
            ...config,
            compilerOptions: {
              ...(baseConfig.compilerOptions || {}),
              ...(config.compilerOptions || {}),
              paths: {
                ...(baseConfig.compilerOptions?.paths || {}),
                ...(config.compilerOptions?.paths || {}),
              },
            },
          };
        }
      }

      return config;
    } catch {
      return null;
    }
  }

  private normalizePath(p: string): string {
    return p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
  }
}
