# Effects Module

Post-processing and outline effects system.

## Location

- Implementation: [src/core/effects/](../../src/core/effects/)
- Types: [src/types/effects.ts](../../src/types/effects.ts)
- Export: [src/core/effects/index.ts](../../src/core/effects/index.ts)

## Overview

The Effects module provides:
- Post-processing pipeline with EffectComposer
- Outline/edge detection effects via OutlinePass
- Custom render pass support
- Outline management system

## Key Functions

### `createPostProcessingManager(config)`

Creates post-processing manager with composer and outline pass.

**Example:**
```typescript
const postProcessingManager = createPostProcessingManager({
  useComposer: true,
  customPasses: [],
  renderer,
  scene,
  camera
});

const { composer, outlinePass } = postProcessingManager;
```

### `createOutlineManager(config)`

Creates outline manager for managing object outlines.

**Example:**
```typescript
const outlineManager = createOutlineManager({
  outlinePass,
  logger
});

const outlineId = outlineManager.addOutline(mesh, {
  edgeStrength: 3.0,
  edgeGlow: 0.5,
  visibleEdgeColor: '#ff0000'
});
```

## Usage Through World

The outline system is typically accessed through the World instance:

```typescript
const outlineId = world.addOutline(object, {
  edgeStrength: 3.0,
  edgeGlow: 0.5,
  visibleEdgeColor: '#00ff00'
});

world.removeOutline(outlineId);
```

## See Also

- [World Module](world.md) - Primary access point for effects
- [API Reference](api-reference.md)
