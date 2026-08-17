"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ai_config_entity_1 = require("./ai-config.entity");
const ai_key_entity_1 = require("./ai-key.entity");
const ai_service_1 = require("./ai.service");
const ai_controller_1 = require("./ai.controller");
const ai_chat_session_entity_1 = require("./ai-chat-session.entity");
const ai_chat_message_entity_1 = require("./ai-chat-message.entity");
const ai_document_chunk_entity_1 = require("./ai-document-chunk.entity");
const ai_knowledge_document_entity_1 = require("./ai-knowledge-document.entity");
const ai_indexer_service_1 = require("./ai-indexer.service");
const storage_module_1 = require("../storage/storage.module");
let AiModule = class AiModule {
};
exports.AiModule = AiModule;
exports.AiModule = AiModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                ai_config_entity_1.AiConfig,
                ai_key_entity_1.AiKey,
                ai_chat_session_entity_1.AiChatSession,
                ai_chat_message_entity_1.AiChatMessage,
                ai_document_chunk_entity_1.AiDocumentChunk,
                ai_knowledge_document_entity_1.AiKnowledgeDocument,
            ]),
            storage_module_1.StorageModule,
        ],
        providers: [ai_service_1.AiService, ai_indexer_service_1.AiIndexerService],
        controllers: [ai_controller_1.AiController],
        exports: [ai_service_1.AiService, ai_indexer_service_1.AiIndexerService],
    })
], AiModule);
//# sourceMappingURL=ai.module.js.map