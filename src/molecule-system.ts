import {
  createSystem,
  CylinderGeometry,
  Entity,
  Grabbed,
  GrabSystem,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  DistanceGrabbable,
  MovementMode,
  OneHandGrabbable,
  RayInteractable,
  TorusGeometry,
  UIKit,
  UIKitMLAsset,
  Vector3,
  VisibilityState,
} from '@iwsdk/core';
import { Atom, Bond } from './atom-component.js';
import { AtomLabels } from './atom-labels.js';
import { BurstParticles } from './burst-particles.js';
import { LanternGlow } from './decor-anim.js';
import { FormulaCard } from './formula-card.js';
import { paintDecor } from './decor-paint.js';
import { GuideBead } from './guide-bead.js';
import { LEVELS } from './levels/all-levels.js';
import type { ElementSymbol, MoleculeLevel } from './levels/types.js';
import { MoleculeGuide } from './molecule-guide.js';
import {
  AccessSettings,
  DEFAULT_ACCESS,
  loadAccess,
  loadBestScores,
  loadCabinet,
  loadGuidePref,
  loadIntroDone,
  loadProgress,
  MoleculeSave,
  loadSoundPref,
  saveAccess,
  saveBestScores,
  saveCabinet,
  saveGuidePref,
  saveIntroDone,
  saveProgress,
  saveSoundPref,
} from './molecule-save.js';
import {
  carbonAtom,
  nitrogenAtom,
  oxygenAtom,
} from './scene-assets/atoms.scene-asset.js';
import { formatTime, isBetter, Score, scoreOf, starBreakdown } from './scoring.js';
import { SoundFx } from './sound-fx.js';
import { TrophyCabinet } from './trophy-cabinet.js';

/** Metres per angstrom when laying a template out in front of the player. */
const SCALE = 0.068;
/** The build plane faces the player (+Z) at this depth, centred on x = 0. */
const MOLECULE_Z = -0.5;
/** Lowest atom centre of the molecule; keeps it clear of the atom tray. */
const MOLECULE_BOTTOM_Y = 0.97;
/** Two rows of free atoms above the bench, front row first. */
const TRAY_ROWS = [
  { y: 0.8, z: -0.36 },
  { y: 0.85, z: -0.46 },
];
const TRAY_SPACING = 0.11;
/** Release this close to a placed atom counts as "trying to bond" with it. */
const NEAR_ATOM = 0.12;
/** Release this close to an open slot snaps there even if far from its partner. */
const SLOT_CAPTURE = 0.06;
const SNAP_TIME = 0.15;
const RETURN_TIME = 0.45;
const FLASH_TIME = 0.5;
const BOND_RADIUS = 0.007;
const DOUBLE_BOND_OFFSET = 0.012;
const HINT_TIME = 4;
/** With the guide on, a release this close to an empty spot targets it. */
const GUIDE_CAPTURE = 0.06;
const RELEASE_GRACE = 0.5;

const TEXT_START =
  'Pinch an atom and bring it next to the floating carbon. Correct bonds snap into place.';
const TEXT_BUILDING =
  'Keep building: bring an atom next to any atom of the molecule. Correct bonds snap into place.';

const TEXT_GUIDE =
  'Pinch an atom and place it on the faint spot of the same color.';
// Meta VR Glasses: gaze picks the target, a pinch (hand anywhere) acts.
const TEXT_GAZE_GUIDE =
  'Look at an atom and pinch to pick it up, then move it onto the faint spot of the same color.';
const TEXT_GAZE_START =
  'Look at an atom and pinch to pick it up. Bring it next to the floating carbon; correct bonds snap into place.';
const TEXT_GAZE_BUILDING =
  'Keep building: look at an atom, pinch, and bring it next to any atom of the molecule.';
// Reach assist on Quest: the hand ray picks the target, a pinch grabs it.
const TEXT_REACH_GUIDE =
  'Point at an atom and pinch to pick it up, then move it onto the faint spot of the same color.';
const TEXT_REACH_START =
  'Point at an atom and pinch to pick it up. Bring it next to the floating carbon; correct bonds snap into place.';
const TEXT_REACH_BUILDING =
  'Keep building: point at an atom, pinch, and bring it next to any atom of the molecule.';
/** How often the session is checked for a gaze input source. */
const GAZE_CHECK_INTERVAL = 0.5;
const HELD_GLOW = 0.25;
/** Bond-forming animation. */
const POP_TIME = 0.32;
const POP_SCALE = 0.3;
const STICK_GROW_TIME = 0.24;
const STICK_DELAY = 0.1;
const RING_POOL = 6;
const RING_TIME = 0.42;

/** The first 30 seconds: welcome, sketch drawing itself, invitation, first bond. */
const REVEAL_TIME = 2.6;
const LANTERN_FADE = 2;
const LANTERN_DIM = 0.55;
/** Seconds of stillness before the glowing-atom invitation starts. */
const INTRO_BREATH_AT = 3;
const IDLE_BREATH_AT = 12;
/** Calm mode offers the hint sooner. */
const IDLE_BREATH_CALM_AT = 6;
/** Table placement: the player rig moves, so everything stays together. */
const TABLE_DISTANCE_STEP: Record<number, number> = { [-1]: -0.15, 0: 0, 1: 0.1 };
const TABLE_HEIGHT_STEP: Record<number, number> = { [-1]: 0.1, 0: 0, 1: -0.1 };
const STILL_COACH_GLOW = 0.4;
const STILL_RING_OPACITY = 0.75;
const STILL_SEED_GLOW = 0.08;
/** The bead starts this long after the atom begins to glow. */
const BEAD_AFTER = 2;
const COACH_PERIOD = 1.4;
const COACH_BOB = 0.008;
const COACH_SCALE = 0.06;
const COACH_GLOW = 0xffc860;
const FIRST_BOND_TEXT_TIME = 4;
const TEXT_INTRO_PICK = 'Pick up the glowing atom.';
const TEXT_INTRO_PICK_GAZE = 'Look at the glowing atom and pinch.';
const TEXT_INTRO_PICK_REACH = 'Point at the glowing atom and pinch.';
const TEXT_INTRO_PLACE = 'Now bring it to the glowing spot.';
const TEXT_INTRO_PLACE_NOGUIDE = 'Now bring it next to the floating carbon.';
const TEXT_FIRST_BOND = "Nice! That's your first bond.";

const ELEMENT_LABEL: Record<ElementSymbol, string> = {
  C: 'carbon (grey)',
  N: 'nitrogen (blue)',
  O: 'oxygen (red)',
};

const PROTOTYPES: Record<ElementSymbol, Object3D> = {
  C: carbonAtom,
  N: nitrogenAtom,
  O: oxygenAtom,
};

type UIElement = NonNullable<ReturnType<UIKitMLAsset['getElementById']>>;

/** Start-here cue on the seed: a ring plus a slow glow, until the first bond. */
const SEED_CUE_COLOR = 0x39d6c0;
/** White keeps the seed reading as grey carbon while it glows. */
const SEED_GLOW_COLOR = 0xffffff;
const SEED_CUE_FADE = 0.6;
/** Radians per second for the breathing pulse (one cycle every ~2 s). */
const SEED_CUE_PULSE = Math.PI;

const GOOD_GLOW = 0x3cff9a;
const BAD_GLOW = 0xff3030;

