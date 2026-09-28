import * as fs from 'fs';
import * as path from 'path';
import { ApiAnalysisResult, ApiEndpoint, FileNode, HttpMethod } from '../../models';

export class ApiAnalyzer {
  private static readonly MAX_FILE_SIZE_BYTES = 1.5 * 1024 * 1024; // 1.5MB safeguard

  /**
   * Analyzes API routes across Next.js, Express, FastAPI, Flask, and Spring Boot.
   * Also identifies project frameworks generically from manifests, configs, and source patterns.
   */
  public async analyze(
    workspaceRoot: string,
    fileTree: FileNode | null,
    detectedTechnologies?: { name: string; category: string }[]
  ): Promise<ApiAnalysisResult> {
    if (!fileTree) {
      return this.emptyResult();
    }

    const allFiles: FileNode[] = [];
    this.collectFiles(fileTree, allFiles);

    const endpoints: ApiEndpoint[] = [];
    const frameworksSet = new Set<string>();

    // 1. Detect frameworks from workspace manifests, configs, and dependencies
    const workspaceFrameworks = await this.detectWorkspaceFrameworks(workspaceRoot, allFiles);
    workspaceFrameworks.forEach((fw) => frameworksSet.add(fw));

    // 2. Incorporate any relevant frameworks already discovered by TechnologyDetector
    if (detectedTechnologies) {
      const supportedFrameworkNames = [
        'Next.js',
        'Express',
        'FastAPI',
        'Flask',
        'Spring Boot',
        'NestJS',
        'Fastify',
        'Django',
      ];
      for (const tech of detectedTechnologies) {
        if (supportedFrameworkNames.includes(tech.name)) {
          frameworksSet.add(tech.name);
        }
      }
    }

    // 3. Scan code files for route endpoints
    let processedCount = 0;
    for (const file of allFiles) {
      processedCount++;
      if (processedCount % 25 === 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }

      try {
        const relPath = file.relativePath.replace(/\\/g, '/');
        const ext = (file.extension || path.extname(file.name)).toLowerCase();

        // 1. Next.js App Router (app/**/api/**/route.(ts|tsx|js|jsx) or app/**/route.(ts|tsx|js|jsx))
        if (this.isNextAppRouteFile(relPath, ext)) {
          frameworksSet.add('Next.js');
          const nextAppEndpoints = await this.analyzeNextAppRouter(workspaceRoot, file, relPath);
          endpoints.push(...nextAppEndpoints);
          continue;
        }

        // 2. Next.js Pages Router (pages/api/**)
        if (this.isNextPagesRouteFile(relPath, ext)) {
          frameworksSet.add('Next.js');
          const nextPagesEndpoints = await this.analyzeNextPagesRouter(
            workspaceRoot,
            file,
            relPath
          );
          endpoints.push(...nextPagesEndpoints);
          continue;
        }

        // 3. Express / Node.js API routes (JS / TS files)
        if (['.js', '.ts', '.mjs', '.cjs', '.jsx', '.tsx'].includes(ext)) {
          const expressEndpoints = await this.analyzeExpress(workspaceRoot, file, relPath);
          if (expressEndpoints.length > 0) {
            frameworksSet.add('Express');
            endpoints.push(...expressEndpoints);
          }
        }

        // 4. Python API routes (FastAPI / Flask)
        if (ext === '.py') {
          const pythonEndpoints = await this.analyzePythonRoutes(workspaceRoot, file, relPath);
          if (pythonEndpoints.length > 0) {
            pythonEndpoints.forEach((e) => frameworksSet.add(e.framework));
            endpoints.push(...pythonEndpoints);
          }
        }

        // 5. Spring Boot API routes (Java / Kotlin)
        if (ext === '.java' || ext === '.kt') {
          const springEndpoints = await this.analyzeSpringBoot(workspaceRoot, file, relPath);
          if (springEndpoints.length > 0) {
            frameworksSet.add('Spring Boot');
            endpoints.push(...springEndpoints);
          }
        }
      } catch {
        // Individual file failure must never crash whole API analyzer
      }
    }

    return this.buildResult(endpoints, Array.from(frameworksSet));
  }

