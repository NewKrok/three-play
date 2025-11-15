import * as THREE from 'three';
import { createSkyboxManager } from '../core/skybox/skybox-manager.js';
import type { SkyboxConfig } from '../types/skybox.js';
import type { LoadedAssets } from '../types/assets.js';
import { createLogger } from '../core/utils/logger.js';

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

// Override console methods
beforeAll(() => {
  global.console = mockConsole as any;
});

describe('Skybox Manager', () => {
  let scene: THREE.Scene;
  let mockAssets: LoadedAssets;
  let logger: any;

  beforeEach(() => {
    scene = new THREE.Scene();
    logger = createLogger({ level: 'debug' });
    
    // Mock loaded assets with skybox textures
    mockAssets = {
      textures: {
        'skybox-right': {
          image: new Image(),
          dispose: jest.fn(),
        } as any,
        'skybox-left': {
          image: new Image(),
          dispose: jest.fn(),
        } as any,
        'skybox-top': {
          image: new Image(),
          dispose: jest.fn(),
        } as any,
        'skybox-bottom': {
          image: new Image(),
          dispose: jest.fn(),
        } as any,
        'skybox-front': {
          image: new Image(),
          dispose: jest.fn(),
        } as any,
        'skybox-back': {
          image: new Image(),
          dispose: jest.fn(),
        } as any,
      },
      models: {},
    };

    jest.clearAllMocks();
  });

  describe('createSkyboxManager', () => {
    it('should create a skybox manager with correct interface', () => {
      const config: SkyboxConfig = {
        enabled: true,
        assets: {
          rightAssetId: 'skybox-right',
          leftAssetId: 'skybox-left',
          topAssetId: 'skybox-top',
          bottomAssetId: 'skybox-bottom',
          frontAssetId: 'skybox-front',
          backAssetId: 'skybox-back',
        },
      };

      const skyboxManager = createSkyboxManager(config, scene, mockAssets, logger);

      expect(skyboxManager).toBeDefined();
      expect(typeof skyboxManager.apply).toBe('function');
      expect(typeof skyboxManager.dispose).toBe('function');
      expect(typeof skyboxManager.updateConfig).toBe('function');
    });

    it('should apply skybox to scene when enabled', () => {
      const config: SkyboxConfig = {
        enabled: true,
        assets: {
          rightAssetId: 'skybox-right',
          leftAssetId: 'skybox-left',
          topAssetId: 'skybox-top',
          bottomAssetId: 'skybox-bottom',
          frontAssetId: 'skybox-front',
          backAssetId: 'skybox-back',
        },
      };

      const skyboxManager = createSkyboxManager(config, scene, mockAssets, logger);
      skyboxManager.apply();

      expect(scene.background).toBeDefined();
      expect(scene.background).toBeInstanceOf(THREE.CubeTexture);
    });

    it('should not apply skybox when disabled', () => {
      const config: SkyboxConfig = {
        enabled: false,
        assets: {
          rightAssetId: 'skybox-right',
          leftAssetId: 'skybox-left',
          topAssetId: 'skybox-top',
          bottomAssetId: 'skybox-bottom',
          frontAssetId: 'skybox-front',
          backAssetId: 'skybox-back',
        },
      };

      const skyboxManager = createSkyboxManager(config, scene, mockAssets, logger);
      skyboxManager.apply();

      expect(scene.background).toBeNull();
    });

    it('should warn when skybox textures are missing', () => {
      const config: SkyboxConfig = {
        enabled: true,
        assets: {
          rightAssetId: 'missing-texture',
          leftAssetId: 'skybox-left',
          topAssetId: 'skybox-top',
          bottomAssetId: 'skybox-bottom',
          frontAssetId: 'skybox-front',
          backAssetId: 'skybox-back',
        },
      };

      const skyboxManager = createSkyboxManager(config, scene, mockAssets, logger);
      skyboxManager.apply();

      expect(scene.background).toBeNull();
    });

    it('should dispose skybox resources correctly', () => {
      const config: SkyboxConfig = {
        enabled: true,
        assets: {
          rightAssetId: 'skybox-right',
          leftAssetId: 'skybox-left',
          topAssetId: 'skybox-top',
          bottomAssetId: 'skybox-bottom',
          frontAssetId: 'skybox-front',
          backAssetId: 'skybox-back',
        },
      };

      const skyboxManager = createSkyboxManager(config, scene, mockAssets, logger);
      skyboxManager.apply();

      const originalBackground = scene.background;
      expect(originalBackground).toBeDefined();

      skyboxManager.dispose();

      expect(scene.background).toBeNull();
    });

    it('should update configuration correctly', () => {
      const config: SkyboxConfig = {
        enabled: false,
        assets: {
          rightAssetId: 'skybox-right',
          leftAssetId: 'skybox-left',
          topAssetId: 'skybox-top',
          bottomAssetId: 'skybox-bottom',
          frontAssetId: 'skybox-front',
          backAssetId: 'skybox-back',
        },
      };

      const skyboxManager = createSkyboxManager(config, scene, mockAssets, logger);
      skyboxManager.apply();

      expect(scene.background).toBeNull();

      // Update to enable skybox
      skyboxManager.updateConfig({ enabled: true });

      expect(scene.background).toBeDefined();
      expect(scene.background).toBeInstanceOf(THREE.CubeTexture);
    });

    it('should handle empty assets gracefully', () => {
      const config: SkyboxConfig = {
        enabled: true,
        assets: {
          rightAssetId: 'skybox-right',
          leftAssetId: 'skybox-left',
          topAssetId: 'skybox-top',
          bottomAssetId: 'skybox-bottom',
          frontAssetId: 'skybox-front',
          backAssetId: 'skybox-back',
        },
      };

      const emptyAssets: LoadedAssets = {
        textures: {},
        models: {},
      };

      const skyboxManager = createSkyboxManager(config, scene, emptyAssets, logger);
      skyboxManager.apply();

      expect(scene.background).toBeNull();
    });

    it('should set correct color space for skybox texture', () => {
      const config: SkyboxConfig = {
        enabled: true,
        assets: {
          rightAssetId: 'skybox-right',
          leftAssetId: 'skybox-left',
          topAssetId: 'skybox-top',
          bottomAssetId: 'skybox-bottom',
          frontAssetId: 'skybox-front',
          backAssetId: 'skybox-back',
        },
      };

      const skyboxManager = createSkyboxManager(config, scene, mockAssets, logger);
      skyboxManager.apply();

      const background = scene.background as THREE.CubeTexture;
      expect(background).toBeDefined();
      expect(background.colorSpace).toBe(THREE.SRGBColorSpace);
    });
  });
});