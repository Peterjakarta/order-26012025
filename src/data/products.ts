import { Product } from '../types/types';

export const products: Product[] = [
  // Truffles
  {
    id: 'dark-truffle',
    name: 'Dark Chocolate Truffles',
    description: 'Premium dark chocolate truffles with 70% cocoa',
    unit: 'boxes',
    minOrder: 5,
    category: 'truffles',
    price: 24.99
  },
  {
    id: 'champagne-truffle',
    name: 'Champagne Truffles',
    description: 'Marc de Champagne dark chocolate truffles',
    unit: 'boxes',
    minOrder: 5,
    category: 'truffles',
    price: 29.99
  },
  
  // Bars
  {
    id: 'milk-bars',
    name: 'Milk Chocolate Bars',
    description: 'Creamy milk chocolate bars, 100g each',
    unit: 'cases',
    minOrder: 3,
    category: 'bars',
    price: 19.99
  },
  {
    id: 'single-origin',
    name: 'Single Origin Dark Bar',
    description: 'Madagascar 85% dark chocolate bars',
    unit: 'cases',
    minOrder: 3,
    category: 'bars',
    price: 22.99
  },
  
  // Pralines
  {
    id: 'classic-pralines',
    name: 'Classic Pralines',
    description: 'Belgian-style pralines with hazelnut filling',
    unit: 'boxes',
    minOrder: 4,
    category: 'pralines',
    price: 27.99
  },
  {
    id: 'caramel-pralines',
    name: 'Salted Caramel Pralines',
    description: 'Milk chocolate pralines with salted caramel',
    unit: 'boxes',
    minOrder: 4,
    category: 'pralines',
    price: 27.99
  },
  
  // Seasonal
  {
    id: 'easter-eggs',
    name: 'Easter Collection',
    description: 'Filled chocolate eggs and bunnies',
    unit: 'sets',
    minOrder: 2,
    category: 'seasonal',
    price: 34.99
  },
  {
    id: 'christmas-box',
    name: 'Christmas Selection',
    description: 'Festive chocolate assortment',
    unit: 'boxes',
    minOrder: 2,
    category: 'seasonal',
    price: 39.99
  },
  
  // Gifts
  {
    id: 'luxury-hamper',
    name: 'Luxury Gift Hamper',
    description: 'Premium selection of chocolates and truffles',
    unit: 'hampers',
    minOrder: 1,
    category: 'gifts',
    price: 89.99
  },
  {
    id: 'tasting-box',
    name: 'Chocolate Tasting Box',
    description: 'Curated selection for chocolate connoisseurs',
    unit: 'boxes',
    minOrder: 2,
    category: 'gifts',
    price: 49.99
  }
];