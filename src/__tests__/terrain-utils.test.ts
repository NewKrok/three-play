import * as THREE from 'three';
import {
  createTerrainInstance,
  createTerrainUtils,
  prepareTerrainConfig,
} from '../core/terrain/index.js';
import type {
  TerrainConfig,
  InternalTerrainConfig,
  TerrainLayerConfig,
} from '../types/terrain.js';
import type { HeightmapUtils } from '../types/heightmap.js';
import type { LoadedAssets } from '../types/assets.js';

// Mock console to avoid noise in tests
const originalConsole = console;
beforeAll(() => {
  global.console = {
    ...console,
    warn: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

describe('Terrain Utils', () => {
  describe('createTerrainUtils', () => {
    it('should create terrain utils with required methods', () => {
      const utils = createTerrainUtils();

      expect(utils).toBeDefined();
      expect(utils.createTerrainMesh).toBeDefined();
      expect(utils.createTerrainMaterial).toBeDefined();
      expect(utils.getShaderFragments).toBeDefined();
    });

    it('should return valid shader fragments', () => {
      const utils = createTerrainUtils();
      const fragments = utils.getShaderFragments();

      expect(fragments).toBeDefined();
      expect(fragments.vertexShader).toContain('vWorldPosition');
      expect(fragments.vertexShader).toContain('vUvCustom');
      expect(fragments.fragmentShaderPart1).toContain(
        'uniform float uBlendDistance',
      );
      expect(fragments.fragmentShaderPart1).toContain('fbm');
      expect(fragments.fragmentShaderPart2).toContain('diffuseColor.rgb');
      expect(fragments.fragmentShaderPart2).toContain('sandWeight');
    });
  });

  describe('prepareTerrainConfig', () => {
    let mockTexture: THREE.Texture;
    let mockAssets: LoadedAssets;

    beforeEach(() => {
      mockTexture = new THREE.Texture();
      mockTexture.repeat = new THREE.Vector2(1, 1);
      mockTexture.wrapS = THREE.RepeatWrapping;
      mockTexture.wrapT = THREE.RepeatWrapping;

      mockAssets = {
        textures: {
          grass: mockTexture.clone(),
          sand: mockTexture.clone(),
          mud: mockTexture.clone(),
        },
        models: {},
      };
    });

    afterEach(() => {
      mockTexture.dispose();
      Object.values(mockAssets.textures).forEach((texture) =>
        texture.dispose(),
      );
    });

    it('should prepare terrain config with layers', () => {
      const config: TerrainConfig = {
        layers: [
          {
            textureAssetId: 'grass',
            minHeight: 10,
            maxHeight: 100,
            textureScale: 4,
          },
        ],
      };

      const internalConfig = prepareTerrainConfig(config, mockAssets);

      expect(internalConfig.layerTextures).toBeDefined();
      expect(internalConfig.layerTextures!.grass).toBe(
        mockAssets.textures.grass,
      );
      expect(mockAssets.textures.grass.repeat.x).toBe(4);
      expect(mockAssets.textures.grass.repeat.y).toBe(4);
    });

    it('should prepare terrain config with layer textures', () => {
      const layers: TerrainLayerConfig[] = [
        {
          textureAssetId: 'sand',
          minHeight: 0,
          maxHeight: 5,
          textureScale: 100,
        },
        {
          textureAssetId: 'mud',
          minHeight: 5,
          maxHeight: 10,
          textureScale: 80,
        },
      ];

      const config: TerrainConfig = {
        layers,
      };

      const internalConfig = prepareTerrainConfig(config, mockAssets);

      expect(internalConfig.layerTextures).toBeDefined();
      expect(internalConfig.layerTextures!.sand).toBe(mockAssets.textures.sand);
      expect(internalConfig.layerTextures!.mud).toBe(mockAssets.textures.mud);
      expect(mockAssets.textures.sand.repeat.x).toBe(100);
      expect(mockAssets.textures.mud.repeat.x).toBe(80);
    });

    it('should preserve original texture wrapping settings', () => {
      // Set up textures with specific wrapping settings
      mockAssets.textures.grass.wrapS = THREE.MirroredRepeatWrapping;
      mockAssets.textures.grass.wrapT = THREE.MirroredRepeatWrapping;
      mockAssets.textures.sand.wrapS = THREE.MirroredRepeatWrapping;
      mockAssets.textures.sand.wrapT = THREE.MirroredRepeatWrapping;

      const config: TerrainConfig = {
        layers: [
          {
            textureAssetId: 'grass',
            minHeight: 10,
            maxHeight: 100,
            textureScale: 4,
          },
          {
            textureAssetId: 'sand',
            minHeight: 0,
            maxHeight: 5,
            textureScale: 100,
          },
        ],
      };

      const internalConfig = prepareTerrainConfig(config, mockAssets);

      // Check that wrapping settings are preserved
      expect(mockAssets.textures.grass.wrapS).toBe(
        THREE.MirroredRepeatWrapping,
      );
      expect(mockAssets.textures.grass.wrapT).toBe(
        THREE.MirroredRepeatWrapping,
      );
      expect(mockAssets.textures.sand.wrapS).toBe(THREE.MirroredRepeatWrapping);
      expect(mockAssets.textures.sand.wrapT).toBe(THREE.MirroredRepeatWrapping);
    });

    it('should handle missing textures gracefully', () => {
      const config: TerrainConfig = {
        layers: [
          {
            textureAssetId: 'nonexistent',
            minHeight: 0,
            maxHeight: 5,
          },
          {
            textureAssetId: 'alsononexistent',
            minHeight: 5,
            maxHeight: 10,
          },
        ],
      };

      const internalConfig = prepareTerrainConfig(config, mockAssets);

      expect(internalConfig.layerTextures).toEqual({});
    });
  });

  describe('createTerrainInstance', () => {
    let mockHeightmapUtils: HeightmapUtils;
    let mockTexture: THREE.Texture;
    let internalConfig: InternalTerrainConfig;

    beforeEach(() => {
      mockTexture = new THREE.Texture();

      mockHeightmapUtils = {
        getHeightFromPosition: jest.fn().mockReturnValue(5),
        getPositionByHeight: jest.fn().mockReturnValue({ x: 10, y: 5, z: 10 }),
        applyHeightmapToGeometry: jest.fn(),
        heightmapData: {
          heightmap: new Float32Array([1, 2, 3, 4]),
          heightMapTexture: mockTexture,
        },
        config: {
          worldWidth: 100,
          worldHeight: 100,
          resolution: 256,
          elevationRatio: 30,
        },
      };

      internalConfig = {
        layerTextures: {
          sand: mockTexture.clone(),
          mud: mockTexture.clone(),
          grass: mockTexture.clone(),
        },
        layers: [
          {
            textureAssetId: 'sand',
            minHeight: 0,
            maxHeight: 5,
          },
          {
            textureAssetId: 'mud',
            minHeight: 5,
            maxHeight: 10,
          },
          {
            textureAssetId: 'grass',
            minHeight: 10,
            maxHeight: 100,
          },
        ],
        blendDistance: 1.5,
        noise: {
          scale: 55,
          amplitude: 0.3,
          offset: -0.35,
        },
      };
    });

    afterEach(() => {
      mockTexture.dispose();
      if (internalConfig.layerTextures) {
        Object.values(internalConfig.layerTextures).forEach((texture) =>
          texture.dispose(),
        );
      }
    });

    it('should create terrain instance with correct properties', () => {
      const terrainInstance = createTerrainInstance(
        internalConfig,
        100,
        100,
        256,
        mockHeightmapUtils,
      );

      expect(terrainInstance).toBeDefined();
      expect(terrainInstance.mesh).toBeInstanceOf(THREE.Mesh);
      expect(terrainInstance.mesh.geometry).toBeInstanceOf(THREE.PlaneGeometry);
      expect(terrainInstance.mesh.material).toBeInstanceOf(
        THREE.MeshStandardMaterial,
      );
      expect(terrainInstance.getMaterial).toBeDefined();
      expect(terrainInstance.updateConfig).toBeDefined();
      expect(terrainInstance.destroy).toBeDefined();
    });

    it('should apply heightmap to geometry', () => {
      createTerrainInstance(internalConfig, 100, 100, 256, mockHeightmapUtils);

      expect(mockHeightmapUtils.applyHeightmapToGeometry).toHaveBeenCalledWith(
        expect.any(THREE.PlaneGeometry),
      );
    });

    it('should position terrain correctly', () => {
      const terrainInstance = createTerrainInstance(
        internalConfig,
        100,
        100,
        256,
        mockHeightmapUtils,
      );

      expect(terrainInstance.mesh.position.x).toBe(50); // worldWidth / 2
      expect(terrainInstance.mesh.position.z).toBe(50); // worldHeight / 2
    });

    it('should enable shadows by default', () => {
      const terrainInstance = createTerrainInstance(
        internalConfig,
        100,
        100,
        256,
        mockHeightmapUtils,
      );

      expect(terrainInstance.mesh.castShadow).toBe(true);
      expect(terrainInstance.mesh.receiveShadow).toBe(true);
    });

    it('should respect shadow configuration', () => {
      const configWithShadows = {
        ...internalConfig,
        castShadow: false,
        receiveShadow: false,
      };

      const terrainInstance = createTerrainInstance(
        configWithShadows,
        100,
        100,
        256,
        mockHeightmapUtils,
      );

      expect(terrainInstance.mesh.castShadow).toBe(false);
      expect(terrainInstance.mesh.receiveShadow).toBe(false);
    });

    it('should dispose resources when destroyed', () => {
      const terrainInstance = createTerrainInstance(
        internalConfig,
        100,
        100,
        256,
        mockHeightmapUtils,
      );

      const geometry = terrainInstance.mesh.geometry;
      const material = terrainInstance.mesh.material;

      const geometryDisposeSpy = jest.spyOn(geometry, 'dispose');
      const materialDisposeSpy = jest.spyOn(
        material as THREE.Material,
        'dispose',
      );

      terrainInstance.destroy();

      expect(geometryDisposeSpy).toHaveBeenCalled();
      expect(materialDisposeSpy).toHaveBeenCalled();
    });

    it('should handle array materials in destroy', () => {
      const terrainInstance = createTerrainInstance(
        internalConfig,
        100,
        100,
        256,
        mockHeightmapUtils,
      );

      // Replace with array of materials
      const material1 = new THREE.MeshStandardMaterial();
      const material2 = new THREE.MeshStandardMaterial();
      terrainInstance.mesh.material = [material1, material2];

      const material1DisposeSpy = jest.spyOn(material1, 'dispose');
      const material2DisposeSpy = jest.spyOn(material2, 'dispose');

      terrainInstance.destroy();

      expect(material1DisposeSpy).toHaveBeenCalled();
      expect(material2DisposeSpy).toHaveBeenCalled();
    });

    it('should return material through getMaterial', () => {
      const terrainInstance = createTerrainInstance(
        internalConfig,
        100,
        100,
        256,
        mockHeightmapUtils,
      );

      const material = terrainInstance.getMaterial();
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material).toBe(terrainInstance.mesh.material);
    });

    it('should handle updateConfig call', () => {
      const terrainInstance = createTerrainInstance(
        internalConfig,
        100,
        100,
        256,
        mockHeightmapUtils,
      );

      // Should not throw
      expect(() => {
        terrainInstance.updateConfig({ blendDistance: 2.0 });
      }).not.toThrow();
    });
  });

  describe('TerrainMaterial', () => {
    let mockTexture: THREE.Texture;
    let internalConfig: InternalTerrainConfig;

    beforeEach(() => {
      mockTexture = new THREE.Texture();

      internalConfig = {
        layerTextures: {
          grass: mockTexture.clone(),
          sand: mockTexture.clone(),
          mud: mockTexture.clone(),
        },
        layers: [
          {
            textureAssetId: 'grass',
            minHeight: 10,
            maxHeight: 100,
          },
          {
            textureAssetId: 'sand',
            minHeight: 0,
            maxHeight: 5,
          },
          {
            textureAssetId: 'mud',
            minHeight: 5,
            maxHeight: 10,
          },
        ],
        blendDistance: 1.5,
        noise: {
          scale: 55,
          amplitude: 0.3,
          offset: -0.35,
        },
      };
    });

    afterEach(() => {
      mockTexture.dispose();
      if (internalConfig.layerTextures) {
        Object.values(internalConfig.layerTextures).forEach((texture) =>
          texture.dispose(),
        );
      }
    });

    it('should create material with first layer texture as base', () => {
      const utils = createTerrainUtils();
      const material = utils.createTerrainMaterial(internalConfig);

      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(material.map).toBe(internalConfig.layerTextures!.grass);
    });

    it('should apply first layer texture scaling while preserving wrapping', () => {
      // Set up texture with specific wrapping
      const grassTexture = internalConfig.layerTextures!.grass;
      grassTexture.wrapS = THREE.MirroredRepeatWrapping;
      grassTexture.wrapT = THREE.MirroredRepeatWrapping;

      const configWithScale = {
        ...internalConfig,
        layers: [
          {
            textureAssetId: 'grass',
            minHeight: 10,
            maxHeight: 100,
            textureScale: 4,
          },
          ...internalConfig.layers.slice(1),
        ],
      };

      const utils = createTerrainUtils();
      utils.createTerrainMaterial(configWithScale);

      expect(grassTexture.repeat.x).toBe(4);
      expect(grassTexture.repeat.y).toBe(4);
      // Should preserve original wrapping settings
      expect(grassTexture.wrapS).toBe(THREE.MirroredRepeatWrapping);
      expect(grassTexture.wrapT).toBe(THREE.MirroredRepeatWrapping);
    });

    it('should handle missing layer textures', () => {
      const configWithoutLayers = {
        layers: [],
      };

      const utils = createTerrainUtils();

      expect(() => {
        utils.createTerrainMaterial(configWithoutLayers);
      }).not.toThrow();
    });

    it('should use default values for missing layers', () => {
      const configWithoutSpecificLayers = {
        layers: [],
      };

      const utils = createTerrainUtils();

      expect(() => {
        utils.createTerrainMaterial(configWithoutSpecificLayers);
      }).not.toThrow();
    });

    it('should use noise defaults when not specified', () => {
      const configWithoutNoise = {
        layers: [
          {
            textureAssetId: 'grass',
            minHeight: 0,
            maxHeight: 100,
          },
        ],
      };

      const utils = createTerrainUtils();

      expect(() => {
        utils.createTerrainMaterial(configWithoutNoise);
      }).not.toThrow();
    });
  });
});

describe('Terrain Configuration Validation', () => {
  it('should handle minimal terrain config', () => {
    const minimalConfig: TerrainConfig = {
      layers: [
        {
          textureAssetId: 'grass',
          minHeight: 0,
          maxHeight: 100,
        },
      ],
    };

    expect(minimalConfig.layers).toHaveLength(1);
    expect(minimalConfig.layers[0].textureAssetId).toBe('grass');
    expect(minimalConfig.blendDistance).toBeUndefined();
    expect(minimalConfig.noise).toBeUndefined();
  });

  it('should handle complete terrain config', () => {
    const completeConfig: TerrainConfig = {
      layers: [
        {
          textureAssetId: 'grass',
          minHeight: 10,
          maxHeight: 100,
          textureScale: 4,
        },
        {
          textureAssetId: 'sand',
          minHeight: 0,
          maxHeight: 5,
          textureScale: 100,
        },
      ],
      blendDistance: 1.5,
      noise: {
        scale: 55,
        amplitude: 0.3,
        offset: -0.35,
        octaves: 3,
      },
      castShadow: true,
      receiveShadow: true,
    };

    expect(completeConfig.layers).toHaveLength(2);
    expect(completeConfig.layers[0].textureAssetId).toBe('grass');
    expect(completeConfig.layers[0].minHeight).toBe(10);
    expect(completeConfig.layers[0].maxHeight).toBe(100);
    expect(completeConfig.blendDistance).toBe(1.5);
    expect(completeConfig.noise?.scale).toBe(55);
    expect(completeConfig.castShadow).toBe(true);
  });
});
