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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageConfig = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
let StorageConfig = class StorageConfig extends base_entity_1.BaseEntity {
    provider;
    cloudName;
    cloudApiKey;
    cloudApiSecret;
    s3Endpoint;
    s3Region;
    s3Bucket;
    s3AccessKey;
    s3SecretKey;
    s3PublicBase;
    isActive;
    isVerified;
    lastTestedAt;
};
exports.StorageConfig = StorageConfig;
__decorate([
    (0, typeorm_1.Column)({ default: 'local' }),
    __metadata("design:type", String)
], StorageConfig.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cloud_name', nullable: true }),
    __metadata("design:type", String)
], StorageConfig.prototype, "cloudName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cloud_api_key', nullable: true }),
    __metadata("design:type", String)
], StorageConfig.prototype, "cloudApiKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cloud_api_secret', type: 'text', nullable: true }),
    __metadata("design:type", String)
], StorageConfig.prototype, "cloudApiSecret", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 's3_endpoint', nullable: true }),
    __metadata("design:type", String)
], StorageConfig.prototype, "s3Endpoint", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 's3_region', default: 'auto' }),
    __metadata("design:type", String)
], StorageConfig.prototype, "s3Region", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 's3_bucket', nullable: true }),
    __metadata("design:type", String)
], StorageConfig.prototype, "s3Bucket", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 's3_access_key', nullable: true }),
    __metadata("design:type", String)
], StorageConfig.prototype, "s3AccessKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 's3_secret_key', type: 'text', nullable: true }),
    __metadata("design:type", String)
], StorageConfig.prototype, "s3SecretKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 's3_public_base', nullable: true }),
    __metadata("design:type", String)
], StorageConfig.prototype, "s3PublicBase", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], StorageConfig.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_verified', default: false }),
    __metadata("design:type", Boolean)
], StorageConfig.prototype, "isVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_tested_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], StorageConfig.prototype, "lastTestedAt", void 0);
exports.StorageConfig = StorageConfig = __decorate([
    (0, typeorm_1.Entity)('storage_configs')
], StorageConfig);
//# sourceMappingURL=storage-config.entity.js.map