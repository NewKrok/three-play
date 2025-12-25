# Units Module

The Units module provides comprehensive character management including lifecycle, AI behaviors, animations, combat, and physics.

## Location

- Core Implementation: [src/core/units/unit-manager.ts](../../src/core/units/unit-manager.ts)
- AI Controller: [src/core/units/ai-behavior-controller.ts](../../src/core/units/ai-behavior-controller.ts)
- Animation Controller: [src/core/units/animation-controller.ts](../../src/core/units/animation-controller.ts)
- Combat Controller: [src/core/units/combat-controller.ts](../../src/core/units/combat-controller.ts)
- Types: [src/types/units.ts](../../src/types/units.ts)
- Export: [src/core/units/index.ts](../../src/core/units/index.ts)

## Core Concept

The Units system provides:
- Unit definition and instance management
- AI behavior state machines (idle, patrol, chase, attack, return)
- Animation system with crossfading
- Combat system with light/heavy attacks, stamina, knockback
- Physics (velocity, knockback, collision)
- Visual effects and outline management
- Projectile collision detection integration
- Team-based targeting system

## Factory Function

### `createUnitManager(config: UnitManagerConfig): UnitManager`

Creates a unit manager instance.

**Parameters:**
- `config`: UnitManagerConfig - Configuration object

**Returns:**
- `UnitManager` - Unit manager instance

**Example:**

```typescript
import { createUnitManager } from '@three-play/core';
import type { UnitManagerConfig } from '@three-play/types';

const config: UnitManagerConfig = {
  scene: world.getScene(),
  loadedAssets: world.getLoadedAssets(),
  logger: world.getLogger(),
  enabled: true,
  maxUnits: 1000,
  enableCollision: true,
  collision: {
    minDistance: 1.0,
    pushStrength: 0.5
  }
};

const unitManager = createUnitManager(config);
```

## Configuration

### UnitManagerConfig Type

```typescript
type UnitManagerConfig = {
  scene: THREE.Scene;              // Three.js scene
  loadedAssets: LoadedAssets;       // Assets from world
  logger?: Logger;                  // Logger instance
  enabled?: boolean;                // Enable system (default: true)
  maxUnits?: number;                // Max unit limit (default: 1000)
  enableCollision?: boolean;        // Enable unit collision (default: true)
  collision?: {
    minDistance?: number;           // Min distance (default: 1.0)
    pushStrength?: number;          // Push force (default: 0.5)
  };
  definitions?: UnitDefinition[];   // Unit definitions to register
  teams?: {
    enableFriendlyFire?: boolean;   // Allow same-team damage
  };
};
```

## Unit Definition

### UnitDefinition Type

```typescript
type UnitDefinition = {
  id: string;                       // Unique identifier
  type: 'player' | 'enemy' | 'npc'; // Unit type
  team?: TeamId;                    // Team identifier
  enemyTeams?: TeamId[];            // Enemy teams list
  modelAssets: {
    baseModel: string;              // Model asset key
    animations: Record<string, string>; // Animation keys
  };
  stats: {
    speed: number;                  // Movement speed
    health: number;                 // Max health
    attackDamage?: number;          // Attack damage
    collisionRadius?: number;       // Collision radius
    combat?: Partial<CombatStats>;  // Combat stats
  };
  appearance?: {
    scale?: number;                 // Scale multiplier
    rotation?: number;              // Initial rotation
    materialModifier?: (instance: THREE.Group) => void;
  };
  ai?: AIBehaviorConfig;            // AI configuration
};
```

**Example:**

