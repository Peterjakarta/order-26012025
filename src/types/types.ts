// Add these types to the existing types.ts file
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'staff';
  permissions: string[];
}

export interface StockLevel {
  quantity: number;
  minStock?: number;
  updatedAt: string;
}

export interface StockHistory {
  id: string;
  ingredientId: string;
  orderId: string;
  previousQuantity: number;
  newQuantity: number;
  changeAmount: number;
  changeType: 'reduction' | 'reversion' | 'manual';
  timestamp: string;
  userId: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  details?: string;
  category: 'products' | 'orders' | 'recipes' | 'ingredients' | 'categories' | 'users' | 'auth' | 'stock' | 'system';
  itemId?: string;
  metadata?: Record<string, any>;
}

export interface StockCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface StockCategoryItem {
  category_id: string;
  ingredient_id: string;
  created_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
}

export interface CategoryData {
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'truffles' | 'bars' | 'pralines' | 'seasonal' | 'gifts' | 'trail';
  description?: string;
  unit?: string;
  price?: number;
  minOrder?: number;
  quantityStep?: number;
  showPrice: boolean;
  showDescription: boolean;
  showMinOrder: boolean;
  showUnit: boolean;
  // HACCP Information
  haccp?: {
    internalProductionCode?: string;
    productCategories?: string; // Reference to category ID
    productDescription?: string;
    ingredients?: string[]; // Array of ingredient IDs from recipe
    shelfLifeWeeks?: number; // 1-20 weeks, or 26, 52, 78, 104 for months
    awValue?: string;
    storageTemperature?: string;
    storageHumidity?: string;
    innerPackingId?: string; // Reference to ingredient ID
    innerPackingHasDoc?: boolean; // Whether inner packing has documentation
    outerPackingId?: string; // Reference to ingredient ID
    outerPackingHasDoc?: boolean; // Whether outer packing has documentation
    shippingPackingId?: string; // Reference to ingredient ID
    shippingPackingHasDoc?: boolean; // Whether shipping packing has documentation
    allergens?: string[]; // Array of allergen types
  };
}

export interface Order {
  id: string;
  branchId: string;
  orderedBy: string;
  orderDate: string;
  deliveryDate: string;
  poNumber?: string;
  notes?: string;
  products: OrderItem[];
  status: 'pending' | 'processing' | 'completed';
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  orderNumber?: string;
  productionStartDate?: string;
  productionEndDate?: string;
  stockReduced?: boolean;
  batchNumber?: string;

  // Special fields for R&D products
  isRDProduct?: boolean;
  rdProductData?: any; // Type for the R&D product data
}

export interface OrderItem {
  productId: string;
  quantity: number;
  producedQuantity?: number;
  stockQuantity?: number;
  rejectQuantity?: number;
  rejectNotes?: string;
}

export interface Branch {
  id: string;
  name: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  packageSize: number;
  packageUnit: string;
  price: number;
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  category: string;
  productId: string;
  yield: number;
  yieldUnit: string;
  ingredients: RecipeIngredient[];
  shellIngredients?: RecipeIngredient[];
  laborCost?: number;
  packagingCost?: number;
  equipmentCost?: number; // New field: equipment usage cost
  rejectPercentage?: number; // New field: reject amount in %
  taxPercentage?: number; // New field: tax in %
  marginPercentage?: number; // New field: margin in %
  notes?: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  amount: number;
}

// New type for the approval forms
export interface ApprovalForm {
  id: string;
  productId: string;
  productName: string;
  createdBy: string;
  creatorEmail: string;
  formData: Record<string, any>;
  menuSections: {
    id: string;
    name: string;
    description: string;
  }[];
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  testResults: any[];
  hasRecipe: boolean;
  approverNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  yield?: number;
  yieldUnit?: string;
}