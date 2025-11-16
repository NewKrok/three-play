import * as THREE from 'three';
import type { Unit, AnimationState } from '../../types/units';

/**
 * AI Behavior states
 */
export type AIBehaviorState = 'idle' | 'patrol' | 'chase' | 'attack' | 'return';

/**
 * AI Behavior configuration
 */
export type AIBehaviorConfig = {
  /** Detection range for enemy units */
  detectionRange?: number;
  /** Attack range */
  attackRange?: number;
  /** Movement speed */
  speed?: number;
  /** Rotation speed multiplier */
  rotationSpeed?: number;
  /** How long to pause between movements (random factor) */
  pauseDurationMax?: number;
  /** Time between target selection updates */
  targetUpdateInterval?: number;
};

/**
 * AI Behavior instance data
 */
export type AIBehaviorData = {
  /** Current AI state */
  state: AIBehaviorState;
  /** Target position for patrol/movement */
  targetPosition: THREE.Vector3;
  /** Target unit for chase/attack */
  targetUnit: Unit | null;
  /** Time when current action should resume */
  resumeTime: number;
  /** Next time to update target selection */
  nextTargetUpdateTime: number;
  /** Last known position (for return behavior) */
  homePosition: THREE.Vector3;
  /** Whether unit is currently attacking */
  isAttacking: boolean;
};

/**
 * AI Behavior controller for managing unit AI
 */
export type AIBehaviorController = {
  /** Initialize AI behavior for a unit */
  initializeBehavior: (unit: Unit, homePosition?: THREE.Vector3) => void;
  /** Update AI behavior for all units */
  updateBehaviors: (
    units: Unit[], 
    playerUnit: Unit | null, 
    deltaTime: number, 
    elapsedTime: number
  ) => void;
  /** Set behavior state for a specific unit */
  setBehaviorState: (unit: Unit, state: AIBehaviorState) => void;
  /** Get behavior data for a unit */
  getBehaviorData: (unit: Unit) => AIBehaviorData | null;
  /** Force target selection for a unit */
  updateTarget: (unit: Unit, playerUnit: Unit | null, elapsedTime: number) => void;
};

/**
 * Creates an AI behavior controller
 */
