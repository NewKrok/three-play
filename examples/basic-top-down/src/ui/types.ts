/**
 * UI component types for the game interface
 */

/**
 * Item that can be stored in inventory
 */
export type InventoryItem = {
  id: string;
  name: string;
  icon?: string;
  stackable: boolean;
  maxStack: number;
  count: number;
};

/**
 * Inventory slot in the grid
 */
export type InventorySlot = {
  item: InventoryItem | null;
};

/**
 * Configuration for radial progress display
 */
export type RadialConfig = {
  containerId: string;
  label: string;
  color: string;
  maxValue: number;
  initialValue?: number;
};

/**
 * Time information for display
 */
export type TimeDisplayInfo = {
  hours: number;
  minutes: number;
  formattedTime: string;
};

/**
 * Game state that UI needs to track
 */
export type UIGameState = {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  collectedApples: number;
  score: number;
};
