/**
 * useMcpAuthSession Hook
 * 
 * Centralized hook for managing MCP OAuth session state across the app.
 * Handles:
 * - Checking MCP connection status on page load
 * - Auto-connecting servers when tokens are available
 * - Managing auth state for multiple servers
 * - Providing UI with current connection status
 * 
 * Based on mcp-remote OAuth implementation patterns:
 * - Discovery: RFC 9728 (Protected Resource Metadata) and RFC 8414
 * - Provider Pattern: OAuthClientProvider interface
 * - Lazy Authentication: Connect anonymously first, handle 401 by triggering auth
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MCPServer } from '@/lib/types';
import type { ConnectionStatus } from '../types';

export interface MCPServerStatus {
  id: string;
  name: string;
  status: ConnectionStatus;
  error?: string;
  connectUrl?: string;
  hasToken?: boolean;
}

export interface MCPAuthSessionState {
  /** Current status of all servers */
  serverStatuses: MCPServerStatus[];
  /** Whether initial status check is in progress */
  isLoading: boolean;
  /** Whether any server requires authentication */
  hasAuthRequired: boolean;
  /** Whether all servers are connected */
  allConnected: boolean;
  /** Last error message */
  error: string | null;
  /** Timestamp of last status check */
  lastChecked: number | null;
}

interface UseMcpAuthSessionOptions {
  /** Auto-check status on mount (default: true) */
  autoCheck?: boolean;
  /** Auto-connect servers on mount (default: true) */
  autoConnect?: boolean;
  /** Polling interval in ms (0 to disable, default: 0) */
  pollInterval?: number;
}

/**
 * Check MCP connection status from backend
 */
