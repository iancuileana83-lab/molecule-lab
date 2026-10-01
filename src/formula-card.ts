import { CanvasTexture, SRGBColorSpace } from '@iwsdk/core';
import type { ElementSymbol, MoleculeLevel } from './levels/types.js';

const W = 772;
const H = 360;
const MARGIN_X = 64;
const MARGIN_Y = 40;
const PAPER = '#fbf8ef';
const PAPER_EDGE = '#ddd5bf';
/** Not placed yet: faint "pencil". */
const PENCIL = '#d3cdbd';
const INK = '#2b2b2b';
const ELEMENT_COLOR: Record<ElementSymbol, string> = {
  C: '#3a3e44',
  N: '#3d6ee0',
  O: '#e0463a',
};
const VALENCE: Record<ElementSymbol, number> = { C: 4, N: 3, O: 2 };
const CARBON_DOT = 8;
const LABEL_RADIUS = 27;
const DOUBLE_OFFSET = 6;
const PULSE_TIME = 0.7;
/** Redraw at most every 40 ms while the pulse plays. */
const PULSE_STEP = 0.04;

interface Node {
  x: number;
  y: number;
  /** Heteroatom label such as "OH" / "HN" / "O"; empty for carbon. */
  label: string;
}

/**
 * A textbook-style structural formula drawn on a small canvas that the panel
 * shows as an image. Atoms and bonds start as faint pencil and take their ink
 * (element colour for O and N) as the player places them; the newest atom
 * gets a short golden pulse. It is redrawn only when something changes, and
 * the layout reuses the guide's 2D coordinates, so it always matches the
 * molecule being built.
 */
export class FormulaCard {
  readonly canvas = document.createElement('canvas');
  readonly texture: CanvasTexture;
  private readonly ctx: CanvasRenderingContext2D | null;
  private level?: MoleculeLevel;
  private nodes: Node[] = [];
  private filled: boolean[] = [];
  private newest = -1;
  private pulse = PULSE_TIME;
  private sinceDraw = 0;

  constructor() {
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.anisotropy = 4;
  }

  /** Lays out a new molecule; every atom starts unplaced. */
  setLevel(level: MoleculeLevel): void {
    this.level = level;
    const xs = level.slots.map((s) => s.x);
    const ys = level.slots.map((s) => s.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const scale = Math.min(
      (W - 2 * MARGIN_X) / Math.max(maxX - minX, 1),
      (H - 2 * MARGIN_Y) / Math.max(maxY - minY, 1),
    );
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    this.nodes = level.slots.map((s, i) => {
      const x = W / 2 + (s.x - cx) * scale;
      const y = H / 2 - (s.y - cy) * scale;
      if (s.element === 'C') return { x, y, label: '' };
      // Implicit hydrogens, as a textbook writes them (OH, NH).
      let bondSum = 0;
      let neighbourX = 0;
      let neighbours = 0;
      for (const [a, b, order] of level.bonds) {
        const other = a === i ? b : b === i ? a : -1;
        if (other < 0) continue;
        bondSum += order;
        neighbourX += level.slots[other].x;
        neighbours++;
      }
      const hydrogens = Math.max(VALENCE[s.element] - bondSum, 0);
      if (hydrogens === 0) return { x, y, label: s.element };
      const hOnLeft = neighbours > 0 && neighbourX / neighbours > s.x;
      const h = hydrogens > 1 ? `H${hydrogens}` : 'H';
      return { x, y, label: hOnLeft ? `${h}${s.element}` : `${s.element}${h}` };
    });
    this.filled = [];
    this.newest = -1;
    this.pulse = PULSE_TIME;
    this.draw();
  }

  /** `newest` (a slot) starts the golden pulse; pass -1 for a plain redraw. */
  update(filled: boolean[], newest = -1): void {
    this.filled = filled;
    if (newest >= 0) {
      this.newest = newest;
      this.pulse = 0;
    }
    this.draw();
  }

  /** Advances the pulse; cheap when idle. */
  tick(delta: number): void {
    if (this.pulse >= PULSE_TIME) return;
    this.pulse += delta;
    this.sinceDraw += delta;
    if (this.sinceDraw < PULSE_STEP && this.pulse < PULSE_TIME) return;
    this.sinceDraw = 0;
    this.draw();
  }

  private draw(): void {
    const g = this.ctx;
    const level = this.level;
    if (!g || !level) return;
    g.clearRect(0, 0, W, H);
    g.fillStyle = PAPER;
    g.beginPath();
    g.roundRect(4, 4, W - 8, H - 8, 26);
    g.fill();
    g.strokeStyle = PAPER_EDGE;
    g.lineWidth = 5;
    g.stroke();

    g.lineCap = 'round';
    for (const [a, b, order] of level.bonds) {
      const lit = !!this.filled[a] && !!this.filled[b];
      this.drawBond(g, a, b, order, lit);
    }
    this.nodes.forEach((n, i) => {
      const lit = !!this.filled[i];
      const el = level.slots[i].element;
      if (n.label === '') {
        g.fillStyle = lit ? ELEMENT_COLOR.C : PENCIL;
        g.beginPath();
        g.arc(n.x, n.y, CARBON_DOT, 0, Math.PI * 2);
        g.fill();
      } else {
        g.font = 'bold 40px system-ui, Arial, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = lit ? ELEMENT_COLOR[el] : PENCIL;
        // Keep the heteroatom letter itself on the bond axis.
        g.fillText(n.label, n.x, n.y + 2);
      }
    });

    if (this.newest >= 0 && this.pulse < PULSE_TIME) {
      const n = this.nodes[this.newest];
      const k = this.pulse / PULSE_TIME;
      g.strokeStyle = `rgba(232, 168, 20, ${0.95 * (1 - k)})`;
      g.lineWidth = 7;
      g.beginPath();
      g.arc(n.x, n.y, 16 + 40 * k, 0, Math.PI * 2);
      g.stroke();
    }
    this.texture.needsUpdate = true;
  }

  private drawBond(
    g: CanvasRenderingContext2D,
    a: number,
    b: number,
    order: 1 | 2,
    lit: boolean,
  ): void {
    const pa = this.nodes[a];
    const pb = this.nodes[b];
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const ra = pa.label === '' ? CARBON_DOT : LABEL_RADIUS;
    const rb = pb.label === '' ? CARBON_DOT : LABEL_RADIUS;
    const x1 = pa.x + ux * ra;
    const y1 = pa.y + uy * ra;
    const x2 = pb.x - ux * rb;
    const y2 = pb.y - uy * rb;
    g.strokeStyle = lit ? INK : PENCIL;
    g.lineWidth = 5;
    const offsets = order === 2 ? [DOUBLE_OFFSET, -DOUBLE_OFFSET] : [0];
    for (const o of offsets) {
      g.beginPath();
      g.moveTo(x1 - uy * o, y1 + ux * o);
      g.lineTo(x2 - uy * o, y2 + ux * o);
      g.stroke();
    }
  }

  dispose(): void {
    this.texture.dispose();
  }
}
