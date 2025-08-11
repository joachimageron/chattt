import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class ResetPasswordResponse {
  @Field()
  success: boolean;
}
