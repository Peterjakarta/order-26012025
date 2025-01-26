import type { Order, Product } from '../types/types';

export function calculateOrderTotal(order: Order, products: Product[]): number {
  return order.products.reduce((total, item) => {
    const product = products.find(p => p.id === item.productId);
    if (product?.price) {
      return total + (product.price * item.quantity);
    }
    return total;
  }, 0);
}

export function calculateItemTotal(productId: string, quantity: number, products: Product[]): number {
  const product = products.find(p => p.id === productId);
  return product?.price ? product.price * quantity : 0;
}