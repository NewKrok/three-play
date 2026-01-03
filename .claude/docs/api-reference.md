# API Reference Index

Complete API reference for THREE Play game engine.

## Quick Links

### Core Systems
- [World Module](world.md) - Top-level orchestrator
- [Units Module](units.md) - Character management
- [Projectiles Module](projectiles.md) - Projectile system
- [Input Module](input.md) - Input handling

### Rendering & Environment
- [Effects](effects.md) - Post-processing and outlines
- [Terrain](terrain.md) - Terrain generation
- [Water](water.md) - Water rendering
- [Heightmap](heightmap.md) - Height queries
- [Day/Night](day-night.md) - Day/night cycle
- [Skybox](skybox.md) - Skybox management
- [Camera](camera.md) - Cinematic camera sequences

### Support Systems
- [Assets](assets.md) - Asset loading
- [Floating Text](floating-text.md) - Temporary text in 3D space
- [Utilities](utilities.md) - Shared utilities

## Factory Functions

All systems use factory functions following the pattern `create*()`:

```typescript
// World
const world = createWorld(config);

// Systems
const unitManager = createUnitManager(config);
const projectileManager = createProjectileManager(config);
const inputManager = createInputManager(config);
const objectPool = createObjectPool(config);

// Components
const water = createWaterInstance(config, width, height, heightmapUtils);
const terrain = createTerrainInstance(config, width, height, resolution, heightmapUtils);
```

## Type Imports

All types are available from `@three-play/types`:

```typescript
import type {
  WorldConfig,
  WorldInstance,
  Unit,
  UnitDefinition,
  UnitManager,
  ProjectileDefinition,
  ProjectileManager,
  InputManager,
  // ... all other types
} from '@three-play/types';
```

## Core Module Exports

### World Module
```typescript
import { createWorld } from '@three-play/core';
```

### Units Module
```typescript
import {
  createUnitManager,
  CharacterAssetUtils,
  createAnimationController,
  AnimationControllerUtils,
  createAIBehaviorController,
  AIBehaviorUtils,
  createCombatController,
  CombatControllerUtils
} from '@three-play/core/units';
```

### Projectiles Module
```typescript
import {
  createProjectileManager,
  ProjectileUtils
} from '@three-play/core/projectiles';
```

### Input Module
```typescript
import { createInputManager } from '@three-play/core/input';
```

### Utilities
```typescript
import {
  // Easing functions
  EasingFunctions,
  applyEasing,
  isEasingComplete,
  // Object pooling
  createObjectPool,
  ObjectPoolUtils,
  // Team utilities
  TeamUtils,
  // Damage calculation
  calculateDamage,
  applyCalculatedDamage,
  regenerateHealth,
  DamageCalculatorUtils
} from '@three-play/core/utils';
```

## Configuration Types

### WorldConfig
Complete world configuration. See [World Module](world.md).

```typescript
type WorldConfig = {
  world: { size: { x: number; y: number } };
  render?: { useComposer?: boolean; customPasses?: Pass[] };
  update?: { autoStart?: boolean; onUpdate?: UpdateCallback };
  input?: InputManagerConfig;
  heightmap?: WorldHeightmapConfig;
  water?: WaterConfig;
  terrain?: TerrainConfig;
  assets?: AssetsConfig;
  logging?: LoggerConfig;
  dayNight?: DayNightConfig;
  skybox?: SkyboxConfig;
  projectiles?: WorldProjectilesConfig;
  units?: UnitManagerConfig;
};
```

### UnitDefinition
Unit type definition. See [Units Module](units.md).

```typescript
type UnitDefinition = {
  id: string;
  type: 'player' | 'enemy' | 'npc';
  team?: TeamId;
  enemyTeams?: TeamId[];
  modelAssets: {
    baseModel: string;
    animations: Record<string, string>;
  };
  stats: {
    speed: number;
    health: number;
    attackDamage?: number;
    collisionRadius?: number;
    combat?: Partial<CombatStats>;
  };
  appearance?: {
    scale?: number;
    rotation?: number;
    materialModifier?: (instance: THREE.Group) => void;
  };
  ai?: AIBehaviorConfig;
};
```

