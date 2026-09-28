import { TechnologyInfo } from '../../models';
import { DetectionContext, ITechnologyDetector } from './detectorInterface';

export class DatabaseDetector implements ITechnologyDetector {
  public readonly id = 'databaseDetector';
  public readonly name = 'Database & ORM Configuration Detector';

  public async detect(context: DetectionContext): Promise<TechnologyInfo[]> {
    const results: TechnologyInfo[] = [];

    // 1. Prisma Schema analysis
    const prismaSchemaPath = Array.from(context.allRelativeFilePaths).find(
      (p) => p.endsWith('schema.prisma') || p === 'prisma/schema.prisma'
    );

    if (prismaSchemaPath) {
      results.push({
        id: 'prisma',
        name: 'Prisma',
        category: 'database',
        confidence: 1.0,
        evidence: [
          {
            source: prismaSchemaPath,
            type: 'schema',
            detail: `Prisma schema file detected at ${prismaSchemaPath}`,
          },
        ],
        description: 'Next-generation ORM for Node.js and TypeScript',
      });

      // Safely check datasource provider in schema without reading entire file if large
      const schemaContent = await context.readConfigFile(prismaSchemaPath);
      if (schemaContent) {
        const providerMatch = schemaContent.match(/provider\s*=\s*["']([^"']+)["']/i);
        if (providerMatch) {
          const provider = providerMatch[1].toLowerCase();
          const providerMap: Record<string, { id: string; name: string }> = {
            postgresql: { id: 'postgresql', name: 'PostgreSQL' },
            postgres: { id: 'postgresql', name: 'PostgreSQL' },
            mysql: { id: 'mysql', name: 'MySQL' },
            sqlite: { id: 'sqlite', name: 'SQLite' },
            mongodb: { id: 'mongodb', name: 'MongoDB' },
            sqlserver: { id: 'sqlserver', name: 'SQL Server' },
            cockroachdb: { id: 'cockroachdb', name: 'CockroachDB' },
          };

          if (providerMap[provider]) {
            const db = providerMap[provider];
            results.push({
              id: db.id,
              name: db.name,
              category: 'database',
              confidence: 0.9,
              evidence: [
                {
                  source: prismaSchemaPath,
                  type: 'schema',
                  detail: `Prisma datasource provider configured for ${db.name}`,
                },
              ],
              description: `${db.name} database`,
            });
          }
        }
      }
    }

    // 2. Drizzle ORM
    const drizzleConfig = Array.from(context.allRelativeFilePaths).find((p) =>
      p.toLowerCase().includes('drizzle.config.')
    );
    if (drizzleConfig) {
      results.push({
        id: 'drizzle-orm',
        name: 'Drizzle ORM',
        category: 'database',
        confidence: 1.0,
        evidence: [
          {
            source: drizzleConfig,
            type: 'configuration',
            detail: `Drizzle ORM configuration file: ${drizzleConfig}`,
          },
        ],
        description: 'TypeScript ORM with maximum type safety',
      });
    }

    // 3. Supabase configuration
    const hasSupabaseConfig = Array.from(context.allRelativeFilePaths).some(
      (p) => p.startsWith('supabase/') || p.endsWith('supabase/config.toml')
    );
    if (hasSupabaseConfig) {
      results.push({
        id: 'supabase',
        name: 'Supabase',
        category: 'database',
        confidence: 1.0,
        evidence: [
          {
            source: 'supabase/',
            type: 'configuration',
            detail: 'Supabase local workspace configuration detected',
          },
        ],
        description: 'Open source Firebase alternative with PostgreSQL backend',
      });
    }

    return results;
  }
}
