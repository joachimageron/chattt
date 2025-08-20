import { Field, ID, InputType } from '@nestjs/graphql';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class MarkReadInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @Field(() => [ID])
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  messageIds: string[];
}
