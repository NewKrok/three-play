import * as THREE from 'three';
import type { Unit, AttackType, CombatConfig } from '../../types/units';
import { TeamUtils } from '../utils/team-utils.js';
import {
  calculateDamage,
  applyCalculatedDamage,
  regenerateHealth,
} from '../utils/damage-calculator.js';
import type { DamageResult } from '../../types/combat.js';

/**
 * Combat attack result
 */
export type AttackResult = {
  /** Whether the attack was successful */
  success: boolean;
  /** Units that were hit */
  hitUnits: Unit[];
  /** Damage dealt to each unit with detailed breakdown */
  damages: { unit: Unit; damage: number; damageResult?: DamageResult }[];
  /** Reason for failure if attack failed */
  failureReason?: string;
};

/**
 * Combat system controller for managing unit combat
 */
export type CombatController = {
  /** Perform a light attack */
  performLightAttack: (attacker: Unit, currentTime: number) => AttackResult;
  /** Perform a heavy attack */
  performHeavyAttack: (attacker: Unit, currentTime: number) => AttackResult;
  /** Perform a ranged attack */
  performRangedAttack: (
    attacker: Unit,
    target: THREE.Vector3 | Unit,
    currentTime: number,
  ) => AttackResult;
  /** Check if unit can perform ranged attack */
  canPerformRangedAttack: (
    attacker: Unit,
    target: THREE.Vector3 | Unit,
    currentTime: number,
  ) => boolean;
  /** Get ranged attack range for a unit */
  getRangedAttackRange: (unit: Unit) => number;
  /** Apply damage to a unit */
  applyDamage: (
    target: Unit,
    damage: number,
    source?: Unit,
  ) => { isDead: boolean; damageResult?: DamageResult };
  /** Check if unit can attack */
  canAttack: (
    unit: Unit,
    attackType: AttackType,
    currentTime: number,
  ) => boolean;
  /** Update combat states (cooldowns, stamina regeneration) */
  updateCombat: (units: Unit[], deltaTime: number, currentTime: number) => void;
  /** Initialize combat data for a unit */
  initializeCombat: (unit: Unit, stamina?: number, config?: CombatConfig) => void;
  /** Set stamina for a unit */
  setStamina: (unit: Unit, stamina: number) => void;
  /** Get units in attack range */
  getUnitsInAttackRange: (attacker: Unit, attackType: AttackType) => Unit[];
  /** Set health bar manager for automatic cleanup on death */
  setHealthBarManager: (manager: any) => void;
};

/**
 * Creates a combat controller
 */
