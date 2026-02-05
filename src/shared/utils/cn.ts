import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function for merging Tailwind CSS classes
 * 
 * Combines clsx for conditional classes and tailwind-merge for deduplication.
 * This is the standard utility for className composition in the application.
 * 
 * @param inputs - Class values to merge (strings, objects, arrays)
 * @returns Merged and deduplicated class string
 * 
 * @example
 * ```tsx
 * // Basic usage
 * cn('px-4 py-2', 'bg-blue-500')
 * // => 'px-4 py-2 bg-blue-500'
 * 
 * // Conditional classes
 * cn('base-class', isActive && 'active-class')
 * 
 * // Override classes (later classes override earlier ones)
 * cn('px-4', 'px-6')
 * // => 'px-6'
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
