import * as THREE from 'three';
import type { Unit } from '@newkrok/three-play';

/**
 * Color theme for unit body parts
 */
export type ColorTheme = {
  head?: number;
  hands?: number;
  feet?: number;
  chest?: number;
  arms?: number;
  legs?: number;
};

/**
 * Predefined color themes
 */
export const COLOR_THEMES = {
  default: {
    head: 0xffdbac, // Light skin tone
    hands: 0xffdbac, // Light skin tone
    feet: 0x8b4513, // Brown
    chest: 0x4a90e2, // Blue
    arms: 0x3a7bc8, // Slightly darker blue
    legs: 0x2c3e50, // Dark grey
  },
  zombie: {
    head: 0x4caf50, // Green
    hands: 0x4caf50, // Green
    feet: 0x2e7d32, // Dark green
    chest: 0x66bb6a, // Light green
    arms: 0x4caf50, // Green
    legs: 0x388e3c, // Medium green
  },
  knight: {
    head: 0xffdbac, // Light skin tone
    hands: 0xffdbac, // Light skin tone
    feet: 0x424242, // Dark grey (boots)
    chest: 0xbdbdbd, // Light grey (armor)
    arms: 0x9e9e9e, // Medium grey (armor)
    legs: 0x616161, // Dark grey (armor)
  },
  soldier: {
    head: 0xffdbac, // Light skin tone
    hands: 0xffdbac, // Light skin tone
    feet: 0x1b5e20, // Dark green (military boots)
    chest: 0x2e7d32, // Military green
    arms: 0x388e3c, // Medium green
    legs: 0x1b5e20, // Dark green (military pants)
  },
} as const;

/**
 * Decorates a unit with custom colors for body parts
 * @param unit The unit to decorate
 * @param colorTheme The color theme to apply
 * @returns The decorated unit
 */
export const decorateUnit = (
  unit: Unit | null,
  colorTheme: ColorTheme,
): Unit | null => {
  if (!unit) return null;

  unit.model.traverse((child) => {
    if (child.type === 'SkinnedMesh') {
      const mesh = child as THREE.Mesh;
      let color: number | undefined;

      const name = child.name;

      // Human model mesh names:
      // nodes1 = head
      // nodes2 = left arm
      // nodes3 = left hand
      // nodes4 = right arm
      // nodes5 = right hand
      // nodes6 = left leg
      // nodes7 = left foot
      // nodes8 = right leg
      // nodes9 = right foot
      // meshes0 = chest

      // Zombie model mesh names (need to be identified):
      // mesh_0 = ?
      // mesh_1_instance_0, mesh_1_instance_1 = ?
      // mesh_2 = ?
      // mesh_3_instance_0, mesh_3_instance_1 = ?
      // mesh_4_instance_0, mesh_4_instance_1 = ?

      // Human model
      if (name === 'nodes1') {
        color = colorTheme.head;
      } else if (name === 'nodes3' || name === 'nodes5') {
        color = colorTheme.hands;
      } else if (name === 'nodes7' || name === 'nodes9') {
        color = colorTheme.feet;
      } else if (name === 'nodes2' || name === 'nodes4') {
        color = colorTheme.arms;
      } else if (name === 'nodes6' || name === 'nodes8') {
        color = colorTheme.legs;
      } else if (name === 'meshes0') {
        color = colorTheme.chest;
      }
      // Zombie model - apply color to all meshes uniformly for now
      else if (name.startsWith('mesh_')) {
        // For zombies, we'll apply a uniform color based on the mesh index
        // This is a simple approach - you can refine it once you identify which mesh is which
        if (name === 'mesh_0') {
          color = colorTheme.chest; // Main body
        } else if (name.startsWith('mesh_1_instance')) {
          color = colorTheme.head; // Possibly head/face
        } else if (name === 'mesh_2') {
          color = colorTheme.arms; // Possibly arms
        } else if (name.startsWith('mesh_3_instance')) {
          color = colorTheme.hands; // Possibly hands
        } else if (name.startsWith('mesh_4_instance')) {
          color = colorTheme.legs; // Possibly legs/feet
        }
      }

      // Apply the color to the material
      if (color !== undefined && mesh.material) {
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];

        // Clone materials to avoid sharing between units
        const clonedMaterials = materials.map((mat: any) => {
          if (mat && mat.clone) {
            const clonedMat = mat.clone();
            if (clonedMat.color && typeof clonedMat.color.setHex === 'function') {
              clonedMat.color.setHex(color);
            }
            return clonedMat;
          }
          return mat;
        });

        // Assign the cloned material(s) back to the mesh
        mesh.material = Array.isArray(mesh.material)
          ? clonedMaterials
          : clonedMaterials[0];
      }
    }
  });

  return unit;
};
