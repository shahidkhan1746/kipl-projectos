import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../shared/entities/base.entity';
import { LiaisonFile } from './liaison-file.entity';
import { User } from '../users/user.entity';

export const REVISIONS = ['R0','R1','R2','R3','R4','R5','R6','R7','R8','R9'];

@Entity('file_documents')
export class FileDocument extends BaseEntity {
  @ManyToOne(() => LiaisonFile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: LiaisonFile;

  @Column({ name: 'file_id' })
  fileId: string;

  @Column({ name: 'document_name', nullable: true })
  documentName: string;

  // R0 = first submission, R1 = first revision, etc.
  @Column({ length: 5, default: 'R0' })
  revision: string;

  // Cloudinary URL — permanent download link
  @Column({ name: 'cloudinary_url', type: 'text' })
  cloudinaryUrl: string;

  @Column({ name: 'cloudinary_public_id', nullable: true })
  cloudinaryPublicId: string;

  @Column({ name: 'file_size_bytes', nullable: true })
  fileSizeBytes: number;

  @Column({ name: 'mime_type', nullable: true })
  mimeType: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @Column({ name: 'uploaded_by' })
  uploadedById: string;

  // Only one revision is current at a time
  @Column({ name: 'is_current_revision', default: true })
  isCurrentRevision: boolean;

  @Column({ name: 'uploaded_at', default: () => 'NOW()' })
  uploadedAt: Date;
}
