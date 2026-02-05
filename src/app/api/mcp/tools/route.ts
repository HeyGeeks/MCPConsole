/**
 * MCP tools endpoint
 * Lists all available tools from connected servers
 */

import { NextResponse } from 'next/server';
import { mcpCoordinator } from '@/features/mcp-servers/services/coordinator';

/**
 * GET /api/mcp/tools
 * List all available tools from connected MCP servers
 * 
 * @returns List of available tools
 */
export async function GET() {
  try {
    const tools = await mcpCoordinator.listTools();
    return NextResponse.json(tools);
  } catch (error: any) {
    console.error('Error listing tools:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list tools' },
      { status: 500 }
    );
  }
}
