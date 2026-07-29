"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LiaisonService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiaisonService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const liaison_file_entity_1 = require("./liaison-file.entity");
const approval_workflow_entity_1 = require("./approval-workflow.entity");
const file_document_entity_1 = require("./file-document.entity");
const letter_entity_1 = require("./letter.entity");
const gmail_service_1 = require("../gmail/gmail.service");
let LiaisonService = LiaisonService_1 = class LiaisonService {
    fileRepo;
    workflowRepo;
    docRepo;
    letterRepo;
    dataSource;
    config;
    gmail;
    log = new common_1.Logger(LiaisonService_1.name);
    constructor(fileRepo, workflowRepo, docRepo, letterRepo, dataSource, config, gmail) {
        this.fileRepo = fileRepo;
        this.workflowRepo = workflowRepo;
        this.docRepo = docRepo;
        this.letterRepo = letterRepo;
        this.dataSource = dataSource;
        this.config = config;
        this.gmail = gmail;
    }
    async nextFileNumber(projectId) {
        const year = new Date().getFullYear();
        const result = await this.dataSource.query(`SELECT COUNT(*) FROM liaison_files
       WHERE project_id = $1 AND EXTRACT(YEAR FROM created_at) = $2`, [projectId, year]);
        const seq = String(parseInt(result[0].count) + 1).padStart(4, '0');
        return `KIPL/${year}/LIA/${seq}`;
    }
    async nextLetterNumber() {
        const year = new Date().getFullYear();
        const result = await this.dataSource.query(`SELECT COUNT(*) FROM letters WHERE EXTRACT(YEAR FROM created_at) = $1`, [year]);
        const seq = String(parseInt(result[0].count) + 1).padStart(4, '0');
        return `KIPL/LETTER/${year}/${seq}`;
    }
    async createFile(dto, userId) {
        return this.dataSource.transaction(async (manager) => {
            const fileNumber = await this.nextFileNumber(dto.projectId);
            const chain = liaison_file_entity_1.APPROVAL_CHAINS[dto.fileType] ?? liaison_file_entity_1.APPROVAL_CHAINS[liaison_file_entity_1.LiaisonFileType.APPROVAL];
            const file = manager.create(liaison_file_entity_1.LiaisonFile, {
                ...dto,
                fileNumber,
                initiatedById: userId,
                currentHolderId: userId,
                currentStatus: liaison_file_entity_1.LiaisonStatus.DRAFT,
                approvalChain: chain,
            });
            const saved = await manager.save(file);
            for (let i = 0; i < chain.length; i++) {
                await manager.save(manager.create(approval_workflow_entity_1.ApprovalWorkflow, {
                    fileId: saved.id,
                    stepOrder: i + 1,
                    approverRole: chain[i],
                    status: approval_workflow_entity_1.WorkflowStatus.PENDING,
                }));
            }
            this.log.log(`Liaison file created: ${fileNumber} (${dto.fileType})`);
            return saved;
        });
    }
    async processApproval(fileId, dto, userId, userRole) {
        return this.dataSource.transaction(async (manager) => {
            const step = await manager
                .createQueryBuilder(approval_workflow_entity_1.ApprovalWorkflow, 'w')
                .where('w.fileId = :fileId AND w.status = :status', {
                fileId, status: approval_workflow_entity_1.WorkflowStatus.PENDING,
            })
                .orderBy('w.stepOrder', 'ASC')
                .getOne();
            if (!step)
                throw new common_1.BadRequestException('No pending approval step on this file');
            if (step.approverRole.toUpperCase() !== userRole.toUpperCase()) {
                throw new common_1.ForbiddenException(`This step requires ${step.approverRole}. Your role is ${userRole}.`);
            }
            step.status = dto.action === 'approved' ? approval_workflow_entity_1.WorkflowStatus.APPROVED : approval_workflow_entity_1.WorkflowStatus.REJECTED;
            step.approverId = userId;
            step.actionAt = new Date();
            step.remarks = dto.remarks;
            await manager.save(step);
            const file = await manager.findOneOrFail(liaison_file_entity_1.LiaisonFile, { where: { id: fileId } });
            if (dto.action === 'approved') {
                const next = await manager
                    .createQueryBuilder(approval_workflow_entity_1.ApprovalWorkflow, 'w')
                    .where('w.fileId = :fileId AND w.status = :status AND w.stepOrder > :order', {
                    fileId, status: approval_workflow_entity_1.WorkflowStatus.PENDING, order: step.stepOrder,
                })
                    .orderBy('w.stepOrder', 'ASC')
                    .getOne();
                file.currentStatus = next ? liaison_file_entity_1.LiaisonStatus.UNDER_REVIEW : liaison_file_entity_1.LiaisonStatus.APPROVED;
                file.currentHolderId = next?.approverId ?? userId;
            }
            else {
                file.currentStatus = liaison_file_entity_1.LiaisonStatus.RETURNED;
                file.currentHolderId = file.initiatedById;
                await manager
                    .createQueryBuilder()
                    .update(approval_workflow_entity_1.ApprovalWorkflow)
                    .set({ status: approval_workflow_entity_1.WorkflowStatus.PENDING, approverId: null, actionAt: null, remarks: null })
                    .where('fileId = :fileId AND stepOrder > :order', { fileId, order: step.stepOrder })
                    .execute();
            }
            return manager.save(file);
        });
    }
    async updateFile(id, body) {
        const file = await this.fileRepo.findOne({ where: { id } });
        if (!file)
            throw new common_1.NotFoundException('Liaison file not found');
        const editable = ['subject', 'department', 'priority', 'fileType', 'dueDate', 'currentStatus', 'remarks', 'currentHolderId'];
        for (const k of editable)
            if (body[k] !== undefined && body[k] !== null && body[k] !== '')
                file[k] = body[k];
        await this.fileRepo.save(file);
        return this.getFile(id);
    }
    async getFile(id) {
        const file = await this.fileRepo.findOne({
            where: { id },
            relations: ['project', 'initiatedBy', 'currentHolder'],
        });
        if (!file)
            throw new common_1.NotFoundException('Liaison file not found');
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
    async listFiles(params) {
        const qb = this.fileRepo
            .createQueryBuilder('f')
            .leftJoinAndSelect('f.project', 'project')
            .leftJoinAndSelect('f.initiatedBy', 'initiatedBy')
            .leftJoinAndSelect('f.currentHolder', 'currentHolder')
            .orderBy('f.createdAt', 'DESC');
        if (params.projectId)
            qb.andWhere('f.projectId = :pid', { pid: params.projectId });
        if (params.status)
            qb.andWhere('f.currentStatus = :s', { s: params.status });
        if (params.priority)
            qb.andWhere('f.priority = :p', { p: params.priority });
        if (params.department)
            qb.andWhere('f.department = :dept', { dept: params.department });
        if (params.fileType)
            qb.andWhere('f.fileType = :ft', { ft: params.fileType });
        const page = params.page ?? 1;
        const limit = params.limit ?? 25;
        qb.skip((page - 1) * limit).take(limit);
        const [files, total] = await qb.getManyAndCount();
        return { files, total, page, limit };
    }
    async uploadDocument(params) {
        const last = await this.docRepo.findOne({
            where: { fileId: params.fileId },
            order: { uploadedAt: 'DESC' },
        });
        const nextRev = last?.revision
            ? file_document_entity_1.REVISIONS[file_document_entity_1.REVISIONS.indexOf(last.revision) + 1] ?? 'R9'
            : 'R0';
        await this.docRepo.update({ fileId: params.fileId }, { isCurrentRevision: false });
        return this.docRepo.save(this.docRepo.create({
            ...params,
            revision: nextRev,
            isCurrentRevision: true,
            uploadedAt: new Date(),
        }));
    }
    async createLetter(dto, userId) {
        const letterNumber = await this.nextLetterNumber();
        return this.letterRepo.save(this.letterRepo.create({
            ...dto,
            letterNumber,
            signedById: dto.signedById ?? userId,
            status: letter_entity_1.LetterStatus.DRAFT,
        }));
    }
    async listLetters(params) {
        const qb = this.letterRepo
            .createQueryBuilder('l')
            .leftJoinAndSelect('l.project', 'project')
            .leftJoinAndSelect('l.signedBy', 'signedBy')
            .leftJoinAndSelect('l.file', 'file')
            .orderBy('l.createdAt', 'DESC');
        if (params.projectId)
            qb.andWhere('l.projectId = :pid', { pid: params.projectId });
        if (params.letterType)
            qb.andWhere('l.letterType = :type', { type: params.letterType });
        return qb.getMany();
    }
    async getLetter(id) {
        const letter = await this.letterRepo.findOne({
            where: { id },
            relations: ['project', 'signedBy', 'file'],
        });
        if (!letter)
            throw new common_1.NotFoundException('Letter not found');
        return letter;
    }
    async generateLetterPdf(id) {
        const letter = await this.getLetter(id);
        await this.letterRepo.update(id, { status: letter_entity_1.LetterStatus.GENERATED });
        return null;
    }
    async sendLetterByEmail(id, dto) {
        const letter = await this.getLetter(id);
        if (!dto.toEmail && !letter.toEmail) {
            throw new common_1.BadRequestException('Recipient email required');
        }
        const toEmail = dto.toEmail || letter.toEmail;
        const pdf = await this.generateLetterPdf(id);
        const fileName = `${letter.letterNumber ?? 'letter'}.pdf`.replace(/\//g, '-');
        const subject = dto.subject || `Letter Ref: ${letter.letterNumber} — ${letter.subject}`;
        const bodyNote = dto.bodyNote ?? `Please find attached letter ${letter.letterNumber} from ${this.config.get('COMPANY_NAME')}.`;
        const gmailMessageId = await this.gmail.sendLetter({
            to: toEmail,
            subject,
            bodyNote,
            pdfBuffer: pdf,
            letterNumber: letter.letterNumber ?? id,
            fileName,
        });
        return this.letterRepo.save({
            ...letter,
            toEmail,
            emailSubject: subject,
            status: letter_entity_1.LetterStatus.DISPATCHED,
            dispatchedAt: new Date(),
            gmailMessageId,
        });
    }
    async dashboard(projectId) {
        const qb = this.fileRepo.createQueryBuilder('f');
        if (projectId)
            qb.where('f.projectId = :pid', { pid: projectId });
        const files = await qb.getMany();
        const today = new Date().toISOString().split('T')[0];
        return {
            total: files.length,
            by_status: {
                draft: files.filter(f => f.currentStatus === liaison_file_entity_1.LiaisonStatus.DRAFT).length,
                submitted: files.filter(f => f.currentStatus === liaison_file_entity_1.LiaisonStatus.SUBMITTED).length,
                under_review: files.filter(f => f.currentStatus === liaison_file_entity_1.LiaisonStatus.UNDER_REVIEW).length,
                approved: files.filter(f => f.currentStatus === liaison_file_entity_1.LiaisonStatus.APPROVED).length,
                rejected: files.filter(f => f.currentStatus === liaison_file_entity_1.LiaisonStatus.REJECTED).length,
                returned: files.filter(f => f.currentStatus === liaison_file_entity_1.LiaisonStatus.RETURNED).length,
            },
            overdue: files.filter(f => f.dueDate && f.dueDate < today &&
                ![liaison_file_entity_1.LiaisonStatus.APPROVED, liaison_file_entity_1.LiaisonStatus.CLOSED].includes(f.currentStatus)).length,
            urgent: files.filter(f => f.priority === 'urgent').length,
            my_files: files.length,
        };
    }
};
exports.LiaisonService = LiaisonService;
exports.LiaisonService = LiaisonService = LiaisonService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(liaison_file_entity_1.LiaisonFile)),
    __param(1, (0, typeorm_1.InjectRepository)(approval_workflow_entity_1.ApprovalWorkflow)),
    __param(2, (0, typeorm_1.InjectRepository)(file_document_entity_1.FileDocument)),
    __param(3, (0, typeorm_1.InjectRepository)(letter_entity_1.Letter)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        config_1.ConfigService,
        gmail_service_1.GmailService])
], LiaisonService);
//# sourceMappingURL=liaison.service.js.map