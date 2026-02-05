/**
 * OAuth discovery endpoint
 * Discovers OAuth configuration from a server URL using multiple methods
 */

import { NextRequest, NextResponse } from 'next/server';

interface OAuthDiscoveryResult {
  tokenEndpoint?: string;
  authorizationEndpoint?: string;
  registrationUrl?: string;
  scopesSupported?: string[];
  requiresAuth?: boolean;
}

/**
 * Try to discover OAuth configuration using multiple methods:
 * 1. First try Protected Resource Metadata (/.well-known/oauth-protected-resource)
 * 2. Then try Authorization Server Metadata (/.well-known/oauth-authorization-server)
 * 3. Try probing the server to check if it returns 401 with WWW-Authenticate header
 */
async function discoverOAuthWithMultipleMethods(serverUrl: string): Promise<OAuthDiscoveryResult | null> {
  console.log(`[OAuth Discovery] Starting discovery for ${serverUrl}`);

  // Ensure we have a clean origin URL
  let origin: string;
  try {
    const url = new URL(serverUrl);
    origin = url.origin;
  } catch {
    console.error(`[OAuth Discovery] Invalid URL: ${serverUrl}`);
    return null;
  }

  let authorizationServers: string[] = [];
  let scopes: string[] = ['openid', 'email', 'profile'];
  let requiresAuth = false;

  // Method 1: Try Protected Resource Metadata (RFC 9728)
  console.log(`[OAuth Discovery] Trying Protected Resource Metadata...`);
  const prmUrls = [
    `${origin}/.well-known/oauth-protected-resource`,
  ];

  for (const prmUrl of prmUrls) {
    try {
      console.log(`[OAuth Discovery] Fetching ${prmUrl}`);
      const response = await fetch(prmUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const prm = await response.json();
        console.log(`[OAuth Discovery] Found PRM:`, prm);

        if (prm.authorization_servers) {
          authorizationServers = Array.isArray(prm.authorization_servers)
            ? prm.authorization_servers
            : [prm.authorization_servers];
        } else if (prm.authorization_server) {
          authorizationServers = [prm.authorization_server];
        }

        if (prm.scopes_supported) {
          scopes = prm.scopes_supported;
        }

        requiresAuth = true;
        break;
      }
    } catch (err) {
      console.log(`[OAuth Discovery] PRM fetch failed for ${prmUrl}:`, err);
    }
  }

  // If no auth servers found from PRM, try ASM directly on the origin
  if (authorizationServers.length === 0) {
    authorizationServers = [origin];
  }

  // Method 2: Fetch Authorization Server Metadata (RFC 8414)
  let authMeta: any = null;
  for (const authServer of authorizationServers) {
    const asmUrl = new URL('/.well-known/oauth-authorization-server', authServer).toString();
    console.log(`[OAuth Discovery] Fetching ASM from ${asmUrl}`);

    try {
      const response = await fetch(asmUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        authMeta = await response.json();
        console.log(`[OAuth Discovery] Found ASM:`, authMeta);

        if (authMeta.scopes_supported && !requiresAuth) {
          scopes = authMeta.scopes_supported;
        }
        break;
      }
    } catch (err) {
      console.log(`[OAuth Discovery] ASM fetch failed for ${asmUrl}:`, err);
    }
  }

  // Method 3: If still no ASM, try OpenID Connect discovery
  if (!authMeta) {
    for (const authServer of authorizationServers) {
      const oidcUrl = new URL('/.well-known/openid-configuration', authServer).toString();
      console.log(`[OAuth Discovery] Trying OIDC discovery at ${oidcUrl}`);

      try {
        const response = await fetch(oidcUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
          authMeta = await response.json();
          console.log(`[OAuth Discovery] Found OIDC config:`, authMeta);
          break;
        }
      } catch (err) {
        console.log(`[OAuth Discovery] OIDC discovery failed for ${oidcUrl}:`, err);
      }
    }
  }

  // Build result
  if (authMeta) {
    return {
      tokenEndpoint: authMeta.token_endpoint,
      authorizationEndpoint: authMeta.authorization_endpoint,
      registrationUrl: authMeta.registration_endpoint,
      scopesSupported: scopes,
      requiresAuth,
    };
  }

  // Method 4: Probe the server to check if it needs auth
  console.log(`[OAuth Discovery] Probing ${serverUrl} for auth requirements...`);
  try {
    const probeResponse = await fetch(serverUrl, { method: 'GET' });

    if (probeResponse.status === 401) {
      const wwwAuth = probeResponse.headers.get('www-authenticate');
      console.log(`[OAuth Discovery] Server requires auth. WWW-Authenticate:`, wwwAuth);

      // Try to extract hints from WWW-Authenticate header
      if (wwwAuth) {
        const realmMatch = /realm="([^"]+)"/.exec(wwwAuth);
        if (realmMatch) {
          console.log(`[OAuth Discovery] Found realm:`, realmMatch[1]);
        }
      }

      // Return partial info - server needs auth but we couldn't discover endpoints
      return {
        requiresAuth: true,
        scopesSupported: scopes,
      };
    }
  } catch (err) {
    console.log(`[OAuth Discovery] Probe failed:`, err);
  }

  console.log(`[OAuth Discovery] No OAuth configuration found`);
  return null;
}

/**
 * POST /api/mcp/discover-oauth
 * Discover OAuth2 configuration from a server's well-known endpoint
 * 
 * @param req - Request with baseUrl
 * @returns OAuth discovery information
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { baseUrl } = body;

    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Base URL is required' },
        { status: 400 }
      );
    }

    // Try multiple discovery methods
    const discovery = await discoverOAuthWithMultipleMethods(baseUrl);

    if (!discovery) {
      return NextResponse.json(
        {
          error: 'OAuth2 discovery failed',
          details: `No OAuth endpoints found. The server may not support OAuth2 discovery.`,
        },
        { status: 404 }
      );
    }

    // Check if we only found partial info (server needs auth but no endpoints discovered)
    if (discovery.requiresAuth && !discovery.tokenEndpoint && !discovery.authorizationEndpoint) {
      return NextResponse.json(
        {
          error: 'Partial discovery',
          details: 'Server requires authentication but OAuth endpoints could not be auto-discovered. Please configure them manually.',
          partial: true,
          requiresAuth: true,
          scopesSupported: discovery.scopesSupported,
        },
        { status: 206 }
      );
    }

    return NextResponse.json({
      success: true,
      discovery: {
        tokenEndpoint: discovery.tokenEndpoint,
        authorizationEndpoint: discovery.authorizationEndpoint,
        scopesSupported: discovery.scopesSupported || [],
        requiresAuth: discovery.requiresAuth,
        registrationUrl: discovery.registrationUrl,
      },
    });
  } catch (error: any) {
    console.error('OAuth discovery error:', error);
    return NextResponse.json(
      {
        error: 'Discovery request failed',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
