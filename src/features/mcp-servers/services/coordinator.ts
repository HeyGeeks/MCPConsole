/**
 * MCP Coordinator
 * 
 * Facade that coordinates OAuth, transport, and connection management
 * for MCP server connections. Provides a high-level API for connecting
 * to and interacting with MCP servers.
 */

import { OAuthHandler } from './auth/oauth-handler';
import { TransportManager } from './transport/transport-manager';
import { ConnectionManager } from './connection/connection-manager';
import type {
  MCPServer,
  MCPConnection,
  ConnectionStatus,
  OAuth2Config,
  HTTPTransportConfig,
  OAuthSession,
  TokenSet,
  MCPTool,
  MCPToolResult,
  OAuthDiscoveryResult,
  ClientCredentials,
} from '../types';

export class MCPCoordinator {
  private static instance: MCPCoordinator;
  private oauthHandler: OAuthHandler;
  private transportManager: TransportManager;
  private connectionManager: ConnectionManager;

  private constructor() {
    this.oauthHandler = new OAuthHandler();
    this.transportManager = new TransportManager();
    this.connectionManager = new ConnectionManager();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MCPCoordinator {
    if (!MCPCoordinator.instance) {
      MCPCoordinator.instance = new MCPCoordinator();
    }
    return MCPCoordinator.instance;
  }

  /**
   * Set OAuth2 token for a server
   */
  public setOAuth2Token(serverId: string, tokenData: any): void {
    this.oauthHandler.setOAuth2Token(serverId, tokenData);
  }

  /**
   * Get OAuth2 token data for a server
   */
  public getOAuth2TokenData(serverId: string) {
    return this.oauthHandler.getOAuth2TokenData(serverId);
  }

  /**
   * Connect to an MCP server
   */
  public async connect(server: MCPServer): Promise<void> {
    console.log(`[MCPCoordinator] Connecting to server ${server.name} (${server.id}) type=${server.type}`);

    // Check if already connected
    if (this.connectionManager.getConnectionStatus(server.id) === 'connected') {
      console.log(`[MCPCoordinator] Server ${server.name} already connected.`);
      return;
    }

    const config = JSON.parse(server.config || '{}');
    let discoveredAuth: OAuthDiscoveryResult | null = null;
    let primaryAuthError: Error | null = null;
    const oauthConfig = config.oauth2;

    try {
      // Handle HTTP/SSE/HTTP-direct servers
      if (server.type === 'http' || server.type === 'sse' || server.type === 'http-direct') {
        console.log(`[MCPCoordinator] Initializing connection for ${server.name} (${config.url})`);

        // Discovery Phase - only if OAuth is configured or autoDiscover is enabled
        const needsDiscovery = !oauthConfig?.tokenUrl || !oauthConfig?.authUrl || !oauthConfig?.clientId || oauthConfig?.autoDiscover;
        const shouldAttemptDiscovery = oauthConfig || needsDiscovery;
        if (shouldAttemptDiscovery && (!oauthConfig || needsDiscovery)) {
          discoveredAuth = await this.oauthHandler.discoverOAuthConfiguration(config.url);
          const shouldApplyDiscovery = discoveredAuth && (discoveredAuth.requiresAuth || oauthConfig?.autoDiscover);

          if (discoveredAuth && shouldApplyDiscovery) {
            console.log(`[MCPCoordinator] Auto-configuring OAuth for ${server.name}`);
            config.oauth2 = { ...(config.oauth2 || {}) };
            config.oauth2.tokenUrl = discoveredAuth.tokenUrl;
            config.oauth2.authUrl = discoveredAuth.authUrl;
            config.oauth2.scopes = discoveredAuth.scopes;
            if (!config.oauth2.scope && discoveredAuth.headerScope) {
              config.oauth2.scope = discoveredAuth.headerScope;
            }
            server.config = JSON.stringify(config);
          } else if (discoveredAuth && !shouldApplyDiscovery) {
            console.log(`[MCPCoordinator] Discovery found OAuth but resource does not require auth; skipping auto-apply for ${server.name}`);
          }
        }

        // Dynamic Client Registration Phase
        if (discoveredAuth && (discoveredAuth.requiresAuth || config.oauth2?.autoDiscover) && discoveredAuth.registrationUrl && !config.oauth2?.clientId) {
          console.log(`[MCPCoordinator] Missing Client ID. Attempting Registration...`);
          const clientCreds = await this.oauthHandler.registerDynamicClient(
            discoveredAuth.registrationUrl,
            discoveredAuth.scopes || []
          );

          if (clientCreds) {
            config.oauth2.clientId = clientCreds.clientId;
            config.oauth2.clientSecret = clientCreds.clientSecret;
            console.log(`[MCPCoordinator] Auto-registered Client ID: ${config.oauth2.clientId}`);
            server.config = JSON.stringify(config);
          }
        }

        // Prepare headers
        let headers: Record<string, string> = config.headers || {};

        // Handle OAuth2 authentication
        if (config.oauth2 && config.oauth2.tokenUrl) {
          try {
            const authHeader = await this.oauthHandler.getOAuth2TokenHeader(server.id, config.oauth2);
            headers['Authorization'] = authHeader;
          } catch (error: any) {
            console.warn(`[MCPCoordinator] OAuth setup failed for ${server.name}:`, error.message);
            primaryAuthError = error;
          }
        }

        // If auth is configured but we could not obtain a token, do not proceed
        if (primaryAuthError && (discoveredAuth?.requiresAuth || config.oauth2)) {
          throw primaryAuthError;
        }

        // Create transport configuration
        const transportConfig: HTTPTransportConfig = {
          url: config.url,
          headers,
          oauth2: config.oauth2,
        };

        // Create transport based on server type
        console.log(`[MCPCoordinator] Creating transport for ${server.type} at ${config.url}`);
        let transport = this.transportManager.createTransport(server.type, transportConfig);

        try {
          await this.connectionManager.establishConnection(server, transport);
          console.log(`[MCPCoordinator] Successfully connected to MCP server: ${server.name}`);
        } catch (connectError: any) {
          // Check if we had auth issues and failed with 401
          if (primaryAuthError && this.transportManager.isAuthenticationError(connectError)) {
            throw primaryAuthError;
          }

          // Fallback to stateless HTTP if SSE fails
          if (this.transportManager.isSSEConnectionError(connectError)) {
            console.warn(`[MCPCoordinator] SSE connection failed. Attempting Stateless HTTP fallback...`);

            // Re-prepare headers for fallback
            let fallbackHeaders: Record<string, string> = config.headers || {};
            let fallbackAuthError: Error | null = null;

            if (config.oauth2) {
              try {
                const authHeader = await this.oauthHandler.getOAuth2TokenHeader(server.id, config.oauth2);
                fallbackHeaders['Authorization'] = authHeader;
              } catch (e: any) {
                fallbackAuthError = e;
                console.warn(`[MCPCoordinator] Ignoring auth error in fallback:`, e.message);
              }
            }

            transport = this.transportManager.createStatelessHTTPTransport(config.url, fallbackHeaders);

            try {
              await this.connectionManager.establishConnection(server, transport);
              console.log(`[MCPCoordinator] Stateless HTTP connection established.`);
            } catch (fallbackError: any) {
              if (fallbackAuthError && this.transportManager.isAuthenticationError(fallbackError)) {
                throw fallbackAuthError;
              }
              throw fallbackError;
            }
          } else {
            throw connectError;
          }
        }
      }
    } catch (error: any) {
      console.error(`[MCPCoordinator] Failed to connect to ${server.name}:`, error);

      const isAuthError = error.message && (
        error.message.includes('authorize') ||
        error.message.includes('token expired') ||
        error.connectUrl
      );

      this.connectionManager.registerConnectionState(
        server,
        isAuthError ? 'auth_required' : 'error',
        error.message,
        error.connectUrl
      );

      throw error;
    }
  }

  /**
   * Disconnect from an MCP server
   */
  public async disconnect(serverId: string): Promise<void> {
    console.log(`[MCPCoordinator] Disconnecting server ${serverId}`);
    await this.connectionManager.closeConnection(serverId);
    this.oauthHandler.clearOAuth2Token(serverId);
  }

  /**
   * Disconnect from all MCP servers
   */
  public async disconnectAll(): Promise<void> {
    console.log(`[MCPCoordinator] Disconnecting ALL servers`);
    await this.connectionManager.closeAllConnections();
  }

  /**
   * Get all subscribed servers
   */
  public getSubscribedServers(): MCPConnection[] {
    return this.connectionManager.getAllConnections();
  }

  /**
   * Get all connection IDs
   */
  public getAllConnectionIds(): string[] {
    return this.connectionManager.getAllConnectionIds();
  }

  /**
   * Get connection for a server
   */
  public getConnection(serverId: string): MCPConnection | undefined {
    return this.connectionManager.getConnection(serverId);
  }

  /**
   * Get connection status for a server
   */
  public getConnectionStatus(serverId: string): ConnectionStatus {
    return this.connectionManager.getConnectionStatus(serverId);
  }

  /**
   * List all tools from connected servers
   */
  public async listTools(): Promise<MCPTool[]> {
    return this.connectionManager.listTools();
  }

  /**
   * Call a tool on a specific server
   */
  public async callTool(toolName: string, args: any, serverId: string): Promise<MCPToolResult> {
    console.log(`[MCPCoordinator] Calling tool ${toolName} on server ${serverId}`);

    if (!serverId) {
      throw new Error("ServerId is required to call a tool.");
    }

    return this.connectionManager.callTool(toolName, args, serverId);
  }

  /**
   * Initiate OAuth flow for a server
   */
  public async initiateOAuth(serverId: string, oauth2Config: OAuth2Config): Promise<OAuthSession> {
    return this.oauthHandler.initiateOAuth(serverId, oauth2Config);
  }

  /**
   * Handle OAuth callback
   */
  public async handleOAuthCallback(
    code: string,
    state: string,
    oauth2Config: OAuth2Config
  ): Promise<TokenSet> {
    return this.oauthHandler.handleCallback(code, state, oauth2Config);
  }

  /**
   * Discover OAuth configuration for a server URL
   */
  public async discoverOAuthConfiguration(serverUrl: string): Promise<OAuthDiscoveryResult | null> {
    return this.oauthHandler.discoverOAuthConfiguration(serverUrl);
  }

  /**
   * Register a dynamic client
   */
  public async registerDynamicClient(
    registrationUrl: string,
    scopes: string[]
  ): Promise<ClientCredentials | null> {
    return this.oauthHandler.registerDynamicClient(registrationUrl, scopes);
  }

  /**
   * Register connection state (for auth_required, error, etc.)
   */
  public registerConnectionState(
    server: MCPServer,
    status: ConnectionStatus,
    error?: string,
    connectUrl?: string
  ): void {
    this.connectionManager.registerConnectionState(server, status, error, connectUrl);
  }
}

// Export singleton instance with global persistence for development
const globalForMcp = globalThis as unknown as { mcpCoordinator: MCPCoordinator };

export const mcpCoordinator = globalForMcp.mcpCoordinator || MCPCoordinator.getInstance();

if (process.env.NODE_ENV !== 'production') globalForMcp.mcpCoordinator = mcpCoordinator;
