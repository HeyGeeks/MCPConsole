/**
 * Provider service for managing AI provider configurations
 * Handles business logic for provider CRUD operations
 */

import type { Provider, ProviderInput } from '../types';

/**
 * Service class for managing AI providers
 */
export class ProviderService {
  /**
   * Generate a unique ID for a new provider
   */
  private generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Create a new provider
   * @param input - Provider data without ID
   * @returns Complete provider with generated ID
   */
  createProvider(input: ProviderInput): Provider {
    return {
      ...input,
      id: this.generateId(),
    };
  }

  /**
   * Update an existing provider
   * @param providers - Current list of providers
   * @param updatedProvider - Provider with updated data
   * @returns Updated list of providers
   */
  updateProvider(providers: Provider[], updatedProvider: Provider): Provider[] {
    return providers.map(p => 
      p.id === updatedProvider.id ? updatedProvider : p
    );
  }

  /**
   * Delete a provider by ID
   * @param providers - Current list of providers
   * @param id - ID of provider to delete
   * @returns Updated list of providers
   */
  deleteProvider(providers: Provider[], id: string): Provider[] {
    return providers.filter(p => p.id !== id);
  }

  /**
   * Find a provider by ID
   * @param providers - List of providers to search
   * @param id - ID of provider to find
   * @returns Provider if found, undefined otherwise
   */
  findProviderById(providers: Provider[], id: string): Provider | undefined {
    return providers.find(p => p.id === id);
  }

  /**
   * Validate provider configuration
   * @param provider - Provider to validate
   * @returns Validation result with errors if any
   */
  validateProvider(provider: ProviderInput | Provider): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!provider.name || provider.name.trim() === '') {
      errors.push('Provider name is required');
    }

    if (!provider.baseURL || provider.baseURL.trim() === '') {
      errors.push('Base URL is required');
    }

    if (!provider.apiKey || provider.apiKey.trim() === '') {
      errors.push('API key is required');
    }

    if (!provider.models || provider.models.length === 0) {
      errors.push('At least one model is required');
    }

    if (!provider.apiType) {
      errors.push('API type is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Parse comma-separated models string into array
   * @param modelsString - Comma-separated models
   * @returns Array of model names
   */
  parseModels(modelsString: string): string[] {
    return modelsString
      .split(',')
      .map(m => m.trim())
      .filter(m => m.length > 0);
  }

  /**
   * Format models array into comma-separated string
   * @param models - Array of model names
   * @returns Comma-separated string
   */
  formatModels(models: string[]): string {
    return models.join(', ');
  }
}

/**
 * Singleton instance of ProviderService
 */
export const providerService = new ProviderService();
