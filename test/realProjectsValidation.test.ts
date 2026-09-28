import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { FileScanner } from '../src/analyzer/fileScanner';
import { TechnologyDetector } from '../src/analyzer/technologyDetector';
import { DependencyAnalyzer } from '../src/analyzer/dependencies/dependencyAnalyzer';
import { ArchitectureEngine } from '../src/analyzer/architecture/architectureEngine';
import { ApiAnalyzer } from '../src/analyzer/api/apiAnalyzer';
import { ConfigAnalyzer } from '../src/analyzer/config/configAnalyzer';
import { EnvironmentAnalyzer } from '../src/analyzer/environment/environmentAnalyzer';
import { GitDetector } from '../src/analyzer/git/gitDetector';

describe('Project DNA — Step 12: Real-Project Category Validation', () => {
  let testRoot: string;

  before(async () => {
    testRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'project-dna-step12-'));
  });

  after(async () => {
    try {
      await fs.rm(testRoot, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  // Helper to run standard Project DNA pipeline
  async function runPipeline(workspace: string) {
    const scanner = new FileScanner();
    const techDetector = new TechnologyDetector();
    const depAnalyzer = new DependencyAnalyzer();
    const archEngine = new ArchitectureEngine();
    const apiAnalyzer = new ApiAnalyzer();
    const configAnalyzer = new ConfigAnalyzer();
    const envAnalyzer = new EnvironmentAnalyzer();
    const gitDetector = new GitDetector();

    const scanResult = await scanner.scan({ workspaceRoot: workspace });
    const technologies = await techDetector.detect(
      workspace,
      scanResult.rootNode,
      scanResult.stats
    );
    const depGraph = await depAnalyzer.analyze(workspace, scanResult.rootNode);
    const architecture = await archEngine.analyze(workspace, scanResult.rootNode, depGraph);
    const apiResult = await apiAnalyzer.analyze(workspace, scanResult.rootNode, technologies);
    const configResult = configAnalyzer.analyze(scanResult.rootNode);
    const envResult = await envAnalyzer.analyze(workspace, scanResult.rootNode);
    const gitResult = await gitDetector.detect(workspace);

    return {
      scanResult,
      technologies,
      depGraph,
      architecture,
      apiResult,
      configResult,
      envResult,
      gitResult,
    };
  }

  // 1. Next.js + TypeScript
  test('Category 1: Next.js + TypeScript project', async () => {
    const dir = path.join(testRoot, 'nextjs-ts');
    await fs.mkdir(path.join(dir, 'src', 'app', 'api', 'hello'), { recursive: true });
    await fs.mkdir(path.join(dir, 'src', 'components'), { recursive: true });

    await fs.writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name: 'next-ts-app',
        dependencies: { next: '^14.0.0', react: '^18.2.0', typescript: '^5.0.0' },
      })
    );
    await fs.writeFile(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } })
    );
    await fs.writeFile(path.join(dir, 'next.config.mjs'), 'export default {};');
    await fs.writeFile(
      path.join(dir, 'src', 'components', 'Header.tsx'),
      'export const Header = () => <header>Header</header>;'
    );
    await fs.writeFile(
      path.join(dir, 'src', 'app', 'page.tsx'),
      'import { Header } from "@/components/Header"; export default function Page() { return <Header />; }'
    );
    await fs.writeFile(
      path.join(dir, 'src', 'app', 'api', 'hello', 'route.ts'),
      'export async function GET() { return Response.json({ ok: true }); }'
    );

    const res = await runPipeline(dir);
    const techNames = res.technologies.map((t) => t.name);

    assert.ok(techNames.includes('Next.js'));
    assert.ok(techNames.includes('TypeScript'));
    assert.strictEqual(res.apiResult.totalEndpoints, 1);
    assert.strictEqual(res.apiResult.endpoints[0].method, 'GET');
    assert.strictEqual(res.apiResult.endpoints[0].path, '/api/hello');
    assert.ok(res.depGraph.edges.some((e) => e.targetFilePath === 'src/components/Header.tsx'));
  });

  // 2. Next.js + JavaScript
  test('Category 2: Next.js + JavaScript project (Pages Router)', async () => {
    const dir = path.join(testRoot, 'nextjs-js');
    await fs.mkdir(path.join(dir, 'pages', 'api'), { recursive: true });
    await fs.mkdir(path.join(dir, 'components'), { recursive: true });

    await fs.writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'next-js-app', dependencies: { next: '^13.0.0', react: '^18.0.0' } })
    );
    await fs.writeFile(path.join(dir, 'next.config.js'), 'module.exports = {};');
    await fs.writeFile(
      path.join(dir, 'components', 'Navbar.jsx'),
      'export default function Navbar() { return <nav></nav>; }'
    );
    await fs.writeFile(
      path.join(dir, 'pages', 'index.jsx'),
      'import Navbar from "../components/Navbar"; export default function Home() { return <Navbar />; }'
    );
    await fs.writeFile(
      path.join(dir, 'pages', 'api', 'users.js'),
      'export default function handler(req, res) { res.status(200).json([]); }'
    );

    const res = await runPipeline(dir);
    const techNames = res.technologies.map((t) => t.name);

    assert.ok(techNames.includes('Next.js'));
    assert.ok(techNames.includes('JavaScript'));
    assert.strictEqual(res.apiResult.totalEndpoints, 1);
    assert.strictEqual(res.apiResult.endpoints[0].path, '/api/users');
  });

  // 3. React / Vite Project
  test('Category 3: React / Vite project', async () => {
    const dir = path.join(testRoot, 'react-vite');
    await fs.mkdir(path.join(dir, 'src', 'components'), { recursive: true });

    await fs.writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name: 'vite-app',
        dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
        devDependencies: { vite: '^5.0.0', '@vitejs/plugin-react': '^4.0.0' },
      })
    );
    await fs.writeFile(path.join(dir, 'vite.config.ts'), 'export default {};');
    await fs.writeFile(
      path.join(dir, 'src', 'App.tsx'),
      'export function App() { return <div>App</div>; }'
    );
    await fs.writeFile(
      path.join(dir, 'src', 'main.tsx'),
      'import { App } from "./App"; import React from "react";'
    );

    const res = await runPipeline(dir);
    const techNames = res.technologies.map((t) => t.name);

    assert.ok(techNames.includes('Vite'));
    assert.ok(techNames.includes('React'));
    assert.strictEqual(res.apiResult.totalEndpoints, 0); // Vite client app has 0 backend routes
  });

  // 4. Node.js / Express Project
  test('Category 4: Node.js / Express backend project', async () => {
    const dir = path.join(testRoot, 'node-express');
    await fs.mkdir(path.join(dir, 'src', 'routes'), { recursive: true });

    await fs.writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'express-api', dependencies: { express: '^4.18.2' } })
    );
    await fs.writeFile(
      path.join(dir, 'src', 'routes', 'auth.js'),
      `const express = require('express');
const router = express.Router();
router.post('/login', (req, res) => {});
router.get('/me', (req, res) => {});
module.exports = router;`
    );
    await fs.writeFile(
      path.join(dir, 'src', 'server.js'),
      `const express = require('express');
const app = express();
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);
app.listen(3000);`
    );

    const res = await runPipeline(dir);
    const techNames = res.technologies.map((t) => t.name);

    assert.ok(techNames.includes('Express'));
    assert.ok(res.apiResult.totalEndpoints >= 2);
    const methods = res.apiResult.endpoints.map((e) => e.method);
    assert.ok(methods.includes('POST'));
    assert.ok(methods.includes('GET'));
  });

  // 5. Project with TypeScript Path Aliases
  test('Category 5: Project with TypeScript path aliases', async () => {
    const dir = path.join(testRoot, 'ts-aliases');
    await fs.mkdir(path.join(dir, 'src', 'services'), { recursive: true });
    await fs.mkdir(path.join(dir, 'src', 'models'), { recursive: true });

    await fs.writeFile(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@services/*': ['src/services/*'],
            '@models/*': ['src/models/*'],
          },
        },
      })
    );
    await fs.writeFile(
      path.join(dir, 'src', 'models', 'user.ts'),
      'export interface User { id: string; name: string; }'
    );
    await fs.writeFile(
      path.join(dir, 'src', 'services', 'userService.ts'),
      'import { User } from "@models/user"; export function getUser(): User { return { id: "1", name: "Alice" }; }'
    );

    const res = await runPipeline(dir);
    assert.strictEqual(res.depGraph.stats.totalLocalEdges, 1);
    assert.strictEqual(res.depGraph.edges[0].targetFilePath, 'src/models/user.ts');
  });

  // 6. Project with Unresolved Imports
  test('Category 6: Project with unresolved imports', async () => {
    const dir = path.join(testRoot, 'unresolved-imports');
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });

    await fs.writeFile(
      path.join(dir, 'src', 'index.ts'),
      'import { missing } from "./nonExistentFile"; import { other } from "@/missing/alias";'
    );

    const res = await runPipeline(dir);
    assert.ok(res.depGraph.unresolvedImports.length >= 1);
    assert.strictEqual(res.depGraph.stats.totalLocalEdges, 0);
  });

  // 7. Project with No API Endpoints
  test('Category 7: Project with no API endpoints', async () => {
    const dir = path.join(testRoot, 'no-apis');
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });

    await fs.writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'pure-frontend', dependencies: { react: '^18.0.0' } })
    );
    await fs.writeFile(path.join(dir, 'src', 'index.tsx'), 'export const Component = () => null;');

    const res = await runPipeline(dir);
    assert.strictEqual(res.apiResult.totalEndpoints, 0);
    assert.strictEqual(res.apiResult.methodCounts.GET, 0);
    assert.strictEqual(res.apiResult.methodCounts.POST, 0);
  });

  // 8. Project with API / Server Routes
  test('Category 8: Project with multi-method API routes (FastAPI & Flask)', async () => {
    const dir = path.join(testRoot, 'python-apis');
    await fs.mkdir(path.join(dir, 'app'), { recursive: true });

    await fs.writeFile(path.join(dir, 'requirements.txt'), 'fastapi>=0.100.0\nuvicorn>=0.22.0');
    await fs.writeFile(
      path.join(dir, 'app', 'main.py'),
      `from fastapi import FastAPI
app = FastAPI()

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    return {"item_id": item_id}

@app.post("/items")
async def create_item(item: dict):
    return item`
    );

    const res = await runPipeline(dir);
    assert.strictEqual(res.apiResult.totalEndpoints, 2);
    assert.ok(res.apiResult.frameworksDetected.includes('FastAPI'));
  });

  // 9. Small Project (1 file, minimal footprint)
  test('Category 9: Small single-file script project', async () => {
    const dir = path.join(testRoot, 'small-project');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'script.py'), 'print("Hello world")');

    const res = await runPipeline(dir);
    assert.strictEqual(res.scanResult.stats.totalFiles, 1);
    assert.strictEqual(res.depGraph.stats.analyzedFilesCount, 1);
    assert.strictEqual(res.architecture.summary.totalModules, 1);
  });

  // 10. Larger Multi-Tier Monorepo Project
  test('Category 10: Larger multi-tier project with nested components, hooks, services, and git repo', async () => {
    const dir = path.join(testRoot, 'large-project');
    await fs.mkdir(path.join(dir, '.git', 'refs', 'heads'), { recursive: true });
    await fs.mkdir(path.join(dir, 'packages', 'client', 'src', 'components'), { recursive: true });
    await fs.mkdir(path.join(dir, 'packages', 'client', 'src', 'hooks'), { recursive: true });
    await fs.mkdir(path.join(dir, 'packages', 'server', 'src', 'services'), { recursive: true });

    // Mock local git repo
    await fs.writeFile(path.join(dir, '.git', 'HEAD'), 'ref: refs/heads/develop\n');
    await fs.writeFile(
      path.join(dir, '.git', 'refs', 'heads', 'develop'),
      'abcdef1234567890abcdef1234567890abcdef12\n'
    );
    await fs.writeFile(
      path.join(dir, '.git', 'config'),
      '[remote "origin"]\n\turl = https://github.com/org/large-project.git\n'
    );

    await fs.writeFile(
      path.join(dir, 'packages', 'client', 'src', 'hooks', 'useAuth.ts'),
      'export function useAuth() { return { user: "admin" }; }'
    );
    await fs.writeFile(
      path.join(dir, 'packages', 'client', 'src', 'components', 'Profile.tsx'),
      'import { useAuth } from "../hooks/useAuth"; export function Profile() { const a = useAuth(); return <div>{a.user}</div>; }'
    );
    await fs.writeFile(
      path.join(dir, 'packages', 'server', 'src', 'services', 'authService.ts'),
      'export class AuthService { login() { return true; } }'
    );

    const res = await runPipeline(dir);

    assert.ok((res.scanResult.stats.totalFiles ?? 0) >= 3);
    assert.ok(res.architecture.summary.classifiedModulesCount >= 2);
    assert.strictEqual(res.gitResult?.isGitRepo, true);
    assert.strictEqual(res.gitResult?.currentBranch, 'develop');
    assert.strictEqual(res.gitResult?.lastCommitHash, 'abcdef12');
    assert.strictEqual(res.gitResult?.remoteUrl, 'https://github.com/org/large-project.git');
  });
});
