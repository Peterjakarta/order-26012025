import React, { useState } from 'react';
import { Printer, FileText, X } from 'lucide-react';
import type { Order, Product } from '../../../types/types';
import { formatDate } from '../../../utils/dateUtils';
import { branches } from '../../../data/branches';

interface ProductionSummaryProps {
  order: Order;
  products: Product[];
}

export default function ProductionSummary({ order, products }: ProductionSummaryProps) {
  const [showPopup, setShowPopup] = useState(false);
  const branch = branches.find(b => b.id === order.branchId);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = generatePrintContent();
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPDF = () => {
    // In a real app, we'd use a PDF library here
    // For now, we'll just create a text file
    const content = generateTextContent();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-summary-${order.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateTextContent = () => {
    const lines = [
      `Production Summary - Order #${order.id.slice(0, 8)}`,
      `Branch: ${branch?.name}`,
      `Delivery Date: ${formatDate(order.deliveryDate)}`,
      '',
      'Products:',
      ...order.products.map(item => {
        const product = products.find(p => p.id === item.productId);
        return `${product?.name}: ${item.quantity} ${product?.unit || 'units'}`;
      }),
      '',
      order.notes ? `Notes: ${order.notes}` : ''
    ];

    return lines.join('\n');
  };

  const generatePrintContent = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Production Summary - Order #${order.id.slice(0, 8)}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              line-height: 1.5;
              padding: 2rem;
              max-width: 800px;
              margin: 0 auto;
            }
            .header { margin-bottom: 2rem; }
            .products { margin: 2rem 0; }
            .product {
              padding: 1rem;
              border-bottom: 1px solid #eee;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Production Summary</h1>
            <p>Order #${order.id.slice(0, 8)}</p>
            <p>Branch: ${branch?.name}</p>
            <p>Delivery Date: ${formatDate(order.deliveryDate)}</p>
            ${order.notes ? `<p>Notes: ${order.notes}</p>` : ''}
          </div>

          <div class="products">
            ${order.products.map(item => {
              const product = products.find(p => p.id === item.productId);
              return `
                <div class="product">
                  <h3>${product?.name}</h3>
                  <p>${item.quantity} ${product?.unit || 'units'}</p>
                </div>
              `;
            }).join('')}
          </div>
        </body>
      </html>
    `;
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm divide-y">
        <div className="p-4 flex justify-between items-center">
          <h3 className="font-medium">Production Summary</h3>
          <button
            onClick={() => setShowPopup(true)}
            className="px-4 py-2 text-sm bg-pink-600 text-white rounded-md hover:bg-pink-700"
          >
            View Summary
          </button>
        </div>

        {order.products.map(item => {
          const product = products.find(p => p.id === item.productId);
          if (!product) return null;

          return (
            <div key={product.id} className="p-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">{product.name}</h4>
                <p className="text-sm">
                  {item.quantity} {product.unit || 'units'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">Production Summary</h2>
                  <p className="text-sm text-gray-600">Order #{order.id.slice(0, 8)}</p>
                </div>
                <button
                  onClick={() => setShowPopup(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p><span className="font-medium">Branch:</span> {branch?.name}</p>
                  <p><span className="font-medium">Delivery Date:</span> {formatDate(order.deliveryDate)}</p>
                  {order.notes && (
                    <p><span className="font-medium">Notes:</span> {order.notes}</p>
                  )}
                </div>

                <div className="divide-y">
                  {order.products.map(item => {
                    const product = products.find(p => p.id === item.productId);
                    if (!product) return null;

                    return (
                      <div key={product.id} className="py-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm">
                            {item.quantity} {product.unit || 'units'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t p-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
              >
                <FileText className="w-4 h-4" />
                Download Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}