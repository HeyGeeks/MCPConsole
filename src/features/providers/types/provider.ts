/**
 * Provider type definitions for AI provider management
 */

/**
 * Supported API types for AI providers
 */
export type ApiType = 'openai' | 'google' | 'anthropic' | 'custom';

/**
 * AI Provider configuration
 */
export interface Provider {
  /** Unique identifier for the provider */
  id: string;
  /** Display name of the provider */
  name: string;
  /** Base URL for API requests */
  baseURL: string;
  /** API key for authentication */
  apiKey: string;
  /** List of available models */
  models: string[];
  /** Type of API (OpenAI, Google, Anthropic, or custom) */
  apiType: ApiType;
}

/**
 * Provider configuration without ID (for creation)
 */
export type ProviderInput = Omit<Provider, 'id'>;

/**
 * Provider configuration options
 */
export interface ProviderConfig {
  /** Selected model from the provider */
  model: string;
  /** Temperature for response generation (0-1) */
  temperature?: number;
  /** Maximum tokens in the response */
  maxTokens?: number;
  /** Additional provider-specific configuration */
  additionalConfig?: Record<string, unknown>;
}
