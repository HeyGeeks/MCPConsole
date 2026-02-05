/**
 * MCP servers API endpoints
 * Handles listing and managing MCP server connections
 */

import { NextRequest, NextResponse } from 'next/server';
import { mcpCoordinator } from '@/features/mcp-servers/services/coordinator';
import type { MCPServer } from '@/features/mcp-servers/types';

/**
 * GET /api/mcp
 * List all MCP servers with their connection status
 * 
 * @returns List of MCP servers with status
 */
export async function GET() {
  try {
    const servers = mcpCoordinator.getSubscribedServers().map(conn => ({
      ...conn.server,
      status: conn.status,
      error: conn.error,
      connectUrl: conn.connectUrl,
    }));
    
    return NextResponse.json(servers);
  } catch (error: any) {
    console.error('Error listing MCP servers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list servers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mcp
 * Add and connect to a new MCP server
 * 
 * @param req - Request with MCP server configuration
 * @returns Success response with server ID
 */
export async function POST(req: NextRequest) {
  try {
    const server: MCPServer = await req.json();

    // Validate required fields
    if (!server.name || !server.type) {
      return NextResponse.json(
        { error: 'Missing required fields: name and type' },
        { status: 400 }
      );
    }

    // Auto-generate ID if missing
    if (!server.id) {
      server.id = crypto.randomUUID();
    }

    // Connect to the server using coordinator
    await mcpCoordinator.connect(server);
    
    return NextResponse.json(
      { success: true, id: server.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error connecting to MCP server:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect to server' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mcp
 * Disconnect from an MCP server
 * 
 * @param req - Request with server ID in query params
 * @returns Success response
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      );
    }

    // Disconnect using coordinator
    await mcpCoordinator.disconnect(id);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error disconnecting from MCP server:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect from server' },
      { status: 500 }
    );
  }
}
