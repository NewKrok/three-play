import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { WorldConfig, WorldInstance } from '../../types/world';

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

  // Add basic lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
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
  };
};

export default createWorld;
