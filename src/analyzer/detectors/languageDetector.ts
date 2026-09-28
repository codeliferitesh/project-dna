import { TechnologyInfo } from '../../models';
import { DetectionContext, ITechnologyDetector } from './detectorInterface';

interface LanguageRule {
  id: string;
  name: string;
  extensions: string[];
  manifests?: string[];
  description: string;
}

export class LanguageDetector implements ITechnologyDetector {
  public readonly id = 'languageDetector';
  public readonly name = 'Programming Language Detector';

  private static readonly RULES: LanguageRule[] = [
    {
      id: 'typescript',
      name: 'TypeScript',
      extensions: ['.ts', '.tsx', '.mts', '.cts'],
      manifests: ['tsconfig.json'],
      description: 'Typed JavaScript superset',
    },
    {
      id: 'javascript',
      name: 'JavaScript',
      extensions: ['.js', '.jsx', '.mjs', '.cjs'],
      description: 'Dynamic scripting language',
    },
    {
      id: 'python',
      name: 'Python',
      extensions: ['.py', '.pyw', '.ipynb'],
      manifests: ['pyproject.toml', 'requirements.txt', 'setup.py', 'Pipfile'],
      description: 'Interpreted high-level programming language',
    },
    {
      id: 'java',
      name: 'Java',
      extensions: ['.java', '.jar'],
      manifests: ['pom.xml', 'build.gradle'],
      description: 'Object-oriented class-based language',
    },
    {
      id: 'go',
      name: 'Go',
      extensions: ['.go'],
      manifests: ['go.mod'],
      description: 'Compiled concurrent systems language',
    },
    {
      id: 'rust',
      name: 'Rust',
      extensions: ['.rs'],
      manifests: ['Cargo.toml'],
      description: 'Memory-safe systems programming language',
    },
    {
      id: 'cpp',
      name: 'C++',
      extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hxx'],
      manifests: ['CMakeLists.txt'],
      description: 'General-purpose systems programming language',
    },
    {
      id: 'c',
      name: 'C',
      extensions: ['.c', '.h'],
      manifests: ['Makefile'],
      description: 'Procedural systems programming language',
    },
    {
      id: 'csharp',
      name: 'C#',
      extensions: ['.cs'],
      description: 'Modern object-oriented language for .NET',
    },
    {
      id: 'php',
      name: 'PHP',
      extensions: ['.php'],
      manifests: ['composer.json'],
      description: 'Server-side scripting language',
    },
    {
      id: 'ruby',
      name: 'Ruby',
      extensions: ['.rb', '.erb'],
      manifests: ['Gemfile'],
      description: 'Dynamic object-oriented programming language',
    },
    {
      id: 'swift',
      name: 'Swift',
      extensions: ['.swift'],
      manifests: ['Package.swift'],
      description: 'Modern language for Apple & cross-platform',
    },
    {
      id: 'kotlin',
      name: 'Kotlin',
      extensions: ['.kt', '.kts'],
      description: 'Modern JVM & multiplatform language',
    },
    {
      id: 'dart',
      name: 'Dart',
      extensions: ['.dart'],
      manifests: ['pubspec.yaml'],
      description: 'Client-optimized language for multi-platform apps',
    },
    {
      id: 'html',
      name: 'HTML',
      extensions: ['.html', '.htm'],
      description: 'Standard markup language for the web',
    },
    {
      id: 'shell',
      name: 'Shell',
      extensions: ['.sh', '.bash', '.zsh', '.ps1'],
      description: 'Command line shell scripting language',
    },
  ];

  public async detect(context: DetectionContext): Promise<TechnologyInfo[]> {
    const results: TechnologyInfo[] = [];
    const extBreakdown = context.stats.extensionBreakdown || {};

    for (const rule of LanguageDetector.RULES) {
      let matchedCount = 0;
      const matchedExtensions: string[] = [];

      for (const ext of rule.extensions) {
        const count = extBreakdown[ext];
        if (count && count > 0) {
          matchedCount += count;
          matchedExtensions.push(ext);
        }
      }

      const hasManifest = rule.manifests?.some((m) => context.fileNames.has(m.toLowerCase()));

      if (matchedCount > 0 || hasManifest) {
        const evidence = [];

        if (matchedCount > 0) {
          evidence.push({
            source: `${matchedExtensions.join(', ')} files`,
            type: 'file_extension' as const,
            detail: `Detected ${matchedCount} ${rule.name} file(s) (${matchedExtensions.join(', ')})`,
          });
        }

        if (hasManifest) {
          const found = rule.manifests?.filter((m) => context.fileNames.has(m.toLowerCase())) || [];
          for (const m of found) {
            evidence.push({
              source: m,
              type: 'manifest' as const,
              detail: `${rule.name} project manifest / configuration file detected`,
            });
          }
        }

        results.push({
          id: rule.id,
          name: rule.name,
          category: 'language',
          confidence: 1.0,
          evidence,
          description: rule.description,
        });
      }
    }

    return results;
  }
}
