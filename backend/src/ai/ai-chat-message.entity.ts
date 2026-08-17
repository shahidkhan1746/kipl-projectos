import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { AiChatSession } from './ai-chat-session.entity'

@Entity('ai_chat_messages')
export class AiChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  sessionId: string

  @ManyToOne(() => AiChatSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: AiChatSession

  @Column({ type: 'varchar' }) // 'user' | 'model'
  role: string

  @Column({ type: 'text' })
  content: string

  @CreateDateColumn()
  createdAt: Date
}
