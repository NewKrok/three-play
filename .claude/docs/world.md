# World Module

The World module is the top-level orchestrator that initializes and manages all game systems. It's the entry point for creating a THREE Play application.

## Location

- Implementation: [src/core/world/world.ts](../../src/core/world/world.ts)
- Types: [src/types/world.ts](../../src/types/world.ts)
- Export: [src/core/world/index.ts](../../src/core/world/index.ts)

## Core Concept

The World creates and manages:
- Three.js renderer, scene, and camera
- All game systems (input, terrain, water, units, projectiles, etc.)
- Asset loading pipeline
- Update loop and lifecycle management
- Post-processing effects

## Factory Function

### `createWorld(config: WorldConfig): WorldInstance`

Creates a new world instance with all configured systems.

**Parameters:**
- `config`: WorldConfig - Complete configuration object

**Returns:**
- `WorldInstance` - World instance with methods to interact with the world

**Example:**

```typescript
import { createWorld } from '@three-play/core';
import type { WorldConfig } from '@three-play/types';

const config: WorldConfig = {
  world: {
    size: { x: 100, y: 100 }
  },
  render: {
    useComposer: true  // Enable post-processing
  },
  update: {
    autoStart: true,   // Start update loop automatically
    onUpdate: (deltaTime, elapsedTime) => {
      // Your game loop logic
    }
  },
  logging: {
    level: 'debug'
  }
};

const world = createWorld(config);
document.body.appendChild(world.getRenderer().domElement);
```

## Configuration

### WorldConfig Type

```typescript
type WorldConfig = {
  world: {
    size: { x: number; y: number; };
  };
  render?: {
    useComposer?: boolean;        // Enable post-processing (default: true)
    customPasses?: Pass[];        // Custom render passes
  };
  update?: {
    autoStart?: boolean;          // Start loop automatically (default: false)
    onUpdate?: UpdateCallback;    // Update callback
  };
  input?: InputManagerConfig;     // Input system config
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

## WorldInstance API

### Getters

#### `getConfig(): Readonly<WorldConfig>`

Returns the world configuration in read-only mode.

**Example:**
```typescript
const config = world.getConfig();
console.log(config.world.size); // { x: 100, y: 100 }
```

#### `getScene(): THREE.Scene`

Returns the Three.js scene instance.

**Example:**
```typescript
const scene = world.getScene();
scene.add(myCustomObject);
```

#### `getCamera(): THREE.PerspectiveCamera`

Returns the Three.js perspective camera.

**Example:**
```typescript
const camera = world.getCamera();
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);
```

#### `getRenderer(): THREE.WebGLRenderer`

Returns the Three.js WebGL renderer.

**Example:**
```typescript
const renderer = world.getRenderer();
document.body.appendChild(renderer.domElement);
```

#### `getComposer(): EffectComposer | null`

Returns the effect composer for post-processing, or null if `useComposer` is false.

**Example:**
```typescript
const composer = world.getComposer();
if (composer) {
  // Add custom passes
}
```

#### `getAmbientLight(): THREE.AmbientLight`

Returns the scene's ambient light.

**Example:**
```typescript
const ambientLight = world.getAmbientLight();
ambientLight.intensity = 0.5;
```

#### `getDirectionalLight(): THREE.DirectionalLight`

Returns the scene's directional light (sun).

**Example:**
```typescript
const directionalLight = world.getDirectionalLight();
directionalLight.position.set(10, 20, 5);
```

#### `getHeightmapUtils(): HeightmapUtils | null`

Returns heightmap utilities if configured, null otherwise.

**Example:**
```typescript
const heightmapUtils = world.getHeightmapUtils();
if (heightmapUtils) {
  const height = heightmapUtils.getHeightFromPosition(position);
}
```

#### `getLoadedAssets(): LoadedAssets | null`

Returns loaded assets if available, null otherwise.

**Example:**
```typescript
const assets = world.getLoadedAssets();
if (assets) {
  const texture = assets.textures['myTexture'];
  const model = assets.models['myModel'];
}
```

#### `getWaterInstance(): WaterInstance | null`

Returns the water instance if water is configured.

**Example:**
```typescript
const water = world.getWaterInstance();
if (water) {
  water.mesh.position.y = 2;
}
```

#### `getTerrainInstance(): TerrainInstance | null`

Returns the terrain instance if terrain is configured.

**Example:**
```typescript
const terrain = world.getTerrainInstance();
if (terrain) {
  terrain.mesh.visible = false;
}
```

#### `getInputManager(): InputManager`

Returns the input manager instance (always available).

**Example:**
```typescript
const inputManager = world.getInputManager();
const isJumping = inputManager.isKeyPressed('Space');
```

#### `getLogger(): Logger`

Returns the logger instance for this world.

**Example:**
```typescript
const logger = world.getLogger();
logger.debug('Custom debug message');
```

#### `getDayNightManager(): DayNightManager | null`

Returns the day/night manager if enabled.

**Example:**
```typescript
const dayNight = world.getDayNightManager();
if (dayNight) {
  dayNight.setTimeOfDay(12.0); // Set to noon
}
```

#### `getSkyboxManager(): any | null`

Returns the skybox manager if enabled.

#### `getProjectileManager(): ProjectileManager | null`

Returns the projectile manager if enabled.

**Example:**
```typescript
const projectileManager = world.getProjectileManager();
if (projectileManager) {
  projectileManager.launch({
    definitionId: 'arrow',
    origin: startPos,
    direction: direction,
    strength: 20
  });
}
```

#### `getUnitManager(): UnitManager | null`

Returns the unit manager if enabled.

**Example:**
```typescript
const unitManager = world.getUnitManager();
if (unitManager) {
  const unit = unitManager.createUnit({
    definitionId: 'warrior',
    position: new THREE.Vector3(0, 0, 0)
  });
}
```

### Outline System

#### `addOutline(objects: THREE.Object3D | THREE.Object3D[], config: OutlineConfig): string`

Add outline effect to objects.

**Parameters:**
- `objects`: Single object or array of objects to outline
- `config`: Outline configuration

**Returns:**
- `string`: Unique outline ID for management

**Example:**
```typescript
const outlineId = world.addOutline(mesh, {
  edgeStrength: 3.0,
  edgeGlow: 0.5,
  edgeThickness: 1.0,
  visibleEdgeColor: '#00ff00',
  hiddenEdgeColor: '#00ff00'
});
```

#### `removeOutline(outlineId: string): void`

Remove outline by ID.

**Example:**
```typescript
world.removeOutline(outlineId);
```

#### `updateOutline(outlineId: string, config: Partial<OutlineConfig>): void`

Update existing outline configuration.

**Example:**
```typescript
world.updateOutline(outlineId, {
  visibleEdgeColor: '#ff0000',
  edgeStrength: 5.0
});
```

#### `clearOutlines(): void`

Clear all outlines at once.

**Example:**
```typescript
world.clearOutlines();
```

#### `getOutlines(): OutlineEntry[]`

Get all current outlines.

**Example:**
```typescript
const outlines = world.getOutlines();
console.log(`Active outlines: ${outlines.length}`);
```

### Lifecycle Management

#### `start(): void`

Start the update loop.

**Example:**
```typescript
world.start();
```

#### `pause(): void`

Pause the update loop.

**Example:**
```typescript
world.pause();
```

#### `resume(): void`

Resume the update loop after pausing.

**Example:**
```typescript
world.resume();
```

#### `onUpdate(callback: UpdateCallback): () => void`

Subscribe to update events.

**Parameters:**
- `callback`: Function to call on each update `(deltaTime, elapsedTime) => void`

**Returns:**
- Unsubscribe function

**Example:**
```typescript
const unsubscribe = world.onUpdate((deltaTime, elapsedTime) => {
  // Your update logic
  console.log(`Delta: ${deltaTime}s, Elapsed: ${elapsedTime}s`);
});

