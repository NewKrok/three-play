# Projectiles Module

The Projectiles module provides a high-performance projectile system with object pooling, physics simulation, collision detection, and event handling.

## Location

- Implementation: [src/core/projectiles/projectile-manager.ts](../../src/core/projectiles/projectile-manager.ts)
- Types: [src/types/projectiles.ts](../../src/types/projectiles.ts)
- Export: [src/core/projectiles/index.ts](../../src/core/projectiles/index.ts)

## Core Concept

The Projectiles system provides:
- Object pooling for efficient memory management (one pool per projectile type)
- Physics simulation (gravity, air resistance, velocity)
- Collision detection (terrain and object collisions)
- Launch mechanics with spread patterns
- Event system (hit and destroy events)
- Visual configuration (geometry, materials, shadows)

## Factory Function

### `createProjectileManager(config: ProjectileManagerConfig): ProjectileManager`

Creates a projectile manager instance.

**Parameters:**
- `config`: ProjectileManagerConfig - Configuration object

**Returns:**
- `ProjectileManager` - Projectile manager instance

**Example:**

```typescript
import { createProjectileManager } from '@three-play/core';
import type { ProjectileManagerConfig } from '@three-play/types';

const config: ProjectileManagerConfig = {
  scene: world.getScene(),
  logger: world.getLogger(),
  maxProjectiles: 1000,
  getHeightFromPosition: (position) => {
    const heightmap = world.getHeightmapUtils();
    return heightmap ? heightmap.getHeightFromPosition(position) : 0;
  },
  checkObjectCollision: (projectile, radius) => {
    // Custom collision detection
    const unitManager = world.getUnitManager();
    return unitManager?.checkProjectileCollision(projectile, radius) || null;
  }
};

const projectileManager = createProjectileManager(config);
```

## Configuration

### ProjectileManagerConfig Type

```typescript
type ProjectileManagerConfig = {
  scene: THREE.Scene;              // Three.js scene
  logger: Logger;                  // Logger instance
  maxProjectiles: number;          // Max total projectiles
  getHeightFromPosition?: (position: THREE.Vector3) => number;
  checkObjectCollision?: (
    projectile: ProjectileInstance,
    radius: number
  ) => {
    object: THREE.Object3D;
    point: THREE.Vector3;
    normal: THREE.Vector3;
  } | null;
};
```

## Projectile Definition

### ProjectileDefinition Type

```typescript
type ProjectileDefinition = {
  id: string;                       // Unique identifier
  name: string;                     // Display name
  physics: ProjectilePhysicsConfig;
  visual: ProjectileVisualConfig;
  collision: ProjectileCollisionConfig;
  spread?: ProjectileSpreadConfig;
  poolSize: number;                 // Max instances to pool
};
```

### ProjectilePhysicsConfig Type

```typescript
type ProjectilePhysicsConfig = {
  velocity: THREE.Vector3;          // Initial velocity
  gravity: THREE.Vector3;           // Gravity per frame
  airResistance: number;            // 0-1 (1 = no resistance)
  bounciness: number;               // 0-1 bounce coefficient
  stickOnHit: boolean;              // Stick on collision
  lifetime: number;                 // Lifetime in seconds (0 = infinite)
};
```

### ProjectileVisualConfig Type

```typescript
type ProjectileVisualConfig = {
  geometry: THREE.BufferGeometry;   // Three.js geometry
  material: THREE.Material;         // Three.js material
  castShadow: boolean;              // Cast shadows
  receiveShadow: boolean;           // Receive shadows
  trail?: {                         // Optional trail
    length: number;
    width: number;
    color: string;
    opacity: number;
  };
};
```

### ProjectileCollisionConfig Type

```typescript
type ProjectileCollisionConfig = {
  radius: number;                   // Collision sphere radius
  layers: string[];                 // Collision layers
  checkTerrain: boolean;            // Collide with terrain
  checkObjects: boolean;            // Collide with objects
};
```

