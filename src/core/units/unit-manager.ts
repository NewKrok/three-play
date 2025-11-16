import * as THREE from 'three';
import type { 
  UnitManager as IUnitManager, 
  UnitManagerConfig, 
  UnitDefinition, 
  Unit, 
  CreateUnitParams,
  UnitType 
} from '../../types/units.js';
import type { LoadedAssets } from '../../types/assets.js';
// World type will be properly defined when integrating with world
import { CharacterAssetUtils } from './character-asset-utils.js';

/**
 * Unit Manager implementation for managing units in the game world
 * Generic implementation that works with any properly defined unit definitions
 */
export class UnitManager implements IUnitManager {
  private units: Map<string, Unit> = new Map();
  private definitions: Map<string, UnitDefinition> = new Map();
  private config: UnitManagerConfig;
  private world: any; // Will be properly typed when integrating with world
  private loadedAssets: LoadedAssets;
  private scene: THREE.Scene;
  private nextUnitId = 1;

  constructor(world: any, config: UnitManagerConfig = {}) {
    this.world = world;
    this.config = {
      enabled: true,
      maxUnits: 1000,
      enableCollision: true,
      collision: {
        minDistance: 1.0,
        pushStrength: 0.5,
      },
      performance: {
        updateFrequency: 60,
        enableFrustumCulling: false,
      },
      ...config,
    };
    
    this.loadedAssets = world.getLoadedAssets();
    this.scene = world.getScene();
  }

  /**
   * Register a unit definition for creating units
   */
  registerDefinition(definition: UnitDefinition): void {
    this.definitions.set(definition.id, definition);
  }

  /**
   * Create a new unit instance
   */
  createUnit(params: CreateUnitParams): Unit | null {
    if (!this.config.enabled) {
      return null;
    }

    // Check unit limit
    if (this.units.size >= (this.config.maxUnits || 1000)) {
      console.warn(`Cannot create unit: Maximum units (${this.config.maxUnits}) reached`);
      return null;
    }

    // Get unit definition
    const definition = this.definitions.get(params.definitionId);
    if (!definition) {
      console.error(`Unit definition '${params.definitionId}' not found`);
      return null;
    }

    try {
      // Generate unique ID
      const unitId = `unit_${this.nextUnitId++}`;

      // Create character instance using generic asset utils
      const characterData = CharacterAssetUtils.createInstance(
        definition, 
        this.loadedAssets
      );

      // Set initial position and rotation
      characterData.model.position.copy(params.position);
      if (params.rotation !== undefined) {
        characterData.model.rotation.y = params.rotation;
      }

      // Add to scene
      this.scene.add(characterData.model);

      // Create unit instance
      const unit: Unit = {
        id: unitId,
        definition,
        model: characterData.model,
        mixer: characterData.mixer,
        actions: characterData.actions,
        currentAnimation: 'idle',
        stats: {
          health: params.statsOverride?.health ?? definition.stats.health,
          maxHealth: definition.stats.health,
          speed: params.statsOverride?.speed ?? definition.stats.speed,
          attackDamage: params.statsOverride?.attackDamage ?? definition.stats.attackDamage ?? 10,
          collisionRadius: params.statsOverride?.collisionRadius ?? definition.stats.collisionRadius ?? 0.5,
        },
        physics: {
          velocity: new THREE.Vector3(),
          knockbackVelocity: new THREE.Vector3(),
          oldPosition: params.position.clone(),
        },
        ai: definition.type !== 'player' ? {
          target: new THREE.Vector3(),
          nextTargetSelectionTime: 0,
          resumeTime: 0,
          isAttacking: false,
          isStunned: false,
        } : undefined,
        effects: {},
        userData: params.userData || {},
      };

      // Store unit
      this.units.set(unitId, unit);

      // Start with idle animation
      this.playIdleAnimation(unit);

      return unit;
    } catch (error) {
      console.error(`Failed to create unit '${params.definitionId}':`, error);
      return null;
    }
  }

  /**
   * Remove unit by ID
   */
  removeUnit(unitId: string): boolean {
    const unit = this.units.get(unitId);
    if (!unit) {
      return false;
    }

    // Remove from scene
    this.scene.remove(unit.model);

    // Dispose resources
    unit.mixer.stopAllAction();
    
    // Remove from units map
    this.units.delete(unitId);

    return true;
  }

  /**
   * Get unit by ID
   */
  getUnit(unitId: string): Unit | null {
    return this.units.get(unitId) || null;
  }

  /**
   * Get all units
   */
  getAllUnits(): Unit[] {
    return Array.from(this.units.values());
  }

  /**
   * Get units by type
   */
  getUnitsByType(type: UnitType): Unit[] {
    return Array.from(this.units.values()).filter(unit => unit.definition.type === type);
  }

  /**
   * Update all units
   */
  update(deltaTime: number): void {
    if (!this.config.enabled) {
      return;
    }

    for (const unit of this.units.values()) {
      this.updateUnit(unit, deltaTime);
    }

    // Handle unit-to-unit collision if enabled
    if (this.config.enableCollision) {
      this.handleUnitCollisions();
    }
  }

  /**
   * Update a single unit
   */
  private updateUnit(unit: Unit, deltaTime: number): void {
    // Update animation mixer
    unit.mixer.update(deltaTime);

    // Update physics (knockback velocity)
    if (unit.physics?.knockbackVelocity) {
      unit.model.position.addScaledVector(unit.physics.knockbackVelocity, deltaTime);
      unit.physics.knockbackVelocity.multiplyScalar(0.9); // Damping
      
      if (unit.physics.knockbackVelocity.lengthSq() < 0.0001) {
        unit.physics.knockbackVelocity.set(0, 0, 0);
      }
    }

    // Store old position for collision resolution
    if (unit.physics?.oldPosition) {
      unit.physics.oldPosition.copy(unit.model.position);
    }
  }

  /**
   * Handle collisions between units
   */
  private handleUnitCollisions(): void {
    const units = Array.from(this.units.values());
    const minDistance = this.config.collision?.minDistance || 1.0;
    const pushStrength = this.config.collision?.pushStrength || 0.5;

    for (let i = 0; i < units.length; i++) {
      const unit1 = units[i];

      for (let j = i + 1; j < units.length; j++) {
        const unit2 = units[j];

        const distance = unit1.model.position.distanceTo(unit2.model.position);

        if (distance < minDistance) {
          const pushDirection = unit1.model.position.clone()
            .sub(unit2.model.position)
            .normalize();
          const overlap = minDistance - distance;

          // Push units apart
          unit1.model.position.addScaledVector(pushDirection, overlap * pushStrength);
          unit2.model.position.addScaledVector(pushDirection, -overlap * pushStrength);
        }
      }
    }
  }

  /**
   * Play idle animation for a unit
   */
  private playIdleAnimation(unit: Unit): void {
    if (unit.actions.idle) {
      unit.actions.idle.play();
      unit.currentAnimation = 'idle';
    }
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    // Remove all units
    for (const unitId of this.units.keys()) {
      this.removeUnit(unitId);
    }

    this.units.clear();
    this.definitions.clear();
  }
}