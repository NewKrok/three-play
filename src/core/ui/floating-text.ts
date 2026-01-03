import * as THREE from 'three';
import type {
  FloatingTextConfig,
  FloatingText,
  FloatingTextManager,
} from '../../types/floating-text.js';

const DEFAULT_CONFIG: Required<FloatingTextConfig> = {
  text: '',
  color: '#ffffff',
  fontSize: 48,
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'bold',
  duration: 1.5,
  floatHeight: 2.0,
  fadeOut: true,
  scale: 1.0,
  velocityX: 0,
  velocityY: 0,
};

/**
 * Create a canvas texture with text
 */
const createTextTexture = (
  text: string,
  config: Required<FloatingTextConfig>,
): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not get 2D context');

  // Set up font
  context.font = `${config.fontWeight} ${config.fontSize}px ${config.fontFamily}`;

  // Measure text to size canvas appropriately
  const metrics = context.measureText(text);
  const textWidth = metrics.width;
  const textHeight = config.fontSize * 1.2; // Add some padding

  // Set canvas size (power of 2 for better performance)
  canvas.width = Math.pow(2, Math.ceil(Math.log2(textWidth + 20)));
  canvas.height = Math.pow(2, Math.ceil(Math.log2(textHeight + 20)));

  // Re-apply font after canvas resize
  context.font = `${config.fontWeight} ${config.fontSize}px ${config.fontFamily}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  // Draw text with outline
  context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  context.lineWidth = config.fontSize * 0.1;
  context.strokeText(text, canvas.width / 2, canvas.height / 2);

  context.fillStyle = config.color;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
};

/**
 * Create a floating text manager
 * @param scene - Three.js scene to add floating texts to
 * @returns FloatingTextManager instance
 *
 * @example
 * ```typescript
 * const floatingTextManager = createFloatingTextManager(scene);
 *
 * // Show damage
 * floatingTextManager.show(position, {
 *   text: '-50',
 *   color: '#ff0000',
 *   fontSize: 48,
 * });
 *
 * // Show healing
 * floatingTextManager.show(position, {
 *   text: '+25',
 *   color: '#00ff00',
 *   fontSize: 42,
 * });
 *
 * // Show XP gain
 * floatingTextManager.show(position, {
 *   text: '+100 XP',
 *   color: '#ffff00',
 *   fontSize: 36,
 *   floatHeight: 3.0,
 * });
 *
 * // Update in your game loop
 * floatingTextManager.update(deltaTime, currentTime);
 * ```
 */
export const createFloatingTextManager = (
  scene: THREE.Scene,
): FloatingTextManager => {
  const activeTexts: FloatingText[] = [];

  /**
   * Show floating text at a position
   */
  const show = (
    position: THREE.Vector3,
    config: FloatingTextConfig,
  ): FloatingText => {
    const fullConfig: Required<FloatingTextConfig> = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    // Create texture
    const texture = createTextTexture(fullConfig.text, fullConfig);

    // Create sprite material
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    // Create sprite
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);

    // Scale based on config
    const baseScale = 0.5 * fullConfig.scale;
    sprite.scale.set(baseScale, baseScale, 1);

    scene.add(sprite);

    // Calculate velocity
    const velocity = new THREE.Vector3(
      fullConfig.velocityX,
      fullConfig.velocityY || fullConfig.floatHeight / fullConfig.duration,
      0,
    );

    const floatingText: FloatingText = {
      sprite,
      startTime: performance.now() / 1000,
      startPosition: position.clone(),
      config: fullConfig,
      velocity,
    };

    activeTexts.push(floatingText);

    return floatingText;
  };

  /**
   * Update all active floating texts
   */
  const update = (deltaTime: number, currentTime: number): void => {
    for (let i = activeTexts.length - 1; i >= 0; i--) {
      const floatingText = activeTexts[i];
      const { sprite, startTime, startPosition, config, velocity } =
        floatingText;

      const elapsed = currentTime - startTime;

      if (elapsed >= config.duration) {
        // Animation complete - remove
        scene.remove(sprite);
        sprite.material.map?.dispose();
        sprite.material.dispose();
        activeTexts.splice(i, 1);
        continue;
      }

      // Update position with velocity
      sprite.position.x += velocity.x * deltaTime;
      sprite.position.y += velocity.y * deltaTime;
      sprite.position.z += velocity.z * deltaTime;

      // Update opacity with fade out
      if (config.fadeOut) {
        const fadeStart = config.duration * 0.5;
        if (elapsed > fadeStart) {
          const fadeProgress = (elapsed - fadeStart) / (config.duration - fadeStart);
          sprite.material.opacity = 1 - fadeProgress;
        }
      }
    }
  };

  /**
   * Remove all floating texts
   */
  const clear = (): void => {
    for (const floatingText of activeTexts) {
      scene.remove(floatingText.sprite);
      floatingText.sprite.material.map?.dispose();
      floatingText.sprite.material.dispose();
    }
    activeTexts.length = 0;
  };

  /**
   * Get all active floating texts
   */
  const getActiveTexts = (): FloatingText[] => {
    return [...activeTexts];
  };

  return {
    show,
    update,
    clear,
    getActiveTexts,
  };
};
