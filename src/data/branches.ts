import type { Branch } from '../types/types';

// Define branch data
export const branches: Branch[] = [
  {
    id: 'seseduh',
    name: 'Seseduh'
  },
  {
    id: '2go',
    name: '2GO'
  },
  {
    id: 'external',
    name: 'External'
  }
];

// Helper function to get branch name
export function getBranchName(branchId: string | undefined): string {
  if (!branchId) return 'Unknown Branch';
  const branch = branches.find(b => b.id === branchId);
  return branch?.name || 'Unknown Branch';
}

// Helper function to validate branch
export function isValidBranch(branchId: string | undefined): boolean {
  if (!branchId) return false;
  return branches.some(b => b.id === branchId);
}