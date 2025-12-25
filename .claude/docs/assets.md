# Assets Module

Asset loading and management system.

## Location

- Implementation: [src/core/assets/](../../src/core/assets/)
- Types: [src/types/assets.ts](../../src/types/assets.ts)
- Export: [src/core/assets/index.ts](../../src/core/assets/index.ts)

## Overview

Loads and manages:
- Textures
- 3D models (GLTF)
- Audio files

## Asset Loading

### Configuration

```typescript
type AssetsConfig = {
  textures?: Record<string, string>;   // key -> URL
  models?: Record<string, string>;     // key -> URL
  audio?: Record<string, string>;      // key -> URL
};
```

### Integration with World

```typescript
const world = createWorld({
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
  }
});

// Subscribe to loading progress
world.onProgress((progress) => {
  console.log(`Loading: ${progress.percentage}%`);
  console.log(`${progress.loaded} / ${progress.total} assets`);
});

// Subscribe to completion
world.onReady((assets) => {
  console.log('Assets loaded!');

  // Access loaded assets
  const grassTexture = assets.textures['grass'];
  const playerModel = assets.models['player'];

  // Or through world
  const loadedAssets = world.getLoadedAssets();
});
```

## LoadedAssets Type

```typescript
type LoadedAssets = {
  textures: Record<string, THREE.Texture>;
  models: Record<string, THREE.Group>;
  audio: Record<string, AudioBuffer>;
};
```

## Progress Tracking

```typescript
type ProgressCallback = (progress: {
  percentage: number;
  loaded: number;
  total: number;
  currentAsset?: string;
}) => void;

type ReadyCallback = (assets: LoadedAssets) => void;
```

## Example: Loading Screen

```typescript
const loadingElement = document.getElementById('loading');
const progressBar = document.getElementById('progress-bar');

world.onProgress((progress) => {
  progressBar.style.width = `${progress.percentage}%`;
  loadingElement.textContent = `Loading: ${progress.currentAsset || ''}`;
});

world.onReady(() => {
  loadingElement.style.display = 'none';
  // Start game
  world.start();
});
```

## See Also

- [World Module](world.md) - Integration point
- [Units Module](units.md) - Uses model assets
