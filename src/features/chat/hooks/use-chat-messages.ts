'use client';

import { useState } from 'react';
import { useAppContext } from '@/shared/context';
import { useToast } from '@/shared/hooks';
import { messageService } from '../services';
import type { Message, ToolCall } from '../types';

/**
 * Hook for managing chat messages and interactions
 */
export function useChatMessages() {
  const {
    messages,
    setMessages,
    providers,
    selectedProviderId,
    selectedModel,
    mcpServers,
    selectedMcpServerIds,
  } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Send a message to the AI provider
   */
  const sendMessage = async (content: string) => {
    if (isLoading) return;

    const provider = providers.find((p) => p.id === selectedProviderId);
    if (!provider || !selectedModel) {
      toast({
        variant: 'destructive',
        title: 'Configuration Error',
        description: 'Please select an AI provider and model.',
      });
      return;
    }

    setIsLoading(true);

    const newUserMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    };
    const newAssistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
    };

    const requestMessages = [...messages, newUserMessage];
    setMessages([...requestMessages, newAssistantMessage]);

    await executeChatRequest(requestMessages, provider, selectedModel);
  };

  /**
   * Execute a chat request with the AI provider
   */
  const executeChatRequest = async (
    requestMessages: Message[],
    provider: any,
    model: string
  ) => {
    const selectedMcpServersList = mcpServers.filter((s) =>
      selectedMcpServerIds.includes(s.id)
    );

    let tools: any[] = [];
    if (selectedMcpServersList.length > 0) {
      try {
        tools = await messageService.listTools(selectedMcpServersList);
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        toast({
          variant: 'destructive',
          title: 'MCP Error',
          description: `Failed to list tools: ${error}`,
        });
      }
    }

    await messageService.sendChatRequest(
      {
        provider,
        model,
        messages: requestMessages,
        tools,
      },
      {
        onContent: (content: string) => {
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              const updatedMessage = {
                ...lastMessage,
                content: (lastMessage.content || '') + content,
              };
              return [...prev.slice(0, -1), updatedMessage];
            }
            return prev;
          });
        },
        onToolCalls: async (toolCalls: ToolCall[]) => {
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              const updatedMessage = {
                ...lastMessage,
                tool_calls: toolCalls,
              };
              return [...prev.slice(0, -1), updatedMessage];
            }
            return prev;
          });

          await handleToolCalls(toolCalls);
        },
        onComplete: () => {
          setIsLoading(false);
        },
        onError: (error: Error) => {
          setIsLoading(false);
          setMessages((prev) => {
            if (
              prev.length > 0 &&
              prev[prev.length - 1].role === 'assistant' &&
              prev[prev.length - 1].content === ''
            ) {
              return prev.slice(0, -1);
            }
            return prev;
          });
          toast({
            variant: 'destructive',
            title: 'Network Error',
            description: error.message,
          });
        },
      }
    );
  };

  /**
   * Handle tool calls from the AI
   */
  const handleToolCalls = async (toolCalls: ToolCall[]) => {
    const selectedMcpServersList = mcpServers.filter((s) =>
      selectedMcpServerIds.includes(s.id)
    );

    if (selectedMcpServersList.length === 0) {
      toast({
        variant: 'destructive',
        title: 'MCP Error',
        description: 'Cannot call tool: No MCP server selected.',
      });
      setIsLoading(false);
      return;
    }

    try {
      const toolResponses = await messageService.executeToolCalls(
        toolCalls,
        selectedMcpServersList
      );

      const provider = providers.find((p) => p.id === selectedProviderId);
      const model = selectedModel;

      if (provider && model) {
        const newAssistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '',
        };

        setMessages((prev) => {
          const nextMessages = [...prev, ...toolResponses];
          executeChatRequest(nextMessages, provider, model);
          return [...nextMessages, newAssistantMessage];
        });
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        variant: 'destructive',
        title: 'Tool Execution Error',
        description: errorMessage,
      });
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
  };
}
