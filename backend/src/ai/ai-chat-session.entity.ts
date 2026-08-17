import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('ai_chat_sessions')
export class AiChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', default: 'New Chat' })
  title: string

  @Column({ type: 'varchar', nullable: true })
  userId?: string

  @Column({ type: 'varchar', nullable: true })
  projectId?: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
