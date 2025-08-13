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

  // Map messageId -> list of participants (excluding current user) for whom THIS message
  // is the latest outgoing message (from the current user) they have seen.
  const readersMap = useMemo(() => {
    if (!user?.id || !participants.length || !messages.length)
      return {} as Record<
        string,
        { userId: string; initials: string; name: string }[]
      >;
    const map: Record<
      string,
      { userId: string; initials: string; name: string }[]
    > = {};
    // Traverse participants and find for each their last seen message authored by current user.
    const ordered = [...messages]; // messages already sorted asc
    for (const p of participants) {
      if (p.userId === user.id) continue; // skip self
      if (!p.lastReadAt) continue;
      const lastReadTime = new Date(p.lastReadAt).getTime();
      // Walk from end until we find one of MY messages created before or at lastReadAt
      for (let i = ordered.length - 1; i >= 0; i--) {
        const msg = ordered[i];
        if (msg.senderId !== user.id) continue; // only outgoing
        const msgTime = new Date(msg.createdAt).getTime();
        if (msgTime <= lastReadTime) {
          const entry = {
            userId: p.userId,
            initials: p.user?.name?.[0] || p.user?.email?.[0] || "U",
            name: p.user?.name || p.user?.email || p.userId,
          };
          // Avoid duplicates in case multiple participants map to same message
          if (!map[msg.id]) map[msg.id] = [entry];
          else map[msg.id].push(entry);
          break;
        }
      }
    }
    return map;
  }, [messages, participants, user?.id]);

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
        const readers = readersMap[m.id] || [];
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
            showStatus={!isGroupConversation && isLastOwn}
            showAvatar={showAvatar}
            showTimestamp={showTimestamp}
            compactAbove={sameAsPrev}
          />
        );
        return (
          <div key={m.id} className="relative">
            {item}
            {showReaders && (
              <div className="flex flex-row flex-wrap gap-0.5 justify-end mt-0.5 max-w-[60%] ml-auto">
                {readers.slice(0, 6).map((r) => (
                  <Avatar
                    key={r.userId}
                    size="sm"
                    title={r.name}
                    name={r.initials}
                    className="w-4 h-4 text-[8px] ring-1 ring-default-200 shrink-0 ml-[2px]"
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
