# Projectiles System Context

## Overview
The Projectiles system manages the lifecycle of projectiles (bullets, arrows, spells, etc.) with built-in object pooling for optimal performance. Supports gravity, collision detection, and custom hit/destroy events.

## Architecture

### Component Structure
```
ProjectileManager
├── ProjectileDefinition Registry
├── ObjectPool<ProjectileInstance> (per definition)
├── Active Projectiles Map
└── Event System (hit, destroy)
```

### File Responsibilities

**projectile-manager.ts**
- Projectile definition registry
- Object pool management (one pool per definition type)
- Launch mechanics (initial velocity, spread)
- Physics simulation (gravity, trajectory)
- Collision detection (terrain + objects)
- Event emission (hit, destroy)
- Lifecycle management (spawn, update, destroy)

## Object Pooling

### Why Pooling?
Projectiles are frequently created and destroyed (bullets, arrows, etc.). Without pooling:
- High garbage collection pressure
- Frame rate spikes
- Memory fragmentation

With pooling:
- Reuse instances (no GC)
- Stable frame rate
- Predictable memory usage

### Pool Per Definition
Each projectile type has its own pool:
```typescript
pools: Map<definitionId, ObjectPool<ProjectileInstance>>
```

Benefits:
- Type-specific geometry/material reuse
- Separate size limits per projectile type
- Easy to track usage per type

### Pool Operations

**Get from Pool:**
```typescript
const instance = pool.get();  // Returns existing or creates new
if (!instance) {
  // Pool exhausted (hit maxSize)
  return null;
}
```

**Release to Pool:**
```typescript
pool.release(instance);  // Resets and returns to pool
```

**Preallocate:**
```typescript
pool.preallocate(50);  // Create 50 instances upfront
```

## Projectile Definition

### Structure
```typescript
{
  id: string,                    // Unique identifier

  visual: {
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    castShadow: boolean,
    receiveShadow: boolean,
  },

  physics: {
    useGravity: boolean,         // Apply gravity over time
    gravity: number,             // Gravity strength (default: 9.8)
    drag?: number,               // Air resistance (0-1)
    mass?: number,               // For future physics expansion
  },

  behavior: {
    lifetime: number,            // Max time alive (seconds)
    speed: number,               // Initial velocity magnitude
    spread?: number,             // Random angle deviation (radians)
    rotationSpeed?: THREE.Vector3, // Spin per second
    homing?: {                   // Homing missile behavior
      target: THREE.Object3D,
      strength: number,
      maxTurnRate: number,
    },
  },

  collision: {
    radius: number,              // Collision sphere radius
    checkTerrain: boolean,       // Collide with terrain/heightmap
    checkObjects: boolean,       // Collide with objects
    destroyOnHit: boolean,       // Remove on collision
    penetration?: number,        // Hit multiple targets
  },

  effects?: {
    trail?: any,                 // Trail particle system
    impact?: any,                // Impact particle system
    sound?: {
      launch?: string,
      impact?: string,
    }
  }
}
```

## Launch Mechanics

### Launch Parameters
```typescript
{
  definitionId: string,          // Which projectile type
  position: THREE.Vector3,       // Starting position
  direction: THREE.Vector3,      // Launch direction (normalized)
  speed?: number,                // Override definition speed
  userData?: any,                // Custom data (e.g., owner, damage)
}
```

### Launch Process
1. **Get from Pool** - Retrieve or create instance
2. **Apply Spread** - Add random deviation to direction
3. **Calculate Velocity** - direction * speed
4. **Set Position** - Place at launch point
5. **Set Rotation** - Orient to match direction
6. **Add to Scene** - Make visible
7. **Track Active** - Add to active projectiles map
8. **Emit Launch Event** - Trigger effects/sounds

### Spread Calculation
```typescript
// Random angle within spread cone
const theta = Math.random() * Math.PI * 2;
const phi = Math.random() * spread;

// Convert to direction vector
const spreadX = Math.sin(phi) * Math.cos(theta);
const spreadY = Math.sin(phi) * Math.sin(theta);
const spreadZ = Math.cos(phi);

// Apply to launch direction
direction.add(spreadVector).normalize();
```

