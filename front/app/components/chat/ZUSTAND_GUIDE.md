# Zustand Integration for Chat Components

This document explains the Zustand store implementation for optimizing chat component performance.

## Overview

The chat application has been migrated from React Context to Zustand for better performance and more granular state management. This migration reduces unnecessary rerenders by providing fine-grained selectors.

## Store Structure

### Core Store (`chatStore.ts`)
- **State**: Matches the existing `ChatState` interface
- **Actions**: All operations from the original `chatReducer`
- **Middleware**: Uses `subscribeWithSelector` for optimized subscriptions

### Persistent Store (`chatStoreWithPersist.ts`) - Optional
- **All core features** plus persistence with Zustand persist middleware
- **Selective persistence**: Only persists conversations, messages, meta (not typing)
- **Schema versioning**: Migration support for future changes
- **Storage**: Uses localStorage by default (configurable)

### Switching Between Stores
To enable persistence, modify `store/index.ts`:
```typescript
// Non-persistent (default)
export { useChatStore } from './chatStore';

// Persistent (uncomment to enable)
// export { useChatStore } from './chatStoreWithPersist';
```

Or use environment variable:
```env
NEXT_PUBLIC_CHAT_PERSISTENCE=true
```

### Key State Slices
```typescript
interface ChatState {
  conversations: Record<string, ConversationSummary>;
  messages: Record<string, ChatMessage[]>;
  meta: Record<string, ChatMetaEntry>;
  typing: Record<string, Record<string, number>>;
  activeConversationId: string | null;
  messageToConversation: Record<string, string>;
}
```

## Selectors (`selectors.ts`)

### Fine-grained Selectors
These prevent unnecessary rerenders by subscribing only to specific state slices:

```typescript
// Conversation selectors
useActiveConversationId()     // Only active conversation ID
useConversation(id)           // Specific conversation data
useActiveConversation()       // Current active conversation

// Message selectors  
useMessagesForConversation(id) // Messages for specific conversation
useActiveConversationMessages() // Messages for active conversation

// Meta selectors
useMetaForConversation(id)    // Pagination data for conversation
useHasMore(id)                // Just the hasMore flag
useLoadingOlder(id)           // Just the loading state

// Typing selectors
useTypingForConversation(id)  // Typing users for conversation
useIsUserTyping(id, userId)   // Whether specific user is typing
```

### Composite Selectors
For components that need multiple related pieces of data:

```typescript
useActiveConversationData()   // Combined conversation, messages, meta, typing
useChatActions()              // All store actions
```

### Legacy Compatibility
```typescript
useChatLegacy()               // Drop-in replacement for useChat()
```

## Migration Examples

### Before (Context)
```typescript
function MessageList() {
  const chat = useChat(); // Gets entire chat state
  const messages = chat.messages[conversationId] || [];
  const conversation = chat.conversations[conversationId];
  // Component rerenders on ANY chat state change
}
```

### After (Zustand)
```typescript
function MessageList({ conversationId }) {
  const messages = useMessagesForConversation(conversationId);
  const conversation = useConversation(conversationId);
  // Component rerenders ONLY when this conversation's data changes
}
```

## Performance Benefits

1. **Reduced Rerenders**: Components only rerender when their specific data changes
2. **Granular Subscriptions**: Subscribe to exactly what you need
3. **Better Memoization**: Smaller state slices are easier to memoize
4. **Selective Updates**: Actions only notify subscribers of affected state

## Migration Strategy

### Phase 1 ✅ (Completed)
- [x] Create Zustand store with all chatReducer functionality
- [x] Create fine-grained selectors
- [x] Migrate MessageList component
- [x] Migrate ConversationList component  
- [x] Migrate main chat page
- [x] Maintain backward compatibility

### Phase 2 (Optional)
- [x] Add state persistence with Zustand persist middleware
- [ ] Migrate remaining socket event handlers
- [ ] Add Zustand devtools integration
- [ ] Performance testing and optimization

### Phase 3 (Cleanup)
- [ ] Remove original ChatContext and chatReducer
- [ ] Update imports across codebase
- [ ] Remove compatibility selectors

## Usage Examples

### Using Fine-grained Selectors
```typescript
function ConversationHeader({ conversationId }) {
  const conversation = useConversation(conversationId);
  const typing = useTypingForConversation(conversationId);
  
  // Only rerenders when this conversation or its typing state changes
  return (
    <div>
      <h3>{conversation?.title}</h3>
      {Object.keys(typing).length > 0 && <TypingIndicator />}
    </div>
  );
}
```

### Using Actions
```typescript
function MessageInput({ conversationId }) {
  const { upsertMessages } = useChatActions();
  
  const sendMessage = (content) => {
    const message = createMessage(content, conversationId);
    upsertMessages(conversationId, [message]);
  };
}
```

### Using Actions with Persistence
```typescript
function DataManagement() {
  const { clearPersistedData } = useChatActions();
  
  const handleClearCache = () => {
    clearPersistedData(); // Clears all persisted data
  };
}
```
```

### Legacy Compatibility
```typescript
function ExistingComponent() {
  const chat = useChatLegacy(); // Works exactly like old useChat()
  // No changes needed during migration
}
```

## Best Practices

1. **Use Specific Selectors**: Prefer `useMessagesForConversation(id)` over `useChatLegacy()`
2. **Combine Related Actions**: Use `useChatActions()` to get all actions at once
3. **Memoize Expensive Computations**: Smaller state slices work better with useMemo
4. **Test Performance**: Monitor rerender frequency in development

## Testing

Use the `ZustandIntegrationTest` component to verify store functionality:

```typescript
import { ZustandIntegrationTest } from './ZustandTest';

// Add to a page for testing
<ZustandIntegrationTest />
```

## Troubleshooting

### Common Issues

1. **State Not Updating**: Ensure you're using the correct selector for your data
2. **Too Many Rerenders**: Check if you're subscribing to too broad a state slice
3. **Missing Data**: Verify the store is being populated by socket events

### Debug Tools

- Use `StoreStateDisplay` component to inspect store state
- Add console.logs in selectors to track subscriptions
- Use React DevTools Profiler to measure rerender frequency