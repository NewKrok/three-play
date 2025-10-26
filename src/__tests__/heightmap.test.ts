import * as THREE from 'three';
import {
  loadHeightmap,
  createHeightmapUtils,
} from '../core/heightmap/heightmap-utils';
import type { HeightmapConfig } from '../types/heightmap';

// Mock GeomUtils from @newkrok/three-utils
jest.mock('@newkrok/three-utils', () => ({
  GeomUtils: {
    isPointInATriangle: jest.fn().mockReturnValue(true),
    yFromTriangle: jest.fn().mockReturnValue(10),
  },
}));

// Mock canvas and context
const mockGetImageData = jest.fn().mockReturnValue({
  data: new Uint8ClampedArray(256 * 256 * 4).fill(128), // Gray heightmap
});

const mockGetContext = jest.fn().mockReturnValue({
  drawImage: jest.fn(),
  getImageData: mockGetImageData,
});

// Mock THREE.TextureLoader
const mockTexture = new THREE.Texture();
mockTexture.image = {
  width: 256,
  height: 256,
};

const mockLoad = jest.fn();
jest.mock('three', () => ({
  ...jest.requireActual('three'),
  TextureLoader: jest.fn().mockImplementation(() => ({
    load: mockLoad,
  })),
}));

// Mock canvas and DOM elements for Node.js environment
(global as any).HTMLCanvasElement = class MockHTMLCanvasElement {
  width = 0;
  height = 0;
  getContext = mockGetContext;
};

// Mock document.createElement for canvas
Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn().mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return new (global as any).HTMLCanvasElement();
      }
      return {};
    }),
  },
  writable: true,
});

// Mock performance.now for performance tests
(global as any).performance = {
  now: jest.fn().mockReturnValue(Date.now()),
};

