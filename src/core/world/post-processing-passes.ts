import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import type { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type {
  PostProcessingConfig,
  PostProcessingManager,
} from '../../types/world.js';

/**
 * Creates default post-processing passes
 * @param scene - The Three.js scene
 * @param camera - The Three.js camera
 * @returns Array of default passes
 */
export const createDefaultPasses = (
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): Pass[] => {
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

  // Add outline pass for highlighted objects
  const outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera,
  );
  outlinePass.edgeStrength = 1.0;
  outlinePass.edgeGlow = 0.0;
  outlinePass.edgeThickness = 1.0;
  outlinePass.pulsePeriod = 0;
  outlinePass.visibleEdgeColor.set('#ffff00');
  outlinePass.hiddenEdgeColor.set('#ffff00');
  passes.push(outlinePass);

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
 * Creates and configures post-processing composer with passes
 * @param config - Configuration for post-processing setup
 * @returns Post-processing manager instance
 */
export const createPostProcessingManager = (
  config: PostProcessingConfig,
): PostProcessingManager => {
  const { useComposer, customPasses, renderer, scene, camera } = config;

  let composer: EffectComposer | null = null;
  let ssaoPass: SSAOPass | null = null;
  let outlinePass: OutlinePass | null = null;
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
        pass instanceof OutlinePass ||
        (pass as any).selectedObjects !== undefined
      ) {
        outlinePass = pass as OutlinePass;
      } else if (
        pass instanceof ShaderPass &&
        pass.material.uniforms['resolution']
      ) {
        fxaaPass = pass;
      }
    });
  }

  const setSize = (width: number, height: number) => {
    if (composer) {
      composer.setSize(width, height);

      if (ssaoPass) {
        ssaoPass.setSize(width, height);
      }

      if (outlinePass) {
        outlinePass.setSize(width, height);
      }

      if (fxaaPass) {
        fxaaPass.material.uniforms['resolution'].value.set(
          1 / width,
          1 / height,
        );
      }
    }
  };

  const destroy = () => {
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
  };

  return {
    composer,
    ssaoPass,
    outlinePass,
    fxaaPass,
    setSize,
    destroy,
  };
};
