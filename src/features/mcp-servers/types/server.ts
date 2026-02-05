/**
 * MCP Server Types
 * 
 * Type definitions for MCP (Model Context Protocol) server integration.
 * These types define the structure of MCP servers, connections, authentication,
 * and transport configurations.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";

/**
 * Supported MCP server transport types
 * Note: stdio is not supported in web deployments
 */
export type MCPServerType = 'http' | 'sse' | 'http-direct';

/**
 * Connection status for an MCP server
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'disconnected' | 'auth_required';

/**
 * MCP Server configuration
 */
export interface MCPServer {
  id: string;
  name: string;
  type: MCPServerType;
  config: string; // JSON string containing transport-specific configuration
}

/**
 * OAuth2 configuration for MCP server authentication
 */
export interface OAuth2Config {
  clientId: string;
  clientSecret?: string;
  tokenUrl: string;
  authUrl?: string;
  registrationUrl?: string;
  scope?: string;
  scopes?: string[];
  autoDiscover?: boolean;
}

/**
 * OAuth2 token data
 */
export interface OAuth2Token {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token?: string;
}

/**
 * MCP server connection
 */
export interface MCPConnection {
  client?: Client;
  server: MCPServer;
  status: ConnectionStatus;
  error?: string;
  connectUrl?: string;
}

/**
 * Transport configuration for HTTP/SSE connections
 */
export interface HTTPTransportConfig {
  url: string;
  headers?: Record<string, string>;
  oauth2?: OAuth2Config;
}

/**
 * Transport configuration for stdio connections
 */
export interface StdioTransportConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * Union type for all transport configurations
 */
export type TransportConfig = HTTPTransportConfig | StdioTransportConfig;

/**
 * OAuth discovery result
 */
export interface OAuthDiscoveryResult {
  tokenUrl?: string;
  authUrl?: string;
  registrationUrl?: string;
  scopes?: string[];
  headerScope?: string;
  requiresAuth: boolean;
  authorization_server?: string;
  authorization_servers?: string[];
  scopes_supported?: string[];
}

/**
 * OAuth session for authorization flow
 */
export interface OAuthSession {
  serverId: string;
  state: string;
  authUrl: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * Token set returned from OAuth token exchange
 */
export interface TokenSet {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Dynamic client registration credentials
 */
export interface ClientCredentials {
  clientId: string;
  clientSecret?: string;
  scope?: string;
}

/**
 * MCP tool definition
 */
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: any;
  serverId?: string;
}

/**
 * MCP tool call result
 */
export interface MCPToolResult {
  content: any[];
  isError?: boolean;
}
