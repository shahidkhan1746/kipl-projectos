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
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const uuid_1 = require("uuid");
const fs_1 = require("fs");
const path_1 = require("path");
const cloudinary_1 = require("cloudinary");
const client_s3_1 = require("@aws-sdk/client-s3");
const storage_config_entity_1 = require("./storage-config.entity");
const LOCAL_DIR = (0, path_1.join)(process.cwd(), 'uploads');
const PUBLIC_URL = process.env.PUBLIC_URL ?? process.env.API_URL ?? 'http://localhost:3000';
const MAX_BYTES = 15 * 1024 * 1024;
const OK_MIME = /^image\/(jpe?g|png|webp|gif|avif)$/i;
let StorageService = StorageService_1 = class StorageService {
    repo;
    logger = new common_1.Logger(StorageService_1.name);
    constructor(repo) {
        this.repo = repo;
    }
    async getConfig() {
        return this.repo.findOne({ where: { isActive: true }, order: { updatedAt: 'DESC' } });
    }
    async getMaskedConfig() {
        const c = await this.getConfig();
        if (!c)
            return { provider: 'local', isVerified: false, lastTestedAt: null };
        return {
            provider: c.provider,
            cloudName: c.cloudName ?? '',
            cloudApiKey: c.cloudApiKey ?? '',
            cloudApiSecretSet: !!c.cloudApiSecret,
            s3Endpoint: c.s3Endpoint ?? '',
            s3Region: c.s3Region ?? 'auto',
            s3Bucket: c.s3Bucket ?? '',
            s3AccessKey: c.s3AccessKey ?? '',
            s3SecretKeySet: !!c.s3SecretKey,
            s3PublicBase: c.s3PublicBase ?? '',
            isVerified: c.isVerified,
            lastTestedAt: c.lastTestedAt,
        };
    }
    async saveConfig(body) {
        const prev = await this.getConfig();
        await this.repo.update({}, { isActive: false });
        const next = this.repo.create({
            provider: body.provider ?? 'local',
            cloudName: body.cloudName ?? prev?.cloudName ?? null,
            cloudApiKey: body.cloudApiKey ?? prev?.cloudApiKey ?? null,
            cloudApiSecret: body.cloudApiSecret || prev?.cloudApiSecret || null,
            s3Endpoint: body.s3Endpoint ?? prev?.s3Endpoint ?? null,
            s3Region: body.s3Region ?? prev?.s3Region ?? 'auto',
            s3Bucket: body.s3Bucket ?? prev?.s3Bucket ?? null,
            s3AccessKey: body.s3AccessKey ?? prev?.s3AccessKey ?? null,
            s3SecretKey: body.s3SecretKey || prev?.s3SecretKey || null,
            s3PublicBase: body.s3PublicBase ?? prev?.s3PublicBase ?? null,
            isActive: true,
            isVerified: false,
            lastTestedAt: null,
        });
        await this.repo.save(next);
        return { ok: true };
    }
    async testConnection() {
        const c = await this.getConfig();
        if (!c)
            return { success: false, message: 'No storage configuration saved yet.' };
        try {
            if (c.provider === 'cloudinary') {
                this.applyCloudinary(c);
                await cloudinary_1.v2.api.ping();
            }
            else if (c.provider === 's3') {
                const s3 = this.buildS3(c);
                if (!c.s3Bucket)
                    throw new Error('Bucket name is required.');
                await s3.send(new client_s3_1.HeadBucketCommand({ Bucket: c.s3Bucket }));
            }
            else {
                await fs_1.promises.mkdir(LOCAL_DIR, { recursive: true });
            }
            c.isVerified = true;
            c.lastTestedAt = new Date();
            await this.repo.save(c);
            return { success: true, message: `Connected to ${c.provider} successfully.` };
        }
        catch (e) {
            c.isVerified = false;
            await this.repo.save(c);
            this.logger.warn(`Storage test failed: ${e?.message}`);
            return { success: false, message: e?.message ?? 'Connection failed.' };
        }
    }
    async upload(file, folder = 'updates') {
        if (!file)
            throw new common_1.BadRequestException('No file provided.');
        if (!OK_MIME.test(file.mimetype))
            throw new common_1.BadRequestException('Only image files are allowed.');
        if (file.size > MAX_BYTES)
            throw new common_1.BadRequestException('Image exceeds 15 MB limit.');
        const c = await this.getConfig();
        const provider = c?.provider ?? 'local';
        const key = `${folder}/${(0, uuid_1.v4)()}${(0, path_1.extname)(file.originalname) || '.jpg'}`;
        if (provider === 'cloudinary' && c) {
            this.applyCloudinary(c);
            const res = await new Promise((resolve, reject) => {
                cloudinary_1.v2.uploader.upload_stream({ public_id: key.replace(/\.[^.]+$/, ''), resource_type: 'image', overwrite: true }, (err, result) => (err ? reject(err) : resolve(result))).end(file.buffer);
            });
            return { url: res.secure_url, key: res.public_id };
        }
        if (provider === 's3' && c) {
            const s3 = this.buildS3(c);
            await s3.send(new client_s3_1.PutObjectCommand({
                Bucket: c.s3Bucket, Key: key, Body: file.buffer,
                ContentType: file.mimetype, CacheControl: 'public, max-age=31536000',
            }));
            const base = (c.s3PublicBase || '').replace(/\/$/, '');
            return { url: `${base}/${key}`, key };
        }
        const dest = (0, path_1.join)(LOCAL_DIR, key);
        await fs_1.promises.mkdir((0, path_1.join)(dest, '..'), { recursive: true });
        await fs_1.promises.writeFile(dest, file.buffer);
        return { url: `${PUBLIC_URL}/uploads/${key}`, key };
    }
    applyCloudinary(c) {
        cloudinary_1.v2.config({
            cloud_name: c.cloudName, api_key: c.cloudApiKey, api_secret: c.cloudApiSecret, secure: true,
        });
    }
    buildS3(c) {
        return new client_s3_1.S3Client({
            region: c.s3Region || 'auto',
            endpoint: c.s3Endpoint || undefined,
            forcePathStyle: !!c.s3Endpoint,
            credentials: { accessKeyId: c.s3AccessKey, secretAccessKey: c.s3SecretKey },
        });
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(storage_config_entity_1.StorageConfig)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], StorageService);
//# sourceMappingURL=storage.service.js.map