/**
 * Chat message service
 * Handles business logic for sending messages and processing AI responses
 */

import type { Message, ToolCall } from '../types';
import type { AIProvider, MCPServer } from '@/lib/types';

export interface ChatRequestOptions {
  provider: AIProvider;
  model: string;
  messages: Message[];
  tools?: any[];
}

export interface StreamChunkHandler {
  onContent: (content: string) => void;
  onToolCalls: (toolCalls: ToolCall[]) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * Message service for handling chat operations
 */
export class MessageService {
  /**
   * Send a chat request to the AI provider
   */
  async sendChatRequest(
    options: ChatRequestOptions,
    handler: StreamChunkHandler
  ): Promise<void> {
    const { provider, model, messages, tools } = options;

    if (provider.apiType === 'google') {
      return this.sendGoogleRequest(provider, model, messages, tools || [], handler);
    }

    return this.sendOpenAIRequest(provider, model, messages, tools || [], handler);
  }

  /**
   * Send request to OpenAI-compatible API
   */
  private async sendOpenAIRequest(
    provider: AIProvider,
    model: string,
    messages: Message[],
    tools: any[],
    handler: StreamChunkHandler
  ): Promise<void> {
    try {
      const body = {
        model,
        messages: messages.map(({ role, content, tool_calls, tool_call_id }) => ({
          role,
          content,
          tool_calls,
          tool_call_id,
        })),
        stream: true,
        ...(tools.length > 0 && { tools, tool_choice: 'auto' }),
      };

      const response = await fetch(provider.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      await this.handleOpenAIStream(response, handler);
    } catch (error) {
      handler.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Handle OpenAI streaming response
   */
  private async handleOpenAIStream(
    response: Response,
    handler: StreamChunkHandler
  ): Promise<void> {
    if (!response.body) {
      throw new Error('Response body is empty');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let accumulatedToolCalls: ToolCall[] = [];
    let buffer = '';

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

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
            handler.onContent(delta.content);
          } else if (delta?.tool_calls) {
            delta.tool_calls.forEach((toolCallDelta: any) => {
              const { index, id, function: { name, arguments: args } } = toolCallDelta;
              if (!accumulatedToolCalls[index]) {
                accumulatedToolCalls[index] = {
                  id: '',
                  type: 'function',
                  function: { name: '', arguments: '' },
                };
              }
              if (id) accumulatedToolCalls[index].id = id;
              if (name) accumulatedToolCalls[index].function.name += name;
              if (args) accumulatedToolCalls[index].function.arguments += args;
            });
          }
        } catch (error) {
          console.error('Error parsing stream data:', error);
        }
      }
    }

    if (accumulatedToolCalls.length > 0) {
      handler.onToolCalls(accumulatedToolCalls);
    }

    handler.onComplete();
  }