```typescript
const warriorDefinition: UnitDefinition = {
  id: 'warrior',
  type: 'enemy',
  team: 'enemy',
  enemyTeams: ['player'],
  modelAssets: {
    baseModel: 'warriorModel',
    animations: {
      idle: 'warriorIdle',
      walk: 'warriorWalk',
      run: 'warriorRun',
      attack: 'warriorAttack',
      death: 'warriorDeath'
    }
  },
  stats: {
    speed: 4.0,
    health: 100,
    attackDamage: 20,
    collisionRadius: 0.5,
    combat: {
      attackPower: 15,
      defense: 10,
      criticalChance: 0.1
    }
  },
  appearance: {
    scale: 1.0,
    rotation: 0
  },
  ai: {
    type: 'chase',
    targeting: {
      detectionRange: 10,
      attackRange: 2.5
    },
    movement: {
      speed: 4.0,
      randomness: 0.1
    },
    combat: {
      attackCooldown: 1000,
      knockbackForce: 5,
      stunDuration: 1000
    }
  }
};

unitManager.registerDefinition(warriorDefinition);
```

## Unit Instance Type

```typescript
type Unit = {
  id: string;                       // Unique instance ID
  definition: UnitDefinition;       // Definition reference
  team?: TeamId;                    // Team ID
  model: THREE.Group;               // Three.js model
  mixer: THREE.AnimationMixer;      // Animation mixer
  actions: Record<string, THREE.AnimationAction>; // Animation actions
  currentAnimation: string;         // Current animation
  previousAnimation?: string;       // Previous animation
  stats: {
    health: number;                 // Current health
    maxHealth: number;              // Max health
    speed: number;                  // Movement speed
    attackDamage: number;           // Attack damage
    collisionRadius: number;        // Collision radius
    combat?: CombatStats;           // Combat stats
  };
  physics?: {
    velocity?: THREE.Vector3;       // Velocity
    knockbackVelocity?: THREE.Vector3; // Knockback velocity
    oldPosition?: THREE.Vector3;    // Previous position
    friction?: number;              // Friction (0-1)
    velocityDecay?: number;         // Decay rate
    enableGravity?: boolean;        // Gravity enabled
    gravityForce?: number;          // Gravity strength
    mass?: number;                  // Unit mass
  };
  ai?: {
    target?: THREE.Vector3;         // Target position
    nextTargetSelectionTime?: number;
    resumeTime?: number;
    isAttacking?: boolean;
    isStunned?: boolean;
  };
  combat?: {
    lastLightAttackTime?: number;
    lastHeavyAttackTime?: number;
    isAttacking?: boolean;
    stamina?: number;
    maxStamina?: number;
  };
  effects?: Record<string, any>;    // Visual effects
  userData?: Record<string, any>;   // Custom data
};
```

## UnitManager API

### Unit Lifecycle

#### `registerDefinition(definition: UnitDefinition): void`

Register a unit definition for creating units.

**Example:**
```typescript
unitManager.registerDefinition({
  id: 'goblin',
  type: 'enemy',
  modelAssets: {
    baseModel: 'goblinModel',
    animations: {
      idle: 'goblinIdle',
      walk: 'goblinWalk',
      attack: 'goblinAttack'
    }
  },
  stats: {
    speed: 3.0,
    health: 50,
    collisionRadius: 0.4
  },
  ai: {
    type: 'patrol',
    targeting: {
      detectionRange: 8,
      attackRange: 1.5
    }
  }
});
```

#### `createUnit(params: CreateUnitParams): Unit | null`

Create a new unit instance.

**Parameters:**
```typescript
type CreateUnitParams = {
  definitionId: string;             // Definition ID
  position: THREE.Vector3;          // Spawn position
  rotation?: number;                // Initial rotation
  statsOverride?: Partial<Unit['stats']>; // Override stats
  userData?: Record<string, any>;   // Custom data
};
```

**Returns:**
- `Unit | null` - Created unit or null if failed

**Example:**
```typescript
const unit = unitManager.createUnit({
  definitionId: 'warrior',
  position: new THREE.Vector3(10, 0, 5),
  rotation: Math.PI / 4,
  statsOverride: {
    health: 150,  // Override default health
    speed: 5.0    // Override default speed
  },
  userData: {
    questGiver: true,
    customData: 'value'
  }
});

if (unit) {
  console.log(`Created unit: ${unit.id}`);
}
```

