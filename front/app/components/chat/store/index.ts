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
// Note: This needs to be determined at build time due to ES module constraints
export { useChatStore } from './chatStore';
// For persistence, manually switch the import above to './chatStoreWithPersist'
// Or use environment-specific builds

// Export types for convenience
export type { ChatStore, ChatState, ChatActions } from './chatStore';
export * from './selectors';