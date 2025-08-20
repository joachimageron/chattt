import { Field, ID, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class DeleteMessageInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  conversationId: string;
}
