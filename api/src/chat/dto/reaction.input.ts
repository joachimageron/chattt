import { Field, ID, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

@InputType()
export class ReactionInput {
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
  @IsNotEmpty()
  @MaxLength(32)
  emoji: string;
}