### ProjectileSpreadConfig Type

```typescript
type ProjectileSpreadConfig = {
  horizontal: number;               // Horizontal spread (radians)
  vertical: number;                 // Vertical spread (radians)
  velocityVariance: number;         // Velocity randomness (0-1)
};
```

**Example Definition:**

```typescript
import * as THREE from 'three';

const arrowDefinition: ProjectileDefinition = {
  id: 'arrow',
  name: 'Arrow',
  physics: {
    velocity: new THREE.Vector3(0, 0, 0),
    gravity: new THREE.Vector3(0, -9.8, 0),
    airResistance: 0.99,
    bounciness: 0,
    stickOnHit: true,
    lifetime: 10.0
  },
  visual: {
    geometry: new THREE.CylinderGeometry(0.05, 0.05, 1, 8),
    material: new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      metalness: 0.3,
      roughness: 0.7
    }),
    castShadow: true,
    receiveShadow: false
  },
  collision: {
    radius: 0.15,
    layers: ['units', 'terrain'],
    checkTerrain: true,
    checkObjects: true
  },
  spread: {
    horizontal: 0.02,  // Small inaccuracy
    vertical: 0.01,
    velocityVariance: 0.05
  },
  poolSize: 50
};

projectileManager.registerDefinition(arrowDefinition);
```

## Projectile Instance Type

```typescript
type ProjectileInstance = {
  id: string;                       // Unique instance ID
  definition: ProjectileDefinition; // Definition reference
  mesh: THREE.Mesh;                 // Three.js mesh
  position: THREE.Vector3;          // Current position
  velocity: THREE.Vector3;          // Current velocity
  rotation: THREE.Euler;            // Current rotation
  timeAlive: number;                // Time alive (seconds)
  active: boolean;                  // Is active
  userData: Record<string, any>;    // Custom data
};
```

## ProjectileManager API

### Definition Management

#### `registerDefinition(definition: ProjectileDefinition): void`

Register a projectile definition and create its object pool.

**Example:**
```typescript
const fireballDef: ProjectileDefinition = {
  id: 'fireball',
  name: 'Fireball',
  physics: {
    velocity: new THREE.Vector3(0, 0, 0),
    gravity: new THREE.Vector3(0, -2, 0),
    airResistance: 0.98,
    bounciness: 0,
    stickOnHit: false,
    lifetime: 5.0
  },
  visual: {
    geometry: new THREE.SphereGeometry(0.3),
    material: new THREE.MeshBasicMaterial({
      color: 0xff4500,
      emissive: 0xff4500,
      emissiveIntensity: 2
    }),
    castShadow: true,
    receiveShadow: false
  },
  collision: {
    radius: 0.4,
    layers: ['units'],
    checkTerrain: true,
    checkObjects: true
  },
  poolSize: 20
};

projectileManager.registerDefinition(fireballDef);
```

#### `unregisterDefinition(definitionId: string): void`

Unregister a definition and destroy all its projectiles.

**Example:**
```typescript
projectileManager.unregisterDefinition('arrow');
```

### Launching Projectiles

#### `launch(params: ProjectileLaunchParams): ProjectileInstance | null`

Launch a projectile from the pool.

**Parameters:**
```typescript
type ProjectileLaunchParams = {
  definitionId: string;             // Definition ID to use
  origin: THREE.Vector3;            // Launch position
  direction: THREE.Vector3;         // Launch direction (normalized)
  strength: number;                 // Launch velocity multiplier
  physicsOverride?: Partial<ProjectilePhysicsConfig>;
  userData?: Record<string, any>;   // Custom data
};
```

**Returns:**
- `ProjectileInstance | null` - Launched projectile or null if pool exhausted