// Later, to unsubscribe:
unsubscribe();
```

#### `onProgress(callback: ProgressCallback): () => void`

Subscribe to asset loading progress events.

**Parameters:**
- `callback`: Function called with progress updates

**Returns:**
- Unsubscribe function

**Example:**
```typescript
const unsubscribe = world.onProgress((progress) => {
  console.log(`Loading: ${progress.percentage}%`);
  console.log(`${progress.loaded} / ${progress.total} assets`);
});
```

#### `onReady(callback: ReadyCallback): () => void`

Subscribe to asset loading completion events.

**Parameters:**
- `callback`: Function called when all assets are loaded

**Returns:**
- Unsubscribe function

**Example:**
```typescript
const unsubscribe = world.onReady((assets) => {
  console.log('All assets loaded!');
  console.log('Textures:', Object.keys(assets.textures));
  console.log('Models:', Object.keys(assets.models));
});
```

#### `destroy(): void`

Destroy the world instance and clean up all resources.

**IMPORTANT:** This performs complete cleanup including:
- Stopping the update loop
- Disposing all managers (units, projectiles, input, etc.)
- Disposing assets (textures, geometries, materials)
- Removing event listeners
- Disposing Three.js scene and renderer

**Example:**
```typescript
// When done with the world
world.destroy();
```

## Update Loop

The world manages an internal update loop that:
1. Updates delta time using Three.js Clock
2. Updates input manager
3. Updates water (if enabled)
4. Updates day/night cycle (if enabled)
5. Updates projectile manager (if enabled)
6. Updates unit manager (if enabled)
7. Calls all registered update callbacks
8. Renders the scene (using composer or direct rendering)

## Asset Loading

The world handles asset loading automatically if `assets` config is provided:

**Example:**
```typescript
const config: WorldConfig = {
  world: { size: { x: 100, y: 100 } },
  assets: {
    textures: {
      'grass': '/textures/grass.jpg',
      'water': '/textures/water.jpg'
    },
    models: {
      'player': '/models/player.gltf',
      'enemy': '/models/enemy.gltf'
    }
  },
  update: {
    autoStart: true
  }
};

