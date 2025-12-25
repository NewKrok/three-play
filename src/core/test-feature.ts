/**
 * Test feature to demonstrate automatic documentation updates
 * This is a simple example of a new feature that should trigger documentation updates
 */

/**
 * Calculates the distance between two 3D points
 * @param x1 - X coordinate of first point
 * @param y1 - Y coordinate of first point
 * @param z1 - Z coordinate of first point
 * @param x2 - X coordinate of second point
 * @param y2 - Y coordinate of second point
 * @param z2 - Z coordinate of second point
 * @returns The Euclidean distance between the two points
 */
export const calculateDistance3D = (
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number
): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Linearly interpolates between two values
 * @param start - Starting value
 * @param end - Ending value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};
