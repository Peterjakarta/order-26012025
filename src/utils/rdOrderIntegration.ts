import { Order } from '../types/types';
import { RDProduct } from '../types/rd-types';

// Helper function to sanitize data for Firestore (convert undefined to null)
function sanitizeForFirestore(data: any): any {
  if (data === undefined) {
    return null;
  }
  
  if (data === null || typeof data !== 'object' || data instanceof Date) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item));
  }
  
  return Object.entries(data).reduce((result, [key, value]) => {
    result[key] = sanitizeForFirestore(value);
    return result;
  }, {} as Record<string, any>);
}

// Convert an R&D product to an order format
export async function createOrderFromRDProduct(
  rdProduct: RDProduct,
  addOrderFn: (orderData: Omit<Order, 'id' | 'createdAt' | 'status' | 'orderNumber'>) => Promise<{ id: string }>
): Promise<string | null> {
  try {
    if (!rdProduct.targetProductionDate) {
      throw new Error('Target production date is required');
    }

    // Sanitize the R&D product data to replace undefined with null for Firestore
    const sanitizedRdProduct = sanitizeForFirestore(rdProduct);

    // Create order data
    const orderData: Omit<Order, 'id' | 'createdAt' | 'status' | 'orderNumber'> = {
      branchId: 'production', // Default to production branch
      orderedBy: 'R&D Department',
      orderDate: rdProduct.developmentDate,
      deliveryDate: rdProduct.targetProductionDate,
      poNumber: `RD-${rdProduct.id.slice(-6)}`,
      products: [
        {
          productId: rdProduct.id,
          quantity: rdProduct.minOrder || 1,
        }
      ],
      notes: `R&D Product: ${rdProduct.name}\n\n${rdProduct.notes || ''}`,
      productionStartDate: rdProduct.developmentDate,
      productionEndDate: rdProduct.targetProductionDate,
      isRDProduct: true, // Flag to identify R&D products in orders
      rdProductData: sanitizedRdProduct // Store sanitized data
    };

    // Add order
    const result = await addOrderFn(orderData);
    
    return result.id;
  } catch (error) {
    console.error('Error creating order from R&D product:', error);
    return null;
  }
}

// Update existing order when R&D product changes
export async function syncRDProductWithOrder(
  rdProduct: RDProduct, 
  orderId: string,
  updateOrderFn: (id: string, data: Partial<Order>) => Promise<void>
): Promise<boolean> {
  try {
    if (!rdProduct.targetProductionDate) {
      throw new Error('Target production date is required');
    }

    // Sanitize the R&D product data to replace undefined with null for Firestore
    const sanitizedRdProduct = sanitizeForFirestore(rdProduct);

    // Update order data
    await updateOrderFn(orderId, {
      deliveryDate: rdProduct.targetProductionDate,
      productionStartDate: rdProduct.developmentDate,
      productionEndDate: rdProduct.targetProductionDate,
      notes: `R&D Product: ${rdProduct.name}\n\n${rdProduct.notes || ''}`,
      rdProductData: sanitizedRdProduct
    });

    return true;
  } catch (error) {
    console.error('Error syncing R&D product with order:', error);
    return false;
  }
}