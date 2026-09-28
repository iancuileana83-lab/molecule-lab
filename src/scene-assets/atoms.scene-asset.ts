import { Mesh, MeshStandardMaterial, SphereGeometry } from '@iwsdk/core';

/**
 * Heavy-atom spheres (hydrogens are implicit). Origin at the sphere centre.
 * Radii are sized for comfortable hand pinching (~7 cm diameter).
 */
export const ATOM_RADIUS = { C: 0.034, N: 0.033, O: 0.032 } as const;

function atom(name: string, radius: number, color: number): Mesh {
  const mesh = new Mesh(
    new SphereGeometry(radius, 28, 18),
    new MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.05 }),
  );
  mesh.name = name;
  return mesh;
}

export const carbonAtom = atom('CarbonAtom', ATOM_RADIUS.C, 0x3a3e44);
export const nitrogenAtom = atom('NitrogenAtom', ATOM_RADIUS.N, 0x3d6ee0);
export const oxygenAtom = atom('OxygenAtom', ATOM_RADIUS.O, 0xe0463a);
