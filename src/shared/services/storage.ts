/**
 * Storage service for managing browser storage (localStorage/sessionStorage).
 * Provides type-safe methods for storing and retrieving data with automatic JSON serialization.
 * 
 * @example
 * ```typescript
 * const storage = new StorageService();
 * 
 * // Store data
 * storage.set('user', { id: '1', name: 'John' });
 * 
 * // Retrieve data
 * const user = storage.get<User>('user');
 * 
 * // Remove data
 * storage.remove('user');
 * 
 * // Clear all data
 * storage.clear();
 * ```
 */

/**
 * Custom error class for storage errors.
 * Extends the standard Error class with additional storage-specific information.
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public key?: string
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Storage type options for the StorageService.
 */
export type StorageType = 'localStorage' | 'sessionStorage';

/**
 * Storage service class for managing browser storage.
 * Handles automatic JSON serialization/deserialization and error handling.
 */
export class StorageService {
  private storage: Storage | null = null;
  private storageType: StorageType;

  /**
   * Creates a new storage service instance.
   * 
   * @param storageType - The type of storage to use ('localStorage' or 'sessionStorage')
   * @throws {StorageError} When storage is not available (e.g., in SSR or when disabled)
   */
  constructor(storageType: StorageType = 'localStorage') {
    this.storageType = storageType;
    
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      try {
        this.storage = window[storageType];
        // Test if storage is actually available (can be disabled in some browsers)
        const testKey = '__storage_test__';
        this.storage.setItem(testKey, 'test');
        this.storage.removeItem(testKey);
      } catch (error) {
        // Storage is not available (disabled, quota exceeded, or in private mode)
        this.storage = null;
      }
    }
  }

  /**
   * Checks if storage is available.
   * 
   * @returns True if storage is available, false otherwise
   */
  private isAvailable(): boolean {
    return this.storage !== null;
  }

  /**
   * Retrieves a value from storage.
   * 
   * @param key - The storage key
   * @returns The stored value, or null if not found or storage is unavailable
   * 
   * @example
   * ```typescript
   * const user = storage.get<User>('user');
   * if (user) {
   *   console.log(user.name);
   * }
   * ```
   */
  get<T>(key: string): T | null {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const item = this.storage!.getItem(key);
      if (item === null) {
        return null;
      }

      // Try to parse as JSON, fall back to raw string if parsing fails
      try {
        return JSON.parse(item) as T;
      } catch {
        // If it's not valid JSON, return as-is (for backward compatibility)
        return item as unknown as T;
      }
    } catch (error) {
      throw new StorageError(
        `Failed to get item from ${this.storageType}`,
        'GET_ERROR',
        key
      );
    }
  }

  /**
   * Stores a value in storage.
   * Automatically serializes the value to JSON.
   * 
   * @param key - The storage key
   * @param value - The value to store
   * @throws {StorageError} When storage is unavailable or quota is exceeded
   * 
   * @example
   * ```typescript
   * storage.set('user', { id: '1', name: 'John' });
   * storage.set('theme', 'dark');
   * ```
   */
  set<T>(key: string, value: T): void {
    if (!this.isAvailable()) {
      throw new StorageError(
        `${this.storageType} is not available`,
        'STORAGE_UNAVAILABLE',
        key
      );
    }

    try {
      const serialized = JSON.stringify(value);
      this.storage!.setItem(key, serialized);
    } catch (error) {
      if (error instanceof Error) {
        // Check for quota exceeded error
        if (
          error.name === 'QuotaExceededError' ||
          error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
        ) {
          throw new StorageError(
            `Storage quota exceeded for ${this.storageType}`,
            'QUOTA_EXCEEDED',
            key
          );
        }
      }

      throw new StorageError(
        `Failed to set item in ${this.storageType}`,
        'SET_ERROR',
        key
      );
    }
  }

  /**
   * Removes a value from storage.
   * 
   * @param key - The storage key to remove
   * 
   * @example
   * ```typescript
   * storage.remove('user');
   * ```
   */
  remove(key: string): void {
    if (!this.isAvailable()) {
      return;
    }

    try {
      this.storage!.removeItem(key);
    } catch (error) {
      throw new StorageError(
        `Failed to remove item from ${this.storageType}`,
        'REMOVE_ERROR',
        key
      );
    }
  }

  /**
   * Clears all values from storage.
   * 
   * @example
   * ```typescript
   * storage.clear();
   * ```
   */
  clear(): void {
    if (!this.isAvailable()) {
      return;
    }

    try {
      this.storage!.clear();
    } catch (error) {
      throw new StorageError(
        `Failed to clear ${this.storageType}`,
        'CLEAR_ERROR'
      );
    }
  }

  /**
   * Gets all keys currently stored.
   * 
   * @returns Array of all storage keys
   * 
   * @example
   * ```typescript
   * const keys = storage.keys();
   * console.log('Stored keys:', keys);
   * ```
   */
  keys(): string[] {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const keys: string[] = [];
      for (let i = 0; i < this.storage!.length; i++) {
        const key = this.storage!.key(i);
        if (key !== null) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      throw new StorageError(
        `Failed to get keys from ${this.storageType}`,
        'KEYS_ERROR'
      );
    }
  }

  /**
   * Checks if a key exists in storage.
   * 
   * @param key - The storage key to check
   * @returns True if the key exists, false otherwise
   * 
   * @example
   * ```typescript
   * if (storage.has('user')) {
   *   console.log('User data exists');
   * }
   * ```
   */
  has(key: string): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      return this.storage!.getItem(key) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the number of items in storage.
   * 
   * @returns The number of stored items
   * 
   * @example
   * ```typescript
   * const count = storage.size();
   * console.log(`Storage contains ${count} items`);
   * ```
   */
  size(): number {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      return this.storage!.length;
    } catch (error) {
      return 0;
    }
  }
}

/**
 * Default localStorage instance for the application.
 * 
 * @example
 * ```typescript
 * import { localStorage } from '@/shared/services/storage';
 * 
 * localStorage.set('theme', 'dark');
 * const theme = localStorage.get<string>('theme');
 * ```
 */
export const localStorage = new StorageService('localStorage');

/**
 * Default sessionStorage instance for the application.
 * 
 * @example
 * ```typescript
 * import { sessionStorage } from '@/shared/services/storage';
 * 
 * sessionStorage.set('tempData', { id: '123' });
 * const data = sessionStorage.get<TempData>('tempData');
 * ```
 */
export const sessionStorage = new StorageService('sessionStorage');
