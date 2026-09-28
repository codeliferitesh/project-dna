import { TechnologyCategory, TechnologyInfo } from '../../models';
import { DetectionContext, ITechnologyDetector } from './detectorInterface';

interface PythonPackageRule {
  pattern: RegExp;
  id: string;
  name: string;
  category: TechnologyCategory;
  description: string;
}

export class PythonDetector implements ITechnologyDetector {
  public readonly id = 'pythonDetector';
  public readonly name = 'Python Ecosystem & Framework Detector';

  private static readonly RULES: PythonPackageRule[] = [
    {
      pattern: /fastapi/i,
      id: 'fastapi',
      name: 'FastAPI',
      category: 'framework',
      description: 'Modern, fast web framework for building APIs with Python',
    },
    {
      pattern: /django/i,
      id: 'django',
      name: 'Django',
      category: 'framework',
      description: 'High-level Python web framework',
    },
    {
      pattern: /flask/i,
      id: 'flask',
      name: 'Flask',
      category: 'framework',
      description: 'Lightweight WSGI web application framework',
    },
    {
      pattern: /pytest/i,
      id: 'pytest',
      name: 'Pytest',
      category: 'testing',
      description: 'Framework for writing small, readable Python tests',
    },
    {
      pattern: /torch|pytorch/i,
      id: 'pytorch',
      name: 'PyTorch',
      category: 'library',
      description: 'Open source machine learning framework',
    },
    {
      pattern: /tensorflow/i,
      id: 'tensorflow',
      name: 'TensorFlow',
      category: 'library',
      description: 'End-to-end platform for machine learning',
    },
    {
      pattern: /pandas/i,
      id: 'pandas',
      name: 'Pandas',
      category: 'library',
      description: 'Fast, powerful data analysis tool',
    },
    {
      pattern: /numpy/i,
      id: 'numpy',
      name: 'NumPy',
      category: 'library',
      description: 'Fundamental package for scientific computing',
    },
    {
      pattern: /sqlalchemy/i,
      id: 'sqlalchemy',
      name: 'SQLAlchemy',
      category: 'database',
      description: 'Python SQL toolkit and Object Relational Mapper',
    },
    {
      pattern: /celery/i,
      id: 'celery',
      name: 'Celery',
      category: 'backend',
      description: 'Distributed task queue system',
    },
  ];

  public async detect(context: DetectionContext): Promise<TechnologyInfo[]> {
    const results: TechnologyInfo[] = [];

    // 1. Check requirements.txt
    const reqContent = await context.readConfigFile('requirements.txt');
    if (reqContent) {
      for (const rule of PythonDetector.RULES) {
        const lineMatch = reqContent
          .split('\n')
          .find((line) => rule.pattern.test(line.split('==')[0].split('>=')[0].trim()));

        if (lineMatch) {
          const versionPart = lineMatch.match(/[=><~]+\s*([0-9a-zA-Z.]+)/);
          const version = versionPart ? versionPart[1] : undefined;

          results.push({
            id: rule.id,
            name: rule.name,
            category: rule.category,
            version,
            confidence: 1.0,
            evidence: [
              {
                source: 'requirements.txt',
                type: 'dependency',
                detail: `Detected dependency "${lineMatch.trim()}" in requirements.txt`,
              },
            ],
            description: rule.description,
          });
        }
      }
    }

    // 2. Check pyproject.toml
    const pyprojectContent = await context.readConfigFile('pyproject.toml');
    if (pyprojectContent) {
      for (const rule of PythonDetector.RULES) {
        if (rule.pattern.test(pyprojectContent)) {
          results.push({
            id: rule.id,
            name: rule.name,
            category: rule.category,
            confidence: 0.9,
            evidence: [
              {
                source: 'pyproject.toml',
                type: 'manifest',
                detail: `${rule.name} dependency declared in pyproject.toml`,
              },
            ],
            description: rule.description,
          });
        }
      }
    }

    return results;
  }
}
