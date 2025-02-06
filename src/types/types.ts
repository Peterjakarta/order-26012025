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
  category: 'auth' | 'feature' | 'system';
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