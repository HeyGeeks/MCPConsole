/**
 * Connection Manager
 * 
 * Manages MCP server connection lifecycle including:
 * - Establishing connections
 * - Maintaining connection state
 * - Closing connections
 * - Querying connection status
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type {
  MCPConnection,
  MCPServer,
  ConnectionStatus,
  MCPTool,
  MCPToolResult,
} from '../../types';

export class ConnectionManager {
  private connections: Map<string, MCPConnection> = new Map();

  /**
   * Register a connection state (e.g. for failed initial connections or auth required)
   */
  public registerConnectionState(
    server: MCPServer,
    status: ConnectionStatus,
    error?: string,
    connectUrl?: string
  ): void {
    const existing = this.connections.get(server.id);
    if (existing) {
      existing.status = status;
      existing.error = error;
      existing.connectUrl = connectUrl;
      this.connections.set(server.id, existing);
    } else {
      this.connections.set(server.id, {
        server,
        status,
        error,
        connectUrl,
        client: undefined
      });
    }
  }

  /**
   * Establish a connection to an MCP server
   */
  public async establishConnection(
    server: MCPServer,
    transport: Transport
  ): Promise<MCPConnection> {
    console.log(`[ConnectionManager] Establishing connection for server ${server.name} (${server.id})`);

    // Check if already connected
    const existing = this.connections.get(server.id);
    if (existing && existing.status === 'connected') {
      console.log(`[ConnectionManager] Server ${server.name} already connected`);
      return existing;
    }

    // Create client
    const client = new Client(
      {
        name: "universal-openai-api-tester",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    // Set connection to connecting state
    const connection: MCPConnection = {
      client,
      server,
      status: 'connecting',
    };
    this.connections.set(server.id, connection);

    try {
      console.log(`[ConnectionManager] Client connecting to transport for ${server.name}...`);
      await client.connect(transport);
      console.log(`[ConnectionManager] Client connected for ${server.name}`);

      // Update connection status
      connection.status = 'connected';
      this.connections.set(server.id, connection);

      return connection;
    } catch (error: any) {
      console.error(`[ConnectionManager] Failed to establish connection for ${server.name}:`, error);

      // Update connection with error
      connection.status = 'error';
      connection.error = error.message;
      this.connections.set(server.id, connection);

      throw error;
    }
  }

  /**
   * Update connection status (e.g., to auth_required)
   */
  public updateConnectionStatus(
    serverId: string,
    status: ConnectionStatus,
    error?: string,
    connectUrl?: string
  ): void {
    const connection = this.connections.get(serverId);
    if (connection) {
      connection.status = status;
      connection.error = error;
      connection.connectUrl = connectUrl;
      this.connections.set(serverId, connection);
    }
  }

  /**
   * Close a connection
   */
  public async closeConnection(serverId: string): Promise<void> {
    console.log(`[ConnectionManager] Closing connection for server ${serverId}`);
    const connection = this.connections.get(serverId);

    if (connection && connection.client) {
      try {
        await connection.client.close();
        console.log(`[ConnectionManager] Client closed for server ${serverId}`);
      } catch (e) {
        console.error(`[ConnectionManager] Error closing client for ${serverId}:`, e);
      }
    }

    this.connections.delete(serverId);
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(serverId: string): ConnectionStatus {
    const connection = this.connections.get(serverId);
    return connection ? connection.status : 'disconnected';
  }

  /**
   * Get connection
   */
  public getConnection(serverId: string): MCPConnection | undefined {
    return this.connections.get(serverId);
  }

  /**
   * Get all connections
   */
  public getAllConnections(): MCPConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get all connection IDs
   */
  public getAllConnectionIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Close all connections
   */
  public async closeAllConnections(): Promise<void> {
    console.log(`[ConnectionManager] Closing all connections`);
    const ids = Array.from(this.connections.keys());
    await Promise.all(ids.map(id => this.closeConnection(id)));
  }

  /**
   * List tools from all connected servers
   */
  public async listTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];

    for (const [serverId, connection] of this.connections.entries()) {
      if (connection.status === 'connected' && connection.client) {
        try {
          const tools = await connection.client.listTools();
          allTools.push(
            ...tools.tools.map(t => ({
              ...t,
              serverId: serverId,
            }))
          );
        } catch (e) {
          console.error(
            `[ConnectionManager] Error listing tools for ${connection.server.name} (${serverId}):`,
            e
          );
        }
      }
    }

    return allTools;
  }

  /**
   * Call a tool on a specific server
   */
  public async callTool(
    toolName: string,
    args: any,
    serverId: string
  ): Promise<MCPToolResult> {
    console.log(`[ConnectionManager] Calling tool ${toolName} on server ${serverId}`);

    const connection = this.connections.get(serverId);

    if (!connection || connection.status !== 'connected' || !connection.client) {
      throw new Error(`Server ${serverId} is not connected or client is missing.`);
    }

    try {
      const result = await connection.client.callTool({
        name: toolName,
        arguments: args,
      });
      console.log(`[ConnectionManager] Tool call ${toolName} successful`);
      // Return the result in MCPToolResult format
      return {
        content: Array.isArray(result.content) ? result.content : [],
        isError: typeof result.isError === 'boolean' ? result.isError : false,
      };
    } catch (error) {
      console.error(`[ConnectionManager] Tool call ${toolName} failed on server ${serverId}:`, error);
      throw error;
    }
  }
}
