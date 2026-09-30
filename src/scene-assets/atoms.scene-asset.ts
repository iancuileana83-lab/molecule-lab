import {
  BackSide,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
} from '@iwsdk/core';

/**
 * Heavy-atom spheres (hydrogens are implicit). Origin at the sphere centre.
 * Radii are sized for comfortable hand pinching (~7 cm diameter).
 */
export const ATOM_RADIUS = { C: 0.034, N: 0.033, O: 0.032 } as const;

/**
 * Every atom gets a dark "ink" outline (a slightly larger, back-facing shell).
 * Its edge contrasts strongly with the mid-tone wall for every element, which
 * a lighter or redder body alone cannot do, and unlike a light outline it can
 * never be mistaken for the pale rings of the guide spots.
 */
const OUTLINE_COLOR = 0x1b1210;
const OUTLINE_SCALE = 1.075;
const outlineMaterial = new MeshBasicMaterial({
  color: OUTLINE_COLOR,
  side: BackSide,
});

function atom(name: string, radius: number, color: number): Mesh {
  const mesh = new Mesh(
    new SphereGeometry(radius, 24, 16),
    // Glossy: low roughness picks up the warm room reflections; a touch of
    // metalness deepens the colour without darkening it.
    new MeshStandardMaterial({ color, roughness: 0.24, metalness: 0.1 }),
  );
  mesh.name = name;
  const outline = new Mesh(
    new SphereGeometry(radius * OUTLINE_SCALE, 18, 12),
    outlineMaterial,
  );
  outline.name = 'Outline';
  mesh.add(outline);
  return mesh;
}

export const carbonAtom = atom('CarbonAtom', ATOM_RADIUS.C, 0x3a3e44);
export const nitrogenAtom = atom('NitrogenAtom', ATOM_RADIUS.N, 0x3d6ee0);
export const oxygenAtom = atom('OxygenAtom', ATOM_RADIUS.O, 0xe0463a);
