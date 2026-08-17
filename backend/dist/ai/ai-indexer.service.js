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
            const chunks = this.chunkText(text, 1000, 200);
            await this.chunkRepo.delete({ sourceId: meta.sourceId, sourceType: meta.sourceType });
            for (const chunk of chunks) {
                if (!chunk.trim())
                    continue;
                const embedding = await this.aiSvc.getEmbedding(chunk);
                if (!embedding)
                    continue;
                const doc = this.chunkRepo.create({
                    projectId: meta.projectId,
                    sourceId: meta.sourceId,
                    sourceType: meta.sourceType,
                    sourceName: meta.sourceName,
                    text: chunk,
                    embedding: `[${embedding.join(',')}]`
                });
                await this.chunkRepo.save(doc);
            }
            this.logger.log(`Indexed ${chunks.length} chunks for ${meta.sourceName}`);
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
    chunkText(text, chunkSize, overlap) {
        const chunks = [];
        let i = 0;
        while (i < text.length) {
            chunks.push(text.slice(i, i + chunkSize));
            i += (chunkSize - overlap);
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