#### `removeUnit(unitId: string): boolean`

Remove a unit by ID.

**Returns:**
- `boolean` - True if removed successfully

**Example:**
```typescript
const removed = unitManager.removeUnit(unit.id);
if (removed) {
  console.log('Unit removed');
}
```

#### `getUnit(unitId: string): Unit | null`

Get unit by ID.

**Example:**
```typescript
const unit = unitManager.getUnit('unit_123');
if (unit) {
  console.log(`Unit health: ${unit.stats.health}`);
}
```

#### `getAllUnits(): Unit[]`

Get all units.

**Example:**
```typescript
const allUnits = unitManager.getAllUnits();
console.log(`Total units: ${allUnits.length}`);
```

#### `getUnitsByType(type: UnitType): Unit[]`

Get units by type ('player', 'enemy', 'npc').

**Example:**
```typescript
const enemies = unitManager.getUnitsByType('enemy');
const players = unitManager.getUnitsByType('player');
console.log(`Enemies: ${enemies.length}, Players: ${players.length}`);
```

#### `update(deltaTime: number, elapsedTime?: number): void`

Update all units (called by world automatically).

**Example:**
```typescript
// Usually called by world, but can be manual:
world.onUpdate((deltaTime, elapsedTime) => {
  unitManager.update(deltaTime, elapsedTime);
});
```

#### `dispose(): void`

Clean up all resources.

**Example:**
```typescript
unitManager.dispose();
```

### Animation Control

#### `playAnimation(unit: Unit, animationName: string, fadeDuration?: number): void`

Play animation with optional crossfade.

**Parameters:**
- `unit`: Unit instance
- `animationName`: Animation name from definition
- `fadeDuration`: Crossfade duration in seconds (default: 0.2)

**Example:**
```typescript
// Play walk animation
unitManager.playAnimation(unit, 'walk');

// Play attack with 0.1s crossfade
unitManager.playAnimation(unit, 'attack', 0.1);

// Play death immediately
unitManager.playAnimation(unit, 'death', 0);
```

#### `stopAnimations(unit: Unit): void`

Stop all animations for a unit.

**Example:**
```typescript
unitManager.stopAnimations(unit);
```

#### `isAnimationPlaying(unit: Unit, animationName: string): boolean`

Check if specific animation is playing.

**Example:**
```typescript
if (unitManager.isAnimationPlaying(unit, 'attack')) {
  console.log('Unit is attacking');
}
```

#### `setAnimationSpeed(unit: Unit, animationName: string, speed: number): void`

Set animation playback speed.

**Example:**
```typescript
// Play walk animation at 1.5x speed
unitManager.setAnimationSpeed(unit, 'walk', 1.5);

// Slow motion death
unitManager.setAnimationSpeed(unit, 'death', 0.5);
```

#### `getCurrentAnimation(unit: Unit): string | null`

Get current animation name.

**Example:**
```typescript
const currentAnim = unitManager.getCurrentAnimation(unit);
console.log(`Current animation: ${currentAnim}`);
```

### AI Behavior Control

#### `initializeAIBehavior(unit: Unit, homePosition?: THREE.Vector3): void`

Initialize AI behavior for a unit.

**Example:**
```typescript
const spawnPos = new THREE.Vector3(10, 0, 10);
unitManager.initializeAIBehavior(unit, spawnPos);
```

#### `setAIBehaviorState(unit: Unit, state: AIBehaviorState): void`

Manually set AI behavior state.

**States:** `'idle' | 'patrol' | 'chase' | 'attack' | 'return'`

**Example:**
```typescript
// Force unit to return to home
unitManager.setAIBehaviorState(unit, 'return');

// Make unit idle
unitManager.setAIBehaviorState(unit, 'idle');

// Start chasing
unitManager.setAIBehaviorState(unit, 'chase');
```

#### `getAIBehaviorData(unit: Unit): AIBehaviorData | null`

Get AI behavior data for a unit.

