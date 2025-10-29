import * as THREE from 'three';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { createDefaultPasses } from '../core/effects/post-processing-passes.js';

// Mock window object for testing
global.window = {
  innerWidth: 1024,
  innerHeight: 768,
} as any;

describe('Post-processing Passes', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      75,
      global.window.innerWidth / global.window.innerHeight,
      0.1,
      1000,
    );
  });

  afterEach(() => {
    scene.clear();
  });

  describe('createDefaultPasses', () => {
    it('should create the correct number of default passes', () => {
      const passes = createDefaultPasses(scene, camera);

      expect(passes).toHaveLength(6);
    });

    it('should create passes in the correct order', () => {
      const passes = createDefaultPasses(scene, camera);

      expect(passes[0]).toBeInstanceOf(RenderPass);
      expect(passes[1]).toBeInstanceOf(SSAOPass);
      expect(passes[2]).toBeInstanceOf(OutlinePass);
      expect(passes[3]).toBeInstanceOf(UnrealBloomPass);
      expect(passes[4]).toBeInstanceOf(ShaderPass);
      expect(passes[5]).toBeInstanceOf(OutputPass);
    });

    it('should configure SSAO pass with correct settings', () => {
      const passes = createDefaultPasses(scene, camera);
      const ssaoPass = passes[1] as SSAOPass;

      expect(ssaoPass.kernelRadius).toBe(16);
      expect(ssaoPass.minDistance).toBe(0.005);
      expect(ssaoPass.maxDistance).toBe(0.1);
      expect(ssaoPass.output).toBe(SSAOPass.OUTPUT.Default);
    });

    it('should configure outline pass with correct settings', () => {
      const passes = createDefaultPasses(scene, camera);
      const outlinePass = passes[2] as OutlinePass;

      expect(outlinePass.edgeStrength).toBe(1.0);
      expect(outlinePass.edgeGlow).toBe(0.0);
      expect(outlinePass.edgeThickness).toBe(1.0);
      expect(outlinePass.pulsePeriod).toBe(0);
    });
  });
});
