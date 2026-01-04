# UI Module

Visual feedback components for units and combat.

## Location

- Implementation: [src/core/ui/](../../src/core/ui/)
- Export: [src/core/ui/index.ts](../../src/core/ui/index.ts)

## Overview

The UI module provides visual feedback components:
- **Health Bars** - Unit health display with billboard rendering
- **Damage Numbers** - Animated damage text with critical hit support
- **Floating Text** - General-purpose 3D text messages

---

## Health Bar System

Dynamic health bars that follow units and display their current health.

### Location
- [src/core/ui/health-bar.ts](../../src/core/ui/health-bar.ts)

### `createHealthBarManager(scene: THREE.Scene): HealthBarManager`

Create a health bar manager.

**Parameters:**
- `scene`: THREE.Scene - Scene to add health bars to

**Returns:**
- `HealthBarManager` instance

**Example:**
```typescript
import { createHealthBarManager } from '@three-play/core/ui';

const healthBarManager = createHealthBarManager(scene);
```

### HealthBarManager Interface

```typescript
type HealthBarManager = {
  createHealthBar(unit: Unit, config?: HealthBarConfig): HealthBar;
  removeHealthBar(healthBar: HealthBar): void;
  updateHealthBars(camera: THREE.Camera): void;
  getHealthBar(unit: Unit): HealthBar | null;
  removeAllHealthBars(): void;
};
```

### `createHealthBar(unit: Unit, config?: HealthBarConfig): HealthBar`

Create a health bar for a unit.

**Parameters:**
- `unit`: Unit - Unit to attach health bar to
- `config`: HealthBarConfig (optional) - Configuration options

```typescript
type HealthBarConfig = {
  width?: number;                           // Width (default: 1.0)
  height?: number;                          // Height (default: 0.1)
  yOffset?: number;                         // Offset above unit (default: 2.0)
  backgroundColor?: THREE.ColorRepresentation;  // Background (default: 0x333333)
  healthColor?: THREE.ColorRepresentation;      // Full health (default: 0x00ff00)
  lowHealthColor?: THREE.ColorRepresentation;   // Low health (default: 0xff0000)
  borderColor?: THREE.ColorRepresentation;      // Border (default: 0x000000)
  borderWidth?: number;                         // Border width (default: 0.02)
  alwaysShow?: boolean;                         // Always visible (default: false)
};
```

**Returns:**
- `HealthBar` instance

**Example:**
```typescript
const healthBar = healthBarManager.createHealthBar(unit, {
  width: 1.5,
  height: 0.15,
  yOffset: 2.5,
  healthColor: 0x00ff00,
  lowHealthColor: 0xff0000,
  alwaysShow: false
});
```

### `updateHealthBars(camera: THREE.Camera): void`

Update all health bars. Call this in your update loop.

**Parameters:**
- `camera`: THREE.Camera - Camera for billboard effect

**Example:**
```typescript
world.onUpdate((deltaTime) => {
  healthBarManager.updateHealthBars(camera);
});
```

### Health Bar Behavior

**Automatic Features:**
- **Billboard Effect** - Always faces camera
- **Color Interpolation** - Smooth color transition from green to red
- **Auto Hide/Show** - Hidden at full health (unless `alwaysShow: true`)
- **Low Health Indicator** - Red color below 30% health

**Color System:**
- 100%-30%: Interpolates from `healthColor` to `lowHealthColor`
- < 30%: Solid `lowHealthColor`

### Complete Example

