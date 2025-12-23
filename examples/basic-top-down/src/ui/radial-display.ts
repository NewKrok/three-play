import type { RadialConfig } from './types.js';

/**
 * Creates a radial/circular progress display
 */
export type RadialDisplay = {
  update: (value: number) => void;
  getValue: () => number;
  destroy: () => void;
};

/**
 * Creates a radial progress bar with circular fill
 * @param config - Configuration for the radial display
 * @returns RadialDisplay instance
 */
export const createRadialDisplay = (config: RadialConfig): RadialDisplay => {
  const { containerId, label, color, maxValue, initialValue = 0 } = config;

  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container with id "${containerId}" not found`);
  }

  // Clear container
  container.innerHTML = '';

  // Create SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'radial-display');
  svg.setAttribute('viewBox', '0 0 120 120');

  // Background circle
  const bgCircle = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle',
  );
  bgCircle.setAttribute('cx', '60');
  bgCircle.setAttribute('cy', '60');
  bgCircle.setAttribute('r', '50');
  bgCircle.setAttribute('class', 'radial-bg');

  // Progress circle
  const progressCircle = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle',
  );
  progressCircle.setAttribute('cx', '60');
  progressCircle.setAttribute('cy', '60');
  progressCircle.setAttribute('r', '50');
  progressCircle.setAttribute('class', 'radial-progress');
  progressCircle.setAttribute('stroke', color);

  // Calculate circumference for stroke-dasharray
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  progressCircle.style.strokeDasharray = `${circumference}`;
  progressCircle.style.strokeDashoffset = `${circumference}`;

  // Text label
  const textLabel = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'text',
  );
  textLabel.setAttribute('x', '60');
  textLabel.setAttribute('y', '50');
  textLabel.setAttribute('class', 'radial-label');
  textLabel.textContent = label;

  // Value text
  const valueText = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'text',
  );
  valueText.setAttribute('x', '60');
  valueText.setAttribute('y', '70');
  valueText.setAttribute('class', 'radial-value');
  valueText.textContent = Math.round(initialValue).toString();

  // Append elements
  svg.appendChild(bgCircle);
  svg.appendChild(progressCircle);
  svg.appendChild(textLabel);
  svg.appendChild(valueText);
  container.appendChild(svg);

  let currentValue = initialValue;

  /**
   * Updates the radial display value
   */
  const update = (value: number): void => {
    currentValue = Math.max(0, Math.min(maxValue, value));
    const percentage = currentValue / maxValue;
    const offset = circumference - percentage * circumference;

    progressCircle.style.strokeDashoffset = `${offset}`;
    valueText.textContent = Math.round(currentValue).toString();
  };

  /**
   * Gets current value
   */
  const getValue = (): number => currentValue;

  /**
   * Destroys the radial display
   */
  const destroy = (): void => {
    container.innerHTML = '';
  };

  // Set initial value
  update(initialValue);

  return {
    update,
    getValue,
    destroy,
  };
};
