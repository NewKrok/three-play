# Heightmap Module

Height query system for terrain and water integration.

## Location

- Implementation: [src/core/heightmap/heightmap-utils.ts](../../src/core/heightmap/heightmap-utils.ts)
- Types: [src/types/heightmap.ts](../../src/types/heightmap.ts)
- Export: [src/core/heightmap/index.ts](../../src/core/heightmap/index.ts)

## Overview

Provides height queries for positioning objects on terrain.

## Key Function

### `getHeightFromPosition(position: THREE.Vector3): number`

Query terrain height at a world position.

**Example:**
```typescript
const heightmapUtils = world.getHeightmapUtils();
if (heightmapUtils) {
  const position = new THREE.Vector3(10, 0, 5);
  const height = heightmapUtils.getHeightFromPosition(position);

  // Place object on terrain
  object.position.y = height;
}
```

## Configuration

```typescript
type WorldHeightmapConfig = {
  enabled: boolean;
  resolution?: number;        // Heightmap resolution (default: 256)
  imageUrl?: string;          // Heightmap image URL
  assetId?: string;           // Heightmap asset ID
  scale?: number;             // Height scale
};
```

## Integration

```typescript
const world = createWorld({
  world: { size: { x: 100, y: 100 } },
  heightmap: {
    enabled: true,
    resolution: 256,
    assetId: 'heightmapTexture',
    scale: 10
  }
});

const heightmapUtils = world.getHeightmapUtils();
```

## See Also

- [Terrain Module](terrain.md) - Uses heightmap data
- [Water Module](water.md) - Shore shaping
