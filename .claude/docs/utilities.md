# Utilities Module

Collection of shared utility functions used throughout THREE Play.

## Location

- Implementation: [src/core/utils/](../../src/core/utils/)
- Types: [src/types/common.ts](../../src/types/common.ts), [src/types/combat.ts](../../src/types/combat.ts)
- Export: [src/core/utils/index.ts](../../src/core/utils/index.ts)

## Overview

The utilities module provides:
- **Easing Functions** - Smooth transitions and interpolation
- **Logger** - Configurable logging system
- **Object Pool** - Efficient memory management
- **Damage Calculator** - Combat damage calculation system
- **Team Utils** - Team-based targeting utilities
- **Attack Priority Utils** - Warcraft 3-style target prioritization

---

## Easing Utils

Smooth value transitions with various easing functions.

### Location
- [src/core/utils/easing-utils.ts](../../src/core/utils/easing-utils.ts)

### `EasingFunctions` Object

Collection of easing functions.

**Available Functions:**
```typescript
const EasingFunctions = {
  linear: (t: number) => number,
  'ease-in': (t: number) => number,
  'ease-out': (t: number) => number,
  'ease-in-out': (t: number) => number
};
```

**Example:**
```typescript
import { EasingFunctions } from '@three-play/core/utils';

const t = 0.5;  // 50% through transition
const eased = EasingFunctions['ease-out'](t);
console.log(eased);  // ~0.75
```

### `applyEasing(startValue, endValue, startTime, duration, currentTime, easingType): number`

Apply easing to a value transition.

**Parameters:**
- `startValue`: number - Starting value
- `endValue`: number - Target value
- `startTime`: number - Start time (seconds)
- `duration`: number - Duration (seconds)
- `currentTime`: number - Current time (seconds)
- `easingType`: EasingType - Easing function to use (default: 'linear')

**Returns:**
- `number` - Interpolated value

**Example:**
```typescript
import { applyEasing } from '@three-play/core/utils';

const startValue = 0;
const endValue = 100;
const startTime = 0;
const duration = 2.0;  // 2 seconds
const currentTime = 1.0;  // 1 second elapsed

const value = applyEasing(
  startValue,
  endValue,
  startTime,
  duration,
  currentTime,
  'ease-out'
);

console.log(value);  // ~75 (smooth transition)
```

**Animation Example:**
```typescript
let startTime = 0;
const duration = 1.0;

world.onUpdate((deltaTime, elapsedTime) => {
  if (startTime === 0) startTime = elapsedTime;

  const value = applyEasing(
    0,      // from
    100,    // to
    startTime,
    duration,
    elapsedTime,
    'ease-in-out'
  );

  object.position.x = value;
});
```

### `isEasingComplete(startTime, duration, currentTime): boolean`

Check if easing transition is complete.

**Parameters:**
- `startTime`: number - Start time (seconds)
- `duration`: number - Duration (seconds)
- `currentTime`: number - Current time (seconds)

**Returns:**
- `boolean` - True if complete

**Example:**
```typescript
import { isEasingComplete, applyEasing } from '@three-play/core/utils';

let startTime = 0;
const duration = 1.0;

world.onUpdate((deltaTime, elapsedTime) => {
  if (startTime === 0) startTime = elapsedTime;

  if (isEasingComplete(startTime, duration, elapsedTime)) {
    console.log('Easing complete!');
    startTime = 0;  // Reset
    return;
  }

  const value = applyEasing(0, 100, startTime, duration, elapsedTime, 'ease-out');
  // Use value...
});
```

---

## Logger

Configurable logging system with log levels.

### Location
- [src/core/utils/logger.ts](../../src/core/utils/logger.ts)

### `createLogger(config?: LoggerConfig): Logger`

Create a logger instance.

**Parameters:**
```typescript
type LoggerConfig = {
  level?: 'debug' | 'info' | 'warn' | 'error';  // default: 'info'
  prefix?: string;  // Optional prefix for all messages
};
```

**Returns:**
- `Logger` instance

