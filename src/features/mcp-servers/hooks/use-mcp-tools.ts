/**
 * useMcpTools Hook
 * 
 * Hook for managing MCP tools from connected servers
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { MCPTool } from '../types';
import { listAllTools, callTool } from '@/lib/services/mcp-service';
import type { MCPServer } from '../types';

export function useMcpTools(servers: MCPServer[] = []) {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTools = useCallback(async () => {
    if (servers.length === 0) {
      setTools([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedTools = await listAllTools();
      // Convert OpenAI tool format to MCPTool format
      const mcpTools: MCPTool[] = fetchedTools.map((tool: any) => ({
        name: tool.function.name,
        description: tool.function.description,
        inputSchema: tool.function.parameters,
        serverId: tool.serverId,
      }));
      setTools(mcpTools);
    } catch (err: any) {
      setError(err.message);
      setTools([]);
    } finally {
      setIsLoading(false);
    }
  }, [servers]);

  const executeTool = useCallback(async (
    server: MCPServer,
    toolName: string,
    args: any
  ) => {
    try {
      const result = await callTool(server, {
        id: 'hook-call',
        type: 'function',
        function: { name: toolName, arguments: args }
      });
      return result;
    } catch (err: any) {
      throw new Error(`Tool execution failed: ${err.message}`);
    }
  }, []);

  // Auto-fetch tools when servers change
  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  return {
    tools,
    isLoading,
    error,
    fetchTools,
    executeTool,
  };
}
