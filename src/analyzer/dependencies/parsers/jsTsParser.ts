import * as ts from 'typescript';
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

  public parse(filePath: string, content: string): RawImportSpecifier[] {
    const results: RawImportSpecifier[] = [];

    try {
      const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );

      const visit = (node: ts.Node) => {
        // 1. ES Import Declaration: import ... from 'specifier'
        if (ts.isImportDeclaration(node)) {
          if (ts.isStringLiteral(node.moduleSpecifier)) {
            const specifier = node.moduleSpecifier.text;
            const isClauseTypeOnly = node.importClause?.isTypeOnly ?? false;

            let allElementsTypeOnly = false;
            const importedNames: string[] = [];

            if (node.importClause?.name) {
              importedNames.push(node.importClause.name.text);
            }

            if (node.importClause?.namedBindings) {
              if (ts.isNamedImports(node.importClause.namedBindings)) {
                const elements = node.importClause.namedBindings.elements;
                if (elements.length > 0) {
                  allElementsTypeOnly = elements.every((el) => el.isTypeOnly);
                  for (const el of elements) {
                    importedNames.push(el.name.text);
                  }
                }
              } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                importedNames.push(node.importClause.namedBindings.name.text);
              }
            }

            const isTypeOnly = isClauseTypeOnly || allElementsTypeOnly;
            const line =
              sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

            results.push({
              specifier,
              type: isTypeOnly ? 'type_import' : 'import',
              isTypeOnly,
              lineNumber: line,
              importedNames: importedNames.length > 0 ? importedNames : undefined,
            });
          }
        }

        // 2. ES Export Declaration with module specifier: export ... from 'specifier'
        else if (ts.isExportDeclaration(node)) {
          if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            const specifier = node.moduleSpecifier.text;
            const isTypeOnly = node.isTypeOnly ?? false;
            const line =
              sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

            results.push({
              specifier,
              type: isTypeOnly ? 'type_import' : 'export_from',
              isTypeOnly,
              lineNumber: line,
            });
          }
        }

        // 3. Dynamic Import: import('specifier') or CommonJS require: require('specifier')
        else if (ts.isCallExpression(node)) {
          // Dynamic import()
          if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
            if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
              const specifier = (node.arguments[0] as ts.StringLiteral).text;
              const line =
                sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
              results.push({
                specifier,
                type: 'dynamic_import',
                isTypeOnly: false,
                lineNumber: line,
              });
            }
          }
          // require('...')
          else if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
            if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
              const specifier = (node.arguments[0] as ts.StringLiteral).text;
              const line =
                sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
              results.push({
                specifier,
                type: 'require',
                isTypeOnly: false,
                lineNumber: line,
              });
            }
          }
        }

        // 4. import foo = require('foo')
        else if (ts.isImportEqualsDeclaration(node)) {
          if (
            ts.isExternalModuleReference(node.moduleReference) &&
            ts.isStringLiteral(node.moduleReference.expression)
          ) {
            const specifier = node.moduleReference.expression.text;
            const line =
              sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
            results.push({
              specifier,
              type: 'require',
              isTypeOnly: false,
              lineNumber: line,
            });
          }
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    } catch {
      // In case of completely unparseable syntax, safely return collected results
    }

    return results;
  }
}
