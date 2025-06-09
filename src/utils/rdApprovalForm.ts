import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RDProduct } from '../types/rd-types';
import { formatDate } from './dateUtils';

export function generateRDApprovalPDF(product: RDProduct, approver?: string): jsPDF {
  // Create new PDF document
  const doc = new jsPDF();
  
  // Set up variables
  const margin = 14;
  const lineHeight = 7;
  let y = 15;
  
  // Add modern header with background
  doc.setFillColor(0, 150, 136); // Teal color for header
  doc.rect(0, 0, 210, 25, 'F');
  
  // Add title in white text
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('R&D PRODUCT APPROVAL FORM', margin, y);
  
  // Reset text color for the rest of the document
  doc.setTextColor(0, 0, 0);
  
  // Add current date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  const dateText = `Date: ${formatDate(new Date().toISOString())}`;
  const dateWidth = doc.getStringUnitWidth(dateText) * 10 / doc.internal.scaleFactor;
  doc.text(dateText, doc.internal.pageSize.width - margin - dateWidth, y);
  
  // Reset text color after header
  doc.setTextColor(0, 0, 0);
  y = 35;
  
  // Add form fields with colored section headers
  // Product Information Section
  doc.setFillColor(230, 247, 255);
  doc.rect(margin - 2, y - 5, doc.internal.pageSize.width - (margin * 2) + 4, 8, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUCT INFORMATION', margin, y);
  y += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Product details in a 2-column layout
  const leftColX = margin;
  const rightColX = 105;
  const labelWidth = 40;
  
  // Left column
  doc.setFont('helvetica', 'bold');
  doc.text('Product Name:', leftColX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(product.name, leftColX + labelWidth, y);
  
  // Right column
  doc.setFont('helvetica', 'bold');
  doc.text('Product Code:', rightColX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(product.id.slice(0, 12), rightColX + labelWidth, y);
  
  y += lineHeight;
  
  // Left column
  doc.setFont('helvetica', 'bold');
  doc.text('Category:', leftColX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(product.category, leftColX + labelWidth, y);
  
  // Right column
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', rightColX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(product.status.charAt(0).toUpperCase() + product.status.slice(1), rightColX + labelWidth, y);
  
  y += lineHeight;
  
  // Left column
  doc.setFont('helvetica', 'bold');
  doc.text('Development Date:', leftColX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(product.developmentDate), leftColX + labelWidth, y);
  
  // Right column
  if (product.targetProductionDate) {
    doc.setFont('helvetica', 'bold');
    doc.text('Target Production:', rightColX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(product.targetProductionDate), rightColX + labelWidth, y);
  }
  
  y += lineHeight;
  
  // Creator information
  doc.setFont('helvetica', 'bold');
  doc.text('Created By:', leftColX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(product.createdBy || 'R&D Department', leftColX + labelWidth, y);
  
  if (product.price) {
    doc.setFont('helvetica', 'bold');
    doc.text('Price:', rightColX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`IDR ${product.price.toLocaleString()}`, rightColX + labelWidth, y);
  }
  
  y += lineHeight;
  
  // Add yield information
  if (product.minOrder || product.unit) {
    doc.setFont('helvetica', 'bold');
    doc.text('Yield:', leftColX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${product.minOrder || 1} ${product.unit || 'pcs'}`, leftColX + labelWidth, y);
    y += lineHeight;
  }
  
  y += lineHeight;
  
  // Recipe Information Section
  if (product.recipeIngredients && product.recipeIngredients.length > 0) {
    doc.setFillColor(230, 255, 240);
    doc.rect(margin - 2, y - 5, doc.internal.pageSize.width - (margin * 2) + 4, 8, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIPE INFORMATION', margin, y);
    y += 10;
    
    doc.setFontSize(10);
    
    // Use auto-table for ingredients with modern styling
    const tableData = product.recipeIngredients.map(ing => [
      ing.ingredientName || "Ingredient", // Use name instead of ID
      ing.amount.toString(),
      ing.unit || ""
    ]);
    
    autoTable(doc, {
      startY: y,
      head: [['Ingredient', 'Amount', 'Unit']],
      body: tableData,
      theme: 'striped',
      styles: { 
        fontSize: 9,
        cellPadding: 3 
      },
      headStyles: { 
        fillColor: [0, 150, 136],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 30 }
      }
    });
    
    y = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Image Section
  const remainingSpace = doc.internal.pageSize.height - y - 60; // Reserve space for signature
  const idealImageHeight = Math.min(80, remainingSpace);
  
  doc.setFillColor(245, 245, 245);
  doc.rect(margin - 2, y - 5, doc.internal.pageSize.width - (margin * 2) + 4, 8, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUCT IMAGE', margin, y);
  y += 10;
  
  // Create image box with border
  const imageBoxX = margin;
  const imageBoxWidth = doc.internal.pageSize.width - (margin * 2);
  const imageBoxHeight = idealImageHeight;
  
  // Draw the box for image placement
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(imageBoxX, y, imageBoxWidth, imageBoxHeight);

  // Add the first image if available
  if (product.imageUrls && product.imageUrls.length > 0) {
    try {
      const imageUrl = product.imageUrls[0];
      
      // Use a 4:3 aspect ratio (common for many images)
      const aspectRatio = 4 / 3;
      
      // Calculate dimensions to fit inside the box while maintaining aspect ratio
      let width, height;
      
      if (imageBoxWidth / imageBoxHeight > aspectRatio) {
        // Box is wider than 4:3, so fit height
        height = imageBoxHeight - 10;
        width = height * aspectRatio;
      } else {
        // Box is taller than 4:3, so fit width
        width = imageBoxWidth - 10;
        height = width / aspectRatio;
      }
      
      // Calculate position to center the image
      const xPos = imageBoxX + (imageBoxWidth - width) / 2;
      const yPos = y + (imageBoxHeight - height) / 2;
      
      // Add the image to the PDF
      doc.addImage(
        imageUrl,
        'JPEG',
        xPos,
        yPos,
        width,
        height,
        undefined,
        'MEDIUM'
      );
    } catch (error) {
      console.error('Error adding image to PDF:', error);
      
      // If image loading fails, just show text
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Image could not be displayed', imageBoxX + imageBoxWidth/2 - 40, y + imageBoxHeight/2);
    }
  } else {
    // No image available text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('No image available', imageBoxX + imageBoxWidth/2 - 20, y + imageBoxHeight/2);
  }
  
  // Update y position after image
  y += imageBoxHeight + 15;
  
  // Approval Section
  doc.setFillColor(255, 245, 230);
  doc.rect(margin - 2, y - 5, doc.internal.pageSize.width - (margin * 2) + 4, 8, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('APPROVAL', margin, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Result:', margin, y);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Approved', margin + 30, y);
  
  // Approval date on right side
  const today = new Date().toLocaleDateString();
  doc.setFont('helvetica', 'bold');
  doc.text('Approval Date:', rightColX, y);
  
  doc.setFont('helvetica', 'normal');
  doc.text(today, rightColX + labelWidth, y);
  
  y += lineHeight * 3;
  
  // Create signature section
  doc.setFontSize(10);
  
  // Create signature lines
  doc.setFont('helvetica', 'bold');
  doc.text('Submitted By:', leftColX, y);
  doc.text('Approved By:', rightColX, y);
  
  y += lineHeight * 4; // Space for signature
  
  // Add signature lines
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(leftColX, y, leftColX + 60, y);
  doc.line(rightColX, y, rightColX + 60, y);
  
  y += lineHeight;
  
  // Add signature names
  doc.setFont('helvetica', 'normal');
  doc.text('Name: ____________________', leftColX, y);
  doc.text(`Name: ${approver || 'Eko B. Handoko'}`, rightColX, y);
  
  y += lineHeight;
  
  // Add titles
  doc.text('Title: ____________________', leftColX, y);
  doc.text('Title: Chief Executive Officer', rightColX, y);
  
  return doc;
}