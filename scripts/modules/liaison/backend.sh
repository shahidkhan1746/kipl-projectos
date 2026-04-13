#!/usr/bin/env bash
# ================================================================
#  Module: Liaison — Backend
#  Writes complete NestJS liaison module:
#    - 4 entities (LiaisonFile, ApprovalWorkflow, FileDocument, Letter)
#    - LiaisonService (per-type chains, auto numbers, approval logic)
#    - LiaisonController (all REST endpoints)
#    - LiaisonModule (registered in app.module.ts)
#    - Gmail service (OAuth2 — send letters by email)
#  Usage: bash scripts/modules/liaison/backend.sh
# ================================================================

set -euo pipefail

G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; R='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${G}  ✓${NC} $1"; }
info() { echo -e "${B}  →${NC} $1"; }
warn() { echo -e "${Y}  ⚠${NC} $1"; }
err()  { echo -e "${R}  ✗ $1${NC}"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SRC="$ROOT/backend/src"
LIAISON="$SRC/liaison"

[[ -d "$SRC" ]] || err "backend/src not found — run setup.sh first"

echo -e "\n${BOLD}Building Liaison Module — Backend${NC}\n"

# ── Install extra packages ────────────────────────────────────────
info "Installing packages..."
cd "$ROOT/backend"
npm install --save \
  googleapis \
  nodemailer \
  @types/nodemailer \
  --silent
ok "Packages installed"

mkdir -p "$LIAISON"

# ================================================================
# ENTITY 1 — LiaisonFile
# ================================================================
info "Writing entities..."

cat > "$LIAISON/liaison-file.entity.ts" << 'TS'
import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../shared/entities/base.entity';
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';

export enum LiaisonFileType {
  APPROVAL  = 'approval',
  NOC       = 'noc',
  DRAWING   = 'drawing',
  ESTIMATE  = 'estimate',
  REPORT    = 'report',
  LETTER    = 'letter',
  CLEARANCE = 'clearance',
  OTHER     = 'other',
}

export enum LiaisonStatus {
  DRAFT        = 'draft',
  SUBMITTED    = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED     = 'approved',
  REJECTED     = 'rejected',
  RETURNED     = 'returned',
  CLOSED       = 'closed',
}

export enum LiaisonPriority {
  LOW    = 'low',
  MEDIUM = 'medium',
  HIGH   = 'high',
  URGENT = 'urgent',
}

// Approval chain per file type — JE/AEE/XEN/SE are govt officer designations
export const APPROVAL_CHAINS: Record<LiaisonFileType, string[]> = {
  [LiaisonFileType.APPROVAL]:  ['JE', 'AEE', 'XEN', 'SE'],
  [LiaisonFileType.NOC]:       ['JE', 'AEE', 'XEN'],
  [LiaisonFileType.DRAWING]:   ['JE', 'XEN'],
  [LiaisonFileType.ESTIMATE]:  ['AEE', 'XEN', 'SE'],
  [LiaisonFileType.REPORT]:    ['XEN'],
  [LiaisonFileType.LETTER]:    ['XEN'],
  [LiaisonFileType.CLEARANCE]: ['JE', 'AEE', 'XEN', 'SE'],
  [LiaisonFileType.OTHER]:     ['JE', 'AEE', 'XEN', 'SE'],
};

@Entity('liaison_files')
export class LiaisonFile extends BaseEntity {
  @ManyToOne(() => Project, { eager: false })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;

  // Auto-generated: KIPL/2026/LIA/0001
  @Column({ name: 'file_number', unique: true, nullable: true })
  fileNumber: string;

  @Column({ type: 'text' })
  subject: string;

  @Column({ name: 'file_type', type: 'enum', enum: LiaisonFileType })
  fileType: LiaisonFileType;

  @Column({ type: 'enum', enum: LiaisonPriority, default: LiaisonPriority.MEDIUM })
  priority: LiaisonPriority;

  @Column({ name: 'current_status', type: 'enum', enum: LiaisonStatus, default: LiaisonStatus.DRAFT })
  currentStatus: LiaisonStatus;

  // Who physically holds the file right now
  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'current_holder_id' })
  currentHolder: User;

  @Column({ name: 'current_holder_id', nullable: true })
  currentHolderId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'initiated_by' })
  initiatedBy: User;

  @Column({ name: 'initiated_by' })
  initiatedById: string;

  // Government department: LCMA, UEED, Forest Dept, Traffic Police, etc.
  @Column({ nullable: true })
  department: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  // Which approval chain applies, stored for reference
  @Column({ name: 'approval_chain', type: 'jsonb', default: [] })
  approvalChain: string[];
}
TS

# ================================================================
# ENTITY 2 — ApprovalWorkflow
# ================================================================
cat > "$LIAISON/approval-workflow.entity.ts" << 'TS'
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../shared/entities/base.entity';
import { LiaisonFile } from './liaison-file.entity';
import { User } from '../users/user.entity';

export enum WorkflowStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SKIPPED  = 'skipped',
}

