"use client";
import React, { useMemo } from "react";
import { ChatMessage } from "./socketClient";
import {
  Avatar,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  DropdownTrigger,
} from "@heroui/react";
import { useAuth } from "../providers/AuthProvider";

interface MessageItemProps {
  message: ChatMessage;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  showStatus?: boolean; // afficher les ticks uniquement sur le dernier message de l'utilisateur
}

export function MessageItem({
  message,
  onEdit,
  onDelete,
  showStatus,
}: MessageItemProps) {
  const { user } = useAuth();
  const isMine = user?.id === message.senderId;

  const content = useMemo(() => {
    if (message.isDeleted)
      return <span className="italic text-default-400">Message supprimé</span>;
    return <span>{message.content}</span>;
  }, [message]);

  const { canEdit, canDelete } = useMemo(() => {
    const res = { canEdit: false, canDelete: false };
    if (!isMine || message.isDeleted) return res;
    const created = new Date(message.createdAt).getTime();
    const within = Date.now() - created <= 15 * 60 * 1000; // 15 minutes
    res.canEdit = within;
    res.canDelete = within; // même fenêtre pour suppression
    return res;
  }, [isMine, message]);

  return (
    <div
      className={`group flex gap-2 ${isMine ? "justify-end" : "justify-start"}`}
    >
      {!isMine && (
        <Avatar
          size="sm"
          name={
            message.sender?.name || message.sender?.email || message.senderId
          }
        />
      )}
      {isMine ? (
        <Dropdown placement="left-start">
          <DropdownTrigger>
            <div
              className={`relative max-w-xs rounded-medium px-3 py-2 text-sm cursor-pointer transition-colors bg-content2 hover:bg-content3 shadow-sm border border-transparent group-hover:border-default-200 ${
                isMine ? "bg-primary-500/10" : ""
              }`}
            >
              {content}
              {!message.isDeleted && message.editedAt && (
                <span className="ml-2 text-[10px] text-default-400">
                  (édité)
                </span>
              )}
              {showStatus && (
                <span className="block mt-1 text-[10px] text-default-400 text-right select-none">
                  {message.status === "SENT" && "✓"}
                  {message.status === "DELIVERED" && "✓✓"}
                  {message.status === "READ" && (
                    <span className="text-primary-500">✓✓</span>
                  )}
                </span>
              )}
            </div>
          </DropdownTrigger>
          {!message.isDeleted && (
            <DropdownMenu
              aria-label="Actions message"
              variant="flat"
              disabledKeys={(() => {
                const disabled: string[] = [];
                if (!canEdit) disabled.push("edit");
                if (!canDelete) disabled.push("delete");
                return disabled;
              })()}
            >
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
      ) : (
        <div
          className={`max-w-xs rounded-medium px-3 py-2 text-sm bg-content2 shadow-sm border border-transparent ${
            message.isDeleted ? "bg-transparent" : ""
          }`}
        >
          {content}
          {!message.isDeleted && message.editedAt && (
            <span className="ml-2 text-[10px] text-default-400">(édité)</span>
          )}
        </div>
      )}
      {isMine && (
        <Avatar
          size="sm"
          name={
            message.sender?.name || message.sender?.email || message.senderId
          }
        />
      )}
    </div>
  );
}