## Physics Simulation

### Update Loop (per projectile)
```typescript
1. Integrate velocity: position += velocity * deltaTime
2. Apply gravity: velocity.y -= gravity * deltaTime
3. Apply drag: velocity *= (1 - drag * deltaTime)
4. Check terrain collision (if enabled)
5. Check object collision (if enabled)
6. Update rotation (if rotationSpeed defined)
7. Update mesh position/rotation
8. Increment timeAlive
9. Check lifetime expiration
```

### Gravity
- Default: 9.8 m/s² (Earth gravity)
- Applied as downward acceleration: `velocity.y -= gravity * deltaTime`
- Creates parabolic trajectory (arc)

### Drag
- Simulates air resistance
- Reduces velocity over time: `velocity *= (1 - drag * deltaTime)`
- Values: 0 (no drag) to 1 (stops immediately)

## Collision Detection

### Terrain Collision
```typescript
const terrainHeight = getHeightFromPosition(position.x, position.z);
if (position.y <= terrainHeight) {
  // Hit terrain
  handleCollision(projectile, 'terrain');
}
```

**Integration:** Requires `getHeightFromPosition` callback from heightmap system.

### Object Collision
```typescript
const distance = position.distanceTo(object.position);
if (distance <= (collisionRadius + object.collisionRadius)) {
  // Hit object
  handleCollision(projectile, 'object', object);
}
```

**Integration:** Requires `checkObjectCollision` callback that returns hit objects.

### Collision Response
1. **Emit Hit Event** - Notify listeners (projectile, hitObject)
2. **Apply Damage** - If object has health (via userData)
3. **Spawn Impact Effects** - Particles, sounds
4. **Destroy or Penetrate** - Remove or continue based on config

## Event System

### Hit Event
```typescript
type ProjectileHitEvent = {
  projectile: ProjectileInstance,
  hitObject?: THREE.Object3D,
  hitPosition: THREE.Vector3,
  hitNormal?: THREE.Vector3,
};

projectileManager.onHit((event) => {
  console.log('Projectile hit:', event);
  // Apply damage, spawn effects, etc.
});
```

### Destroy Event
```typescript
type ProjectileDestroyEvent = {
  projectile: ProjectileInstance,
  reason: 'collision' | 'lifetime' | 'manual',
};

projectileManager.onDestroy((event) => {
  console.log('Projectile destroyed:', event);
  // Cleanup, stats tracking, etc.
});
```

## Lifecycle Management

### States
1. **Pooled** - In pool, inactive, not in scene
2. **Active** - Launched, in scene, updating
3. **Destroyed** - Removed from scene, returned to pool

### Destroy Reasons
- **Collision** - Hit terrain or object
- **Lifetime** - Exceeded max time alive
- **Manual** - Explicitly destroyed (e.g., spell cancelled)

### Cleanup Process
```typescript
1. Remove from scene
2. Reset instance state (position, velocity, timeAlive)
3. Hide mesh (visible = false)
4. Remove from active projectiles map
5. Return to pool
6. Emit destroy event
```

## Performance Considerations

### Object Pooling Benefits
- **No GC spikes** - Instances reused, not collected
- **Consistent frame rate** - Predictable allocations
- **Memory efficiency** - Max memory known upfront

### Pool Sizing
```typescript
{
  initialSize: 10,   // Create 10 on startup (warmup)
  maxSize: 100,      // Never exceed 100 instances
}
```

**Guidelines:**
- `initialSize` = Expected simultaneous projectiles
- `maxSize` = Hard limit (prevents runaway spawning)

### Collision Optimization
- **Broad Phase** - Only check nearby objects (spatial partitioning)
- **Narrow Phase** - Precise distance check
- **Early Exit** - Stop on first hit if non-penetrating

### Update Optimization
- **Dirty Flags** - Skip updates if no change
- **LOD** - Reduce updates for distant projectiles
- **Culling** - Destroy off-screen projectiles

## Common Patterns

