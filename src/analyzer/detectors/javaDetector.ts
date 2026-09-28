import { TechnologyInfo } from '../../models';
import { DetectionContext, ITechnologyDetector } from './detectorInterface';

export class JavaDetector implements ITechnologyDetector {
  public readonly id = 'javaDetector';
  public readonly name = 'Java & JVM Ecosystem Detector';

  public async detect(context: DetectionContext): Promise<TechnologyInfo[]> {
    const results: TechnologyInfo[] = [];

    // 1. Maven
    if (context.fileNames.has('pom.xml')) {
      results.push({
        id: 'maven',
        name: 'Maven',
        category: 'buildTool',
        confidence: 1.0,
        evidence: [
          {
            source: 'pom.xml',
            type: 'configuration',
            detail: 'Maven project object model configuration (pom.xml)',
          },
        ],
        description: 'Java build and dependency management tool',
      });

      const pomContent = await context.readConfigFile('pom.xml');
      if (pomContent) {
        if (pomContent.includes('spring-boot')) {
          results.push({
            id: 'spring-boot',
            name: 'Spring Boot',
            category: 'framework',
            confidence: 1.0,
            evidence: [
              {
                source: 'pom.xml',
                type: 'dependency',
                detail: 'Spring Boot starter dependency configured in pom.xml',
              },
            ],
            description: 'Enterprise Java application framework',
          });
        }
      }
    }

    // 2. Gradle
    const hasGradle =
      context.fileNames.has('build.gradle') ||
      context.fileNames.has('build.gradle.kts') ||
      context.fileNames.has('settings.gradle');
    if (hasGradle) {
      const gradleFile = context.fileNames.has('build.gradle.kts')
        ? 'build.gradle.kts'
        : 'build.gradle';

      results.push({
        id: 'gradle',
        name: 'Gradle',
        category: 'buildTool',
        confidence: 1.0,
        evidence: [
          {
            source: gradleFile,
            type: 'configuration',
            detail: `Gradle build script (${gradleFile})`,
          },
        ],
        description: 'Modern build automation tool for JVM languages',
      });

      const gradleContent = await context.readConfigFile(gradleFile);
      if (gradleContent && gradleContent.includes('spring-boot')) {
        results.push({
          id: 'spring-boot',
          name: 'Spring Boot',
          category: 'framework',
          confidence: 1.0,
          evidence: [
            {
              source: gradleFile,
              type: 'dependency',
              detail: `Spring Boot plugin or dependency configured in ${gradleFile}`,
            },
          ],
          description: 'Enterprise Java application framework',
        });
      }
    }

    return results;
  }
}
