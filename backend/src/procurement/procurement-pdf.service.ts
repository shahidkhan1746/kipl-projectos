import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { PurchaseOrder } from './entities/purchase-order.entity';

const KIPL = {
  name: 'M/S Khilari Infrastructure Pvt. Ltd.',
  address: '101 to 105, Prabhat Centre Annex, Sector-1A, C.B.D Belapur, Navi Mumbai - 400 614',
  srinagarOffice: 'Project Site Office: Dal Lake Sewerage Project, Nishat / Habak, Srinagar, J&K',
  phone: '+91 (022) 2758 0681',
  email: 'ssk.kipl2005@gmail.com',
  website: 'www.khilariinfra.com',
  project: 'Survey, Design & Execution of Sewerage Scheme Dal Lake (Uncovered Areas), Srinagar J&K',
  allotment: 'CE/UEED/PS/01 OF 2025-26',
};

function numToWords(num: number): string {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.round(num);
  if (n === 0) return 'Zero';

  function inWords(val: number): string {
    if (val < 20) return a[val];
    if (val < 100) return b[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + a[val % 10] : '');
    if (val < 1000) return a[Math.floor(val / 100)] + ' Hundred' + (val % 100 !== 0 ? ' and ' + inWords(val % 100) : '');
    if (val < 100000) return inWords(Math.floor(val / 1000)) + ' Thousand' + (val % 1000 !== 0 ? ' ' + inWords(val % 1000) : '');
    if (val < 10000000) return inWords(Math.floor(val / 100000)) + ' Lakh' + (val % 100000 !== 0 ? ' ' + inWords(val % 100000) : '');
    return inWords(Math.floor(val / 10000000)) + ' Crore' + (val % 10000000 !== 0 ? ' ' + inWords(val % 10000000) : '');
  }

  return 'Rupees ' + inWords(n) + ' Only';
}

