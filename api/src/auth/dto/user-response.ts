import { ObjectType, Field } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';

@ObjectType()
export class UserResponse {
  @Field(() => User)
  user: User;
}
