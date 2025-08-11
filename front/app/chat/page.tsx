"use client";
import React, { useEffect } from "react";
import { useChatSocket } from "../components/chat/useChatSocket";
import { useAuth } from "../components/providers/AuthProvider";
import { ConversationList } from "../components/chat/ConversationList";
import { MessageList } from "../components/chat/MessageList";
import { MessageInput } from "../components/chat/MessageInput";
import { Spinner } from "@heroui/react";
import { useChat } from "../components/chat/ChatContext";
import type { ChatMessage } from "../components/chat/socketClient";

export default function ChatPage() {
  const { user, isLoading } = useAuth();
  const { sendMessage, joinConversation, loadMessages } = useChatSocket();
  const chat = useChat();
  const { activeConversationId, messages } = chat;

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
      <ConversationList />
      <div className="flex-1 flex flex-col">
        {activeConversationId ? (
          <>
            <MessageList messages={currentMessages} />
            <MessageInput
              disabled={!activeConversationId}
              onSend={(val) => sendMessage(activeConversationId, val)}
            />
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