  /**
   * Send request to Google AI API
   */
  private async sendGoogleRequest(
    provider: AIProvider,
    model: string,
    messages: Message[],
    mcpTools: any[],
    handler: StreamChunkHandler
  ): Promise<void> {
    try {
      const googleTools: any[] = [{ googleSearch: {} }];
      if (mcpTools.length > 0) {
        googleTools.push({
          function_declarations: mcpTools.map((t) => t.function),
        });
      }

      const contents = messages.map((msg) => {
        let role = msg.role === 'assistant' ? 'model' : 'user';
        if (msg.role === 'tool') role = 'function';

        return {
          role,
          parts: [{ text: msg.content }],
        };
      });

      const body = {
        contents,
        generationConfig: {
          thinkingConfig: {
            thinkingLevel: 'HIGH',
          },
        },
        tools: googleTools,
      };

      const response = await fetch('/api/chat/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          apiKey: provider.apiKey,
          body,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google API Error: ${response.status} ${errorText}`);
      }

      await this.handleGoogleStream(response, handler);
    } catch (error) {
      handler.onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Handle Google AI streaming response
   */
  private async handleGoogleStream(
    response: Response,
    handler: StreamChunkHandler
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is empty');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundaryIndex;
        while ((boundaryIndex = buffer.indexOf('}')) !== -1) {
          const chunkStr = buffer.slice(0, boundaryIndex + 1).trim();
          let jsonStr = chunkStr;

          if (jsonStr.startsWith(',')) jsonStr = jsonStr.slice(1).trim();
          if (jsonStr.startsWith('[')) jsonStr = jsonStr.slice(1).trim();

          try {
            const json = JSON.parse(jsonStr);
            this.processGoogleChunk(json, handler);
            buffer = buffer.slice(boundaryIndex + 1);
            if (buffer.startsWith(',')) buffer = buffer.slice(1);
          } catch (e) {
            break;
          }
        }
      }
    } catch (e) {
      console.error('Stream parse error', e);
    }

    handler.onComplete();
  }

  /**
   * Process a single chunk from Google AI stream
   */
  private processGoogleChunk(json: any, handler: StreamChunkHandler): void {
    const candidate = json.candidates?.[0];
    if (!candidate) return;

    const content = candidate.content;
    if (content?.parts) {
      for (const part of content.parts) {
        if (part.text) {
          handler.onContent(part.text);
        }
      }
    }
  }

  /**
   * Execute tool calls
   */
  async executeToolCalls(
    toolCalls: ToolCall[],
    mcpServers: MCPServer[]
  ): Promise<Message[]> {
    if (mcpServers.length === 0) {
      throw new Error('Cannot call tool: No MCP server selected');
    }

    const toolResponses: Message[] = await Promise.all(
      toolCalls.map(async (toolCall) => {
        let result = null;
        let lastError = null;

        for (const server of mcpServers) {
          try {
            result = await this.callTool(server, toolCall);
            if (result && !result.includes('error')) {
              break;
            }
          } catch (e) {
            lastError = e;
            continue;
          }
        }

        if (!result) {
          result = lastError
            ? lastError instanceof Error
              ? lastError.message
              : 'Unknown error'
            : 'Tool execution failed on all servers';
        }

        return {
          id: crypto.randomUUID(),
          role: 'tool',
          tool_call_id: toolCall.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        };
      })
    );

    return toolResponses;
  }

  /**
   * Call a single tool on an MCP server
   */
  private async callTool(server: MCPServer, toolCall: ToolCall): Promise<string> {
    try {
      const args =
        typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;

      const response = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serverId: server.id,
          toolName: toolCall.function.name,
          args,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tool execution failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      return JSON.stringify(result);
    } catch (error: any) {
      console.error(`Error calling tool ${toolCall.function.name}:`, error);
      return JSON.stringify({
        error: `Failed to execute tool: ${toolCall.function.name}`,
        details: error.message,
      });
    }
  }

  /**
   * List available tools from MCP servers
   */
  async listTools(mcpServers: MCPServer[]): Promise<any[]> {
    if (mcpServers.length === 0) {
      return [];
    }

    try {
      const allTools = await Promise.all(
        mcpServers.map((server) => this.listServerTools(server))
      );
      return allTools.flat();
    } catch (e) {
      console.error('Failed to list tools:', e);
      return [];
    }
  }

  /**
   * List tools for a specific MCP server
   */
  private async listServerTools(server: MCPServer): Promise<any[]> {
    try {
      const response = await fetch('/api/mcp/tools');
      if (!response.ok) {
        throw new Error(`Failed to list tools: ${response.statusText}`);
      }
      const tools = await response.json();

      return tools
        .filter((t: any) => t.serverId === server.id)
        .map((t: any) => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.inputSchema || {},
          },
        }));
    } catch (error) {
      console.error('Error listing tools:', error);
      return [];
    }
  }
}

/**
 * Default message service instance
 */
export const messageService = new MessageService();
