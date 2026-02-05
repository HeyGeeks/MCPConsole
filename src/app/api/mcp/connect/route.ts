/**
 * MCP server connection endpoint
 * Handles bulk connection operations for multiple servers
 */

import { NextRequest, NextResponse } from 'next/server';
import { mcpCoordinator } from '@/features/mcp-servers/services/coordinator';
import type { MCPServer } from '@/features/mcp-servers/types';
import { getEnvConfig } from '@/shared/config/env';

/**
 * Build OAuth authorize URL from server config
 */
function buildConnectUrl(config: any): string | null {
  if (!config.oauth2?.authUrl || !config.oauth2?.clientId) {
    return null;
  }
  
  const { appUrl } = getEnvConfig();
  const redirectUri = `${appUrl}/api/mcp/oauth-callback`;
  const scope = config.oauth2.scope || 
    (config.oauth2.scopes ? config.oauth2.scopes.join(' ') : 'openid email profile');
  
  const url = new URL(config.oauth2.authUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.oauth2.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scope);
  
  return url.toString();
}

/**
 * Check if error indicates OAuth authentication is required
 */
function isAuthRequiredError(error: any): boolean {
  if (!error?.message) return false;
  
  const authIndicators = [
    'authorize',
    'token expired',
    'token missing', 
    'Please authorize',
    'ACTION REQUIRED',
    'OAuth2 token',
    '401',
    'Unauthorized'
  ];
  
  return authIndicators.some(indicator => 
    error.message.toLowerCase().includes(indicator.toLowerCase())
  ) || !!error.connectUrl;
}

/**
 * Extract connect URL from error message if present
 */
function extractConnectUrl(errorMessage: string): string | null {
  const match = errorMessage.match(/Connect URL: (.*)$/);
  return match ? match[1] : null;
}

/**
 * POST /api/mcp/connect
 * Connect to multiple MCP servers and disconnect from removed ones
 * 
 * @param req - Request with array of servers to connect
 * @returns Connection results for each server
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const servers: MCPServer[] = body.servers;
    const skipDisconnect = body.skipDisconnect === true; // Don't disconnect others when reconnecting single server

    console.log(`[Connect Route] Received ${servers.length} servers, skipDisconnect=${skipDisconnect}`);

    // Validate input
    if (!Array.isArray(servers)) {
      return NextResponse.json(
        { error: 'Invalid input: expected an array of servers' },
        { status: 400 }
      );
    }

    // Get current tracked server IDs
    const currentIds = mcpCoordinator.getAllConnectionIds();
    const newIds = servers.map(s => s.id);

    // Only disconnect servers that are no longer in the list (unless skipDisconnect is true)
    if (!skipDisconnect) {
      const toDisconnect = currentIds.filter(id => !newIds.includes(id));
      console.log(`[Connect Route] Disconnecting ${toDisconnect.length} servers not in new list`);
      for (const id of toDisconnect) {
        await mcpCoordinator.disconnect(id);
      }
    }

    // Check if we have tokens for any servers
    for (const server of servers) {
      const hasToken = mcpCoordinator.getOAuth2TokenData(server.id) !== undefined;
      console.log(`[Connect Route] Server ${server.name} (${server.id}): hasToken=${hasToken}`);
    }

    // Process each server
    const results = await Promise.all(servers.map(async (server) => {
      // Auto-generate ID if missing
      if (!server.id) {
        server.id = crypto.randomUUID();
      }

      const config = JSON.parse(server.config || '{}');
      
      try {
        // Attempt connection
        await mcpCoordinator.connect(server);
        
        // Success - get the actual connection state
        const connection = mcpCoordinator.getConnection(server.id);
        
        return {
          id: server.id,
          name: server.name,
          status: connection?.status || 'connected',
          error: connection?.error,
          connectUrl: connection?.connectUrl,
        };
      } catch (error: any) {
        console.log(`[Connect Route] Connection failed for ${server.name}:`, error.message);
        
        // Get connection state that coordinator registered
        const connection = mcpCoordinator.getConnection(server.id);
        
        // Determine if this is an auth error
        const isAuthError = isAuthRequiredError(error);
        
        // Build connect URL from various sources
        let connectUrl = error.connectUrl || 
                         extractConnectUrl(error.message || '') ||
                         connection?.connectUrl ||
                         buildConnectUrl(config);

        // Determine final status
        const status = isAuthError ? 'auth_required' : (connection?.status || 'error');
        
        // Ensure state is registered in coordinator if not already
        if (!connection || connection.status !== status) {
          mcpCoordinator.registerConnectionState(
            server,
            status as any,
            error.message,
            connectUrl || undefined
          );
        }
        
        return {
          id: server.id,
          name: server.name,
          status,
          error: error.message,
          connectUrl,
        };
      }
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Error in bulk connect:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect servers' },
      { status: 500 }
    );
  }
}
