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
    version: '1.0.0',
    releaseDate: '2025-01-24',
    isCurrent: true,
    notes: 'Initial release with comprehensive order management, product catalog, recipe tracking, and stock management features',
    commits: [
      {
        title: 'Order Management System',
        description: 'Complete order management with create, update, and completion workflows',
        category: 'feature',
        date: '2024-12-15'
      },
      {
        title: 'Product & Category Management',
        description: 'Full product catalog with categories, pricing, and inventory tracking',
        category: 'feature',
        date: '2024-12-20'
      },
      {
        title: 'Recipe Management',
        description: 'Recipe creation and management with ingredient tracking and cost calculations',
        category: 'feature',
        date: '2024-12-25'
      },
      {
        title: 'Stock Management',
        description: 'Ingredient stock tracking with history, alerts, and automated deductions',
        category: 'feature',
        date: '2025-01-01'
      },
      {
        title: 'Production Planning',
        description: 'Production scheduling and planning features with calendar view',
        category: 'feature',
        date: '2025-01-05'
      },
      {
        title: 'Enhanced Logbook',
        description: 'Comprehensive activity logging across all system operations',
        category: 'feature',
        date: '2025-01-10'
      },
      {
        title: 'User Authentication & Permissions',
        description: 'Secure authentication with role-based access control',
        category: 'security',
        date: '2025-01-12'
      },
      {
        title: 'Reporting & Export Features',
        description: 'Generate detailed reports with PDF and Excel export capabilities',
        category: 'feature',
        date: '2025-01-15'
      },
      {
        title: 'Performance Improvements',
        description: 'Optimized database queries and improved UI responsiveness',
        category: 'performance',
        date: '2025-01-20'
      },
      {
        title: 'R&D Product Management',
        description: 'Research and development product tracking with approval workflows',
        category: 'feature',
        date: '2025-01-22'
      }
    ]
  }
];