  /**
   * Proactively scans workspace manifests and configuration files to detect frameworks.
   */
  private async detectWorkspaceFrameworks(
    workspaceRoot: string,
    allFiles: FileNode[]
  ): Promise<Set<string>> {
    const frameworks = new Set<string>();

    for (const file of allFiles) {
      const fileName = file.name.toLowerCase();

      // Next.js config files
      if (/^next\.config\.(?:js|mjs|ts)$/i.test(fileName)) {
        frameworks.add('Next.js');
      }

      // package.json inspection
      if (fileName === 'package.json') {
        const content = await this.readFileSafe(path.join(workspaceRoot, file.relativePath));
        if (content) {
          try {
            const pkg = JSON.parse(content);
            const allDeps = {
              ...pkg.dependencies,
              ...pkg.devDependencies,
            };
            if ('next' in allDeps) {
              frameworks.add('Next.js');
            }
            if ('express' in allDeps) {
              frameworks.add('Express');
            }
          } catch {
            // safe fallback
          }
        }
      }

      // Python requirements or pyproject
      if (['requirements.txt', 'pyproject.toml', 'pipfile'].includes(fileName)) {
        const content = await this.readFileSafe(path.join(workspaceRoot, file.relativePath));
        if (content) {
          if (/fastapi/i.test(content)) {
            frameworks.add('FastAPI');
          }
          if (/flask/i.test(content)) {
            frameworks.add('Flask');
          }
        }
      }

      // Java build files
      if (['pom.xml', 'build.gradle', 'build.gradle.kts'].includes(fileName)) {
        const content = await this.readFileSafe(path.join(workspaceRoot, file.relativePath));
        if (content && /spring-boot/i.test(content)) {
          frameworks.add('Spring Boot');
        }
      }
    }

    return frameworks;
  }

  // ==========================================
  // NEXT.JS APP ROUTER
  // ==========================================

  private isNextAppRouteFile(relPath: string, ext: string): boolean {
    if (!['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext)) {
      return false;
    }
    const normalized = relPath.toLowerCase();
    const isAppDir = normalized.includes('/app/') || normalized.startsWith('app/');
    const isRouteFile =
      /\/route\.(ts|tsx|js|jsx|mjs)$/i.test(normalized) ||
      /^route\.(ts|tsx|js|jsx|mjs)$/i.test(normalized);
    return isAppDir && isRouteFile;
  }

  private async analyzeNextAppRouter(
    workspaceRoot: string,
    file: FileNode,
    relPath: string
  ): Promise<ApiEndpoint[]> {
    const endpoints: ApiEndpoint[] = [];
    const content = await this.readFileSafe(path.join(workspaceRoot, file.relativePath));
    if (!content) {
      return endpoints;
    }

    // Derive route path from directory
    // e.g. src/app/api/users/route.ts -> /api/users
    // app/api/auth/[...nextauth]/route.ts -> /api/auth/[...nextauth]
    const appIndex = relPath.indexOf('app/');
    let routePath = '/';
    if (appIndex !== -1) {
      const afterApp = relPath.substring(appIndex + 4);
      const dirOnly = path.dirname(afterApp).replace(/\\/g, '/');
      routePath = dirOnly === '.' ? '/' : `/${dirOnly}`;
      // Clean up route grouping segments like (auth) or (marketing) if needed, but preserve parameters like [id]
      routePath = routePath.replace(/\/+\([^)]+\)/g, '');
      if (!routePath.startsWith('/')) {
        routePath = `/${routePath}`;
      }
    }

    const httpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    const lines = content.split('\n');

    for (const method of httpMethods) {
      // Look for: export async function GET, export function GET, export const GET =
      const exportFuncRegex = new RegExp(
        `export\\s+(?:async\\s+)?(?:function\\s+${method}|const\\s+${method}\\s*=|let\\s+${method}\\s*=|\\{\\s*[^}]*?\\b(?:\\w+\\s+as\\s+)?${method}\\b[^}]*\\})`,
        'm'
      );

      if (exportFuncRegex.test(content)) {
        // Find line number
        let lineNumber = 1;
        for (let i = 0; i < lines.length; i++) {
          if (exportFuncRegex.test(lines[i])) {
            lineNumber = i + 1;
            break;
          }
        }

        endpoints.push({
          id: `next-app-${relPath}-${method}-${routePath}`,
          method,
          path: routePath,
          sourceFile: relPath,
          filePath: relPath,
          framework: 'Next.js',
          confidence: 0.98,
          handlerName: method,
          lineNumber,
          evidence: [
            `Next.js App Router route file: ${relPath}`,
            `Exported HTTP handler: ${method} (line ${lineNumber})`,
          ],
        });
      }
    }

    return endpoints;
  }

