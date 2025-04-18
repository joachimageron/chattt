import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { LoginInput } from './dto/login.input';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    return this.usersService.validateUserPassword(email, password);
  }

  async login(loginInput: LoginInput, response: Response) {
    const { email, password } = loginInput;

    // Find user and validate password
    const user = await this.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const token = this.jwtService.sign(payload);

    // Set the JWT in an HTTP-only cookie
    console.log('Setting cookie...');
    response.cookie('access_token', token, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 3600000,
    });
    console.log(
      'Headers:',
      response.getHeaders ? response.getHeaders() : 'No getHeaders method',
    );

    return { user };
  }

  logout(response: Response) {
    // Clear the authentication cookie
    response.clearCookie('access_token');
    return { success: true };
  }
}
