import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { FileScanner } from '../src/analyzer/fileScanner';
import { DependencyAnalyzer } from '../src/analyzer/dependencies/dependencyAnalyzer';
import { ArchitectureEngine } from '../src/analyzer/architecture/architectureEngine';

describe('Project DNA — Architecture & Relationship Engine Test Suite', () => {
  let tempBaseDir: string;
  let scanner: FileScanner;
  let depAnalyzer: DependencyAnalyzer;
  let archEngine: ArchitectureEngine;

  before(async () => {
    tempBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-dna-arch-'));
    scanner = new FileScanner();
    depAnalyzer = new DependencyAnalyzer();
    archEngine = new ArchitectureEngine();
  });

  after(async () => {
    try {
      await fs.rm(tempBaseDir, { recursive: true, force: true });
    } catch {
      // Cleanup
    }
  });

  test('1. Page classification (Next.js App Router & Pages Router)', async () => {
    const projDir = path.join(tempBaseDir, 'arch-page');
    await fs.mkdir(path.join(projDir, 'src', 'app', 'dashboard'), { recursive: true });
    await fs.mkdir(path.join(projDir, 'pages'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'app', 'dashboard', 'page.tsx'),
      'export default function DashboardPage() { return <div>Dashboard</div>; }'
    );
    await fs.writeFile(
      path.join(projDir, 'pages', 'about.tsx'),
      'export default function About() { return <div>About</div>; }'
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const depRes = await depAnalyzer.analyze(projDir, scanRes.rootNode);
    const archRes = await archEngine.analyze(projDir, scanRes.rootNode, depRes);

    const page1 = archRes.modules['src/app/dashboard/page.tsx'];
    assert.ok(page1);
    assert.strictEqual(page1.primaryRole, 'page');
    assert.strictEqual(page1.layer, 'routing');
    assert.strictEqual(page1.confidenceLevel, 'high');
    assert.strictEqual(page1.isEntryPoint, true);

    const page2 = archRes.modules['pages/about.tsx'];
    assert.ok(page2);
    assert.strictEqual(page2.primaryRole, 'page');
    assert.strictEqual(page2.isEntryPoint, true);
  });

  test('2. Layout classification', async () => {
    const projDir = path.join(tempBaseDir, 'arch-layout');
    await fs.mkdir(path.join(projDir, 'src', 'app'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'app', 'layout.tsx'),
      'export default function RootLayout({ children }: { children: React.ReactNode }) { return <html><body>{children}</body></html>; }'
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const depRes = await depAnalyzer.analyze(projDir, scanRes.rootNode);
    const archRes = await archEngine.analyze(projDir, scanRes.rootNode, depRes);

    const layout = archRes.modules['src/app/layout.tsx'];
    assert.ok(layout);
    assert.strictEqual(layout.primaryRole, 'layout');
    assert.strictEqual(layout.layer, 'presentation');
    assert.strictEqual(layout.confidenceLevel, 'high');
  });

  test('3. Component & UI Component classification', async () => {
    const projDir = path.join(tempBaseDir, 'arch-components');
    await fs.mkdir(path.join(projDir, 'src', 'components', 'ui'), { recursive: true });
    await fs.mkdir(path.join(projDir, 'src', 'components'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'components', 'ui', 'Button.tsx'),
      'export const Button = () => <button>Click</button>;'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'components', 'Header.tsx'),
      'export const Header = () => <header>Logo</header>;'
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const depRes = await depAnalyzer.analyze(projDir, scanRes.rootNode);
    const archRes = await archEngine.analyze(projDir, scanRes.rootNode, depRes);

    const btn = archRes.modules['src/components/ui/Button.tsx'];
    assert.strictEqual(btn?.primaryRole, 'ui_component');
    assert.strictEqual(btn?.layer, 'presentation');

    const header = archRes.modules['src/components/Header.tsx'];
    assert.strictEqual(header?.primaryRole, 'component');
    assert.strictEqual(header?.layer, 'presentation');
  });

  test('4. Custom Hook classification', async () => {
    const projDir = path.join(tempBaseDir, 'arch-hook');
    await fs.mkdir(path.join(projDir, 'src', 'hooks'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'hooks', 'useAuth.ts'),
      'import { useState } from "react"; export const useAuth = () => { const [u] = useState(null); return u; };'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'useConfetti.ts'),
      'export const useConfetti = () => () => {};'
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const depRes = await depAnalyzer.analyze(projDir, scanRes.rootNode);
    const archRes = await archEngine.analyze(projDir, scanRes.rootNode, depRes);

    const hook1 = archRes.modules['src/hooks/useAuth.ts'];
    assert.strictEqual(hook1?.primaryRole, 'hook');
    assert.strictEqual(hook1?.layer, 'presentation');

    const hook2 = archRes.modules['src/useConfetti.ts'];
    assert.strictEqual(hook2?.primaryRole, 'hook');
  });

  test('5. Context / Provider classification', async () => {
    const projDir = path.join(tempBaseDir, 'arch-context');
    await fs.mkdir(path.join(projDir, 'src', 'context'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'context', 'AuthContext.tsx'),
      'import React from "react"; const C = React.createContext(null); export const AuthProvider = C.Provider;'
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const depRes = await depAnalyzer.analyze(projDir, scanRes.rootNode);
    const archRes = await archEngine.analyze(projDir, scanRes.rootNode, depRes);

    const ctx = archRes.modules['src/context/AuthContext.tsx'];
    assert.strictEqual(ctx?.primaryRole, 'context');
    assert.strictEqual(ctx?.layer, 'application');
  });

  test('6. Service classification', async () => {
    const projDir = path.join(tempBaseDir, 'arch-service');
    await fs.mkdir(path.join(projDir, 'src', 'services'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'services', 'birthday.ts'),
      'export const fetchBirthdays = async () => [];'
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const depRes = await depAnalyzer.analyze(projDir, scanRes.rootNode);
    const archRes = await archEngine.analyze(projDir, scanRes.rootNode, depRes);

    const srv = archRes.modules['src/services/birthday.ts'];
    assert.strictEqual(srv?.primaryRole, 'service');
    assert.strictEqual(srv?.layer, 'services');
  });

  test('7. API Client classification', async () => {
    const projDir = path.join(tempBaseDir, 'arch-api');
    await fs.mkdir(path.join(projDir, 'src', 'api'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'api', 'client.ts'),
      'export const apiClient = { get: () => null };'
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const depRes = await depAnalyzer.analyze(projDir, scanRes.rootNode);
    const archRes = await archEngine.analyze(projDir, scanRes.rootNode, depRes);

    const api = archRes.modules['src/api/client.ts'];
    assert.strictEqual(api?.primaryRole, 'api_client');
    assert.strictEqual(api?.layer, 'services');
  });

  test('8. Utility classification', async () => {
    const projDir = path.join(tempBaseDir, 'arch-utility');
    await fs.mkdir(path.join(projDir, 'src', 'utils'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'utils', 'date.ts'),
      'export const formatDate = (d: Date) => d.toISOString();'
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const depRes = await depAnalyzer.analyze(projDir, scanRes.rootNode);
    const archRes = await archEngine.analyze(projDir, scanRes.rootNode, depRes);

    const util = archRes.modules['src/utils/date.ts'];
    assert.strictEqual(util?.primaryRole, 'utility');
    assert.strictEqual(util?.layer, 'shared_utility');
  });

  test('9. Type definition and schema classification', async () => {
    const projDir = path.join(tempBaseDir, 'arch-types-schemas');
    await fs.mkdir(path.join(projDir, 'src', 'types'), { recursive: true });
    await fs.mkdir(path.join(projDir, 'src', 'schemas'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'types', 'user.d.ts'),
      'export interface User { id: string; name: string; }'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'schemas', 'userSchema.ts'),
      'export const userSchema = {};'
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const depRes = await depAnalyzer.analyze(projDir, scanRes.rootNode);
    const archRes = await archEngine.analyze(projDir, scanRes.rootNode, depRes);

    const typeDef = archRes.modules['src/types/user.d.ts'];
    assert.strictEqual(typeDef?.primaryRole, 'type_definition');

    const schema = archRes.modules['src/schemas/userSchema.ts'];
    assert.strictEqual(schema?.primaryRole, 'schema');
    assert.strictEqual(schema?.layer, 'domain');
  });

  test('10. Test classification', async () => {
    const projDir = path.join(tempBaseDir, 'arch-test');
    await fs.mkdir(path.join(projDir, 'src', '__tests__'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', '__tests__', 'auth.test.ts'),
      'test("login", () => {});'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'component.spec.tsx'),
      'test("render", () => {});'
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const depRes = await depAnalyzer.analyze(projDir, scanRes.rootNode);
    const archRes = await archEngine.analyze(projDir, scanRes.rootNode, depRes);

    assert.strictEqual(archRes.modules['src/__tests__/auth.test.ts']?.primaryRole, 'test');
    assert.strictEqual(archRes.modules['src/component.spec.tsx']?.primaryRole, 'test');
    assert.strictEqual(archRes.modules['src/__tests__/auth.test.ts']?.layer, 'testing');
  });

  test('11. Entry-point detection', async () => {
    const projDir = path.join(tempBaseDir, 'arch-entrypoints');
    await fs.mkdir(path.join(projDir, 'src', 'app'), { recursive: true });

    await fs.writeFile(path.join(projDir, 'src', 'main.tsx'), 'console.log("start");');
    await fs.writeFile(path.join(projDir, 'server.ts'), 'console.log("server");');
    await fs.writeFile(path.join(projDir, 'src', 'app', 'page.tsx'), 'export default () => null;');

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const depRes = await depAnalyzer.analyze(projDir, scanRes.rootNode);
    const archRes = await archEngine.analyze(projDir, scanRes.rootNode, depRes);

    const entryPaths = archRes.entryPoints.map((e) => e.path);
    assert.ok(entryPaths.includes('src/main.tsx'));
    assert.ok(entryPaths.includes('server.ts'));
    assert.ok(entryPaths.includes('src/app/page.tsx'));
    assert.strictEqual(archRes.summary.entryPointsCount, 3);
  });

  test('12. Architectural layer groupings', async () => {
    const projDir = path.join(tempBaseDir, 'arch-layers');
    await fs.mkdir(path.join(projDir, 'src', 'components'), { recursive: true });
    await fs.mkdir(path.join(projDir, 'src', 'services'), { recursive: true });
    await fs.mkdir(path.join(projDir, 'src', 'utils'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'components', 'Card.tsx'),
      'export const Card = () => null;'
    );
    await fs.writeFile(path.join(projDir, 'src', 'services', 'api.ts'), 'export const api = {};');
    await fs.writeFile(
      path.join(projDir, 'src', 'utils', 'calc.ts'),
      'export const calc = () => 1;'
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const depRes = await depAnalyzer.analyze(projDir, scanRes.rootNode);
    const archRes = await archEngine.analyze(projDir, scanRes.rootNode, depRes);

    const layerNames = archRes.layers.map((l) => l.layer);
    assert.ok(layerNames.includes('presentation'));
    assert.ok(layerNames.includes('services'));
    assert.ok(layerNames.includes('shared_utility'));
  });

  test('13. High fan-in and fan-out calculation', async () => {
    const projDir = path.join(tempBaseDir, 'arch-fan');
    await fs.mkdir(path.join(projDir, 'src', 'components'), { recursive: true });
    await fs.mkdir(path.join(projDir, 'src', 'utils'), { recursive: true });

    // util is imported by compA, compB, compC -> fanIn = 3
    await fs.writeFile(path.join(projDir, 'src', 'utils', 'helper.ts'), 'export const h = 1;');
    await fs.writeFile(
      path.join(projDir, 'src', 'components', 'A.tsx'),
      'import { h } from "../utils/helper";'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'components', 'B.tsx'),
      'import { h } from "../utils/helper";'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'components', 'C.tsx'),
      'import { h } from "../utils/helper";\nimport "./A";\nimport "./B";'
    ); // C imports helper, A, B -> fanOut = 3

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const depRes = await depAnalyzer.analyze(projDir, scanRes.rootNode);
    const archRes = await archEngine.analyze(projDir, scanRes.rootNode, depRes);

    const helperMod = archRes.modules['src/utils/helper.ts'];
    assert.strictEqual(helperMod?.fanIn, 3);

    const cMod = archRes.modules['src/components/C.tsx'];
    assert.strictEqual(cMod?.fanOut, 3);

    assert.ok(
      archRes.summary.highFanInModules.some(
        (m) => m.path === 'src/utils/helper.ts' && m.fanIn === 3
      )
    );
    assert.ok(
      archRes.summary.highFanOutModules.some(
        (m) => m.path === 'src/components/C.tsx' && m.fanOut === 3
      )
    );
  });

  test('14. Unknown/unclassified modules handled gracefully', async () => {
    const projDir = path.join(tempBaseDir, 'arch-unknown');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(path.join(projDir, 'src', 'random_data.dat'), '12345');
    await fs.writeFile(path.join(projDir, 'src', 'mystery.txt'), 'hello');

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const depRes = await depAnalyzer.analyze(projDir, scanRes.rootNode);
    const archRes = await archEngine.analyze(projDir, scanRes.rootNode, depRes);

    const mystery = archRes.modules['src/mystery.txt'];
    assert.ok(mystery);
    assert.strictEqual(mystery.primaryRole, 'unknown');
    assert.strictEqual(mystery.confidenceLevel, 'low');
  });

  test('15. Relationship classification (renders, uses, calls, tests)', async () => {
    const projDir = path.join(tempBaseDir, 'arch-relationships');
    await fs.mkdir(path.join(projDir, 'src', 'components'), { recursive: true });
    await fs.mkdir(path.join(projDir, 'src', 'hooks'), { recursive: true });
    await fs.mkdir(path.join(projDir, 'src', 'services'), { recursive: true });
    await fs.mkdir(path.join(projDir, 'src', '__tests__'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'src', 'hooks', 'useAuth.ts'),
      'export const useAuth = () => null;'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'services', 'api.ts'),
      'export const fetchUser = () => null;'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'components', 'Button.tsx'),
      'export const Button = () => null;'
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'components', 'Dashboard.tsx'),
      `import { Button } from './Button';
import { useAuth } from '../hooks/useAuth';
import { fetchUser } from '../services/api';
export const Dashboard = () => null;`
    );
    await fs.writeFile(
      path.join(projDir, 'src', '__tests__', 'Dashboard.test.ts'),
      'import { Dashboard } from "../components/Dashboard";'
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const depRes = await depAnalyzer.analyze(projDir, scanRes.rootNode);
    const archRes = await archEngine.analyze(projDir, scanRes.rootNode, depRes);

    const rels = archRes.relationships;

    const rendersRel = rels.find(
      (r) =>
        r.sourcePath === 'src/components/Dashboard.tsx' &&
        r.targetPath === 'src/components/Button.tsx'
    );
    assert.strictEqual(rendersRel?.type, 'renders');

    const usesRel = rels.find(
      (r) =>
        r.sourcePath === 'src/components/Dashboard.tsx' && r.targetPath === 'src/hooks/useAuth.ts'
    );
    assert.strictEqual(usesRel?.type, 'uses');

    const callsRel = rels.find(
      (r) =>
        r.sourcePath === 'src/components/Dashboard.tsx' && r.targetPath === 'src/services/api.ts'
    );
    assert.strictEqual(callsRel?.type, 'calls');

    const testsRel = rels.find(
      (r) =>
        r.sourcePath === 'src/__tests__/Dashboard.test.ts' &&
        r.targetPath === 'src/components/Dashboard.tsx'
    );
    assert.strictEqual(testsRel?.type, 'tests');
  });

  test('16. Empty project returns empty architecture model', async () => {
    const projDir = path.join(tempBaseDir, 'arch-empty');
    await fs.mkdir(projDir, { recursive: true });

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const depRes = await depAnalyzer.analyze(projDir, scanRes.rootNode);
    const archRes = await archEngine.analyze(projDir, scanRes.rootNode, depRes);

    assert.strictEqual(archRes.summary.totalModules, 0);
    assert.strictEqual(archRes.summary.classifiedModulesCount, 0);
    assert.strictEqual(archRes.summary.layersCount, 0);
    assert.strictEqual(archRes.relationships.length, 0);
  });
});
