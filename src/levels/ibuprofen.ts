import type { MoleculeLevel } from './types.js';

const R = 1.39; // aromatic C–C
const H = R * Math.sin(Math.PI / 3);
const S = 1.52; // C–C single
const dx = (deg: number, len: number) => len * Math.cos((deg * Math.PI) / 180);
const dy = (deg: number, len: number) => len * Math.sin((deg * Math.PI) / 180);

/**
 * Ibuprofen: 15 heavy atoms (13 C, 2 O), 15 bonds. A para-substituted ring with
 * an isobutyl group on the left and the propanoic acid on the right. Both side
 * chains are folded (down on the left, up on the right) so the drawing stays
 * about as wide as paracetamol instead of the usual long zig-zag.
 */
export const IBUPROFEN: MoleculeLevel = {
  id: 'ibuprofen',
  name: 'Ibuprofen',
  slots: [
    { element: 'C', x: -R, y: 0 }, // 0 ring C–isobutyl (seed)
    { element: 'C', x: -R / 2, y: H }, // 1
    { element: 'C', x: R / 2, y: H }, // 2
    { element: 'C', x: R, y: 0 }, // 3 ring C–CH(CH3)COOH (para to 0)
    { element: 'C', x: R / 2, y: -H }, // 4
    { element: 'C', x: -R / 2, y: -H }, // 5
    { element: 'C', x: -R + dx(210, S), y: dy(210, S) }, // 6 CH2
    { element: 'C', x: -R + dx(210, S), y: dy(210, S) - S }, // 7 CH
    { element: 'C', x: -R + dx(210, S) + dx(210, S), y: dy(210, S) - S + dy(210, S) }, // 8 methyl
    { element: 'C', x: -R + dx(210, S) + dx(330, S), y: dy(210, S) - S + dy(330, S) }, // 9 methyl
    { element: 'C', x: R + dx(30, S), y: dy(30, S) }, // 10 CH
    { element: 'C', x: R + dx(30, S) + dx(330, S), y: dy(30, S) + dy(330, S) }, // 11 methyl
    { element: 'C', x: R + dx(30, S), y: dy(30, S) + S }, // 12 carboxyl C
    { element: 'O', x: R + dx(30, S) + dx(30, 1.22), y: dy(30, S) + S + dy(30, 1.22) }, // 13 carboxyl =O
    { element: 'O', x: R + dx(30, S) + dx(150, 1.36), y: dy(30, S) + S + dy(150, 1.36) }, // 14 carboxyl –OH
  ],
  bonds: [
    [0, 1, 2],
    [1, 2, 1],
    [2, 3, 2],
    [3, 4, 1],
    [4, 5, 2],
    [5, 0, 1],
    [0, 6, 1],
    [6, 7, 1],
    [7, 8, 1],
    [7, 9, 1],
    [3, 10, 1],
    [10, 11, 1],
    [10, 12, 1],
    [12, 13, 2],
    [12, 14, 1],
  ],
  starTimeSec: 180,
  fact: 'Ibuprofen relieves pain, reduces fever and eases inflammation. It was discovered in the 1960s by a research team at the Boots company in the UK, and it is on the WHO List of Essential Medicines.',
};
