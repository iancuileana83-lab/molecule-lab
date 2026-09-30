import {
  CanvasTexture,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SRGBColorSpace,
} from '@iwsdk/core';
import { LABEL_CELLS, LABEL_TEXTS } from './scene-assets/lab-room.scene-asset.js';

const PAPER = '#f3e6c8';
const INK = '#4a3320';
const BRASS = '#d6a94a';

/**
 * Paints the parts of the apothecary that need text or drawing: Latin jar
 * labels (plus one "Rx") and the Hygeia bowl on the wall sign. Canvas needs the
 * DOM, so this runs in the app only; the manifest asset stays DOM-free and
 * simply shows blank paper / a plain plaque in the editor preview.
 * Returns a function that frees the textures.
 */
export function paintDecor(room: Object3D): () => void {
  const textures: CanvasTexture[] = [];
  const apply = (name: string, canvas: HTMLCanvasElement) => {
    const mesh = room.getObjectByName(name) as Mesh | undefined;
    const mat = mesh?.material as MeshStandardMaterial | undefined;
    if (!mat) return;
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    mat.map = tex;
    mat.color.setHex(0xffffff);
    mat.needsUpdate = true;
    textures.push(tex);
  };
  apply('labels', paintLabels());
  apply('HygeiaSign', paintSign());
  return () => textures.forEach((t) => t.dispose());
}

function newCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function paintLabels(): HTMLCanvasElement {
  const cw = 256;
  const ch = 128;
  const [canvas, g] = newCanvas(cw * LABEL_CELLS.cols, ch * LABEL_CELLS.rows);
  if (!g) return canvas;
  LABEL_TEXTS.forEach((text, i) => {
    const x = (i % LABEL_CELLS.cols) * cw;
    const y = Math.floor(i / LABEL_CELLS.cols) * ch;
    g.fillStyle = PAPER;
    g.fillRect(x, y, cw, ch);
    g.strokeStyle = '#7a5c3a';
    g.lineWidth = 4;
    g.strokeRect(x + 8, y + 8, cw - 16, ch - 16);
    g.lineWidth = 1.5;
    g.strokeRect(x + 15, y + 15, cw - 30, ch - 30);
    g.fillStyle = INK;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let size = text === 'Rx' ? 78 : 44;
    const face = (s: number) => `italic 700 ${s}px Georgia, "Times New Roman", serif`;
    g.font = face(size);
    while (g.measureText(text).width > cw - 56 && size > 12) g.font = face((size -= 2));
    g.fillText(text, x + cw / 2, y + ch / 2 + 3);
  });
  return canvas;
}

/** The bowl of Hygeia: a chalice with a serpent, in brass on dark wood. */
function paintSign(): HTMLCanvasElement {
  const w = 512;
  const h = 420;
  const [canvas, g] = newCanvas(w, h);
  if (!g) return canvas;
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#5a3a24');
  bg.addColorStop(1, '#3f2716');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = BRASS;
  g.lineWidth = 6;
  g.strokeRect(14, 14, w - 28, h - 28);

  g.fillStyle = BRASS;
  g.strokeStyle = BRASS;
  g.lineCap = 'round';
  // Foot and stem.
  g.beginPath();
  g.ellipse(256, 350, 70, 14, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(247, 240, 18, 110);
  // Bowl, with a darker opening on top.
  g.beginPath();
  g.moveTo(160, 160);
  g.bezierCurveTo(165, 265, 347, 265, 352, 160);
  g.closePath();
  g.fill();
  g.fillStyle = '#7a5a20';
  g.beginPath();
  g.ellipse(256, 160, 96, 17, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = BRASS;
  g.lineWidth = 6;
  g.beginPath();
  g.ellipse(256, 160, 96, 17, 0, 0, Math.PI * 2);
  g.stroke();
  // Serpent coiled round the stem, head rising beside the bowl.
  g.strokeStyle = '#8fbf8f';
  g.lineWidth = 15;
  g.beginPath();
  g.moveTo(256, 340);
  g.bezierCurveTo(318, 322, 318, 292, 256, 280);
  g.bezierCurveTo(194, 268, 194, 240, 256, 232);
  g.bezierCurveTo(330, 222, 372, 180, 366, 118);
  g.stroke();
  g.fillStyle = '#8fbf8f';
  g.beginPath();
  g.ellipse(368, 106, 17, 12, -0.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = INK;
  g.beginPath();
  g.arc(374, 102, 3, 0, Math.PI * 2);
  g.fill();
  return canvas;
}
