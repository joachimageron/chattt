"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useChatSocket } from "../components/chat/useChatSocket";
import { useAuth } from "../components/providers/AuthProvider";
import { ConversationList } from "../components/chat/ConversationList";
import { MessageList } from "../components/chat/MessageList";
import { MessageInput } from "../components/chat/MessageInput";
import { Spinner } from "@heroui/react";
import { useChat } from "../components/chat/ChatContext";
import type { ChatMessage } from "../components/chat/socketClient";
import { useSearchParams, useRouter } from "next/navigation";

export default function ChatPage() {
  const { user, isLoading } = useAuth();
  const {
    sendMessage,
    joinConversation,
    loadMessages,
    editMessage,
    deleteMessage,
  } = useChatSocket();
  const chat = useChat();
  const { activeConversationId, messages, setActiveConversation } = chat;
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingInitialContent, setEditingInitialContent] =
    useState<string>("");
  const startEdit = useCallback(
    (id: string) => {
      if (!activeConversationId) return;
      const msg = messages[activeConversationId]?.find((m) => m.id === id);
      if (!msg || msg.isDeleted) return;
      setEditingMessageId(id);
      setEditingInitialContent(msg.content);
    },
    [activeConversationId, messages]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!activeConversationId) return;
      deleteMessage(id, activeConversationId);
    },
    [activeConversationId, deleteMessage]
  );

  const handleEditSubmit = useCallback(
    (val: string) => {
      if (!activeConversationId || !editingMessageId) return;
      editMessage(editingMessageId, activeConversationId, val);
      setEditingMessageId(null);
      setEditingInitialContent("");
    },
    [activeConversationId, editingMessageId, editMessage]
  );

  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingInitialContent("");
  }, []);

  const InlineEditInput = ({
    initialValue,
    onSubmit,
    onCancel,
  }: {
    initialValue: string;
    onSubmit: (v: string) => void;
    onCancel: () => void;
  }) => {
    const [val, setVal] = useState(initialValue);
    useEffect(() => setVal(initialValue), [initialValue]);
    return (
      <input
        className="w-full text-sm px-3 py-2 border rounded-medium bg-content1 outline-none"
        value={val}
        autoFocus
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const trimmed = val.trim();
            if (trimmed) onSubmit(trimmed);
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
      />
    );
  };
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize from URL param
  useEffect(() => {
    const fromUrl = searchParams.get("c");
    if (fromUrl && fromUrl !== activeConversationId) {
      setActiveConversation(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectConversation = (id: string) => {
    if (id !== activeConversationId) {
      setActiveConversation(id);
      const url = new URL(window.location.href);
      url.searchParams.set("c", id);
      router.replace(url.pathname + "?" + url.searchParams.toString());
    }
  };

  useEffect(() => {
    if (activeConversationId) {
      joinConversation(activeConversationId);
      loadMessages(activeConversationId);
    }
  }, [activeConversationId, joinConversation, loadMessages]);

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  if (!user) return null;

  const currentMessages = activeConversationId
    ? (messages[activeConversationId] as ChatMessage[] | undefined) || []
    : [];

  return (
    <div className="flex h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] bg-background">
      <ConversationList onSelect={handleSelectConversation} />
      <div className="flex-1 flex flex-col">
        {activeConversationId ? (
          <>
            <MessageList
              messages={currentMessages}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
            {editingMessageId ? (
              <div className="border-t border-divider bg-warning-50/30 p-2 flex flex-col gap-2">
                <div className="text-xs text-default-500">
                  Édition du message. Entrée pour sauvegarder, Esc pour annuler.
                </div>
                {/* Reuse MessageInput semantics */}
                <InlineEditInput
                  initialValue={editingInitialContent}
                  onSubmit={handleEditSubmit}
                  onCancel={cancelEdit}
                />
              </div>
            ) : (
              <MessageInput
                disabled={!activeConversationId}
                onSend={(val) => sendMessage(activeConversationId!, val)}
              />
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-default-400 text-sm">
            Sélectionnez une conversation
          </div>
        )}
      </div>
    </div>
  );
}
