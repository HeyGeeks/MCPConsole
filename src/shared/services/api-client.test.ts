/**
 * Unit tests for the API client.
 * Tests the core functionality of GET, POST, PUT, DELETE methods and error handling.
 */

import { APIClient, APIClientError } from './api-client';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('APIClient', () => {
  let apiClient: APIClient;

  beforeEach(() => {
    apiClient = new APIClient('/api');
    mockFetch.mockClear();
  });

  describe('GET requests', () => {
    it('should make a successful GET request', async () => {
      const mockData = { id: '1', name: 'Test User' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: mockData, status: 200 }),
      });

      const result = await apiClient.get('/users/1');

      expect(mockFetch).toHaveBeenCalledWith('/api/users/1', expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }));
      expect(result).toEqual(mockData);
    });

    it('should handle GET request errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'User not found',
          code: 'USER_NOT_FOUND',
          status: 404,
        }),
      });

      await expect(apiClient.get('/users/999')).rejects.toThrow(APIClientError);
      await expect(apiClient.get('/users/999')).rejects.toMatchObject({
        message: 'User not found',
        code: 'USER_NOT_FOUND',
        status: 404,
      });
    });
  });

  describe('POST requests', () => {
    it('should make a successful POST request', async () => {
      const requestData = { name: 'New User', email: 'user@example.com' };
      const responseData = { id: '2', ...requestData };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: responseData, status: 201 }),
      });

      const result = await apiClient.post('/users', requestData);

      expect(mockFetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }));
      expect(result).toEqual(responseData);
    });

    it('should handle POST request validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Invalid email format',
          code: 'VALIDATION_ERROR',
          status: 400,
          details: { field: 'email' },
        }),
      });

      await expect(apiClient.post('/users', { email: 'invalid' })).rejects.toThrow(APIClientError);
      await expect(apiClient.post('/users', { email: 'invalid' })).rejects.toMatchObject({
        message: 'Invalid email format',
        code: 'VALIDATION_ERROR',
        status: 400,
      });
    });
  });

  describe('PUT requests', () => {
    it('should make a successful PUT request', async () => {
      const updateData = { name: 'Updated User' };
      const responseData = { id: '1', name: 'Updated User', email: 'user@example.com' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: responseData, status: 200 }),
      });

      const result = await apiClient.put('/users/1', updateData);

      expect(mockFetch).toHaveBeenCalledWith('/api/users/1', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(updateData),
      }));
      expect(result).toEqual(responseData);
    });
  });

  describe('DELETE requests', () => {
    it('should make a successful DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: null, status: 204 }),
      });

      const result = await apiClient.delete('/users/1');

      expect(mockFetch).toHaveBeenCalledWith('/api/users/1', expect.objectContaining({
        method: 'DELETE',
      }));
      expect(result).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(apiClient.get('/users')).rejects.toThrow(APIClientError);
      await expect(apiClient.get('/users')).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        status: 0,
      });
    });

    it('should handle request timeout', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          setTimeout(() => reject(error), 100);
        })
      );

      await expect(apiClient.get('/users', { timeout: 50 })).rejects.toThrow(APIClientError);
      await expect(apiClient.get('/users', { timeout: 50 })).rejects.toMatchObject({
        code: 'REQUEST_TIMEOUT',
        status: 408,
      });
    });

    it('should handle non-JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Plain text response',
      });

      const result = await apiClient.get('/health');

      expect(result).toBe('Plain text response');
    });

    it('should handle responses without error details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      });

      await expect(apiClient.get('/users')).rejects.toThrow(APIClientError);
      await expect(apiClient.get('/users')).rejects.toMatchObject({
        message: 'HTTP 500: Internal Server Error',
        code: 'UNKNOWN_ERROR',
        status: 500,
      });
    });
  });

  describe('Custom options', () => {
    it('should support custom headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: {}, status: 200 }),
      });

      await apiClient.get('/users', {
        headers: { 'Authorization': 'Bearer token123' },
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer token123',
          'Content-Type': 'application/json',
        }),
      }));
    });

    it('should support abort signals', async () => {
      const controller = new AbortController();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: {}, status: 200 }),
      });

      await apiClient.get('/users', { signal: controller.signal });

      expect(mockFetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({
        signal: controller.signal,
      }));
    });
  });

  describe('PATCH requests', () => {
    it('should make a successful PATCH request', async () => {
      const patchData = { email: 'newemail@example.com' };
      const responseData = { id: '1', name: 'User', email: 'newemail@example.com' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: responseData, status: 200 }),
      });

      const result = await apiClient.patch('/users/1', patchData);

      expect(mockFetch).toHaveBeenCalledWith('/api/users/1', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(patchData),
      }));
      expect(result).toEqual(responseData);
    });
  });

  describe('Base URL handling', () => {
    it('should correctly combine base URL and path', async () => {
      const customClient = new APIClient('https://api.example.com');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: {}, status: 200 }),
      });

      await customClient.get('/users');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users', expect.any(Object));
    });
  });
});

describe('APIClientError', () => {
  it('should create error with all properties', () => {
    const error = new APIClientError(
      'Test error',
      'TEST_ERROR',
      400,
      { field: 'test' }
    );

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.status).toBe(400);
    expect(error.details).toEqual({ field: 'test' });
    expect(error.name).toBe('APIClientError');
  });
});
