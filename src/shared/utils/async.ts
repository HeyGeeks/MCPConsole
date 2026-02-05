/**
 * Async utilities for common asynchronous operations
 */

/**
 * Delays execution for a specified number of milliseconds
 * 
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the delay
 * 
 * @example
 * ```ts
 * await delay(1000); // Wait 1 second
 * console.log('Executed after 1 second');
 * ```
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retries an async function with exponential backoff
 * 
 * @param fn - Async function to retry
 * @param options - Retry options
 * @returns Promise that resolves with the function result
 * 
 * @example
 * ```ts
 * const result = await retry(
 *   () => fetch('/api/data'),
 *   { maxAttempts: 3, delayMs: 1000 }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxAttempts) {
        const waitTime = delayMs * Math.pow(backoffMultiplier, attempt - 1);
        await delay(waitTime);
      }
    }
  }
  
  throw lastError;
}

/**
 * Executes an async function with a timeout
 * 
 * @param fn - Async function to execute
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that resolves with the function result or rejects on timeout
 * 
 * @example
 * ```ts
 * try {
 *   const result = await withTimeout(
 *     () => fetch('/api/slow-endpoint'),
 *     5000
 *   );
 * } catch (error) {
 *   console.error('Request timed out');
 * }
 * ```
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    ),
  ]);
}

/**
 * Debounces an async function
 * 
 * @param fn - Async function to debounce
 * @param delayMs - Delay in milliseconds
 * @returns Debounced function
 * 
 * @example
 * ```ts
 * const debouncedSearch = debounce(
 *   async (query: string) => {
 *     return fetch(`/api/search?q=${query}`);
 *   },
 *   300
 * );
 * 
 * // Only the last call within 300ms will execute
 * debouncedSearch('hello');
 * debouncedSearch('hello world');
 * ```
 */
export function debounce<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delayMs);
    });
  };
}

/**
 * Throttles an async function
 * 
 * @param fn - Async function to throttle
 * @param limitMs - Minimum time between executions in milliseconds
 * @returns Throttled function
 * 
 * @example
 * ```ts
 * const throttledSave = throttle(
 *   async (data: any) => {
 *     return fetch('/api/save', { method: 'POST', body: JSON.stringify(data) });
 *   },
 *   1000
 * );
 * 
 * // Only executes once per second
 * throttledSave(data1);
 * throttledSave(data2);
 * ```
 */
export function throttle<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> | null {
  let lastRun = 0;
  
  return (...args: Parameters<T>): Promise<ReturnType<T>> | null => {
    const now = Date.now();
    
    if (now - lastRun >= limitMs) {
      lastRun = now;
      return fn(...args);
    }
    
    return null;
  };
}
