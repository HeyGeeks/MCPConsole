/**
 * @deprecated This file has been moved to feature-specific type modules.
 * This re-export is maintained for backward compatibility during migration.
 * Please update your imports to use feature-specific types instead:
 * - AIProvider -> @/features/providers/types (as Provider)
 * - MCPServer -> @/features/mcp-servers/types
 * - ChatMessage, ToolCall -> @/features/chat/types
 */

// Re-export provider types
export type { Provider as AIProvider, ApiType } from '@/features/providers/types';

// Re-export MCP types
export type { 
  MCPServer, 
  MCPServerType, 
  OAuth2Config,
  OAuth2Token
} from '@/features/mcp-servers/types';

// Re-export chat types
export type { 
  Message as ChatMessage,
  ToolCall,
  ChatMessageRole
} from '@/features/chat/types';

