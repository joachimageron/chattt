import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Conversation } from './conversation.entity';

export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
}
registerEnumType(MessageType, { name: 'MessageType' });

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}
registerEnumType(MessageStatus, { name: 'MessageStatus' });

@ObjectType()
@Entity('messages')
@Index(['conversationId', 'createdAt'])
@Index(['senderId', 'createdAt'])
// Support queries filtering by conversation and status (e.g., marking delivered/read in batches)
@Index(['conversationId', 'status'])
// Support fetching edited/deleted changes if needed per conversation
@Index(['conversationId', 'updatedAt'])
export class Message {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ID)
  @Index()
  @Column()
  conversationId: string;

  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  @Field(() => Conversation, { nullable: true })
  conversation?: Conversation;

  @Field(() => ID)
  @Column()
  senderId: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Field(() => MessageType)
  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @Field()
  @Column('text')
  content: string;

  @Field(() => MessageStatus)
  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.SENT })
  status: MessageStatus;

  // Horodatage quand le message est marqué comme livré (tous les destinataires l'ont reçu ou au premier accusé selon la logique métier actuelle)
  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  // Horodatage quand le message est marqué comme lu
  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  editedAt?: Date;

  @Field({ defaultValue: false })
  @Column({ default: false })
  isDeleted: boolean;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
