// Utility function to get consistent branch styles across components
export function getBranchStyles(branchId: string) {
  switch (branchId) {
    case 'seseduh':
      return {
        base: 'bg-blue-100 text-blue-800',
        border: 'border-blue-200',
        gradient: 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50',
        hover: 'hover:from-blue-100 hover:via-blue-200 hover:to-blue-100',
        text: 'text-blue-800',
        badge: 'bg-blue-200/80 text-blue-900',
        shadow: 'shadow-blue-100',
        ring: 'ring-blue-400'
      };
    case '2go':
      return {
        base: 'bg-emerald-100 text-emerald-800',
        border: 'border-emerald-200',
        gradient: 'bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-50',
        hover: 'hover:from-emerald-100 hover:via-emerald-200 hover:to-emerald-100',
        text: 'text-emerald-800',
        badge: 'bg-emerald-200/80 text-emerald-900',
        shadow: 'shadow-emerald-100',
        ring: 'ring-emerald-400'
      };
    case 'external':
      return {
        base: 'bg-violet-100 text-violet-800',
        border: 'border-violet-200',
        gradient: 'bg-gradient-to-br from-violet-50 via-violet-100 to-violet-50',
        hover: 'hover:from-violet-100 hover:via-violet-200 hover:to-violet-100',
        text: 'text-violet-800',
        badge: 'bg-violet-200/80 text-violet-900',
        shadow: 'shadow-violet-100',
        ring: 'ring-violet-400'
      };
    default:
      return {
        base: 'bg-gray-100 text-gray-800',
        border: 'border-gray-200',
        gradient: 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50',
        hover: 'hover:from-gray-100 hover:via-gray-200 hover:to-gray-100',
        text: 'text-gray-800',
        badge: 'bg-gray-200/80 text-gray-900',
        shadow: 'shadow-gray-100',
        ring: 'ring-gray-400'
      };
  }
}