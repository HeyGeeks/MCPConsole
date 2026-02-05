/**
 * Application Constants
 * 
 * Centralized application-wide constants for the MCPConsole AI Chat application.
 * This module provides a single source of truth for all constant values used
 * throughout the application.
 * 
 * @module shared/config/constants
 */

/**
 * API endpoint paths
 * Centralized API route paths to avoid hardcoding throughout the application
 */
export const API_ROUTES = {
  /** MCP (Model Context Protocol) endpoints */
  MCP: {
    /** List available MCP tools */
    TOOLS: '/api/mcp/tools',
    /** Execute an MCP tool */
    EXECUTE: '/api/mcp/execute',
    /** Connect to MCP servers */
    CONNECT: '/api/mcp/connect',
    /** Disconnect from MCP server */
    DISCONNECT: '/api/mcp/disconnect',
    /** Get MCP server status */
    STATUS: '/api/mcp/status',
    /** OAuth callback endpoint */
    OAUTH_CALLBACK: '/api/mcp/oauth-callback',
    /** OAuth authorization endpoint */
    OAUTH_AUTHORIZE: '/api/mcp/oauth-authorize',
    /** OAuth token exchange endpoint */
    OAUTH_TOKEN: '/api/mcp/oauth-token',
    /** Set OAuth token endpoint */
    SET_TOKEN: '/api/mcp/set-token',
    /** Discover OAuth configuration */
    DISCOVER_OAUTH: '/api/mcp/discover-oauth',
  },
  /** Google AI proxy endpoint */
  GOOGLE: '/api/google',
} as const;

/**
 * UI breakpoints for responsive design
 * Based on common device sizes and Tailwind CSS defaults
 */
export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1280,
  LARGE_DESKTOP: 1536,
} as const;

/**
 * Timing constants (in milliseconds)
 * Centralized timing values for animations, delays, and intervals
 */
export const TIMING = {
  TOAST_REMOVE_DELAY: 1000000,
  MCP_STATUS_POLL_INTERVAL: 5000,
  DEFAULT_API_TIMEOUT: 5000,
  TOOLTIP_DELAY: 0,
} as const;

/**
 * UI limits and constraints
 * Maximum and minimum values for UI elements
 */
export const UI_LIMITS = {
  /** Maximum number of toasts to display simultaneously */
  TOAST_LIMIT: 1,
} as const;

/**
 * Default values for forms and inputs
 * Placeholder text and default values
 */
export const DEFAULTS = {
  MCP_SERVER_URL_PLACEHOLDER: 'http://localhost:3000/sse',
  OAUTH_DEFAULT_SCOPE: 'openid email profile',
} as const;

/**
 * HTTP headers
 * Common HTTP header names and values
 */
export const HTTP_HEADERS = {
  CONTENT_TYPE_JSON: 'application/json',
  AUTHORIZATION: 'Authorization',
} as const;

/**
 * Storage keys for localStorage and sessionStorage
 * Centralized keys to avoid typos and ensure consistency
 */
export const STORAGE_KEYS = {
  THEME: 'theme',
  PROVIDERS: 'ai-providers',
  MCP_SERVERS: 'mcp-servers',
  SELECTED_PROVIDER: 'selected-provider',
  SELECTED_MCP_SERVERS: 'selected-mcp-servers',
  MESSAGES: 'messages',
} as const;

/**
 * AI Provider types
 * Supported AI provider identifiers
 */
export const PROVIDER_TYPES = {
  /** OpenAI provider */
  OPENAI: 'openai',
  /** Google AI provider */
  GOOGLE: 'google',
  /** Anthropic provider */
  ANTHROPIC: 'anthropic',
} as const;

/**
 * MCP transport types
 * Supported MCP transport protocols for web deployments
 */
export const TRANSPORT_TYPES = {
  /** Server-Sent Events transport */
  SSE: 'sse',
  /** WebSocket transport */
  WEBSOCKET: 'websocket',
} as const;

/**
 * MCP authentication types
 * Supported authentication methods for MCP servers
 */
export const AUTH_TYPES = {
  /** OAuth 2.0 authentication */
  OAUTH: 'oauth',
  /** API key authentication */
  API_KEY: 'apikey',
} as const;

/**
 * Chat message roles
 * Roles for chat messages in conversations
 */
export const MESSAGE_ROLES = {
  /** User message */
  USER: 'user',
  /** Assistant/AI message */
  ASSISTANT: 'assistant',
  /** System message */
  SYSTEM: 'system',
  /** Tool/function call result */
  TOOL: 'tool',
} as const;

/**
 * Connection status values
 * Status values for MCP server connections
 */
export const CONNECTION_STATUS = {
  /** Connection is being established */
  CONNECTING: 'connecting',
  /** Connection is active */
  CONNECTED: 'connected',
  /** Connection is closed */
  DISCONNECTED: 'disconnected',
  /** Connection error occurred */
  ERROR: 'error',
} as const;

/**
 * Application metadata
 * General application information
 */
export const APP_METADATA = {
  NAME: 'MCPConsole',
  VERSION: '0.2.1',
  DESCRIPTION: 'Manage your AI providers and MCP servers with ease using MCPConsole, the ultimate client for AI interactions and server configurations.',
} as const;

/**
 * Type exports for constant values
 * These types can be used throughout the application for type safety
 */
export type ProviderType = typeof PROVIDER_TYPES[keyof typeof PROVIDER_TYPES];
export type TransportType = typeof TRANSPORT_TYPES[keyof typeof TRANSPORT_TYPES];
export type AuthType = typeof AUTH_TYPES[keyof typeof AUTH_TYPES];
export type MessageRole = typeof MESSAGE_ROLES[keyof typeof MESSAGE_ROLES];
export type ConnectionStatus = typeof CONNECTION_STATUS[keyof typeof CONNECTION_STATUS];
