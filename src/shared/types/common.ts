/**
 * Common type definitions used across the application.
 * These types are shared by multiple features and provide
 * consistent type safety throughout the codebase.
 */

/**
 * Represents a unique identifier for entities.
 */
export type ID = string;

/**
 * Represents a timestamp as a Date object.
 */
export type Timestamp = Date;

/**
 * Represents a generic key-value record with string keys.
 */
export type StringRecord = Record<string, string>;

/**
 * Represents a generic metadata object with unknown values.
 */
export type Metadata = Record<string, unknown>;

/**
 * Represents the possible status states for async operations.
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Represents a result type that can be either success or error.
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Represents an optional value that may be null or undefined.
 */
export type Maybe<T> = T | null | undefined;

/**
 * Represents a function that takes no arguments and returns void.
 */
export type VoidFunction = () => void;

/**
 * Represents a function that takes an argument and returns void.
 */
export type Callback<T = void> = (arg: T) => void;

/**
 * Represents a function that takes an argument and returns a promise.
 */
export type AsyncCallback<T = void, R = void> = (arg: T) => Promise<R>;
