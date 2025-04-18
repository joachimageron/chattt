import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { LoginResponse } from './dto/login-response';
import { LogoutResponse } from './dto/logout-response';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => LoginResponse)
  async login(
    @Args('loginInput') loginInput: LoginInput,
    @Context() context: { res: Response },
  ) {
    return this.authService.login(loginInput, context.res);
  }

  @Mutation(() => LogoutResponse)
  logout(@Context() context: { res: Response }) {
    return this.authService.logout(context.res);
  }

  // Other auth mutations...
}