export const createCombatController = (
  config: CombatConfig = {},
  unitManager: any, // We'll receive the unit manager reference
): CombatController => {
  const {
    logger,
    onDamage,
    lightAttack = {
      damage: 10,
      knockback: 5,
      range: 2.5,
      cooldown: 1000,
      staminaCost: 20,
      stunDuration: 1000,
      actionDelay: 300,
    },
    heavyAttack = {
      damage: 25,
      knockback: 10,
      range: 3.0,
      cooldown: 2000,
      staminaCost: 40,
      stunDuration: 2000,
      actionDelay: 500,
    },
    rangedAttack = {
      actionDelay: 400,
      enableAmmo: true,
    },
    ammo,
    enableDamage = true,
  } = config;

  // Reusable objects to avoid garbage collection
  const tempDirection = new THREE.Vector3();

  // Optional health bar manager for automatic cleanup
  let healthBarManager: any = null;

  const setHealthBarManager = (manager: any): void => {
    healthBarManager = manager;
  };

  const initializeCombat = (unit: Unit, stamina: number = 100, unitConfig?: CombatConfig): void => {
    if (!unit.combat) {
      unit.combat = {};
    }

    unit.combat.lastLightAttackTime = 0;
    unit.combat.lastHeavyAttackTime = 0;
    unit.combat.lastRangedAttackTime = 0;
    unit.combat.isAttacking = false;
    unit.combat.isAiming = false;
    unit.combat.stamina = stamina;
    unit.combat.maxStamina = stamina;

    // Store unit-specific combat config (including ammo callbacks)
    if (unitConfig) {
      unit.combat.config = unitConfig;
    }
  };

  const canAttack = (
    unit: Unit,
    attackType: AttackType,
    currentTime: number,
  ): boolean => {
    if (!unit.combat) return false;

    // Check if already attacking
    if (unit.combat.isAttacking) return false;

    // Check if stunned
    if (unit.ai?.isStunned) return false;

    const attackConfig = attackType === 'light' ? lightAttack : heavyAttack;

    // Check stamina
    if ((unit.combat.stamina || 0) < (attackConfig.staminaCost || 0))
      return false;

    // Check cooldown
    const lastAttackTime =
      attackType === 'light'
        ? unit.combat.lastLightAttackTime || 0
        : unit.combat.lastHeavyAttackTime || 0;

    return currentTime >= lastAttackTime + (attackConfig.cooldown || 0);
  };

  const getUnitsInAttackRange = (
    attacker: Unit,
    attackType: AttackType,
  ): Unit[] => {
    const attackConfig = attackType === 'light' ? lightAttack : heavyAttack;
    const range = attackConfig.range || 2.0;

    const unitsInRange = unitManager.getUnitsInRange(
      attacker.model.position,
      range,
      attacker,
    );

    // Filter by team - only include units that can be attacked and are not dead
    const teamConfig = unitManager.config?.teams;
    return unitsInRange.filter(
      (unit: Unit) =>
        TeamUtils.canAttack(attacker, unit, teamConfig) &&
        !unit.userData?.isDead,
    );
  };

  /**
   * Handle unit death with animations and cleanup
   */
  const handleUnitDeath = (unit: Unit): void => {
    // Skip if already marked as dead
    if (unit.userData?.isDead) return;

    // Mark as dead immediately to prevent multiple death triggers
    if (!unit.userData) unit.userData = {};
    unit.userData.isDead = true;

    // Stop AI behavior immediately
    if (unit.ai) {
      unit.ai.isStunned = true;
    }

    // Get death configuration from unit definition
    const deathConfig = unit.definition.death;
    const autoHandle = deathConfig?.autoHandle !== false; // Default true

    if (!autoHandle) {
      // If autoHandle is disabled, only call onDamage callback
      // and let the application handle death
      return;
    }

    // Choose death animation
    let deathAnimation: string | undefined;
    if (deathConfig?.animations && deathConfig.animations.length > 0) {
      // Random selection from animations array
      const randomIndex = Math.floor(Math.random() * deathConfig.animations.length);
      deathAnimation = deathConfig.animations[randomIndex];
    } else if (deathConfig?.animation) {
      // Single animation specified
      deathAnimation = deathConfig.animation;
    }

    // Play death animation if available
    if (deathAnimation && unit.actions?.[deathAnimation]) {
      unitManager.playAnimation(unit, deathAnimation);

      // Configure animation properties
      const action = unit.actions[deathAnimation];
      if (action) {
        const loop = deathConfig?.loop ?? false;
        const clampWhenFinished = deathConfig?.clampWhenFinished ?? true;

        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, 1);
        action.clampWhenFinished = clampWhenFinished;
      }
    }

    // Schedule unit removal
    const removeDelay = deathConfig?.removeDelay ?? 2000;
    setTimeout(() => {
      // Remove health bar if health bar manager is available
      if (healthBarManager) {
        const healthBar = healthBarManager.getHealthBar(unit);
        if (healthBar) {
          healthBarManager.removeHealthBar(healthBar);
        }
      }

      unitManager.removeUnit(unit.id);
    }, removeDelay);
  };

  const applyDamage = (
    target: Unit,
    damage: number,
    source?: Unit,
  ): { isDead: boolean; damageResult?: DamageResult } => {
    if (!enableDamage) return { isDead: false };

    // If source is provided, use the new damage calculation system
    if (source) {
      const damageResult = calculateDamage(source, target);
      const isDead = applyCalculatedDamage(target, damageResult);

      // Handle death automatically if enabled
      if (isDead) {
        handleUnitDeath(target);
      }

      return { isDead, damageResult };
    }

    // Fallback to simple damage (for backwards compatibility)
    target.stats.health -= damage;
    target.stats.health = Math.max(0, target.stats.health);

    // Return true if unit died
    const isDead = target.stats.health <= 0;

    // Handle death automatically if enabled
    if (isDead) {
      handleUnitDeath(target);
    }

    return { isDead };
  };

  const executeAttack = (
    attacker: Unit,
    attackType: AttackType,
    currentTime: number,
  ): AttackResult => {
    const attackConfig = attackType === 'light' ? lightAttack : heavyAttack;
    const targetsInRange = getUnitsInAttackRange(attacker, attackType);

    const result: AttackResult = {
      success: true,
      hitUnits: [],
      damages: [],
    };

    // Set attacking state
    if (attacker.combat) {
      attacker.combat.isAttacking = true;

      // Consume stamina
      attacker.combat.stamina =
        (attacker.combat.stamina || 0) - (attackConfig.staminaCost || 0);
      attacker.combat.stamina = Math.max(0, attacker.combat.stamina);

      // Set last attack time
      if (attackType === 'light') {
        attacker.combat.lastLightAttackTime = currentTime;
      } else {
        attacker.combat.lastHeavyAttackTime = currentTime;
      }
    }

    // Calculate animation duration - should complete before cooldown
    const animationDuration = attackType === 'light' ? 1000 : 1500; // Approximate durations

    // End attacking state after animation duration (independent of damage delay)
    setTimeout(() => {
      if (attacker.combat) {
        attacker.combat.isAttacking = false;
      }

      // Return to idle animation
      if (unitManager.playAnimation) {
        unitManager.playAnimation(attacker, 'idle');
      }
    }, animationDuration);

    // Schedule attack effect (delayed for impact timing)
    setTimeout(() => {
      for (const target of targetsInRange) {
        // Skip if target is already dead (may have died during setTimeout delay)
        if (target.userData?.isDead) {
          continue;
        }

        // Calculate knockback direction
        tempDirection.subVectors(
          target.model.position,
          attacker.model.position,
        );
        tempDirection.y = 0; // Keep horizontal
        tempDirection.normalize();

        // Apply knockback
        if (attackConfig.knockback) {
          unitManager.applyKnockback(
            target,
            tempDirection,
            attackConfig.knockback,
          );
        }

        // Apply damage using the new combat system
        if (enableDamage) {
          const { isDead, damageResult } = applyDamage(target, 0, attacker);

          if (damageResult) {
            result.damages.push({
              unit: target,
              damage: damageResult.finalDamage,
              damageResult,
            });

            // Log combat details
            if (damageResult.wasCritical) {
              logger?.info(
                `CRITICAL HIT! ${attacker.id} dealt ${damageResult.finalDamage} damage to ${target.id}`,
              );
            }

            // Call onDamage callback if provided
            if (onDamage) {
              onDamage(attacker, target, damageResult);
            }

            // Also call global window callback if it exists (for UI integration)
            if (typeof window !== 'undefined' && (window as any).showDamageNumber) {
              (window as any).showDamageNumber(target, damageResult);
            }
          }

          if (isDead) {
            // Handle unit death if needed
            logger?.info(`Unit ${target.id} was defeated!`);
          }
        }

        // Apply stun (only if target is still alive and not already dead)
        if (
          attackConfig.stunDuration &&
          target.ai &&
          !target.userData?.isDead
        ) {
          target.ai.isStunned = true;

          // Play hit animation if unit manager has animation control
          if (unitManager.playAnimation) {
            unitManager.playAnimation(target, 'hitToBody');
          }

          // Remove stun after duration
          setTimeout(() => {
            if (target.ai && !target.userData?.isDead) {
              target.ai.isStunned = false;
            }
            // Return to idle if still alive and not dead
            if (
              target.stats.health > 0 &&
              !target.userData?.isDead &&
              unitManager.playAnimation
            ) {
              unitManager.playAnimation(target, 'idle');
            }
          }, attackConfig.stunDuration);
        }

        result.hitUnits.push(target);
      }
    }, attackConfig.actionDelay || 0);

    return result;
  };

  const performLightAttack = (
    attacker: Unit,
    currentTime: number,
  ): AttackResult => {
    if (!canAttack(attacker, 'light', currentTime)) {
      return {
        success: false,
        hitUnits: [],
        damages: [],
        failureReason:
          'Cannot perform light attack (cooldown, stamina, or already attacking)',
      };
    }

    // Play attack animation
    if (unitManager.playAnimation) {
      unitManager.playAnimation(attacker, 'lightAttack');
    }

    return executeAttack(attacker, 'light', currentTime);
  };

  const performHeavyAttack = (
    attacker: Unit,
    currentTime: number,
  ): AttackResult => {
    if (!canAttack(attacker, 'heavy', currentTime)) {
      return {
        success: false,
        hitUnits: [],
        damages: [],
        failureReason:
          'Cannot perform heavy attack (cooldown, stamina, or already attacking)',
      };
    }

    // Play attack animation
    if (unitManager.playAnimation) {
      unitManager.playAnimation(attacker, 'heavyAttack');
    }

    return executeAttack(attacker, 'heavy', currentTime);
  };

  const getRangedAttackRange = (unit: Unit): number => {
    return unit.definition.rangedAttack?.range || 0;
  };

  const canPerformRangedAttack = (
    attacker: Unit,
    target: THREE.Vector3 | Unit,
    currentTime: number,
  ): boolean => {
    if (!attacker.combat) return false;
    if (!attacker.definition.rangedAttack) return false;

    // Check if already attacking
    if (attacker.combat.isAttacking) return false;

    // Check if stunned
    if (attacker.ai?.isStunned) return false;

    const rangedConfig = attacker.definition.rangedAttack;

    // Check stamina
    const currentStamina = attacker.combat.stamina || 0;
    if (currentStamina < rangedConfig.staminaCost) return false;

    // Check cooldown
    const lastAttackTime = attacker.combat.lastRangedAttackTime || 0;
    if (currentTime < lastAttackTime + rangedConfig.cooldown) return false;

    // Check ammo if enabled (check both global config and unit-specific config)
    const unitConfig = attacker.combat?.config;
    const isAmmoEnabled = (rangedAttack.enableAmmo || unitConfig?.rangedAttack?.enableAmmo) ?? false;
    const ammoCallback = unitConfig?.ammo?.canUseAmmo || ammo?.canUseAmmo;

    if (isAmmoEnabled && rangedConfig.ammoType && ammoCallback) {
      if (!ammoCallback(attacker, rangedConfig.ammoType)) return false;
    }

    // Check range
    const targetPosition = target instanceof THREE.Vector3 ? target : target.model.position;
    const distance = attacker.model.position.distanceTo(targetPosition);
    if (distance > rangedConfig.range) return false;

    return true;
  };

  const performRangedAttack = (
    attacker: Unit,
    target: THREE.Vector3 | Unit,
    currentTime: number,
  ): AttackResult => {
    if (!canPerformRangedAttack(attacker, target, currentTime)) {
      return {
        success: false,
        hitUnits: [],
        damages: [],
        failureReason:
          'Cannot perform ranged attack (cooldown, stamina, ammo, range, or already attacking)',
      };
    }

    const rangedConfig = attacker.definition.rangedAttack!;
    const projectileManager = unitManager.getProjectileManager?.();

    if (!projectileManager) {
      logger?.error('Projectile manager not available for ranged attack');
      return {
        success: false,
        hitUnits: [],
        damages: [],
        failureReason: 'Projectile manager not available',
      };
    }

    // Check if attacker is facing the target (within acceptable angle tolerance)
    const targetPosition = target instanceof THREE.Vector3 ? target : target.model.position;
    const directionToTarget = new THREE.Vector3()
      .subVectors(targetPosition, attacker.model.position)
      .normalize();
    directionToTarget.y = 0; // Only check horizontal facing

    // Get attacker's forward direction
    const attackerForward = new THREE.Vector3(1, 0, 0);
    attackerForward.applyQuaternion(attacker.model.quaternion);
    attackerForward.y = 0;
    attackerForward.normalize();

    // Calculate angle between attacker's facing and target direction
    const dotProduct = attackerForward.dot(directionToTarget);
    const angleRadians = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
    const angleDegrees = (angleRadians * 180) / Math.PI;

    // Angle tolerance: Warcraft 3-inspired values
    // Player units need precise aiming (10 degrees)
    // AI units have small tolerance to account for smooth rotation (15 degrees)
    const isPlayerUnit = attacker.definition.type === 'player';
    const angleToleranceDegrees = isPlayerUnit ? 10 : 15;

    // If not facing target, don't start the attack
    if (angleDegrees > angleToleranceDegrees) {
      return {
        success: false,
        hitUnits: [],
        damages: [],
        failureReason: 'Not facing target - wait for character to rotate',
      };
    }

    // Set attacking state
    if (attacker.combat) {
      attacker.combat.isAttacking = true;
      attacker.combat.lastRangedAttackTime = currentTime;

      // Consume stamina
      attacker.combat.stamina = (attacker.combat.stamina || 0) - rangedConfig.staminaCost;
      attacker.combat.stamina = Math.max(0, attacker.combat.stamina);

      // Consume ammo if enabled (check both global config and unit-specific config)
      const unitConfig = attacker.combat?.config;
      const isAmmoEnabled = (rangedAttack.enableAmmo || unitConfig?.rangedAttack?.enableAmmo) ?? false;
      const consumeCallback = unitConfig?.ammo?.consumeAmmo || ammo?.consumeAmmo;

      if (isAmmoEnabled && rangedConfig.ammoType && consumeCallback) {
        consumeCallback(attacker, rangedConfig.ammoType, 1);
      }
    }

    // Play ranged attack animation
    if (unitManager.playAnimation && rangedConfig.animation) {
      unitManager.playAnimation(attacker, rangedConfig.animation);
    }

    // Calculate animation duration
    const animationDuration = 1000; // Default 1 second

    // End attacking state after animation
    setTimeout(() => {
      if (attacker.combat) {
        attacker.combat.isAttacking = false;
      }
      // Return to idle
      if (unitManager.playAnimation) {
        unitManager.playAnimation(attacker, 'idle');
      }
    }, animationDuration);

    // Launch projectile after action delay
    setTimeout(() => {
      // Calculate launch position
      const launchPosition = new THREE.Vector3();

      // Try to use spawn bone if specified
      if (rangedConfig.spawnBone) {
        let bone: THREE.Object3D | null = null;
        attacker.model.traverse((child: THREE.Object3D) => {
          if (child.name === rangedConfig.spawnBone) {
            bone = child;
          }
        });

        if (bone) {
          (bone as THREE.Object3D).getWorldPosition(launchPosition);
        } else {
          // Fallback to unit position
          launchPosition.copy(attacker.model.position);
          launchPosition.y += 1.5;
        }
      } else {
        // Default: chest height
        launchPosition.copy(attacker.model.position);
        launchPosition.y += 1.5;
      }

      // Apply spawn offset in local space (relative to character rotation)
      if (rangedConfig.spawnOffset) {
        const offsetVector = new THREE.Vector3(
          rangedConfig.spawnOffset.x || 0,
          rangedConfig.spawnOffset.y || 0,
          rangedConfig.spawnOffset.z || 0,
        );

        // Transform offset by character's rotation
        offsetVector.applyQuaternion(attacker.model.quaternion);
        launchPosition.add(offsetVector);
      }

      // Calculate direction to target
      const targetPosition = target instanceof THREE.Vector3 ? target : target.model.position;
      const direction = new THREE.Vector3()
        .subVectors(targetPosition, launchPosition)
        .normalize();

      // Add upward arc for ballistic trajectory
      direction.y += 0.05; // Small arc to hit enemies at chest height
      direction.normalize();

      // Prepare combat data
      const combatData = {
        attackerUnit: attacker,
        areaDamage: rangedConfig.areaRadius
          ? {
              radius: rangedConfig.areaRadius,
              maxTargets: rangedConfig.maxTargets || 5,
            }
          : undefined,
      };

      // Launch projectile
      const projectile = projectileManager.launch({
        definitionId: rangedConfig.projectileId,
        origin: launchPosition,
        direction,
        strength: 18, // Projectile launch strength
        userData: { combatData },
      });

      if (projectile) {
        logger?.info(
          `Unit ${attacker.id} launched ${rangedConfig.projectileId} projectile at ${launchPosition.x.toFixed(1)},${launchPosition.y.toFixed(1)},${launchPosition.z.toFixed(1)}`,
        );
      } else {
        logger?.error(
          `Unit ${attacker.id} FAILED to launch ${rangedConfig.projectileId} projectile!`,
        );
      }
    }, rangedConfig.actionDelay);

    return {
      success: true,
      hitUnits: [],
      damages: [],
    };
  };

  const setStamina = (unit: Unit, stamina: number): void => {
    if (!unit.combat) {
      initializeCombat(unit, stamina);
    } else {
      unit.combat.stamina = stamina;
      unit.combat.maxStamina = Math.max(unit.combat.maxStamina || 0, stamina);
    }
  };

  const updateCombat = (
    units: Unit[],
    deltaTime: number,
    _currentTime: number,
  ): void => {
    for (const unit of units) {
      if (!unit.combat) continue;

      // Regenerate stamina if not at max
      if ((unit.combat.stamina || 0) < (unit.combat.maxStamina || 100)) {
        const staminaRegenRate = 10; // stamina per second
        unit.combat.stamina = Math.min(
          unit.combat.maxStamina || 100,
          (unit.combat.stamina || 0) + staminaRegenRate * deltaTime,
        );
      }

      // Regenerate health if unit has combat stats configured
      if (unit.stats.combat?.healthRegen) {
        regenerateHealth(unit, deltaTime);
      }
    }
  };

  return {
    performLightAttack,
    performHeavyAttack,
    performRangedAttack,
    canPerformRangedAttack,
    getRangedAttackRange,
    applyDamage,
    canAttack,
    updateCombat,
    initializeCombat,
    setStamina,
    getUnitsInAttackRange,
    setHealthBarManager,
  };
};

