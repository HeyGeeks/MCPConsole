'use client';

import type { Message } from '../types';
import { ChatMessage } from './chat-message';
import { Logo } from '@/components/layout/icons';
import { useEffect, useRef } from 'react';

interface ChatHistoryProps {
  messages: Message[];
  isLoading: boolean;
}

export function ChatHistory({ messages, isLoading }: ChatHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-full">
      {messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-center px-4 py-12">
          <Logo className="w-16 h-16 mb-4 text-primary/20" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">MCPConsole</h2>
          <p className="text-muted-foreground">
            Type a message below to begin.
          </p>
        </div>
      ) : (
        <div className="p-4 md:p-6 space-y-6">
          {messages.map((message, index) => (
            <ChatMessage key={message.id} message={message} isLoading={isLoading && index === messages.length - 1} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