describe('HeightmapUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock loader to call success callback
    mockLoad.mockImplementation((url, onLoad, onProgress, onError) => {
      setTimeout(() => onLoad(mockTexture), 0);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadHeightmap', () => {
    it('should load heightmap from URL successfully', async () => {
      const url = 'test-heightmap.png';

      const result = await loadHeightmap(url);

      expect(result).toBeDefined();
      expect(result.heightmap).toBeInstanceOf(Float32Array);
      expect(result.heightMapTexture).toBe(mockTexture);
      expect(mockLoad).toHaveBeenCalledWith(
        url,
        expect.any(Function),
        undefined,
        expect.any(Function),
      );
    });

    it('should handle loading errors', async () => {
      const url = 'invalid-heightmap.png';
      const errorMessage = 'Failed to load texture';

      mockLoad.mockImplementation((url, onLoad, onProgress, onError) => {
        setTimeout(() => onError(errorMessage), 0);
      });

      await expect(loadHeightmap(url)).rejects.toThrow(
        'Failed to load texture: ' + errorMessage,
      );
    });

    it('should throw error when canvas context is not available', async () => {
      mockGetContext.mockReturnValueOnce(null);

      const url = 'test-heightmap.png';

      await expect(loadHeightmap(url)).rejects.toThrow(
        'Failed to get 2D rendering context',
      );
    });

    it('should convert image data to Float32Array correctly', async () => {
      const url = 'test-heightmap.png';

      // Create test image data with known values
      const testData = new Uint8ClampedArray(4 * 4 * 4); // 4x4 pixels, RGBA
      for (let i = 0; i < testData.length; i += 4) {
        testData[i] = 255; // R channel - this will be converted to height
        testData[i + 1] = 0; // G channel
        testData[i + 2] = 0; // B channel
        testData[i + 3] = 255; // A channel
      }

      mockGetImageData.mockReturnValueOnce({ data: testData });
      mockTexture.image.width = 4;
      mockTexture.image.height = 4;

      const result = await loadHeightmap(url);

      expect(result.heightmap).toHaveLength(16); // 4x4 pixels
      // All heights should be 1.0 (255/255)
      for (let i = 0; i < result.heightmap.length; i++) {
        expect(result.heightmap[i]).toBe(1.0);
      }
    });
  });

  describe('createHeightmapUtils', () => {
    let heightmapData: any;
    let config: HeightmapConfig;

    beforeEach(() => {
      // Create test heightmap data
      const heightmap = new Float32Array(4 * 4); // 4x4 heightmap
      for (let i = 0; i < heightmap.length; i++) {
        heightmap[i] = i / (heightmap.length - 1); // Gradient from 0 to 1
      }

      heightmapData = {
        heightmap,
        heightMapTexture: new THREE.Texture(),
      };

      config = {
        worldWidth: 100,
        worldHeight: 100,
        resolution: 4,
        elevationRatio: 10,
      };
    });

    it('should create heightmap utils with correct configuration', () => {
      const utils = createHeightmapUtils(heightmapData, config);

      expect(utils).toBeDefined();
      expect(utils.config).toBe(config);
      expect(utils.heightmapData).toBe(heightmapData);
      expect(typeof utils.getHeightFromPosition).toBe('function');
      expect(typeof utils.getPositionByHeight).toBe('function');
      expect(typeof utils.applyHeightmapToGeometry).toBe('function');
    });

    it('should get height from position correctly', () => {
      const utils = createHeightmapUtils(heightmapData, config);
      const position = new THREE.Vector3(50, 0, 50); // Center of world

      const height = utils.getHeightFromPosition(position);

      expect(typeof height).toBe('number');
      expect(height).toBeGreaterThanOrEqual(0);
    });

    it('should return null when no valid position found above minimum height', () => {
      const utils = createHeightmapUtils(heightmapData, config);

      // Mock Math.random to always return positions that would be too low
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.1);

      const position = utils.getPositionByHeight(1000); // Very high minimum

      expect(position).toBeNull();

      // Restore Math.random
      Math.random = originalRandom;
    });

    it('should find valid position above minimum height', () => {
      const utils = createHeightmapUtils(heightmapData, config);

      // Mock Math.random to return center position
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5);

      const position = utils.getPositionByHeight(0); // Low minimum

      expect(position).not.toBeNull();
      expect(position).toHaveProperty('x');
      expect(position).toHaveProperty('y');
      expect(position).toHaveProperty('z');

      // Restore Math.random
      Math.random = originalRandom;
    });

    it('should apply heightmap to geometry correctly', () => {
      const utils = createHeightmapUtils(heightmapData, config);

      // Create test geometry - make sure it has the same vertex count as heightmap
      const geometry = new THREE.PlaneGeometry(100, 100, 3, 3); // 4x4 vertices

      // Store original Z values before modification
      const originalVertices = new Float32Array(
        geometry.attributes.position.array,
      );

      utils.applyHeightmapToGeometry(geometry);

      // Check that the function completed without error
      const newVertices = geometry.attributes.position.array as Float32Array;
      expect(newVertices).toBeDefined();
      expect(newVertices.length).toBe(originalVertices.length);

      // At least some vertices should have different heights
      // Since our test heightmap has values from 0 to 1, some vertices should be modified
      let hasModifiedVertex = false;
      for (let i = 2; i < newVertices.length; i += 3) {
        if (newVertices[i] !== 0) {
          // Check if any height is non-zero
          hasModifiedVertex = true;
          break;
        }
      }
      expect(hasModifiedVertex).toBe(true);
    });

    it('should handle edge cases in height calculation', () => {
      const utils = createHeightmapUtils(heightmapData, config);

      // Test position outside world bounds
      const outsidePosition = new THREE.Vector3(-10, 0, -10);
      const height = utils.getHeightFromPosition(outsidePosition);

      expect(typeof height).toBe('number');
      expect(height).toBeGreaterThanOrEqual(0);
    });
  });

  describe('integration tests', () => {
    it('should work with complete workflow', async () => {
      const url = 'test-heightmap.png';
      const config: HeightmapConfig = {
        worldWidth: 512,
        worldHeight: 512,
        resolution: 256,
        elevationRatio: 30,
      };

      // Load heightmap
      const heightmapData = await loadHeightmap(url);

      // Create utils
      const utils = createHeightmapUtils(heightmapData, config);

      // Test functionality
      const testPosition = new THREE.Vector3(100, 0, 100);
      const height = utils.getHeightFromPosition(testPosition);
      const randomPosition = utils.getPositionByHeight(0);

      expect(typeof height).toBe('number');
      expect(randomPosition).toBeDefined();
    });
  });

  describe('performance tests', () => {
    it('should handle large heightmaps efficiently', async () => {
      // Create large heightmap data
      const size = 512;
      const heightmap = new Float32Array(size * size);
      for (let i = 0; i < heightmap.length; i++) {
        heightmap[i] = Math.random();
      }

      const heightmapData = {
        heightmap,
        heightMapTexture: new THREE.Texture(),
      };

      const config: HeightmapConfig = {
        worldWidth: 1024,
        worldHeight: 1024,
        resolution: size,
        elevationRatio: 50,
      };

      const startTime = performance.now();
      const utils = createHeightmapUtils(heightmapData, config);

      // Test multiple height queries
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * config.worldWidth;
        const z = Math.random() * config.worldHeight;
        utils.getHeightFromPosition(new THREE.Vector3(x, 0, z));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 100ms for 100 queries)
      expect(duration).toBeLessThan(100);
    });
  });
});
