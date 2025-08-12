import { Field, InputType, ID } from '@nestjs/graphql';
import { IsString, IsUUID, Length } from 'class-validator';

@InputType()
export class UpdateConversationTitleInput {
  @Field(() => ID)
  @IsUUID()
  conversationId: string;

  @Field()
  @IsString()
  @Length(1, 120)
  title: string;
}
