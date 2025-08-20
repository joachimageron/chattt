"use client";
import React, { useMemo } from "react";
import { ChatMessage } from "./socketClient";
import {
  Avatar,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  DropdownTrigger,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@heroui/react";
import { useAuth } from "../providers/AuthProvider";
import { getSocket } from "./socketClient";
import { ChatEvents } from "./events";
import { aggregateReactions, canEditMessage } from "./utils";
import { MessageReactions } from "./MessageReactions";

interface MessageItemProps {
  message: ChatMessage;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  showStatus?: boolean;
  showAvatar?: boolean; // afficher avatar (premier message d'un groupe)
  showTimestamp?: boolean; // afficher timestamp (dernier message d'un groupe)
  compactAbove?: boolean; // message collé au précédent (même groupe)
  onResend?: (id: string) => void;
}

export function MessageItem({
  message,
  onEdit,
  onDelete,
  showStatus,
  showAvatar = true,
  showTimestamp = true,
  compactAbove,
  onResend,
}: MessageItemProps) {
  const { user } = useAuth();
  const isMine = user?.id === message.senderId;

  const conversationId = message.conversationId;
  const myUserId = user?.id;
  const reactionsAggregated = useMemo(
    () => aggregateReactions(message.reactions, myUserId),
    [message.reactions, myUserId]
  );

  const toggleReaction = (emoji: string) => {
    const mine = reactionsAggregated.find((r) => r.emoji === emoji)?.mine;
    const socket = getSocket();
    socket.emit(mine ? ChatEvents.REACTION_REMOVE : ChatEvents.REACTION_ADD, {
      conversationId,
      messageId: message.id,
      emoji,
    });
  };

  const quickEmojis = ["👍", "❤️", "😂", "🔥", "😮", "😢", "👏", "✅"]; // simple set

  const timeLabel = useMemo(() => {
    try {
      return new Date(message.createdAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, [message.createdAt]);

  const content = useMemo(() => {
    if (message.isDeleted)
      return <span className="italic text-default-400">Message supprimé</span>;
    return (
      <span>
        {message.content}
        {message._optimistic && !message._error && (
          <span className="ml-2 text-[10px] text-default-400">(envoi…)</span>
        )}
        {message._error && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onResend?.(message.id);
            }}
            className="ml-2 text-[10px] text-danger underline"
            title={message._error}
          >
            Réessayer
          </button>
        )}
      </span>
    );
  }, [
    message.isDeleted,
    message.content,
    message._optimistic,
    message._error,
    message.id,
    onResend,
  ]);

  const canEditDelete = useMemo(
    () => canEditMessage(message, user?.id),
    [message, user?.id]
  );

  const statusPopover = showStatus ? (
    <Popover placement="top" showArrow>
      <PopoverTrigger>
        <span className="inline-block text-[13px] cursor-pointer select-none">
          {message.status === "SENT" && "✓"}
          {message.status === "DELIVERED" && "✓✓"}
          {message.status === "READ" && (
            <span className="text-primary-500">✓✓</span>
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent className="px-2 py-1">
        <div className="text-[10px] whitespace-pre-line">
          {(() => {
            const parts: string[] = [];
            if (message.deliveredAt)
              parts.push(
                `Livré: ${new Date(message.deliveredAt).toLocaleTimeString()}`
              );
            if (message.readAt)
              parts.push(
                `Lu: ${new Date(message.readAt).toLocaleTimeString()}`
              );
            if (!parts.length) parts.push("Envoyé");
            return parts.join("\n");
          })()}
        </div>
      </PopoverContent>
    </Popover>
  ) : null;

  return (
    <div
      className={`group flex gap-2 ${
        isMine ? "justify-end" : "justify-start"
      } ${compactAbove ? "-mt-2" : ""}`}
    >
      {!isMine &&
        (showAvatar ? (
          <Avatar
            size="sm"
            name={
              message.sender?.name || message.sender?.email || message.senderId
            }
          />
        ) : (
          <div className="w-8" aria-hidden />
        ))}
      {isMine ? (
        <div className="flex flex-col items-end">
          <div className="flex flex-row items-start gap-2">
            <Dropdown placement="left-start">
              <DropdownTrigger>
                <div
                  className={`relative max-w-xs rounded-medium px-3 py-2 text-sm cursor-pointer transition-colors bg-content2 hover:bg-content3 shadow-sm border border-transparent group-hover:border-default-200 ${
                    isMine ? "bg-primary-500/10" : ""
                  } ${compactAbove ? "rounded-tr-sm" : ""}`}
                >
                  {content}
                  {!message.isDeleted && message.editedAt && (
                    <span className="ml-2 text-[10px] text-default-400">
                      (édité)
                    </span>
                  )}
                  <MessageReactions
                    aggregates={reactionsAggregated}
                    onToggle={toggleReaction}
                  />
                </div>
              </DropdownTrigger>
              {!message.isDeleted && (
                <DropdownMenu
                  aria-label="Actions message"
                  variant="flat"
                  disabledKeys={(() => {
                    const d: string[] = [];
                    if (!canEditDelete) d.push("edit", "delete");
                    return d;
                  })()}
                >
                  <DropdownItem
                    key="reactions"
                    isReadOnly
                    className="cursor-default opacity-100 !py-2 !px-2"
                    textValue="Réactions"
                  >
                    <div className="flex flex-wrap gap-1">
                      {quickEmojis.map((e) => {
                        const mine = reactionsAggregated.find(
                          (r) => r.emoji === e
                        )?.mine;
                        return (
                          <button
                            key={e}
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              toggleReaction(e);
                            }}
                            className={`w-8 h-8 text-lg flex items-center justify-center rounded-medium border transition-colors hover:bg-content3 ${
                              mine
                                ? "bg-primary-500/20 border-primary-400"
                                : "bg-content2 border-default-300"
                            }`}
                            title={mine ? "Retirer" : "Ajouter"}
                          >
                            {e}
                          </button>
                        );
                      })}
                    </div>
                  </DropdownItem>
                  <DropdownItem key="edit" onPress={() => onEdit?.(message.id)}>
                    Éditer
                  </DropdownItem>
                  <DropdownItem
                    key="delete"
                    className="text-danger"
                    color="danger"
                    onPress={() => onDelete?.(message.id)}
                  >
                    Supprimer
                  </DropdownItem>
                </DropdownMenu>
              )}
            </Dropdown>
            {showAvatar ? (
              <Avatar
                size="sm"
                name={
                  message.sender?.name ||
                  message.sender?.email ||
                  message.senderId
                }
              />
            ) : (
              <div className="w-8" aria-hidden />
            )}
          </div>
          {showTimestamp && (
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-default-400 select-none mr-12">
              <span title={new Date(message.createdAt).toLocaleString()}>
                {timeLabel}
              </span>
              {statusPopover}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col mt-1">
          <Popover placement="top" showArrow>
            <PopoverTrigger>
              <div
                className={`max-w-xs rounded-medium px-3 py-2 text-sm bg-content2 shadow-sm border border-transparent cursor-pointer hover:bg-content3 ${
                  message.isDeleted
                    ? "bg-transparent cursor-default hover:bg-transparent"
                    : ""
                } ${compactAbove ? "rounded-tl-sm" : ""}`}
              >
                {content}
                {!message.isDeleted && message.editedAt && (
                  <span className="ml-2 text-[10px] text-default-400">
                    (édité)
                  </span>
                )}
                <MessageReactions
                  aggregates={reactionsAggregated}
                  onToggle={toggleReaction}
                  small
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="p-2 flex flex-row gap-1">
              {quickEmojis.map((e) => {
                const mine = reactionsAggregated.find(
                  (r) => r.emoji === e
                )?.mine;
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      toggleReaction(e);
                    }}
                    className={`w-8 h-8 text-lg flex items-center justify-center rounded-medium border transition-colors hover:bg-content3 ${
                      mine
                        ? "bg-primary-500/20 border-primary-400"
                        : "bg-content2 border-default-300"
                    }`}
                    title={mine ? "Retirer" : "Ajouter"}
                  >
                    {e}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
          {showTimestamp && (
            <div
              className="mt-auto ml-1 self-start text-[11px] text-default-400 select-none"
              title={new Date(message.createdAt).toLocaleString()}
            >
              {timeLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
