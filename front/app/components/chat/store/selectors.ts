import { useChatStore } from './chatStore';

// Conversation selectors
export const useActiveConversationId = () => 
  useChatStore(state => state.activeConversationId);

export const useConversations = () => 
  useChatStore(state => state.conversations);

export const useConversation = (conversationId: string | null) => 
  useChatStore(state => 
    conversationId ? state.conversations[conversationId] : null
  );

export const useActiveConversation = () => 
  useChatStore(state => 
    state.activeConversationId 
      ? state.conversations[state.activeConversationId] 
      : null
  );

// Message selectors
export const useMessages = () => 
  useChatStore(state => state.messages);

export const useMessagesForConversation = (conversationId: string | null) => 
  useChatStore(state => 
    conversationId ? state.messages[conversationId] || [] : []
  );

export const useActiveConversationMessages = () => 
  useChatStore(state => 
    state.activeConversationId 
      ? state.messages[state.activeConversationId] || []
      : []
  );

export const useMessageById = (messageId: string) => 
  useChatStore(state => {
    const conversationId = state.messageToConversation[messageId];
    if (!conversationId) return null;
    const messages = state.messages[conversationId] || [];
    return messages.find(m => m.id === messageId) || null;
  });

export const useConversationIdForMessage = (messageId: string) => 
  useChatStore(state => state.messageToConversation[messageId]);

// Meta selectors
export const useMeta = () => 
  useChatStore(state => state.meta);

export const useMetaForConversation = (conversationId: string | null) => 
  useChatStore(state => 
    conversationId ? state.meta[conversationId] : null
  );

export const useActiveConversationMeta = () => 
  useChatStore(state => 
    state.activeConversationId 
      ? state.meta[state.activeConversationId] 
      : null
  );

export const useHasMore = (conversationId: string | null) => 
  useChatStore(state => 
    conversationId 
      ? state.meta[conversationId]?.hasMore ?? true
      : false
  );

export const useLoadingOlder = (conversationId: string | null) => 
  useChatStore(state => 
    conversationId 
      ? state.meta[conversationId]?.loadingOlder ?? false
      : false
  );

// Typing selectors
export const useTyping = () => 
  useChatStore(state => state.typing);

export const useTypingForConversation = (conversationId: string | null) => 
  useChatStore(state => 
    conversationId ? state.typing[conversationId] || {} : {}
  );

export const useActiveConversationTyping = () => 
  useChatStore(state => 
    state.activeConversationId 
      ? state.typing[state.activeConversationId] || {}
      : {}
  );

export const useIsUserTyping = (conversationId: string | null, userId: string) => 
  useChatStore(state => {
    if (!conversationId) return false;
    const convTyping = state.typing[conversationId];
    if (!convTyping) return false;
    const lastActivity = convTyping[userId];
    if (!lastActivity) return false;
    // Consider typing if last activity was within 3 seconds
    return Date.now() - lastActivity < 3000;
  });

// Composite selectors for common use cases
export const useActiveConversationData = () => 
  useChatStore(state => {
    if (!state.activeConversationId) {
      return {
        conversation: null,
        messages: [],
        meta: null,
        typing: {},
      };
    }
    
    return {
      conversation: state.conversations[state.activeConversationId] || null,
      messages: state.messages[state.activeConversationId] || [],
      meta: state.meta[state.activeConversationId] || null,
      typing: state.typing[state.activeConversationId] || {},
    };
  });

// Store actions selectors (for components that need actions)
export const useChatActions = () => 
  useChatStore(state => ({
    setActiveConversation: state.setActiveConversation,
    setConversations: state.setConversations,
    upsertConversation: state.upsertConversation,
    updateParticipantRead: state.updateParticipantRead,
    upsertMessages: state.upsertMessages,
    updateMessage: state.updateMessage,
    deleteMessage: state.deleteMessage,
    confirmMessage: state.confirmMessage,
    markMessageError: state.markMessageError,
    resetMessagePending: state.resetMessagePending,
    updateMessageReactions: state.updateMessageReactions,
    addMessageReaction: state.addMessageReaction,
    removeMessageReaction: state.removeMessageReaction,
    updateMeta: state.updateMeta,
    setTyping: state.setTyping,
    getConversationIdForMessage: state.getConversationIdForMessage,
  }));

// Legacy compatibility selector that matches the old useChat interface
export const useChatLegacy = () => {
  const state = useChatStore();
  
  return {
    conversations: state.conversations,
    messages: state.messages,
    meta: state.meta,
    activeConversationId: state.activeConversationId,
    typing: state.typing,
    
    // Actions
    setActiveConversation: state.setActiveConversation,
    getConversationIdForMessage: state.getConversationIdForMessage,
    setConversations: state.setConversations,
    upsertConversation: state.upsertConversation,
    updateParticipantRead: state.updateParticipantRead,
    upsertMessages: state.upsertMessages,
    updateMessage: state.updateMessage,
    updateMessageReactions: state.updateMessageReactions,
    addMessageReaction: state.addMessageReaction,
    removeMessageReaction: state.removeMessageReaction,
    deleteMessage: state.deleteMessage,
    confirmMessage: state.confirmMessage,
    markMessageError: state.markMessageError,
    resetMessagePending: state.resetMessagePending,
    updateMeta: state.updateMeta,
    setTyping: state.setTyping,
    
    // Legacy methods that throw errors (as in the original code)
    setHasMore: () => {
      throw new Error("setHasMore removed – use updateMeta");
    },
    setLoadingOlder: () => {
      throw new Error("setLoadingOlder removed – use updateMeta");
    },
    setNextCursor: () => {
      throw new Error("setNextCursor removed – use updateMeta");
    },
  };
};