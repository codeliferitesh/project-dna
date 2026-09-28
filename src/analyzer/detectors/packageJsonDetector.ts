import { TechnologyCategory, TechnologyInfo } from '../../models';
import { DetectionContext, ITechnologyDetector } from './detectorInterface';

interface PackageRule {
  packagePattern: string | RegExp;
  id: string;
  name: string;
  category: TechnologyCategory;
  description?: string;
  isPrimary?: boolean;
}

interface PackageJsonData {
  name?: string;
  version?: string;
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export class PackageJsonDetector implements ITechnologyDetector {
  public readonly id = 'packageJsonDetector';
  public readonly name = 'Node / NPM Package Manifest Detector';

  private static readonly RULES: PackageRule[] = [
    // Frameworks & Libraries (Frontend)
    {
      packagePattern: 'next',
      id: 'nextjs',
      name: 'Next.js',
      category: 'framework',
      description: 'React framework for web applications',
    },
    {
      packagePattern: 'react',
      id: 'react',
      name: 'React',
      category: 'library',
      description: 'JavaScript library for user interfaces',
    },
    {
      packagePattern: 'vue',
      id: 'vue',
      name: 'Vue',
      category: 'framework',
      description: 'Progressive JavaScript framework',
    },
    {
      packagePattern: '@angular/core',
      id: 'angular',
      name: 'Angular',
      category: 'framework',
      description: 'Component-based web app framework',
    },
    {
      packagePattern: 'svelte',
      id: 'svelte',
      name: 'Svelte',
      category: 'framework',
      description: 'Cybernetically enhanced web apps',
    },
    {
      packagePattern: '@sveltejs/kit',
      id: 'sveltekit',
      name: 'SvelteKit',
      category: 'framework',
      description: 'Full-stack framework for Svelte',
    },
    {
      packagePattern: 'nuxt',
      id: 'nuxt',
      name: 'Nuxt',
      category: 'framework',
      description: 'Intuitive Vue framework',
    },
    {
      packagePattern: 'astro',
      id: 'astro',
      name: 'Astro',
      category: 'framework',
      description: 'Content-driven web framework',
    },
    {
      packagePattern: '@remix-run/react',
      id: 'remix',
      name: 'Remix',
      category: 'framework',
      description: 'Full stack web framework',
    },
    {
      packagePattern: 'solid-js',
      id: 'solidjs',
      name: 'SolidJS',
      category: 'library',
      description: 'Reactive declarative UI library',
    },
    {
      packagePattern: 'electron',
      id: 'electron',
      name: 'Electron',
      category: 'framework',
      description: 'Cross-platform desktop application framework',
    },
    {
      packagePattern: 'react-native',
      id: 'react-native',
      name: 'React Native',
      category: 'framework',
      description: 'Native app development with React',
    },
    {
      packagePattern: 'expo',
      id: 'expo',
      name: 'Expo',
      category: 'framework',
      description: 'Platform for universal React applications',
    },

    // Backend & Server
    {
      packagePattern: 'express',
      id: 'express',
      name: 'Express',
      category: 'backend',
      description: 'Fast, unopinionated Node.js web framework',
    },
    {
      packagePattern: 'fastify',
      id: 'fastify',
      name: 'Fastify',
      category: 'backend',
      description: 'High-performance Node.js web framework',
    },
    {
      packagePattern: '@nestjs/core',
      id: 'nestjs',
      name: 'NestJS',
      category: 'framework',
      description: 'Progressive TypeScript server-side framework',
    },
    {
      packagePattern: 'koa',
      id: 'koa',
      name: 'Koa',
      category: 'backend',
      description: 'Next-gen Node.js framework',
    },
    {
      packagePattern: 'hono',
      id: 'hono',
      name: 'Hono',
      category: 'backend',
      description: 'Ultrafast web framework for the Edges',
    },
    {
      packagePattern: '@trpc/server',
      id: 'trpc',
      name: 'tRPC',
      category: 'backend',
      description: 'End-to-end typesafe APIs',
    },
    {
      packagePattern: 'socket.io',
      id: 'socketio',
      name: 'Socket.IO',
      category: 'backend',
      description: 'Real-time bidirectional event-based communication',
    },

    // Styling
    {
      packagePattern: 'tailwindcss',
      id: 'tailwindcss',
      name: 'Tailwind CSS',
      category: 'styling',
      description: 'Utility-first CSS framework',
    },
    {
      packagePattern: 'postcss',
      id: 'postcss',
      name: 'PostCSS',
      category: 'styling',
      description: 'Tool for transforming CSS with plugins',
    },
    {
      packagePattern: 'sass',
      id: 'sass',
      name: 'Sass',
      category: 'styling',
      description: 'CSS with superpowers',
    },
    {
      packagePattern: 'styled-components',
      id: 'styled-components',
      name: 'Styled Components',
      category: 'styling',
      description: 'CSS-in-JS styling for React',
    },
    {
      packagePattern: '@emotion/react',
      id: 'emotion',
      name: 'Emotion',
      category: 'styling',
      description: 'Performant CSS-in-JS library',
    },
    {
      packagePattern: '@chakra-ui/react',
      id: 'chakra-ui',
      name: 'Chakra UI',
      category: 'styling',
      description: 'Modular and accessible component library',
    },
    {
      packagePattern: '@mui/material',
      id: 'material-ui',
      name: 'Material UI',
      category: 'styling',
      description: 'Comprehensive React UI component library',
    },
    {
      packagePattern: /^@radix-ui\/.*/,
      id: 'radix-ui',
      name: 'Radix UI',
      category: 'library',
      description: 'Unstyled, accessible UI component primitives',
    },

    // Build Tools & Bundlers
    {
      packagePattern: 'vite',
      id: 'vite',
      name: 'Vite',
      category: 'buildTool',
      description: 'Next generation frontend tooling',
    },
    {
      packagePattern: 'webpack',
      id: 'webpack',
      name: 'Webpack',
      category: 'buildTool',
      description: 'Static module bundler for JavaScript',
    },
    {
      packagePattern: 'rollup',
      id: 'rollup',
      name: 'Rollup',
      category: 'buildTool',
      description: 'Next-generation ES module bundler',
    },
    {
      packagePattern: 'turbo',
      id: 'turborepo',
      name: 'Turborepo',
      category: 'buildTool',
      description: 'High-performance build system for monorepos',
    },
    {
      packagePattern: 'esbuild',
      id: 'esbuild',
      name: 'esbuild',
      category: 'buildTool',
      description: 'Extremely fast JavaScript bundler',
    },
    {
      packagePattern: '@swc/core',
      id: 'swc',
      name: 'SWC',
      category: 'buildTool',
      description: 'Super-fast JavaScript/TypeScript compiler',
    },
    {
      packagePattern: 'babel-core',
      id: 'babel',
      name: 'Babel',
      category: 'buildTool',
      description: 'JavaScript compiler',
    },
    {
      packagePattern: '@babel/core',
      id: 'babel',
      name: 'Babel',
      category: 'buildTool',
      description: 'JavaScript compiler',
    },
    {
      packagePattern: 'tsup',
      id: 'tsup',
      name: 'tsup',
      category: 'buildTool',
      description: 'Bundle TypeScript libraries with no config',
    },

    // Databases, ORMs, Cloud Services
    {
      packagePattern: 'firebase',
      id: 'firebase',
      name: 'Firebase',
      category: 'service',
      description: 'Google application development platform',
    },
    {
      packagePattern: 'firebase-admin',
      id: 'firebase-admin',
      name: 'Firebase Admin',
      category: 'service',
      description: 'Firebase Admin SDK',
    },
    {
      packagePattern: '@supabase/supabase-js',
      id: 'supabase',
      name: 'Supabase',
      category: 'database',
      description: 'Open source Firebase alternative',
    },
    {
      packagePattern: 'prisma',
      id: 'prisma',
      name: 'Prisma',
      category: 'tooling',
      description: 'Next-generation Node.js & TypeScript ORM',
    },
    {
      packagePattern: '@prisma/client',
      id: 'prisma-client',
      name: 'Prisma Client',
      category: 'database',
      description: 'Auto-generated typesafe query builder',
    },
    {
      packagePattern: 'drizzle-orm',
      id: 'drizzle-orm',
      name: 'Drizzle ORM',
      category: 'database',
      description: 'TypeScript ORM with SQL-like syntax',
    },
    {
      packagePattern: 'mongoose',
      id: 'mongoose',
      name: 'Mongoose (MongoDB)',
      category: 'database',
      description: 'MongoDB object modeling tool',
    },
    {
      packagePattern: 'mongodb',
      id: 'mongodb',
      name: 'MongoDB Driver',
      category: 'database',
      description: 'Official MongoDB driver for Node.js',
    },
    {
      packagePattern: 'pg',
      id: 'postgresql-driver',
      name: 'PostgreSQL (pg)',
      category: 'database',
      description: 'Non-blocking PostgreSQL client',
    },
    {
      packagePattern: 'mysql2',
      id: 'mysql-driver',
      name: 'MySQL2',
      category: 'database',
      description: 'Fast MySQL driver for Node.js',
    },
    {
      packagePattern: 'redis',
      id: 'redis',
      name: 'Redis',
      category: 'database',
      description: 'In-memory data structure store',
    },
    {
      packagePattern: 'ioredis',
      id: 'ioredis',
      name: 'ioRedis',
      category: 'database',
      description: 'Robust Redis client for Node.js',
    },

    // Testing & Quality
    {
      packagePattern: 'jest',
      id: 'jest',
      name: 'Jest',
      category: 'testing',
      description: 'Delightful JavaScript Testing Framework',
    },
    {
      packagePattern: 'vitest',
      id: 'vitest',
      name: 'Vitest',
      category: 'testing',
      description: 'Vite-native testing framework',
    },
    {
      packagePattern: '@playwright/test',
      id: 'playwright',
      name: 'Playwright',
      category: 'testing',
      description: 'Fast and reliable end-to-end testing',
    },
    {
      packagePattern: 'cypress',
      id: 'cypress',
      name: 'Cypress',
      category: 'testing',
      description: 'Fast, easy and reliable browser testing',
    },
    {
      packagePattern: 'mocha',
      id: 'mocha',
      name: 'Mocha',
      category: 'testing',
      description: 'Feature-rich JavaScript test framework',
    },
    {
      packagePattern: 'eslint',
      id: 'eslint',
      name: 'ESLint',
      category: 'tooling',
      description: 'Pluggable JavaScript linter',
    },
    {
      packagePattern: 'prettier',
      id: 'prettier',
      name: 'Prettier',
      category: 'tooling',
      description: 'Opinionated code formatter',
    },
    {
      packagePattern: 'typescript',
      id: 'typescript',
      name: 'TypeScript',
      category: 'language',
      description: 'TypeScript compiler & type checker',
    },
  ];

  public async detect(context: DetectionContext): Promise<TechnologyInfo[]> {
    const results: TechnologyInfo[] = [];

    const pkgData = await context.readJsonConfig<PackageJsonData>('package.json');
    if (!pkgData) {
      return results;
    }

    // Always register Node.js runtime if package.json is present
    results.push({
      id: 'nodejs',
      name: 'Node.js',
      category: 'runtime',
      confidence: 1.0,
      evidence: [
        {
          source: 'package.json',
          type: 'manifest',
          detail: 'package.json manifest detected in workspace root',
        },
      ],
      description: 'JavaScript runtime environment built on V8',
    });

    const allDeps: Record<string, { version: string; section: string }> = {};

    const addSection = (deps: Record<string, string> | undefined, section: string) => {
      if (!deps) {
        return;
      }
      for (const [pkg, version] of Object.entries(deps)) {
        if (!allDeps[pkg]) {
          allDeps[pkg] = { version, section };
        }
      }
    };

    addSection(pkgData.dependencies, 'dependencies');
    addSection(pkgData.devDependencies, 'devDependencies');
    addSection(pkgData.peerDependencies, 'peerDependencies');
    addSection(pkgData.optionalDependencies, 'optionalDependencies');

    for (const rule of PackageJsonDetector.RULES) {
      let matchedPackage: string | null = null;

      if (typeof rule.packagePattern === 'string') {
        if (allDeps[rule.packagePattern]) {
          matchedPackage = rule.packagePattern;
        }
      } else {
        const foundKey = Object.keys(allDeps).find((k) => (rule.packagePattern as RegExp).test(k));
        if (foundKey) {
          matchedPackage = foundKey;
        }
      }

      if (matchedPackage) {
        const depInfo = allDeps[matchedPackage];
        const cleanVersion = this.cleanVersionString(depInfo.version);

        results.push({
          id: rule.id,
          name: rule.name,
          category: rule.category,
          version: cleanVersion,
          confidence: 1.0,
          evidence: [
            {
              source: 'package.json',
              type: 'dependency',
              detail: `${matchedPackage}@${depInfo.version} found in ${depInfo.section}`,
            },
          ],
          description: rule.description,
        });
      }
    }

    return results;
  }

  private cleanVersionString(rawVersion: string): string {
    if (!rawVersion) {
      return 'Unknown';
    }
    // Remove ^, ~, >=, <=, >, < prefixes cleanly for display
    const cleaned = rawVersion.replace(/^[\^~>=<]+/, '').trim();
    return cleaned || rawVersion;
  }
}
