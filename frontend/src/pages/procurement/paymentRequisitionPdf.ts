import { jsPDF } from 'jspdf';
import { formatDate } from '@/lib/date';

function inr(n: any): string {
  const v = Number(n) || 0;
  return v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export interface PaymentRequisitionPdfData {
  prNumber: string;
  title?: string;
  prDate: string;
  siteLocation?: string;
  requestedByName?: string;
  procurementApprovedByName?: string;
  accountsApprovedByName?: string;
  totalOrderCost: number;
  totalAdvancePaid: number;
  totalAmountToPay: number;
  totalBalance: number;
  items: Array<{
    srNo?: number;
    vendorName: string;
    description: string;
    materialOrServices?: string;
    isMsme?: boolean;
    totalOrderCost: number;
    advancePaid: number;
    amountToPay: number;
    balanceAmount: number;
    siteLocation?: string;
    remark?: string;
    againstRef?: string;
    modeOfPayment?: string;
  }>;
}

export function generatePaymentRequisitionPdf(pr: PaymentRequisitionPdfData) {
  // A4 Landscape: 297mm x 210mm
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297;
  const H = 210;
  const M = 10;
  const CW = W - 2 * M; // 277mm

  let y = M;

  // 1. Project Title Banner (Cell A1 equivalent from Excel)
  pdf.setDrawColor('#a6a6a6');
  pdf.setFillColor('#ffffff');
  pdf.rect(M, y, CW, 14, 'FD');

  pdf.setTextColor('#0f172a');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  const projTitle =
    'Survey Design and Execution of Sewerage Scheme Dal Lake Uncovered Areas Pollution Abatement of Dal Lake Uncovered Areas Kashmir J&K on EPC Fixed Cost Turnkey Basis incld. Operation and Maintenance for 5 years after successful completion of free trial run of 6 months.';
  const splitProj = pdf.splitTextToSize(projTitle, CW - 6);
  pdf.text(splitProj, M + CW / 2, y + 4.5, { align: 'center' });

  y += 14;

  // 2. Sub-Header: PAYMENT REQUISITION & DATE
  pdf.setFillColor('#d9e1f2');
  pdf.rect(M, y, CW, 9, 'FD');

  pdf.setTextColor('#1f4e78');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('PAYMENT REQUISITION', M + CW / 2, y + 6, { align: 'center' });

  const prDateStr = pr.prDate
    ? new Date(pr.prDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
    : new Date().toLocaleDateString('en-IN');

  pdf.setTextColor('#0f172a');
  pdf.setFontSize(7.5);
  pdf.text(`REQ NO: ${pr.prNumber || 'PR-2026-0001'}`, M + 4, y + 6);
  pdf.text(`DATE: ${prDateStr}`, W - M - 4, y + 6, { align: 'right' });

  y += 9;

  // 3. 13 Column Widths (Total: 277mm)
  // [8, 36, 40, 16, 14, 24, 20, 24, 20, 24, 25, 16, 10] = 277mm
  const widths = [8, 36, 40, 16, 14, 24, 20, 24, 20, 24, 25, 16, 10];
  const headers = [
    'SR.\nNO.',
    'VENDOR NAME',
    'DESCRIPTION',
    'MTERIAL /\nSERVICES',
    'MSME\nYES/No',
    'Total Order/\nMaterial Cost',
    'Advance Paid\n(Rs.)',
    'AMT TO PAY\nIN (RS.)',
    'Balance\n(Rs.)',
    'SITE',
    'REMARK',
    'AGAINST PI/\nTAX INV/PO',
    'MODE OF\nPAYMENT',
  ];

  pdf.setFillColor('#e2efda');
  pdf.rect(M, y, CW, 11, 'FD');
  pdf.setTextColor('#385723');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(5.5);

  let curX = M;
  headers.forEach((h, idx) => {
    const w = widths[idx];
    const isRight = idx >= 5 && idx <= 8;
    const posX = isRight ? curX + w - 2 : curX + w / 2;
    pdf.text(h, posX, y + 3.8, {
      align: isRight ? 'right' : 'center',
    });
    curX += w;
    if (idx < headers.length - 1) {
      pdf.line(curX, y, curX, y + 11);
    }
  });

  y += 11;

  // 4. Line Items
  const items = pr.items || [];
  const rowHeight = 9;

  items.forEach((item, rIdx) => {
    if (y + rowHeight > H - 32) {
      pdf.addPage();
      y = M;
    }

    const bg = rIdx % 2 === 1 ? '#f9fbf8' : '#ffffff';
    pdf.setFillColor(bg);
    pdf.rect(M, y, CW, rowHeight, 'FD');
    pdf.setTextColor('#0f172a');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.5);

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
      const w = widths[cIdx];
      const isRight = cIdx >= 5 && cIdx <= 8;
      const isCenter = cIdx === 0 || cIdx === 3 || cIdx === 4 || cIdx === 12;

      let displayText = v;
      if (!isRight && !isCenter) {
        displayText = pdf.splitTextToSize(v, w - 2)[0] || '';
      }

      const posX = isRight ? xPos + w - 2 : isCenter ? xPos + w / 2 : xPos + 1.5;
      pdf.text(displayText, posX, y + 5.5, {
        align: isRight ? 'right' : isCenter ? 'center' : 'left',
      });

      xPos += w;
      if (cIdx < vals.length - 1) {
        pdf.line(xPos, y, xPos, y + rowHeight);
      }
    });

    y += rowHeight;
  });

  // 5. Total Row
  pdf.setFillColor('#e2efda');
  pdf.rect(M, y, CW, 8, 'FD');
  pdf.setTextColor('#385723');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.5);

  const labelW = widths[0] + widths[1] + widths[2] + widths[3] + widths[4];
  pdf.text('Total:', M + labelW - 3, y + 5.5, { align: 'right' });

  let totX = M + labelW;
  const totCostW = widths[5];
  const totAdvW = widths[6];
  const totPayW = widths[7];
  const totBalW = widths[8];

  pdf.text(inr(pr.totalOrderCost), totX + totCostW - 2, y + 5.5, { align: 'right' });
  totX += totCostW;
  pdf.text(pr.totalAdvancePaid > 0 ? inr(pr.totalAdvancePaid) : '-', totX + totAdvW - 2, y + 5.5, { align: 'right' });
  totX += totAdvW;
  pdf.text(inr(pr.totalAmountToPay), totX + totPayW - 2, y + 5.5, { align: 'right' });
  totX += totPayW;
  pdf.text(pr.totalBalance > 0 ? inr(pr.totalBalance) : '-', totX + totBalW - 2, y + 5.5, { align: 'right' });

  y += 12;

  // 6. "THANKING YOU" & 3 Signatures block
  pdf.setTextColor('#0f172a');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('THANKING YOU', M + 4, y);

  y += 14;

  const sigW = CW / 3;

  // Prepared By
  pdf.line(M + 8, y, M + sigW - 8, y);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('PREPARED BY', M + sigW / 2, y + 4, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor('#64748b');
  pdf.text(pr.requestedByName || 'Site Engineer / Accountant', M + sigW / 2, y + 8, { align: 'center' });

  // Authorised Signatory
  pdf.setTextColor('#0f172a');
  pdf.line(M + sigW + 8, y, M + 2 * sigW - 8, y);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('AUTHORISED SIGNATORY', M + 1.5 * sigW, y + 4, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor('#64748b');
  pdf.text(pr.procurementApprovedByName || 'Project Manager / HO Procurement', M + 1.5 * sigW, y + 8, { align: 'center' });

  // Received By
  pdf.setTextColor('#0f172a');
  pdf.line(M + 2 * sigW + 8, y, M + 3 * sigW - 8, y);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('RECEIVED BY', M + 2.5 * sigW, y + 4, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor('#64748b');
  pdf.text(pr.accountsApprovedByName || 'HO Accounts / Finance Controller', M + 2.5 * sigW, y + 8, { align: 'center' });

  pdf.save(`Payment_Requisition_${pr.prNumber || 'PR'}_${new Date().toISOString().split('T')[0]}.pdf`);
}
