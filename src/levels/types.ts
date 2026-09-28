export type ElementSymbol = 'C' | 'N' | 'O';

/**
 * A target molecule, heavy atoms only (hydrogens implicit). Slot coordinates
 * are a flat 2D layout in angstroms; the game centres and scales them into a
 * vertical plane in front of the player. Slot 0 is the pre-placed seed.
 */
export interface MoleculeLevel {
  id: string;
  name: string;
  slots: Array<{ element: ElementSymbol; x: number; y: number }>;
  /** [slotA, slotB, bondOrder] */
  bonds: Array<[number, number, 1 | 2]>;
  fact: string;
  /** Finishing within this many seconds earns the time star. */
  starTimeSec: number;
}
