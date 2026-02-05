/**
 * useMcpConnection Hook
 * 
 * Hook for managing MCP server connection state
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { MCPServer, ConnectionStatus } from '../types';
import { connectServers, getMcpStatus } from '@/lib/services/mcp-service';

export function useMcpConnection(server: MCPServer | null) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectUrl, setConnectUrl] = useState<string | undefined>();

  const connect = useCallback(async () => {
    if (!server) return;

    setIsConnecting(true);
    setError(null);
    setConnectUrl(undefined);

    try {
      const response = await connectServers([server]);
      const result = response.results?.find((r: any) => r.id === server.id);

      if (result) {
        setStatus(result.status);
        setError(result.error);
        setConnectUrl(result.connectUrl);
      } else {
        setStatus('connected');
      }
    } catch (err: any) {
      setError(err.message);
      setConnectUrl(err.connectUrl);

      if (err.message?.includes('authorize') || err.message?.includes('token expired') || err.connectUrl) {
        setStatus('auth_required');
      } else {
        setStatus('error');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [server]);

  const disconnect = useCallback(async () => {
    if (!server) return;

    try {
      await fetch('/api/mcp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: server.id })
      });
      setStatus('disconnected');
      setError(null);
      setConnectUrl(undefined);
    } catch (err: any) {
      setError(err.message);
    }
  }, [server]);

  const refreshStatus = useCallback(async () => {
    if (!server) return;

    try {
      const statuses = await getMcpStatus();
      const serverStatus = statuses.find((s: any) => s.id === server.id);
      if (serverStatus) {
        setStatus(serverStatus.status);
        setError(serverStatus.error);
        setConnectUrl(serverStatus.connectUrl);
      }
    } catch (err: any) {
      console.error('Failed to refresh status:', err);
    }
  }, [server]);

  // Auto-refresh status periodically
  useEffect(() => {
    if (server) {
      refreshStatus();
      const interval = setInterval(refreshStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [server, refreshStatus]);

  return {
    status,
    isConnecting,
    error,
    connectUrl,
    connect,
    disconnect,
    refreshStatus,
  };
}
