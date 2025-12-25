import type * as THREE from 'three';
import type { LoadedAssets } from './assets.js';
import type {
  AIBehaviorState,
  AIBehaviorData,
} from '../core/units/ai-behavior-controller.js';
import type { TeamId } from './team.js';
import type { CombatStats } from './combat.js';

/**
 * Unit type definitions
 */
export type UnitType = 'player' | 'enemy' | 'npc';

/**
 * Generic animation state type - can be any string for flexibility
 */
export type AnimationState = string;

/**
 * Combat attack types
 */
export type AttackType = 'light' | 'heavy' | 'special' | 'ranged';

/**
 * Ranged attack configuration for units
 */
export type RangedAttackConfig = {
  /** Projectile definition ID to launch */
  projectileId: string;
  /** Animation to play when firing */
  animation: string;
  /** Range in world units */
  range: number;
  /** Cooldown in milliseconds */
  cooldown: number;
  /** Stamina cost per shot */
  staminaCost: number;
  /** Action delay before projectile launches (ms) */
  actionDelay: number;
  /** Optional ammo type for inventory checking */
  ammoType?: string;
  /** Whether this attack can target ground */
  canTargetGround?: boolean;
  /** Area of effect radius for ground attacks */
  areaRadius?: number;
  /** Max number of targets hit in area */
  maxTargets?: number;
  /** Bone name to spawn projectile from (e.g., 'mixamorigRightHand') */
  spawnBone?: string;
  /** Spawn offset relative to spawn bone or unit position */
  spawnOffset?: { x?: number; y?: number; z?: number };
};

/**
 * Combat system configuration
 */
export type CombatConfig = {
  /** Light attack configuration */
  lightAttack?: {
    damage?: number;
    knockback?: number;
    range?: number;
    cooldown?: number;
    staminaCost?: number;
    stunDuration?: number;
    actionDelay?: number;
  };
  /** Heavy attack configuration */
  heavyAttack?: {
    damage?: number;
    knockback?: number;
    range?: number;
    cooldown?: number;
    staminaCost?: number;
    stunDuration?: number;
    actionDelay?: number;
  };
  /** Whether to apply damage to targets */
  enableDamage?: boolean;
  /** Logger instance for debugging */
  logger?: import('../core/utils/logger.js').Logger;
  /** Callback when damage is dealt */
  onDamage?: (attacker: Unit, target: Unit, damageResult: import('./combat.js').DamageResult) => void;
  /** Ranged attack configuration */
  rangedAttack?: {
    /** Action delay before projectile launches (ms) */
    actionDelay?: number;
    /** Whether to enable ammo system */
    enableAmmo?: boolean;
  };
  /** Ammo system callbacks */
  ammo?: {
    /** Check if unit can use ammo */
    canUseAmmo?: (unit: Unit, ammoType: string) => boolean;
    /** Consume ammo when attacking */
    consumeAmmo?: (unit: Unit, ammoType: string, amount: number) => void;
  };
};

/**
 * Unit definition for creating different types of units
 */
export type UnitDefinition = {
  /** Unique identifier for the unit type */
  id: string;
  /** Type of unit */
  type: UnitType;
  /** Team identifier for faction system */
  team?: TeamId;
  /** List of enemy team IDs this unit will attack */
  enemyTeams?: TeamId[];
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
    /** Combat statistics configuration */
    combat?: Partial<CombatStats>;
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
  /** Ranged attack configuration (optional) */
  rangedAttack?: RangedAttackConfig;
  /** AI behavior configuration (only for non-player units) */
  ai?: AIBehaviorConfig;
  /** Death behavior configuration (optional) */
  death?: DeathConfig;
};

/**
 * Death behavior configuration
 */
