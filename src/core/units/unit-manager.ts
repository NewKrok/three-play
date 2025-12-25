import * as THREE from 'three';
import type {
  UnitManager,
  UnitManagerConfig,
  UnitDefinition,
  Unit,
  CreateUnitParams,
  UnitType,
} from '../../types/units.js';
import { CharacterAssetUtils } from './character-asset-utils.js';
import { createAnimationController } from './animation-controller.js';
import type { AnimationControllerImpl } from './animation-controller.js';
import {
  createAIBehaviorController,
  AIBehaviorUtils,
} from './ai-behavior-controller.js';
import type { AIBehaviorController } from './ai-behavior-controller.js';
import { createCombatController } from './combat-controller.js';
import type { CombatController } from './combat-controller.js';
import type { Logger } from '../utils/logger.js';

/**
 * Create a unit manager instance
 * @param config - Configuration for the unit manager
 * @returns UnitManager instance
 */
export const createUnitManager = (config: UnitManagerConfig): UnitManager => {
  const {
    scene,
    loadedAssets,
    logger,
    enabled = true,
    maxUnits = 1000,
    enableCollision = true,
    collision = {
      minDistance: 1.0,
      pushStrength: 0.5,
    },
  } = config;

  // Ensure collision defaults are properly typed
  const minDistance = collision.minDistance || 1.0;
  const pushStrength = collision.pushStrength || 0.5;

  // Create animation controller
  const animationController: AnimationControllerImpl =
    createAnimationController({ logger });

  // Create AI behavior controller (will be re-created later with combat controller reference)
  let aiBehaviorController: AIBehaviorController = createAIBehaviorController();

  // We'll create combat controller after unit manager functions are defined
  let combatController: CombatController;

  // Internal state
  const units = new Map<string, Unit>();
  const definitions = new Map<string, UnitDefinition>();
  let nextUnitId = 1;

  /**
   * Register a unit definition that can be used to create units
   */
  const registerDefinition = (definition: UnitDefinition): void => {
    definitions.set(definition.id, definition);
  };

  /**
   * Create a new unit instance from a registered definition
   */
  const createUnit = (params: CreateUnitParams): Unit | null => {
    const definition = definitions.get(params.definitionId);
    if (!definition) {
      logger?.error(`Unit definition '${params.definitionId}' not found`);
      return null;
    }

    // Check unit limit
    if (maxUnits && units.size >= maxUnits) {
      logger?.warn('Maximum unit limit reached');
      return null;
    }

    try {
      // Create character assets using the generic utility
      const characterData = CharacterAssetUtils.createInstance(
        definition,
        loadedAssets,
      );

      // Position the unit
      characterData.model.position.copy(params.position);
      if (params.rotation !== undefined) {
        characterData.model.rotation.y = params.rotation;
      }

      // Add to scene
      scene.add(characterData.model);

      // Create unit instance
      const unitId = `unit_${nextUnitId++}`;
      const unit: Unit = {
        id: unitId,
        definition,
        team: definition.team, // Assign team from definition
        model: characterData.model,
        mixer: characterData.mixer,
        actions: characterData.actions,
        currentAnimation: 'idle', // Default animation
        stats: {
          health: definition.stats.health,
          maxHealth: definition.stats.health,
          speed: definition.stats.speed,
          attackDamage: definition.stats.attackDamage || 0,
          collisionRadius: definition.stats.collisionRadius || 0.5,
          ...params.statsOverride,
        },
        physics: {
          velocity: new THREE.Vector3(),
          knockbackVelocity: new THREE.Vector3(),
          oldPosition: params.position.clone(),
        },
        userData: params.userData || {},
      };

      // Initialize AI state for non-player units
      if (definition.type !== 'player' && definition.ai) {
        unit.ai = {
          target: new THREE.Vector3(),
          nextTargetSelectionTime: 0,
          resumeTime: 0,
          isAttacking: false,
          isStunned: false,
        };
      }

      units.set(unitId, unit);
      return unit;
    } catch (error) {
      logger?.error('Failed to create unit:', error);
      return null;
    }
  };

  /**
   * Check collision between two units
   */
  const checkUnitCollision = (unit1: Unit, unit2: Unit): boolean => {
    const distance = unit1.model.position.distanceTo(unit2.model.position);
    const combinedRadius =
      unit1.stats.collisionRadius + unit2.stats.collisionRadius;
    return distance < combinedRadius;
  };

  /**
   * Get units within range of a position
   */
  const getUnitsInRange = (
    position: THREE.Vector3,
    range: number,
    excludeUnit?: Unit,
  ): Unit[] => {
    return Array.from(units.values()).filter((unit) => {
      if (excludeUnit && unit.id === excludeUnit.id) return false;
      return unit.model.position.distanceTo(position) <= range;
    });
  };

  /**
   * Add effect to a unit
   */
  const addEffect = (
    unit: Unit,
    effectName: string,
    effectInstance: any,
  ): void => {
    if (!unit.effects) {
      unit.effects = {};
    }

    // Remove old effect if exists
    if (unit.effects[effectName]) {
      unit.model.remove(
        unit.effects[effectName].instance || unit.effects[effectName],
      );
      // Dispose if possible
      if (unit.effects[effectName].dispose) {
        unit.effects[effectName].dispose();
      }
    }

    unit.effects[effectName] = effectInstance;

    // Add to unit model if has instance property
    if (effectInstance.instance) {
      unit.model.add(effectInstance.instance);
    } else if (effectInstance.add) {
      // Direct three.js object
      unit.model.add(effectInstance);
    }
  };

  /**
   * Remove effect from a unit
   */
  const removeEffect = (unit: Unit, effectName: string): boolean => {
    if (!unit.effects || !unit.effects[effectName]) {
      return false;
    }

    const effect = unit.effects[effectName];

    // Remove from scene
    if (effect.instance) {
      unit.model.remove(effect.instance);
    } else {
      unit.model.remove(effect);
    }

    // Dispose if possible
    if (effect.dispose) {
      effect.dispose();
    }

    delete unit.effects[effectName];
    return true;
  };

  /**
   * Remove all effects from a unit
   */
  const removeAllEffects = (unit: Unit): void => {
    if (!unit.effects) return;

    const effectNames = Object.keys(unit.effects);
    for (const effectName of effectNames) {
      removeEffect(unit, effectName);
    }
  };

  /**
   * Check if unit has effect
   */
  const hasEffect = (unit: Unit, effectName: string): boolean => {
    return !!(unit.effects && unit.effects[effectName]);
  };

  /**
   * Get effect from unit
   */
  const getEffect = (unit: Unit, effectName: string): any => {
    return unit.effects?.[effectName] || null;
  };

  /**
   * Check projectile collision against units
   * This function is designed to be used with THREE Play's projectile system
   */
  const checkProjectileCollision = (
    projectile: any,
    radius: number,
    excludeUnit?: Unit,
  ): {
    unit: Unit;
    point: THREE.Vector3;
    normal: THREE.Vector3;
  } | null => {
    const projectilePosition = projectile.position;

    for (const unit of units.values()) {
      // Skip excluded unit (typically the shooter)
      if (excludeUnit && unit.id === excludeUnit.id) continue;

      // Create unit center position (foot position + height offset for body center)
      const unitCenterPosition = unit.model.position.clone();
      unitCenterPosition.y += 1.0; // Add 1 meter for approximate body center height

      const distance = unitCenterPosition.distanceTo(projectilePosition);
      const combinedRadius = radius + unit.stats.collisionRadius;

      if (distance < combinedRadius) {
        // Calculate hit point and normal
        const direction = projectilePosition
          .clone()
          .sub(unitCenterPosition)
          .normalize();
        const hitPoint = unitCenterPosition
          .clone()
          .add(direction.clone().multiplyScalar(unit.stats.collisionRadius));
        const normal = direction.clone();

        return {
          unit,
          point: hitPoint,
          normal: normal,
        };
      }
    }

    return null; // No collision
  };

  /**
   * Create projectile collision function for world config
   * Returns a function compatible with THREE Play's projectile system
   */
  const createProjectileCollisionFunction = (excludeUnit?: Unit) => {
    return (projectile: any, radius: number) => {
      const collision = checkProjectileCollision(
        projectile,
        radius,
        excludeUnit,
      );
      if (collision) {
        return {
          object: collision.unit.model, // Return the model for compatibility
          point: collision.point,
          normal: collision.normal,
          unit: collision.unit, // Additional unit data
        };
      }
      return null;
    };
  };

  /**
   * Handle projectile hit event and apply damage
   * This integrates projectile hits with the combat damage system
   */
  const handleProjectileHit = (event: any): void => {
    const { projectile, target, position } = event;

    // Extract combat data from projectile userData
    const combatData = projectile.userData?.combatData;
    if (!combatData || !combatData.attackerUnit) {
      // No combat data, this is a non-combat projectile
      return;
    }

    const attacker = combatData.attackerUnit;

    // Handle area damage if configured
    if (combatData.areaDamage) {
      handleAreaDamage(attacker, position, combatData.areaDamage);
    } else {
      // Single target damage
      // Find the target unit
      const allUnits = Array.from(units.values());
      const targetUnit = allUnits.find((u) => u.model === target);

      if (targetUnit && !targetUnit.userData?.isDead) {
        applyProjectileDamage(attacker, targetUnit, event);
      }
    }
  };

  /**
   * Handle area damage from projectile
   */
  const handleAreaDamage = (
    attacker: Unit,
    position: THREE.Vector3,
    areaConfig: { radius: number; maxTargets: number; damageMultiplier?: number },
  ): void => {
    // Get units in area
    const unitsInArea = getUnitsInRange(position, areaConfig.radius, attacker);

    // Filter valid targets (team system)
    const teamConfig = config?.teams;
    const validTargets = unitsInArea.filter(
      (unit) =>
        !unit.userData?.isDead &&
        (teamConfig?.enableFriendlyFire || unit.team !== attacker.team),
    );

    // Sort by distance and limit to maxTargets
    validTargets.sort((a, b) => {
      const distA = a.model.position.distanceTo(position);
      const distB = b.model.position.distanceTo(position);
      return distA - distB;
    });

    const targets = validTargets.slice(0, areaConfig.maxTargets);

    // Apply damage to each target
    for (const target of targets) {
      applyProjectileDamage(attacker, target, {
        projectile: { position },
        position,
      });
    }
  };

  /**
   * Apply damage from projectile hit
   */
  const applyProjectileDamage = (
    attacker: Unit,
    target: Unit,
    event: any,
  ): void => {
    // Use combat controller to calculate and apply damage
    const { isDead, damageResult } = combatController.applyDamage(target, 0, attacker);

    // Trigger onDamage callback for UI integration
    if (damageResult) {
      // Check for global damage number callback
      if (typeof (window as any).showDamageNumber === 'function') {
        (window as any).showDamageNumber(target, damageResult);
      }
    }

    // Handle death
    if (isDead && !target.userData?.isDead) {
      target.userData = target.userData || {};
      target.userData.isDead = true;

      // Stop AI behavior
      if (target.ai) {
        target.ai.isStunned = true;
      }

      logger?.info(`Unit ${target.id} killed by projectile from ${attacker.id}`);
    }
  };

  /**
   * Setup projectile damage integration with projectile manager
   * Should be called after projectile manager is available
   */
  const setupProjectileDamageIntegration = (projectileManager: any): void => {
    if (!projectileManager || !projectileManager.onHit) {
      logger?.warn('Projectile manager not available for damage integration');
      return;
    }

    // Subscribe to projectile hit events
    projectileManager.onHit(handleProjectileHit);

    logger?.info('Projectile damage integration set up successfully');
  };

  // Track unit outlines
  const unitOutlines = new Map<string, string>(); // unitId -> outlineId

  /**
   * Add outline to a unit
   * Requires world instance to be passed in
   */
  const addUnitOutline = (
    unit: Unit,
    worldInstance: any,
    config?: any,
  ): string | null => {
    if (!worldInstance || !worldInstance.addOutline) {
      logger?.warn('World instance with addOutline method is required');
      return null;
    }

    // Remove existing outline if present
    removeUnitOutline(unit, worldInstance);

    const defaultConfig = {
      edgeStrength: 3.0,
      edgeGlow: 0.5,
      edgeThickness: 1.0,
      pulsePeriod: 0,
      visibleEdgeColor: '#ffffff',
      hiddenEdgeColor: '#ffffff',
    };

    const outlineConfig = { ...defaultConfig, ...config };
    const outlineId = worldInstance.addOutline(unit.model, outlineConfig);

    if (outlineId) {
      unitOutlines.set(unit.id, outlineId);
    }

    return outlineId;
  };

  /**
   * Remove outline from a unit
   */
  const removeUnitOutline = (unit: Unit, worldInstance: any): boolean => {
    if (!worldInstance || !worldInstance.removeOutline) {
      logger?.warn('World instance with removeOutline method is required');
      return false;
    }

    const outlineId = unitOutlines.get(unit.id);
    if (outlineId) {
      worldInstance.removeOutline(outlineId);
      unitOutlines.delete(unit.id);
      return true;
    }

    return false;
  };

  /**
   * Check if unit has outline
   */
  const hasUnitOutline = (unit: Unit): boolean => {
    return unitOutlines.has(unit.id);
  };

  /**
   * Get all units with outlines
   */
  const getOutlinedUnits = (): Unit[] => {
    const outlinedUnits: Unit[] = [];
    for (const unitId of unitOutlines.keys()) {
      const unit = getUnit(unitId);
      if (unit) {
        outlinedUnits.push(unit);
      }
    }
    return outlinedUnits;
  };

  /**
   * Remove all unit outlines
   */
  const removeAllUnitOutlines = (worldInstance: any): void => {
    if (!worldInstance || !worldInstance.removeOutline) {
      logger?.warn('World instance with removeOutline method is required');
      return;
    }

    for (const outlineId of unitOutlines.values()) {
      worldInstance.removeOutline(outlineId);
    }
    unitOutlines.clear();
  };

  /**
   * Remove unit by ID
   */
  const removeUnit = (unitId: string): boolean => {
    const unit = units.get(unitId);
    if (!unit) return false;

    // Remove from scene
    scene.remove(unit.model);

    // Clean up resources
    unit.mixer.stopAllAction();

    units.delete(unitId);
    return true;
  };

  /**
   * Get unit by ID
   */
  const getUnit = (unitId: string): Unit | null => {
    return units.get(unitId) || null;
  };

  /**
   * Get all units
   */
  const getAllUnits = (): Unit[] => {
    return Array.from(units.values());
  };

  /**
   * Get units by type
   */
  const getUnitsByType = (type: UnitType): Unit[] => {
    return Array.from(units.values()).filter(
      (unit) => unit.definition.type === type,
    );
  };

  /**
   * Update all units with AI behaviors, animations, and physics
   */
  const update = (deltaTime: number, elapsedTime: number = 0): void => {
    if (!enabled) return;

    const allUnits = Array.from(units.values());

    // Find player unit for AI targeting
    const playerUnit =
      allUnits.find((unit) => unit.definition.type === 'player') || null;

    // Update AI behaviors for non-player units (exclude dead units)
    const aiUnits = allUnits.filter(
      (unit) =>
        unit.definition.type !== 'player' &&
        unit.ai &&
        !unit.ai.isStunned &&
        !unit.userData?.isDead,
    );

    if (aiUnits.length > 0) {
      // Pass ALL units to updateBehaviors so AI can find targets from all units
      aiBehaviorController.updateBehaviors(
        aiUnits,
        allUnits,
        deltaTime,
        elapsedTime,
      );

      // Update animations based on AI state
      for (const unit of aiUnits) {
        const behaviorData = aiBehaviorController.getBehaviorData(unit);
        if (behaviorData) {
          const animationName = AIBehaviorUtils.getAnimationForBehavior(
            behaviorData,
          );
          animationController.playAnimation(unit, animationName);
        }
      }
    }

    // Update animations using the animation controller
    animationController.updateAnimations(allUnits, deltaTime);

    // Update combat states (stamina regen, cooldowns) if combat controller exists
    if (combatController) {
      combatController.updateCombat(allUnits, deltaTime, elapsedTime);
    }

    for (const unit of allUnits) {
      // Basic physics update
      updateUnitPhysics(unit, deltaTime);

      // Store old position for collision resolution
      if (unit.physics) {
        unit.physics.oldPosition = unit.model.position.clone();
      }
    }

    // Handle unit-to-unit collision if enabled
    if (enableCollision) {
      handleUnitCollisions();
    }
  };

  /**
   * Update unit physics (knockback, velocity, etc.)
   */
  const updateUnitPhysics = (unit: Unit, deltaTime: number): void => {
    if (!unit.physics) return;

    // Apply knockback velocity with improved physics
    if (
      unit.physics.knockbackVelocity &&
      unit.physics.knockbackVelocity.lengthSq() > 0
    ) {
      unit.model.position.addScaledVector(
        unit.physics.knockbackVelocity,
        deltaTime,
      );

      // Apply friction based on unit's mass (if defined)
      const friction = unit.physics.friction || 0.9;
      unit.physics.knockbackVelocity.multiplyScalar(friction);

      // Stop very small velocities to prevent infinite tiny movements
      if (unit.physics.knockbackVelocity.lengthSq() < 0.0001) {
        unit.physics.knockbackVelocity.set(0, 0, 0);
      }
    }

    // Apply general velocity if any
    if (unit.physics.velocity && unit.physics.velocity.lengthSq() > 0) {
      unit.model.position.addScaledVector(unit.physics.velocity, deltaTime);

      // Apply velocity decay if defined
      if (unit.physics.velocityDecay && unit.physics.velocityDecay > 0) {
        unit.physics.velocity.multiplyScalar(
          1 - unit.physics.velocityDecay * deltaTime,
        );

        // Stop very small velocities
        if (unit.physics.velocity.lengthSq() < 0.0001) {
          unit.physics.velocity.set(0, 0, 0);
        }
      }
    }

    // Apply gravity if unit is above ground and gravity is enabled
    if (unit.physics.enableGravity && unit.physics.gravityForce) {
      unit.physics.velocity = unit.physics.velocity || new THREE.Vector3();
      unit.physics.velocity.y -= unit.physics.gravityForce * deltaTime;
    }
  };

  /**
   * Apply knockback to a unit
   */
  const applyKnockback = (
    unit: Unit,
    direction: THREE.Vector3,
    force: number,
  ): void => {
    if (!unit.physics) {
      unit.physics = {};
    }

    if (!unit.physics.knockbackVelocity) {
      unit.physics.knockbackVelocity = new THREE.Vector3();
    }

    const knockback = direction.clone().normalize().multiplyScalar(force);
    unit.physics.knockbackVelocity.add(knockback);
  };

  /**
   * Set unit velocity
   */
  const setUnitVelocity = (unit: Unit, velocity: THREE.Vector3): void => {
    if (!unit.physics) {
      unit.physics = {};
    }

    if (!unit.physics.velocity) {
      unit.physics.velocity = new THREE.Vector3();
    }

    unit.physics.velocity.copy(velocity);
  };

  /**
   * Add velocity to unit (accumulative)
   */
  const addUnitVelocity = (unit: Unit, velocity: THREE.Vector3): void => {
    if (!unit.physics) {
      unit.physics = {};
    }

    if (!unit.physics.velocity) {
      unit.physics.velocity = new THREE.Vector3();
    }

    unit.physics.velocity.add(velocity);
  };

  /**
   * Stop all movement for a unit
   */
  const stopUnitMovement = (unit: Unit): void => {
    if (unit.physics) {
      if (unit.physics.velocity) {
        unit.physics.velocity.set(0, 0, 0);
      }
      if (unit.physics.knockbackVelocity) {
        unit.physics.knockbackVelocity.set(0, 0, 0);
      }
    }
  };

  /**
   * Handle collisions between units
   */
  const handleUnitCollisions = (): void => {
    // Filter out dead units - they should not participate in collision detection
    const unitsArray = Array.from(units.values()).filter(
      (unit) => !unit.userData?.isDead,
    );

    for (let i = 0; i < unitsArray.length; i++) {
      for (let j = i + 1; j < unitsArray.length; j++) {
        const unit1 = unitsArray[i];
        const unit2 = unitsArray[j];

        const distance = unit1.model.position.distanceTo(unit2.model.position);
        const combinedRadius =
          unit1.stats.collisionRadius + unit2.stats.collisionRadius;
        const actualMinDistance = Math.max(combinedRadius, minDistance);

        if (distance < actualMinDistance && distance > 0) {
          const pushDirection = unit1.model.position
            .clone()
            .sub(unit2.model.position)
            .normalize();
          const overlap = actualMinDistance - distance;

          // Consider unit mass for physics-based collision
          const mass1 = unit1.physics?.mass || 1.0;
          const mass2 = unit2.physics?.mass || 1.0;
          const totalMass = mass1 + mass2;

          const force1 = (mass2 / totalMass) * overlap * pushStrength;
          const force2 = (mass1 / totalMass) * overlap * pushStrength;

          unit1.model.position.addScaledVector(pushDirection, force1);
          unit2.model.position.addScaledVector(pushDirection, -force2);
        }
      }
    }
  };

  /**
   * Dispose of all resources
   */
  const dispose = (): void => {
    for (const unit of units.values()) {
      scene.remove(unit.model);
      unit.mixer.stopAllAction();
    }
    units.clear();
    definitions.clear();
  };

  // Create the unit manager object first
  const unitManager = {
    registerDefinition,
    createUnit,
    removeUnit,
    getUnit,
    getAllUnits,
    getUnitsByType,
    update,
    dispose,
    // Animation control methods
    playAnimation: animationController.playAnimation,
    stopAnimations: animationController.stopAnimations,
    isAnimationPlaying: animationController.isAnimationPlaying,
    setAnimationSpeed: animationController.setAnimationSpeed,
    getCurrentAnimation: animationController.getCurrentAnimation,
    // AI Behavior methods
    initializeAIBehavior: aiBehaviorController.initializeBehavior,
    setAIBehaviorState: aiBehaviorController.setBehaviorState,
    getAIBehaviorData: aiBehaviorController.getBehaviorData,
    // Physics and movement methods
    applyKnockback,
    setUnitVelocity,
    addUnitVelocity,
    stopUnitMovement,
    // Collision detection methods
    checkUnitCollision,
    getUnitsInRange,
    // Combat methods (will be added after combat controller is created)
    performLightAttack: null as any,
    performHeavyAttack: null as any,
    performRangedAttack: null as any,
    canAttack: null as any,
    initializeCombat: null as any,
    setStamina: null as any,
    // Effects methods
    addEffect: null as any,
    removeEffect: null as any,
    removeAllEffects: null as any,
    hasEffect: null as any,
    getEffect: null as any,
    // Projectile integration methods
    checkProjectileCollision: null as any,
    createProjectileCollisionFunction: null as any,
    getProjectileManager: () => (unitManager as any).projectileManager || null,
    setupProjectileDamageIntegration,
    // Health bar integration
    setHealthBarManager: null as any,
    // Outline management methods
    addUnitOutline: null as any,
    removeUnitOutline: null as any,
    hasUnitOutline: null as any,
    getOutlinedUnits: null as any,
    removeAllUnitOutlines: null as any,
  };

  // Store config reference in unitManager for team system
  (unitManager as any).config = config;

  // Now create combat controller with unit manager reference
  combatController = createCombatController({ logger }, unitManager);

  // Create AI behavior controller with combat controller reference
  aiBehaviorController = createAIBehaviorController({}, combatController);

  // Add combat methods to unit manager
  unitManager.performLightAttack = combatController.performLightAttack;
  unitManager.performHeavyAttack = combatController.performHeavyAttack;
  unitManager.performRangedAttack = combatController.performRangedAttack;
  unitManager.canAttack = combatController.canAttack;
  unitManager.initializeCombat = combatController.initializeCombat;
  unitManager.setStamina = combatController.setStamina;

  // Add effects methods to unit manager
  unitManager.addEffect = addEffect;
  unitManager.removeEffect = removeEffect;
  unitManager.removeAllEffects = removeAllEffects;
  unitManager.hasEffect = hasEffect;
  unitManager.getEffect = getEffect;

  // Add projectile methods to unit manager
  unitManager.checkProjectileCollision = checkProjectileCollision;
  unitManager.createProjectileCollisionFunction =
    createProjectileCollisionFunction;

  // Add outline methods to unit manager
  unitManager.addUnitOutline = addUnitOutline;
  unitManager.removeUnitOutline = removeUnitOutline;
  unitManager.hasUnitOutline = hasUnitOutline;
  unitManager.getOutlinedUnits = getOutlinedUnits;
  unitManager.removeAllUnitOutlines = removeAllUnitOutlines;

  // Add health bar manager setter
  unitManager.setHealthBarManager = (healthBarManager: any) => {
    combatController.setHealthBarManager(healthBarManager);
  };

  return unitManager;
};