```typescript
import { createHealthBarManager } from '@three-play/core/ui';
import { createUnitManager } from '@three-play/core/units';

const healthBarManager = createHealthBarManager(scene);

// Create health bars for all units
const units = unitManager.getAllUnits();
units.forEach(unit => {
  healthBarManager.createHealthBar(unit, {
    width: 1.2,
    height: 0.12,
    yOffset: 2.0,
    alwaysShow: false
  });
});

// Update in game loop
world.onUpdate((deltaTime) => {
  // Health bars automatically update position and color
  healthBarManager.updateHealthBars(camera);
});

// Remove health bar when unit dies
unitManager.onUnitDeath((unit) => {
  const healthBar = healthBarManager.getHealthBar(unit);
  if (healthBar) {
    healthBarManager.removeHealthBar(healthBar);
  }
});

// Cleanup
healthBarManager.removeAllHealthBars();
```

---

## Damage Numbers System

Animated damage text that floats upward with critical hit effects.

### Location
- [src/core/ui/damage-numbers.ts](../../src/core/ui/damage-numbers.ts)

### `createDamageNumbersManager(scene: THREE.Scene): DamageNumbersManager`

Create a damage numbers manager.

**Parameters:**
- `scene`: THREE.Scene - Scene to add damage numbers to

**Returns:**
- `DamageNumbersManager` instance

**Example:**
```typescript
import { createDamageNumbersManager } from '@three-play/core/ui';

const damageNumbers = createDamageNumbersManager(scene);
```

### DamageNumbersManager Interface

```typescript
type DamageNumbersManager = {
  showDamage(
    position: THREE.Vector3,
    damageResult: DamageResult,
    config?: DamageNumberConfig
  ): DamageNumber;
  update(deltaTime: number, currentTime: number): void;
  clear(): void;
};
```

### `showDamage(position: Vector3, damageResult: DamageResult, config?): DamageNumber`

Show a damage number at a position.

**Parameters:**
- `position`: THREE.Vector3 - World position to show damage
- `damageResult`: DamageResult - Damage calculation result
- `config`: DamageNumberConfig (optional) - Configuration options

```typescript
type DamageNumberConfig = {
  fontSize?: number;              // Font size (default: 48)
  fontFamily?: string;            // Font family (default: 'Arial, sans-serif')
  normalColor?: string;           // Normal damage color (default: '#ffffff')
  criticalColor?: string;         // Critical hit color (default: '#ff0000')
  duration?: number;              // Animation duration (default: 1.5s)
  floatHeight?: number;           // How high it floats (default: 2.0)
  fadeOut?: boolean;              // Enable fade out (default: true)
  criticalScale?: number;         // Scale multiplier for crits (default: 1.5)
};
```

**Returns:**
- `DamageNumber` instance

**Example:**
```typescript
import { calculateDamage } from '@three-play/core/utils';

const damageResult = calculateDamage(attacker, target);
damageNumbers.showDamage(
  target.model.position,
  damageResult,
  {
    fontSize: 52,
    normalColor: '#ffffff',
    criticalColor: '#ff0000',
    duration: 1.5,
    floatHeight: 2.5
  }
);
```

### `update(deltaTime: number, currentTime: number): void`

Update all active damage numbers. Call this in your update loop.

**Parameters:**
- `deltaTime`: number - Time elapsed since last frame (seconds)
- `currentTime`: number - Current elapsed time (seconds)

**Example:**
```typescript
world.onUpdate((deltaTime, elapsedTime) => {
  damageNumbers.update(deltaTime, elapsedTime);
});
```

### Damage Number Animations

**Automatic Animations:**
- **Float Up** - Rises vertically over duration
- **Horizontal Drift** - Slight sine wave movement
- **Fade Out** - Fades after 50% of duration
- **Critical Pulse** - Scale animation for critical hits (first 20%)

**Critical Hit Features:**
- Larger text size (`criticalScale` multiplier)
- "CRITICAL!" label above damage
- Red color (configurable)
- Pulse animation

### Complete Example