**Example:**
```typescript
// Simple launch
const arrow = projectileManager.launch({
  definitionId: 'arrow',
  origin: new THREE.Vector3(0, 2, 0),
  direction: new THREE.Vector3(0, 0.3, 1).normalize(),
  strength: 20
});

if (arrow) {
  console.log(`Launched arrow: ${arrow.id}`);
}

// Launch with custom data
const bullet = projectileManager.launch({
  definitionId: 'bullet',
  origin: player.position.clone(),
  direction: aimDirection,
  strength: 50,
  userData: {
    shooter: player.id,
    damage: 25,
    team: 'player'
  }
});

// Launch with physics override
const grenade = projectileManager.launch({
  definitionId: 'grenade',
  origin: throwPosition,
  direction: throwDirection,
  strength: 15,
  physicsOverride: {
    gravity: new THREE.Vector3(0, -15, 0)
  }
});
```

### Update and Lifecycle

#### `update(deltaTime: number): void`

Update all active projectiles (called by world automatically).

**Example:**
```typescript
// Usually called by world automatically
world.onUpdate((deltaTime) => {
  projectileManager.update(deltaTime);
});
```

#### `destroyProjectile(projectileId: string, reason?: string): void`

Manually destroy a specific projectile.

**Example:**
```typescript
projectileManager.destroyProjectile(missile.id, 'manual');
```

#### `destroyAllProjectiles(): void`

Destroy all active projectiles at once.

**Example:**
```typescript
// Clear screen when changing levels
projectileManager.destroyAllProjectiles();
```

### Queries

#### `getActiveProjectiles(): ProjectileInstance[]`

Get all active projectiles.

**Example:**
```typescript
const active = projectileManager.getActiveProjectiles();
console.log(`Active projectiles: ${active.length}`);
```

#### `getProjectilesByType(definitionId: string): ProjectileInstance[]`

Get all active projectiles of a specific type.

**Example:**
```typescript
const arrows = projectileManager.getProjectilesByType('arrow');
console.log(`Active arrows: ${arrows.length}`);

// Apply wind effect to arrows
arrows.forEach(arrow => {
  arrow.velocity.x += windForce;
});
```

#### `getStats(): ProjectileManagerStats`

Get statistics about the projectile manager.

**Returns:**
```typescript
type ProjectileManagerStats = {
  definitionCount: number;
  activeProjectiles: number;
  poolStats: Record<string, {
    total: number;
    active: number;
    available: number;
  }>;
};
```

**Example:**
```typescript
const stats = projectileManager.getStats();
console.log(`Definitions: ${stats.definitionCount}`);
console.log(`Active: ${stats.activeProjectiles}`);

// Check pool usage
Object.entries(stats.poolStats).forEach(([id, poolStats]) => {
  console.log(`${id}: ${poolStats.active}/${poolStats.total} active`);
  if (poolStats.available < 5) {
    console.warn(`Pool ${id} running low!`);
  }
});
```

### Events

#### `onHit(callback: (event: ProjectileHitEvent) => void): () => void`

Subscribe to projectile hit events.

**Event Type:**
```typescript
type ProjectileHitEvent = {
  projectile: ProjectileInstance;
  target?: THREE.Object3D;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  velocity: THREE.Vector3;
};
```

**Example:**
```typescript
const unsubscribe = projectileManager.onHit((event) => {
  console.log(`Hit at: ${event.position.toArray()}`);

  // Spawn impact effect
  spawnImpactEffect(event.position, event.normal);

  // Apply damage
  if (event.target?.userData.unit) {
    const damage = event.projectile.userData.damage || 10;
    event.target.userData.unit.takeDamage(damage);
  }
});

// Unsubscribe later
unsubscribe();
```

#### `onDestroy(callback: (event: ProjectileDestroyEvent) => void): () => void`

Subscribe to projectile destroy events.

**Event Type:**
```typescript
type ProjectileDestroyEvent = {
  projectile: ProjectileInstance;
  reason: 'lifetime' | 'collision' | 'manual' | 'bounds';
};
```

