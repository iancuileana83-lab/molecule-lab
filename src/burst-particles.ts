import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Points,
  PointsMaterial,
  Vector3,
} from '@iwsdk/core';

const COUNT = 48;
const LIFETIME = 1.3;

/**
 * A small, cheap celebration burst: one Points object, preallocated buffers,
 * no per-frame allocation. Sparks drift outward and upward, then fade.
 */
export class BurstParticles {
  readonly points: Points;
  private positions = new Float32Array(COUNT * 3);
  private velocities = new Float32Array(COUNT * 3);
  private material = new PointsMaterial({
    color: 0xfff2b0,
    size: 0.022,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  private geometry = new BufferGeometry();
  private age = LIFETIME;

  private sparkTexture = BurstParticles.makeSparkTexture();

  constructor() {
    this.material.map = this.sparkTexture;
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    this.points = new Points(this.geometry, this.material);
    this.points.name = 'CompletionBurst';
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  /** Starts a burst centred on `center` (world space; the root sits at the origin). */
  start(center: Vector3): void {
    for (let i = 0; i < COUNT; i++) {
      // Deterministic spread on a sphere (golden-angle spiral).
      const y = 1 - (2 * (i + 0.5)) / COUNT;
      const r = Math.sqrt(1 - y * y);
      const a = i * 2.39996;
      const speed = 0.14 + (i % 5) * 0.03;
      this.velocities[i * 3] = Math.cos(a) * r * speed;
      this.velocities[i * 3 + 1] = y * speed + 0.06;
      this.velocities[i * 3 + 2] = Math.sin(a) * r * speed * 0.5;
      this.positions[i * 3] = center.x;
      this.positions[i * 3 + 1] = center.y;
      this.positions[i * 3 + 2] = center.z;
    }
    this.age = 0;
    this.points.visible = true;
  }

  update(delta: number): void {
    if (this.age >= LIFETIME) return;
    this.age += delta;
    const drag = Math.max(0, 1 - delta * 1.5);
    for (let i = 0; i < COUNT * 3; i++) {
      this.positions[i] += this.velocities[i] * delta;
      this.velocities[i] *= drag;
    }
    (this.geometry.attributes.position as BufferAttribute).needsUpdate = true;
    const t = this.age / LIFETIME;
    this.material.opacity = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / 0.85);
    if (this.age >= LIFETIME) this.points.visible = false;
  }

  /** Soft round glow so each point reads as a spark, not a square. */
  private static makeSparkTexture(): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const g = canvas.getContext('2d');
    if (g) {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.35, 'rgba(255,255,255,0.8)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    }
    return new CanvasTexture(canvas);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.sparkTexture.dispose();
  }
}
