import * as THREE from 'three';
import {
  generateNoiseTexture,
  generatePerlinNoiseTexture,
  NoiseGenerator,
} from '../core/water/noise-generator.js';

// Mock canvas and context for testing
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: jest.fn(),
};

const mockContext = {
  createImageData: jest.fn(),
  putImageData: jest.fn(),
};

const mockImageData = {
  data: new Uint8ClampedArray(256 * 256 * 4),
};

// Mock document.createElement
Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn(() => mockCanvas),
  },
  writable: true,
});

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();

  // Reset mocks
  jest.clearAllMocks();

  // Setup default mock behavior
  mockCanvas.getContext = jest.fn(() => mockContext);
  mockContext.createImageData = jest.fn(() => mockImageData);
  mockContext.putImageData = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe('Noise Generator', () => {
  describe('generateNoiseTexture', () => {
    it('should generate a noise texture with default parameters', () => {
      const texture = generateNoiseTexture();

      expect(document.createElement).toHaveBeenCalledWith('canvas');
      expect(mockCanvas.width).toBe(256);
      expect(mockCanvas.height).toBe(256);
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
      expect(mockContext.createImageData).toHaveBeenCalledWith(256, 256);
      expect(mockContext.putImageData).toHaveBeenCalledWith(
        mockImageData,
        0,
        0,
      );
      expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    });

    it('should generate a noise texture with custom size', () => {
      const customSize = 512;
      const texture = generateNoiseTexture(customSize);

      expect(mockCanvas.width).toBe(customSize);
      expect(mockCanvas.height).toBe(customSize);
      expect(mockContext.createImageData).toHaveBeenCalledWith(
        customSize,
        customSize,
      );
      expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    });

    it('should throw error when canvas context is not available', () => {
      mockCanvas.getContext = jest.fn(() => null);

      expect(() => generateNoiseTexture()).toThrow(
        'Failed to get 2D context from canvas',
      );
    });

    it('should set proper texture properties', () => {
      const texture = generateNoiseTexture();

      expect(texture.wrapS).toBe(THREE.RepeatWrapping);
      expect(texture.wrapT).toBe(THREE.RepeatWrapping);
      expect(texture.generateMipmaps).toBe(true);
      expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
      expect(texture.magFilter).toBe(THREE.LinearFilter);
    });
  });

  describe('generatePerlinNoiseTexture', () => {
    it('should generate a Perlin noise texture with default parameters', () => {
      const texture = generatePerlinNoiseTexture();

      expect(document.createElement).toHaveBeenCalledWith('canvas');
      expect(mockCanvas.width).toBe(256);
      expect(mockCanvas.height).toBe(256);
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
      expect(mockContext.createImageData).toHaveBeenCalledWith(256, 256);
      expect(mockContext.putImageData).toHaveBeenCalledWith(
        mockImageData,
        0,
        0,
      );
      expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    });

    it('should generate a Perlin noise texture with custom parameters', () => {
      const customSize = 128;
      const customOctaves = 6;
      const customPersistence = 0.7;

      const texture = generatePerlinNoiseTexture(
        customSize,
        customOctaves,
        customPersistence,
      );

      expect(mockCanvas.width).toBe(customSize);
      expect(mockCanvas.height).toBe(customSize);
      expect(mockContext.createImageData).toHaveBeenCalledWith(
        customSize,
        customSize,
      );
      expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    });

    it('should throw error when canvas context is not available', () => {
      mockCanvas.getContext = jest.fn(() => null);

      expect(() => generatePerlinNoiseTexture()).toThrow(
        'Failed to get 2D context from canvas',
      );
    });

    it('should set proper texture properties', () => {
      const texture = generatePerlinNoiseTexture();

      expect(texture.wrapS).toBe(THREE.RepeatWrapping);
      expect(texture.wrapT).toBe(THREE.RepeatWrapping);
      expect(texture.generateMipmaps).toBe(true);
      expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
      expect(texture.magFilter).toBe(THREE.LinearFilter);
    });
  });

  describe('NoiseGenerator namespace', () => {
    it('should export the noise generation functions', () => {
      expect(NoiseGenerator.generateNoiseTexture).toBe(generateNoiseTexture);
      expect(NoiseGenerator.generatePerlinNoiseTexture).toBe(
        generatePerlinNoiseTexture,
      );
    });
  });
});
