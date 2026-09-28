import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { FileScanner } from '../src/analyzer/fileScanner';
import { FileClassifier } from '../src/analyzer/fileClassifier';
import { IgnoreManager } from '../src/analyzer/ignoreManager';

describe('Project DNA — Scanner & Analyzer Test Suite', () => {
  let tempTestDir: string;

  before(async () => {
    tempTestDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-dna-test-'));
  });

  after(async () => {
    try {
      await fs.rm(tempTestDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  describe('FileClassifier', () => {
    test('Classifies source code files accurately', () => {
      assert.strictEqual(FileClassifier.classify('main.ts', 'src/main.ts'), 'source');
      assert.strictEqual(FileClassifier.classify('App.tsx', 'src/App.tsx'), 'source');
      assert.strictEqual(FileClassifier.classify('server.py', 'server.py'), 'source');
      assert.strictEqual(FileClassifier.classify('engine.rs', 'src/engine.rs'), 'source');
      assert.strictEqual(FileClassifier.classify('main.go', 'main.go'), 'source');
    });

    test('Classifies test files accurately', () => {
      assert.strictEqual(
        FileClassifier.classify('scanner.test.ts', 'test/scanner.test.ts'),
        'test'
      );
      assert.strictEqual(FileClassifier.classify('app.spec.js', 'src/app.spec.js'), 'test');
      assert.strictEqual(FileClassifier.classify('test_api.py', 'tests/test_api.py'), 'test');
      assert.strictEqual(FileClassifier.classify('helper.ts', 'src/__tests__/helper.ts'), 'test');
    });

    test('Classifies configuration files accurately', () => {
      assert.strictEqual(FileClassifier.classify('package.json', 'package.json'), 'config');
      assert.strictEqual(FileClassifier.classify('tsconfig.json', 'tsconfig.json'), 'config');
      assert.strictEqual(FileClassifier.classify('vite.config.ts', 'vite.config.ts'), 'config');
      assert.strictEqual(FileClassifier.classify('.eslintrc.json', '.eslintrc.json'), 'config');
      assert.strictEqual(FileClassifier.classify('Cargo.toml', 'Cargo.toml'), 'config');
    });

    test('Classifies documentation files accurately', () => {
      assert.strictEqual(FileClassifier.classify('README.md', 'README.md'), 'documentation');
      assert.strictEqual(
        FileClassifier.classify('CHANGELOG.md', 'docs/CHANGELOG.md'),
        'documentation'
      );
      assert.strictEqual(FileClassifier.classify('LICENSE', 'LICENSE'), 'documentation');
    });

    test('Classifies assets and media accurately', () => {
      assert.strictEqual(FileClassifier.classify('logo.svg', 'public/logo.svg'), 'asset');
      assert.strictEqual(FileClassifier.classify('banner.png', 'assets/banner.png'), 'asset');
      assert.strictEqual(FileClassifier.classify('font.woff2', 'fonts/font.woff2'), 'asset');
    });

    test('Classifies styles accurately', () => {
      assert.strictEqual(FileClassifier.classify('index.css', 'src/index.css'), 'style');
      assert.strictEqual(FileClassifier.classify('theme.scss', 'styles/theme.scss'), 'style');
    });

    test('Classifies lockfiles accurately', () => {
      assert.strictEqual(
        FileClassifier.classify('package-lock.json', 'package-lock.json'),
        'lockfile'
      );
      assert.strictEqual(FileClassifier.classify('yarn.lock', 'yarn.lock'), 'lockfile');
    });
  });

  describe('IgnoreManager', () => {
    test('Ignores standard dependency and build directories', () => {
      const manager = new IgnoreManager();
      assert.strictEqual(manager.shouldIgnoreDirectory('node_modules', 'node_modules'), true);
      assert.strictEqual(manager.shouldIgnoreDirectory('.git', '.git'), true);
      assert.strictEqual(manager.shouldIgnoreDirectory('dist', 'dist'), true);
      assert.strictEqual(manager.shouldIgnoreDirectory('.next', '.next'), true);
      assert.strictEqual(manager.shouldIgnoreDirectory('coverage', 'coverage'), true);
      assert.strictEqual(manager.shouldIgnoreDirectory('.venv', '.venv'), true);
    });

    test('Does not ignore regular source directories', () => {
      const manager = new IgnoreManager();
      assert.strictEqual(manager.shouldIgnoreDirectory('src', 'src'), false);
      assert.strictEqual(manager.shouldIgnoreDirectory('components', 'src/components'), false);
      assert.strictEqual(manager.shouldIgnoreDirectory('public', 'public'), false);
    });

    test('Ignores OS & editor junk files', () => {
      const manager = new IgnoreManager();
      assert.strictEqual(manager.shouldIgnoreFile('.DS_Store', '.DS_Store'), true);
      assert.strictEqual(manager.shouldIgnoreFile('Thumbs.db', 'Thumbs.db'), true);
      assert.strictEqual(manager.shouldIgnoreFile('file.tmp', 'temp/file.tmp'), true);
    });
  });

  describe('FileScanner Integration', () => {
    test('Scans an empty project', async () => {
      const emptyDir = path.join(tempTestDir, 'empty-project');
      await fs.mkdir(emptyDir, { recursive: true });

      const scanner = new FileScanner();
      const result = await scanner.scan({ workspaceRoot: emptyDir });

      assert.strictEqual(result.stats.totalFiles, 0);
      assert.strictEqual(result.stats.totalDirectories, 0);
      assert.strictEqual(result.stats.totalSizeBytes, 0);
      assert.strictEqual(result.rootNode.children?.length, 0);
    });

    test('Scans a normal project with nested hierarchy and categories', async () => {
      const normalDir = path.join(tempTestDir, 'normal-project');
      await fs.mkdir(path.join(normalDir, 'src', 'components'), { recursive: true });
      await fs.mkdir(path.join(normalDir, 'public', 'images'), { recursive: true });
      await fs.mkdir(path.join(normalDir, 'tests'), { recursive: true });
      await fs.mkdir(path.join(normalDir, 'node_modules', 'lodash'), { recursive: true }); // should be ignored

      // Create test files
      await fs.writeFile(
        path.join(normalDir, 'package.json'),
        JSON.stringify({ name: 'test-app' })
      );
      await fs.writeFile(path.join(normalDir, 'README.md'), '# Test Project');
      await fs.writeFile(path.join(normalDir, 'src', 'index.ts'), 'export const hello = "world";');
      await fs.writeFile(
        path.join(normalDir, 'src', 'components', 'Button.tsx'),
        'export const Button = () => null;'
      );
      await fs.writeFile(path.join(normalDir, 'src', 'index.css'), 'body { margin: 0; }');
      await fs.writeFile(path.join(normalDir, 'public', 'images', 'logo.svg'), '<svg></svg>');
      await fs.writeFile(path.join(normalDir, 'tests', 'index.test.ts'), 'test("ok", () => {});');
      await fs.writeFile(
        path.join(normalDir, 'node_modules', 'lodash', 'index.js'),
        'module.exports = {};'
      ); // should be ignored

      const scanner = new FileScanner();
      const result = await scanner.scan({ workspaceRoot: normalDir });

      assert.strictEqual(result.stats.totalFiles, 7); // 7 discovered files, node_modules omitted
      assert.strictEqual(result.stats.totalDirectories, 5); // src, src/components, public, public/images, tests
      assert.strictEqual(result.stats.sourceFiles, 2); // index.ts, Button.tsx
      assert.strictEqual(result.stats.testFiles, 1); // index.test.ts
      assert.strictEqual(result.stats.configFiles, 1); // package.json
      assert.strictEqual(result.stats.docFiles, 1); // README.md
      assert.strictEqual(result.stats.styleFiles, 1); // index.css
      assert.strictEqual(result.stats.assetFiles, 1); // logo.svg
      assert.strictEqual(result.metadata.ignoredDirectoriesCount >= 1, true); // node_modules ignored
      assert.strictEqual((result.stats.totalSizeBytes ?? 0) > 0, true);
      assert.strictEqual(result.rootNode.name, 'normal-project');
    });

    test('Protects against maximum depth overflow', async () => {
      const deepDir = path.join(tempTestDir, 'deep-project');
      let current = deepDir;
      for (let i = 0; i < 10; i++) {
        current = path.join(current, `level-${i}`);
      }
      await fs.mkdir(current, { recursive: true });
      await fs.writeFile(path.join(current, 'deep-file.ts'), 'const x = 1;');

      const scanner = new FileScanner();
      const result = await scanner.scan({ workspaceRoot: deepDir, maxDepth: 5 });

      // Depth capped at 5 levels
      assert.strictEqual(result.metadata.hasWarnings, true);
    });
  });
});
