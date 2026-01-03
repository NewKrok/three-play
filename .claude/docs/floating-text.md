# Floating Text Module

General-purpose floating text system for displaying temporary text in 3D space.

## Location

- Implementation: [src/core/ui/floating-text.ts](../../src/core/ui/floating-text.ts)
- Types: [src/types/floating-text.ts](../../src/types/floating-text.ts)
- Export: [src/core/ui/index.ts](../../src/core/ui/index.ts)

## Overview

A flexible system for displaying temporary text in 3D world space. Perfect for:
- Damage numbers (red, white)
- Healing numbers (green)
- Experience gain (+250 XP - yellow)
- Level up notifications (LEVEL UP! - gold)
- Item pickups (+10 apples - green)
- Combat feedback (MISS!, DODGE! - grey)
- Resource collection notifications
- Achievement/quest updates

Inspired by Warcraft 3's floating text system.

## Key Methods

### `createFloatingTextManager(scene: THREE.Scene): FloatingTextManager`

Creates a floating text manager.

**Parameters:**
- `scene` - Three.js scene to add floating texts to

**Returns:** FloatingTextManager instance

**Example:**
```typescript
import { createFloatingTextManager } from '@newkrok/three-play';

const floatingTextManager = createFloatingTextManager(scene);

// Show damage
floatingTextManager.show(position, {
  text: '-50',
  color: '#ff0000',
  fontSize: 48,
});

// Show healing
floatingTextManager.show(position, {
  text: '+25',
  color: '#00ff00',
  fontSize: 42,
});

// Show XP gain
floatingTextManager.show(position, {
  text: '+100 XP',
  color: '#ffff00',
  fontSize: 36,
  floatHeight: 3.0,
});

// Update in your game loop
worldInstance.onUpdate((deltaTime, elapsedTime) => {
  floatingTextManager.update(deltaTime, elapsedTime);
});
```

### Manager Methods

#### `show(position: THREE.Vector3, config: FloatingTextConfig): FloatingText`

Display floating text at a position.

**Parameters:**
- `position` - 3D world position
- `config` - Text configuration

**Returns:** FloatingText instance

**Example:**
```typescript
const text = floatingTextManager.show(
  new THREE.Vector3(10, 2, 5),
  {
    text: 'Critical Hit!',
    color: '#ff0000',
    fontSize: 56,
    scale: 1.5,
    floatHeight: 3.0,
    duration: 2.0,
  }
);
```

#### `update(deltaTime: number, currentTime: number): void`

Update all active floating texts (call every frame).

**Parameters:**
- `deltaTime` - Time since last frame in seconds
- `currentTime` - Current time in seconds

#### `clear(): void`

Remove all active floating texts immediately.

#### `getActiveTexts(): FloatingText[]`

Get array of all currently active floating texts.

## Configuration

### FloatingTextConfig

```typescript
type FloatingTextConfig = {
  text: string;              // Text to display
  color?: string;            // Text color (default: '#ffffff')
  fontSize?: number;         // Font size in pixels (default: 48)
  fontFamily?: string;       // Font family (default: 'Arial, sans-serif')
  fontWeight?: string;       // Font weight (default: 'bold')
  duration?: number;         // Animation duration in seconds (default: 1.5)
  floatHeight?: number;      // How high text floats (default: 2.0)
  fadeOut?: boolean;         // Enable fade out (default: true)
  scale?: number;            // Scale multiplier (default: 1.0)
  velocityX?: number;        // Horizontal velocity (default: 0)
  velocityY?: number;        // Custom vertical velocity (default: 0)
};
```

### Default Configuration

```typescript
{
  color: '#ffffff',
  fontSize: 48,
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'bold',
  duration: 1.5,
  floatHeight: 2.0,
  fadeOut: true,
  scale: 1.0,
  velocityX: 0,
  velocityY: 0,
}
```

## Common Patterns

### Damage Numbers

```typescript
// Normal damage
floatingTextManager.show(position, {
  text: '-42',
  color: '#ffffff',
  fontSize: 48,
  duration: 1.2,
});

// Critical hit
floatingTextManager.show(position, {
  text: '-120',
  color: '#ff0000',
  fontSize: 64,
  scale: 1.5,
  duration: 1.5,
});
```

