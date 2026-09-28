import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Project DNA — Extension Manifest & Command Registration Validation', () => {
  const packageJsonPath = path.resolve(__dirname, '../../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  test('1. Manifest declares version 0.1.3', () => {
    assert.strictEqual(packageJson.version, '0.1.3');
  });

  test('2. Manifest points to correct compiled entry point', () => {
    assert.strictEqual(packageJson.main, './dist/extension.js');
    const entryPath = path.resolve(__dirname, '../../dist/extension.js');
    assert.ok(fs.existsSync(entryPath), 'dist/extension.js must exist after build');
  });

  test('3. Commands are declared in contributes.commands', () => {
    const commands: Array<{ command: string; title: string }> =
      packageJson.contributes?.commands || [];
    const commandIds = commands.map((c) => c.command);

    assert.ok(
      commandIds.includes('project-dna.analyzeProject'),
      'project-dna.analyzeProject must be in contributes.commands'
    );
    assert.ok(
      commandIds.includes('project-dna.openDashboard'),
      'project-dna.openDashboard must be in contributes.commands'
    );
    assert.ok(
      commandIds.includes('project-dna.refreshAnalysis'),
      'project-dna.refreshAnalysis must be in contributes.commands'
    );
  });

  test('4. Activation events cover all commands and views', () => {
    const activationEvents: string[] = packageJson.activationEvents || [];

    assert.ok(
      activationEvents.includes('onCommand:project-dna.analyzeProject'),
      'onCommand:project-dna.analyzeProject must be in activationEvents'
    );
    assert.ok(
      activationEvents.includes('onCommand:project-dna.openDashboard'),
      'onCommand:project-dna.openDashboard must be in activationEvents'
    );
    assert.ok(
      activationEvents.includes('onCommand:project-dna.refreshAnalysis'),
      'onCommand:project-dna.refreshAnalysis must be in activationEvents'
    );
    assert.ok(
      activationEvents.includes('onCommand:project-dna.openSection'),
      'onCommand:project-dna.openSection must be in activationEvents'
    );
    assert.ok(
      activationEvents.includes('onView:project-dna-explorer'),
      'onView:project-dna-explorer must be in activationEvents'
    );
    assert.ok(
      activationEvents.includes('onStartupFinished'),
      'onStartupFinished must be in activationEvents'
    );
  });

  test('5. Source files match command IDs exactly', () => {
    const analyzeCommandSrc = fs.readFileSync(
      path.resolve(__dirname, '../../src/commands/analyzeProjectCommand.ts'),
      'utf8'
    );
    assert.ok(
      analyzeCommandSrc.includes("'project-dna.analyzeProject'"),
      'analyzeProjectCommand must register project-dna.analyzeProject'
    );

    const openDashboardSrc = fs.readFileSync(
      path.resolve(__dirname, '../../src/commands/openDashboardCommand.ts'),
      'utf8'
    );
    assert.ok(
      openDashboardSrc.includes("'project-dna.openDashboard'"),
      'openDashboardCommand must register project-dna.openDashboard'
    );
    assert.ok(
      openDashboardSrc.includes("'project-dna.openSection'"),
      'openDashboardCommand must register project-dna.openSection'
    );

    const refreshAnalysisSrc = fs.readFileSync(
      path.resolve(__dirname, '../../src/commands/refreshAnalysisCommand.ts'),
      'utf8'
    );
    assert.ok(
      refreshAnalysisSrc.includes("'project-dna.refreshAnalysis'"),
      'refreshAnalysisCommand must register project-dna.refreshAnalysis'
    );
  });
});
