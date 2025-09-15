/**
 * Integration test component to verify Zustand store works correctly
 * This demonstrates how to use the new store and can be removed after testing
 */

"use client";
import React, { useEffect } from 'react';
import { useChatStore } from './store/chatStore';
import { 
  useActiveConversationId, 
  useMessagesForConversation, 
  useConversation,
  useChatActions
} from './store/selectors';
import { ConversationSummary } from './types';
import { ChatMessage } from './socketClient';
import { MessageType, MessageStatus } from './types';

// Test data
const testConversation: ConversationSummary = {
  id: 'test-conv-1',
  type: 'DIRECT',
  title: 'Test Conversation',
  participants: [
    { userId: 'user-1', user: { id: 'user-1', email: 'user1@test.com', name: 'User 1' } },
    { userId: 'user-2', user: { id: 'user-2', email: 'user2@test.com', name: 'User 2' } },
  ],
};

const testMessages: ChatMessage[] = [
  {
    id: 'test-msg-1',
    conversationId: 'test-conv-1',
    senderId: 'user-1',
    content: 'Hello from Zustand!',
    type: MessageType.TEXT,
    status: MessageStatus.SENT,
    isDeleted: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'test-msg-2',
    conversationId: 'test-conv-1',
    senderId: 'user-2',
    content: 'Zustand is working great!',
    type: MessageType.TEXT,
    status: MessageStatus.SENT,
    isDeleted: false,
    createdAt: new Date(Date.now() + 1000).toISOString(),
  },
];

export function ZustandIntegrationTest() {
  // Use fine-grained selectors
  const activeConversationId = useActiveConversationId();
  const conversation = useConversation('test-conv-1');
  const messages = useMessagesForConversation('test-conv-1');
  const actions = useChatActions();

  // Initialize test data
  useEffect(() => {
    console.log('Initializing Zustand test data...');
    
    // Add test conversation
    actions.upsertConversation(testConversation);
    
    // Add test messages
    actions.upsertMessages('test-conv-1', testMessages);
    
    // Set as active
    actions.setActiveConversation('test-conv-1');
    
    console.log('Test data initialized!');
  }, [actions]);

  // Test store updates
  const handleAddMessage = () => {
    const newMessage: ChatMessage = {
      id: `test-msg-${Date.now()}`,
      conversationId: 'test-conv-1',
      senderId: 'user-1',
      content: `Test message at ${new Date().toLocaleTimeString()}`,
      type: MessageType.TEXT,
      status: MessageStatus.SENT,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };
    
    actions.upsertMessages('test-conv-1', [newMessage]);
  };

  const handleSetTyping = () => {
    actions.setTyping('test-conv-1', 'user-2', true);
    
    // Clear typing after 3 seconds
    setTimeout(() => {
      actions.setTyping('test-conv-1', 'user-2', false);
    }, 3000);
  };

  return (
    <div className="p-4 border rounded-lg m-4 max-w-md">
      <h3 className="text-lg font-bold mb-4">Zustand Integration Test</h3>
      
      <div className="space-y-2 text-sm">
        <p><strong>Active Conversation:</strong> {activeConversationId || 'None'}</p>
        <p><strong>Conversation Title:</strong> {conversation?.title || 'Not loaded'}</p>
        <p><strong>Participants:</strong> {conversation?.participants.length || 0}</p>
        <p><strong>Messages:</strong> {messages.length}</p>
      </div>

      <div className="mt-4 space-y-2">
        <button 
          onClick={handleAddMessage}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          Add Test Message
        </button>
        
        <button 
          onClick={handleSetTyping}
          className="px-3 py-1 bg-green-500 text-white rounded text-sm ml-2"
        >
          Simulate Typing
        </button>
      </div>

      <div className="mt-4">
        <h4 className="font-semibold mb-2">Messages:</h4>
        <div className="space-y-1 text-xs">
          {messages.map(msg => (
            <div key={msg.id} className="p-2 bg-gray-100 rounded">
              <strong>{msg.senderId}:</strong> {msg.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Store state display component (for debugging)
export function StoreStateDisplay() {
  const store = useChatStore();
  
  return (
    <div className="p-4 border rounded-lg m-4 max-w-2xl">
      <h3 className="text-lg font-bold mb-4">Store State (Debug)</h3>
      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
        {JSON.stringify({
          activeConversationId: store.activeConversationId,
          conversationCount: Object.keys(store.conversations).length,
          messageCount: Object.keys(store.messages).length,
          typingCount: Object.keys(store.typing).length,
          metaCount: Object.keys(store.meta).length,
        }, null, 2)}
      </pre>
    </div>
  );
}