import * as THREE from 'three';
import type { ObjectPool } from './common.js';
import type { Logger } from '../core/utils/logger.js';

/**
 * Physics configuration for projectiles
 */
export type ProjectilePhysicsConfig = {
  /** Initial velocity vector */
  velocity: THREE.Vector3;
  /** Gravity vector applied each frame */
  gravity: THREE.Vector3;
  /** Air resistance coefficient (0-1, where 1 = no resistance) */
  airResistance: number;
  /** Bounce coefficient when hitting surfaces (0-1) */
  bounciness: number;
  /** Whether the projectile should stick on collision */
  stickOnHit: boolean;
  /** Lifetime in seconds (0 = infinite) */
  lifetime: number;
};

/**
 * Visual configuration for projectiles
 */
export type ProjectileVisualConfig = {
  /** Three.js geometry for the projectile */
  geometry: THREE.BufferGeometry;
  /** Three.js material for the projectile */
  material: THREE.Material;
  /** Whether to cast shadows */
  castShadow: boolean;
  /** Whether to receive shadows */
  receiveShadow: boolean;
  /** Optional trail effect configuration */
  trail?: {
    length: number;
    width: number;
    color: string;
    opacity: number;
  };
};

/**
 * Collision configuration for projectiles
 */
export type ProjectileCollisionConfig = {
  /** Collision radius for sphere collision detection */
  radius: number;
  /** Collision layers to check against */
  layers: string[];
  /** Whether projectile collides with terrain */
  checkTerrain: boolean;
  /** Whether projectile collides with other objects */
  checkObjects: boolean;
};

/**
 * Spread configuration for projectile firing
 */
export type ProjectileSpreadConfig = {
  /** Horizontal spread angle in radians */
  horizontal: number;
  /** Vertical spread angle in radians */
  vertical: number;
  /** Whether to apply spread to velocity magnitude as well */
  velocityVariance: number;
};

/**
 * Complete projectile definition
 */
export type ProjectileDefinition = {
  /** Unique identifier for this projectile type */
  id: string;
  /** Display name for this projectile type */
  name: string;
  /** Physics properties */
  physics: ProjectilePhysicsConfig;
  /** Visual properties */
  visual: ProjectileVisualConfig;
  /** Collision properties */
  collision: ProjectileCollisionConfig;
  /** Optional spread configuration */
  spread?: ProjectileSpreadConfig;
  /** Maximum number of instances to pool */
  poolSize: number;
};

/**
 * Runtime projectile instance
 */
export type ProjectileInstance = {
  /** Unique instance ID */
  id: string;
  /** Reference to the projectile definition */
  definition: ProjectileDefinition;
  /** Three.js mesh object */
  mesh: THREE.Mesh;
  /** Current position */
  position: THREE.Vector3;
  /** Current velocity */
  velocity: THREE.Vector3;
  /** Current rotation */
  rotation: THREE.Euler;
  /** Time alive in seconds */
  timeAlive: number;
  /** Whether this instance is currently active */
  active: boolean;
  /** Custom user data */
  userData: Record<string, any>;
};

/**
 * Event fired when a projectile hits something
 */
export type ProjectileHitEvent = {
  /** The projectile that hit */
  projectile: ProjectileInstance;
  /** The object that was hit (if any) */
  target?: THREE.Object3D;
  /** Hit position in world coordinates */
  position: THREE.Vector3;
  /** Hit normal vector */
  normal: THREE.Vector3;
  /** Hit velocity at time of impact */
  velocity: THREE.Vector3;
};

/**
 * Event fired when a projectile is destroyed
 */
export type ProjectileDestroyEvent = {
  /** The projectile that was destroyed */
  projectile: ProjectileInstance;
  /** Reason for destruction */
  reason: 'lifetime' | 'collision' | 'manual' | 'bounds';
};

/**
 * Projectile launch parameters
 */
export type ProjectileLaunchParams = {
  /** Projectile definition ID to use */
  definitionId: string;
  /** Launch position */
  origin: THREE.Vector3;
  /** Launch direction (will be normalized) */
  direction: THREE.Vector3;
  /** Launch strength/velocity multiplier */
  strength: number;
  /** Optional overrides for physics */
  physicsOverride?: Partial<ProjectilePhysicsConfig>;
  /** Optional custom user data */
  userData?: Record<string, any>;
};

/**
 * Projectile manager configuration
 */
export type ProjectileManagerConfig = {
  /** Three.js scene to add projectiles to */
  scene: THREE.Scene;
  /** Logger instance for logging */
  logger: Logger;
  /** Maximum total projectiles across all types */
  maxProjectiles: number;
  /** Function to get terrain height at position */
  getHeightFromPosition?: (position: THREE.Vector3) => number;
  /** Function to check collision with objects */
  checkObjectCollision?: (
    projectile: ProjectileInstance,
    radius: number,
  ) => {
    object: THREE.Object3D;
    point: THREE.Vector3;
    normal: THREE.Vector3;
  } | null;
};

/**
 * Projectile manager interface
 */
export type ProjectileManager = {
  /** Register a new projectile definition */
  registerDefinition(definition: ProjectileDefinition): void;

  /** Remove a projectile definition */
  unregisterDefinition(definitionId: string): void;

  /** Launch a projectile */
  launch(params: ProjectileLaunchParams): ProjectileInstance | null;

  /** Update all active projectiles */
  update(deltaTime: number): void;

  /** Get all active projectiles */
  getActiveProjectiles(): ProjectileInstance[];

  /** Get all projectiles of a specific type */
  getProjectilesByType(definitionId: string): ProjectileInstance[];

  /** Destroy a specific projectile */
  destroyProjectile(projectileId: string, reason?: string): void;

  /** Destroy all projectiles */
  destroyAllProjectiles(): void;

  /** Get projectile manager statistics */
  getStats(): ProjectileManagerStats;

  /** Clean up and dispose resources */
  dispose(): void;

  /** Event listeners */
  onHit(callback: (event: ProjectileHitEvent) => void): () => void;
  onDestroy(callback: (event: ProjectileDestroyEvent) => void): () => void;
};

/**
 * Projectile manager statistics
 */
export type ProjectileManagerStats = {
  /** Number of registered definitions */
  definitionCount: number;
  /** Total active projectiles */
  activeProjectiles: number;
  /** Pool statistics by definition ID */
  poolStats: Record<
    string,
    {
      total: number;
      active: number;
      available: number;
    }
  >;
};
