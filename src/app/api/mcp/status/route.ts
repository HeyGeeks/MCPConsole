/**
 * MCP server status endpoint
 * Returns connection status for all tracked servers
 */

import { NextResponse } from 'next/server';
import { mcpCoordinator } from '@/features/mcp-servers/services/coordinator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mcp/status
 * Get connection status for all MCP servers
 * 
 * @returns List of servers with their connection status (including auth_required, disconnected, error, etc.)
 */
export async function GET() {
  try {
    const connections = mcpCoordinator.getSubscribedServers();
    
    // Return all tracked connections with their current state
    const servers = connections.map(conn => {
      // Parse config to get useful info
      let configData: any = {};
      try {
        configData = JSON.parse(conn.server.config || '{}');
      } catch (e) {
        // Ignore parse errors
      }

      return {
        id: conn.server.id,
        name: conn.server.name,
        type: conn.server.type,
        status: conn.status || 'disconnected',
        error: conn.error,
        connectUrl: conn.connectUrl,
        config: conn.server.config,
        // Include OAuth info for debugging
        hasOAuth: !!configData.oauth2,
        hasToken: mcpCoordinator.getOAuth2TokenData(conn.server.id) !== undefined,
      };
    });

    return NextResponse.json(servers);
  } catch (error: any) {
    console.error('Error getting server status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get server status' },
      { status: 500 }
    );
  }
}