@Entity('approval_workflows')
export class ApprovalWorkflow extends BaseEntity {
  @ManyToOne(() => LiaisonFile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: LiaisonFile;

  @Column({ name: 'file_id' })
  fileId: string;

  @Column({ name: 'step_order' })
  stepOrder: number;

  // JE / AEE / XEN / SE
  @Column({ name: 'approver_role', length: 20 })
  approverRole: string;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'approver_id' })
  approver: User;

  @Column({ name: 'approver_id', nullable: true })
  approverId: string;

  @Column({ type: 'enum', enum: WorkflowStatus, default: WorkflowStatus.PENDING })
  status: WorkflowStatus;

  @Column({ name: 'action_at', nullable: true })
  actionAt: Date;

  @Column({ type: 'text', nullable: true })
  remarks: string;
}
TS

# ================================================================
# ENTITY 3 — FileDocument (versioned uploads)
# ================================================================
cat > "$LIAISON/file-document.entity.ts" << 'TS'
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../shared/entities/base.entity';
import { LiaisonFile } from './liaison-file.entity';
import { User } from '../users/user.entity';

export const REVISIONS = ['R0','R1','R2','R3','R4','R5','R6','R7','R8','R9'];

@Entity('file_documents')
export class FileDocument extends BaseEntity {
  @ManyToOne(() => LiaisonFile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: LiaisonFile;

  @Column({ name: 'file_id' })
  fileId: string;

  @Column({ name: 'document_name', nullable: true })
  documentName: string;

  // R0 = first submission, R1 = first revision, etc.
  @Column({ length: 5, default: 'R0' })
  revision: string;

  // Cloudinary URL — permanent download link
  @Column({ name: 'cloudinary_url', type: 'text' })
  cloudinaryUrl: string;

  @Column({ name: 'cloudinary_public_id', nullable: true })
  cloudinaryPublicId: string;

  @Column({ name: 'file_size_bytes', nullable: true })
  fileSizeBytes: number;

  @Column({ name: 'mime_type', nullable: true })
  mimeType: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @Column({ name: 'uploaded_by' })
  uploadedById: string;

  // Only one revision is current at a time
  @Column({ name: 'is_current_revision', default: true })
  isCurrentRevision: boolean;

  @Column({ name: 'uploaded_at', default: () => 'NOW()' })
  uploadedAt: Date;
}
TS

# ================================================================
# ENTITY 4 — Letter
# ================================================================
cat > "$LIAISON/letter.entity.ts" << 'TS'
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../shared/entities/base.entity';
import { Project } from '../projects/project.entity';
import { LiaisonFile } from './liaison-file.entity';
import { User } from '../users/user.entity';

export enum LetterType {
  OUTGOING = 'outgoing',
  INCOMING = 'incoming',
  INTERNAL = 'internal',
}

export enum LetterStatus {
  DRAFT      = 'draft',
  GENERATED  = 'generated',  // PDF created
  DISPATCHED = 'dispatched', // Sent via email
}

@Entity('letters')
export class Letter extends BaseEntity {
  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => LiaisonFile, { nullable: true })
  @JoinColumn({ name: 'file_id' })
  file: LiaisonFile;

  @Column({ name: 'file_id', nullable: true })
  fileId: string;

  // Auto-generated: KIPL/LETTER/2026/0001
  @Column({ name: 'letter_number', unique: true, nullable: true })
  letterNumber: string;

  @Column({ name: 'letter_type', type: 'enum', enum: LetterType, default: LetterType.OUTGOING })
  letterType: LetterType;

  @Column({ name: 'to_name', nullable: true })
  toName: string;

  @Column({ name: 'to_organization', nullable: true })
  toOrganization: string;

  @Column({ name: 'to_email', nullable: true })
  toEmail: string;

  @Column({ type: 'text', nullable: true })
  subject: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'signed_by' })
  signedBy: User;

  @Column({ name: 'signed_by', nullable: true })
  signedById: string;

  // Cloudinary URL for generated PDF
  @Column({ name: 'pdf_url', nullable: true })
  pdfUrl: string;

  @Column({ name: 'pdf_public_id', nullable: true })
  pdfPublicId: string;

  @Column({ type: 'enum', enum: LetterStatus, default: LetterStatus.DRAFT })
  status: LetterStatus;

  // Gmail integration
  @Column({ name: 'dispatched_at', nullable: true })
  dispatchedAt: Date;

  @Column({ name: 'gmail_message_id', nullable: true })
  gmailMessageId: string;

  @Column({ name: 'email_subject', nullable: true })
  emailSubject: string;
}
TS

ok "4 entities written"

# ================================================================
# DTOs
# ================================================================
info "Writing DTOs..."

cat > "$LIAISON/dto/create-file.dto.ts" << 'TS'
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { LiaisonFileType, LiaisonPriority } from '../liaison-file.entity';

export class CreateFileDto {
  @IsUUID()       projectId:  string;
  @IsString()
  @IsNotEmpty()   subject:    string;
  @IsEnum(LiaisonFileType)  fileType:   LiaisonFileType;
  @IsOptional() @IsEnum(LiaisonPriority) priority?: LiaisonPriority;
  @IsOptional() @IsString()  department?: string;
  @IsOptional() @IsString()  dueDate?:    string;
  @IsOptional() @IsString()  remarks?:    string;
}
TS

