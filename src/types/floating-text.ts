import type * as THREE from 'three';

/**
 * Configuration for a floating text instance
 */
export type FloatingTextConfig = {
  /** Text to display */
  text: string;
  /** Text color */
  color?: string;
  /** Font size in pixels */
  fontSize?: number;
  /** Font family */
  fontFamily?: string;
  /** Font weight (normal, bold, etc.) */
  fontWeight?: string;
  /** Duration of the animation in seconds */
  duration?: number;
  /** How high the text floats up */
  floatHeight?: number;
  /** Enable fade out animation */
  fadeOut?: boolean;
  /** Scale multiplier */
  scale?: number;
  /** Horizontal velocity (movement sideways) */
  velocityX?: number;
  /** Vertical velocity (custom float speed) */
  velocityY?: number;
};

/**
 * Active floating text instance
 */
export type FloatingText = {
  /** Sprite showing the text */
  sprite: THREE.Sprite;
  /** Start time of the animation */
  startTime: number;
  /** Initial position */
  startPosition: THREE.Vector3;
  /** Configuration */
  config: Required<FloatingTextConfig>;
  /** Custom velocity */
  velocity: THREE.Vector3;
};

/**
 * Floating text manager for displaying temporary text in 3D space
 * Can be used for damage numbers, healing, XP gain, item pickups, etc.
 */
export type FloatingTextManager = {
  /**
   * Show floating text at a position
   * @param position - 3D position in world space
   * @param config - Text configuration
   * @returns The created floating text instance
   */
  show: (
    position: THREE.Vector3,
    config: FloatingTextConfig,
  ) => FloatingText;

  /**
   * Update all active floating texts
   * @param deltaTime - Time since last frame in seconds
   * @param currentTime - Current time in seconds
   */
  update: (deltaTime: number, currentTime: number) => void;

  /**
   * Remove all floating texts
   */
  clear: () => void;

  /**
   * Get all active floating texts
   */
  getActiveTexts: () => FloatingText[];

  /**
   * Remove a specific floating text
   * @param floatingText - The floating text instance to remove
   */
  remove: (floatingText: FloatingText) => void;
};
