import { LEVELS } from './levels/all-levels.js';
import type { ElementSymbol } from './levels/types.js';

/**
 * Discovery mode, the pure part: what the game recognises, the bonding rules, where a new
 * atom is placed and what is saved. Nothing here touches the world, so it can be tested
 * on its own. Atoms are heavy atoms only; hydrogens are implied, as in the levels.
 */

export const VALENCE: Record<ElementSymbol, number> = { C: 4, N: 3, O: 2 };

export type BondOrder = 1 | 2;

export interface Graph {
  els: ElementSymbol[];
  bonds: Array<[number, number, BondOrder]>;
}

export interface Known {
  id: string;
  name: string;
  fact: string;
  /** True for the small molecules that exist only in Discovery mode (not a level). */
  small: boolean;
  graph: Graph;
}

const ring6: Graph = {
  els: ['C', 'C', 'C', 'C', 'C', 'C'],
  bonds: [
    [0, 1, 2],
    [1, 2, 1],
    [2, 3, 2],
    [3, 4, 1],
    [4, 5, 2],
    [5, 0, 1],
  ],
};

/** The nine small molecules and their fun facts (texts approved by the user). */
const SMALL: Known[] = [
  {
    id: 'methane',
    name: 'Methane',
    fact: 'Methane (CH4) is the simplest organic molecule: one carbon atom with four hydrogens. It is the main gas in natural gas.',
    small: true,
    graph: { els: ['C'], bonds: [] },
  },
  {
    id: 'ammonia',
    name: 'Ammonia',
    fact: 'Ammonia (NH3) is one nitrogen atom with three hydrogens. It is used to make fertilizers for crops.',
    small: true,
    graph: { els: ['N'], bonds: [] },
  },
  {
    id: 'water',
    name: 'Water',
    fact: 'Water (H2O) is one oxygen atom with two hydrogens. Almost every living thing on Earth needs it.',
    small: true,
    graph: { els: ['O'], bonds: [] },
  },
  {
    id: 'oxygen',
    name: 'Oxygen',
    fact: 'Oxygen gas (O2) is two oxygen atoms joined by a double bond. It makes up about one fifth of the air.',
    small: true,
    graph: { els: ['O', 'O'], bonds: [[0, 1, 2]] },
  },
  {
    id: 'carbon-dioxide',
    name: 'Carbon dioxide',
    fact: 'Carbon dioxide (CO2) is a carbon atom with a double bond to an oxygen on each side. Plants take it in from the air, and the bubbles in fizzy drinks are made of it.',
    small: true,
    graph: {
      els: ['O', 'C', 'O'],
      bonds: [
        [0, 1, 2],
        [1, 2, 2],
      ],
    },
  },
  {
    id: 'ethene',
    name: 'Ethene',
    fact: 'Ethene (C2H4), also called ethylene, is a small gas made by plants. Fruit gives it off as it ripens.',
    small: true,
    graph: { els: ['C', 'C'], bonds: [[0, 1, 2]] },
  },
  {
    id: 'acetic-acid',
    name: 'Acetic acid',
    fact: 'Acetic acid (C2H4O2) is the sour part of vinegar. Vinegar is mostly water with a few percent acetic acid.',
    small: true,
    graph: {
      els: ['C', 'C', 'O', 'O'],
      bonds: [
        [0, 1, 1],
        [1, 2, 2],
        [1, 3, 1],
      ],
    },
  },
  {
    id: 'urea',
    name: 'Urea',
    fact: 'Urea (CH4N2O) is a small molecule the body makes when it breaks down proteins. In 1828 Friedrich Woehler made it in a lab from simple chemicals, an important step in chemistry.',
    small: true,
    graph: {
      els: ['N', 'C', 'O', 'N'],
      bonds: [
        [0, 1, 1],
        [1, 2, 2],
        [1, 3, 1],
      ],
    },
  },
  {
    id: 'benzene',
    name: 'Benzene',
    fact: 'Benzene (C6H6) is a ring of six carbon atoms. The same ring sits inside paracetamol, aspirin, ibuprofen and vanillin.',
    small: true,
    graph: ring6,
  },
];

/** Everything Discovery mode can name: the nine small molecules, then the nine levels. */
export const KNOWN: Known[] = [
  ...SMALL,
  ...LEVELS.map((l) => ({
    id: l.id,
    name: l.name,
    fact: l.fact,
    small: false,
    graph: { els: l.slots.map((s) => s.element), bonds: l.bonds as Graph['bonds'] },
  })),
];

export const KNOWN_COUNT = KNOWN.length;

// --- matching ---------------------------------------------------------------------------

