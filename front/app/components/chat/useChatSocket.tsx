"use client";
import { useEffect, useRef, useCallback } from "react";
import { addToast } from "@heroui/react";
import { getSocket, ChatMessage } from "./socketClient";
import { ChatEvents } from "./events";
import { MessageStatus, MessageType, ConversationSummary } from "./types";
import { useAuth } from "../providers/AuthProvider";
import { useChat } from "./ChatContext";

export function useChatSocket() {
  const { user } = useAuth();
  const chat = useChat();
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  // Références internes pour éviter de réémettre join/load inutilement
  const lastConvRef = useRef<string | null>(null);
  const joinedRoomsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => {
      console.log("[socket] connected");
      socket.emit(ChatEvents.CONVERSATION_LIST);
    };
    const onError = (err: unknown) => {
      console.error("Socket error", err);
    };
    const onConversationList = (payload: {
      conversations: ConversationSummary[];
    }) => {
      chat.setConversations(payload.conversations);
    };
    const onMessageNew = (msg: ChatMessage) => {
      // Avoid duplicate: if it's our own message, we'll handle via message.sent
      if (msg.senderId === user?.id) return;
      chat.upsertMessages(msg.conversationId, [msg]);
      // Si on est dans la conversation active et la fenêtre est visible, on marque directement comme livré + lu
      if (chat.activeConversationId === msg.conversationId) {
        const visibilityOk =
          typeof document !== "undefined"
            ? document.visibilityState === "visible"
            : true;
        socket.emit("message.delivered", {
          conversationId: msg.conversationId,
          messageIds: [msg.id],
        });
        if (visibilityOk) {
          socket.emit("message.read", {
            conversationId: msg.conversationId,
            messageIds: [msg.id],
          });
        }
      }
    };
    const onMessageSent = ({
      tempId,
      message,
    }: {
      tempId?: string;
      message: ChatMessage;
    }) => {
      if (tempId) chat.confirmMessage(tempId, message);
      else chat.upsertMessages(message.conversationId, [message]);
    };
    const onMessageUpdated = ({ message }: { message: ChatMessage }) => {
      chat.updateMessage(message);
    };
    const onMessageDeleted = ({ messageId }: { messageId: string }) => {
      // Attempt to find which conversation contains this message (search last loaded conv first)
      let convId = chat.activeConversationId;
      if (!convId) {
        // fallback linear scan (small lists typical in UI state)
        for (const [cid, list] of Object.entries(chat.messages)) {
          if (list.find((m) => m.id === messageId)) {
            convId = cid;
            break;
          }
        }
      }
      if (convId) chat.deleteMessage(convId, messageId);
    };
    const onConversationCreated = (payload: {
      conversation: ConversationSummary;
    }) => {
      chat.upsertConversation(payload.conversation);
    };
    const onConversationUpdated = (payload: {
      conversation: ConversationSummary;
    }) => {
      chat.upsertConversation(payload.conversation);
    };
    const onMessageList = (payload: {
      conversationId: string;
      messages: ChatMessage[];
      hasMore: boolean;
      nextCursor?: string | null;
      direction?: "initial" | "older";
    }) => {
      console.log(
        "[socket] message.list",
        payload.conversationId,
        payload.messages.length
      );
      const isPrepend = payload.direction === "older";
      chat.upsertMessages(payload.conversationId, payload.messages, isPrepend);
      chat.setHasMore(payload.conversationId, payload.hasMore);
      chat.setNextCursor(payload.conversationId, payload.nextCursor);
      chat.setLoadingOlder(payload.conversationId, false);
      // Marquer comme deliverés tous les messages reçus (non envoyés par nous) encore en status SENT
      const toDeliver = payload.messages
        .filter(
          (m) => m.senderId !== user?.id && m.status === MessageStatus.SENT
        )
        .map((m) => m.id);
      if (toDeliver.length) {
        socket.emit("message.delivered", {
          conversationId: payload.conversationId,
          messageIds: toDeliver,
        });
      }
      // Marquer comme lus si c'est la conversation active
      if (chat.activeConversationId === payload.conversationId) {
        const toRead = payload.messages
          .filter(
            (m) => m.senderId !== user?.id && m.status !== MessageStatus.READ
          )
          .map((m) => m.id);
        if (toRead.length) {
          socket.emit("message.read", {
            conversationId: payload.conversationId,
            messageIds: toRead,
          });
        }
      }
    };

    const onMessageError = (payload: { error: string; tempId?: string }) => {
      addToast({
        title: "Erreur message",
        description: payload.error,
        color: "danger",
      });
      if (payload.tempId) chat.markMessageError(payload.tempId, payload.error);
    };

    socket.on("connect", onConnect);
    socket.on("error", onError);
    socket.on(ChatEvents.CONVERSATION_LIST_DATA, onConversationList);
    socket.on(ChatEvents.MESSAGE_NEW, onMessageNew);
    socket.on(ChatEvents.MESSAGE_SENT, onMessageSent);
    socket.on(ChatEvents.MESSAGE_UPDATED, onMessageUpdated);
    socket.on(ChatEvents.MESSAGE_DELETED, onMessageDeleted);
    socket.on(ChatEvents.CONVERSATION_CREATED, onConversationCreated);
    socket.on(ChatEvents.CONVERSATION_UPDATED, onConversationUpdated);
    socket.on(ChatEvents.MESSAGE_LIST, onMessageList);
    socket.on(
      ChatEvents.MESSAGE_DELIVERED,
      (p: { messageIds: string[]; deliveredAt?: string }) => {
        if (!chat.activeConversationId) return;
        const list = chat.messages[chat.activeConversationId] || [];
        p.messageIds.forEach((id) => {
          const existing = list.find((m) => m.id === id);
          if (existing && existing.status === MessageStatus.SENT) {
            chat.updateMessage({
              ...existing,
              status: MessageStatus.DELIVERED,
              deliveredAt: p.deliveredAt,
            });
          }
        });
      }
    );
    socket.on(
      ChatEvents.MESSAGE_READ,
      (p: { messageIds: string[]; userId: string; readAt?: string }) => {
        if (!chat.activeConversationId) return;
        // Pour simplifier: on met à jour les messages dont nous sommes l'auteur
        const msgs = (chat.messages[chat.activeConversationId] || []).filter(
          (m) => p.messageIds.includes(m.id)
        );
        if (!msgs.length) return;
        msgs.forEach((m) =>
          chat.updateMessage({
            ...m,
            status: MessageStatus.READ,
            readAt: p.readAt,
          })
        );
      }
    );
    socket.on(ChatEvents.MESSAGE_ERROR, onMessageError);
    type ReactionPayload = {
      id: string;
      messageId: string;
      userId: string;
      emoji: string;
      createdAt: string;
    };
    socket.on(
      ChatEvents.REACTION_ADDED,
      (p: { messageId: string; reactions: ReactionPayload[] }) => {
        // Find conversation containing message (prefer active)
        let convId = chat.activeConversationId;
        if (!convId) {
          for (const [cid, list] of Object.entries(chat.messages)) {
            if (list.some((m) => m.id === p.messageId)) {
              convId = cid;
              break;
            }
          }
        }
        if (convId)
          chat.updateMessageReactions(convId, p.messageId, p.reactions);
      }
    );
    socket.on(
      ChatEvents.REACTION_REMOVED,
      (p: { messageId: string; reactions: ReactionPayload[] }) => {
        let convId = chat.activeConversationId;
        if (!convId) {
          for (const [cid, list] of Object.entries(chat.messages)) {
            if (list.some((m) => m.id === p.messageId)) {
              convId = cid;
              break;
            }
          }
        }
        if (convId)
          chat.updateMessageReactions(convId, p.messageId, p.reactions);
      }
    );
    socket.on(
      ChatEvents.PARTICIPANT_READ,
      (p: { conversationId: string; userId: string; lastReadAt?: string }) => {
        chat.updateParticipantRead(p.conversationId, p.userId, p.lastReadAt);
      }
    );
    // Typing indicators
    socket.on(
      ChatEvents.TYPING_STARTED,
      (p: { conversationId: string; userId: string; at?: string }) => {
        if (p.userId === user?.id) return; // ignore self
        chat.setTyping(p.conversationId, p.userId, true);
      }
    );
    socket.on(
      ChatEvents.TYPING_STOPPED,
      (p: { conversationId: string; userId: string; at?: string }) => {
        if (p.userId === user?.id) return;
        chat.setTyping(p.conversationId, p.userId, false);
      }
    );

    return () => {
      socket.off("connect", onConnect);
      socket.off("error", onError);
      socket.off(ChatEvents.CONVERSATION_LIST_DATA, onConversationList);
      socket.off(ChatEvents.MESSAGE_NEW, onMessageNew);
      socket.off(ChatEvents.MESSAGE_SENT, onMessageSent);
      socket.off(ChatEvents.MESSAGE_UPDATED, onMessageUpdated);
      socket.off(ChatEvents.MESSAGE_DELETED, onMessageDeleted);
      socket.off(ChatEvents.CONVERSATION_CREATED, onConversationCreated);
      socket.off(ChatEvents.CONVERSATION_UPDATED, onConversationUpdated);
      socket.off(ChatEvents.MESSAGE_LIST, onMessageList);
      socket.off(ChatEvents.MESSAGE_ERROR, onMessageError);
      socket.off(ChatEvents.REACTION_ADDED);
      socket.off(ChatEvents.REACTION_REMOVED);
      socket.off(ChatEvents.PARTICIPANT_READ);
      socket.off(ChatEvents.MESSAGE_DELIVERED);
      socket.off(ChatEvents.MESSAGE_READ);
      socket.off(ChatEvents.TYPING_STARTED);
      socket.off(ChatEvents.TYPING_STOPPED);
    };
  }, [user, chat]);

  const sendMessage = useCallback(
    (conversationId: string, content: string) => {
      if (!socketRef.current || !user) return;
      const tempId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      const optimistic: ChatMessage = {
        id: tempId,
        conversationId,
        senderId: user.id,
        content,
        type: MessageType.TEXT,
        status: MessageStatus.SENT,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: { id: user.id, email: user.email, name: user.name },
        _optimistic: true,
      };
      chat.upsertMessages(conversationId, [optimistic]);
      socketRef.current.emit(ChatEvents.MESSAGE_SEND, {
        conversationId,
        content,
        tempId,
        type: MessageType.TEXT,
      });
    },
    [user, chat]
  );

  const loadMessages = useCallback(
    (conversationId: string, before?: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit(ChatEvents.MESSAGE_LOAD, {
        conversationId,
        before,
        limit: 30,
      });
    },
    []
  );

  const loadOlder = useCallback(
    (conversationId: string) => {
      const meta = chat.meta[conversationId];
      if (!meta || !meta.hasMore || meta.loadingOlder) return;
      chat.setLoadingOlder(conversationId, true);
      loadMessages(conversationId, meta.nextCursor || undefined);
    },
    [chat, loadMessages]
  );

  const joinConversation = useCallback((conversationId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit(ChatEvents.ROOM_JOIN, { conversationId });
  }, []);

  const editMessage = useCallback(
    (messageId: string, conversationId: string, content: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit(ChatEvents.MESSAGE_EDIT, {
        messageId,
        conversationId,
        content,
      });
    },
    []
  );

  const deleteMessage = useCallback(
    (messageId: string, conversationId: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit(ChatEvents.MESSAGE_DELETE, {
        messageId,
        conversationId,
      });
    },
    []
  );

  const createConversation = useCallback(
    (
      participantUserIds: string[],
      title?: string,
      type: "DIRECT" | "GROUP" = "DIRECT"
    ) => {
      if (!socketRef.current) return;
      socketRef.current.emit(ChatEvents.CONVERSATION_CREATE, {
        participantUserIds,
        title,
        type,
      });
    },
    []
  );

  const updateConversationTitle = useCallback(
    (conversationId: string, title: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit(ChatEvents.CONVERSATION_TITLE_UPDATE, {
        conversationId,
        title,
      });
    },
    []
  );

  useEffect(() => {
    // Garde pour éviter réémissions multiples sur la même conversation
    const cid = chat.activeConversationId;
    if (!cid) return;

    // Si déjà traité cette conversation (et déjà join), ne rien refaire
    if (lastConvRef.current === cid) return;

    // Join la room une seule fois
    if (!joinedRoomsRef.current.has(cid)) {
      joinConversation(cid);
      joinedRoomsRef.current.add(cid);
    }

    // Charger uniquement si aucun message local encore (pagination manuelle utilisera loadMessages séparément)
    if (!chat.messages[cid] || chat.messages[cid].length === 0) {
      loadMessages(cid);
    }

    // Marquer comme lus les messages non lus déjà présents localement
    const list = chat.messages[cid] || [];
    const toRead = list
      .filter((m) => m.senderId !== user?.id && m.status !== MessageStatus.READ)
      .map((m) => m.id);
    if (toRead.length && socketRef.current) {
      socketRef.current.emit("message.read", {
        conversationId: cid,
        messageIds: toRead,
      });
    }

    lastConvRef.current = cid;
    // NOTE: ne pas ajouter chat.messages aux deps sinon chaque message/delivery relance join/load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.activeConversationId, joinConversation, loadMessages, user?.id]);

  return {
    sendMessage,
    loadMessages,
    loadOlder,
    joinConversation,
    createConversation,
    editMessage,
    deleteMessage,
    updateConversationTitle,
    addReaction: (conversationId: string, messageId: string, emoji: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit(ChatEvents.REACTION_ADD, {
        conversationId,
        messageId,
        emoji,
      });
    },
    removeReaction: (
      conversationId: string,
      messageId: string,
      emoji: string
    ) => {
      if (!socketRef.current) return;
      socketRef.current.emit(ChatEvents.REACTION_REMOVE, {
        conversationId,
        messageId,
        emoji,
      });
    },
    resendMessage: (conversationId: string, tempId: string) => {
      const list = chat.messages[conversationId] || [];
      const msg = list.find((m) => m.id === tempId);
      if (!msg || !msg._error || !socketRef.current) return;
      chat.resetMessagePending(tempId);
      socketRef.current.emit(ChatEvents.MESSAGE_SEND, {
        conversationId,
        content: msg.content,
        tempId,
        type: msg.type,
      });
    },
    emitTyping: (conversationId: string, isTyping: boolean) => {
      if (!socketRef.current) return;
      socketRef.current.emit(
        isTyping ? ChatEvents.TYPING_START : ChatEvents.TYPING_STOP,
        {
          conversationId,
        }
      );
    },
  };
}