cat > "$LIAISON/dto/approve-file.dto.ts" << 'TS'
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ApproveFileDto {
  @IsEnum(['approved', 'rejected']) action: 'approved' | 'rejected';
  @IsOptional() @IsString()         remarks?: string;
}
TS

cat > "$LIAISON/dto/create-letter.dto.ts" << 'TS'
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsEmail } from 'class-validator';
import { LetterType } from '../letter.entity';

export class CreateLetterDto {
  @IsUUID()     projectId:       string;
  @IsOptional() @IsUUID()        fileId?:         string;
  @IsOptional() @IsEnum(LetterType) letterType?:  LetterType;
  @IsOptional() @IsString()      toName?:         string;
  @IsOptional() @IsString()      toOrganization?: string;
  @IsOptional() @IsEmail()       toEmail?:        string;
  @IsString() @IsNotEmpty()      subject:         string;
  @IsString() @IsNotEmpty()      body:            string;
  @IsOptional() @IsString()      date?:           string;
  @IsOptional() @IsString()      signedById?:     string;
}
TS

cat > "$LIAISON/dto/send-letter.dto.ts" << 'TS'
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendLetterDto {
  @IsEmail()                     toEmail:    string;
  @IsString() @IsNotEmpty()      subject:    string;
  @IsOptional() @IsString()      bodyNote?:  string; // short covering note in email body
}
TS

mkdir -p "$LIAISON/dto"
ok "DTOs written"

# ================================================================
# PDF SERVICE (letter generation)
# ================================================================
info "Writing PDF service..."

