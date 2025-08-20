import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Message } from './message.entity';
import { ConversationParticipant } from './conversation-participant.entity';

export enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
}

registerEnumType(ConversationType, { name: 'ConversationType' });

@ObjectType()
@Entity('conversations')
@Index(['type', 'createdAt'])
export class Conversation {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ConversationType)
  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  type: ConversationType;

  @Field({ nullable: true })
  @Column({ nullable: true })
  title?: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Message, (m: Message) => m.conversation)
  messages: Message[];

  @OneToMany(
    () => ConversationParticipant,
    (p: ConversationParticipant) => p.conversation,
    {
      cascade: true,
    },
  )
  participants: ConversationParticipant[];
}