```typescript
import { createDamageNumbersManager } from '@three-play/core/ui';
import { calculateDamage, applyCalculatedDamage } from '@three-play/core/utils';

const damageNumbers = createDamageNumbersManager(scene);

// Combat system
function performAttack(attacker: Unit, target: Unit) {
  // Calculate damage
  const damageResult = calculateDamage(attacker, target, {
    enableCriticals: true,
    enableArmor: true,
    enableTypeEffectiveness: true
  });

  // Apply damage
  applyCalculatedDamage(target, damageResult);

  // Show damage number
  damageNumbers.showDamage(
    target.model.position,
    damageResult,
    {
      fontSize: 48,
      normalColor: '#ffffff',
      criticalColor: '#ff0000',
      duration: 1.5
    }
  );

  // Play sound for critical hits
  if (damageResult.wasCritical) {
    playCriticalHitSound();
  }
}

// Update loop
world.onUpdate((deltaTime, elapsedTime) => {
  damageNumbers.update(deltaTime, elapsedTime);
});

// Cleanup
damageNumbers.clear();
```

---

## Floating Text System

General-purpose 3D text messages for notifications and feedback.

### Location
- [src/core/ui/floating-text.ts](../../src/core/ui/floating-text.ts)

### See Also
- [Floating Text Documentation](floating-text.md) - Complete floating text API reference

### Quick Example

```typescript
import { createFloatingTextManager } from '@three-play/core/ui';

const floatingText = createFloatingTextManager(scene);

floatingText.showText({
  text: 'Level Up!',
  position: unit.model.position.clone(),
  fontSize: 48,
  color: '#ffff00',
  duration: 2.0
});
```

---

## Integration Examples

### Complete Combat UI System

```typescript
import {
  createHealthBarManager,
  createDamageNumbersManager,
  createFloatingTextManager
} from '@three-play/core/ui';
import { calculateDamage, applyCalculatedDamage } from '@three-play/core/utils';

// Initialize UI managers
const healthBarManager = createHealthBarManager(scene);
const damageNumbers = createDamageNumbersManager(scene);
const floatingText = createFloatingTextManager(scene);

// Create health bars for all units
unitManager.onUnitSpawned((unit) => {
  healthBarManager.createHealthBar(unit, {
    width: 1.2,
    height: 0.12,
    yOffset: 2.0,
    alwaysShow: false
  });
});

// Combat system
function performAttack(attacker: Unit, target: Unit) {
  // Calculate and apply damage
  const damageResult = calculateDamage(attacker, target);
  const isDead = applyCalculatedDamage(target, damageResult);

  // Show damage number
  damageNumbers.showDamage(target.model.position, damageResult);

  // Show death message
  if (isDead) {
    floatingText.showText({
      text: 'Defeated!',
      position: target.model.position.clone(),
      color: '#ff0000',
      fontSize: 36,
      duration: 2.0
    });

    // Remove health bar
    const healthBar = healthBarManager.getHealthBar(target);
    if (healthBar) {
      healthBarManager.removeHealthBar(healthBar);
    }
  }
}

// Update loop
world.onUpdate((deltaTime, elapsedTime) => {
  healthBarManager.updateHealthBars(camera);
  damageNumbers.update(deltaTime, elapsedTime);
  floatingText.update(deltaTime, elapsedTime);
});

// Cleanup
healthBarManager.removeAllHealthBars();
damageNumbers.clear();
floatingText.clear();
```

### Level Up Notification

```typescript
function showLevelUp(unit: Unit, newLevel: number) {
  floatingText.showText({
    text: `Level ${newLevel}!`,
    position: unit.model.position.clone(),
    fontSize: 56,
    color: '#ffff00',
    duration: 2.5,
    floatHeight: 3.0
  });

  // Restore health
  unit.stats.health = unit.stats.maxHealth;

  // Health bar will automatically update to show full health
}
```

### Pickup Notification

```typescript
function showPickup(position: THREE.Vector3, itemName: string) {
  floatingText.showText({
    text: `+${itemName}`,
    position: position.clone(),
    fontSize: 32,
    color: '#00ff00',
    duration: 1.5,
    floatHeight: 2.0
  });
}

// Usage
showPickup(item.position, 'Health Potion');
```

