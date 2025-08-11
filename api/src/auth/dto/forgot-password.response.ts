import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class ForgotPasswordResponse {
  @Field()
  success: boolean;
}
