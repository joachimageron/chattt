import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  Index,
} from 'typeorm';
import { Message } from './message.entity';
import { User } from '../../users/entities/user.entity';

@ObjectType()
@Entity('message_reactions')
@Unique(['messageId', 'userId', 'emoji'])
@Index(['messageId'])
@Index(['userId'])
// Optimise ordered fetch per message (add/remove operations re-fetch sorted list)
@Index(['messageId', 'createdAt'])
export class MessageReaction {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  messageId: string;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: Message;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Field()
  @Column({ length: 32 })
  emoji: string; // raw unicode or short-code

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
