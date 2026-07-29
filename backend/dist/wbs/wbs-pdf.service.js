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
exports.WbsPdfService = void 0;
const common_1 = require("@nestjs/common");
const pdfkit_1 = __importDefault(require("pdfkit"));
const wbs_task_entity_1 = require("./wbs-task.entity");
let WbsPdfService = class WbsPdfService {
    fmt(date) {
        if (!date)
            return '—';
        const d = new Date(date);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    async generateGanttFull(tasks, dashboard) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            const doc = new pdfkit_1.default({ size: 'A3', layout: 'landscape', margins: { top: 40, bottom: 40, left: 40, right: 40 } });
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            const W = doc.page.width;
            const H = doc.page.height;
            const M = 40;
            const usable = W - M * 2;
            const C = {
                navy: '#1a2540', white: '#fff', amber: '#b45309', amberBg: '#fef3c7',
                teal: '#0f766e', tealBg: '#f0fdfa', green: '#059669', red: '#dc2626',
                blue: '#2563eb', gray: '#6b7280', dark: '#1f2937', border: '#e5e7eb',
                critical: '#dc2626', criticalBg: '#fef2f2',
            };
            doc.rect(M, M, usable, 50).fill(C.navy);
            doc.font('Helvetica-Bold').fontSize(16).fillColor(C.white)
                .text('DAL LAKE SEWERAGE — GANTT CHART', M + 10, M + 12, { width: usable - 20, align: 'center' });
            doc.font('Helvetica').fontSize(9).fillColor('#cbd5e1')
                .text('M/S Khilari Infrastructure Pvt. Ltd. · Allotment CE/UEED/PS/01 OF 2025-26 · Duration: 30 Months · 07-11-2025 to 07-05-2028', M + 10, M + 32, { width: usable - 20, align: 'center' });
            let y = M + 60;
            const kpis = [
                ['Contract Progress', dashboard.contractPct + '%'],
                ['Overall Work', dashboard.overallProgress + '%'],
                ['Days Remaining', String(dashboard.daysRemaining)],
                ['Critical Tasks', String(dashboard.criticalTasks)],
                ['Milestones Hit', `${dashboard.milestonesHit}/${dashboard.milestones}`],
            ];
            const kw = usable / kpis.length;
            for (let i = 0; i < kpis.length; i++) {
                const [l, v] = kpis[i];
                const x = M + i * kw;
                doc.rect(x, y, kw, 30).fill('#f8f9fc').stroke(C.border);
                doc.font('Helvetica-Bold').fontSize(7).fillColor(C.gray).text(l, x + 5, y + 5, { width: kw - 10 });
                doc.font('Helvetica-Bold').fontSize(13).fillColor(C.navy).text(v, x + 5, y + 14, { width: kw - 10 });
            }
            y += 38;
            const taskColW = 240;
            const ganttX = M + taskColW;
            const ganttW = usable - taskColW;
            const projStart = new Date(dashboard.contractStart).getTime();
            const projEnd = new Date(dashboard.contractEnd).getTime();
            const totalMs = projEnd - projStart;
            const headerH = 24;
            doc.rect(M, y, taskColW, headerH).fill(C.navy);
            doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white).text('TASK / WBS', M + 8, y + 8);
            const months = [];
            const cur = new Date(projStart);
            cur.setDate(1);
            while (cur.getTime() <= projEnd) {
                months.push(new Date(cur));
                cur.setMonth(cur.getMonth() + 1);
            }
            doc.rect(ganttX, y, ganttW, headerH).fill(C.navy);
            months.forEach((m, i) => {
                const x = ganttX + (m.getTime() - projStart) / totalMs * ganttW;
                const next = months[i + 1] ? months[i + 1].getTime() : projEnd;
                const w = (next - m.getTime()) / totalMs * ganttW;
                if (i > 0) {
                    doc.moveTo(x, y).lineTo(x, y + headerH).strokeColor('#475569').lineWidth(0.3).stroke();
                }
                if (m.getMonth() === 0 || i === 0) {
                    doc.font('Helvetica-Bold').fontSize(8).fillColor('#fbbf24').text(String(m.getFullYear()), x + 2, y + 3, { width: w, align: 'left' });
                }
                doc.font('Helvetica').fontSize(6.5).fillColor('#cbd5e1')
                    .text(m.toLocaleDateString('en-IN', { month: 'short' }), x + 2, y + 14, { width: w, align: 'left' });
            });
            y += headerH;
            const today = new Date().getTime();
            const todayX = ganttX + Math.max(0, Math.min(ganttW, (today - projStart) / totalMs * ganttW));
            const rowH = 16;
            const visibleTasks = tasks.filter(t => t.level === 1 || t.isMilestone);
            for (const t of visibleTasks) {
                if (y > H - 60)
                    break;
                const isMs = t.isMilestone;
                const isCritical = t.isCritical;
                const tStart = new Date(t.plannedStart).getTime();
                const tEnd = new Date(t.plannedEnd).getTime();
                const barX = ganttX + Math.max(0, Math.min(ganttW, (tStart - projStart) / totalMs * ganttW));
                const barEnd = ganttX + Math.max(0, Math.min(ganttW, (tEnd - projStart) / totalMs * ganttW));
                const barW = Math.max(2, barEnd - barX);
                const progressW = barW * Number(t.progressPct) / 100;
                const rowBg = isCritical ? C.criticalBg : (isMs ? '#fffbeb' : '#fff');
                doc.rect(M, y, usable, rowH).fill(rowBg);
                doc.rect(M, y, taskColW, rowH).stroke(C.border);
                doc.rect(ganttX, y, ganttW, rowH).stroke(C.border);
                const labelColor = isCritical ? C.critical : (isMs ? C.amber : C.dark);
                const prefix = isMs ? '• ' : isCritical ? '! ' : '';
                doc.font(isCritical || isMs ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5).fillColor(labelColor)
                    .text(`${prefix}${t.wbsCode} — ${t.title}`.substring(0, 48), M + 6, y + 4, { width: taskColW - 12, lineBreak: false, ellipsis: true });
                if (!isMs) {
                    doc.font('Helvetica').fontSize(6.5).fillColor(C.gray)
                        .text(`${t.progressPct}%`, M + taskColW - 32, y + 4, { width: 26, align: 'right' });
                }
                if (isMs) {
                    const cx = barX + barW / 2;
                    const cy = y + rowH / 2;
                    const sz = 5;
                    doc.polygon([cx, cy - sz], [cx + sz, cy], [cx, cy + sz], [cx - sz, cy]).fillAndStroke(C.amber, '#92400e');
                }
                else {
                    const barColor = isCritical ? C.critical : (t.status === wbs_task_entity_1.TaskStatus.COMPLETED ? C.green : t.status === wbs_task_entity_1.TaskStatus.DELAYED ? C.red : C.blue);
                    doc.rect(barX, y + 3, barW, rowH - 6).fill(barColor + '40').stroke(barColor + '80');
                    doc.rect(barX, y + 3, progressW, rowH - 6).fill(barColor);
                }
                y += rowH;
            }
            doc.moveTo(todayX, M + 90).lineTo(todayX, y).strokeColor(C.red).lineWidth(1.2).dash(3, { space: 2 }).stroke().undash();
            doc.font('Helvetica-Bold').fontSize(7).fillColor(C.red).text('TODAY', todayX - 14, M + 88);
            y += 8;
            const legend = [
                { c: C.blue, l: 'In Progress' },
                { c: C.green, l: 'Completed' },
                { c: C.red, l: 'Delayed/Critical' },
                { c: C.amber, l: 'Milestone •' },
                { c: '#94a3b8', l: 'Not Started' },
            ];
            let lx = M;
            doc.font('Helvetica-Bold').fontSize(8).fillColor(C.dark).text('Legend:', lx, y);
            lx += 50;
            for (const item of legend) {
                doc.rect(lx, y + 2, 10, 8).fill(item.c);
                doc.font('Helvetica').fontSize(7).fillColor(C.dark).text(item.l, lx + 13, y + 3);
                lx += 90;
            }
            doc.font('Helvetica').fontSize(6.5).fillColor(C.gray)
                .text(`Generated: ${new Date().toLocaleString('en-IN')} · KIPL ProjectOS`, M, H - 25, { width: usable, align: 'center' });
            doc.end();
        });
    }
    async generateGanttQuarterly(tasks, dashboard) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            const doc = new pdfkit_1.default({ size: 'A4', layout: 'landscape', margins: { top: 36, bottom: 36, left: 36, right: 36 } });
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            const projStart = new Date(dashboard.contractStart);
            const projEnd = new Date(dashboard.contractEnd);
            const quarters = [];
            const c = new Date(projStart);
            c.setDate(1);
            c.setMonth(Math.floor(c.getMonth() / 3) * 3);
            while (c < projEnd) {
                const qStart = new Date(c);
                const qEnd = new Date(c);
                qEnd.setMonth(qEnd.getMonth() + 3);
                const qNum = Math.floor(qStart.getMonth() / 3) + 1;
                quarters.push({ start: qStart, end: qEnd, label: `Q${qNum} ${qStart.getFullYear()}` });
                c.setMonth(c.getMonth() + 3);
            }
            const C = { navy: '#1a2540', white: '#fff', amber: '#b45309', dark: '#1f2937', gray: '#6b7280', border: '#e5e7eb', red: '#dc2626', blue: '#2563eb', green: '#059669', critical: '#dc2626' };
            for (let qi = 0; qi < quarters.length; qi++) {
                if (qi > 0)
                    doc.addPage();
                const q = quarters[qi];
                const W = doc.page.width;
                const H = doc.page.height;
                const M = 36;
                const usable = W - M * 2;
                doc.rect(M, M, usable, 38).fill(C.navy);
                doc.font('Helvetica-Bold').fontSize(13).fillColor(C.white)
                    .text(`DAL LAKE — GANTT ${q.label}`, M + 10, M + 8, { width: usable - 20, align: 'center' });
                doc.font('Helvetica').fontSize(8).fillColor('#cbd5e1')
                    .text(`${this.fmt(q.start.toISOString())} → ${this.fmt(q.end.toISOString())} · KIPL`, M + 10, M + 24, { width: usable - 20, align: 'center' });
                let y = M + 48;
                const taskColW = 200;
                const ganttX = M + taskColW;
                const ganttW = usable - taskColW;
                const totalMs = q.end.getTime() - q.start.getTime();
                doc.rect(M, y, taskColW, 22).fill(C.navy);
                doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white).text('TASK', M + 8, y + 7);
                doc.rect(ganttX, y, ganttW, 22).fill(C.navy);
                for (let m = 0; m < 3; m++) {
                    const monthDate = new Date(q.start);
                    monthDate.setMonth(monthDate.getMonth() + m);
                    const mx = ganttX + (m / 3) * ganttW;
                    const mw = ganttW / 3;
                    if (m > 0)
                        doc.moveTo(mx, y).lineTo(mx, y + 22).strokeColor('#475569').lineWidth(0.3).stroke();
                    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
                        .text(monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), mx, y + 6, { width: mw, align: 'center' });
                }
                y += 22;
                const activeTasks = tasks.filter(t => {
                    const ts = new Date(t.plannedStart).getTime();
                    const te = new Date(t.plannedEnd).getTime();
                    return te >= q.start.getTime() && ts <= q.end.getTime();
                });
                const rowH = 18;
                for (const t of activeTasks) {
                    if (y > H - 50)
                        break;
                    const isMs = t.isMilestone;
                    const tStart = Math.max(new Date(t.plannedStart).getTime(), q.start.getTime());
                    const tEnd = Math.min(new Date(t.plannedEnd).getTime(), q.end.getTime());
                    const barX = ganttX + (tStart - q.start.getTime()) / totalMs * ganttW;
                    const barW = Math.max(2, (tEnd - tStart) / totalMs * ganttW);
                    const progressW = barW * Number(t.progressPct) / 100;
                    const rowBg = t.isCritical ? '#fef2f2' : (isMs ? '#fffbeb' : (y % (rowH * 2) === 0 ? '#f9fafb' : '#fff'));
                    doc.rect(M, y, usable, rowH).fill(rowBg);
                    doc.rect(M, y, taskColW, rowH).stroke(C.border);
                    doc.rect(ganttX, y, ganttW, rowH).stroke(C.border);
                    const labelColor = t.isCritical ? C.critical : (isMs ? C.amber : C.dark);
                    const prefix = isMs ? '• ' : t.isCritical ? '! ' : '';
                    doc.font(t.isCritical || isMs ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5).fillColor(labelColor)
                        .text(`${prefix}${t.wbsCode} ${t.title}`.substring(0, 38), M + 6, y + 5, { width: taskColW - 12, lineBreak: false, ellipsis: true });
                    if (isMs) {
                        const cx = barX + barW / 2;
                        const cy = y + rowH / 2;
                        const sz = 5;
                        doc.polygon([cx, cy - sz], [cx + sz, cy], [cx, cy + sz], [cx - sz, cy]).fillAndStroke(C.amber, '#92400e');
                    }
                    else {
                        const barColor = t.isCritical ? C.critical : (t.status === wbs_task_entity_1.TaskStatus.COMPLETED ? C.green : t.status === wbs_task_entity_1.TaskStatus.DELAYED ? C.red : C.blue);
                        doc.rect(barX, y + 4, barW, rowH - 8).fill(barColor + '40').stroke(barColor + '80');
                        doc.rect(barX, y + 4, progressW, rowH - 8).fill(barColor);
                    }
                    y += rowH;
                }
                const today = new Date().getTime();
                if (today >= q.start.getTime() && today <= q.end.getTime()) {
                    const todayX = ganttX + (today - q.start.getTime()) / totalMs * ganttW;
                    doc.moveTo(todayX, M + 70).lineTo(todayX, y).strokeColor(C.red).lineWidth(1.2).dash(3, { space: 2 }).stroke().undash();
                    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.red).text('TODAY', todayX - 14, M + 68);
                }
                doc.font('Helvetica').fontSize(6).fillColor(C.gray)
                    .text(`Page ${qi + 1} of ${quarters.length} · KIPL ProjectOS`, M, H - 20, { width: usable, align: 'center' });
            }
            doc.end();
        });
    }
    async generateProgressReport(tasks, dashboard, cpm, pert) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            const doc = new pdfkit_1.default({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 }, bufferPages: true });
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            const C = { navy: '#1a2540', white: '#fff', amber: '#b45309', dark: '#1f2937', gray: '#6b7280', border: '#e5e7eb', red: '#dc2626', blue: '#2563eb', green: '#059669', light: '#f8f9fc' };
            const W = doc.page.width;
            const M = 50;
            const usable = W - M * 2;
            doc.rect(0, 0, W, 200).fill(C.navy);
            doc.font('Helvetica-Bold').fontSize(28).fillColor(C.white)
                .text('PROGRESS REPORT', M, 60, { width: usable, align: 'center' });
            doc.font('Helvetica').fontSize(12).fillColor('#93c5fd')
                .text('DAL LAKE SEWERAGE SCHEME', M, 100, { width: usable, align: 'center' });
            doc.font('Helvetica').fontSize(10).fillColor('#cbd5e1')
                .text('M/S Khilari Infrastructure Pvt. Ltd. (KIPL)', M, 130, { width: usable, align: 'center' });
            doc.text('Allotment: CE/UEED/PS/01 OF 2025-26 · Dated: 07-11-2025', M, 148, { width: usable, align: 'center' });
            let y = 230;
            doc.font('Helvetica').fontSize(10).fillColor(C.dark)
                .text(`Report Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, M, y);
            doc.text(`Reporting Period: ${this.fmt(dashboard.contractStart)} → Today`, M, y + 16);
            doc.text(`Contract Duration: 30 Months · Completion: ${this.fmt(dashboard.contractEnd)}`, M, y + 32);
            y = 320;
            doc.rect(M, y, usable, 120).fill(C.light).stroke(C.border);
            const bigStats = [
                { l: 'Contract Time Elapsed', v: dashboard.contractPct + '%', c: C.blue },
                { l: 'Overall Work Progress', v: dashboard.overallProgress + '%', c: C.green },
                { l: 'Critical Tasks', v: String(dashboard.criticalTasks), c: C.red },
                { l: 'Days Remaining', v: String(dashboard.daysRemaining), c: C.amber },
            ];
            const sw = usable / 4;
            bigStats.forEach((s, i) => {
                const x = M + i * sw;
                doc.font('Helvetica-Bold').fontSize(8).fillColor(C.gray).text(s.l.toUpperCase(), x + 8, y + 12, { width: sw - 16 });
                doc.font('Helvetica-Bold').fontSize(28).fillColor(s.c).text(s.v, x + 8, y + 30, { width: sw - 16 });
            });
            y = 470;
            doc.font('Helvetica-Bold').fontSize(14).fillColor(C.navy).text('EXECUTIVE SUMMARY', M, y);
            y += 24;
            doc.rect(M, y, usable, 4).fill(C.amber);
            y += 12;
            const summary = `As of ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}, the Dal Lake Sewerage Scheme is ${dashboard.contractPct}% through its contract timeline with ${dashboard.daysRemaining} days remaining until completion. Overall work progress stands at ${dashboard.overallProgress}% across ${dashboard.totalTasks} tasks. ${dashboard.completed} tasks have been completed, ${dashboard.inProgress} are in progress, and ${dashboard.delayed} are flagged as delayed. Of ${dashboard.milestones} project milestones, ${dashboard.milestonesHit} have been achieved.

