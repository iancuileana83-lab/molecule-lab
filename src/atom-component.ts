import { createComponent, Types } from '@iwsdk/core';

export const Elements = { C: 'C', N: 'N', O: 'O' } as const;

/** A heavy atom the player can grab and bond into the target molecule. */
export const Atom = createComponent('Atom', {
  element: {
    type: Types.Enum,
    default: Elements.C,
    enum: Elements,
    label: 'Element',
  },
  slot: {
    type: Types.Int8,
    default: -1,
    label: 'Molecule slot',
    help: '-1 = free atom; 0 = pre-placed seed of the molecule.',
  },
  // Runtime state below; written by MoleculeSystem.
  home: { type: Types.Vec3, default: [0, 0, 0] },
  tweenFrom: { type: Types.Vec3, default: [0, 0, 0] },
  tweenTo: { type: Types.Vec3, default: [0, 0, 0] },
  tweenTime: { type: Types.Float32, default: -1 },
  tweenDuration: { type: Types.Float32, default: 0.2 },
  flashTime: { type: Types.Float32, default: 0 },
  flashGood: { type: Types.Boolean, default: true },
  /** Seconds since the placement "pop" began; >= POP_TIME means idle. */
  popTime: { type: Types.Float32, default: 1 },
});

/** A bond stick spawned between two placed atoms. */
export const Bond = createComponent('Bond', {});
