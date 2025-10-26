import { DisposeUtils } from '@newkrok/three-utils';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { loadHeightmap, createHeightmapUtils } from '../heightmap/index.js';
import { AssetLoader } from '../assets/index.js';
import type { HeightmapUtils, HeightmapConfig } from '../../types/heightmap.js';
import type {
  WorldConfig,
  WorldInstance,
  UpdateCallback,
} from '../../types/world.js';
import type {
  LoadedAssets,
  ProgressCallback,
  ReadyCallback,
  AssetsConfig,
} from '../../types/assets.js';

/**
 * Creates default post-processing passes
 * @param scene - The Three.js scene
 * @param camera - The Three.js camera
 * @returns Array of default passes
 */
const createDefaultPasses = (
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
) => {
  const passes = [];

  // Add render pass
  const renderPass = new RenderPass(scene, camera);
  passes.push(renderPass);

  // Add SSAO pass
  const ssaoPass = new SSAOPass(
    scene,
    camera,
    window.innerWidth,
    window.innerHeight,
  );
  ssaoPass.kernelRadius = 16;
  ssaoPass.minDistance = 0.005;
  ssaoPass.maxDistance = 0.1;
  ssaoPass.output = SSAOPass.OUTPUT.Default;
  passes.push(ssaoPass);

  // Add bloom pass
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5,
    0.4,
    0.85,
  );
  passes.push(bloomPass);

  // Add FXAA pass
  const fxaaPass = new ShaderPass(FXAAShader);
  fxaaPass.material.uniforms['resolution'].value.set(
    1 / window.innerWidth,
    1 / window.innerHeight,
  );
  passes.push(fxaaPass);

  // Add output pass
  const outputPass = new OutputPass();
  passes.push(outputPass);

  return passes;
};

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

  // Get heightmap configuration
  const heightmapConfig = config.heightmap;
  const heightmapUrl = heightmapConfig?.url;
  const shouldLoadHeightmap = Boolean(heightmapUrl);

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

  // Create composer conditionally
  let composer: EffectComposer | null = null;
  let ssaoPass: SSAOPass | null = null;
  let fxaaPass: ShaderPass | null = null;

  if (useComposer) {
    // Create render target for post-processing
    const renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
    );
    renderTarget.depthTexture = new THREE.DepthTexture(
      window.innerWidth,
      window.innerHeight,
    );
    renderTarget.depthTexture.format = THREE.DepthFormat;
    renderTarget.depthTexture.type = THREE.UnsignedShortType;

    // Create composer with post-processing effects
    composer = new EffectComposer(renderer, renderTarget);

    // Use custom passes or default passes
    const passes = customPasses || createDefaultPasses(scene, camera);

    passes.forEach((pass) => {
      composer!.addPass(pass);

      // Store references to passes that need resize handling
      if (pass instanceof SSAOPass) {
        ssaoPass = pass;
      } else if (
        pass instanceof ShaderPass &&
        pass.material.uniforms['resolution']
      ) {
        fxaaPass = pass;
      }
    });
  }

  // Resize handler
  const setCanvasSize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (composer) {
      composer.setSize(window.innerWidth, window.innerHeight);

      if (ssaoPass) {
        ssaoPass.setSize(window.innerWidth, window.innerHeight);
      }

      if (fxaaPass) {
        fxaaPass.material.uniforms['resolution'].value.set(
          1 / window.innerWidth,
          1 / window.innerHeight,
        );
      }
    }
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

  // Heightmap system
  let heightmapUtils: HeightmapUtils | null = null;

  // Asset loading system
  const assetLoader = new AssetLoader();
  let loadedAssets: LoadedAssets | null = null;
  const progressCallbacks = new Set<ProgressCallback>();
  const readyCallbacks = new Set<ReadyCallback>();

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

  // Load heightmap automatically if configured
  const initializeHeightmap = async () => {
    if (shouldLoadHeightmap && heightmapUrl && heightmapConfig) {
      try {
        // Create config using world dimensions
        const finalConfig: HeightmapConfig = {
          worldWidth: worldConfig.world.size.x,
          worldHeight: worldConfig.world.size.y,
          resolution: heightmapConfig.resolution ?? 256,
          elevationRatio: heightmapConfig.elevationRatio ?? 30,
        };

        const heightmapData = await loadHeightmap(heightmapUrl);
        heightmapUtils = createHeightmapUtils(heightmapData, finalConfig);
      } catch (error) {
        console.error('Failed to auto-load heightmap:', error);
      }
    }
  };

  // Start auto-loading heightmap if configured
  if (shouldLoadHeightmap) {
    initializeHeightmap();
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
      return heightmapUtils;
    },

    /**
     * Get the loaded assets
     * @returns The loaded assets instance or null if not loaded
     */
    getLoadedAssets(): LoadedAssets | null {
      return loadedAssets;
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

      // Cleanup asset loader
      assetLoader.destroy();

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

      // Dispose composer and its render targets
      if (composer) {
        // Dispose render targets
        composer.passes.forEach((pass: any) => {
          if (pass.renderTarget) {
            pass.renderTarget.dispose();
          }
          if (pass.renderToScreen === false && pass.renderTarget) {
            pass.renderTarget.dispose();
          }
        });

        // Clear passes
        composer.passes.length = 0;
      }

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
