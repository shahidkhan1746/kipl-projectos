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
var AiIndexerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiIndexerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ai_document_chunk_entity_1 = require("./ai-document-chunk.entity");
const ai_service_1 = require("./ai.service");
const pdfParse = require('pdf-parse');
let AiIndexerService = AiIndexerService_1 = class AiIndexerService {
    chunkRepo;
    dataSource;
    aiSvc;
    logger = new common_1.Logger(AiIndexerService_1.name);
    constructor(chunkRepo, dataSource, aiSvc) {
        this.chunkRepo = chunkRepo;
        this.dataSource = dataSource;
        this.aiSvc = aiSvc;
    }
    async indexText(text, meta) {
        if (!text || !text.trim())
            return;
        const chunks = this.chunkTextSemantically(text, 1000, 150);
        await this.chunkRepo.delete({ sourceId: meta.sourceId, sourceType: meta.sourceType });
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            if (!chunk.trim())
                continue;
            const enrichedText = `[Source: ${meta.sourceName} | Part ${i + 1}/${chunks.length}]\n${chunk}`;
            const embedding = await this.aiSvc.getEmbedding(enrichedText);
            if (!embedding)
                continue;
            const doc = this.chunkRepo.create({
                projectId: meta.projectId,
                sourceId: meta.sourceId,
                sourceType: meta.sourceType,
                sourceName: meta.sourceName,
                text: enrichedText,
                embedding: `[${embedding.join(',')}]`
            });
            await this.chunkRepo.save(doc);
        }
        this.logger.log(`Indexed ${chunks.length} chunks for "${meta.sourceName}"`);
    }
    async indexBuffer(buffer, meta) {
        try {
            let text = '';
            if (meta.sourceName.toLowerCase().endsWith('.pdf')) {
                const data = await pdfParse(buffer);
                text = data.text;
            }
            else {
                text = buffer.toString('utf8');
            }
            if (!text || !text.trim())
                return;
            await this.indexText(text, meta);
        }
        catch (e) {
            this.logger.error(`Failed to index buffer for ${meta.sourceName}: ${e.message}`);
        }
    }
    async indexUrl(url, meta) {
        if (!url)
            return;
        try {
            this.logger.log(`Downloading ${url} for indexing...`);
            const res = await fetch(url);
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const buffer = Buffer.from(await res.arrayBuffer());
            await this.indexBuffer(buffer, meta);
        }
        catch (e) {
            this.logger.error(`Failed to index URL ${url}: ${e.message}`);
        }
    }
    async syncAllKnowledge(projectId) {
        const details = [];
        let totalSources = 0;
        try {
            const projects = await this.dataSource.query(`SELECT * FROM projects`);
            for (const p of projects) {
                const pText = `Project Name: ${p.name} (${p.code})\nDescription: ${p.description || 'N/A'}\nClient / Employer: ${p.client}\nLocation: ${p.location}\nContract Value: ₹${p.contract_value}\nStart Date / Commencement: ${p.start_date}\nEnd Date / Target Completion: ${p.end_date}\nStatus: ${p.status}`;
                await this.indexText(pText, {
                    projectId: p.id,
                    sourceId: `project_${p.id}`,
                    sourceType: 'project',
                    sourceName: `Project Overview: ${p.name}`
                });
                totalSources++;
            }
            if (projects.length > 0)
                details.push(`Indexed ${projects.length} Project Overviews`);
            const settings = await this.dataSource.query(`SELECT key, value, label, category FROM system_settings WHERE value IS NOT NULL`);
            if (settings && settings.length > 0) {
                const settingsText = settings.map((s) => `• ${s.label || s.key} (${s.category || 'General'}): ${s.value}`).join('\n');
                await this.indexText(settingsText, {
                    projectId,
                    sourceId: 'system_settings_all',
                    sourceType: 'settings',
                    sourceName: 'Project Settings & Contract Key Parameters'
                });
                totalSources++;
                details.push(`Indexed ${settings.length} Project Settings & Dates`);
            }
            const employees = await this.dataSource.query(`SELECT * FROM employees`);
            for (const e of employees) {
                const empName = `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.name || 'Unnamed Employee';
                const empText = `Employee Name: ${empName}\nEmployee Code: ${e.emp_code || 'N/A'}\nDesignation / Role: ${e.designation || 'Staff'}\nDepartment: ${e.department || 'Operations'}\nEmployment Type: ${e.employment_type || 'Full Time'}\nStatus: ${e.status || 'Active'}\nPhone Number: ${e.phone || 'N/A'}\nEmail Address: ${e.email || 'N/A'}\nDate of Joining: ${e.date_of_joining || 'N/A'}\nBase Salary: ₹${e.base_salary || 0}`;
                await this.indexText(empText, {
                    projectId: e.project_id || projectId,
                    sourceId: `emp_${e.id}`,
                    sourceType: 'employee',
                    sourceName: `Employee: ${empName} (${e.designation || 'Staff'})`
                });
                totalSources++;
            }
            if (employees.length > 0)
                details.push(`Indexed ${employees.length} Employees & Site Staff`);
            const users = await this.dataSource.query(`SELECT id, name, email, role, designation FROM users`);
            for (const u of users) {
                const uText = `User Name: ${u.name}\nEmail: ${u.email}\nSystem Role: ${u.role}\nDesignation: ${u.designation || u.role}`;
                await this.indexText(uText, {
                    projectId,
                    sourceId: `user_${u.id}`,
                    sourceType: 'user',
                    sourceName: `User & Role: ${u.name}`
                });
                totalSources++;
            }
            if (users.length > 0)
                details.push(`Indexed ${users.length} Users & Roles`);
            let letterQuery = `SELECT * FROM letters`;
            const letterParams = [];
            if (projectId) {
                letterQuery += ` WHERE project_id = $1`;
                letterParams.push(projectId);
            }
            const letters = await this.dataSource.query(letterQuery, letterParams);
            for (const l of letters) {
                const letterText = `Letter Number: ${l.letter_number || 'N/A'}\nType: ${l.letter_type}\nDate: ${l.date}\nTo Organization: ${l.to_organization || 'N/A'} (Attn: ${l.to_name || 'N/A'})\nSubject: ${l.subject || 'N/A'}\nStatus: ${l.status}\n\nContent:\n${l.body || 'N/A'}`;
                await this.indexText(letterText, {
                    projectId: l.project_id || projectId,
                    sourceId: `letter_${l.id}`,
                    sourceType: 'letter',
                    sourceName: `Letter ${l.letter_number || l.subject || l.id}`
                });
                totalSources++;
            }
            if (letters.length > 0)
                details.push(`Indexed ${letters.length} Official Letters`);
            let meetQuery = `SELECT * FROM meetings`;
            const meetParams = [];
            if (projectId) {
                meetQuery += ` WHERE project_id = $1`;
                meetParams.push(projectId);
            }
            const meetings = await this.dataSource.query(meetQuery, meetParams);
            for (const m of meetings) {
                let itemsStr = '';
                if (Array.isArray(m.action_items)) {
                    itemsStr = m.action_items.map((a, idx) => `  ${idx + 1}. [${a.status || 'Pending'}] ${a.action} (Responsible: ${a.responsible || 'N/A'}, Due: ${a.dueDate || 'N/A'})`).join('\n');
                }
                let attendeesStr = '';
                if (Array.isArray(m.attendees)) {
                    attendeesStr = m.attendees.map((at) => `${at.name || at.designation} (${at.organisation || ''})`).join(', ');
                }
                const meetText = `Meeting Title: ${m.title}\nMeeting No: ${m.meeting_no || 'N/A'} (${m.type})\nDate: ${m.date}, Venue: ${m.venue || 'Site Office'}\nChaired By: ${m.chaired_by || 'N/A'}, Minuted By: ${m.minuted_by || 'N/A'}\nAttendees: ${attendeesStr}\n\nAction Items & Next Steps:\n${itemsStr || 'None recorded'}\n\nNext Meeting Date: ${m.next_meeting_date || 'N/A'}\nRemarks: ${m.remarks || ''}`;
                await this.indexText(meetText, {
                    projectId: m.project_id || projectId,
                    sourceId: `meeting_${m.id}`,
                    sourceType: 'meeting',
                    sourceName: `MOM: ${m.title} (${m.date})`
                });
                totalSources++;
            }
            if (meetings.length > 0)
                details.push(`Indexed ${meetings.length} Meeting Records & Action Items`);
            let liaisonQuery = `SELECT * FROM liaison_files`;
            const liaisonParams = [];
            if (projectId) {
                liaisonQuery += ` WHERE project_id = $1`;
                liaisonParams.push(projectId);
            }
            const liaisonFiles = await this.dataSource.query(liaisonQuery, liaisonParams);
            for (const lf of liaisonFiles) {
                const lfText = `Liaison File Ref: ${lf.file_number || 'N/A'}\nDepartment: ${lf.department}\nSubject: ${lf.subject}\nStatus: ${lf.current_status}\nExpected Approval Date: ${lf.expected_date || 'N/A'}\nActual Date: ${lf.actual_date || 'N/A'}\nDelay Days: ${lf.delay_days || 0}\nEOT Relevant Ground: ${lf.is_eot_ground ? 'Yes' : 'No'} (${lf.eot_reason || 'N/A'})\nRemarks: ${lf.remarks || ''}`;
                await this.indexText(lfText, {
                    projectId: lf.project_id || projectId,
                    sourceId: `liaison_${lf.id}`,
                    sourceType: 'liaison_file',
                    sourceName: `Liaison File: ${lf.file_number || lf.subject}`
                });
                totalSources++;
            }
            if (liaisonFiles.length > 0)
                details.push(`Indexed ${liaisonFiles.length} Liaison Government Clearance Files`);
            const pdfDocs = await this.dataSource.query(`SELECT id, file_id, document_name, cloudinary_url, revision FROM file_documents WHERE cloudinary_url IS NOT NULL AND (mime_type = 'application/pdf' OR document_name ILIKE '%.pdf')`);
            for (const doc of pdfDocs) {
                if (doc.cloudinary_url) {
                    await this.indexUrl(doc.cloudinary_url, {
                        projectId,
                        sourceId: `doc_${doc.id}`,
                        sourceType: 'liaison_document',
                        sourceName: doc.document_name || `Document ${doc.revision || ''}`
                    });
                    totalSources++;
                }
            }
            if (pdfDocs.length > 0)
                details.push(`Processed & Indexed ${pdfDocs.length} Uploaded PDF Attachments`);
            const diaries = await this.dataSource.query(`SELECT * FROM site_diaries ORDER BY date DESC LIMIT 30`);
            for (const d of diaries) {
                const diaryText = `Site Diary Date: ${d.date}\nWeather Morning: ${d.weather_morning || 'Fair'}, Afternoon: ${d.weather_afternoon || 'Fair'}\nWork Done / Progress: ${d.work_done_today || 'N/A'}\nHindrances / Delays: ${d.hindrances || 'None'}\nRemarks: ${d.remarks || ''}`;
                await this.indexText(diaryText, {
                    projectId: d.project_id || projectId,
                    sourceId: `diary_${d.id}`,
                    sourceType: 'site_diary',
                    sourceName: `Site Diary: ${d.date}`
                });
                totalSources++;
            }
            if (diaries.length > 0)
                details.push(`Indexed ${diaries.length} Recent Site Diaries`);
        }
        catch (err) {
            this.logger.error('Failed full knowledge sync:', err);
        }
        return { indexedSources: totalSources, details };
    }
    chunkTextSemantically(text, maxChunkSize = 1000, overlap = 150) {
        const cleaned = text
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        if (!cleaned)
            return [];
        if (cleaned.length <= maxChunkSize)
            return [cleaned];
        const chunks = [];
        const paragraphs = cleaned.split(/\n\n+/);
        let currentChunk = '';
        for (const para of paragraphs) {
            const trimmedPara = para.trim();
            if (!trimmedPara)
                continue;
            if (trimmedPara.length > maxChunkSize) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }
                const sentences = trimmedPara.split(/(?<=[.?!;:\n])\s+/);
                for (const sentence of sentences) {
                    if ((currentChunk + ' ' + sentence).length > maxChunkSize) {
                        if (currentChunk)
                            chunks.push(currentChunk.trim());
                        currentChunk = sentence.length > maxChunkSize ? sentence.substring(0, maxChunkSize) : sentence;
                    }
                    else {
                        currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
                    }
                }
            }
            else if ((currentChunk + '\n\n' + trimmedPara).length > maxChunkSize) {
                if (currentChunk)
                    chunks.push(currentChunk.trim());
                currentChunk = trimmedPara;
            }
            else {
                currentChunk = currentChunk ? currentChunk + '\n\n' + trimmedPara : trimmedPara;
            }
        }
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        return chunks;
    }
};
exports.AiIndexerService = AiIndexerService;
exports.AiIndexerService = AiIndexerService = AiIndexerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ai_document_chunk_entity_1.AiDocumentChunk)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource,
        ai_service_1.AiService])
], AiIndexerService);
//# sourceMappingURL=ai-indexer.service.js.map