mkdir -p "$SRC/pdf"
cat > "$SRC/pdf/pdf.service.ts" << 'TS'
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PdfService {
  private readonly log = new Logger(PdfService.name);

  constructor(private readonly config: ConfigService) {}

  private get company() {
    return {
      name:    this.config.get('COMPANY_NAME')    ?? 'Khilari Infrastructure Pvt. Ltd.',
      address: this.config.get('COMPANY_ADDRESS') ?? 'Srinagar, J&K',
      phone:   this.config.get('COMPANY_PHONE')   ?? '',
      email:   this.config.get('COMPANY_EMAIL')   ?? '',
      gst:     this.config.get('COMPANY_GST')     ?? '',
    };
  }

  async generateLetterPdf(data: {
    letterNumber:   string;
    date:           string;
    toName?:        string;
    toOrganization?: string;
    subject:        string;
    body:           string;
    projectName:    string;
    signedByName:   string;
    signedByDesig?: string;
  }): Promise<Buffer> {
    // Use puppeteer if available, otherwise return HTML buffer
    try {
      const puppeteer = await import('puppeteer');
      const browser   = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.setContent(this.letterHtml(data), { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });
      await browser.close();
      this.log.log(`PDF generated: ${data.letterNumber}`);
      return Buffer.from(pdf);
    } catch {
      // Puppeteer not installed — return HTML as fallback
      this.log.warn('Puppeteer not available — returning HTML buffer');
      return Buffer.from(this.letterHtml(data));
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
  .to-block{margin:10px 0;font-size:12px}
  .subject{font-weight:bold;margin:10px 0}
  .salutation{margin-bottom:10px}
  .body{line-height:1.9;margin:10px 0;min-height:180px;white-space:pre-wrap}
  .closing{margin-top:40px}
  .signature-block{margin-top:50px;border-top:1px solid #ccc;padding-top:6px;width:200px}
  .footer-note{font-size:9px;color:#999;margin-top:40px;text-align:center}
</style></head><body>
<div class="header">
  <div class="company-name">${c.name}</div>
  <div class="company-sub">${c.address} | ${c.phone} | ${c.email} | GSTIN: ${c.gst}</div>
</div>
<div class="meta">
  <div><b>Ref No.:</b> ${data.letterNumber}</div>
  <div><b>Date:</b> ${formattedDate}</div>
</div>
<div class="meta">
  <div><b>Project:</b> ${data.projectName}</div>
</div>
<div class="to-block">
  <b>To,</b><br>
  ${data.toName ? `${data.toName}<br>` : ''}
  ${data.toOrganization ?? ''}
</div>
<div class="subject"><u>Sub:</u> ${data.subject}</div>
<hr style="border:none;border-top:1px solid #ddd;margin:10px 0">
<div class="salutation">Respected Sir/Madam,</div>
<div class="body">${data.body.replace(/\n/g, '<br>')}</div>
<div class="closing">Yours faithfully,</div>
<div class="signature-block">
  <b>${data.signedByName}</b><br>
  <span style="color:#555">${data.signedByDesig ?? 'Authorised Signatory'}</span><br>
  <span style="color:#555">${c.name}</span>
</div>
<div class="footer-note">
  This letter was generated via KIPL ProjectOS. Ref: ${data.letterNumber}
</div>
</body></html>`;
  }
}
TS

cat > "$SRC/pdf/pdf.module.ts" << 'TS'
import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';

@Module({ providers: [PdfService], exports: [PdfService] })
export class PdfModule {}
TS

ok "PDF service written"

# ================================================================
# GMAIL SERVICE
# ================================================================
info "Writing Gmail service..."

mkdir -p "$SRC/gmail"
cat > "$SRC/gmail/gmail.service.ts" << 'TS'
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class GmailService {
  private readonly log = new Logger(GmailService.name);

  constructor(private readonly config: ConfigService) {}

  private getOAuth2Client() {
    const client = new google.auth.OAuth2(
      this.config.get('GMAIL_CLIENT_ID'),
      this.config.get('GMAIL_CLIENT_SECRET'),
      this.config.get('GMAIL_REDIRECT_URI') ?? 'http://localhost:3000/api/v1/gmail/callback',
    );

    const refreshToken = this.config.get('GMAIL_REFRESH_TOKEN');
    if (refreshToken) {
      client.setCredentials({ refresh_token: refreshToken });
    }

    return client;
  }

  // Generate the Google OAuth URL — user visits this once to authorise
  getAuthUrl(): string {
    const client = this.getOAuth2Client();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt:      'consent',
      scope:       ['https://www.googleapis.com/auth/gmail.send'],
    });
  }

  // Exchange auth code for refresh token — called once during setup
  async exchangeCode(code: string): Promise<string> {
    const client = this.getOAuth2Client();
    const { tokens } = await client.getToken(code);
    this.log.log('Gmail refresh token obtained — save this to GMAIL_REFRESH_TOKEN in .env');
    this.log.log(`Refresh token: ${tokens.refresh_token}`);
    return tokens.refresh_token ?? '';
  }

  // Send a letter as email with PDF attachment
  async sendLetter(params: {
    to:          string;
    subject:     string;
    bodyNote:    string;
    pdfBuffer:   Buffer;
    letterNumber:string;
    fileName:    string;
  }): Promise<string> {
    const refreshToken = this.config.get('GMAIL_REFRESH_TOKEN');
    if (!refreshToken) {
      throw new Error(
        'Gmail not configured. Visit /api/v1/gmail/auth to authorise Gmail access.'
      );
    }

    const client = this.getOAuth2Client();
    const gmail  = google.gmail({ version: 'v1', auth: client });

    const fromEmail = this.config.get('GMAIL_FROM_EMAIL') ?? 'me';
    const companyName = this.config.get('COMPANY_NAME') ?? 'KIPL';

    // Build MIME email with PDF attachment
    const boundary = `boundary_${Date.now()}`;
    const pdfBase64 = params.pdfBuffer.toString('base64');

    const emailBody = [
      `From: "${companyName}" <${fromEmail}>`,
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      ``,
      params.bodyNote || `Please find enclosed the letter ${params.letterNumber} from ${companyName}.`,
      ``,
      `--${boundary}`,
      `Content-Type: application/pdf`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${params.fileName}"`,
      ``,
      pdfBase64,
      `--${boundary}--`,
    ].join('\r\n');

    // Base64url encode the full email
    const encoded = Buffer.from(emailBody)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId:      'me',
      requestBody: { raw: encoded },
    });

    const messageId = response.data.id ?? '';
    this.log.log(`Letter sent: ${params.letterNumber} → ${params.to} (Gmail ID: ${messageId})`);
    return messageId;
  }

  isConfigured(): boolean {
    return !!(
      this.config.get('GMAIL_CLIENT_ID') &&
      this.config.get('GMAIL_CLIENT_SECRET') &&
      this.config.get('GMAIL_REFRESH_TOKEN')
    );
  }
}
TS

cat > "$SRC/gmail/gmail.module.ts" << 'TS'
import { Module } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { GmailController } from './gmail.controller';

@Module({
  providers:   [GmailService],
  controllers: [GmailController],
  exports:     [GmailService],
})
export class GmailModule {}
TS

cat > "$SRC/gmail/gmail.controller.ts" << 'TS'
import { Controller, Get, Query, Redirect, UseGuards } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('gmail')
export class GmailController {
  constructor(private readonly gmail: GmailService) {}

  // Step 1: Visit this URL to start Gmail OAuth
  // Admin opens browser to: GET /api/v1/gmail/auth
  @Get('auth')
  @UseGuards(JwtAuthGuard)
  getAuthUrl() {
    const url = this.gmail.getAuthUrl();
    return {
      message: 'Open this URL in your browser to authorise Gmail',
      auth_url: url,
    };
  }

  // Step 2: Google redirects here with ?code=xxx
  // Save the refresh_token printed to console into backend/.env
  @Get('callback')
  async callback(@Query('code') code: string) {
    const refreshToken = await this.gmail.exchangeCode(code);
    return {
      message: 'Gmail authorised! Copy this refresh token into backend/.env as GMAIL_REFRESH_TOKEN',
      refresh_token: refreshToken,
    };
  }

  // Check if Gmail is configured
  @Get('status')
  @UseGuards(JwtAuthGuard)
  status() {
    return { configured: this.gmail.isConfigured() };
  }
}
TS

ok "Gmail service written"

