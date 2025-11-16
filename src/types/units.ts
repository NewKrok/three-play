import type * as THREE from 'three';
import type { LoadedAssets } from './assets.js';
import type { AIBehaviorState, AIBehaviorData } from '../core/units/ai-behavior-controller.js';

/**
 * Unit type definitions
 */
export type UnitType = 'player' | 'enemy' | 'npc';

/**
 * Generic animation state type - can be any string for flexibility
 */
export type AnimationState = string;

/**
 * Unit definition for creating different types of units
 */
export type UnitDefinition = {
  /** Unique identifier for the unit type */
  id: string;
  /** Type of unit */
  type: UnitType;
  /** Asset references for models and animations */
  modelAssets: {
    /** Base model asset key */
    baseModel: string;
    /** Animation asset keys mapped by animation name */
    animations: Record<string, string>;
  };
  /** Unit statistics and capabilities */
  stats: {
    /** Movement speed multiplier */
    speed: number;
    /** Maximum health points */
    health: number;
    /** Attack damage */
    attackDamage?: number;
    /** Collision radius */
    collisionRadius?: number;
  };
  /** Visual properties */
  appearance?: {
    /** Scale multiplier */
    scale?: number;
    /** Initial rotation */
    rotation?: number;
    /** Material customization function */
    materialModifier?: (instance: THREE.Group) => void;
  };
  /** AI behavior configuration (only for non-player units) */
  ai?: AIBehaviorConfig;
};

/**
 * AI behavior configuration
 */
export type AIBehaviorConfig = {
  /** AI behavior type */
  type: 'chase' | 'patrol' | 'idle' | 'custom';
  /** Target selection preferences */
  targeting?: {
    /** Preferred target types */
    preferredTargets?: UnitType[];
    /** Detection range */
    detectionRange?: number;
    /** Attack range */
    attackRange?: number;
  };
  /** Movement parameters */
  movement?: {
    /** Speed multiplier */
    speed?: number;
    /** Patrol area radius (for patrol behavior) */
    patrolRadius?: number;
    /** Random movement factor */
    randomness?: number;
  };
  /** Combat behavior */
  combat?: {
    /** Attack cooldown in milliseconds */
    attackCooldown?: number;
    /** Knockback force to apply */
    knockbackForce?: number;
    /** Stun duration in milliseconds */
    stunDuration?: number;
  };
};

/**
 * Unit instance representing a living unit in the world
 */
export type Unit = {
  /** Unique instance identifier */
  id: string;
  /** Unit definition reference */
  definition: UnitDefinition;
  /** THREE.js model group */
  model: THREE.Group;
  /** Animation mixer for handling animations */
  mixer: THREE.AnimationMixer;
  /** Animation actions mapped by state */
  actions: Record<AnimationState, THREE.AnimationAction>;
  /** Current animation state */
  currentAnimation: AnimationState;
  /** Previous animation state (for crossfading) */
  previousAnimation?: AnimationState;
  /** Unit statistics (can be modified at runtime) */
  stats: {
    health: number;
    maxHealth: number;
    speed: number;
    attackDamage: number;
    collisionRadius: number;
  };
  /** Physics properties */
  physics?: {
    /** Velocity vector */
    velocity?: THREE.Vector3;
    /** Knockback velocity */
    knockbackVelocity?: THREE.Vector3;
    /** Previous position (for collision resolution) */
    oldPosition?: THREE.Vector3;
    /** Friction coefficient for knockback (0-1, default 0.9) */
    friction?: number;
    /** Velocity decay rate per second (0-1, default 0) */
    velocityDecay?: number;
    /** Whether gravity affects this unit */
    enableGravity?: boolean;
    /** Gravity force strength (default 9.8) */
    gravityForce?: number;
    /** Unit mass (affects physics calculations) */
    mass?: number;
  };
  /** AI state (for non-player units) */
  ai?: {
    /** Current target unit */
    target?: THREE.Vector3;
    /** Next target selection time */
    nextTargetSelectionTime?: number;
    /** Resume movement time (after pause) */
    resumeTime?: number;
    /** Is currently attacking */
    isAttacking?: boolean;
    /** Is currently stunned */
    isStunned?: boolean;
  };
  /** Particle effects attached to this unit */
  effects?: {
    /** Running effect particle system */
    running?: any; // Will be typed properly when particle system is integrated
    /** Running in water effect */
    runningInWater?: any;
    /** Other effects */
    [key: string]: any;
  };
  /** Custom user data */
  userData?: Record<string, any>;
};

/**
 * Unit manager configuration
 */
