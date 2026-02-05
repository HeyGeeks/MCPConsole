'use client';

import { useChatMessages } from './use-chat-messages';

/**
 * Main chat hook that provides all chat functionality
 * Re-exports useChatMessages for convenience
 */
export function useChat() {
  return useChatMessages();
}
