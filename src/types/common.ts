/**
 * Common type definitions used across multiple modules
 */

import type { Logger } from '../core/utils/logger.js';

/**
 * Easing function types for smooth transitions
 */
export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

/**
 * Generic object pool interface for memory management
 * Provides reusable object instances to avoid frequent allocation/deallocation
 */
export type ObjectPool<T> = {
  /**
   * Get an available object from the pool
   * @returns An object instance or null if pool is empty
   */
  get(): T | null;

  /**
   * Return an object to the pool for reuse
   * @param item - The object to return to the pool
   */
  release(item: T): void;

  /**
   * Pre-allocate a specified number of objects in the pool
   * @param count - Number of objects to pre-allocate
   */
  preallocate(count: number): void;

  /**
   * Clear all objects from the pool and reset
   */
  clear(): void;

  /**
   * Get current pool statistics
   * @returns Pool usage information
   */
  getStats(): ObjectPoolStats;
};

/**
 * Statistics about object pool usage
 */
export type ObjectPoolStats = {
  /** Total number of objects in the pool */
  total: number;
  /** Number of available objects */
  available: number;
  /** Number of objects currently in use */
  inUse: number;
  /** Peak usage count */
  peak: number;
};

/**
 * Configuration for creating an object pool
 */
export type ObjectPoolConfig<T> = {
  /** Factory function to create new objects */
  createFn: () => T;
  /** Function to reset/clean an object when returned to pool */
  resetFn?: (item: T) => void;
  /** Logger instance for logging warnings and errors */
  logger?: Logger;
  /** Initial pool size */
  initialSize?: number;
  /** Maximum pool size (0 = unlimited) */
  maxSize?: number;
  /** Whether to automatically grow the pool when empty */
  autoGrow?: boolean;
};