/** Bond orders doubled so that an aromatic bond (a 6-carbon ring) fits between: 2, 3, 4. */
const SINGLE = 2;
const AROMATIC = 3;
const DOUBLE = 4;

interface Norm {
  els: ElementSymbol[];
  adj: Array<Array<{ to: number; o: number }>>;
  edgeCount: number;
}

/**
 * Builds the comparable form of a graph. Six-carbon rings whose bonds alternate single and
 * double count as aromatic, so either way of drawing the double bonds gives the same ring.
 */
function normalise(g: Graph): Norm {
  const n = g.els.length;
  const order = new Map<string, number>();
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const nbrs: number[][] = g.els.map(() => []);
  for (const [a, b, o] of g.bonds) {
    order.set(key(a, b), o === 2 ? DOUBLE : SINGLE);
    nbrs[a].push(b);
    nbrs[b].push(a);
  }
  const aromatic = new Set<string>();
  const path: number[] = [];
  const walk = (start: number, node: number) => {
    path.push(node);
    if (path.length === 6) {
      if (nbrs[node].includes(start)) {
        const ring = path.slice();
        if (ring.every((i) => g.els[i] === 'C')) {
          const orders = ring.map((v, i) => order.get(key(v, ring[(i + 1) % 6]))!);
          const doubles = orders.filter((o) => o === DOUBLE).length;
          if (doubles === 3 && orders.every((o, i) => o !== orders[(i + 1) % 6])) {
            ring.forEach((v, i) => aromatic.add(key(v, ring[(i + 1) % 6])));
          }
        }
      }
    } else {
      for (const next of nbrs[node]) {
        if (next > start && !path.includes(next)) walk(start, next);
      }
    }
    path.pop();
  };
  for (let s = 0; s < n; s++) walk(s, s);

  const adj: Norm['adj'] = g.els.map(() => []);
  for (const [a, b] of g.bonds) {
    const k = key(a, b);
    const o = aromatic.has(k) ? AROMATIC : order.get(k)!;
    adj[a].push({ to: b, o });
    adj[b].push({ to: a, o });
  }
  return { els: g.els, adj, edgeCount: g.bonds.length };
}

function sameShape(a: Norm, b: Norm): boolean {
  if (a.els.length !== b.els.length || a.edgeCount !== b.edgeCount) return false;
  const profile = (m: Norm) =>
    m.els
      .map((e, i) => `${e}${m.adj[i].length}:${m.adj[i].map((x) => x.o).sort().join('')}`)
      .sort()
      .join('|');
  return profile(a) === profile(b);
}

/** Exact graph match: same elements, same bonds, same bond orders, in any arrangement. */
function isomorphic(a: Norm, b: Norm): boolean {
  if (!sameShape(a, b)) return false;
  const n = a.els.length;
  if (n === 0) return false;
  // Visit a's atoms breadth-first so each one after the first touches a matched atom.
  const start = a.adj.reduce((best, nb, i) => (nb.length > a.adj[best].length ? i : best), 0);
  const order: number[] = [start];
  const parent = new Array<number>(n).fill(-1);
  const seen = new Array<boolean>(n).fill(false);
  seen[start] = true;
  for (let h = 0; h < order.length; h++) {
    for (const { to } of a.adj[order[h]]) {
      if (!seen[to]) {
        seen[to] = true;
        parent[to] = order[h];
        order.push(to);
      }
    }
  }
  if (order.length !== n) return false; // not one piece
  const map = new Array<number>(n).fill(-1);
  const used = new Array<boolean>(n).fill(false);
  const fits = (av: number, bv: number): boolean => {
    if (a.els[av] !== b.els[bv] || a.adj[av].length !== b.adj[bv].length) return false;
    let matchedA = 0;
    for (const { to, o } of a.adj[av]) {
      if (map[to] < 0) continue;
      matchedA++;
      const hit = b.adj[bv].find((x) => x.to === map[to]);
      if (!hit || hit.o !== o) return false;
    }
    let matchedB = 0;
    for (const { to } of b.adj[bv]) if (used[to]) matchedB++;
    return matchedA === matchedB;
  };
  const place = (k: number): boolean => {
    if (k === n) return true;
    const av = order[k];
    const candidates =
      parent[av] < 0 ? b.els.map((_, i) => i) : b.adj[map[parent[av]]].map((x) => x.to);
    for (const bv of candidates) {
      if (used[bv] || !fits(av, bv)) continue;
      map[av] = bv;
      used[bv] = true;
      if (place(k + 1)) return true;
      map[av] = -1;
      used[bv] = false;
    }
    return false;
  };
  return place(0);
}

const KNOWN_NORM = KNOWN.map((k) => normalise(k.graph));

