/**
 * Configuration module exports
 * 
 * Provides centralized access to application configuration
 */

export {
  getEnvConfig,
  validateEnv,
  validateEnvAtStartup,
  resetEnvConfig,
  EnvironmentValidationError,
  type EnvironmentConfig,
  type NodeEnv,
} from './env';

export {
  API_ROUTES,
  BREAKPOINTS,
  TIMING,
  UI_LIMITS,
  DEFAULTS,
  HTTP_HEADERS,
  STORAGE_KEYS,
  PROVIDER_TYPES,
  TRANSPORT_TYPES,
  AUTH_TYPES,
  MESSAGE_ROLES,
  CONNECTION_STATUS,
  APP_METADATA,
  type ProviderType,
  type TransportType,
  type AuthType,
  type MessageRole,
  type ConnectionStatus,
} from './constants';

// Re-export default
export { default } from './env';