/**
 * Combat controller utilities
 */
export const CombatControllerUtils = {
  /**
   * Create default combat controller
   */
  createDefault: (unitManager: any) => createCombatController({}, unitManager),

  /**
   * Create high damage combat controller
   */
  createHighDamage: (unitManager: any) =>
    createCombatController(
      {
        lightAttack: {
          damage: 20,
          knockback: 8,
          range: 3.0,
          cooldown: 800,
          staminaCost: 15,
          stunDuration: 800,
          actionDelay: 250,
        },
        heavyAttack: {
          damage: 50,
          knockback: 15,
          range: 3.5,
          cooldown: 1500,
          staminaCost: 30,
          stunDuration: 1500,
          actionDelay: 400,
        },
      },
      unitManager,
    ),

  /**
   * Create fast combat controller
   */
  createFast: (unitManager: any) =>
    createCombatController(
      {
        lightAttack: {
          damage: 8,
          knockback: 3,
          range: 2.0,
          cooldown: 500,
          staminaCost: 10,
          stunDuration: 500,
          actionDelay: 150,
        },
        heavyAttack: {
          damage: 18,
          knockback: 6,
          range: 2.5,
          cooldown: 1000,
          staminaCost: 25,
          stunDuration: 1000,
          actionDelay: 300,
        },
      },
      unitManager,
    ),
} as const;