**Returns:**
```typescript
type AIBehaviorData = {
  state: AIBehaviorState;           // Current state
  targetPosition: THREE.Vector3;    // Target position
  targetUnit: Unit | null;          // Target unit
  resumeTime: number;               // Resume time
  nextTargetUpdateTime: number;     // Next update
  homePosition: THREE.Vector3;      // Home position
  isAttacking: boolean;             // Is attacking
  isMoving: boolean;                // Is moving
};
```

**Example:**
```typescript
const aiData = unitManager.getAIBehaviorData(unit);
if (aiData) {
  console.log(`AI State: ${aiData.state}`);
  console.log(`Target: ${aiData.targetPosition.toArray()}`);
  console.log(`Is attacking: ${aiData.isAttacking}`);
}
```

### Physics & Movement

#### `applyKnockback(unit: Unit, direction: THREE.Vector3, force: number): void`

Apply knockback force to a unit.

**Example:**
```typescript
// Knock unit backwards
const knockbackDir = new THREE.Vector3(0, 0, -1);
unitManager.applyKnockback(unit, knockbackDir, 10);

// Knock unit away from explosion
const explosionPos = new THREE.Vector3(5, 0, 5);
const knockbackDir = unit.model.position.clone()
  .sub(explosionPos)
  .normalize();
unitManager.applyKnockback(unit, knockbackDir, 15);
```

#### `setUnitVelocity(unit: Unit, velocity: THREE.Vector3): void`

Set unit velocity (replaces current velocity).

**Example:**
```typescript
// Move unit forward at 5 units/sec
const velocity = new THREE.Vector3(0, 0, 5);
unitManager.setUnitVelocity(unit, velocity);
```

#### `addUnitVelocity(unit: Unit, velocity: THREE.Vector3): void`

Add velocity to unit (accumulative).

**Example:**
```typescript
// Add upward velocity (jump)
const jumpVelocity = new THREE.Vector3(0, 5, 0);
unitManager.addUnitVelocity(unit, jumpVelocity);
```

#### `stopUnitMovement(unit: Unit): void`

Stop all movement for a unit.

**Example:**
```typescript
unitManager.stopUnitMovement(unit);
```

### Collision Detection

#### `checkUnitCollision(unit1: Unit, unit2: Unit): boolean`

Check if two units are colliding.

**Example:**
```typescript
const player = unitManager.getUnitsByType('player')[0];
const enemies = unitManager.getUnitsByType('enemy');

for (const enemy of enemies) {
  if (unitManager.checkUnitCollision(player, enemy)) {
    console.log('Player hit enemy!');
  }
}
```

#### `getUnitsInRange(position: THREE.Vector3, range: number, excludeUnit?: Unit): Unit[]`

Get all units within range of a position.

**Example:**
```typescript
// Get enemies near player
const nearbyEnemies = unitManager.getUnitsInRange(
  player.model.position,
  10,  // 10 unit radius
  player  // Exclude player from results
);

console.log(`Nearby enemies: ${nearbyEnemies.length}`);

// Get units near explosion
const explosionPos = new THREE.Vector3(10, 0, 10);
const unitsInBlast = unitManager.getUnitsInRange(explosionPos, 5);
```

### Combat System

#### `performLightAttack(attacker: Unit, currentTime: number): AttackResult`

Perform a light attack.

**Returns:**
```typescript
type AttackResult = {
  success: boolean;                 // Attack succeeded
  hitUnits: Unit[];                 // Units hit
  damages: Array<{
    unit: Unit;
    damage: number;
    damageResult?: DamageResult;
  }>;
  failureReason?: string;           // Failure reason
};
```

**Example:**
```typescript
const result = unitManager.performLightAttack(unit, Date.now());
if (result.success) {
  console.log(`Hit ${result.hitUnits.length} units`);
  result.damages.forEach(({ unit, damage }) => {
    console.log(`Dealt ${damage} damage to ${unit.id}`);
  });
} else {
  console.log(`Attack failed: ${result.failureReason}`);
}
```

