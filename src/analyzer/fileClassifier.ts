import * as path from 'path';
import { FileCategory } from '../models';

export class FileClassifier {
  private static readonly SOURCE_EXTENSIONS = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
    '.py',
    '.pyw',
    '.java',
    '.go',
    '.rs',
    '.c',
    '.cpp',
    '.cc',
    '.cxx',
    '.h',
    '.hpp',
    '.hxx',
    '.cs',
    '.php',
    '.rb',
    '.swift',
    '.kt',
    '.kts',
    '.scala',
    '.dart',
    '.lua',
    '.sh',
    '.bash',
    '.zsh',
    '.ps1',
    '.sql',
    '.html',
    '.htm',
    '.vue',
    '.svelte',
    '.astro',
  ]);

  private static readonly STYLE_EXTENSIONS = new Set([
    '.css',
    '.scss',
    '.sass',
    '.less',
    '.styl',
    '.pcss',
    '.postcss',
  ]);

  private static readonly ASSET_EXTENSIONS = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.svg',
    '.webp',
    '.gif',
    '.ico',
    '.bmp',
    '.tiff',
    '.mp4',
    '.webm',
    '.mov',
    '.mp3',
    '.wav',
    '.ogg',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.otf',
    '.pdf',
  ]);

  private static readonly DATA_EXTENSIONS = new Set([
    '.json',
    '.json5',
    '.csv',
    '.tsv',
    '.sqlite',
    '.sqlite3',
    '.db',
    '.graphql',
    '.gql',
    '.proto',
    '.parquet',
  ]);

  private static readonly CONFIG_EXTENSIONS = new Set([
    '.toml',
    '.yaml',
    '.yml',
    '.ini',
    '.cfg',
    '.conf',
    '.properties',
    '.env',
  ]);

  private static readonly DOC_EXTENSIONS = new Set([
    '.md',
    '.mdx',
    '.markdown',
    '.rst',
    '.adoc',
    '.asciidoc',
  ]);

  private static readonly LOCKFILES = new Set([
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'cargo.lock',
    'poetry.lock',
    'gemfile.lock',
    'composer.lock',
    'go.sum',
    'bun.lockb',
    'mix.lock',
  ]);

  private static readonly CONFIG_FILENAMES = new Set([
    'package.json',
    'tsconfig.json',
    'tsconfig.node.json',
    'tsconfig.app.json',
    'vite.config.ts',
    'vite.config.js',
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
    'eslint.config.js',
    'eslint.config.mjs',
    '.eslintrc.json',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.yml',
    '.eslintrc.yaml',
    '.prettierrc',
    '.prettierrc.json',
    '.prettierrc.js',
    '.prettierrc.cjs',
    'prettier.config.js',
    'webpack.config.js',
    'webpack.config.ts',
    'rollup.config.js',
    'babel.config.js',
    'babel.config.json',
    'jest.config.js',
    'jest.config.ts',
    'vitest.config.ts',
    'cargo.toml',
    'pyproject.toml',
    'setup.py',
    'setup.cfg',
    'requirements.txt',
    'gemfile',
    'go.mod',
    'pom.xml',
    'build.gradle',
    'dockerfile',
    'docker-compose.yml',
    'docker-compose.yaml',
    '.env.example',
    '.env.template',
    '.editorconfig',
    '.gitignore',
    '.gitattributes',
    'makefile',
    'cmakelists.txt',
    'tailwind.config.js',
    'tailwind.config.ts',
    'postcss.config.js',
    'postcss.config.cjs',
    'components.json',
  ]);

  public static classify(fileName: string, relativePath: string = ''): FileCategory {
    const lowerName = fileName.toLowerCase();
    const ext = path.extname(lowerName);
    const normalizedRelPath = relativePath.split(path.sep).join('/').toLowerCase();

    // 1. Lockfiles
    if (FileClassifier.LOCKFILES.has(lowerName)) {
      return 'lockfile';
    }

    // 2. Known Config Filenames & Patterns
    if (
      FileClassifier.CONFIG_FILENAMES.has(lowerName) ||
      lowerName.startsWith('tsconfig.') ||
      lowerName.startsWith('vite.config.') ||
      lowerName.startsWith('webpack.config.') ||
      lowerName.startsWith('next.config.') ||
      lowerName.startsWith('docker-compose') ||
      lowerName.startsWith('.env.') ||
      lowerName.startsWith('.eslintrc') ||
      lowerName.startsWith('.prettierrc')
    ) {
      return 'config';
    }

    // 3. Tests
    if (
      lowerName.includes('.test.') ||
      lowerName.includes('.spec.') ||
      lowerName.endsWith('_test.py') ||
      lowerName.startsWith('test_') ||
      lowerName.endsWith('_test.go') ||
      lowerName.endsWith('-test.js') ||
      lowerName.endsWith('-spec.js') ||
      normalizedRelPath.includes('/tests/') ||
      normalizedRelPath.includes('/test/') ||
      normalizedRelPath.includes('/__tests__/') ||
      normalizedRelPath.includes('/spec/') ||
      normalizedRelPath.startsWith('test/') ||
      normalizedRelPath.startsWith('tests/') ||
      normalizedRelPath.startsWith('spec/')
    ) {
      return 'test';
    }

    // 4. Documentation
    if (
      FileClassifier.DOC_EXTENSIONS.has(ext) ||
      lowerName.startsWith('readme') ||
      lowerName.startsWith('changelog') ||
      lowerName.startsWith('license') ||
      lowerName.startsWith('contributing') ||
      lowerName.startsWith('code_of_conduct')
    ) {
      return 'documentation';
    }

    // 5. Styles
    if (FileClassifier.STYLE_EXTENSIONS.has(ext)) {
      return 'style';
    }

    // 6. Assets
    if (FileClassifier.ASSET_EXTENSIONS.has(ext)) {
      return 'asset';
    }

    // 7. General Configuration extensions
    if (FileClassifier.CONFIG_EXTENSIONS.has(ext)) {
      return 'config';
    }

    // 8. Sources
    if (FileClassifier.SOURCE_EXTENSIONS.has(ext)) {
      return 'source';
    }

    // 9. Data
    if (FileClassifier.DATA_EXTENSIONS.has(ext)) {
      return 'data';
    }

    return 'unknown';
  }
}
