import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Vector2,
} from '@iwsdk/core';
import { bevelBox } from './lib/hardsurface.js';

/**
 * Calm lab room for a seated player at the origin facing -Z.
 * Origin: floor level, room centre. Room: 5 m x 5 m x 2.8 m.
 * Bench: top surface at y = 0.72, spans x ±0.6, z -0.35 .. -0.95.
 */
export const BENCH_TOP_Y = 0.72;

const ROOM = 5;
const HALF = ROOM / 2;
const HEIGHT = 2.8;

const mat = {
  floor: new MeshStandardMaterial({ color: 0xc9ccc8, roughness: 0.9 }),
  wall: new MeshStandardMaterial({ color: 0xe8efec, roughness: 0.95 }),
  accentWall: new MeshStandardMaterial({ color: 0xcfe3df, roughness: 0.95 }),
  ceiling: new MeshStandardMaterial({ color: 0xf4f6f5, roughness: 1 }),
  lightPanel: new MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfdf8ee,
    emissiveIntensity: 1,
  }),
  trim: new MeshStandardMaterial({ color: 0xa9b3b0, roughness: 0.7 }),
  benchTop: new MeshStandardMaterial({ color: 0xe9ecea, roughness: 0.45 }),
  benchBody: new MeshStandardMaterial({ color: 0xdfe5e3, roughness: 0.7 }),
  shelf: new MeshStandardMaterial({ color: 0xd8c8b0, roughness: 0.8 }),
  glass: new MeshStandardMaterial({
    color: 0xbfe6f0,
    roughness: 0.15,
    transparent: true,
    opacity: 0.55,
  }),
  liquidA: new MeshStandardMaterial({ color: 0x7cc7b8, roughness: 0.4 }),
  liquidB: new MeshStandardMaterial({ color: 0xe8b86a, roughness: 0.4 }),
};

function mesh(
  name: string,
  geo: Mesh['geometry'],
  m: MeshStandardMaterial,
): Mesh {
  const out = new Mesh(geo, m);
  out.name = name;
  return out;
}

function buildShell(): Group {
  const shell = new Group();
  shell.name = 'Shell';

  const floor = mesh('Floor', new PlaneGeometry(ROOM, ROOM), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  shell.add(floor);

  const ceiling = mesh('Ceiling', new PlaneGeometry(ROOM, ROOM), mat.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = HEIGHT;
  shell.add(ceiling);

  const wallGeo = new PlaneGeometry(ROOM, HEIGHT);
  const walls: Array<[string, number, number, number, MeshStandardMaterial]> = [
    ['WallFront', 0, -HALF, 0, mat.accentWall],
    ['WallBack', 0, HALF, Math.PI, mat.wall],
    ['WallLeft', -HALF, 0, Math.PI / 2, mat.wall],
    ['WallRight', HALF, 0, -Math.PI / 2, mat.wall],
  ];
  const trimGeo = new BoxGeometry(ROOM, 0.1, 0.02);
  for (const [name, x, z, ry, m] of walls) {
    const wall = mesh(name, wallGeo, m);
    wall.position.set(x, HEIGHT / 2, z);
    wall.rotation.y = ry;
    shell.add(wall);
    const trim = mesh(`${name}Baseboard`, trimGeo, mat.trim);
    trim.position.set(x, 0.05, z);
    trim.rotation.y = ry;
    trim.translateZ(0.01);
    shell.add(trim);
  }

  const panelGeo = new BoxGeometry(1.2, 0.02, 0.6);
  for (const [i, z] of [-1.2, 1.2].entries()) {
    const panel = mesh(`CeilingLight${i}`, panelGeo, mat.lightPanel);
    panel.position.set(0, HEIGHT - 0.01, z);
    shell.add(panel);
  }
  return shell;
}

function buildBench(): Group {
  const bench = new Group();
  bench.name = 'Bench';
  const width = 1.2;
  const depth = 0.6;
  const topThick = 0.04;
  const zCenter = -0.65;

  // bevelBox is centred on its origin: width X, height Y, depth Z.
  const top = mesh(
    'BenchTop',
    bevelBox(width, topThick, depth, 0.008, 0.01),
    mat.benchTop,
  );
  top.position.set(0, BENCH_TOP_Y - topThick / 2, zCenter);
  bench.add(top);

  const legH = BENCH_TOP_Y - topThick;
  const sideGeo = bevelBox(0.04, legH, depth - 0.06, 0.005, 0.005);
  for (const [name, x] of [
    ['BenchSideLeft', -width / 2 + 0.05],
    ['BenchSideRight', width / 2 - 0.05],
  ] as const) {
    const side = mesh(name, sideGeo, mat.benchBody);
    side.position.set(x, legH / 2, zCenter);
    bench.add(side);
  }
  // Modesty panel at the back keeps knee space open at the front.
  const back = mesh(
    'BenchBackPanel',
    bevelBox(width - 0.14, legH * 0.6, 0.02, 0.004, 0.004),
    mat.benchBody,
  );
  back.position.set(0, legH - (legH * 0.6) / 2, zCenter - depth / 2 + 0.05);
  bench.add(back);
  return bench;
}

function flask(name: string, liquid: MeshStandardMaterial): Group {
  const g = new Group();
  g.name = name;
  const profile = [
    new Vector2(0.0, 0),
    new Vector2(0.07, 0),
    new Vector2(0.075, 0.02),
    new Vector2(0.03, 0.14),
    new Vector2(0.022, 0.16),
    new Vector2(0.022, 0.22),
    new Vector2(0.026, 0.225),
  ];
  g.add(mesh(`${name}Glass`, new LatheGeometry(profile, 16), mat.glass));
  const fill = mesh(
    `${name}Liquid`,
    new CylinderGeometry(0.045, 0.068, 0.05, 16),
    liquid,
  );
  fill.position.y = 0.027;
  g.add(fill);
  return g;
}

function buildShelf(): Group {
  const shelf = new Group();
  shelf.name = 'WallShelf';
  const z = -HALF + 0.15;
  for (const [i, y] of [1.35, 1.8].entries()) {
    const board = mesh(
      `ShelfBoard${i}`,
      bevelBox(1.6, 0.03, 0.26, 0.005, 0.005),
      mat.shelf,
    );
    board.position.set(0, y, z);
    shelf.add(board);
  }
  const items: Array<[number, number, MeshStandardMaterial]> = [
    [-0.55, 1.365, mat.liquidA],
    [-0.3, 1.365, mat.liquidB],
    [0.45, 1.365, mat.liquidA],
    [-0.1, 1.815, mat.liquidB],
    [0.55, 1.815, mat.liquidA],
  ];
  for (const [i, [x, y, liquid]] of items.entries()) {
    const f = flask(`Flask${i}`, liquid);
    f.position.set(x, y, z);
    shelf.add(f);
  }
  return shelf;
}

function createLabRoom(): Object3D {
  const root = new Group();
  root.name = 'LabRoom';
  root.add(buildShell(), buildBench(), buildShelf());
  return root;
}

export default createLabRoom();
