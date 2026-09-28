/**
 * Paracetamol (acetaminophen) heavy-atom template, hydrogens implicit.
 * Coordinates are a flat 2D layout in angstroms; the game scales them into
 * a vertical plane in front of the player. Slot 0 is the pre-placed seed.
 */
export type ElementSymbol = 'C' | 'N' | 'O';

export interface MoleculeLevel {
  id: string;
  name: string;
  slots: Array<{ element: ElementSymbol; x: number; y: number }>;
  /** [slotA, slotB, bondOrder] */
  bonds: Array<[number, number, 1 | 2]>;
  fact: string;
}

const R = 1.39; // aromatic C–C
const H = R * Math.sin(Math.PI / 3);

export const PARACETAMOL: MoleculeLevel = {
  id: 'paracetamol',
  name: 'Paracetamol',
  slots: [
    { element: 'C', x: -R, y: 0 }, // 0 ring C–OH (seed)
    { element: 'C', x: -R / 2, y: H }, // 1
    { element: 'C', x: R / 2, y: H }, // 2
    { element: 'C', x: R, y: 0 }, // 3 ring C–NH (para to 0)
    { element: 'C', x: R / 2, y: -H }, // 4
    { element: 'C', x: -R / 2, y: -H }, // 5
    { element: 'O', x: -R - 1.36, y: 0 }, // 6 hydroxyl O
    { element: 'N', x: R + 1.4, y: 0 }, // 7 amide N
    { element: 'C', x: R + 1.4 + 0.675, y: 1.169 }, // 8 carbonyl C
    { element: 'O', x: R + 1.4 + 0.675, y: 1.169 + 1.23 }, // 9 carbonyl O
    { element: 'C', x: R + 1.4 + 0.675 + 1.3, y: 0.419 }, // 10 methyl C
  ],
  bonds: [
    [0, 1, 2],
    [1, 2, 1],
    [2, 3, 2],
    [3, 4, 1],
    [4, 5, 2],
    [5, 0, 1],
    [0, 6, 1],
    [3, 7, 1],
    [7, 8, 1],
    [8, 9, 2],
    [8, 10, 1],
  ],
  fact: 'Paracetamol relieves pain and lowers fever. It has been used since the 1950s and is on the WHO List of Essential Medicines.',
};
