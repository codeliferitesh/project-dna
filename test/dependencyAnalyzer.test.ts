import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { FileScanner } from '../src/analyzer/fileScanner';
import { DependencyAnalyzer } from '../src/analyzer/dependencies/dependencyAnalyzer';

describe('Project DNA — Code Dependency & Import Graph Analysis Test Suite', () => {
  let tempBaseDir: string;
  let scanner: FileScanner;
  let analyzer: DependencyAnalyzer;

  before(async () => {
    tempBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-dna-dep-'));
    scanner = new FileScanner();
    analyzer = new DependencyAnalyzer();
  });

  after(async () => {
    try {
      await fs.rm(tempBaseDir, { recursive: true, force: true });
    } catch {
      // Cleanup
    }
  });

  test('1. JavaScript file importing another local file', async () => {
    const projDir = path.join(tempBaseDir, 'js-local-import');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'helper.js'),
      'export function help() { return 42; }'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'main.js'),
      "import { help } from './helper.js';\nhelp();"
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.analyzedFilesCount, 2);
    assert.strictEqual(result.stats.totalLocalEdges, 1);
    assert.strictEqual(result.edges[0].sourceFilePath, 'src/main.js');
    assert.strictEqual(result.edges[0].targetFilePath, 'src/helper.js');
  });

  test('2. TypeScript named and default imports', async () => {
    const projDir = path.join(tempBaseDir, 'ts-named-default');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'service.ts'),
      'export const a = 1; export default class Service {}'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'consumer.ts'),
      "import Service, { a } from './service';\nconsole.log(Service, a);"
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.totalLocalEdges, 1);
    assert.strictEqual(result.edges[0].sourceFilePath, 'src/consumer.ts');
    assert.strictEqual(result.edges[0].targetFilePath, 'src/service.ts');
    assert.strictEqual(result.edges[0].isTypeOnly, false);
  });

  test('3. JSX and TSX imports', async () => {
    const projDir = path.join(tempBaseDir, 'jsx-tsx-import');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'Button.tsx'),
      'export const Button = () => <button>Click</button>;'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'App.tsx'),
      "import { Button } from './Button';\nexport default () => <Button />;"
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.totalLocalEdges, 1);
    assert.strictEqual(result.edges[0].targetFilePath, 'src/Button.tsx');
  });

  test('4. Side-effect imports', async () => {
    const projDir = path.join(tempBaseDir, 'side-effect-import');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(path.join(projDir, 'src', 'styles.css'), 'body { margin: 0; }');
    await fs.writeFile(path.join(projDir, 'src', 'index.ts'), "import './styles.css';");

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.totalLocalEdges, 1);
    assert.strictEqual(result.edges[0].targetFilePath, 'src/styles.css');
    assert.strictEqual(result.edges[0].type, 'import');
  });

  test('5. Re-exports and export * from', async () => {
    const projDir = path.join(tempBaseDir, 're-exports');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(path.join(projDir, 'src', 'math.ts'), 'export const pi = 3.14;');
    await fs.writeFile(
      path.join(projDir, 'src', 'index.ts'),
      "export * from './math';\nexport { pi as myPi } from './math';"
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(
      result.stats.totalLocalEdges,
      1,
      'Should deduplicate multiple export relations into one file edge'
    );
    assert.strictEqual(result.edges[0].targetFilePath, 'src/math.ts');
  });

  test('6. Dynamic imports', async () => {
    const projDir = path.join(tempBaseDir, 'dynamic-import');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(path.join(projDir, 'src', 'lazy.ts'), 'export const run = () => true;');
    await fs.writeFile(
      path.join(projDir, 'src', 'main.ts'),
      "async function load() { const m = await import('./lazy'); }"
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.totalLocalEdges, 1);
    assert.strictEqual(result.edges[0].type, 'dynamic_import');
    assert.strictEqual(result.edges[0].targetFilePath, 'src/lazy.ts');
  });

  test('7. CommonJS require', async () => {
    const projDir = path.join(tempBaseDir, 'cjs-require');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(path.join(projDir, 'src', 'config.js'), 'module.exports = { port: 3000 };');
    await fs.writeFile(
      path.join(projDir, 'src', 'server.js'),
      "const config = require('./config');"
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.totalLocalEdges, 1);
    assert.strictEqual(result.edges[0].type, 'require');
    assert.strictEqual(result.edges[0].targetFilePath, 'src/config.js');
  });

  test('8. Type-only imports', async () => {
    const projDir = path.join(tempBaseDir, 'type-only-import');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'types.ts'),
      'export interface User { id: string; }'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'app.ts'),
      "import type { User } from './types';\nconst u: User = { id: '1' };"
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.totalLocalEdges, 1);
    assert.strictEqual(result.edges[0].isTypeOnly, true);
    assert.strictEqual(result.edges[0].type, 'type_import');
  });

  test('9. Imports without file extensions', async () => {
    const projDir = path.join(tempBaseDir, 'no-ext-import');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(path.join(projDir, 'src', 'utils.ts'), 'export const format = () => "";');
    await fs.writeFile(path.join(projDir, 'src', 'view.ts'), "import { format } from './utils';");

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.totalLocalEdges, 1);
    assert.strictEqual(result.edges[0].targetFilePath, 'src/utils.ts');
  });

  test('10. Directory index file resolution', async () => {
    const projDir = path.join(tempBaseDir, 'directory-index');
    await fs.mkdir(path.join(projDir, 'src', 'components'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'components', 'index.ts'),
      'export const Nav = 1;'
    );
    await fs.writeFile(path.join(projDir, 'src', 'app.ts'), "import { Nav } from './components';");

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.totalLocalEdges, 1);
    assert.strictEqual(result.edges[0].targetFilePath, 'src/components/index.ts');
  });

  test('11. TypeScript path aliases (@/* and baseUrl)', async () => {
    const projDir = path.join(tempBaseDir, 'ts-path-alias');
    await fs.mkdir(path.join(projDir, 'src', 'helpers'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@/*': ['./src/*'],
          },
        },
      })
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'helpers', 'math.ts'),
      'export const add = (a: number, b: number) => a + b;'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'index.ts'),
      "import { add } from '@/helpers/math';"
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.totalLocalEdges, 1);
    assert.strictEqual(result.edges[0].targetFilePath, 'src/helpers/math.ts');
    assert.strictEqual(result.edges[0].specifier, '@/helpers/math');
  });

  test('12. External npm package imports', async () => {
    const projDir = path.join(tempBaseDir, 'external-npm');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'app.tsx'),
      "import React from 'react';\nimport { useState } from 'react';\nimport { get } from 'lodash/get';\nimport * as vscode from 'vscode';"
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.totalLocalEdges, 0);
    assert.strictEqual(result.stats.totalExternalPackages, 3); // 'react', 'lodash', 'vscode'

    const pkgNames = result.externalPackages.map((p) => p.name);
    assert.ok(pkgNames.includes('react'));
    assert.ok(pkgNames.includes('lodash'));
    assert.ok(pkgNames.includes('vscode'));
  });

  test('13. Unresolved local imports', async () => {
    const projDir = path.join(tempBaseDir, 'unresolved-import');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'broken.ts'),
      "import { missing } from './doesNotExist';"
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.unresolvedImportsCount, 1);
    assert.strictEqual(result.unresolvedImports[0].specifier, './doesNotExist');
    assert.strictEqual(result.unresolvedImports[0].sourceFilePath, 'src/broken.ts');
  });

  test('14. Duplicate imports to the same target file', async () => {
    const projDir = path.join(tempBaseDir, 'duplicate-imports');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'lib.ts'),
      'export const a = 1; export const b = 2;'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'main.ts'),
      "import { a } from './lib';\nimport { b } from './lib';\nimport type { a as A } from './lib';"
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(
      result.stats.totalLocalEdges,
      1,
      'Multiple import statements must produce exactly 1 edge'
    );
    assert.strictEqual(result.edges[0].isTypeOnly, false, 'Runtime import makes edge runtime');
  });

  test('15. Direct circular dependency (A -> B -> A)', async () => {
    const projDir = path.join(tempBaseDir, 'direct-cycle');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'a.ts'),
      "import { b } from './b';\nexport const a = 1;"
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'b.ts'),
      "import { a } from './a';\nexport const b = 2;"
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.circularDependenciesCount, 1);
    const cycle = result.circularGroups[0].cycle;
    assert.strictEqual(cycle.length, 3);
    assert.strictEqual(cycle[0], cycle[2]);
  });

  test('16. Multi-file circular dependency (A -> B -> C -> A)', async () => {
    const projDir = path.join(tempBaseDir, 'multi-cycle');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(path.join(projDir, 'src', 'a.ts'), "import './b';");
    await fs.writeFile(path.join(projDir, 'src', 'b.ts'), "import './c';");
    await fs.writeFile(path.join(projDir, 'src', 'c.ts'), "import './a';");

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.circularDependenciesCount, 1);
    assert.strictEqual(result.circularGroups[0].length, 3);
    const cycle = result.circularGroups[0].cycle;
    assert.strictEqual(cycle[0], cycle[3]);
  });

  test('17. Python absolute and relative imports', async () => {
    const projDir = path.join(tempBaseDir, 'python-imports');
    await fs.mkdir(path.join(projDir, 'src', 'pkg'), { recursive: true });

    await fs.writeFile(path.join(projDir, 'src', 'pkg', '__init__.py'), '');
    await fs.writeFile(path.join(projDir, 'src', 'pkg', 'helper.py'), 'def help(): pass');
    await fs.writeFile(
      path.join(projDir, 'src', 'pkg', 'main.py'),
      'import os\nimport sys\nfrom .helper import help\nfrom fastapi import FastAPI'
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.totalLocalEdges, 1);
    assert.strictEqual(result.edges[0].targetFilePath, 'src/pkg/helper.py');

    const pkgNames = result.externalPackages.map((p) => p.name);
    assert.ok(pkgNames.includes('os'));
    assert.ok(pkgNames.includes('sys'));
    assert.ok(pkgNames.includes('fastapi'));
  });

  test('18. Malformed source files handled safely without crash', async () => {
    const projDir = path.join(tempBaseDir, 'malformed-source');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(path.join(projDir, 'src', 'valid.ts'), 'export const x = 1;');
    await fs.writeFile(
      path.join(projDir, 'src', 'broken.ts'),
      'import { x } from "./valid";\n const invalid syntax {{{ @#$'
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.analyzedFilesCount, 2);
    assert.strictEqual(result.stats.totalLocalEdges, 1);
    assert.strictEqual(result.edges[0].targetFilePath, 'src/valid.ts');
  });

  test('19. Ignored directories (node_modules, .git, dist) are excluded', async () => {
    const projDir = path.join(tempBaseDir, 'ignored-dirs');
    await fs.mkdir(path.join(projDir, 'node_modules', 'fake-lib'), { recursive: true });
    await fs.mkdir(path.join(projDir, 'dist'), { recursive: true });
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'node_modules', 'fake-lib', 'index.js'),
      'export const fake = 1;'
    );
    await fs.writeFile(path.join(projDir, 'dist', 'bundle.js'), 'console.log("built");');
    await fs.writeFile(path.join(projDir, 'src', 'app.ts'), 'export const app = true;');

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.analyzedFilesCount, 1);
    assert.strictEqual(result.nodes['src/app.ts'] !== undefined, true);
    assert.strictEqual(result.nodes['node_modules/fake-lib/index.js'], undefined);
    assert.strictEqual(result.nodes['dist/bundle.js'], undefined);
  });

  test('20. Empty project and projects without supported source files', async () => {
    const projDir = path.join(tempBaseDir, 'empty-proj');
    await fs.mkdir(path.join(projDir, 'docs'), { recursive: true });
    await fs.writeFile(path.join(projDir, 'docs', 'README.md'), '# Documentation');

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.analyzedFilesCount, 0);
    assert.strictEqual(result.stats.totalLocalEdges, 0);
    assert.strictEqual(result.stats.totalExternalPackages, 0);
    assert.strictEqual(result.stats.circularDependenciesCount, 0);
  });

  test('21. Large files skipped with status safeguard', async () => {
    const projDir = path.join(tempBaseDir, 'large-file');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    // Create a large file (> 1.5MB)
    const largeContent = 'export const data = "' + 'A'.repeat(1.6 * 1024 * 1024) + '";';
    await fs.writeFile(path.join(projDir, 'src', 'huge.ts'), largeContent);

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.skippedFilesCount, 1);
    assert.strictEqual(result.nodes['src/huge.ts'].status, 'skipped');
  });

  test('22. Dependency statistics consistency', async () => {
    const projDir = path.join(tempBaseDir, 'stats-consistency');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(path.join(projDir, 'src', 'root.ts'), "import './mid';\nimport 'react';");
    await fs.writeFile(path.join(projDir, 'src', 'mid.ts'), "import './leaf';\nimport 'react';");
    await fs.writeFile(path.join(projDir, 'src', 'leaf.ts'), 'export const leaf = 1;');
    await fs.writeFile(path.join(projDir, 'src', 'isolated.ts'), 'export const isolated = 1;');

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.analyzedFilesCount, 4);
    assert.strictEqual(result.stats.totalLocalEdges, 2);
    assert.strictEqual(result.stats.filesWithDependenciesCount, 2); // root, mid
    assert.strictEqual(result.stats.filesWithNoIncomingCount, 2); // root, isolated
    assert.strictEqual(result.stats.filesWithNoOutgoingCount, 2); // leaf, isolated
    assert.strictEqual(result.stats.totalExternalPackages, 1); // react
    assert.strictEqual(result.stats.circularDependenciesCount, 0);
  });

  test('23. Next.js style tsconfig with trailing commas, comments & nested @/* imports', async () => {
    const projDir = path.join(tempBaseDir, 'nextjs-style-alias');
    await fs.mkdir(path.join(projDir, 'src', 'context'), { recursive: true });
    await fs.mkdir(path.join(projDir, 'src', 'components'), { recursive: true });
    await fs.mkdir(path.join(projDir, 'src', 'services'), { recursive: true });
    await fs.mkdir(path.join(projDir, 'src', 'types'), { recursive: true });
    await fs.mkdir(path.join(projDir, 'src', 'app'), { recursive: true });

    // Next.js tsconfig with comments and trailing commas
    const tsconfigRaw = `// TypeScript Next.js Configuration
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext", ],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next",
      },
    ],
    "paths": {
      "@/*": ["./src/*"],
    },
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ],
  "exclude": ["node_modules", ],
}
`;
    await fs.writeFile(path.join(projDir, 'tsconfig.json'), tsconfigRaw);

    await fs.writeFile(
      path.join(projDir, 'src', 'context', 'AuthContext.tsx'),
      'export const AuthContext = () => null;'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'components', 'useConfetti.ts'),
      'export const useConfetti = () => true;'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'services', 'birthday.ts'),
      'export const fetchBirthdays = () => [];'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'types', 'index.ts'),
      'export interface User { id: string; }'
    );

    // Page importing all 4 aliases
    await fs.writeFile(
      path.join(projDir, 'src', 'app', 'page.tsx'),
      `import { AuthContext } from '@/context/AuthContext';
import { useConfetti } from '@/components/useConfetti';
import { fetchBirthdays } from '@/services/birthday';
import type { User } from '@/types';
`
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(
      result.stats.unresolvedImportsCount,
      0,
      'All 4 aliases must resolve cleanly'
    );
    assert.strictEqual(result.stats.totalLocalEdges, 4);

    const targetPaths = result.edges.map((e) => e.targetFilePath);
    assert.ok(targetPaths.includes('src/context/AuthContext.tsx'));
    assert.ok(targetPaths.includes('src/components/useConfetti.ts'));
    assert.ok(targetPaths.includes('src/services/birthday.ts'));
    assert.ok(targetPaths.includes('src/types/index.ts'));
  });

  test('24. Tsconfig with extends chain', async () => {
    const projDir = path.join(tempBaseDir, 'tsconfig-extends');
    await fs.mkdir(path.join(projDir, 'src', 'core'), { recursive: true });

    // Base config with path alias
    await fs.writeFile(
      path.join(projDir, 'tsconfig.base.json'),
      JSON.stringify({
        compilerOptions: {
          paths: {
            '~/*': ['./src/*'],
          },
        },
      })
    );

    // Child config extending base
    await fs.writeFile(
      path.join(projDir, 'tsconfig.json'),
      JSON.stringify({
        extends: './tsconfig.base.json',
        compilerOptions: {
          strict: true,
        },
      })
    );

    await fs.writeFile(path.join(projDir, 'src', 'core', 'config.ts'), 'export const config = {};');
    await fs.writeFile(
      path.join(projDir, 'src', 'main.ts'),
      "import { config } from '~/core/config';"
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.totalLocalEdges, 1);
    assert.strictEqual(result.edges[0].targetFilePath, 'src/core/config.ts');
  });

  test('25. Multiple candidate paths per alias', async () => {
    const projDir = path.join(tempBaseDir, 'multi-path-candidates');
    await fs.mkdir(path.join(projDir, 'lib'), { recursive: true });
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          paths: {
            '@/*': ['./src/*', './lib/*'],
          },
        },
      })
    );

    await fs.writeFile(path.join(projDir, 'lib', 'util.ts'), 'export const util = true;');
    await fs.writeFile(path.join(projDir, 'src', 'app.ts'), "import { util } from '@/util';");

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.totalLocalEdges, 1);
    assert.strictEqual(result.edges[0].targetFilePath, 'lib/util.ts');
  });

  test('26. Non-wildcard exact alias', async () => {
    const projDir = path.join(tempBaseDir, 'exact-alias');
    await fs.mkdir(path.join(projDir, 'src', 'types'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          paths: {
            types: ['./src/types/index.ts'],
          },
        },
      })
    );

    await fs.writeFile(path.join(projDir, 'src', 'types', 'index.ts'), 'export type ID = string;');
    await fs.writeFile(path.join(projDir, 'src', 'app.ts'), "import type { ID } from 'types';");

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.totalLocalEdges, 1);
    assert.strictEqual(result.edges[0].targetFilePath, 'src/types/index.ts');
  });

  test('27. Missing alias target reported accurately as unresolved without fabricating edge', async () => {
    const projDir = path.join(tempBaseDir, 'missing-alias-target');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          paths: {
            '@/*': ['./src/*'],
          },
        },
      })
    );

    await fs.writeFile(
      path.join(projDir, 'src', 'app.ts'),
      "import { ghost } from '@/does/not/exist';"
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const result = await analyzer.analyze(projDir, scanRes.rootNode);

    assert.strictEqual(result.stats.totalLocalEdges, 0);
    assert.strictEqual(result.stats.unresolvedImportsCount, 1);
    assert.strictEqual(result.unresolvedImports[0].specifier, '@/does/not/exist');
  });
});
