export function getQuantityStep(category: string, productStep?: number): number {
  // If product has a custom step, use that
  if (productStep && productStep > 0) {
    return productStep;
  }

  // Otherwise use category defaults
  switch (category.toLowerCase()) {
    case 'bonbon':
    case 'bonbon-alcohol':
      return 21; // Default to smallest mould size for flexibility
    default:
      return 1;
  }
}

export function roundToNearestStep(quantity: number, step: number, category?: string, productStep?: number): number {
  if (quantity === 0) return 0;
  
  // If product has a custom step, use that instead of category logic
  if (productStep && productStep > 0) {
    const rounded = Math.round(quantity / productStep) * productStep;
    return rounded < productStep ? productStep : rounded;
  }
  
  const lowerCategory = category?.toLowerCase();
  
  // Special handling for BonBon categories
  if (lowerCategory === 'bonbon' || lowerCategory === 'bonbon-alcohol') {
    // Try each mould size in order of preference
    if (quantity >= 32 && quantity % 32 === 0) return quantity;
    if (quantity >= 28 && quantity % 28 === 0) return quantity;
    if (quantity >= 21 && quantity % 21 === 0) return quantity;
    
    // If no exact match, suggest the next valid quantity
    if (quantity < 21) return 21;
    if (quantity < 28) return 28;
    if (quantity < 32) return 32;
    
    // For larger quantities, round to nearest valid mould size
    const mould32 = Math.ceil(quantity / 32) * 32;
    const mould28 = Math.ceil(quantity / 28) * 28;
    const mould21 = Math.ceil(quantity / 21) * 21;
    
    // Return the closest option
    return [mould32, mould28, mould21].reduce((a, b) => 
      Math.abs(b - quantity) < Math.abs(a - quantity) ? b : a
    );
  }
  
  // Default rounding for other categories
  const rounded = Math.round(quantity / step) * step;
  return rounded < step ? step : rounded;
}

export function getNextQuantity(currentQuantity: number, step: number, increase: boolean, category?: string, productStep?: number): number {
  // If product has a custom step, use that instead of category logic
  if (productStep && productStep > 0) {
    if (increase) {
      return currentQuantity === 0 ? productStep : currentQuantity + productStep;
    }
    const newQuantity = currentQuantity - productStep;
    return newQuantity < productStep ? 0 : newQuantity;
  }

  const lowerCategory = category?.toLowerCase();
  
  // Special handling for BonBon categories
  if (lowerCategory === 'bonbon' || lowerCategory === 'bonbon-alcohol') {
    if (increase) {
      if (currentQuantity === 0) return 21;
      if (currentQuantity === 21) return 28;
      if (currentQuantity === 28) return 32;
      if (currentQuantity % 32 === 0) return currentQuantity + 32;
      if (currentQuantity % 28 === 0) return currentQuantity + 28;
      if (currentQuantity % 21 === 0) return currentQuantity + 21;
      return Math.min(
        Math.ceil(currentQuantity / 32) * 32,
        Math.ceil(currentQuantity / 28) * 28,
        Math.ceil(currentQuantity / 21) * 21
      );
    } else {
      if (currentQuantity <= 21) return 0;
      if (currentQuantity === 32) return 28;
      if (currentQuantity === 28) return 21;
      if (currentQuantity % 32 === 0) return currentQuantity - 32;
      if (currentQuantity % 28 === 0) return currentQuantity - 28;
      if (currentQuantity % 21 === 0) return currentQuantity - 21;
      return Math.max(
        Math.floor(currentQuantity / 32) * 32,
        Math.floor(currentQuantity / 28) * 28,
        Math.floor(currentQuantity / 21) * 21
      );
    }
  }
  
  // Default behavior for other categories
  if (increase) {
    return currentQuantity === 0 ? step : currentQuantity + step;
  }
  const newQuantity = currentQuantity - step;
  return newQuantity < step ? 0 : newQuantity;
}

export function isBonBonCategory(category: string): boolean {
  const lowerCategory = category.toLowerCase();
  return lowerCategory === 'bonbon' || lowerCategory === 'bonbon-alcohol';
}

export function isPralinesCategory(category: string): boolean {
  const lowerCategory = category.toLowerCase();
  return lowerCategory === 'pralines' || lowerCategory === 'pralines-alcohol';
}

export function validateQuantityForCategory(quantity: number, category: string, productStep?: number): boolean {
  if (quantity === 0) return true;

  // If product has a custom step, validate against that
  if (productStep && productStep > 0) {
    return quantity % productStep === 0;
  }
  
  const lowerCategory = category.toLowerCase();
  
  // Special validation for BonBon categories
  if (lowerCategory === 'bonbon' || lowerCategory === 'bonbon-alcohol') {
    return quantity % 32 === 0 || quantity % 28 === 0 || quantity % 21 === 0;
  }
  
  const step = getQuantityStep(category);
  return quantity % step === 0;
}