**Example:**
```typescript
projectileManager.onDestroy((event) => {
  if (event.projectile.definition.id === 'grenade') {
    // Explode!
    createExplosion(event.projectile.position, 5.0);
  }
});
```

### Cleanup

#### `dispose(): void`

Clean up and dispose all resources.

**Example:**
```typescript
projectileManager.dispose();
```

## Complete Example

```typescript
import { createWorld } from '@three-play/core';
import type { ProjectileDefinition } from '@three-play/types';
import * as THREE from 'three';

// Define projectile types
const arrowDef: ProjectileDefinition = {
  id: 'arrow',
  name: 'Arrow',
  physics: {
    velocity: new THREE.Vector3(0, 0, 0),
    gravity: new THREE.Vector3(0, -9.8, 0),
    airResistance: 0.99,
    bounciness: 0,
    stickOnHit: true,
    lifetime: 10.0
  },
  visual: {
    geometry: new THREE.CylinderGeometry(0.05, 0.05, 1, 8),
    material: new THREE.MeshStandardMaterial({ color: 0x8b4513 }),
    castShadow: true,
    receiveShadow: false
  },
  collision: {
    radius: 0.15,
    layers: ['units'],
    checkTerrain: true,
    checkObjects: true
  },
  spread: {
    horizontal: 0.02,
    vertical: 0.01,
    velocityVariance: 0.05
  },
  poolSize: 50
};

// Create world with projectiles
const world = createWorld({
  world: { size: { x: 100, y: 100 } },
  projectiles: {
    enabled: true,
    maxProjectiles: 500,
    definitions: [arrowDef]
  }
});

world.onReady(() => {
  const projectileManager = world.getProjectileManager()!;
  const inputManager = world.getInputManager();

  // Setup hit handling
  projectileManager.onHit((event) => {
    createImpactParticles(event.position);

    if (event.target?.userData.unit) {
      const damage = event.projectile.userData.damage || 10;
      event.target.userData.unit.takeDamage(damage);
    }
  });

  // Player shooting
  world.onUpdate(() => {
    const camera = world.getCamera();

    if (inputManager.isMouseButtonPressed(0)) {
      const origin = camera.position.clone();
      const direction = new THREE.Vector3(0, 0, -1)
        .applyQuaternion(camera.quaternion);

      projectileManager.launch({
        definitionId: 'arrow',
        origin,
        direction,
        strength: 30,
        userData: {
          shooter: 'player',
          damage: 15
        }
      });
    }
  });

  world.start();
});
```

## Physics Simulation

The projectile system simulates realistic physics each frame:

1. **Gravity**: Applied as acceleration
   ```typescript
   velocity += gravity * deltaTime
   ```

2. **Air Resistance**: Reduces velocity over time
   ```typescript
   velocity *= Math.pow(airResistance, deltaTime)
   ```

3. **Position Update**: Integrate velocity
   ```typescript
   position += velocity * deltaTime
   ```

4. **Rotation**: Projectile faces velocity direction
   ```typescript
   mesh.lookAt(position + velocity.normalize())
   ```

## Collision Detection

### Terrain Collision
```typescript
const terrainHeight = getHeightFromPosition(position);
if (position.y <= terrainHeight + collisionRadius) {
  handleCollision(projectile, 'terrain');
}
```

### Object Collision
Uses provided `checkObjectCollision` callback:
```typescript
const hit = checkObjectCollision(projectile, collisionRadius);
if (hit) {
  handleCollision(projectile, 'object', hit.object);
}
```

### Collision Response
- **Destroy**: Remove projectile (default)
- **Bounce**: Reflect velocity with bounciness coefficient
- **Stick**: Zero velocity, keep projectile in world

## Spread Patterns

Launch spread adds randomness:

