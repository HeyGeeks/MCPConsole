# Storage Service

A type-safe, SSR-compatible storage service for managing browser storage (localStorage and sessionStorage) with automatic JSON serialization.

## Features

- ✅ **Type-safe**: Full TypeScript support with generics
- ✅ **SSR-compatible**: Gracefully handles server-side rendering environments
- ✅ **Auto-serialization**: Automatic JSON serialization/deserialization
- ✅ **Error handling**: Comprehensive error handling with custom error types
- ✅ **Quota management**: Detects and handles storage quota exceeded errors
- ✅ **Multiple storage types**: Supports both localStorage and sessionStorage
- ✅ **Utility methods**: Additional methods like `has()`, `keys()`, `size()`

## Installation

The storage service is already available in the shared services:

```typescript
import { StorageService, localStorage, sessionStorage } from '@/shared/services/storage';
```

## Basic Usage

### Using the default localStorage instance

```typescript
import { localStorage } from '@/shared/services/storage';

// Store data
localStorage.set('user', { id: '123', name: 'John Doe' });

// Retrieve data
const user = localStorage.get<User>('user');

// Check if key exists
if (localStorage.has('user')) {
  console.log('User data exists');
}

// Remove data
localStorage.remove('user');

// Clear all data
localStorage.clear();
```

### Using sessionStorage

```typescript
import { sessionStorage } from '@/shared/services/storage';

sessionStorage.set('tempData', { token: 'abc123' });
const data = sessionStorage.get<TempData>('tempData');
```

### Creating a custom storage instance

```typescript
import { StorageService } from '@/shared/services/storage';

const customStorage = new StorageService('localStorage');
```

## API Reference

### Methods

#### `get<T>(key: string): T | null`

Retrieves a value from storage.

```typescript
const user = localStorage.get<User>('user');
```

#### `set<T>(key: string, value: T): void`

Stores a value in storage. Automatically serializes to JSON.

```typescript
localStorage.set('theme', 'dark');
localStorage.set('user', { id: '1', name: 'John' });
```

**Throws:**
- `StorageError` with code `STORAGE_UNAVAILABLE` if storage is not available
- `StorageError` with code `QUOTA_EXCEEDED` if storage quota is exceeded

#### `remove(key: string): void`

Removes a value from storage.

```typescript
localStorage.remove('user');
```

#### `clear(): void`

Clears all values from storage.

```typescript
localStorage.clear();
```

#### `keys(): string[]`

Gets all keys currently stored.

```typescript
const allKeys = localStorage.keys();
console.log('Stored keys:', allKeys);
```

#### `has(key: string): boolean`

Checks if a key exists in storage.

```typescript
if (localStorage.has('user')) {
  console.log('User data exists');
}
```

#### `size(): number`

Gets the number of items in storage.

```typescript
const count = localStorage.size();
console.log(`Storage contains ${count} items`);
```

## Error Handling

The storage service provides comprehensive error handling:

```typescript
import { StorageError } from '@/shared/services/storage';

try {
  localStorage.set('largeData', veryLargeObject);
} catch (error) {
  if (error instanceof StorageError) {
    if (error.code === 'QUOTA_EXCEEDED') {
      console.error('Storage quota exceeded');
      // Handle quota exceeded - maybe clear old data
      localStorage.clear();
    } else if (error.code === 'STORAGE_UNAVAILABLE') {
      console.error('Storage is not available');
      // Fall back to in-memory storage or inform user
    }
  }
}
```

### Error Codes

- `STORAGE_UNAVAILABLE`: Storage is not available (SSR, disabled, or private mode)
- `QUOTA_EXCEEDED`: Storage quota has been exceeded
- `GET_ERROR`: Error retrieving item from storage
- `SET_ERROR`: Error storing item in storage
- `REMOVE_ERROR`: Error removing item from storage
- `CLEAR_ERROR`: Error clearing storage
- `KEYS_ERROR`: Error getting keys from storage

## SSR Compatibility

The storage service gracefully handles server-side rendering:

```typescript
// This won't throw an error in SSR, just returns null
function getThemePreference(): string {
  const theme = localStorage.get<string>('theme');
  return theme || 'light'; // Fallback to default
}
```

## Advanced Usage

### Type-safe storage with interfaces

```typescript
interface AppSettings {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

const settings: AppSettings = {
  theme: 'dark',
  language: 'en',
  notifications: true,
};

localStorage.set('appSettings', settings);

// TypeScript knows the structure
const loadedSettings = localStorage.get<AppSettings>('appSettings');
if (loadedSettings) {
  console.log(`Theme: ${loadedSettings.theme}`);
}
```

### Storage wrapper for specific features

```typescript
class UserPreferencesStorage {
  private storage = localStorage;
  private prefix = 'userPrefs_';

  setPreference<T>(key: string, value: T): void {
    this.storage.set(`${this.prefix}${key}`, value);
  }

  getPreference<T>(key: string): T | null {
    return this.storage.get<T>(`${this.prefix}${key}`);
  }

  clearAllPreferences(): void {
    const keys = this.storage.keys();
    keys
      .filter(key => key.startsWith(this.prefix))
      .forEach(key => this.storage.remove(key));
  }
}

const userPrefs = new UserPreferencesStorage();
userPrefs.setPreference('sidebarCollapsed', true);
```

## Migration from Direct localStorage Usage

### Before (direct localStorage usage):

```typescript
const user = JSON.parse(localStorage.getItem('user') || '{}');
localStorage.setItem('user', JSON.stringify(user));
```

### After (using StorageService):

```typescript
const user = localStorage.get<User>('user');
if (user) {
  localStorage.set('user', user);
}
```

### Benefits:

- ✅ Automatic JSON serialization/deserialization
- ✅ Type safety with generics
- ✅ Error handling
- ✅ SSR compatibility
- ✅ Consistent API

## Testing

Unit tests are provided in `storage.test.ts`. The tests cover:

- Basic CRUD operations (get, set, remove, clear)
- Type safety
- Error handling
- SSR scenarios
- Quota exceeded scenarios
- Edge cases

## Examples

See `storage.example.ts` for comprehensive usage examples including:

1. Basic usage with default instances
2. SessionStorage usage
3. Storing primitive values
4. Working with arrays and complex objects
5. Error handling
6. Listing and managing stored items
7. Creating custom storage instances
8. Type-safe storage with interfaces
9. SSR handling
10. Storage wrappers for specific features
11. Migration from direct localStorage usage

## Requirements

This implementation satisfies **Requirement 4.1** from the project structure refactor specification:

> THE Application SHALL identify and extract common patterns into Shared_Utility modules

The storage service consolidates storage access patterns into a reusable, type-safe utility that can be used across all features.
