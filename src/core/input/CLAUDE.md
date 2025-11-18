# Input System Context

## Overview
The Input system provides a unified, action-based interface for keyboard, mouse, and gamepad input with built-in easing support for smooth input transitions.

## Architecture

### Component Structure
```
InputManager (Action Registry & Coordinator)
├── KeyboardHandler (Key state tracking)
├── MouseHandler (Button & position tracking)
└── GamepadHandler (Button & axis polling)
```

### File Responsibilities

**input-manager.ts**
- Action registration and management
- Input state tracking per action
- Binding resolution (action → device input)
- Easing application
- Update coordination

**keyboard-handler.ts**
- Key down/up event listeners
- Key state storage (Map<string, boolean>)
- Optional preventDefault for game keys
- getValue() for querying key state

**mouse-handler.ts**
- Mouse button event listeners
- Mouse position tracking (normalized & screen coordinates)
- Mouse movement delta calculation
- Optional context menu prevention
- getValue() for buttons and axes

**gamepad-handler.ts**
- Gamepad API polling (no events, poll-based)
- Button and axis state reading
- Deadzone application
- Multiple gamepad support (index-based)
- getValue() for buttons and axes

## Action-Based Input System

### Core Concept
Instead of checking raw input directly, define **actions** that map to multiple input sources:

```typescript
// Define action
inputManager.registerAction({
  id: 'move-forward',
  bindings: [
    { type: 'keyboard', key: 'w' },
    { type: 'keyboard', key: 'ArrowUp' },
    { type: 'gamepad', axis: 'left-stick-y', inverted: true }
  ],
  easing: {
    type: 'easeOutQuad',
    duration: 0.2
  }
});

// Query action value (returns 0-1 for axes, true/false for buttons)
const value = inputManager.getValue('move-forward');
```

### Benefits
- **Platform independence** - Add keyboard, gamepad, touch without changing game code
- **Remapping** - Change bindings without code changes
- **Easing** - Built-in smooth transitions
- **Multiple inputs** - Multiple keys for same action
- **Type safety** - TypeScript ensures valid configurations

## Input Bindings

### Keyboard Bindings
```typescript
{
  type: 'keyboard',
  key: string,           // Key code (e.g., 'w', 'Space', 'ArrowUp')
  easing?: EasingConfig  // Optional per-binding easing
}
```

**Key Codes:** Standard DOM KeyboardEvent.key values
- Letters: 'a', 'b', 'w', 's', etc.
- Special: 'Space', 'Enter', 'Escape', 'Shift', 'Control', 'Alt'
- Arrows: 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'

### Mouse Bindings

**Button:**
```typescript
{
  type: 'mouse',
  button: number,        // 0 = left, 1 = middle, 2 = right
  easing?: EasingConfig
}
```

**Axis:**
```typescript
{
  type: 'mouse',
  axis: 'x' | 'y',       // Movement delta
  sensitivity?: number,   // Multiplier for axis value
  easing?: EasingConfig
}
```

**Position:**
```typescript
{
  type: 'mouse',
  // Returns THREE.Vector2 with normalized coordinates (-1 to 1)
}
```

### Gamepad Bindings

**Button:**
```typescript
{
  type: 'gamepad',
  gamepadIndex?: number, // Default: 0 (first connected gamepad)
  button: number,        // 0-15 (standard gamepad mapping)
  easing?: EasingConfig
}
```

**Axis:**
```typescript
{
  type: 'gamepad',
  gamepadIndex?: number,
  axis: 'left-stick-x' | 'left-stick-y' | 'right-stick-x' | 'right-stick-y',
  inverted?: boolean,    // Flip axis direction
  deadzone?: number,     // Override global deadzone (0-1)
  sensitivity?: number,  // Multiplier for axis value
  easing?: EasingConfig
}
```

**Standard Gamepad Mapping:**
- Buttons: 0-3 (face), 4-5 (shoulders), 6-7 (triggers), 8-9 (menu), 10-11 (stick clicks), 12-15 (dpad)
- Axes: 0-1 (left stick), 2-3 (right stick)

## Easing System

### Purpose
Smooth input transitions prevent jarring starts/stops, especially for movement.

### Configuration
```typescript
{
  type: EasingFunctionType,  // 'linear', 'easeInQuad', 'easeOutQuad', etc.
  duration: number           // Transition time in seconds
}
```

### Easing Types
All easing functions from `src/core/utils/easing-utils.ts`:
- **Linear** - No easing
- **Quad, Cubic, Quart, Quint** - Polynomial easing
- **Sine** - Trigonometric easing
- **Expo** - Exponential easing
- **Circ** - Circular easing
- **Back** - Overshoot easing
- **Elastic** - Spring-like easing
- **Bounce** - Bouncing easing

Each with **In**, **Out**, **InOut** variants.

### Application
- On input change (key down, button press), target value updates
- Current value eases toward target over specified duration
- Uses `applyEasing()` from easing-utils
- Checked via `isEasingComplete()` to stop updates

### Example
```typescript
// Without easing: instant 0 → 1 → 0
// With easeOutQuad 0.2s: 0 → 0.5 → 0.9 → 1.0 → 0.8 → 0.4 → 0
```