### Boss Health Bar

```typescript
function createBossHealthBar(boss: Unit) {
  const bossHealthBar = healthBarManager.createHealthBar(boss, {
    width: 3.0,           // Extra wide
    height: 0.3,          // Extra tall
    yOffset: 4.0,         // High above boss
    healthColor: 0xff00ff,    // Purple for boss
    lowHealthColor: 0xff0000,
    borderWidth: 0.05,    // Thicker border
    alwaysShow: true      // Always visible
  });

  return bossHealthBar;
}
```

---

## Performance Considerations

### Health Bars
- Health bars use billboarding (always face camera)
- `depthTest: false` ensures they render on top
- Materials are cached per health bar
- Automatic cleanup when removed

### Damage Numbers
- Canvas textures created per damage number
- Automatically disposed after animation completes
- Keep `duration` reasonable (1-2 seconds)
- High damage frequency may create many sprites

### Best Practices
```typescript
// Good: Cleanup on unit death
unitManager.onUnitDeath((unit) => {
  const healthBar = healthBarManager.getHealthBar(unit);
  if (healthBar) {
    healthBarManager.removeHealthBar(healthBar);
  }
});

// Good: Clear all on scene change
function changeScene() {
  healthBarManager.removeAllHealthBars();
  damageNumbers.clear();
  floatingText.clear();
}

// Avoid: Creating too many damage numbers per frame
// Limit to important damage events or batch updates
```

---

## Common Patterns

### Conditional Health Bars

```typescript
// Only show health bars for enemies
unitManager.onUnitSpawned((unit) => {
  if (unit.definition.type === 'enemy') {
    healthBarManager.createHealthBar(unit, {
      alwaysShow: false  // Hide when full health
    });
  }
});
```

### Styled Damage Numbers

```typescript
// Different colors for different damage types
function showStyledDamage(position: THREE.Vector3, damageResult: DamageResult) {
  let color = '#ffffff';

  if (damageResult.damageType === 'magic') {
    color = '#00ffff';  // Cyan for magic
  } else if (damageResult.damageType === 'fire') {
    color = '#ff8800';  // Orange for fire
  }

  damageNumbers.showDamage(position, damageResult, {
    normalColor: color,
    criticalColor: '#ff0000'
  });
}
```

### Healing Numbers

```typescript
function showHealing(target: Unit, healAmount: number) {
  const healResult: DamageResult = {
    finalDamage: healAmount,
    wasCritical: false,
    baseDamage: healAmount,
    typeMultiplier: 1.0,
    armorReduction: 0
  };

  damageNumbers.showDamage(target.model.position, healResult, {
    normalColor: '#00ff00',  // Green for healing
    fontSize: 42,
    duration: 1.5
  });
}
```

---

## Troubleshooting

### Health Bar Not Visible
- Check `yOffset` - may be too low or too high
- Verify unit has `stats.health` and `stats.maxHealth`
- Check `alwaysShow` setting if at full health
- Ensure `updateHealthBars()` is called each frame

### Health Bar Not Following Unit
- `updateHealthBars()` must be called in update loop
- Health bar position updates every frame automatically

### Damage Numbers Not Showing
- Verify `update()` is called with correct parameters
- Check `duration` - may have expired already
- Ensure `DamageResult` has valid `finalDamage`
- Check camera position - numbers may be behind camera

### Damage Numbers Clipping
- Damage numbers use `depthTest: false`
- Set `renderOrder: 1002` for proper z-ordering
- May conflict with other UI elements using same render order

---

## See Also

- [Units Module](units.md) - Unit lifecycle and stats
- [Damage Calculator](utilities.md#damage-calculator) - Combat damage calculation
- [Floating Text](floating-text.md) - General-purpose text display
- [Combat Types](../../src/types/combat.ts) - DamageResult type
- [API Reference](api-reference.md) - Complete API index
