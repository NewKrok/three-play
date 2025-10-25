import createWorld from '../core/world/world';
import type { WorldConfig, WorldInstance } from '../types/world';

describe('createWorld', () => {
  const mockConfig: WorldConfig = {
    world: {
      size: {
        x: 512,
        y: 512,
      },
    },
  };

  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should create a world instance with given configuration', () => {
    const worldInstance = createWorld(mockConfig);

    expect(worldInstance).toBeDefined();
    expect(typeof worldInstance.getConfig).toBe('function');
  });

  it('should log the configuration during creation', () => {
    createWorld(mockConfig);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Creating world with config:',
      mockConfig,
    );
  });

  it('should return the configuration in read-only mode', () => {
    const worldInstance = createWorld(mockConfig);
    const returnedConfig = worldInstance.getConfig();

    expect(returnedConfig).toEqual(mockConfig);
    expect(returnedConfig.world.size.x).toBe(512);
    expect(returnedConfig.world.size.y).toBe(512);
  });

  it('should store a copy of the configuration to prevent external modifications', () => {
    const originalConfig: WorldConfig = {
      world: {
        size: {
          x: 256,
          y: 256,
        },
      },
    };

    const worldInstance = createWorld(originalConfig);

    // Modify the original config
    originalConfig.world.size.x = 1024;

    // The stored config should remain unchanged
    const storedConfig = worldInstance.getConfig();
    expect(storedConfig.world.size.x).toBe(256);
    expect(storedConfig.world.size.y).toBe(256);
  });

  it('should handle different configuration values correctly', () => {
    const customConfig: WorldConfig = {
      world: {
        size: {
          x: 1024,
          y: 768,
        },
      },
    };

    const worldInstance = createWorld(customConfig);
    const returnedConfig = worldInstance.getConfig();

    expect(returnedConfig.world.size.x).toBe(1024);
    expect(returnedConfig.world.size.y).toBe(768);
  });

  it('should return WorldInstance type with correct interface', () => {
    const worldInstance: WorldInstance = createWorld(mockConfig);

    // Type check - if this compiles, the interface is correct
    expect(worldInstance.getConfig).toBeDefined();
    expect(typeof worldInstance.getConfig).toBe('function');

    const config = worldInstance.getConfig();
    expect(config).toHaveProperty('world');
    expect(config.world).toHaveProperty('size');
    expect(config.world.size).toHaveProperty('x');
    expect(config.world.size).toHaveProperty('y');
  });
});
