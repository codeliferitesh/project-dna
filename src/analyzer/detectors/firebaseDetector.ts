import { TechnologyEvidence, TechnologyInfo } from '../../models';
import { DetectionContext, ITechnologyDetector } from './detectorInterface';

export class FirebaseDetector implements ITechnologyDetector {
  public readonly id = 'firebaseDetector';
  public readonly name = 'Firebase Platform & Cloud Services Detector';

  private static readonly FIREBASE_FILES: Array<{ file: string; detail: string }> = [
    { file: 'firebase.json', detail: 'Firebase project configuration and deployment settings' },
    { file: '.firebaserc', detail: 'Firebase project alias and active environment targets' },
    { file: 'firestore.rules', detail: 'Cloud Firestore database security rules' },
    { file: 'firestore.indexes.json', detail: 'Cloud Firestore composite index definitions' },
    { file: 'storage.rules', detail: 'Firebase Cloud Storage security rules' },
    { file: 'database.rules.json', detail: 'Firebase Realtime Database security rules' },
  ];

  public async detect(context: DetectionContext): Promise<TechnologyInfo[]> {
    const evidence: TechnologyEvidence[] = [];

    for (const item of FirebaseDetector.FIREBASE_FILES) {
      if (context.fileNames.has(item.file.toLowerCase())) {
        evidence.push({
          source: item.file,
          type: 'configuration',
          detail: item.detail,
        });
      }
    }

    if (evidence.length === 0) {
      return [];
    }

    return [
      {
        id: 'firebase',
        name: 'Firebase',
        category: 'service',
        confidence: 1.0,
        evidence,
        description: 'Google application platform and cloud backend services',
      },
    ];
  }
}