async function fetchMcpStatus(): Promise<MCPServerStatus[]> {
  try {
    const response = await fetch('/api/mcp/status');
    if (!response.ok) {
      throw new Error(`Failed to fetch status: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[useMcpAuthSession] Failed to fetch MCP status:', error);
    return [];
  }
}

/**
 * Connect servers via backend
 */
async function connectMcpServers(servers: MCPServer[]): Promise<{ results: MCPServerStatus[] }> {
  try {
    const response = await fetch('/api/mcp/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ servers })
    });
    if (!response.ok) {
      throw new Error(`Failed to connect servers: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[useMcpAuthSession] Failed to connect servers:', error);
    return { results: [] };
  }
}

/**
 * Hook for managing MCP auth session state across the app
 */
export function useMcpAuthSession(
  servers: MCPServer[],
  options: UseMcpAuthSessionOptions = {}
) {
  const {
    autoCheck = true,
    autoConnect = true,
    pollInterval = 0,
  } = options;

  const [state, setState] = useState<MCPAuthSessionState>({
    serverStatuses: [],
    isLoading: false,
    hasAuthRequired: false,
    allConnected: false,
    error: null,
    lastChecked: null,
  });

  const mountedRef = useRef(true);
  const checkingRef = useRef(false);
  const serversRef = useRef(servers);
  serversRef.current = servers;

  /**
   * Refresh status from backend
   */
  const refreshStatus = useCallback(async () => {
    if (checkingRef.current || !mountedRef.current) return;
    
    checkingRef.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const statuses = await fetchMcpStatus();
      
      if (!mountedRef.current) return;

      // Map backend statuses to our format, merge with known servers
      const serverIds = new Set(serversRef.current.map(s => s.id));
      const mappedStatuses: MCPServerStatus[] = statuses
        .filter(s => serverIds.has(s.id))
        .map(s => ({
          id: s.id,
          name: s.name,
          status: s.status,
          error: s.error,
          connectUrl: s.connectUrl,
          hasToken: s.hasToken,
        }));

      // Include servers not in backend response
      for (const server of serversRef.current) {
        if (!mappedStatuses.find(s => s.id === server.id)) {
          mappedStatuses.push({
            id: server.id,
            name: server.name,
            status: 'disconnected',
          });
        }
      }

      const hasAuthRequired = mappedStatuses.some(s => s.status === 'auth_required');
      const allConnected = mappedStatuses.length > 0 && 
        mappedStatuses.every(s => s.status === 'connected');

      setState({
        serverStatuses: mappedStatuses,
        isLoading: false,
        hasAuthRequired,
        allConnected,
        error: null,
        lastChecked: Date.now(),
      });
    } catch (error: any) {
      if (!mountedRef.current) return;
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to check status',
      }));
    } finally {
      checkingRef.current = false;
    }
  }, []);

  /**
   * Connect all servers
   */
  const connectAll = useCallback(async () => {
    if (serversRef.current.length === 0 || !mountedRef.current) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { results } = await connectMcpServers(serversRef.current);
      
      if (!mountedRef.current) return;

      const mappedStatuses: MCPServerStatus[] = results.map(r => ({
        id: r.id,
        name: r.name,
        status: r.status,
        error: r.error,
        connectUrl: r.connectUrl,
      }));

      const hasAuthRequired = mappedStatuses.some(s => s.status === 'auth_required');
      const allConnected = mappedStatuses.length > 0 && 
        mappedStatuses.every(s => s.status === 'connected');

      setState({
        serverStatuses: mappedStatuses,
        isLoading: false,
        hasAuthRequired,
        allConnected,
        error: null,
        lastChecked: Date.now(),
      });
    } catch (error: any) {
      if (!mountedRef.current) return;
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to connect servers',
      }));
    }
  }, []);

  /**
   * Connect a single server
   */
  const connectServer = useCallback(async (serverId: string) => {
    const server = serversRef.current.find(s => s.id === serverId);
    if (!server || !mountedRef.current) return;

    try {
      const response = await fetch('/api/mcp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servers: [server], skipDisconnect: true })
      });
      
      if (!response.ok) {
        throw new Error('Failed to connect server');
      }

      const { results } = await response.json();
      const result = results?.[0];

      if (result && mountedRef.current) {
        setState(prev => {
          const newStatuses = prev.serverStatuses.map(s => 
            s.id === serverId 
              ? { ...s, status: result.status, error: result.error, connectUrl: result.connectUrl }
              : s
          );
          const hasAuthRequired = newStatuses.some(s => s.status === 'auth_required');
          const allConnected = newStatuses.length > 0 && 
            newStatuses.every(s => s.status === 'connected');
          
          return {
            ...prev,
            serverStatuses: newStatuses,
            hasAuthRequired,
            allConnected,
            lastChecked: Date.now(),
          };
        });
      }
    } catch (error: any) {
      console.error(`[useMcpAuthSession] Failed to connect server ${serverId}:`, error);
    }
  }, []);

  /**
   * Get status for a specific server
   */
  const getServerStatus = useCallback((serverId: string): MCPServerStatus | undefined => {
    return state.serverStatuses.find(s => s.id === serverId);
  }, [state.serverStatuses]);

  // Initial check/connect on mount
  useEffect(() => {
    mountedRef.current = true;

    if (servers.length > 0) {
      if (autoConnect) {
        // Connect servers (which also returns status)
        connectAll();
      } else if (autoCheck) {
        // Just check status
        refreshStatus();
      }
    }

    return () => {
      mountedRef.current = false;
    };
  }, [autoCheck, autoConnect]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-check when servers list changes
  useEffect(() => {
    if (servers.length > 0 && state.lastChecked !== null) {
      if (autoConnect) {
        connectAll();
      } else if (autoCheck) {
        refreshStatus();
      }
    }
  }, [servers.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Optional polling
  useEffect(() => {
    if (pollInterval > 0 && servers.length > 0) {
      const interval = setInterval(refreshStatus, pollInterval);
      return () => clearInterval(interval);
    }
  }, [pollInterval, servers.length, refreshStatus]);

  return {
    ...state,
    refreshStatus,
    connectAll,
    connectServer,
    getServerStatus,
  };
}

export default useMcpAuthSession;
