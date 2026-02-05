# Shared Services

This directory contains shared service modules used across multiple features in the application.

## API Client

The `api-client.ts` module provides a base HTTP client for making API requests with consistent error handling and response formatting.

### Features

- **Type-safe requests**: Full TypeScript support with generic types
- **Consistent error handling**: All errors are wrapped in `APIClientError` with structured information
- **Request/response formatting**: Automatic JSON serialization and parsing
- **Timeout support**: Configure request timeouts to prevent hanging requests
- **Custom headers**: Support for custom headers (e.g., authentication tokens)
- **Abort signals**: Support for request cancellation via AbortController

### Usage

#### Basic Usage

```typescript
import { apiClient } from '@/shared/services/api-client';

// GET request
const users = await apiClient.get<User[]>('/users');

// POST request
const newUser = await apiClient.post<User>('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// PUT request
const updatedUser = await apiClient.put<User>('/users/123', {
  name: 'Jane Doe'
});

// DELETE request
await apiClient.delete('/users/123');

// PATCH request
const patchedUser = await apiClient.patch<User>('/users/123', {
  email: 'newemail@example.com'
});
```

#### Custom API Client Instance

```typescript
import { APIClient } from '@/shared/services/api-client';

// Create a client for an external API
const externalClient = new APIClient('https://api.example.com', {
  headers: {
    'Authorization': 'Bearer token123'
  },
  timeout: 5000 // 5 second timeout
});

const data = await externalClient.get('/endpoint');
```

#### Error Handling

```typescript
import { apiClient, APIClientError } from '@/shared/services/api-client';

try {
  const user = await apiClient.get<User>('/users/123');
} catch (error) {
  if (error instanceof APIClientError) {
    console.error('API Error:', {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details
    });
    
    // Handle specific error codes
    if (error.code === 'USER_NOT_FOUND') {
      // Handle not found
    } else if (error.status === 401) {
      // Handle unauthorized
    }
  }
}
```

#### Request Options

```typescript
// Custom headers
const data = await apiClient.get('/users', {
  headers: {
    'Authorization': 'Bearer token123'
  }
});

// Request timeout
const data = await apiClient.get('/users', {
  timeout: 3000 // 3 seconds
});

// Abort signal for cancellation
const controller = new AbortController();
const promise = apiClient.get('/users', {
  signal: controller.signal
});

// Cancel the request
controller.abort();
```

### API Response Format

All API endpoints should return responses in the following format:

```typescript
// Success response
{
  "data": { /* response data */ },
  "status": 200
}

// Error response
{
  "message": "Error message",
  "code": "ERROR_CODE",
  "status": 400,
  "details": { /* optional error details */ }
}
```

### Testing

Unit tests are provided in `api-client.test.ts`. To run the tests, you need to install Jest:

```bash
npm install --save-dev jest @types/jest ts-jest
```

Then configure Jest in `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

Run tests:

```bash
npm test
```

### Requirements

This module satisfies the following requirements:
- **Requirement 4.2**: Consolidates duplicate API client logic into a single reusable client
- **Requirement 7.5**: Implements consistent error handling across all API routes

### Related Files

- `src/shared/types/api.ts` - API type definitions
- `src/shared/services/api-client.test.ts` - Unit tests
