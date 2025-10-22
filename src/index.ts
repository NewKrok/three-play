/**
 * THREE Play - A Three.js-based game engine
 * 
 * This is the main entry point for the THREE Play engine.
 * As the engine develops, more modules will be exported from here.
 */

// Core engine modules (to be implemented)
// export { GameEngine } from './core/GameEngine';
// export { Player } from './entities/Player';
// export { InputManager } from './input/InputManager';
// export { SceneManager } from './scene/SceneManager';

// Utility functions that can be useful for examples
export const VERSION = '0.0.1';

/**
 * Simple utility function for logging with THREE Play prefix
 */
export const log = (message: string, ...args: any[]) => {
  console.log(`[THREE Play] ${message}`, ...args);
};

/**
 * Placeholder game engine class - will be implemented as the engine grows
 */
export class GameEngine {
  constructor() {
    log('GameEngine initialized');
  }
  
  init() {
    log('GameEngine init called');
  }
  
  update(deltaTime: number) {
    // Game loop update logic will go here
  }
  
  render() {
    // Rendering logic will go here
  }
}