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
            const doc = new PDFDocument({ size: 'A4', margin: 40 });
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            const { bill, project } = data;
            doc.rect(0, 0, 595, 90).fill('#1a2540');
            doc.fillColor('#fff').fontSize(14).font('Helvetica-Bold')
                .text(KIPL.name, 40, 14, { align: 'center' });
            doc.fontSize(8).font('Helvetica')
                .text(KIPL.address, 40, 32, { align: 'center' })
                .text('Tel: ' + KIPL.phone + '  |  ' + KIPL.email + '  |  ' + KIPL.website, 40, 44, { align: 'center' });
            doc.fillColor('#f59e0b').fontSize(16).font('Helvetica-Bold')
                .text('RUNNING ACCOUNT BILL', 40, 60, { align: 'center' });
            doc.fillColor('#1a2540').fontSize(10).font('Helvetica-Bold');
            const infoY = 105;
            const infoData = [
                ['Bill No.', bill.billNo],
                ['Allotment No.', bill.allotmentNo || KIPL.allotment],
                ['Bill Date', bill.billDate],
                ['Period', bill.periodFrom && bill.periodTo ? bill.periodFrom + ' to ' + bill.periodTo : '—'],
                ['Status', bill.status?.toUpperCase()],
                ['Client', 'J&K UEED Srinagar'],
            ];
            infoData.forEach(([label, val], i) => {
                const x = i < 3 ? 40 : 310;
                const y = infoY + (i % 3) * 18;
                doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(label + ':', x, y);
                doc.fillColor('#0f172a').font('Helvetica-Bold').text(String(val || '—'), x + 90, y);
            });
            doc.rect(40, infoY + 60, 515, 30).fill('#eff6ff');
            doc.fillColor('#1d4ed8').fontSize(8).font('Helvetica')
                .text('Package: ' + KIPL.project, 50, infoY + 68, { width: 500 });
            const tableY = infoY + 105;
            doc.rect(40, tableY, 515, 22).fill('#1a2540');
            doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold')
                .text('BILL AMOUNT DETAILS', 50, tableY + 7);
            const rows = [
                ['Gross Amount (Executed Work)', bill.grossAmount, '#f8f9fc'],
                ['Less: Previously Billed Amount', -bill.prevBilled, '#fff'],
                ['Net Amount This Bill', bill.netThisBill, '#f8f9fc'],
                ['Add: GST (' + bill.gstPct + '%)', bill.gstAmount, '#fff'],
                ['Less: TDS @ ' + bill.tdsPct + '% (Clause 20)', -bill.tdsAmount, '#f8f9fc'],
                ['Less: Security Deposit @ ' + bill.securityDepositPct + '%', -bill.securityDepositAmount, '#fff'],
            ];
            rows.forEach(([label, val, bg], i) => {
                const y = tableY + 22 + (i * 22);
                doc.rect(40, y, 515, 22).fill(String(bg));
                doc.fillColor('#374151').fontSize(9).font('Helvetica')
                    .text(String(label), 50, y + 7);
                const amount = Number(val || 0);
                doc.fillColor(amount < 0 ? '#dc2626' : '#0f172a').font('Helvetica-Bold')
                    .text((amount < 0 ? '- ' : '') + '₹ ' + Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 400, y + 7, { align: 'right', width: 145 });
            });
            const netY = tableY + 22 + (rows.length * 22);
            doc.rect(40, netY, 515, 35).fill('#059669');
            doc.fillColor('#fff').fontSize(13).font('Helvetica-Bold')
                .text('NET AMOUNT PAYABLE:', 50, netY + 10)
                .text('₹ ' + Number(bill.netPayable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 380, netY + 10, { align: 'right', width: 165 });
            doc.fillColor('#475569').fontSize(9).font('Helvetica')
                .text('In Words: ' + amountInWords(Number(bill.netPayable || 0)) + ' Only', 40, netY + 45);
            if (bill.remarks) {
                doc.rect(40, netY + 65, 515, 30).strokeColor('#e2e8f0').stroke();
                doc.fillColor('#475569').fontSize(9).text('Remarks: ' + bill.remarks, 50, netY + 73);
            }
            const sigY = doc.page.height - 110;
            doc.moveTo(40, sigY).lineTo(555, sigY).strokeColor('#e2e8f0').stroke();
            doc.fillColor('#475569').fontSize(9).font('Helvetica');
            doc.text('_______________________', 50, sigY + 20)
                .text('Prepared By', 50, sigY + 35)
                .text('Contractor', 50, sigY + 48);
            doc.text('_______________________', 240, sigY + 20)
                .text('Verified By', 240, sigY + 35)
                .text('Engineer-in-Charge', 240, sigY + 48);
            doc.text('_______________________', 430, sigY + 20)
                .text('Approved By', 430, sigY + 35)
                .text('UEED / LCMA', 430, sigY + 48);
            doc.rect(0, doc.page.height - 30, 595, 30).fill('#1a2540');
            doc.fillColor('rgba(255,255,255,0.4)').fontSize(7)
                .text('Allotment No: ' + KIPL.allotment + '  |  Khilari Infrastructure Pvt. Ltd.  |  Generated by ProjectOS', 40, doc.page.height - 19, { align: 'center' });
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