/**
 * Hook for managing provider selection state
 * Handles the currently selected provider and model
 */

'use client';

import { useState, useCallback } from 'react';

/**
 * Hook return type
 */
interface UseProviderSelectionReturn {
  /** Currently selected provider ID */
  selectedProviderId: string | null;
  /** Set the selected provider ID */
  setSelectedProviderId: (id: string | null) => void;
  /** Currently selected model */
  selectedModel: string | null;
  /** Set the selected model */
  setSelectedModel: (model: string | null) => void;
  /** Clear both provider and model selection */
  clearSelection: () => void;
}

/**
 * Custom hook for managing provider selection
 * @returns Provider selection state and functions
 */
export function useProviderSelection(): UseProviderSelectionReturn {
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedProviderId(null);
    setSelectedModel(null);
  }, []);

  return {
    selectedProviderId,
    setSelectedProviderId,
    selectedModel,
    setSelectedModel,
    clearSelection,
  };
}
