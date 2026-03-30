export interface VersionCommit {
  title: string;
  description?: string;
  category: 'feature' | 'bugfix' | 'enhancement' | 'security' | 'performance' | 'documentation';
  date: string;
}

export interface Version {
  version: string;
  releaseDate: string;
  isCurrent: boolean;
  notes: string;
  commits: VersionCommit[];
}

export const versions: Version[] = [
  {
    "version": "1.0.0",
    "releaseDate": "2026-03-30",
    "isCurrent": true,
    "notes": "Release 1.0.0: 1 documentation, 1 performance, 1 bugfix, 1 feature",
    "commits": [
      {
        "title": "Added automatic version tracking documentation",
        "description": "",
        "category": "documentation",
        "date": "2026-03-30"
      },
      {
        "title": "Optimized version history display",
        "description": "",
        "category": "performance",
        "date": "2026-03-30"
      },
      {
        "title": "Resolved Firebase permissions error in version tracking",
        "description": "",
        "category": "bugfix",
        "date": "2026-03-30"
      },
      {
        "title": "Rebuilt version tracking system with automatic git commit tracking",
        "description": "",
        "category": "feature",
        "date": "2026-03-30"
      }
    ]
  },
  {
    "version": "1.0.0",
    "releaseDate": "2026-03-30",
    "isCurrent": false,
    "notes": "Current version",
    "commits": [
      {
        "title": "Initial setup",
        "description": "Application initialized",
        "category": "feature",
        "date": "2026-03-30"
      }
    ]
  }
];
