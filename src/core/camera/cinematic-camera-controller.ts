import * as THREE from 'three';
import type {
  CinematicCameraConfig,
  CinematicCameraController,
  CinematicCameraStep,
} from '../../types/camera';

/**
 * Creates a cinematic camera controller for scripted camera sequences
 * Useful for cutscenes, intros, and gameplay events
 *
 * @param config - Configuration for the cinematic camera
 * @returns Controller with play, stop, update, and isPlaying methods
 *
 * @example
 * ```typescript
 * const controller = createCinematicCameraController({
 *   camera,
 *   sequence: [
 *     {
 *       from: new THREE.Vector3(0, 10, 20),
 *       to: new THREE.Vector3(0, 5, 10),
 *       lookAt: new THREE.Vector3(0, 0, 0),
 *       duration: 2,
 *       wait: 0.5,
 *     },
 *   ],
 *   onComplete: () => console.log('Sequence complete'),
 * });
 *
 * controller.play();
 *
 * // In your update loop:
 * controller.update(deltaTime);
 * ```
 */
export const createCinematicCameraController = (
  config: CinematicCameraConfig,
): CinematicCameraController => {
  const { camera, sequence = [], onComplete = null } = config;

  let currentIndex = 0;
  let currentTime = 0;
  let playing = false;
  let currentStep: CinematicCameraStep | null = null;

  /**
   * Start playing the camera sequence
   */
  const play = (): void => {
    if (sequence.length === 0) return;

    playing = true;
    currentIndex = 0;
    currentTime = 0;
    currentStep = sequence[0];

    if (currentStep.from) {
      camera.position.copy(currentStep.from);
    } else {
      currentStep.from = camera.position.clone();
    }
  };

  /**
   * Stop playing the camera sequence
   */
  const stop = (): void => {
    playing = false;
  };

  /**
   * Update the camera controller (call every frame)
   * @param delta - Time elapsed since last frame in seconds
   */
  const update = (delta: number): void => {
    if (!playing || !currentStep) return;

    const step = currentStep;
    const duration = step.duration ?? 1;
    const wait = step.wait ?? 0;
    currentTime += delta;

    // Calculate interpolation factor with smoothstep
    const t = Math.min(currentTime / duration, 1);
    const smoothT = t * t * (3 - 2 * t); // Smoothstep easing

    // Interpolate camera position
    if (step.from && step.to) {
      camera.position.lerpVectors(step.from, step.to, smoothT);
    }

    // Calculate look target
    let lookTarget: THREE.Vector3;
    if (step.lookAtFrom && step.lookAtTo) {
      // Animated look-at
      lookTarget = new THREE.Vector3().lerpVectors(
        step.lookAtFrom,
        step.lookAtTo,
        smoothT,
      );
    } else if (step.lookAt) {
      // Static look-at
      lookTarget = step.lookAt;
    } else if (step.to && step.from) {
      // Look in direction of movement
      const forward = new THREE.Vector3()
        .subVectors(step.to, step.from)
        .normalize();
      lookTarget = new THREE.Vector3().addVectors(camera.position, forward);
    } else {
      // Default: look forward
      lookTarget = new THREE.Vector3(
        camera.position.x,
        camera.position.y,
        camera.position.z - 1,
      );
    }

    // Smooth camera rotation using quaternion slerp
    const targetQuat = new THREE.Quaternion();
    const currentQuat = camera.quaternion.clone();
    const lookMatrix = new THREE.Matrix4();

    lookMatrix.lookAt(camera.position, lookTarget, camera.up);
    targetQuat.setFromRotationMatrix(lookMatrix);

    camera.quaternion.slerpQuaternions(currentQuat, targetQuat, 0.1);

    // Check if step is complete (including wait time)
    if (currentTime >= duration + wait) {
      currentIndex++;
      if (currentIndex < sequence.length) {
        // Move to next step
        currentStep = sequence[currentIndex];
        currentTime = 0;

        if (!currentStep.from) {
          currentStep.from = camera.position.clone();
        } else {
          camera.position.copy(currentStep.from);
        }
      } else {
        // Sequence complete
        stop();
        if (onComplete) onComplete();
      }
    }
  };

  /**
   * Check if the sequence is currently playing
   * @returns True if playing, false otherwise
   */
  const isPlaying = (): boolean => playing;

  return {
    play,
    stop,
    update,
    isPlaying,
  };
};
