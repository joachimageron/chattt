import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions, Socket } from 'socket.io';
import * as cookie from 'cookie';
import * as jwt from 'jsonwebtoken';
import { UsersService } from '../../users/users.service';

interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

interface AuthedSocket extends Socket {
  data: { user?: unknown };
}

export class AuthenticatedSocketIoAdapter extends IoAdapter {
  private readonly logger = new Logger(AuthenticatedSocketIoAdapter.name);
  private usersService: UsersService;

  constructor(private app: INestApplicationContext) {
    super(app);
    this.usersService = this.app.get(UsersService, { strict: false });
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;

    const authMiddleware = (
      socket: AuthedSocket,
      next: (err?: Error) => void,
    ) => {
      (async () => {
        try {
          const token = this.extractToken(socket);
          if (!token) {
            return next(new Error('Unauthorized: No token'));
          }
          const secret = process.env.JWT_SECRET || 'testSecret';
          let decoded: JwtPayload;
          try {
            decoded = jwt.verify(token, secret) as JwtPayload;
          } catch {
            return next(new Error('Unauthorized: Invalid token'));
          }
          const user = await this.usersService.findOne(decoded.sub);
          if (!user) {
            return next(new Error('Unauthorized: User not found'));
          }
          socket.data.user = user;
          return next();
        } catch (e) {
          this.logger.error('Auth middleware error', e as Error);
          return next(new Error('Internal server error'));
        }
      })().catch((e) => {
        this.logger.error('Unexpected auth error', e as Error);
        next(new Error('Internal server error'));
      });
    };

    // Apply to root namespace (if ever used)
    server.use(authMiddleware);
    // Ensure applied to /chat namespace explicitly
    server.of('/chat').use(authMiddleware);

    return server;
  }

  private extractToken(socket: Socket): string | undefined {
    const handshake = socket.handshake as {
      headers: Record<string, unknown>;
    };
    const headers = handshake.headers;

    const authHeader = (headers['authorization'] ||
      headers['Authorization']) as string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring('Bearer '.length).trim();
    }

    const cookieHeader = headers.cookie as string | undefined;
    if (cookieHeader) {
      try {
        const parsed: Record<string, string> = (
          cookie as { parse: (c: string) => Record<string, string> }
        ).parse(cookieHeader);
        if (parsed.access_token) return parsed.access_token;
      } catch {
        // ignore cookie parse errors
      }
    }

    return undefined;
  }
}
