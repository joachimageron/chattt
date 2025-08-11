import { Field, InputType } from '@nestjs/graphql';
import {
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { ConversationType } from '../entities/conversation.entity';

@InputType()
export class CreateConversationInput {
  @Field(() => [String], {
    description: 'Other participant user IDs (exclude current user)',
  })
  @IsArray()
  @ArrayMinSize(1)
  participantUserIds: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field(() => ConversationType, {
    nullable: true,
    defaultValue: ConversationType.DIRECT,
  })
  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType = ConversationType.DIRECT;
}
