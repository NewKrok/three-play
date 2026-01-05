# Minimap Module

A 2D canvas-based minimap system for displaying game world overview with units, terrain, and camera FOV.

## Overview

The minimap module provides a lightweight, configurable 2D minimap that displays:
- Terrain heightmap visualization
- Player, enemy, and NPC units
- Camera field of view indicator
- Interactable objects (when interaction system is integrated)

## Features

- **2D Canvas Rendering**: Fast, performant rendering using HTML5 Canvas
- **Configurable Position**: Place in any corner of the screen
- **Customizable Colors**: All visual elements have configurable colors
- **Automatic Updates**: Updates with configurable frequency
- **Show/Hide Support**: Toggle visibility at runtime
- **Memory Efficient**: Cached terrain rendering, throttled updates

## Basic Usage

### Enable in World Configuration

```typescript
import { createWorld } from 'three-play';

const world = createWorld({
  world: {
    size: { x: 100, y: 100 }
  },
  minimap: {
    enabled: true,
    position: 'top-right',
    size: 200,
    zoom: 0.1,
  },
  // ... other config
});
```

### Access Minimap Manager

```typescript
const minimapManager = world.getMinimapManager();

if (minimapManager) {
  // Toggle visibility
  minimapManager.toggle();

  // Update colors
  minimapManager.updateConfig({
    playerColor: '#00ff00',
    enemyColor: '#ff0000',
  });
}
```

## Configuration

### MinimapConfig Type

```typescript
type MinimapConfig = {
  enabled?: boolean;              // Default: true
  size?: number;                  // Canvas size in pixels. Default: 200
  position?: MinimapPosition;     // Default: 'top-right'
  zoom?: number;                  // World units per pixel. Default: 0.1
  borderWidth?: number;           // Default: 2
  borderColor?: string;           // Default: '#ffffff'
  backgroundColor?: string;       // Default: 'rgba(0, 0, 0, 0.7)'
  terrainColor?: string;          // Default: '#4a4a4a'
  waterColor?: string;            // Default: '#2563eb'
  playerColor?: string;           // Default: '#22c55e'
  enemyColor?: string;            // Default: '#ef4444'
  npcColor?: string;              // Default: '#fbbf24'
  cameraFovColor?: string;        // Default: 'rgba(255, 255, 255, 0.2)'
  interactableColor?: string;     // Default: '#a855f7'
  opacity?: number;               // 0-1. Default: 0.9
  borderRadius?: number;          // Pixels. Default: 8
  unitDotSize?: number;           // Default: 4
  interactableDotSize?: number;   // Default: 3
  updateFrequency?: number;       // Milliseconds. Default: 100
  showCameraFov?: boolean;        // Default: true
  showTerrain?: boolean;          // Default: true
  showUnits?: boolean;            // Default: true
  showInteractables?: boolean;    // Default: true
  customStyles?: Partial<CSSStyleDeclaration>; // Custom CSS
};
```

### Position Options

```typescript
type MinimapPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
```

## World Integration

The minimap is automatically integrated into the world module:

1. **Initialization**: Created after assets load (in `notifyReady`)
2. **Terrain Data**: Automatically set from heightmap if available
3. **Update Loop**: Updates in world's main update loop
4. **Cleanup**: Disposed in world's destroy method

## API Reference

### MinimapManager

#### Methods

##### `update(camera, units, interactables, currentTime)`
Updates the minimap display.

```typescript
minimapManager.update(
  world.getCamera(),
  world.getUnitManager()?.getAllUnits() || [],
  [], // interactables array
  performance.now()
);
```

##### `show()` / `hide()` / `toggle()`
Control minimap visibility.

```typescript
minimapManager.show();
minimapManager.hide();
minimapManager.toggle();
```

##### `isVisible(): boolean`
Check if minimap is currently visible.

```typescript
if (minimapManager.isVisible()) {
  console.log('Minimap is visible');
}
```

##### `updateConfig(config)`
Update minimap configuration at runtime.

```typescript
minimapManager.updateConfig({
  size: 250,
  zoom: 0.15,
  playerColor: '#00ffff',
});
```

##### `getConfig(): Readonly<MinimapConfig>`
Get current configuration.

```typescript
const config = minimapManager.getConfig();
console.log('Current zoom:', config.zoom);
```

##### `setTerrainData(heightData, worldSize)`
Set terrain heightmap for rendering.

