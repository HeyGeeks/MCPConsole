/**
 * Validation utilities for common data validation tasks
 */

/**
 * Validates if a string is a valid email address
 * 
 * @param email - Email string to validate
 * @returns True if valid email format
 * 
 * @example
 * ```ts
 * isValidEmail('user@example.com')
 * // => true
 * 
 * isValidEmail('invalid-email')
 * // => false
 * ```
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates if a string is a valid URL
 * 
 * @param url - URL string to validate
 * @returns True if valid URL format
 * 
 * @example
 * ```ts
 * isValidUrl('https://example.com')
 * // => true
 * 
 * isValidUrl('not-a-url')
 * // => false
 * ```
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a value is empty (null, undefined, empty string, empty array, empty object)
 * 
 * @param value - Value to check
 * @returns True if value is empty
 * 
 * @example
 * ```ts
 * isEmpty('')
 * // => true
 * 
 * isEmpty([])
 * // => true
 * 
 * isEmpty({})
 * // => true
 * 
 * isEmpty('hello')
 * // => false
 * ```
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Validates if a string is a valid JSON
 * 
 * @param str - String to validate
 * @returns True if valid JSON
 * 
 * @example
 * ```ts
 * isValidJson('{"key": "value"}')
 * // => true
 * 
 * isValidJson('not json')
 * // => false
 * ```
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a number is within a range (inclusive)
 * 
 * @param num - Number to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns True if number is within range
 * 
 * @example
 * ```ts
 * isInRange(5, 1, 10)
 * // => true
 * 
 * isInRange(15, 1, 10)
 * // => false
 * ```
 */
export function isInRange(num: number, min: number, max: number): boolean {
  return num >= min && num <= max;
}
