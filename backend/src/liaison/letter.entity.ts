import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../shared/entities/base.entity';
import { Project } from '../projects/project.entity';
import { LiaisonFile } from './liaison-file.entity';
import { User } from '../users/user.entity';

export enum LetterType {
  OUTGOING = 'outgoing',
  INCOMING = 'incoming',
  INTERNAL = 'internal',
}

export enum LetterStatus {
  DRAFT      = 'draft',
  GENERATED  = 'generated',  // PDF created
  DISPATCHED = 'dispatched', // Sent via email
}

@Entity('letters')
export class Letter extends BaseEntity {
  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => LiaisonFile, { nullable: true })
  @JoinColumn({ name: 'file_id' })
  file: LiaisonFile;

  @Column({ name: 'file_id', nullable: true })
  fileId: string;

  // Auto-generated: KIPL/LETTER/2026/0001
  @Column({ name: 'letter_number', unique: true, nullable: true })
  letterNumber: string;

  @Column({ name: 'letter_type', type: 'enum', enum: LetterType, default: LetterType.OUTGOING })
  letterType: LetterType;

  @Column({ name: 'to_name', nullable: true })
  toName: string;

  @Column({ name: 'to_organization', nullable: true })
  toOrganization: string;

  @Column({ name: 'to_email', nullable: true })
  toEmail: string;

  @Column({ type: 'text', nullable: true })
  subject: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'signed_by' })
  signedBy: User;

  @Column({ name: 'signed_by', nullable: true })
  signedById: string;

  // Cloudinary URL for generated PDF
  @Column({ name: 'pdf_url', nullable: true })
  pdfUrl: string;

  @Column({ name: 'pdf_public_id', nullable: true })
  pdfPublicId: string;

  @Column({ type: 'enum', enum: LetterStatus, default: LetterStatus.DRAFT })
  status: LetterStatus;

  // Gmail integration
  @Column({ name: 'dispatched_at', nullable: true })
  dispatchedAt: Date;

  @Column({ name: 'gmail_message_id', nullable: true })
  gmailMessageId: string;

  @Column({ name: 'email_subject', nullable: true })
  emailSubject: string;
}
