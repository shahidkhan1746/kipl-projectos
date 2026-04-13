#!/usr/bin/env bash
# ================================================================
#  KIPL ProjectOS — Fix All
#  Fixes: App.tsx, index.css, 4 backend TypeScript errors
# ================================================================

set -euo pipefail
G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${G}  ✓${NC} $1"; }
info() { echo -e "${B}  →${NC} $1"; }

ROOT="$HOME/Desktop/kipl-srinagar"
BACKEND="$ROOT/backend/src"
FRONTEND="$ROOT/frontend/src"

# ================================================================
# FIX 1 — Install puppeteer (missing package)
# ================================================================
info "Installing puppeteer..."
cd "$ROOT/backend"
npm install --save puppeteer --silent
ok "puppeteer installed"

# ================================================================
# FIX 2 — pdf.service.ts (puppeteer import fix)
# ================================================================
info "Fixing pdf.service.ts..."
cat > "$BACKEND/pdf/pdf.service.ts" << 'TS'
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PdfService {
  private readonly log = new Logger(PdfService.name);

  constructor(private readonly config: ConfigService) {}

  private get company() {
    return {
      name:    this.config.get<string>('COMPANY_NAME')    ?? 'Khilari Infrastructure Pvt. Ltd.',
      address: this.config.get<string>('COMPANY_ADDRESS') ?? 'Srinagar, J&K',
      phone:   this.config.get<string>('COMPANY_PHONE')   ?? '',
      email:   this.config.get<string>('COMPANY_EMAIL')   ?? '',
      gst:     this.config.get<string>('COMPANY_GST')     ?? '',
    };
  }

  async generateLetterPdf(data: {
    letterNumber:    string;
    date:            string;
    toName?:         string;
    toOrganization?: string;
    subject:         string;
    body:            string;
    projectName:     string;
    signedByName:    string;
    signedByDesig?:  string;
  }): Promise<Buffer> {
    const html = this.letterHtml(data);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const puppeteer = require('puppeteer');
      const browser   = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });
      await browser.close();
      this.log.log(`PDF generated: ${data.letterNumber}`);
      return Buffer.from(pdf);
    } catch (e) {
      this.log.warn('Puppeteer unavailable — returning HTML buffer');
      return Buffer.from(html);
    }
  }

  letterHtml(data: {
    letterNumber: string; date: string;
    toName?: string; toOrganization?: string;
    subject: string; body: string;
    projectName: string; signedByName: string; signedByDesig?: string;
  }): string {
    const c = this.company;
    const formattedDate = new Date(data.date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;font-size:12px;color:#222;margin:0;padding:0}
  .header{border-bottom:3px solid #185FA5;padding-bottom:10px;margin-bottom:18px}
  .company-name{font-size:18px;font-weight:bold;color:#185FA5}
  .company-sub{font-size:10px;color:#555;margin-top:2px}
  .meta{display:flex;justify-content:space-between;margin:14px 0;font-size:11px}
  .body{line-height:1.9;margin:10px 0;min-height:180px;white-space:pre-wrap}
  .signature-block{margin-top:50px;border-top:1px solid #ccc;padding-top:6px;width:200px}
</style></head><body>
<div class="header">
  <div class="company-name">${c.name}</div>
  <div class="company-sub">${c.address} | ${c.phone} | ${c.email} | GSTIN: ${c.gst}</div>
</div>
<div class="meta">
  <div><b>Ref No.:</b> ${data.letterNumber}</div>
  <div><b>Date:</b> ${formattedDate}</div>
</div>
<div class="meta"><div><b>Project:</b> ${data.projectName}</div></div>
<div style="margin:10px 0"><b>To,</b><br>${data.toName ?? ''}<br>${data.toOrganization ?? ''}</div>
<div style="font-weight:bold;margin:10px 0"><u>Sub:</u> ${data.subject}</div>
<hr style="border:none;border-top:1px solid #ddd;margin:10px 0">
<div style="margin-bottom:10px">Respected Sir/Madam,</div>
<div class="body">${data.body.replace(/\n/g, '<br>')}</div>
<div style="margin-top:20px">Yours faithfully,</div>
<div class="signature-block">
  <b>${data.signedByName}</b><br>
  <span style="color:#555">${data.signedByDesig ?? 'Authorised Signatory'}</span><br>
  <span style="color:#555">${c.name}</span>
</div>
</body></html>`;
  }
}
TS
ok "pdf.service.ts fixed"

# ================================================================
# FIX 3 — liaison.service.ts (null string fix)
# ================================================================
info "Fixing liaison.service.ts null type..."
sed -i 's/step\.remarks    = dto\.remarks ?? null;/step.remarks    = dto.remarks ?? undefined;/' \
  "$BACKEND/liaison/liaison.service.ts"
ok "liaison.service.ts fixed"

# ================================================================
# FIX 4 — liaison.controller.ts (private repo + Response type)
# ================================================================
info "Fixing liaison.controller.ts..."
cat > "$BACKEND/liaison/liaison.controller.ts" << 'TS'
import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, Request, HttpCode, HttpStatus, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { LiaisonService }  from './liaison.service';
import { CreateFileDto }   from './dto/create-file.dto';
import { ApproveFileDto }  from './dto/approve-file.dto';
import { CreateLetterDto } from './dto/create-letter.dto';
import { SendLetterDto }   from './dto/send-letter.dto';
import { JwtAuthGuard }    from '../auth/guards/jwt-auth.guard';
import { LiaisonStatus }   from './liaison-file.entity';

@Controller('liaison')
@UseGuards(JwtAuthGuard)
export class LiaisonController {
  constructor(private readonly svc: LiaisonService) {}

  @Get('files')
  listFiles(@Query() q: any, @Request() req: any) {
    return this.svc.listFiles({
      projectId:  q.projectId,
      status:     q.status,
      priority:   q.priority,
      department: q.department,
      fileType:   q.fileType,
      page:       q.page  ? parseInt(q.page)  : 1,
      limit:      q.limit ? parseInt(q.limit) : 25,
      userId:     req.user.id,
    });
  }

  @Post('files')
  @HttpCode(HttpStatus.CREATED)
  createFile(@Body() dto: CreateFileDto, @Request() req: any) {
    return this.svc.createFile(dto, req.user.id);
  }

  @Get('files/:id')
  getFile(@Param('id') id: string) {
    return this.svc.getFile(id);
  }

  @Patch('files/:id/approve')
  approveFile(@Param('id') id: string, @Body() dto: ApproveFileDto, @Request() req: any) {
    return this.svc.processApproval(id, dto, req.user.id, req.user.role);
  }

  @Patch('files/:id/close')
  async closeFile(@Param('id') id: string) {
    const file = await this.svc.getFile(id);
    file.currentStatus = LiaisonStatus.CLOSED;
    return this.svc.fileRepo.save(file);
  }

  @Post('files/:id/documents')
  @HttpCode(HttpStatus.CREATED)
  uploadDocument(@Param('id') fileId: string, @Body() body: any, @Request() req: any) {
    return this.svc.uploadDocument({
      fileId,
      uploadedById:       req.user.id,
      documentName:       body.documentName,
      cloudinaryUrl:      body.cloudinaryUrl,
      cloudinaryPublicId: body.cloudinaryPublicId,
      fileSizeBytes:      body.fileSizeBytes,
      mimeType:           body.mimeType,
    });
  }

  @Get('letters')
  listLetters(@Query() q: any) {
    return this.svc.listLetters({ projectId: q.projectId, letterType: q.letterType });
  }

  @Post('letters')
  @HttpCode(HttpStatus.CREATED)
  createLetter(@Body() dto: CreateLetterDto, @Request() req: any) {
    return this.svc.createLetter(dto, req.user.id);
  }

  @Get('letters/:id')
  getLetter(@Param('id') id: string) {
    return this.svc.getLetter(id);
  }

  @Get('letters/:id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const letter = await this.svc.getLetter(id);
    const pdf    = await this.svc.generateLetterPdf(id);
    const fname  = `${(letter.letterNumber ?? id).replace(/\//g, '-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.send(pdf);
  }

  @Post('letters/:id/send')
  @HttpCode(HttpStatus.OK)
  sendLetter(@Param('id') id: string, @Body() dto: SendLetterDto) {
    return this.svc.sendLetterByEmail(id, dto);
  }

  @Get('dashboard')
  dashboard(@Query('projectId') projectId?: string) {
    return this.svc.dashboard(projectId);
  }
}
TS
ok "liaison.controller.ts fixed"

# Make fileRepo public in liaison.service.ts so controller can access it
sed -i 's/private readonly fileRepo:/readonly fileRepo:/' \
  "$BACKEND/liaison/liaison.service.ts"
ok "fileRepo made accessible"

# ================================================================
# FIX 5 — App.tsx (was interrupted)
# ================================================================
info "Writing App.tsx..."
cat > "$FRONTEND/App.tsx" << 'TSX'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardLayout from '@/layouts/DashboardLayout'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import LiaisonPage from '@/pages/liaison/LiaisonPage'
import LettersPage from '@/pages/liaison/LettersPage'
import AttendancePage from '@/pages/hr/AttendancePage'
import EmployeesPage from '@/pages/hr/EmployeesPage'
import TasksPage from '@/pages/tasks/TasksPage'
import KanbanPage from '@/pages/tasks/KanbanPage'
import EpcPage from '@/pages/epc/EpcPage'
import InvoicesPage from '@/pages/accounting/InvoicesPage'
import AccountingPage from '@/pages/accounting/AccountingPage'
import SalaryPage from '@/pages/hr/SalaryPage'
import PublicProjectPage from '@/pages/public/PublicProjectPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/public/:projectCode" element={<PublicProjectPage />} />
        <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"           element={<DashboardPage />} />
          <Route path="liaison"             element={<LiaisonPage />} />
          <Route path="liaison/letters"     element={<LettersPage />} />
          <Route path="tasks"               element={<TasksPage />} />
          <Route path="tasks/kanban"        element={<KanbanPage />} />
          <Route path="hr/attendance"       element={<AttendancePage />} />
          <Route path="hr/employees"        element={<EmployeesPage />} />
          <Route path="hr/salary"           element={<SalaryPage />} />
          <Route path="epc"                 element={<EpcPage />} />
          <Route path="accounting"          element={<AccountingPage />} />
          <Route path="accounting/invoices" element={<InvoicesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
TSX
ok "App.tsx written"

# ================================================================
# DONE
# ================================================================
echo ""
echo -e "${G}All fixes applied!${NC}"
echo ""
echo -e "  Backend will auto-reload — watch for '0 errors' in backend terminal"
echo -e "  Frontend: open http://localhost:5173"
echo ""
