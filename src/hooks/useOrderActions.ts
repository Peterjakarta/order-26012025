import { useCallback } from 'react';
import { useStore } from '../store/StoreContext';
import { generateOrderPDF } from '../utils/pdfGenerator';
import type { Order } from '../types/types';

export function useOrderActions() {
  const { products } = useStore();

  const printOrder = useCallback((order: Order, poNumber?: string) => {
    // Generate PDF and open in new window for printing
    const doc = generateOrderPDF(order, products, poNumber);
    const pdfData = doc.output('datauristring');
    
    const printWindow = window.open('');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Order #${order.id}</title>
          </head>
          <body style="margin:0;padding:0;">
            <embed width="100%" height="100%" src="${pdfData}" type="application/pdf" />
            <script>
              document.addEventListener('DOMContentLoaded', function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 1000);
              });
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }, [products]);

  const emailOrder = useCallback((order: Order, poNumber?: string) => {
    // Generate PDF for attachment
    const doc = generateOrderPDF(order, products, poNumber);
    const pdfBlob = doc.output('blob');
    
    // Create a FormData object to send the PDF
    const formData = new FormData();
    formData.append('pdf', pdfBlob, `order-${order.id}.pdf`);
    
    // For now, we'll open the default email client
    // In a production environment, you would typically:
    // 1. Send this to your backend
    // 2. Have the backend send the email with the PDF attachment
    // 3. Handle success/failure states
    const subject = `Order #${order.id}${poNumber ? ` - PO#${poNumber}` : ''}`;
    const body = `Please find the order details attached.\n\nThank you!`;
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Save the PDF locally since we can't attach it via mailto
    doc.save(`order-${order.id}.pdf`);
  }, [products]);

  const downloadPDF = useCallback((order: Order, poNumber?: string) => {
    const doc = generateOrderPDF(order, products, poNumber);
    doc.save(`order-${poNumber || order.id.slice(0, 8)}.pdf`);
  }, [products]);

  return { printOrder, emailOrder, downloadPDF };
}