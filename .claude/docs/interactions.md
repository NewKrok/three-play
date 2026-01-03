# Interactions Module

Collision and interaction system for world objects.

## Location

- Implementation: [src/core/interactions/interaction-manager.ts](../../src/core/interactions/interaction-manager.ts)
- Types: [src/types/interactions.ts](../../src/types/interactions.ts)
- Export: [src/core/interactions/index.ts](../../src/core/interactions/index.ts)

## Overview

A flexible system for managing world object collisions and interactions. Perfect for:
- Environmental obstacles (trees, rocks, walls)
- Collectible items (coins, powerups, resources)
- Interactive objects (doors, chests, levers, NPCs)
- Trigger zones (quest areas, checkpoints)
- Physics boundaries (barriers, invisible walls)

## Key Methods

### `createInteractionManager(config?: InteractionManagerConfig): InteractionManager`

Creates an interaction manager.

**Parameters:**
- `config` - Optional configuration

**Returns:** InteractionManager instance

**Example:**
```typescript
import { createInteractionManager } from '@newkrok/three-play';
import * as THREE from 'three';

const interactionManager = createInteractionManager({
  enableCollision: true,
  enableInteraction: true,
  defaultCollisionRadius: 1.0,
  defaultInteractionRadius: 2.0,
});

// Add a tree with collision
interactionManager.addInteractable({
  id: 'tree-1',
  position: new THREE.Vector3(10, 0, 5),
  collisionRadius: 1.5,
  blocksMovement: true,
});

// Add a chest with interaction
interactionManager.addInteractable({
  id: 'chest-1',
  position: new THREE.Vector3(15, 0, 10),
  collisionRadius: 0.5,
  interactionRadius: 2.0,
  canInteract: true,
  onInteract: (unit, interactable) => {
    console.log('Chest opened!');
    interactable.isActive = false;
  },
});

// In your update loop
const allUnits = unitManager.getAllUnits();
interactionManager.checkCollisions(allUnits);

// When player presses interact key
interactionManager.triggerInteraction(playerUnit);
```

## Manager Methods

### `addInteractable(config: InteractableConfig): Interactable`

Add an interactable object to the world.

**Parameters:**
- `config.id` - Unique identifier
- `config.position` - 3D position in world space
- `config.collisionRadius` - Collision radius (optional, default: 1.0)
- `config.interactionRadius` - Interaction radius (optional, default: 2.0)
- `config.blocksMovement` - Whether blocks movement (optional, default: true)
- `config.canInteract` - Whether can be interacted with (optional, default: false)
- `config.isActive` - Whether currently active (optional, default: true)
- `config.object3D` - Optional Three.js object reference
- `config.userData` - Custom user data
- `config.onCollision` - Collision callback
- `config.onInteract` - Interaction callback

**Returns:** Created interactable

### `removeInteractable(id: string): boolean`

Remove an interactable by ID.

**Returns:** True if removed, false if not found

### `getInteractable(id: string): Interactable | undefined`

Get an interactable by ID.

### `getActiveInteractables(): Interactable[]`

Get all active interactables.

### `getAllInteractables(): Interactable[]`

Get all interactables (active and inactive).

### `checkCollisions(units: Unit[]): void`

Check collisions for all units against active interactables.
Automatically pushes units away from blocking objects.

**Parameters:**
- `units` - Array of units to check

### `checkInteractions(unit: Unit): Interactable[]`

Check what interactables are within interaction range of a unit.

**Parameters:**
- `unit` - Unit to check

**Returns:** Array of nearby interactables

### `triggerInteraction(unit: Unit): number`

Trigger interactions for all nearby interactables.

**Parameters:**
- `unit` - Unit performing the interaction

**Returns:** Number of interactions triggered

### `clear(): void`

Remove all interactables.

### `setCollisionEnabled(enabled: boolean): void`

Enable or disable collision detection globally.

### `setInteractionEnabled(enabled: boolean): void`

Enable or disable interaction system globally.

## Configuration

### InteractionManagerConfig

```typescript
type InteractionManagerConfig = {
  enableCollision?: boolean;      // Enable collision (default: true)
  enableInteraction?: boolean;    // Enable interaction (default: true)
  defaultCollisionRadius?: number; // Default collision radius (default: 1.0)
  defaultInteractionRadius?: number; // Default interaction radius (default: 2.0)
};
```

### InteractableConfig

```typescript
type InteractableConfig = {
  id: string;                           // Unique identifier
  position: THREE.Vector3;              // 3D position
  collisionRadius?: number;             // Collision radius
  interactionRadius?: number;           // Interaction radius
  blocksMovement?: boolean;             // Blocks movement
  canInteract?: boolean;                // Can be interacted with
  isActive?: boolean;                   // Currently active
  object3D?: THREE.Object3D;            // Optional 3D object
  userData?: Record<string, any>;       // Custom data
  onCollision?: CollisionCallback;      // Collision callback
  onInteract?: InteractionCallback;     // Interaction callback
};
```

## Common Patterns

### Trees and Obstacles

```typescript
// Add a tree
interactionManager.addInteractable({
  id: 'tree-1',
  position: treePosition,
  collisionRadius: 1.5,
  blocksMovement: true,
  userData: { type: 'tree' },
});

// Add a rock
interactionManager.addInteractable({
  id: 'rock-1',
  position: rockPosition,
  collisionRadius: 2.0,
  blocksMovement: true,
  userData: { type: 'rock' },
});
```

