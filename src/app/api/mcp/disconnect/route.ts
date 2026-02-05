/**
 * MCP server disconnection endpoint
 * Handles disconnecting from a specific server
 */

import { NextRequest, NextResponse } from 'next/server';
import { mcpCoordinator } from '@/features/mcp-servers/services/coordinator';

/**
 * POST /api/mcp/disconnect
 * Disconnect from a specific MCP server
 * 
 * @param req - Request with server ID
 * @returns Success response
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serverId } = body;

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      );
    }

    // Disconnect using coordinator
    await mcpCoordinator.disconnect(serverId);
    
    return NextResponse.json({
      success: true,
      message: 'Server disconnected',
    });
  } catch (error: any) {
    console.error('Error disconnecting from server:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect from server' },
      { status: 500 }
    );
  }
}