#### `performHeavyAttack(attacker: Unit, currentTime: number): AttackResult`

Perform a heavy attack (more damage, longer cooldown).

**Example:**
```typescript
const result = unitManager.performHeavyAttack(unit, Date.now());
if (result.success) {
  console.log('Heavy attack landed!');
}
```

#### `canAttack(unit: Unit, attackType: AttackType, currentTime: number): boolean`

Check if unit can perform an attack.

**Attack Types:** `'light' | 'heavy' | 'special'`

**Example:**
```typescript
const now = Date.now();
if (unitManager.canAttack(unit, 'light', now)) {
  unitManager.performLightAttack(unit, now);
} else {
  console.log('Light attack on cooldown');
}
```

#### `initializeCombat(unit: Unit, stamina?: number): void`

Initialize combat data for a unit.

**Example:**
```typescript
// Initialize with default stamina (100)
unitManager.initializeCombat(unit);

// Initialize with custom stamina
unitManager.initializeCombat(unit, 150);
```

#### `setStamina(unit: Unit, stamina: number): void`

Set unit's stamina.

**Example:**
```typescript
// Full stamina
unitManager.setStamina(unit, unit.combat!.maxStamina!);

// Drain stamina
unitManager.setStamina(unit, 0);

// Partial stamina
unitManager.setStamina(unit, 50);
```

### Effects Management

#### `addEffect(unit: Unit, effectName: string, effectInstance: any): void`

Add visual effect to a unit.

**Example:**
```typescript
import { createParticleSystem } from '@newkrok/three-particles';

// Add running dust effect
const dustEffect = createParticleSystem({
  // particle config
});
unitManager.addEffect(unit, 'runningDust', dustEffect);

// Add glow effect
const glowMesh = new THREE.Mesh(geometry, glowMaterial);
unitManager.addEffect(unit, 'glow', glowMesh);
```

#### `removeEffect(unit: Unit, effectName: string): boolean`

Remove effect from unit.

**Example:**
```typescript
const removed = unitManager.removeEffect(unit, 'runningDust');
if (removed) {
  console.log('Effect removed');
}
```

#### `removeAllEffects(unit: Unit): void`

Remove all effects from unit.

**Example:**
```typescript
unitManager.removeAllEffects(unit);
```

#### `hasEffect(unit: Unit, effectName: string): boolean`

Check if unit has specific effect.

**Example:**
```typescript
if (unitManager.hasEffect(unit, 'fire')) {
  // Unit is on fire
  console.log('Unit is burning!');
}
```

#### `getEffect(unit: Unit, effectName: string): any`

Get effect instance from unit.

**Example:**
```typescript
const fireEffect = unitManager.getEffect(unit, 'fire');
if (fireEffect) {
  fireEffect.intensity = 2.0;
}
```

### Projectile Integration

#### `checkProjectileCollision(projectile: any, radius: number, excludeUnit?: Unit): CollisionResult | null`

Check projectile collision against units.

**Returns:**
```typescript
type CollisionResult = {
  unit: Unit;
  point: THREE.Vector3;
  normal: THREE.Vector3;
} | null;
```

**Example:**
```typescript
const collision = unitManager.checkProjectileCollision(
  projectileInstance,
  0.5,  // projectile radius
  shooterUnit  // don't hit shooter
);

if (collision) {
  console.log(`Hit unit: ${collision.unit.id}`);
  console.log(`Hit point: ${collision.point.toArray()}`);
}
```

#### `createProjectileCollisionFunction(excludeUnit?: Unit): CollisionFunction`

Create collision function for projectile system.

**Example:**
```typescript
const projectileManager = world.getProjectileManager();

// Set up collision detection for projectiles
const checkCollision = unitManager.createProjectileCollisionFunction();

projectileManager.registerDefinition({
  id: 'arrow',
  // ... other config
  collision: {
    checkObjects: true,
    checkTerrain: true
  }
});
```

### Outline Management

