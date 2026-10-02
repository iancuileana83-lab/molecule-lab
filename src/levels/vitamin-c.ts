import type { MoleculeLevel } from './types.js';

const B = 1.4; // ring bond
const P = B / (2 * Math.sin(Math.PI / 5)); // pentagon circumradius
const pol = (deg: number, r: number) => ({
  x: r * Math.cos((deg * Math.PI) / 180),
  y: r * Math.sin((deg * Math.PI) / 180),
});
const at = (deg: number, r: number, from: { x: number; y: number }) => {
  const d = pol(deg, r);
  return { x: from.x + d.x, y: from.y + d.y };
};

const RING_O = pol(90, P);
const C1 = pol(18, P); // lactone carbonyl C
const C2 = pol(-54, P); // enol C–OH
const C3 = pol(-126, P); // enol C–OH
const C4 = pol(162, P); // ring C carrying the side chain
const C5 = at(162, 1.52, C4); // side-chain CH–OH
const C6 = at(210, 1.52, C5); // terminal CH2–OH

/**
 * Vitamin C (ascorbic acid): 12 heavy atoms (6 C, 6 O), 12 bonds. A five-membered
 * lactone ring with two enol OH groups and a two-carbon side chain with two more
 * OH groups. The ring oxygen is the only O that is part of the ring.
 */
export const VITAMIN_C: MoleculeLevel = {
  id: 'vitamin-c',
  name: 'Vitamin C',
  slots: [
    { element: 'C', ...C4 }, // 0 ring C4 (seed)
    { element: 'O', ...RING_O }, // 1 ring O
    { element: 'C', ...C1 }, // 2 lactone C=O
    { element: 'O', ...at(18, 1.22, C1) }, // 3 carbonyl O
    { element: 'C', ...C2 }, // 4
    { element: 'O', ...at(-54, 1.36, C2) }, // 5 enol OH on C2
    { element: 'C', ...C3 }, // 6
    { element: 'O', ...at(-126, 1.36, C3) }, // 7 enol OH on C3
    { element: 'C', ...C5 }, // 8 side-chain CH
    { element: 'O', ...at(90, 1.43, C5) }, // 9 side-chain OH
    { element: 'C', ...C6 }, // 10 CH2
    { element: 'O', ...at(240, 1.43, C6) }, // 11 terminal OH
  ],
  bonds: [
    [0, 1, 1],
    [1, 2, 1],
    [2, 3, 2],
    [2, 4, 1],
    [4, 5, 1],
    [4, 6, 2],
    [6, 7, 1],
    [6, 0, 1],
    [0, 8, 1],
    [8, 9, 1],
    [8, 10, 1],
    [10, 11, 1],
  ],
  starTimeSec: 135,
  fact: 'Vitamin C, also called ascorbic acid, is a vitamin that humans cannot make, so it comes from food such as citrus fruit, peppers and berries. Albert Szent-Györgyi isolated it in the late 1920s and received the 1937 Nobel Prize partly for this work.',
};
