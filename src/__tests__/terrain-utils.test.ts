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
      const fragments = utils.getShaderFragments(3); // Test with 3 layers

      expect(fragments).toBeDefined();
      expect(fragments.vertexShader).toContain('vWorldPosition');
      expect(fragments.vertexShader).toContain('vUvCustom');
      expect(fragments.fragmentShaderPart1).toContain(
        'uniform float uBlendDistance',
      );
      expect(fragments.fragmentShaderPart1).toContain('fbm');
      expect(fragments.fragmentShaderPart1).toContain('uLayerTexture0');
      expect(fragments.fragmentShaderPart1).toContain('uLayerMinHeight0');
      expect(fragments.fragmentShaderPart1).toContain('uLayerMaxHeight0');
      expect(fragments.fragmentShaderPart2).toContain('diffuseColor.rgb');
      expect(fragments.fragmentShaderPart2).toContain('layer0Weight');
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

describe('Dynamic Layer System', () => {
  let mockTexture: THREE.Texture;

  beforeEach(() => {
    mockTexture = new THREE.Texture();
  });

  afterEach(() => {
    mockTexture.dispose();
  });

  it('should support arbitrary layer names', () => {
    const config: TerrainConfig = {
      layers: [
        {
          textureAssetId: 'volcanic_rock',
          minHeight: 0,
          maxHeight: 20,
          textureScale: 50,
        },
        {
          textureAssetId: 'alien_moss',
          minHeight: 20,
          maxHeight: 40,
          textureScale: 80,
        },
        {
          textureAssetId: 'crystal_formations',
          minHeight: 40,
          maxHeight: 100,
          textureScale: 30,
        },
      ],
    };

    const assets: LoadedAssets = {
      textures: {
        volcanic_rock: mockTexture.clone(),
        alien_moss: mockTexture.clone(),
        crystal_formations: mockTexture.clone(),
      },
      models: {},
    };

    const internalConfig = prepareTerrainConfig(config, assets);

    expect(internalConfig.layerTextures).toBeDefined();
    expect(internalConfig.layerTextures!.volcanic_rock).toBe(
      assets.textures.volcanic_rock,
    );
    expect(internalConfig.layerTextures!.alien_moss).toBe(
      assets.textures.alien_moss,
    );
    expect(internalConfig.layerTextures!.crystal_formations).toBe(
      assets.textures.crystal_formations,
    );

    // Clean up
    Object.values(assets.textures).forEach((texture) => texture.dispose());
  });

  it('should generate correct shader for different layer counts', () => {
    const utils = createTerrainUtils();

    // Test single layer
    const singleLayerShader = utils.getShaderFragments(1);
    expect(singleLayerShader.fragmentShaderPart1).toContain('uLayerTexture0');
    expect(singleLayerShader.fragmentShaderPart1).not.toContain(
      'uLayerTexture1',
    );
    expect(singleLayerShader.fragmentShaderPart2).toContain('layer0Weight');
    expect(singleLayerShader.fragmentShaderPart2).not.toContain('layer1Weight');

    // Test multiple layers
    const multiLayerShader = utils.getShaderFragments(5);
    expect(multiLayerShader.fragmentShaderPart1).toContain('uLayerTexture0');
    expect(multiLayerShader.fragmentShaderPart1).toContain('uLayerTexture1');
    expect(multiLayerShader.fragmentShaderPart1).toContain('uLayerTexture4');
    expect(multiLayerShader.fragmentShaderPart2).toContain('layer0Weight');
    expect(multiLayerShader.fragmentShaderPart2).toContain('layer4Weight');
  });

  it('should create material with custom layer configuration', () => {
    const internalConfig: InternalTerrainConfig = {
      layers: [
        {
          textureAssetId: 'rocky_ground',
          minHeight: 0,
          maxHeight: 30,
          textureScale: 60,
        },
        {
          textureAssetId: 'snow_covered',
          minHeight: 30,
          maxHeight: 80,
          textureScale: 120,
        },
      ],
      layerTextures: {
        rocky_ground: mockTexture.clone(),
        snow_covered: mockTexture.clone(),
      },
      blendDistance: 2.0,
      noise: {
        scale: 40,
        amplitude: 0.5,
        offset: -0.2,
      },
    };

    const utils = createTerrainUtils();
    const material = utils.createTerrainMaterial(internalConfig);

    expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(material.map).toBe(internalConfig.layerTextures!.rocky_ground);

    // Clean up
    Object.values(internalConfig.layerTextures!).forEach((texture) =>
      texture.dispose(),
    );
  });

  it('should handle empty layers array gracefully', () => {
    const internalConfig: InternalTerrainConfig = {
      layers: [],
    };

    const utils = createTerrainUtils();

    expect(() => {
      utils.createTerrainMaterial(internalConfig);
    }).not.toThrow();

    expect(() => {
      utils.getShaderFragments(0);
    }).not.toThrow();
  });

  it('should support game-specific layer configurations', () => {
    // Fantasy game layers
    const fantasyConfig: TerrainConfig = {
      layers: [
        { textureAssetId: 'cursed_soil', minHeight: 0, maxHeight: 15 },
        { textureAssetId: 'enchanted_grass', minHeight: 15, maxHeight: 50 },
        { textureAssetId: 'mystical_stone', minHeight: 50, maxHeight: 100 },
      ],
    };

    // Sci-fi game layers
    const scifiConfig: TerrainConfig = {
      layers: [
        { textureAssetId: 'metallic_surface', minHeight: 0, maxHeight: 10 },
        { textureAssetId: 'energy_crystal', minHeight: 10, maxHeight: 30 },
        { textureAssetId: 'plasma_residue', minHeight: 30, maxHeight: 60 },
        { textureAssetId: 'void_matter', minHeight: 60, maxHeight: 100 },
      ],
    };

    // Both should be valid configurations
    expect(fantasyConfig.layers).toHaveLength(3);
    expect(scifiConfig.layers).toHaveLength(4);

    expect(fantasyConfig.layers[0].textureAssetId).toBe('cursed_soil');
    expect(scifiConfig.layers[3].textureAssetId).toBe('void_matter');
  });

  it('should support many layers without hardcoded limits', () => {
    const manyLayersConfig: TerrainConfig = {
      layers: Array.from({ length: 8 }, (_, i) => ({
        textureAssetId: `layer_texture_${i}`,
        minHeight: i * 10,
        maxHeight: (i + 1) * 10,
        textureScale: 50 + i * 10,
      })),
    };

    const assets: LoadedAssets = {
      textures: Object.fromEntries(
        manyLayersConfig.layers.map((layer) => [
          layer.textureAssetId,
          mockTexture.clone(),
        ]),
      ),
      models: {},
    };

    const internalConfig = prepareTerrainConfig(manyLayersConfig, assets);
    const utils = createTerrainUtils();

    expect(() => {
      utils.createTerrainMaterial(internalConfig);
    }).not.toThrow();

    expect(() => {
      utils.getShaderFragments(8);
    }).not.toThrow();

    expect(internalConfig.layerTextures).toBeDefined();
    expect(Object.keys(internalConfig.layerTextures!)).toHaveLength(8);

    // Clean up
    Object.values(assets.textures).forEach((texture) => texture.dispose());
  });
});
