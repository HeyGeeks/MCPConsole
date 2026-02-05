/**
 * Chat message types and interfaces
 */

export type ChatMessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // A JSON string of arguments
  };
}

export interface Message {
  id: string;
  role: ChatMessageRole;
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
