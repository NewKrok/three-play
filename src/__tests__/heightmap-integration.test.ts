import {
  loadFromTexture,
  createHeightmapUtils,
} from '../core/heightmap/index.js';
import {
  createHeightmapIntegrationConfig,
  createHeightmapManager,
  shouldLoadHeightmap,
} from '../core/heightmap/heightmap-integration.js';
import type { HeightmapData } from '../types/heightmap.js';
import type { LoadedAssets } from '../types/assets.js';
import type { WorldConfig } from '../types/world.js';
import * as THREE from 'three';

// Mock the heightmap module
jest.mock('../core/heightmap/index.js', () => ({
  loadFromTexture: jest.fn(),
  createHeightmapUtils: jest.fn(),
}));

const mockLoadFromTexture = loadFromTexture as jest.MockedFunction<
  typeof loadFromTexture
>;
const mockCreateHeightmapUtils = createHeightmapUtils as jest.MockedFunction<
  typeof createHeightmapUtils
>;

describe('Heightmap Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('shouldLoadHeightmap', () => {
    it('should return true when heightmap assetId is provided', () => {
      const config: WorldConfig = {
        world: { size: { x: 100, y: 100 } },
        heightmap: { assetId: 'test-heightmap' },
      };

      expect(shouldLoadHeightmap(config)).toBe(true);
    });

    it('should return false when heightmap assetId is not provided', () => {
      const config: WorldConfig = {
        world: { size: { x: 100, y: 100 } },
      };

      expect(shouldLoadHeightmap(config)).toBe(false);
    });

    it('should return false when heightmap config is empty', () => {
      const config: WorldConfig = {
        world: { size: { x: 100, y: 100 } },
        heightmap: {} as any,
      };

      expect(shouldLoadHeightmap(config)).toBe(false);
    });
  });

  describe('createHeightmapIntegrationConfig', () => {
    it('should create config from world config with defaults', () => {
      const worldConfig: WorldConfig = {
        world: { size: { x: 200, y: 150 } },
        heightmap: { assetId: 'test-heightmap' },
      };

      const config = createHeightmapIntegrationConfig(worldConfig);

      expect(config).toEqual({
        heightmapAssetId: 'test-heightmap',
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
          assetId: 'test-heightmap',
          resolution: 512,
          elevationRatio: 50,
        },
      };

      const config = createHeightmapIntegrationConfig(worldConfig);

      expect(config).toEqual({
        heightmapAssetId: 'test-heightmap',
        worldWidth: 200,
        worldHeight: 150,
        resolution: 512,
        elevationRatio: 50,
      });
    });

    it('should return null when no heightmap assetId is provided', () => {
      const worldConfig: WorldConfig = {
        world: { size: { x: 200, y: 150 } },
      };

      const config = createHeightmapIntegrationConfig(worldConfig);

      expect(config).toBeNull();
    });
  });

  describe('createHeightmapManager', () => {
    const mockConfig = {
      heightmapAssetId: 'test-heightmap',
      worldWidth: 200,
      worldHeight: 150,
      resolution: 256,
      elevationRatio: 30,
    };

    it('should create manager with heightmap utils when texture is available', () => {
      const mockTexture = new THREE.Texture();
      const mockHeightmapData: HeightmapData = {
        heightmap: new Float32Array([1, 2, 3, 4]),
        heightMapTexture: mockTexture,
      };

      const mockUtils = {
        getHeightFromPosition: jest.fn(),
        getPositionByHeight: jest.fn(),
        applyHeightmapToGeometry: jest.fn(),
        heightmapData: mockHeightmapData,
        config: mockConfig,
      };

      const mockLoadedAssets: LoadedAssets = {
        textures: {
          'test-heightmap': mockTexture,
        },
        models: {},
      };

      mockLoadFromTexture.mockReturnValue(mockHeightmapData);
      mockCreateHeightmapUtils.mockReturnValue(mockUtils);

      const manager = createHeightmapManager(mockConfig, mockLoadedAssets);

      expect(mockLoadFromTexture).toHaveBeenCalledWith(mockTexture);
      expect(mockCreateHeightmapUtils).toHaveBeenCalledWith(mockHeightmapData, {
        worldWidth: 200,
        worldHeight: 150,
        resolution: 256,
        elevationRatio: 30,
      });
      expect(manager.utils).toBe(mockUtils);
    });

    it('should create manager with null utils when texture is not available', () => {
      const mockLoadedAssets: LoadedAssets = {
        textures: {},
        models: {},
      };

      // Mock console.warn to avoid test output noise
      const consoleSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const manager = createHeightmapManager(mockConfig, mockLoadedAssets);

      expect(manager.utils).toBeNull();
      expect(mockLoadFromTexture).not.toHaveBeenCalled();
      expect(mockCreateHeightmapUtils).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Heightmap texture with ID 'test-heightmap' not found in loaded assets",
      );

      consoleSpy.mockRestore();
    });

    it('should clean up resources when destroyed', () => {
      const mockTexture = new THREE.Texture();
      const mockLoadedAssets: LoadedAssets = {
        textures: {
          'test-heightmap': mockTexture,
        },
        models: {},
      };

      mockLoadFromTexture.mockReturnValue({} as any);
      mockCreateHeightmapUtils.mockReturnValue({} as any);

      const manager = createHeightmapManager(mockConfig, mockLoadedAssets);
      manager.destroy();

      expect(manager.utils).toBeNull();
    });
  });
});