@Injectable()
export class ProcurementPdfService {
  async generatePurchaseOrderPdf(po: PurchaseOrder): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 36 });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const C = {
        navy: '#1a2540',
        slate: '#334155',
        lightGray: '#f8fafc',
        border: '#cbd5e1',
        white: '#ffffff',
        gold: '#d97706',
      };

      // Header Banner
      doc.rect(0, 0, 595, 80).fill(C.navy);
      doc.fillColor(C.white).fontSize(14).font('Helvetica-Bold')
        .text(KIPL.name, 36, 16, { align: 'center' });
      doc.fontSize(8).font('Helvetica')
        .text(KIPL.address, 36, 34, { align: 'center' })
        .text(KIPL.srinagarOffice, 36, 46, { align: 'center' })
        .text(`Phone: ${KIPL.phone}  |  Email: ${KIPL.email}  |  Web: ${KIPL.website}`, 36, 58, { align: 'center' });

      // Title Bar
      doc.rect(36, 90, 523, 24).fill(C.lightGray);
      doc.rect(36, 90, 523, 24).stroke(C.border);
      doc.fillColor(C.navy).fontSize(12).font('Helvetica-Bold')
        .text('PURCHASE ORDER', 46, 96, { align: 'left' });
      doc.fillColor(C.gold).fontSize(11).font('Helvetica-Bold')
        .text(po.poNumber, 36, 96, { align: 'right', width: 513 });

      // Info Blocks (Vendor & Order Details)
      const topY = 122;
      const colW = 256;

      // Left Box: Vendor Details
      doc.rect(36, topY, colW, 95).stroke(C.border);
      doc.fillColor(C.navy).fontSize(9).font('Helvetica-Bold')
        .text('SUPPLIER / VENDOR DETAILS:', 44, topY + 8);
      doc.fillColor(C.slate).fontSize(9).font('Helvetica-Bold')
        .text(po.vendorName, 44, topY + 22);
      doc.font('Helvetica').fontSize(8)
        .text(po.vendorAddress || 'Address on file', 44, topY + 34, { width: colW - 20 })
        .text(`GSTIN: ${po.vendorGstin || 'Unregistered / Pending'}`, 44, topY + 62)
        .text(`Contact: ${po.vendorContactPerson || 'N/A'} (${po.vendorPhone || 'N/A'})`, 44, topY + 74);

      // Right Box: PO Meta
      const rightX = 302;
      doc.rect(rightX, topY, colW + 10, 95).stroke(C.border);
      doc.fillColor(C.navy).fontSize(9).font('Helvetica-Bold')
        .text('ORDER & DISPATCH DETAILS:', rightX + 8, topY + 8);
      doc.font('Helvetica').fontSize(8).fillColor(C.slate)
        .text(`PO Date: ${po.orderDate || new Date().toISOString().split('T')[0]}`, rightX + 8, topY + 22)
        .text(`Expected Delivery: ${po.expectedDeliveryDate || 'As agreed'}`, rightX + 8, topY + 34)
        .text(`Ref. Requisition: ${po.requisition ? (po.requisition as any).reqNumber || 'Direct' : 'Direct Order'}`, rightX + 8, topY + 46)
        .text(`Project: ${KIPL.project}`, rightX + 8, topY + 58, { width: colW - 10 })
        .text(`Delivery Site: ${po.shippingAddress || 'Dal Lake Sewerage Site, Srinagar'}`, rightX + 8, topY + 76, { width: colW - 10 });

      // Items Table
      const tableY = 228;
      const headers = [
        { label: '#', x: 36, w: 24, align: 'center' },
        { label: 'Item Description & Specs', x: 60, w: 200, align: 'left' },
        { label: 'HSN', x: 260, w: 50, align: 'center' },
        { label: 'Qty', x: 310, w: 45, align: 'right' },
        { label: 'Unit', x: 355, w: 35, align: 'center' },
        { label: 'Rate (₹)', x: 390, w: 55, align: 'right' },
        { label: 'GST %', x: 445, w: 40, align: 'center' },
        { label: 'Total (₹)', x: 485, w: 74, align: 'right' },
      ];

      // Table Header Row
      doc.rect(36, tableY, 523, 20).fill(C.navy);
      headers.forEach((h) => {
        doc.fillColor(C.white).fontSize(8).font('Helvetica-Bold')
          .text(h.label, h.x, tableY + 5, { width: h.w, align: h.align as any });
      });

      let currentY = tableY + 20;
      const items = po.items || [];

      items.forEach((item, index) => {
        const rowH = 22;
        if (index % 2 === 1) {
          doc.rect(36, currentY, 523, rowH).fill(C.lightGray);
        }
        doc.rect(36, currentY, 523, rowH).stroke(C.border);

        doc.fillColor(C.slate).fontSize(8).font('Helvetica');
        doc.text(String(index + 1), 36, currentY + 6, { width: 24, align: 'center' });
        doc.font('Helvetica-Bold').text(item.itemDescription, 62, currentY + 6, { width: 195, lineBreak: false });
        doc.font('Helvetica').text(item.hsnCode || '-', 260, currentY + 6, { width: 50, align: 'center' });
        doc.text(Number(item.quantity).toLocaleString('en-IN'), 310, currentY + 6, { width: 45, align: 'right' });
        doc.text(item.unit || 'Nos', 355, currentY + 6, { width: 35, align: 'center' });
        doc.text(Number(item.unitRate).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 390, currentY + 6, { width: 55, align: 'right' });
        doc.text(`${item.gstRate ?? 18}%`, 445, currentY + 6, { width: 40, align: 'center' });
        doc.font('Helvetica-Bold').text(
          Number(item.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
          485, currentY + 6, { width: 70, align: 'right' }
        );

        currentY += rowH;
      });

      // Financial Summary Block
      const sumY = Math.max(currentY + 10, 480);
      const sumW = 200;
      const sumX = 359;

      doc.rect(sumX, sumY, sumW, 85).stroke(C.border);
      const subtotal = Number(po.subtotalAmount || 0);
      const tax = Number(po.taxAmount || 0);
      const freight = Number(po.freightCharges || 0);
      const grandTotal = Number(po.grandTotal || (subtotal + tax + freight));

      doc.font('Helvetica').fontSize(8).fillColor(C.slate);
      doc.text('Subtotal (Taxable):', sumX + 10, sumY + 8);
      doc.text(`₹ ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sumX + 90, sumY + 8, { width: 100, align: 'right' });

      doc.text('GST (CGST+SGST/IGST):', sumX + 10, sumY + 24);
      doc.text(`₹ ${tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sumX + 90, sumY + 24, { width: 100, align: 'right' });

      doc.text('Freight / Unloading:', sumX + 10, sumY + 40);
      doc.text(`₹ ${freight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sumX + 90, sumY + 40, { width: 100, align: 'right' });

      doc.rect(sumX, sumY + 58, sumW, 27).fill(C.lightGray);
      doc.rect(sumX, sumY + 58, sumW, 27).stroke(C.border);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.navy);
      doc.text('GRAND TOTAL:', sumX + 10, sumY + 66);
      doc.fillColor(C.gold).text(`₹ ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sumX + 80, sumY + 66, { width: 110, align: 'right' });

      // Amount in words
      doc.rect(36, sumY, 310, 35).stroke(C.border);
      doc.fillColor(C.navy).fontSize(8).font('Helvetica-Bold')
        .text('AMOUNT IN WORDS:', 42, sumY + 6);
      doc.fillColor(C.slate).fontSize(8).font('Helvetica-Oblique')
        .text(numToWords(grandTotal), 42, sumY + 18, { width: 295 });

      // Terms Box
      const termsY = sumY + 42;
      doc.rect(36, termsY, 310, 43).stroke(C.border);
      doc.fillColor(C.navy).fontSize(8).font('Helvetica-Bold')
        .text('COMMERCIAL & DELIVERY TERMS:', 42, termsY + 5);
      doc.font('Helvetica').fontSize(7.5).fillColor(C.slate)
        .text(`• Payment Terms: ${po.paymentTerms || '30 days after site receipt & QC inspection'}`, 42, termsY + 16, { width: 298 })
        .text(`• Delivery: ${po.deliveryTerms || 'FOR Srinagar Site, inclusive of transit insurance & unloading'}`, 42, termsY + 28, { width: 298 });

      // Signatures
      const sigY = 660;
      doc.moveTo(36, sigY).lineTo(559, sigY).stroke(C.border);

      // Sign block 1
      doc.fillColor(C.slate).fontSize(8).font('Helvetica')
        .text('Prepared By', 50, sigY + 10)
        .text('Procurement / Site Engineer', 50, sigY + 22);
      doc.font('Helvetica-Bold')
        .text(po.issuedByName || 'Site Procurement Officer', 50, sigY + 45);

      // Sign block 2
      doc.font('Helvetica')
        .text('Checked & Verified By', 230, sigY + 10)
        .text('Accounts / Finance (HO)', 230, sigY + 22);
      doc.font('Helvetica-Bold')
        .text('Head Office Accounts', 230, sigY + 45);

      // Sign block 3
      doc.font('Helvetica')
        .text('Authorized Signatory', 410, sigY + 10)
        .text('Khilari Infrastructure Pvt. Ltd.', 410, sigY + 22);
      doc.font('Helvetica-Bold')
        .text('(Authorized Sign & Stamp)', 410, sigY + 45);

      doc.end();
    });
  }
}