## Input State Tracking

### InputState Structure
```typescript
{
  currentValue: number,      // Current eased value
  previousValue: number,     // Last frame value (for change detection)
  targetValue: number,       // Target value (0 or 1 for digital)
  easingStartTime: number,   // When current easing started
  easingDuration: number,    // How long to ease
  easingType: EasingFunctionType
}
```

### State Per Action Per Binding
Each action tracks state for each binding:
```
actionStates: Map<actionId, Map<bindingKey, InputState>>
```

### Update Flow
```
1. Poll all devices (keyboard maps, mouse events, gamepad API)
2. For each action:
   a. For each binding:
      - Get raw input value
      - Update target if changed
      - Apply easing to current value
   b. Combine binding values (max value wins)
3. Store as action value
```

## Common Patterns

### Player Movement
```typescript
// Register actions
inputManager.registerAction({
  id: 'move-forward',
  bindings: [
    { type: 'keyboard', key: 'w' },
    { type: 'gamepad', axis: 'left-stick-y', inverted: true }
  ],
  easing: { type: 'easeOutQuad', duration: 0.15 }
});

// In update loop
const moveForward = inputManager.getValue('move-forward');
const moveRight = inputManager.getValue('move-right');

player.position.z += moveForward * speed * deltaTime;
player.position.x += moveRight * speed * deltaTime;
```

### Camera Control
```typescript
// Mouse look
inputManager.registerAction({
  id: 'look-horizontal',
  bindings: [{ type: 'mouse', axis: 'x', sensitivity: 0.002 }]
});

const lookX = inputManager.getValue('look-horizontal');
camera.rotation.y -= lookX;
```

### Action Buttons
```typescript
// Jump (digital)
inputManager.registerAction({
  id: 'jump',
  bindings: [
    { type: 'keyboard', key: 'Space' },
    { type: 'gamepad', button: 0 }  // A button on Xbox
  ]
});

// Check for press (not held)
if (inputManager.isActionJustPressed('jump')) {
  player.jump();
}
```

### Hot-swapping Bindings
```typescript
// Remove old action
inputManager.unregisterAction('move-forward');

// Register with new bindings
inputManager.registerAction({
  id: 'move-forward',
  bindings: [{ type: 'keyboard', key: 'ArrowUp' }]  // Changed from 'w'
});
```

## Configuration

### InputManagerConfig
```typescript
{
  enabled?: boolean,              // Default: true
  preventDefaultKeyboard?: boolean, // Prevent browser shortcuts
  preventDefaultMouse?: boolean,    // Prevent context menu
  gamepadDeadzone?: number         // Global deadzone (default: 0.1)
}
```

### Disabling Input
```typescript
// Temporarily disable (e.g., during menu)
inputManager.setEnabled(false);

// Re-enable
inputManager.setEnabled(true);
```

## Performance Considerations

### Event-Based (Keyboard, Mouse)
- Event listeners added once
- State stored in Maps
- No polling overhead

### Poll-Based (Gamepad)
- Must poll every frame (no events in Gamepad API)
- Only polls connected gamepads
- Minimal overhead for 1-4 gamepads

### Optimization Tips
- Use deadzone to avoid tiny inputs triggering updates
- Limit easing updates (skip if value unchanged)
- Unregister unused actions

## Testing Notes

### Test Coverage
- `input-manager.test.ts` - Action registration, value queries, easing
- `input-manager-config.test.ts` - Configuration options

### Mock Pattern
Tests mock browser APIs:
```typescript
const mockKeyboard = new Map<string, boolean>();
document.addEventListener = jest.fn((event, handler) => {
  if (event === 'keydown') keydownHandler = handler;
});
```

### Time-Based Tests
Easing tests use fixed time steps:
```typescript
inputManager.update(0.1); // 100ms elapsed
expect(inputManager.getValue('action')).toBeCloseTo(0.5);
```

## Known Issues & Limitations

1. **Gamepad Polling** - No event-based API, must poll every frame
2. **Mouse Position** - Only tracks last position, no history
3. **Touch Support** - Not yet implemented (future enhancement)
4. **Chord Detection** - No multi-key combo support (e.g., Ctrl+S)
5. **Context Sensitivity** - No action priority or context switching

## Extension Points

### Custom Input Sources
Add new input types:
1. Create handler (e.g., `touch-handler.ts`)
2. Implement `getValue()` interface
3. Register in `input-manager.ts`

### Custom Easing
Use any easing function from `easing-utils.ts`:
```typescript
import { EasingFunctions } from '../utils/easing-utils';

// All available functions
EasingFunctions.easeInOutElastic
EasingFunctions.easeOutBounce
// ... etc
```

### Action Groups
Organize actions by context:
```typescript
const menuActions = ['menu-up', 'menu-down', 'menu-select'];
const gameActions = ['move-forward', 'move-back', 'jump', 'attack'];

// Switch context
menuActions.forEach(id => inputManager.setActionEnabled(id, inMenu));
gameActions.forEach(id => inputManager.setActionEnabled(id, !inMenu));
```
