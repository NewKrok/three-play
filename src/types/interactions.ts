import type * as THREE from 'three';
import type { Unit } from './units.js';

/**
 * Callback when a unit enters collision radius
 */
export type CollisionEnterCallback = (unit: Unit, interactable: Interactable) => void;

/**
 * Callback when a unit exits collision radius
 */
export type CollisionExitCallback = (unit: Unit, interactable: Interactable) => void;

/**
 * Callback when a unit enters interaction radius
 */
export type InteractionEnterCallback = (unit: Unit, interactable: Interactable) => void;

/**
 * Callback when a unit exits interaction radius
 */
export type InteractionExitCallback = (unit: Unit, interactable: Interactable) => void;

/**
 * Callback when a unit interacts with an interactable
 */
export type InteractionCallback = (unit: Unit, interactable: Interactable) => void;

/**
 * Configuration for an interactable object
 */
export type InteractableConfig = {
  /** Unique identifier */
  id: string;
  /** 3D position in world space */
  position: THREE.Vector3;
  /** Collision radius (units push away) */
  collisionRadius?: number;
  /** Interaction radius (units can interact) */
  interactionRadius?: number;
  /** Whether this object blocks movement */
  blocksMovement?: boolean;
  /** Whether this object can be interacted with */
  canInteract?: boolean;
  /** Whether this object is currently active */
  isActive?: boolean;
  /** Optional Three.js object for visual representation */
  object3D?: THREE.Object3D;
  /** Custom user data */
  userData?: Record<string, any>;
  /** Callback when a unit enters collision radius */
  onCollisionEnter?: CollisionEnterCallback;
  /** Callback when a unit exits collision radius */
  onCollisionExit?: CollisionExitCallback;
  /** Callback when a unit enters interaction radius */
  onInteractionEnter?: InteractionEnterCallback;
  /** Callback when a unit exits interaction radius */
  onInteractionExit?: InteractionExitCallback;
  /** Callback when a unit interacts with this object */
  onInteract?: InteractionCallback;
};

/**
 * An interactable object in the world
 */
export type Interactable = {
  /** Unique identifier */
  id: string;
  /** 3D position in world space */
  position: THREE.Vector3;
  /** Collision radius */
  collisionRadius: number;
  /** Interaction radius */
  interactionRadius: number;
  /** Whether this object blocks movement */
  blocksMovement: boolean;
  /** Whether this object can be interacted with */
  canInteract: boolean;
  /** Whether this object is currently active */
  isActive: boolean;
  /** Optional Three.js object */
  object3D?: THREE.Object3D;
  /** Custom user data */
  userData: Record<string, any>;
  /** Callback when entering collision radius */
  onCollisionEnter?: CollisionEnterCallback;
  /** Callback when exiting collision radius */
  onCollisionExit?: CollisionExitCallback;
  /** Callback when entering interaction radius */
  onInteractionEnter?: InteractionEnterCallback;
  /** Callback when exiting interaction radius */
  onInteractionExit?: InteractionExitCallback;
  /** Callback when interacting */
  onInteract?: InteractionCallback;
};

/**
 * Interaction manager configuration
 */
export type InteractionManagerConfig = {
  /** Enable collision detection */
  enableCollision?: boolean;
  /** Enable interaction system */
  enableInteraction?: boolean;
  /** Default collision radius */
  defaultCollisionRadius?: number;
  /** Default interaction radius */
  defaultInteractionRadius?: number;
};

/**
 * Interaction manager for handling world object interactions
 */
export type InteractionManager = {
  /**
   * Add an interactable object
   * @param config - Interactable configuration
   * @returns The created interactable
   */
  addInteractable: (config: InteractableConfig) => Interactable;

  /**
   * Remove an interactable by ID
   * @param id - Interactable ID
   * @returns True if removed, false if not found
   */
  removeInteractable: (id: string) => boolean;

  /**
   * Get an interactable by ID
   * @param id - Interactable ID
   * @returns The interactable or undefined
   */
  getInteractable: (id: string) => Interactable | undefined;

  /**
   * Get all active interactables
   * @returns Array of active interactables
   */
  getActiveInteractables: () => Interactable[];

  /**
   * Get all interactables
   * @returns Array of all interactables
   */
  getAllInteractables: () => Interactable[];

  /**
   * Check collisions for units
   * @param units - Array of units to check
   */
  checkCollisions: (units: Unit[]) => void;

  /**
   * Check interactions for a unit
   * @param unit - Unit to check
   * @returns Array of interactables within interaction range
   */
  checkInteractions: (unit: Unit) => Interactable[];

  /**
   * Trigger interaction for a unit with nearby interactables
   * @param unit - Unit performing the interaction
   * @returns Number of interactions triggered
   */
  triggerInteraction: (unit: Unit) => number;

  /**
   * Clear all interactables
   */
  clear: () => void;

  /**
   * Enable or disable collision detection
   * @param enabled - Whether to enable collision
   */
  setCollisionEnabled: (enabled: boolean) => void;

  /**
   * Enable or disable interaction system
   * @param enabled - Whether to enable interaction
   */
  setInteractionEnabled: (enabled: boolean) => void;
};
