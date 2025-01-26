export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
}

export function addWorkingDays(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) {
      addedDays++;
    }
  }
  
  return result;
}

export function getInitialStartDate(): string {
  // Set to January 13, 2025 (Monday)
  const today = new Date(2025, 0, 13); // Month is 0-based
  
  // If it's after 2 PM, move to next working day
  if (today.getHours() >= 14) {
    today.setDate(today.getDate() + 1);
    while (isWeekend(today)) {
      today.setDate(today.getDate() + 1);
    }
  }
  
  return today.toISOString().split('T')[0];
}

export function getDefaultEndDate(startDate: string): string {
  const end = new Date(startDate);
  end.setDate(end.getDate() + 4);
  
  // Skip weekends
  while (isWeekend(end)) {
    end.setDate(end.getDate() + 1);
  }
  
  return end.toISOString().split('T')[0];
}

export function getMinDeliveryDate(branchId?: string): string {
  const today = new Date(2025, 0, 13); // January 13, 2025
  
  // Seseduh branch requires 2 weeks (10 working days) delivery time
  const requiredDays = branchId === 'seseduh' ? 10 : 4;
  
  const minDate = addWorkingDays(today, requiredDays);
  return minDate.toISOString().split('T')[0];
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function isValidDeliveryDate(date: string, branchId?: string): boolean {
  const deliveryDate = new Date(date);
  const minDate = new Date(getMinDeliveryDate(branchId));
  
  // Reset time parts for accurate date comparison
  deliveryDate.setHours(0, 0, 0, 0);
  minDate.setHours(0, 0, 0, 0);
  
  return deliveryDate >= minDate && !isWeekend(deliveryDate);
}

export function calculateExpiryDate(productionDate: string, category: string): Date {
  const date = new Date(productionDate);
  const lowerCategory = category.toLowerCase();

  // 28 days for chocolate confections
  if (
    lowerCategory.includes('bonbon') ||
    lowerCategory.includes('praline')
  ) {
    date.setDate(date.getDate() + 28);
  }
  // 1 year for bars and dragees
  else if (
    lowerCategory.includes('bar') ||
    lowerCategory.includes('dragee')
  ) {
    date.setFullYear(date.getFullYear() + 1);
  }

  return date;
}