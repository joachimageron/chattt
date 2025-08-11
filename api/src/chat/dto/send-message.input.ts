import { Field, ID, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
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
  content: string;

  @Field(() => MessageType, { defaultValue: MessageType.TEXT })
  @IsEnum(MessageType)
  type: MessageType = MessageType.TEXT;
}
