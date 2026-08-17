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
    aiSvc;
    logger = new common_1.Logger(AiIndexerService_1.name);
    constructor(chunkRepo, aiSvc) {
        this.chunkRepo = chunkRepo;
        this.aiSvc = aiSvc;
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
            this.logger.log(`Indexed ${chunks.length} semantic chunks for "${meta.sourceName}"`);
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
        ai_service_1.AiService])
], AiIndexerService);
//# sourceMappingURL=ai-indexer.service.js.map