import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

// Normalised error codes for websocket payloads
export enum ChatErrorCode {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  RATE_LIMITED = 'RATE_LIMITED',
  NOT_PARTICIPANT = 'NOT_PARTICIPANT',
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  EDIT_WINDOW_EXPIRED = 'EDIT_WINDOW_EXPIRED',
  DELETE_WINDOW_EXPIRED = 'DELETE_WINDOW_EXPIRED',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  CONVERSATION_NOT_FOUND = 'CONVERSATION_NOT_FOUND',
  FORBIDDEN = 'FORBIDDEN',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

export interface ChatErrorPayload {
  code: ChatErrorCode;
  message: string;
  context?: string; // message|general|custom
  data?: Record<string, unknown>;
}

// Lightweight heuristics mapping exceptions/messages to a code
export function mapErrorToChatError(
  err: unknown,
  context: string,
  extra?: Record<string, unknown>,
): ChatErrorPayload {
  const defaultPayload: ChatErrorPayload = {
    code: ChatErrorCode.UNKNOWN,
    message: 'unexpected_error',
    context,
    data: extra,
  };
  if (!err) return defaultPayload;
  let message = 'error';
  if (err && typeof err === 'object' && 'message' in err) {
    const maybe = (err as { message?: unknown }).message;
    if (typeof maybe === 'string' && maybe.trim()) message = maybe;
  }

  // Specific textual hints first (cheap & explicit)
  if (typeof message === 'string') {
    if (message.includes('rate limit'))
      return {
        code: ChatErrorCode.RATE_LIMITED,
        message,
        context,
        data: extra,
      };
    if (message === 'Message too long')
      return {
        code: ChatErrorCode.MESSAGE_TOO_LONG,
        message: 'message_too_long',
        context,
        data: extra,
      };
    if (message === 'Edit window expired')
      return {
        code: ChatErrorCode.EDIT_WINDOW_EXPIRED,
        message: 'edit_window_expired',
        context,
        data: extra,
      };
    if (message === 'Delete window expired')
      return {
        code: ChatErrorCode.DELETE_WINDOW_EXPIRED,
        message: 'delete_window_expired',
        context,
        data: extra,
      };
    if (message === 'Message not found')
      return {
        code: ChatErrorCode.MESSAGE_NOT_FOUND,
        message: 'message_not_found',
        context,
        data: extra,
      };
    if (message === 'Conversation not found')
      return {
        code: ChatErrorCode.CONVERSATION_NOT_FOUND,
        message: 'conversation_not_found',
        context,
        data: extra,
      };
    if (message === 'Not a participant in this conversation')
      return {
        code: ChatErrorCode.NOT_PARTICIPANT,
        message: 'not_participant',
        context,
        data: extra,
      };
  }

  // Class based mapping
  if (err instanceof UnauthorizedException)
    return {
      code: ChatErrorCode.UNAUTHENTICATED,
      message: 'unauthenticated',
      context,
      data: extra,
    };
  if (err instanceof ForbiddenException)
    return {
      code: ChatErrorCode.FORBIDDEN,
      message: 'forbidden',
      context,
      data: extra,
    };
  if (err instanceof NotFoundException)
    return {
      code: ChatErrorCode.VALIDATION,
      message: 'not_found',
      context,
      data: extra,
    };
  if (err instanceof BadRequestException)
    return {
      code: ChatErrorCode.VALIDATION,
      message: 'bad_request',
      context,
      data: extra,
    };

  return { ...defaultPayload, message: message || defaultPayload.message };
}
