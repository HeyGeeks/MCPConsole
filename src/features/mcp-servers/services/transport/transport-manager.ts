/**
 * Transport Manager
 * 
 * Manages transport layer for MCP server connections including:
 * - Creating appropriate transport based on server type
 * - Handling HTTP/SSE/stdio transports
 * - Managing transport lifecycle
 */

import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import type {
  MCPServerType,
  HTTPTransportConfig,
} from '../../types';

/**
 * Stateless HTTP Client Transport
 * 
 * Custom transport implementation for stateless HTTP connections
 */
class StatelessHTTPClientTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
  private _url: URL;
  private _headers: Record<string, string>;

  constructor(url: URL, headers: Record<string, string> = {}) {
    this._url = url;
    this._headers = headers;
  }

  async start(): Promise<void> {
    console.log(`[StatelessHTTP] Starting transport for ${this._url}`);
  }

  async close(): Promise<void> {
    this.onclose?.();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    try {
      console.log(`[StatelessHTTP] Sending message to ${this._url}`, message);
      const response = await fetch(this._url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...this._headers,
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(`Authentication failed (401) for ${this._url}`);
        }
        const text = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${text}`);
      }

      // Check for empty body
      const contentLength = response.headers.get("content-length");
      if (contentLength === "0") {
        console.log(`[StatelessHTTP] Received empty response`);
        return;
      }

      const text = await response.text();
      if (!text) {
        console.log(`[StatelessHTTP] Received empty response body`);
        return;
      }

      const data = JSON.parse(text);
      console.log(`[StatelessHTTP] Received response`, data);

      if (Array.isArray(data)) {
        for (const msg of data) this.onmessage?.(msg);
      } else {
        this.onmessage?.(data);
      }
    } catch (error: any) {
      console.error(`[StatelessHTTP] Error sending message:`, error);
      this.onerror?.(error);
    }
  }
}

export class TransportManager {
  /**
   * Create transport based on server type and configuration
   */
  public createTransport(
    serverType: MCPServerType,
    config: HTTPTransportConfig
  ): Transport {
    console.log(`[TransportManager] Creating transport for type: ${serverType}`);
    if (serverType === 'http-direct') {
      return new StreamableHTTPClientTransport(new URL(config.url), {
        requestInit: {
          headers: config.headers || {}
        }
      });
    }

    return this.createHTTPTransport(config);
  }

  /**
   * Create HTTP/SSE transport
   */
  private createHTTPTransport(config: HTTPTransportConfig): Transport {
    console.log(`[TransportManager] Creating SSE transport for URL: ${config.url}`);
    
    const headers = config.headers || {};
    const opts = Object.keys(headers).length > 0
      ? { eventSourceInit: { headers }, requestInit: { headers } }
      : undefined;

    return new SSEClientTransport(new URL(config.url), opts as any);
  }

  /**
   * Create stateless HTTP transport (fallback for servers that don't support SSE)
   */
  public createStatelessHTTPTransport(url: string, headers: Record<string, string> = {}): Transport {
    console.log(`[TransportManager] Creating stateless HTTP transport for URL: ${url}`);
    return new StatelessHTTPClientTransport(new URL(url), headers);
  }

  /**
   * Connect a transport
   */
  public async connect(transport: Transport): Promise<void> {
    console.log(`[TransportManager] Connecting transport`);
    await transport.start();
  }

  /**
   * Disconnect a transport
   */
  public async disconnect(transport: Transport): Promise<void> {
    console.log(`[TransportManager] Disconnecting transport`);
    await transport.close();
  }

  /**
   * Check if an error indicates SSE connection failure
   */
  public isSSEConnectionError(error: Error): boolean {
    const message = error.message;
    return (
      message.includes('405') ||
      message.includes('404') ||
      message.includes('202') ||
      message.includes('Stats') ||
      message.includes('Unexpected token')
    );
  }

  /**
   * Check if an error indicates authentication failure
   */
  public isAuthenticationError(error: Error): boolean {
    const message = error.message;
    return message.includes('401') || message.includes('Authentication failed');
  }
}
