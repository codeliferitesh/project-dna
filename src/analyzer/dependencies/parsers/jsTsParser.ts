import { IFileDependencyParser, RawImportSpecifier } from '../contracts';

export class JsTsParser implements IFileDependencyParser {
  public readonly language: 'typescript' | 'javascript' = 'typescript';

  private static readonly SUPPORTED_EXTENSIONS = new Set([
    '.ts',
    '.tsx',
    '.d.ts',
    '.mts',
    '.cts',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
  ]);

  public supports(extension: string): boolean {
    return JsTsParser.SUPPORTED_EXTENSIONS.has(extension.toLowerCase());
  }

  public parse(_filePath: string, content: string): RawImportSpecifier[] {
    const results: RawImportSpecifier[] = [];

    try {
      // Strip block and inline comments to avoid false matches inside comments
      const stripped = this.stripComments(content);
      const lines = stripped.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // 1. ES import declarations:
        //    import ... from 'specifier'
        //    import 'specifier'  (side-effect import)
        this.matchEsImport(line, lineNumber, results);

        // 2. ES export declarations with module specifier:
        //    export ... from 'specifier'
        this.matchEsExportFrom(line, lineNumber, results);

        // 3. Dynamic import: import('specifier')
        this.matchDynamicImport(line, lineNumber, results);

        // 4. CommonJS require: require('specifier')
        this.matchRequire(line, lineNumber, results);
      }
    } catch {
      // In case of completely unparseable content, safely return collected results
    }

    return results;
  }

  /**
   * Strips block comments and line comments from source code.
   * Preserves string literals to avoid stripping comment-like content inside strings.
   */
  private stripComments(content: string): string {
    // State machine approach to handle strings vs comments correctly
    let result = '';
    let i = 0;
    const len = content.length;

    while (i < len) {
      const ch = content[i];
      const next = i + 1 < len ? content[i + 1] : '';

      // Template literal
      if (ch === '`') {
        let end = i + 1;
        while (end < len) {
          if (content[end] === '\\') {
            end += 2;
            continue;
          }
          if (content[end] === '`') {
            end++;
            break;
          }
          end++;
        }
        result += content.slice(i, end);
        i = end;
        continue;
      }

      // Single or double quoted string
      if (ch === '"' || ch === "'") {
        let end = i + 1;
        while (end < len) {
          if (content[end] === '\\') {
            end += 2;
            continue;
          }
          if (content[end] === ch) {
            end++;
            break;
          }
          if (content[end] === '\n') break; // unterminated string
          end++;
        }
        result += content.slice(i, end);
        i = end;
        continue;
      }

      // Block comment /* ... */
      if (ch === '/' && next === '*') {
        let end = i + 2;
        while (end < len - 1) {
          if (content[end] === '*' && content[end + 1] === '/') {
            end += 2;
            break;
          }
          // Preserve newlines so line numbers stay correct
          if (content[end] === '\n') {
            result += '\n';
          }
          end++;
        }
        i = end;
        continue;
      }

      // Line comment // ...
      if (ch === '/' && next === '/') {
        let end = i + 2;
        while (end < len && content[end] !== '\n') {
          end++;
        }
        i = end;
        continue;
      }

      result += ch;
      i++;
    }

    return result;
  }

  /**
   * Matches ES import statements:
   *   import ... from 'specifier'
   *   import 'specifier'
   *   import type ... from 'specifier'
   */
  private matchEsImport(line: string, lineNumber: number, results: RawImportSpecifier[]): void {
    // Match: import [type] [...] from 'specifier'
    // or:    import 'specifier'
    const importFromPattern =
      /\bimport\s+(?:(type)\s+)?(?:[\s\S]*?\s+from\s+)?(['"])([^'"]+)\2/;
    const match = line.match(importFromPattern);
    if (match) {
      const isTypeKeyword = match[1] === 'type';
      const specifier = match[3];

      // Extract imported names if present
      const importedNames = this.extractImportedNames(line);

      // Check for individual type-only imports: import { type Foo, type Bar }
      let allElementsTypeOnly = false;
      if (!isTypeKeyword && importedNames.length > 0) {
        const namedMatch = line.match(/\{([^}]+)\}/);
        if (namedMatch) {
          const elements = namedMatch[1].split(',').map((e) => e.trim()).filter(Boolean);
          allElementsTypeOnly =
            elements.length > 0 && elements.every((el) => el.startsWith('type '));
        }
      }

      const isTypeOnly = isTypeKeyword || allElementsTypeOnly;

      results.push({
        specifier,
        type: isTypeOnly ? 'type_import' : 'import',
        isTypeOnly,
        lineNumber,
        importedNames: importedNames.length > 0 ? importedNames : undefined,
      });
    }
  }

  /**
   * Matches ES export-from declarations:
   *   export ... from 'specifier'
   *   export type ... from 'specifier'
   */
  private matchEsExportFrom(
    line: string,
    lineNumber: number,
    results: RawImportSpecifier[]
  ): void {
    const exportFromPattern = /\bexport\s+(?:(type)\s+)?(?:[\s\S]*?\s+)?from\s+(['"])([^'"]+)\2/;
    const match = line.match(exportFromPattern);
    if (match) {
      const isTypeOnly = match[1] === 'type';
      const specifier = match[3];

      results.push({
        specifier,
        type: isTypeOnly ? 'type_import' : 'export_from',
        isTypeOnly,
        lineNumber,
      });
    }
  }

  /**
   * Matches dynamic import expressions:
   *   import('specifier')
   */
  private matchDynamicImport(
    line: string,
    lineNumber: number,
    results: RawImportSpecifier[]
  ): void {
    const dynamicPattern = /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g;
    let match;
    while ((match = dynamicPattern.exec(line)) !== null) {
      // Don't double-count static imports already handled
      if (/^\s*import\s/.test(line) && !line.includes('import(')) continue;

      results.push({
        specifier: match[2],
        type: 'dynamic_import',
        isTypeOnly: false,
        lineNumber,
      });
    }
  }

  /**
   * Matches CommonJS require calls:
   *   require('specifier')
   */
  private matchRequire(line: string, lineNumber: number, results: RawImportSpecifier[]): void {
    const requirePattern = /\brequire\s*\(\s*(['"])([^'"]+)\1\s*\)/g;
    let match;
    while ((match = requirePattern.exec(line)) !== null) {
      results.push({
        specifier: match[2],
        type: 'require',
        isTypeOnly: false,
        lineNumber,
      });
    }
  }

  /**
   * Extracts imported names from an import statement line.
   */
  private extractImportedNames(line: string): string[] {
    const names: string[] = [];

    // Default import: import Foo from ...
    const defaultMatch = line.match(/\bimport\s+(?:type\s+)?(\w+)\s+from\s/);
    if (defaultMatch && defaultMatch[1] !== 'type') {
      names.push(defaultMatch[1]);
    }

    // Named imports: import { Foo, Bar as Baz } from ...
    const namedMatch = line.match(/\{([^}]+)\}/);
    if (namedMatch) {
      const elements = namedMatch[1].split(',');
      for (const el of elements) {
        const trimmed = el.trim().replace(/^type\s+/, '');
        if (!trimmed) continue;
        // Handle 'as' renaming: Foo as Bar -> Foo
        const asMatch = trimmed.match(/^(\w+)(?:\s+as\s+\w+)?$/);
        if (asMatch) {
          names.push(asMatch[1]);
        }
      }
    }

    // Namespace import: import * as Foo from ...
    const nsMatch = line.match(/\*\s+as\s+(\w+)/);
    if (nsMatch) {
      names.push(nsMatch[1]);
    }

    return names;
  }
}
