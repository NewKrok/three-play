import type { InventoryItem, InventorySlot } from './types.js';

/**
 * Grid-based inventory system with auto-stacking
 */
export type Inventory = {
  addItem: (itemId: string, count?: number) => boolean;
  removeItem: (itemId: string, count?: number) => boolean;
  getItemCount: (itemId: string) => number;
  update: () => void;
  destroy: () => void;
};

/**
 * Item definition registry
 */
const itemDefinitions: Record<string, Omit<InventoryItem, 'count'>> = {
  apple: {
    id: 'apple',
    name: 'Apple',
    icon: '🍎',
    stackable: true,
    maxStack: 99,
  },
};

/**
 * Creates a grid-based inventory system
 * @param containerId - ID of the container element
 * @param gridSize - Number of slots (width x height)
 * @returns Inventory instance
 */
export const createInventory = (
  containerId: string,
  gridSize: { width: number; height: number },
): Inventory => {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container with id "${containerId}" not found`);
  }

  // Clear container
  container.innerHTML = '';

  // Create inventory grid
  const grid = document.createElement('div');
  grid.className = 'inventory-grid';
  grid.style.gridTemplateColumns = `repeat(${gridSize.width}, 1fr)`;

  const totalSlots = gridSize.width * gridSize.height;
  const slots: InventorySlot[] = [];

  // Create slots
  for (let i = 0; i < totalSlots; i++) {
    slots.push({ item: null });

    const slotElement = document.createElement('div');
    slotElement.className = 'inventory-slot';
    slotElement.dataset.slotIndex = i.toString();

    // Icon container
    const iconContainer = document.createElement('div');
    iconContainer.className = 'slot-icon';

    // Stack count
    const stackCount = document.createElement('div');
    stackCount.className = 'slot-stack-count';

    slotElement.appendChild(iconContainer);
    slotElement.appendChild(stackCount);
    grid.appendChild(slotElement);
  }

  container.appendChild(grid);

  /**
   * Finds the first slot containing the specified item
   */
  const findSlotWithItem = (itemId: string): number => {
    return slots.findIndex(
      (slot) => slot.item && slot.item.id === itemId && slot.item.count < slot.item.maxStack,
    );
  };

  /**
   * Finds the first empty slot
   */
  const findEmptySlot = (): number => {
    return slots.findIndex((slot) => slot.item === null);
  };

  /**
   * Adds an item to the inventory with auto-stacking
   * @param itemId - ID of the item to add
   * @param count - Number of items to add (default: 1)
   * @returns true if item was added successfully
   */
  const addItem = (itemId: string, count: number = 1): boolean => {
    const itemDef = itemDefinitions[itemId];
    if (!itemDef) {
      console.warn(`Item definition not found: ${itemId}`);
      return false;
    }

    let remainingCount = count;

    // Try to stack with existing items
    if (itemDef.stackable) {
      for (let i = 0; i < slots.length && remainingCount > 0; i++) {
        const slot = slots[i];
        if (
          slot.item &&
          slot.item.id === itemId &&
          slot.item.count < slot.item.maxStack
        ) {
          const spaceInStack = slot.item.maxStack - slot.item.count;
          const amountToAdd = Math.min(spaceInStack, remainingCount);
          slot.item.count += amountToAdd;
          remainingCount -= amountToAdd;
        }
      }
    }

    // Add to new slots if there's still remaining count
    while (remainingCount > 0) {
      const emptySlotIndex = findEmptySlot();
      if (emptySlotIndex === -1) {
        console.warn('Inventory full!');
        update();
        return false;
      }

      const amountToAdd = Math.min(remainingCount, itemDef.maxStack);
      slots[emptySlotIndex].item = {
        ...itemDef,
        count: amountToAdd,
      };
      remainingCount -= amountToAdd;
    }

    update();
    return true;
  };

  /**
   * Removes an item from the inventory
   * @param itemId - ID of the item to remove
   * @param count - Number of items to remove (default: 1)
   * @returns true if item was removed successfully
   */
  const removeItem = (itemId: string, count: number = 1): boolean => {
    let remainingCount = count;

    for (let i = 0; i < slots.length && remainingCount > 0; i++) {
      const slot = slots[i];
      if (slot.item && slot.item.id === itemId) {
        const amountToRemove = Math.min(slot.item.count, remainingCount);
        slot.item.count -= amountToRemove;
        remainingCount -= amountToRemove;

        if (slot.item.count <= 0) {
          slot.item = null;
        }
      }
    }

    update();
    return remainingCount === 0;
  };

  /**
   * Gets the total count of a specific item
   * @param itemId - ID of the item
   * @returns Total count of the item
   */
  const getItemCount = (itemId: string): number => {
    return slots.reduce((total, slot) => {
      if (slot.item && slot.item.id === itemId) {
        return total + slot.item.count;
      }
      return total;
    }, 0);
  };

  /**
   * Updates the visual display of the inventory
   */
  const update = (): void => {
    slots.forEach((slot, index) => {
      const slotElement = grid.querySelector(
        `[data-slot-index="${index}"]`,
      ) as HTMLElement;
      if (!slotElement) return;

      const iconContainer = slotElement.querySelector(
        '.slot-icon',
      ) as HTMLElement;
      const stackCountElement = slotElement.querySelector(
        '.slot-stack-count',
      ) as HTMLElement;

      if (slot.item) {
        slotElement.classList.add('filled');
        iconContainer.textContent = slot.item.icon || '?';
        stackCountElement.textContent =
          slot.item.count > 1 ? slot.item.count.toString() : '';
      } else {
        slotElement.classList.remove('filled');
        iconContainer.textContent = '';
        stackCountElement.textContent = '';
      }
    });
  };

  /**
   * Destroys the inventory
   */
  const destroy = (): void => {
    container.innerHTML = '';
  };

  return {
    addItem,
    removeItem,
    getItemCount,
    update,
    destroy,
  };
};
