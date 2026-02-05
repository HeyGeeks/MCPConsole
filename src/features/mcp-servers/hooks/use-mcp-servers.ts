/**
 * useMcpServers Hook
 * 
 * Hook for managing MCP servers state and operations
 */

'use client';

import { useState, useCallback } from 'react';
import type { MCPServer } from '../types';

export function useMcpServers(initialServers: MCPServer[] = []) {
  const [servers, setServers] = useState<MCPServer[]>(initialServers);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addServer = useCallback((server: MCPServer) => {
    setServers(prev => [...prev, server]);
  }, []);

  const updateServer = useCallback((id: string, updates: Partial<MCPServer>) => {
    setServers(prev =>
      prev.map(server =>
        server.id === id ? { ...server, ...updates } : server
      )
    );
  }, []);

  const removeServer = useCallback((id: string) => {
    setServers(prev => prev.filter(server => server.id !== id));
  }, []);

  const getServer = useCallback((id: string) => {
    return servers.find(server => server.id === id);
  }, [servers]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    servers,
    setServers,
    addServer,
    updateServer,
    removeServer,
    getServer,
    isLoading,
    setIsLoading,
    error,
    setError,
    clearError,
  };
}
