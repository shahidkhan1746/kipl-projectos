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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ai_config_entity_1 = require("./ai-config.entity");
const ai_key_entity_1 = require("./ai-key.entity");
const ai_chat_session_entity_1 = require("./ai-chat-session.entity");
const ai_chat_message_entity_1 = require("./ai-chat-message.entity");
const ai_document_chunk_entity_1 = require("./ai-document-chunk.entity");
const PRESETS = {
    gemini: { kind: 'gemini', base: '', model: 'gemini-2.5-flash', embeddingModel: 'text-embedding-004' },
    openai: { kind: 'openai', base: 'https://api.openai.com/v1', model: 'gpt-4o-mini', embeddingModel: 'text-embedding-3-small' },
    nvidia: { kind: 'openai', base: 'https://integrate.api.nvidia.com/v1', model: 'meta/llama-3.1-8b-instruct', embeddingModel: 'nvidia/nv-embed-v1' },
    groq: { kind: 'openai', base: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', embeddingModel: '' },
    openrouter: { kind: 'openai', base: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.1-8b-instruct:free', embeddingModel: '' },
};
const presetOf = (p) => PRESETS[p] ?? PRESETS.gemini;
let AiService = class AiService {
    cfgRepo;
    keyRepo;
    sessionRepo;
    msgRepo;
    chunkRepo;
    constructor(cfgRepo, keyRepo, sessionRepo, msgRepo, chunkRepo) {
        this.cfgRepo = cfgRepo;
        this.keyRepo = keyRepo;
        this.sessionRepo = sessionRepo;
        this.msgRepo = msgRepo;
        this.chunkRepo = chunkRepo;
    }
    async configRow() {
        const rows = await this.cfgRepo.find({ take: 1, order: { createdAt: 'ASC' } });
        return rows[0] ?? null;
    }
    async getMasked() {
        const c = await this.configRow();
        const keys = await this.keyRepo.find({ order: { priority: 'ASC', createdAt: 'ASC' } });
        return {
            enabled: !!c?.enabled,
            keys: keys.map(k => ({
                id: k.id, label: k.label, provider: k.provider,
                model: k.model ?? '', baseUrl: k.baseUrl ?? '',
                enabled: k.enabled, priority: k.priority, hasKey: !!k.apiKey,
            })),
        };
    }
    async saveConfig(body) {
        let c = await this.configRow();
        if (!c)
            c = this.cfgRepo.create();
        c.enabled = !!body.enabled;
        await this.cfgRepo.save(c);
        return { ok: true };
    }
    hasMask(s) { return !!s && s.includes('•'); }
    async createKey(body) {
        const k = this.keyRepo.create({
            label: (body.label || '').trim() || (body.provider || 'nvidia'),
            provider: body.provider || 'nvidia',
            apiKey: !this.hasMask(body.apiKey) ? (body.apiKey || '').trim() : '',
            model: (body.model || '').trim(),
            baseUrl: (body.baseUrl || '').trim(),
            enabled: body.enabled !== false,
            priority: Number.isFinite(+body.priority) ? +body.priority : 100,
        });
        await this.keyRepo.save(k);
        return { ok: true, id: k.id };
    }
    async updateKey(id, body) {
        const k = await this.keyRepo.findOne({ where: { id } });
        if (!k)
            throw new common_1.NotFoundException('Key not found');
        if (body.label !== undefined)
            k.label = (body.label || '').trim() || k.provider;
        if (body.provider !== undefined)
            k.provider = body.provider || k.provider;
        if (body.model !== undefined)
            k.model = (body.model || '').trim();
        if (body.baseUrl !== undefined)
            k.baseUrl = (body.baseUrl || '').trim();
        if (body.enabled !== undefined)
            k.enabled = !!body.enabled;
        if (body.priority !== undefined && Number.isFinite(+body.priority))
            k.priority = +body.priority;
        if (body.apiKey && body.apiKey.trim() && !this.hasMask(body.apiKey))
            k.apiKey = body.apiKey.trim();
        await this.keyRepo.save(k);
        return { ok: true };
    }
    async deleteKey(id) {
        await this.keyRepo.delete(id);
        return { ok: true };
    }
    async callProvider(k, prompt, system) {
        const preset = presetOf(k.provider);
        const model = (k.model || '').trim() || preset.model;
        const f = globalThis.fetch;
        if (preset.kind === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${k.apiKey}`;
            const bodyReq = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.4, maxOutputTokens: 1400 },
            };
            if (system)
                bodyReq.systemInstruction = { parts: [{ text: system }] };
            const r = await f(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(bodyReq) });
            const data = await r.json().catch(() => ({}));
            if (!r.ok)
                throw new Error(data?.error?.message ?? ('HTTP ' + r.status));
            return (data?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text).join('').trim() || '(empty response)';
        }
        const base = ((k.baseUrl || '').trim() || preset.base).replace(/\/$/, '');
        const messages = [system ? { role: 'system', content: system } : null, { role: 'user', content: prompt }].filter(Boolean);
        const r = await f(`${base}/chat/completions`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${k.apiKey}` },
            body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 1400 }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok)
            throw new Error(data?.error?.message ?? ('HTTP ' + r.status));
        return (data?.choices?.[0]?.message?.content ?? '').trim() || '(empty response)';
    }
    async generate(prompt, system) {
        const c = await this.configRow();
        if (!c || !c.enabled)
            throw new common_1.BadRequestException('AI is not enabled. Configure it in Settings → AI.');
        const keys = (await this.keyRepo.find({ order: { priority: 'ASC', createdAt: 'ASC' } }))
            .filter(k => k.enabled && k.apiKey);
        if (!keys.length)
            throw new common_1.BadRequestException('No enabled AI keys with a key set. Add one in Settings → AI.');
        const errors = [];
        for (const k of keys) {
            try {
                return await this.callProvider(k, prompt, system);
            }
            catch (e) {
                errors.push(`${k.label || k.provider}: ${e?.message ?? e}`);
            }
        }
        throw new common_1.BadRequestException('All AI keys failed. ' + errors.join(' | '));
    }
    async testKey(id) {
        const k = await this.keyRepo.findOne({ where: { id } });
        if (!k)
            return { ok: false, message: 'Key not found — save it first.' };
        if (!k.apiKey)
            return { ok: false, message: 'No key saved for this entry.' };
        try {
            const t = await this.callProvider(k, 'Reply with the single word: OK');
            return { ok: true, message: 'Connected. Model replied: ' + t.slice(0, 40) };
        }
        catch (e) {
            return { ok: false, message: e?.message ?? 'Failed' };
        }
    }
    async getEmbedding(text) {
        const keys = (await this.keyRepo.find({ order: { priority: 'ASC', createdAt: 'ASC' } })).filter(k => k.enabled && k.apiKey);
        if (!keys.length)
            return null;
        const f = globalThis.fetch;
        for (const k of keys) {
            try {
                const preset = presetOf(k.provider);
                const embModel = preset.embeddingModel;
                if (!embModel)
                    continue;
                if (preset.kind === 'gemini') {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${embModel}:embedContent?key=${k.apiKey}`;
                    const r = await f(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: `models/${embModel}`, content: { parts: [{ text }] } }) });
                    const data = await r.json();
                    if (data?.embedding?.values)
                        return data.embedding.values;
                }
                else if (preset.kind === 'openai') {
                    const base = ((k.baseUrl || '').trim() || preset.base).replace(/\/$/, '');
                    const r = await f(`${base}/embeddings`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${k.apiKey}` }, body: JSON.stringify({ model: embModel, input: text }) });
                    const data = await r.json();
                    if (data?.data?.[0]?.embedding)
                        return data.data[0].embedding;
                }
            }
            catch (e) { }
        }
        return null;
    }
    async chat(sessionId, query, userId, projectId) {
        let session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (!session) {
            session = this.sessionRepo.create({ id: sessionId, title: query.substring(0, 50), userId, projectId });
            await this.sessionRepo.save(session);
        }
        await this.msgRepo.save(this.msgRepo.create({ sessionId: session.id, role: 'user', content: query }));
        let contextText = '';
        const emb = await this.getEmbedding(query);
        if (emb) {
            const vectorStr = `[${emb.join(',')}]`;
            const chunks = await this.chunkRepo.query(`SELECT text, "sourceName", 1 - (embedding <=> $1::vector) AS similarity 
         FROM ai_document_chunks 
         WHERE "projectId" = $2 OR "projectId" IS NULL 
         ORDER BY embedding <=> $1::vector LIMIT 5`, [vectorStr, projectId]);
            if (chunks && chunks.length > 0) {
                contextText = chunks.map((c) => `Source: ${c.sourceName}\nContent: ${c.text}`).join('\n\n');
            }
        }
        const history = await this.msgRepo.find({ where: { sessionId: session.id }, order: { createdAt: 'ASC' } });
        let prompt = '';
        if (contextText) {
            prompt += `[CONTEXT INFORMATION]\n${contextText}\n\n`;
        }
        prompt += `[CONVERSATION HISTORY]\n`;
        history.forEach(m => {
            prompt += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n\n`;
        });
        prompt += `Assistant: `;
        const systemInstruction = `You are a helpful AI assistant for KIPL ProjectOS. You answer questions based on the CONTEXT INFORMATION provided. If the context does not contain the answer, you can use your general knowledge, but prioritize the context.`;
        const reply = await this.generate(prompt, systemInstruction);
        await this.msgRepo.save(this.msgRepo.create({ sessionId: session.id, role: 'model', content: reply }));
        return reply;
    }
    async getSessions(userId, projectId) {
        const whereClause = { userId };
        if (projectId)
            whereClause.projectId = projectId;
        else
            whereClause.projectId = require('typeorm').IsNull();
        return this.sessionRepo.find({
            where: whereClause,
            order: { updatedAt: 'DESC' }
        });
    }
    async getSessionHistory(sessionId) {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (!session)
            throw new common_1.NotFoundException('Session not found');
        const messages = await this.msgRepo.find({
            where: { sessionId },
            order: { createdAt: 'ASC' }
        });
        return { session, messages };
    }
    async deleteSession(sessionId, userId) {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId, userId } });
        if (!session)
            throw new common_1.NotFoundException('Session not found');
        await this.msgRepo.delete({ sessionId });
        await this.sessionRepo.delete({ id: sessionId });
        return { success: true };
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ai_config_entity_1.AiConfig)),
    __param(1, (0, typeorm_1.InjectRepository)(ai_key_entity_1.AiKey)),
    __param(2, (0, typeorm_1.InjectRepository)(ai_chat_session_entity_1.AiChatSession)),
    __param(3, (0, typeorm_1.InjectRepository)(ai_chat_message_entity_1.AiChatMessage)),
    __param(4, (0, typeorm_1.InjectRepository)(ai_document_chunk_entity_1.AiDocumentChunk)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AiService);
//# sourceMappingURL=ai.service.js.map