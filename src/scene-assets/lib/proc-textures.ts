import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from '@iwsdk/core';

/**
 * Small tileable textures computed from math only (no DOM, no images), so the
 * asset manifest stays deterministic in both the app and editor realms.
 */

function hash(x: number, y: number, seed: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Smooth value noise that repeats every `period` lattice cells on both axes. */
function noise(x: number, y: number, period: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const at = (i: number, j: number) => hash(((i % period) + period) % period, ((j % period) + period) % period, seed);
  const a = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
  const b = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
  return a * (1 - sy) + b * sy;
}

function texture(size: number, paint: (u: number, v: number, x: number, y: number) => [number, number, number]): DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = paint(x / size, y / size, x, y);
      const i = (y * size + x) * 4;
      data[i] = Math.max(0, Math.min(255, r * 255));
      data[i + 1] = Math.max(0, Math.min(255, g * 255));
      data[i + 2] = Math.max(0, Math.min(255, b * 255));
      data[i + 3] = 255;
    }
  }
  const t = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/**
 * Light neutral wood: planks with grain and dark seams. Meant to be tinted by
 * the material colour (walnut, oak, floor boards all share this one texture).
 */
export function makeWoodTexture(): DataTexture {
  const planks = 4;
  return texture(256, (u, v) => {
    const plank = Math.floor(v * planks);
    const local = v * planks - plank; // 0..1 across one plank
    const tone = 0.86 + 0.14 * hash(plank, 3, 11);
    // Grain runs along u; period-8 noise keeps it tileable.
    const warp = noise(u * 8, v * 40 + plank * 5, 8, 21) * 5;
    const grain = 0.5 + 0.5 * Math.sin(v * 300 + warp * 3);
    const fine = noise(u * 8, v * 64, 8, 5);
    let value = tone * (0.86 + 0.09 * grain + 0.05 * fine);
    if (local < 0.03 || local > 0.97) value *= 0.55; // seam between planks
    const end = Math.floor(u * 2 + hash(plank, 9, 4)); // staggered butt joints
    if (Math.abs(u * 2 + hash(plank, 9, 4) - end) < 0.006) value *= 0.6;
    return [value, value * 0.97, value * 0.93];
  });
}

/** Cream marble with soft grey-brown veins; used at full colour. */
export function makeMarbleTexture(): DataTexture {
  return texture(128, (u, v) => {
    const warp = noise(u * 4, v * 4, 4, 33) * 1.6;
    const vein = Math.abs(Math.sin((u * 3 + v * 2 + warp) * Math.PI * 1.6));
    const fine = Math.abs(Math.sin((u * 5 - v * 4 + warp * 1.7) * Math.PI * 1.6));
    const line = Math.pow(1 - vein, 36) + 0.6 * Math.pow(1 - fine, 48); // hairline veins
    const cloud = noise(u * 4, v * 4, 4, 8) * 0.06;
    const base = 0.91 + cloud - line * 0.1;
    return [base, base * 0.965, base * 0.9];
  });
}

/** Faint vertical stripes for the plaster wall; tinted by the wall colour. */
export function makeWallpaperTexture(): DataTexture {
  return texture(64, (u, v) => {
    const stripe = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 4);
    const speck = noise(u * 16, v * 16, 16, 2) * 0.03;
    const value = 0.955 + 0.03 * stripe + speck;
    return [value, value, value];
  });
}

/** Burgundy rug with a cream border and a small diamond motif. */
export function makeRugTexture(): DataTexture {
  return texture(128, (u, v) => {
    const dx = Math.abs(u - 0.5) * 2;
    const dy = Math.abs(v - 0.5) * 2;
    const edge = Math.max(dx, dy);
    const speck = noise(u * 32, v * 32, 32, 6) * 0.05;
    if (edge > 0.9) return [0.13, 0.09, 0.07];
    if (edge > 0.82) return [0.9, 0.82, 0.64];
    if (edge > 0.78) return [0.13, 0.09, 0.07];
    const diamond = (dx + dy) % 0.5 < 0.06 ? 0.16 : 0;
    return [0.5 + diamond + speck, 0.17 + diamond * 0.6 + speck * 0.3, 0.15 + diamond * 0.4];
  });
}
