# Units System Context

## Overview
The Units system manages the lifecycle, AI behavior, animation, and combat for all characters/units in the game world.

## Architecture

### Component Structure
```
UnitManager (Factory & Coordinator)
├── AnimationController (Animation state management)
├── AIBehaviorController (AI state machine)
└── CombatController (Combat mechanics)
```

### File Responsibilities

**unit-manager.ts**
- Unit lifecycle (create, destroy)
- Definition registry
- Collision detection between units
- Update coordination
- Position queries

**animation-controller.ts**
- THREE.AnimationMixer management
- Animation playback (play, stop, pause)
- Crossfading between animations
- Animation speed control
- Per-unit animation state tracking

**ai-behavior-controller.ts**
- AI state machine: idle → patrol → chase → attack → return
- Target acquisition and tracking
- Pathfinding (basic direct movement)
- Behavior execution per state
- State transition logic

**combat-controller.ts**
- Attack execution
- Damage application
- Knockback physics
- Health management
- Death handling
- Attack cooldown management

**character-asset-utils.ts**
- Character model instantiation from GLTF/FBX
- Material modification (colors, textures)
- Animation clip extraction
- Scale and rotation application

## Unit Definition Pattern

Every unit type is defined via `UnitDefinition`:

```typescript
{
  id: string,              // Unique identifier
  type: UnitType,          // 'player' | 'npc' | 'enemy' | 'neutral'

  modelAssets: {
    baseModel: string,     // Asset key for base model
    animations: {          // Animation asset keys
      idle: string,
      walk: string,
      run?: string,
      attack?: string,
      // ... more animations
    }
  },

  stats: {
    speed: number,         // Movement speed multiplier
    health: number,        // Max and starting health
    attackDamage: number,  // Damage per attack
    attackRange: number,   // Distance to trigger attacks
    attackCooldown: number, // Time between attacks (ms)
    collisionRadius: number, // For collision detection
  },

  appearance: {
    scale: number,         // Model scale
    rotation: number,      // Y-axis rotation offset
    materialModifier?: (model: THREE.Group) => void,
  },

  ai?: {
    type: 'idle' | 'patrol' | 'chase',
    targeting: {
      preferredTargets: UnitType[],
      detectionRange: number,
      attackRange: number,
    },
    movement: {
      speed: number,
      rotationSpeed: number,
    },
    patrol?: {
      points: THREE.Vector3[],
      waitTime: number,
    }
  },

  effects?: {
    running?: any,  // ParticleSystem (external lib)
    water?: any,
    attack?: any,
  }
}
```

## AI State Machine

### States
1. **Idle** - Standing still, no target
2. **Patrol** - Following patrol points (if defined)
3. **Chase** - Moving toward detected target
4. **Attack** - In range, executing attack
5. **Return** - Target lost, returning to origin

### Transitions
```
Idle → (detect target) → Chase
Patrol → (detect target) → Chase
Chase → (in attack range) → Attack
Chase → (target lost) → Return
Attack → (out of range) → Chase
Attack → (target dead) → Return
Return → (at origin) → Idle/Patrol
Return → (detect target) → Chase
```

### Target Detection
- Scans all units within `detectionRange`
- Filters by `preferredTargets` types
- Selects closest valid target
- Updates target position each frame

## Animation System

### Animation States
Each unit tracks:
- Currently playing animations (Map<string, THREE.AnimationAction>)
- Animation mixer (THREE.AnimationMixer)
- Crossfade duration

### Crossfading
- Default crossfade: 0.3 seconds
- Smooth transitions between states
- Previous animations fade out while new fades in

### Animation Triggers
- Movement → 'walk' or 'run'
- Attack → 'attack' or combat-specific animation
- Hit → 'hit' or damage animation
- Death → 'die' or 'death'
- Idle → 'idle' (default)

## Combat System

### Attack Flow
1. Check if target in range
2. Check if cooldown expired
3. Calculate damage (with optional variance)
4. Apply damage to target
5. Apply knockback force
6. Trigger attack animation
7. Trigger attack particle effect
8. Reset cooldown timer

### Knockback Physics
- Direction: From attacker to target
- Force: Configurable strength
- Decay: Gradual velocity reduction over time
- Integration: Applied in update loop

### Death Handling
- Set health to 0
- Trigger death animation
- Mark unit as dead (stays in scene)
- Optionally remove from scene after delay
- Clear from target lists

## Collision System

### Unit-Unit Collision
- Check distance between all unit pairs
- If distance < `minDistance`, apply push force
- Push direction: Away from each other
- Push strength: Configurable
- Prevents unit overlap

### Integration Points
- Called every frame in `UnitManager.update()`
- Uses simple distance checks (O(n²))
- Can be optimized with spatial partitioning

## Common Patterns

### Creating Units
```typescript
unitManager.registerDefinition(zombieDefinition);
const zombie = unitManager.createUnit({
  definitionId: 'zombie',
  position: new THREE.Vector3(10, 0, 10),
  rotation: Math.PI / 2,
});
```

### Querying Units
```typescript
const allUnits = unitManager.getUnits();
const enemies = unitManager.getUnitsByType('enemy');
const nearbyUnits = unitManager.getUnitsInRadius(position, radius);
```

### Manual Control
```typescript
// Move a unit
unitManager.moveUnit(unitId, targetPosition, deltaTime);

// Trigger attack
unitManager.attackUnit(attackerId, targetId);

// Change unit type (e.g., player control)
unitManager.setUnitType(unitId, 'player');
```

## Performance Considerations

### Object Reuse
- AnimationMixers cached per unit
- Temporary vectors for calculations
- Animation actions reused

### Collision Optimization
- Distance-squared comparisons (avoid sqrt)
- Early exit when over maxDistance
- Can add spatial hashing for large unit counts

### AI Optimization
- AI updates can be throttled (not every frame)
- Target queries use distance checks first
- State transitions minimize recalculation

## Testing Notes

### Test Coverage
- `unit-manager.test.ts` - Unit CRUD, collision, queries
- `animation-controller.test.ts` - Animation playback, crossfading
- `ai-behavior-controller.test.ts` - State machine, targeting
- `combat-controller.test.ts` - Damage, knockback, death

### Common Test Patterns
- Mock Three.js objects (Object3D, AnimationMixer)
- Time-based tests use fixed deltaTime
- State transitions validated with assertions
- Edge cases: null targets, zero health, max units

## Known Issues & Limitations

1. **Console Logging** - Uses `console.*` instead of logger in some places (lines 72, 78 in unit-manager.ts)
2. **AI Pathfinding** - Direct line movement, no obstacle avoidance
3. **Animation Blending** - Simple crossfade, no complex blend trees
4. **Collision** - O(n²) complexity, needs spatial optimization for >100 units
5. **Type Safety** - `any` type for combatController reference during initialization

## Extension Points

### Custom AI Behaviors
Add new AI types by extending `AIBehaviorType`:
- Implement behavior in `updateBehavior()` switch
- Add configuration in `UnitDefinition.ai`

### Custom Animations
Add new animation triggers:
- Define in `UnitDefinition.modelAssets.animations`
- Reference in animation controller
- Trigger via unit manager methods

### Custom Combat Mechanics
Extend combat controller:
- Damage types
- Status effects
- Critical hits
- Shields/armor

### Particle Effects
Integrate via `UnitDefinition.effects`:
- Running particles (movement)
- Water splash (water surface)
- Attack effects (combat)
- Hit effects (damage received)
