# Terrain Module

Terrain generation and rendering system.

## Location

- Implementation: [src/core/terrain/terrain-utils.ts](../../src/core/terrain/terrain-utils.ts)
- Types: [src/types/terrain.ts](../../src/types/terrain.ts)
- Export: [src/core/terrain/index.ts](../../src/core/terrain/index.ts)

## Overview

Generates terrain mesh from heightmap data with texture support.

## Key Functions

### `createTerrainInstance(config, width, height, resolution, heightmapUtils)`

Creates a terrain mesh instance.

**Parameters:**
- `config`: TerrainConfig
- `width`, `height`: Terrain dimensions
- `resolution`: Heightmap resolution
- `heightmapUtils`: Heightmap utilities

**Returns:**
- `TerrainInstance` with mesh and destroy method

**Example:**
```typescript
const terrain = createTerrainInstance(
  {
    enabled: true,
    textureAssetIds: ['grass', 'rock', 'sand']
  },
  100,  // width
  100,  // height
  256,  // resolution
  heightmapUtils
);

scene.add(terrain.mesh);

// Cleanup
terrain.destroy();
```

## Configuration

```typescript
type TerrainConfig = {
  enabled: boolean;
  textureAssetIds?: string[];  // Texture blend layers
};
```

## Integration with World

```typescript
const world = createWorld({
  world: { size: { x: 100, y: 100 } },
  terrain: {
    enabled: true,
    textureAssetIds: ['grass']
  },
  heightmap: {
    enabled: true,
    // heightmap config
  }
});

const terrain = world.getTerrainInstance();
```

## See Also

- [Heightmap Module](heightmap.md) - Provides height data
- [World Module](world.md) - Integration point
