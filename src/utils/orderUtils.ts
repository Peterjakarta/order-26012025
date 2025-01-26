import { branches } from '../data/branches';

export function generateOrderNumber(branchId: string, orderDate: string): string {
  // Get branch code (first 2 letters uppercase)
  const branch = branches.find(b => b.id === branchId);
  const branchCode = branch?.name.slice(0, 2).toUpperCase() || 'XX';

  // Get date components
  const date = new Date(orderDate);
  const year = date.getFullYear().toString().slice(-2); // Last 2 digits of year
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  // Generate sequential number for the day (simulated here)
  // In a real app, this would come from the database
  const sequence = Math.floor(Math.random() * 999) + 1;
  const sequenceNum = sequence.toString().padStart(3, '0');

  // Format: BRANCHCODE-YYMMDD-SEQ
  // Example: SE-250113-001 (Seseduh, Jan 13, 2025, first order)
  return `${branchCode}-${year}${month}${day}-${sequenceNum}`;
}