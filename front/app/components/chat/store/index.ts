/**
 * Compatibility shim for the useChat hook
 * This allows existing components to continue working while we migrate to Zustand
 */

import { useChatLegacy } from './selectors';

export function useChatZustand() {
  return useChatLegacy();
}

// Export types for convenience
export type { ChatStore, ChatState, ChatActions } from './chatStore';
export * from './selectors';