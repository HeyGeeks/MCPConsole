/**
 * Shared Hooks
 * 
 * This module exports common hooks used across multiple features.
 * Feature-specific hooks should be placed in their respective feature directories.
 */

export { useIsMobile } from './use-mobile';
export { useToast, toast } from './use-toast';
export { default as useLocalStorage } from './use-local-storage';