#### `addUnitOutline(unit: Unit, worldInstance: any, config?: OutlineConfig): string | null`

Add outline effect to unit.

**Example:**
```typescript
const world = getWorldInstance();
const outlineId = unitManager.addUnitOutline(unit, world, {
  edgeStrength: 3.0,
  edgeGlow: 0.5,
  visibleEdgeColor: '#ff0000',  // Red outline
  hiddenEdgeColor: '#ff0000'
});
```

#### `removeUnitOutline(unit: Unit, worldInstance: any): boolean`

Remove outline from unit.

**Example:**
```typescript
unitManager.removeUnitOutline(unit, world);
```

#### `hasUnitOutline(unit: Unit): boolean`

Check if unit has outline.

**Example:**
```typescript
if (unitManager.hasUnitOutline(unit)) {
  console.log('Unit is outlined');
}
```

#### `getOutlinedUnits(): Unit[]`

Get all units with outlines.

**Example:**
```typescript
const outlinedUnits = unitManager.getOutlinedUnits();
console.log(`${outlinedUnits.length} units have outlines`);
```

#### `removeAllUnitOutlines(worldInstance: any): void`

Remove all unit outlines.

**Example:**
```typescript
unitManager.removeAllUnitOutlines(world);
```

## Complete Example

```typescript
import { createWorld } from '@three-play/core';
import type { UnitDefinition } from '@three-play/types';
import * as THREE from 'three';

// 1. Define unit types
const playerDef: UnitDefinition = {
  id: 'player',
  type: 'player',
  team: 'player',
  modelAssets: {
    baseModel: 'playerModel',
    animations: {
      idle: 'playerIdle',
      walk: 'playerWalk',
      attack: 'playerAttack'
    }
  },
  stats: {
    speed: 5.0,
    health: 100,
    attackDamage: 15,
    collisionRadius: 0.5
  }
};

const enemyDef: UnitDefinition = {
  id: 'goblin',
  type: 'enemy',
  team: 'enemy',
  enemyTeams: ['player'],
  modelAssets: {
    baseModel: 'goblinModel',
    animations: {
      idle: 'goblinIdle',
      walk: 'goblinWalk',
      attack: 'goblinAttack',
      death: 'goblinDeath'
    }
  },
  stats: {
    speed: 3.0,
    health: 50,
    attackDamage: 10,
    collisionRadius: 0.4
  },
  ai: {
    type: 'chase',
    targeting: {
      detectionRange: 10,
      attackRange: 2.0
    },
    movement: {
      speed: 3.0
    },
    combat: {
      attackCooldown: 1500,
      knockbackForce: 5
    }
  }
};

// 2. Create world with units system
const world = createWorld({
  world: { size: { x: 100, y: 100 } },
  units: {
    enabled: true,
    maxUnits: 100,
    enableCollision: true,
    definitions: [playerDef, enemyDef]
  },
  // ... other config
});

// 3. Wait for assets to load
world.onReady(() => {
  const unitManager = world.getUnitManager()!;

  // 4. Create player
  const player = unitManager.createUnit({
    definitionId: 'player',
    position: new THREE.Vector3(0, 0, 0)
  });

  if (player) {
    // Initialize combat
    unitManager.initializeCombat(player, 100);

    // Add player glow outline
    unitManager.addUnitOutline(player, world, {
      visibleEdgeColor: '#00ff00',
      edgeStrength: 2.0
    });
  }

  // 5. Spawn enemies
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const radius = 15;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const enemy = unitManager.createUnit({
      definitionId: 'goblin',
      position: new THREE.Vector3(x, 0, z)
    });

    if (enemy) {
      unitManager.initializeCombat(enemy, 50);
      unitManager.initializeAIBehavior(enemy, enemy.model.position.clone());
    }
  }

  // 6. Setup input controls
  const inputManager = world.getInputManager();

  world.onUpdate((deltaTime) => {
    if (!player) return;

    // Movement
    const moveSpeed = player.stats.speed;
    const velocity = new THREE.Vector3();

    if (inputManager.isKeyPressed('KeyW')) {
      velocity.z -= moveSpeed;
    }
    if (inputManager.isKeyPressed('KeyS')) {
      velocity.z += moveSpeed;
    }
    if (inputManager.isKeyPressed('KeyA')) {
      velocity.x -= moveSpeed;
    }
    if (inputManager.isKeyPressed('KeyD')) {
      velocity.x += moveSpeed;
    }

    // Apply movement
    if (velocity.lengthSq() > 0) {
      unitManager.setUnitVelocity(player, velocity);
      unitManager.playAnimation(player, 'walk');
    } else {
      unitManager.stopUnitMovement(player);
      unitManager.playAnimation(player, 'idle');
    }

    // Combat
    const now = Date.now();
    if (inputManager.isMouseButtonPressed(0)) {  // Left click
      if (unitManager.canAttack(player, 'light', now)) {
        const result = unitManager.performLightAttack(player, now);
        if (result.success) {
          unitManager.playAnimation(player, 'attack', 0.1);
          console.log(`Hit ${result.hitUnits.length} enemies!`);

          // Handle deaths
          result.damages.forEach(({ unit, damage }) => {
            if (unit.stats.health <= 0) {
              unitManager.playAnimation(unit, 'death');
              setTimeout(() => unitManager.removeUnit(unit.id), 2000);
            }
          });
        }
      }
    }

    // Check health
    if (player.stats.health <= 0) {
      console.log('Player died!');
      unitManager.playAnimation(player, 'death');
    }
  });

  world.start();
});
```