```typescript
// Horizontal spread
const angle = (Math.random() - 0.5) * spread.horizontal;
direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

// Velocity variance
strength *= 1 + (Math.random() - 0.5) * spread.velocityVariance;
```

**Use Cases:**
- Shotgun spread: `horizontal: 0.3, vertical: 0.2`
- Sniper accuracy: `horizontal: 0.01, vertical: 0.01`
- Grenade launcher: `horizontal: 0.1, velocityVariance: 0.2`

## Object Pooling

Each projectile type has its own pool for efficient memory management.

**Benefits:**
- No garbage collection during gameplay
- Consistent performance
- Predictable memory usage
- Fast allocation/deallocation

**Configuration:**
```typescript
{
  poolSize: 50,      // Max instances for this type
  initialSize: 10,   // Pre-allocated on startup
  autoGrow: true     // Create more if needed
}
```

## Performance Tips

1. **Pool Sizing**: Set `poolSize` to expected max simultaneous projectiles
2. **Lifetime**: Use reasonable lifetimes to avoid buildup
3. **Collision Layers**: Only check necessary layers
4. **Disposal**: Call `dispose()` when changing levels
5. **Stats Monitoring**: Check pool stats to detect exhaustion

## Common Patterns

### Arrow System
```typescript
const arrowDef: ProjectileDefinition = {
  id: 'arrow',
  physics: {
    gravity: new THREE.Vector3(0, -9.8, 0),
    airResistance: 0.99,
    stickOnHit: true,
    lifetime: 10.0
  },
  spread: {
    horizontal: 0.02,
    vertical: 0.01,
    velocityVariance: 0.05
  }
};
```

### Bullet System
```typescript
const bulletDef: ProjectileDefinition = {
  id: 'bullet',
  physics: {
    gravity: new THREE.Vector3(0, 0, 0),  // No gravity
    airResistance: 1.0,  // No resistance
    stickOnHit: false,
    lifetime: 5.0
  },
  spread: {
    horizontal: 0.01,
    vertical: 0.01,
    velocityVariance: 0.01
  }
};
```

### Grenade System
```typescript
const grenadeDef: ProjectileDefinition = {
  id: 'grenade',
  physics: {
    gravity: new THREE.Vector3(0, -15, 0),
    airResistance: 0.95,
    bounciness: 0.3,
    stickOnHit: false,
    lifetime: 3.0
  }
};

// Explode on destroy
projectileManager.onDestroy((event) => {
  if (event.projectile.definition.id === 'grenade') {
    createExplosion(event.projectile.position, 5.0);
  }
});
```

### Homing Missile
```typescript
const missile = projectileManager.launch({
  definitionId: 'missile',
  origin: launcher.position,
  direction: initialDirection,
  strength: 15,
  userData: { target: enemyUnit }
});

world.onUpdate((deltaTime) => {
  const missiles = projectileManager.getProjectilesByType('missile');

  missiles.forEach(missile => {
    const target = missile.userData.target;
    if (!target) return;

    const toTarget = target.model.position.clone()
      .sub(missile.position)
      .normalize();

    const turnRate = 5.0 * deltaTime;
    missile.velocity.lerp(
      toTarget.multiplyScalar(missile.velocity.length()),
      turnRate
    );
  });
});
```

## Integration with World

```typescript
const world = createWorld({
  world: { size: { x: 100, y: 100 } },
  projectiles: {
    enabled: true,
    maxProjectiles: 1000,
    definitions: [arrowDef, bulletDef],
    checkObjectCollision: (projectile, radius) => {
      const unitManager = world.getUnitManager();
      return unitManager?.checkProjectileCollision(projectile, radius) || null;
    }
  }
});

const projectileManager = world.getProjectileManager();
```

## See Also

- [World Module](world.md) - World orchestrator
- [Units Module](units.md) - Unit management
- [Utilities Module](utilities.md#object-pool) - Object pooling
- [API Reference](api-reference.md) - Complete API index
