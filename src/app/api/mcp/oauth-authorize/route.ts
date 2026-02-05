import { NextRequest, NextResponse } from 'next/server';
import { getEnvConfig } from '@/shared/config/env';
import {
  encodeState,
  generateCodeVerifier,
  generateCodeChallenge,
} from '@/lib/oauth-pkce';

// Legacy in-memory store for backwards compatibility during transition
// Will be removed once all instances use the new stateless approach
interface PKCEData {
  verifier: string;
  serverId: string;
  createdAt: number;
}

const globalForPkce = globalThis as unknown as { pkceStore: Map<string, PKCEData> };

if (!globalForPkce.pkceStore) {
  globalForPkce.pkceStore = new Map();
}

const pkceStore = globalForPkce.pkceStore;

// Clean up expired entries (older than 10 minutes)
function cleanupExpiredEntries() {
  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;
  
  for (const [key, value] of pkceStore.entries()) {
    if (now - value.createdAt > TEN_MINUTES) {
      pkceStore.delete(key);
    }
  }
}

export async function POST(req: NextRequest) {
    try {
        // Clean up expired entries
        cleanupExpiredEntries();
        
        const body = await req.json();
        const { authUrl, clientId, scope, redirectUri, serverId } = body;

        if (!authUrl || !clientId) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Generate PKCE code verifier and challenge using the new utility
        const verifier = generateCodeVerifier();
        const challenge = generateCodeChallenge(verifier);
        
        // Encode state with PKCE verifier (serverless-compatible)
        const state = encodeState({ verifier, serverId });

        // Also store in memory for local development (legacy support)
        pkceStore.set(state, { verifier, serverId, createdAt: Date.now() });
        console.log(`[OAuth Authorize] Created state with encoded PKCE for serverId ${serverId}`);

        // Resolve redirect URI with sane defaults
        const { appUrl } = getEnvConfig();
        const fallbackOrigin = req.headers.get('origin') || appUrl;
        const resolvedRedirect = redirectUri || `${fallbackOrigin}/api/mcp/oauth-callback`;

        // Build authorization URL
        const authorizationUrl = new URL(authUrl);
        authorizationUrl.searchParams.append('response_type', 'code');
        authorizationUrl.searchParams.append('client_id', clientId);
        authorizationUrl.searchParams.append('redirect_uri', resolvedRedirect);
        authorizationUrl.searchParams.append('code_challenge', challenge);
        authorizationUrl.searchParams.append('code_challenge_method', 'S256');
        authorizationUrl.searchParams.append('state', state);
        
        authorizationUrl.searchParams.append('scope', scope || 'openid email profile');

        return NextResponse.json({
            authorizationUrl: authorizationUrl.toString(),
            state
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Export the store for use in callback (legacy)
export { pkceStore };
