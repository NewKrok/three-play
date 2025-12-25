# Input Module

The Input module provides a unified, action-based input system supporting keyboard, mouse, and gamepad with easing transitions.

## Location

- Implementation: [src/core/input/input-manager.ts](../../src/core/input/input-manager.ts)
- Types: [src/types/input.ts](../../src/types/input.ts)
- Export: [src/core/input/index.ts](../../src/core/input/index.ts)

## Core Concept

The Input system provides:
- **Action-based input**: Map logical actions to physical inputs
- **Multi-device support**: Keyboard, mouse, and gamepad unified
- **Easing transitions**: Smooth value transitions with easing functions
- **Hot-swapping**: Change bindings at runtime
- **Frame-based state**: Track current/previous/triggered states
- **Analog support**: Full analog stick and trigger support

## Factory Function

### `createInputManager(config?: InputManagerConfig): InputManager`

Creates an input manager instance.

**Parameters:**
- `config`: InputManagerConfig (optional) - Configuration object

**Returns:**
- `InputManager` - Input manager instance

**Example:**

```typescript
import { createInputManager } from '@three-play/core';
import type { InputManagerConfig } from '@three-play/types';

const config: InputManagerConfig = {
  enabled: true,
  gamepadDeadzone: 0.15,
  preventDefaultKeyboard: true,
  preventDefaultMouse: false,
  actions: {
    // Pre-configured actions
    move: {
      action: { type: 'continuous', valueType: 'vector2' },
      bindings: [
        { type: 'keyboard', key: 'KeyW' },  // Forward
        { type: 'keyboard', key: 'KeyS' },  // Back
        { type: 'keyboard', key: 'KeyA' },  // Left
        { type: 'keyboard', key: 'KeyD' }   // Right
      ]
    }
  }
};

const inputManager = createInputManager(config);
```

## Configuration

### InputManagerConfig Type

```typescript
type InputManagerConfig = {
  enabled?: boolean;                // Start enabled (default: true)
  gamepadDeadzone?: number;         // Global deadzone (default: 0.1)
  preventDefaultKeyboard?: boolean; // Prevent default keys (default: false)
  preventDefaultMouse?: boolean;    // Prevent context menu (default: false)
  logger?: Logger;                  // Logger instance
  actions?: Record<string, InputActionConfig>; // Pre-configured actions
};
```

## Input Bindings

### KeyboardBinding Type

```typescript
type KeyboardBinding = {
  type: 'keyboard';
  key: string;                      // KeyCode ('KeyW', 'Space', etc.)
  easing?: {
    type: EasingType;
    duration: number;               // Seconds
  };
};
```

**Example:**
```typescript
const jumpBinding: KeyboardBinding = {
  type: 'keyboard',
  key: 'Space'
};

const moveForwardBinding: KeyboardBinding = {
  type: 'keyboard',
  key: 'KeyW',
  easing: {
    type: 'easeInOutQuad',
    duration: 0.2
  }
};
```

### MouseBinding Type

```typescript
type MouseBinding = {
  type: 'mouse';
  button?: number;                  // 0=left, 1=middle, 2=right
  axis?: 'x' | 'y' | 'deltaX' | 'deltaY' | 'wheel';
  easing?: {
    type: EasingType;
    duration: number;
  };
};
```

**Example:**
```typescript
const shootBinding: MouseBinding = {
  type: 'mouse',
  button: 0  // Left click
};

const lookBinding: MouseBinding = {
  type: 'mouse',
  axis: 'deltaX'  // Mouse movement X
};

const zoomBinding: MouseBinding = {
  type: 'mouse',
  axis: 'wheel'
};
```

### GamepadBinding Type

```typescript
type GamepadBinding = {
  type: 'gamepad';
  gamepadIndex?: number;            // 0-3 (default: 0)
  button?: number;                  // Button index
  axis?:
    | 'leftStickX'
    | 'leftStickY'
    | 'rightStickX'
    | 'rightStickY'
    | 'leftTrigger'
    | 'rightTrigger';
  deadzone?: number;                // 0.0-1.0 (default: global)
  easing?: {
    type: EasingType;
    duration: number;
  };
};
```

