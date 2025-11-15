import { createObjectPool } from '../core/utils/object-pool.js';
import type { ObjectPool, ObjectPoolConfig } from '../types/common.js';

// Mock object type for testing
type MockObject = {
  id: number;
  value: string;
  active: boolean;
};

describe('Object Pool', () => {
  let mockCounter: number;
  let pool: ObjectPool<MockObject>;
  let createFn: jest.MockedFunction<() => MockObject>;
  let resetFn: jest.MockedFunction<(item: MockObject) => void>;

  beforeEach(() => {
    mockCounter = 0;
    createFn = jest.fn(() => ({
      id: ++mockCounter,
      value: `mock-${mockCounter}`,
      active: false,
    }));

    resetFn = jest.fn((item: MockObject) => {
      item.value = '';
      item.active = false;
    });
  });

  afterEach(() => {
    if (pool) {
      pool.clear();
    }
  });

  describe('basic functionality', () => {
    beforeEach(() => {
      const config: ObjectPoolConfig<MockObject> = {
        createFn,
        resetFn,
        initialSize: 5,
        maxSize: 10,
        autoGrow: true,
      };
      pool = createObjectPool(config);
    });

    it('should initialize with correct initial size', () => {
      expect(createFn).toHaveBeenCalledTimes(5);

      const stats = pool.getStats();
      expect(stats.total).toBe(5);
      expect(stats.available).toBe(5);
      expect(stats.inUse).toBe(0);
      expect(stats.peak).toBe(0);
    });

    it('should get objects from pool', () => {
      const obj1 = pool.get();
      const obj2 = pool.get();

      expect(obj1).toBeTruthy();
      expect(obj2).toBeTruthy();
      expect(obj1).not.toBe(obj2);

      const stats = pool.getStats();
      expect(stats.available).toBe(3);
      expect(stats.inUse).toBe(2);
      expect(stats.peak).toBe(2);
    });

    it('should release objects back to pool', () => {
      const obj = pool.get();
      expect(obj).toBeTruthy();

      if (obj) {
        obj.value = 'modified';
        obj.active = true;

        pool.release(obj);
        expect(resetFn).toHaveBeenCalledWith(obj);
        expect(obj.value).toBe('');
        expect(obj.active).toBe(false);
      }

      const stats = pool.getStats();
      expect(stats.available).toBe(5);
      expect(stats.inUse).toBe(0);
    });

    it('should reuse released objects', () => {
      const obj1 = pool.get();
      if (obj1) {
        pool.release(obj1);
      }

      const obj2 = pool.get();
      expect(obj2).toBe(obj1);
      expect(createFn).toHaveBeenCalledTimes(5); // No new objects created
    });

    it('should grow when pool is empty and autoGrow is enabled', () => {
      // Get all initial objects
      for (let i = 0; i < 5; i++) {
        pool.get();
      }

      expect(createFn).toHaveBeenCalledTimes(5);

      // Get one more - should create new object
      const newObj = pool.get();
      expect(newObj).toBeTruthy();
      expect(createFn).toHaveBeenCalledTimes(6);
    });

    it('should respect max size limit', () => {
      // Get all objects up to max size
      const objects = [];
      for (let i = 0; i < 10; i++) {
        const obj = pool.get();
        if (obj) objects.push(obj);
      }

      expect(objects).toHaveLength(10);

      // Try to get one more - should return null
      const overLimitObj = pool.get();
      expect(overLimitObj).toBeNull();
    });

    it('should handle releasing non-tracked objects gracefully', () => {
      const mockLogger = {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        isLevelEnabled: jest.fn().mockReturnValue(true),
      };

      // Create pool with logger
      const configWithLogger: ObjectPoolConfig<MockObject> = {
        createFn,
        resetFn,
        logger: mockLogger,
        initialSize: 5,
        maxSize: 10,
        autoGrow: true,
      };
      const poolWithLogger = createObjectPool(configWithLogger);

      const externalObj: MockObject = {
        id: 999,
        value: 'external',
        active: false,
      };

      poolWithLogger.release(externalObj);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Attempting to release an item that is not tracked by this pool',
      );

      poolWithLogger.clear();
    });
  });

  describe('preallocate', () => {
    beforeEach(() => {
      const config: ObjectPoolConfig<MockObject> = {
        createFn,
        initialSize: 2,
        maxSize: 15,
      };
      pool = createObjectPool(config);
    });

    it('should preallocate objects', () => {
      expect(createFn).toHaveBeenCalledTimes(2);

      pool.preallocate(10);
      expect(createFn).toHaveBeenCalledTimes(10);

      const stats = pool.getStats();
      expect(stats.total).toBe(10);
      expect(stats.available).toBe(10);
    });

    it('should not preallocate beyond max size', () => {
      pool.preallocate(20); // Beyond max size of 15
      expect(createFn).toHaveBeenCalledTimes(15);

      const stats = pool.getStats();
      expect(stats.total).toBe(15);
    });

    it('should not reduce pool size when preallocating less than current', () => {
      pool.preallocate(1); // Less than initial size of 2
      expect(createFn).toHaveBeenCalledTimes(2); // No change

      const stats = pool.getStats();
      expect(stats.total).toBe(2);
    });
  });

  describe('configuration options', () => {
    it('should work without reset function', () => {
      const config: ObjectPoolConfig<MockObject> = {
        createFn,
        initialSize: 3,
      };
      pool = createObjectPool(config);

      const obj = pool.get();
      expect(obj).toBeTruthy();

      if (obj) {
        obj.value = 'modified';
        pool.release(obj);
        // Should not crash without reset function
        expect(obj.value).toBe('modified'); // Value unchanged
      }
    });

    it('should work with autoGrow disabled', () => {
      const config: ObjectPoolConfig<MockObject> = {
        createFn,
        initialSize: 2,
        autoGrow: false,
      };
      pool = createObjectPool(config);

      // Get all initial objects
      const obj1 = pool.get();
      const obj2 = pool.get();

      expect(obj1).toBeTruthy();
      expect(obj2).toBeTruthy();

      // Try to get one more - should return null
      const obj3 = pool.get();
      expect(obj3).toBeNull();
      expect(createFn).toHaveBeenCalledTimes(2);
    });

    it('should work with unlimited max size', () => {
      const config: ObjectPoolConfig<MockObject> = {
        createFn,
        initialSize: 1,
        maxSize: 0, // Unlimited
        autoGrow: true,
      };
      pool = createObjectPool(config);

      // Should be able to get many objects
      const objects = [];
      for (let i = 0; i < 100; i++) {
        const obj = pool.get();
        if (obj) objects.push(obj);
      }

      expect(objects).toHaveLength(100);
      expect(createFn).toHaveBeenCalledTimes(100);
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      const config: ObjectPoolConfig<MockObject> = {
        createFn,
        resetFn,
        initialSize: 5,
      };
      pool = createObjectPool(config);
    });

    it('should clear all objects from pool', () => {
      // Get some objects
      const obj1 = pool.get();
      const obj2 = pool.get();

      expect(pool.getStats().total).toBe(5);
      expect(pool.getStats().inUse).toBe(2);

      pool.clear();

      const stats = pool.getStats();
      expect(stats.total).toBe(0);
      expect(stats.available).toBe(0);
      expect(stats.inUse).toBe(0);
      expect(stats.peak).toBe(0);
    });

    it('should allow new objects to be created after clear', () => {
      pool.clear();

      const obj = pool.get();
      expect(obj).toBeTruthy();
      expect(createFn).toHaveBeenCalledTimes(6); // 5 initial + 1 after clear
    });
  });

  describe('peak usage tracking', () => {
    beforeEach(() => {
      const config: ObjectPoolConfig<MockObject> = {
        createFn,
        initialSize: 5,
      };
      pool = createObjectPool(config);
    });

    it('should track peak usage correctly', () => {
      expect(pool.getStats().peak).toBe(0);

      // Get 3 objects
      const objs = [pool.get(), pool.get(), pool.get()];
      expect(pool.getStats().peak).toBe(3);

      // Release 1, get 2 more (total in use: 4)
      if (objs[0]) pool.release(objs[0]);
      pool.get();
      pool.get();
      expect(pool.getStats().peak).toBe(4);

      // Release all
      objs.slice(1).forEach((obj) => obj && pool.release(obj));
      expect(pool.getStats().peak).toBe(4); // Peak should remain at 4
    });
  });
});
