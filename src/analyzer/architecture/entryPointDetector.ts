import * as path from 'path';
import { ArchitecturalModule } from './contracts';

export class EntryPointDetector {
  /**
   * Deterministically determines if a module acts as an application or route entry point.
   */
  public isEntryPoint(relativePath: string, role: string): boolean {
    const norm = relativePath.replace(/\\/g, '/').toLowerCase();
    const base = path.basename(norm);

    // 1. Next.js Routes / Pages
    if (role === 'page' || role === 'backend_route') {
      return true;
    }

    // 2. React / Frontend main entry points
    if (
      base === 'main.tsx' ||
      base === 'main.jsx' ||
      base === 'main.ts' ||
      base === 'main.js' ||
      base === 'index.tsx' ||
      base === 'index.jsx' ||
      norm === 'src/app.tsx' ||
      norm === 'src/app.jsx' ||
      norm === 'src/index.ts' ||
      norm === 'src/index.js'
    ) {
      return true;
    }

    // 3. Backend server entry points
    if (
      base === 'server.ts' ||
      base === 'server.js' ||
      base === 'app.ts' ||
      base === 'app.js' ||
      base === 'main.py' ||
      base === 'app.py' ||
      base === 'manage.py' ||
      base === 'wsgi.py' ||
      base === 'asgi.py'
    ) {
      return true;
    }

    // 4. VS Code Extension entry points
    if (base === 'extension.ts' || base === 'extension.js' || norm === 'src/extension.ts') {
      return true;
    }

    return false;
  }

  /**
   * Collects all verified entry points from the architecture modules map.
   */
  public filterEntryPoints(modules: Record<string, ArchitecturalModule>): ArchitecturalModule[] {
    return Object.values(modules).filter((m) => m.isEntryPoint);
  }
}