**Example:**
```typescript
const jumpGamepadBinding: GamepadBinding = {
  type: 'gamepad',
  button: 0  // A button (Xbox)
};

const moveGamepadBinding: GamepadBinding = {
  type: 'gamepad',
  axis: 'leftStickX',
  deadzone: 0.15,
  easing: {
    type: 'easeOutQuad',
    duration: 0.1
  }
};
```

## Input Actions

### InputAction Type

```typescript
type InputAction = {
  type: 'continuous' | 'trigger';   // Behavior type
  valueType: 'boolean' | 'number' | 'vector2';
  bindings: InputBinding[];
};
```

**Action Types:**
- **continuous**: Hold for continuous effect (e.g., movement)
- **trigger**: One-time activation per press (e.g., jump, shoot)

**Value Types:**
- **boolean**: On/off state
- **number**: Scalar value (-1 to 1)
- **vector2**: 2D vector (e.g., movement direction)

## InputManager API

### Action Management

#### `registerAction(actionName: string, config: Omit<InputAction, 'bindings'>): void`

Register a new action.

**Example:**
```typescript
// Register jump action (trigger, boolean)
inputManager.registerAction('jump', {
  type: 'trigger',
  valueType: 'boolean'
});

// Register move action (continuous, vector2)
inputManager.registerAction('move', {
  type: 'continuous',
  valueType: 'vector2'
});

// Register aim action (continuous, number)
inputManager.registerAction('aim', {
  type: 'continuous',
  valueType: 'number'
});
```

#### `bindInput(actionName: string, binding: InputBinding): void`

Bind an input to an action.

**Example:**
```typescript
// Bind Space to jump
inputManager.bindInput('jump', {
  type: 'keyboard',
  key: 'Space'
});

// Bind WASD to move
inputManager.bindInput('move', {
  type: 'keyboard',
  key: 'KeyW'  // Forward
});
inputManager.bindInput('move', {
  type: 'keyboard',
  key: 'KeyS'  // Back
});
inputManager.bindInput('move', {
  type: 'keyboard',
  key: 'KeyA'  // Left
});
inputManager.bindInput('move', {
  type: 'keyboard',
  key: 'KeyD'  // Right
});

// Bind gamepad
inputManager.bindInput('jump', {
  type: 'gamepad',
  button: 0  // A button
});

inputManager.bindInput('move', {
  type: 'gamepad',
  axis: 'leftStickX'
});
inputManager.bindInput('move', {
  type: 'gamepad',
  axis: 'leftStickY'
});
```

#### `unbindInput(actionName: string, binding: InputBinding): void`

Remove a specific binding from an action.

**Example:**
```typescript
inputManager.unbindInput('jump', {
  type: 'keyboard',
  key: 'Space'
});
```

#### `clearBindings(actionName: string): void`

Remove all bindings from an action.

**Example:**
```typescript
inputManager.clearBindings('move');
```

#### `removeAction(actionName: string): void`

Remove an action completely.

**Example:**
```typescript
inputManager.removeAction('sprint');
```

### Action Queries

#### `isActionActive(actionName: string): boolean`

Check if continuous action is currently active.

**Example:**
```typescript
world.onUpdate(() => {
  if (inputManager.isActionActive('move')) {
    const moveValue = inputManager.getActionValue('move') as THREE.Vector2;
    player.position.x += moveValue.x * deltaTime * speed;
    player.position.z += moveValue.y * deltaTime * speed;
  }

  if (inputManager.isActionActive('sprint')) {
    speed = baseSpeed * 2;
  }
});
```

#### `getActionValue(actionName: string): boolean | number | THREE.Vector2`

Get the current value of an action.

**Returns:**
- `boolean` for boolean actions
- `number` for number actions (-1 to 1)
- `THREE.Vector2` for vector2 actions

**Example:**
```typescript
// Boolean action
const isJumping = inputManager.getActionValue('jump') as boolean;

// Number action (analog stick, mouse axis)
const aimValue = inputManager.getActionValue('aim') as number;

// Vector2 action (movement)
const moveDir = inputManager.getActionValue('move') as THREE.Vector2;
console.log(`Move: x=${moveDir.x}, y=${moveDir.y}`);
```

#### `wasActionTriggered(actionName: string): boolean`

Check if trigger action was activated this frame.

