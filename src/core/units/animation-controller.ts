import * as THREE from 'three';
import type { Unit, AnimationState } from '../../types/units';

/**
 * Animation controller configuration
 */
export type AnimationControllerConfig = {
  /** Default fade duration for animation transitions */
  defaultFadeDuration?: number;
  /** Whether to automatically loop animations */
  autoLoop?: boolean;
  /** Logger instance for debugging */
  logger?: import('../utils/logger.js').Logger;
};

/**
 * Animation controller for managing unit animations with fade transitions
 */
export type AnimationControllerImpl = {
  /** Play an animation with optional fade transition */
  playAnimation: (
    unit: Unit,
    animationName: AnimationState,
    fadeDuration?: number,
  ) => void;
  /** Update all animation mixers */
  updateAnimations: (units: Unit[], delta: number) => void;
  /** Stop all animations for a unit */
  stopAnimations: (unit: Unit) => void;
  /** Check if an animation is currently playing */
  isAnimationPlaying: (unit: Unit, animationName: AnimationState) => boolean;
  /** Set animation speed */
  setAnimationSpeed: (
    unit: Unit,
    animationName: AnimationState,
    speed: number,
  ) => void;
  /** Get current animation name */
  getCurrentAnimation: (unit: Unit) => AnimationState | null;
};

/**
 * Creates an animation controller for managing unit animations
 */
export const createAnimationController = (
  config: AnimationControllerConfig = {},
): AnimationControllerImpl => {
  const { defaultFadeDuration = 0.2, autoLoop = true, logger } = config;

  const playAnimation = (
    unit: Unit,
    animationName: AnimationState,
    fadeDuration: number = defaultFadeDuration,
  ): void => {
    if (!unit.actions || !unit.actions[animationName]) {
      logger?.warn(`Animation "${animationName}" not found for unit`);
      return;
    }

    // Don't play same animation if already playing
    if (unit.userData?.currentAnimationName === animationName) {
      return;
    }

    const previousAnimation = unit.userData?.currentAnimationName;
    if (unit.userData) {
      unit.userData.lastAnimationName = previousAnimation;
      unit.userData.currentAnimationName = animationName;
    }

    const currentAction = unit.actions[animationName];

    // Configure animation properties
    if (autoLoop) {
      currentAction.setLoop(THREE.LoopRepeat as any, Infinity);
    }

    // Handle cross-fade from previous animation
    if (previousAnimation && unit.actions[previousAnimation]) {
      currentAction
        .reset()
        .crossFadeFrom(unit.actions[previousAnimation], fadeDuration, true);
    } else {
      currentAction.reset();
    }

    currentAction.play();
  };

  const updateAnimations = (units: Unit[], delta: number): void => {
    for (const unit of units) {
      if (unit.mixer) {
        unit.mixer.update(delta);
      }
    }
  };

  const stopAnimations = (unit: Unit): void => {
    if (!unit.actions) return;

    Object.values(unit.actions).forEach((action) => {
      if (action) {
        action.stop();
      }
    });

    if (unit.userData) {
      unit.userData.currentAnimationName = null;
      unit.userData.lastAnimationName = null;
    }
  };

  const isAnimationPlaying = (
    unit: Unit,
    animationName: AnimationState,
  ): boolean => {
    const action = unit.actions?.[animationName];
    return action ? action.isRunning() : false;
  };

  const setAnimationSpeed = (
    unit: Unit,
    animationName: AnimationState,
    speed: number,
  ): void => {
    const action = unit.actions?.[animationName];
    if (action) {
      action.setEffectiveTimeScale(speed);
    }
  };

  const getCurrentAnimation = (unit: Unit): AnimationState | null => {
    return unit.userData?.currentAnimationName || null;
  };

  return {
    playAnimation,
    updateAnimations,
    stopAnimations,
    isAnimationPlaying,
    setAnimationSpeed,
    getCurrentAnimation,
  };
};

/**
 * Animation controller utilities
 */
export const AnimationControllerUtils = {
  /**
   * Create default animation controller
   */
  createDefault: () => createAnimationController(),

  /**
   * Create animation controller with custom fade duration
   */
  createWithFadeDuration: (fadeDuration: number) =>
    createAnimationController({ defaultFadeDuration: fadeDuration }),

  /**
   * Create animation controller without auto-loop
   */
  createWithoutLoop: () => createAnimationController({ autoLoop: false }),
} as const;
