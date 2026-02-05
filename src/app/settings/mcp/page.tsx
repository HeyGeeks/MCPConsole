'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useAppContext } from '@/shared/context';
import { McpServerList, McpServerForm, McpDebugView } from '@/features/mcp-servers/components';
import { useMcpAuthSession } from '@/features/mcp-servers/hooks';
import type { MCPServer } from '@/lib/types';
import { useToast } from "@/shared/hooks";

function McpServersContent() {
  const { mcpServers, addMcpServer, updateMcpServer, deleteMcpServer } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServer | undefined>(undefined);
  const [handledCallback, setHandledCallback] = useState(false);
  const [authorizingServerId, setAuthorizingServerId] = useState<string | null>(null);
  const [processingAuthServerId, setProcessingAuthServerId] = useState<string | null>(null);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const processingRef = useRef(false);
  const statusRefreshRef = useRef<{ refresh: () => void } | null>(null);

  // Check MCP auth status on page load using the centralized hook
  const { 
    serverStatuses: _serverStatuses, 
    hasAuthRequired: _hasAuthRequired, 
    isLoading: _isMcpLoading,
    refreshStatus: refreshMcpStatus,
    connectServer: _connectServer,
  } = useMcpAuthSession(mcpServers, {
    autoConnect: true,
    autoCheck: true,
  });

  // Sync the refresh function with the status ref for child components
  useEffect(() => {
    if (statusRefreshRef.current) {
      statusRefreshRef.current.refresh = refreshMcpStatus;
    }
  }, [refreshMcpStatus]);

  // Handle OAuth2 callback via postMessage from popup window
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate origin for security
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'oauth-callback') {
        const { code, state, verifier, serverId, error } = event.data;

        if (error) {
          toast({
            title: "Authorization Failed",
            description: `Error: ${error}`,
            variant: "destructive"
          });
          return;
        }

        if (code && state && verifier && serverId) {
          setProcessingAuthServerId(serverId);
          setAuthorizingServerId(null); // Close the "waiting" state
          try {
            await handleOAuthCallback(code, verifier, serverId);
          } catch (err: any) {
            toast({
              title: "Authorization Failed",
              description: err.message,
              variant: "destructive"
            });
            setProcessingAuthServerId(null);
          }
          // Note: processingAuthServerId is cleared inside handleOAuthCallback after status refresh
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mcpServers, toast]);

  // Fallback: Handle OAuth2 callback via URL params (for browsers that block popups)
  useEffect(() => {
    if (handledCallback || processingRef.current) return;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const verifier = searchParams.get('verifier');
    const serverId = searchParams.get('serverId');
    const error = searchParams.get('error');

    if (error) {
      toast({
        title: "Authorization Failed",
        description: `Error: ${error}`,
        variant: "destructive"
      });
      setHandledCallback(true);
      window.history.replaceState({}, '', '/settings/mcp');
      return;
    }

    if (code && state && verifier && serverId) {
      if (!mcpServers.length) return; // wait for localStorage to hydrate

      processingRef.current = true;
      setProcessingAuthServerId(serverId);
      (async () => {
        try {
          await handleOAuthCallback(code, verifier, serverId);
          window.history.replaceState({}, '', '/settings/mcp');
        } catch (err: any) {
          toast({
            title: "Authorization Failed",
            description: err.message,
            variant: "destructive"
          });
          setProcessingAuthServerId(null);
        } finally {
          setHandledCallback(true);
          processingRef.current = false;
          // Note: processingAuthServerId is cleared inside handleOAuthCallback after status refresh
        }
      })();
    }
  }, [searchParams, mcpServers, handledCallback, toast]);

  const handleOAuthCallback = async (code: string, verifier: string, serverId: string) => {
    try {
      const server = mcpServers.find(s => s.id === serverId);
      if (!server) {
        throw new Error('Server not found');
      }

      const config = JSON.parse(server.config);
      let tokenUrl: string | undefined = config.oauth2?.tokenUrl;
      let clientId: string | undefined = config.oauth2?.clientId;
      let scope: string | undefined = config.oauth2?.scope;
      let connectUrl: string | undefined;

      // Fetch latest server status to retrieve connectUrl hints if present
      try {
        const statusRes = await fetch('/api/mcp/status');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const found = statusData.find((s: any) => s.id === serverId);
          connectUrl = found?.connectUrl;
        }
      } catch (e) {
        console.warn('Failed to fetch status for connectUrl hints', e);
      }

      // Derive missing OAuth fields from connectUrl or server base
      if ((!tokenUrl || !clientId || !scope) && connectUrl) {
        try {
          const derived = new URL(connectUrl);
          clientId = clientId || derived.searchParams.get('client_id') || undefined;
          scope = scope || derived.searchParams.get('scope') || undefined;
          if (!tokenUrl) {
            tokenUrl = `${derived.origin}/oauth/token`;
          }
        } catch (e) {
          console.warn('Failed to parse connectUrl during callback', e);
        }
      }

      // Final fallback: derive token URL from server base origin
      if (!tokenUrl && config.url) {
        try {
          const base = new URL(config.url);
          tokenUrl = `${base.origin}/oauth/token`;
        } catch (e) {
          console.warn('Failed to derive tokenUrl from server url', e);
        }
      }

      if (!tokenUrl) {
        throw new Error('Token URL not configured');
      }

      // Exchange code for token
      const response = await fetch('/api/mcp/oauth-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenUrl,
          code,
          verifier,
          clientId,
          clientSecret: config.oauth2.clientSecret,
          redirectUri: `${window.location.origin}/api/mcp/oauth-callback`,
        })
      });

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      const tokenData = await response.json();

      // Persist any derived OAuth config for future runs
      let updatedServer = server;
      if (clientId || scope || tokenUrl) {
        config.oauth2 = config.oauth2 || {};
        if (clientId) config.oauth2.clientId = clientId;
        if (scope) config.oauth2.scope = scope;
        if (tokenUrl) config.oauth2.tokenUrl = tokenUrl;
        updatedServer = { ...server, config: JSON.stringify(config) };
        updateMcpServer(updatedServer);
      }

      // Store token in backend
      const setTokenRes = await fetch('/api/mcp/set-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId, tokenData })
      });
      
      if (!setTokenRes.ok) {
        throw new Error('Failed to store token');
      }

      // Persist token to localStorage via custom event
      window.dispatchEvent(new CustomEvent('mcp-token-update', {
        detail: { serverId, tokenData }
      }));

      // Reconnect the server with updated config (skipDisconnect to not affect other servers)
      const reconnectRes = await fetch('/api/mcp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servers: [updatedServer], skipDisconnect: true })
      });

      if (!reconnectRes.ok) {
        throw new Error('Failed to reconnect server after authorization');
      }

      const reconnectData = await reconnectRes.json();
      const result = reconnectData.results?.[0];

      // Check if reconnection was successful
      if (result?.status === 'connected') {
        toast({
          title: "Authorization Successful",
          description: `"${server.name}" has been authorized and connected.`
        });
        // Refresh status and then clear processing state
        await refreshMcpStatus();
        setProcessingAuthServerId(null);
      } else if (result?.status === 'auth_required') {
        toast({
          title: "Authorization Incomplete",
          description: `"${server.name}" authorization was received, but connection still requires authentication. Please try again.`,
          variant: "destructive"
        });
        setProcessingAuthServerId(null);
      } else if (result?.status === 'error') {
        setProcessingAuthServerId(null);
        throw new Error(`Connection failed: ${result?.error || 'Unknown error'}`);
      } else {
        // Unknown status, clear processing state
        setProcessingAuthServerId(null);
      }
    } catch (error: any) {
      setProcessingAuthServerId(null);
      toast({
        title: "Authorization Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleAuthorize = async (server: MCPServer, connectUrl?: string) => {
    try {
      const config = JSON.parse(server.config);
      const oauth2 = config.oauth2;

      if (!oauth2) {
        throw new Error('OAuth2 not configured');
      }

      let authUrl = oauth2.authUrl;
      let tokenUrl = oauth2.tokenUrl;
      let clientId = oauth2.clientId;
      let scope = oauth2.scope || 'openid email profile';
      const redirectUri = `${window.location.origin}/api/mcp/oauth-callback`;

      // Auto-discover if needed
      if (oauth2.autoDiscover && oauth2.baseUrl) {
        const discoveryResponse = await fetch('/api/mcp/discover-oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseUrl: oauth2.baseUrl })
        });

        if (discoveryResponse.ok) {
          const discovery = await discoveryResponse.json();
          authUrl = discovery.discovery.authorizationEndpoint;
          tokenUrl = discovery.discovery.tokenEndpoint;

          // Update server config with discovered URLs
          config.oauth2.authUrl = authUrl;
          config.oauth2.tokenUrl = tokenUrl;
          updateMcpServer({ ...server, config: JSON.stringify(config) });
        }
      }

      // If config is missing critical fields, attempt to derive from a provided connectUrl
      if ((!authUrl || !clientId || !scope) && connectUrl) {
        try {
          const derived = new URL(connectUrl);
          authUrl = authUrl || `${derived.origin}${derived.pathname}`;
          clientId = clientId || derived.searchParams.get('client_id') || undefined;
          scope = scope || derived.searchParams.get('scope') || 'openid email profile';

          if (authUrl || clientId) {
            config.oauth2.authUrl = authUrl;
            config.oauth2.clientId = clientId;
            config.oauth2.scope = scope;
            updateMcpServer({ ...server, config: JSON.stringify(config) });
          }
        } catch (parseError) {
          console.warn('Failed to parse connectUrl for fallback auth data', parseError);
        }
      }

      const missingFields = [] as string[];
      if (!authUrl) missingFields.push('authorization endpoint');
      if (!tokenUrl) missingFields.push('token endpoint');
      if (!clientId) missingFields.push('client_id');
      if (missingFields.length) {
        throw new Error(`Missing OAuth config: ${missingFields.join(', ')}`);
      }

      // Start OAuth2 flow
      const authResponse = await fetch('/api/mcp/oauth-authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authUrl,
          clientId,
          scope,
          serverId: server.id,
          redirectUri
        })
      });

      if (!authResponse.ok) {
        throw new Error('Failed to start authorization');
      }

      const { authorizationUrl } = await authResponse.json();

      // Set authorizing state before opening popup
      setAuthorizingServerId(server.id);

      // Open authorization URL in a new tab
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        authorizationUrl,
        'oauth-authorize',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      // Monitor popup close to reset state if user closes without completing
      if (popup) {
        const checkPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopup);
            // Only reset if not already processing callback
            setAuthorizingServerId(prev => prev === server.id ? null : prev);
          }
        }, 500);
      }
    } catch (error: any) {
      setAuthorizingServerId(null);
      toast({
        title: "Authorization Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleAddClick = () => {
    setEditingServer(undefined);
    setIsFormOpen(true);
  };

  const handleEditClick = (server: MCPServer) => {
    setEditingServer(server);
    setIsFormOpen(true);
  };

  const handleSubmit = (data: Omit<MCPServer, 'id'> | MCPServer) => {
    if ('id' in data) {
      updateMcpServer(data);
      toast({ title: "MCP Server Updated", description: `"${data.name}" has been successfully updated.` });
    } else {
      addMcpServer(data);
      toast({ title: "MCP Server Added", description: `"${data.name}" has been successfully added.` });
    }
  };

  const handleDelete = (id: string) => {
    deleteMcpServer(id);
    toast({ title: "MCP Server Deleted", description: "The MCP server has been deleted." });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl md:text-2xl">MCP Servers</CardTitle>
              <CardDescription className="text-sm md:text-base">
                Add, edit, or remove your MCP server configurations.
              </CardDescription>
            </div>
            <Button onClick={handleAddClick} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Server
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <McpServerList
            ref={statusRefreshRef}
            servers={mcpServers}
            onEdit={handleEditClick}
            onDelete={handleDelete}
            onAuthorize={handleAuthorize}
            authorizingServerId={authorizingServerId}
            processingAuthServerId={processingAuthServerId}
          />
        </CardContent>
      </Card>

      <McpDebugView />

      <McpServerForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmit}
        server={editingServer}
      />
    </div>
  );
}

export default function McpServersPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <McpServersContent />
    </Suspense>
  );
}
