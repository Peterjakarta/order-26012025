export function calculateMouldCount(category: string, quantity: number): string {
  if (!category || quantity <= 0) return '-';
  
  const lowerCategory = category.toLowerCase();
  
  // Handle BonBon categories
  if (lowerCategory === 'bonbon' || lowerCategory === 'bonbon-alcohol') {
    // Try each mould size in order of preference
    if (quantity % 32 === 0) return `${quantity / 32} moulds (32pc)`;
    if (quantity % 28 === 0) return `${quantity / 28} moulds (28pc)`;
    if (quantity % 21 === 0) return `${quantity / 21} moulds (21pc)`;
  }
  
  // Handle Pralines
  if (lowerCategory === 'pralines' || lowerCategory === 'pralines-alcohol') {
    if (quantity <= 52) return 'S-Frame';
    return 'L-Frame';
  }
  
  return '-'; // Return dash for non-matching categories or quantities
}