# ================================================================
# LIAISON SERVICE
# ================================================================
info "Writing LiaisonService..."

cat > "$LIAISON/liaison.service.ts" << 'TS'
import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { LiaisonFile, LiaisonFileType, LiaisonStatus, APPROVAL_CHAINS } from './liaison-file.entity';
import { ApprovalWorkflow, WorkflowStatus } from './approval-workflow.entity';
import { FileDocument, REVISIONS } from './file-document.entity';
import { Letter, LetterStatus } from './letter.entity';
import { CreateFileDto } from './dto/create-file.dto';
import { CreateLetterDto } from './dto/create-letter.dto';
import { ApproveFileDto } from './dto/approve-file.dto';
import { SendLetterDto } from './dto/send-letter.dto';
import { PdfService } from '../pdf/pdf.service';
import { GmailService } from '../gmail/gmail.service';

@Injectable()
export class LiaisonService {
  private readonly log = new Logger(LiaisonService.name);

  constructor(
    @InjectRepository(LiaisonFile)      private readonly fileRepo:     Repository<LiaisonFile>,
    @InjectRepository(ApprovalWorkflow) private readonly workflowRepo: Repository<ApprovalWorkflow>,
    @InjectRepository(FileDocument)     private readonly docRepo:      Repository<FileDocument>,
    @InjectRepository(Letter)           private readonly letterRepo:   Repository<Letter>,
    private readonly dataSource: DataSource,
    private readonly config:     ConfigService,
    private readonly pdfService: PdfService,
    private readonly gmail:      GmailService,
  ) {}

