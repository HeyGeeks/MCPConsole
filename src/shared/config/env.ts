/**
 * Environment Configuration Module
 * 
 * Provides type-safe access to environment variables with validation.
 * Validates required environment variables at application startup.
 * 
 * @module shared/config/env
 */

/**
 * Node environment types
 */
export type NodeEnv = 'development' | 'production' | 'test';

/**
 * Environment configuration interface
 * Defines all environment variables used by the application
 */
export interface EnvironmentConfig {
  /** Node environment (development, production, test) */
  nodeEnv: NodeEnv;
  
  /** Public application URL for OAuth redirects and external links */
  appUrl: string;
  
  /** Vercel deployment URL (automatically set by Vercel) */
  vercelUrl?: string;
  
  /** OpenAI API key for AI provider integration */
  openaiApiKey?: string;
  
  /** Google AI API key for AI provider integration */
  googleApiKey?: string;
  
  /** Anthropic API key for AI provider integration */
  anthropicApiKey?: string;
}

/**
 * Validation error class for environment configuration issues
 */
export class EnvironmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentValidationError';
  }
}

/**
 * Validates and returns the environment configuration
 * 
 * @throws {EnvironmentValidationError} If required environment variables are missing or invalid
 * @returns {EnvironmentConfig} Validated environment configuration
 * 
 * @example
 * ```typescript
 * try {
 *   const config = validateEnv();
 *   console.log('App URL:', config.appUrl);
 * } catch (error) {
 *   console.error('Environment validation failed:', error.message);
 * }
 * ```
 */
export function validateEnv(): EnvironmentConfig {
  // Get NODE_ENV with fallback to development
  const nodeEnv = (process.env.NODE_ENV as NodeEnv) || 'development';
  
  // Validate NODE_ENV is one of the allowed values
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new EnvironmentValidationError(
      `Invalid NODE_ENV: ${nodeEnv}. Must be one of: development, production, test`
    );
  }
  
  // Get Vercel URL if available
  const vercelUrl = process.env.VERCEL_URL;
  
  // Determine app URL with fallback logic
  // Priority: NEXT_PUBLIC_APP_URL > VERCEL_URL > localhost
  // Note: VERCEL_URL from Vercel doesn't include https://, but user might set it with https://
  let appUrl = process.env.NEXT_PUBLIC_APP_URL;
  
  if (!appUrl && vercelUrl) {
    // Handle both cases: VERCEL_URL with or without protocol
    appUrl = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
  }
  
  if (!appUrl) {
    appUrl = 'http://localhost:9002';
  }
  
  // Remove trailing slash if present for consistency
  appUrl = appUrl.replace(/\/$/, '');
  
  // Get optional API keys
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const googleApiKey = process.env.GOOGLE_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  
  // Validate production requirements
  if (nodeEnv === 'production') {
    // In production, we should have an explicit app URL
    if (!process.env.NEXT_PUBLIC_APP_URL && !vercelUrl) {
      throw new EnvironmentValidationError(
        'NEXT_PUBLIC_APP_URL or VERCEL_URL is required in production environment'
      );
    }
    
    // Warn if no AI provider keys are configured (not fatal, but likely needed)
    if (!openaiApiKey && !googleApiKey && !anthropicApiKey) {
      console.warn(
        'Warning: No AI provider API keys configured. ' +
        'Set OPENAI_API_KEY, GOOGLE_API_KEY, or ANTHROPIC_API_KEY to enable AI features.'
      );
    }
  }
  
  const config: EnvironmentConfig = {
    nodeEnv,
    appUrl,
    vercelUrl,
    openaiApiKey,
    googleApiKey,
    anthropicApiKey,
  };
  
  return config;
}

/**
 * Cached environment configuration
 * Validated once at module load time
 */
let cachedConfig: EnvironmentConfig | null = null;

/**
 * Gets the validated environment configuration
 * Configuration is validated once and cached for subsequent calls
 * 
 * @returns {EnvironmentConfig} Validated environment configuration
 * @throws {EnvironmentValidationError} If validation fails on first call
 * 
 * @example
 * ```typescript
 * import { getEnvConfig } from '@/shared/config/env';
 * 
 * const config = getEnvConfig();
 * console.log('Running in:', config.nodeEnv);
 * console.log('App URL:', config.appUrl);
 * ```
 */
export function getEnvConfig(): EnvironmentConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnv();
  }
  return cachedConfig;
}

/**
 * Resets the cached configuration
 * Useful for testing purposes
 * 
 * @internal
 */
export function resetEnvConfig(): void {
  cachedConfig = null;
}

/**
 * Validates environment configuration at startup
 * Should be called early in the application lifecycle
 * 
 * @throws {EnvironmentValidationError} If validation fails
 * 
 * @example
 * ```typescript
 * // In your app entry point (e.g., layout.tsx or _app.tsx)
 * import { validateEnvAtStartup } from '@/shared/config/env';
 * 
 * validateEnvAtStartup();
 * ```
 */
export function validateEnvAtStartup(): void {
  try {
    const config = getEnvConfig();
    console.log(`[Environment] Validated configuration for ${config.nodeEnv} environment`);
    console.log(`[Environment] App URL: ${config.appUrl}`);
    
    // Log which AI providers are configured
    const providers: string[] = [];
    if (config.openaiApiKey) providers.push('OpenAI');
    if (config.googleApiKey) providers.push('Google AI');
    if (config.anthropicApiKey) providers.push('Anthropic');
    
    if (providers.length > 0) {
      console.log(`[Environment] Configured AI providers: ${providers.join(', ')}`);
    } else {
      console.log('[Environment] No AI provider API keys configured');
    }
  } catch (error) {
    if (error instanceof EnvironmentValidationError) {
      console.error('[Environment] Validation failed:', error.message);
      throw error;
    }
    throw error;
  }
}

// Export default configuration getter
export default getEnvConfig;
