import { IFileDependencyParser, RawImportSpecifier } from '../contracts';

export class PythonParser implements IFileDependencyParser {
  public readonly language = 'python' as const;

  public supports(extension: string): boolean {
    return extension.toLowerCase() === '.py';
  }

  public parse(_filePath: string, content: string): RawImportSpecifier[] {
    const results: RawImportSpecifier[] = [];

    try {
      const lines = content.split(/\r?\n/);
      let inDocstring = false;
      let docstringDelimiter = '';
      let isTypeCheckingBlock = false;
      let typeCheckingIndent = -1;

      for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const lineNum = i + 1;
        const trimmed = rawLine.trim();

        // 1. Docstring handling
        if (!inDocstring) {
          if (trimmed.startsWith('"""')) {
            inDocstring = true;
            docstringDelimiter = '"""';
            if (trimmed.length > 3 && trimmed.slice(3).includes('"""')) {
              inDocstring = false;
            }
            continue;
          } else if (trimmed.startsWith("'''")) {
            inDocstring = true;
            docstringDelimiter = "'''";
            if (trimmed.length > 3 && trimmed.slice(3).includes("'''")) {
              inDocstring = false;
            }
            continue;
          }
        } else {
          if (trimmed.includes(docstringDelimiter)) {
            inDocstring = false;
          }
          continue;
        }

        // 2. Ignore pure comment lines
        if (trimmed.startsWith('#') || !trimmed) {
          continue;
        }

        // Strip inline comments
        const cleanLine = trimmed.split('#')[0].trim();
        const currentIndent = rawLine.search(/\S/);

        // Check if TYPE_CHECKING block entered
        if (
          cleanLine.startsWith('if TYPE_CHECKING:') ||
          cleanLine.startsWith('if typing.TYPE_CHECKING:')
        ) {
          isTypeCheckingBlock = true;
          typeCheckingIndent = currentIndent;
          continue;
        } else if (
          isTypeCheckingBlock &&
          currentIndent <= typeCheckingIndent &&
          trimmed.length > 0
        ) {
          isTypeCheckingBlock = false;
        }

        // 3. Pattern: from <module> import <items>
        // Examples: from .utils import foo | from fastapi import FastAPI | from ..core.config import settings
        const fromMatch = cleanLine.match(/^from\s+([a-zA-Z0-9_\.]+)\s+import\b/);
        if (fromMatch) {
          const specifier = fromMatch[1];
          results.push({
            specifier,
            type: isTypeCheckingBlock ? 'type_import' : 'import',
            isTypeOnly: isTypeCheckingBlock,
            lineNumber: lineNum,
          });
          continue;
        }

        // 4. Pattern: import <module1> [as alias1], <module2> [as alias2]
        const importMatch = cleanLine.match(/^import\s+([^#;]+)/);
        if (importMatch) {
          const rawModules = importMatch[1].split(',');
          for (const rawMod of rawModules) {
            const cleanMod = rawMod
              .trim()
              .split(/\s+as\s+/)[0]
              .trim();
            if (cleanMod && /^[a-zA-Z0-9_\.]+$/.test(cleanMod)) {
              results.push({
                specifier: cleanMod,
                type: isTypeCheckingBlock ? 'type_import' : 'import',
                isTypeOnly: isTypeCheckingBlock,
                lineNumber: lineNum,
              });
            }
          }
        }
      }
    } catch {
      // Safe fallback
    }

    return results;
  }
}
