import * as path from 'path';

export class IgnoreManager {
  private static readonly DEFAULT_IGNORED_DIRS = new Set([
    'node_modules',
    '.git',
    '.svn',
    '.hg',
    'dist',
    'dist-test',
    'build',
    'out',
    '.next',
    '.nuxt',
    '.svelte-kit',
    '.astro',
    '.docusaurus',
    '.output',
    '.cache',
    'coverage',
    '.nyc_output',
    '.vscode',
    '.idea',
    'venv',
    '.venv',
    'env',
    '.env_dir',
    '__pycache__',
    '.pytest_cache',
    '.mypy_cache',
    '.ruff_cache',
    'site-packages',
    'target', // Rust/Maven
    'bin',
    'obj',
    '.gradle',
    '.turbo',
    '.parcel-cache',
    '.webpack',
    '.serverless',
    '.terraform',
    '.vercel',
    '.netlify',
    '.yarn',
    '.pnpm-store',
    'vendor',
    '.bundle',
    'temp',
    'tmp',
  ]);

  private static readonly DEFAULT_IGNORED_FILES = new Set([
    '.ds_store',
    'thumbs.db',
    'desktop.ini',
    'npm-debug.log',
    'yarn-debug.log',
    'yarn-error.log',
    'pnpm-debug.log',
    'pnpm-error.log',
  ]);

  private customPatterns: string[] = [];

  constructor(customPatterns: string[] = []) {
    this.customPatterns = [...customPatterns];
  }

  public addPattern(pattern: string): void {
    if (pattern && !this.customPatterns.includes(pattern)) {
      this.customPatterns.push(pattern);
    }
  }

  public shouldIgnoreDirectory(dirName: string, relativePath: string = ''): boolean {
    const normalizedName = dirName.toLowerCase();

    if (IgnoreManager.DEFAULT_IGNORED_DIRS.has(normalizedName)) {
      return true;
    }

    // Check custom patterns
    if (this.matchesCustomPatterns(dirName, relativePath, true)) {
      return true;
    }

    return false;
  }

  public shouldIgnoreFile(fileName: string, relativePath: string = ''): boolean {
    const normalizedName = fileName.toLowerCase();

    if (IgnoreManager.DEFAULT_IGNORED_FILES.has(normalizedName)) {
      return true;
    }

    // Common temporary editor, backup, compiled artifacts, or map files
    if (
      normalizedName.endsWith('.tmp') ||
      normalizedName.endsWith('.swp') ||
      normalizedName.endsWith('.bak') ||
      normalizedName.endsWith('~') ||
      normalizedName.startsWith('~$') ||
      normalizedName.endsWith('.min.js') ||
      normalizedName.endsWith('.min.css') ||
      normalizedName.endsWith('.js.map') ||
      normalizedName.endsWith('.css.map') ||
      normalizedName.endsWith('.pyc') ||
      normalizedName.endsWith('.pyo') ||
      normalizedName.endsWith('.pyd')
    ) {
      return true;
    }

    // Check custom patterns
    if (this.matchesCustomPatterns(fileName, relativePath, false)) {
      return true;
    }

    return false;
  }

  public isIgnored(name: string, isDirectory: boolean, relativePath: string = ''): boolean {
    return isDirectory
      ? this.shouldIgnoreDirectory(name, relativePath)
      : this.shouldIgnoreFile(name, relativePath);
  }

  private matchesCustomPatterns(name: string, relativePath: string, _isDir: boolean): boolean {
    if (this.customPatterns.length === 0) {
      return false;
    }

    const normRel = relativePath.split(path.sep).join('/');
    for (const pattern of this.customPatterns) {
      const cleanPattern = pattern.trim();
      if (!cleanPattern || cleanPattern.startsWith('#')) {
        continue;
      }

      if (
        cleanPattern === name ||
        normRel === cleanPattern ||
        normRel.startsWith(cleanPattern + '/')
      ) {
        return true;
      }
    }

    return false;
  }
}
