import * as THREE from 'three';
import type { Unit, AttackType, CombatConfig } from '../../types/units';

/**
 * Combat attack result
 */
export type AttackResult = {
  /** Whether the attack was successful */
  success: boolean;
  /** Units that were hit */
  hitUnits: Unit[];
  /** Damage dealt to each unit */
  damages: { unit: Unit; damage: number }[];
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
  /** Apply damage to a unit */
  applyDamage: (target: Unit, damage: number, source?: Unit) => boolean;
  /** Check if unit can attack */
  canAttack: (unit: Unit, attackType: AttackType, currentTime: number) => boolean;
  /** Update combat states (cooldowns, stamina regeneration) */
  updateCombat: (units: Unit[], deltaTime: number, currentTime: number) => void;
  /** Initialize combat data for a unit */
  initializeCombat: (unit: Unit, stamina?: number) => void;
  /** Set stamina for a unit */
  setStamina: (unit: Unit, stamina: number) => void;
  /** Get units in attack range */
  getUnitsInAttackRange: (attacker: Unit, attackType: AttackType) => Unit[];
};

/**
 * Creates a combat controller
 */
export const createCombatController = (
  config: CombatConfig = {},
  unitManager: any // We'll receive the unit manager reference
): CombatController => {
  const {
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
    enableDamage = true,
  } = config;

  // Reusable objects to avoid garbage collection
  const tempDirection = new THREE.Vector3();

  const initializeCombat = (unit: Unit, stamina: number = 100): void => {
    if (!unit.combat) {
      unit.combat = {};
    }
    
    unit.combat.lastLightAttackTime = 0;
    unit.combat.lastHeavyAttackTime = 0;
    unit.combat.isAttacking = false;
    unit.combat.stamina = stamina;
    unit.combat.maxStamina = stamina;
  };

  const canAttack = (unit: Unit, attackType: AttackType, currentTime: number): boolean => {
    if (!unit.combat) return false;
    
    // Check if already attacking
    if (unit.combat.isAttacking) return false;
    
    // Check if stunned
    if (unit.ai?.isStunned) return false;
    
    const attackConfig = attackType === 'light' ? lightAttack : heavyAttack;
    
    // Check stamina
    if ((unit.combat.stamina || 0) < (attackConfig.staminaCost || 0)) return false;
    
    // Check cooldown
    const lastAttackTime = attackType === 'light' 
      ? (unit.combat.lastLightAttackTime || 0)
      : (unit.combat.lastHeavyAttackTime || 0);
    
    return currentTime >= lastAttackTime + (attackConfig.cooldown || 0);
  };

  const getUnitsInAttackRange = (attacker: Unit, attackType: AttackType): Unit[] => {
    const attackConfig = attackType === 'light' ? lightAttack : heavyAttack;
    const range = attackConfig.range || 2.0;
    
    return unitManager.getUnitsInRange(
      attacker.model.position,
      range,
      attacker
    );
  };

  const applyDamage = (target: Unit, damage: number, source?: Unit): boolean => {
    if (!enableDamage) return false;
    
    target.stats.health -= damage;
    target.stats.health = Math.max(0, target.stats.health);
    
    // Return true if unit died
    return target.stats.health <= 0;
  };

  const executeAttack = (
    attacker: Unit,
    attackType: AttackType,
    currentTime: number
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
      attacker.combat.stamina = (attacker.combat.stamina || 0) - (attackConfig.staminaCost || 0);
      attacker.combat.stamina = Math.max(0, attacker.combat.stamina);
      
      // Set last attack time
      if (attackType === 'light') {
        attacker.combat.lastLightAttackTime = currentTime;
      } else {
        attacker.combat.lastHeavyAttackTime = currentTime;
      }
    }
    
    // Schedule attack effect (delayed like in original)
    setTimeout(() => {
      for (const target of targetsInRange) {
        // Calculate knockback direction
        tempDirection.subVectors(target.model.position, attacker.model.position);
        tempDirection.y = 0; // Keep horizontal
        tempDirection.normalize();
        
        // Apply knockback
        if (attackConfig.knockback) {
          unitManager.applyKnockback(target, tempDirection, attackConfig.knockback);
        }
        
        // Apply damage
        let damage = 0;
        if (enableDamage && attackConfig.damage) {
          damage = attackConfig.damage;
          const isDead = applyDamage(target, damage, attacker);
          result.damages.push({ unit: target, damage });
          
          if (isDead) {
            // Handle unit death if needed
            console.log(`Unit ${target.id} was defeated!`);
          }
        }
        
        // Apply stun
        if (attackConfig.stunDuration && target.ai) {
          target.ai.isStunned = true;
          
          // Play hit animation if unit manager has animation control
          if (unitManager.playAnimation) {
            unitManager.playAnimation(target, 'hitToBody');
          }
          
          // Remove stun after duration
          setTimeout(() => {
            if (target.ai) {
              target.ai.isStunned = false;
            }
            // Return to idle if still alive
            if (target.stats.health > 0 && unitManager.playAnimation) {
              unitManager.playAnimation(target, 'idle');
            }
          }, attackConfig.stunDuration);
        }
        
        result.hitUnits.push(target);
      }
      
      // End attacking state after animation duration
      const animationDuration = attackType === 'light' ? 1000 : 1500; // Approximate durations
      setTimeout(() => {
        if (attacker.combat) {
          attacker.combat.isAttacking = false;
        }
        
        // Return to idle animation
        if (unitManager.playAnimation) {
          unitManager.playAnimation(attacker, 'idle');
        }
      }, animationDuration);
      
    }, attackConfig.actionDelay || 0);
    
    return result;
  };

  const performLightAttack = (attacker: Unit, currentTime: number): AttackResult => {
    if (!canAttack(attacker, 'light', currentTime)) {
      return {
        success: false,
        hitUnits: [],
        damages: [],
        failureReason: 'Cannot perform light attack (cooldown, stamina, or already attacking)',
      };
    }
    
    // Play attack animation
    if (unitManager.playAnimation) {
      unitManager.playAnimation(attacker, 'lightAttack');
    }
    
    return executeAttack(attacker, 'light', currentTime);
  };

  const performHeavyAttack = (attacker: Unit, currentTime: number): AttackResult => {
    if (!canAttack(attacker, 'heavy', currentTime)) {
      return {
        success: false,
        hitUnits: [],
        damages: [],
        failureReason: 'Cannot perform heavy attack (cooldown, stamina, or already attacking)',
      };
    }
    
    // Play attack animation
    if (unitManager.playAnimation) {
      unitManager.playAnimation(attacker, 'heavyAttack');
    }
    
    return executeAttack(attacker, 'heavy', currentTime);
  };

  const setStamina = (unit: Unit, stamina: number): void => {
    if (!unit.combat) {
      initializeCombat(unit, stamina);
    } else {
      unit.combat.stamina = stamina;
      unit.combat.maxStamina = Math.max(unit.combat.maxStamina || 0, stamina);
    }
  };

  const updateCombat = (units: Unit[], deltaTime: number, currentTime: number): void => {
    for (const unit of units) {
      if (!unit.combat) continue;
      
      // Regenerate stamina if not at max
      if ((unit.combat.stamina || 0) < (unit.combat.maxStamina || 100)) {
        const staminaRegenRate = 10; // stamina per second
        unit.combat.stamina = Math.min(
          (unit.combat.maxStamina || 100),
          (unit.combat.stamina || 0) + staminaRegenRate * deltaTime
        );
      }
    }
  };

  return {
    performLightAttack,
    performHeavyAttack,
    applyDamage,
    canAttack,
    updateCombat,
    initializeCombat,
    setStamina,
    getUnitsInAttackRange,
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
  createHighDamage: (unitManager: any) => createCombatController({
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
  }, unitManager),

  /**
   * Create fast combat controller
   */
  createFast: (unitManager: any) => createCombatController({
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
  }, unitManager),
} as const;