import type * as THREE from 'three';

/**
 * A single step in a cinematic camera sequence
 */
export type CinematicCameraStep = {
  /** Starting position for the camera */
  from?: THREE.Vector3;
  /** Ending position for the camera */
  to?: THREE.Vector3;
  /** Static look-at target */
  lookAt?: THREE.Vector3;
  /** Starting look-at position (for animated look-at) */
  lookAtFrom?: THREE.Vector3;
  /** Ending look-at position (for animated look-at) */
  lookAtTo?: THREE.Vector3;
  /** Duration of this step in seconds */
  duration?: number;
  /** Wait time after this step completes in seconds */
  wait?: number;
};

/**
 * Configuration for the cinematic camera controller
 */
export type CinematicCameraConfig = {
  /** The camera to control */
  camera: THREE.Camera;
  /** Sequence of camera movements */
  sequence?: CinematicCameraStep[];
  /** Callback when sequence completes */
  onComplete?: (() => void) | null;
};

/**
 * Cinematic camera controller for scripted camera sequences
 */
export type CinematicCameraController = {
  /** Start playing the sequence */
  play: () => void;
  /** Stop playing the sequence */
  stop: () => void;
  /** Update the controller (call every frame) */
  update: (delta: number) => void;
  /** Check if sequence is currently playing */
  isPlaying: () => boolean;
};
