import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { MCPServer } from "../types";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { getEnvConfig } from "@/shared/config/env";

export interface MCPConnection {
    client: Client;
    server: MCPServer;
    status: 'connecting' | 'connected' | 'error' | 'disconnected' | 'auth_required';
    error?: string;
    connectUrl?: string;
}

interface OAuth2Token {
    access_token: string;
    token_type: string;
    expires_in: number;
    expires_at: number;
    refresh_token?: string;
}

class StatelessHTTPClientTransport implements Transport {
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: JSONRPCMessage) => void;
    private _url: URL;
    private _headers: Record<string, string>;

    constructor(url: URL, headers: Record<string, string> = {}) {
        this._url = url;
        this._headers = headers;
    }

    async start(): Promise<void> {
        console.log(`[StatelessHTTP] Starting transport for ${this._url}`);
    }

    async close(): Promise<void> {
        this.onclose?.();
    }

    async send(message: JSONRPCMessage): Promise<void> {
        try {
            console.log(`[StatelessHTTP] Sending message to ${this._url}`, message);
            const response = await fetch(this._url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...this._headers
                },
                body: JSON.stringify(message)
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error(`Authentication failed (401) for ${this._url}`);
                }
                const text = await response.text();
                throw new Error(`HTTP Error ${response.status}: ${text}`);
            }

            // check for empty body
            const contentLength = response.headers.get("content-length");
            if (contentLength === "0") {
                console.log(`[StatelessHTTP] Received empty response`);
                return;
            }

            const text = await response.text();
            if (!text) {
                console.log(`[StatelessHTTP] Received empty response body`);
                return;
            }

            const data = JSON.parse(text);
            console.log(`[StatelessHTTP] Received response`, data);

            if (Array.isArray(data)) {
                for (const msg of data) this.onmessage?.(msg);
            } else {
                this.onmessage?.(data);
            }

        } catch (error: any) {
            console.error(`[StatelessHTTP] Error sending message:`, error);
            this.onerror?.(error);
        }
    }
}

class McpManager {
    private static instance: McpManager;
    private connections: Map<string, MCPConnection> = new Map();
    private oauth2Tokens: Map<string, OAuth2Token> = new Map();

    private constructor() { }

    public static getInstance(): McpManager {
        if (!McpManager.instance) {
            McpManager.instance = new McpManager();
        }
        return McpManager.instance;
    }

    public setOAuth2Token(serverId: string, tokenData: any) {
        console.log(`[McpManager] Setting OAuth2 token for server ${serverId}`);
        const now = Date.now();
        const token: OAuth2Token = {
            access_token: tokenData.access_token,
            token_type: tokenData.token_type || 'Bearer',
            expires_in: tokenData.expires_in || 3600,
            expires_at: now + (tokenData.expires_in || 3600) * 1000,
            refresh_token: tokenData.refresh_token
        };
        this.oauth2Tokens.set(serverId, token);
    }

    public getOAuth2TokenData(serverId: string): OAuth2Token | undefined {
        return this.oauth2Tokens.get(serverId);
    }

