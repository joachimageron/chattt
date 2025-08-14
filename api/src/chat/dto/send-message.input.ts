import { Field, ID, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { MessageType } from '../entities/message.entity';

@InputType()
export class SendMessageInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;

  @Field(() => MessageType, { defaultValue: MessageType.TEXT })
  @IsEnum(MessageType)
  type: MessageType = MessageType.TEXT;
}
