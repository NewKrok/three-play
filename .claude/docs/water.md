# Water Module

Water rendering system with animated surface.

## Location

- Implementation: [src/core/water/water-utils.ts](../../src/core/water/water-utils.ts)
- Types: [src/types/water.ts](../../src/types/water.ts)
- Export: [src/core/water/index.ts](../../src/core/water/index.ts)

## Overview

Animated water plane with texture mapping and height integration.

## Key Functions

### `createWaterInstance(config, width, height, heightmapUtils?)`

Creates an animated water mesh.

**Parameters:**
- `config`: WaterConfig
- `width`, `height`: Water dimensions
- `heightmapUtils`: Optional heightmap for shore shaping

**Returns:**
- `WaterInstance` with mesh, update method, and destroy method

**Example:**
```typescript
const water = createWaterInstance(
  {
    enabled: true,
    level: 2.0,
    textureAssetId: 'waterTexture'
  },
  100,  // width
  100,  // height
  heightmapUtils
);

scene.add(water.mesh);

// In update loop
water.update(deltaTime);

// Cleanup
water.destroy();
```

## Configuration

```typescript
type WaterConfig = {
  enabled: boolean;
  level?: number;              // Water height
  textureAssetId?: string;     // Water texture
  variationTextureAssetId?: string; // Variation texture
};
```

## Integration with World

```typescript
const world = createWorld({
  world: { size: { x: 100, y: 100 } },
  water: {
    enabled: true,
    level: 2.0,
    textureAssetId: 'water'
  }
});

const water = world.getWaterInstance();
// Water updates automatically in world loop
```

## See Also

- [Heightmap Module](heightmap.md) - Height queries
- [World Module](world.md) - Integration point
