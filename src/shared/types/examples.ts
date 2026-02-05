/**
 * Example usage of shared type definitions.
 * This file demonstrates how to use the common and API types
 * and serves as validation that the types are correctly defined.
 */

import type {
  ID,
  Timestamp,
  StringRecord,
  Metadata,
  AsyncStatus,
  Result,
  Maybe,
  VoidFunction,
  Callback,
  AsyncCallback,
} from './common';

import type {
  APIResponse,
  APIError,
  PaginatedResponse,
  PaginationMeta,
  APIRequestOptions,
  PaginationParams,
  SortParams,
  ListQueryParams,
} from './api';

// ============================================================================
// Common Types Examples
// ============================================================================

// Example: Using ID type
const userId: ID = '123e4567-e89b-12d3-a456-426614174000';
const postId: ID = 'post-123';

// Example: Using Timestamp type
const createdAt: Timestamp = new Date();
const updatedAt: Timestamp = new Date('2024-01-01');

// Example: Using StringRecord type
const headers: StringRecord = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer token',
};

// Example: Using Metadata type
const userMetadata: Metadata = {
  lastLogin: new Date(),
  preferences: { theme: 'dark', language: 'en' },
  loginCount: 42,
};

// Example: Using AsyncStatus type
const loadingStatus: AsyncStatus = 'loading';
const successStatus: AsyncStatus = 'success';

// Example: Using Result type
const successResult: Result<string> = {
  success: true,
  data: 'Operation completed',
};

const errorResult: Result<string> = {
  success: false,
  error: new Error('Operation failed'),
};

// Example: Using Maybe type
const optionalValue: Maybe<string> = 'value';
const nullValue: Maybe<string> = null;
const undefinedValue: Maybe<string> = undefined;

// Example: Using function types
const handleClick: VoidFunction = () => {
  console.log('Clicked');
};

const handleChange: Callback<string> = (value: string) => {
  console.log('Changed:', value);
};

const fetchData: AsyncCallback<string, number> = async (url: string) => {
  const response = await fetch(url);
  return response.status;
};

// ============================================================================
// API Types Examples
// ============================================================================

// Example: Using APIResponse type
interface User {
  id: string;
  name: string;
  email: string;
}

const userResponse: APIResponse<User> = {
  data: {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
  },
  status: 200,
};

const errorResponse: APIResponse<null> = {
  data: null,
  error: 'User not found',
  status: 404,
};

// Example: Using APIError type
const validationError: APIError = {
  message: 'Invalid email format',
  code: 'VALIDATION_ERROR',
  details: {
    field: 'email',
    value: 'invalid-email',
  },
};

const authError: APIError = {
  message: 'Unauthorized',
  code: 'AUTH_ERROR',
};

// Example: Using PaginatedResponse type
const usersListResponse: PaginatedResponse<User> = {
  data: [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
  ],
  pagination: {
    page: 1,
    pageSize: 10,
    total: 25,
    hasMore: true,
  },
};

// Example: Using PaginationMeta type
const paginationInfo: PaginationMeta = {
  page: 2,
  pageSize: 20,
  total: 100,
  hasMore: true,
};

// Example: Using APIRequestOptions type
const requestOptions: APIRequestOptions = {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token',
  },
  timeout: 5000,
  credentials: 'include',
};

// Example: Using PaginationParams type
const paginationParams: PaginationParams = {
  page: 1,
  pageSize: 20,
};

// Example: Using SortParams type
const sortParams: SortParams = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

// Example: Using ListQueryParams type
const listQueryParams: ListQueryParams = {
  page: 1,
  pageSize: 10,
  sortBy: 'name',
  sortOrder: 'asc',
  search: 'john',
  filters: {
    status: 'active',
    role: 'admin',
  },
};

// ============================================================================
// Practical Usage Examples
// ============================================================================

/**
 * Example: API client method using APIResponse
 */
async function getUser(id: string): Promise<APIResponse<User>> {
  try {
    const response = await fetch(`/api/users/${id}`);
    const data = await response.json();
    return {
      data,
      status: response.status,
    };
  } catch (error) {
    return {
      data: null as any,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    };
  }
}

/**
 * Example: API client method using PaginatedResponse
 */
async function listUsers(
  params: ListQueryParams
): Promise<PaginatedResponse<User>> {
  const queryString = new URLSearchParams({
    page: params.page?.toString() || '1',
    pageSize: params.pageSize?.toString() || '10',
    ...(params.sortBy && { sortBy: params.sortBy }),
    ...(params.sortOrder && { sortOrder: params.sortOrder }),
    ...(params.search && { search: params.search }),
  }).toString();

  const response = await fetch(`/api/users?${queryString}`);
  return response.json();
}

/**
 * Example: Error handling with Result type
 */
function parseJSON<T>(json: string): Result<T> {
  try {
    const data = JSON.parse(json) as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Parse error'),
    };
  }
}

/**
 * Example: Using Maybe type for optional values
 */
function findUserById(id: string, users: User[]): Maybe<User> {
  return users.find((user) => user.id === id);
}

// Export examples for documentation purposes
export {
  userId,
  postId,
  createdAt,
  updatedAt,
  headers,
  userMetadata,
  loadingStatus,
  successStatus,
  successResult,
  errorResult,
  optionalValue,
  nullValue,
  undefinedValue,
  handleClick,
  handleChange,
  fetchData,
  userResponse,
  errorResponse,
  validationError,
  authError,
  usersListResponse,
  paginationInfo,
  requestOptions,
  paginationParams,
  sortParams,
  listQueryParams,
  getUser,
  listUsers,
  parseJSON,
  findUserById,
};
