/**
 * MCP Servers Feature
 * 
 * Public API for the MCP servers feature module.
 * This module provides components, hooks, types, and services for managing
 * MCP (Model Context Protocol) server connections.
 */

// Export components
export {
  McpDebugView,
  McpServerForm,
  McpServerList,
} from './components';

// Export hooks
export {
  useMcpServers,
  useMcpConnection,
  useMcpTools,
  useMcpAuthSession,
} from './hooks';

export type {
  MCPServerStatus,
  MCPAuthSessionState,
} from './hooks';

// Export types
export type {
  MCPServerType,
  ConnectionStatus,
  MCPServer,
  OAuth2Config,
  OAuth2Token,
  MCPConnection,
  HTTPTransportConfig,
  TransportConfig,
  OAuthDiscoveryResult,
  OAuthSession,
  TokenSet,
  ClientCredentials,
  MCPTool,
  MCPToolResult,
} from './types';

// Export coordinator as main service interface
export { MCPCoordinator, mcpCoordinator } from './services/coordinator';