The Critical Path Method analysis identifies ${dashboard.criticalTasks} critical tasks requiring close monitoring as any delay will directly extend project completion. PERT analysis shows the project's expected completion within statistical bounds based on auto-computed three-point estimates.`;
            doc.font('Helvetica').fontSize(10).fillColor(C.dark).text(summary, M, y, { width: usable, align: 'justify', lineGap: 3 });
            doc.addPage();
            y = M;
            doc.font('Helvetica-Bold').fontSize(18).fillColor(C.navy).text('KEY PERFORMANCE INDICATORS', M, y);
            y += 30;
            const kpiCards = [
                { label: 'Total Tasks', value: String(dashboard.totalTasks), color: C.dark },
                { label: 'Completed', value: `${dashboard.completed}/${dashboard.totalTasks}`, color: C.green },
                { label: 'In Progress', value: String(dashboard.inProgress), color: C.blue },
                { label: 'Delayed', value: String(dashboard.delayed), color: dashboard.delayed > 0 ? C.red : C.green },
                { label: 'Milestones', value: `${dashboard.milestonesHit}/${dashboard.milestones}`, color: C.amber },
                { label: 'Critical Path', value: String(dashboard.criticalTasks), color: C.red },
            ];
            const kw = usable / 3;
            const kh = 70;
            kpiCards.forEach((k, i) => {
                const col = i % 3;
                const row = Math.floor(i / 3);
                const x = M + col * kw;
                const ky = y + row * (kh + 10);
                doc.rect(x, ky, kw - 6, kh).fill('#fff').stroke(C.border);
                doc.font('Helvetica-Bold').fontSize(8).fillColor(C.gray).text(k.label.toUpperCase(), x + 12, ky + 12, { width: kw - 24 });
                doc.font('Helvetica-Bold').fontSize(22).fillColor(k.color).text(k.value, x + 12, ky + 30, { width: kw - 24 });
            });
            y += 2 * (kh + 10) + 20;
            doc.font('Helvetica-Bold').fontSize(14).fillColor(C.navy).text('PERT ANALYSIS — Project Duration', M, y);
            y += 22;
            doc.rect(M, y, usable, 90).fill(C.light).stroke(C.border);
            doc.font('Helvetica-Bold').fontSize(9).fillColor(C.gray).text('EXPECTED DURATION (TE)', M + 12, y + 10);
            doc.font('Helvetica-Bold').fontSize(20).fillColor(C.navy).text(`${dashboard.projectExpectedDuration} days`, M + 12, y + 24);
            doc.font('Helvetica').fontSize(8).fillColor(C.gray).text(`σ = ${dashboard.projectStdDeviation} days`, M + 12, y + 50);
            const pertX = M + usable / 2;
            doc.font('Helvetica-Bold').fontSize(9).fillColor(C.gray).text('CONFIDENCE INTERVALS', pertX, y + 10);
            doc.font('Helvetica').fontSize(9).fillColor(C.dark)
                .text(`68% probability:  ${pert.probability68.lower} – ${pert.probability68.upper} days`, pertX, y + 26)
                .text(`95% probability:  ${pert.probability95.lower} – ${pert.probability95.upper} days`, pertX, y + 40)
                .text(`99% probability:  ${pert.probability99.lower} – ${pert.probability99.upper} days`, pertX, y + 54);
            y += 100;
            doc.addPage();
            y = M;
            doc.font('Helvetica-Bold').fontSize(18).fillColor(C.navy).text('TASK PROGRESS DETAIL', M, y);
            y += 30;
            const cols = [
                { l: 'Code', w: 40 },
                { l: 'Task', w: 200 },
                { l: 'Start', w: 60 },
                { l: 'End', w: 60 },
                { l: 'Dur', w: 35 },
                { l: 'Prog', w: 40 },
                { l: 'Status', w: 60 },
            ];
            doc.rect(M, y, usable, 22).fill(C.navy);
            let cx = M + 5;
            cols.forEach(c => {
                doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white).text(c.l, cx, y + 7, { width: c.w });
                cx += c.w;
            });
            y += 22;
            const nonMilestoneTasks = tasks.filter(t => !t.isMilestone);
            for (const t of nonMilestoneTasks) {
                if (y > doc.page.height - 80) {
                    doc.addPage();
                    y = M;
                }
                const rh = 18;
                const bg = t.isCritical ? '#fef2f2' : (t.level === 1 ? '#f8f9fc' : '#fff');
                doc.rect(M, y, usable, rh).fill(bg).stroke(C.border);
                cx = M + 5;
                doc.font('Helvetica-Bold').fontSize(7).fillColor(t.isCritical ? C.red : C.blue).text(t.wbsCode, cx, y + 5, { width: cols[0].w, lineBreak: false });
                cx += cols[0].w;
                doc.font(t.level === 1 ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5).fillColor(C.dark)
                    .text(t.title, cx + (t.level === 2 ? 8 : 0), y + 5, { width: cols[1].w - 10, lineBreak: false, ellipsis: true });
                cx += cols[1].w;
                doc.font('Helvetica').fontSize(7).fillColor(C.gray).text(this.fmt(t.plannedStart), cx, y + 5, { width: cols[2].w, lineBreak: false });
                cx += cols[2].w;
                doc.text(this.fmt(t.plannedEnd), cx, y + 5, { width: cols[3].w, lineBreak: false });
                cx += cols[3].w;
                doc.text(`${t.plannedDuration}d`, cx, y + 5, { width: cols[4].w, lineBreak: false });
                cx += cols[4].w;
                doc.font('Helvetica-Bold').fontSize(7).fillColor(Number(t.progressPct) === 100 ? C.green : C.blue)
                    .text(`${t.progressPct}%`, cx, y + 5, { width: cols[5].w, lineBreak: false });
                cx += cols[5].w;
                const sc = t.status === wbs_task_entity_1.TaskStatus.COMPLETED ? C.green : t.status === wbs_task_entity_1.TaskStatus.DELAYED ? C.red : t.status === wbs_task_entity_1.TaskStatus.IN_PROGRESS ? C.blue : C.gray;
                doc.font('Helvetica').fontSize(7).fillColor(sc).text(t.status.replace(/_/g, ' '), cx, y + 5, { width: cols[6].w, lineBreak: false });
                y += rh;
            }
            doc.addPage();
            y = M;
            doc.font('Helvetica-Bold').fontSize(18).fillColor(C.navy).text('MILESTONE STATUS', M, y);
            y += 30;
            const milestones = tasks.filter(t => t.isMilestone);
            for (const m of milestones) {
                if (y > doc.page.height - 80) {
                    doc.addPage();
                    y = M;
                }
                const isPast = new Date(m.plannedEnd) < new Date();
                const isDone = m.status === wbs_task_entity_1.TaskStatus.COMPLETED;
                const isOverdue = isPast && !isDone;
                const cardColor = isDone ? C.green : isOverdue ? C.red : C.amber;
                const cardBg = isDone ? '#ecfdf5' : isOverdue ? '#fef2f2' : '#fffbeb';
                doc.rect(M, y, usable, 50).fill(cardBg).stroke(cardColor + '60');
                doc.rect(M, y, 6, 50).fill(cardColor);
                doc.font('Helvetica-Bold').fontSize(11).fillColor(cardColor).text(`◆ ${m.wbsCode} — ${m.title}`, M + 18, y + 8, { width: usable - 30 });
                doc.font('Helvetica').fontSize(9).fillColor(C.dark)
                    .text(`Planned: ${this.fmt(m.plannedEnd)}`, M + 18, y + 26)
                    .text(`Status: ${isDone ? '✓ Achieved' : isOverdue ? '⚠ Overdue' : 'Upcoming'}`, M + 18, y + 38);
                if (m.paymentMilestone) {
                    doc.font('Helvetica').fontSize(8).fillColor(C.blue)
                        .text(`Payment: ${m.paymentMilestone} (${m.paymentPct}%)`, M + 200, y + 26, { width: usable - 220 });
                }
                y += 56;
            }
            const delayed = tasks.filter(t => Number(t.delayDays) > 0 || t.status === wbs_task_entity_1.TaskStatus.DELAYED);
            if (delayed.length > 0) {
                doc.addPage();
                y = M;
                doc.font('Helvetica-Bold').fontSize(18).fillColor(C.red).text('DELAY ANALYSIS', M, y);
                y += 24;
                doc.font('Helvetica').fontSize(9).fillColor(C.dark).text(`${delayed.length} task(s) delayed. Review reasons and EOT applications.`, M, y);
                y += 20;
                for (const d of delayed) {
                    if (y > doc.page.height - 80) {
                        doc.addPage();
                        y = M;
                    }
                    doc.rect(M, y, usable, 60).fill('#fef2f2').stroke('#fecaca');
                    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.red).text(`${d.wbsCode} — ${d.title}`, M + 12, y + 8, { width: usable - 24 });
                    doc.font('Helvetica').fontSize(8).fillColor(C.dark)
                        .text(`Delayed by ${d.delayDays} days · Planned end: ${this.fmt(d.plannedEnd)}`, M + 12, y + 26);
                    if (d.delayReason)
                        doc.text(`Reason: ${d.delayReason}`, M + 12, y + 38, { width: usable - 24 });
                    if (d.eotApplied)
                        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.amber).text(`EOT applied: ${d.eotDays} days`, M + 12, y + 50);
                    y += 66;
                }
            }
            doc.addPage();
            y = M;
            doc.font('Helvetica-Bold').fontSize(18).fillColor(C.navy).text('CRITICAL PATH ANALYSIS (CPM)', M, y);
            y += 24;
            doc.font('Helvetica').fontSize(9).fillColor(C.dark).text(`Tasks on the critical path have zero float — any delay directly extends project completion.`, M, y);
            y += 20;
            const cpmCols = [
                { l: 'Code', w: 50 },
                { l: 'Task', w: 220 },
                { l: 'Dur', w: 40 },
                { l: 'ES', w: 40 },
                { l: 'EF', w: 40 },
                { l: 'LS', w: 40 },
                { l: 'LF', w: 40 },
                { l: 'Float', w: 40 },
            ];
            doc.rect(M, y, usable, 20).fill(C.navy);
            cx = M + 5;
            cpmCols.forEach(c => {
                doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white).text(c.l, cx, y + 6, { width: c.w });
                cx += c.w;
            });
            y += 20;
            const criticalTasks = tasks.filter(t => t.isCritical);
            for (const t of criticalTasks) {
                if (y > doc.page.height - 80) {
                    doc.addPage();
                    y = M;
                }
                const rh = 18;
                doc.rect(M, y, usable, rh).fill('#fef2f2').stroke('#fecaca');
                cx = M + 5;
                doc.font('Helvetica-Bold').fontSize(7).fillColor(C.red).text(t.wbsCode, cx, y + 5, { width: cpmCols[0].w, lineBreak: false });
                cx += cpmCols[0].w;
                doc.font('Helvetica').fontSize(7.5).fillColor(C.dark).text(t.title, cx, y + 5, { width: cpmCols[1].w, lineBreak: false, ellipsis: true });
                cx += cpmCols[1].w;
                doc.font('Helvetica').fontSize(7).fillColor(C.dark)
                    .text(`${t.expectedDuration}`, cx, y + 5, { width: cpmCols[2].w })
                    .text(`${t.earliestStart}`, cx + cpmCols[2].w, y + 5, { width: cpmCols[3].w })
                    .text(`${t.earliestFinish}`, cx + cpmCols[2].w + cpmCols[3].w, y + 5, { width: cpmCols[4].w })
                    .text(`${t.latestStart}`, cx + cpmCols[2].w + cpmCols[3].w + cpmCols[4].w, y + 5, { width: cpmCols[5].w })
                    .text(`${t.latestFinish}`, cx + cpmCols[2].w + cpmCols[3].w + cpmCols[4].w + cpmCols[5].w, y + 5, { width: cpmCols[6].w });
                doc.font('Helvetica-Bold').fontSize(7).fillColor(C.red)
                    .text(`${t.totalFloat}`, cx + cpmCols[2].w + cpmCols[3].w + cpmCols[4].w + cpmCols[5].w + cpmCols[6].w, y + 5, { width: cpmCols[7].w });
                y += rh;
            }
            const range = doc.bufferedPageRange();
            for (let i = range.start; i < range.start + range.count; i++) {
                doc.switchToPage(i);
                doc.font('Helvetica').fontSize(7).fillColor(C.gray)
                    .text(`Page ${i - range.start + 1} of ${range.count}  ·  KIPL ProjectOS · Generated ${new Date().toLocaleString('en-IN')}`, M, doc.page.height - 30, { width: usable, align: 'center' });
            }
            doc.end();
        });
    }
};
exports.WbsPdfService = WbsPdfService;
exports.WbsPdfService = WbsPdfService = __decorate([
    (0, common_1.Injectable)()
], WbsPdfService);
//# sourceMappingURL=wbs-pdf.service.js.map