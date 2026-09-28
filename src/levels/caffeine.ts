import type { MoleculeLevel } from './types.js';

const R = 1.39; // six-ring bond length and hexagon circumradius
const HX = R * Math.cos(Math.PI / 6);
const HY = R / 2;
// Regular pentagon fused on the vertical C4–C5 edge, to the right.
const P_CENTER_X = HX + R / (2 * Math.tan(Math.PI / 5));
const P_RADIUS = R / (2 * Math.sin(Math.PI / 5));
const pentagon = (deg: number) => ({
  x: P_CENTER_X + P_RADIUS * Math.cos((deg * Math.PI) / 180),
  y: P_RADIUS * Math.sin((deg * Math.PI) / 180),
});
const N7 = pentagon(72);
const N7_OUT = { x: Math.cos((72 * Math.PI) / 180), y: Math.sin((72 * Math.PI) / 180) };

/**
 * Caffeine (1,3,7-trimethylxanthine): 14 heavy atoms (8 C, 4 N, 2 O),
 * 15 bonds. Six-ring N1-C2-N3-C4-C5-C6 fused with five-ring
 * C4-N9-C8-N7-C5 on the C4–C5 bond. The fusion carbon C4 is the seed.
 */
export const CAFFEINE: MoleculeLevel = {
  id: 'caffeine',
  name: 'Caffeine',
  slots: [
    { element: 'C', x: HX, y: -HY }, // 0 C4 (seed)
    { element: 'C', x: HX, y: HY }, // 1 C5
    { element: 'N', x: 0, y: -R }, // 2 N3
    { element: 'N', ...pentagon(-72) }, // 3 N9
    { element: 'C', x: -HX, y: -HY }, // 4 C2
    { element: 'N', x: -HX, y: HY }, // 5 N1
    { element: 'C', x: 0, y: R }, // 6 C6
    { element: 'N', ...N7 }, // 7 N7
    { element: 'C', ...pentagon(0) }, // 8 C8
    { element: 'O', x: -HX - 1.23 * 0.866, y: -HY - 1.23 * 0.5 }, // 9 O on C2
    { element: 'O', x: 0, y: R + 1.23 }, // 10 O on C6
    { element: 'C', x: -HX - 1.47 * 0.866, y: HY + 1.47 * 0.5 }, // 11 N1 methyl
    { element: 'C', x: 0, y: -R - 1.47 }, // 12 N3 methyl
    { element: 'C', x: N7.x + 1.47 * N7_OUT.x, y: N7.y + 1.47 * N7_OUT.y }, // 13 N7 methyl
  ],
  bonds: [
    [5, 4, 1], // N1–C2
    [4, 2, 1], // C2–N3
    [2, 0, 1], // N3–C4
    [0, 1, 2], // C4=C5
    [1, 6, 1], // C5–C6
    [6, 5, 1], // C6–N1
    [0, 3, 1], // C4–N9
    [3, 8, 2], // N9=C8
    [8, 7, 1], // C8–N7
    [7, 1, 1], // N7–C5
    [4, 9, 2], // C2=O
    [6, 10, 2], // C6=O
    [5, 11, 1], // N1–CH3
    [2, 12, 1], // N3–CH3
    [7, 13, 1], // N7–CH3
  ],
  starTimeSec: 165,
  fact: 'Caffeine is a natural stimulant found in coffee, tea and cacao. As a medicine, caffeine citrate helps premature babies breathe regularly, and it is on the WHO List of Essential Medicines.',
};
