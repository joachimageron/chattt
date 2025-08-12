"use client";
import React, { useRef, useEffect, useMemo } from "react";
import { ScrollShadow, Spinner } from "@heroui/react";
import { ChatMessage } from "./socketClient";
import { MessageItem } from "./MessageItem";
import { useAuth } from "../providers/AuthProvider";

interface MessageListProps {
  messages: ChatMessage[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

export function MessageList({
  messages,
  onEdit,
  onDelete,
  loading,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();

  // ID du dernier message envoyé par l'utilisateur courant (non supprimé)
  const lastOwnMessageId = useMemo(() => {
    if (!user) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.senderId === user.id) return m.id;
    }
    return null;
  }, [messages, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <ScrollShadow className="flex-1 p-4 space-y-2 overflow-y-auto">
      {loading && (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      )}
      {messages.map((m) => (
        <MessageItem
          key={m.id}
          message={m}
          onEdit={onEdit}
          onDelete={onDelete}
          showStatus={m.id === lastOwnMessageId}
        />
      ))}
      <div ref={bottomRef} />
    </ScrollShadow>
  );
}
