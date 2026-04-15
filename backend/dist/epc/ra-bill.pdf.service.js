"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaBillPdfService = void 0;
const common_1 = require("@nestjs/common");
const pdfkit_1 = __importDefault(require("pdfkit"));
function formatCr(n) {
    if (n == null)
        return '—';
    return n.toFixed(5);
}
function numberToWords(n) {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
        'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
        'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const cr = Math.floor(n);
    const lacs = Math.round((n % 1) * 100);
    let words = '';
    if (cr >= 100)
        words += a[Math.floor(cr / 100)] + ' Hundred ';
    const t = cr % 100;
    if (t < 20)
        words += a[t];
    else
        words += b[Math.floor(t / 10)] + (t % 10 ? ' ' + a[t % 10] : '');
    if (cr > 0)
        words += ' Crore';
    if (lacs > 0)
        words += ' & ' + (lacs < 20 ? a[lacs] : b[Math.floor(lacs / 10)] + (lacs % 10 ? ' ' + a[lacs % 10] : '')) + ' Lacs';
    return words.trim() + ' Only';
}
let RaBillPdfService = class RaBillPdfService {
    async generate(payload) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            const doc = new pdfkit_1.default({
                size: 'A4',
                layout: 'landscape',
                margins: { top: 40, bottom: 40, left: 40, right: 40 },
            });
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            const W = doc.page.width;
            const MARGIN = 40;
            const COL_W = W - MARGIN * 2;
            const C = {
                amber: '#B45309',
                amberBg: '#FEF3C7',
                teal: '#0F766E',
                tealBg: '#F0FDFA',
                dark: '#1F2937',
                gray: '#6B7280',
                lightGray: '#F9FAFB',
                border: '#E5E7EB',
                green: '#15803D',
                white: '#FFFFFF',
            };
            const drawHRule = (y, color = C.border, width = COL_W) => {
                doc.moveTo(MARGIN, y).lineTo(MARGIN + width, y).strokeColor(color).lineWidth(0.5).stroke();
            };
            const cell = (text, x, y, w, h, opts = {}) => {
                if (opts.bg)
                    doc.rect(x, y, w, h).fill(opts.bg).fillColor(C.dark);
                doc
                    .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
                    .fontSize(opts.fontSize ?? 8)
                    .fillColor(opts.color ?? C.dark)
                    .text(text, x + 3, y + (h - (opts.fontSize ?? 8)) / 2 + 1, {
                    width: w - 6,
                    align: opts.align ?? 'left',
                    lineBreak: false,
                    ellipsis: true,
                });
            };
            doc.rect(MARGIN, 40, COL_W, 60).fill(C.dark);
            doc.font('Helvetica-Bold').fontSize(16).fillColor(C.white)
                .text('KHILARI INFRASTRUCTURE PVT. LTD.', MARGIN + 10, 52, { width: COL_W - 20, align: 'center' });
            doc.font('Helvetica').fontSize(8).fillColor('#CBD5E1')
                .text('101–105, Prabhat Centre Annex, Sector-1A, C.B.D Belapur, Navi Mumbai – 400 614 | ssk.kipl2005@gmail.com | www.khilariinfra.com', MARGIN + 10, 72, { width: COL_W - 20, align: 'center' });
            let y = 110;
            doc.rect(MARGIN, y, COL_W, 22).fill(C.amberBg);
            doc.font('Helvetica-Bold').fontSize(10).fillColor(C.amber)
                .text(`RUNNING ACCOUNT BILL — ${payload.header.billNo}`, MARGIN + 10, y + 6, { width: COL_W - 20, align: 'center' });
            y += 28;
            const infoItems = [
                ['Allotment No.', payload.header.allotmentNo],
                ['Allotment Date', payload.header.allotmentDate],
                ['Bill Date', payload.header.billDate],
                ['Client Ref.', payload.header.clientRef || '—'],
                ['Allotted Cost', '₹279.99 Cr (5.904% below ₹297.56 Cr)'],
                ['Contractor', 'M/S Khilari Infrastructure Pvt. Ltd.'],
            ];
            const infoCellW = COL_W / 3;
            infoItems.forEach(([k, v], i) => {
                const row = Math.floor(i / 3);
                const col = i % 3;
                const x = MARGIN + col * infoCellW;
                const iy = y + row * 22;
                doc.rect(x, iy, infoCellW, 22).stroke(C.border);
                doc.font('Helvetica-Bold').fontSize(7).fillColor(C.gray).text(k, x + 4, iy + 3, { width: infoCellW - 8 });
                doc.font('Helvetica').fontSize(8).fillColor(C.dark).text(v, x + 4, iy + 12, { width: infoCellW - 8, ellipsis: true, lineBreak: false });
            });
            y += 48;
            doc.rect(MARGIN, y, COL_W, 28).fill(C.lightGray).stroke(C.border);
            doc.font('Helvetica').fontSize(7.5).fillColor(C.dark)
                .text('Package: Survey, Design and Execution of Sewerage Scheme for Dal Lake Uncovered Areas – Pollution Abatement of Dal Lake, Kashmir (J&K) on EPC Fixed-Cost Turnkey Basis including Operation & Maintenance for 5 Years after Successful Completion of 6-Month Free Trial Run', MARGIN + 6, y + 6, { width: COL_W - 12, height: 22 });
            y += 38;
            const cols = {
                sno: 38,
                comp: 220,
                estCost: 75,
                quoted: 85,
                estQty: 70,
                measQty: 70,
                milPct: 60,
                amount: 80,
            };
            const totalFixed = Object.values(cols).reduce((a, b) => a + b, 0);
            cols.comp = COL_W - (totalFixed - cols.comp);
            const ROW_H = 18;
            const HEADER_H = 22;
            const drawTableHeader = (ty) => {
                doc.rect(MARGIN, ty, COL_W, HEADER_H).fill(C.dark);
                const headers = [
                    ['S.No.', cols.sno, 'center'],
                    ['Description', cols.comp, 'left'],
                    ['Est. Cost\n(₹ Cr)', cols.estCost, 'right'],
                    ['Quoted Rate\n(₹ Cr)', cols.quoted, 'right'],
                    [`Est. Qty`, cols.estQty, 'right'],
                    ['Measured\nQty', cols.measQty, 'right'],
                    ['Milestone\n(%)', cols.milPct, 'center'],
                    ['Work Done\n(₹ Cr)', cols.amount, 'right'],
                ];
                let hx = MARGIN;
                headers.forEach(([label, w, align]) => {
                    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.white)
                        .text(label, hx + 3, ty + 4, { width: w - 6, align, lineBreak: true });
                    hx += w;
                });
                return ty + HEADER_H;
            };
            y = drawTableHeader(y);
            const drawPartHeader = (label, ty) => {
                doc.rect(MARGIN, ty, COL_W, 16).fill(C.tealBg).stroke(C.border);
                doc.font('Helvetica-Bold').fontSize(8).fillColor(C.teal)
                    .text(label, MARGIN + 6, ty + 4);
                return ty + 16;
            };
            const activeItems = payload.items.filter(i => i.amount > 0);
            const drawRow = (item, activeMilestones, ty) => {
                const quoted = parseFloat(item.state.quotedCost) || 0;
                const measured = parseFloat(item.state.measuredQty) || 0;
                const milLabel = activeMilestones.map(m => `${m.label.split('(')[0].trim()} @${m.billedPct}%`).join('\n');
                if (ty > doc.page.height - 80) {
                    doc.addPage({ size: 'A4', layout: 'landscape', margins: { top: 40, bottom: 40, left: 40, right: 40 } });
                    ty = 40;
                    ty = drawTableHeader(ty);
                }
                const rowBg = item.part === 'A' ? '#FFFBEB' : '#F0FDFA';
                doc.rect(MARGIN, ty, COL_W, ROW_H).fill(rowBg).stroke(C.border);
                let rx = MARGIN;
                cell(`${item.part}-${String(item.sno).padStart(2, '0')}`, rx, ty, cols.sno, ROW_H, { align: 'center', color: C.gray });
                rx += cols.sno;
                cell(item.name, rx, ty, cols.comp, ROW_H, { bold: false });
                rx += cols.comp;
                cell(item.estimatedCost ? formatCr(item.estimatedCost) : '—', rx, ty, cols.estCost, ROW_H, { align: 'right', color: C.teal });
                rx += cols.estCost;
                cell(quoted > 0 ? formatCr(quoted) : '—', rx, ty, cols.quoted, ROW_H, { align: 'right', color: C.amber, bold: true });
                rx += cols.quoted;
                cell(item.hasQty ? (item.estimatedQty?.toFixed(2) ?? '—') + (item.qtyUnit ? ` ${item.qtyUnit}` : '') : '—', rx, ty, cols.estQty, ROW_H, { align: 'right', color: C.gray });
                rx += cols.estQty;
                cell(item.hasQty ? (measured > 0 ? measured.toFixed(2) + ` ${item.qtyUnit}` : '—') : 'Lumpsum', rx, ty, cols.measQty, ROW_H, { align: 'right', color: item.hasQty ? C.amber : C.gray });
                rx += cols.measQty;
                cell(milLabel, rx, ty, cols.milPct, ROW_H, { align: 'center', fontSize: 6.5 });
                rx += cols.milPct;
                cell(item.amount > 0 ? item.amount.toFixed(4) : '—', rx, ty, cols.amount, ROW_H, { align: 'right', color: C.green, bold: true });
                return ty + ROW_H;
            };
            y = drawPartHeader('PART A — Sewer Network & Appurtenant Works', y);
            const partAItems = payload.items.filter(i => i.part === 'A');
            partAItems.forEach(item => {
                const activeMilestones = item.state.milestones.filter(m => m.checked);
                y = drawRow(item, activeMilestones, y);
            });
            const partATotal = partAItems.reduce((s, i) => s + i.amount, 0);
            doc.rect(MARGIN, y, COL_W, ROW_H).fill('#FEF9C3').stroke(C.border);
            cell('Part A Sub-Total', MARGIN, y, COL_W - cols.amount, ROW_H, { align: 'right', bold: true });
            cell(partATotal.toFixed(4), MARGIN + COL_W - cols.amount, y, cols.amount, ROW_H, { align: 'right', bold: true, color: C.amber });
            y += ROW_H;
            y = drawPartHeader('PART B — Turnkey Works (STP / IPS / E&M)', y);
            const partBItems = payload.items.filter(i => i.part === 'B');
            partBItems.forEach(item => {
                const activeMilestones = item.state.milestones.filter(m => m.checked);
                y = drawRow(item, activeMilestones, y);
            });
            const partBTotal = partBItems.reduce((s, i) => s + i.amount, 0);
            doc.rect(MARGIN, y, COL_W, ROW_H).fill('#F0FDFA').stroke(C.border);
            cell('Part B Sub-Total', MARGIN, y, COL_W - cols.amount, ROW_H, { align: 'right', bold: true });
            cell(partBTotal.toFixed(4), MARGIN + COL_W - cols.amount, y, cols.amount, ROW_H, { align: 'right', bold: true, color: C.teal });
            y += ROW_H;
            const grandTotal = partATotal + partBTotal;
            doc.rect(MARGIN, y, COL_W, 22).fill(C.dark).stroke(C.dark);
            cell('TOTAL AMOUNT', MARGIN, y, COL_W - cols.amount - cols.milPct, 22, { align: 'right', bold: true, color: C.white, fontSize: 9 });
            cell(`₹ ${grandTotal.toFixed(4)} Cr`, MARGIN + COL_W - cols.amount - cols.milPct, y, cols.amount + cols.milPct, 22, { align: 'right', bold: true, color: '#FCD34D', fontSize: 10 });
            y += 26;
            doc.rect(MARGIN, y, COL_W, 22).fill(C.amberBg).stroke(C.border);
            doc.font('Helvetica-Bold').fontSize(8).fillColor(C.amber)
                .text(`Total Amount in Words: Rs. ${numberToWords(grandTotal)}`, MARGIN + 6, y + 7, { width: COL_W - 12 });
            y += 26;
            y += 10;
            const sigW = COL_W / 3;
            [
                { label: 'Prepared by', sub: 'Site Engineer, KIPL' },
                { label: 'Checked by', sub: 'Project Manager, KIPL' },
                { label: 'Signature of the Contractor', sub: 'M/S Khilari Infrastructure Pvt. Ltd.' },
            ].forEach(({ label, sub }, i) => {
                const sx = MARGIN + i * sigW;
                doc.rect(sx, y, sigW, 50).stroke(C.border);
                doc.font('Helvetica').fontSize(7.5).fillColor(C.gray).text(label, sx + 6, y + 36, { width: sigW - 12 });
                doc.font('Helvetica-Bold').fontSize(7).fillColor(C.dark).text(sub, sx + 6, y + 44, { width: sigW - 12 });
            });
            const pageRange = `1`;
            doc.font('Helvetica').fontSize(7).fillColor(C.gray)
                .text(`KIPL ProjectOS | Generated: ${new Date().toLocaleString('en-IN')} | Page ${pageRange}`, MARGIN, doc.page.height - 25, { width: COL_W, align: 'center' });
            doc.end();
        });
    }
};
exports.RaBillPdfService = RaBillPdfService;
exports.RaBillPdfService = RaBillPdfService = __decorate([
    (0, common_1.Injectable)()
], RaBillPdfService);
//# sourceMappingURL=ra-bill.pdf.service.js.map