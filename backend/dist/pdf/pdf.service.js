"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfService = void 0;
const common_1 = require("@nestjs/common");
const PDFDocument = require("pdfkit");
const KIPL = {
    name: 'M/S Khilari Infrastructure Pvt. Ltd.',
    address: '101 to 105, Prabhat Centre Annex, Sector-1A, C.B.D Belapur, Navi Mumbai - 400 614',
    phone: '2758 0681',
    email: 'ssk.kipl2005@gmail.com',
    website: 'www.khilariinfra.com',
    project: 'Survey, Design & Execution of Sewerage Scheme Dal Lake (Uncovered Areas), Kashmir J&K',
    allotment: 'CE/UEED/PS/01 OF 2025-26',
};
let PdfService = class PdfService {
    async generateSalarySlip(data) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            const doc = new PDFDocument({ size: 'A4', margin: 40 });
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            const { employee: emp, record: rec, month, year, daysPresent, totalDays } = data;
            const monthName = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month];
            doc.rect(0, 0, 595, 80).fill('#1a2540');
            doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
                .text(KIPL.name, 40, 18, { align: 'center' });
            doc.fontSize(9).font('Helvetica')
                .text(KIPL.address, 40, 38, { align: 'center' })
                .text('Tel: ' + KIPL.phone + '  |  Email: ' + KIPL.email, 40, 50, { align: 'center' });
            doc.fillColor('#1a2540').fontSize(14).font('Helvetica-Bold')
                .text('SALARY SLIP', 40, 95, { align: 'center' });
            doc.fontSize(10).font('Helvetica')
                .text('Month: ' + monthName + ' ' + year, 40, 115, { align: 'center' });
            doc.moveTo(40, 135).lineTo(555, 135).strokeColor('#e2e8f0').lineWidth(1).stroke();
            doc.rect(40, 145, 515, 80).strokeColor('#e2e8f0').lineWidth(1).stroke();
            doc.fillColor('#f8f9fc').rect(40, 145, 515, 24).fill();
            doc.fillColor('#1a2540').fontSize(10).font('Helvetica-Bold')
                .text('EMPLOYEE DETAILS', 50, 152);
            const empY = 178;
            doc.fillColor('#475569').fontSize(9).font('Helvetica');
            doc.text('Employee Code:', 50, empY).text(emp.empCode || '—', 160, empY);
            doc.text('Name:', 50, empY + 16).text((emp.firstName || '') + ' ' + (emp.lastName || ''), 160, empY + 16);
            doc.text('Designation:', 50, empY + 32).text(emp.designation || '—', 160, empY + 32);
            doc.text('Department:', 310, empY).text(emp.department || '—', 420, empY);
            doc.text('Joining Date:', 310, empY + 16).text(emp.dateOfJoining || '—', 420, empY + 16);
            doc.text('PAN:', 310, empY + 32).text(emp.panNo || '—', 420, empY + 32);
            doc.rect(40, 240, 515, 40).strokeColor('#e2e8f0').stroke();
            doc.fillColor('#f8f9fc').rect(40, 240, 515, 20).fill();
            doc.fillColor('#1a2540').fontSize(9).font('Helvetica-Bold').text('ATTENDANCE', 50, 246);
            doc.fillColor('#475569').font('Helvetica');
            doc.text('Working Days: ' + totalDays, 50, 263)
                .text('Days Present: ' + daysPresent, 200, 263)
                .text('Days Absent: ' + (totalDays - daysPresent), 350, 263)
                .text('LOP Days: ' + rec.lopDays, 460, 263);
            const tableY = 295;
            doc.rect(40, tableY, 250, 22).fill('#1a2540');
            doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold').text('EARNINGS', 50, tableY + 7);
            const earnings = [
                ['Basic Salary', rec.basicSalary],
                ['HRA', rec.hra],
                ['Allowances', rec.allowances],
                ['Gross Salary', rec.grossSalary],
            ];
            earnings.forEach(([label, val], i) => {
                const y = tableY + 22 + (i * 20);
                if (i % 2 === 0)
                    doc.rect(40, y, 250, 20).fill('#f8f9fc');
                doc.fillColor('#374151').font('Helvetica').fontSize(9)
                    .text(label, 50, y + 6);
                doc.text('₹ ' + Number(val || 0).toLocaleString('en-IN'), 220, y + 6, { align: 'right', width: 60 });
            });
            doc.rect(305, tableY, 250, 22).fill('#dc2626');
            doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold').text('DEDUCTIONS', 315, tableY + 7);
            const deductions = [
                ['PF (Employee 12%)', rec.pfEmployee],
                ['ESI (0.75%)', rec.esi || 0],
                ['LOP Deduction', rec.lopDeduction || 0],
                ['Total Deductions', rec.totalDeductions],
            ];
            deductions.forEach(([label, val], i) => {
                const y = tableY + 22 + (i * 20);
                if (i % 2 === 0)
                    doc.rect(305, y, 250, 20).fill('#fef2f2');
                doc.fillColor('#374151').font('Helvetica').fontSize(9)
                    .text(label, 315, y + 6);
                doc.text('₹ ' + Number(val || 0).toLocaleString('en-IN'), 490, y + 6, { align: 'right', width: 55 });
            });
            const netY = tableY + 22 + (4 * 20) + 10;
            doc.rect(40, netY, 515, 40).fill('#1a2540');
            doc.fillColor('#fff').fontSize(12).font('Helvetica-Bold')
                .text('NET PAY:', 50, netY + 12)
                .text('₹ ' + Number(rec.netSalary || 0).toLocaleString('en-IN'), 400, netY + 12, { align: 'right', width: 145 });
            doc.fillColor('#475569').fontSize(8).font('Helvetica')
                .text('Amount in Words: ' + amountInWords(Number(rec.netSalary || 0)) + ' Only', 40, netY + 55);
            const bankY = netY + 75;
            if (emp.bankAccount?.bankName) {
                doc.rect(40, bankY, 515, 50).strokeColor('#e2e8f0').stroke();
                doc.fillColor('#f8f9fc').rect(40, bankY, 515, 20).fill();
                doc.fillColor('#1a2540').fontSize(9).font('Helvetica-Bold').text('BANK DETAILS', 50, bankY + 6);
                doc.fillColor('#475569').font('Helvetica')
                    .text('Bank: ' + emp.bankAccount.bankName, 50, bankY + 26)
                    .text('Account No: ' + emp.bankAccount.accountNo, 200, bankY + 26)
                    .text('IFSC: ' + emp.bankAccount.ifsc, 400, bankY + 26);
            }
            const sigY = doc.page.height - 100;
            doc.fillColor('#475569').fontSize(9).font('Helvetica');
            doc.text('_______________________', 50, sigY)
                .text('Employee Signature', 50, sigY + 14);
            doc.text('_______________________', 400, sigY)
                .text('Authorised Signatory', 400, sigY + 14);
            doc.rect(0, doc.page.height - 30, 595, 30).fill('#1a2540');
            doc.fillColor('rgba(255,255,255,0.5)').fontSize(7)
                .text('This is a computer generated salary slip. Project: ' + KIPL.project.substring(0, 80), 40, doc.page.height - 20, { align: 'center' });
            doc.end();
        });
    }
    async generateRaBill(data) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            const doc = new PDFDocument({ size: 'A4', margin: 25, layout: 'landscape' });
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            const { bill } = data;
            const W = 841;
            const H = 595;
            const M = 25;
            const CW = W - M * 2;
            doc.rect(0, 0, W, 72).fill('#1a2540');
            doc.rect(M, 8, 55, 55).fill('rgba(255,255,255,0.08)').stroke();
            doc.fillColor('rgba(255,255,255,0.5)').fontSize(7).font('Helvetica')
                .text('KIPL', M + 4, 28, { width: 47, align: 'center' });
            doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
                .text(KIPL.name, M + 64, 10, { align: 'center', width: CW - 130 });
            doc.fillColor('rgba(255,255,255,0.7)').fontSize(7.5).font('Helvetica')
                .text(KIPL.address, M + 64, 28, { align: 'center', width: CW - 130 })
                .text('Tel. Fax: ' + KIPL.phone + '   Email: ' + KIPL.email + '   Website: ' + KIPL.website, M + 64, 39, { align: 'center', width: CW - 130 });
            doc.fillColor('#fbbf24').fontSize(15).font('Helvetica-Bold')
                .text('RUNNING ACCOUNT BILL', M + 64, 52, { align: 'center', width: CW - 130 });
            doc.rect(M, 78, CW, 18).fill('#1e3a5f');
            doc.fillColor('#93c5fd').fontSize(7).font('Helvetica')
                .text('Package: Survey, Design and Execution of Sewerage Scheme for Dal Lake Uncovered Areas — EPC Fixed-Cost Turnkey Basis including O&M for 5 Years', M + 8, 83, { width: CW - 16, lineBreak: false });
            const infoY = 102;
            doc.rect(M, infoY, CW, 32).fill('#f8fafc').strokeColor('#cbd5e1').lineWidth(0.5).stroke();
            doc.moveTo(M + 200, infoY).lineTo(M + 200, infoY + 32).stroke();
            doc.moveTo(M + 430, infoY).lineTo(M + 430, infoY + 32).stroke();
            const infoData = (label, value, x, y, w) => {
                doc.fillColor('#64748b').fontSize(7).font('Helvetica').text(label, x + 4, y);
                doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold').text(value || '—', x + 4, y + 10, { width: w - 8 });
            };
            infoData('Bill No.', bill.billNo ?? 'RA-1', M, infoY + 2, 100);
            infoData('Allotment No.', bill.allotmentNo ?? KIPL.allotment, M + 100, infoY + 2, 100);
            infoData('Dated', bill.billDate ?? '', M + 200, infoY + 2, 115);
            infoData('Period', bill.periodFrom && bill.periodTo ? bill.periodFrom + ' to ' + bill.periodTo : '—', M + 315, infoY + 2, 115);
            infoData('Client', 'J&K UEED Srinagar', M + 430, infoY + 2, 180);
            infoData('Contractor', 'M/S Khilari Infrastructure Pvt. Ltd.', M + 610, infoY + 2, 181);
            const tableY = infoY + 38;
            const C = {
                sno: M,
                desc: M + 20,
                comp: M + 165,
                workdone: M + 295,
                breakup: M + 390,
                estCost: M + 465,
                quoted: M + 517,
                estQty: M + 569,
                measQty: M + 611,
                pct: M + 653,
                release: M + 689,
                amount: M + 725,
            };
            const hdrH = 26;
            doc.rect(M, tableY, CW, hdrH).fill('#1a2540');
            const hdrFont = (x, label, w) => {
                doc.fillColor('#e2e8f0').fontSize(6).font('Helvetica-Bold')
                    .text(label, x + 2, tableY + 4, { width: w - 4, align: 'center' });
            };
            hdrFont(C.sno, 'S.\nNo.', 20);
            hdrFont(C.desc, 'Description', 145);
            hdrFont(C.comp, 'Components', 130);
            hdrFont(C.workdone, 'Work Done', 95);
            hdrFont(C.breakup, 'Breakup', 75);
            hdrFont(C.estCost, 'Estimated\nCost, Cr', 52);
            hdrFont(C.quoted, 'Quoted\nRates, Cr', 52);
            hdrFont(C.estQty, 'Est. Qty\n(Km/Nos)', 42);
            hdrFont(C.measQty, 'Meas.\nQty', 42);
            hdrFont(C.pct, '% of Bill\n(Sched.)', 36);
            hdrFont(C.release, 'Bill\nRelease%', 36);
            hdrFont(C.amount, 'Amount\n(Crores)', 41);
            let rowY = tableY + hdrH;
            let sno = 1;
            const lineItems = bill.lineItems ?? [];
            const groups = new Map();
            for (const li of lineItems) {
                const key = li.parentDescription ?? li.category ?? 'Other';
                if (!groups.has(key))
                    groups.set(key, []);
                groups.get(key).push(li);
            }
            const drawBorder = (y, h) => {
                doc.rect(M, y, CW, h).strokeColor('#cbd5e1').lineWidth(0.3).stroke();
            };
            const drawVDiv = (y, h) => {
                doc.strokeColor('#e2e8f0').lineWidth(0.25);
                Object.values(C).forEach(x => {
                    doc.moveTo(x, y).lineTo(x, y + h).stroke();
                });
                doc.moveTo(M + CW, y).lineTo(M + CW, y + h).stroke();
            };
            const cell = (text, x, y, w, opts = {}) => {
                doc.text(String(text ?? ''), x + 3, y + 3, { width: w - 6, lineBreak: false, ...opts });
            };
            for (const [parentDesc, items] of groups) {
                const ghH = 16;
                if (rowY + ghH > H - 60) {
                    doc.addPage({ layout: 'landscape' });
                    rowY = 40;
                }
                doc.rect(M, rowY, CW, ghH).fill('#dbeafe');
                doc.fillColor('#1e40af').fontSize(7.5).font('Helvetica-Bold');
                cell(String(sno) + '.', C.sno, rowY, 20, { align: 'center' });
                cell(parentDesc, C.desc, rowY, 600);
                drawVDiv(rowY, ghH);
                doc.moveTo(M, rowY + ghH).lineTo(M + CW, rowY + ghH).strokeColor('#93c5fd').lineWidth(0.4).stroke();
                rowY += ghH;
                for (const li of items) {
                    const subRows = li.subRows ?? [];
                    const baseH = 18;
                    const rowH = subRows.length > 0 ? baseH + subRows.length * 11 : baseH;
                    if (rowY + rowH > H - 60) {
                        doc.addPage({ layout: 'landscape' });
                        rowY = 40;
                    }
                    const bg = sno % 2 === 0 ? '#f8fafc' : '#ffffff';
                    doc.rect(M, rowY, CW, rowH).fill(bg);
                    doc.fillColor('#374151').fontSize(7).font('Helvetica');
                    cell(li.componentLabel ?? li.description ?? '', C.comp, rowY, 130);
                    const workDoneName = li.workDone ?? li.milestoneName ?? '';
                    cell(workDoneName, C.workdone, rowY, 95);
                    if (subRows.length > 0) {
                        doc.fillColor('#475569').fontSize(6.5);
                        cell('Survey (@' + subRows[0].pct + '% of total amount of this item)', C.breakup, rowY, 75);
                        if (subRows[1]) {
                            doc.text('Vetting of Design (@' + subRows[1].pct + '% of total amount of this item)', C.breakup + 3, rowY + 10, { width: 72, lineBreak: false });
                        }
                    }
                    else {
                        doc.fillColor('#374151').fontSize(6.5);
                        cell('Clause 23.3 @' + (li.paymentPct ?? li.pctBillSchedule ?? 0) + '%', C.breakup, rowY, 75);
                    }
                    doc.fillColor('#374151').fontSize(7).font('Helvetica');
                    const estCost = Number(li.estimatedCost ?? 0);
                    const quoted = Number(li.quotedRates ?? li.estimatedCost ?? 0);
                    const estQty = Number(li.estimatedQtyKm ?? 0);
                    const measQty = Number(li.measuredQtyKm ?? 0);
                    const pct = Number(li.paymentPct ?? li.pctBillSchedule ?? 0);
                    const release = Number(li.billToRelease ?? li.workdoneBillPct ?? 0);
                    const amount = Number(li.workdoneAmount ?? 0);
                    cell(fmtCrNum(estCost), C.estCost, rowY, 52, { align: 'right' });
                    cell(fmtCrNum(quoted), C.quoted, rowY, 52, { align: 'right' });
                    cell(estQty > 0 ? estQty.toFixed(2) : '—', C.estQty, rowY, 42, { align: 'right' });
                    cell(measQty > 0 ? measQty.toFixed(2) : '—', C.measQty, rowY, 42, { align: 'right' });
                    cell(pct + '%', C.pct, rowY, 36, { align: 'center' });
                    cell(release.toFixed(1) + '%', C.release, rowY, 36, { align: 'center' });
                    doc.fillColor('#047857').font('Helvetica-Bold').fontSize(7.5);
                    cell(fmtCrNum(amount), C.amount, rowY, 41, { align: 'right' });
                    if (subRows.length > 0) {
                        subRows.forEach((sr, si) => {
                            const srY = rowY + baseH + si * 11;
                            doc.fillColor('#6b7280').font('Helvetica').fontSize(6.5);
                            cell('  └ ' + sr.breakup, C.breakup, srY - 2, 75);
                            doc.fillColor('#047857').font('Helvetica-Bold').fontSize(6.5);
                            cell(fmtCrNum(Number(sr.amount)), C.amount, srY - 2, 41, { align: 'right' });
                        });
                    }
                    drawVDiv(rowY, rowH);
                    doc.moveTo(M, rowY + rowH).lineTo(M + CW, rowY + rowH).strokeColor('#e2e8f0').lineWidth(0.3).stroke();
                    rowY += rowH;
                }
                sno++;
            }
            if (rowY + 22 > H - 60) {
                doc.addPage({ layout: 'landscape' });
                rowY = 40;
            }
            const totH = 20;
            doc.rect(M, rowY, CW, totH).fill('#1a2540');
            doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold')
                .text('Total Amount in words: ' + amountInWords(Number(bill.grossAmount ?? 0)) + ' Only', M + 8, rowY + 5, { width: 560 });
            doc.fillColor('#fbbf24').fontSize(9).font('Helvetica-Bold')
                .text('GROSS AMOUNT  ' + fmtCrNum(Number(bill.grossAmount ?? 0)) + ' Crores', C.estCost, rowY + 5, { width: 200, align: 'right' });
            rowY += totH;
            const dedH = 14;
            const dedRows = [
                ['Less: Previously Billed Amount', Number(bill.prevBilled ?? 0), false],
                ['Net Amount This Bill', Number(bill.netThisBill ?? 0), false],
                ['Add: GST @ ' + (bill.gstPct ?? 0) + '%', Number(bill.gstAmount ?? 0), false],
                ['Less: TDS @ ' + (bill.tdsPct ?? 2) + '% (Clause 20 of Contract)', Number(bill.tdsAmount ?? 0), true],
                ['Less: Security Deposit @ ' + (bill.securityDepositPct ?? 5) + '%', Number(bill.securityDepositAmount ?? 0), true],
            ];
            dedRows.forEach(([label, val, isDed], di) => {
                if (rowY + dedH > H - 60) {
                    doc.addPage({ layout: 'landscape' });
                    rowY = 40;
                }
                doc.rect(M, rowY, CW, dedH).fill(di % 2 === 0 ? '#f8fafc' : '#fff');
                doc.fillColor('#374151').fontSize(8).font('Helvetica')
                    .text(String(label), M + 8, rowY + 3, { width: 640 });
                doc.fillColor(isDed ? '#dc2626' : '#0f172a').font('Helvetica-Bold')
                    .text((isDed ? '(-) ' : '') + fmtCrNum(Math.abs(Number(val))), C.amount, rowY + 3, { width: 41, align: 'right' });
                doc.moveTo(M, rowY + dedH).lineTo(M + CW, rowY + dedH).strokeColor('#e2e8f0').lineWidth(0.3).stroke();
                rowY += dedH;
            });
            if (rowY + 28 > H - 60) {
                doc.addPage({ layout: 'landscape' });
                rowY = 40;
            }
            doc.rect(M, rowY, CW, 28).fill('#059669');
            doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
                .text('Total Amount in words: ' + amountInWords(Number(bill.netPayable ?? 0)) + ' Only', M + 8, rowY + 5, { width: 560 });
            doc.fillColor('#d1fae5').fontSize(11).font('Helvetica-Bold')
                .text('Total Amount  ' + fmtCrNum(Number(bill.netPayable ?? 0)) + ' Crores', C.estCost, rowY + 7, { width: 200, align: 'right' });
            rowY += 28;
            rowY += 6;
            if (rowY + 55 > H - 10) {
                doc.addPage({ layout: 'landscape' });
                rowY = 40;
            }
            const sc = bill.status === 'approved' || bill.status === 'paid' ? '#059669' :
                bill.status === 'submitted' ? '#2563eb' : '#64748b';
            doc.rect(M, rowY, 90, 14).fill(sc + '18');
            doc.fillColor(sc).fontSize(7.5).font('Helvetica-Bold')
                .text('Status: ' + (bill.status ?? 'DRAFT').toUpperCase(), M + 5, rowY + 3);
            if (bill.remarks) {
                doc.rect(M + 100, rowY, 400, 14).fill('#fffbeb').strokeColor('#fde68a').stroke();
                doc.fillColor('#92400e').fontSize(7.5).font('Helvetica')
                    .text('Remarks: ' + bill.remarks, M + 105, rowY + 3, { width: 390 });
            }
            rowY += 20;
            const sigW = 160;
            const sigs = [
                { x: M, role: 'Prepared By', org: 'Contractor' },
                { x: M + 200, role: 'Verified By', org: 'Engineer-in-Charge' },
                { x: M + 400, role: 'Approved By', org: 'UEED' },
                { x: M + 590, role: 'Signature of Contractor', org: '' },
            ];
            doc.fillColor('#374151').fontSize(8).font('Helvetica');
            sigs.forEach(s => {
                doc.moveTo(s.x, rowY + 20).lineTo(s.x + sigW, rowY + 20)
                    .strokeColor('#94a3b8').lineWidth(0.5).stroke();
                doc.fillColor('#374151').text(s.role, s.x, rowY + 23);
                doc.fillColor('#94a3b8').fontSize(7).text(s.org, s.x, rowY + 33);
                doc.fontSize(8);
            });
            doc.rect(0, H - 18, W, 18).fill('#1a2540');
            doc.fillColor('rgba(255,255,255,0.45)').fontSize(6.5).font('Helvetica')
                .text('Allotment No: ' + KIPL.allotment + '   ·   Bill No: ' + (bill.billNo ?? '') + '   ·   ' + KIPL.name + '   ·   Generated by KIPL ProjectOS   ·   ' + new Date().toLocaleDateString('en-IN'), M, H - 12, { align: 'center', width: CW });
            doc.end();
        });
    }
    async generateInspectionReport(data) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            const doc = new PDFDocument({ size: 'A4', margin: 40 });
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            const { inspection: insp, checklist } = data;
            doc.rect(0, 0, 595, 70).fill('#1a2540');
            doc.fillColor('#fff').fontSize(14).font('Helvetica-Bold')
                .text(KIPL.name, 40, 12, { align: 'center' });
            doc.fontSize(8).font('Helvetica')
                .text(KIPL.address, 40, 30, { align: 'center' });
            doc.fillColor('#059669').fontSize(14).font('Helvetica-Bold')
                .text('QUALITY ASSURANCE INSPECTION REPORT', 40, 48, { align: 'center' });
            const infoY = 85;
            doc.rect(40, infoY, 515, 70).strokeColor('#e2e8f0').stroke();
            doc.fillColor('#f8f9fc').rect(40, infoY, 515, 20).fill();
            doc.fillColor('#1a2540').fontSize(9).font('Helvetica-Bold').text('INSPECTION DETAILS', 50, infoY + 6);
            const details = [
                ['Date:', insp.date, 'Work Item:', insp.workItem],
                ['Location:', insp.location || '—', 'Chainage:', insp.chainage || '—'],
                ['Inspected By:', insp.inspectedBy, 'Contractor Rep:', insp.contractorRep || '—'],
            ];
            details.forEach(([l1, v1, l2, v2], i) => {
                const y = infoY + 24 + (i * 15);
                doc.fillColor('#64748b').font('Helvetica').fontSize(8)
                    .text(l1, 50, y).text(v1, 130, y)
                    .text(l2, 310, y).text(v2, 400, y);
            });
            const resultY = infoY + 80;
            const resultColor = insp.overallResult === 'passed' ? '#059669' : insp.overallResult === 'failed' ? '#dc2626' : '#d97706';
            doc.rect(40, resultY, 515, 35).fill(resultColor);
            doc.fillColor('#fff').fontSize(12).font('Helvetica-Bold')
                .text('OVERALL RESULT: ' + insp.overallResult?.toUpperCase(), 50, resultY + 10);
            doc.fillColor('#fff').fontSize(9).font('Helvetica')
                .text('PASS: ' + insp.passCount + '   FAIL: ' + insp.failCount + '   N/A: ' + insp.naCount, 350, resultY + 14);
            const tableY = resultY + 50;
            doc.rect(40, tableY, 400, 18).fill('#1a2540');
            doc.rect(440, tableY, 115, 18).fill('#1a2540');
            doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold')
                .text('Inspection Item', 50, tableY + 5)
                .text('Result', 450, tableY + 5);
            const responses = insp.responses ?? [];
            let rowY = tableY + 18;
            responses.forEach((r, i) => {
                const rColor = r.result === 'pass' ? '#059669' : r.result === 'fail' ? '#dc2626' : '#94a3b8';
                const bg = i % 2 === 0 ? '#f8f9fc' : '#fff';
                const rowH = 20;
                doc.rect(40, rowY, 400, rowH).fill(bg);
                doc.rect(440, rowY, 115, rowH).fill(r.result === 'pass' ? '#ecfdf5' : r.result === 'fail' ? '#fef2f2' : bg);
                doc.fillColor('#374151').fontSize(8).font('Helvetica')
                    .text((i + 1) + '. ' + r.question, 50, rowY + 6, { width: 380 });
                doc.fillColor(rColor).font('Helvetica-Bold')
                    .text(r.result?.toUpperCase() ?? '—', 450, rowY + 6);
                rowY += rowH;
                if (rowY > doc.page.height - 150) {
                    doc.addPage();
                    rowY = 40;
                }
            });
            if (insp.remarks) {
                doc.rect(40, rowY + 10, 515, 35).strokeColor('#e2e8f0').stroke();
                doc.fillColor('#64748b').fontSize(9).font('Helvetica')
                    .text('Remarks: ' + insp.remarks, 50, rowY + 18, { width: 500 });
            }
            const sigY = doc.page.height - 80;
            doc.fillColor('#475569').fontSize(9);
            doc.text('_______________________', 50, sigY).text('QA Inspector', 50, sigY + 14);
            doc.text('_______________________', 240, sigY).text('Contractor Rep', 240, sigY + 14);
            doc.text('_______________________', 430, sigY).text('Engineer-in-Charge', 430, sigY + 14);
            doc.end();
        });
    }
};
exports.PdfService = PdfService;
exports.PdfService = PdfService = __decorate([
    (0, common_1.Injectable)()
], PdfService);
function fmtCrNum(n) {
    return (n / 1e7).toFixed(5);
}
function getCategoryDescription(cat) {
    const map = {
        sewer_network: 'Laying of Sewer & Appurtenant works (Survey, Design, Providing & Laying of Sewerage Network including Excavation)',
        ips_civil: 'For IPS — Civil & Structural Works (Turnkey Items)',
        ips_em: 'For IPS — Electro-Mechanical Works (Turnkey Items)',
        stp_civil: 'For STP/MPS — Civil & Structural Works (Turnkey Items)',
        stp_em: 'For STP/MPS — Electro-Mechanical Works (Turnkey Items)',
        rising_main: 'Rising Mains & Allied Works (Turnkey Items)',
        road_work: 'Road Cutting, Reinstatement & Surface Restoration',
        other: 'Miscellaneous Works',
    };
    return map[cat] ?? cat;
}
function getComponentName(cat) {
    const map = {
        sewer_network: 'RCC NP3 Pipes of all dia incl. DI, HDPE; Manholes of Different Sizes & Depths; Drop Arrangements; Masonry Chambers',
        ips_civil: 'Survey Design, engineering, supply, construction, erection, hydraulic testing and commissioning of IPS (Civil)',
        ips_em: 'Survey Design, engineering, supply, construction, erection, hydraulic testing and commissioning of IPS (E&M)',
        stp_civil: 'Survey Design, engineering, supply, construction, erection, hydraulic testing and commissioning of STP/MPS (Civil)',
        stp_em: 'Survey Design, engineering, supply, erection and commissioning of STP/MPS Electro-Mechanical Components',
        rising_main: 'Rising Main Pipes, Valves, Fittings and Allied Civil Works',
        road_work: 'Cutting bitumen road and making good including supply of aggregate, moorum, screening etc.',
        other: 'Miscellaneous works as per BOQ',
    };
    return map[cat] ?? cat;
}
function amountInWords(amount) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function convert(n) {
        if (n === 0)
            return '';
        if (n < 20)
            return ones[n] + ' ';
        if (n < 100)
            return tens[Math.floor(n / 10)] + ' ' + (n % 10 ? ones[n % 10] + ' ' : '');
        if (n < 1000)
            return ones[Math.floor(n / 100)] + ' Hundred ' + convert(n % 100);
        if (n < 100000)
            return convert(Math.floor(n / 1000)) + 'Thousand ' + convert(n % 1000);
        if (n < 10000000)
            return convert(Math.floor(n / 100000)) + 'Lakh ' + convert(n % 100000);
        return convert(Math.floor(n / 10000000)) + 'Crore ' + convert(n % 10000000);
    }
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    let words = 'Rupees ' + convert(rupees).trim();
    if (paise > 0)
        words += ' and ' + convert(paise).trim() + ' Paise';
    return words;
}
//# sourceMappingURL=pdf.service.js.map