**Example:**
```typescript
import { createLogger } from '@three-play/core/utils';

const logger = createLogger({
  level: 'debug',
  prefix: '[Game]'
});

logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');
```

### Logger Interface

```typescript
type Logger = {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
};
```

**Log Levels:**
- `debug`: Verbose debugging information
- `info`: General informational messages
- `warn`: Warning messages
- `error`: Error messages

**Level Filtering:**
Setting level to `'warn'` will only show warn and error messages.

**Example Usage:**
```typescript
const logger = createLogger({ level: 'info' });

logger.debug('This will not appear');  // Below info level
logger.info('Player spawned at (0,0,0)');  // Shows
logger.warn('Low memory');  // Shows
logger.error('Failed to load asset');  // Shows
```

---

## Object Pool

Generic object pooling for efficient memory management.

### Location
- [src/core/utils/object-pool.ts](../../src/core/utils/object-pool.ts)

### `createObjectPool<T>(config): ObjectPool<T>`

Create an object pool.

**Parameters:**
```typescript
type ObjectPoolConfig<T> = {
  createFn: () => T;                 // Function to create new objects
  resetFn?: (item: T) => void;       // Function to reset objects
  logger?: Logger;                   // Logger instance
  initialSize?: number;              // Pre-allocate count (default: 10)
  maxSize?: number;                  // Max pool size (0 = unlimited)
  autoGrow?: boolean;                // Auto-create if pool empty (default: true)
};
```

**Returns:**
- `ObjectPool<T>` instance

**Example:**
```typescript
import { createObjectPool } from '@three-play/core/utils';
import * as THREE from 'three';

// Create a pool of Vector3 objects
const vectorPool = createObjectPool<THREE.Vector3>({
  createFn: () => new THREE.Vector3(),
  resetFn: (v) => v.set(0, 0, 0),
  initialSize: 100,
  maxSize: 1000,
  autoGrow: true
});

// Get vector from pool
const vec = vectorPool.get();
if (vec) {
  vec.set(10, 20, 30);
  // Use vector...

  // Return to pool when done
  vectorPool.release(vec);
}
```

### ObjectPool Interface

```typescript
type ObjectPool<T> = {
  get(): T | null;                   // Get object from pool
  release(item: T): void;            // Return object to pool
  preallocate(count: number): void;  // Pre-allocate objects
  clear(): void;                     // Clear all objects
  getStats(): ObjectPoolStats;       // Get usage statistics
};

type ObjectPoolStats = {
  total: number;      // Total objects (available + in use)
  available: number;  // Available in pool
  inUse: number;      // Currently in use
  peak: number;       // Peak usage
};
```

**Example with Stats:**
```typescript
const stats = vectorPool.getStats();
console.log(`Pool: ${stats.inUse}/${stats.total} in use`);
console.log(`Peak usage: ${stats.peak}`);
console.log(`Available: ${stats.available}`);

// Pre-allocate more if needed
if (stats.available < 10) {
  vectorPool.preallocate(50);
}
```

**Complete Example:**
```typescript
// Particle system with object pooling
type Particle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  mesh: THREE.Mesh;
};

const particlePool = createObjectPool<Particle>({
  createFn: () => ({
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    life: 0,
    mesh: new THREE.Mesh(
      new THREE.SphereGeometry(0.1),
      new THREE.MeshBasicMaterial()
    )
  }),
  resetFn: (p) => {
    p.position.set(0, 0, 0);
    p.velocity.set(0, 0, 0);
    p.life = 0;
    p.mesh.visible = false;
  },
  initialSize: 100,
  maxSize: 500
});

// Spawn particle
function spawnParticle(position: THREE.Vector3) {
  const particle = particlePool.get();
  if (particle) {
    particle.position.copy(position);
    particle.velocity.set(
      Math.random() - 0.5,
      Math.random(),
      Math.random() - 0.5
    );
    particle.life = 1.0;
    particle.mesh.visible = true;
    scene.add(particle.mesh);

    activeParticles.push(particle);
  }
}

// Update particles
world.onUpdate((deltaTime) => {
  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const p = activeParticles[i];

    p.life -= deltaTime;
    if (p.life <= 0) {
      // Return to pool
      scene.remove(p.mesh);
      particlePool.release(p);
      activeParticles.splice(i, 1);
    } else {
      // Update particle
      p.position.addScaledVector(p.velocity, deltaTime);
      p.mesh.position.copy(p.position);
    }
  }
});
```

