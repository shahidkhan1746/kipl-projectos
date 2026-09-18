import { jsPDF } from 'jspdf';
import { formatDate } from '@/lib/date';

const NAVY = '#0a1e28';
const HEADER_BLUE = '#1e3a8a';
const MUTED = '#64748b';
const GREEN = '#059669';
const AMBER = '#d97706';
const RED = '#dc2626';

const PROJECT = {
  name: 'Sewerage Scheme Dal Lake (Uncovered Areas) — 38.5 MLD STP, Nishat',
  contractor: 'Khilari Infrastructure Pvt. Ltd.',
  client: 'J&K Urban Environmental Engineering Department (UEED)',
  allotment: 'CE/UEED/PS/2929-42 (07-Nov-2025)',
};

function num(n: any): string {
  return (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

// ─────────────────────────────────────────────────────────────
// 1. OFFICIAL CLAUSE 55 JOINT MATERIAL REGISTER (A4 LANDSCAPE)
// ─────────────────────────────────────────────────────────────
export interface MaterialRegisterPdfInput {
  rows: any[];
  summary: Record<string, any>;
  activeTabLabel: string;
  projectName?: string;
}

export function generateMaterialRegisterPdf({
  rows,
  summary,
  activeTabLabel,
  projectName,
}: MaterialRegisterPdfInput) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297;
  const H = 210;
  const M = 12;
  const CW = W - 2 * M; // 273mm

  let y = 0;
  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const header = () => {
    // Top banner
    pdf.setFillColor(NAVY);
    pdf.rect(0, 0, W, 22, 'F');

    pdf.setTextColor('#ffffff');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('JOINT MATERIAL LOG & REGISTER (CLAUSE 55)', M, 8.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor('#94a3b8');
    pdf.text(
      `${projectName || PROJECT.name} · Allotment: ${PROJECT.allotment} · Contractor: ${PROJECT.contractor}`,
      M,
      14.5
    );
    pdf.text(`Client: ${PROJECT.client} · Division: Srinagar S&D-I`, M, 19);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor('#ffffff');
    pdf.text(`Scope: ${activeTabLabel.toUpperCase()}`, W - M, 8.5, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor('#cbd5e1');
    pdf.text(`Generated: ${todayStr} · Total Logs: ${rows.length}`, W - M, 15, { align: 'right' });

    y = 28;
  };

  const footer = () => {
    pdf.setDrawColor('#e2e8f0');
    pdf.line(M, H - 9, W - M, H - 9);
    pdf.setFontSize(6.5);
    pdf.setTextColor(MUTED);
    pdf.text(
      'KIPL ProjectOS · Dal Lake 38.5 MLD STP Site Office · Clause 55 Mandatory Material Accounting Register',
      M,
      H - 5.5
    );
    pdf.text(`Page ${pdf.getNumberOfPages()}`, W - M, H - 5.5, { align: 'right' });
  };

  const ensure = (neededHeight: number) => {
    if (y + neededHeight > H - 18) {
      footer();
      pdf.addPage();
      header();
    }
  };

  header();

  // Summary Metrics Bar
  let totRec = 0;
  let totCon = 0;
  let itemsCount = Object.keys(summary).length;
  for (const s of Object.values(summary)) {
    totRec += Number(s.received) || 0;
    totCon += Number(s.consumed) || 0;
  }

  pdf.setFillColor('#f8fafc');
  pdf.setDrawColor('#cbd5e1');
  pdf.roundedRect(M, y, CW, 14, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(HEADER_BLUE);
  pdf.text('REGISTER SUMMARY & AUDIT OVERVIEW:', M + 4, y + 5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor('#334155');
  pdf.text(`Distinct Catalog Items: `, M + 4, y + 10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${itemsCount}`, M + 34, y + 10);

  pdf.setFont('helvetica', 'normal');
  pdf.text(`Total Movement Logs: `, M + 55, y + 10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${rows.length}`, M + 84, y + 10);

  pdf.setFont('helvetica', 'normal');
  pdf.text(`Compliance Standard: `, M + 110, y + 10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(GREEN);
  pdf.text(`Tender Clause 55 (Cement & Steel Joint Daily Log)`, M + 138, y + 10);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor('#334155');
  pdf.text(`Status: `, W - M - 55, y + 10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(HEADER_BLUE);
  pdf.text(`Active / Joint Verified`, W - M - 44, y + 10);

  y += 18;

  // Table Setup
  // Widths: 20 + 64 + 23 + 23 + 24 + 15 + 38 + 38 + 28 = 273mm
  const heads = [
    'Date',
    'Material & Specification',
    'Received Qty',
    'Consumed Qty',
    'Balance-in-Hand',
    'Unit',
    'Contractor Sign / Rep',
    'UEED / Client Rep',
    'Challan / Remarks',
  ];
  const widths = [20, 64, 23, 23, 24, 15, 38, 38, 28];

  // Draw Table Header
  ensure(14);
  pdf.setFillColor(NAVY);
  pdf.rect(M, y, CW, 7, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor('#ffffff');

  let curX = M + 2;
  heads.forEach((h, i) => {
    const align = i === 2 || i === 3 || i === 4 ? 'right' : i === 5 ? 'center' : 'left';
    const posX = align === 'right' ? curX + widths[i] - 4 : align === 'center' ? curX + widths[i] / 2 - 2 : curX;
    pdf.text(h, posX, y + 4.8, { align });
    curX += widths[i];
  });
  y += 7;

  if (rows.length === 0) {
    ensure(12);
    pdf.setFontSize(8);
    pdf.setTextColor(MUTED);
    pdf.text('No material register movements found for this selection.', M + 4, y + 6);
    y += 12;
  } else {
    rows.forEach((r, ri) => {
      ensure(7);

      if (ri % 2 === 1) {
        pdf.setFillColor('#f8fafc');
        pdf.rect(M, y, CW, 6.5, 'F');
      }

      pdf.setDrawColor('#f1f5f9');
      pdf.line(M, y + 6.5, M + CW, y + 6.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor('#1e293b');

      let x = M + 2;

      // Date
      pdf.text(formatDate(r.date) || '—', x, y + 4.5);
      x += widths[0];

      // Material
      pdf.setFont('helvetica', 'bold');
      const matText = pdf.splitTextToSize(r.material || '—', widths[1] - 4)[0] || '—';
      pdf.text(matText, x, y + 4.5);
      pdf.setFont('helvetica', 'normal');
      x += widths[1];

      // Received
      const recVal = Number(r.receivedQty) || 0;
      pdf.setTextColor(recVal > 0 ? GREEN : MUTED);
      pdf.setFont('helvetica', recVal > 0 ? 'bold' : 'normal');
      pdf.text(recVal > 0 ? `+${num(recVal)}` : '—', x + widths[2] - 4, y + 4.5, { align: 'right' });
      x += widths[2];

      // Consumed
      const conVal = Number(r.consumedQty) || 0;
      pdf.setTextColor(conVal > 0 ? AMBER : MUTED);
      pdf.setFont('helvetica', conVal > 0 ? 'bold' : 'normal');
      pdf.text(conVal > 0 ? `-${num(conVal)}` : '—', x + widths[3] - 4, y + 4.5, { align: 'right' });
      x += widths[3];

      // Balance
      const balVal = Number(r.balance) || 0;
      pdf.setTextColor(balVal < 0 ? RED : '#0f172a');
      pdf.setFont('helvetica', 'bold');
      pdf.text(num(balVal), x + widths[4] - 4, y + 4.5, { align: 'right' });
      x += widths[4];

      // Unit
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(MUTED);
      pdf.text(r.unit || '—', x + widths[5] / 2 - 2, y + 4.5, { align: 'center' });
      x += widths[5];

      // Contractor Rep
      pdf.setTextColor('#334155');
      const cRep = pdf.splitTextToSize(r.contractorRep || 'Unsigned', widths[6] - 4)[0];
      pdf.text(cRep, x, y + 4.5);
      x += widths[6];

      // UEED Rep
      const uRep = pdf.splitTextToSize(r.ueedRep || 'Unsigned', widths[7] - 4)[0];
      pdf.text(uRep, x, y + 4.5);
      x += widths[7];

      // Remarks / Challan
      pdf.setTextColor('#64748b');
      const rem = pdf.splitTextToSize(r.remarks || '—', widths[8] - 4)[0];
      pdf.text(rem, x, y + 4.5);

      y += 6.5;
    });
  }

  // Tripartite Signature & Joint Certification Block
  ensure(32);
  y += 5;

  pdf.setFillColor('#f8fafc');
  pdf.setDrawColor('#cbd5e1');
  pdf.roundedRect(M, y, CW, 25, 2, 2, 'FD');

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(6.5);
  pdf.setTextColor('#475569');
  pdf.text(
    'Joint Field Certification (Clause 55): Certified that the above receipts, consumptions and balance-in-hand have been physically inspected and reconciled on site.',
    M + 3,
    y + 4.5
  );

  const sigY = y + 18;
  const colW = CW / 3;

  // Sign 1: Contractor
  pdf.setDrawColor('#94a3b8');
  pdf.line(M + 6, sigY - 2, M + colW - 8, sigY - 2);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(NAVY);
  pdf.text('Contractor Site Incharge / PM', M + 6, sigY + 2);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor(MUTED);
  pdf.text('Khilari Infrastructure Pvt. Ltd.', M + 6, sigY + 5);

  // Sign 2: PMC / QC
  pdf.line(M + colW + 6, sigY - 2, M + 2 * colW - 8, sigY - 2);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(NAVY);
  pdf.text('Resident Engineer / Quality Control', M + colW + 6, sigY + 2);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor(MUTED);
  pdf.text('Project Management Consultants (PMC)', M + colW + 6, sigY + 5);

  // Sign 3: Client (UEED)
  pdf.line(M + 2 * colW + 6, sigY - 2, M + 3 * colW - 8, sigY - 2);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(NAVY);
  pdf.text('Assistant Executive Engineer (AEE)', M + 2 * colW + 6, sigY + 2);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor(MUTED);
  pdf.text('J&K UEED Srinagar Sub-Division I', M + 2 * colW + 6, sigY + 5);

  footer();

  const fileTab = activeTabLabel.replace(/[^a-zA-Z0-9]/g, '_');
  pdf.save(`Material_Register_Clause55_${fileTab}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// 2. SINGLE MATERIAL STOCK CARD & MOVEMENT LEDGER (A4 PORTRAIT)
// ─────────────────────────────────────────────────────────────
export interface SingleMaterialPdfInput {
  material: string;
  categoryLabel: string;
  summary: { received: number; consumed: number; balance: number; unit?: string };
  rows: any[];
  projectName?: string;
}

export function generateSingleMaterialPdf({
  material,
  categoryLabel,
  summary,
  rows,
  projectName,
}: SingleMaterialPdfInput) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const M = 14;
  const CW = W - 2 * M; // 182mm

  let y = 0;
  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const header = () => {
    pdf.setFillColor(NAVY);
    pdf.rect(0, 0, W, 22, 'F');

    pdf.setTextColor('#ffffff');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('MATERIAL STOCK CARD & LEDGER', M, 8.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor('#94a3b8');
    pdf.text(
      `${projectName || PROJECT.name} · ${PROJECT.contractor}`,
      M,
      14.5
    );
    pdf.text(`Clause 55 Joint Measurement Card · Client: ${PROJECT.client}`, M, 19);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor('#cbd5e1');
    pdf.text(`Date: ${todayStr}`, W - M, 12, { align: 'right' });

    y = 28;
  };

  const footer = () => {
    pdf.setDrawColor('#e2e8f0');
    pdf.line(M, H - 10, W - M, H - 10);
    pdf.setFontSize(6.5);
    pdf.setTextColor(MUTED);
    pdf.text('KIPL ProjectOS · Site Material Stock Card · Clause 55', M, H - 6);
    pdf.text(`Page ${pdf.getNumberOfPages()}`, W - M, H - 6, { align: 'right' });
  };

  const ensure = (hNeeded: number) => {
    if (y + hNeeded > H - 16) {
      footer();
      pdf.addPage();
      header();
    }
  };

  header();

  // Material Hero Card
  pdf.setFillColor('#f1f5f9');
  pdf.setDrawColor('#cbd5e1');
  pdf.roundedRect(M, y, CW, 30, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(NAVY);
  pdf.text(material, M + 5, y + 8);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(MUTED);
  pdf.text(`Category: ${categoryLabel} · Unit: ${summary.unit || '—'}`, M + 5, y + 14);

  // 3 Mini KPIs inside hero
  const kpiW = 40;
  const kpiY = y + 17;

  // Received
  pdf.setFillColor('#ffffff');
  pdf.roundedRect(M + 5, kpiY, kpiW, 10, 1, 1, 'FD');
  pdf.setFontSize(6.5);
  pdf.setTextColor(MUTED);
  pdf.text('TOTAL RECEIVED', M + 7, kpiY + 4);
  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(GREEN);
  pdf.text(`${num(summary.received)} ${summary.unit || ''}`, M + 7, kpiY + 8.5);

  // Consumed
  pdf.setFillColor('#ffffff');
  pdf.roundedRect(M + 10 + kpiW, kpiY, kpiW, 10, 1, 1, 'FD');
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(MUTED);
  pdf.text('TOTAL CONSUMED', M + 12 + kpiW, kpiY + 4);
  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(AMBER);
  pdf.text(`${num(summary.consumed)} ${summary.unit || ''}`, M + 12 + kpiW, kpiY + 8.5);

  // Balance
  pdf.setFillColor('#ffffff');
  pdf.roundedRect(M + 15 + 2 * kpiW, kpiY, kpiW + 8, 10, 1, 1, 'FD');
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(MUTED);
  pdf.text('CLOSING BALANCE-IN-HAND', M + 17 + 2 * kpiW, kpiY + 4);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(summary.balance < 0 ? RED : NAVY);
  pdf.text(`${num(summary.balance)} ${summary.unit || ''}`, M + 17 + 2 * kpiW, kpiY + 8.5);

  y += 36;

  // Movement Ledger Table
  ensure(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(NAVY);
  pdf.text('CHRONOLOGICAL MOVEMENT HISTORY & SITE VERIFICATION', M, y);
  y += 4;

  // Table setup: Widths = 22 + 22 + 22 + 24 + 32 + 32 + 28 = 182mm
  const heads = [
    'Date',
    'Received',
    'Consumed',
    'Stock Balance',
    'Contractor Rep',
    'UEED / Client Rep',
    'Challan / Remarks',
  ];
  const widths = [22, 22, 22, 24, 32, 32, 28];

  pdf.setFillColor(NAVY);
  pdf.rect(M, y, CW, 7, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor('#ffffff');

  let curX = M + 2;
  heads.forEach((h, i) => {
    const align = i === 1 || i === 2 || i === 3 ? 'right' : 'left';
    const posX = align === 'right' ? curX + widths[i] - 4 : curX;
    pdf.text(h, posX, y + 4.8, { align });
    curX += widths[i];
  });
  y += 7;

  if (rows.length === 0) {
    ensure(10);
    pdf.setFontSize(8);
    pdf.setTextColor(MUTED);
    pdf.text('No movement entries recorded for this item.', M + 4, y + 6);
    y += 10;
  } else {
    rows.forEach((r, ri) => {
      ensure(7);

      if (ri % 2 === 1) {
        pdf.setFillColor('#f8fafc');
        pdf.rect(M, y, CW, 6.5, 'F');
      }
      pdf.setDrawColor('#f1f5f9');
      pdf.line(M, y + 6.5, M + CW, y + 6.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor('#1e293b');

      let x = M + 2;

      // Date
      pdf.text(formatDate(r.date) || '—', x, y + 4.5);
      x += widths[0];

      // Received
      const recVal = Number(r.receivedQty) || 0;
      pdf.setTextColor(recVal > 0 ? GREEN : MUTED);
      pdf.setFont('helvetica', recVal > 0 ? 'bold' : 'normal');
      pdf.text(recVal > 0 ? `+${num(recVal)}` : '—', x + widths[1] - 4, y + 4.5, { align: 'right' });
      x += widths[1];

      // Consumed
      const conVal = Number(r.consumedQty) || 0;
      pdf.setTextColor(conVal > 0 ? AMBER : MUTED);
      pdf.setFont('helvetica', conVal > 0 ? 'bold' : 'normal');
      pdf.text(conVal > 0 ? `-${num(conVal)}` : '—', x + widths[2] - 4, y + 4.5, { align: 'right' });
      x += widths[2];

      // Balance
      const balVal = Number(r.balance) || 0;
      pdf.setTextColor(balVal < 0 ? RED : '#0f172a');
      pdf.setFont('helvetica', 'bold');
      pdf.text(num(balVal), x + widths[3] - 4, y + 4.5, { align: 'right' });
      x += widths[3];

      // Contractor Rep
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor('#334155');
      const cRep = pdf.splitTextToSize(r.contractorRep || 'Unsigned', widths[4] - 4)[0];
      pdf.text(cRep, x, y + 4.5);
      x += widths[4];

      // UEED Rep
      const uRep = pdf.splitTextToSize(r.ueedRep || 'Unsigned', widths[5] - 4)[0];
      pdf.text(uRep, x, y + 4.5);
      x += widths[5];

      // Remarks
      pdf.setTextColor('#64748b');
      const rem = pdf.splitTextToSize(r.remarks || '—', widths[6] - 4)[0];
      pdf.text(rem, x, y + 4.5);

      y += 6.5;
    });
  }

  // Tripartite Signatures
  ensure(30);
  y += 8;

  pdf.setFillColor('#f8fafc');
  pdf.setDrawColor('#cbd5e1');
  pdf.roundedRect(M, y, CW, 24, 2, 2, 'FD');

  const sigY = y + 17;
  const colW = CW / 3;

  // Sign 1: Contractor
  pdf.setDrawColor('#94a3b8');
  pdf.line(M + 4, sigY - 2, M + colW - 6, sigY - 2);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(NAVY);
  pdf.text('Contractor Site Incharge', M + 4, sigY + 2);

  // Sign 2: PMC
  pdf.line(M + colW + 4, sigY - 2, M + 2 * colW - 6, sigY - 2);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(NAVY);
  pdf.text('Resident Engineer (PMC)', M + colW + 4, sigY + 2);

  // Sign 3: UEED
  pdf.line(M + 2 * colW + 4, sigY - 2, M + 3 * colW - 6, sigY - 2);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(NAVY);
  pdf.text('AEE / Division (UEED)', M + 2 * colW + 4, sigY + 2);

  footer();

  const safeMat = material.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  pdf.save(`StockCard_${safeMat}_${new Date().toISOString().split('T')[0]}.pdf`);
}
