import * as THREE from 'three';
import { SkeletonUtils } from 'three/examples/jsm/Addons.js';
import type { LoadedAssets } from '../../types/assets.js';
import type { UnitDefinition } from '../../types/units.js';

/**
 * Character asset utilities for creating and managing character models and animations
 * Generic implementation that works with any unit definition
 */
export const CharacterAssetUtils = {
  /**
   * Create a character instance from unit definition
   * @param definition Unit definition containing model asset references
   * @param loadedAssets Loaded assets from the world instance
   */
  createInstance: (definition: UnitDefinition, loadedAssets: LoadedAssets) => {
    // Get base model from definition
    const baseModel = loadedAssets.models[definition.modelAssets.baseModel] as THREE.Group;
    
    if (!baseModel) {
      throw new Error(`Base model '${definition.modelAssets.baseModel}' not found in loaded assets`);
    }

    const instance = SkeletonUtils.clone(baseModel);
    
    // Create wrapper group
    const wrapper = new THREE.Group();
    wrapper.add(instance);

    // Apply appearance settings from definition
    if (definition.appearance?.scale) {
      wrapper.scale.setScalar(definition.appearance.scale);
    }
    
    if (definition.appearance?.rotation !== undefined) {
      wrapper.rotation.y = definition.appearance.rotation;
    }

    // Create animation mixer
    const mixer = new THREE.AnimationMixer(instance);

    // Build animations from definition
    const animations: Record<string, THREE.AnimationClip> = {};
    for (const [animationName, assetKey] of Object.entries(definition.modelAssets.animations)) {
      const animationAsset = loadedAssets.models[assetKey] as THREE.Group;
      if (animationAsset && animationAsset.animations && animationAsset.animations[0]) {
        animations[animationName] = animationAsset.animations[0];
      }
    }

    // Setup animation actions
    const actions = CharacterAssetUtils.setupAnimations(mixer, animations);

    // Setup shadows based on definition
    CharacterAssetUtils.setupShadows(instance, definition);

    // Apply material modifier if provided
    if (definition.appearance?.materialModifier) {
      definition.appearance.materialModifier(wrapper);
    }

    return {
      model: wrapper,
      mixer,
      actions,
      userData: {}
    };
  },

  /**
   * Setup animations for a character instance
   * @param mixer Animation mixer
   * @param animations Map of animation clips
   */
  setupAnimations: (mixer: THREE.AnimationMixer, animations: Record<string, THREE.AnimationClip>) => {
    const actions: Record<string, THREE.AnimationAction> = {};

    // Create actions for available animations
    Object.entries(animations).forEach(([name, clip]) => {
      if (clip) {
        actions[name] = mixer.clipAction(clip);
      }
    });

    return actions;
  },

  /**
   * Setup shadows for character meshes
   * @param instance Character instance to setup shadows for
   * @param definition Unit definition for shadow settings
   */
  setupShadows: (instance: THREE.Object3D, definition: UnitDefinition) => {
    // Default to true for shadows if not specified
    const castShadow = true;
    const receiveShadow = true;

    instance.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = castShadow;
        mesh.receiveShadow = receiveShadow;
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => mat.needsUpdate = true);
          } else {
            mesh.material.needsUpdate = true;
          }
        }
      }
    });
  }
};