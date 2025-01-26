import { branches } from '../data/branches';
import type { Order, Product } from '../types/types';

export function formatOrderForPrint(
  order: Order, 
  products: Product[],
  isHTML = true,
  poNumber?: string
): string {
  const branch = branches.find(b => b.id === order.branchId);
  
  if (isHTML) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order #${order.id}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              line-height: 1.5;
              padding: 2rem;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              margin-bottom: 2rem;
            }
            .header h1 {
              font-size: 24px;
              margin-bottom: 1.5rem;
            }
            .header p {
              margin: 0.5rem 0;
              color: #374151;
            }
            .products {
              width: 100%;
              border-collapse: collapse;
              margin: 2rem 0;
            }
            .products th {
              background-color: #EC4899;
              color: white;
              text-align: left;
              padding: 0.75rem 1rem;
            }
            .products td {
              padding: 0.75rem 1rem;
              border-bottom: 1px solid #E5E7EB;
            }
            .products tr:nth-child(even) {
              background-color: #F9FAFB;
            }
            .notes {
              margin-top: 2rem;
              padding: 1rem;
              background-color: #F3F4F6;
              border-radius: 0.5rem;
            }
            @media print {
              body { padding: 0; }
              .products th { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Order Details</h1>
            ${poNumber ? `<p><strong>PO Number:</strong> ${poNumber}</p>` : ''}
            <p><strong>Branch:</strong> ${branch?.name}</p>
            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p><strong>Delivery Date:</strong> ${new Date(order.deliveryDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
          </div>

          <table class="products">
            <thead>
              <tr>
                <th style="width: 40%">Product</th>
                <th style="width: 20%">Ordered</th>
                <th style="width: 15%">Unit</th>
                <th style="width: 25%">Produced</th>
              </tr>
            </thead>
            <tbody>
              ${order.products.map(item => {
                const product = products.find(p => p.id === item.productId);
                return `
                  <tr>
                    <td>${product?.name}</td>
                    <td>${item.quantity}</td>
                    <td>${product?.unit || ''}</td>
                    <td>${item.producedQuantity || 0}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          ${order.notes ? `
            <div class="notes">
              <strong>Notes:</strong>
              <p>${order.notes}</p>
            </div>
          ` : ''}
        </body>
      </html>
    `;
  }

  // Plain text format for email
  const lines = [
    'Order Details',
    '=============',
    '',
    poNumber ? `PO Number: ${poNumber}` : '',
    `Branch: ${branch?.name}`,
    `Order Date: ${new Date(order.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`,
    `Delivery Date: ${new Date(order.deliveryDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`,
    '',
    'Products:',
    '--------',
    ...order.products.map(item => {
      const product = products.find(p => p.id === item.productId);
      return [
        product?.name,
        `  Ordered: ${item.quantity} ${product?.unit || ''}`,
        `  Produced: ${item.producedQuantity || 0} ${product?.unit || ''}`,
      ].join('\n');
    }),
    '',
    order.notes ? [
      'Notes:',
      '------',
      order.notes
    ].join('\n') : ''
  ].filter(Boolean);

  return lines.join('\n');
}