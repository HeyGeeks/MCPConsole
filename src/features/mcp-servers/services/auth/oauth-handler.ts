/**
 * OAuth Handler
 * 
 * Handles OAuth2 authentication for MCP servers including:
 * - OAuth discovery
 * - Dynamic client registration
 * - Token management and refresh
 * - Authorization flow
 */

import { getEnvConfig } from '@/shared/config/env';
import type {
  OAuth2Config,
  OAuth2Token,
  OAuthDiscoveryResult,
  OAuthSession,
  TokenSet,
  ClientCredentials,
} from '../../types';

export class OAuthHandler {
  private oauth2Tokens: Map<string, OAuth2Token> = new Map();

  /**
   * Set OAuth2 token for a server
   */
  public setOAuth2Token(serverId: string, tokenData: any): void {
    console.log(`[OAuthHandler] Setting OAuth2 token for server ${serverId}`);
    const now = Date.now();
    const token: OAuth2Token = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in || 3600,
      expires_at: now + (tokenData.expires_in || 3600) * 1000,
      refresh_token: tokenData.refresh_token,
    };
    this.oauth2Tokens.set(serverId, token);
  }

  /**
   * Get OAuth2 token data for a server
   */
  public getOAuth2TokenData(serverId: string): OAuth2Token | undefined {
    return this.oauth2Tokens.get(serverId);
  }

  /**
   * Clear OAuth2 token for a server
   */
  public clearOAuth2Token(serverId: string): void {
    this.oauth2Tokens.delete(serverId);
  }

  /**
   * Discover OAuth configuration for a server URL
   */
  public async discoverOAuthConfiguration(serverUrl: string): Promise<OAuthDiscoveryResult | null> {
    console.log(`[OAuthHandler] Discovering OAuth configuration for ${serverUrl}`);
    const url = new URL(serverUrl);
    const rootUrl = url.origin;
    const pathname = url.pathname === '/' ? '' : url.pathname;

    try {
      // Step 1: Probe the resource and inspect WWW-Authenticate for hints
      let headerScope: string | undefined;
      let resourceMetadataUrl: string | undefined;
      let probeRequiresAuth = false;

      try {
        const probe = await fetch(serverUrl, { method: 'GET' });
        if (probe.status === 401) {
          probeRequiresAuth = true;
          const wwwAuth = probe.headers.get('www-authenticate') || probe.headers.get('WWW-Authenticate');
          if (wwwAuth) {
            const metaMatch = /resource_metadata="([^"]+)"/i.exec(wwwAuth);
            const scopeMatch = /scope="([^"]+)"/i.exec(wwwAuth);
            if (metaMatch) {
              resourceMetadataUrl = metaMatch[1];
            }
            if (scopeMatch) {
              headerScope = scopeMatch[1];
            }
          }
        } else if (probe.ok) {
          console.log(`[OAuthHandler] Probe successful (no auth required)`);
          return null; // No auth needed
        }
      } catch (probeError: any) {
        // Handle network errors (DNS, connection refused, etc.)
        if (probeError?.cause?.code === 'ENOTFOUND' || 
            probeError?.cause?.code === 'ECONNREFUSED' ||
            probeError?.cause?.code === 'ETIMEDOUT') {
          console.warn(`[OAuthHandler] Network error during probe (${probeError?.cause?.code}), skipping OAuth discovery`);
          return null; // Skip auth discovery for network errors
        }
        console.warn(`[OAuthHandler] Initial probe failed, continuing discovery`, probeError);
      }

      // Step 2: Protected Resource Metadata discovery
      const candidateUrls: string[] = [];
      if (resourceMetadataUrl) {
        candidateUrls.push(resourceMetadataUrl);
      }
      candidateUrls.push(`${rootUrl}/.well-known/oauth-protected-resource${pathname}`);
      candidateUrls.push(`${rootUrl}/.well-known/oauth-protected-resource`);

      let prm: any | null = null;
      for (const candidate of candidateUrls) {
        try {
          console.log(`[OAuthHandler] Probing ${candidate}`);
          const res = await fetch(candidate);
          if (!res.ok) {
            console.log(`[OAuthHandler] No OAuth discovery at ${candidate} (${res.status})`);
            continue;
          }
          prm = await res.json();
          console.log(`[OAuthHandler] Found OAuth Protected Resource Metadata:`, prm);
          break;
        } catch (err) {
          console.warn(`[OAuthHandler] Error fetching ${candidate}:`, err);
        }
      }

      if (!prm) {
        return null;
      }

      // Step 3: Authorization Server Metadata discovery
      const authServer = prm.authorization_server || (prm.authorization_servers && prm.authorization_servers[0]);
      let authMeta: any | null = null;
      if (authServer) {
        const asmUrl = new URL("/.well-known/oauth-authorization-server", authServer).toString();
        console.log(`[OAuthHandler] Fetching Auth Server Metadata from ${asmUrl}`);
        try {
          const authRes = await fetch(asmUrl);
          if (authRes.ok) {
            authMeta = await authRes.json();
            console.log(`[OAuthHandler] Found Auth Server Metadata:`, authMeta);
          } else {
            console.log(`[OAuthHandler] Auth server metadata missing (${authRes.status})`);
          }
        } catch (err) {
          console.warn(`[OAuthHandler] Auth server metadata fetch failed:`, err);
        }
      }

      const scopes = this.resolveScopes({
        userScope: undefined,
        headerScope,
        prmScopes: prm.scopes_supported,
        asmScopes: authMeta?.scopes_supported,
      });

      return {
        ...prm,
        tokenUrl: authMeta?.token_endpoint,
        authUrl: authMeta?.authorization_endpoint,
        registrationUrl: authMeta?.registration_endpoint,
        scopes,
        headerScope,
        requiresAuth: probeRequiresAuth,
      };
    } catch (e) {
      console.warn(`[OAuthHandler] OAuth discovery failed:`, e);
    }
    return null;
  }

  /**
   * Resolve scopes from various sources with priority
   */
  private resolveScopes(input: {
    userScope?: string | string[];
    headerScope?: string;
    prmScopes?: string[];
    asmScopes?: string[];
    registrationScopes?: string[];
  }): string[] {
    // Scope priority: user config > WWW-Authenticate > PRM > DCR > ASM > fallback
    const { userScope, headerScope, prmScopes, registrationScopes, asmScopes } = input;

    if (userScope) {
      return Array.isArray(userScope) ? userScope : userScope.split(/\s+/).filter(Boolean);
    }
    if (headerScope) {
      return headerScope.split(/\s+/).filter(Boolean);
    }
    if (prmScopes?.length) {
      return prmScopes;
    }
    if (registrationScopes?.length) {
      return registrationScopes;
    }
    if (asmScopes?.length) {
      return asmScopes;
    }
    return ["openid", "email", "profile"];
  }

  /**
   * Get redirect URI for OAuth callback
   */
  private getRedirectUri(): string {
    const { appUrl } = getEnvConfig();
    return `${appUrl}/api/mcp/oauth-callback`;
  }

  /**
   * Register a dynamic client with the authorization server
   */
  public async registerDynamicClient(
    registrationUrl: string,
    scopes: string[]
  ): Promise<ClientCredentials | null> {
    console.log(`[OAuthHandler] Attempting Dynamic Client Registration at ${registrationUrl}`);
    try {
      const registrationBody = {
        client_name: "Universal OpenAI API Tester",
        redirect_uris: [this.getRedirectUri()],
        grant_types: ["authorization_code", "refresh_token"],
        token_endpoint_auth_method: "none", // Public client with PKCE
        response_types: ["code"],
        scope: scopes.join(" ") || "openid profile email offline_access",
      };

      const response = await fetch(registrationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationBody),
      });

      if (response.ok) {
        const clientData = await response.json();
        console.log(`[OAuthHandler] DCR Successful. Client ID: ${clientData.client_id}`);
        return {
          clientId: clientData.client_id,
          clientSecret: clientData.client_secret,
          scope: clientData.scope,
        };
      } else {
        const errorText = await response.text();
        console.error(`[OAuthHandler] DCR Failed (${response.status}): ${errorText}`);
      }
    } catch (error) {
      console.error(`[OAuthHandler] DCR Error:`, error);
    }
    return null;
  }

  /**
   * Get OAuth2 token header for a server, refreshing if necessary
   */
  public async getOAuth2TokenHeader(serverId: string, oauth2Config: OAuth2Config): Promise<string> {
    console.log(`[OAuthHandler] Getting OAuth2 token header for server ${serverId}`);
    const cached = this.oauth2Tokens.get(serverId);
    const now = Date.now();

    // Check if token is still valid (with 60s buffer)
    if (cached && cached.expires_at > now + 60000) {
      console.log(`[OAuthHandler] Using cached token for server ${serverId}`);
      return `${cached.token_type} ${cached.access_token}`;
    }

    // If we have a refresh token, try to refresh
    if (cached?.refresh_token && oauth2Config.tokenUrl) {
      console.log(`[OAuthHandler] Refreshing token for server ${serverId}`);
      try {
        const tokenData = await this.refreshToken(cached.refresh_token, oauth2Config);
        this.setOAuth2Token(serverId, tokenData);
        return `${tokenData.token_type || 'Bearer'} ${tokenData.access_token}`;
      } catch (error) {
        console.warn('[OAuthHandler] Token refresh failed, will need re-authorization:', error);
      }
    }

    // If no valid token and no refresh token, throw error
    console.error(`[OAuthHandler] OAuth2 token expired or missing for server ${serverId}`);

    let authMessage = 'OAuth2 token expired or missing. Please authorize the MCP server.';
    let connectUrl: string | undefined;
    if (oauth2Config.authUrl && oauth2Config.clientId) {
      const redirectUri = this.getRedirectUri();
      const scope = oauth2Config.scope
        || (oauth2Config.scopes ? oauth2Config.scopes.join(" ") : "openid profile offline_access");
      connectUrl = `${oauth2Config.authUrl}?response_type=code&client_id=${oauth2Config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
      console.log(`[OAuthHandler] ACTION REQUIRED: Authorize at ${connectUrl}`);
      authMessage = `ACTION REQUIRED: ${authMessage} Connect URL: ${connectUrl}`;
    }

    const err: any = new Error(authMessage);
    if (connectUrl) err.connectUrl = connectUrl;
    throw err;
  }

  /**
   * Initiate OAuth authorization flow
   */
  public async initiateOAuth(serverId: string, oauth2Config: OAuth2Config): Promise<OAuthSession> {
    const redirectUri = this.getRedirectUri();
    const state = `${serverId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const scope = oauth2Config.scope
      || (oauth2Config.scopes ? oauth2Config.scopes.join(" ") : "openid profile offline_access");

    if (!oauth2Config.authUrl) {
      throw new Error('OAuth authorization URL not configured');
    }

    const authUrl = `${oauth2Config.authUrl}?response_type=code&client_id=${oauth2Config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;

    return {
      serverId,
      state,
      authUrl,
      redirectUri,
      scopes: scope.split(/\s+/).filter(Boolean),
    };
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  public async handleCallback(
    code: string,
    _state: string,
    oauth2Config: OAuth2Config
  ): Promise<TokenSet> {
    console.log(`[OAuthHandler] Handling OAuth callback with code`);

    if (!oauth2Config.tokenUrl) {
      throw new Error('OAuth token URL not configured');
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.getRedirectUri(),
      client_id: oauth2Config.clientId,
    });

    // Set up headers - use Basic auth if client_secret is provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (oauth2Config.clientSecret) {
      const credentials = Buffer.from(`${oauth2Config.clientId}:${oauth2Config.clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    let response = await fetch(oauth2Config.tokenUrl, {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    // If Basic auth failed, try with client_secret in body (fallback)
    if (!response.ok && oauth2Config.clientSecret) {
      const responseText = await response.text();
      if (response.status === 401 || responseText.includes('invalid_client')) {
        console.log(`[OAuthHandler] Basic auth failed, trying client_secret in body`);
        params.append('client_secret', oauth2Config.clientSecret);
        response = await fetch(oauth2Config.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });
      } else {
        throw new Error(`Token exchange failed: ${response.status} ${responseText}`);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();
    console.log(`[OAuthHandler] Token exchange successful`);

    return {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in || 3600,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
    };
  }

  /**
   * Refresh an OAuth2 token
   */
  public async refreshToken(refreshToken: string, oauth2Config: OAuth2Config): Promise<TokenSet> {
    console.log(`[OAuthHandler] Refreshing OAuth2 token`);

    if (!oauth2Config.tokenUrl) {
      throw new Error('OAuth token URL not configured');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: oauth2Config.clientId,
    });

    // Set up headers - use Basic auth if client_secret is provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (oauth2Config.clientSecret) {
      const credentials = Buffer.from(`${oauth2Config.clientId}:${oauth2Config.clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    console.log(`[OAuthHandler] Sending refresh request to ${oauth2Config.tokenUrl}`);
    let response = await fetch(oauth2Config.tokenUrl, {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    // If Basic auth failed, try with client_secret in body (fallback)
    if (!response.ok && oauth2Config.clientSecret) {
      const responseText = await response.text();
      if (response.status === 401 || responseText.includes('invalid_client')) {
        console.log(`[OAuthHandler] Basic auth failed for refresh, trying client_secret in body`);
        params.append('client_secret', oauth2Config.clientSecret);
        response = await fetch(oauth2Config.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });
      } else {
        throw new Error(`Token refresh failed: ${response.status} ${responseText}`);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();
    console.log(`[OAuthHandler] Token refresh successful`);

    return {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in || 3600,
      refresh_token: tokenData.refresh_token || refreshToken, // Keep old refresh token if not provided
      scope: tokenData.scope,
    };
  }
}
