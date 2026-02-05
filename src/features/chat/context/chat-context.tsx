'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useChatMessages } from '../hooks';
import type { Message } from '../types';

interface ChatContextValue {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

interface ChatProviderProps {
  children: ReactNode;
}

/**
 * Chat context provider
 * Provides chat state and functionality to child components
 */
export function ChatProvider({ children }: ChatProviderProps) {
  const { messages, isLoading, sendMessage } = useChatMessages();

  return (
    <ChatContext.Provider value={{ messages, isLoading, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

/**
 * Hook to access chat context
 * Must be used within a ChatProvider
 */
export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
}
