/**
 * OAuth token setting endpoint
 * Sets OAuth2 token for a specific server
 */

import { NextRequest, NextResponse } from 'next/server';
import { mcpCoordinator } from '@/features/mcp-servers/services/coordinator';

/**
 * POST /api/mcp/set-token
 * Set OAuth2 token for a specific MCP server
 * 
 * @param req - Request with serverId and tokenData
 * @returns Success response
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serverId, tokenData } = body;

    if (!serverId || !tokenData) {
      return NextResponse.json(
        { error: 'Missing required parameters: serverId and tokenData' },
        { status: 400 }
      );
    }

    console.log(`[Set Token] Storing token for server ${serverId}, hasAccessToken=${!!tokenData.access_token}`);
    
    // Set token using coordinator
    mcpCoordinator.setOAuth2Token(serverId, tokenData);
    
    // Verify token was stored
    const storedToken = mcpCoordinator.getOAuth2TokenData(serverId);
    console.log(`[Set Token] Token stored successfully for ${serverId}, verified=${!!storedToken}`);
    
    return NextResponse.json({ success: true, verified: !!storedToken });
  } catch (error: any) {
    console.error('Error setting OAuth token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set token' },
      { status: 500 }
    );
  }
}
