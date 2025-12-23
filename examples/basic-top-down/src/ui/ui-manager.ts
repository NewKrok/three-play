import { createRadialDisplay } from './radial-display.js';
import { createTimeDisplay } from './time-display.js';
import { createInventory } from './inventory.js';
import type { UIGameState, TimeDisplayInfo } from './types.js';
import type { RadialDisplay } from './radial-display.js';
import type { TimeDisplay } from './time-display.js';
import type { Inventory } from './inventory.js';

/**
 * Main UI manager that coordinates all UI components
 */
export type UIManager = {
  updateHealth: (value: number) => void;
  updateStamina: (value: number) => void;
  updateTime: (timeInfo: TimeDisplayInfo) => void;
  addItem: (itemId: string, count?: number) => boolean;
  removeItem: (itemId: string, count?: number) => boolean;
  getItemCount: (itemId: string) => number;
  updateAll: (gameState: UIGameState, timeInfo: TimeDisplayInfo) => void;
  destroy: () => void;
};

/**
 * Configuration for UI manager
 */
export type UIManagerConfig = {
  maxHealth: number;
  maxStamina: number;
  inventorySize?: { width: number; height: number };
};

/**
 * Creates the main UI manager
 * @param config - Configuration for the UI manager
 * @returns UIManager instance
 */
export const createUIManager = (config: UIManagerConfig): UIManager => {
  const { maxHealth, maxStamina, inventorySize = { width: 10, height: 4 } } =
    config;

  // Initialize components
  const healthDisplay: RadialDisplay = createRadialDisplay({
    containerId: 'health-display',
    label: 'HP',
    color: '#dc2626',
    maxValue: maxHealth,
    initialValue: maxHealth,
  });

  const staminaDisplay: RadialDisplay = createRadialDisplay({
    containerId: 'stamina-display',
    label: 'Stamina',
    color: '#16a34a',
    maxValue: maxStamina,
    initialValue: maxStamina,
  });

  const timeDisplay: TimeDisplay = createTimeDisplay('time-display');

  const inventory: Inventory = createInventory('inventory-display', inventorySize);

  /**
   * Updates the health display
   */
  const updateHealth = (value: number): void => {
    healthDisplay.update(value);
  };

  /**
   * Updates the stamina display
   */
  const updateStamina = (value: number): void => {
    staminaDisplay.update(value);
  };

  /**
   * Updates the time display
   */
  const updateTime = (timeInfo: TimeDisplayInfo): void => {
    timeDisplay.update(timeInfo);
  };

  /**
   * Adds an item to inventory
   */
  const addItem = (itemId: string, count: number = 1): boolean => {
    return inventory.addItem(itemId, count);
  };

  /**
   * Removes an item from inventory
   */
  const removeItem = (itemId: string, count: number = 1): boolean => {
    return inventory.removeItem(itemId, count);
  };

  /**
   * Gets the count of a specific item
   */
  const getItemCount = (itemId: string): number => {
    return inventory.getItemCount(itemId);
  };

  /**
   * Updates all UI components at once
   */
  const updateAll = (
    gameState: UIGameState,
    timeInfo: TimeDisplayInfo,
  ): void => {
    updateHealth(gameState.health);
    updateStamina(gameState.stamina);
    updateTime(timeInfo);
  };

  /**
   * Destroys all UI components
   */
  const destroy = (): void => {
    healthDisplay.destroy();
    staminaDisplay.destroy();
    timeDisplay.destroy();
    inventory.destroy();
  };

  return {
    updateHealth,
    updateStamina,
    updateTime,
    addItem,
    removeItem,
    getItemCount,
    updateAll,
    destroy,
  };
};
