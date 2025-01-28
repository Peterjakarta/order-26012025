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
    case 'trail':
      return {
        base: 'bg-amber-100 text-amber-800',
        border: 'border-amber-200',
        gradient: 'bg-gradient-to-br from-amber-50 via-amber-100 to-amber-50',
        hover: 'hover:from-amber-100 hover:via-amber-200 hover:to-amber-100',
        text: 'text-amber-800',
        badge: 'bg-amber-200/80 text-amber-900',
        shadow: 'shadow-amber-100',
        ring: 'ring-amber-400'
      };
    case 'production':
      return {
        base: 'bg-cyan-100 text-cyan-800',
        border: 'border-cyan-200',
        gradient: 'bg-gradient-to-br from-cyan-50 via-cyan-100 to-cyan-50',
        hover: 'hover:from-cyan-100 hover:via-cyan-200 hover:to-cyan-100',
        text: 'text-cyan-800',
        badge: 'bg-cyan-200/80 text-cyan-900',
        shadow: 'shadow-cyan-100',
        ring: 'ring-cyan-400'
      };
    case 'events':
      return {
        base: 'bg-rose-100 text-rose-800',
        border: 'border-rose-200',
        gradient: 'bg-gradient-to-br from-rose-50 via-rose-100 to-rose-50',
        hover: 'hover:from-rose-100 hover:via-rose-200 hover:to-rose-100',
        text: 'text-rose-800',
        badge: 'bg-rose-200/80 text-rose-900',
        shadow: 'shadow-rose-100',
        ring: 'ring-rose-400'
      };
    case 'btob':
      return {
        base: 'bg-indigo-100 text-indigo-800',
        border: 'border-indigo-200',
        gradient: 'bg-gradient-to-br from-indigo-50 via-indigo-100 to-indigo-50',
        hover: 'hover:from-indigo-100 hover:via-indigo-200 hover:to-indigo-100',
        text: 'text-indigo-800',
        badge: 'bg-indigo-200/80 text-indigo-900',
        shadow: 'shadow-indigo-100',
        ring: 'ring-indigo-400'
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