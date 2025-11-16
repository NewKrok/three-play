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
   * Remove a unit by ID
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
   * Update all units (basic implementation - will be expanded in later phases)
   */
  const update = (deltaTime: number): void => {
    if (!enabled) return;

    for (const unit of units.values()) {
      // Update animation mixer
      unit.mixer.update(deltaTime);

      // Basic physics update
      updateUnitPhysics(unit, deltaTime);

      // Store old position for collision resolution
      if (unit.physics) {
        unit.physics.oldPosition = unit.model.position.clone();
      }

      // Basic AI update placeholder (will be implemented in Phase 2)
      if (unit.ai && !unit.ai.isStunned && unit.definition.type !== 'player') {
        // TODO: Implement AI behaviors in Phase 2
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

    // Apply knockback velocity
    if (unit.physics.knockbackVelocity) {
      unit.model.position.addScaledVector(
        unit.physics.knockbackVelocity,
        deltaTime,
      );
      unit.physics.knockbackVelocity.multiplyScalar(0.9); // Apply friction

      // Stop very small velocities
      if (unit.physics.knockbackVelocity.lengthSq() < 0.0001) {
        unit.physics.knockbackVelocity.set(0, 0, 0);
      }
    }

    // Apply general velocity if any
    if (unit.physics.velocity && unit.physics.velocity.lengthSq() > 0) {
      unit.model.position.addScaledVector(unit.physics.velocity, deltaTime);
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

        if (distance < minDistance) {
          const pushDirection = unit1.model.position
            .clone()
            .sub(unit2.model.position)
            .normalize();
          const overlap = minDistance - distance;

          unit1.model.position.addScaledVector(
            pushDirection,
            overlap * pushStrength,
          );
          unit2.model.position.addScaledVector(
            pushDirection,
            -overlap * pushStrength,
          );
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
  };
};
