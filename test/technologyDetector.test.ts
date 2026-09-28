import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { FileScanner } from '../src/analyzer/fileScanner';
import { TechnologyDetector } from '../src/analyzer/technologyDetector';

describe('Project DNA — Technology & Framework Detection Test Suite', () => {
  let tempBaseDir: string;
  let scanner: FileScanner;
  let detector: TechnologyDetector;

  before(async () => {
    tempBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-dna-tech-'));
    scanner = new FileScanner();
    detector = new TechnologyDetector();
  });

  after(async () => {
    try {
      await fs.rm(tempBaseDir, { recursive: true, force: true });
    } catch {
      // Cleanup
    }
  });

  test('1. Detects React + Vite project', async () => {
    const projDir = path.join(tempBaseDir, 'react-vite-proj');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'package.json'),
      JSON.stringify({
        name: 'react-vite-app',
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
        devDependencies: {
          vite: '^5.0.0',
          '@vitejs/plugin-react': '^4.2.0',
        },
      })
    );
    await fs.writeFile(path.join(projDir, 'vite.config.ts'), 'export default {}');
    await fs.writeFile(path.join(projDir, 'src', 'App.jsx'), 'export default () => null');

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const techs = await detector.detect(projDir, scanRes.rootNode, scanRes.stats);

    const techNames = techs.map((t) => t.name);
    assert.ok(techNames.includes('React'), 'Should detect React');
    assert.ok(techNames.includes('Vite'), 'Should detect Vite');
    assert.ok(techNames.includes('JavaScript'), 'Should detect JavaScript');
    assert.ok(techNames.includes('TypeScript'), 'Should detect TypeScript from vite.config.ts');

    const viteTech = techs.find((t) => t.id === 'vite');
    assert.strictEqual(viteTech?.version, '5.0.0');
    assert.ok(viteTech?.evidence.some((e) => e.source === 'package.json'));
    assert.ok(viteTech?.evidence.some((e) => e.source === 'vite.config.ts'));
  });

  test('2. Detects Next.js + React + TypeScript project', async () => {
    const projDir = path.join(tempBaseDir, 'nextjs-ts-proj');
    await fs.mkdir(path.join(projDir, 'src', 'app'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'package.json'),
      JSON.stringify({
        name: 'nextjs-app',
        dependencies: {
          next: '15.1.0',
          react: '19.0.0',
          'react-dom': '19.0.0',
        },
        devDependencies: {
          typescript: '^5.3.3',
          '@types/react': '^19.0.0',
        },
      })
    );
    await fs.writeFile(path.join(projDir, 'next.config.js'), 'module.exports = {}');
    await fs.writeFile(path.join(projDir, 'tsconfig.json'), '{}');
    await fs.writeFile(path.join(projDir, 'src', 'app', 'page.tsx'), 'export default () => null');

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const techs = await detector.detect(projDir, scanRes.rootNode, scanRes.stats);

    const techNames = techs.map((t) => t.name);
    assert.ok(techNames.includes('Next.js'), 'Should detect Next.js');
    assert.ok(techNames.includes('React'), 'Should detect React');
    assert.ok(techNames.includes('TypeScript'), 'Should detect TypeScript');

    const nextTech = techs.find((t) => t.id === 'nextjs');
    assert.strictEqual(nextTech?.category, 'framework');
    assert.strictEqual(nextTech?.version, '15.1.0');
    assert.strictEqual(nextTech?.confidence, 1.0);
    assert.ok(nextTech?.evidence.length! >= 2);
  });

  test('3. Detects Vue project', async () => {
    const projDir = path.join(tempBaseDir, 'vue-proj');
    await fs.mkdir(path.join(projDir, 'src'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'package.json'),
      JSON.stringify({
        dependencies: {
          vue: '^3.4.0',
        },
      })
    );
    await fs.writeFile(path.join(projDir, 'src', 'App.vue'), '<template></template>');

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const techs = await detector.detect(projDir, scanRes.rootNode, scanRes.stats);

    const techNames = techs.map((t) => t.name);
    assert.ok(techNames.includes('Vue'), 'Should detect Vue');
  });

  test('4. Detects Python FastAPI project', async () => {
    const projDir = path.join(tempBaseDir, 'fastapi-proj');
    await fs.mkdir(projDir, { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'requirements.txt'),
      'fastapi==0.109.0\nuvicorn==0.27.0\npytest>=7.0'
    );
    await fs.writeFile(
      path.join(projDir, 'main.py'),
      'from fastapi import FastAPI\napp = FastAPI()'
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const techs = await detector.detect(projDir, scanRes.rootNode, scanRes.stats);

    const techNames = techs.map((t) => t.name);
    assert.ok(techNames.includes('Python'), 'Should detect Python');
    assert.ok(techNames.includes('FastAPI'), 'Should detect FastAPI');
    assert.ok(techNames.includes('Pytest'), 'Should detect Pytest');

    const fastapi = techs.find((t) => t.id === 'fastapi');
    assert.strictEqual(fastapi?.version, '0.109.0');
  });

  test('5. Detects Node.js + Express project', async () => {
    const projDir = path.join(tempBaseDir, 'express-proj');
    await fs.mkdir(projDir, { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'package.json'),
      JSON.stringify({
        dependencies: {
          express: '^4.18.2',
        },
      })
    );
    await fs.writeFile(path.join(projDir, 'server.js'), 'const express = require("express");');

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const techs = await detector.detect(projDir, scanRes.rootNode, scanRes.stats);

    const techNames = techs.map((t) => t.name);
    assert.ok(techNames.includes('Node.js'), 'Should detect Node.js');
    assert.ok(techNames.includes('Express'), 'Should detect Express');
    assert.ok(techNames.includes('JavaScript'), 'Should detect JavaScript');
  });

  test('6. Detects Java Spring Boot project', async () => {
    const projDir = path.join(tempBaseDir, 'spring-proj');
    await fs.mkdir(path.join(projDir, 'src', 'main', 'java'), { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'pom.xml'),
      `<project><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>`
    );
    await fs.writeFile(
      path.join(projDir, 'src', 'main', 'java', 'Application.java'),
      'public class Application {}'
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const techs = await detector.detect(projDir, scanRes.rootNode, scanRes.stats);

    const techNames = techs.map((t) => t.name);
    assert.ok(techNames.includes('Java'), 'Should detect Java');
    assert.ok(techNames.includes('Maven'), 'Should detect Maven');
    assert.ok(techNames.includes('Spring Boot'), 'Should detect Spring Boot');
  });

  test('7. Detects Firebase project with rules and configs', async () => {
    const projDir = path.join(tempBaseDir, 'firebase-proj');
    await fs.mkdir(projDir, { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'firebase.json'),
      '{"firestore": {"rules": "firestore.rules"}}'
    );
    await fs.writeFile(path.join(projDir, '.firebaserc'), '{"projects": {"default": "my-app"}}');
    await fs.writeFile(path.join(projDir, 'firestore.rules'), 'rules_version = "2";');
    await fs.writeFile(
      path.join(projDir, 'package.json'),
      JSON.stringify({
        dependencies: {
          firebase: '^10.7.0',
        },
      })
    );

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const techs = await detector.detect(projDir, scanRes.rootNode, scanRes.stats);

    const firebaseTech = techs.find((t) => t.id === 'firebase');
    assert.ok(firebaseTech, 'Should detect Firebase');
    assert.strictEqual(firebaseTech?.category, 'service');
    assert.strictEqual(firebaseTech?.version, '10.7.0');
    assert.ok(firebaseTech?.evidence.length! >= 3);
  });

  test('8. Detects Tailwind CSS + PostCSS project', async () => {
    const projDir = path.join(tempBaseDir, 'tailwind-proj');
    await fs.mkdir(projDir, { recursive: true });

    await fs.writeFile(
      path.join(projDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          tailwindcss: '^3.4.1',
          postcss: '^8.4.35',
        },
      })
    );
    await fs.writeFile(path.join(projDir, 'tailwind.config.ts'), 'export default {}');
    await fs.writeFile(path.join(projDir, 'postcss.config.js'), 'module.exports = {}');

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const techs = await detector.detect(projDir, scanRes.rootNode, scanRes.stats);

    const techNames = techs.map((t) => t.name);
    assert.ok(techNames.includes('Tailwind CSS'), 'Should detect Tailwind CSS');
    assert.ok(techNames.includes('PostCSS'), 'Should detect PostCSS');
  });

  test('9. Handles project with no recognizable technology gracefully', async () => {
    const projDir = path.join(tempBaseDir, 'empty-tech-proj');
    await fs.mkdir(projDir, { recursive: true });
    await fs.writeFile(path.join(projDir, 'data.csv'), '1,2,3');

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const techs = await detector.detect(projDir, scanRes.rootNode, scanRes.stats);

    assert.strictEqual(techs.length, 0);
  });

  test('10. Handles malformed package.json gracefully without crashing', async () => {
    const projDir = path.join(tempBaseDir, 'malformed-pkg-proj');
    await fs.mkdir(projDir, { recursive: true });

    await fs.writeFile(path.join(projDir, 'package.json'), '{ invalid json: broken');
    await fs.writeFile(path.join(projDir, 'next.config.js'), 'module.exports = {}');

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const techs = await detector.detect(projDir, scanRes.rootNode, scanRes.stats);

    // Should still detect Next.js from next.config.js
    const techNames = techs.map((t) => t.name);
    assert.ok(techNames.includes('Next.js'));
  });

  test('11. Detects multiple package managers if multiple lockfiles exist', async () => {
    const projDir = path.join(tempBaseDir, 'multi-pm-proj');
    await fs.mkdir(projDir, { recursive: true });

    await fs.writeFile(path.join(projDir, 'package.json'), '{}');
    await fs.writeFile(path.join(projDir, 'package-lock.json'), '{}');
    await fs.writeFile(path.join(projDir, 'pnpm-lock.yaml'), '');

    const scanRes = await scanner.scan({ workspaceRoot: projDir });
    const techs = await detector.detect(projDir, scanRes.rootNode, scanRes.stats);

    const pmTechs = techs.filter((t) => t.category === 'packageManager');
    const pmNames = pmTechs.map((t) => t.name);
    assert.ok(pmNames.includes('npm'));
    assert.ok(pmNames.includes('pnpm'));
  });
});
