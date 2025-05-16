import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RDProduct } from '../types/rd-types';
import { formatDate } from './dateUtils';

export function generateRDApprovalPDF(product: RDProduct, approver?: string): jsPDF {
  // Create new PDF document
  const doc = new jsPDF();
  
  // Set up variables
  const margin = 14;
  const lineHeight = 8;
  let y = 20;
  
  // Add title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RESEARCH AND DEVELOPMENT APPROVAL FORM', margin, y);
  
  // Add underline
  doc.setLineWidth(0.5);
  doc.line(margin, y + 3, 196, y + 3);
  
  // Reset font
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  y += 15;
  
  // Add form fields
  doc.text('Tanggal/Date:', margin, y);
  doc.text(formatDate(product.developmentDate), 60, y);
  
  y += lineHeight;
  doc.text('Pembuat/Creator:', margin, y);
  doc.text(product.createdBy || 'R&D Department', 60, y);
  
  y += lineHeight;
  doc.text('Divisi/Division:', margin, y);
  doc.text('Product Development', 60, y);
  
  y += lineHeight * 1.5;
  
  doc.text('Nama Menu/Menu Name:', margin, y);
  doc.text(product.name, 60, y);
  
  y += lineHeight;
  doc.text('Kode Menu/ Menu Code:', margin, y);
  doc.text(product.id.slice(0, 12), 60, y);
  
  y += lineHeight * 1.5;
  
  doc.text('Penggunaan Menu/Menu Usage:', margin, y);
  if (product.description) {
    doc.text(product.description, 60, y);
  }
  
  y += lineHeight;
  doc.text('Periode Menu/Menu Period:', margin, y);
  if (product.targetProductionDate) {
    doc.text(`From ${formatDate(product.targetProductionDate)}`, 60, y);
  }
  
  y += lineHeight * 1.5;
  
  doc.text('Deskripsi Menu/Menu Description:', margin, y);
  
  // Add multiline description as a table without borders
  y += 5;
  if (product.notes) {
    autoTable(doc, {
      startY: y,
      theme: 'plain',
      styles: { cellPadding: 0, fontSize: 11 },
      margin: { left: 60 },
      body: [[product.notes]],
    });
    
    y = (doc as any).lastAutoTable.finalY + 10;
  } else {
    y += lineHeight * 2;
  }
  
  // Image placeholder
  doc.text('Tampilan Menu/ Menu Plating picture:', margin, y);
  y += lineHeight;
  
  // Check if we have images to include
  if (product.imageUrls && product.imageUrls.length > 0) {
    // Can't directly embed external URLs, so add a note
    doc.text('(Please see attached product images)', 60, y);
  } else {
    // Create an image placeholder box
    doc.rect(60, y, 100, 60);
    doc.text('No image available', 90, y + 30);
  }
  
  y += 70;
  
  // Result Section
  doc.text('Hasil/Result:', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.text('Approved', 60, y);
  doc.setFont('helvetica', 'normal');
  
  y += lineHeight * 1.5;
  
  // Approval notes
  doc.text('Note Approval/Approval Note:', margin, y);
  
  // Add approval notes (if any)
  y += lineHeight;
  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { cellPadding: 1, fontSize: 11 },
    margin: { left: 60 },
    body: [['Product has been reviewed and approved for production']],
  });
  
  y = (doc as any).lastAutoTable.finalY + 20;
  
  // Signature section
  doc.text('Tanggal Approval/Approval Date:', margin, y);
  doc.text(formatDate(new Date().toISOString()), 80, y);
  
  y += lineHeight * 2;
  
  // Create signature lines
  doc.text('Tertandatangan/Signed,', margin, y);
  doc.text('Approved By,', 140, y);
  
  y += lineHeight * 4; // Space for signature
  
  // Add signature lines
  doc.setLineWidth(0.2);
  doc.line(margin, y, margin + 60, y);
  doc.line(140, y, 140 + 60, y);
  
  y += lineHeight;
  
  // Add signature names
  doc.text('Name:', margin, y);
  doc.text('Eko B. Harsobo', 140, y);
  
  y += lineHeight;
  doc.text('Title:', margin, y);
  doc.text('Chief Executive Officer', 140, y);

  return doc;
}