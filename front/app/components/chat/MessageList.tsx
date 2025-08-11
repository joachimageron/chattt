"use client";
import React, { useRef, useEffect } from "react";
import { ScrollShadow, Spinner } from "@heroui/react";
import { ChatMessage } from "./socketClient";
import { MessageItem } from "./MessageItem";

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
        />
      ))}
      <div ref={bottomRef} />
    </ScrollShadow>
  );
}
