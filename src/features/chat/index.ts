/**
 * Chat feature public API
 * Barrel export for all chat-related functionality
 */

// Components
export {
  ChatHeader,
  ChatHistory,
  ChatInput,
  ChatMessage,
  ToolResult,
} from './components';

// Hooks
export { useChat, useChatMessages } from './hooks';

// Context
export { ChatProvider, useChatContext } from './context';

// Types
export type { Message, ToolCall, ChatMessageRole, Conversation } from './types';
