import * as THREE from 'three';
import { createWaterInstance, WaterUtils } from '../core/water/water-utils.js';
import type { HeightmapUtils } from '../types/heightmap.js';
import type { InternalWaterConfig } from '../types/water.js';

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

/**
 * Create a mock heightmap utils for testing
 */
const createMockHeightmapUtils = (): HeightmapUtils => {
  const mockTexture = new THREE.Texture();

  return {
    getHeightFromPosition: jest.fn().mockReturnValue(10),
    getPositionByHeight: jest.fn().mockReturnValue({ x: 50, y: 10, z: 50 }),
    applyHeightmapToGeometry: jest.fn(),
    heightmapData: {
      heightmap: new Float32Array([0.5, 0.3, 0.8, 0.2]),
      heightMapTexture: mockTexture,
    },
    config: {
      worldWidth: 100,
      worldHeight: 100,
      resolution: 256,
      elevationRatio: 30,
    },
  };
};

describe('Water Utils', () => {
  describe('DEFAULT_WATER_CONFIG', () => {
    it('should have all required default values', () => {
      expect(WaterUtils.DEFAULT_WATER_CONFIG).toEqual({
        level: 0,
        deepColor: 0x013a5b,
        shallowColor: 0x2fc7ff,
        shallowStrength: 0.2,
        foamColor: 0xf6f9ff,
        foamWidth: 0.4,
        foamStrength: 0.2,
        opacity: 0.8,
        amplitude: 1.0,
        frequency: 4.0,
        speed: 1.5,
        resolution: 64,
        texture: null,
        textureStrength: 0.3,
        textureScale: 4.0,
        textureFlowDirection: new THREE.Vector2(1.0, 0.0),
        textureFlowSpeed: 0.05,
        variationTexture: null,
        variationScale: 1.0,
        variationFlowDirection: new THREE.Vector2(0.3, 0.7),
        variationFlowSpeed: 0.02,
      });
    });
  });

  describe('createWaterInstance', () => {
    const worldWidth = 100;
    const worldHeight = 100;
    let mockHeightmapUtils: HeightmapUtils;

    beforeEach(() => {
      mockHeightmapUtils = createMockHeightmapUtils();
    });

    afterEach(() => {
      // Cleanup THREE.js objects to prevent memory leaks
      jest.clearAllMocks();
    });

    it('should create water instance with default configuration', () => {
      const config: InternalWaterConfig = { level: 5 };

      const waterInstance = createWaterInstance(
        config,
        worldWidth,
        worldHeight,
        mockHeightmapUtils,
      );

      expect(waterInstance).toBeDefined();
      expect(waterInstance.mesh).toBeInstanceOf(THREE.Mesh);
      expect(waterInstance.uniforms).toBeDefined();
      expect(waterInstance.update).toBeInstanceOf(Function);
      expect(waterInstance.destroy).toBeInstanceOf(Function);
    });

    it('should create water instance with custom configuration', () => {
      const config: InternalWaterConfig = {
        level: 10,
        deepColor: 0x000080,
        shallowColor: 0x87ceeb,
        opacity: 0.9,
        amplitude: 2.0,
        frequency: 6.0,
        speed: 2.0,
        resolution: 128,
      };

      const waterInstance = createWaterInstance(
        config,
        worldWidth,
        worldHeight,
        mockHeightmapUtils,
      );

      expect(waterInstance.mesh.position.y).toBe(10);
      expect(waterInstance.uniforms.uOpacity.value).toBe(0.9);
      expect(waterInstance.uniforms.uAmplitude.value).toBe(2.0);
      expect(waterInstance.uniforms.uFrequency.value).toBe(6.0);
      expect(waterInstance.uniforms.uSpeed.value).toBe(2.0);
      expect(waterInstance.uniforms.uDeepColor.value).toEqual(
        new THREE.Color(0x000080),
      );
      expect(waterInstance.uniforms.uShallowColor.value).toEqual(
        new THREE.Color(0x87ceeb),
      );
    });

    it('should position water mesh correctly', () => {
      const config: InternalWaterConfig = { level: 15 };

      const waterInstance = createWaterInstance(
        config,
        worldWidth,
        worldHeight,
        mockHeightmapUtils,
      );

      expect(waterInstance.mesh.position.x).toBe(worldWidth / 2);
      expect(waterInstance.mesh.position.y).toBe(15);
      expect(waterInstance.mesh.position.z).toBe(worldHeight / 2);
      expect(waterInstance.mesh.rotation.x).toBe(-Math.PI / 2);
    });

    it('should create proper geometry with specified resolution', () => {
      const config: InternalWaterConfig = { level: 5, resolution: 32 };

      const waterInstance = createWaterInstance(
        config,
        worldWidth,
        worldHeight,
        mockHeightmapUtils,
      );

      const geometry = waterInstance.mesh.geometry as THREE.PlaneGeometry;
      expect(geometry).toBeInstanceOf(THREE.PlaneGeometry);

      // Check that geometry has the correct parameters
      expect(geometry.parameters.width).toBe(worldWidth);
      expect(geometry.parameters.height).toBe(worldHeight);
      expect(geometry.parameters.widthSegments).toBe(32);
      expect(geometry.parameters.heightSegments).toBe(32);
    });

    it('should set up uniforms correctly with heightmap data', () => {
      const config: InternalWaterConfig = { level: 8 };

      const waterInstance = createWaterInstance(
        config,
        worldWidth,
        worldHeight,
        mockHeightmapUtils,
      );

      expect(waterInstance.uniforms.uTerrainHeightMap.value).toBe(
        mockHeightmapUtils.heightmapData.heightMapTexture,
      );
      expect(waterInstance.uniforms.uMaxTerrainHeight.value).toBe(30);
      expect(waterInstance.uniforms.uWorldWidth.value).toBe(worldWidth);
      expect(waterInstance.uniforms.uWorldHeight.value).toBe(worldHeight);
      expect(waterInstance.uniforms.uWaterLevel.value).toBe(8);
    });

    it('should handle null heightmap utils gracefully', () => {
      const config: InternalWaterConfig = { level: 5 };

      const waterInstance = createWaterInstance(
        config,
        worldWidth,
        worldHeight,
        null,
      );

      expect(waterInstance.uniforms.uTerrainHeightMap.value).toBe(null);
      expect(waterInstance.uniforms.uMaxTerrainHeight.value).toBe(30);
    });

    it('should create shader material with correct properties', () => {
      const config: InternalWaterConfig = { level: 5 };

      const waterInstance = createWaterInstance(
        config,
        worldWidth,
        worldHeight,
        mockHeightmapUtils,
      );

      const material = waterInstance.mesh.material as THREE.ShaderMaterial;
      expect(material).toBeInstanceOf(THREE.ShaderMaterial);
      expect(material.transparent).toBe(true);
      expect(material.side).toBe(THREE.DoubleSide);
      expect(material.vertexShader).toBeDefined();
      expect(material.fragmentShader).toBeDefined();
    });

    it('should update time uniform when update is called', () => {
      const config: InternalWaterConfig = { level: 5 };

      const waterInstance = createWaterInstance(
        config,
        worldWidth,
        worldHeight,
        mockHeightmapUtils,
      );

      const initialTime = waterInstance.uniforms.uTime.value;
      waterInstance.update(0.016); // 16ms delta time

      expect(waterInstance.uniforms.uTime.value).toBe(initialTime + 0.016);
    });

    it('should properly dispose resources when destroyed', () => {
      const config: InternalWaterConfig = { level: 5 };

      const waterInstance = createWaterInstance(
        config,
        worldWidth,
        worldHeight,
        mockHeightmapUtils,
      );

      const geometry = waterInstance.mesh.geometry;
      const material = waterInstance.mesh.material as THREE.ShaderMaterial;

      const geometryDisposeSpy = jest.spyOn(geometry, 'dispose');
      const materialDisposeSpy = jest.spyOn(material, 'dispose');

      waterInstance.destroy();

      expect(geometryDisposeSpy).toHaveBeenCalled();
      expect(materialDisposeSpy).toHaveBeenCalled();
    });

    it('should handle edge case configurations', () => {
      const config: InternalWaterConfig = {
        level: 0,
        amplitude: 0,
        frequency: 0,
        speed: 0,
        opacity: 0,
        resolution: 1,
      };

      const waterInstance = createWaterInstance(
        config,
        worldWidth,
        worldHeight,
        mockHeightmapUtils,
      );

      expect(waterInstance.uniforms.uAmplitude.value).toBe(0);
      expect(waterInstance.uniforms.uFrequency.value).toBe(0);
      expect(waterInstance.uniforms.uSpeed.value).toBe(0);
      expect(waterInstance.uniforms.uOpacity.value).toBe(0);
    });

    it('should merge custom config with defaults correctly', () => {
      const config: InternalWaterConfig = {
        level: 5,
        deepColor: 0xff0000,
        // Only specify partial config - others should use defaults
      };

      const waterInstance = createWaterInstance(
        config,
        worldWidth,
        worldHeight,
        mockHeightmapUtils,
      );

      // Custom values
      expect(waterInstance.uniforms.uWaterLevel.value).toBe(5);
      expect(waterInstance.uniforms.uDeepColor.value).toEqual(
        new THREE.Color(0xff0000),
      );

      // Default values
      expect(waterInstance.uniforms.uShallowColor.value).toEqual(
        new THREE.Color(WaterUtils.DEFAULT_WATER_CONFIG.shallowColor),
      );
      expect(waterInstance.uniforms.uAmplitude.value).toBe(
        WaterUtils.DEFAULT_WATER_CONFIG.amplitude,
      );
    });

    it('should handle very large world dimensions', () => {
      const largeWorldWidth = 10000;
      const largeWorldHeight = 8000;
      const config: InternalWaterConfig = { level: 100 };

      const waterInstance = createWaterInstance(
        config,
        largeWorldWidth,
        largeWorldHeight,
        mockHeightmapUtils,
      );

      expect(waterInstance.mesh.position.x).toBe(largeWorldWidth / 2);
      expect(waterInstance.mesh.position.z).toBe(largeWorldHeight / 2);
      expect(waterInstance.uniforms.uWorldWidth.value).toBe(largeWorldWidth);
      expect(waterInstance.uniforms.uWorldHeight.value).toBe(largeWorldHeight);
    });

    describe('Texture Flow Configuration', () => {
      it('should create water instance with default texture flow settings', () => {
        const config: InternalWaterConfig = { level: 5 };

        const waterInstance = createWaterInstance(
          config,
          worldWidth,
          worldHeight,
          mockHeightmapUtils,
        );

        expect(waterInstance.uniforms.uTextureFlowDirection.value).toEqual(
          new THREE.Vector2(1.0, 0.0),
        );
        expect(waterInstance.uniforms.uTextureFlowSpeed.value).toBe(0.05);
      });

      it('should create water instance with custom texture flow settings', () => {
        const customFlowDirection = new THREE.Vector2(0.5, 1.0);
        const config: InternalWaterConfig = {
          level: 5,
          textureFlowDirection: customFlowDirection,
          textureFlowSpeed: 0.08,
        };

        const waterInstance = createWaterInstance(
          config,
          worldWidth,
          worldHeight,
          mockHeightmapUtils,
        );

        expect(waterInstance.uniforms.uTextureFlowDirection.value).toEqual(
          customFlowDirection,
        );
        expect(waterInstance.uniforms.uTextureFlowSpeed.value).toBe(0.08);
      });

      it('should clone the texture flow direction vector to prevent mutation', () => {
        const originalDirection = new THREE.Vector2(0.7, 0.3);
        const config: InternalWaterConfig = {
          level: 5,
          textureFlowDirection: originalDirection,
        };

        const waterInstance = createWaterInstance(
          config,
          worldWidth,
          worldHeight,
          mockHeightmapUtils,
        );

        // Modify the original vector
        originalDirection.set(1.0, 1.0);

        // The uniform should still have the original values
        expect(waterInstance.uniforms.uTextureFlowDirection.value).toEqual(
          new THREE.Vector2(0.7, 0.3),
        );
      });

      it('should handle edge case texture flow configurations', () => {
        const config: InternalWaterConfig = {
          level: 5,
          textureFlowDirection: new THREE.Vector2(0.0, 0.0),
          textureFlowSpeed: 0.0,
        };

        const waterInstance = createWaterInstance(
          config,
          worldWidth,
          worldHeight,
          mockHeightmapUtils,
        );

        expect(waterInstance.uniforms.uTextureFlowDirection.value).toEqual(
          new THREE.Vector2(0.0, 0.0),
        );
        expect(waterInstance.uniforms.uTextureFlowSpeed.value).toBe(0.0);
      });

      it('should handle very high texture flow speed', () => {
        const config: InternalWaterConfig = {
          level: 5,
          textureFlowSpeed: 10.0,
        };

        const waterInstance = createWaterInstance(
          config,
          worldWidth,
          worldHeight,
          mockHeightmapUtils,
        );

        expect(waterInstance.uniforms.uTextureFlowSpeed.value).toBe(10.0);
      });

      it('should handle negative texture flow direction', () => {
        const config: InternalWaterConfig = {
          level: 5,
          textureFlowDirection: new THREE.Vector2(-1.0, -0.5),
        };

        const waterInstance = createWaterInstance(
          config,
          worldWidth,
          worldHeight,
          mockHeightmapUtils,
        );

        expect(waterInstance.uniforms.uTextureFlowDirection.value).toEqual(
          new THREE.Vector2(-1.0, -0.5),
        );
      });
    });

    describe('Surface Variation Texture Support', () => {
      it('should create water instance without surface variation texture (procedural noise)', () => {
        const config: InternalWaterConfig = {
          level: 5,
          variationTexture: undefined,
        };

        const waterInstance = createWaterInstance(
          config,
          worldWidth,
          worldHeight,
          mockHeightmapUtils,
        );

        expect(waterInstance.uniforms.uVariationTexture.value).toBeNull();
        expect(waterInstance.uniforms.uUseVariationTexture.value).toBe(false);
        expect(waterInstance.uniforms.uVariationScale.value).toBe(1.0);
      });

      it('should create water instance with surface variation texture', () => {
        const mockVariationTexture = new THREE.Texture();
        const config: InternalWaterConfig = {
          level: 5,
          variationTexture: mockVariationTexture,
          variationScale: 2.0,
        };

        const waterInstance = createWaterInstance(
          config,
          worldWidth,
          worldHeight,
          mockHeightmapUtils,
        );

        expect(waterInstance.uniforms.uVariationTexture.value).toBe(
          mockVariationTexture,
        );
        expect(waterInstance.uniforms.uUseVariationTexture.value).toBe(true);
        expect(waterInstance.uniforms.uVariationScale.value).toBe(2.0);
      });

      it('should use default variation scale when not specified', () => {
        const mockVariationTexture = new THREE.Texture();
        const config: InternalWaterConfig = {
          level: 5,
          variationTexture: mockVariationTexture,
        };

        const waterInstance = createWaterInstance(
          config,
          worldWidth,
          worldHeight,
          mockHeightmapUtils,
        );

        expect(waterInstance.uniforms.uVariationScale.value).toBe(1.0);
      });

      it('should create water instance with custom variation flow settings', () => {
        const mockVariationTexture = new THREE.Texture();
        const customVariationFlowDirection = new THREE.Vector2(0.2, 0.8);
        const config: InternalWaterConfig = {
          level: 5,
          variationTexture: mockVariationTexture,
          variationScale: 2.0,
          variationFlowDirection: customVariationFlowDirection,
          variationFlowSpeed: 0.05,
        };

        const waterInstance = createWaterInstance(
          config,
          worldWidth,
          worldHeight,
          mockHeightmapUtils,
        );

        expect(waterInstance.uniforms.uVariationTexture.value).toBe(
          mockVariationTexture,
        );
        expect(waterInstance.uniforms.uUseVariationTexture.value).toBe(true);
        expect(waterInstance.uniforms.uVariationScale.value).toBe(2.0);
        expect(waterInstance.uniforms.uVariationFlowDirection.value).toEqual(
          customVariationFlowDirection,
        );
        expect(waterInstance.uniforms.uVariationFlowSpeed.value).toBe(0.05);
      });

      it('should use default variation flow settings when not specified', () => {
        const mockVariationTexture = new THREE.Texture();
        const config: InternalWaterConfig = {
          level: 5,
          variationTexture: mockVariationTexture,
        };

        const waterInstance = createWaterInstance(
          config,
          worldWidth,
          worldHeight,
          mockHeightmapUtils,
        );

        expect(waterInstance.uniforms.uVariationFlowDirection.value).toEqual(
          new THREE.Vector2(0.3, 0.7),
        );
        expect(waterInstance.uniforms.uVariationFlowSpeed.value).toBe(0.02);
      });

      it('should clone the variation flow direction vector to prevent mutation', () => {
        const originalVariationDirection = new THREE.Vector2(0.4, 0.6);
        const config: InternalWaterConfig = {
          level: 5,
          variationFlowDirection: originalVariationDirection,
        };

        const waterInstance = createWaterInstance(
          config,
          worldWidth,
          worldHeight,
          mockHeightmapUtils,
        );

        // Modify the original vector
        originalVariationDirection.set(1.0, 1.0);

        // The uniform should still have the original values
        expect(waterInstance.uniforms.uVariationFlowDirection.value).toEqual(
          new THREE.Vector2(0.4, 0.6),
        );
      });
    });
  });
});