export type UnitManagerConfig = {
  /** THREE.js scene instance */
  scene: THREE.Scene;
  /** Loaded assets from world */
  loadedAssets: LoadedAssets;
  /** Enable unit management system */
  enabled?: boolean;
  /** Maximum number of units */
  maxUnits?: number;
  /** Enable unit-to-unit collision */
  enableCollision?: boolean;
  /** Collision detection parameters */
  collision?: {
    /** Minimum distance between units */
    minDistance?: number;
    /** Collision resolution strength */
    pushStrength?: number;
  };
  /** Performance settings */
  performance?: {
    /** Update frequency (updates per second) */
    updateFrequency?: number;
    /** Enable frustum culling */
    enableFrustumCulling?: boolean;
  };
  /** Unit definitions to register */
  definitions?: UnitDefinition[];
};

/**
 * Unit creation parameters
 */
export type CreateUnitParams = {
  /** Unit definition ID */
  definitionId: string;
  /** Initial position */
  position: THREE.Vector3;
  /** Initial rotation (optional) */
  rotation?: number;
  /** Override stats (optional) */
  statsOverride?: Partial<Unit['stats']>;
  /** Custom user data */
  userData?: Record<string, any>;
};

/**
 * Animation controller interface for managing unit animations
 */
export type AnimationController = {
  /** Play animation with optional crossfade */
  playAnimation: (
    unit: Unit,
    animationName: AnimationState,
    fadeDuration?: number,
  ) => void;
  /** Stop all animations */
  stopAllAnimations: (unit: Unit) => void;
  /** Update animation mixer */
  updateAnimations: (unit: Unit, deltaTime: number) => void;
  /** Check if animation is playing */
  isAnimationPlaying: (unit: Unit, animationName: AnimationState) => boolean;
};

/**
 * Unit manager interface
 */
export type UnitManager = {
  /** Register a unit definition */
  registerDefinition: (definition: UnitDefinition) => void;
  /** Create a new unit instance */
  createUnit: (params: CreateUnitParams) => Unit | null;
  /** Remove unit by ID */
  removeUnit: (unitId: string) => boolean;
  /** Get unit by ID */
  getUnit: (unitId: string) => Unit | null;
  /** Get all units */
  getAllUnits: () => Unit[];
  /** Get units by type */
  getUnitsByType: (type: UnitType) => Unit[];
  /** Update all units */
  update: (deltaTime: number, elapsedTime?: number) => void;
  /** Dispose resources */
  dispose: () => void;
  // Animation control methods
  /** Play animation with optional crossfade */
  playAnimation: (unit: Unit, animationName: AnimationState, fadeDuration?: number) => void;
  /** Stop all animations */
  stopAnimations: (unit: Unit) => void;
  /** Check if animation is playing */
  isAnimationPlaying: (unit: Unit, animationName: AnimationState) => boolean;
  /** Set animation speed */
  setAnimationSpeed: (unit: Unit, animationName: AnimationState, speed: number) => void;
  /** Get current animation name */
  getCurrentAnimation: (unit: Unit) => AnimationState | null;
  // AI Behavior methods
  /** Initialize AI behavior for a unit */
  initializeAIBehavior: (unit: Unit, homePosition?: THREE.Vector3) => void;
  /** Set AI behavior state */
  setAIBehaviorState: (unit: Unit, state: AIBehaviorState) => void;
  /** Get AI behavior data */
  getAIBehaviorData: (unit: Unit) => AIBehaviorData | null;
  // Physics and movement methods
  /** Apply knockback force to a unit */
  applyKnockback: (unit: Unit, direction: THREE.Vector3, force: number) => void;
  /** Set unit velocity */
  setUnitVelocity: (unit: Unit, velocity: THREE.Vector3) => void;
  /** Add velocity to unit (accumulative) */
  addUnitVelocity: (unit: Unit, velocity: THREE.Vector3) => void;
  /** Stop all movement for a unit */
  stopUnitMovement: (unit: Unit) => void;
  // Collision detection methods
  /** Check collision between two units */
  checkUnitCollision: (unit1: Unit, unit2: Unit) => boolean;
  /** Get units within range of a position */
  getUnitsInRange: (position: THREE.Vector3, range: number, excludeUnit?: Unit) => Unit[];
};

/**
 * Character asset utilities interface
 */
export type CharacterAssetUtils = {
  /** Create character instance from definition */
  createInstance: (
    definition: UnitDefinition,
    loadedAssets: LoadedAssets,
  ) => {
    model: THREE.Group;
    mixer: THREE.AnimationMixer;
    actions: Record<string, THREE.AnimationAction>;
    userData: Record<string, any>;
  };
  /** Setup animations for a character instance */
  setupAnimations: (
    mixer: THREE.AnimationMixer,
    animations: Record<string, THREE.AnimationClip>,
  ) => Record<string, THREE.AnimationAction>;
  /** Setup shadows for character */
  setupShadows: (instance: THREE.Object3D, definition: UnitDefinition) => void;
};