## AI Behavior States

The AI system uses a finite state machine with these states:

1. **idle**: Unit stands still, no target
2. **patrol**: Unit wanders around home position
3. **chase**: Unit detected enemy and moves toward them
4. **attack**: Unit is in range and attacking
5. **return**: Unit returns to home position after losing target

State transitions happen automatically based on:
- Detection range (idle → chase)
- Attack range (chase → attack)
- Target lost (attack/chase → return)
- Reached home (return → idle/patrol)

## Performance Tips

1. **Limit active units:** Use `maxUnits` to prevent performance issues
2. **Collision optimization:** Current implementation is O(n²), optimize for >100 units
3. **LOD system:** Disable AI/animation for distant units
4. **Object pooling:** Reuse unit instances when possible
5. **Spatial partitioning:** Implement for large unit counts

## Common Patterns

### Health Bar Integration

```typescript
import { createHealthBar } from '@three-play/ui';

const healthBar = createHealthBar({
  maxHealth: unit.stats.maxHealth,
  currentHealth: unit.stats.health
});

unit.model.add(healthBar.mesh);

// Update health bar
world.onUpdate(() => {
  healthBar.update(unit.stats.health);
});
```

### Death Handling

```typescript
world.onUpdate(() => {
  const units = unitManager.getAllUnits();

  units.forEach(unit => {
    if (unit.stats.health <= 0 && !unit.userData.isDead) {
      unit.userData.isDead = true;

      // Play death animation
      unitManager.playAnimation(unit, 'death');

      // Stop AI
      unitManager.stopUnitMovement(unit);

      // Remove after animation
      setTimeout(() => {
        unitManager.removeUnit(unit.id);
      }, 2000);
    }
  });
});
```

### Team-Based Targeting

```typescript
// Define teams
const playerDef: UnitDefinition = {
  id: 'player',
  type: 'player',
  team: 'allies',
  enemyTeams: ['enemies', 'monsters'],
  // ...
};

const goblinDef: UnitDefinition = {
  id: 'goblin',
  type: 'enemy',
  team: 'monsters',
  enemyTeams: ['allies'],
  // ...
};

// AI will automatically target units from enemy teams
```

## See Also

- [World Module](world.md) - World orchestrator
- [Projectiles Module](projectiles.md) - Projectile system
- [Combat System](utilities.md#damage-calculator) - Damage calculation
- [API Reference](api-reference.md) - Complete API index
