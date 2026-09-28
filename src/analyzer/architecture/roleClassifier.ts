import * as path from 'path';
import { FileInspectionContext, RoleClassificationResult } from './contracts';

export class RoleClassifier {
  /**
   * Deterministically classifies the architectural role of a file based on observable evidence.
   */
  public classify(ctx: FileInspectionContext): RoleClassificationResult {
    const rawPath = ctx.relativePath.replace(/\\/g, '/');
    const originalBase = path.basename(rawPath);
    const normPath = rawPath.toLowerCase();
    const baseName = path.basename(normPath);
    const ext = path.extname(normPath);
    const content = ctx.content || '';

    // 1. Tests
    if (
      baseName.includes('.test.') ||
      baseName.includes('.spec.') ||
      baseName.startsWith('test_') ||
      normPath.includes('/__tests__/') ||
      normPath.includes('/tests/') ||
      normPath.includes('/specs/')
    ) {
      return {
        primaryRole: 'test',
        secondaryRoles: [],
        confidence: 1.0,
        confidenceLevel: 'high',
        evidence: [`Test naming convention or directory pattern: ${ctx.relativePath}`],
      };
    }

    // 2. Next.js App Router Page
    if (
      /^app\/(.+)?page\.(tsx|jsx|js|ts)$/.test(normPath) ||
      /\/app\/(.+)?page\.(tsx|jsx|js|ts)$/.test(normPath)
    ) {
      return {
        primaryRole: 'page',
        secondaryRoles: ['route', 'entry_point'],
        confidence: 1.0,
        confidenceLevel: 'high',
        evidence: [`Next.js App Router Page convention: ${ctx.relativePath}`],
      };
    }

    // 3. Next.js App Router Layout
    if (
      /^app\/(.+)?layout\.(tsx|jsx|js|ts)$/.test(normPath) ||
      /\/app\/(.+)?layout\.(tsx|jsx|js|ts)$/.test(normPath)
    ) {
      return {
        primaryRole: 'layout',
        secondaryRoles: ['component'],
        confidence: 1.0,
        confidenceLevel: 'high',
        evidence: [`Next.js App Router Layout convention: ${ctx.relativePath}`],
      };
    }

    // 4. Next.js Backend Route Handler (app/api/**/route.ts)
    if (
      /^app\/api\/(.+)?route\.(ts|js|mjs)$/.test(normPath) ||
      /\/app\/api\/(.+)?route\.(ts|js|mjs)$/.test(normPath)
    ) {
      return {
        primaryRole: 'backend_route',
        secondaryRoles: ['controller', 'entry_point'],
        confidence: 1.0,
        confidenceLevel: 'high',
        evidence: [`Next.js API Route Handler: ${ctx.relativePath}`],
      };
    }

    // 5. Next.js Pages Router (pages/**)
    if (normPath.startsWith('pages/') || normPath.includes('/pages/')) {
      if (normPath.includes('/api/') || normPath.startsWith('pages/api/')) {
        return {
          primaryRole: 'backend_route',
          secondaryRoles: ['controller'],
          confidence: 0.95,
          confidenceLevel: 'high',
          evidence: [`Pages Router API route: ${ctx.relativePath}`],
        };
      }
      if (baseName.startsWith('_app') || baseName.startsWith('_document')) {
        return {
          primaryRole: 'layout',
          secondaryRoles: ['entry_point'],
          confidence: 0.95,
          confidenceLevel: 'high',
          evidence: [`Next.js Pages special wrapper: ${ctx.relativePath}`],
        };
      }
      return {
        primaryRole: 'page',
        secondaryRoles: ['route', 'entry_point'],
        confidence: 0.95,
        confidenceLevel: 'high',
        evidence: [`Pages Router Page: ${ctx.relativePath}`],
      };
    }

    // 6. Middleware
    if (
      baseName.startsWith('middleware.') ||
      normPath.includes('/middleware/') ||
      normPath.includes('/middlewares/')
    ) {
      return {
        primaryRole: 'middleware',
        secondaryRoles: [],
        confidence: 0.95,
        confidenceLevel: 'high',
        evidence: [`Middleware convention: ${ctx.relativePath}`],
      };
    }

    // 7. React Custom Hooks (use*.ts, use*.tsx, hooks/**)
    if (/^use[A-Z0-9].*\.(ts|tsx|js|jsx)$/.test(originalBase) || normPath.includes('/hooks/')) {
      const hasHookCall =
        content.includes('useState') ||
        content.includes('useEffect') ||
        content.includes('useCallback');
      const evidence = [`Hook naming / directory convention: ${ctx.relativePath}`];
      if (hasHookCall) {
        evidence.push('Contains standard React hook invocations');
      }
      return {
        primaryRole: 'hook',
        secondaryRoles: ['utility'],
        confidence: 0.95,
        confidenceLevel: 'high',
        evidence,
      };
    }

    // 8. React Context / Provider
    if (
      baseName.includes('context') ||
      baseName.includes('provider') ||
      normPath.includes('/context/') ||
      normPath.includes('/contexts/') ||
      normPath.includes('/providers/') ||
      content.includes('createContext')
    ) {
      const evidence = [`Context / Provider pattern: ${ctx.relativePath}`];
      if (content.includes('createContext')) {
        evidence.push('Contains createContext invocation');
      }
      return {
        primaryRole: 'context',
        secondaryRoles: ['state_management'],
        confidence: 0.9,
        confidenceLevel: 'high',
        evidence,
      };
    }

    // 9. UI Components & Regular Components
    if (normPath.includes('/components/ui/') || normPath.includes('/ui/')) {
      return {
        primaryRole: 'ui_component',
        secondaryRoles: ['component'],
        confidence: 0.95,
        confidenceLevel: 'high',
        evidence: [`UI Component directory: ${ctx.relativePath}`],
      };
    }

    if (
      normPath.includes('/components/') ||
      normPath.includes('/views/') ||
      normPath.includes('/widgets/')
    ) {
      return {
        primaryRole: 'component',
        secondaryRoles: ['ui_component'],
        confidence: 0.9,
        confidenceLevel: 'high',
        evidence: [`Component directory: ${ctx.relativePath}`],
      };
    }

    // 10. Services
    if (
      normPath.includes('/services/') ||
      normPath.includes('/service/') ||
      baseName.includes('service.')
    ) {
      return {
        primaryRole: 'service',
        secondaryRoles: ['api_client'],
        confidence: 0.9,
        confidenceLevel: 'high',
        evidence: [`Service layer pattern: ${ctx.relativePath}`],
      };
    }

    // 11. API Clients / Network layer
    if (
      normPath.includes('/api/') ||
      normPath.includes('/client/') ||
      baseName.startsWith('api.') ||
      baseName.includes('client.')
    ) {
      return {
        primaryRole: 'api_client',
        secondaryRoles: ['service'],
        confidence: 0.85,
        confidenceLevel: 'high',
        evidence: [`API / Network client pattern: ${ctx.relativePath}`],
      };
    }

    // 12. State Management (Redux, Zustand, Recoil, Pinia)
    if (
      normPath.includes('/store/') ||
      normPath.includes('/stores/') ||
      normPath.includes('/slices/') ||
      normPath.includes('/redux/') ||
      normPath.includes('/zustand/')
    ) {
      return {
        primaryRole: 'state_management',
        secondaryRoles: ['service'],
        confidence: 0.9,
        confidenceLevel: 'high',
        evidence: [`State management directory: ${ctx.relativePath}`],
      };
    }

    // 13. Controllers
    if (
      normPath.includes('/controllers/') ||
      normPath.includes('/controller/') ||
      baseName.includes('controller.')
    ) {
      return {
        primaryRole: 'controller',
        secondaryRoles: ['backend_route'],
        confidence: 0.9,
        confidenceLevel: 'high',
        evidence: [`Controller layer pattern: ${ctx.relativePath}`],
      };
    }

    // 14. Repositories / Data Access
    if (
      normPath.includes('/repositories/') ||
      normPath.includes('/repository/') ||
      normPath.includes('/dao/') ||
      baseName.includes('repository.')
    ) {
      return {
        primaryRole: 'repository',
        secondaryRoles: ['service'],
        confidence: 0.9,
        confidenceLevel: 'high',
        evidence: [`Repository / Data Access layer: ${ctx.relativePath}`],
      };
    }

    // 15. Models / Domain Entities
    if (
      normPath.includes('/models/') ||
      normPath.includes('/model/') ||
      normPath.includes('/entities/') ||
      normPath.includes('/entity/') ||
      baseName.includes('model.')
    ) {
      return {
        primaryRole: 'model',
        secondaryRoles: ['schema'],
        confidence: 0.85,
        confidenceLevel: 'high',
        evidence: [`Domain Model / Entity pattern: ${ctx.relativePath}`],
      };
    }

    // 16. Schemas
    if (
      normPath.includes('/schemas/') ||
      normPath.includes('/schema/') ||
      baseName.includes('schema.')
    ) {
      return {
        primaryRole: 'schema',
        secondaryRoles: ['type_definition'],
        confidence: 0.9,
        confidenceLevel: 'high',
        evidence: [`Validation / Data Schema pattern: ${ctx.relativePath}`],
      };
    }

    // 17. Type Definitions & Interfaces
    if (
      ext === '.d.ts' ||
      normPath.includes('/types/') ||
      normPath.includes('/interfaces/') ||
      baseName.startsWith('types.') ||
      baseName.startsWith('interface.')
    ) {
      return {
        primaryRole: 'type_definition',
        secondaryRoles: [],
        confidence: 0.95,
        confidenceLevel: 'high',
        evidence: [`Type definition / Interface pattern: ${ctx.relativePath}`],
      };
    }

    // 18. Constants
    if (
      normPath.includes('/constants/') ||
      normPath.includes('/consts/') ||
      baseName.startsWith('constants.') ||
      baseName.startsWith('consts.')
    ) {
      return {
        primaryRole: 'constant',
        secondaryRoles: ['utility'],
        confidence: 0.9,
        confidenceLevel: 'high',
        evidence: [`Constants module: ${ctx.relativePath}`],
      };
    }

    // 19. Utilities & Helpers
    if (
      normPath.includes('/utils/') ||
      normPath.includes('/helpers/') ||
      normPath.includes('/lib/') ||
      baseName.startsWith('utils.') ||
      baseName.startsWith('helper.') ||
      baseName.startsWith('helpers.')
    ) {
      return {
        primaryRole: 'utility',
        secondaryRoles: [],
        confidence: 0.85,
        confidenceLevel: 'high',
        evidence: [`Utility / Helper pattern: ${ctx.relativePath}`],
      };
    }

    // 20. Workers & Background Tasks
    if (
      normPath.includes('/workers/') ||
      normPath.includes('/jobs/') ||
      normPath.includes('/tasks/') ||
      baseName.includes('worker.')
    ) {
      return {
        primaryRole: 'worker',
        secondaryRoles: ['service'],
        confidence: 0.85,
        confidenceLevel: 'high',
        evidence: [`Background Worker / Task pattern: ${ctx.relativePath}`],
      };
    }

    // 21. Config Files
    if (
      baseName.includes('config.') ||
      baseName.startsWith('tsconfig') ||
      baseName === 'package.json' ||
      baseName.endsWith('rc') ||
      baseName.endsWith('rc.json') ||
      baseName.endsWith('rc.js')
    ) {
      return {
        primaryRole: 'config',
        secondaryRoles: [],
        confidence: 0.95,
        confidenceLevel: 'high',
        evidence: [`Configuration file: ${ctx.relativePath}`],
      };
    }

    // 22. JSX/TSX Component inspection fallback
    if (
      (ext === '.tsx' || ext === '.jsx') &&
      (content.includes('return <') ||
        content.includes('return (') ||
        content.includes('export default function') ||
        content.includes('export const'))
    ) {
      return {
        primaryRole: 'component',
        secondaryRoles: ['ui_component'],
        confidence: 0.7,
        confidenceLevel: 'medium',
        evidence: [`TSX/JSX component structure: ${ctx.relativePath}`],
      };
    }

    // 23. Unknown / Unclassified
    return {
      primaryRole: 'unknown',
      secondaryRoles: [],
      confidence: 0.2,
      confidenceLevel: 'low',
      evidence: [`No strong architectural convention matched for ${ctx.relativePath}`],
    };
  }
}
