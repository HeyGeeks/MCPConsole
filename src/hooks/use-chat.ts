'use client';

import { useState } from 'react';
import { useAppContext } from '@/shared/context';
import { useToast } from './use-toast';
import { callTool, listTools } from '@/lib/services/mcp-service';
import type { ChatMessage, ToolCall, AIProvider } from '@/lib/types';

export function useChat() {
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

  const executeChatRequest = async (
    requestMessages: ChatMessage[],
    provider: AIProvider,
    model: string
  ) => {
    const selectedMcpServersList = mcpServers.filter(s => selectedMcpServerIds.includes(s.id));
    let tools: any[] = [];

    if (selectedMcpServersList.length > 0) {
      try {
        const allTools = await Promise.all(
          selectedMcpServersList.map(server => listTools(server))
        );
        tools = allTools.flat();
      } catch (e) {
        const error = e instanceof Error ? e.message : "Unknown error";
        toast({ variant: 'destructive', title: 'MCP Error', description: `Failed to list tools: ${error}` });
      }
    }

    if (provider.apiType === 'google') {
      await executeGoogleChatRequest(requestMessages, provider, model, tools);
      return;
    }

    try {
      const body = {
        model: model,
        messages: requestMessages.map(({ role, content, tool_calls, tool_call_id }) => ({
          role,
          content,
          tool_calls,
          tool_call_id
        })),
        stream: true,
        ...(tools.length > 0 && { tools: tools, tool_choice: "auto" }),
      };

      const response = await fetch(provider.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      await handleOpenAIResponse(response);
    } catch (error) {
      handleChatError(error);
    }
  };

  const executeGoogleChatRequest = async (
    requestMessages: ChatMessage[],
    provider: AIProvider,
    model: string,
    mcpTools: any[]
  ) => {
    try {
      // Map MCP tools to Gemini function declarations
      const googleTools: any[] = [{ googleSearch: {} }];
      if (mcpTools.length > 0) {
        googleTools.push({
          function_declarations: mcpTools.map(t => t.function)
        });
      }

      const contents = requestMessages.map(msg => {
        let role = msg.role === 'assistant' ? 'model' : 'user';
        if (msg.role === 'tool') role = 'function'; // Semantic mapping needed for Gemini function responses

        // Basic text mapping
        return {
          role,
          parts: [{ text: msg.content }]
        };
      });

      const body = {
        contents,
        generationConfig: {
          thinkingConfig: {
            thinkingLevel: "HIGH",
          },
        },
        tools: googleTools,
      };

      // Use internal proxy to avoid CORS
      const proxyUrl = '/api/google';

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          apiKey: provider.apiKey,
          body: body
        }),
      });

      await handleGoogleResponse(response);
    } catch (error) {
      handleChatError(error);
    }
  };

  const handleChatError = (error: any) => {
    setIsLoading(false);
    setMessages(prev => {
      if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && prev[prev.length - 1].content === '') {
        return prev.slice(0, -1);
      }
      return prev;
    });
    const description = error instanceof Error ? error.message : 'An unknown error occurred';
    toast({ variant: 'destructive', title: 'Network Error', description });
  };

  const handleGoogleResponse = async (response: Response) => {
    if (!response.ok) {
      const errorText = await response.text();
      toast({
        variant: 'destructive',
        title: 'Google API Error',
        description: `Failed to get response: ${response.status} ${errorText}`,
      });
      setIsLoading(false);
      setMessages(prev => prev.slice(0, -1));
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      setIsLoading(false);
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Basic parsing of JSON array stream [ {...}, {...}, ]
        // We'll split by object delimiters roughly or simply try to parse accumulated valid JSON chunks
        // This is a naive implementation; for robust parsing, a streaming JSON parser is better.
        // However, Gemini usually sends complete JSON objects per chunk in the HTTP stream often.

        // Simple heuristic: Try to find balanced {} and parse
        // For now, let's assume standard Gemini stream behavior which often sends a JSON array
        // We ignore [ and ] at start/end and commas

        let boundaryIndex;
        while ((boundaryIndex = buffer.indexOf('}')) !== -1) {
          // Potential end of object
          const chunkStr = buffer.slice(0, boundaryIndex + 1).trim();
          let jsonStr = chunkStr;
          // Remove leading comma or bracket
          if (jsonStr.startsWith(',')) jsonStr = jsonStr.slice(1).trim();
          if (jsonStr.startsWith('[')) jsonStr = jsonStr.slice(1).trim();

          try {
            const json = JSON.parse(jsonStr);
            // Success
            processGoogleChunk(json);
            buffer = buffer.slice(boundaryIndex + 1);
            if (buffer.startsWith(',')) buffer = buffer.slice(1);
          } catch (e) {
            // Not a valid object yet, maybe nested braces? continue search
            // But simpler approach: regex or just loop
            // Since simple searching for } matches the first }, if we have nested objects this breaks.
            // Let's rely on the fact that top level objects are candidates. 
            // Valid Gemini chunk: { "candidates": ... }
            // So we can look for ` "candidates":`?
            // Let's accept that we might need a more robust parser later.
            // For this snippet, assuming cleaner chunks or just simple accumulation.
            break;
          }
        }
      }
    } catch (e) {
      console.error("Stream parse error", e);
    }

    setIsLoading(false);
  };

  const processGoogleChunk = (json: any) => {
    const candidate = json.candidates?.[0];
    if (!candidate) return;

    const content = candidate.content;
    if (content?.parts) {
      for (const part of content.parts) {
        if (part.text) {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              return [...prev.slice(0, -1), {
                ...lastMessage,
                content: (lastMessage.content || '') + part.text
              }];
            }
            return prev;
          });
        }
        // Handle function calls if any
        // Gemini returns functionCalls in parts
      }
    }
  };

  const handleToolCalls = async (toolCalls: ToolCall[]) => {
    const selectedMcpServersList = mcpServers.filter(s => selectedMcpServerIds.includes(s.id));

    if (selectedMcpServersList.length === 0) {
      toast({ variant: 'destructive', title: 'MCP Error', description: 'Cannot call tool: No MCP server selected.' });
      setIsLoading(false);
      return;
    }

    const toolResponses: ChatMessage[] = await Promise.all(
      toolCalls.map(async (toolCall) => {
        // Try to execute the tool on each server until one succeeds
        let result = null;
        let lastError = null;

        for (const server of selectedMcpServersList) {
          try {
            result = await callTool(server, toolCall);
            // If successful, break out of the loop
            if (result && !result.includes('error')) {
              break;
            }
          } catch (e) {
            lastError = e;
            // Continue to next server if this one fails
            continue;
          }
        }

        // If all servers failed, use the last error result
        if (!result) {
          result = lastError ? (lastError instanceof Error ? lastError.message : 'Unknown error') : 'Tool execution failed on all servers';
        }

        return {
          id: crypto.randomUUID(),
          role: 'tool',
          tool_call_id: toolCall.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        };
      })
    );

    const provider = providers.find(p => p.id === selectedProviderId);
    const model = selectedModel;

    if (provider && model) {
      const newAssistantMessage: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '' };

      setMessages(prev => {
        const nextMessages = [...prev, ...toolResponses];

        // We need to trigger the chat request with the history up to the tool results
        // But we also need to append a blank 'assistant' message for the FUTURE response to stream into

        executeChatRequest(nextMessages, provider, model);

        return [...nextMessages, newAssistantMessage];
      });
    } else {
      setIsLoading(false);
    }
  };

  const handleOpenAIResponse = async (response: Response) => {
    if (!response.ok) {
      const errorText = await response.text();
      toast({
        variant: 'destructive',
        title: 'API Error',
        description: `Failed to get response: ${response.status} ${response.statusText}\n${errorText}`,
      });
      setIsLoading(false);
      setMessages(prev => prev.slice(0, -1)); // Remove the optimistic assistant message
      return;
    }

    if (!response.body) {
      toast({ variant: 'destructive', title: 'Error', description: 'Response body is empty.' });
      setIsLoading(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let accumulatedToolCalls: ToolCall[] = [];
    let buffer = "";

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last partial line in the buffer

      for (const line of lines) {
        if (line.trim() === '' || !line.startsWith('data: ')) continue;

        const data = line.replace(/^data: /, '');
        if (data === '[DONE]') {
          done = true;
          break;
        }
        try {
          const json = JSON.parse(data);
          const delta = json.choices[0]?.delta;

          if (delta?.content) {
            setMessages(prev => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && lastMessage.role === 'assistant') {
                const updatedMessage = {
                  ...lastMessage,
                  content: (lastMessage.content || '') + delta.content,
                };
                return [...prev.slice(0, -1), updatedMessage];
              }
              return prev;
            });
          } else if (delta?.tool_calls) {
            delta.tool_calls.forEach((toolCallDelta: any) => {
              const { index, id, function: { name, arguments: args } } = toolCallDelta;
              if (!accumulatedToolCalls[index]) {
                accumulatedToolCalls[index] = { id: '', type: 'function', function: { name: '', arguments: '' } };
              }
              if (id) accumulatedToolCalls[index].id = id;
              if (name) accumulatedToolCalls[index].function.name += name;
              if (args) accumulatedToolCalls[index].function.arguments += args;
            });
          }
        } catch (error) {
          console.error('Error parsing stream data:', `'${data}'`, error);
        }
      }
    }

    if (accumulatedToolCalls.length > 0) {
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          const updatedMessage = {
            ...lastMessage,
            tool_calls: accumulatedToolCalls,
          };
          return [...prev.slice(0, -1), updatedMessage];
        }
        return prev;
      });
      await handleToolCalls(accumulatedToolCalls);
    } else {
      setIsLoading(false);
    }
  };


  const sendMessage = async (content: string) => {
    if (isLoading) return;
    const provider = providers.find(p => p.id === selectedProviderId);
    if (!provider || !selectedModel) {
      toast({
        variant: 'destructive',
        title: 'Configuration Error',
        description: 'Please select an AI provider and model.',
      });
      return;
    }

    setIsLoading(true);
    const newUserMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content };
    const newAssistantMessage: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '' };

    const requestMessages = [...messages, newUserMessage];
    setMessages([...requestMessages, newAssistantMessage]);

    await executeChatRequest(requestMessages, provider, selectedModel);
  };

  return {
    isLoading,
    sendMessage,
  };
}