export const createAIBehaviorController = (
  config: AIBehaviorConfig = {}
): AIBehaviorController => {
  const {
    detectionRange = 10.0,
    attackRange = 1.5,
    speed = 4.0,
    rotationSpeed = 10.0,
    pauseDurationMax = 5.0,
    targetUpdateInterval = 3.0,
  } = config;

  // Reusable objects to avoid garbage collection
  const tempDirection = new THREE.Vector3();
  const tempTargetPosition = new THREE.Vector3();
  const rotationTargetQuaternion = new THREE.Quaternion();
  const adjustQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);

  const initializeBehavior = (unit: Unit, homePosition?: THREE.Vector3): void => {
    const behaviorData: AIBehaviorData = {
      state: 'idle',
      targetPosition: homePosition ? homePosition.clone() : unit.model.position.clone(),
      targetUnit: null,
      resumeTime: 0,
      nextTargetUpdateTime: 0,
      homePosition: homePosition ? homePosition.clone() : unit.model.position.clone(),
      isAttacking: false,
    };

    // Store behavior data in unit's userData
    if (!unit.userData) {
      unit.userData = {};
    }
    unit.userData.aiBehavior = behaviorData;
  };

  const getBehaviorData = (unit: Unit): AIBehaviorData | null => {
    return unit.userData?.aiBehavior || null;
  };

  const setBehaviorState = (unit: Unit, state: AIBehaviorState): void => {
    const behaviorData = getBehaviorData(unit);
    if (behaviorData) {
      behaviorData.state = state;
    }
  };

  const updateTarget = (unit: Unit, playerUnit: Unit | null, elapsedTime: number): void => {
    const behaviorData = getBehaviorData(unit);
    if (!behaviorData || !playerUnit) return;

    behaviorData.nextTargetUpdateTime = elapsedTime + Math.random() * targetUpdateInterval;

    const distanceToPlayer = unit.model.position.distanceTo(playerUnit.model.position);

    if (distanceToPlayer <= detectionRange) {
      // Player detected - switch to chase
      behaviorData.targetUnit = playerUnit;
      behaviorData.state = 'chase';
      behaviorData.isAttacking = false;
    } else {
      // Player not in range - patrol or return home
      behaviorData.targetUnit = null;
      if (behaviorData.state === 'chase' || behaviorData.state === 'attack') {
        behaviorData.state = 'return';
        behaviorData.targetPosition.copy(behaviorData.homePosition);
      } else if (behaviorData.state === 'idle') {
        // Generate new patrol target around home position
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 5;
        behaviorData.targetPosition.copy(behaviorData.homePosition);
        behaviorData.targetPosition.x += Math.cos(angle) * distance;
        behaviorData.targetPosition.z += Math.sin(angle) * distance;
        behaviorData.state = 'patrol';
      }
    }
  };

  const updateUnitMovement = (
    unit: Unit, 
    targetPosition: THREE.Vector3, 
    deltaTime: number
  ): void => {
    // Calculate direction (flattened to horizontal plane)
    tempDirection.subVectors(targetPosition, unit.model.position);
    tempDirection.y = 0;
    tempDirection.normalize();

    // Update rotation to face movement direction
    rotationTargetQuaternion
      .setFromUnitVectors(new THREE.Vector3(0, 0, 1), tempDirection)
      .multiply(adjustQuat);
    unit.model.quaternion.slerp(rotationTargetQuaternion, deltaTime * rotationSpeed);

    // Move unit
    unit.model.position.addScaledVector(tempDirection, speed * deltaTime);
  };

  const updateBehaviors = (
    units: Unit[], 
    playerUnit: Unit | null, 
    deltaTime: number, 
    elapsedTime: number
  ): void => {
    for (const unit of units) {
      const behaviorData = getBehaviorData(unit);
      if (!behaviorData) continue;

      // Update target selection periodically
      if (elapsedTime >= behaviorData.nextTargetUpdateTime) {
        updateTarget(unit, playerUnit, elapsedTime);
      }

      // Skip movement if in pause period
      if (elapsedTime < behaviorData.resumeTime) {
        continue;
      }

      switch (behaviorData.state) {
        case 'idle': {
          // Wait for next target update
          break;
        }

        case 'patrol': {
          updateUnitMovement(unit, behaviorData.targetPosition, deltaTime);
          
          // Check if reached patrol target
          if (unit.model.position.distanceTo(behaviorData.targetPosition) < 1.5) {
            behaviorData.state = 'idle';
            behaviorData.resumeTime = elapsedTime + Math.random() * pauseDurationMax;
          }
          break;
        }

        case 'chase': {
          if (behaviorData.targetUnit) {
            tempTargetPosition.copy(behaviorData.targetUnit.model.position);
            updateUnitMovement(unit, tempTargetPosition, deltaTime);

            // Check if close enough to attack
            const distanceToTarget = unit.model.position.distanceTo(behaviorData.targetUnit.model.position);
            if (distanceToTarget <= attackRange) {
              behaviorData.state = 'attack';
              behaviorData.isAttacking = true;
              behaviorData.resumeTime = elapsedTime + Math.random() * 3;
            }
          } else {
            behaviorData.state = 'return';
            behaviorData.targetPosition.copy(behaviorData.homePosition);
          }
          break;
        }

        case 'attack': {
          if (behaviorData.targetUnit) {
            const distanceToTarget = unit.model.position.distanceTo(behaviorData.targetUnit.model.position);
            if (distanceToTarget > attackRange * 1.5) {
              // Target moved away, resume chase
              behaviorData.state = 'chase';
              behaviorData.isAttacking = false;
            }
            // Attack logic will be handled by animation/combat system
          } else {
            behaviorData.state = 'return';
            behaviorData.targetPosition.copy(behaviorData.homePosition);
          }
          break;
        }

        case 'return': {
          updateUnitMovement(unit, behaviorData.homePosition, deltaTime);
          
          // Check if returned home
          if (unit.model.position.distanceTo(behaviorData.homePosition) < 2.0) {
            behaviorData.state = 'idle';
            behaviorData.resumeTime = elapsedTime + Math.random() * pauseDurationMax;
          }
          break;
        }
      }
    }
  };

  return {
    initializeBehavior,
    updateBehaviors,
    setBehaviorState,
    getBehaviorData,
    updateTarget,
  };
};

/**
 * AI Behavior utilities
 */
export const AIBehaviorUtils = {
  /**
   * Create default AI behavior controller
   */
  createDefault: () => createAIBehaviorController(),

  /**
   * Create aggressive AI behavior (faster, longer detection range)
   */
  createAggressive: () => createAIBehaviorController({
    detectionRange: 15.0,
    attackRange: 2.0,
    speed: 6.0,
    rotationSpeed: 15.0,
    pauseDurationMax: 2.0,
    targetUpdateInterval: 2.0,
  }),

  /**
   * Create passive AI behavior (slower, shorter detection range)
   */
  createPassive: () => createAIBehaviorController({
    detectionRange: 5.0,
    attackRange: 1.0,
    speed: 2.0,
    rotationSpeed: 5.0,
    pauseDurationMax: 8.0,
    targetUpdateInterval: 5.0,
  }),

  /**
   * Get animation name for AI state
   */
  getAnimationForState: (state: AIBehaviorState): AnimationState => {
    switch (state) {
      case 'idle': return 'idle';
      case 'patrol': return 'walk';
      case 'chase': return 'run';
      case 'attack': return 'attack';
      case 'return': return 'walk';
      default: return 'idle';
    }
  },
} as const;