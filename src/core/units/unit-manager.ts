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
import { createAIBehaviorController, AIBehaviorUtils } from './ai-behavior-controller.js';
import type { AIBehaviorController } from './ai-behavior-controller.js';

/**
 * Create a unit manager instance
 * @param config - Configuration for the unit manager
 * @returns UnitManager instance
 */
export const createUnitManager = (config: UnitManagerConfig): UnitManager => {
  const {
    scene,
    loadedAssets,
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
  const animationController: AnimationControllerImpl = createAnimationController();
  
  // Create AI behavior controller
  const aiBehaviorController: AIBehaviorController = createAIBehaviorController();

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
      console.error(`Unit definition '${params.definitionId}' not found`);
      return null;
    }

    // Check unit limit
    if (maxUnits && units.size >= maxUnits) {
      console.warn('Maximum unit limit reached');
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
      console.error('Failed to create unit:', error);
      return null;
    }
  };

  /**
   * Check collision between two units
   */
  const checkUnitCollision = (unit1: Unit, unit2: Unit): boolean => {
    const distance = unit1.model.position.distanceTo(unit2.model.position);
    const combinedRadius = unit1.stats.collisionRadius + unit2.stats.collisionRadius;
    return distance < combinedRadius;
  };

  /**
   * Get units within range of a position
   */
  const getUnitsInRange = (
    position: THREE.Vector3, 
    range: number, 
    excludeUnit?: Unit
  ): Unit[] => {
    return Array.from(units.values()).filter(unit => {
      if (excludeUnit && unit.id === excludeUnit.id) return false;
      return unit.model.position.distanceTo(position) <= range;
    });
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
    const playerUnit = allUnits.find(unit => unit.definition.type === 'player') || null;
    
    // Update AI behaviors for non-player units
    const aiUnits = allUnits.filter(unit => 
      unit.definition.type !== 'player' && 
      unit.ai && 
      !unit.ai.isStunned
    );
    
    if (aiUnits.length > 0) {
      aiBehaviorController.updateBehaviors(aiUnits, playerUnit, deltaTime, elapsedTime);
      
      // Update animations based on AI state
      for (const unit of aiUnits) {
        const behaviorData = aiBehaviorController.getBehaviorData(unit);
        if (behaviorData) {
          const animationName = AIBehaviorUtils.getAnimationForState(behaviorData.state);
          animationController.playAnimation(unit, animationName);
        }
      }
    }
    
    // Update animations using the animation controller
    animationController.updateAnimations(allUnits, deltaTime);

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
    if (unit.physics.knockbackVelocity && unit.physics.knockbackVelocity.lengthSq() > 0) {
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
        unit.physics.velocity.multiplyScalar(1 - unit.physics.velocityDecay * deltaTime);
        
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
    force: number
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
  const setUnitVelocity = (
    unit: Unit, 
    velocity: THREE.Vector3
  ): void => {
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
  const addUnitVelocity = (
    unit: Unit, 
    velocity: THREE.Vector3
  ): void => {
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
    const unitsArray = Array.from(units.values());

    for (let i = 0; i < unitsArray.length; i++) {
      for (let j = i + 1; j < unitsArray.length; j++) {
        const unit1 = unitsArray[i];
        const unit2 = unitsArray[j];

        const distance = unit1.model.position.distanceTo(unit2.model.position);
        const combinedRadius = unit1.stats.collisionRadius + unit2.stats.collisionRadius;
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

  // Return the UnitManager interface
  return {
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
  };
};
