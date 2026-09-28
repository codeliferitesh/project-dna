import { TechnologyCategory, TechnologyInfo } from '../../models';
import { DetectionContext, ITechnologyDetector } from './detectorInterface';

export class DetectorRegistry {
  private readonly detectors: ITechnologyDetector[] = [];

  private static readonly CATEGORY_ORDER: Record<TechnologyCategory, number> = {
    language: 1,
    framework: 2,
    library: 3,
    runtime: 4,
    styling: 5,
    backend: 6,
    database: 7,
    buildTool: 8,
    packageManager: 9,
    cloud: 10,
    service: 11,
    testing: 12,
    tooling: 13,
    other: 14,
  };

  public register(detector: ITechnologyDetector): void {
    this.detectors.push(detector);
  }

  public async runAll(context: DetectionContext): Promise<TechnologyInfo[]> {
    const rawResults: TechnologyInfo[] = [];

    // Run all detectors with error isolation so one failure never halts detection
    for (const detector of this.detectors) {
      try {
        const found = await detector.detect(context);
        if (Array.isArray(found)) {
          rawResults.push(...found);
        }
      } catch (err) {
        console.warn(`[TechnologyDetector] Detector '${detector.name}' error:`, err);
      }
    }

    // Merge duplicate detections by normalized id
    const mergedMap = new Map<string, TechnologyInfo>();

    for (const tech of rawResults) {
      const key = `${tech.id.toLowerCase()}:${tech.category}`;
      const existing = mergedMap.get(key);

      if (!existing) {
        mergedMap.set(key, {
          ...tech,
          evidence: [...tech.evidence],
        });
      } else {
        // Merge evidence without duplicates
        const existingSources = new Set(existing.evidence.map((e) => `${e.source}:${e.type}`));
        for (const ev of tech.evidence) {
          const evKey = `${ev.source}:${ev.type}`;
          if (!existingSources.has(evKey)) {
            existing.evidence.push(ev);
            existingSources.add(evKey);
          }
        }

        // Higher confidence wins
        existing.confidence = Math.max(existing.confidence, tech.confidence);

        // Version preservation
        if (!existing.version && tech.version) {
          existing.version = tech.version;
        }

        // Description preservation
        if (!existing.description && tech.description) {
          existing.description = tech.description;
        }
      }
    }

    // Filter out low confidence detections and sort deterministically
    const finalResults = Array.from(mergedMap.values()).filter((t) => t.confidence >= 0.4);

    finalResults.sort((a, b) => {
      const catA = DetectorRegistry.CATEGORY_ORDER[a.category] || 99;
      const catB = DetectorRegistry.CATEGORY_ORDER[b.category] || 99;

      if (catA !== catB) {
        return catA - catB;
      }
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    return finalResults;
  }
}
