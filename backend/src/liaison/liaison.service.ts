import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException, Logger,
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
import { GmailService } from '../gmail/gmail.service';

@Injectable()
export class LiaisonService {
  private readonly log = new Logger(LiaisonService.name);

  constructor(
    @InjectRepository(LiaisonFile)      readonly fileRepo:     Repository<LiaisonFile>,
    @InjectRepository(ApprovalWorkflow) private readonly workflowRepo: Repository<ApprovalWorkflow>,
    @InjectRepository(FileDocument)     private readonly docRepo:      Repository<FileDocument>,
    @InjectRepository(Letter)           private readonly letterRepo:   Repository<Letter>,
    private readonly dataSource: DataSource,
    private readonly config:     ConfigService,
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
  async createFile(dto: CreateFileDto & { fileNumber?: string }, userId: string): Promise<LiaisonFile> {
    return this.dataSource.transaction(async (manager) => {
      // Use the ref number the user typed; otherwise auto-seed one.
      let fileNumber = dto.fileNumber?.trim();
      if (fileNumber) {
        const clash = await manager.findOne(LiaisonFile, { where: { fileNumber } });
        if (clash) throw new ConflictException(`Reference number "${fileNumber}" is already used`);
      } else {
        fileNumber = await this.nextFileNumber(dto.projectId);
      }
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
      step.remarks = dto.remarks as string;
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
  async updateFile(id: string, body: any) {
    const file = await this.fileRepo.findOne({ where: { id } });
    if (!file) throw new NotFoundException('Liaison file not found');

    // Reference number is editable but must stay unique. Ignore blanks.
    if (body.fileNumber !== undefined) {
      const ref = String(body.fileNumber).trim();
      if (ref && ref !== file.fileNumber) {
        const clash = await this.fileRepo.findOne({ where: { fileNumber: ref } });
        if (clash && clash.id !== id) throw new ConflictException(`Reference number "${ref}" is already used`);
        file.fileNumber = ref;
      }
    }

    const editable = [
      'subject', 'department', 'priority', 'fileType', 'dueDate', 'currentStatus',
      'remarks', 'currentHolderId', 'departmentRef',
      'expectedDate', 'actualDate', 'isEotGround', 'eotReason', 'linkedWbsCode',
    ];
    // Booleans and dates may legitimately be set to false / cleared — only reject undefined.
    for (const k of editable) if (body[k] !== undefined) (file as any)[k] = body[k];

    // When a file reaches a terminal state, stamp the actual date so the delay
    // is captured even if the officer didn't type it.
    const terminal = [LiaisonStatus.APPROVED, LiaisonStatus.CLOSED];
    if (terminal.includes(file.currentStatus) && !file.actualDate) {
      file.actualDate = new Date().toISOString().split('T')[0];
    }

    // Auto-compute delay: (actual ?? today) − expected, floored at 0.
    if (file.expectedDate) {
      const base = new Date(file.actualDate ?? new Date().toISOString().split('T')[0]);
      const exp  = new Date(file.expectedDate);
      file.delayDays = Math.max(0, Math.round((base.getTime() - exp.getTime()) / 86400000));
    } else {
      file.delayDays = 0;
    }

    await this.fileRepo.save(file);
    return this.getFile(id);
  }

  // ── EOT-relevant files (delayed approvals) ────────────────────
  // Used by the schedule engine and the EOT register.
  async listEotFiles(projectId?: string): Promise<LiaisonFile[]> {
    const qb = this.fileRepo.createQueryBuilder('f').orderBy('f.delayDays', 'DESC');
    if (projectId) qb.where('f.projectId = :pid', { pid: projectId });
    return qb.getMany();
  }

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
  async generateLetterPdf(id: string): Promise<any> {
    const letter = await this.getLetter(id);

    // PDF generation handled by frontend

    // Update status to generated
    await this.letterRepo.update(id, { status: LetterStatus.GENERATED });
    return null;
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
