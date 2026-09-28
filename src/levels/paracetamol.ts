import type { MoleculeLevel } from './types.js';

const R = 1.39; // aromatic C–C
const H = R * Math.sin(Math.PI / 3);

/** Paracetamol (acetaminophen): 11 heavy atoms (8 C, 1 N, 2 O), 11 bonds. */
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
  starTimeSec: 120,
  fact: 'Paracetamol (called acetaminophen in the US) relieves pain and reduces fever. It became widely used in the 1950s and is on the WHO List of Essential Medicines.',
};
