import {
  BufferAttribute,
  BufferGeometry,
  Euler,
  Group,
  Material,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
} from '@iwsdk/core';

/**
 * Collects many small shapes per material and merges each material into one
 * mesh, so a detailed room costs a handful of draw calls instead of hundreds.
 * Deterministic and DOM-free, so it is safe inside the asset manifest.
 */
export class GeoBatch {
  private buckets = new Map<string, BufferGeometry[]>();
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly e = new Euler();
  private readonly p = new Vector3();
  private readonly s = new Vector3();

  /**
   * Adds `geo` under a material key, placed with position, Euler rotation
   * (radians) and scale. `uv` optionally scales texture coordinates (tiling).
   */
  add(
    key: string,
    geo: BufferGeometry,
    pos: [number, number, number] = [0, 0, 0],
    rot: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1],
    uv: [number, number] = [1, 1],
  ): void {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    this.e.set(rot[0], rot[1], rot[2]);
    this.q.setFromEuler(this.e);
    this.p.set(pos[0], pos[1], pos[2]);
    this.s.set(scale[0], scale[1], scale[2]);
    this.m.compose(this.p, this.q, this.s);
    g.applyMatrix4(this.m);
    if (uv[0] !== 1 || uv[1] !== 1) {
      const a = g.getAttribute('uv');
      for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * uv[0], a.getY(i) * uv[1]);
    }
    let list = this.buckets.get(key);
    if (!list) this.buckets.set(key, (list = []));
    list.push(g);
  }

  /** Merges every bucket into one named mesh using `materials[key]`. */
  build(materials: Record<string, Material>, name: string): Group {
    const root = new Group();
    root.name = name;
    for (const [key, list] of this.buckets) {
      const material = materials[key];
      if (!material) throw new Error(`GeoBatch: no material for "${key}"`);
      let count = 0;
      for (const g of list) count += g.getAttribute('position').count;
      const position = new Float32Array(count * 3);
      const normal = new Float32Array(count * 3);
      const uvs = new Float32Array(count * 2);
      let v = 0;
      for (const g of list) {
        const pa = g.getAttribute('position');
        const na = g.getAttribute('normal');
        const ua = g.getAttribute('uv');
        for (let i = 0; i < pa.count; i++, v++) {
          position.set([pa.getX(i), pa.getY(i), pa.getZ(i)], v * 3);
          normal.set([na.getX(i), na.getY(i), na.getZ(i)], v * 3);
          uvs.set(ua ? [ua.getX(i), ua.getY(i)] : [0, 0], v * 2);
        }
        g.dispose();
      }
      const merged = new BufferGeometry();
      merged.setAttribute('position', new BufferAttribute(position, 3));
      merged.setAttribute('normal', new BufferAttribute(normal, 3));
      merged.setAttribute('uv', new BufferAttribute(uvs, 2));
      const mesh = new Mesh(merged, material);
      mesh.name = key;
      root.add(mesh);
    }
    this.buckets.clear();
    return root;
  }
}
