import { InputType, Field } from '@nestjs/graphql';
import { IsEmail } from 'class-validator';

@InputType()
export class ForgotPasswordInput {
  @Field()
  @IsEmail()
  email: string;
}
