import type {
  ObjectPool,
  ObjectPoolConfig,
  ObjectPoolStats,
} from '../../types/common.js';

/**
 * Creates a generic object pool for efficient memory management
 * @param config - Configuration for the object pool
 * @returns ObjectPool instance
 */
export const createObjectPool = <T>(
  config: ObjectPoolConfig<T>,
): ObjectPool<T> => {
  const {
    createFn,
    resetFn,
    logger,
    initialSize = 10,
    maxSize = 0,
    autoGrow = true,
  } = config;

  const pool: T[] = [];
  const inUseItems = new Set<T>();
  let peakUsage = 0;

  /**
   * Initialize the pool with the specified initial size
   */
  const initialize = (): void => {
    for (let i = 0; i < initialSize; i++) {
      pool.push(createFn());
    }
  };

  /**
   * Update peak usage statistics
   */
  const updatePeakUsage = (): void => {
    const currentUsage = inUseItems.size;
    if (currentUsage > peakUsage) {
      peakUsage = currentUsage;
    }
  };

  // Initialize the pool
  initialize();

  return {
    /**
     * Get an available object from the pool
     * @returns An object instance or null if pool is empty and cannot grow
     */
    get(): T | null {
      let item: T | undefined;

      // Try to get an item from the pool
      if (pool.length > 0) {
        item = pool.pop();
      } else if (autoGrow && (maxSize === 0 || inUseItems.size < maxSize)) {
        // Create new item if pool is empty and we can grow
        item = createFn();
      }

      if (item) {
        inUseItems.add(item);
        updatePeakUsage();
        return item;
      }

      return null;
    },

    /**
     * Return an object to the pool for reuse
     * @param item - The object to return to the pool
     */
    release(item: T): void {
      if (!inUseItems.has(item)) {
        if (logger) {
          logger.warn(
            'Attempting to release an item that is not tracked by this pool',
          );
        }
        return;
      }

      // Reset the item if a reset function is provided
      if (resetFn) {
        resetFn(item);
      }

      // Remove from in-use tracking
      inUseItems.delete(item);

      // Add back to pool if under max size limit
      if (maxSize === 0 || pool.length < maxSize) {
        pool.push(item);
      }
      // If we're at max size, let the item be garbage collected
    },

    /**
     * Pre-allocate a specified number of objects in the pool
     * @param count - Number of objects to pre-allocate
     */
    preallocate(count: number): void {
      const currentTotal = pool.length + inUseItems.size;
      const targetTotal = Math.max(currentTotal, count);
      const itemsToCreate = targetTotal - currentTotal;

      if (itemsToCreate > 0) {
        for (let i = 0; i < itemsToCreate; i++) {
          // Respect max size limit
          if (maxSize > 0 && pool.length + inUseItems.size >= maxSize) {
            break;
          }
          pool.push(createFn());
        }
      }
    },

    /**
     * Clear all objects from the pool and reset
     */
    clear(): void {
      pool.length = 0;
      inUseItems.clear();
      peakUsage = 0;
    },

    /**
     * Get current pool statistics
     * @returns Pool usage information
     */
    getStats(): ObjectPoolStats {
      return {
        total: pool.length + inUseItems.size,
        available: pool.length,
        inUse: inUseItems.size,
        peak: peakUsage,
      };
    },
  };
};

/**
 * Object Pool utilities namespace
 */
export const ObjectPoolUtils = {
  createObjectPool,
} as const;