---

## Damage Calculator

Combat damage calculation system with armor, critical hits, and type effectiveness.

### Location
- [src/core/utils/damage-calculator.ts](../../src/core/utils/damage-calculator.ts)

### `calculateDamage(attacker, target, config?): DamageResult`

Calculate damage dealt from attacker to target.

**Parameters:**
- `attacker`: Unit - Attacking unit
- `target`: Unit - Target unit
- `config`: DamageCalculatorConfig (optional)

```typescript
type DamageCalculatorConfig = {
  enableCriticals?: boolean;           // Enable crits (default: true)
  enableArmor?: boolean;               // Enable armor (default: true)
  enableTypeEffectiveness?: boolean;   // Enable type system (default: true)
  minDamage?: number;                  // Min damage (default: 1)
};
```

**Returns:**
```typescript
type DamageResult = {
  finalDamage: number;         // Actual damage dealt
  baseDamage: number;          // Base damage before modifiers
  wasCritical: boolean;        // Was critical hit
  typeMultiplier: number;      // Type effectiveness multiplier
  armorReduction: number;      // Damage reduced by armor
  damageType: DamageType;      // Attack damage type
  armorType: ArmorType;        // Target armor type
};
```

**Example:**
```typescript
import { calculateDamage } from '@three-play/core/utils';

const result = calculateDamage(attacker, target, {
  enableCriticals: true,
  enableArmor: true,
  enableTypeEffectiveness: true,
  minDamage: 1
});

console.log(`Dealt ${result.finalDamage} damage`);
if (result.wasCritical) {
  console.log('Critical hit!');
}
console.log(`Type effectiveness: ${result.typeMultiplier}x`);
console.log(`Armor reduced: ${result.armorReduction}`);
```

### `applyCalculatedDamage(target, damageResult): { isDead: boolean }`

Apply calculated damage to target.

**Parameters:**
- `target`: Unit - Target unit
- `damageResult`: DamageResult - Result from calculateDamage

**Returns:**
- `{ isDead: boolean }` - Whether target died

**Example:**
```typescript
import { calculateDamage, applyCalculatedDamage } from '@three-play/core/utils';

const damageResult = calculateDamage(attacker, target);
const { isDead } = applyCalculatedDamage(target, damageResult);

if (isDead) {
  console.log('Target killed!');
  // Handle death
}
```

### `regenerateHealth(unit, amount): number`

Regenerate health for a unit.

**Parameters:**
- `unit`: Unit - Target unit
- `amount`: number - Health to regenerate

**Returns:**
- `number` - Actual health regenerated (capped at max health)

**Example:**
```typescript
import { regenerateHealth } from '@three-play/core/utils';

// Regenerate 5 HP per second
world.onUpdate((deltaTime) => {
  const regenRate = 5.0;
  const regenAmount = regenRate * deltaTime;

  units.forEach(unit => {
    if (unit.stats.health < unit.stats.maxHealth) {
      const healed = regenerateHealth(unit, regenAmount);
      if (healed > 0) {
        console.log(`${unit.id} regenerated ${healed} HP`);
      }
    }
  });
});
```

### Damage Types & Armor Types

**Damage Types:**
- `normal` - Standard physical damage
- `pierce` - Piercing damage (arrows, bullets)
- `siege` - Siege damage (buildings)
- `magic` - Magic damage
- `chaos` - Pure damage (ignores armor)
- `hero` - Hero damage

**Armor Types:**
- `unarmored` - No armor
- `light` - Light armor
- `medium` - Medium armor
- `heavy` - Heavy armor
- `fortified` - Building armor
- `hero` - Hero armor

### Type Effectiveness Table

