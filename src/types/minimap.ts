import type * as THREE from 'three';
import type { Unit } from './units.js';
import type { Interactable } from './interactions.js';

/**
 * Minimap position on screen
 */
export type MinimapPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Configuration for minimap creation
 */
export type MinimapConfig = {
  /** Whether minimap is enabled */
  enabled?: boolean;
  /** Canvas size in pixels */
  size?: number;
  /** Position on screen */
  position?: MinimapPosition;
  /** Zoom level (world units per pixel) */
  zoom?: number;
  /** Border width in pixels */
  borderWidth?: number;
  /** Border color */
  borderColor?: string;
  /** Background color */
  backgroundColor?: string;
  /** Terrain color */
  terrainColor?: string;
  /** Water color (if available) */
  waterColor?: string;
  /** Player unit color */
  playerColor?: string;
  /** Enemy unit color */
  enemyColor?: string;
  /** NPC unit color */
  npcColor?: string;
  /** Camera FOV color */
  cameraFovColor?: string;
  /** Interactable object color */
  interactableColor?: string;
  /** Opacity (0-1) */
  opacity?: number;
  /** Border radius in pixels */
  borderRadius?: number;
  /** Unit dot size in pixels */
  unitDotSize?: number;
  /** Interactable dot size in pixels */
  interactableDotSize?: number;
  /** Update frequency in milliseconds */
  updateFrequency?: number;
  /** Whether to show camera FOV indicator */
  showCameraFov?: boolean;
  /** Whether to show terrain */
  showTerrain?: boolean;
  /** Whether to show units */
  showUnits?: boolean;
  /** Whether to show interactables */
  showInteractables?: boolean;
  /** Custom CSS for container */
  customStyles?: Partial<CSSStyleDeclaration>;
};

/**
 * Internal minimap state
 */
export type MinimapState = {
  /** Canvas element */
  canvas: HTMLCanvasElement;
  /** 2D rendering context */
  context: CanvasRenderingContext2D;
  /** Container div element */
  container: HTMLDivElement;
  /** Is minimap visible */
  isVisible: boolean;
  /** Last update timestamp */
  lastUpdateTime: number;
  /** Cached terrain image data */
  terrainImageData?: ImageData;
};

/**
 * Minimap manager instance
 */
export type MinimapManager = {
  /**
   * Update minimap display
   * @param camera - Three.js camera for FOV calculation
   * @param units - Array of units to display
   * @param interactables - Array of interactables to display
   * @param currentTime - Current timestamp in milliseconds
   */
  update: (
    camera: THREE.Camera,
    units: Unit[],
    interactables: Interactable[],
    currentTime: number,
  ) => void;

  /**
   * Show minimap
   */
  show: () => void;

  /**
   * Hide minimap
   */
  hide: () => void;

  /**
   * Toggle minimap visibility
   */
  toggle: () => void;

  /**
   * Check if minimap is visible
   * @returns True if visible
   */
  isVisible: () => boolean;

  /**
   * Update minimap configuration
   * @param config - Partial configuration to update
   */
  updateConfig: (config: Partial<MinimapConfig>) => void;

  /**
   * Get current configuration
   * @returns Current minimap configuration
   */
  getConfig: () => Readonly<MinimapConfig>;

  /**
   * Set terrain heightmap for rendering
   * @param heightData - 2D array of height values (0-1)
   * @param worldSize - Size of the world
   */
  setTerrainData: (
    heightData: number[][],
    worldSize: { x: number; y: number },
  ) => void;

  /**
   * Dispose and cleanup resources
   */
  dispose: () => void;
};
