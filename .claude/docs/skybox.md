# Skybox Module

Skybox management system.

## Location

- Implementation: [src/core/skybox/](../../src/core/skybox/)
- Types: [src/types/skybox.ts](../../src/types/skybox.ts)
- Export: [src/core/skybox/index.ts](../../src/core/skybox/index.ts)

## Overview

Applies skybox textures to scene background.

## Configuration

```typescript
type SkyboxConfig = {
  enabled: boolean;
  textureAssetId?: string;    // Cubemap texture asset ID
};
```

## Integration

```typescript
const world = createWorld({
  world: { size: { x: 100, y: 100 } },
  assets: {
    textures: {
      'sky': '/textures/skybox.jpg'
    }
  },
  skybox: {
    enabled: true,
    textureAssetId: 'sky'
  }
});

const skyboxManager = world.getSkyboxManager();
```

## See Also

- [Day/Night Module](day-night.md) - Dynamic lighting
- [Assets Module](assets.md) - Texture loading
