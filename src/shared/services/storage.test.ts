/**
 * Unit tests for the storage service.
 * Tests the core functionality of get, set, remove, clear methods and error handling.
 */

import { StorageService, StorageError } from './storage';

describe('StorageService', () => {
  let storage: StorageService;
  let mockStorage: Storage;

  beforeEach(() => {
    // Create a mock storage implementation
    const store: Record<string, string> = {};
    mockStorage = {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
      key: jest.fn((index: number) => {
        const keys = Object.keys(store);
        return keys[index] || null;
      }),
      length: 0,
    };

    // Update length property dynamically
    Object.defineProperty(mockStorage, 'length', {
      get: () => Object.keys(store).length,
    });

    // Mock window.localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
    });

    storage = new StorageService('localStorage');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should retrieve a stored value', () => {
      mockStorage.setItem('testKey', JSON.stringify({ name: 'Test' }));

      const result = storage.get<{ name: string }>('testKey');

      expect(result).toEqual({ name: 'Test' });
      expect(mockStorage.getItem).toHaveBeenCalledWith('testKey');
    });

    it('should return null for non-existent keys', () => {
      const result = storage.get('nonExistent');

      expect(result).toBeNull();
    });

    it('should handle non-JSON values', () => {
      mockStorage.setItem('plainText', 'just a string');

      const result = storage.get<string>('plainText');

      expect(result).toBe('just a string');
    });

    it('should return null when storage is unavailable', () => {
      // Create storage service in non-browser environment
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      const ssrStorage = new StorageService('localStorage');
      const result = ssrStorage.get('testKey');

      expect(result).toBeNull();

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('set', () => {
    it('should store a value', () => {
      const testData = { id: '1', name: 'Test User' };

      storage.set('user', testData);

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(testData)
      );
    });

    it('should store primitive values', () => {
      storage.set('count', 42);
      storage.set('flag', true);
      storage.set('text', 'hello');

      expect(mockStorage.setItem).toHaveBeenCalledWith('count', '42');
      expect(mockStorage.setItem).toHaveBeenCalledWith('flag', 'true');
      expect(mockStorage.setItem).toHaveBeenCalledWith('text', '"hello"');
    });

    it('should throw error when storage is unavailable', () => {
      // Create storage service in non-browser environment
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      const ssrStorage = new StorageService('localStorage');

      expect(() => ssrStorage.set('key', 'value')).toThrow(StorageError);
      expect(() => ssrStorage.set('key', 'value')).toThrow('localStorage is not available');

      // Restore window
      global.window = originalWindow;
    });

    it('should throw error when quota is exceeded', () => {
      // Mock quota exceeded error
      (mockStorage.setItem as jest.Mock).mockImplementationOnce(() => {
        const error = new Error('Quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      });

      expect(() => storage.set('key', 'value')).toThrow(StorageError);
      expect(() => storage.set('key', 'value')).toThrow('Storage quota exceeded');
    });
  });

  describe('remove', () => {
    it('should remove a stored value', () => {
      mockStorage.setItem('testKey', 'testValue');

      storage.remove('testKey');

      expect(mockStorage.removeItem).toHaveBeenCalledWith('testKey');
      expect(mockStorage.getItem('testKey')).toBeNull();
    });

    it('should not throw error when removing non-existent key', () => {
      expect(() => storage.remove('nonExistent')).not.toThrow();
    });

    it('should handle storage unavailable gracefully', () => {
      // Create storage service in non-browser environment
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      const ssrStorage = new StorageService('localStorage');

      expect(() => ssrStorage.remove('key')).not.toThrow();

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('clear', () => {
    it('should clear all stored values', () => {
      mockStorage.setItem('key1', 'value1');
      mockStorage.setItem('key2', 'value2');

      storage.clear();

      expect(mockStorage.clear).toHaveBeenCalled();
      expect(mockStorage.length).toBe(0);
    });

    it('should handle storage unavailable gracefully', () => {
      // Create storage service in non-browser environment
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      const ssrStorage = new StorageService('localStorage');

      expect(() => ssrStorage.clear()).not.toThrow();

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('keys', () => {
    it('should return all storage keys', () => {
      mockStorage.setItem('key1', 'value1');
      mockStorage.setItem('key2', 'value2');
      mockStorage.setItem('key3', 'value3');

      const keys = storage.keys();

      expect(keys).toEqual(['key1', 'key2', 'key3']);
    });

    it('should return empty array when storage is empty', () => {
      const keys = storage.keys();

      expect(keys).toEqual([]);
    });

    it('should return empty array when storage is unavailable', () => {
      // Create storage service in non-browser environment
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      const ssrStorage = new StorageService('localStorage');
      const keys = ssrStorage.keys();

      expect(keys).toEqual([]);

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      mockStorage.setItem('existingKey', 'value');

      expect(storage.has('existingKey')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(storage.has('nonExistent')).toBe(false);
    });

    it('should return false when storage is unavailable', () => {
      // Create storage service in non-browser environment
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      const ssrStorage = new StorageService('localStorage');

      expect(ssrStorage.has('key')).toBe(false);

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('size', () => {
    it('should return the number of stored items', () => {
      mockStorage.setItem('key1', 'value1');
      mockStorage.setItem('key2', 'value2');

      expect(storage.size()).toBe(2);
    });

    it('should return 0 when storage is empty', () => {
      expect(storage.size()).toBe(0);
    });

    it('should return 0 when storage is unavailable', () => {
      // Create storage service in non-browser environment
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      const ssrStorage = new StorageService('localStorage');

      expect(ssrStorage.size()).toBe(0);

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('sessionStorage', () => {
    it('should work with sessionStorage', () => {
      const sessionStore: Record<string, string> = {};
      const mockSessionStorage: Storage = {
        getItem: jest.fn((key: string) => sessionStore[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          sessionStore[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete sessionStore[key];
        }),
        clear: jest.fn(() => {
          Object.keys(sessionStore).forEach(key => delete sessionStore[key]);
        }),
        key: jest.fn((index: number) => {
          const keys = Object.keys(sessionStore);
          return keys[index] || null;
        }),
        length: 0,
      };

      Object.defineProperty(window, 'sessionStorage', {
        value: mockSessionStorage,
        writable: true,
      });

      const sessionStorageService = new StorageService('sessionStorage');
      sessionStorageService.set('sessionKey', 'sessionValue');

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'sessionKey',
        '"sessionValue"'
      );
    });
  });

  describe('error handling', () => {
    it('should throw StorageError with correct properties', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      const ssrStorage = new StorageService('localStorage');

      try {
        ssrStorage.set('key', 'value');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe('STORAGE_UNAVAILABLE');
        expect((error as StorageError).key).toBe('key');
        expect((error as StorageError).name).toBe('StorageError');
      }

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow', () => {
      // Set multiple values
      storage.set('user', { id: '1', name: 'John' });
      storage.set('theme', 'dark');
      storage.set('count', 42);

      // Verify they exist
      expect(storage.has('user')).toBe(true);
      expect(storage.has('theme')).toBe(true);
      expect(storage.has('count')).toBe(true);
      expect(storage.size()).toBe(3);

      // Get values
      expect(storage.get('user')).toEqual({ id: '1', name: 'John' });
      expect(storage.get('theme')).toBe('dark');
      expect(storage.get('count')).toBe(42);

      // Remove one
      storage.remove('theme');
      expect(storage.has('theme')).toBe(false);
      expect(storage.size()).toBe(2);

      // Clear all
      storage.clear();
      expect(storage.size()).toBe(0);
      expect(storage.has('user')).toBe(false);
      expect(storage.has('count')).toBe(false);
    });
  });
});

describe('StorageError', () => {
  it('should create error with all properties', () => {
    const error = new StorageError(
      'Test error',
      'TEST_ERROR',
      'testKey'
    );

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.key).toBe('testKey');
    expect(error.name).toBe('StorageError');
  });

  it('should create error without key', () => {
    const error = new StorageError(
      'Test error',
      'TEST_ERROR'
    );

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.key).toBeUndefined();
  });
});
