"use client";
import React, {
  useRef,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { ScrollShadow, Spinner, Avatar, Tooltip } from "@heroui/react";
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
      {visible.map((m, idx) => {
        const readers = readersFor(m);
        // Grouping logic: group messages from same sender within 3 minutes
        const prev = idx > 0 ? visible[idx - 1] : undefined;
        const next = idx < visible.length - 1 ? visible[idx + 1] : undefined;
        const GROUP_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
        const sameAsPrev =
          prev &&
          prev.senderId === m.senderId &&
          Math.abs(
            new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime()
          ) <= GROUP_INTERVAL_MS;
        const sameAsNext =
          next &&
          next.senderId === m.senderId &&
          Math.abs(
            new Date(next.createdAt).getTime() - new Date(m.createdAt).getTime()
          ) <= GROUP_INTERVAL_MS;
        const showAvatar = !sameAsPrev; // only first in group
        const showTimestamp = !sameAsNext; // only last in group
        const isMine = user?.id === m.senderId;
        // Show readers under each last message block authored by current user (not just the final message of conversation)
        const showReaders =
          isGroupConversation && readers.length > 0 && isMine && !sameAsNext;
        const isLastOwn = m.id === lastOwnMessageId; // still used for status ticks
        const item = (
          <MessageItem
            key={m.id}
            message={m}
            onEdit={onEdit}
            onDelete={onDelete}
            showStatus={isLastOwn}
            showAvatar={showAvatar}
            showTimestamp={showTimestamp}
            compactAbove={sameAsPrev}
          />
        );
        return (
          <div key={m.id} className="relative">
            {item}
            {showReaders && (
              <div className="flex flex-row flex-wrap gap-0.5 justify-end pr-8 mt-0.5 max-w-[60%] ml-auto">
                {readers.slice(0, 6).map((r) => (
                  <Avatar
                    key={r.userId}
                    size="sm"
                    title={r.name}
                    name={r.initials}
                    className="w-5 h-5 min-w-5 min-h-5 text-[8px] ring-1 ring-default-200 shrink-0"
                  />
                ))}
                {readers.length > 6 && (
                  <Tooltip
                    content={readers
                      .slice(6)
                      .map((r) => r.name)
                      .join(", ")}
                  >
                    <span className="text-[9px] px-1 rounded-full bg-content2 text-default-500 cursor-default select-none">
                      +{readers.length - 6}
                    </span>
                  </Tooltip>
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
