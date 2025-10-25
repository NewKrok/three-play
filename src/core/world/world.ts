import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type {
  WorldConfig,
  WorldInstance,
  UpdateCallback,
} from '../../types/world';

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
 * Recursively dispose Three.js objects to free memory
 * @param obj - Three.js object to dispose
 */
const disposeObject = (obj: any) => {
  if (!obj) return;

  // Dispose geometry
  if (obj.geometry) {
    obj.geometry.dispose();
  }

  // Dispose material(s)
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach((material: any) => {
        disposeMaterial(material);
      });
    } else {
      disposeMaterial(obj.material);
    }
  }

  // Dispose texture
  if (obj.texture) {
    obj.texture.dispose();
  }

  // Dispose render target
  if (obj.renderTarget) {
    obj.renderTarget.dispose();
  }

  // Recursively dispose children
  if (obj.children) {
    [...obj.children].forEach((child: any) => {
      disposeObject(child);
    });
  }
};

/**
 * Dispose material and its textures
 * @param material - Three.js material to dispose
 */
const disposeMaterial = (material: any) => {
  if (!material) return;

  // Dispose all material textures
  Object.keys(material).forEach((key) => {
    const value = material[key];
    if (
      value &&
      typeof value === 'object' &&
      value.dispose &&
      typeof value.dispose === 'function'
    ) {
      // Check if it's a texture
      if (value.isTexture) {
        value.dispose();
      }
    }
  });

  // Dispose the material itself
  if (material.dispose) {
    material.dispose();
  }
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

  // Add initial callback if provided
  if (initialCallback) {
    updateCallbacks.add(initialCallback);
  }

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

      // Remove event listeners
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('resize', setCanvasSize);
      }

      // Dispose scene and all its children
      disposeObject(scene);

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
