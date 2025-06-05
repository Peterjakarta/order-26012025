import { Product, ProductCategory, CategoryData } from './types';

export interface RDProduct extends Omit<Product, 'id'> {
  id: string;
  developmentDate: string;
  targetProductionDate?: string;
  status: 'planning' | 'development' | 'testing' | 'approved' | 'rejected';
  testResults?: TestResult[];
  notes?: string;
  imageUrls?: string[];
  costEstimate?: number;
  createdBy: string;
  updatedAt: string;
  createdAt: string;
  recipeIngredients?: RecipeIngredient[];
  orderReference?: string; // Reference to the order in the production system
  approvedBy?: string; // Name of person who approved the product
  approvedDate?: string; // Date when product was approved
  approvalNotes?: string; // Additional notes from approval process
}

export interface RecipeIngredient {
  ingredientId: string;
  amount: number;
  unit?: string; // Added for better display in approval forms
  ingredientName?: string; // Added for better display in approval forms
}

export interface RDCategory extends CategoryData {
  id: string;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface TestResult {
  id: string;
  date: string;
  tester: string;
  result: 'pass' | 'fail' | 'pending';
  comments: string;
  parameters?: Record<string, any>;
}

export interface DevelopmentPhase {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  status: 'pending' | 'in-progress' | 'completed';
  notes?: string;
}

export interface ApprovalStatus {
  approved: boolean;
  approvedBy?: string;
  approvedDate?: string;
  comments?: string;
}

export interface DevelopmentDocument {
  id: string;
  productId: string;
  title: string;
  content: string;
  attachments?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// New interface for Recipe in R&D context
export interface RDRecipe {
  id: string;
  name: string;
  description?: string;
  productId: string;
  yield: number;
  yieldUnit: string;
  ingredients: RecipeIngredient[];
  instructions?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}