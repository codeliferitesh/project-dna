import { ArchitecturalLayer, ArchitecturalRole } from './contracts';

export class LayerClassifier {
  /**
   * Deterministically assigns an architectural layer based on the module's role and path context.
   */
  public classifyLayer(role: ArchitecturalRole, relativePath: string): ArchitecturalLayer {
    const norm = relativePath.replace(/\\/g, '/').toLowerCase();

    // 1. Explicit Layer Overrides based on directories
    if (norm.includes('/components/') || norm.includes('/views/') || norm.includes('/ui/')) {
      return 'presentation';
    }
    if (norm.includes('/services/') || norm.includes('/api/') || norm.includes('/clients/')) {
      return 'services';
    }
    if (norm.includes('/repositories/') || norm.includes('/db/') || norm.includes('/database/')) {
      return 'data_access';
    }
    if (norm.includes('/models/') || norm.includes('/entities/') || norm.includes('/schemas/')) {
      return 'domain';
    }
    if (norm.includes('/routes/') || norm.includes('/controllers/') || norm.includes('/app/api/')) {
      return 'routing';
    }

    // 2. Role-based Layer mapping
    switch (role) {
      case 'page':
      case 'route':
        return 'routing';

      case 'layout':
      case 'component':
      case 'ui_component':
      case 'hook':
        return 'presentation';

      case 'context':
      case 'state_management':
        return 'application';

      case 'service':
      case 'api_client':
        return 'services';

      case 'backend_route':
      case 'controller':
        return 'routing';

      case 'model':
      case 'schema':
        return 'domain';

      case 'repository':
        return 'data_access';

      case 'middleware':
      case 'worker':
        return 'infrastructure';

      case 'config':
        return 'configuration';

      case 'test':
        return 'testing';

      case 'utility':
      case 'constant':
      case 'type_definition':
      case 'asset_module':
        return 'shared_utility';

      case 'entry_point':
        return norm.includes('server') || norm.includes('app') ? 'infrastructure' : 'presentation';

      case 'unknown':
      default:
        return 'unknown';
    }
  }

  /**
   * Returns human-readable description for each layer.
   */
  public getLayerDescription(layer: ArchitecturalLayer): string {
    switch (layer) {
      case 'presentation':
        return 'User interface components, pages, layouts, and custom view hooks.';
      case 'routing':
        return 'Page routing, API endpoints, navigation entry points, and controllers.';
      case 'application':
        return 'Application state management, context providers, and workflow coordination.';
      case 'services':
        return 'Business services, API clients, and third-party integrations.';
      case 'domain':
        return 'Domain models, data schemas, and core business entities.';
      case 'data_access':
        return 'Database access layers, ORM schemas, and data repositories.';
      case 'infrastructure':
        return 'Server setup, middlewares, background workers, and platform utilities.';
      case 'configuration':
        return 'Build options, runtime settings, linters, and project configuration files.';
      case 'testing':
        return 'Unit, integration, and end-to-end test suites.';
      case 'shared_utility':
        return 'Cross-cutting helper functions, type definitions, and constant registries.';
      default:
        return 'Unclassified architectural files.';
    }
  }
}
