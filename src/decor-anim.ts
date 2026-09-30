import { Color, Mesh, MeshBasicMaterial, Object3D } from '@iwsdk/core';

const BASE = 0xffd9a0;
const FLASH = 0xfff6e0;
const FLASH_SECONDS = 0.9;

/**
 * Drives the two lantern glows of the apothecary: they fade up when the
 * player enters VR and give a brief warm flash on the first bond. The glow
 * is one shared basic material, so this is a colour change only (no lights).
 */
export class LanternGlow {
  private readonly mat?: MeshBasicMaterial;
  private readonly base = new Color(BASE);
  private readonly flashColor = new Color(FLASH);
  private level = 1;
  private flashT = 0;

  constructor(room: Object3D) {
    const mesh = room.getObjectByName('glow') as Mesh | undefined;
    this.mat = mesh?.material as MeshBasicMaterial | undefined;
  }

  /** 0 = dim, 1 = full brightness. */
  setLevel(k: number): void {
    this.level = k;
    this.apply();
  }

  flash(): void {
    this.flashT = 1;
    this.apply();
  }

  update(delta: number): void {
    if (this.flashT <= 0) return;
    this.flashT = Math.max(0, this.flashT - delta / FLASH_SECONDS);
    this.apply();
  }

  private apply(): void {
    if (!this.mat) return;
    this.mat.color
      .copy(this.base)
      .multiplyScalar(this.level)
      .lerp(this.flashColor, this.flashT * 0.85);
  }
}
