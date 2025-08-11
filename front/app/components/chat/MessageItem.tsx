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
}

export function MessageItem({ message, onEdit, onDelete }: MessageItemProps) {
  const { user } = useAuth();
  const isMine = user?.id === message.senderId;

  const content = useMemo(() => {
    if (message.isDeleted)
      return <span className="italic text-default-400">Message supprimé</span>;
    return <span>{message.content}</span>;
  }, [message]);

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
      <Dropdown placement={isMine ? "left-start" : "right-start"}>
        <DropdownTrigger>
          <div
            className={`max-w-xs rounded-medium px-3 py-2 text-sm cursor-pointer transition-colors bg-content2 hover:bg-content3 shadow-sm border border-transparent group-hover:border-default-200 ${
              isMine ? "bg-primary-500/10" : ""
            }`}
          >
            {content}
            {!message.isDeleted && message.editedAt && (
              <span className="ml-2 text-[10px] text-default-400">(édité)</span>
            )}
          </div>
        </DropdownTrigger>
        {!message.isDeleted && (
          <DropdownMenu
            aria-label="Actions message"
            variant="flat"
            disabledKeys={isMine ? [] : ["edit", "delete"]}
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
