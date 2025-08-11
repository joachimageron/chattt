import { Body, Controller, Param, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ForgotPasswordInput } from './dto/forgot-password.input';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordInput) {
    await this.authService.initiatePasswordReset(body.email);
    return { success: true };
  }

  @Post('reset-password/:token')
  async resetPassword(
    @Param('token') token: string,
    @Body() body: { password: string },
  ) {
    await this.authService.resetPassword(token, body.password);
    return { success: true };
  }
}