const world = createWorld(config);

// Subscribe to loading events
world.onProgress((progress) => {
  updateLoadingBar(progress.percentage);
});

world.onReady((assets) => {
  console.log('Game ready!');
  // Start game logic
});
```

## Complete Example

```typescript
import { createWorld } from '@three-play/core';
import type { WorldConfig } from '@three-play/types';
import * as THREE from 'three';

const config: WorldConfig = {
  world: {
    size: { x: 100, y: 100 }
  },
  render: {
    useComposer: true
  },
  update: {
    autoStart: false  // Manual start
  },
  assets: {
    textures: {
      'terrain': '/textures/terrain.jpg',
      'water': '/textures/water.jpg'
    },
    models: {
      'player': '/models/player.gltf'
    }
  },
  terrain: {
    enabled: true,
    textureAssetIds: ['terrain']
  },
  water: {
    enabled: true,
    textureAssetId: 'water',
    level: 2
  },
  units: {
    enabled: true,
    definitions: [
      {
        id: 'player',
        type: 'player',
        modelAssets: {
          baseModel: 'player',
          animations: {
            idle: 'player',
            walk: 'player',
            run: 'player'
          }
        },
        stats: {
          speed: 5,
          health: 100,
          collisionRadius: 0.5
        }
      }
    ]
  },
  input: {
    keyboard: { enabled: true },
    mouse: { enabled: true }
  },
  logging: {
    level: 'info'
  }
};

// Create world
const world = createWorld(config);
document.body.appendChild(world.getRenderer().domElement);

// Setup loading
world.onProgress((progress) => {
  console.log(`Loading: ${progress.percentage}%`);
});

world.onReady((assets) => {
  console.log('Assets loaded!');

  // Create player unit
  const unitManager = world.getUnitManager();
  if (unitManager) {
    const player = unitManager.createUnit({
      definitionId: 'player',
      position: new THREE.Vector3(0, 0, 0)
    });
  }

  // Setup camera
  const camera = world.getCamera();
  camera.position.set(0, 10, 20);
  camera.lookAt(0, 0, 0);

  // Start the game
  world.start();
});

// Game loop
world.onUpdate((deltaTime, elapsedTime) => {
  const inputManager = world.getInputManager();
  const unitManager = world.getUnitManager();

  if (inputManager.isKeyPressed('KeyW')) {
    // Move player forward
  }

  // Your game logic here
});

// Cleanup when done
window.addEventListener('beforeunload', () => {
  world.destroy();
});
```

## Performance Tips

1. **Use `autoStart: true`** if you don't need custom initialization
2. **Disable unused systems** by not including them in config
3. **Use object pooling** for projectiles and particles
4. **Monitor with logger** during development:
   ```typescript
   logging: { level: 'debug' }
   ```
5. **Proper cleanup:** Always call `destroy()` when done

## Common Patterns

### Manual Update Loop Control

```typescript
const world = createWorld({
  world: { size: { x: 100, y: 100 } },
  update: { autoStart: false }
});

// Start when ready
world.onReady(() => {
  world.start();
});

// Pause game
function pauseGame() {
  world.pause();
}

// Resume game
function resumeGame() {
  world.resume();
}
```

### Multiple Update Callbacks

```typescript
// Physics update
const unsubPhysics = world.onUpdate((deltaTime) => {
  updatePhysics(deltaTime);
});

// UI update
const unsubUI = world.onUpdate((deltaTime, elapsedTime) => {
  updateUI(elapsedTime);
});

// Can unsubscribe individually
unsubPhysics();
```

### Conditional System Initialization

```typescript
const config: WorldConfig = {
  world: { size: { x: 100, y: 100 } },
  // Only enable terrain if needed
  terrain: isTerrainEnabled ? {
    enabled: true,
    textureAssetIds: ['grass']
  } : undefined,
  // Only enable units if needed
  units: isGameMode ? {
    enabled: true
  } : undefined
};

const world = createWorld(config);
```

## See Also

- [Units Module](units.md) - Character management
- [Projectiles Module](projectiles.md) - Projectile system
- [Input Module](input.md) - Input handling
- [Assets Module](assets.md) - Asset loading
- [API Reference](api-reference.md) - Complete API index
