import * as THREE from 'three';
import { createObjectPool } from '../utils/object-pool.js';
import type { ObjectPool } from '../../types/common.js';
import type { Logger } from '../utils/logger.js';
import type {
  ProjectileDefinition,
  ProjectileInstance,
  ProjectileManager,
  ProjectileManagerConfig,
  ProjectileManagerStats,
  ProjectileLaunchParams,
  ProjectileHitEvent,
  ProjectileDestroyEvent,
} from '../../types/projectiles.js';

/**
 * Create a projectile manager instance
 * @param config - Configuration for the projectile manager
 * @returns ProjectileManager instance
 */
export const createProjectileManager = (
  config: ProjectileManagerConfig,
): ProjectileManager => {
  const { scene, logger, maxProjectiles, getHeightFromPosition, checkObjectCollision } =
    config;

  // Storage for projectile definitions and their pools
  const definitions = new Map<string, ProjectileDefinition>();
  const pools = new Map<string, ObjectPool<ProjectileInstance>>();
  const activeProjectiles = new Map<string, ProjectileInstance>();

  // Event listeners
  const hitListeners: Array<(event: ProjectileHitEvent) => void> = [];
  const destroyListeners: Array<(event: ProjectileDestroyEvent) => void> = [];

  // Temporary vectors for calculations
  const tempVector1 = new THREE.Vector3();
  const tempVector2 = new THREE.Vector3();

  /**
   * Generate unique ID for projectile instances
   */
  const generateInstanceId = (): string => {
    return `projectile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Create a new projectile instance
   */
  const createProjectileInstance = (
    definition: ProjectileDefinition,
  ): ProjectileInstance => {
    const mesh = new THREE.Mesh(
      definition.visual.geometry.clone(),
      definition.visual.material.clone(),
    );

    mesh.castShadow = definition.visual.castShadow;
    mesh.receiveShadow = definition.visual.receiveShadow;

    return {
      id: generateInstanceId(),
      definition,
      mesh,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      timeAlive: 0,
      active: false,
      userData: {},
    };
  };

  /**
   * Reset a projectile instance for reuse
   */
  const resetProjectileInstance = (instance: ProjectileInstance): void => {
    instance.position.set(0, 0, 0);
    instance.velocity.set(0, 0, 0);
    instance.rotation.set(0, 0, 0);
    instance.timeAlive = 0;
    instance.active = false;
    instance.userData = {};
    instance.mesh.position.set(0, 0, 0);
    instance.mesh.rotation.set(0, 0, 0);
    instance.mesh.visible = false;

    // Remove from scene if it's there
    if (instance.mesh.parent) {
      scene.remove(instance.mesh);
    }
  };

  /**
   * Apply spread to a direction vector
   */
  const applySpread = (
    direction: THREE.Vector3,
    strength: number,
    definition: ProjectileDefinition,
  ): { direction: THREE.Vector3; strength: number } => {
    if (!definition.spread) {
      return { direction: direction.clone(), strength };
    }

    const spread = definition.spread;
    const spreadDirection = direction.clone();

    // Apply horizontal spread
    if (spread.horizontal > 0) {
      const horizontalAngle = (Math.random() - 0.5) * spread.horizontal;
      spreadDirection.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        horizontalAngle,
      );
    }

    // Apply vertical spread
    if (spread.vertical > 0) {
      const verticalAngle = (Math.random() - 0.5) * spread.vertical;
      const axis = new THREE.Vector3().crossVectors(
        spreadDirection,
        new THREE.Vector3(0, 1, 0),
      );
      spreadDirection.applyAxisAngle(axis, verticalAngle);
    }

    // Apply velocity variance
    let finalStrength = strength;
    if (spread.velocityVariance > 0) {
      const variance = 1 + (Math.random() - 0.5) * spread.velocityVariance;
      finalStrength *= variance;
    }

    return { direction: spreadDirection.normalize(), strength: finalStrength };
  };

  /**
   * Check terrain collision for a projectile
   */
  const checkTerrainCollision = (instance: ProjectileInstance): boolean => {
    if (!getHeightFromPosition || !instance.definition.collision.checkTerrain) {
      return false;
    }

    const terrainHeight = getHeightFromPosition(instance.position);
    return (
      instance.position.y <=
      terrainHeight + instance.definition.collision.radius
    );
  };

  /**
   * Handle projectile collision
   */
  const handleCollision = (
    instance: ProjectileInstance,
    hitPoint: THREE.Vector3,
    normal: THREE.Vector3,
    target?: THREE.Object3D,
  ): void => {
    const event: ProjectileHitEvent = {
      projectile: instance,
      target,
      position: hitPoint.clone(),
      normal: normal.clone(),
      velocity: instance.velocity.clone(),
    };

    // Notify hit listeners
    hitListeners.forEach((listener) => listener(event));

    const physics = instance.definition.physics;

    if (physics.stickOnHit) {
      // Stop the projectile
      instance.velocity.set(0, 0, 0);
    } else if (physics.bounciness > 0) {
      // Apply bounce
      const bounceVelocity = instance.velocity.clone().reflect(normal);
      bounceVelocity.multiplyScalar(physics.bounciness);
      instance.velocity.copy(bounceVelocity);
    } else {
      // Destroy on hit
      destroyProjectile(instance.id, 'collision');
    }
  };

  /**
   * Update physics for a projectile instance
   */
  const updateProjectilePhysics = (
    instance: ProjectileInstance,
    deltaTime: number,
  ): void => {
    const physics = instance.definition.physics;

    // Apply gravity
    tempVector1.copy(physics.gravity).multiplyScalar(deltaTime);
    instance.velocity.add(tempVector1);

    // Apply air resistance
    if (physics.airResistance < 1) {
      const resistance = Math.pow(physics.airResistance, deltaTime);
      instance.velocity.multiplyScalar(resistance);
    }

    // Update position
    tempVector1.copy(instance.velocity).multiplyScalar(deltaTime);
    instance.position.add(tempVector1);

    // Update mesh position
    instance.mesh.position.copy(instance.position);

    // Update rotation to face velocity direction if moving
    if (instance.velocity.lengthSq() > 0.001) {
      tempVector1.copy(instance.velocity).normalize();
      instance.mesh.lookAt(instance.mesh.position.clone().add(tempVector1));
    }
  };

  /**
   * Check collisions for a projectile instance
   */
  const checkCollisions = (instance: ProjectileInstance): void => {
    const collision = instance.definition.collision;

    // Check terrain collision
    if (checkTerrainCollision(instance)) {
      const normal = new THREE.Vector3(0, 1, 0); // Assume terrain normal is up
      handleCollision(instance, instance.position.clone(), normal);
      return;
    }

    // Check object collision
    if (collision.checkObjects && checkObjectCollision) {
      const hit = checkObjectCollision(instance, collision.radius);
      if (hit) {
        handleCollision(instance, hit.point, hit.normal, hit.object);
      }
    }
  };

  /**
   * Destroy a projectile instance
   */
  const destroyProjectile = (
    projectileId: string,
    reason: string = 'manual',
  ): void => {
    const instance = activeProjectiles.get(projectileId);
    if (!instance) return;

    // Remove from active projectiles
    activeProjectiles.delete(projectileId);

    // Notify destroy listeners
    const event: ProjectileDestroyEvent = {
      projectile: instance,
      reason: reason as any,
    };
    destroyListeners.forEach((listener) => listener(event));

    // Return to pool
    const pool = pools.get(instance.definition.id);
    if (pool) {
      pool.release(instance);
    }
  };

  return {
    /**
     * Register a new projectile definition
     */
    registerDefinition(definition: ProjectileDefinition): void {
      if (definitions.has(definition.id)) {
        logger.warn(
          `Projectile definition with ID '${definition.id}' already exists`,
        );
        return;
      }

      definitions.set(definition.id, definition);

      // Create object pool for this definition
      const pool = createObjectPool<ProjectileInstance>({
        createFn: () => createProjectileInstance(definition),
        resetFn: resetProjectileInstance,
        logger,
        initialSize: Math.min(definition.poolSize, 10),
        maxSize: definition.poolSize,
        autoGrow: true,
      });

      pools.set(definition.id, pool);
    },

    /**
     * Remove a projectile definition
     */
    unregisterDefinition(definitionId: string): void {
      // Destroy all active projectiles of this type
      const projectilesToDestroy = Array.from(activeProjectiles.values())
        .filter((p) => p.definition.id === definitionId)
        .map((p) => p.id);

      projectilesToDestroy.forEach((id) => destroyProjectile(id, 'manual'));

      // Clear pool and definition
      const pool = pools.get(definitionId);
      if (pool) {
        pool.clear();
        pools.delete(definitionId);
      }

      definitions.delete(definitionId);
    },

    /**
     * Launch a projectile
     */
    launch(params: ProjectileLaunchParams): ProjectileInstance | null {
      const definition = definitions.get(params.definitionId);
      if (!definition) {
        logger.warn(`Unknown projectile definition: ${params.definitionId}`);
        return null;
      }

      // Check max projectiles limit
      if (activeProjectiles.size >= maxProjectiles) {
        logger.warn('Maximum projectiles limit reached');
        return null;
      }

      const pool = pools.get(params.definitionId);
      if (!pool) {
        logger.warn(
          `No pool found for projectile definition: ${params.definitionId}`,
        );
        return null;
      }

      const instance = pool.get();
      if (!instance) {
        logger.warn(
          `Failed to get projectile instance from pool: ${params.definitionId}`,
        );
        return null;
      }

      // Initialize the instance
      instance.active = true;
      instance.timeAlive = 0;
      instance.position.copy(params.origin);
      instance.userData = { ...params.userData };

      // Apply physics overrides
      const physics = { ...definition.physics, ...params.physicsOverride };

      // Calculate velocity with spread
      const { direction, strength } = applySpread(
        params.direction.clone().normalize(),
        params.strength,
        definition,
      );

      instance.velocity.copy(direction).multiplyScalar(strength);
      if (physics.velocity) {
        instance.velocity.add(physics.velocity);
      }

      // Set up mesh
      instance.mesh.position.copy(instance.position);
      instance.mesh.visible = true;
      scene.add(instance.mesh);

      // Add to active projectiles
      activeProjectiles.set(instance.id, instance);

      return instance;
    },

    /**
     * Update all active projectiles
     */
    update(deltaTime: number): void {
      const projectilesToDestroy: string[] = [];

      activeProjectiles.forEach((instance) => {
        if (!instance.active) return;

        // Update time alive
        instance.timeAlive += deltaTime;

        // Check lifetime
        if (
          instance.definition.physics.lifetime > 0 &&
          instance.timeAlive >= instance.definition.physics.lifetime
        ) {
          projectilesToDestroy.push(instance.id);
          return;
        }

        // Update physics
        updateProjectilePhysics(instance, deltaTime);

        // Check collisions
        checkCollisions(instance);
      });

      // Destroy expired projectiles
      projectilesToDestroy.forEach((id) => destroyProjectile(id, 'lifetime'));
    },

    /**
     * Get all active projectiles
     */
    getActiveProjectiles(): ProjectileInstance[] {
      return Array.from(activeProjectiles.values()).filter((p) => p.active);
    },

    /**
     * Get all projectiles of a specific type
     */
    getProjectilesByType(definitionId: string): ProjectileInstance[] {
      return Array.from(activeProjectiles.values()).filter(
        (p) => p.active && p.definition.id === definitionId,
      );
    },

    /**
     * Destroy a specific projectile
     */
    destroyProjectile(projectileId: string, reason: string = 'manual'): void {
      destroyProjectile(projectileId, reason);
    },

    /**
     * Destroy all projectiles
     */
    destroyAllProjectiles(): void {
      const projectilesToDestroy = Array.from(activeProjectiles.keys());
      projectilesToDestroy.forEach((id) => destroyProjectile(id, 'manual'));
    },

    /**
     * Get projectile manager statistics
     */
    getStats(): ProjectileManagerStats {
      const poolStats: Record<string, any> = {};

      pools.forEach((pool, definitionId) => {
        const stats = pool.getStats();
        poolStats[definitionId] = {
          total: stats.total,
          active: stats.inUse,
          available: stats.available,
        };
      });

      return {
        definitionCount: definitions.size,
        activeProjectiles: activeProjectiles.size,
        poolStats,
      };
    },

    /**
     * Clean up and dispose resources
     */
    dispose(): void {
      // Destroy all active projectiles
      this.destroyAllProjectiles();

      // Clear all pools
      pools.forEach((pool) => pool.clear());
      pools.clear();

      // Clear definitions
      definitions.clear();

      // Clear listeners
      hitListeners.length = 0;
      destroyListeners.length = 0;
    },

    /**
     * Add hit event listener
     */
    onHit(callback: (event: ProjectileHitEvent) => void): () => void {
      hitListeners.push(callback);
      return () => {
        const index = hitListeners.indexOf(callback);
        if (index > -1) {
          hitListeners.splice(index, 1);
        }
      };
    },

    /**
     * Add destroy event listener
     */
    onDestroy(callback: (event: ProjectileDestroyEvent) => void): () => void {
      destroyListeners.push(callback);
      return () => {
        const index = destroyListeners.indexOf(callback);
        if (index > -1) {
          destroyListeners.splice(index, 1);
        }
      };
    },
  };
};

/**
 * Projectile utilities namespace
 */
export const ProjectileUtils = {
  createProjectileManager,
} as const;
