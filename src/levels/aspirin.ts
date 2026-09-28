import type { MoleculeLevel } from './types.js';

const R = 1.39; // aromatic C–C
const H = R * Math.sin(Math.PI / 3);

/**
 * Aspirin (acetylsalicylic acid): 13 heavy atoms (9 C, 4 O), 13 bonds.
 * The ring carbon bearing the carboxyl group is the seed; the ester oxygen
 * sits on the ortho neighbour. Carboxyl points up, the acetyl ester right.
 */
export const ASPIRIN: MoleculeLevel = {
  id: 'aspirin',
  name: 'Aspirin',
  slots: [
    { element: 'C', x: -R / 2, y: H }, // 0 ring C–COOH (seed)
    { element: 'C', x: R / 2, y: H }, // 1 ring C–O ester (ortho to 0)
    { element: 'C', x: R, y: 0 }, // 2
    { element: 'C', x: R / 2, y: -H }, // 3
    { element: 'C', x: -R / 2, y: -H }, // 4
    { element: 'C', x: -R, y: 0 }, // 5
    { element: 'C', x: -1.435, y: 2.486 }, // 6 carboxyl C
    { element: 'O', x: -2.665, y: 2.486 }, // 7 carboxyl =O
    { element: 'O', x: -0.755, y: 3.664 }, // 8 carboxyl –OH
    { element: 'O', x: 1.375, y: 2.382 }, // 9 ester O
    { element: 'C', x: 2.735, y: 2.382 }, // 10 acetyl carbonyl C
    { element: 'O', x: 3.35, y: 3.447 }, // 11 acetyl =O
    { element: 'C', x: 3.485, y: 1.083 }, // 12 methyl C
  ],
  bonds: [
    [0, 1, 2],
    [1, 2, 1],
    [2, 3, 2],
    [3, 4, 1],
    [4, 5, 2],
    [5, 0, 1],
    [0, 6, 1],
    [6, 7, 2],
    [6, 8, 1],
    [1, 9, 1],
    [9, 10, 1],
    [10, 11, 2],
    [10, 12, 1],
  ],
  starTimeSec: 150,
  fact: 'Aspirin relieves pain and reduces fever and inflammation. Bayer first produced it in a pure, stable form in 1897, from salicylic acid, a relative of a compound found in willow bark. It is also on the WHO List of Essential Medicines.',
};
