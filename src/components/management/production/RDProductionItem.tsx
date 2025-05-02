import React from 'react';
import { Calendar, FileText, Eye } from 'lucide-react';
import { RDProduct } from '../../../types/rd-types';
import { useStore } from '../../../store/StoreContext';

interface RDProductionItemProps {
  product: RDProduct;
  onViewDetails: (product: RDProduct) => void;
}

export default function RDProductionItem({ 
  product, 
  onViewDetails 
}: RDProductionItemProps) {
  const { categories } = useStore();
  
  // Get the category name
  let categoryName = product.category;
  if (categories[product.category]) {
    categoryName = categories[product.category].name;
  } else if (product.category.startsWith('rd-category-')) {
    // Get R&D category names from localStorage
    try {
      const storedCategories = localStorage.getItem('rd-categories-data');
      if (storedCategories) {
        const rdCategories = JSON.parse(storedCategories);
        const category = rdCategories.find((c: any) => c.id === product.category);
        if (category) {
          categoryName = category.name;
        }
      }
    } catch (error) {
      console.error('Error fetching R&D category name:', error);
    }
  }
  
  const statusClass = {
    'planning': 'bg-blue-100 text-blue-800',
    'development': 'bg-amber-100 text-amber-800',
    'testing': 'bg-purple-100 text-purple-800',
    'approved': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800'
  }[product.status] || 'bg-gray-100 text-gray-800';
  
  // Calculate days remaining until target production date
  const daysRemaining = (() => {
    if (!product.targetProductionDate) return null;
    
    const today = new Date();
    const targetDate = new Date(product.targetProductionDate);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  })();

  return (
    <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 hover:bg-cyan-100 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-cyan-900">{product.name}</h4>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
              {product.status}
            </span>
          </div>
          
          <div className="text-sm text-cyan-800 mt-1">
            Category: {categoryName}
          </div>
          
          <div className="flex items-center gap-3 mt-2 text-sm text-cyan-700">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                Target: {new Date(product.targetProductionDate || '').toLocaleDateString()}
                {daysRemaining !== null && (
                  <span className="ml-1 text-xs font-medium">
                    ({daysRemaining > 0 ? `${daysRemaining} days left` : 'Due today'})
                  </span>
                )}
              </span>
            </div>
          </div>
          
          {product.notes && (
            <div className="mt-2 text-sm text-cyan-700 flex items-start gap-1">
              <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="line-clamp-1">{product.notes}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-cyan-200 flex justify-end">
        <button
          onClick={() => onViewDetails(product)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white text-cyan-700 border border-cyan-300 rounded-md hover:bg-cyan-50"
        >
          <Eye className="w-4 h-4" />
          View Details
        </button>
      </div>
    </div>
  );
}