```typescript
const DAMAGE_TYPE_EFFECTIVENESS = {
  normal: {
    unarmored: 1.0,
    light: 1.0,
    medium: 1.0,
    heavy: 1.0,
    fortified: 0.7,
    hero: 1.0
  },
  pierce: {
    unarmored: 1.5,
    light: 2.0,
    medium: 0.75,
    heavy: 0.75,
    fortified: 0.35,
    hero: 0.5
  },
  // ... other types
};
```

**Example:**
Pierce damage deals 200% to light armor, but only 75% to heavy armor.

### Combat Stats Configuration

```typescript
type CombatStats = {
  health: number;
  maxHealth: number;
  attackDamageMin: number;         // Min damage
  attackDamageMax: number;         // Max damage
  damageType: DamageType;          // Damage type
  armor: number;                   // Armor value
  armorType: ArmorType;            // Armor type
  attackSpeed: number;             // MS between attacks
  healthRegen: number;             // HP per second
  critChance: number;              // 0.0-1.0
  critMultiplier: number;          // Default: 2.0
  attackRange: number;             // Attack range
};
```

**Configure on Unit Definition:**
```typescript
const warriorDef: UnitDefinition = {
  id: 'warrior',
  type: 'enemy',
  stats: {
    speed: 5,
    health: 100,
    combat: {
      attackDamageMin: 15,
      attackDamageMax: 25,
      damageType: 'normal',
      armor: 5,
      armorType: 'heavy',
      critChance: 0.1,
      critMultiplier: 2.0,
      attackRange: 2.5
    }
  }
  // ... rest of definition
};
```

### Complete Combat Example

```typescript
import {
  calculateDamage,
  applyCalculatedDamage,
  regenerateHealth
} from '@three-play/core/utils';

world.onUpdate((deltaTime) => {
  const units = unitManager.getAllUnits();

  // Health regeneration
  units.forEach(unit => {
    const regenRate = unit.stats.combat?.healthRegen || 0;
    if (regenRate > 0 && unit.stats.health < unit.stats.maxHealth) {
      regenerateHealth(unit, regenRate * deltaTime);
    }
  });

  // Combat
  units.forEach(attacker => {
    const nearbyEnemies = getNearbyEnemies(attacker, attacker.stats.combat?.attackRange || 2);

    if (nearbyEnemies.length > 0) {
      const target = nearbyEnemies[0];

      // Check attack cooldown
      if (canAttack(attacker)) {
        // Calculate damage
        const result = calculateDamage(attacker, target);

        // Apply damage
        const { isDead } = applyCalculatedDamage(target, result);

        // Show damage number
        showDamageNumber(result.finalDamage, target.model.position, result.wasCritical);

        // Note: Death is now handled automatically by the combat system
        // if the unit has death.autoHandle: true in its definition
        // Manual handling only needed for custom death logic
        if (isDead && !target.definition.death?.autoHandle) {
          handleUnitDeath(target);
        }
      }
    }
  });
});
```

---

## Team Utils

Team-based targeting utilities.

### Location
- [src/core/utils/team-utils.ts](../../src/core/utils/team-utils.ts)

### `TeamUtils.areEnemies(unit1, unit2): boolean`

Check if two units are enemies.

**Example:**
```typescript
import { TeamUtils } from '@three-play/core/utils';

if (TeamUtils.areEnemies(playerUnit, enemyUnit)) {
  // Can attack
}
```

### `TeamUtils.isEnemy(unit, targetUnit): boolean`

Check if target is an enemy of unit.

**Example:**
```typescript
const enemies = allUnits.filter(target =>
  TeamUtils.isEnemy(myUnit, target)
);
```

---

## Common Patterns

### Smooth Camera Movement
```typescript
import { applyEasing } from '@three-play/core/utils';

let startPos = camera.position.clone();
let targetPos = new THREE.Vector3(10, 5, 10);
let startTime = 0;
const duration = 2.0;

world.onUpdate((deltaTime, elapsedTime) => {
  if (startTime === 0) startTime = elapsedTime;

  const x = applyEasing(startPos.x, targetPos.x, startTime, duration, elapsedTime, 'ease-in-out');
  const y = applyEasing(startPos.y, targetPos.y, startTime, duration, elapsedTime, 'ease-in-out');
  const z = applyEasing(startPos.z, targetPos.z, startTime, duration, elapsedTime, 'ease-in-out');

  camera.position.set(x, y, z);
});
```