### Simple Projectile (Bullet)
```typescript
const bulletDef: ProjectileDefinition = {
  id: 'bullet',
  visual: {
    geometry: new THREE.SphereGeometry(0.1),
    material: new THREE.MeshBasicMaterial({ color: 0xffff00 }),
    castShadow: true,
    receiveShadow: false,
  },
  physics: {
    useGravity: false,  // Straight line
    drag: 0,
  },
  behavior: {
    lifetime: 5.0,
    speed: 50,
    spread: 0.01,  // Small inaccuracy
  },
  collision: {
    radius: 0.1,
    checkObjects: true,
    checkTerrain: true,
    destroyOnHit: true,
  }
};
```

### Arcing Projectile (Arrow)
```typescript
const arrowDef: ProjectileDefinition = {
  id: 'arrow',
  visual: { /* arrow mesh */ },
  physics: {
    useGravity: true,   // Arcs down
    gravity: 9.8,
  },
  behavior: {
    lifetime: 10.0,
    speed: 30,
    rotationSpeed: new THREE.Vector3(0, 0, 10),  // Spin
  },
  collision: {
    radius: 0.15,
    checkObjects: true,
    checkTerrain: true,
    destroyOnHit: true,
  }
};
```

### Penetrating Projectile (Laser)
```typescript
const laserDef: ProjectileDefinition = {
  id: 'laser',
  visual: { /* laser beam */ },
  physics: {
    useGravity: false,
    drag: 0,
  },
  behavior: {
    lifetime: 2.0,
    speed: 100,
  },
  collision: {
    radius: 0.05,
    checkObjects: true,
    checkTerrain: false,  // Pass through terrain
    destroyOnHit: false,  // Don't destroy on hit
    penetration: 5,       // Hit up to 5 targets
  }
};
```

## Testing Notes

### Test Coverage
- `projectile-manager.test.ts` - Launch, physics, collision, pooling

### Mock Pattern
Tests mock dependencies:
```typescript
const mockScene = { add: jest.fn(), remove: jest.fn() };
const mockLogger = { info: jest.fn(), warn: jest.fn() };
const mockHeightFunction = jest.fn().mockReturnValue(0);
```

### Physics Tests
Use fixed time steps:
```typescript
projectileManager.update(0.1);  // 100ms
expect(projectile.position.y).toBeCloseTo(expectedHeight);
```

### Pooling Tests
```typescript
// Launch 100 projectiles
for (let i = 0; i < 100; i++) {
  projectileManager.launch({ ... });
}

// All should be destroyed (lifetime expired)
projectileManager.update(10.0);

// Pool should have 100 available
expect(pool.getStats().available).toBe(100);
```

## Known Issues & Limitations

1. **Collision Detection** - Simple sphere-sphere, no complex shapes
2. **No Networking** - Projectiles not synced (future enhancement)
3. **No Prediction** - Client-side only, no lag compensation
4. **Limited Physics** - No ricochet, bounce, or complex interactions
5. **Pool Exhaustion** - Launching fails if pool at maxSize (silent failure)

## Extension Points

### Custom Collision
Add custom collision shapes:
```typescript
// In checkObjectCollision callback
const hitObjects = customCollisionDetection(
  projectile.position,
  projectile.velocity,
  projectile.definition.collision.radius
);
return hitObjects;
```

### Homing Missiles
```typescript
// In update loop
if (definition.behavior.homing) {
  const toTarget = target.position.clone().sub(position).normalize();
  const turnStrength = homing.strength * deltaTime;
  velocity.lerp(toTarget.multiplyScalar(speed), turnStrength);
}
```

### Trail Effects
```typescript
// Spawn trail particles
projectileManager.onLaunch((projectile) => {
  if (projectile.definition.effects?.trail) {
    spawnTrailEffect(projectile.mesh, projectile.definition.effects.trail);
  }
});
```

### Damage System Integration
```typescript
projectileManager.onHit((event) => {
  const damage = event.projectile.userData.damage || 10;
  const target = event.hitObject?.userData.unit;
  if (target) {
    target.takeDamage(damage);
  }
});
```

### Stats Tracking
```typescript
const stats = projectileManager.getStats();
console.log(`Active: ${stats.active}, Pooled: ${stats.pooled}`);
```
