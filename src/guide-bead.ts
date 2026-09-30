import {
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
} from '@iwsdk/core';

const LOOP_SECONDS = 2.2;
const ARC_HEIGHT = 0.035;
/** Lifted toward the player so the bead is never hidden inside an atom. */
const Z_LIFT = 0.045;

/**
 * A small glowing bead that travels from an atom to its target, again and
 * again, while the player has not picked anything up. It never reacts to the
 * player's hands or gaze: it is purely time-driven, so it works with pinch,
 * gaze and pinch, and on devices where hover never fires.
 */
export class GuideBead {
  readonly mesh: Mesh;
  private readonly mat = new MeshBasicMaterial({
    color: 0xffd870,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  private readonly geo = new SphereGeometry(0.0095, 12, 8);
  private clock = 0;
  private readonly pos = new Vector3();

  constructor() {
    this.mesh = new Mesh(this.geo, this.mat);
    this.mesh.name = 'GuideBead';
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
  }

  get active(): boolean {
    return this.mesh.visible;
  }

  /** Advances the loop. With `on` false the bead hides and resets. */
  update(delta: number, on: boolean, from: Vector3, to: Vector3): void {
    if (!on) {
      if (this.mesh.visible) {
        this.mesh.visible = false;
        this.clock = 0;
      }
      return;
    }
    this.clock += delta;
    const p = (this.clock % LOOP_SECONDS) / LOOP_SECONDS;
    const travel = Math.min(p / 0.75, 1);
    const ease = travel * travel * (3 - 2 * travel);
    this.pos.lerpVectors(from, to, ease);
    this.pos.y += ARC_HEIGHT * Math.sin(Math.PI * ease);
    this.pos.z += Z_LIFT;
    this.mesh.position.copy(this.pos);
    // Fades in as it leaves the atom and out as it lands.
    const fade = Math.sin(Math.PI * Math.min(p / 0.9, 1));
    this.mat.opacity = 0.95 * Math.pow(fade, 0.6);
    this.mesh.scale.setScalar(0.8 + 0.5 * fade);
    this.mesh.visible = true;
  }

  dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
  }
}