/** The known molecule this structure is, or null. */
export function recognise(g: Graph): Known | null {
  if (g.els.length === 0) return null;
  const norm = normalise(g);
  for (let i = 0; i < KNOWN.length; i++) {
    if (isomorphic(norm, KNOWN_NORM[i])) return KNOWN[i];
  }
  return null;
}

// --- bonding rules ------------------------------------------------------------------------

/** Total bond order of an atom in the graph. */
export function bondSum(g: Graph, atom: number): number {
  let sum = 0;
  for (const [a, b, o] of g.bonds) if (a === atom || b === atom) sum += o;
  return sum;
}

export function freeValence(g: Graph, atom: number): number {
  return VALENCE[g.els[atom]] - bondSum(g, atom);
}

// --- placement ----------------------------------------------------------------------------

/** Bond length drawn in the build plane, a little more than the levels' 1.4 A at 0.068. */
export const BOND_LENGTH = 0.095;
/** Atoms (diameter about 0.073) must stay at least this far apart. */
export const MIN_GAP = 0.082;
/** A release this close to an atom of the build counts as bringing it to that atom. */
export const ATTACH_RANGE = 0.14;
/** The build area in the vertical plane: x in [-ZONE_X, ZONE_X], y in [ZONE_Y0, ZONE_Y1]. */
export const ZONE_X = 0.34;
export const ZONE_Y0 = 0.98;
export const ZONE_Y1 = 1.42;
export const MAX_ATOMS = 24;

export interface Pt {
  x: number;
  y: number;
}

/**
 * Where a new atom released at `drop` sits when it bonds to `from`: bond length away, along
 * the free direction (every 30 degrees) closest to where the player dropped it. Null when
 * every direction is crowded or outside the build area.
 */
export function attachPoint(from: Pt, drop: Pt, others: Pt[]): Pt | null {
  const want = Math.atan2(drop.y - from.y, drop.x - from.x);
  const steps: number[] = [];
  for (let k = 0; k < 12; k++) steps.push(k);
  const angleOf = (k: number) => (k * Math.PI) / 6;
  const diff = (k: number) => {
    let d = Math.abs(angleOf(k) - want) % (2 * Math.PI);
    if (d > Math.PI) d = 2 * Math.PI - d;
    return d;
  };
  steps.sort((a, b) => diff(a) - diff(b));
  for (const k of steps) {
    const p = { x: from.x + BOND_LENGTH * Math.cos(angleOf(k)), y: from.y + BOND_LENGTH * Math.sin(angleOf(k)) };
    if (Math.abs(p.x) > ZONE_X || p.y < ZONE_Y0 || p.y > ZONE_Y1) continue;
    if (others.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < MIN_GAP)) continue;
    return p;
  }
  return null;
}

/** The first atom is kept in the middle of the area so the molecule has room to grow. */
export function firstPoint(drop: Pt): Pt {
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  return { x: clamp(drop.x, -0.12, 0.12), y: clamp(drop.y, 1.1, 1.28) };
}

// --- saving -------------------------------------------------------------------------------

const KEY = 'molecule-lab:discovery:v1';

export interface DiscoverySave {
  /** True when the player left the game in Discovery mode. */
  active: boolean;
  /** Ids of the molecules found so far. */
  found: string[];
  nodes: Array<[ElementSymbol, number, number]>;
  bonds: Array<[number, number, BondOrder]>;
  /** The "Bond: Double" toggle. */
  double: boolean;
}

export const EMPTY_SAVE: DiscoverySave = { active: false, found: [], nodes: [], bonds: [], double: false };

export function loadDiscovery(): DiscoverySave {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_SAVE, found: [], nodes: [], bonds: [] };
    const d = JSON.parse(raw) as Partial<DiscoverySave>;
    const ids = new Set(KNOWN.map((k) => k.id));
    const nodes = (Array.isArray(d.nodes) ? d.nodes : []).filter(
      (n) => Array.isArray(n) && n[0] in VALENCE && Number.isFinite(n[1]) && Number.isFinite(n[2]),
    );
    const bonds = (Array.isArray(d.bonds) ? d.bonds : []).filter(
      (b) =>
        Array.isArray(b) &&
        b[0] >= 0 &&
        b[1] >= 0 &&
        b[0] < nodes.length &&
        b[1] < nodes.length &&
        (b[2] === 1 || b[2] === 2),
    );
    return {
      active: d.active === true,
      found: (Array.isArray(d.found) ? d.found : []).filter((id) => ids.has(id)),
      nodes: nodes.slice(0, MAX_ATOMS),
      bonds,
      double: d.double === true,
    };
  } catch {
    return { ...EMPTY_SAVE, found: [], nodes: [], bonds: [] };
  }
}

export function saveDiscovery(s: DiscoverySave): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: the build just is not remembered */
  }
}
