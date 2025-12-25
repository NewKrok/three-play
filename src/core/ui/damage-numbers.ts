import * as THREE from 'three';
import type { DamageResult } from '../../types/combat.js';

/**
 * Damage number configuration
 */
export type DamageNumberConfig = {
  /** Font size */
  fontSize?: number;
  /** Font family */
  fontFamily?: string;
  /** Normal damage color */
  normalColor?: string;
  /** Critical hit color */
  criticalColor?: string;
  /** Duration of the animation in seconds */
  duration?: number;
  /** How high the number floats up */
  floatHeight?: number;
  /** Enable fade out animation */
  fadeOut?: boolean;
  /** Scale multiplier for critical hits */
  criticalScale?: number;
};

/**
 * Active damage number instance
 */
export type DamageNumber = {
  /** Sprite showing the damage */
  sprite: THREE.Sprite;
  /** Start time of the animation */
  startTime: number;
  /** Initial position */
  startPosition: THREE.Vector3;
  /** Configuration */
  config: Required<DamageNumberConfig>;
  /** Whether this was a critical hit */
  isCritical: boolean;
};

/**
 * Damage numbers manager
 */
export type DamageNumbersManager = {
  /** Show a damage number at a position */
  showDamage: (
    position: THREE.Vector3,
    damageResult: DamageResult,
    config?: DamageNumberConfig,
  ) => DamageNumber;
  /** Update all active damage numbers */
  update: (deltaTime: number, currentTime: number) => void;
  /** Remove all damage numbers */
  clear: () => void;
};

const DEFAULT_CONFIG: Required<DamageNumberConfig> = {
  fontSize: 48,
  fontFamily: 'Arial, sans-serif',
  normalColor: '#ffffff',
  criticalColor: '#ff0000',
  duration: 1.5,
  floatHeight: 2.0,
  fadeOut: true,
  criticalScale: 1.5,
};

/**
 * Create a canvas texture with damage text
 */
const createDamageTexture = (
  damage: number,
  isCritical: boolean,
  config: Required<DamageNumberConfig>,
): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not get 2D context');

  // Set canvas size
  const scale = isCritical ? config.criticalScale : 1.0;
  canvas.width = 256;
  canvas.height = 128;

  // Configure text
  context.font = `bold ${config.fontSize * scale}px ${config.fontFamily}`;
  context.fillStyle = isCritical ? config.criticalColor : config.normalColor;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  // Add stroke for better visibility
  context.strokeStyle = '#000000';
  context.lineWidth = 4;
  context.strokeText(
    Math.floor(damage).toString(),
    canvas.width / 2,
    canvas.height / 2,
  );
  context.fillText(
    Math.floor(damage).toString(),
    canvas.width / 2,
    canvas.height / 2,
  );

  // Add "CRITICAL!" text for critical hits
  if (isCritical) {
    context.font = `bold ${config.fontSize * 0.5}px ${config.fontFamily}`;
    context.fillStyle = config.criticalColor;
    context.strokeText('CRITICAL!', canvas.width / 2, canvas.height / 2 - 40);
    context.fillText('CRITICAL!', canvas.width / 2, canvas.height / 2 - 40);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

/**
 * Create a damage numbers manager
 */
export const createDamageNumbersManager = (
  scene: THREE.Scene,
): DamageNumbersManager => {
  const activeDamageNumbers: DamageNumber[] = [];

  const showDamage = (
    position: THREE.Vector3,
    damageResult: DamageResult,
    config: DamageNumberConfig = {},
  ): DamageNumber => {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };

    // Create texture with damage text
    const texture = createDamageTexture(
      damageResult.finalDamage,
      damageResult.wasCritical,
      fullConfig,
    );

    // Create sprite material
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });

    // Create sprite
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 1, 1);
    if (damageResult.wasCritical) {
      sprite.scale.multiplyScalar(fullConfig.criticalScale);
    }

    // Position sprite
    sprite.position.copy(position);
    sprite.position.y += 1.5; // Start slightly above the unit

    // Set render order to render on top
    sprite.renderOrder = 1002;

    // Add to scene
    scene.add(sprite);

    const damageNumber: DamageNumber = {
      sprite,
      startTime: performance.now() / 1000,
      startPosition: sprite.position.clone(),
      config: fullConfig,
      isCritical: damageResult.wasCritical,
    };

    activeDamageNumbers.push(damageNumber);
    return damageNumber;
  };

  const update = (deltaTime: number, currentTime: number): void => {
    const toRemove: DamageNumber[] = [];

    for (const damageNumber of activeDamageNumbers) {
      const elapsed = currentTime - damageNumber.startTime;
      const progress = Math.min(elapsed / damageNumber.config.duration, 1.0);

      // Animate upward movement
      const floatProgress = progress;
      damageNumber.sprite.position.y =
        damageNumber.startPosition.y +
        damageNumber.config.floatHeight * floatProgress;

      // Add slight horizontal drift
      const drift = Math.sin(elapsed * 2) * 0.1;
      damageNumber.sprite.position.x = damageNumber.startPosition.x + drift;

      // Fade out
      if (damageNumber.config.fadeOut) {
        const fadeStart = 0.5; // Start fading at 50% of duration
        if (progress > fadeStart) {
          const fadeProgress = (progress - fadeStart) / (1 - fadeStart);
          damageNumber.sprite.material.opacity = 1.0 - fadeProgress;
        }
      }

      // Scale animation for critical hits
      if (damageNumber.isCritical && progress < 0.2) {
        const scaleProgress = progress / 0.2;
        const scale =
          (1.0 + Math.sin(scaleProgress * Math.PI) * 0.2) *
          damageNumber.config.criticalScale;
        damageNumber.sprite.scale.set(2 * scale, 1 * scale, 1);
      }

      // Mark for removal if finished
      if (progress >= 1.0) {
        toRemove.push(damageNumber);
      }
    }

    // Remove finished damage numbers
    for (const damageNumber of toRemove) {
      scene.remove(damageNumber.sprite);
      damageNumber.sprite.material.map?.dispose();
      damageNumber.sprite.material.dispose();

      const index = activeDamageNumbers.indexOf(damageNumber);
      if (index !== -1) {
        activeDamageNumbers.splice(index, 1);
      }
    }
  };

  const clear = (): void => {
    for (const damageNumber of activeDamageNumbers) {
      scene.remove(damageNumber.sprite);
      damageNumber.sprite.material.map?.dispose();
      damageNumber.sprite.material.dispose();
    }
    activeDamageNumbers.length = 0;
  };

  return {
    showDamage,
    update,
    clear,
  };
};
