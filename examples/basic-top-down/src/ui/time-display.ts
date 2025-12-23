import type { TimeDisplayInfo } from './types.js';

/**
 * Warcraft 3 inspired time display component
 */
export type TimeDisplay = {
  update: (timeInfo: TimeDisplayInfo) => void;
  destroy: () => void;
};

/**
 * Creates a Warcraft 3-style time display
 * @param containerId - ID of the container element
 * @returns TimeDisplay instance
 */
export const createTimeDisplay = (containerId: string): TimeDisplay => {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container with id "${containerId}" not found`);
  }

  // Clear container
  container.innerHTML = '';

  // Create time display structure
  const timeWrapper = document.createElement('div');
  timeWrapper.className = 'time-display-wrapper';

  // Icon (sun/moon based on time)
  const icon = document.createElement('div');
  icon.className = 'time-icon';
  icon.innerHTML = '☀️'; // Default to sun

  // Time text
  const timeText = document.createElement('div');
  timeText.className = 'time-text';
  timeText.textContent = '06:00';

  timeWrapper.appendChild(icon);
  timeWrapper.appendChild(timeText);
  container.appendChild(timeWrapper);

  /**
   * Updates the time display
   */
  const update = (timeInfo: TimeDisplayInfo): void => {
    timeText.textContent = timeInfo.formattedTime;

    // Update icon based on time of day
    // Night: 20:00 - 06:00, Day: 06:00 - 20:00
    if (timeInfo.hours >= 20 || timeInfo.hours < 6) {
      icon.innerHTML = '🌙';
      icon.className = 'time-icon night';
    } else if (timeInfo.hours >= 6 && timeInfo.hours < 12) {
      icon.innerHTML = '🌅';
      icon.className = 'time-icon dawn';
    } else if (timeInfo.hours >= 12 && timeInfo.hours < 18) {
      icon.innerHTML = '☀️';
      icon.className = 'time-icon day';
    } else {
      icon.innerHTML = '🌆';
      icon.className = 'time-icon dusk';
    }
  };

  /**
   * Destroys the time display
   */
  const destroy = (): void => {
    container.innerHTML = '';
  };

  return {
    update,
    destroy,
  };
};
