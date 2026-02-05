import type { MCPServer } from '@/lib/types';

interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

export async function listTools(server: MCPServer): Promise<OpenAITool[]> {
  // In the new architecture, we might list tools globally or per server via our API.
  // For now, let's assume we fetch all tools from our backend.

  // Note: The 'server' arg might be less relevant if we fetch all tools, 
  // but we can filter if needed or keep the signature for compatibility.

  try {
    const response = await fetch('/api/mcp/tools');
    if (!response.ok) {
      throw new Error(`Failed to list tools: ${response.statusText}`);
    }
    const tools = await response.json();

    // Filter tools for this specific server if needed
    return tools.filter((t: any) => t.serverId === server.id).map((t: any) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema || {}
      }
    }));
  } catch (error) {
    console.error('Error listing tools:', error);
    return [];
  }
}

// Ensure compatibility with existing code that might call this
export async function listAllTools(): Promise<OpenAITool[]> {
  try {
    const response = await fetch('/api/mcp/tools');
    if (!response.ok) {
      throw new Error(`Failed to list tools: ${response.statusText}`);
    }
    const tools = await response.json();
    return tools.map((t: any) => ({
      type: 'function',
      function: {
        name: t.name, // We might want to namespace this: serverName_toolName
        description: t.description,
        parameters: t.inputSchema || {}
      },
      serverId: t.serverId  // Preserve for tool execution
    }));
  } catch (error) {
    console.error('Error listing tools:', error);
    return [];
  }
}


export async function callTool(server: MCPServer, toolCall: any): Promise<string> {
  try {
    const args = typeof toolCall.function.arguments === 'string'
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
        args: args
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
      details: error.message
    });
  }
}

export async function connectServers(servers: MCPServer[]): Promise<any> {
  try {
    const response = await fetch('/api/mcp/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ servers })
    });
    if (!response.ok) throw new Error('Failed to connect servers');
    return await response.json();
  } catch (error) {
    console.error('Error connecting servers:', error);
    return { error: 'Failed to connect servers' };
  }
}

export async function getMcpStatus(): Promise<any[]> {
  try {
    const response = await fetch('/api/mcp/status');
    if (!response.ok) throw new Error('Failed to get status');
    return await response.json();
  } catch (error) {
    console.error('Error fetching status:', error);
    return [];
  }
}