### Healing

```typescript
floatingTextManager.show(position, {
  text: '+35',
  color: '#00ff00',
  fontSize: 42,
  floatHeight: 2.5,
});
```

### Item Pickup

```typescript
floatingTextManager.show(position, {
  text: '+10 Gold',
  color: '#ffd700',
  fontSize: 36,
  floatHeight: 1.5,
  duration: 1.8,
});
```

### Experience Gain

```typescript
floatingTextManager.show(position, {
  text: '+250 XP',
  color: '#ffff00',
  fontSize: 40,
  floatHeight: 3.0,
  duration: 2.0,
});
```

### Level Up

```typescript
floatingTextManager.show(position, {
  text: 'LEVEL UP!',
  color: '#ffd700',
  fontSize: 72,
  scale: 1.8,
  floatHeight: 4.0,
  duration: 3.0,
});
```

### Miss/Dodge

```typescript
floatingTextManager.show(position, {
  text: 'MISS',
  color: '#888888',
  fontSize: 48,
  floatHeight: 1.5,
});
```

### Custom Movement

```typescript
// Move sideways while floating
floatingTextManager.show(position, {
  text: '+5 Speed',
  color: '#00ffff',
  velocityX: 2.0,  // Move 2 units per second to the right
  velocityY: 1.5,  // Custom upward speed
  duration: 2.0,
});
```

## Integration with Existing Systems

### With Damage Numbers Manager

The damage numbers manager can coexist with floating text manager:

```typescript
// Damage numbers for combat
damageNumbersManager.showDamage(position, damageResult);

// Floating text for other feedback
floatingTextManager.show(position, {
  text: '+10 apples',
  color: '#22c55e',
});
```

### With UI Manager

Combine with UI updates for complete feedback:

```typescript
// Visual feedback in 3D
floatingTextManager.show(position, {
  text: '+100 Gold',
  color: '#ffd700',
});

// Update UI
uiManager.updateGold(newGoldAmount);
```

## Tips

1. **Color Coding:** Use consistent colors for different types of feedback
   - Red: Damage, danger
   - Green: Healing, success, pickups
   - Yellow/Gold: XP, level up, rewards
   - White: Neutral information
   - Grey: Miss, dodge, blocked

2. **Font Sizes:** Vary size based on importance
   - 36-42px: Minor events (small pickups)
   - 48-56px: Normal events (damage, healing)
   - 64-72px: Major events (critical hit, level up)

3. **Duration:** Match duration to importance
   - 1.0-1.5s: Quick feedback (damage, pickups)
   - 1.5-2.5s: Normal events
   - 2.5-3.5s: Important events (level up)

4. **Float Height:** Higher for more important messages
   - 1.5-2.0: Normal
   - 2.5-3.5: Important
   - 4.0+: Critical/major events

5. **Performance:** System automatically cleans up finished texts
   - Sprites are properly disposed
   - No memory leaks
   - Safe to spawn hundreds of texts

6. **Positioning:** Add Y-offset to avoid overlapping with units
   ```typescript
   const pos = unit.model.position.clone();
   pos.y += 2.0; // Above unit's head
   floatingTextManager.show(pos, config);
   ```

## Use Cases

- **Combat Feedback:** Damage, healing, critical hits, misses
- **Resource Collection:** Gold, wood, food, XP
- **Item Pickups:** Weapons, potions, quest items
- **Level System:** Level ups, skill unlocks
- **Quest System:** Quest complete, objectives
- **Achievement System:** Achievement unlocked notifications
- **Building System:** Construction complete, upgrade done
- **Economy:** Trade completed, auction sold
- **Social:** Party joined, friend request

## Performance

- Lightweight canvas-based text rendering
- Automatic cleanup of finished texts
- GPU-friendly sprite system
- No DOM manipulation
- Scales well to 100+ simultaneous texts

## See Also

- [Damage Numbers](../src/core/ui/damage-numbers.ts) - Combat-specific damage display
- [Health Bars](../src/core/ui/health-bar.ts) - Unit health display
- [UI Manager](../../examples/basic-top-down/src/ui/ui-manager.ts) - Example UI system
