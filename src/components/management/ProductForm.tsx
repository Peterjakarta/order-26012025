import React from 'react';
import { useCategories } from '../../hooks/useCategories';
import ProductBasicInfo from './product-form/ProductBasicInfo';
import ProductPricing from './product-form/ProductPricing';
import ProductCategory from './product-form/ProductCategory';
import type { Product } from '../../types/types';

interface ProductFormProps {
  product?: Product | null;
  initialCategory?: string;
  onSubmit: (data: Omit<Product, 'id'>) => void;
  onCancel: () => void;
}

export default function ProductForm({ 
  product, 
  initialCategory,
  onSubmit, 
  onCancel 
}: ProductFormProps) {
  const { categories } = useCategories();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Get checkbox values
    const showPrice = formData.get('showPrice') === 'on';
    const showDescription = formData.get('showDescription') === 'on';
    const showMinOrder = formData.get('showMinOrder') === 'on';
    const showUnit = formData.get('showUnit') === 'on';

    // Get and validate category
    const category = formData.get('category') as string;
    if (!category) {
      alert('Please select a category');
      return;
    }

    // Get and parse numeric values
    const price = formData.get('price') ? parseFloat(formData.get('price') as string) : undefined;
    const minOrder = formData.get('minOrder') ? parseInt(formData.get('minOrder') as string, 10) : undefined;
    const quantityStep = formData.get('quantityStep') ? parseInt(formData.get('quantityStep') as string, 10) : undefined;

    // Get text values
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || undefined;
    const unit = formData.get('unit') as string || undefined;

    // Validate required fields
    if (!name) {
      alert('Product name is required');
      return;
    }

    const productData: Omit<Product, 'id'> = {
      name,
      category,
      description,
      price,
      unit,
      minOrder,
      quantityStep,
      showPrice,
      showDescription,
      showMinOrder,
      showUnit
    };

    onSubmit(productData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg border border-gray-100 space-y-6">
      <ProductBasicInfo product={product} />
      <ProductCategory 
        product={product} 
        initialCategory={initialCategory}
        categories={categories} 
      />
      <ProductPricing product={product} />

      <div className="flex justify-end gap-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 bg-white rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors duration-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-white rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-200 transform transition-all duration-300 hover:scale-[1.02]"
        >
          {product ? 'Update' : 'Add'} Product
        </button>
      </div>
    </form>
  );
}