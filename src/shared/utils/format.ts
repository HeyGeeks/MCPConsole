/**
 * Formatting utilities for common data transformations
 */

/**
 * Formats a date to a human-readable string
 * 
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 * 
 * @example
 * ```ts
 * formatDate(new Date())
 * // => "Jan 1, 2024"
 * 
 * formatDate(new Date(), { dateStyle: 'full' })
 * // => "Monday, January 1, 2024"
 * ```
 */
export function formatDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
}

/**
 * Formats a number with thousand separators
 * 
 * @param num - Number to format
 * @param options - Intl.NumberFormat options
 * @returns Formatted number string
 * 
 * @example
 * ```ts
 * formatNumber(1234567)
 * // => "1,234,567"
 * 
 * formatNumber(1234.56, { minimumFractionDigits: 2 })
 * // => "1,234.56"
 * ```
 */
export function formatNumber(
  num: number,
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat('en-US', options).format(num);
}

/**
 * Truncates a string to a maximum length with ellipsis
 * 
 * @param str - String to truncate
 * @param maxLength - Maximum length before truncation
 * @param suffix - Suffix to append (default: '...')
 * @returns Truncated string
 * 
 * @example
 * ```ts
 * truncate('This is a long string', 10)
 * // => "This is a..."
 * 
 * truncate('Short', 10)
 * // => "Short"
 * ```
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalizes the first letter of a string
 * 
 * @param str - String to capitalize
 * @returns Capitalized string
 * 
 * @example
 * ```ts
 * capitalize('hello world')
 * // => "Hello world"
 * ```
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a string to kebab-case
 * 
 * @param str - String to convert
 * @returns Kebab-cased string
 * 
 * @example
 * ```ts
 * toKebabCase('Hello World')
 * // => "hello-world"
 * 
 * toKebabCase('camelCaseString')
 * // => "camel-case-string"
 * ```
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Converts a string to camelCase
 * 
 * @param str - String to convert
 * @returns CamelCased string
 * 
 * @example
 * ```ts
 * toCamelCase('hello-world')
 * // => "helloWorld"
 * 
 * toCamelCase('hello_world')
 * // => "helloWorld"
 * ```
 */
export function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''));
}
