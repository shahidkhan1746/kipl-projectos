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
const DEFAULT_MODEL = {
    gemini: 'gemini-2.0-flash',
    openai: 'gpt-4o-mini',
};
let AiService = class AiService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async row() {
        const rows = await this.repo.find({ take: 1, order: { createdAt: 'ASC' } });
        return rows[0] ?? null;
    }
    async getMasked() {
        const c = await this.row();
        if (!c)
            return { enabled: false, provider: 'gemini', model: '', baseUrl: '', hasKey: false };
        return { enabled: c.enabled, provider: c.provider, model: c.model ?? '', baseUrl: c.baseUrl ?? '', hasKey: !!c.apiKey };
    }
    async save(body) {
        let c = await this.row();
        if (!c)
            c = this.repo.create();
        c.enabled = !!body.enabled;
        c.provider = body.provider || 'gemini';
        c.model = body.model || '';
        c.baseUrl = body.baseUrl || '';
        if (body.apiKey && body.apiKey.trim() && !body.apiKey.includes('•'))
            c.apiKey = body.apiKey.trim();
        await this.repo.save(c);
        return { ok: true };
    }
    async generate(prompt, system) {
        const c = await this.row();
        if (!c || !c.enabled)
            throw new common_1.BadRequestException('AI is not enabled. Configure it in Settings → AI.');
        if (!c.apiKey)
            throw new common_1.BadRequestException('No API key set for the AI provider.');
        const model = c.model || DEFAULT_MODEL[c.provider] || 'gemini-2.0-flash';
        const f = globalThis.fetch;
        if (c.provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${c.apiKey}`;
            const bodyReq = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.4, maxOutputTokens: 1400 },
            };
            if (system)
                bodyReq.systemInstruction = { parts: [{ text: system }] };
            const r = await f(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(bodyReq) });
            const data = await r.json();
            if (!r.ok)
                throw new common_1.BadRequestException('Gemini: ' + (data?.error?.message ?? r.status));
            return (data?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text).join('').trim() || '(empty response)';
        }
        const base = (c.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
        const messages = [system ? { role: 'system', content: system } : null, { role: 'user', content: prompt }].filter(Boolean);
        const r = await f(`${base}/chat/completions`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${c.apiKey}` },
            body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 1400 }),
        });
        const data = await r.json();
        if (!r.ok)
            throw new common_1.BadRequestException('AI: ' + (data?.error?.message ?? r.status));
        return (data?.choices?.[0]?.message?.content ?? '').trim() || '(empty response)';
    }
    async test() {
        try {
            const t = await this.generate('Reply with the single word: OK');
            return { ok: true, message: 'Connected. Model replied: ' + t.slice(0, 40) };
        }
        catch (e) {
            return { ok: false, message: e?.message ?? 'Failed' };
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ai_config_entity_1.AiConfig)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AiService);
//# sourceMappingURL=ai.service.js.map