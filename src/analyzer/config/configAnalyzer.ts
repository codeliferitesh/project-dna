import {
  ConfigCategory,
  ConfigurationAnalysisResult,
  FileNode,
  ProjectConfigFile,
} from '../../models';

interface ConfigRule {
  pattern: RegExp;
  category: ConfigCategory;
  technology: string;
  purpose: string;
}

export class ConfigAnalyzer {
  private static readonly RULES: ConfigRule[] = [
    // Package & Dependencies
    {
      pattern: /^package\.json$/i,
      category: 'package',
      technology: 'Node.js / npm',
      purpose: 'Defines npm packages, project dependencies, and lifecycle scripts',
    },
    {
      pattern: /^(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/i,
      category: 'package',
      technology: 'Package Manager',
      purpose: 'Deterministic lockfile pinning exact dependency versions',
    },
    {
      pattern: /^(?:requirements\.txt|Pipfile|Pipfile\.lock|pyproject\.toml)$/i,
      category: 'package',
      technology: 'Python',
      purpose: 'Defines Python packages, dependencies, and environment setup',
    },
    {
      pattern: /^Cargo\.(?:toml|lock)$/i,
      category: 'package',
      technology: 'Rust / Cargo',
      purpose: 'Rust package manifest and lockfile',
    },
    {
      pattern: /^go\.(?:mod|sum)$/i,
      category: 'package',
      technology: 'Go Modules',
      purpose: 'Go module definition and dependency checksums',
    },
    {
      pattern: /^(?:pom\.xml|build\.gradle|build\.gradle\.kts|settings\.gradle)$/i,
      category: 'package',
      technology: 'Java / Maven / Gradle',
      purpose: 'Build automation and dependency management for JVM projects',
    },
    {
      pattern: /^(?:composer\.json|composer\.lock)$/i,
      category: 'package',
      technology: 'PHP / Composer',
      purpose: 'Composer dependency manifest and lockfile',
    },
    {
      pattern: /^Gemfile(?:\.lock)?$/i,
      category: 'package',
      technology: 'Ruby / Bundler',
      purpose: 'Ruby Gem dependency manifest',
    },

    // Compiler & Transpilation
    {
      pattern: /^tsconfig(?:\..+)?\.json$/i,
      category: 'compiler',
      technology: 'TypeScript',
      purpose: 'Configures TypeScript compiler options, paths, and type checking rules',
    },
    {
      pattern: /^jsconfig(?:\..+)?\.json$/i,
      category: 'compiler',
      technology: 'JavaScript',
      purpose: 'Root configuration for JavaScript language service and path aliases',
    },
    {
      pattern: /^(?:babel\.config\.(?:js|mjs|cjs|json)|\.babelrc(?:\.json)?)$/i,
      category: 'compiler',
      technology: 'Babel',
      purpose: 'Configures Babel transpilation presets and plugins',
    },
    {
      pattern: /^\.swcrc$/i,
      category: 'compiler',
      technology: 'SWC',
      purpose: 'Fast Rust-based JavaScript/TypeScript compiler configuration',
    },

    // Framework
    {
      pattern: /^next\.config\.(?:js|mjs|ts)$/i,
      category: 'framework',
      technology: 'Next.js',
      purpose: 'Configures Next.js routing, image optimization, headers, and build behavior',
    },
    {
      pattern: /^remix\.config\.(?:js|mjs|ts)$/i,
      category: 'framework',
      technology: 'Remix',
      purpose: 'Configures Remix server and client bundling options',
    },
    {
      pattern: /^astro\.config\.(?:js|mjs|ts)$/i,
      category: 'framework',
      technology: 'Astro',
      purpose: 'Configures Astro integrations, output modes, and build pipeline',
    },
    {
      pattern: /^nuxt\.config\.(?:js|mjs|ts)$/i,
      category: 'framework',
      technology: 'Nuxt',
      purpose: 'Configures Nuxt modules, plugins, and SSR configuration',
    },
    {
      pattern: /^svelte\.config\.(?:js|mjs|ts|cjs)$/i,
      category: 'framework',
      technology: 'SvelteKit / Svelte',
      purpose: 'Configures Svelte preprocessing and SvelteKit adapters',
    },
    {
      pattern: /^vue\.config\.(?:js|ts)$/i,
      category: 'framework',
      technology: 'Vue CLI',
      purpose: 'Configures Vue CLI build setup',
    },
    {
      pattern: /^angular\.json$/i,
      category: 'framework',
      technology: 'Angular CLI',
      purpose: 'Configures Angular workspace projects, build targets, and assets',
    },
    {
      pattern: /^gatsby-config\.(?:js|ts)$/i,
      category: 'framework',
      technology: 'Gatsby',
      purpose: 'Configures Gatsby plugins and metadata',
    },

    // Build & Bundlers
    {
      pattern: /^vite\.config\.(?:js|mjs|ts|cjs)$/i,
      category: 'build',
      technology: 'Vite',
      purpose: 'Configures Vite development server, build plugins, and asset bundling',
    },
    {
      pattern: /^webpack\.config\.(?:js|mjs|ts|cjs)$/i,
      category: 'build',
      technology: 'Webpack',
      purpose: 'Configures Webpack module loaders, plugins, and optimization chunks',
    },
    {
      pattern: /^rollup\.config\.(?:js|mjs|ts)$/i,
      category: 'build',
      technology: 'Rollup',
      purpose: 'Configures Rollup ES module bundler output and plugins',
    },
    {
      pattern: /^turbo\.json$/i,
      category: 'build',
      technology: 'Turborepo',
      purpose: 'Configures monorepo task pipeline, caching, and dependency graph',
    },
    {
      pattern: /^lerna\.json$/i,
      category: 'build',
      technology: 'Lerna',
      purpose: 'Configures multi-package repository management and versioning',
    },

    // Styling
    {
      pattern: /^tailwind\.config\.(?:js|cjs|mjs|ts)$/i,
      category: 'styling',
      technology: 'Tailwind CSS',
      purpose: 'Defines Tailwind CSS theme extensions, plugins, and content purge paths',
    },
    {
      pattern: /^postcss\.config\.(?:js|cjs|mjs|ts|json)$/i,
      category: 'styling',
      technology: 'PostCSS',
      purpose: 'Configures PostCSS transformations (e.g. Tailwind, Autoprefixer)',
    },
    {
      pattern: /^(?:\.stylelintrc(?:\.json|\.js|\.yml)?|stylelint\.config\.(?:js|cjs))$/i,
      category: 'styling',
      technology: 'Stylelint',
      purpose: 'Configures CSS/SCSS linting rules and style consistency',
    },

    // Linting
    {
      pattern:
        /^(?:eslint\.config\.(?:js|mjs|ts|cjs)|\.eslintrc(?:\.json|\.js|\.cjs|\.yml|\.yaml)?|\.eslintignore)$/i,
      category: 'linting',
      technology: 'ESLint',
      purpose: 'Defines JavaScript/TypeScript code quality rules, parser options, and plugins',
    },
    {
      pattern: /^(?:ruff\.toml|\.flake8|pylintrc|\.pylintrc)$/i,
      category: 'linting',
      technology: 'Python Linter',
      purpose: 'Configures Python code linting, formatting, and syntax validation',
    },

    // Formatting
    {
      pattern:
        /^(?:\.prettierrc(?:\.json|\.js|\.cjs|\.yml|\.yaml)?|prettier\.config\.(?:js|cjs|mjs))$/i,
      category: 'formatting',
      technology: 'Prettier',
      purpose: 'Configures automatic code formatting styles, tabs, and print width',
    },
    {
      pattern: /^\.editorconfig$/i,
      category: 'formatting',
      technology: 'EditorConfig',
      purpose: 'Defines consistent indentation, charsets, and line endings across IDEs',
    },

    // Database & Cloud Data
    {
      pattern: /^firebase\.json$/i,
      category: 'database',
      technology: 'Firebase',
      purpose: 'Configures Firebase hosting, emulators, functions, and database rules',
    },
    {
      pattern: /^firestore\.rules$/i,
      category: 'database',
      technology: 'Cloud Firestore',
      purpose: 'Security and access control rules for Cloud Firestore databases',
    },
    {
      pattern: /^firestore\.indexes\.json$/i,
      category: 'database',
      technology: 'Cloud Firestore',
      purpose: 'Defines composite indexes for Cloud Firestore queries',
    },
    {
      pattern: /^storage\.rules$/i,
      category: 'database',
      technology: 'Firebase Storage',
      purpose: 'Defines access control and security rules for Cloud Storage buckets',
    },
    {
      pattern: /^schema\.prisma$/i,
      category: 'database',
      technology: 'Prisma ORM',
      purpose: 'Prisma database schema, data models, and migration declarations',
    },
    {
      pattern: /^drizzle\.config\.(?:js|ts|json)$/i,
      category: 'database',
      technology: 'Drizzle ORM',
      purpose: 'Configures Drizzle ORM schema path, dialect, and migrations folder',
    },

    // Deployment & Cloud
    {
      pattern: /^vercel\.json$/i,
      category: 'deployment',
      technology: 'Vercel',
      purpose: 'Configures Vercel edge functions, redirects, rewrites, and headers',
    },
    {
      pattern: /^netlify\.toml$/i,
      category: 'deployment',
      technology: 'Netlify',
      purpose: 'Configures Netlify build command, publish dir, redirects, and edge functions',
    },
    {
      pattern: /^wrangler\.toml$/i,
      category: 'deployment',
      technology: 'Cloudflare Workers',
      purpose: 'Configures Cloudflare Workers, KV namespaces, and D1 bindings',
    },
    {
      pattern: /^fly\.toml$/i,
      category: 'deployment',
      technology: 'Fly.io',
      purpose: 'Configures Fly.io app services, ports, mounts, and VM resources',
    },

    // Containerization
    {
      pattern: /^(?:Dockerfile(?:\..+)?|Containerfile)$/i,
      category: 'container',
      technology: 'Docker',
      purpose: 'Defines container build steps, base image, environment, and entrypoint',
    },
    {
      pattern: /^(?:docker-compose(?:\..+)?\.(?:yml|yaml)|\.dockerignore)$/i,
      category: 'container',
      technology: 'Docker Compose',
      purpose: 'Multi-container orchestration, services, volumes, and port mappings',
    },

    // Runtime
    {
      pattern: /^(?:\.nvmrc|\.node-version|\.python-version|\.tool-versions)$/i,
      category: 'runtime',
      technology: 'Runtime Manager',
      purpose: 'Locks runtime version for Node.js, Python, or asdf environment',
    },

    // Testing
    {
      pattern:
        /^(?:jest\.config\.(?:js|ts|mjs|cjs|json)|vitest\.config\.(?:js|ts|mjs)|playwright\.config\.(?:js|ts)|cypress\.config\.(?:js|ts)|pytest\.ini)$/i,
      category: 'testing',
      technology: 'Test Runner',
      purpose: 'Configures automated test environments, matchers, coverage, and fixtures',
    },
  ];

  /**
   * Scans discovered files and matches real workspace configuration files deterministically.
   */
  public analyze(fileTree: FileNode | null): ConfigurationAnalysisResult {
    if (!fileTree) {
      return this.emptyResult();
    }

    const allFiles: FileNode[] = [];
    this.collectFiles(fileTree, allFiles);

    const configs: ProjectConfigFile[] = [];
    const categoryCounts: Record<ConfigCategory, number> = {
      package: 0,
      compiler: 0,
      framework: 0,
      build: 0,
      styling: 0,
      linting: 0,
      formatting: 0,
      deployment: 0,
      database: 0,
      cloud: 0,
      container: 0,
      runtime: 0,
      testing: 0,
      other: 0,
    };

    for (const file of allFiles) {
      const fileName = file.name;
      const relPath = file.relativePath.replace(/\\/g, '/');

      // Match against config rules
      for (const rule of ConfigAnalyzer.RULES) {
        if (rule.pattern.test(fileName)) {
          const configItem: ProjectConfigFile = {
            id: `config-${relPath}`,
            filePath: relPath,
            fileName: fileName,
            category: rule.category,
            technology: rule.technology,
            purpose: rule.purpose,
            evidence: [
              `Workspace file: ${relPath}`,
              `Matched configuration rule: ${rule.technology} (${rule.category})`,
            ],
          };

          configs.push(configItem);
          categoryCounts[rule.category]++;
          break;
        }
      }
    }

    // Sort configs by category and then relative path
    configs.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.filePath.localeCompare(b.filePath);
    });

    return {
      configs,
      categoryCounts,
      totalConfigs: configs.length,
    };
  }

  private emptyResult(): ConfigurationAnalysisResult {
    return {
      configs: [],
      categoryCounts: {
        package: 0,
        compiler: 0,
        framework: 0,
        build: 0,
        styling: 0,
        linting: 0,
        formatting: 0,
        deployment: 0,
        database: 0,
        cloud: 0,
        container: 0,
        runtime: 0,
        testing: 0,
        other: 0,
      },
      totalConfigs: 0,
    };
  }

  private collectFiles(node: FileNode, list: FileNode[]): void {
    if (node.type === 'file') {
      list.push(node);
    } else if (node.children) {
      for (const child of node.children) {
        this.collectFiles(child, list);
      }
    }
  }
}