export class MoleculeSystem extends createSystem({
  atoms: { required: [Atom] },
  held: { required: [Atom, Grabbed] },
  bonds: { required: [Bond] },
}) {
  private levelIndex = 0;
  private slotWorld: Vector3[] = [];
  private filled: boolean[] = [];
  private bondsDone = 0;
  private bondGeo!: CylinderGeometry;
  private bondMat!: MeshStandardMaterial;
  private tmp = new Vector3();
  private tmp2 = new Vector3();
  private up = new Vector3(0, 1, 0);
  private planeNormal = new Vector3(0, 0, 1);
  /** True while the headset shows a system overlay or the app is hidden. */
  private paused = false;
  /** Releases are judged one frame later so an exit/pause can be told apart. */
  private pendingReleases: Entity[] = [];
  /** Seconds after a pause/exit/resume during which releases are set aside. */
  private releaseGrace = 0;
  private hintTime = 0;
  private seed?: Entity;
  private seedRing!: Mesh;
  private seedRingMat!: MeshBasicMaterial;
  /** 1 = start-here cue fully shown, 0 = hidden. Fades between the two. */
  private seedCue = 0;
  private seedCueClock = 0;
  /** Bond sticks still growing from the newly placed atom. */
  private growing: Array<{
    stick: Mesh;
    from: Vector3;
    dir: Vector3;
    length: number;
    t: number;
  }> = [];
  private rings: Mesh[] = [];
  private ringMats: MeshBasicMaterial[] = [];
  private ringAge: number[] = [];
  private ringNext = 0;
  private ringGeo!: TorusGeometry;
  private formula = new FormulaCard();
  private cabinet = new TrophyCabinet();
  private introDone = false;
  private introActive = false;
  private introStage: 'watch' | 'pick' | 'place' = 'watch';
  private firstBondText = 0;
  private prevVis: VisibilityState = VisibilityState.NonImmersive;
  private revealTime = REVEAL_TIME;
  private lanternT = LANTERN_FADE;
  private lantern?: LanternGlow;
  private bead = new GuideBead();
  private idleTime = 0;
  private coachAtom?: Entity;
  private coachSlot = -1;
  private coachClock = 0;
  private coachFrom = new Vector3();
  private coachTarget = new Vector3();
  private guide = new MoleculeGuide();
  private guideOn = true;
  /** Atoms placed this level, not counting the seed. */
  private placedCount = 0;
  /** True while the XR session offers eye gaze (Meta VR Glasses). */
  private gazeActive = false;
  private gazeCheckTimer = 0;
  /** Active play time; runs from the first grab until completion, never while paused. */
  private elapsed = 0;
  private mistakes = 0;
  private timerStarted = false;
  private bestScores: Record<string, Score> = {};
  private lastScore?: Score;
  private newBest = false;
  /** False until the first level is laid out; guards saves during init. */
  private levelReady = false;
  private access: AccessSettings = { ...DEFAULT_ACCESS };
  private settingsOpen = false;
  /** True when the finished molecule was built in calm mode (no score shown). */
  private completedCalm = false;
  private card?: Object3D;
  private cardUi?: {
    factText: UIKit.Text | null;
    scoreBox: UIElement | null;
    stars: Array<UIElement | null>;
    scoreText: UIKit.Text | null;
    bestText: UIKit.Text | null;
    calmText: UIElement | null;
  };
  private settingsUi?: {
    playPage: UIElement | null;
    settingsPage: UIElement | null;
    toggles: Record<string, { button: UIElement | null; label: UIKit.Text | null }>;
  };
  private sfx = new SoundFx();
  private labels!: AtomLabels;
  private burst!: BurstParticles;
  private ui?: {
    header: UIElement;
    levelName: UIKit.Text;
    progress: UIKit.Text;
    hint: UIKit.Text;
    instructions: UIKit.Text;
    allDone: UIElement;
    next: UIElement | null;
    guideLabel: UIKit.Text | null;
    soundLabel: UIKit.Text | null;
    formulaImg: UIElement | null;
    playAgain: UIElement | null;
  };

  private get level(): MoleculeLevel {
    return LEVELS[this.levelIndex];
  }

  init(): void {
    this.bondGeo = new CylinderGeometry(BOND_RADIUS, BOND_RADIUS, 1, 10);
    this.bondMat = new MeshStandardMaterial({ color: 0xd9dde0, roughness: 0.4 });
    // Torus lies in the XY plane, so it already faces the player (+Z).
    this.seedRingMat = new MeshBasicMaterial({
      color: SEED_CUE_COLOR,
      transparent: true,
      depthWrite: false,
    });
    this.seedRing = new Mesh(
      new TorusGeometry(0.056, 0.0035, 8, 48),
      this.seedRingMat,
    );
    this.seedRing.name = 'SeedRing';
    this.world.createTransformEntity(this.seedRing);
    this.cleanupFuncs.push(
      () => this.seedRing.geometry.dispose(),
      () => this.seedRingMat.dispose(),
    );

    const setup = (e: Entity) => this.setupAtom(e);
    const release = (e: Entity) => this.pendingReleases.push(e);
    this.cleanupFuncs.push(
      this.queries.atoms.subscribe('qualify', setup),
      this.queries.held.subscribe('disqualify', release),
      this.queries.held.subscribe('qualify', (e: Entity) => this.onGrab(e)),
      this.queries.held.subscribe('disqualify', (e: Entity) => this.onLetGo(e)),
      this.world.visibilityState.subscribe((state) =>
        this.onVisibilityChange(state),
      ),
      () => this.bondGeo.dispose(),
      () => this.bondMat.dispose(),
      () => this.guide.dispose(),
      () => this.labels.dispose(),
      () => this.burst.dispose(),
      () => this.sfx.dispose(),
      () => this.formula.dispose(),
      () => this.cabinet.dispose(),
    );
    this.guideOn = loadGuidePref();
    this.sfx.muted = !loadSoundPref();
    this.access = loadAccess();
    this.applyTable();
    this.labels = new AtomLabels();
    this.burst = new BurstParticles();
    this.world.createTransformEntity(this.burst.points);
    this.ringGeo = new TorusGeometry(0.03, 0.0032, 6, 28);
    for (let i = 0; i < RING_POOL; i++) {
      const mat = new MeshBasicMaterial({
        color: 0xffe08a,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const ring = new Mesh(this.ringGeo, mat);
      ring.name = 'BondRing';
      ring.visible = false;
      ring.frustumCulled = false;
      this.world.createTransformEntity(ring);
      this.rings.push(ring);
      this.ringMats.push(mat);
      this.ringAge.push(RING_TIME);
    }
    this.cleanupFuncs.push(() => {
      this.ringGeo.dispose();
      this.ringMats.forEach((m) => m.dispose());
    });
    const room = this.world.getSceneObject<Object3D>('lab-room');
    if (room) {
      this.cleanupFuncs.push(paintDecor(room));
      this.lantern = new LanternGlow(room);
    }
    this.introDone = loadIntroDone();
    this.prevVis = this.world.visibilityState.peek();
    const alreadyInVR = this.prevVis === VisibilityState.Visible;
    const lit = alreadyInVR || this.access.reduceMotion;
    this.lanternT = lit ? LANTERN_FADE : 0;
    this.lantern?.setLevel(lit ? 1 : LANTERN_DIM);
    this.world.createTransformEntity(this.bead.mesh);
    this.cleanupFuncs.push(() => this.bead.dispose());
    this.world.createTransformEntity(this.guide.root);
    this.world.createTransformEntity(this.cabinet.root);
    this.cabinet.setOwned(loadCabinet());
    this.setupPanel();

    this.bestScores = loadBestScores();
    const save = loadProgress();
    const saved = save ? LEVELS.findIndex((l) => l.id === save.levelId) : -1;
    this.startLevel(Math.max(saved, 0), saved >= 0 ? (save ?? undefined) : undefined);
  }

  /** Clears the current molecule and lays out a level's atoms. */
  private startLevel(index: number, save?: MoleculeSave): void {
    this.stopCoach();
    for (const bond of Array.from(this.queries.bonds.entities)) bond.dispose();
    this.growing.length = 0;
    this.ringAge.fill(RING_TIME);
    this.rings.forEach((r) => (r.visible = false));
    for (const atom of Array.from(this.queries.atoms.entities)) {
      const mat = atom.object3D ? this.atomMaterial(atom.object3D) : undefined;
      mat?.dispose(); // per-atom clone made in setupAtom
      atom.dispose();
    }
    this.pendingReleases.length = 0;
    this.hideHint();

    this.levelIndex = index;
    this.layoutSlots();
    this.filled = this.level.slots.map(() => false);
    this.bondsDone = 0;
    this.placedCount = 0;
    this.elapsed = save?.elapsed ?? 0;
    this.mistakes = save?.mistakes ?? 0;
    this.timerStarted = save?.timerStarted ?? false;
    this.lastScore = undefined;
    this.newBest = false;
    this.guide.build(this.level, this.slotWorld, this.labels);

    // Seed first, then the free atoms in a fixed, element-mixed tray order.
    this.seed = this.spawnAtom('C', 0, 0, this.slotWorld[0]);
    this.setWorldPosition(this.seedRing, this.slotWorld[0]);
    const n = this.level.slots.length;
    const free = this.level.slots
      .map((_, i) => i)
      .filter((i) => i > 0)
      .sort((a, b) => ((a * 5) % n) - ((b * 5) % n));
    const perRow = Math.ceil(free.length / TRAY_ROWS.length);
    free.forEach((slot, k) => {
      const row = TRAY_ROWS[Math.floor(k / perRow)];
      const col = k % perRow;
      const count = Math.min(perRow, free.length - Math.floor(k / perRow) * perRow);
      this.tmp.set((col - (count - 1) / 2) * TRAY_SPACING, row.y, row.z);
      this.spawnAtom(this.level.slots[slot].element, k + 1, -1, this.tmp);
    });

    if (save) this.restorePlacements(save.placements);
    this.completedCalm = false;
    if (this.isComplete()) {
      this.addTrophy(false);
      this.completedCalm = this.access.calm;
      if (!this.completedCalm) {
        this.lastScore = scoreOf(this.elapsed, this.mistakes, this.level.starTimeSec);
      }
    }
    this.guide.update(this.filled, this.guideOn);
    this.formula.setLevel(this.level);
    this.formula.update(this.filled);
    // A fresh level's sketch draws itself once the player is in VR; a restored
    // one is shown whole. The introduction is only for a brand-new player.
    const fresh = this.placedCount === 0 && !this.isComplete();
    if (!this.introDone && (this.levelIndex > 0 || !fresh || save?.timerStarted)) {
      this.introDone = true;
      saveIntroDone();
    }
    this.introActive = !this.introDone && fresh && this.levelIndex === 0;
    this.introStage = 'watch';
    this.firstBondText = 0;
    this.idleTime = 0;
    const draw = fresh && !this.access.reduceMotion;
    this.revealTime = draw ? 0 : REVEAL_TIME;
    this.guide.setReveal(draw ? 0 : 1);
    // Fresh level: cue fully on. Restored mid-level: no cue at all.
    this.seedCue = this.placedCount === 0 ? 1 : 0;
    this.seedCueClock = 0;
    this.applySeedCue();
    this.levelReady = true;
    this.persistProgress();
    this.updatePanel();
  }

  private instructionText(): string {
    const gaze = this.gazeActive;
    const reach = !gaze && this.access.reach;
    if (this.firstBondText > 0) return TEXT_FIRST_BOND;
    if (this.introActive && this.introStage === 'pick') {
      return gaze ? TEXT_INTRO_PICK_GAZE : reach ? TEXT_INTRO_PICK_REACH : TEXT_INTRO_PICK;
    }
    if (this.introActive && this.introStage === 'place') {
      return this.guideOn ? TEXT_INTRO_PLACE : TEXT_INTRO_PLACE_NOGUIDE;
    }
    if (this.guideOn) return gaze ? TEXT_GAZE_GUIDE : reach ? TEXT_REACH_GUIDE : TEXT_GUIDE;
    if (this.placedCount === 0) {
      return gaze ? TEXT_GAZE_START : reach ? TEXT_REACH_START : TEXT_START;
    }
    return gaze ? TEXT_GAZE_BUILDING : reach ? TEXT_REACH_BUILDING : TEXT_BUILDING;
  }

  private onGrab(e: Entity): void {
    this.stopCoach();
    this.idleTime = 0;
    this.startTimer();
    this.setHeldGlow(e, true);
    this.sfx.grab(e.getValue(Atom, 'element') as ElementSymbol);
    if (this.introActive && this.introStage !== 'place') {
      this.introStage = 'place';
      this.updatePanel();
    }
  }

  private onLetGo(e: Entity): void {
    this.setHeldGlow(e, false);
    this.idleTime = 0;
    if (this.introActive && this.introStage === 'place') {
      this.introStage = 'watch';
      this.updatePanel();
    }
  }

  /** Welcome: a soft chime, lanterns fade up and the sketch starts drawing. */
  private onEnterVR(): void {
    if (!this.levelReady) return;
    this.sfx.welcome();
    this.lanternT = this.access.reduceMotion ? LANTERN_FADE : 0;
    this.idleTime = 0;
    const fresh = this.placedCount === 0 && !this.isComplete();
    const draw = fresh && !this.access.reduceMotion;
    this.revealTime = draw ? 0 : REVEAL_TIME;
    this.guide.setReveal(draw ? 0 : 1);
  }

  /** The first bond: a small joy, once, then the introduction is over. */
  private afterPlacement(slot: number): void {
    this.idleTime = 0;
    if (!this.introActive) return;
    if (this.bondsDone === 0) {
      this.introStage = 'watch';
      return;
    }
    this.introActive = false;
    this.introDone = true;
    saveIntroDone();
    this.firstBondText = FIRST_BOND_TEXT_TIME;
    this.sfx.sparkle();
    if (this.access.reduceMotion) return;
    this.lantern?.flash();
    const p = this.slotWorld[slot];
    this.tmp2.set(p.x, p.y, p.z + 0.03);
    this.burst.start(this.tmp2);
  }

  private updateIntro(delta: number): void {
    const inVR = this.world.visibilityState.peek() === VisibilityState.Visible;
    if (this.firstBondText > 0) {
      this.firstBondText -= delta;
      if (this.firstBondText <= 0) this.updatePanel();
    }
    if (inVR) {
      if (this.revealTime < REVEAL_TIME) {
        this.revealTime += delta;
        this.guide.setReveal(Math.min(1, this.revealTime / REVEAL_TIME));
      }
      if (this.lanternT < LANTERN_FADE) {
        this.lanternT += delta;
        const k = Math.min(this.lanternT / LANTERN_FADE, 1);
        this.lantern?.setLevel(LANTERN_DIM + (1 - LANTERN_DIM) * k * (2 - k));
      }
    }
    this.lantern?.update(delta);
    this.updateCoach(delta, inVR);
  }

  /**
   * Invitation: after a moment of stillness one atom "breathes", its target
   * spot pulses with it, and a bead of light travels between them. Driven by
   * time only (no hover, no gaze dependence); stops the instant an atom is held.
   */
  private updateCoach(delta: number, inVR: boolean): void {
    if (
      !inVR ||
      this.isComplete() ||
      this.queries.held.entities.size > 0 ||
      this.pendingReleases.length > 0
    ) {
      this.stopCoach();
      return;
    }
    this.idleTime += delta;
    if (!this.coachAtom) {
      const breathAt = this.introActive
        ? INTRO_BREATH_AT
        : this.access.calm
          ? IDLE_BREATH_CALM_AT
          : IDLE_BREATH_AT;
      if (this.idleTime < breathAt) return;
      if (!this.startCoach()) {
        this.idleTime = 0;
        return;
      }
    }
    this.coachClock += delta;
    // Reduce motion keeps a steady highlight instead of a pulse.
    const still = this.access.reduceMotion;
    const s = still ? 1 : 0.5 + 0.5 * Math.sin((this.coachClock / COACH_PERIOD) * Math.PI * 2);
    const e = this.coachAtom;
    const obj = e?.object3D;
    if (!e || !e.active || !obj) {
      this.stopCoach();
      return;
    }
    if ((e.getValue(Atom, 'tweenTime') ?? -1) < 0) {
      const home = e.getVectorView(Atom, 'home');
      this.tmp.set(home[0], home[1] + (still ? 0 : COACH_BOB * s), home[2]);
      this.setWorldPosition(obj, this.tmp);
    }
    obj.scale.setScalar(still ? 1 : 1 + COACH_SCALE * s);
    const mat = this.atomMaterial(obj);
    if (mat && (e.getValue(Atom, 'flashTime') ?? 0) <= 0) {
      mat.emissive.setHex(COACH_GLOW);
      mat.emissiveIntensity = still ? STILL_COACH_GLOW : 0.1 + 0.3 * s;
    }
    this.guide.setPulse(this.guideOn ? this.coachSlot : -1, still ? 0.8 : s);
    if (!still) {
      this.bead.update(delta, this.coachClock >= BEAD_AFTER, this.coachFrom, this.coachTarget);
    }
  }

  /** Chooses the free atom nearest to an open spot next to what is built. */
  private startCoach(): boolean {
    let bestD = Infinity;
    let bestAtom: Entity | undefined;
    let bestOpen = -1;
    let bestPlaced = -1;
    for (const [a, b] of this.level.bonds) {
      for (const [placed, open] of [
        [a, b],
        [b, a],
      ]) {
        if (!this.filled[placed] || this.filled[open]) continue;
        const spot = this.slotWorld[open];
        const element = this.level.slots[open].element;
        for (const e of this.queries.atoms.entities) {
          if ((e.getValue(Atom, 'slot') ?? -1) >= 0 || e.hasComponent(Grabbed)) continue;
          if (e.getValue(Atom, 'element') !== element) continue;
          const home = e.getVectorView(Atom, 'home');
          const d = Math.hypot(home[0] - spot.x, home[1] - spot.y, home[2] - spot.z);
          if (d < bestD) {
            bestD = d;
            bestAtom = e;
            bestOpen = open;
            bestPlaced = placed;
          }
        }
      }
    }
    if (!bestAtom) return false;
    const home = bestAtom.getVectorView(Atom, 'home');
    this.coachAtom = bestAtom;
    this.coachSlot = bestOpen;
    this.coachClock = 0;
    this.coachFrom.set(home[0], home[1], home[2]);
    // With the guide off, the bead flies toward the atom it should join.
    this.coachTarget.copy(this.guideOn ? this.slotWorld[bestOpen] : this.slotWorld[bestPlaced]);
    if (this.introActive && this.introStage === 'watch') {
      this.introStage = 'pick';
      this.updatePanel();
    }
    return true;
  }

  private stopCoach(): void {
    const e = this.coachAtom;
    if (!e) return;
    this.coachAtom = undefined;
    const obj = e.active ? e.object3D : undefined;
    if (obj) {
      obj.scale.setScalar(1);
      const grabbed = e.hasComponent(Grabbed);
      const mat = this.atomMaterial(obj);
      if (mat && !grabbed && (e.getValue(Atom, 'flashTime') ?? 0) <= 0) {
        mat.emissiveIntensity = 0;
      }
      if (
        !grabbed &&
        (e.getValue(Atom, 'slot') ?? -1) < 0 &&
        (e.getValue(Atom, 'tweenTime') ?? -1) < 0
      ) {
        const home = e.getVectorView(Atom, 'home');
        this.tmp.set(home[0], home[1], home[2]);
        this.setWorldPosition(obj, this.tmp);
      }
    }
    this.guide.setPulse(-1, 0);
    this.bead.update(0, false, this.coachFrom, this.coachTarget);
  }

  private isComplete(): boolean {
    return this.bondsDone === this.level.bonds.length;
  }

  /** Distance grab: gaze + pinch (glasses) or the hand ray with Reach assist. */
  private get farGrab(): boolean {
    return this.gazeActive || this.access.reach;
  }

  /**
   * One grab mode per atom (IWSDK allows a single grab component): near
   * pinch on headsets with hands, gaze + pinch distance grab when the
   * session offers eye gaze. Placed atoms are never grabbable.
   */
  private setGrabbable(e: Entity, on: boolean): void {
    const near = on && !this.farGrab;
    const far = on && this.farGrab;
    if (!near && e.hasComponent(OneHandGrabbable)) e.removeComponent(OneHandGrabbable);
    if (!far && e.hasComponent(DistanceGrabbable)) e.removeComponent(DistanceGrabbable);
    if (!far && e.hasComponent(RayInteractable)) e.removeComponent(RayInteractable);
    if (near && !e.hasComponent(OneHandGrabbable)) e.addComponent(OneHandGrabbable);
    if (far) {
      if (!e.hasComponent(RayInteractable)) e.addComponent(RayInteractable);
      if (!e.hasComponent(DistanceGrabbable)) {
        // Moves with the pinching hand's motion; never snaps into the hand.
        e.addComponent(DistanceGrabbable, {
          movementMode: MovementMode.MoveAtSource,
          rotate: false,
          scale: false,
          translate: true,
          returnToOrigin: false,
        });
      }
    }
  }

  /** Re-checks the XR session for an eye-gaze source and switches grab mode. */
  private updateGazeMode(delta: number): void {
    this.gazeCheckTimer -= delta;
    if (this.gazeCheckTimer > 0) return;
    this.gazeCheckTimer = GAZE_CHECK_INTERVAL;
    let gaze = false;
    const sources = this.world.session?.inputSources;
    if (sources) {
      for (let i = 0; i < sources.length; i++) {
        if (sources[i].targetRayMode === 'gaze') gaze = true;
      }
    }
    if (gaze === this.gazeActive) return;
    // Wait until nothing is held; the check repeats every GAZE_CHECK_INTERVAL.
    if (this.queries.held.entities.size > 0) return;
    this.gazeActive = gaze;
    // A grab handle is created once per entity, so switching mode in place
    // would leave the old handle behind. Re-lay the level instead, keeping
    // placements, time and mistakes through the save.
    this.persistProgress();
    this.startLevel(this.levelIndex, loadProgress() ?? undefined);
  }

  /** A soft glow while an atom is held, so a gaze pick is visibly confirmed. */
  private setHeldGlow(e: Entity, on: boolean): void {
    if ((e.getValue(Atom, 'flashTime') ?? 0) > 0) return; // a flash owns the glow
    const mat = e.object3D ? this.atomMaterial(e.object3D) : undefined;
    if (!mat) return;
    mat.emissive.setHex(0xffffff);
    mat.emissiveIntensity = on ? HELD_GLOW : 0;
  }

  private startTimer(): void {
    if (this.access.calm) return;
    if (!this.timerStarted && !this.isComplete()) this.timerStarted = true;
  }

  /** Puts the finished molecule's miniature in the cabinet and saves it. */
  private addTrophy(announce: boolean): void {
    if (this.cabinet.has(this.level.id)) return;
    this.cabinet.add(this.level.id, announce && !this.access.reduceMotion);
    saveCabinet(this.cabinet.ownedIds());
    if (announce) this.showHint('A trophy was added to the cabinet on your left.');
  }

  /** Stops the clock, scores the run and keeps the best result per molecule. */
  private finishRun(): void {
    this.completedCalm = this.access.calm;
    if (this.completedCalm) {
      // Calm mode: nothing is timed or scored, and the records stay untouched.
      this.lastScore = undefined;
      this.newBest = false;
      return;
    }
    const score = scoreOf(this.elapsed, this.mistakes, this.level.starTimeSec);
    this.lastScore = score;
    this.newBest = isBetter(score, this.bestScores[this.level.id]);
    if (this.newBest) {
      this.bestScores[this.level.id] = score;
      saveBestScores(this.bestScores);
    }
  }

  /** Centres the template horizontally and rests it at MOLECULE_BOTTOM_Y. */
  private layoutSlots(): void {
    const xs = this.level.slots.map((s) => s.x);
    const ys = this.level.slots.map((s) => s.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const minY = Math.min(...ys);
    this.slotWorld = this.level.slots.map(
      (s) =>
        new Vector3(
          (s.x - cx) * SCALE,
          MOLECULE_BOTTOM_Y + (s.y - minY) * SCALE,
          MOLECULE_Z,
        ),
    );
  }

  private spawnAtom(
    element: ElementSymbol,
    index: number,
    slot: number,
    position: Vector3,
  ): Entity {
    const obj = PROTOTYPES[element].clone();
    // Stable per level and spawn order, so saved placements can find it.
    obj.name = `Atom ${element}${index}`;
    obj.add(this.labels.create(element));
    obj.position.copy(position);
    const e = this.world.createTransformEntity(obj);
    e.addComponent(Atom, { element, slot });
    if (slot < 0) this.setGrabbable(e, true);
    this.setupAtom(e);
    return e;
  }

  /** Fades the start-here cue toward on (no bonds yet) or off, and pulses it. */
  private updateSeedCue(delta: number): void {
    const target = this.placedCount === 0 ? 1 : 0;
    if (this.seedCue === 0 && target === 0) return;
    const step = delta / SEED_CUE_FADE;
    this.seedCue =
      target > this.seedCue
        ? Math.min(target, this.seedCue + step)
        : Math.max(target, this.seedCue - step);
    this.seedCueClock += delta;
    this.applySeedCue();
  }

  private applySeedCue(): void {
    const still = this.access.reduceMotion;
    const pulse = 0.5 + 0.5 * Math.sin(this.seedCueClock * SEED_CUE_PULSE);
    this.seedRing.visible = this.seedCue > 0;
    this.seedRingMat.opacity = this.seedCue * (still ? STILL_RING_OPACITY : 0.55 + 0.35 * pulse);
    const seed = this.seed;
    // A running success/error flash owns the seed's emissive meanwhile.
    if (!seed?.object3D || (seed.getValue(Atom, 'flashTime') ?? 0) > 0) return;
    const mat = this.atomMaterial(seed.object3D);
    if (!mat) return;
    mat.emissive.setHex(SEED_GLOW_COLOR);
    mat.emissiveIntensity = this.seedCue * (still ? STILL_SEED_GLOW : 0.03 + 0.09 * pulse);
  }

  private onVisibilityChange(state: VisibilityState): void {
    const before = this.prevVis;
    this.prevVis = state;
    if (before === VisibilityState.NonImmersive && state === VisibilityState.Visible) {
      this.onEnterVR();
    }
    this.paused =
      state === VisibilityState.VisibleBlurred ||
      state === VisibilityState.Hidden;
    this.settingsOpen = false;
    this.applyTable();
    if (this.levelReady) this.updatePanel();
    // Hands vanish and reappear around a pause; never judge those releases.
    this.releaseGrace = RELEASE_GRACE;
    if (state === VisibilityState.Visible) return;
    // Keep the play time counted so far if the app is closed while away.
    if (this.levelReady) this.persistProgress();
    // Leaving active play: let go of anything in hand. The release is then
    // handled as "set aside", never judged as a bond attempt.
    const grab = this.world.getSystem(GrabSystem);
    for (const e of Array.from(this.queries.held.entities)) {
      grab?.forceRelease(e);
    }
  }

  private restorePlacements(placements: Record<string, number>): void {
    const bySlot: Array<[Entity, number]> = [];
    for (const e of this.queries.atoms.entities) {
      const slot = placements[e.object3D?.name ?? ''];
      if (slot === undefined || (e.getValue(Atom, 'slot') ?? -1) >= 0) continue;
      const target = this.level.slots[slot];
      if (!target || this.filled[slot]) continue;
      if (target.element !== e.getValue(Atom, 'element')) continue;
      bySlot.push([e, slot]);
      this.filled[slot] = true; // reserve so duplicates in a bad save are skipped
    }
    // Release the reservations first so each bond is spawned exactly once.
    for (const [, slot] of bySlot) this.filled[slot] = false;
    for (const [e, slot] of bySlot) this.place(e, slot, true);
  }

  private persistProgress(): void {
    const save: MoleculeSave = {
      levelId: this.level.id,
      placements: {},
      elapsed: this.elapsed,
      mistakes: this.mistakes,
      timerStarted: this.timerStarted,
    };
    for (const e of this.queries.atoms.entities) {
      const slot = e.getValue(Atom, 'slot') ?? -1;
      const name = e.object3D?.name;
      // Slot 0 is the seed; it is always placed and never needs saving.
      if (slot > 0 && name) save.placements[name] = slot;
    }
    saveProgress(save);
  }

  private setupPanel(): void {
    const panel = this.world.getSceneObject<UIKitMLAsset>('molecule-panel');
    if (!panel) {
      console.warn('[Molecule Lab] molecule-panel not found');
      return;
    }
    const header = panel.getElementById('header');
    const levelName = panel.getElementById<UIKit.Text>('level-name');
    const progress = panel.getElementById<UIKit.Text>('progress');
    const hint = panel.getElementById<UIKit.Text>('hint');
    const instructions = panel.getElementById<UIKit.Text>('instructions');
    const allDone = panel.getElementById('all-done');
    if (!header || !levelName || !progress || !hint || !instructions || !allDone) return;
    this.ui = {
      playAgain: panel.getElementById('play-again-button'),
      header,
      levelName,
      progress,
      hint,
      instructions,
      allDone,
      next: panel.getElementById('next-button'),
      guideLabel: panel.getElementById<UIKit.Text>('guide-label'),
      soundLabel: panel.getElementById<UIKit.Text>('sound-label'),
      formulaImg: panel.getElementById('formula-img'),
    };
    this.ui.formulaImg?.setProperties({ src: this.formula.texture });

    // The fact and the score live on the separate card on the left.
    const card = this.world.getSceneObject<UIKitMLAsset>('info-card');
    if (card) {
      this.card = card as unknown as Object3D;
      this.card.visible = false;
      this.cardUi = {
        factText: card.getElementById<UIKit.Text>('fact-text'),
        scoreBox: card.getElementById('score-box'),
        stars: [1, 2, 3].map((i) => card.getElementById(`star-${i}`)),
        scoreText: card.getElementById<UIKit.Text>('score-text'),
        bestText: card.getElementById<UIKit.Text>('best-text'),
        calmText: card.getElementById('calm-text'),
      };
    }

    const toggles: NonNullable<MoleculeSystem['settingsUi']>['toggles'] = {};
    const addToggle = (key: string, buttonId: string, labelId: string) => {
      toggles[key] = {
        button: panel.getElementById(buttonId),
        label: panel.getElementById<UIKit.Text>(labelId),
      };
    };
    addToggle('calm', 'calm-button', 'calm-label');
    addToggle('motion', 'motion-button', 'motion-label');
    addToggle('reach', 'reach-button', 'reach-label');
    for (const id of ['dist-near', 'dist-normal', 'dist-far', 'height-low', 'height-normal', 'height-high']) {
      addToggle(id, id, `${id}-label`);
    }
    this.settingsUi = {
      playPage: panel.getElementById('play-page'),
      settingsPage: panel.getElementById('settings-page'),
      toggles,
    };

    const bind = (id: string, onActivate: () => void) =>
      this.bindButton(panel.getElementById(id), id, onActivate);
    bind('restart-button', () => this.startLevel(this.levelIndex));
    bind('settings-button', () => this.setSettingsOpen(true));
    bind('back-button', () => this.setSettingsOpen(false));
    bind('guide-button', () => this.setGuide(!this.guideOn));
    bind('sound-button', () => this.setSound(this.sfx.muted));
    bind('calm-button', () => this.setAccess({ calm: !this.access.calm }));
    bind('motion-button', () => this.setAccess({ reduceMotion: !this.access.reduceMotion }));
    bind('reach-button', () => this.setAccess({ reach: !this.access.reach }));
    bind('dist-near', () => this.setAccess({ tableDistance: -1 }));
    bind('dist-normal', () => this.setAccess({ tableDistance: 0 }));
    bind('dist-far', () => this.setAccess({ tableDistance: 1 }));
    bind('height-low', () => this.setAccess({ tableHeight: -1 }));
    bind('height-normal', () => this.setAccess({ tableHeight: 0 }));
    bind('height-high', () => this.setAccess({ tableHeight: 1 }));
    bind('next-button', () => {
      if (this.levelIndex < LEVELS.length - 1) this.startLevel(this.levelIndex + 1);
    });
    bind('play-again-button', () => this.startLevel(0));
  }

  /**
   * Activates on press-then-release over the button, however long the pinch
   * lasts. A DOM-style "click" is dropped after ~300 ms, which loses slow or
   * careful pinches (and gaze + pinch commits), so it is not used here.
   */
  private bindButton(
    button: UIElement | null,
    name: string,
    onActivate: () => void,
  ): void {
    if (!button) return;
    button.name = name;
    let pressed = false;
    const onDown = () => {
      pressed = true;
    };
    const onUp = () => {
      if (!pressed) return;
      pressed = false;
      onActivate();
    };
    const onLeave = () => {
      pressed = false;
    };
    button.addEventListener('pointerdown', onDown);
    button.addEventListener('pointerup', onUp);
    button.addEventListener('pointerleave', onLeave);
    this.cleanupFuncs.push(() => {
      button.removeEventListener('pointerdown', onDown);
      button.removeEventListener('pointerup', onUp);
      button.removeEventListener('pointerleave', onLeave);
    });
  }


  /** Fact and score on the left card; it is only shown once the molecule is done. */
  private updateCard(done: boolean): void {
    const inVR = this.world.visibilityState.peek() !== VisibilityState.NonImmersive;
    if (this.card) this.card.visible = done && inVR;
    const ui = this.cardUi;
    if (!ui) return;
    ui.factText?.setProperties({ text: this.level.fact });
    const score = this.lastScore;
    const calm = this.completedCalm;
    ui.calmText?.setProperties({ display: done && calm ? 'flex' : 'none' });
    ui.scoreBox?.setProperties({ display: done && !calm && score ? 'flex' : 'none' });
    if (!done || calm || !score) return;
    const b = starBreakdown(score.timeSec, score.mistakes, this.level.starTimeSec);
    [b.built, b.time, b.precision].forEach((lit, i) =>
      ui.stars[i]?.setProperties({ color: lit ? '#f2b705' : '#c9ccc8' }),
    );
    ui.scoreText?.setProperties({
      text: `Time ${formatTime(score.timeSec)} | Mistakes ${score.mistakes}`,
    });
    const best = this.bestScores[this.level.id];
    ui.bestText?.setProperties({
      text: this.newBest
        ? 'New best!'
        : best
          ? `Best: ${best.stars} ${best.stars === 1 ? 'star' : 'stars'}, ${formatTime(best.timeSec)}`
          : '',
    });
  }

  private setSettingsOpen(open: boolean): void {
    this.settingsOpen = open;
    this.updatePanel();
  }

  /**
   * Moves the player rig, not the objects, so the table, atoms, molecule and
   * panels all stay in the same place relative to each other.
   */
  private applyTable(): void {
    this.world.player.position.set(
      0,
      TABLE_HEIGHT_STEP[this.access.tableHeight],
      TABLE_DISTANCE_STEP[this.access.tableDistance],
    );
  }

  /** Applies, saves and reflects one or more accessibility options. */
  private setAccess(change: Partial<AccessSettings>): void {
    const before = this.access;
    this.access = { ...before, ...change };
    saveAccess(this.access);
    if (this.access.tableDistance !== before.tableDistance || this.access.tableHeight !== before.tableHeight) {
      this.applyTable();
    }
    if (this.access.reduceMotion !== before.reduceMotion) {
      // Static cues only: drop any running pulse and show the lanterns steadily.
      this.stopCoach();
      if (this.access.reduceMotion) {
        this.lanternT = LANTERN_FADE;
        this.lantern?.setLevel(1);
        this.ringAge.fill(RING_TIME);
        this.rings.forEach((r) => (r.visible = false));
      }
    }
    if (this.access.calm !== before.calm) this.idleTime = 0;
    if (this.access.reach !== before.reach) {
      // The grab handle is made once per atom, so lay the level out again.
      this.persistProgress();
      this.startLevel(this.levelIndex, loadProgress() ?? undefined);
      return;
    }
    this.updatePanel();
  }

  /** Marks a settings button as the chosen one. */
  private styleToggle(key: string, on: boolean, text?: string): void {
    const t = this.settingsUi?.toggles[key];
    if (!t) return;
    if (text !== undefined) t.label?.setProperties({ text });
    // Chosen = light green with dark text; otherwise the kit's dark button.
    t.button?.setProperties({ backgroundColor: on ? '#bfe3cd' : '#2b3036' });
    t.label?.setProperties({
      fontWeight: on ? 700 : 400,
      color: on ? '#102a1c' : '#ffffff',
      fontSize: text === undefined ? 17 : 16,
    });
  }

  private refreshSettings(): void {
    const a = this.access;
    const onOff = (v: boolean) => (v ? 'On' : 'Off');
    this.styleToggle('calm', a.calm, `Calm mode: ${onOff(a.calm)}`);
    this.styleToggle('motion', a.reduceMotion, `Reduce motion: ${onOff(a.reduceMotion)}`);
    this.styleToggle('reach', a.reach, `Reach assist: ${onOff(a.reach)}`);
    this.styleToggle('dist-near', a.tableDistance === -1);
    this.styleToggle('dist-normal', a.tableDistance === 0);
    this.styleToggle('dist-far', a.tableDistance === 1);
    this.styleToggle('height-low', a.tableHeight === -1);
    this.styleToggle('height-normal', a.tableHeight === 0);
    this.styleToggle('height-high', a.tableHeight === 1);
  }

  private setSound(on: boolean): void {
    this.sfx.muted = !on;
    saveSoundPref(on);
    this.updatePanel();
    this.sfx.snap(0.5); // audible confirmation when turning sound back on
  }

  private setGuide(on: boolean): void {
    this.guideOn = on;
    saveGuidePref(on);
    this.guide.update(this.filled, on);
    this.hideHint();
    this.updatePanel();
  }

  private updatePanel(): void {
    if (!this.ui) return;
    const total = this.level.bonds.length;
    const done = this.bondsDone === total;
    const hasNext = this.levelIndex < LEVELS.length - 1;
    const atomsToPlace = this.level.slots.length - 1; // the seed is given
    this.ui.levelName.setProperties({
      text: this.settingsOpen ? 'Settings' : `Level ${this.levelIndex + 1}: ${this.level.name}`,
    });
    this.settingsUi?.playPage?.setProperties({ display: this.settingsOpen ? 'none' : 'flex' });
    this.settingsUi?.settingsPage?.setProperties({ display: this.settingsOpen ? 'flex' : 'none' });
    this.refreshSettings();
    this.ui.progress.setProperties({
      text: done
        ? `${this.level.name} complete!`
        : this.guideOn
          ? `Atoms placed: ${this.placedCount} / ${atomsToPlace}`
          : `Bonds: ${this.bondsDone} / ${total}`,
    });
    this.ui.header.setProperties({
      backgroundColor: done ? '#9fe0b8' : '#dcebe8',
    });
    // The introduction lines are shown larger and bolder than ordinary hints.
    const coachText =
      this.firstBondText > 0 || (this.introActive && this.introStage !== 'watch');
    this.ui.instructions.setProperties({
      display: done ? 'none' : 'flex',
      text: this.instructionText(),
      fontSize: coachText ? 27 : 20,
      fontWeight: coachText ? 700 : 400,
      color: coachText ? '#1f5a52' : '#2b2b2b',
    });
    this.ui.guideLabel?.setProperties({
      text: this.guideOn ? 'Hide guide' : 'Show guide',
      fontSize: 19,
    });
    this.ui.soundLabel?.setProperties({
      text: this.sfx.muted ? 'Unmute' : 'Mute',
      fontSize: 19,
    });
    // The formula follows the guide, and is the reward once the molecule is done.
    this.ui.formulaImg?.setProperties({
      display: this.guideOn || done ? 'flex' : 'none',
    });
    this.updateCard(done);
    this.ui.allDone.setProperties({ display: done && !hasNext ? 'flex' : 'none' });
    this.ui.next?.setProperties({ display: done && hasNext ? 'flex' : 'none' });
    this.ui.playAgain?.setProperties({
      display: done && !hasNext ? 'flex' : 'none',
    });
  }

  private showHint(text: string): void {
    if (!this.ui) return;
    this.ui.hint.setProperties({ text, display: 'flex' });
    this.hintTime = HINT_TIME;
  }

  private hideHint(): void {
    this.hintTime = 0;
    this.ui?.hint.setProperties({ display: 'none' });
  }

  update(delta: number): void {
    if (this.pendingReleases.length > 0) {
      const active =
        !this.paused &&
        this.releaseGrace <= 0 &&
        this.world.visibilityState.peek() === VisibilityState.Visible;
      for (const e of this.pendingReleases) {
        if (!e.active || e.hasComponent(Grabbed)) continue;
        if (active) this.onRelease(e);
        else this.setAside(e);
      }
      this.pendingReleases.length = 0;
    }

    // Frozen while paused: tweens, flashes and the hint resume on return.
    if (this.paused) return;
    if (this.releaseGrace > 0) this.releaseGrace -= delta;
    this.burst.update(delta);
    this.updateGazeMode(delta);
    this.updateBondFx(delta);
    this.updateIntro(delta);
    this.formula.tick(delta);
    this.cabinet.update(delta);
    if (
      this.timerStarted &&
      !this.access.calm &&
      !this.isComplete() &&
      this.world.visibilityState.peek() === VisibilityState.Visible
    ) {
      this.elapsed += delta;
    }

    this.updateSeedCue(delta);

    if (this.hintTime > 0) {
      this.hintTime -= delta;
      if (this.hintTime <= 0) this.hideHint();
    }

    for (const e of this.queries.atoms.entities) {
      const obj = e.object3D;
      if (!obj) continue;

      const tweenTime = e.getValue(Atom, 'tweenTime') ?? -1;
      if (tweenTime >= 0) {
        if (e.hasComponent(Grabbed)) {
          e.setValue(Atom, 'tweenTime', -1);
        } else {
          const t = tweenTime + delta;
          const dur = e.getValue(Atom, 'tweenDuration') ?? SNAP_TIME;
          const k = Math.min(t / dur, 1);
          const ease = 1 - (1 - k) * (1 - k) * (1 - k);
          const from = e.getVectorView(Atom, 'tweenFrom');
          const to = e.getVectorView(Atom, 'tweenTo');
          this.tmp.set(
            from[0] + (to[0] - from[0]) * ease,
            from[1] + (to[1] - from[1]) * ease,
            from[2] + (to[2] - from[2]) * ease,
          );
          this.setWorldPosition(obj, this.tmp);
          e.setValue(Atom, 'tweenTime', k >= 1 ? -1 : t);
        }
      }

      const flash = e.getValue(Atom, 'flashTime') ?? 0;
      if (flash > 0) {
        const left = Math.max(flash - delta, 0);
        e.setValue(Atom, 'flashTime', left);
        const mat = this.atomMaterial(obj);
        if (mat) mat.emissiveIntensity = (left / FLASH_TIME) * 0.9;
      }

      const pop = e.getValue(Atom, 'popTime') ?? 1;
      if (pop < POP_TIME) {
        const t = pop + delta;
        const k = Math.min(t / POP_TIME, 1);
        obj.scale.setScalar(k >= 1 ? 1 : 1 + POP_SCALE * Math.sin(Math.PI * k));
        e.setValue(Atom, 'popTime', t);
      }
    }
  }

  private setupAtom(e: Entity): void {
    const obj = e.object3D;
    if (!obj || obj.userData.atomReady) return;
    obj.userData.atomReady = true;

    // Per-atom material so a flash does not light up every atom of that element.
    const mesh = this.findMesh(obj);
    if (mesh) mesh.material = (mesh.material as MeshStandardMaterial).clone();

    obj.getWorldPosition(this.tmp);
    const home = e.getVectorView(Atom, 'home');
    home[0] = this.tmp.x;
    home[1] = this.tmp.y;
    home[2] = this.tmp.z;

    const slot = e.getValue(Atom, 'slot') ?? -1;
    if (slot >= 0) {
      this.filled[slot] = true;
      this.setWorldPosition(obj, this.slotWorld[slot]);
      this.setGrabbable(e, false);
    }
  }

  private onRelease(e: Entity): void {
    const obj = e.object3D;
    if (!obj || (e.getValue(Atom, 'slot') ?? -1) >= 0) return;
    const element = e.getValue(Atom, 'element');
    const pos = obj.getWorldPosition(this.tmp);

    if (this.guideOn) {
      // Nearest matching empty spot wins; otherwise a wrong-element spot
      // under the atom explains what belongs there.
      let match = -1;
      let matchDist = GUIDE_CAPTURE;
      let other = -1;
      let otherDist = GUIDE_CAPTURE;
      this.filled.forEach((isFilled, s) => {
        if (isFilled) return;
        const d = pos.distanceTo(this.slotWorld[s]);
        if (this.level.slots[s].element === element) {
          if (d < matchDist) {
            matchDist = d;
            match = s;
          }
        } else if (d < otherDist) {
          otherDist = d;
          other = s;
        }
      });
      if (match >= 0) return this.place(e, match);
      if (other >= 0) {
        const needed = this.level.slots[other].element;
        return this.reject(e, `This spot needs ${ELEMENT_LABEL[needed]}.`);
      }
    }

    // Closest placed atom the player dropped this one next to.
    let nearSlot = -1;
    let nearDist = NEAR_ATOM;
    this.filled.forEach((isFilled, s) => {
      const d = isFilled ? pos.distanceTo(this.slotWorld[s]) : Infinity;
      if (d < nearDist) {
        nearDist = d;
        nearSlot = s;
      }
    });

    // Open slots of this element that bond to an already placed atom.
    let best = -1;
    let bestDist = Infinity;
    for (const [a, b] of this.level.bonds) {
      for (const [placed, open] of [
        [a, b],
        [b, a],
      ]) {
        if (!this.filled[placed] || this.filled[open]) continue;
        if (this.level.slots[open].element !== element) continue;
        const d = pos.distanceTo(this.slotWorld[open]);
        if ((placed === nearSlot || d < SLOT_CAPTURE) && d < bestDist) {
          bestDist = d;
          best = open;
        }
      }
    }

    if (best >= 0) this.place(e, best);
    else if (nearSlot >= 0) {
      this.reject(
        e,
        this.guideOn
          ? 'Place it on a faint spot of the same color.'
          : `That bond is not in ${this.level.name.toLowerCase()}. Try another spot.`,
      );
    }
  }

  /** `restoring` places instantly and quietly, without saving again. */
  private place(e: Entity, slot: number, restoring = false): void {
    e.setValue(Atom, 'slot', slot);
    this.filled[slot] = true;
    this.placedCount++;
    this.setGrabbable(e, false);
    if (restoring && e.object3D) {
      this.setWorldPosition(e.object3D, this.slotWorld[slot]);
    } else {
      if (!this.access.reduceMotion) e.setValue(Atom, 'popTime', 0);
      this.startTween(e, this.slotWorld[slot], SNAP_TIME);
      this.flash(e, true);
      this.hideHint();
    }

    for (const [a, b, order] of this.level.bonds) {
      const other = a === slot ? b : b === slot ? a : -1;
      if (other >= 0 && this.filled[other]) {
        const lively = !restoring && !this.access.reduceMotion;
        this.spawnBond(this.slotWorld[slot], this.slotWorld[other], order, lively);
        if (lively) {
          const p = this.slotWorld[slot];
          const q = this.slotWorld[other];
          this.emitRing((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2 + 0.045);
        }
        this.bondsDone++;
      }
    }

    const complete = this.bondsDone === this.level.bonds.length;
    if (!restoring && complete) {
      for (const atom of this.queries.atoms.entities) this.flash(atom, true);
      this.sfx.complete();
      if (!this.access.reduceMotion) this.burst.start(this.moleculeCenter());
      this.finishRun();
      this.addTrophy(true);
      console.info(`[Molecule Lab] ${this.level.name} complete!`);
    } else if (!restoring) {
      this.sfx.snap(
        this.placedCount / (this.level.slots.length - 1),
        e.getValue(Atom, 'element') as ElementSymbol,
      );
    }
    if (!restoring) {
      this.persistProgress();
      this.afterPlacement(slot);
    }
    this.formula.update(this.filled, restoring || this.access.reduceMotion ? -1 : slot);
    this.guide.update(this.filled, this.guideOn);
    this.updatePanel();
  }

  private reject(e: Entity, hint: string): void {
    this.returnHome(e);
    this.flash(e, false);
    this.sfx.error();
    this.idleTime = 0;
    if (!this.isComplete() && !this.access.calm) this.mistakes++;
    this.persistProgress();
    this.showHint(hint);
  }

  /** Average of the slot positions; reuses tmp2. */
  private moleculeCenter(): Vector3 {
    this.tmp2.set(0, 0, 0);
    for (const p of this.slotWorld) this.tmp2.add(p);
    return this.tmp2.multiplyScalar(1 / this.slotWorld.length);
  }

  /** Quietly sends a free atom home, e.g. when play is paused mid-grab. */
  private setAside(e: Entity): void {
    if ((e.getValue(Atom, 'slot') ?? -1) >= 0) return;
    this.idleTime = 0;
    this.returnHome(e);
  }

  private returnHome(e: Entity): void {
    const home = e.getVectorView(Atom, 'home');
    this.tmp2.set(home[0], home[1], home[2]);
    this.startTween(e, this.tmp2, RETURN_TIME);
  }

  /** Ring that expands and fades at the middle of a new bond. */
  private emitRing(x: number, y: number, z: number): void {
    const i = this.ringNext;
    this.ringNext = (i + 1) % RING_POOL;
    this.ringAge[i] = -STICK_DELAY;
    this.rings[i].position.set(x, y, z);
    this.rings[i].scale.setScalar(0.6);
    this.rings[i].visible = false;
  }

  private updateBondFx(delta: number): void {
    for (let i = this.growing.length - 1; i >= 0; i--) {
      const g = this.growing[i];
      g.t += delta;
      if (g.t < 0) continue;
      const k = Math.min(g.t / STICK_GROW_TIME, 1);
      const ease = 1 - (1 - k) * (1 - k);
      const len = Math.max(g.length * ease, 0.0001);
      g.stick.scale.y = len;
      g.stick.position.copy(g.from).addScaledVector(g.dir, len / 2);
      g.stick.visible = true;
      if (k >= 1) this.growing.splice(i, 1);
    }
    for (let i = 0; i < RING_POOL; i++) {
      if (this.ringAge[i] >= RING_TIME) continue;
      this.ringAge[i] += delta;
      if (this.ringAge[i] < 0) continue;
      const k = Math.min(this.ringAge[i] / RING_TIME, 1);
      this.rings[i].visible = k < 1;
      this.rings[i].scale.setScalar(0.6 + 1.6 * k);
      this.ringMats[i].opacity = 0.95 * (1 - k) * (1 - k);
    }
  }

  private spawnBond(a: Vector3, b: Vector3, order: 1 | 2, animate = false): void {
    const dir = new Vector3().subVectors(b, a);
    const length = dir.length();
    dir.normalize();
    const side = new Vector3()
      .crossVectors(dir, this.planeNormal)
      .normalize()
      .multiplyScalar(DOUBLE_BOND_OFFSET);
    const offsets = order === 2 ? [1, -1] : [0];
    for (const o of offsets) {
      const stick = new Mesh(this.bondGeo, this.bondMat);
      stick.name = 'BondStick';
      stick.position
        .addVectors(a, b)
        .multiplyScalar(0.5)
        .addScaledVector(side, o);
      stick.quaternion.setFromUnitVectors(this.up, dir);
      stick.scale.set(1, length, 1);
      if (animate) {
        // Grows from the atom that was just placed toward its partner.
        stick.visible = false;
        stick.scale.y = 0.0001;
        this.growing.push({
          stick,
          from: new Vector3().copy(a).addScaledVector(side, o),
          dir: dir.clone(),
          length,
          t: -STICK_DELAY,
        });
      }
      this.world.createTransformEntity(stick).addComponent(Bond);
    }
  }

  private startTween(e: Entity, to: Vector3, duration: number): void {
    const obj = e.object3D;
    if (!obj) return;
    obj.getWorldPosition(this.tmp);
    const from = e.getVectorView(Atom, 'tweenFrom');
    from[0] = this.tmp.x;
    from[1] = this.tmp.y;
    from[2] = this.tmp.z;
    const target = e.getVectorView(Atom, 'tweenTo');
    target[0] = to.x;
    target[1] = to.y;
    target[2] = to.z;
    e.setValue(Atom, 'tweenDuration', duration);
    e.setValue(Atom, 'tweenTime', 0);
  }

  private flash(e: Entity, good: boolean): void {
    const mat = e.object3D ? this.atomMaterial(e.object3D) : undefined;
    if (!mat) return;
    mat.emissive.setHex(good ? GOOD_GLOW : BAD_GLOW);
    mat.emissiveIntensity = 0.9;
    e.setValue(Atom, 'flashGood', good);
    e.setValue(Atom, 'flashTime', FLASH_TIME);
  }

  private setWorldPosition(obj: Object3D, world: Vector3): void {
    this.tmp2.copy(world);
    if (obj.parent) obj.parent.worldToLocal(this.tmp2);
    obj.position.copy(this.tmp2);
  }

  private findMesh(obj: Object3D): Mesh | undefined {
    if ((obj as Mesh).isMesh) return obj as Mesh;
    let found: Mesh | undefined;
    obj.traverse((child) => {
      if (!found && (child as Mesh).isMesh) found = child as Mesh;
    });
    return found;
  }

  private atomMaterial(obj: Object3D): MeshStandardMaterial | undefined {
    return this.findMesh(obj)?.material as MeshStandardMaterial | undefined;
  }
}
