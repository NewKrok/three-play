# Day/Night Module

Day/night cycle system with dynamic lighting and fog.

## Location

- Implementation: [src/core/day-night/day-night-manager.ts](../../src/core/day-night/day-night-manager.ts)
- Types: [src/types/day-night.ts](../../src/types/day-night.ts)
- Export: [src/core/day-night/index.ts](../../src/core/day-night/index.ts)

## Overview

Manages day/night cycle with:
- Dynamic sun position
- Ambient and directional light adjustment
- Fog color transitions
- Time progression

## Key Methods

### `setTimeOfDay(time: number): void`

Set time of day (0-24 hours).

**Example:**
```typescript
const dayNightManager = world.getDayNightManager();
if (dayNightManager) {
  // Set to noon
  dayNightManager.setTimeOfDay(12.0);

  // Set to midnight
  dayNightManager.setTimeOfDay(0.0);

  // Set to sunset
  dayNightManager.setTimeOfDay(18.0);
}
```

### `update(deltaTime: number): void`

Update cycle (called automatically by world).

## Configuration

```typescript
type DayNightConfig = {
  enabled: boolean;
  initialTime?: number;       // Start time (0-24)
  cycleDuration?: number;     // Full cycle duration in seconds
  ambientLightIntensity?: {
    day: number;
    night: number;
  };
  directionalLightIntensity?: {
    day: number;
    night: number;
  };
  fogColor?: {
    day: THREE.Color;
    night: THREE.Color;
  };
};
```

## Integration

```typescript
const world = createWorld({
  world: { size: { x: 100, y: 100 } },
  dayNight: {
    enabled: true,
    initialTime: 6.0,     // Start at dawn
    cycleDuration: 300,   // 5 minute day/night cycle
    ambientLightIntensity: {
      day: 0.9,
      night: 0.2
    }
  }
});

const dayNightManager = world.getDayNightManager();
```

## See Also

- [World Module](world.md) - Integration point
- [Skybox Module](skybox.md) - Sky visuals
