/**
 * API type definitions for request and response handling.
 * These types ensure consistent API contracts across all endpoints.
 */

/**
 * Standard API response wrapper for all endpoints.
 * Provides consistent structure for successful responses.
 * 
 * @template T - The type of data being returned
 * 
 * @example
 * ```typescript
 * const response: APIResponse<User> = {
 *   data: { id: '1', name: 'John' },
 *   status: 200
 * };
 * ```
 */
export interface APIResponse<T> {
  /** The response data */
  data: T;
  /** Optional error message (present when status indicates error) */
  error?: string;
  /** HTTP status code */
  status: number;
}

/**
 * Standard API error structure for error responses.
 * Provides detailed error information for debugging and user feedback.
 * 
 * @example
 * ```typescript
 * const error: APIError = {
 *   message: 'User not found',
 *   code: 'USER_NOT_FOUND',
 *   details: { userId: '123' }
 * };
 * ```
 */
export interface APIError {
  /** Human-readable error message */
  message: string;
  /** Machine-readable error code for programmatic handling */
  code: string;
  /** Optional additional error details */
  details?: Record<string, unknown>;
}

/**
 * Pagination metadata for paginated responses.
 * Provides information about the current page and total results.
 */
export interface PaginationMeta {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items across all pages */
  total: number;
  /** Whether there are more pages available */
  hasMore: boolean;
}

/**
 * Standard paginated response wrapper.
 * Used for endpoints that return lists of items with pagination.
 * 
 * @template T - The type of items in the data array
 * 
 * @example
 * ```typescript
 * const response: PaginatedResponse<User> = {
 *   data: [
 *     { id: '1', name: 'John' },
 *     { id: '2', name: 'Jane' }
 *   ],
 *   pagination: {
 *     page: 1,
 *     pageSize: 10,
 *     total: 25,
 *     hasMore: true
 *   }
 * };
 * ```
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page */
  data: T[];
  /** Pagination metadata */
  pagination: PaginationMeta;
}

/**
 * Standard request options for API calls.
 * Provides common configuration for all API requests.
 */
export interface APIRequestOptions {
  /** Request headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to include credentials (cookies) */
  credentials?: RequestCredentials;
  /** Abort signal for cancelling requests */
  signal?: AbortSignal;
}

/**
 * Pagination parameters for list requests.
 * Used to specify which page and how many items to retrieve.
 */
export interface PaginationParams {
  /** Page number to retrieve (1-indexed) */
  page?: number;
  /** Number of items per page */
  pageSize?: number;
}

/**
 * Sorting parameters for list requests.
 * Used to specify how to sort the results.
 */
export interface SortParams {
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Common query parameters for list endpoints.
 * Combines pagination, sorting, and filtering.
 */
export interface ListQueryParams extends PaginationParams, SortParams {
  /** Search query string */
  search?: string;
  /** Additional filter parameters */
  filters?: Record<string, unknown>;
}
