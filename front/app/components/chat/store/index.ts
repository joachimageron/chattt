/**
 * Compatibility shim for the useChat hook
 * This allows existing components to continue working while we migrate to Zustand
 */

import { useChatLegacy } from './selectors';

export function useChatZustand() {
  return useChatLegacy();
}

// Store configuration - switch between persistent and non-persistent
export const ENABLE_PERSISTENCE = process.env.NEXT_PUBLIC_CHAT_PERSISTENCE === 'true';

// Export the appropriate store based on configuration
export { useChatStore } from './chatStore';
// To use persistent store instead, uncomment the line below and comment the line above:
// export { useChatStore } from './chatStoreWithPersist';

// Export types for convenience
export type { ChatStore, ChatState, ChatActions } from './chatStore';
export * from './selectors';