```typescript
const heightmapUtils = world.getHeightmapUtils();
if (heightmapUtils?.data) {
  minimapManager.setTerrainData(
    heightmapUtils.data,
    { x: 100, y: 100 }
  );
}
```

##### `dispose()`
Clean up resources and remove from DOM.

```typescript
minimapManager.dispose();
```

## Example Configurations

### Minimal Setup

```typescript
const world = createWorld({
  world: { size: { x: 100, y: 100 } },
  minimap: { enabled: true },
});
```

### Custom Position and Size

```typescript
const world = createWorld({
  world: { size: { x: 100, y: 100 } },
  minimap: {
    enabled: true,
    position: 'bottom-right',
    size: 250,
    borderRadius: 12,
  },
});
```

### Custom Colors

```typescript
const world = createWorld({
  world: { size: { x: 100, y: 100 } },
  minimap: {
    enabled: true,
    playerColor: '#00ff00',
    enemyColor: '#ff0000',
    npcColor: '#ffff00',
    terrainColor: '#2a2a2a',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
});
```

### Performance Optimized

```typescript
const world = createWorld({
  world: { size: { x: 100, y: 100 } },
  minimap: {
    enabled: true,
    size: 150,                // Smaller size
    updateFrequency: 200,     // Update less frequently
    showTerrain: false,       // Skip terrain rendering
  },
});
```

### High Detail

```typescript
const world = createWorld({
  world: { size: { x: 100, y: 100 } },
  minimap: {
    enabled: true,
    size: 300,                // Larger size
    zoom: 0.05,              // More zoomed in
    updateFrequency: 50,     // Update more frequently
    unitDotSize: 6,          // Larger unit dots
  },
});
```

## Rendering Details

### Coordinate System

The minimap uses a top-down view:
- World center (0, 0) maps to minimap center
- X-axis: left to right
- Z-axis: top to bottom

### Draw Order

1. Terrain (cached ImageData if available)
2. Camera FOV indicator
3. Units (with direction indicators)
4. Interactables

### Unit Direction Indicator

Each unit dot has a small line showing its facing direction:
- Line extends from unit position
- Color matches unit color
- Length proportional to unit dot size

### Camera FOV Visualization

Displays a semi-transparent triangle showing:
- Camera position at apex
- Field of view angle
- View direction

## Performance Considerations

### Optimization Tips

1. **Update Frequency**: Increase `updateFrequency` for better performance
2. **Canvas Size**: Smaller `size` values render faster
3. **Disable Features**: Turn off terrain/units/FOV if not needed
4. **Terrain Caching**: Terrain is cached as ImageData for fast rendering

### Typical Performance

- 200x200 canvas: ~0.5ms per update
- 300x300 canvas: ~1.5ms per update
- Terrain cache creation: ~5-10ms (one-time)

## Integration with Other Systems

### Units

Units are automatically displayed from the unit manager:
```typescript
const unitManager = world.getUnitManager();
const units = unitManager?.getAllUnits() || [];
```

### Heightmap/Terrain

Terrain data is automatically set when available:
```typescript
if (heightmapManager?.utils?.data) {
  minimapManager.setTerrainData(
    heightmapManager.utils.data,
    worldSize
  );
}
```

### Interactions

Integration with interaction manager is planned:
```typescript
// Future: Automatic interactable display
const interactionManager = world.getInteractionManager();
const interactables = interactionManager?.getActiveInteractables() || [];
```

## Troubleshooting

### Minimap not showing

1. Check `enabled: true` in config
2. Verify world initialization completed
3. Check browser console for errors

### Terrain not rendering

1. Ensure heightmap is configured in world
2. Verify `showTerrain: true`
3. Check that assets loaded before minimap init

### Units not displaying

1. Confirm unit manager is enabled
2. Verify units are created
3. Check `showUnits: true`

### Performance issues

1. Increase `updateFrequency`
2. Reduce canvas `size`
3. Disable terrain/FOV rendering
4. Check browser's rendering performance

## Type Definitions

Located in [src/types/minimap.ts](../../src/types/minimap.ts):
- `MinimapConfig`
- `MinimapManager`
- `MinimapState`
- `MinimapPosition`

## Implementation

Core implementation in [src/core/minimap/minimap.ts](../../src/core/minimap/minimap.ts).

## See Also

- [World Module](world.md) - Main orchestrator
- [Units Module](units.md) - Unit management
- [Heightmap Module](heightmap.md) - Terrain height data
- [Interactions Module](interactions.md) - World object interactions
