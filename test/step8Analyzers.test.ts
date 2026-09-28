import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { ApiAnalyzer } from '../src/analyzer/api/apiAnalyzer';
import { ConfigAnalyzer } from '../src/analyzer/config/configAnalyzer';
import { EnvironmentAnalyzer } from '../src/analyzer/environment/environmentAnalyzer';
import { FileNode } from '../src/models';

describe('Step 8: API, Configuration & Environment Analysis Engine Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-dna-step8-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  function createTestFileTree(dir: string, baseDir: string = dir): FileNode {
    const name = path.basename(dir);
    const relPath = path.relative(baseDir, dir).replace(/\\/g, '/');
    const stats = fs.statSync(dir);

    if (stats.isDirectory()) {
      const entries = fs.readdirSync(dir);
      const children: FileNode[] = [];
      for (const entry of entries) {
        children.push(createTestFileTree(path.join(dir, entry), baseDir));
      }
      return {
        id: `dir-${relPath || 'root'}`,
        name: name || 'root',
        path: dir,
        relativePath: relPath || '',
        type: 'directory',
        children,
      };
    } else {
      const ext = path.extname(name);
      return {
        id: `file-${relPath}`,
        name,
        path: dir,
        relativePath: relPath,
        type: 'file',
        extension: ext,
        size: stats.size,
      };
    }
  }

  // ==========================================
  // API ANALYZER TESTS
  // ==========================================

  describe('ApiAnalyzer', () => {
    it('detects Next.js App Router GET, POST, DELETE endpoints with correct path derivation', async () => {
      // Create app/api/users/route.ts
      const routeDir = path.join(tempDir, 'src', 'app', 'api', 'users');
      fs.mkdirSync(routeDir, { recursive: true });
      fs.writeFileSync(
        path.join(routeDir, 'route.ts'),
        `
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  return NextResponse.json({ users: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ created: true });
}

export const DELETE = async (request: Request) => {
  return NextResponse.json({ deleted: true });
};
`
      );

      // Create app/api/auth/[...nextauth]/route.ts
      const authDir = path.join(tempDir, 'src', 'app', 'api', 'auth', '[...nextauth]');
      fs.mkdirSync(authDir, { recursive: true });
      fs.writeFileSync(
        path.join(authDir, 'route.ts'),
        `
export async function GET(req: any) {}
export async function POST(req: any) {}
`
      );

      const fileTree = createTestFileTree(tempDir);
      const analyzer = new ApiAnalyzer();
      const result = await analyzer.analyze(tempDir, fileTree);

      assert.strictEqual(result.totalEndpoints, 5);
      assert.strictEqual(result.methodCounts.GET, 2);
      assert.strictEqual(result.methodCounts.POST, 2);
      assert.strictEqual(result.methodCounts.DELETE, 1);
      assert.ok(result.frameworksDetected.includes('Next.js'));

      const usersGet = result.endpoints.find((e) => e.path === '/api/users' && e.method === 'GET');
      assert.ok(usersGet);
      assert.strictEqual(usersGet.framework, 'Next.js');
      assert.ok(usersGet.evidence.some((ev) => ev.includes('Exported HTTP handler: GET')));

      const authPost = result.endpoints.find(
        (e) => e.path === '/api/auth/[...nextauth]' && e.method === 'POST'
      );
      assert.ok(authPost);
    });

    it('detects Express routes and marks dynamic/computed routes correctly', async () => {
      const serverDir = path.join(tempDir, 'src');
      fs.mkdirSync(serverDir, { recursive: true });
      fs.writeFileSync(
        path.join(serverDir, 'server.ts'),
        `
import express from 'express';
const app = express();
const router = express.Router();

app.get('/api/health', (req, res) => res.send('ok'));
app.post('/api/items', (req, res) => res.json({}));
router.put('/api/items/:id', (req, res) => res.json({}));
router.delete(getDynamicPath(), (req, res) => res.json({}));
`
      );

      const fileTree = createTestFileTree(tempDir);
      const analyzer = new ApiAnalyzer();
      const result = await analyzer.analyze(tempDir, fileTree);

      assert.strictEqual(result.totalEndpoints, 4);
      assert.strictEqual(result.methodCounts.GET, 1);
      assert.strictEqual(result.methodCounts.POST, 1);
      assert.strictEqual(result.methodCounts.PUT, 1);
      assert.strictEqual(result.methodCounts.DELETE, 1);
      assert.strictEqual(result.dynamicEndpointsCount, 1);
      assert.ok(result.frameworksDetected.includes('Express'));

      const dynamicEndpoint = result.endpoints.find((e) => e.isDynamic);
      assert.ok(dynamicEndpoint);
      assert.strictEqual(dynamicEndpoint.path, 'Unknown / dynamic route');
      assert.strictEqual(dynamicEndpoint.method, 'DELETE');
    });

    it('detects FastAPI and Flask route decorators in Python files', async () => {
      const pyDir = path.join(tempDir, 'backend');
      fs.mkdirSync(pyDir, { recursive: true });
      fs.writeFileSync(
        path.join(pyDir, 'api.py'),
        `
from fastapi import FastAPI, APIRouter
from flask import Flask

app = FastAPI()
router = APIRouter()
flask_app = Flask(__name__)

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    return {"item_id": item_id}

@router.post("/items")
async def create_item():
    return {"status": "created"}

@flask_app.route("/flask/status", methods=["GET", "POST"])
def flask_status():
    return "OK"
`
      );

      const fileTree = createTestFileTree(tempDir);
      const analyzer = new ApiAnalyzer();
      const result = await analyzer.analyze(tempDir, fileTree);

      assert.strictEqual(result.totalEndpoints, 4);
      assert.ok(result.frameworksDetected.includes('FastAPI'));
      assert.ok(result.frameworksDetected.includes('Flask'));

      const fastApiGet = result.endpoints.find(
        (e) => e.framework === 'FastAPI' && e.method === 'GET'
      );
      assert.ok(fastApiGet);
      assert.strictEqual(fastApiGet.path, '/items/{item_id}');
      assert.strictEqual(fastApiGet.handlerName, 'read_item');

      const flaskPost = result.endpoints.find(
        (e) => e.framework === 'Flask' && e.method === 'POST'
      );
      assert.ok(flaskPost);
      assert.strictEqual(flaskPost.path, '/flask/status');
      assert.strictEqual(flaskPost.handlerName, 'flask_status');
    });

    it('detects Spring Boot RestController with base @RequestMapping and method mappings', async () => {
      const javaDir = path.join(tempDir, 'src', 'main', 'java', 'com', 'example');
      fs.mkdirSync(javaDir, { recursive: true });
      fs.writeFileSync(
        path.join(javaDir, 'UserController.java'),
        `
package com.example;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    @GetMapping
    public List<User> getAllUsers() {
        return List.of();
    }

    @GetMapping("/{id}")
    public User getUserById(@PathVariable String id) {
        return null;
    }

    @PostMapping
    public User createUser(@RequestBody User user) {
        return user;
    }

    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable String id) {
    }
}
`
      );

      const fileTree = createTestFileTree(tempDir);
      const analyzer = new ApiAnalyzer();
      const result = await analyzer.analyze(tempDir, fileTree);

      assert.strictEqual(result.totalEndpoints, 4);
      assert.strictEqual(result.methodCounts.GET, 2);
      assert.strictEqual(result.methodCounts.POST, 1);
      assert.strictEqual(result.methodCounts.DELETE, 1);
      assert.ok(result.frameworksDetected.includes('Spring Boot'));

      const getUser = result.endpoints.find(
        (e) => e.path === '/api/v1/users/{id}' && e.method === 'GET'
      );
      assert.ok(getUser);
      assert.strictEqual(getUser.handlerName, 'getUserById');
    });

    it('returns empty analysis gracefully when no API routes exist or source is malformed', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'utils.ts'),
        'export const add = (a: number, b: number) => a + b;'
      );
      fs.writeFileSync(path.join(srcDir, 'empty.py'), '# just a comment');

      const fileTree = createTestFileTree(tempDir);
      const analyzer = new ApiAnalyzer();
      const result = await analyzer.analyze(tempDir, fileTree);

      assert.strictEqual(result.totalEndpoints, 0);
      assert.strictEqual(result.frameworksDetected.length, 0);
    });

    it('detects Next.js framework from package.json or next.config.js even when project has 0 API routes', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'birthday-app',
          dependencies: {
            next: '^14.2.3',
            react: '^18.2.0',
          },
        })
      );
      fs.writeFileSync(path.join(tempDir, 'next.config.js'), 'module.exports = {};');
      const srcDir = path.join(tempDir, 'src', 'app');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'page.tsx'),
        'export default function Page() { return null; }'
      );

      const fileTree = createTestFileTree(tempDir);
      const analyzer = new ApiAnalyzer();
      const result = await analyzer.analyze(tempDir, fileTree, [
        { name: 'Next.js', category: 'framework' },
        { name: 'React', category: 'framework' },
      ]);

      assert.strictEqual(result.totalEndpoints, 0);
      assert.strictEqual(result.frameworksDetected.length, 1);
      assert.strictEqual(result.frameworksDetected[0], 'Next.js');
    });
  });

  // ==========================================
  // CONFIGURATION ANALYZER TESTS
  // ==========================================

  describe('ConfigAnalyzer', () => {
    it('detects and categorizes real configuration files accurately', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
      fs.writeFileSync(path.join(tempDir, 'next.config.js'), 'module.exports = {}');
      fs.writeFileSync(path.join(tempDir, 'tailwind.config.ts'), 'export default {}');
      fs.writeFileSync(path.join(tempDir, 'postcss.config.js'), 'module.exports = {}');
      fs.writeFileSync(path.join(tempDir, 'firebase.json'), '{}');
      fs.writeFileSync(path.join(tempDir, 'firestore.rules'), 'rules_version = "2";');
      fs.writeFileSync(path.join(tempDir, 'Dockerfile'), 'FROM node:18');
      fs.writeFileSync(path.join(tempDir, 'docker-compose.yml'), 'version: "3"');

      const fileTree = createTestFileTree(tempDir);
      const analyzer = new ConfigAnalyzer();
      const result = analyzer.analyze(fileTree);

      assert.strictEqual(result.totalConfigs, 9);
      assert.strictEqual(result.categoryCounts.package, 1);
      assert.strictEqual(result.categoryCounts.compiler, 1);
      assert.strictEqual(result.categoryCounts.framework, 1);
      assert.strictEqual(result.categoryCounts.styling, 2); // tailwind + postcss
      assert.strictEqual(result.categoryCounts.database, 2); // firebase.json + firestore.rules
      assert.strictEqual(result.categoryCounts.container, 2); // Dockerfile + docker-compose

      const nextConfig = result.configs.find((c) => c.fileName === 'next.config.js');
      assert.ok(nextConfig);
      assert.strictEqual(nextConfig.technology, 'Next.js');
      assert.strictEqual(nextConfig.category, 'framework');
    });

    it('handles multi-ecosystem configurations (Python, Java, Rust, Go)', async () => {
      fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'fastapi==0.100.0');
      fs.writeFileSync(path.join(tempDir, 'pyproject.toml'), '[tool.poetry]');
      fs.writeFileSync(path.join(tempDir, 'pom.xml'), '<project></project>');
      fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]');
      fs.writeFileSync(path.join(tempDir, 'go.mod'), 'module example.com/app');

      const fileTree = createTestFileTree(tempDir);
      const analyzer = new ConfigAnalyzer();
      const result = analyzer.analyze(fileTree);

      assert.strictEqual(result.totalConfigs, 5);
      assert.strictEqual(result.categoryCounts.package, 5);
    });

    it('returns empty configuration result when no config files exist', async () => {
      fs.writeFileSync(path.join(tempDir, 'random.txt'), 'hello world');

      const fileTree = createTestFileTree(tempDir);
      const analyzer = new ConfigAnalyzer();
      const result = analyzer.analyze(fileTree);

      assert.strictEqual(result.totalConfigs, 0);
    });
  });

  // ==========================================
  // ENVIRONMENT ANALYZER & SECURITY TESTS
  // ==========================================

  describe('EnvironmentAnalyzer & Security', () => {
    it('CRITICAL SECURITY: never captures or leaks actual environment secret values', async () => {
      const secretValue = 'SUPER_SECRET_STRIPE_KEY_99999_DO_NOT_LEAK';
      const firebaseSecret = 'AIzaSyA8fakekey1234567890';
      const dbPassword = 'MySecretDatabasePassword123!';

      // Write .env and .env.local with real secrets
      fs.writeFileSync(
        path.join(tempDir, '.env'),
        `
# Project Environment Configurations
STRIPE_SECRET_KEY=${secretValue}
DATABASE_PASSWORD=${dbPassword}
NEXT_PUBLIC_FIREBASE_API_KEY=${firebaseSecret}
NEXT_PUBLIC_APP_NAME="Birthday App"
`
      );

      fs.writeFileSync(
        path.join(tempDir, '.env.local'),
        `
NEXT_PUBLIC_FIREBASE_PROJECT_ID="birthday-prod"
INTERNAL_API_TOKEN=Bearer secret-token-xyz
`
      );

      // Write code file referencing some of these
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'firebase.ts'),
        `
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const analyticsKey = process.env['ANALYTICS_TRACKING_ID'];
`
      );

      const fileTree = createTestFileTree(tempDir);
      const analyzer = new EnvironmentAnalyzer();
      const result = await analyzer.analyze(tempDir, fileTree);

      // 1. Check variable names identified
      assert.strictEqual(result.envFiles.length, 2);
      assert.ok(result.variables.some((v) => v.name === 'STRIPE_SECRET_KEY'));
      assert.ok(result.variables.some((v) => v.name === 'DATABASE_PASSWORD'));
      assert.ok(result.variables.some((v) => v.name === 'NEXT_PUBLIC_FIREBASE_API_KEY'));
      assert.ok(result.variables.some((v) => v.name === 'ANALYTICS_TRACKING_ID'));

      // 2. CRITICAL SECURITY ASSERTION: Inspect entire serialized result object for any secret leaks
      const serialized = JSON.stringify(result);
      assert.strictEqual(
        serialized.includes(secretValue),
        false,
        'CRITICAL LEAK: Stripe secret value was found in EnvironmentAnalysisResult!'
      );
      assert.strictEqual(
        serialized.includes(firebaseSecret),
        false,
        'CRITICAL LEAK: Firebase secret value was found in EnvironmentAnalysisResult!'
      );
      assert.strictEqual(
        serialized.includes(dbPassword),
        false,
        'CRITICAL LEAK: Database password was found in EnvironmentAnalysisResult!'
      );
      assert.strictEqual(
        serialized.includes('secret-token-xyz'),
        false,
        'CRITICAL LEAK: API token value was found in EnvironmentAnalysisResult!'
      );
      assert.strictEqual(
        serialized.includes('Birthday App'),
        false,
        'CRITICAL LEAK: App name value was found in EnvironmentAnalysisResult!'
      );
    });

    it('distinguishes declared_and_referenced, declared_only, and referenced_only status correctly', async () => {
      fs.writeFileSync(
        path.join(tempDir, '.env'),
        `
DECLARED_AND_USED=123
DECLARED_BUT_UNUSED=456
`
      );

      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'app.ts'),
        `
console.log(process.env.DECLARED_AND_USED);
console.log(process.env.UNDECLARED_BUT_USED);
`
      );

      const fileTree = createTestFileTree(tempDir);
      const analyzer = new EnvironmentAnalyzer();
      const result = await analyzer.analyze(tempDir, fileTree);

      const both = result.variables.find((v) => v.name === 'DECLARED_AND_USED');
      assert.ok(both);
      assert.strictEqual(both.status, 'declared_and_referenced');
      assert.strictEqual(both.definedInFiles.length, 1);
      assert.strictEqual(both.referencedInFiles.length, 1);

      const declOnly = result.variables.find((v) => v.name === 'DECLARED_BUT_UNUSED');
      assert.ok(declOnly);
      assert.strictEqual(declOnly.status, 'declared_only');
      assert.strictEqual(declOnly.referencedInFiles.length, 0);

      const refOnly = result.variables.find((v) => v.name === 'UNDECLARED_BUT_USED');
      assert.ok(refOnly);
      assert.strictEqual(refOnly.status, 'referenced_only');
      assert.strictEqual(refOnly.definedInFiles.length, 0);
    });

    it('correctly identifies public client prefixes (NEXT_PUBLIC_, VITE_, etc.) vs private scope', async () => {
      fs.writeFileSync(
        path.join(tempDir, '.env'),
        `
NEXT_PUBLIC_CLIENT_VAR=abc
VITE_API_URL=def
REACT_APP_TITLE=ghi
PRIVATE_SERVER_SECRET=jkl
`
      );

      const fileTree = createTestFileTree(tempDir);
      const analyzer = new EnvironmentAnalyzer();
      const result = await analyzer.analyze(tempDir, fileTree);

      const nextPublic = result.variables.find((v) => v.name === 'NEXT_PUBLIC_CLIENT_VAR');
      assert.ok(nextPublic);
      assert.strictEqual(nextPublic.scope, 'public');

      const viteVar = result.variables.find((v) => v.name === 'VITE_API_URL');
      assert.ok(viteVar);
      assert.strictEqual(viteVar.scope, 'public');

      const privateVar = result.variables.find((v) => v.name === 'PRIVATE_SERVER_SECRET');
      assert.ok(privateVar);
      assert.strictEqual(privateVar.scope, 'private');
    });

    it('detects Python os.getenv and Java System.getenv references', async () => {
      const pyDir = path.join(tempDir, 'backend');
      fs.mkdirSync(pyDir, { recursive: true });
      fs.writeFileSync(
        path.join(pyDir, 'settings.py'),
        `
import os
DB_HOST = os.getenv("DATABASE_HOST")
SECRET_KEY = os.environ.get("FLASK_SECRET_KEY")
`
      );

      const javaDir = path.join(tempDir, 'src');
      fs.mkdirSync(javaDir, { recursive: true });
      fs.writeFileSync(
        path.join(javaDir, 'Config.java'),
        `
public class Config {
    public static String getPort() {
        return System.getenv("PORT");
    }
}
`
      );

      const fileTree = createTestFileTree(tempDir);
      const analyzer = new EnvironmentAnalyzer();
      const result = await analyzer.analyze(tempDir, fileTree);

      assert.ok(result.variables.some((v) => v.name === 'DATABASE_HOST'));
      assert.ok(result.variables.some((v) => v.name === 'FLASK_SECRET_KEY'));
      assert.ok(result.variables.some((v) => v.name === 'PORT'));
    });
  });
});
