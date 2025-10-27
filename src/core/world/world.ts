import { DisposeUtils } from '@newkrok/three-utils';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { AssetLoader } from '../assets/index.js';
import {
  createHeightmapIntegrationConfig,
  createHeightmapManager,
} from './heightmap-integration.js';
import { createPostProcessingManager } from './post-processing-passes.js';
import type {
  AssetsConfig,
  LoadedAssets,
  ProgressCallback,
  ReadyCallback,
} from '../../types/assets.js';
import type { HeightmapUtils } from '../../types/heightmap.js';
import type {
  HeightmapManager,
  OutlineConfig,
  OutlineEntry,
  UpdateCallback,
  WorldConfig,
  WorldInstance,
} from '../../types/world.js';

/**
 * Creates a new world instance based on the provided configuration
 * @param config - The world configuration object
 * @returns World instance with methods to interact with the world
 */
const createWorld = (config: WorldConfig): WorldInstance => {
  console.log('Creating world with config:', config);

  // Store the config in closure with deep copy to prevent external modifications
  const worldConfig = JSON.parse(JSON.stringify(config));

  // Get render configuration with defaults
  const useComposer = config.render?.useComposer ?? true;
  const customPasses = config.render?.customPasses;

  // Get light configuration with defaults
  const ambientLightConfig = {
    color: config.light?.ambient?.color ?? 0xffffff,
    intensity: config.light?.ambient?.intensity ?? 0.9,
  };
  const directionalLightConfig = {
    color: config.light?.directional?.color ?? 0xffffff,
    intensity: config.light?.directional?.intensity ?? 0.5,
  };

  // Get update configuration with defaults
  const autoStart = config.update?.autoStart ?? false;
  const initialCallback = config.update?.onUpdate;

  // Get heightmap configuration and create manager
  const heightmapIntegrationConfig = createHeightmapIntegrationConfig(config);
  const heightmapManager: HeightmapManager | null = heightmapIntegrationConfig
    ? createHeightmapManager(heightmapIntegrationConfig)
    : null;

  // Get assets configuration
  const assetsConfig = config.assets;
  const shouldLoadAssets = Boolean(assetsConfig);

  // Create renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Create scene with fog
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xccddee, 0.005);

  // Create camera
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    100,
  );

  // Create post-processing manager
  const postProcessingManager = createPostProcessingManager({
    useComposer,
    customPasses,
    renderer,
    scene,
    camera,
  });

  const { composer, outlinePass } = postProcessingManager;

  // Resize handler
  const setCanvasSize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    postProcessingManager.setSize(window.innerWidth, window.innerHeight);
  };

  setCanvasSize();
  window.addEventListener('resize', setCanvasSize);

  // Add lighting with configuration
  const ambientLight = new THREE.AmbientLight(
    ambientLightConfig.color,
    ambientLightConfig.intensity,
  );
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(
    directionalLightConfig.color,
    directionalLightConfig.intensity,
  );
  directionalLight.castShadow = true;
  directionalLight.shadow.bias = -0.001;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 200;
  directionalLight.shadow.mapSize.width = 4096;
  directionalLight.shadow.mapSize.height = 4096;
  scene.add(directionalLight);

  // Update loop system
  const clock = new THREE.Clock();
  const updateCallbacks = new Set<UpdateCallback>();
  let animationFrameId: number | null = null;
  let isRunning = false;
  let isPaused = false;
  let isDestroyed = false;

  // Asset loading system
  const assetLoader = new AssetLoader();
  let loadedAssets: LoadedAssets | null = null;
  const progressCallbacks = new Set<ProgressCallback>();
  const readyCallbacks = new Set<ReadyCallback>();

  // Outline management system
  const outlineEntries = new Map<string, OutlineEntry>();
  let outlineIdCounter = 0;

  // Helper function to generate unique outline IDs
  const generateOutlineId = (): string => {
    return `outline_${++outlineIdCounter}_${Date.now()}`;
  };

  // Helper function to apply outline configuration with defaults
  const getOutlineConfigWithDefaults = (
    config: OutlineConfig,
  ): Required<OutlineConfig> => {
    return {
      color: config.color ?? '#ffff00',
      visibleColor: config.visibleColor ?? config.color ?? '#ffff00',
      hiddenColor: config.hiddenColor ?? config.color ?? '#ffff00',
      strength: config.strength ?? 1.0,
      thickness: config.thickness ?? 1.0,
      glow: config.glow ?? 0.0,
      pulse: config.pulse ?? false,
      priority: config.priority ?? 0,
      enabled: config.enabled ?? true,
    };
  };

  // Function to update the outline pass with current highest priority settings
  const updateOutlinePass = () => {
    if (!outlinePass) return;

    // Get all enabled outlines sorted by priority (highest first)
    const enabledOutlines = Array.from(outlineEntries.values())
      .filter((entry) => entry.config.enabled)
      .sort((a, b) => b.config.priority - a.config.priority);

    if (enabledOutlines.length === 0) {
      // No outlines, clear the pass
      outlinePass.selectedObjects = [];
      return;
    }

    // Use the highest priority outline's configuration
    const highestPriorityConfig = enabledOutlines[0].config;

    // Collect all objects from enabled outlines
    const allObjects = enabledOutlines.map((entry) => entry.object);
    outlinePass.selectedObjects = allObjects;

    // Apply the highest priority configuration
    outlinePass.edgeStrength = highestPriorityConfig.strength;
    outlinePass.edgeGlow = highestPriorityConfig.glow;
    outlinePass.edgeThickness = highestPriorityConfig.thickness;

    // Handle pulse configuration
    if (typeof highestPriorityConfig.pulse === 'number') {
      outlinePass.pulsePeriod = highestPriorityConfig.pulse;
    } else if (highestPriorityConfig.pulse === true) {
      outlinePass.pulsePeriod = 1; // Default pulse period
    } else {
      outlinePass.pulsePeriod = 0; // No pulse
    }

    outlinePass.visibleEdgeColor.set(highestPriorityConfig.visibleColor);
    outlinePass.hiddenEdgeColor.set(highestPriorityConfig.hiddenColor);
  };

  // Add initial callback if provided
  if (initialCallback) {
    updateCallbacks.add(initialCallback);
  }

  // Asset loading functions
  const notifyProgress = (progress: any) => {
    progressCallbacks.forEach((callback) => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  };

  const notifyReady = (assets: LoadedAssets) => {
    readyCallbacks.forEach((callback) => {
      try {
        callback(assets);
      } catch (error) {
        console.error('Error in ready callback:', error);
      }
    });
  };

  const loadAssetsInternal = async (
    config: AssetsConfig,
  ): Promise<LoadedAssets> => {
    try {
      // Subscribe to asset loader progress
      const unsubscribeProgress = assetLoader.onProgress(notifyProgress);

      // Load assets
      const assets = await assetLoader.loadAssets(config);
      loadedAssets = assets;

      // Unsubscribe from progress
      unsubscribeProgress();

      // Notify ready callbacks
      notifyReady(assets);

      return assets;
    } catch (error) {
      console.error('Failed to load assets:', error);
      throw error;
    }
  };

  // Update loop function
  const updateLoop = () => {
    if (!isRunning || isPaused || isDestroyed) return;

    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Call all update callbacks
    updateCallbacks.forEach((callback) => {
      try {
        callback(deltaTime, elapsedTime);
      } catch (error) {
        console.error('Error in update callback:', error);
      }
    });

    // Render the scene
    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }

    animationFrameId = requestAnimationFrame(updateLoop);
  };

  // Update getter to use heightmap manager
  const getHeightmapUtils = (): HeightmapUtils | null => {
    return heightmapManager?.utils || null;
  };

  // Start auto-loading heightmap if configured
  if (heightmapManager) {
    heightmapManager.initialize().catch((error) => {
      console.error('Failed to auto-load heightmap:', error);
    });
  }

  // Start auto-loading assets if configured
  if (shouldLoadAssets && assetsConfig) {
    loadAssetsInternal(assetsConfig).catch((error) => {
      console.error('Failed to auto-load assets:', error);
    });
  }

  // Start the loop automatically if configured
  if (autoStart) {
    isRunning = true;
    clock.start();
    updateLoop();
  }

  return {
    /**
     * Get the world configuration in read-only mode
     * @returns The world configuration
     */
    getConfig(): Readonly<WorldConfig> {
      return worldConfig;
    },

    /**
     * Get the Three.js scene
     * @returns The scene instance
     */
    getScene(): THREE.Scene {
      return scene;
    },

    /**
     * Get the Three.js camera
     * @returns The camera instance
     */
    getCamera(): THREE.PerspectiveCamera {
      return camera;
    },

    /**
     * Get the Three.js renderer
     * @returns The renderer instance
     */
    getRenderer(): THREE.WebGLRenderer {
      return renderer;
    },

    /**
     * Get the effect composer for post-processing
     * @returns The composer instance or null if useComposer is false
     */
    getComposer(): EffectComposer | null {
      return composer;
    },

    /**
     * Get the ambient light
     * @returns The ambient light instance
     */
    getAmbientLight(): THREE.AmbientLight {
      return ambientLight;
    },

    /**
     * Get the directional light
     * @returns The directional light instance
     */
    getDirectionalLight(): THREE.DirectionalLight {
      return directionalLight;
    },

    /**
     * Get the heightmap utilities
     * @returns The heightmap utilities instance or null if not loaded
     */
    getHeightmapUtils(): HeightmapUtils | null {
      return getHeightmapUtils();
    },

    /**
     * Get the loaded assets
     * @returns The loaded assets instance or null if not loaded
     */
    getLoadedAssets(): LoadedAssets | null {
      return loadedAssets;
    },

    /**
     * Add outline to objects with flexible configuration
     * @param objects - Single object or array of objects to outline
     * @param config - Outline configuration
     * @returns Unique outline ID for management
     */
    addOutline(
      objects: THREE.Object3D | THREE.Object3D[],
      config: OutlineConfig,
    ): string {
      if (isDestroyed) {
        console.warn('Cannot add outline: world instance is destroyed');
        return '';
      }

      if (!outlinePass) {
        console.warn(
          'Outline pass is not available. Make sure useComposer is enabled.',
        );
        return '';
      }

      const objectArray = Array.isArray(objects) ? objects : [objects];
      const outlineId = generateOutlineId();
      const fullConfig = getOutlineConfigWithDefaults(config);

      // Create outline entries for each object
      objectArray.forEach((object) => {
        const entryId = `${outlineId}_${object.uuid}`;
        outlineEntries.set(entryId, {
          id: entryId,
          object,
          config: fullConfig,
        });
      });

      updateOutlinePass();
      return outlineId;
    },

    /**
     * Remove outline by ID
     * @param outlineId - The outline ID to remove
     */
    removeOutline(outlineId: string): void {
      if (isDestroyed) {
        console.warn('Cannot remove outline: world instance is destroyed');
        return;
      }

      // Remove all entries that start with this outline ID
      const keysToRemove = Array.from(outlineEntries.keys()).filter((key) =>
        key.startsWith(outlineId),
      );

      keysToRemove.forEach((key) => outlineEntries.delete(key));
      updateOutlinePass();
    },

    /**
     * Update existing outline configuration
     * @param outlineId - The outline ID to update
     * @param config - Partial configuration to update
     */
    updateOutline(outlineId: string, config: Partial<OutlineConfig>): void {
      if (isDestroyed) {
        console.warn('Cannot update outline: world instance is destroyed');
        return;
      }

      // Find all entries that start with this outline ID
      const entriesToUpdate = Array.from(outlineEntries.entries()).filter(
        ([key]) => key.startsWith(outlineId),
      );

      if (entriesToUpdate.length === 0) {
        console.warn(`Outline with ID ${outlineId} not found`);
        return;
      }

      // Update all matching entries
      entriesToUpdate.forEach(([key, entry]) => {
        const updatedConfig = getOutlineConfigWithDefaults({
          ...entry.config,
          ...config,
        });

        outlineEntries.set(key, {
          ...entry,
          config: updatedConfig,
        });
      });

      updateOutlinePass();
    },

    /**
     * Clear all outlines
     */
    clearOutlines(): void {
      if (isDestroyed) {
        console.warn('Cannot clear outlines: world instance is destroyed');
        return;
      }

      outlineEntries.clear();
      updateOutlinePass();
    },

    /**
     * Get all current outlines
     * @returns Array of outline entries
     */
    getOutlines(): OutlineEntry[] {
      if (isDestroyed) {
        console.warn('Cannot get outlines: world instance is destroyed');
        return [];
      }

      return Array.from(outlineEntries.values());
    },

    /**
     * Start the update loop
     */
    start(): void {
      if (isDestroyed) {
        console.warn('Cannot start: world instance is destroyed');
        return;
      }
      if (isRunning) return;

      isRunning = true;
      isPaused = false;
      clock.start();
      updateLoop();
    },

    /**
     * Pause the update loop
     */
    pause(): void {
      if (isDestroyed) return;

      isPaused = true;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    },

    /**
     * Resume the update loop
     */
    resume(): void {
      if (isDestroyed) {
        console.warn('Cannot resume: world instance is destroyed');
        return;
      }
      if (!isRunning || !isPaused) return;

      isPaused = false;
      updateLoop();
    },

    /**
     * Subscribe to update events
     * @param callback - Function to call on each update
     * @returns Unsubscribe function
     */
    onUpdate(callback: UpdateCallback): () => void {
      if (isDestroyed) {
        console.warn(
          'Cannot subscribe to update events: world instance is destroyed',
        );
        return () => {};
      }

      updateCallbacks.add(callback);

      // Return unsubscribe function
      return () => {
        updateCallbacks.delete(callback);
      };
    },

    /**
     * Subscribe to asset loading progress events
     * @param callback - Function to call on progress updates
     * @returns Unsubscribe function
     */
    onProgress(callback: ProgressCallback): () => void {
      if (isDestroyed) {
        console.warn(
          'Cannot subscribe to progress events: world instance is destroyed',
        );
        return () => {};
      }

      progressCallbacks.add(callback);

      // Return unsubscribe function
      return () => {
        progressCallbacks.delete(callback);
      };
    },

    /**
     * Subscribe to asset loading completion events
     * @param callback - Function to call when assets are loaded
     * @returns Unsubscribe function
     */
    onReady(callback: ReadyCallback): () => void {
      if (isDestroyed) {
        console.warn(
          'Cannot subscribe to ready events: world instance is destroyed',
        );
        return () => {};
      }

      readyCallbacks.add(callback);

      // Return unsubscribe function
      return () => {
        readyCallbacks.delete(callback);
      };
    },

    /**
     * Destroy the world instance and clean up all resources
     */
    destroy(): void {
      if (isDestroyed) return;

      // Set destroyed flag
      isDestroyed = true;

      // Stop update loop
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      isRunning = false;
      isPaused = false;

      // Clear all update callbacks
      updateCallbacks.clear();

      // Clear all asset loading callbacks
      progressCallbacks.clear();
      readyCallbacks.clear();

      // Clear outline entries
      outlineEntries.clear();

      // Cleanup asset loader
      assetLoader.destroy();

      // Cleanup heightmap manager
      if (heightmapManager) {
        heightmapManager.destroy();
      }

      // Cleanup post-processing
      postProcessingManager.destroy();

      // Dispose loaded assets
      if (loadedAssets) {
        // Dispose textures
        Object.values(loadedAssets.textures).forEach((texture) => {
          texture.dispose();
        });

        // Dispose models (they are already added to scene, so they'll be disposed with scene)
        loadedAssets = null;
      }

      // Remove event listeners
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('resize', setCanvasSize);
      }

      // Dispose scene and all its children using three-utils deepDispose
      DisposeUtils.deepDispose(scene);

      // Dispose renderer
      if (renderer && typeof renderer.dispose === 'function') {
        renderer.dispose();
      }

      // Force garbage collection if available
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }
    },
  };
};

export default createWorld;
