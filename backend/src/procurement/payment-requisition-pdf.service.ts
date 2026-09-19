import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { PaymentRequisition } from './entities/payment-requisition.entity';

function inr(n: any): string {
  const v = Number(n) || 0;
  return v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

@Injectable()
export class PaymentRequisitionPdfService {
  async generatePdf(pr: PaymentRequisition): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      // A4 Landscape: 841.89 x 595.28 points
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 24 });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = 841.89;
      const H = 595.28;
      const M = 24;
      const CW = W - 2 * M; // 793.89

      const C = {
        headerGreen: '#70ad47',
        lightGreen: '#e2efda',
        darkGreen: '#385723',
        textDark: '#0f172a',
        border: '#a6a6a6',
        white: '#ffffff',
        grayBg: '#f2f2f2',
      };

      let y = M;

      // 1. Project Title Banner (Cell A1 equivalent from Excel)
      doc.rect(M, y, CW, 36).fillAndStroke(C.white, C.border);
      doc.fillColor(C.textDark).fontSize(8.5).font('Helvetica-Bold')
        .text(
          'Survey Design and Execution of Sewerage Scheme Dal Lake Uncovered Areas Pollution Abatement of Dal Lake Uncovered Areas Kashmir J&K on EPC Fixed Cost Turnkey Basis incld. Operation and Maintenance for 5 years after successful completion of free trial run of 6 months.',
          M + 8,
          y + 6,
          { width: CW - 16, align: 'center', lineGap: 2 }
        );
      y += 36;

      // 2. Sub-Header: PAYMENT REQUISITION & DATE
      doc.rect(M, y, CW, 22).fillAndStroke('#d9e1f2', C.border);
      doc.fillColor('#1f4e78').fontSize(11).font('Helvetica-Bold')
        .text('PAYMENT REQUISITION', M + 8, y + 6, { width: CW - 16, align: 'center' });

      const prDateStr = pr.prDate
        ? new Date(pr.prDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
        : new Date().toLocaleDateString('en-IN');

      doc.fillColor(C.textDark).fontSize(8).font('Helvetica-Bold')
        .text(`DATE: ${prDateStr}`, W - M - 120, y + 7, { align: 'right' });
      doc.text(`REQ NO: ${pr.prNumber}`, M + 8, y + 7);

      y += 22;

      // 3. Table Headers (13 Columns matching user's Excel)
      const colWidths = [24, 98, 108, 44, 38, 64, 58, 64, 56, 68, 68, 56, 46];
      const headers = [
        'SR. NO.',
        'VENDOR NAME',
        'DESCRIPTION',
        'MTERIAL /\nSERVICES',
        'MSME\nYES / NO',
        'Total Order/\nMaterial Cost',
        'Advance Paid\n(Rs.)',
        'AMT TO PAY IN\n(RS.)',
        'Balance\n(Rs.)',
        'SITE',
        'REMARK',
        'AGAINST PI /\nTAX INV / PO',
        'MODE OF\nPAYMENT',
      ];

      doc.rect(M, y, CW, 26).fillAndStroke(C.lightGreen, C.border);
      doc.fillColor(C.darkGreen).fontSize(6.5).font('Helvetica-Bold');

      let curX = M;
      headers.forEach((h, idx) => {
        const w = colWidths[idx];
        const isRight = idx >= 5 && idx <= 8;
        doc.text(h, curX + 2, y + 4, {
          width: w - 4,
          align: isRight ? 'right' : 'center',
          lineGap: 1,
        });
        curX += w;
        if (idx < headers.length - 1) {
          doc.moveTo(curX, y).lineTo(curX, y + 26).stroke(C.border);
        }
      });

      y += 26;

      // 4. Line Items
      const items = pr.items || [];
      const rowHeight = 22;

      items.forEach((item, rIdx) => {
        // Page overflow check
        if (y + rowHeight > H - 70) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 24 });
          y = M;
        }

        const bg = rIdx % 2 === 1 ? '#f9fbf8' : C.white;
        doc.rect(M, y, CW, rowHeight).fillAndStroke(bg, C.border);
        doc.fillColor(C.textDark).fontSize(6.5).font('Helvetica');

        let xPos = M;
        const vals = [
          String(item.srNo || rIdx + 1),
          item.vendorName || '—',
          item.description || '—',
          item.materialOrServices || 'Material',
          item.isMsme ? 'Yes' : 'No',
          inr(item.totalOrderCost),
          item.advancePaid > 0 ? inr(item.advancePaid) : '-',
          inr(item.amountToPay),
          item.balanceAmount > 0 ? inr(item.balanceAmount) : '-',
          item.siteLocation || pr.siteLocation || '38.5 MLD STP',
          item.remark || 'Against Tax Invoice',
          item.againstRef || '—',
          item.modeOfPayment || 'RTGS',
        ];

        vals.forEach((v, cIdx) => {
          const w = colWidths[cIdx];
          const isRight = cIdx >= 5 && cIdx <= 8;
          const isCenter = cIdx === 0 || cIdx === 3 || cIdx === 4 || cIdx === 12;

          doc.text(v, xPos + 2, y + 5, {
            width: w - 4,
            align: isRight ? 'right' : isCenter ? 'center' : 'left',
          });

          xPos += w;
          if (cIdx < vals.length - 1) {
            doc.moveTo(xPos, y).lineTo(xPos, y + rowHeight).stroke(C.border);
          }
        });

        y += rowHeight;
      });

      // 5. Total Row
      doc.rect(M, y, CW, 18).fillAndStroke(C.lightGreen, C.border);
      doc.fillColor(C.darkGreen).fontSize(7.5).font('Helvetica-Bold');

      // "Total:" label across first 5 columns
      const labelW = colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4];
      doc.text('Total:', M + 8, y + 5, { width: labelW - 16, align: 'right' });

      // Financial totals
      let totX = M + labelW;
      const totCostW = colWidths[5];
      const totAdvW = colWidths[6];
      const totPayW = colWidths[7];
      const totBalW = colWidths[8];

      doc.text(inr(pr.totalOrderCost), totX + 2, y + 5, { width: totCostW - 4, align: 'right' });
      totX += totCostW;
      doc.text(pr.totalAdvancePaid > 0 ? inr(pr.totalAdvancePaid) : '-', totX + 2, y + 5, { width: totAdvW - 4, align: 'right' });
      totX += totAdvW;
      doc.text(inr(pr.totalAmountToPay), totX + 2, y + 5, { width: totPayW - 4, align: 'right' });
      totX += totPayW;
      doc.text(pr.totalBalance > 0 ? inr(pr.totalBalance) : '-', totX + 2, y + 5, { width: totBalW - 4, align: 'right' });

      y += 26;

      // 6. "THANKING YOU" & 3 Signatures block
      doc.fillColor(C.textDark).fontSize(8).font('Helvetica-Bold')
        .text('THANKING YOU', M + 8, y);

      y += 30;

      const sigW = CW / 3;

      // Prepared By
      doc.moveTo(M + 16, y).lineTo(M + sigW - 20, y).stroke(C.border);
      doc.fillColor(C.textDark).fontSize(7.5).font('Helvetica-Bold')
        .text('PREPARED BY', M + 16, y + 4, { width: sigW - 36, align: 'center' });
      doc.font('Helvetica').fontSize(6.5).fillColor('#64748b')
        .text(pr.requestedByName || 'Site Engineer / Accountant', M + 16, y + 14, { width: sigW - 36, align: 'center' });

      // Authorised Signatory
      doc.moveTo(M + sigW + 16, y).lineTo(M + 2 * sigW - 20, y).stroke(C.border);
      doc.fillColor(C.textDark).fontSize(7.5).font('Helvetica-Bold')
        .text('AUTHORISED SIGNATORY', M + sigW + 16, y + 4, { width: sigW - 36, align: 'center' });
      doc.font('Helvetica').fontSize(6.5).fillColor('#64748b')
        .text(pr.procurementApprovedByName || 'Project Manager / HO Procurement', M + sigW + 16, y + 14, { width: sigW - 36, align: 'center' });

      // Received By
      doc.moveTo(M + 2 * sigW + 16, y).lineTo(M + 3 * sigW - 20, y).stroke(C.border);
      doc.fillColor(C.textDark).fontSize(7.5).font('Helvetica-Bold')
        .text('RECEIVED BY', M + 2 * sigW + 16, y + 4, { width: sigW - 36, align: 'center' });
      doc.font('Helvetica').fontSize(6.5).fillColor('#64748b')
        .text(pr.accountsApprovedByName || 'HO Accounts / Finance Controller', M + 2 * sigW + 16, y + 14, { width: sigW - 36, align: 'center' });

      doc.end();
    });
  }
}
