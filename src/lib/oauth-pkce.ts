/**
 * OAuth PKCE Utilities for Serverless Environments
 * 
 * Instead of storing PKCE verifiers in memory (which doesn't work on serverless),
 * we encode them into the state parameter using encryption.
 * 
 * This makes the OAuth flow completely stateless and compatible with Vercel
 * and other serverless platforms.
 */

import crypto from 'crypto';

// Use a secret for encrypting the state - falls back to a default for dev
// In production, set OAUTH_STATE_SECRET environment variable
const STATE_SECRET = process.env.OAUTH_STATE_SECRET || 
  process.env.NEXTAUTH_SECRET || 
  'dev-secret-change-in-production-' + (process.env.VERCEL_URL || 'localhost');

// Derive a 32-byte key from the secret
function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(STATE_SECRET).digest();
}

export interface PKCEStateData {
  verifier: string;
  serverId: string;
  nonce: string; // Random nonce for uniqueness
  createdAt: number;
}

/**
 * Generate PKCE code verifier
 */
export function generateCodeVerifier(): string {
  return base64URLEncode(crypto.randomBytes(32));
}

/**
 * Generate PKCE code challenge from verifier
 */
export function generateCodeChallenge(verifier: string): string {
  return base64URLEncode(sha256(verifier));
}

/**
 * Generate a random nonce
 */
export function generateNonce(): string {
  return base64URLEncode(crypto.randomBytes(16));
}

/**
 * Encode state data into an encrypted string that can be used as OAuth state
 * This allows us to recover PKCE verifier on callback without server-side storage
 */
export function encodeState(data: Omit<PKCEStateData, 'nonce' | 'createdAt'>): string {
  const fullData: PKCEStateData = {
    ...data,
    nonce: generateNonce(),
    createdAt: Date.now(),
  };
  
  const json = JSON.stringify(fullData);
  
  // Encrypt the data
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(json, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  
  // Combine iv + authTag + encrypted data
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'base64')
  ]);
  
  return base64URLEncode(combined);
}

/**
 * Decode and verify state data from OAuth callback
 * Returns null if state is invalid or expired (10 minute timeout)
 */
export function decodeState(state: string): PKCEStateData | null {
  try {
    // Decode the combined data
    const combined = base64URLDecode(state);
    
    // Extract components
    const iv = combined.subarray(0, 16);
    const authTag = combined.subarray(16, 32);
    const encryptedData = combined.subarray(32);
    
    // Decrypt
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    const data: PKCEStateData = JSON.parse(decrypted.toString('utf8'));
    
    // Validate expiration (10 minutes)
    const TEN_MINUTES = 10 * 60 * 1000;
    if (Date.now() - data.createdAt > TEN_MINUTES) {
      console.warn('[PKCE] State expired');
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[PKCE] Failed to decode state:', error);
    return null;
  }
}

// Utility functions
function base64URLEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64URLDecode(str: string): Buffer {
  // Add padding back
  let padded = str.replace(/-/g, '+').replace(/_/g, '/');
  while (padded.length % 4) {
    padded += '=';
  }
  return Buffer.from(padded, 'base64');
}

function sha256(buffer: string): Buffer {
  return crypto.createHash('sha256').update(buffer).digest();
}
