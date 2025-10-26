import * as THREE from 'three';
import { AssetLoader } from '../core/assets/asset-loader.js';
import type { AssetsConfig, AssetProgress } from '../types/assets.js';

// Mock THREE.js loaders
jest.mock('three', () => {
  const actualTHREE = jest.requireActual('three');
  return {
    ...actualTHREE,
    TextureLoader: jest.fn().mockImplementation(() => ({
      load: jest.fn(),
    })),
  };
});

jest.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: jest.fn().mockImplementation(() => ({
    load: jest.fn(),
  })),
}));

describe('AssetLoader', () => {
  let assetLoader: AssetLoader;
  let mockTextureLoader: any;
  let mockGLTFLoader: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mocks
    mockTextureLoader = {
      load: jest.fn(),
    };
    mockGLTFLoader = {
      load: jest.fn(),
    };

    // Mock the constructors
    (THREE.TextureLoader as unknown as jest.Mock).mockImplementation(
      () => mockTextureLoader,
    );
    const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');
    (GLTFLoader as unknown as jest.Mock).mockImplementation(
      () => mockGLTFLoader,
    );

    assetLoader = new AssetLoader();
  });

  afterEach(() => {
    assetLoader.destroy();
  });

  describe('onProgress', () => {
    it('should add and remove progress callbacks', () => {
      const callback = jest.fn();
      const unsubscribe = assetLoader.onProgress(callback);

      expect(typeof unsubscribe).toBe('function');

      // Test unsubscribe
      unsubscribe();

      // Callback should be removed (we can't directly test this without triggering progress)
      expect(unsubscribe).not.toThrow();
    });

    it('should handle multiple progress callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const unsubscribe1 = assetLoader.onProgress(callback1);
      const unsubscribe2 = assetLoader.onProgress(callback2);

      expect(typeof unsubscribe1).toBe('function');
      expect(typeof unsubscribe2).toBe('function');

      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('loadAssets', () => {
    it('should load empty assets config', async () => {
      const config: AssetsConfig = {};
      const progressCallback = jest.fn();

      assetLoader.onProgress(progressCallback);

      const result = await assetLoader.loadAssets(config);

      expect(result).toEqual({
        textures: {},
        models: {},
      });

      expect(progressCallback).toHaveBeenCalledWith({
        percentage: 100,
        loadedTextures: { current: 0, total: 0 },
        loadedModels: { current: 0, total: 0 },
        totalAssets: { current: 0, total: 0 },
      });
    });

    it('should load textures successfully', async () => {
      const mockTexture = new THREE.Texture();
      mockTextureLoader.load.mockImplementation(
        (url: string, onLoad: Function) => {
          setTimeout(() => onLoad(mockTexture), 10);
        },
      );

      const config: AssetsConfig = {
        textures: {
          grass: {
            url: '/textures/grass.jpg',
            flipY: false,
          },
        },
      };

      const progressCallback = jest.fn();
      assetLoader.onProgress(progressCallback);

      const result = await assetLoader.loadAssets(config);

      expect(result.textures.grass).toBe(mockTexture);
      expect(mockTextureLoader.load).toHaveBeenCalledWith(
        '/textures/grass.jpg',
        expect.any(Function),
        undefined,
        expect.any(Function),
      );

      expect(progressCallback).toHaveBeenCalledTimes(2); // Initial + final
      expect(progressCallback).toHaveBeenLastCalledWith({
        percentage: 100,
        loadedTextures: { current: 1, total: 1 },
        loadedModels: { current: 0, total: 0 },
        totalAssets: { current: 1, total: 1 },
      });
    });

    it('should load models successfully', async () => {
      const mockGLTF = {
        scene: new THREE.Object3D(),
        animations: [],
        cameras: [],
        asset: {},
        parser: null,
        userData: {},
      };

      mockGLTFLoader.load.mockImplementation(
        (url: string, onLoad: Function) => {
          setTimeout(() => onLoad(mockGLTF), 10);
        },
      );

      const config: AssetsConfig = {
        models: {
          tree: {
            url: '/models/tree.gltf',
            scale: 2,
          },
        },
      };

      const progressCallback = jest.fn();
      assetLoader.onProgress(progressCallback);

      const result = await assetLoader.loadAssets(config);

      expect(result.models.tree).toBe(mockGLTF);
      expect(mockGLTFLoader.load).toHaveBeenCalledWith(
        '/models/tree.gltf',
        expect.any(Function),
        undefined,
        expect.any(Function),
      );

      expect(progressCallback).toHaveBeenCalledTimes(2); // Initial + final
    });

    it('should handle texture loading errors', async () => {
      const error = new Error('Failed to load texture');
      mockTextureLoader.load.mockImplementation(
        (
          url: string,
          onLoad: Function,
          onProgress: Function,
          onError: Function,
        ) => {
          setTimeout(() => onError(error), 10);
        },
      );

      const config: AssetsConfig = {
        textures: {
          grass: {
            url: '/textures/invalid.jpg',
          },
        },
      };

      // Suppress console.error for this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(assetLoader.loadAssets(config)).rejects.toThrow(
        'Failed to load texture',
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle model loading errors', async () => {
      const error = new Error('Failed to load model');
      mockGLTFLoader.load.mockImplementation(
        (
          url: string,
          onLoad: Function,
          onProgress: Function,
          onError: Function,
        ) => {
          setTimeout(() => onError(error), 10);
        },
      );

      const config: AssetsConfig = {
        models: {
          tree: {
            url: '/models/invalid.gltf',
          },
        },
      };

      // Suppress console.error for this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(assetLoader.loadAssets(config)).rejects.toThrow(
        'Failed to load model',
      );

      consoleErrorSpy.mockRestore();
    });

    it('should apply texture configuration correctly', async () => {
      const mockTexture = {
        flipY: true,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        magFilter: THREE.NearestFilter,
        minFilter: THREE.NearestFilter,
        needsUpdate: false,
      };

      mockTextureLoader.load.mockImplementation(
        (url: string, onLoad: Function) => {
          setTimeout(() => onLoad(mockTexture), 10);
        },
      );

      const config: AssetsConfig = {
        textures: {
          grass: {
            url: '/textures/grass.jpg',
            flipY: false,
            wrapS: THREE.RepeatWrapping,
            wrapT: THREE.RepeatWrapping,
            magFilter: THREE.LinearFilter,
            minFilter: THREE.LinearMipmapLinearFilter,
          },
        },
      };

      await assetLoader.loadAssets(config);

      expect(mockTexture.flipY).toBe(false);
      expect(mockTexture.wrapS).toBe(THREE.RepeatWrapping);
      expect(mockTexture.wrapT).toBe(THREE.RepeatWrapping);
      expect(mockTexture.magFilter).toBe(THREE.LinearFilter);
      expect(mockTexture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
      expect(mockTexture.needsUpdate).toBe(true);
    });

    it('should apply model configuration correctly', async () => {
      const mockScene = new THREE.Object3D();
      const mockGLTF = {
        scene: mockScene,
        animations: [],
        cameras: [],
        asset: {},
        parser: null,
        userData: {},
      };

      mockGLTFLoader.load.mockImplementation(
        (url: string, onLoad: Function) => {
          setTimeout(() => onLoad(mockGLTF), 10);
        },
      );

      const config: AssetsConfig = {
        models: {
          tree: {
            url: '/models/tree.gltf',
            scale: [2, 3, 4],
            position: [1, 2, 3],
            rotation: [0.1, 0.2, 0.3],
          },
        },
      };

      await assetLoader.loadAssets(config);

      expect(mockScene.scale.x).toBe(2);
      expect(mockScene.scale.y).toBe(3);
      expect(mockScene.scale.z).toBe(4);
      expect(mockScene.position.x).toBe(1);
      expect(mockScene.position.y).toBe(2);
      expect(mockScene.position.z).toBe(3);
      expect(mockScene.rotation.x).toBe(0.1);
      expect(mockScene.rotation.y).toBe(0.2);
      expect(mockScene.rotation.z).toBe(0.3);
    });

    it('should track progress correctly for mixed assets', async () => {
      const mockTexture = new THREE.Texture();
      const mockGLTF = {
        scene: new THREE.Object3D(),
        animations: [],
        cameras: [],
        asset: {},
        parser: null,
        userData: {},
      };

      let textureResolve: Function | undefined;
      let modelResolve: Function | undefined;

      mockTextureLoader.load.mockImplementation(
        (url: string, onLoad: Function) => {
          textureResolve = () => onLoad(mockTexture);
        },
      );

      mockGLTFLoader.load.mockImplementation(
        (url: string, onLoad: Function) => {
          modelResolve = () => onLoad(mockGLTF);
        },
      );

      const config: AssetsConfig = {
        textures: {
          grass: { url: '/textures/grass.jpg' },
        },
        models: {
          tree: { url: '/models/tree.gltf' },
        },
      };

      const progressCallback = jest.fn();
      assetLoader.onProgress(progressCallback);

      const loadPromise = assetLoader.loadAssets(config);

      // Initial progress
      expect(progressCallback).toHaveBeenCalledWith({
        percentage: 0,
        loadedTextures: { current: 0, total: 1 },
        loadedModels: { current: 0, total: 1 },
        totalAssets: { current: 0, total: 2 },
      });

      // Resolve texture
      textureResolve!();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(progressCallback).toHaveBeenCalledWith({
        percentage: 50,
        loadedTextures: { current: 1, total: 1 },
        loadedModels: { current: 0, total: 1 },
        totalAssets: { current: 1, total: 2 },
      });

      // Resolve model
      modelResolve!();
      const result = await loadPromise;

      expect(progressCallback).toHaveBeenLastCalledWith({
        percentage: 100,
        loadedTextures: { current: 1, total: 1 },
        loadedModels: { current: 1, total: 1 },
        totalAssets: { current: 2, total: 2 },
      });

      expect(result.textures.grass).toBe(mockTexture);
      expect(result.models.tree).toBe(mockGLTF);
    });
  });

  describe('destroy', () => {
    it('should clear all progress callbacks', () => {
      const callback = jest.fn();
      assetLoader.onProgress(callback);

      assetLoader.destroy();

      // Should not throw
      expect(() => assetLoader.destroy()).not.toThrow();
    });
  });

  describe('error handling in callbacks', () => {
    it('should handle errors in progress callbacks gracefully', async () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      const workingCallback = jest.fn();

      // Suppress console.error for this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      assetLoader.onProgress(errorCallback);
      assetLoader.onProgress(workingCallback);

      const config: AssetsConfig = {};
      await assetLoader.loadAssets(config);

      expect(errorCallback).toHaveBeenCalled();
      expect(workingCallback).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in progress callback:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