### ProjectileDefinition
Projectile type definition. See [Projectiles Module](projectiles.md).

```typescript
type ProjectileDefinition = {
  id: string;
  poolSize: number;
  visual: {
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
    castShadow: boolean;
    receiveShadow: boolean;
  };
  physics: {
    gravity: THREE.Vector3;
    airResistance: number;
    velocity?: THREE.Vector3;
    lifetime: number;
    bounciness: number;
    stickOnHit: boolean;
  };
  collision: {
    radius: number;
    checkTerrain: boolean;
    checkObjects: boolean;
  };
  spread?: {
    horizontal: number;
    vertical: number;
    velocityVariance: number;
  };
};
```

## Common Patterns

### Basic World Setup
```typescript
import { createWorld } from '@three-play/core';
import type { WorldConfig } from '@three-play/types';

const config: WorldConfig = {
  world: { size: { x: 100, y: 100 } },
  render: { useComposer: true },
  update: { autoStart: true },
  logging: { level: 'info' }
};

const world = createWorld(config);
document.body.appendChild(world.getRenderer().domElement);

world.onReady(() => {
  console.log('World ready!');
  world.start();
});
```

### Creating Units
```typescript
const unitManager = world.getUnitManager();

// Register definition
unitManager?.registerDefinition({
  id: 'warrior',
  type: 'enemy',
  modelAssets: { /* ... */ },
  stats: { speed: 5, health: 100 }
});

// Create instance
const unit = unitManager?.createUnit({
  definitionId: 'warrior',
  position: new THREE.Vector3(0, 0, 0)
});
```

### Launching Projectiles
```typescript
const projectileManager = world.getProjectileManager();

projectileManager?.launch({
  definitionId: 'arrow',
  origin: startPos,
  direction: targetDir,
  strength: 20
});
```

### Input Handling
```typescript
const inputManager = world.getInputManager();

world.onUpdate((deltaTime) => {
  if (inputManager.isKeyPressed('KeyW')) {
    // Move forward
  }
  if (inputManager.isMouseButtonPressed(0)) {
    // Left click
  }
});
```

## Lifecycle Management

### Initialization Order
1. Create world with config
2. World auto-loads assets if configured
3. Subscribe to `onReady()` for asset completion
4. Initialize game systems
5. Call `world.start()` to begin update loop

### Cleanup Order
1. Stop update loop: `world.pause()`
2. Clean up custom systems
3. Destroy world: `world.destroy()`
   - Stops all managers
   - Disposes assets
   - Removes event listeners
   - Cleans up Three.js resources

### Update Loop
```typescript
world.onUpdate((deltaTime, elapsedTime) => {
  // Input handling
  // Game logic
  // Custom rendering
});
```

## Type Safety

THREE Play is fully typed. Use TypeScript for best experience:

```typescript
import type {
  Unit,
  UnitManager,
  WorldInstance
} from '@three-play/types';

const world: WorldInstance = createWorld(config);
const unitManager: UnitManager | null = world.getUnitManager();
const unit: Unit | null = unitManager?.createUnit(params);
```

## Error Handling

Most functions return `null` or `false` on failure:

```typescript
const unit = unitManager.createUnit(params);
if (!unit) {
  console.error('Failed to create unit');
  return;
}

const removed = unitManager.removeUnit(unitId);
if (!removed) {
  console.warn('Unit not found');
}
```

## Performance Considerations

1. **Object Pooling**: Use for projectiles and particles
2. **Dispose Pattern**: Always call `destroy()` when done
3. **Limit Active Entities**: Set `maxUnits`, `maxProjectiles`
4. **LOD System**: Disable updates for distant entities
5. **Spatial Optimization**: Use for >100 collision checks

## See Also

- [Project CLAUDE](../CLAUDE.md) - Project overview and guidelines
- [World Module](world.md) - Core orchestrator
- [Units Module](units.md) - Character system
- [Projectiles Module](projectiles.md) - Projectile system
- [Utilities](utilities.md) - Helper functions
