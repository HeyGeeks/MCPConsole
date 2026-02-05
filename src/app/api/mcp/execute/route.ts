/**
 * MCP tool execution endpoint
 * Executes a tool on a specific MCP server
 */

import { NextRequest, NextResponse } from 'next/server';
import { mcpCoordinator } from '@/features/mcp-servers/services/coordinator';

/**
 * POST /api/mcp/execute
 * Execute a tool on a specific MCP server
 * 
 * @param req - Request with serverId, toolName, and args
 * @returns Tool execution result
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serverId, toolName, args } = body;

    // Validate required parameters
    if (!serverId || !toolName) {
      return NextResponse.json(
        { error: 'Missing required parameters: serverId and toolName' },
        { status: 400 }
      );
    }

    // Execute tool using coordinator
    const result = await mcpCoordinator.callTool(toolName, args, serverId);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Tool execution error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Tool execution failed',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