**Example:**
```typescript
world.onUpdate(() => {
  if (inputManager.wasActionTriggered('jump')) {
    player.jump();
  }

  if (inputManager.wasActionTriggered('shoot')) {
    player.shoot();
  }

  if (inputManager.wasActionTriggered('interact')) {
    interactWithNearestObject();
  }
});
```

#### `wasActionReleased(actionName: string): boolean`

Check if trigger action was released this frame.

**Example:**
```typescript
world.onUpdate(() => {
  if (inputManager.wasActionReleased('charge')) {
    player.releaseChargedAttack();
  }
});
```

### Lifecycle Management

#### `update(deltaTime: number): void`

Update input state (called by world automatically).

**Example:**
```typescript
world.onUpdate((deltaTime) => {
  inputManager.update(deltaTime);
});
```

#### `setEnabled(enabled: boolean): void`

Enable or disable input processing.

**Example:**
```typescript
// Disable during cutscene
inputManager.setEnabled(false);

// Re-enable after cutscene
inputManager.setEnabled(true);
```

#### `isEnabled(): boolean`

Check if input manager is enabled.

**Example:**
```typescript
if (inputManager.isEnabled()) {
  console.log('Input enabled');
}
```

#### `destroy(): void`

Clean up resources and event listeners.

**Example:**
```typescript
inputManager.destroy();
```

### Utility Methods

#### `getActionNames(): string[]`

Get all registered action names.

**Example:**
```typescript
const actions = inputManager.getActionNames();
console.log('Registered actions:', actions);
```

#### `hasAction(actionName: string): boolean`

Check if an action is registered.

**Example:**
```typescript
if (inputManager.hasAction('sprint')) {
  console.log('Sprint action exists');
}
```

## Complete Example

```typescript
import { createWorld } from '@three-play/core';
import type { InputManagerConfig } from '@three-play/types';
import * as THREE from 'three';

// Configure input manager
const world = createWorld({
  world: { size: { x: 100, y: 100 } },
  input: {
    enabled: true,
    gamepadDeadzone: 0.15,
    preventDefaultKeyboard: true,
    actions: {
      move: {
        action: { type: 'continuous', valueType: 'vector2' },
        bindings: [
          { type: 'keyboard', key: 'KeyW' },
          { type: 'keyboard', key: 'KeyS' },
          { type: 'keyboard', key: 'KeyA' },
          { type: 'keyboard', key: 'KeyD' },
          { type: 'gamepad', axis: 'leftStickX' },
          { type: 'gamepad', axis: 'leftStickY' }
        ]
      },
      jump: {
        action: { type: 'trigger', valueType: 'boolean' },
        bindings: [
          { type: 'keyboard', key: 'Space' },
          { type: 'gamepad', button: 0 }
        ]
      },
      shoot: {
        action: { type: 'trigger', valueType: 'boolean' },
        bindings: [
          { type: 'mouse', button: 0 },
          { type: 'gamepad', button: 7 }
        ]
      },
      look: {
        action: { type: 'continuous', valueType: 'vector2' },
        bindings: [
          { type: 'mouse', axis: 'deltaX' },
          { type: 'mouse', axis: 'deltaY' },
          { type: 'gamepad', axis: 'rightStickX' },
          { type: 'gamepad', axis: 'rightStickY' }
        ]
      }
    }
  }
});

const inputManager = world.getInputManager();
const camera = world.getCamera();
let player = { position: new THREE.Vector3(), velocity: new THREE.Vector3() };

// Game loop
world.onUpdate((deltaTime) => {
  const speed = 5.0;
  const lookSensitivity = 0.002;

  // Movement
  if (inputManager.isActionActive('move')) {
    const moveDir = inputManager.getActionValue('move') as THREE.Vector2;

    // Apply movement
    player.velocity.x = moveDir.x * speed;
    player.velocity.z = -moveDir.y * speed;

    player.position.addScaledVector(player.velocity, deltaTime);
  }

  // Jump
  if (inputManager.wasActionTriggered('jump')) {
    player.velocity.y = 8;
    console.log('Jump!');
  }

  // Shoot
  if (inputManager.wasActionTriggered('shoot')) {
    const direction = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(camera.quaternion);

    // Launch projectile
    world.getProjectileManager()?.launch({
      definitionId: 'bullet',
      origin: camera.position.clone(),
      direction: direction,
      strength: 50
    });
  }

  // Camera look
  if (inputManager.isActionActive('look')) {
    const lookDelta = inputManager.getActionValue('look') as THREE.Vector2;

    camera.rotation.y -= lookDelta.x * lookSensitivity;
    camera.rotation.x -= lookDelta.y * lookSensitivity;

    // Clamp vertical rotation
    camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
  }
});

world.start();
```

