/**
 * Simple test to verify Zustand integration is working correctly
 * This can be imported and used in any component to test the store
 */
"use client";
import { useEffect } from 'react';
import { useChatActions, useConversations, useActiveConversationId } from '../store/selectors';
import { ConversationSummary } from '../types';

export function ZustandPhase2Test() {
  const chatActions = useChatActions();
  const conversations = useConversations();
  const activeConversationId = useActiveConversationId();

  useEffect(() => {
    console.log('Zustand Phase 2 Test - Store state:');
    console.log('- Conversations:', Object.keys(conversations).length);
    console.log('- Active conversation:', activeConversationId);
    console.log('- Actions available:', !!chatActions.sendMessage);
    
    // Test devtools integration
    if (typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__) {
      console.log('✅ Redux DevTools detected and should be working');
    } else {
      console.log('⚠️ Redux DevTools not detected - install browser extension for debugging');
    }
  }, [conversations, activeConversationId, chatActions]);

  const testPersistence = () => {
    // Add a test conversation to check persistence
    const testConv: ConversationSummary = {
      id: 'test-persistence-' + Date.now(),
      type: 'DIRECT',
      title: 'Persistence Test',
      participants: [
        { userId: 'user1' },
        { userId: 'user2' }
      ]
    };
    
    chatActions.upsertConversation(testConv);
    console.log('Test conversation added. Refresh page to test persistence.');
  };

  const clearData = () => {
    chatActions.clearPersistedData();
    console.log('Persisted data cleared');
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
      <h3>Zustand Phase 2 Integration Test</h3>
      <p>Conversations: {Object.keys(conversations).length}</p>
      <p>Active: {activeConversationId || 'None'}</p>
      <div style={{ marginTop: '10px' }}>
        <button 
          onClick={testPersistence}
          style={{ margin: '5px', padding: '5px 10px' }}
        >
          Test Persistence
        </button>
        <button 
          onClick={clearData}
          style={{ margin: '5px', padding: '5px 10px' }}
        >
          Clear Data
        </button>
      </div>
      <div style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>
        Check browser console for detailed logs and DevTools Redux tab for store inspection.
      </div>
    </div>
  );
}