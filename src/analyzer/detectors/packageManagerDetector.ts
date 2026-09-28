import { TechnologyInfo } from '../../models';
import { DetectionContext, ITechnologyDetector } from './detectorInterface';

interface LockfileMapping {
  lockfile: string;
  id: string;
  name: string;
  description: string;
}

export class PackageManagerDetector implements ITechnologyDetector {
  public readonly id = 'packageManagerDetector';
  public readonly name = 'Package Manager & Lockfile Detector';

  private static readonly MAPPINGS: LockfileMapping[] = [
    { lockfile: 'package-lock.json', id: 'npm', name: 'npm', description: 'Node Package Manager' },
    {
      lockfile: 'pnpm-lock.yaml',
      id: 'pnpm',
      name: 'pnpm',
      description: 'Fast, disk space efficient package manager',
    },
    {
      lockfile: 'yarn.lock',
      id: 'yarn',
      name: 'Yarn',
      description: 'Fast, reliable, and secure dependency management',
    },
    {
      lockfile: 'bun.lockb',
      id: 'bun',
      name: 'Bun',
      description: 'All-in-one JavaScript runtime and toolkit',
    },
    {
      lockfile: 'bun.lock',
      id: 'bun',
      name: 'Bun',
      description: 'All-in-one JavaScript runtime and toolkit',
    },
    {
      lockfile: 'cargo.lock',
      id: 'cargo',
      name: 'Cargo',
      description: 'Rust package manager and build system',
    },
    {
      lockfile: 'poetry.lock',
      id: 'poetry',
      name: 'Poetry',
      description: 'Python packaging and dependency management',
    },
    {
      lockfile: 'pipfile.lock',
      id: 'pipenv',
      name: 'Pipenv',
      description: 'Python development workflow for humans',
    },
    {
      lockfile: 'composer.lock',
      id: 'composer',
      name: 'Composer',
      description: 'Dependency Manager for PHP',
    },
    {
      lockfile: 'go.sum',
      id: 'go-modules',
      name: 'Go Modules',
      description: 'Go dependency management system',
    },
  ];

  public async detect(context: DetectionContext): Promise<TechnologyInfo[]> {
    const results: TechnologyInfo[] = [];

    // 1. Check lockfiles
    for (const mapping of PackageManagerDetector.MAPPINGS) {
      if (context.fileNames.has(mapping.lockfile.toLowerCase())) {
        results.push({
          id: mapping.id,
          name: mapping.name,
          category: 'packageManager',
          confidence: 1.0,
          evidence: [
            {
              source: mapping.lockfile,
              type: 'lockfile',
              detail: `Lockfile ${mapping.lockfile} detected in workspace`,
            },
          ],
          description: mapping.description,
        });
      }
    }

    // 2. Check package.json "packageManager" field if available
    const pkgData = await context.readJsonConfig<{ packageManager?: string }>('package.json');
    if (pkgData?.packageManager) {
      const parts = pkgData.packageManager.split('@');
      const pmName = parts[0];
      const pmVersion = parts[1] || undefined;

      const matchedIndex = results.findIndex((r) => r.id.toLowerCase() === pmName.toLowerCase());
      if (matchedIndex >= 0) {
        results[matchedIndex].version = pmVersion;
        results[matchedIndex].evidence.push({
          source: 'package.json',
          type: 'manifest',
          detail: `Explicit packageManager field: "${pkgData.packageManager}"`,
        });
      } else {
        results.push({
          id: pmName.toLowerCase(),
          name: pmName.toUpperCase(),
          category: 'packageManager',
          version: pmVersion,
          confidence: 1.0,
          evidence: [
            {
              source: 'package.json',
              type: 'manifest',
              detail: `Explicit packageManager field: "${pkgData.packageManager}"`,
            },
          ],
          description: `${pmName} package manager`,
        });
      }
    }

    return results;
  }
}