## Easing Integration

Smooth transitions for input values:

```typescript
inputManager.bindInput('accelerate', {
  type: 'keyboard',
  key: 'KeyW',
  easing: {
    type: 'easeInOutQuad',
    duration: 0.3  // 300ms transition
  }
});
```

**Available Easing Types:**
- `linear`
- `easeInQuad`, `easeOutQuad`, `easeInOutQuad`
- `easeInCubic`, `easeOutCubic`, `easeInOutCubic`
- `easeInQuart`, `easeOutQuart`, `easeInOutQuart`
- And more (see [Utilities Module](utilities.md#easing-utils))

**Benefits:**
- Smooth acceleration/deceleration
- Natural feel for movement
- Prevents jarring transitions
- Works with keyboard, mouse, and gamepad

## Integration with World

The input manager is automatically created and updated by the world:

```typescript
const world = createWorld({
  world: { size: { x: 100, y: 100 } },
  input: {
    // Input config
  }
});

const inputManager = world.getInputManager();

// Input updates automatically in world loop
// No need to call inputManager.update() manually
```

## Common Patterns

### Player Movement

```typescript
inputManager.registerAction('move', {
  type: 'continuous',
  valueType: 'vector2'
});

['KeyW', 'KeyS', 'KeyA', 'KeyD'].forEach(key => {
  inputManager.bindInput('move', {
    type: 'keyboard',
    key,
    easing: { type: 'easeOutQuad', duration: 0.2 }
  });
});

world.onUpdate((deltaTime) => {
  const moveDir = inputManager.getActionValue('move') as THREE.Vector2;
  player.position.x += moveDir.x * speed * deltaTime;
  player.position.z += -moveDir.y * speed * deltaTime;
});
```

### Camera Control

```typescript
inputManager.registerAction('look', {
  type: 'continuous',
  valueType: 'vector2'
});

inputManager.bindInput('look', { type: 'mouse', axis: 'deltaX' });
inputManager.bindInput('look', { type: 'mouse', axis: 'deltaY' });

world.onUpdate(() => {
  const lookDelta = inputManager.getActionValue('look') as THREE.Vector2;
  camera.rotation.y -= lookDelta.x * sensitivity;
  camera.rotation.x -= lookDelta.y * sensitivity;
});
```

### Action Button

```typescript
inputManager.registerAction('interact', {
  type: 'trigger',
  valueType: 'boolean'
});

inputManager.bindInput('interact', { type: 'keyboard', key: 'KeyE' });
inputManager.bindInput('interact', { type: 'gamepad', button: 2 });

world.onUpdate(() => {
  if (inputManager.wasActionTriggered('interact')) {
    interactWithObject();
  }
});
```

### Hot-Swapping Bindings

```typescript
// Allow player to rebind controls
function rebindControl(actionName: string, newKey: string) {
  // Clear old bindings
  inputManager.clearBindings(actionName);

  // Add new binding
  inputManager.bindInput(actionName, {
    type: 'keyboard',
    key: newKey
  });

  console.log(`${actionName} rebound to ${newKey}`);
}

// Usage
rebindControl('jump', 'KeyF');
```

### Disable Input During UI

```typescript
function showPauseMenu() {
  inputManager.setEnabled(false);
  // Show UI
}

function hidePauseMenu() {
  inputManager.setEnabled(true);
  // Hide UI
}
```

## Performance Tips

1. **Register actions once**: Don't register/unregister actions every frame
2. **Use continuous for held inputs**: More efficient than checking trigger every frame
3. **Clear unused bindings**: Remove bindings when not needed
4. **Disable when not needed**: Use `setEnabled(false)` during cutscenes

## See Also

- [World Module](world.md) - Integration point
- [Utilities Module](utilities.md#easing-utils) - Easing functions
- [API Reference](api-reference.md) - Complete API index
