import * as THREE from 'three';
import { WaterUtils } from '../core/water/water-utils.js';
import type { InternalInternalWaterConfig } from '../types/water.js';

// Mock console.warn to avoid warnings in tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
});

describe('WaterUtils with Texture Support', () => {
  let mockTexture: THREE.Texture;
  let mockHeightmapUtils: any;

  beforeEach(() => {
    // Create a mock texture without DOM dependencies
    mockTexture = new THREE.DataTexture(
      new Uint8Array(256 * 256 * 4), // RGBA data
      256,
      256,
      THREE.RGBAFormat,
    );
    mockTexture.wrapS = THREE.RepeatWrapping;
    mockTexture.wrapT = THREE.RepeatWrapping;

    // Create mock heightmap utils
    mockHeightmapUtils = {
      heightmapData: {
        heightMapTexture: new THREE.DataTexture(
          new Uint8Array(256 * 256),
          256,
          256,
        ),
      },
      config: {
        elevationRatio: 30,
      },
    };
  });

  afterEach(() => {
    if (mockTexture) {
      mockTexture.dispose();
    }
    if (mockHeightmapUtils?.heightmapData?.heightMapTexture) {
      mockHeightmapUtils.heightmapData.heightMapTexture.dispose();
    }
  });

  test('should create water instance with default configuration', () => {
    const config: InternalWaterConfig = {
      level: 5.0,
    };

    const waterInstance = WaterUtils.createWaterInstance(
      config,
      512,
      512,
      mockHeightmapUtils,
    );

    expect(waterInstance).toBeDefined();
    expect(waterInstance.mesh).toBeInstanceOf(THREE.Mesh);
    expect(waterInstance.uniforms).toBeDefined();
    expect(waterInstance.update).toBeInstanceOf(Function);
    expect(waterInstance.destroy).toBeInstanceOf(Function);

    // Check texture-related uniforms have default values
    expect(waterInstance.uniforms.uHasTexture.value).toBe(false);
    expect(waterInstance.uniforms.uTextureStrength.value).toBe(0.3);
    expect(waterInstance.uniforms.uTextureScale.value).toBe(4.0);
    expect(waterInstance.uniforms.uWaterTexture.value).toBeNull();

    waterInstance.destroy();
  });

  test('should create water instance with texture configuration', () => {
    const config: InternalWaterConfig = {
      level: 7.8,
      texture: mockTexture,
      textureStrength: 0.5,
      textureScale: 8.0,
    };

    const waterInstance = WaterUtils.createWaterInstance(
      config,
      512,
      512,
      mockHeightmapUtils,
    );

    expect(waterInstance).toBeDefined();
    expect(waterInstance.mesh).toBeInstanceOf(THREE.Mesh);

    // Check texture-related uniforms
    expect(waterInstance.uniforms.uHasTexture.value).toBe(true);
    expect(waterInstance.uniforms.uTextureStrength.value).toBe(0.5);
    expect(waterInstance.uniforms.uTextureScale.value).toBe(8.0);
    expect(waterInstance.uniforms.uWaterTexture.value).toBe(mockTexture);

    waterInstance.destroy();
  });

  test('should handle partial texture configuration', () => {
    const config: InternalWaterConfig = {
      level: 10.0,
      texture: mockTexture,
      // Only texture provided, strength and scale should use defaults
    };

    const waterInstance = WaterUtils.createWaterInstance(
      config,
      256,
      256,
      mockHeightmapUtils,
    );

    expect(waterInstance.uniforms.uHasTexture.value).toBe(true);
    expect(waterInstance.uniforms.uTextureStrength.value).toBe(0.3); // Default
    expect(waterInstance.uniforms.uTextureScale.value).toBe(4.0); // Default
    expect(waterInstance.uniforms.uWaterTexture.value).toBe(mockTexture);

    waterInstance.destroy();
  });

  test('should update time uniform correctly', () => {
    const config: InternalWaterConfig = {
      level: 5.0,
      texture: mockTexture,
    };

    const waterInstance = WaterUtils.createWaterInstance(
      config,
      512,
      512,
      mockHeightmapUtils,
    );

    const initialTime = waterInstance.uniforms.uTime.value;

    // Update with delta time
    waterInstance.update(0.016); // ~60fps

    expect(waterInstance.uniforms.uTime.value).toBe(initialTime + 0.016);

    waterInstance.destroy();
  });

  test('should work without heightmap utils', () => {
    const config: InternalWaterConfig = {
      level: 0.0,
      texture: mockTexture,
      textureStrength: 0.7,
    };

    const waterInstance = WaterUtils.createWaterInstance(
      config,
      100,
      100,
      null, // No heightmap utils
    );

    expect(waterInstance).toBeDefined();
    expect(waterInstance.uniforms.uTerrainHeightMap.value).toBeNull();
    expect(waterInstance.uniforms.uMaxTerrainHeight.value).toBe(30); // Default

    waterInstance.destroy();
  });

  test('should properly dispose resources', () => {
    const config: InternalWaterConfig = {
      level: 5.0,
      texture: mockTexture,
    };

    const waterInstance = WaterUtils.createWaterInstance(
      config,
      512,
      512,
      mockHeightmapUtils,
    );

    const geometry = waterInstance.mesh.geometry;
    const material = waterInstance.mesh.material as THREE.ShaderMaterial;

    // Mock dispose methods to track calls
    const geometryDisposeSpy = jest.spyOn(geometry, 'dispose');
    const materialDisposeSpy = jest.spyOn(material, 'dispose');

    waterInstance.destroy();

    expect(geometryDisposeSpy).toHaveBeenCalled();
    expect(materialDisposeSpy).toHaveBeenCalled();
  });

  test('should position water mesh correctly', () => {
    const config: InternalWaterConfig = {
      level: 12.5,
    };

    const worldWidth = 400;
    const worldHeight = 600;

    const waterInstance = WaterUtils.createWaterInstance(
      config,
      worldWidth,
      worldHeight,
      mockHeightmapUtils,
    );

    expect(waterInstance.mesh.position.x).toBe(worldWidth / 2);
    expect(waterInstance.mesh.position.y).toBe(12.5);
    expect(waterInstance.mesh.position.z).toBe(worldHeight / 2);
    expect(waterInstance.mesh.rotation.x).toBe(-Math.PI / 2);

    waterInstance.destroy();
  });

  test('should handle custom water properties with texture', () => {
    const config: InternalWaterConfig = {
      level: 8.0,
      deepColor: 0x001122,
      shallowColor: 0x66aaff,
      foamColor: 0xffffff,
      opacity: 0.9,
      amplitude: 2.0,
      frequency: 6.0,
      speed: 2.5,
      texture: mockTexture,
      textureStrength: 0.8,
      textureScale: 12.0,
    };

    const waterInstance = WaterUtils.createWaterInstance(
      config,
      512,
      512,
      mockHeightmapUtils,
    );

    // Check color uniforms
    expect(waterInstance.uniforms.uDeepColor.value).toEqual(
      new THREE.Color(0x001122),
    );
    expect(waterInstance.uniforms.uShallowColor.value).toEqual(
      new THREE.Color(0x66aaff),
    );
    expect(waterInstance.uniforms.uFoamColor.value).toEqual(
      new THREE.Color(0xffffff),
    );

    // Check other uniforms
    expect(waterInstance.uniforms.uOpacity.value).toBe(0.9);
    expect(waterInstance.uniforms.uAmplitude.value).toBe(2.0);
    expect(waterInstance.uniforms.uFrequency.value).toBe(6.0);
    expect(waterInstance.uniforms.uSpeed.value).toBe(2.5);

    // Check texture uniforms
    expect(waterInstance.uniforms.uHasTexture.value).toBe(true);
    expect(waterInstance.uniforms.uTextureStrength.value).toBe(0.8);
    expect(waterInstance.uniforms.uTextureScale.value).toBe(12.0);

    waterInstance.destroy();
  });

  test('should handle texture asset ID configuration through external processing', () => {
    // This test simulates how the world.ts would process textureAssetId
    const configWithAssetId = {
      level: 5.0,
      textureAssetId: 'water',
      textureStrength: 0.6,
      textureScale: 10.0,
    };

    // Simulate the processing done in world.ts
    const finalConfig: InternalWaterConfig = { ...configWithAssetId };
    if (configWithAssetId.textureAssetId) {
      // In real scenario, this would come from loaded assets
      finalConfig.texture = mockTexture;
    }

    const waterInstance = WaterUtils.createWaterInstance(
      finalConfig,
      512,
      512,
      mockHeightmapUtils,
    );

    expect(waterInstance.uniforms.uHasTexture.value).toBe(true);
    expect(waterInstance.uniforms.uTextureStrength.value).toBe(0.6);
    expect(waterInstance.uniforms.uTextureScale.value).toBe(10.0);
    expect(waterInstance.uniforms.uWaterTexture.value).toBe(mockTexture);

    waterInstance.destroy();
  });
});
