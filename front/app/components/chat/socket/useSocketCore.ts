"use client";
import { useEffect, useRef } from "react";
import { getSocket } from "../socketClient";
// Core socket helpers: connection + generic event subscription

export function useSocketCore(enabled: boolean, onConnect?: () => void) {
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    socketRef.current = socket;
    if (onConnect) socket.on("connect", onConnect);
    return () => {
      if (onConnect) socket.off("connect", onConnect);
    };
  }, [enabled, onConnect]);
  return socketRef;
}

export function useSocketEvent<T = unknown>(
  event: string,
  handler: (payload: T) => void,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    socket.on(event, handler as (...args: unknown[]) => void);
    return () => {
      socket.off(event, handler as (...args: unknown[]) => void);
    };
  }, [event, handler, enabled]);
}

export function emit(event: string, payload?: unknown) {
  const socket = getSocket();
  socket.emit(event, payload);
}
