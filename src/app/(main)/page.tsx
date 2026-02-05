'use client';

import { useAppContext } from '@/shared/context';
import { useChat } from '@/hooks/use-chat';
import { ChatHistory, ChatInput, ChatHeader } from '@/features/chat/components';
import { useMcpAuthSession } from '@/features/mcp-servers/hooks';

export default function ChatPage() {
  const { messages, mcpServers } = useAppContext();
  const { isLoading, sendMessage } = useChat();
  
  // Check MCP auth status on page load using the centralized hook
  // This automatically connects servers and checks their auth status
  const { 
    hasAuthRequired, 
    serverStatuses,
  } = useMcpAuthSession(mcpServers, {
    autoConnect: true,
    autoCheck: true,
  });

  // Log auth status for debugging
  if (hasAuthRequired && serverStatuses.length > 0) {
    const authRequiredServers = serverStatuses.filter(s => s.status === 'auth_required');
    if (authRequiredServers.length > 0) {
      console.log('[ChatPage] MCP servers requiring auth:', authRequiredServers.map(s => s.name));
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto">
        <ChatHistory messages={messages} isLoading={isLoading} />
      </div>
      <div className="flex-shrink-0 border-t bg-background">
        <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}