### Particle System with Pooling
```typescript
import { createObjectPool } from '@three-play/core/utils';

const particlePool = createObjectPool({
  createFn: () => createParticle(),
  resetFn: (p) => resetParticle(p),
  initialSize: 100,
  maxSize: 1000
});

function spawnExplosion(position: THREE.Vector3) {
  for (let i = 0; i < 50; i++) {
    const particle = particlePool.get();
    if (particle) {
      initializeParticle(particle, position);
    }
  }
}
```

### Combat with Damage Calculator
```typescript
import { calculateDamage, applyCalculatedDamage } from '@three-play/core/utils';

function performAttack(attacker: Unit, target: Unit) {
  const result = calculateDamage(attacker, target, {
    enableCriticals: true,
    enableArmor: true,
    enableTypeEffectiveness: true
  });

  const { isDead } = applyCalculatedDamage(target, result);

  // Show feedback
  showDamageNumber(result.finalDamage, target.model.position, result.wasCritical);

  if (result.wasCritical) {
    playCriticalHitSound();
  }

  // Note: Death is now handled automatically by the combat system
  // if the unit has death.autoHandle: true in its definition
  if (isDead && !target.definition.death?.autoHandle) {
    handleDeath(target);
  }

  return result;
}
```

---

## Attack Priority Utils

Warcraft 3-style target prioritization system for intelligent AI targeting.

### Location
- [src/core/utils/attack-priority-utils.ts](../../src/core/utils/attack-priority-utils.ts)

### Core Concept

The attack priority system implements Warcraft 3's armor type-based target selection. Units prioritize targets based on their armor type, then by distance for equal priorities.

**Priority Order (highest to lowest):**
1. **Hero** (100) - Heroes are always targeted first
2. **Heavy** (80) - Heavy combat units
3. **Medium** (75) - Medium combat units
4. **Light** (70) - Light combat units
5. **Unarmored** (30) - Workers, non-combat units
6. **Fortified** (10) - Buildings (lowest priority)

### `getAttackPriority(unit: Unit): number`

Get attack priority value for a unit based on its armor type.

**Parameters:**
- `unit`: Unit - Unit to get priority for

**Returns:**
- `number` - Priority value (higher = higher priority)

**Example:**
```typescript
import { AttackPriorityUtils } from '@three-play/core/utils';

const unit = unitManager.getUnit('hero_1');
const priority = AttackPriorityUtils.getAttackPriority(unit);
console.log(priority); // 100 (if unit has hero armor type)
```

### `selectBestTarget(attacker: Unit, potentialTargets: Unit[]): Unit | null`

Select the best target from a list based on attack priority and distance.

**Parameters:**
- `attacker`: Unit - Unit doing the attacking
- `potentialTargets`: Unit[] - Array of potential targets

**Returns:**
- `Unit | null` - Best target unit, or null if no valid targets

**Example:**
```typescript
import { AttackPriorityUtils } from '@three-play/core/utils';

// Get all enemies in range
const enemies = unitManager.getUnitsInRange(unit.model.position, 10, unit);

// Select best target (prioritizes heroes, then combat units, then distance)
const bestTarget = AttackPriorityUtils.selectBestTarget(unit, enemies);

if (bestTarget) {
  console.log(`Attacking: ${bestTarget.id}`);
}
```

### `getPrioritizedTargets(attacker: Unit, potentialTargets: Unit[], maxTargets?: number): Unit[]`

Get a sorted list of targets by priority.

**Parameters:**
- `attacker`: Unit - Unit doing the attacking
- `potentialTargets`: Unit[] - Array of potential targets
- `maxTargets`: number (optional) - Maximum number of targets to return

**Returns:**
- `Unit[]` - Array of targets sorted by priority

