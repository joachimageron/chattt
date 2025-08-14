// Central list of WebSocket event names for the chat namespace
// Using const object for direct string values and type inference.
export const ChatEvents = {
  // Client -> Server
  PING: 'ping',
  ROOM_JOIN: 'room.join',
  ROOM_LEAVE: 'room.leave',
  MESSAGE_SEND: 'message.send',
  MESSAGE_LOAD: 'message.load',
  MESSAGE_DELIVERED: 'message.delivered',
  MESSAGE_READ: 'message.read',
  MESSAGE_EDIT: 'message.edit',
  MESSAGE_DELETE: 'message.delete',
  REACTION_ADD: 'reaction.add',
  REACTION_REMOVE: 'reaction.remove',
  CONVERSATION_LIST: 'conversation.list',
  CONVERSATION_CREATE: 'conversation.create',
  CONVERSATION_TITLE_UPDATE: 'conversation.title.update',
  TYPING_START: 'typing.start',
  TYPING_STOP: 'typing.stop',

  // Server -> Client
  PONG: 'pong',
  ROOM_JOINED: 'room.joined',
  ROOM_LEFT: 'room.left',
  MESSAGE_NEW: 'message.new',
  MESSAGE_SENT: 'message.sent',
  MESSAGE_LIST: 'message.list',
  MESSAGE_UPDATED: 'message.updated',
  MESSAGE_DELETED: 'message.deleted',
  REACTION_ADDED: 'reaction.added',
  REACTION_REMOVED: 'reaction.removed',
  MESSAGE_ERROR: 'message.error',
  CONVERSATION_LIST_DATA: 'conversation.list',
  CONVERSATION_CREATED: 'conversation.created',
  CONVERSATION_UPDATED: 'conversation.updated',
  PARTICIPANT_READ: 'participant.read',
  TYPING_STARTED: 'typing.started',
  TYPING_STOPPED: 'typing.stopped',
  ERROR: 'error',
} as const;

export type ChatEventName = (typeof ChatEvents)[keyof typeof ChatEvents];
