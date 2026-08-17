import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'

@Entity('ai_chat_sessions')
export class AiChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ default: 'New Chat' })
  title: string

  @Column({ nullable: true })
  userId: string

  @Column({ nullable: true })
  projectId: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