  // ==========================================
  // NEXT.JS PAGES ROUTER
  // ==========================================

  private isNextPagesRouteFile(relPath: string, ext: string): boolean {
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      return false;
    }
    const normalized = relPath.toLowerCase();
    const isPagesApi = normalized.includes('/pages/api/') || normalized.startsWith('pages/api/');
    return isPagesApi;
  }

  private async analyzeNextPagesRouter(
    workspaceRoot: string,
    file: FileNode,
    relPath: string
  ): Promise<ApiEndpoint[]> {
    const endpoints: ApiEndpoint[] = [];
    const content = await this.readFileSafe(path.join(workspaceRoot, file.relativePath));
    if (!content) {
      return endpoints;
    }

    // Derive route path: e.g. src/pages/api/users/[id].ts -> /api/users/[id]
    const pagesIndex = relPath.indexOf('pages/api/');
    let routePath = '/api';
    if (pagesIndex !== -1) {
      let subPath = relPath.substring(pagesIndex + 6); // remove "pages/"
      subPath = subPath.replace(/\.[^.]+$/, ''); // remove ext
      if (subPath.endsWith('/index')) {
        subPath = subPath.substring(0, subPath.length - 6);
      }
      routePath = `/${subPath}`;
    }

    // Inspect if specific req.method checks exist
    const detectedMethods = new Set<HttpMethod>();
    const methodMatches = content.matchAll(
      /req\.method\s*===?\s*['"](GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)['"]/g
    );
    for (const match of methodMatches) {
      detectedMethods.add(match[1].toUpperCase() as HttpMethod);
    }

    // Also check switch (req.method) { case 'GET': ... }
    const switchMatches = content.matchAll(
      /case\s+['"](GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)['"]/g
    );
    for (const match of switchMatches) {
      detectedMethods.add(match[1].toUpperCase() as HttpMethod);
    }

    if (detectedMethods.size > 0) {
      for (const method of detectedMethods) {
        endpoints.push({
          id: `next-pages-${relPath}-${method}-${routePath}`,
          method,
          path: routePath,
          sourceFile: relPath,
          filePath: relPath,
          framework: 'Next.js',
          confidence: 0.95,
          handlerName: 'handler',
          evidence: [
            `Next.js Pages Router API handler in ${relPath}`,
            `Explicit method check for req.method === '${method}'`,
          ],
        });
      }
    } else {
      // Default handler
      endpoints.push({
        id: `next-pages-${relPath}-ALL-${routePath}`,
        method: 'OTHER',
        path: routePath,
        sourceFile: relPath,
        filePath: relPath,
        framework: 'Next.js',
        confidence: 0.9,
        handlerName: 'default export',
        evidence: [
          `Next.js Pages Router API file in ${relPath}`,
          'Default API request handler export',
        ],
      });
    }

    return endpoints;
  }

  // ==========================================
  // EXPRESS ROUTE DETECTION
  // ==========================================

  private async analyzeExpress(
    workspaceRoot: string,
    file: FileNode,
    relPath: string
  ): Promise<ApiEndpoint[]> {
    const endpoints: ApiEndpoint[] = [];
    const content = await this.readFileSafe(path.join(workspaceRoot, file.relativePath));
    if (!content) {
      return endpoints;
    }

    // Quick filter: check if file mentions express or router or app.(get|post|put|delete)
    if (!/(?:express|router|app\.(?:get|post|put|patch|delete))/i.test(content)) {
      return endpoints;
    }

    const lines = content.split('\n');
    const expressMethodRegex =
      /(?:app|router)\s*\.\s*(get|post|put|patch|delete|options|head)\s*\(\s*(['"`].*?['"`]|[^,)\n]+)/gi;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match: RegExpExecArray | null;
      while ((match = expressMethodRegex.exec(line)) !== null) {
        const methodStr = match[1].toUpperCase() as HttpMethod;
        const rawPathArg = match[2].trim();

        let endpointPath = '';
        let isDynamic = false;
        let evidenceDesc = '';

        // Check if literal string
        const strMatch = rawPathArg.match(/^['"`](.*?)['"`]$/);
        if (strMatch) {
          endpointPath = strMatch[1];
          evidenceDesc = `Literal route string: '${endpointPath}'`;
        } else {
          endpointPath = 'Unknown / dynamic route';
          isDynamic = true;
          evidenceDesc = `Dynamic or computed route argument: ${rawPathArg}`;
        }

        endpoints.push({
          id: `express-${relPath}-${methodStr}-${endpointPath}-${i + 1}`,
          method: methodStr,
          path: endpointPath,
          sourceFile: relPath,
          filePath: relPath,
          framework: 'Express',
          confidence: isDynamic ? 0.75 : 0.92,
          lineNumber: i + 1,
          isDynamic,
          evidence: [`Express route definition (${match[0].slice(0, 40)}...)`, evidenceDesc],
        });
      }
    }

    return endpoints;
  }

  // ==========================================
  // PYTHON (FASTAPI & FLASK)
  // ==========================================

  private async analyzePythonRoutes(
    workspaceRoot: string,
    file: FileNode,
    relPath: string
  ): Promise<ApiEndpoint[]> {
    const endpoints: ApiEndpoint[] = [];
    const content = await this.readFileSafe(path.join(workspaceRoot, file.relativePath));
    if (!content) {
      return endpoints;
    }

    const lines = content.split('\n');

    const isFlaskProject = /flask/i.test(content);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Flask .route decorator: @app.route('/path', methods=['GET', 'POST']), @flask_app.route(...)
      const flaskRouteMatch = line.match(
        /^@([a-zA-Z_][a-zA-Z0-9_]*)\.route\s*\(\s*['"]([^'"]+)['"](?:\s*,\s*methods\s*=\s*\[(.*?)\])?/i
      );
      if (flaskRouteMatch) {
        const routePath = flaskRouteMatch[2];
        const rawMethods = flaskRouteMatch[3];
        const handlerName = this.extractPythonNextDef(lines, i);

        let methods: HttpMethod[] = ['GET'];
        if (rawMethods) {
          const parsed = rawMethods
            .split(',')
            .map((m) => m.replace(/['"\s]/g, '').toUpperCase())
            .filter((m) =>
              ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(m)
            ) as HttpMethod[];
          if (parsed.length > 0) {
            methods = parsed;
          }
        }

        for (const method of methods) {
          endpoints.push({
            id: `flask-${relPath}-${method}-${routePath}-${i + 1}`,
            method,
            path: routePath,
            sourceFile: relPath,
            filePath: relPath,
            framework: 'Flask',
            confidence: 0.94,
            lineNumber: i + 1,
            handlerName,
            evidence: [
              `Flask route decorator: ${line.slice(0, 60)}`,
              handlerName ? `Handler function: def ${handlerName}` : 'Endpoint handler function',
            ],
          });
        }
        continue;
      }

      // FastAPI / Flask method decorator: @app.get('/path'), @router.post("/path"), @flask_app.get(...)
      const methodDecMatch = line.match(
        /^@([a-zA-Z_][a-zA-Z0-9_]*)\.(get|post|put|patch|delete|options|head)\s*\(\s*['"]([^'"]+)['"]/i
      );
      if (methodDecMatch) {
        const varName = methodDecMatch[1].toLowerCase();
        const method = methodDecMatch[2].toUpperCase() as HttpMethod;
        const routePath = methodDecMatch[3];
        const handlerName = this.extractPythonNextDef(lines, i);

        const framework = isFlaskProject && varName.includes('flask') ? 'Flask' : 'FastAPI';

        endpoints.push({
          id: `${framework.toLowerCase()}-${relPath}-${method}-${routePath}-${i + 1}`,
          method,
          path: routePath,
          sourceFile: relPath,
          filePath: relPath,
          framework,
          confidence: 0.96,
          lineNumber: i + 1,
          handlerName,
          evidence: [
            `${framework} route decorator: @${methodDecMatch[0].replace(/^@/, '')}`,
            handlerName ? `Handler function: def ${handlerName}` : 'Endpoint handler function',
          ],
        });
        continue;
      }
    }

    return endpoints;
  }

  private extractPythonNextDef(lines: string[], currentLineIdx: number): string | undefined {
    for (let j = currentLineIdx + 1; j < Math.min(lines.length, currentLineIdx + 6); j++) {
      const defMatch = lines[j].trim().match(/^(?:async\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
      if (defMatch) {
        return defMatch[1];
      }
    }
    return undefined;
  }

  // ==========================================
  // SPRING BOOT (JAVA / KOTLIN)
  // ==========================================

  private async analyzeSpringBoot(
    workspaceRoot: string,
    file: FileNode,
    relPath: string
  ): Promise<ApiEndpoint[]> {
    const endpoints: ApiEndpoint[] = [];
    const content = await this.readFileSafe(path.join(workspaceRoot, file.relativePath));
    if (!content) {
      return endpoints;
    }

    // Check for controller annotations
    if (!/(?:@RestController|@Controller)/.test(content)) {
      return endpoints;
    }

    // Find class-level @RequestMapping base path
    let basePath = '';
    const classMappingMatch = content.match(
      /@RequestMapping\s*\(\s*(?:value\s*=\s*)?['"]([^'"]+)['"]/
    );
    if (classMappingMatch) {
      basePath = classMappingMatch[1].trim();
      if (!basePath.startsWith('/')) {
        basePath = `/${basePath}`;
      }
      if (basePath.endsWith('/')) {
        basePath = basePath.slice(0, -1);
      }
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // @GetMapping, @PostMapping, @PutMapping, @PatchMapping, @DeleteMapping
      const springMethodMatch = line.match(
        /@(Get|Post|Put|Patch|Delete)Mapping(?:\s*\(\s*(?:value\s*=\s*|path\s*=\s*)?['"]?([^'")\s]*)['"]?\s*\))?/i
      );
      if (springMethodMatch) {
        const method = springMethodMatch[1].toUpperCase() as HttpMethod;
        let subPath = (springMethodMatch[2] || '').trim();
        if (subPath && !subPath.startsWith('/')) {
          subPath = `/${subPath}`;
        }
        const fullPath = basePath + subPath || '/';
        const handlerName = this.extractJavaNextMethodName(lines, i);

        endpoints.push({
          id: `spring-${relPath}-${method}-${fullPath}-${i + 1}`,
          method,
          path: fullPath,
          sourceFile: relPath,
          filePath: relPath,
          framework: 'Spring Boot',
          confidence: 0.95,
          lineNumber: i + 1,
          handlerName,
          evidence: [
            `Spring Boot ${springMethodMatch[0]} annotation`,
            basePath ? `Base class mapping: ${basePath}` : 'Root-level controller mapping',
            handlerName ? `Java method: ${handlerName}` : 'Controller handler method',
          ],
        });
      }
    }

    return endpoints;
  }

  private extractJavaNextMethodName(lines: string[], currentLineIdx: number): string | undefined {
    for (let j = currentLineIdx + 1; j < Math.min(lines.length, currentLineIdx + 6); j++) {
      const methodMatch = lines[j]
        .trim()
        .match(/(?:public|protected|private)?\s*(?:[A-Za-z0-9_<>[\],\s]+)\s+([A-Za-z0-9_]+)\s*\(/);
      if (
        methodMatch &&
        methodMatch[1] &&
        !['if', 'for', 'while', 'switch'].includes(methodMatch[1])
      ) {
        return methodMatch[1];
      }
    }
    return undefined;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private buildResult(endpoints: ApiEndpoint[], frameworks: string[]): ApiAnalysisResult {
    const methodCounts: Record<HttpMethod, number> = {
      GET: 0,
      POST: 0,
      PUT: 0,
      PATCH: 0,
      DELETE: 0,
      OPTIONS: 0,
      HEAD: 0,
      GRAPHQL: 0,
      RPC: 0,
      OTHER: 0,
    };

    let dynamicCount = 0;

    for (const ep of endpoints) {
      if (ep.method in methodCounts) {
        methodCounts[ep.method]++;
      } else {
        methodCounts.OTHER++;
      }
      if (ep.isDynamic) {
        dynamicCount++;
      }
    }

    return {
      endpoints,
      totalEndpoints: endpoints.length,
      methodCounts,
      frameworksDetected: frameworks,
      dynamicEndpointsCount: dynamicCount,
    };
  }

  private emptyResult(): ApiAnalysisResult {
    return {
      endpoints: [],
      totalEndpoints: 0,
      methodCounts: {
        GET: 0,
        POST: 0,
        PUT: 0,
        PATCH: 0,
        DELETE: 0,
        OPTIONS: 0,
        HEAD: 0,
        GRAPHQL: 0,
        RPC: 0,
        OTHER: 0,
      },
      frameworksDetected: [],
      dynamicEndpointsCount: 0,
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

  private async readFileSafe(fullPath: string): Promise<string | null> {
    try {
      const stats = await fs.promises.stat(fullPath);
      if (stats.size > ApiAnalyzer.MAX_FILE_SIZE_BYTES) {
        return null;
      }
      return await fs.promises.readFile(fullPath, 'utf8');
    } catch {
      return null;
    }
  }
}
