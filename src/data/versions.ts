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
    version: "1.0.0",
    releaseDate: "2026-04-16",
    isCurrent: true,
    notes: "Current version",
    commits: [
      {
        title: "Initial setup",
        description: "Application initialized",
        category: "feature",
        date: "2026-04-16"
      }
    ]
  }
];
