import { Field, ID, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class JoinRoomInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  conversationId: string;
}