### Collectible Items

```typescript
interactionManager.addInteractable({
  id: 'apple-1',
  position: applePosition,
  collisionRadius: 0.5,
  interactionRadius: 1.5,
  canInteract: true,
  blocksMovement: false,
  onInteract: (unit, interactable) => {
    // Add apple to inventory
    uiManager.addItem('apple', 1);

    // Show feedback
    floatingTextManager.show(interactable.position, {
      text: '+1 Apple',
      color: '#22c55e',
    });

    // Deactivate
    interactable.isActive = false;
  },
});
```

### Chests and Containers

```typescript
interactionManager.addInteractable({
  id: 'chest-1',
  position: chestPosition,
  collisionRadius: 0.5,
  interactionRadius: 2.0,
  canInteract: true,
  blocksMovement: true,
  userData: {
    isOpen: false,
    contents: ['sword', 'potion', 'gold'],
  },
  onInteract: (unit, interactable) => {
    if (interactable.userData.isOpen) return;

    // Open chest
    interactable.userData.isOpen = true;

    // Give items
    for (const item of interactable.userData.contents) {
      uiManager.addItem(item, 1);
    }

    // Can only open once
    interactable.canInteract = false;
  },
});
```

### Doors

```typescript
interactionManager.addInteractable({
  id: 'door-1',
  position: doorPosition,
  collisionRadius: 1.0,
  interactionRadius: 2.0,
  canInteract: true,
  blocksMovement: true,
  userData: { isOpen: false },
  onInteract: (unit, interactable) => {
    interactable.userData.isOpen = !interactable.userData.isOpen;
    interactable.blocksMovement = !interactable.userData.isOpen;

    console.log(interactable.userData.isOpen ? 'Door opened' : 'Door closed');
  },
});
```

### Trigger Zones

```typescript
interactionManager.addInteractable({
  id: 'checkpoint-1',
  position: checkpointPosition,
  collisionRadius: 3.0,
  blocksMovement: false,
  userData: { triggered: false },
  onCollision: (unit, interactable) => {
    if (interactable.userData.triggered) return;
    if (unit !== playerUnit) return;

    interactable.userData.triggered = true;
    console.log('Checkpoint reached!');
    saveGame();
  },
});
```

### NPCs

```typescript
interactionManager.addInteractable({
  id: 'npc-merchant',
  position: npcPosition,
  collisionRadius: 0.8,
  interactionRadius: 3.0,
  canInteract: true,
  blocksMovement: true,
  userData: { name: 'Merchant Bob' },
  onInteract: (unit, interactable) => {
    openShopUI(interactable.userData.name);
  },
});
```

### Dynamic Objects

```typescript
// Add interactable
const boulder = interactionManager.addInteractable({
  id: 'boulder-1',
  position: new THREE.Vector3(10, 0, 5),
  collisionRadius: 2.0,
  blocksMovement: true,
});

// Update position over time
worldInstance.onUpdate(() => {
  boulder.position.x += 0.1;
});

// Remove when off screen
if (boulder.position.x > 100) {
  interactionManager.removeInteractable('boulder-1');
}
```

## Integration Examples

### With Unit Manager

```typescript
// In your update loop
worldInstance.onUpdate(() => {
  const allUnits = unitManager.getAllUnits();
  interactionManager.checkCollisions(allUnits);
});
```

### With Input System

```typescript
const inputManager = worldInstance.getInputManager();

worldInstance.onUpdate(() => {
  if (inputManager.isActionActive('interact')) {
    const count = interactionManager.triggerInteraction(playerUnit);
    if (count > 0) {
      console.log(`Interacted with ${count} objects`);
    }
  }
});
```

### With Outline System

```typescript
// Highlight nearby interactables
worldInstance.onUpdate(() => {
  const nearby = interactionManager.checkInteractions(playerUnit);

  // Clear old outlines
  previousOutlines.forEach(id => worldInstance.removeOutline(id));

  // Add new outlines
  nearby.forEach(interactable => {
    if (interactable.object3D) {
      const id = worldInstance.addOutline(interactable.object3D, {
        color: '#ffffff',
        strength: 0.8,
      });
      currentOutlines.push(id);
    }
  });
});
```

## Performance Tips

1. **Spatial Optimization:** For >100 interactables, consider spatial partitioning
2. **Active/Inactive:** Deactivate far-away interactables to reduce checks
3. **Collision Batching:** Call `checkCollisions` once per frame with all units
4. **Radius Tuning:** Keep collision radii as small as possible
5. **Callback Efficiency:** Keep onCollision callbacks lightweight (called every frame during collision)

## Use Cases

- **RPG:** Treasure chests, NPCs, quest items, doors
- **Action:** Destructible objects, pickups, switches
- **Platformer:** Moving platforms, hazards, collectibles
- **Strategy:** Buildings, resources, unit interactions
- **Adventure:** Clues, puzzles, interactive environment
- **Survival:** Harvestable resources, crafting stations
- **Stealth:** Cover objects, hiding spots, alarm triggers

## See Also

- [Units Module](units.md) - Character management
- [World Module](world.md) - Core orchestrator
- [Floating Text](floating-text.md) - Visual feedback for interactions
