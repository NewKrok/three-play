# Camera Module

Cinematic camera controller for scripted camera sequences.

## Location

- Implementation: [src/core/camera/cinematic-camera-controller.ts](../../src/core/camera/cinematic-camera-controller.ts)
- Types: [src/types/camera.ts](../../src/types/camera.ts)
- Export: [src/core/camera/index.ts](../../src/core/camera/index.ts)

## Overview

Manages cinematic camera sequences with:
- Smooth camera position transitions
- Animated look-at targets
- Configurable duration and wait times
- Smoothstep easing for natural movement
- Sequential step execution

Perfect for cutscenes, intros, gameplay events, and camera transitions.

## Key Methods

### `createCinematicCameraController(config: CinematicCameraConfig): CinematicCameraController`

Creates a cinematic camera controller.

**Parameters:**
- `config.camera` - Three.js camera to control
- `config.sequence` - Array of camera movement steps
- `config.onComplete` - Optional callback when sequence completes

**Returns:** Controller with `play()`, `stop()`, `update()`, and `isPlaying()` methods

**Example:**
```typescript
import { createCinematicCameraController } from '@newkrok/three-play';
import * as THREE from 'three';

const controller = createCinematicCameraController({
  camera,
  sequence: [
    {
      from: new THREE.Vector3(0, 10, 20),
      to: new THREE.Vector3(0, 5, 10),
      lookAt: new THREE.Vector3(0, 0, 0),
      duration: 2,
      wait: 0.5,
    },
    {
      from: new THREE.Vector3(0, 5, 10),
      to: new THREE.Vector3(10, 5, 10),
      lookAtFrom: new THREE.Vector3(0, 0, 0),
      lookAtTo: new THREE.Vector3(10, 0, 10),
      duration: 3,
    },
  ],
  onComplete: () => {
    console.log('Cinematic complete!');
    // Resume gameplay
  },
});

// Start the sequence
controller.play();

// In your update loop
worldInstance.onUpdate((deltaTime) => {
  controller.update(deltaTime);
});
```

### Controller Methods

#### `play(): void`
Start or restart the camera sequence from the beginning.

#### `stop(): void`
Stop the camera sequence immediately.

#### `update(delta: number): void`
Update the controller (must be called every frame while playing).

**Parameters:**
- `delta` - Time elapsed since last frame in seconds

#### `isPlaying(): boolean`
Check if the sequence is currently active.

**Returns:** `true` if playing, `false` otherwise

## Configuration

### CinematicCameraStep

Each step in the sequence can have:

```typescript
type CinematicCameraStep = {
  from?: THREE.Vector3;      // Starting position (defaults to current)
  to?: THREE.Vector3;        // Ending position
  lookAt?: THREE.Vector3;    // Static look-at target
  lookAtFrom?: THREE.Vector3; // Animated look-at start
  lookAtTo?: THREE.Vector3;   // Animated look-at end
  duration?: number;         // Step duration in seconds (default: 1)
  wait?: number;             // Wait time after step in seconds (default: 0)
};
```

### Look-At Behavior

The controller supports multiple look-at modes:

1. **Static look-at:** Set `lookAt` to a fixed point
2. **Animated look-at:** Set both `lookAtFrom` and `lookAtTo` for smooth transitions
3. **Direction-based:** Omit look-at properties to look in movement direction
4. **Default:** Looks forward if no other mode specified

## Common Patterns

### Opening Cinematic

```typescript
const openingSequence = createCinematicCameraController({
  camera,
  sequence: [
    {
      from: new THREE.Vector3(0, 50, 50),
      to: new THREE.Vector3(0, 20, 30),
      lookAt: player.position,
      duration: 3,
      wait: 1,
    },
    {
      from: new THREE.Vector3(0, 20, 30),
      to: new THREE.Vector3(0, 5, 10),
      lookAt: player.position,
      duration: 2,
    },
  ],
  onComplete: () => {
    // Switch to gameplay camera
    enablePlayerControl();
  },
});

openingSequence.play();
```

### Orbit Camera

```typescript
const orbitSequence = createCinematicCameraController({
  camera,
  sequence: [
    {
      from: new THREE.Vector3(10, 5, 0),
      to: new THREE.Vector3(0, 5, 10),
      lookAt: targetObject.position,
      duration: 2,
    },
    {
      from: new THREE.Vector3(0, 5, 10),
      to: new THREE.Vector3(-10, 5, 0),
      lookAt: targetObject.position,
      duration: 2,
    },
    {
      from: new THREE.Vector3(-10, 5, 0),
      to: new THREE.Vector3(0, 5, -10),
      lookAt: targetObject.position,
      duration: 2,
    },
    {
      from: new THREE.Vector3(0, 5, -10),
      to: new THREE.Vector3(10, 5, 0),
      lookAt: targetObject.position,
      duration: 2,
    },
  ],
});
```

### Dynamic Look-At

```typescript
const dynamicLookSequence = createCinematicCameraController({
  camera,
  sequence: [
    {
      from: new THREE.Vector3(0, 10, 20),
      to: new THREE.Vector3(20, 10, 20),
      lookAtFrom: enemy1.position.clone(),
      lookAtTo: enemy2.position.clone(),
      duration: 3,
    },
  ],
});
```

## Tips

1. **Smooth Transitions:** Use longer durations (2-4 seconds) for dramatic camera moves
2. **Wait Times:** Add `wait` property to pause between steps
3. **Initial Position:** If `from` is omitted, uses camera's current position
4. **Performance:** Controller is lightweight - safe to create multiple instances
5. **Integration:** Works seamlessly with any Three.js camera (PerspectiveCamera, OrthographicCamera)

## Use Cases

- Game intros and outros
- Cutscenes between gameplay sections
- Building/environment reveals
- Character introductions
- Event triggers (door opening, boss appearing)
- Menu/lobby camera animations
- Tutorial demonstrations
- Victory/defeat sequences