**Example:**
```typescript
// Get top 3 priority targets
const topTargets = AttackPriorityUtils.getPrioritizedTargets(
  unit,
  allEnemies,
  3
);

console.log('Top 3 targets:', topTargets.map(t => t.id));
```

### `isHighPriorityTarget(unit: Unit): boolean`

Check if a unit is a high priority target (combat units and heroes).

**Returns:**
- `boolean` - True if unit is high priority (priority >= 70)

**Example:**
```typescript
if (AttackPriorityUtils.isHighPriorityTarget(enemy)) {
  console.log('High priority threat detected!');
  // Alert player or trigger special behavior
}
```

### `isLowPriorityTarget(unit: Unit): boolean`

Check if a unit is a low priority target (workers, buildings).

**Returns:**
- `boolean` - True if unit is low priority (priority <= 30)

**Example:**
```typescript
if (AttackPriorityUtils.isLowPriorityTarget(target)) {
  console.log('Targeting worker or building');
  // Only attack if no other targets available
}
```

### Setting Armor Types

Armor types are defined in the unit's combat stats:

```typescript
const heroUnit: UnitDefinition = {
  id: 'paladin',
  type: 'player',
  stats: {
    speed: 1.0,
    health: 200,
    combat: {
      attackDamageMin: 30,
      attackDamageMax: 40,
      armorType: 'hero',     // High priority target
      damageType: 'normal',
      armor: 5,
      // ... other stats
    }
  }
};

const workerUnit: UnitDefinition = {
  id: 'peasant',
  type: 'npc',
  stats: {
    speed: 1.0,
    health: 100,
    combat: {
      attackDamageMin: 5,
      attackDamageMax: 8,
      armorType: 'unarmored', // Low priority target
      damageType: 'normal',
      armor: 0,
      // ... other stats
    }
  }
};

const buildingUnit: UnitDefinition = {
  id: 'barracks',
  type: 'npc',
  stats: {
    speed: 0,
    health: 500,
    combat: {
      attackDamageMin: 0,
      attackDamageMax: 0,
      armorType: 'fortified', // Lowest priority target
      damageType: 'normal',
      armor: 10,
      // ... other stats
    }
  }
};
```

### Integration with AI

The priority system is automatically integrated with `TeamUtils.findNearestEnemy()`:

```typescript
// AI automatically uses priority system
const nearestEnemy = TeamUtils.findNearestEnemy(
  unit,
  allUnits,
  detectionRange
);
// Returns highest priority enemy within range,
// or nearest if multiple units have same priority
```

### Complete Example

```typescript
import { AttackPriorityUtils, TeamUtils } from '@three-play/core/utils';

// Custom targeting logic
function selectCustomTarget(attacker: Unit, allUnits: Unit[]): Unit | null {
  // Get all enemies in detection range
  const enemies = allUnits.filter(unit =>
    unit.team !== attacker.team &&
    unit.stats.health > 0
  );

  // Filter to only high priority targets (combat units + heroes)
  const highPriorityEnemies = enemies.filter(enemy =>
    AttackPriorityUtils.isHighPriorityTarget(enemy)
  );

  if (highPriorityEnemies.length > 0) {
    // Attack high priority targets first
    return AttackPriorityUtils.selectBestTarget(attacker, highPriorityEnemies);
  }

  // No high priority targets, attack anything available
  return AttackPriorityUtils.selectBestTarget(attacker, enemies);
}

// Use in AI behavior
world.onUpdate(() => {
  const aiUnits = unitManager.getUnitsByType('enemy');
  const allUnits = unitManager.getAllUnits();

  for (const unit of aiUnits) {
    const target = selectCustomTarget(unit, allUnits);
    if (target) {
      // AI attacks selected target
      console.log(`${unit.id} targeting ${target.id}`);
    }
  }
});
```

## See Also

- [World Module](world.md) - Uses logger and easing
- [Units Module](units.md) - Uses damage calculator and attack priority
- [Projectiles Module](projectiles.md) - Uses object pooling
- [Input Module](input.md) - Uses easing for smooth input
- [Combat Types](../../src/types/combat.ts) - Armor and damage types
- [API Reference](api-reference.md) - Complete API index
