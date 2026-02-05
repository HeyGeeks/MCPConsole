/**
 * Base API client for making HTTP requests.
 * Provides consistent error handling and request/response formatting across all API calls.
 * 
 * @example
 * ```typescript
 * const apiClient = new APIClient('/api');
 * 
 * // GET request
 * const users = await apiClient.get<User[]>('/users');
 * 
 * // POST request
 * const newUser = await apiClient.post<User>('/users', { name: 'John' });
 * 
 * // PUT request
 * const updatedUser = await apiClient.put<User>('/users/1', { name: 'Jane' });
 * 
 * // DELETE request
 * await apiClient.delete('/users/1');
 * ```
 */

import { APIResponse, APIError, APIRequestOptions } from '@/shared/types/api';

/**
 * Custom error class for API errors.
 * Extends the standard Error class with additional API-specific information.
 */
export class APIClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIClientError';
  }
}

/**
 * Base API client class for making HTTP requests.
 * Handles request formatting, error handling, and response parsing.
 */
export class APIClient {
  private baseURL: string;
  private defaultOptions: APIRequestOptions;

  /**
   * Creates a new API client instance.
   * 
   * @param baseURL - The base URL for all API requests (e.g., '/api' or 'https://api.example.com')
   * @param defaultOptions - Default options to apply to all requests
   */
  constructor(baseURL: string, defaultOptions: APIRequestOptions = {}) {
    this.baseURL = baseURL;
    this.defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...defaultOptions.headers,
      },
      credentials: defaultOptions.credentials || 'same-origin',
      timeout: defaultOptions.timeout,
    };
  }

  /**
   * Makes an HTTP request to the specified path.
   * 
   * @param path - The API endpoint path (relative to baseURL)
   * @param options - Request options (method, body, headers, etc.)
   * @returns Promise resolving to the response data
   * @throws {APIClientError} When the request fails or returns an error status
   */
  private async request<T>(
    path: string,
    options: RequestInit & APIRequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseURL}${path}`;
    
    // Merge default options with request-specific options
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...this.defaultOptions.headers,
        ...options.headers,
      },
      credentials: options.credentials || this.defaultOptions.credentials,
      signal: options.signal,
    };

    // Handle request timeout if specified
    const timeout = options.timeout || this.defaultOptions.timeout;
    let timeoutId: NodeJS.Timeout | undefined;
    
    if (timeout) {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeout);
      requestOptions.signal = controller.signal;
    }

    try {
      const response = await fetch(url, requestOptions);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Parse response body
      let responseData: APIResponse<T> | APIError;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        // Handle non-JSON responses
        const text = await response.text();
        responseData = {
          data: text as unknown as T,
          status: response.status,
        };
      }

      // Handle error responses
      if (!response.ok) {
        const errorData = responseData as APIResponse<T> & APIError;
        throw new APIClientError(
          errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code || 'UNKNOWN_ERROR',
          response.status,
          errorData.details
        );
      }

      // Return the data from successful responses
      const successData = responseData as APIResponse<T>;
      return successData.data;
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Handle network errors and timeouts
      if (error instanceof APIClientError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new APIClientError(
            'Request timeout',
            'REQUEST_TIMEOUT',
            408
          );
        }

        throw new APIClientError(
          error.message || 'Network error',
          'NETWORK_ERROR',
          0
        );
      }

      throw new APIClientError(
        'Unknown error occurred',
        'UNKNOWN_ERROR',
        0
      );
    }
  }

  /**
   * Makes a GET request to the specified path.
   * 
   * @param path - The API endpoint path
   * @param options - Optional request options
   * @returns Promise resolving to the response data
   * 
   * @example
   * ```typescript
   * const users = await apiClient.get<User[]>('/users');
   * const user = await apiClient.get<User>('/users/123');
   * ```
   */
  async get<T>(path: string, options?: APIRequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * Makes a POST request to the specified path.
   * 
   * @param path - The API endpoint path
   * @param data - The request body data
   * @param options - Optional request options
   * @returns Promise resolving to the response data
   * 
   * @example
   * ```typescript
   * const newUser = await apiClient.post<User>('/users', {
   *   name: 'John Doe',
   *   email: 'john@example.com'
   * });
   * ```
   */
  async post<T>(
    path: string,
    data?: unknown,
    options?: APIRequestOptions
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Makes a PUT request to the specified path.
   * 
   * @param path - The API endpoint path
   * @param data - The request body data
   * @param options - Optional request options
   * @returns Promise resolving to the response data
   * 
   * @example
   * ```typescript
   * const updatedUser = await apiClient.put<User>('/users/123', {
   *   name: 'Jane Doe'
   * });
   * ```
   */
  async put<T>(
    path: string,
    data?: unknown,
    options?: APIRequestOptions
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Makes a DELETE request to the specified path.
   * 
   * @param path - The API endpoint path
   * @param options - Optional request options
   * @returns Promise resolving to the response data
   * 
   * @example
   * ```typescript
   * await apiClient.delete('/users/123');
   * ```
   */
  async delete<T>(path: string, options?: APIRequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Makes a PATCH request to the specified path.
   * 
   * @param path - The API endpoint path
   * @param data - The request body data
   * @param options - Optional request options
   * @returns Promise resolving to the response data
   * 
   * @example
   * ```typescript
   * const updatedUser = await apiClient.patch<User>('/users/123', {
   *   email: 'newemail@example.com'
   * });
   * ```
   */
  async patch<T>(
    path: string,
    data?: unknown,
    options?: APIRequestOptions
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

/**
 * Default API client instance for the application.
 * Uses '/api' as the base URL for all requests.
 * 
 * @example
 * ```typescript
 * import { apiClient } from '@/shared/services/api-client';
 * 
 * const users = await apiClient.get<User[]>('/users');
 * ```
 */
export const apiClient = new APIClient('/api');
