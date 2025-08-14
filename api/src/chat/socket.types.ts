import { Socket } from 'socket.io';
import { User } from '../users/entities/user.entity';

// Shared augmented socket type used across gateway, adapter and handlers
export interface AuthedSocket extends Socket {
  data: { user?: User; joinedRooms?: Set<string> };
}
