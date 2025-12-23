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

  // Create SVG for progress ring
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 56 56');

  // Background circle
  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bgCircle.setAttribute('cx', '28');
  bgCircle.setAttribute('cy', '28');
  bgCircle.setAttribute('r', '26');
  bgCircle.setAttribute('class', 'time-progress-bg');

  // Progress circle
  const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  progressCircle.setAttribute('cx', '28');
  progressCircle.setAttribute('cy', '28');
  progressCircle.setAttribute('r', '26');
  progressCircle.setAttribute('class', 'time-progress');

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  progressCircle.style.strokeDasharray = `${circumference}`;
  progressCircle.style.strokeDashoffset = `${circumference}`;

  svg.appendChild(bgCircle);
  svg.appendChild(progressCircle);

  // Icon (sun/moon based on time)
  const icon = document.createElement('div');
  icon.className = 'time-icon';
  icon.innerHTML = '☀️'; // Default to sun

  // Time text
  const timeText = document.createElement('div');
  timeText.className = 'time-text';
  timeText.textContent = '06:00';

  timeWrapper.appendChild(svg);
  timeWrapper.appendChild(icon);
  timeWrapper.appendChild(timeText);
  container.appendChild(timeWrapper);

  /**
   * Updates the time display
   */
  const update = (timeInfo: TimeDisplayInfo): void => {
    timeText.textContent = timeInfo.formattedTime;

    // Update icon and background based on time of day
    // Night: 20:00 - 06:00, Day: 06:00 - 20:00
    const isNight = timeInfo.hours >= 20 || timeInfo.hours < 6;

    if (isNight) {
      icon.innerHTML = '🌙';
      icon.className = 'time-icon night';
      timeWrapper.className = 'time-display-wrapper night';
    } else {
      icon.innerHTML = '☀️';
      icon.className = 'time-icon day';
      timeWrapper.className = 'time-display-wrapper day';
    }

    // Calculate progress to next period
    // Day period: 6:00 - 20:00 (14 hours)
    // Night period: 20:00 - 6:00 (10 hours)
    let progressPercentage = 0;

    if (isNight) {
      // Night: 20:00 - 6:00
      let hoursIntoNight = 0;
      if (timeInfo.hours >= 20) {
        hoursIntoNight = timeInfo.hours - 20 + timeInfo.minutes / 60;
      } else {
        hoursIntoNight = timeInfo.hours + 4 + timeInfo.minutes / 60;
      }
      progressPercentage = hoursIntoNight / 10; // 10 hour night
    } else {
      // Day: 6:00 - 20:00
      const hoursIntoDay = timeInfo.hours - 6 + timeInfo.minutes / 60;
      progressPercentage = hoursIntoDay / 14; // 14 hour day
    }

    // Update progress circle
    const offset = circumference - progressPercentage * circumference;
    progressCircle.style.strokeDashoffset = `${offset}`;
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
