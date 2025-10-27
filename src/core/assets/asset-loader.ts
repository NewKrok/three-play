import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type {
  AssetsConfig,
  LoadedAssets,
  LoadedModel,
  AssetProgress,
  ProgressCallback,
  TextureAssetConfig,
  ModelAssetConfig,
} from '../../types/assets.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Asset loader utility for handling texture and model loading with progress tracking
 */
export class AssetLoader {
  private textureLoader: THREE.TextureLoader;
  private gltfLoader: GLTFLoader;
  private fbxLoader: FBXLoader;
  private progressCallbacks = new Set<ProgressCallback>();

  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.gltfLoader = new GLTFLoader();
    this.fbxLoader = new FBXLoader();
  }

  /**
   * Subscribe to loading progress updates
   * @param callback - Function to call on progress updates
   * @returns Unsubscribe function
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  /**
   * Notify all progress callbacks
   * @param progress - Current progress information
   */
  private notifyProgress(progress: AssetProgress): void {
    this.progressCallbacks.forEach((callback) => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }

  /**
   * Determine model type based on file extension
   */
  private getModelType(url: string): 'gltf' | 'fbx' | 'unknown' {
    const extension = url.toLowerCase().split('.').pop();
    if (extension === 'gltf' || extension === 'glb') {
      return 'gltf';
    }
    if (extension === 'fbx') {
      return 'fbx';
    }
    return 'unknown';
  }

  /**
   * Apply common configuration to model scene
   */
  private applyModelConfiguration(
    scene: THREE.Object3D,
    config: ModelAssetConfig,
  ): void {
    if (config.scale !== undefined) {
      const scale = Array.isArray(config.scale)
        ? config.scale
        : [config.scale, config.scale, config.scale];
      scene.scale.set(scale[0], scale[1], scale[2]);
    }

    if (config.position !== undefined) {
      scene.position.set(
        config.position[0],
        config.position[1],
        config.position[2],
      );
    }

    if (config.rotation !== undefined) {
      scene.rotation.set(
        config.rotation[0],
        config.rotation[1],
        config.rotation[2],
      );
    }
  }

  /**
   * Load a single texture with configuration
   * @param url - Texture URL
   * @param config - Texture configuration
   * @returns Promise that resolves to the loaded texture
   */
  private loadTexture(
    url: string,
    config: TextureAssetConfig,
  ): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          // Apply configuration
          if (config.flipY !== undefined) texture.flipY = config.flipY;
          if (config.wrapS !== undefined) texture.wrapS = config.wrapS;
          if (config.wrapT !== undefined) texture.wrapT = config.wrapT;
          if (config.magFilter !== undefined)
            texture.magFilter =
              config.magFilter as THREE.MagnificationTextureFilter;
          if (config.minFilter !== undefined)
            texture.minFilter =
              config.minFilter as THREE.MinificationTextureFilter;

          texture.needsUpdate = true;
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error(`Failed to load texture: ${url}`, error);
          reject(error);
        },
      );
    });
  }

  /**
   * Load a single model with configuration
   * @param url - Model URL
   * @param config - Model configuration
   * @returns Promise that resolves to the loaded model (GLTF or Group)
   */
  private loadModel(
    url: string,
    config: ModelAssetConfig,
  ): Promise<LoadedModel> {
    const modelType = this.getModelType(url);

    if (modelType === 'gltf') {
      return this.loadGLTFModel(url, config);
    } else if (modelType === 'fbx') {
      return this.loadFBXModel(url, config);
    } else {
      return Promise.reject(new Error(`Unsupported model format: ${url}`));
    }
  }

  /**
   * Load a GLTF model
   */
  private loadGLTFModel(url: string, config: ModelAssetConfig): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          this.applyModelConfiguration(gltf.scene, config);
          resolve(gltf);
        },
        undefined,
        (error) => {
          console.error(`Failed to load GLTF model: ${url}`, error);
          reject(error);
        },
      );
    });
  }

  /**
   * Load an FBX model
   */
  private loadFBXModel(
    url: string,
    config: ModelAssetConfig,
  ): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.fbxLoader.load(
        url,
        (group) => {
          this.applyModelConfiguration(group, config);
          resolve(group);
        },
        undefined,
        (error) => {
          console.error(`Failed to load FBX model: ${url}`, error);
          reject(error);
        },
      );
    });
  }

  /**
   * Load all assets from configuration with progress tracking
   * @param config - Assets configuration
   * @returns Promise that resolves to loaded assets
   */
  async loadAssets(config: AssetsConfig): Promise<LoadedAssets> {
    const textureEntries = Object.entries(config.textures || {});
    const modelEntries = Object.entries(config.models || {});
    const totalTextures = textureEntries.length;
    const totalModels = modelEntries.length;
    const totalAssets = totalTextures + totalModels;

    let loadedTexturesCount = 0;
    let loadedModelsCount = 0;

    const loadedAssets: LoadedAssets = {
      textures: {},
      models: {},
    };

    const updateProgress = () => {
      const progress: AssetProgress = {
        percentage:
          totalAssets === 0
            ? 100
            : Math.round(
                ((loadedTexturesCount + loadedModelsCount) / totalAssets) * 100,
              ),
        loadedTextures: {
          current: loadedTexturesCount,
          total: totalTextures,
        },
        loadedModels: {
          current: loadedModelsCount,
          total: totalModels,
        },
        totalAssets: {
          current: loadedTexturesCount + loadedModelsCount,
          total: totalAssets,
        },
      };

      this.notifyProgress(progress);
    };

    // Initial progress
    updateProgress();

    // Load all textures
    const texturePromises = textureEntries.map(async ([key, textureConfig]) => {
      try {
        const texture = await this.loadTexture(
          textureConfig.url,
          textureConfig,
        );
        loadedAssets.textures[key] = texture;
        loadedTexturesCount++;
        updateProgress();
      } catch (error) {
        console.error(`Failed to load texture '${key}':`, error);
        throw error;
      }
    });

    // Load all models
    const modelPromises = modelEntries.map(async ([key, modelConfig]) => {
      try {
        const model = await this.loadModel(modelConfig.url, modelConfig);
        loadedAssets.models[key] = model;
        loadedModelsCount++;
        updateProgress();
      } catch (error) {
        console.error(`Failed to load model '${key}':`, error);
        throw error;
      }
    });

    // Wait for all assets to load
    await Promise.all([...texturePromises, ...modelPromises]);

    return loadedAssets;
  }

  /**
   * Clean up all progress callbacks
   */
  destroy(): void {
    this.progressCallbacks.clear();
  }
}
