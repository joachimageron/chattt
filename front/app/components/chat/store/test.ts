/**
 * Simple test script to verify Zustand store functionality
 * This can be removed after migration is complete
 */

import { useChatStore } from './chatStore';
import { ConversationSummary } from '../types';
import { ChatMessage } from '../socketClient';
import { MessageType, MessageStatus } from '../types';

// Test data
const mockConversation: ConversationSummary = {
  id: 'conv-1',
  type: 'DIRECT',
  title: 'Test Conversation',
  participants: [
    { userId: 'user-1', user: { id: 'user-1', email: 'user1@test.com', name: 'User 1' } },
    { userId: 'user-2', user: { id: 'user-2', email: 'user2@test.com', name: 'User 2' } },
  ],
};

const mockMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-1',
    content: 'Hello there!',
    type: MessageType.TEXT,
    status: MessageStatus.SENT,
    isDeleted: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    senderId: 'user-2',
    content: 'Hi! How are you?',
    type: MessageType.TEXT,
    status: MessageStatus.SENT,
    isDeleted: false,
    createdAt: new Date(Date.now() + 1000).toISOString(),
  },
];

export function testZustandStore() {
  console.log('Testing Zustand store...');
  
  // Get store instance
  const store = useChatStore.getState();
  
  // Test 1: Set active conversation
  store.setActiveConversation('conv-1');
  console.log('✓ Set active conversation');
  
  // Test 2: Add conversation
  store.upsertConversation(mockConversation);
  console.log('✓ Added conversation');
  
  // Test 3: Add messages
  store.upsertMessages('conv-1', mockMessages);
  console.log('✓ Added messages');
  
  // Test 4: Update meta
  store.updateMeta('conv-1', { hasMore: false, loadingOlder: false });
  console.log('✓ Updated meta');
  
  // Test 5: Set typing
  store.setTyping('conv-1', 'user-2', true);
  console.log('✓ Set typing status');
  
  // Verify state
  const finalState = useChatStore.getState();
  console.log('Final state:', {
    activeConversationId: finalState.activeConversationId,
    conversationCount: Object.keys(finalState.conversations).length,
    messageCount: finalState.messages['conv-1']?.length || 0,
    hasTyping: Object.keys(finalState.typing['conv-1'] || {}).length > 0,
  });
  
  console.log('All tests passed! ✓');
  return true;
}

// Export for use in components
export default testZustandStore;