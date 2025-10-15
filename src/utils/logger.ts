import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS, auth } from '../lib/firebase';

export type LogCategory = 'products' | 'orders' | 'recipes' | 'ingredients' | 'categories' | 'users' | 'auth' | 'stock' | 'system';
export type LogAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'complete'
  | 'cancel'
  | 'import'
  | 'export'
  | 'login'
  | 'logout'
  | 'password_change';

interface LogParams {
  category: LogCategory;
  action: LogAction;
  itemName?: string;
  itemId?: string;
  details?: string;
  metadata?: Record<string, any>;
}

export async function logActivity(params: LogParams): Promise<void> {
  try {
    const user = auth.currentUser;

    if (!user) {
      console.warn('Cannot log activity: No authenticated user');
      return;
    }

    const username = user.displayName || user.email || 'Unknown User';

    let actionText = '';

    switch (params.action) {
      case 'create':
        actionText = `Created ${params.itemName || 'item'}`;
        break;
      case 'update':
        actionText = `Updated ${params.itemName || 'item'}`;
        break;
      case 'delete':
        actionText = `Deleted ${params.itemName || 'item'}`;
        break;
      case 'complete':
        actionText = `Completed ${params.itemName || 'item'}`;
        break;
      case 'cancel':
        actionText = `Cancelled ${params.itemName || 'item'}`;
        break;
      case 'import':
        actionText = `Imported ${params.itemName || 'items'}`;
        break;
      case 'export':
        actionText = `Exported ${params.itemName || 'items'}`;
        break;
      case 'login':
        actionText = 'Logged in';
        break;
      case 'logout':
        actionText = 'Logged out';
        break;
      case 'password_change':
        actionText = 'Changed password';
        break;
      default:
        actionText = params.action;
    }

    const logEntry = {
      timestamp: serverTimestamp(),
      userId: user.uid,
      username,
      category: params.category,
      action: actionText,
      details: params.details,
      itemId: params.itemId,
      metadata: params.metadata || null
    };

    await addDoc(collection(db, COLLECTIONS.LOGS), logEntry);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export function logProductCreate(productName: string, productId: string, category?: string) {
  return logActivity({
    category: 'products',
    action: 'create',
    itemName: productName,
    itemId: productId,
    details: category ? `Category: ${category}` : undefined
  });
}

export function logProductUpdate(productName: string, productId: string, changes?: string) {
  return logActivity({
    category: 'products',
    action: 'update',
    itemName: productName,
    itemId: productId,
    details: changes
  });
}

export function logProductDelete(productName: string, productId: string) {
  return logActivity({
    category: 'products',
    action: 'delete',
    itemName: productName,
    itemId: productId
  });
}

export function logOrderCreate(orderNumber: string, orderId: string, branch?: string) {
  return logActivity({
    category: 'orders',
    action: 'create',
    itemName: `Order #${orderNumber}`,
    itemId: orderId,
    details: branch ? `Branch: ${branch}` : undefined
  });
}

export function logOrderUpdate(orderNumber: string, orderId: string, changes?: string) {
  return logActivity({
    category: 'orders',
    action: 'update',
    itemName: `Order #${orderNumber}`,
    itemId: orderId,
    details: changes
  });
}

export function logOrderComplete(orderNumber: string, orderId: string) {
  return logActivity({
    category: 'orders',
    action: 'complete',
    itemName: `Order #${orderNumber}`,
    itemId: orderId
  });
}

export function logOrderCancel(orderNumber: string, orderId: string, reason?: string) {
  return logActivity({
    category: 'orders',
    action: 'cancel',
    itemName: `Order #${orderNumber}`,
    itemId: orderId,
    details: reason
  });
}

export function logRecipeCreate(recipeName: string, recipeId: string) {
  return logActivity({
    category: 'recipes',
    action: 'create',
    itemName: recipeName,
    itemId: recipeId
  });
}

export function logRecipeUpdate(recipeName: string, recipeId: string) {
  return logActivity({
    category: 'recipes',
    action: 'update',
    itemName: recipeName,
    itemId: recipeId
  });
}

export function logRecipeDelete(recipeName: string, recipeId: string) {
  return logActivity({
    category: 'recipes',
    action: 'delete',
    itemName: recipeName,
    itemId: recipeId
  });
}

export function logIngredientCreate(ingredientName: string, ingredientId: string) {
  return logActivity({
    category: 'ingredients',
    action: 'create',
    itemName: ingredientName,
    itemId: ingredientId
  });
}

export function logIngredientUpdate(ingredientName: string, ingredientId: string, changes?: string) {
  return logActivity({
    category: 'ingredients',
    action: 'update',
    itemName: ingredientName,
    itemId: ingredientId,
    details: changes
  });
}

export function logIngredientDelete(ingredientName: string, ingredientId: string) {
  return logActivity({
    category: 'ingredients',
    action: 'delete',
    itemName: ingredientName,
    itemId: ingredientId
  });
}

export function logStockUpdate(ingredientName: string, ingredientId: string, oldQty: number, newQty: number) {
  const change = newQty - oldQty;
  const changeText = change > 0 ? `+${change}` : `${change}`;

  return logActivity({
    category: 'stock',
    action: 'update',
    itemName: ingredientName,
    itemId: ingredientId,
    details: `Stock changed: ${oldQty} → ${newQty} (${changeText})`
  });
}

export function logCategoryCreate(categoryName: string, categoryId: string) {
  return logActivity({
    category: 'categories',
    action: 'create',
    itemName: categoryName,
    itemId: categoryId
  });
}

export function logCategoryUpdate(categoryName: string, categoryId: string) {
  return logActivity({
    category: 'categories',
    action: 'update',
    itemName: categoryName,
    itemId: categoryId
  });
}

export function logCategoryDelete(categoryName: string, categoryId: string) {
  return logActivity({
    category: 'categories',
    action: 'delete',
    itemName: categoryName,
    itemId: categoryId
  });
}

export function logBulkImport(category: LogCategory, itemType: string, count: number) {
  return logActivity({
    category,
    action: 'import',
    itemName: `${count} ${itemType}`,
    details: `Bulk imported ${count} ${itemType}`
  });
}

export function logExport(category: LogCategory, itemType: string, count: number, format: string) {
  return logActivity({
    category,
    action: 'export',
    itemName: `${count} ${itemType}`,
    details: `Exported to ${format.toUpperCase()}`
  });
}

export function logUserLogin() {
  return logActivity({
    category: 'auth',
    action: 'login'
  });
}

export function logUserLogout() {
  return logActivity({
    category: 'auth',
    action: 'logout'
  });
}

export function logPasswordChange() {
  return logActivity({
    category: 'auth',
    action: 'password_change'
  });
}
