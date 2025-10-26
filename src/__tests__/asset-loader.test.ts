import * as THREE from 'three';
import { AssetLoader } from '../core/assets/asset-loader.js';
import type { AssetsConfig } from '../types/assets.js';

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

jest.mock('three/examples/jsm/loaders/FBXLoader.js', () => ({
  FBXLoader: jest.fn().mockImplementation(() => ({
    load: jest.fn(),
  })),
}));

describe('AssetLoader', () => {
  let assetLoader: AssetLoader;
  let mockTextureLoader: any;
  let mockGLTFLoader: any;
  let mockFBXLoader: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mocks
    mockTextureLoader = {
      load: jest.fn(),
    };
    mockGLTFLoader = {
      load: jest.fn(),
    };
    mockFBXLoader = {
      load: jest.fn(),
    };

    // Mock the constructors
    (THREE.TextureLoader as unknown as jest.Mock).mockImplementation(
      () => mockTextureLoader,
    );
    const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');
    const { FBXLoader } = require('three/examples/jsm/loaders/FBXLoader.js');
    (GLTFLoader as unknown as jest.Mock).mockImplementation(
      () => mockGLTFLoader,
    );
    (FBXLoader as unknown as jest.Mock).mockImplementation(() => mockFBXLoader);

    assetLoader = new AssetLoader();
  });

  afterEach(() => {
    assetLoader.destroy();
  });

  describe('loadAssets', () => {
    it('should load empty assets config', async () => {
      const config: AssetsConfig = {};
      const result = await assetLoader.loadAssets(config);

      expect(result).toEqual({
        textures: {},
        models: {},
      });
    });

    it('should load GLTF models successfully', async () => {
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

      const result = await assetLoader.loadAssets(config);

      expect(result.models.tree).toBe(mockGLTF);
      expect(mockGLTFLoader.load).toHaveBeenCalledWith(
        '/models/tree.gltf',
        expect.any(Function),
        undefined,
        expect.any(Function),
      );
    });

    it('should load FBX models successfully', async () => {
      const mockFBXGroup = new THREE.Group();

      mockFBXLoader.load.mockImplementation((url: string, onLoad: Function) => {
        setTimeout(() => onLoad(mockFBXGroup), 10);
      });

      const config: AssetsConfig = {
        models: {
          character: {
            url: '/models/character.fbx',
            scale: [1, 2, 1],
          },
        },
      };

      const result = await assetLoader.loadAssets(config);

      expect(result.models.character).toBe(mockFBXGroup);
      expect(mockFBXLoader.load).toHaveBeenCalledWith(
        '/models/character.fbx',
        expect.any(Function),
        undefined,
        expect.any(Function),
      );
    });

    it('should reject unsupported model formats', async () => {
      const config: AssetsConfig = {
        models: {
          model: {
            url: '/models/model.obj',
          },
        },
      };

      await expect(assetLoader.loadAssets(config)).rejects.toThrow(
        'Unsupported model format: /models/model.obj',
      );
    });

    it('should apply GLTF model configuration correctly', async () => {
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

    it('should apply FBX model configuration correctly', async () => {
      const mockGroup = new THREE.Group();

      mockFBXLoader.load.mockImplementation((url: string, onLoad: Function) => {
        setTimeout(() => onLoad(mockGroup), 10);
      });

      const config: AssetsConfig = {
        models: {
          character: {
            url: '/models/character.fbx',
            scale: 1.5,
            position: [5, 0, 5],
            rotation: [0, Math.PI, 0],
          },
        },
      };

      await assetLoader.loadAssets(config);

      expect(mockGroup.scale.x).toBe(1.5);
      expect(mockGroup.scale.y).toBe(1.5);
      expect(mockGroup.scale.z).toBe(1.5);
      expect(mockGroup.position.x).toBe(5);
      expect(mockGroup.position.y).toBe(0);
      expect(mockGroup.position.z).toBe(5);
      expect(mockGroup.rotation.x).toBe(0);
      expect(mockGroup.rotation.y).toBe(Math.PI);
      expect(mockGroup.rotation.z).toBe(0);
    });
  });

  describe('onProgress', () => {
    it('should add and remove progress callbacks', () => {
      const callback = jest.fn();
      const unsubscribe = assetLoader.onProgress(callback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('destroy', () => {
    it('should clear all progress callbacks', () => {
      const callback = jest.fn();
      assetLoader.onProgress(callback);
      assetLoader.destroy();
      expect(() => assetLoader.destroy()).not.toThrow();
    });
  });
});
