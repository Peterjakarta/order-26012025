import type { ProductCategory, CategoryData } from '../types/types';

export const categories: Record<ProductCategory, CategoryData> = {
  truffles: {
    name: 'Luxury Truffles'
  },
  bars: {
    name: 'Chocolate Bars'
  },
  pralines: {
    name: 'Artisan Pralines'
  },
  seasonal: {
    name: 'Seasonal Collections'
  },
  gifts: {
    name: 'Gift Collections'
  },
  trail: {
    name: 'Trail Products'
  }
};