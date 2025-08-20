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

  /**
   * Deprecated: use cursor. Still accepted for backward compatibility.
   */
  @Field({ nullable: true, description: 'Deprecated: use cursor instead' })
  @IsOptional()
  @IsString()
  before?: string;

  /**
   * Backward pagination cursor: ISO date (createdAt of oldest currently loaded message)
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cursor?: string;

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
