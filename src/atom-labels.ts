import { CanvasTexture, SRGBColorSpace, Sprite, SpriteMaterial } from '@iwsdk/core';
import type { ElementSymbol } from './levels/types.js';

const LABEL_SIZE = 0.03;

/**
 * Element letters (C, N, O) drawn once into canvas textures and shown as
 * camera-facing sprites. Built at runtime (canvas needs the DOM), never in
 * the asset manifest. Letters are drawn on top so they stay readable on the
 * sphere surface.
 */
export class AtomLabels {
  private textures = {} as Record<ElementSymbol, CanvasTexture>;
  private solid = {} as Record<ElementSymbol, SpriteMaterial>;
  private faint = {} as Record<ElementSymbol, SpriteMaterial>;

  constructor() {
    for (const el of ['C', 'N', 'O'] as const) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const g = canvas.getContext('2d');
      if (g) {
        g.font = 'bold 88px system-ui, Arial, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineWidth = 10;
        g.strokeStyle = 'rgba(0, 0, 0, 0.55)';
        g.strokeText(el, 64, 70);
        g.fillStyle = '#ffffff';
        g.fillText(el, 64, 70);
      }
      const tex = new CanvasTexture(canvas);
      tex.colorSpace = SRGBColorSpace;
      this.textures[el] = tex;
      const mat = (opacity: number) =>
        new SpriteMaterial({
          map: tex,
          transparent: true,
          opacity,
          depthTest: false,
          depthWrite: false,
        });
      this.solid[el] = mat(0.95);
      this.faint[el] = mat(0.45);
    }
  }

  /** A letter sprite; `faint` for guide spots. Draws after the scene. */
  create(el: ElementSymbol, faint = false): Sprite {
    const s = new Sprite(faint ? this.faint[el] : this.solid[el]);
    s.name = `Label${el}`;
    s.scale.setScalar(LABEL_SIZE);
    s.renderOrder = 10;
    return s;
  }

  dispose(): void {
    for (const el of ['C', 'N', 'O'] as const) {
      this.textures[el].dispose();
      this.solid[el].dispose();
      this.faint[el].dispose();
    }
  }
}