    private async discoverOAuthConfiguration(serverUrl: string): Promise<any | null> {
        console.log(`[McpManager] Discovering OAuth configuration for ${serverUrl}`);
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
                    console.log(`[McpManager] Probe successful (no auth required)`);
                    return null; // No auth needed
                }
            } catch (probeError) {
                console.warn(`[McpManager] Initial probe failed, continuing discovery`, probeError);
            }

            // Step 2: Protected Resource Metadata discovery
            const candidateUrls = [] as string[];
            if (resourceMetadataUrl) {
                candidateUrls.push(resourceMetadataUrl);
            }
            candidateUrls.push(`${rootUrl}/.well-known/oauth-protected-resource${pathname}`);
            candidateUrls.push(`${rootUrl}/.well-known/oauth-protected-resource`);

            let prm: any | null = null;
            for (const candidate of candidateUrls) {
                try {
                    console.log(`[McpManager] Probing ${candidate}`);
                    const res = await fetch(candidate);
                    if (!res.ok) {
                        console.log(`[McpManager] No OAuth discovery at ${candidate} (${res.status})`);
                        continue;
                    }
                    prm = await res.json();
                    console.log(`[McpManager] Found OAuth Protected Resource Metadata:`, prm);
                    break;
                } catch (err) {
                    console.warn(`[McpManager] Error fetching ${candidate}:`, err);
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
                console.log(`[McpManager] Fetching Auth Server Metadata from ${asmUrl}`);
                try {
                    const authRes = await fetch(asmUrl);
                    if (authRes.ok) {
                        authMeta = await authRes.json();
                        console.log(`[McpManager] Found Auth Server Metadata:`, authMeta);
                    } else {
                        console.log(`[McpManager] Auth server metadata missing (${authRes.status})`);
                    }
                } catch (err) {
                    console.warn(`[McpManager] Auth server metadata fetch failed:`, err);
                }
            }

            const scopes = this.resolveScopes({
                userScope: undefined,
                headerScope,
                prmScopes: prm.scopes_supported,
                asmScopes: authMeta?.scopes_supported
            });

            return {
                ...prm,
                tokenUrl: authMeta?.token_endpoint,
                authUrl: authMeta?.authorization_endpoint,
                registrationUrl: authMeta?.registration_endpoint,
                scopes,
                headerScope,
                requiresAuth: probeRequiresAuth
            };
        } catch (e) {
            console.warn(`[McpManager] OAuth discovery failed:`, e);
        }
        return null;
    }

    private resolveScopes(input: { userScope?: string | string[]; headerScope?: string; prmScopes?: string[]; asmScopes?: string[]; registrationScopes?: string[]; }): string[] {
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

    private getRedirectUri(): string {
        const { appUrl } = getEnvConfig();
        return `${appUrl}/api/mcp/oauth-callback`;
    }

    private async registerDynamicClient(registrationUrl: string, scopes: string[]): Promise<any> {
        console.log(`[McpManager] Attempting Dynamic Client Registration at ${registrationUrl}`);
        try {
            const registrationBody = {
                client_name: "Universal OpenAI API Tester",
                redirect_uris: [this.getRedirectUri()],
                grant_types: ["authorization_code", "refresh_token"],
                token_endpoint_auth_method: "none", // Public client with PKCE
                response_types: ["code"],
                scope: scopes.join(" ") || "openid profile email offline_access"
            };

            const response = await fetch(registrationUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registrationBody)
            });

            if (response.ok) {
                const clientData = await response.json();
                console.log(`[McpManager] DCR Successful. Client ID: ${clientData.client_id}`);
                return {
                    clientId: clientData.client_id,
                    clientSecret: clientData.client_secret
                };
            } else {
                const errorText = await response.text();
                console.error(`[McpManager] DCR Failed (${response.status}): ${errorText}`);
            }
        } catch (error) {
            console.error(`[McpManager] DCR Error:`, error);
        }
        return null;
    }

    private async getOAuth2TokenHeader(serverId: string, oauth2Config: any): Promise<string> {
        console.log(`[McpManager] Getting OAuth2 token header for server ${serverId}`);
        const cached = this.oauth2Tokens.get(serverId);
        const now = Date.now();

        // Check if token is still valid (with 60s buffer)
        if (cached && cached.expires_at > now + 60000) {
            console.log(`[McpManager] Using cached token for server ${serverId}`);
            return `${cached.token_type} ${cached.access_token}`;
        }

        // If we have a refresh token, try to refresh
        if (cached?.refresh_token && oauth2Config.tokenUrl) {
            console.log(`[McpManager] Refreshing token for server ${serverId}`);
            try {
                const params = new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: cached.refresh_token,
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

                console.log(`[McpManager] Sending refresh request to ${oauth2Config.tokenUrl}`);
                let response = await fetch(oauth2Config.tokenUrl, {
                    method: 'POST',
                    headers,
                    body: params.toString(),
                });

                // If Basic auth failed, try with client_secret in body (fallback)
                if (!response.ok && oauth2Config.clientSecret) {
                    const responseText = await response.text();
                    if (response.status === 401 || responseText.includes('invalid_client')) {
                        console.log(`[McpManager] Basic auth failed for refresh, trying client_secret in body`);
                        params.append('client_secret', oauth2Config.clientSecret);
                        response = await fetch(oauth2Config.tokenUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: params.toString(),
                        });
                    }
                }

                if (response.ok) {
                    const tokenData = await response.json();
                    console.log(`[McpManager] Token refresh successful for server ${serverId}`);
                    this.setOAuth2Token(serverId, tokenData);
                    return `${tokenData.token_type || 'Bearer'} ${tokenData.access_token}`;
                } else {
                    console.error(`[McpManager] Token refresh failed for server ${serverId}: ${response.status} ${response.statusText}`);
                }
            } catch (error) {
                console.warn('[McpManager] Token refresh failed, will need re-authorization:', error);
            }
        }

        // If no valid token and no refresh token, throw error
        // The user will need to re-authorize
        console.error(`[McpManager] OAuth2 token expired or missing for server ${serverId}`);

        let authMessage = 'OAuth2 token expired or missing. Please authorize the MCP server.';
        let connectUrl: string | undefined;
        if (oauth2Config.authUrl && oauth2Config.clientId) {
            const redirectUri = this.getRedirectUri();
            const scope = oauth2Config.scope
                || (oauth2Config.scopes ? oauth2Config.scopes.join(" ") : "openid profile offline_access");
            connectUrl = `${oauth2Config.authUrl}?response_type=code&client_id=${oauth2Config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
            console.log(`[McpManager] ACTION REQUIRED: Authorize at ${connectUrl}`);
            authMessage = `ACTION REQUIRED: ${authMessage} Connect URL: ${connectUrl}`;
        }

        const err: any = new Error(authMessage);
        if (connectUrl) err.connectUrl = connectUrl;
        throw err;
    }

    async connect(server: MCPServer): Promise<void> {
        console.log(`[McpManager] Connecting to server ${server.name} (${server.id}) type=${server.type}`);
        if (this.connections.has(server.id) && this.connections.get(server.id)?.status === 'connected') {
            console.log(`[McpManager] Server ${server.name} already connected.`);
            return;
        }

        let transport;
        const config = JSON.parse(server.config || '{}');

        // Initialize config.oauth2 if undefined but might be needed
        let discoveredAuth: any = null;
        let primaryAuthError: Error | null = null;
        const oauthConfig = config.oauth2;

        try {
            if (server.type === 'http' || server.type === 'sse' || server.type === 'http-direct') {
                console.log(`[McpManager] Initializing connection for ${server.name} (${config.url})`);

                // Discovery Phase
                const needsDiscovery = !oauthConfig?.tokenUrl || !oauthConfig?.authUrl || !oauthConfig?.clientId || oauthConfig?.autoDiscover;
                if (!oauthConfig || needsDiscovery) { // Discover when config is missing pieces
                    discoveredAuth = await this.discoverOAuthConfiguration(config.url);
                    const shouldApplyDiscovery = discoveredAuth && (discoveredAuth.requiresAuth || oauthConfig?.autoDiscover);
                    if (discoveredAuth && shouldApplyDiscovery) {
                        console.log(`[McpManager] Auto-configuring OAuth for ${server.name}`);
                        config.oauth2 = { ...(config.oauth2 || {}) };
                        config.oauth2.tokenUrl = discoveredAuth.tokenUrl;
                        config.oauth2.authUrl = discoveredAuth.authUrl;
                        config.oauth2.scopes = discoveredAuth.scopes;
                        if (!config.oauth2.scope && discoveredAuth.headerScope) {
                            config.oauth2.scope = discoveredAuth.headerScope;
                        }
                        server.config = JSON.stringify(config);
                    } else if (discoveredAuth && !shouldApplyDiscovery) {
                        console.log(`[McpManager] Discovery found OAuth but resource does not require auth; skipping auto-apply for ${server.name}`);
                    }
                }

                // Dynamic Client Registration Phase
                if (discoveredAuth && (discoveredAuth.requiresAuth || config.oauth2?.autoDiscover) && discoveredAuth.registrationUrl && !config.oauth2?.clientId) {
                    console.log(`[McpManager] Missing Client ID. Attempting Registration...`);
                    const clientCreds = await this.registerDynamicClient(discoveredAuth.registrationUrl, discoveredAuth.scopes || []);
                    if (clientCreds) {
                        config.oauth2.clientId = clientCreds.clientId;
                        config.oauth2.clientSecret = clientCreds.clientSecret;
                        // Update scopes with registration response if provided
                        config.oauth2.scopes = this.resolveScopes({
                            userScope: config.oauth2.scope,
                            headerScope: discoveredAuth?.headerScope,
                            prmScopes: discoveredAuth?.scopes,
                            registrationScopes: clientCreds.scope ? clientCreds.scope.split(/\s+/) : undefined,
                        });
                        console.log(`[McpManager] Auto-registered Client ID: ${config.oauth2.clientId}`);
                        server.config = JSON.stringify(config);
                    }
                }

                // Prepare headers
                let headers: Record<string, string> = config.headers || {};

                // Handle OAuth2 authentication
                if (config.oauth2 && config.oauth2.tokenUrl) { // Use populated config
                    try {
                        const authHeader = await this.getOAuth2TokenHeader(server.id, config.oauth2);
                        headers['Authorization'] = authHeader;
                    } catch (error: any) {
                        console.warn(`[McpManager] OAuth setup failed for ${server.name} (assuming optional for now):`, error.message);
                        primaryAuthError = error;
                    }
                }

                // If auth is configured but we could not obtain a token, do not proceed
                if (primaryAuthError && (discoveredAuth?.requiresAuth || config.oauth2)) {
                    throw primaryAuthError;
                }

                // Prepare Headers for Transport
                const opts = Object.keys(headers).length > 0 ? { eventSourceInit: { headers }, requestInit: { headers } } : undefined;

                // Default: Try SSE Transport
                console.log(`[McpManager] Creating SSEClientTransport for ${config.url}`);
                transport = new SSEClientTransport(new URL(config.url), opts as any);
            } else {
                console.log(`[McpManager] Initializing Stdio transport for ${server.name}`);
                // stdio
                transport = new StdioClientTransport({
                    command: config.command,
                    args: config.args || [],
                    env: config.env ? { ...process.env, ...config.env } : undefined
                });
            }

            const client = new Client(
                {
                    name: "universal-openai-api-tester",
                    version: "1.0.0",
                },
                {
                    capabilities: {},
                }
            );

            this.connections.set(server.id, {
                client,
                server,
                status: 'connecting'
            });

            console.log(`[McpManager] Client connecting to transport for ${server.name}...`);

            try {
                await client.connect(transport!);
            } catch (connectError: any) {
                // Check if we battled auth issues and failed with 401
                if (primaryAuthError && (connectError.message?.includes('401') || connectError.message?.includes('Authentication failed'))) {
                    throw primaryAuthError;
                }

                // Fallback Logic for HTTP Servers
                if ((server.type === 'http' || server.type === 'sse' || server.type === 'http-direct') &&
                    (connectError.message && (connectError.message.includes('405') || connectError.message.includes('404') || connectError.message.includes('Stats') || connectError.message.includes('Unexpected token')))) {

                    console.warn(`[McpManager] SSE connection failed (${connectError.message}). Attempting Stateless HTTP Transport fallback...`);

                    // Re-prepare headers (Token might have refreshed if we were smart, but here just use current config)
                    let headers: Record<string, string> = config.headers || {};
                    let fallbackAuthError: Error | null = null;
                    if (config.oauth2) {
                        try {
                            const authHeader = await this.getOAuth2TokenHeader(server.id, config.oauth2);
                            headers['Authorization'] = authHeader;
                        } catch (e: any) {
                            // Capture the error to potentially throw later if the anonymous connection fails
                            fallbackAuthError = e;
                            console.warn(`[McpManager] Ignoring auth error in fallback (assuming public/optional):`, e.message);
                        }
                    }

                    transport = new StatelessHTTPClientTransport(new URL(config.url), headers);
                    try {
                        await client.connect(transport);
                        console.log(`[McpManager] Stateless HTTP connection established.`);
                    } catch (connectError: any) {
                        if (fallbackAuthError && (connectError.message?.includes('401') || connectError.message?.includes('Authentication failed'))) {
                            console.warn(`[McpManager] Connection failed with 401 and we had a suppressed auth error. Propagating auth error.`);
                            throw fallbackAuthError;
                        }
                        throw connectError;
                    }

                } else {
                    throw connectError;
                }
            }

            console.log(`[McpManager] Specialized client connected for ${server.name}`);

            this.connections.set(server.id, {
                client,
                server,
                status: 'connected'
            });

            console.log(`[McpManager] Successfully connected to MCP server: ${server.name}`);

        } catch (error: any) {
            console.error(`[McpManager] Failed to connect to ${server.name}:`, error);
            // Log full error details
            if (error.cause) console.error(`[McpManager] Cause:`, error.cause);
            if (error.stack) console.error(`[McpManager] Stack:`, error.stack);

            const isAuthError = error.message && (error.message.includes('authorize') || error.message.includes('token expired') || error.connectUrl);
            this.connections.set(server.id, {
                client: null as any,
                server,
                status: isAuthError ? 'auth_required' : 'error',
                error: error.message,
                connectUrl: error.connectUrl
            });
            throw error;
        }
    }

    async disconnect(serverId: string) {
        console.log(`[McpManager] Disconnecting server ${serverId}`);
        const connection = this.connections.get(serverId);
        if (connection && connection.client) {
            try {
                await connection.client.close();
                console.log(`[McpManager] Client closed for server ${serverId}`);
            } catch (e) {
                console.error(`[McpManager] Error closing client for ${serverId}:`, e);
            }
        }
        this.connections.delete(serverId);
        this.oauth2Tokens.delete(serverId);
    }

    getSubscribedServers(): MCPConnection[] {
        return Array.from(this.connections.values());
    }

    getAllConnectionIds(): string[] {
        return Array.from(this.connections.keys());
    }

    async disconnectAll() {
        console.log(`[McpManager] Disconnecting ALL servers`);
        const ids = Array.from(this.connections.keys());
        await Promise.all(ids.map(id => this.disconnect(id)));
    }

    getConnection(serverId: string): MCPConnection | undefined {
        return this.connections.get(serverId);
    }

    getConnectionStatus(serverId: string): 'connecting' | 'connected' | 'error' | 'disconnected' | 'auth_required' {
        const connection = this.connections.get(serverId);
        return connection ? connection.status : 'disconnected';
    }

    async listTools() {
        const allTools: any[] = [];
        for (const [serverId, connection] of this.connections.entries()) {
            if (connection.status === 'connected' && connection.client) {
                try {
                    const tools = await connection.client.listTools();
                    allTools.push(...tools.tools.map(t => ({ ...t, serverId: serverId })));
                } catch (e) {
                    console.error(`[McpManager] Error listing tools for ${connection.server.name} (${serverId}):`, e);
                }
            }
        }
        return allTools;
    }

    async callTool(toolName: string, args: any, serverId?: string) {
        console.log(`[McpManager] Calling tool ${toolName} on server ${serverId}`);
        let targetConnection: MCPConnection | undefined;

        if (serverId) {
            targetConnection = this.connections.get(serverId);
        } else {
            console.error(`[McpManager] CallTool failed: ServerId is required`);
            throw new Error("ServerId is required to call a tool.");
        }

        if (!targetConnection || targetConnection.status !== 'connected') {
            console.error(`[McpManager] CallTool failed: Server ${serverId} is not connected`);
            throw new Error(`Server ${serverId} is not connected.`);
        }

        try {
            const result = await targetConnection.client.callTool({
                name: toolName,
                arguments: args
            });
            console.log(`[McpManager] Tool call ${toolName} successful`);
            return result;
        } catch (error) {
            console.error(`[McpManager] Tool call ${toolName} failed on server ${serverId}:`, error);
            throw error;
        }
    }
}

export const mcpManager = McpManager.getInstance();
