'use client';

import { createContext, useContext, ReactNode, useState, useCallback, Dispatch, SetStateAction, useEffect, useRef } from 'react';
import type { AIProvider, MCPServer, ChatMessage, OAuth2Token } from '@/lib/types';
import { useLocalStorage } from '@/shared/hooks';
import { connectServers } from '@/lib/services/mcp-service';

interface AppContextType {
  providers: AIProvider[];
  setProviders: Dispatch<SetStateAction<AIProvider[]>>;
  mcpServers: MCPServer[];
  setMcpServers: Dispatch<SetStateAction<MCPServer[]>>;
  selectedProviderId: string | null;
  setSelectedProviderId: (id: string | null) => void;
  selectedModel: string | null;
  setSelectedModel: (model: string | null) => void;
  selectedMcpServerIds: string[];
  setSelectedMcpServerIds: (ids: string[]) => void;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  clearChat: () => void;

  addProvider: (provider: Omit<AIProvider, 'id'>) => void;
  updateProvider: (provider: AIProvider) => void;
  deleteProvider: (id: string) => void;

  addMcpServer: (server: Omit<MCPServer, 'id'>) => void;
  updateMcpServer: (server: MCPServer) => void;
  deleteMcpServer: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [providers, setProviders] = useLocalStorage<AIProvider[]>('ai-providers', []);
  const [mcpServers, setMcpServers] = useLocalStorage<MCPServer[]>('mcp-servers', []);
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>('chat-history', []);
  const [oauthTokens, setOauthTokens] = useLocalStorage<Record<string, OAuth2Token>>('mcp-oauth-tokens', {});
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedMcpServerIds, setSelectedMcpServerIds] = useLocalStorage<string[]>('selected-mcp-server-ids', []);
  const tokensRestoredRef = useRef(false);

  // Restore OAuth tokens to backend on load
  useEffect(() => {
    if (tokensRestoredRef.current || Object.keys(oauthTokens).length === 0) return;
    tokensRestoredRef.current = true;

    const restoreTokens = async () => {
      for (const [serverId, tokenData] of Object.entries(oauthTokens)) {
        try {
          await fetch('/api/mcp/set-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serverId, tokenData })
          });
          console.log(`[AppContext] Restored OAuth token for server ${serverId}`);
        } catch (error) {
          console.error(`[AppContext] Failed to restore token for server ${serverId}:`, error);
        }
      }
    };

    restoreTokens();
  }, [oauthTokens]);

  // Connect servers after tokens are restored
  useEffect(() => {
    if (mcpServers.length > 0 && tokensRestoredRef.current) {
      connectServers(mcpServers);
    }
  }, [mcpServers]);

  // Listen for OAuth token updates from child components
  useEffect(() => {
    const handleTokenUpdate = (event: CustomEvent) => {
      const { serverId, tokenData } = event.detail;
      setOauthTokens(prev => ({
        ...prev,
        [serverId]: tokenData
      }));
    };

    window.addEventListener('mcp-token-update' as any, handleTokenUpdate);
    return () => window.removeEventListener('mcp-token-update' as any, handleTokenUpdate);
  }, [setOauthTokens]);

  const addProvider = (provider: Omit<AIProvider, 'id'>) => {
    setProviders(prev => [...prev, { ...provider, id: crypto.randomUUID() }]);
  };

  const updateProvider = (updatedProvider: AIProvider) => {
    setProviders(prev => prev.map(p => p.id === updatedProvider.id ? updatedProvider : p));
  };

  const deleteProvider = (id: string) => {
    setProviders(prev => prev.filter(p => p.id !== id));
    if (selectedProviderId === id) {
      setSelectedProviderId(null);
      setSelectedModel(null);
    }
  };

  const addMcpServer = (server: Omit<MCPServer, 'id'>) => {
    setMcpServers(prev => [...prev, { ...server, id: crypto.randomUUID() }]);
  };

  const updateMcpServer = (updatedServer: MCPServer) => {
    setMcpServers(prev => prev.map(s => s.id === updatedServer.id ? updatedServer : s));
  };

  const deleteMcpServer = async (id: string) => {
    // Disconnect from backend first
    try {
      await fetch('/api/mcp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: id })
      });
    } catch (error) {
      console.error('Error disconnecting server:', error);
    }

    // Remove from localStorage
    setMcpServers(prev => prev.filter(s => s.id !== id));
    if (selectedMcpServerIds.includes(id)) {
      setSelectedMcpServerIds(selectedMcpServerIds.filter(sId => sId !== id));
    }
  };

  const clearChat = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  return (
    <AppContext.Provider value={{
      providers, setProviders,
      mcpServers, setMcpServers,
      selectedProviderId, setSelectedProviderId,
      selectedModel, setSelectedModel,
      selectedMcpServerIds, setSelectedMcpServerIds,
      messages, setMessages,
      clearChat,
      addProvider, updateProvider, deleteProvider,
      addMcpServer, updateMcpServer, deleteMcpServer
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
