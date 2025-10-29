import * as THREE from 'three';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import type { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import type { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import type { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';

/**
 * Simple and flexible outline configuration
 */
export type OutlineConfig = {
  color?: string; // Outline color (visible and hidden edge color)
  visibleColor?: string; // Visible edge color (overrides color)
  hiddenColor?: string; // Hidden edge color (overrides color)
  strength?: number; // Edge strength (0-10, default: 1)
  thickness?: number; // Edge thickness (0-10, default: 1)
  glow?: number; // Edge glow (0-1, default: 0)
  pulse?: boolean | number; // Pulse animation (true/false or pulse period)
  priority?: number; // Priority for overlapping outlines (higher wins)
  enabled?: boolean; // Enable/disable without removing (default: true)
};

/**
 * Object outline entry for internal management
 */
export type OutlineEntry = {
  object: THREE.Object3D;
  config: Required<OutlineConfig>;
  id: string; // Unique identifier for this outline entry
};

/**
 * Configuration for post-processing setup
 */
export type PostProcessingConfig = {
  useComposer: boolean;
  customPasses?: Pass[];
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
};

/**
 * Post-processing manager for handling passes and composer
 */
export type PostProcessingManager = {
  composer: EffectComposer | null;
  ssaoPass: SSAOPass | null;
  outlinePass: OutlinePass | null;
  fxaaPass: ShaderPass | null;
  setSize: (width: number, height: number) => void;
  destroy: () => void;
};
