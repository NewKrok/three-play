import {
  createHeightmapIntegrationConfig,
  createHeightmapManager,
  shouldLoadHeightmap,
} from '../core/world/heightmap-integration.js';
import {
  loadHeightmap,
  createHeightmapUtils,
} from '../core/heightmap/index.js';
import type { WorldConfig } from '../types/world.js';
import type { HeightmapData } from '../types/heightmap.js';

// Mock the heightmap module
jest.mock('../core/heightmap/index.js', () => ({
  loadHeightmap: jest.fn(),
  createHeightmapUtils: jest.fn(),
}));

const mockLoadHeightmap = loadHeightmap as jest.MockedFunction<
  typeof loadHeightmap
>;
const mockCreateHeightmapUtils = createHeightmapUtils as jest.MockedFunction<
  typeof createHeightmapUtils
>;

describe('Heightmap Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('shouldLoadHeightmap', () => {
    it('should return true when heightmap URL is provided', () => {
      const config: WorldConfig = {
        world: { size: { x: 100, y: 100 } },
        heightmap: { url: 'test-heightmap.png' },
      };

      expect(shouldLoadHeightmap(config)).toBe(true);
    });

    it('should return false when heightmap URL is not provided', () => {
      const config: WorldConfig = {
        world: { size: { x: 100, y: 100 } },
      };

      expect(shouldLoadHeightmap(config)).toBe(false);
    });

    it('should return false when heightmap config is empty', () => {
      const config: WorldConfig = {
        world: { size: { x: 100, y: 100 } },
        heightmap: {},
      } as WorldConfig;

      expect(shouldLoadHeightmap(config)).toBe(false);
    });
  });

  describe('createHeightmapIntegrationConfig', () => {
    it('should create config from world config with defaults', () => {
      const worldConfig: WorldConfig = {
        world: { size: { x: 200, y: 150 } },
        heightmap: { url: 'test-heightmap.png' },
      };

      const config = createHeightmapIntegrationConfig(worldConfig);

      expect(config).toEqual({
        heightmapUrl: 'test-heightmap.png',
        worldWidth: 200,
        worldHeight: 150,
        resolution: 256,
        elevationRatio: 30,
      });
    });

    it('should use custom resolution and elevation ratio when provided', () => {
      const worldConfig: WorldConfig = {
        world: { size: { x: 200, y: 150 } },
        heightmap: {
          url: 'test-heightmap.png',
          resolution: 512,
          elevationRatio: 50,
        },
      };

      const config = createHeightmapIntegrationConfig(worldConfig);

      expect(config).toEqual({
        heightmapUrl: 'test-heightmap.png',
        worldWidth: 200,
        worldHeight: 150,
        resolution: 512,
        elevationRatio: 50,
      });
    });

    it('should return null when no heightmap URL is provided', () => {
      const worldConfig: WorldConfig = {
        world: { size: { x: 200, y: 150 } },
      };

      const config = createHeightmapIntegrationConfig(worldConfig);

      expect(config).toBeNull();
    });
  });

  describe('createHeightmapManager', () => {
    const mockConfig = {
      heightmapUrl: 'test-heightmap.png',
      worldWidth: 200,
      worldHeight: 150,
      resolution: 256,
      elevationRatio: 30,
    };

    it('should create manager with initial state', () => {
      const manager = createHeightmapManager(mockConfig);

      expect(manager.utils).toBeNull();
      expect(manager.isLoading).toBe(false);
      expect(manager.isLoaded).toBe(false);
      expect(manager.error).toBeNull();
      expect(typeof manager.initialize).toBe('function');
      expect(typeof manager.destroy).toBe('function');
    });

    it('should initialize heightmap successfully', async () => {
      const mockHeightmapData: HeightmapData = {
        heightmap: new Float32Array([1, 2, 3, 4]),
        heightMapTexture: {} as any,
      };

      const mockUtils = {
        getHeightFromPosition: jest.fn(),
        getPositionByHeight: jest.fn(),
        applyHeightmapToGeometry: jest.fn(),
        heightmapData: mockHeightmapData,
        config: mockConfig,
      };

      mockLoadHeightmap.mockResolvedValue(mockHeightmapData);
      mockCreateHeightmapUtils.mockReturnValue(mockUtils);

      const manager = createHeightmapManager(mockConfig);
      await manager.initialize();

      expect(mockLoadHeightmap).toHaveBeenCalledWith('test-heightmap.png');
      expect(mockCreateHeightmapUtils).toHaveBeenCalledWith(mockHeightmapData, {
        worldWidth: 200,
        worldHeight: 150,
        resolution: 256,
        elevationRatio: 30,
      });
      expect(manager.utils).toBe(mockUtils);
      expect(manager.isLoaded).toBe(true);
      expect(manager.isLoading).toBe(false);
      expect(manager.error).toBeNull();
    });

    it('should handle initialization errors', async () => {
      const mockError = new Error('Failed to load heightmap');
      mockLoadHeightmap.mockRejectedValue(mockError);

      // Mock console.error to avoid test output noise
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const manager = createHeightmapManager(mockConfig);
      await manager.initialize();

      expect(manager.utils).toBeNull();
      expect(manager.isLoaded).toBe(false);
      expect(manager.isLoading).toBe(false);
      expect(manager.error).toEqual(mockError);

      consoleSpy.mockRestore();
    });

    it('should not initialize multiple times', async () => {
      const mockHeightmapData: HeightmapData = {
        heightmap: new Float32Array([1, 2, 3, 4]),
        heightMapTexture: {} as any,
      };

      mockLoadHeightmap.mockResolvedValue(mockHeightmapData);
      mockCreateHeightmapUtils.mockReturnValue({} as any);

      const manager = createHeightmapManager(mockConfig);

      // Call initialize twice
      await Promise.all([manager.initialize(), manager.initialize()]);

      // Should only be called once
      expect(mockLoadHeightmap).toHaveBeenCalledTimes(1);
    });

    it('should clean up resources when destroyed', () => {
      const manager = createHeightmapManager(mockConfig);
      manager.destroy();

      expect(manager.utils).toBeNull();
      expect(manager.isLoading).toBe(false);
      expect(manager.isLoaded).toBe(false);
      expect(manager.error).toBeNull();
    });

    it('should handle string errors', async () => {
      mockLoadHeightmap.mockRejectedValue('String error');

      // Mock console.error to avoid test output noise
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const manager = createHeightmapManager(mockConfig);
      await manager.initialize();

      expect(manager.error).toBeInstanceOf(Error);
      expect(manager.error!.message).toBe('Failed to load heightmap');

      consoleSpy.mockRestore();
    });
  });
});
