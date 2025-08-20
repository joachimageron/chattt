import { Field, ID, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class EditMessageInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;
}
