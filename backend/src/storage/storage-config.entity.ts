import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

// Which storage backend uploaded photos are pushed to.
// 's3' covers AWS S3, Cloudflare R2 and Supabase Storage (all S3-compatible).
export type StorageProvider = 'local' | 'cloudinary' | 's3'

@Entity('storage_configs')
export class StorageConfig extends BaseEntity {
  @Column({ default: 'local' }) provider: StorageProvider

  // Cloudinary
  @Column({ name: 'cloud_name', nullable: true }) cloudName: string
  @Column({ name: 'cloud_api_key', nullable: true }) cloudApiKey: string
  @Column({ name: 'cloud_api_secret', type: 'text', nullable: true }) cloudApiSecret: string

  // S3-compatible (AWS S3 / Cloudflare R2 / Supabase Storage)
  @Column({ name: 's3_endpoint', nullable: true }) s3Endpoint: string        // blank for AWS
  @Column({ name: 's3_region', default: 'auto' }) s3Region: string
  @Column({ name: 's3_bucket', nullable: true }) s3Bucket: string
  @Column({ name: 's3_access_key', nullable: true }) s3AccessKey: string
  @Column({ name: 's3_secret_key', type: 'text', nullable: true }) s3SecretKey: string
  // Base URL that publicly serves the bucket, e.g. https://cdn.kiplstpsrinagar.com or the R2/Supabase public URL
  @Column({ name: 's3_public_base', nullable: true }) s3PublicBase: string

  @Column({ name: 'is_active', default: true }) isActive: boolean
  @Column({ name: 'is_verified', default: false }) isVerified: boolean
  @Column({ name: 'last_tested_at', type: 'timestamptz', nullable: true }) lastTestedAt: Date | null
}
