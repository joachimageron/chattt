"use client";
import React, {
  useRef,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  ScrollShadow,
  Spinner,
  Avatar,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@heroui/react";
import { ChatMessage } from "./socketClient";
import { MessageItem } from "./MessageItem";
import { useAuth } from "../providers/AuthProvider";
import { useChat } from "./ChatContext";

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
  const chat = useChat();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Virtualisation simple basée sur hauteur approximative (lineHeight ~ 40px)
  const EST_ITEM_HEIGHT = 56; // estimation moyenne message (px)
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const onScroll = useCallback(() => {
    if (!containerRef.current) return;
    setScrollTop(containerRef.current.scrollTop);
    setViewportHeight(containerRef.current.clientHeight);
  }, []);

  useEffect(() => {
    onScroll();
  }, [messages.length, onScroll]);

  // ID du dernier message envoyé par l'utilisateur courant (non supprimé)
  const lastOwnMessageId = useMemo(() => {
    if (!user) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.senderId === user.id) return m.id;
    }
    return null;
  }, [messages, user]);

  // Calcul fenêtre
  const total = messages.length;
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / EST_ITEM_HEIGHT) - 5 // buffer
  );
  const endIndex = Math.min(
    total,
    Math.ceil((scrollTop + viewportHeight) / EST_ITEM_HEIGHT) + 5
  );
  const visible = messages.slice(startIndex, endIndex);
  const padTop = startIndex * EST_ITEM_HEIGHT;
  const padBottom = (total - endIndex) * EST_ITEM_HEIGHT;

  // Participants qui ont lu: pour chaque message on montrera avatars des lecteurs
  const participants = useMemo(
    () =>
      chat.activeConversationId
        ? chat.conversations[chat.activeConversationId]?.participants || []
        : [],
    [chat.activeConversationId, chat.conversations]
  );
  const isGroupConversation = useMemo(
    () =>
      chat.activeConversationId
        ? chat.conversations[chat.activeConversationId]?.type === "GROUP"
        : false,
    [chat.activeConversationId, chat.conversations]
  );

  const readersFor = useCallback(
    (msg: ChatMessage) => {
      if (!participants.length)
        return [] as { userId: string; initials: string; name: string }[];
      return participants
        .filter(
          (p) =>
            p.userId !== msg.senderId &&
            p.lastReadAt &&
            new Date(p.lastReadAt) >= new Date(msg.createdAt)
        )
        .map((p) => ({
          userId: p.userId,
          initials: p.user?.name?.[0] || p.user?.email?.[0] || "U",
          name: p.user?.name || p.user?.email || p.userId,
        }));
    },
    [participants]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <ScrollShadow
      ref={(el) => {
        // el peut être HTMLDivElement ou null
        containerRef.current = el as HTMLDivElement | null;
      }}
      onScroll={onScroll}
      className="flex-1 p-4 space-y-2 overflow-y-auto relative"
    >
      {loading && (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      )}
      <div style={{ height: padTop }} />
      {visible.map((m) => {
        const isLastOwn = m.id === lastOwnMessageId;
        const readers = readersFor(m);
        const showReaders =
          isGroupConversation && readers.length > 0 && isLastOwn;
        const tooltipContent = () => {
          const parts: string[] = [];
          if (m.deliveredAt)
            parts.push(
              `Livré: ${new Date(m.deliveredAt).toLocaleTimeString()}`
            );
          if (m.readAt)
            parts.push(`Lu: ${new Date(m.readAt).toLocaleTimeString()}`);
          return parts.join("\n") || "Envoyé";
        };
        const item = (
          <MessageItem
            key={m.id}
            message={m}
            onEdit={onEdit}
            onDelete={onDelete}
            showStatus={isLastOwn}
          />
        );
        return (
          <div key={m.id} className="relative">
            <Popover placement="top" showArrow>
              <PopoverTrigger>
                <div>{item}</div>
              </PopoverTrigger>
              <PopoverContent className="px-2 py-1">
                <div className="text-[10px] whitespace-pre-line">
                  {tooltipContent()}
                </div>
              </PopoverContent>
            </Popover>
            {showReaders && (
              <div className="flex gap-0.5 justify-end pr-8 mt-0.5">
                {readers.slice(0, 5).map((r) => (
                  <Avatar
                    key={r.userId}
                    size="sm"
                    title={r.name}
                    name={r.initials}
                    className="w-5 h-5 min-w-5 min-h-5 text-[8px] ring-1 ring-default-200"
                  />
                ))}
                {readers.length > 5 && (
                  <span className="text-[8px] text-default-400 align-middle">
                    +{readers.length - 5}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ height: padBottom }} />
      <div ref={bottomRef} />
    </ScrollShadow>
  );
}
