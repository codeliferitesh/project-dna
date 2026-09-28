import {
  ArchitecturalLayer,
  ArchitecturalModule,
  ArchitecturalRelationship,
  ArchitecturalRelationshipType,
  ArchitecturalRole,
  ArchitectureAnalysisResult,
  ArchitectureLayerGroup,
  ArchitectureSummary,
  ConfidenceLevel,
} from '../../models';

export interface RoleClassificationResult {
  primaryRole: ArchitecturalRole;
  secondaryRoles: ArchitecturalRole[];
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  evidence: string[];
}

export interface FileInspectionContext {
  relativePath: string;
  fileName: string;
  extension: string;
  category?: string;
  content?: string;
  incomingCount: number;
  outgoingCount: number;
  outgoingTargets: string[];
}

export {
  ArchitecturalLayer,
  ArchitecturalModule,
  ArchitecturalRelationship,
  ArchitecturalRelationshipType,
  ArchitecturalRole,
  ArchitectureAnalysisResult,
  ArchitectureLayerGroup,
  ArchitectureSummary,
  ConfidenceLevel,
};
