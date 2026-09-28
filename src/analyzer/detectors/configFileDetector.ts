import { TechnologyCategory, TechnologyInfo } from '../../models';
import { DetectionContext, ITechnologyDetector } from './detectorInterface';

interface ConfigRule {
  pattern: string | RegExp;
  id: string;
  name: string;
  category: TechnologyCategory;
  description: string;
}

export class ConfigFileDetector implements ITechnologyDetector {
  public readonly id = 'configFileDetector';
  public readonly name = 'Configuration File Signature Detector';

  private static readonly RULES: ConfigRule[] = [
    {
      pattern: /^next\.config\.(js|mjs|ts|cjs)$/i,
      id: 'nextjs',
      name: 'Next.js',
      category: 'framework',
      description: 'Next.js framework configuration',
    },
    {
      pattern: /^vite\.config\.(js|mjs|ts|cjs)$/i,
      id: 'vite',
      name: 'Vite',
      category: 'buildTool',
      description: 'Vite build tool configuration',
    },
    {
      pattern: /^tailwind\.config\.(js|mjs|ts|cjs)$/i,
      id: 'tailwindcss',
      name: 'Tailwind CSS',
      category: 'styling',
      description: 'Tailwind CSS configuration',
    },
    {
      pattern: /^postcss\.config\.(js|mjs|ts|cjs|json)$/i,
      id: 'postcss',
      name: 'PostCSS',
      category: 'styling',
      description: 'PostCSS styling pipeline configuration',
    },
    {
      pattern: /^astro\.config\.(js|mjs|ts|cjs)$/i,
      id: 'astro',
      name: 'Astro',
      category: 'framework',
      description: 'Astro web framework configuration',
    },
    {
      pattern: /^nuxt\.config\.(js|mjs|ts|cjs)$/i,
      id: 'nuxt',
      name: 'Nuxt',
      category: 'framework',
      description: 'Nuxt framework configuration',
    },
    {
      pattern: /^svelte\.config\.(js|mjs|ts|cjs)$/i,
      id: 'sveltekit',
      name: 'SvelteKit',
      category: 'framework',
      description: 'SvelteKit configuration file',
    },
    {
      pattern: /^angular\.json$/i,
      id: 'angular',
      name: 'Angular',
      category: 'framework',
      description: 'Angular CLI workspace configuration',
    },
    {
      pattern: /^webpack\.config\.(js|mjs|ts|cjs)$/i,
      id: 'webpack',
      name: 'Webpack',
      category: 'buildTool',
      description: 'Webpack module bundler configuration',
    },
    {
      pattern: /^rollup\.config\.(js|mjs|ts|cjs)$/i,
      id: 'rollup',
      name: 'Rollup',
      category: 'buildTool',
      description: 'Rollup ES bundler configuration',
    },
    {
      pattern: /^(babel\.config\.(js|mjs|json)|^\.babelrc(\.json)?)$/i,
      id: 'babel',
      name: 'Babel',
      category: 'buildTool',
      description: 'Babel compiler configuration',
    },
    {
      pattern: /^tsconfig(\..+)?\.json$/i,
      id: 'typescript',
      name: 'TypeScript',
      category: 'language',
      description: 'TypeScript compiler configuration',
    },
    {
      pattern: /^(eslint\.config\.(js|mjs|cjs)|\.eslintrc(\.json|\.js|\.cjs|\.yml|\.yaml)?)$/i,
      id: 'eslint',
      name: 'ESLint',
      category: 'tooling',
      description: 'ESLint code quality linter configuration',
    },
    {
      pattern: /^(\.prettierrc(\.json|\.js|\.cjs|\.yaml|\.yml)?|prettier\.config\.(js|mjs|cjs))$/i,
      id: 'prettier',
      name: 'Prettier',
      category: 'tooling',
      description: 'Prettier code style formatter configuration',
    },
    {
      pattern: /^jest\.config\.(js|mjs|ts|cjs|json)$/i,
      id: 'jest',
      name: 'Jest',
      category: 'testing',
      description: 'Jest testing framework configuration',
    },
    {
      pattern: /^vitest\.config\.(js|mjs|ts|cjs)$/i,
      id: 'vitest',
      name: 'Vitest',
      category: 'testing',
      description: 'Vitest test runner configuration',
    },
    {
      pattern: /^playwright\.config\.(js|mjs|ts|cjs)$/i,
      id: 'playwright',
      name: 'Playwright',
      category: 'testing',
      description: 'Playwright end-to-end test configuration',
    },
    {
      pattern: /^cypress\.config\.(js|mjs|ts|cjs)$/i,
      id: 'cypress',
      name: 'Cypress',
      category: 'testing',
      description: 'Cypress testing suite configuration',
    },
    {
      pattern: /^(dockerfile|docker-compose(\..+)?\.(yml|yaml)|\.dockerignore)$/i,
      id: 'docker',
      name: 'Docker',
      category: 'cloud',
      description: 'Containerization and deployment configuration',
    },
    {
      pattern: /^vercel\.json$/i,
      id: 'vercel',
      name: 'Vercel',
      category: 'cloud',
      description: 'Vercel deployment platform configuration',
    },
    {
      pattern: /^netlify\.toml$/i,
      id: 'netlify',
      name: 'Netlify',
      category: 'cloud',
      description: 'Netlify cloud hosting configuration',
    },
    {
      pattern: /^components\.json$/i,
      id: 'shadcn-ui',
      name: 'shadcn/ui',
      category: 'library',
      description: 'shadcn/ui component configuration',
    },
  ];

  public async detect(context: DetectionContext): Promise<TechnologyInfo[]> {
    const results: TechnologyInfo[] = [];

    for (const relPath of context.allRelativeFilePaths) {
      const fileName = relPath.split('/').pop() || '';

      for (const rule of ConfigFileDetector.RULES) {
        let isMatch = false;

        if (typeof rule.pattern === 'string') {
          isMatch = fileName.toLowerCase() === rule.pattern.toLowerCase();
        } else {
          isMatch = rule.pattern.test(fileName);
        }

        if (isMatch) {
          results.push({
            id: rule.id,
            name: rule.name,
            category: rule.category,
            confidence: 1.0,
            evidence: [
              {
                source: relPath,
                type: 'configuration',
                detail: `Detected configuration file: ${relPath}`,
              },
            ],
            description: rule.description,
          });
        }
      }
    }

    return results;
  }
}