export type DeathConfig = {
  /** List of death animation names to choose from randomly */
  animations?: string[];
  /** Single death animation name (alternative to animations array) */
  animation?: string;
  /** Duration to wait before removing unit (ms). Default: 2000 */
  removeDelay?: number;
  /** Whether death animations should loop. Default: false */
  loop?: boolean;
  /** Whether to clamp animation at final frame. Default: true */
  clampWhenFinished?: boolean;
  /** Whether to automatically handle death in core. Default: true */
  autoHandle?: boolean;
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
  /** Team identifier for faction system */
  team?: TeamId;
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
    /** Combat statistics for damage calculation */
    combat?: CombatStats;
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
  /** Combat state */
  combat?: {
    /** Last light attack time */
    lastLightAttackTime?: number;
    /** Last heavy attack time */
    lastHeavyAttackTime?: number;
    /** Last ranged attack time */
    lastRangedAttackTime?: number;
    /** Whether unit is currently in attack animation */
    isAttacking?: boolean;
    /** Whether unit is currently aiming */
    isAiming?: boolean;
    /** Remaining stamina */
    stamina?: number;
    /** Maximum stamina */
    maxStamina?: number;
  };
  /** Particle effects attached to this unit */
  effects?: {
    /** Running effect particle system */
    running?: any; // ParticleSystem from @newkrok/three-particles
    /** Running in water effect */
    runningInWater?: any;
    /** Attack effect */
    attack?: any;
    /** Hit effect */
    hit?: any;
    /** Death effect */
    death?: any;
    /** Other custom effects */
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
  /** Logger instance for debugging */
  logger?: import('../core/utils/logger.js').Logger;
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
  /** Team system configuration */
  teams?: {
    /** Enable friendly fire (units can damage same team) */
    enableFriendlyFire?: boolean;
  };
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
  playAnimation: (
    unit: Unit,
    animationName: AnimationState,
    fadeDuration?: number,
  ) => void;
  /** Stop all animations */
  stopAnimations: (unit: Unit) => void;
  /** Check if animation is playing */
  isAnimationPlaying: (unit: Unit, animationName: AnimationState) => boolean;
  /** Set animation speed */
  setAnimationSpeed: (
    unit: Unit,
    animationName: AnimationState,
    speed: number,
  ) => void;
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
  getUnitsInRange: (
    position: THREE.Vector3,
    range: number,
    excludeUnit?: Unit,
  ) => Unit[];
  // Combat methods
  /** Perform light attack */
  performLightAttack: (attacker: Unit, currentTime: number) => any;
  /** Perform heavy attack */
  performHeavyAttack: (attacker: Unit, currentTime: number) => any;
  /** Perform ranged attack */
  performRangedAttack: (
    attacker: Unit,
    target: THREE.Vector3 | Unit,
    currentTime: number,
  ) => any;
  /** Check if unit can attack */
  canAttack: (
    unit: Unit,
    attackType: AttackType,
    currentTime: number,
  ) => boolean;
  /** Initialize combat data for a unit */
  initializeCombat: (unit: Unit, stamina?: number, config?: CombatConfig) => void;
  /** Set stamina for a unit */
  setStamina: (unit: Unit, stamina: number) => void;
  // Effects methods
  /** Add effect to a unit */
  addEffect: (unit: Unit, effectName: string, effectInstance: any) => void;
  /** Remove effect from a unit */
  removeEffect: (unit: Unit, effectName: string) => boolean;
  /** Remove all effects from a unit */
  removeAllEffects: (unit: Unit) => void;
  /** Check if unit has effect */
  hasEffect: (unit: Unit, effectName: string) => boolean;
  /** Get effect from unit */
  getEffect: (unit: Unit, effectName: string) => any;
  // Projectile integration methods
  /** Check projectile collision against units */
  checkProjectileCollision: (
    projectile: any,
    radius: number,
    excludeUnit?: Unit,
  ) => { unit: Unit; point: THREE.Vector3; normal: THREE.Vector3 } | null;
  /** Create projectile collision function for world config */
  createProjectileCollisionFunction: (
    excludeUnit?: Unit,
  ) => (projectile: any, radius: number) => any;
  // Outline management methods
  /** Add outline to a unit */
  addUnitOutline: (
    unit: Unit,
    worldInstance: any,
    config?: any,
  ) => string | null;
  /** Remove outline from a unit */
  removeUnitOutline: (unit: Unit, worldInstance: any) => boolean;
  /** Check if unit has outline */
  hasUnitOutline: (unit: Unit) => boolean;
  /** Get all units with outlines */
  getOutlinedUnits: () => Unit[];
  /** Remove all unit outlines */
  removeAllUnitOutlines: (worldInstance: any) => void;
  /** Setup automatic projectile damage integration */
  setupProjectileDamageIntegration?: (projectileManager: any) => void;
  /** Get projectile manager reference */
  getProjectileManager?: () => any;
  /** Set health bar manager for automatic cleanup on death */
  setHealthBarManager?: (healthBarManager: any) => void;
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
