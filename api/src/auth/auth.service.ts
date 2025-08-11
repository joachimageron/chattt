import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { LoginInput } from './dto/login.input';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { Repository } from 'typeorm';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, createHash } from 'crypto';
import { MailService } from './mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(PasswordResetToken)
    private prtRepository: Repository<PasswordResetToken>,
    private mailService: MailService,
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
    response.cookie('access_token', token, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 3600000,
    });

    return { user };
  }

  logout(response: Response) {
    response.clearCookie('access_token');
    return { success: true };
  }

  // Initiate password reset process (no info leak)
  async initiatePasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Return silently to avoid leaking user existence
      return true;
    }

    // Create token raw & hash
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    // Invalidate previous tokens for this user
    await this.prtRepository.delete({ userId: user.id });

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const prt = this.prtRepository.create({
      tokenHash,
      expiresAt,
      userId: user.id,
      used: false,
    });
    await this.prtRepository.save(prt);

    // Send email with raw token
    await this.mailService.sendPasswordResetEmail(user.email, rawToken);
    return true;
  }

  async resetPassword(rawToken: string, newPassword: string) {
    if (!rawToken) throw new BadRequestException('Token required');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const record = await this.prtRepository.findOne({ where: { tokenHash } });
    if (!record) throw new NotFoundException('Invalid token');
    if (record.used) throw new BadRequestException('Token already used');
    if (record.expiresAt.getTime() < Date.now()) {
      await this.prtRepository.delete({ id: record.id });
      throw new BadRequestException('Token expired');
    }

    const user = await this.usersService.findOne(record.userId);
    if (!user) throw new NotFoundException('User not found');

    await this.usersService.updatePassword(user.id, newPassword);

    // Mark token used
    record.used = true;
    await this.prtRepository.save(record);

    // Clean up other tokens for user
    await this.prtRepository.delete({ userId: user.id, used: true });

    return true;
  }
}
