import { Field, ID, InputType, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

@InputType()
export class LoadMessagesInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  // Cursor = ISO date string (createdAt of the oldest currently loaded message) to fetch older messages
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  before?: string;

  @Field(() => Int, {
    nullable: true,
    description: 'Number of messages to load (default 30, max 100)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
