import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { User } from '../users/entities/user.entity';

// augment Socket type locally
interface AuthedSocket extends Socket {
  data: { user?: User };
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: AuthedSocket) {
    const user = client.data.user;
    this.logger.log(
      `Client connected: ${client.id}${user ? ' user=' + user.email : ''}`,
    );
  }

  handleDisconnect(client: AuthedSocket) {
    const user = client.data.user;
    this.logger.log(
      `Client disconnected: ${client.id}${user ? ' user=' + user.email : ''}`,
    );
  }

  @SubscribeMessage('ping')
  handlePing(client: AuthedSocket) {
    this.logger.log(
      `Received ping from ${client.data.user?.email || 'unknown user'}`,
    );
    const user = client.data.user;
    client.emit('pong', { message: 'pong', userId: user?.email });
  }
}
