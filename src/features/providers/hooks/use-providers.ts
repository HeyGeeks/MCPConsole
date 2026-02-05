/**
 * Hook for managing AI providers
 * Provides CRUD operations for provider management
 */

'use client';

import { useCallback } from 'react';
import type { Provider, ProviderInput } from '../types';
import { providerService } from '../services';
import { useLocalStorage } from '@/shared/hooks';

/**
 * Hook return type
 */
interface UseProvidersReturn {
  /** List of all providers */
  providers: Provider[];
  /** Add a new provider */
  addProvider: (input: ProviderInput) => void;
  /** Update an existing provider */
  updateProvider: (provider: Provider) => void;
  /** Delete a provider by ID */
  deleteProvider: (id: string) => void;
  /** Find a provider by ID */
  findProvider: (id: string) => Provider | undefined;
  /** Validate a provider configuration */
  validateProvider: (provider: ProviderInput | Provider) => { valid: boolean; errors: string[] };
}

/**
 * Custom hook for managing AI providers
 * @returns Provider management functions and state
 */
export function useProviders(): UseProvidersReturn {
  const [providers, setProviders] = useLocalStorage<Provider[]>('ai-providers', []);

  const addProvider = useCallback((input: ProviderInput) => {
    const newProvider = providerService.createProvider(input);
    setProviders(prev => [...prev, newProvider]);
  }, [setProviders]);

  const updateProvider = useCallback((updatedProvider: Provider) => {
    setProviders(prev => providerService.updateProvider(prev, updatedProvider));
  }, [setProviders]);

  const deleteProvider = useCallback((id: string) => {
    setProviders(prev => providerService.deleteProvider(prev, id));
  }, [setProviders]);

  const findProvider = useCallback((id: string) => {
    return providerService.findProviderById(providers, id);
  }, [providers]);

  const validateProvider = useCallback((provider: ProviderInput | Provider) => {
    return providerService.validateProvider(provider);
  }, []);

  return {
    providers,
    addProvider,
    updateProvider,
    deleteProvider,
    findProvider,
    validateProvider,
  };
}
