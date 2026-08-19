import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { v4 as uuid } from 'uuid'
import { promises as fs } from 'fs'
import { join, extname } from 'path'
import { v2 as cloudinary } from 'cloudinary'
import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3'
import { StorageConfig } from './storage-config.entity'

export interface UploadedPhoto { url: string; key: string }
type MulterFile = { originalname: string; buffer: Buffer; mimetype: string; size: number }

const LOCAL_DIR = join(process.cwd(), 'uploads')
const PUBLIC_URL = process.env.PUBLIC_URL ?? process.env.API_URL ?? 'http://localhost:3000'
const MAX_BYTES = 50 * 1024 * 1024 // 50 MB

// Allows Images, PDFs, Word documents, Excel spreadsheets, CSVs, and Text/Markdown
const OK_MIME = /^image\/(jpe?g|png|webp|gif|avif|bmp|svg\+xml|tiff)$|^application\/pdf$|^application\/(msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|vnd\.ms-excel|vnd\.ms-powerpoint|json|octet-stream)$|^text\/(plain|csv|markdown|tab-separated-values)$/i
const OK_EXT = /\.(jpe?g|png|webp|gif|avif|bmp|svg|tiff|pdf|docx?|xlsx?|csv|tsv|txt|md|json|pptx?)$/i

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)

  constructor(
    @InjectRepository(StorageConfig) private repo: Repository<StorageConfig>,
  ) {}

  async getConfig(): Promise<StorageConfig | null> {
    return this.repo.findOne({ where: { isActive: true }, order: { updatedAt: 'DESC' } })
  }

  // Never leak secrets to the client — only whether each provider looks configured.
  async getMaskedConfig() {
    const c = await this.getConfig()
    if (!c) return { provider: 'local', isVerified: false, lastTestedAt: null }
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
    }
  }

  // Merge-save: blank secret fields keep the previously stored secret so the
  // admin doesn't have to re-enter keys on every edit.
  async saveConfig(body: any): Promise<{ ok: boolean }> {
    const prev = await this.getConfig()
    // Deactivate any currently-active config (targeted criteria — TypeORM 0.3 rejects `update({}, …)`)
    await this.repo.update({ isActive: true }, { isActive: false })
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
    })
    await this.repo.save(next)
    return { ok: true }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const c = await this.getConfig()
    if (!c) return { success: false, message: 'No storage configuration saved yet.' }
    try {
      if (c.provider === 'cloudinary') {
        this.applyCloudinary(c)
        await cloudinary.api.ping()
      } else if (c.provider === 's3') {
        const s3 = this.buildS3(c)
        if (!c.s3Bucket) throw new Error('Bucket name is required.')
        await s3.send(new HeadBucketCommand({ Bucket: c.s3Bucket }))
      } else {
        await fs.mkdir(LOCAL_DIR, { recursive: true })
      }
      c.isVerified = true
      c.lastTestedAt = new Date()
      await this.repo.save(c)
      return { success: true, message: `Connected to ${c.provider} successfully.` }
    } catch (e: any) {
      c.isVerified = false
      await this.repo.save(c)
      this.logger.warn(`Storage test failed: ${e?.message}`)
      return { success: false, message: e?.message ?? 'Connection failed.' }
    }
  }

  async upload(file: MulterFile, folder = 'updates'): Promise<UploadedPhoto> {
    if (!file) throw new BadRequestException('No file provided.')
    if (!OK_MIME.test(file.mimetype) && !OK_EXT.test(file.originalname)) {
      throw new BadRequestException('Allowed file formats: PDF, Word (DOCX/DOC), Excel (XLSX/XLS/CSV), Text (TXT/MD), and Images.')
    }
    if (file.size > MAX_BYTES) throw new BadRequestException('File exceeds 50 MB limit.')

    const c = await this.getConfig()
    const provider = c?.provider ?? 'local'
    const key = `${folder}/${uuid()}${extname(file.originalname) || '.bin'}`

    if (provider === 'cloudinary' && c) {
      this.applyCloudinary(c)
      const isImage = /^image\//i.test(file.mimetype)
      const res = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            public_id: key.replace(/\.[^.]+$/, ''),
            resource_type: isImage ? 'image' : 'auto',
            overwrite: true,
          },
          (err, result) => (err ? reject(err) : resolve(result)),
        ).end(file.buffer)
      })
      return { url: res.secure_url || res.url, key: res.public_id }
    }

    if (provider === 's3' && c) {
      const s3 = this.buildS3(c)
      await s3.send(new PutObjectCommand({
        Bucket: c.s3Bucket, Key: key, Body: file.buffer,
        ContentType: file.mimetype, CacheControl: 'public, max-age=31536000',
      }))
      const base = (c.s3PublicBase || '').replace(/\/$/, '')
      return { url: `${base}/${key}`, key }
    }

    // local (dev fallback)
    const dest = join(LOCAL_DIR, key)
    await fs.mkdir(join(dest, '..'), { recursive: true })
    await fs.writeFile(dest, file.buffer)
    return { url: `${PUBLIC_URL}/uploads/${key}`, key }
  }

  private applyCloudinary(c: StorageConfig) {
    cloudinary.config({
      cloud_name: c.cloudName, api_key: c.cloudApiKey, api_secret: c.cloudApiSecret, secure: true,
    })
  }

  private buildS3(c: StorageConfig): S3Client {
    return new S3Client({
      region: c.s3Region || 'auto',
      endpoint: c.s3Endpoint || undefined,
      forcePathStyle: !!c.s3Endpoint, // R2 / Supabase / MinIO need path-style
      credentials: { accessKeyId: c.s3AccessKey, secretAccessKey: c.s3SecretKey },
    })
  }
}
