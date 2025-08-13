"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useChatSocket } from "../components/chat/useChatSocket";
import { useAuth } from "../components/providers/AuthProvider";
import { ConversationList } from "../components/chat/ConversationList";
import { MessageList } from "../components/chat/MessageList";
import { MessageInput } from "../components/chat/MessageInput";
import { Spinner, Button, Input, Tooltip } from "@heroui/react";
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
    updateConversationTitle,
    emitTyping,
  } = useChatSocket();
  const chat = useChat();
  const { activeConversationId, messages, setActiveConversation } = chat;
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingInitialContent, setEditingInitialContent] =
    useState<string>("");
  const [editingGroupTitle, setEditingGroupTitle] = useState(false);
  const [groupTitleValue, setGroupTitleValue] = useState("");
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
    // Focus input after selection (timeout to ensure component mounted)
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 0);
  };

  useEffect(() => {
    if (activeConversationId) {
      joinConversation(activeConversationId);
      loadMessages(activeConversationId);
    }
  }, [activeConversationId, joinConversation, loadMessages]);

  // Determine current conversation + display title early (before conditional returns)
  const currentConversation = activeConversationId
    ? chat.conversations[activeConversationId]
    : undefined;
  const currentMessages = activeConversationId
    ? (messages[activeConversationId] as ChatMessage[] | undefined) || []
    : [];

  // Update editable group title when conversation changes
  useEffect(() => {
    if (currentConversation?.type === "GROUP") {
      setGroupTitleValue(currentConversation.title || "");
    } else {
      setEditingGroupTitle(false);
      setGroupTitleValue("");
    }
  }, [
    currentConversation?.id,
    currentConversation?.title,
    currentConversation?.type,
  ]);

  // Compute display title (reuse logic from ConversationList)
  let displayTitle: string | undefined | null = currentConversation?.title;
  if (
    !displayTitle &&
    currentConversation?.type === "DIRECT" &&
    user &&
    currentConversation
  ) {
    const other = currentConversation.participants.find(
      (p) => p.userId !== user.id
    );
    if (other?.user) {
      displayTitle = other.user.name || other.user.email;
    }
  }

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  if (!user) return null;

  const commitGroupTitle = () => {
    if (
      currentConversation &&
      currentConversation.type === "GROUP" &&
      groupTitleValue.trim()
    ) {
      updateConversationTitle(currentConversation.id, groupTitleValue.trim());
    }
    setEditingGroupTitle(false);
  };

  const cancelGroupTitle = () => {
    setEditingGroupTitle(false);
    setGroupTitleValue(currentConversation?.title || "");
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] bg-background">
      <ConversationList onSelect={handleSelectConversation} />
      <div className="flex-1 flex flex-col">
        {activeConversationId ? (
          <>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-divider bg-content1/40 backdrop-blur-sm">
              {editingGroupTitle ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Input
                    size="sm"
                    aria-label="Titre du groupe"
                    value={groupTitleValue}
                    onChange={(e) => setGroupTitleValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitGroupTitle();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        cancelGroupTitle();
                      }
                    }}
                    className="flex-1"
                    autoFocus
                  />
                  <Button size="sm" variant="flat" onPress={commitGroupTitle}>
                    OK
                  </Button>
                  <Button size="sm" variant="light" onPress={cancelGroupTitle}>
                    ✕
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <h2 className="text-sm font-semibold truncate">
                    {displayTitle || "Sans titre"}
                  </h2>
                  {currentConversation?.type === "GROUP" && (
                    <Tooltip content="Renommer le groupe">
                      <Button
                        size="sm"
                        variant="light"
                        isIconOnly
                        onPress={() => setEditingGroupTitle(true)}
                      >
                        ✎
                      </Button>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
            <MessageList
              messages={currentMessages}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
            {/* Typing indicator */}
            {(() => {
              if (!activeConversationId) return null;
              const typingMap = chat.typing[activeConversationId] || {};
              const now = Date.now();
              // Expire entries older than 5s (display only active)
              const activeTypers = Object.entries(typingMap)
                .filter(([uid, ts]) => now - ts < 5000 && uid !== user.id)
                .map(([uid]) => uid);
              if (!activeTypers.length) return null;
              const names = activeTypers
                .map(
                  (uid) =>
                    currentConversation?.participants.find(
                      (p) => p.userId === uid
                    )?.user?.name ||
                    currentConversation?.participants.find(
                      (p) => p.userId === uid
                    )?.user?.email ||
                    "Quelqu'un"
                )
                .slice(0, 2);
              const more = activeTypers.length - names.length;
              return (
                <div className="px-4 py-1 text-xs text-default-500 animate-pulse">
                  {names.join(", ")}
                  {more > 0
                    ? ` et ${more} autre${more > 1 ? "s" : ""}`
                    : ""}{" "}
                  écrit{activeTypers.length > 1 ? "vent" : ""}...
                </div>
              );
            })()}
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
                inputRef={messageInputRef}
                onTypingChange={(t) =>
                  activeConversationId && emitTyping(activeConversationId, t)
                }
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