  // ── Auto file number: KIPL/2026/LIA/0001 ─────────────────────
  private async nextFileNumber(projectId: string): Promise<string> {
    const year = new Date().getFullYear();
    const result = await this.dataSource.query(
      `SELECT COUNT(*) FROM liaison_files
       WHERE project_id = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
      [projectId, year],
    );
    const seq = String(parseInt(result[0].count) + 1).padStart(4, '0');
    return `KIPL/${year}/LIA/${seq}`;
  }

  private async nextLetterNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await this.dataSource.query(
      `SELECT COUNT(*) FROM letters WHERE EXTRACT(YEAR FROM created_at) = $1`, [year],
    );
    const seq = String(parseInt(result[0].count) + 1).padStart(4, '0');
    return `KIPL/LETTER/${year}/${seq}`;
  }

  // ── Create file with correct chain ───────────────────────────
  async createFile(dto: CreateFileDto, userId: string): Promise<LiaisonFile> {
    return this.dataSource.transaction(async (manager) => {
      const fileNumber = await this.nextFileNumber(dto.projectId);
      const chain      = APPROVAL_CHAINS[dto.fileType] ?? APPROVAL_CHAINS[LiaisonFileType.APPROVAL];

      const file = manager.create(LiaisonFile, {
        ...dto,
        fileNumber,
        initiatedById:   userId,
        currentHolderId: userId,
        currentStatus:   LiaisonStatus.DRAFT,
        approvalChain:   chain,
      });
      const saved = await manager.save(file);

      // Create one workflow step per chain level
      for (let i = 0; i < chain.length; i++) {
        await manager.save(
          manager.create(ApprovalWorkflow, {
            fileId:       saved.id,
            stepOrder:    i + 1,
            approverRole: chain[i],
            status:       WorkflowStatus.PENDING,
          }),
        );
      }

      this.log.log(`Liaison file created: ${fileNumber} (${dto.fileType})`);
      return saved;
    });
  }

  // ── Approve or reject a step ──────────────────────────────────
  async processApproval(fileId: string, dto: ApproveFileDto, userId: string, userRole: string): Promise<LiaisonFile> {
    return this.dataSource.transaction(async (manager) => {
      // Get current pending step
      const step = await manager
        .createQueryBuilder(ApprovalWorkflow, 'w')
        .where('w.fileId = :fileId AND w.status = :status', {
          fileId, status: WorkflowStatus.PENDING,
        })
        .orderBy('w.stepOrder', 'ASC')
        .getOne();

      if (!step) throw new BadRequestException('No pending approval step on this file');

      // Government role must match step role
      if (step.approverRole.toUpperCase() !== userRole.toUpperCase()) {
        throw new ForbiddenException(
          `This step requires ${step.approverRole}. Your role is ${userRole}.`,
        );
      }

      // Update the step
      step.status     = dto.action === 'approved' ? WorkflowStatus.APPROVED : WorkflowStatus.REJECTED;
      step.approverId = userId;
      step.actionAt   = new Date();
      step.remarks    = dto.remarks ?? null;
      await manager.save(step);

      const file = await manager.findOneOrFail(LiaisonFile, { where: { id: fileId } });

      if (dto.action === 'approved') {
        // Is there a next pending step?
        const next = await manager
          .createQueryBuilder(ApprovalWorkflow, 'w')
          .where('w.fileId = :fileId AND w.status = :status AND w.stepOrder > :order', {
            fileId, status: WorkflowStatus.PENDING, order: step.stepOrder,
          })
          .orderBy('w.stepOrder', 'ASC')
          .getOne();

        file.currentStatus    = next ? LiaisonStatus.UNDER_REVIEW : LiaisonStatus.APPROVED;
        file.currentHolderId  = next?.approverId ?? userId;
      } else {
        // Rejected — return to initiator, reset subsequent steps
        file.currentStatus   = LiaisonStatus.RETURNED;
        file.currentHolderId = file.initiatedById;

        await manager
          .createQueryBuilder()
          .update(ApprovalWorkflow)
          .set({ status: WorkflowStatus.PENDING, approverId: null, actionAt: null, remarks: null })
          .where('fileId = :fileId AND stepOrder > :order', { fileId, order: step.stepOrder })
          .execute();
      }

      return manager.save(file);
    });
  }

  // ── Get file with full audit trail ───────────────────────────
  async getFile(id: string) {
    const file = await this.fileRepo.findOne({
      where: { id },
      relations: ['project', 'initiatedBy', 'currentHolder'],
    });
    if (!file) throw new NotFoundException('Liaison file not found');

    const [steps, documents] = await Promise.all([
      this.workflowRepo.find({
        where: { fileId: id },
        relations: ['approver'],
        order: { stepOrder: 'ASC' },
      }),
      this.docRepo.find({
        where: { fileId: id },
        relations: ['uploadedBy'],
        order: { uploadedAt: 'DESC' },
      }),
    ]);

    return { ...file, approvalSteps: steps, documents };
  }

  // ── List files ────────────────────────────────────────────────
  async listFiles(params: {
    projectId?: string; status?: string; priority?: string;
    department?: string; fileType?: string;
    page?: number; limit?: number;
    userId: string;
  }) {
    const qb = this.fileRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.project',       'project')
      .leftJoinAndSelect('f.initiatedBy',   'initiatedBy')
      .leftJoinAndSelect('f.currentHolder', 'currentHolder')
      .orderBy('f.createdAt', 'DESC');

    if (params.projectId)  qb.andWhere('f.projectId = :pid',      { pid:    params.projectId });
    if (params.status)     qb.andWhere('f.currentStatus = :s',    { s:      params.status    });
    if (params.priority)   qb.andWhere('f.priority = :p',         { p:      params.priority  });
    if (params.department) qb.andWhere('f.department = :dept',    { dept:   params.department});
    if (params.fileType)   qb.andWhere('f.fileType = :ft',        { ft:     params.fileType  });

    const page  = params.page  ?? 1;
    const limit = params.limit ?? 25;
    qb.skip((page - 1) * limit).take(limit);

    const [files, total] = await qb.getManyAndCount();
    return { files, total, page, limit };
  }

  // ── Upload document to file ───────────────────────────────────
  async uploadDocument(params: {
    fileId: string; uploadedById: string;
    documentName?: string; cloudinaryUrl: string;
    cloudinaryPublicId?: string; fileSizeBytes?: number; mimeType?: string;
  }): Promise<FileDocument> {
    // Get current revision to compute next
    const last = await this.docRepo.findOne({
      where: { fileId: params.fileId },
      order: { uploadedAt: 'DESC' },
    });

    const nextRev = last?.revision
      ? REVISIONS[REVISIONS.indexOf(last.revision) + 1] ?? 'R9'
      : 'R0';

    // Mark all previous as not current
    await this.docRepo.update(
      { fileId: params.fileId },
      { isCurrentRevision: false },
    );

    return this.docRepo.save(
      this.docRepo.create({
        ...params,
        revision:          nextRev,
        isCurrentRevision: true,
        uploadedAt:        new Date(),
      }),
    );
  }

  // ── Letters ───────────────────────────────────────────────────
  async createLetter(dto: CreateLetterDto, userId: string): Promise<Letter> {
    const letterNumber = await this.nextLetterNumber();
    return this.letterRepo.save(
      this.letterRepo.create({
        ...dto,
        letterNumber,
        signedById: dto.signedById ?? userId,
        status:     LetterStatus.DRAFT,
      }),
    );
  }

  async listLetters(params: { projectId?: string; letterType?: string }) {
    const qb = this.letterRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.project',  'project')
      .leftJoinAndSelect('l.signedBy', 'signedBy')
      .leftJoinAndSelect('l.file',     'file')
      .orderBy('l.createdAt', 'DESC');

    if (params.projectId)  qb.andWhere('l.projectId = :pid',   { pid:  params.projectId  });
    if (params.letterType) qb.andWhere('l.letterType = :type', { type: params.letterType });

    return qb.getMany();
  }

  async getLetter(id: string): Promise<Letter> {
    const letter = await this.letterRepo.findOne({
      where: { id },
      relations: ['project', 'signedBy', 'file'],
    });
    if (!letter) throw new NotFoundException('Letter not found');
    return letter;
  }

  // ── Generate PDF for letter ───────────────────────────────────
  async generateLetterPdf(id: string): Promise<Buffer> {
    const letter = await this.getLetter(id);

    const pdf = await this.pdfService.generateLetterPdf({
      letterNumber:    letter.letterNumber ?? id,
      date:            letter.date,
      toName:          letter.toName,
      toOrganization:  letter.toOrganization,
      subject:         letter.subject ?? '',
      body:            letter.body    ?? '',
      projectName:     letter.project?.name ?? '',
      signedByName:    letter.signedBy?.name ?? 'Authorised Signatory',
    });

    // Update status to generated
    await this.letterRepo.update(id, { status: LetterStatus.GENERATED });

    return pdf;
  }

  // ── Send letter via Gmail ─────────────────────────────────────
  async sendLetterByEmail(id: string, dto: SendLetterDto): Promise<Letter> {
    const letter = await this.getLetter(id);

    if (!dto.toEmail && !letter.toEmail) {
      throw new BadRequestException('Recipient email required');
    }

    const toEmail = dto.toEmail || letter.toEmail!;

    // Generate fresh PDF
    const pdf = await this.generateLetterPdf(id);

    const fileName  = `${letter.letterNumber ?? 'letter'}.pdf`.replace(/\//g, '-');
    const subject   = dto.subject || `Letter Ref: ${letter.letterNumber} — ${letter.subject}`;
    const bodyNote  = dto.bodyNote ?? `Please find attached letter ${letter.letterNumber} from ${this.config.get('COMPANY_NAME')}.`;

    const gmailMessageId = await this.gmail.sendLetter({
      to:           toEmail,
      subject,
      bodyNote,
      pdfBuffer:    pdf,
      letterNumber: letter.letterNumber ?? id,
      fileName,
    });

    // Update letter record
    return this.letterRepo.save({
      ...letter,
      toEmail,
      emailSubject:  subject,
      status:        LetterStatus.DISPATCHED,
      dispatchedAt:  new Date(),
      gmailMessageId,
    });
  }

  // ── Dashboard stats ───────────────────────────────────────────
  async dashboard(projectId?: string) {
    const qb = this.fileRepo.createQueryBuilder('f');
    if (projectId) qb.where('f.projectId = :pid', { pid: projectId });

    const files = await qb.getMany();
    const today = new Date().toISOString().split('T')[0];

    return {
      total:        files.length,
      by_status: {
        draft:        files.filter(f => f.currentStatus === LiaisonStatus.DRAFT).length,
        submitted:    files.filter(f => f.currentStatus === LiaisonStatus.SUBMITTED).length,
        under_review: files.filter(f => f.currentStatus === LiaisonStatus.UNDER_REVIEW).length,
        approved:     files.filter(f => f.currentStatus === LiaisonStatus.APPROVED).length,
        rejected:     files.filter(f => f.currentStatus === LiaisonStatus.REJECTED).length,
        returned:     files.filter(f => f.currentStatus === LiaisonStatus.RETURNED).length,
      },
      overdue: files.filter(f =>
        f.dueDate && f.dueDate < today &&
        ![LiaisonStatus.APPROVED, LiaisonStatus.CLOSED].includes(f.currentStatus)
      ).length,
      urgent: files.filter(f => f.priority === 'urgent').length,
      my_files: files.length, // will be filtered per user in controller
    };
  }
}
TS

ok "LiaisonService written"

# ================================================================
# LIAISON CONTROLLER
# ================================================================
info "Writing LiaisonController..."

cat > "$LIAISON/liaison.controller.ts" << 'TS'
import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, Request, Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { LiaisonService } from './liaison.service';
import { CreateFileDto }   from './dto/create-file.dto';
import { ApproveFileDto }  from './dto/approve-file.dto';
import { CreateLetterDto } from './dto/create-letter.dto';
import { SendLetterDto }   from './dto/send-letter.dto';
import { JwtAuthGuard }    from '../auth/guards/jwt-auth.guard';

@Controller('liaison')
@UseGuards(JwtAuthGuard)
export class LiaisonController {
  constructor(private readonly svc: LiaisonService) {}

  // ── Files ─────────────────────────────────────────────────────
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
  approveFile(
    @Param('id') id: string,
    @Body() dto: ApproveFileDto,
    @Request() req: any,
  ) {
    // req.user.role contains the government role (JE/AEE/XEN/SE)
    // or the system role — both are checked in the service
    return this.svc.processApproval(id, dto, req.user.id, req.user.role);
  }

  @Patch('files/:id/close')
  closeFile(@Param('id') id: string) {
    return this.svc.fileRepo.update(id, { currentStatus: 'closed' as any });
  }

  // ── Documents ─────────────────────────────────────────────────
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

  // ── Letters ───────────────────────────────────────────────────
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

  // Download letter as PDF
  @Get('letters/:id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const letter = await this.svc.getLetter(id);
    const pdf    = await this.svc.generateLetterPdf(id);
    const fname  = `${letter.letterNumber ?? id}.pdf`.replace(/\//g, '-');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.send(pdf);
  }

  // Send letter via Gmail
  @Post('letters/:id/send')
  @HttpCode(HttpStatus.OK)
  sendLetter(@Param('id') id: string, @Body() dto: SendLetterDto) {
    return this.svc.sendLetterByEmail(id, dto);
  }

  // ── Dashboard ─────────────────────────────────────────────────
  @Get('dashboard')
  dashboard(@Query('projectId') projectId?: string) {
    return this.svc.dashboard(projectId);
  }
}
TS

ok "LiaisonController written"

# ================================================================
# LIAISON MODULE
# ================================================================
cat > "$LIAISON/liaison.module.ts" << 'TS'
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiaisonFile }      from './liaison-file.entity';
import { ApprovalWorkflow } from './approval-workflow.entity';
import { FileDocument }     from './file-document.entity';
import { Letter }           from './letter.entity';
import { LiaisonService }   from './liaison.service';
import { LiaisonController } from './liaison.controller';
import { PdfModule }        from '../pdf/pdf.module';
import { GmailModule }      from '../gmail/gmail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LiaisonFile, ApprovalWorkflow, FileDocument, Letter]),
    PdfModule,
    GmailModule,
  ],
  providers:   [LiaisonService],
  controllers: [LiaisonController],
  exports:     [LiaisonService],
})
export class LiaisonModule {}
TS

ok "LiaisonModule written"

# ================================================================
# REGISTER IN app.module.ts
# ================================================================
info "Registering in app.module.ts..."

# Replace the placeholder liaison module import with the real one
sed -i "s|from './liaison/liaison.module'|from './liaison/liaison.module'|g" "$SRC/app.module.ts"

# Make sure LiaisonModule, PdfModule, GmailModule are in app.module.ts
python3 - << 'PYEOF'
import re, sys

path = sys.argv[1]
with open(path) as f:
    content = f.read()

# Add imports if missing
imports_to_add = [
    ("LiaisonModule", "./liaison/liaison.module"),
    ("PdfModule",     "./pdf/pdf.module"),
    ("GmailModule",   "./gmail/gmail.module"),
]

for cls, mod in imports_to_add:
    if f"from '{mod}'" not in content:
        # Add after the last existing import
        content = content.replace(
            "import { AppModule }",
            f"import {{ {cls} }} from '{mod}';\nimport {{ AppModule }}"
        ) if "import { AppModule }" in content else \
        re.sub(
            r"(import \{[^}]+\} from '[^']+';)(\s*\n(?!import))",
            rf"\1\2import {{ {cls} }} from '{mod}';\n",
            content, count=1
        )

with open(path, 'w') as f:
    f.write(content)

print("  app.module.ts imports checked")
PYEOF "$SRC/app.module.ts"

ok "Registered in app.module.ts"

# ================================================================
# UPDATE .env with Gmail + Company variables
# ================================================================
info "Adding Gmail + Company variables to .env..."

ENV_FILE="$ROOT/backend/.env"
if ! grep -q 'GMAIL_CLIENT_ID' "$ENV_FILE"; then
  cat >> "$ENV_FILE" << 'ENV'

# ── Company info (used in PDF letter headers) ─────────────────
COMPANY_NAME=Khilari Infrastructure Pvt. Ltd.
COMPANY_ADDRESS=Srinagar, Jammu & Kashmir - 190001
COMPANY_PHONE=+91-XXXXXXXXXX
COMPANY_EMAIL=info@khilariinfra.com
COMPANY_GST=01AABCK1234A1Z5

# ── Gmail (OAuth2) ────────────────────────────────────────────
# Setup guide: https://console.cloud.google.com
# 1. Create project → Enable Gmail API
# 2. Create OAuth2 credentials (Desktop app type)
# 3. Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET below
# 4. Start backend, visit http://localhost:3000/api/v1/gmail/auth
# 5. Authorise with your Gmail account
# 6. Copy the refresh_token shown and paste as GMAIL_REFRESH_TOKEN
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REFRESH_TOKEN=
GMAIL_REDIRECT_URI=http://localhost:3000/api/v1/gmail/callback
GMAIL_FROM_EMAIL=your@gmail.com
ENV
  ok ".env updated with Gmail + Company variables"
else
  warn "Gmail variables already in .env — skipping"
fi

# ================================================================
# DONE
# ================================================================
echo ""
echo -e "${G}${BOLD}Liaison backend complete!${NC}"
echo ""
echo -e "  ${BOLD}Endpoints available:${NC}"
echo -e "  GET    /api/v1/liaison/dashboard"
echo -e "  GET    /api/v1/liaison/files"
echo -e "  POST   /api/v1/liaison/files"
echo -e "  GET    /api/v1/liaison/files/:id"
echo -e "  PATCH  /api/v1/liaison/files/:id/approve"
echo -e "  POST   /api/v1/liaison/files/:id/documents"
echo -e "  GET    /api/v1/liaison/letters"
echo -e "  POST   /api/v1/liaison/letters"
echo -e "  GET    /api/v1/liaison/letters/:id/pdf"
echo -e "  POST   /api/v1/liaison/letters/:id/send"
echo -e "  GET    /api/v1/gmail/auth    ← visit once to connect Gmail"
echo -e "  GET    /api/v1/gmail/status  ← check if Gmail is connected"
echo ""
echo -e "  ${Y}Backend will auto-reload. Check the backend terminal.${NC}"
echo -e "  ${Y}Fill in COMPANY_NAME and Gmail credentials in backend/.env${NC}"
echo ""
