// Mock the DOM environment for tests
const mockDocument = {
  createElement: jest.fn(() => ({
    getContext: jest.fn(() => ({
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray([255, 255, 255, 255]), // Mock white pixel data
      })),
    })),
    width: 0,
    height: 0,
  })),
};

// JSDOM already provides document, just extend it with our mocks
Object.assign(document, mockDocument);

import * as THREE from 'three';
import {
  createHeightmapIntegrationConfig,
  createHeightmapManager,
  shouldLoadHeightmap,
} from '../core/heightmap/heightmap-integration.js';
import type { LoadedAssets } from '../types/assets.js';
import type { WorldConfig } from '../types/world.js';

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
      // Mock texture image for canvas processing
      mockTexture.image = {
        width: 256,
        height: 256,
      };

      const mockLoadedAssets: LoadedAssets = {
        textures: {
          'test-heightmap': mockTexture,
        },
        models: {},
      };

      const manager = createHeightmapManager(mockConfig, mockLoadedAssets);

      expect(manager.utils).not.toBeNull();
      expect(manager.utils?.heightmapData).toBeDefined();
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
      expect(consoleSpy).toHaveBeenCalledWith(
        "Heightmap texture with ID 'test-heightmap' not found in loaded assets",
      );

      consoleSpy.mockRestore();
    });

    it('should clean up resources when destroyed', () => {
      const mockTexture = new THREE.Texture();
      // Mock texture image for canvas processing
      mockTexture.image = {
        width: 256,
        height: 256,
      };

      const mockLoadedAssets: LoadedAssets = {
        textures: {
          'test-heightmap': mockTexture,
        },
        models: {},
      };

      const manager = createHeightmapManager(mockConfig, mockLoadedAssets);
      manager.destroy();

      expect(manager.utils).toBeNull();
    });
  });
});
