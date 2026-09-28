import {
  ArchitecturalRelationship,
  ArchitecturalRelationshipType,
  ArchitecturalRole,
} from './contracts';
import { FileDependencyEdge } from '../../models';

export class RelationshipClassifier {
  /**
   * Derives a high-level architectural relationship from a raw code dependency edge
   * based on the source and target roles.
   */
  public classifyRelationship(
    edge: FileDependencyEdge,
    sourceRole: ArchitecturalRole,
    targetRole: ArchitecturalRole
  ): ArchitecturalRelationship {
    const sourcePath = edge.sourceFilePath;
    const targetPath = edge.targetFilePath || edge.specifier;

    let type: ArchitecturalRelationshipType = 'imports';
    let description = `${sourcePath} imports ${targetPath}`;
    const evidence: string[] = [`Code import specifier: '${edge.specifier}'`];

    // 1. Testing relationship
    if (sourceRole === 'test') {
      type = 'tests';
      description = `Test suite exercises ${targetPath}`;
      evidence.push(`Source module is a test suite`);
    }

    // 2. Component rendering
    else if (
      (sourceRole === 'page' ||
        sourceRole === 'layout' ||
        sourceRole === 'component' ||
        sourceRole === 'ui_component') &&
      (targetRole === 'component' || targetRole === 'ui_component' || targetRole === 'layout')
    ) {
      type = 'renders';
      description = `Renders child component ${targetPath}`;
      evidence.push(`Presentation layer component hierarchy`);
    }

    // 3. Hook usage
    else if (targetRole === 'hook') {
      type = 'uses';
      description = `Invokes custom hook ${targetPath}`;
      evidence.push(`Target is a custom React hook`);
    }

    // 4. Context consumption
    else if (targetRole === 'context') {
      type = 'consumes';
      description = `Consumes context state from ${targetPath}`;
      evidence.push(`Target is a Context/Provider module`);
    }

    // 5. Service / API invocation
    else if (
      (sourceRole === 'page' ||
        sourceRole === 'component' ||
        sourceRole === 'service' ||
        sourceRole === 'backend_route' ||
        sourceRole === 'controller') &&
      (targetRole === 'service' || targetRole === 'api_client')
    ) {
      type = 'calls';
      description = `Calls service/API client ${targetPath}`;
      evidence.push(`Application/Service layer interaction`);
    }

    // 6. Repository invocation
    else if (targetRole === 'repository') {
      type = 'calls';
      description = `Interacts with data repository ${targetPath}`;
      evidence.push(`Data access layer call`);
    }

    // 7. Configuration dependency
    else if (targetRole === 'config') {
      type = 'configures';
      description = `Reads configuration from ${targetPath}`;
      evidence.push(`Target is a configuration module`);
    }

    // 8. Type / Schema implementation
    else if (targetRole === 'type_definition' || targetRole === 'schema') {
      type = 'implements';
      description = `Implements types/schema from ${targetPath}`;
      evidence.push(`Target defines type contracts/schema`);
    }

    return {
      id: `${sourcePath}->${targetPath}:${type}`,
      sourcePath,
      targetPath,
      type,
      description,
      confidence: 0.9,
      evidence,
      lineNumber: edge.lineNumber,
    };
  }
}
