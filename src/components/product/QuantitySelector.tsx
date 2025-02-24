import React, { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { Product } from '../../types/types';
import { 
  getQuantityStep, 
  roundToNearestStep, 
  getNextQuantity, 
  isBonBonCategory,
  isPralinesCategory
} from '../../utils/quantityUtils';

interface QuantitySelectorProps {
  product: Product;
  quantity: number;
  onQuantityChange: (productId: string, quantity: number) => void;
}

export default function QuantitySelector({ product, quantity, onQuantityChange }: QuantitySelectorProps) {
  const minOrder = product.minOrder || 1;
  const [inputValue, setInputValue] = useState(quantity.toString());
  const step = product.quantityStep || getQuantityStep(product.category);

  useEffect(() => {
    setInputValue(quantity.toString());
  }, [quantity]);

  const handleDecrease = () => {
    if (quantity === 0) return;
    const newQuantity = getNextQuantity(quantity, step, false, product.category, product.quantityStep);
    onQuantityChange(product.id, newQuantity);
  };

  const handleIncrease = () => {
    const newQuantity = getNextQuantity(quantity, step, true, product.category, product.quantityStep);
    onQuantityChange(product.id, newQuantity);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      const roundedValue = roundToNearestStep(numValue, step, product.category, product.quantityStep);
      onQuantityChange(product.id, roundedValue);
    }
  };

  const handleBlur = () => {
    const numValue = parseInt(inputValue, 10);
    if (isNaN(numValue)) {
      setInputValue(quantity.toString());
      return;
    }
    
    const roundedValue = roundToNearestStep(numValue, step, product.category, product.quantityStep);
    setInputValue(roundedValue.toString());
    onQuantityChange(product.id, roundedValue);
  };

  const getStepDescription = () => {
    if (product.quantityStep) {
      return `Steps of ${product.quantityStep}`;
    }
    if (isPralinesCategory(product.category)) {
      return "Quantities: 52 or 90";
    }
    if (isBonBonCategory(product.category)) {
      return `Steps of ${step}`;
    }
    return null;
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrease}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-50 disabled:hover:bg-transparent"
          disabled={quantity === 0}
          title={quantity === 0 ? "Can't decrease" : `Decrease quantity`}
        >
          <Minus className="w-4 h-4" />
        </button>
        
        <input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          min="0"
          step={step}
          className="w-16 text-center font-medium border rounded-md py-1 px-2"
          title={`Enter quantity (steps of ${step})`}
        />
        
        <button
          type="button"
          onClick={handleIncrease}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
          title={`Increase quantity`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      <div className="text-xs text-gray-500">
        {getStepDescription()}
        {product.showUnit && product.unit && (
          <span> {product.unit}</span>
        )}
      </div>
    </div>
  );
}