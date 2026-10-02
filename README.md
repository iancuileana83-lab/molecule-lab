# Molecule Lab

A calm, hands-only VR puzzle for a seated player. In a cosy old apothecary you build the
molecules of everyday substances by pinching atoms and bringing them together. Correct bonds
snap into place, and every finished molecule reveals a short fact and becomes a small trophy
in a glass cabinet.

**Play it now (free, nothing to install):**
https://iancuileana83-lab.github.io/molecule-lab/

Open the link in the Meta Quest Browser with hand tracking turned on, then press **Enter VR**.
It is an entry for the Meta VR Start Developer Competition 2026 (Gaming, New Experience).

> Molecule Lab is for education and fun. It does not give medical advice.

Made by Ileana Mazilu, a pharmacy professional with 20 years in community pharmacy.

## How to play

- **Hands only, seated.** No controllers are needed. Sit at a table; everything you touch is
  within a seated reach of about 60 cm.
- **Pinch an atom** and bring it next to the growing molecule. A correct bond snaps into place
  with a bell note that rises as the molecule grows. A wrong one bounces back with a soft tone.
- A **faint guide** shows where each atom goes (it can be hidden), and a **textbook formula** on
  the panel lights up atom by atom.
- A finished molecule shows a **fact**, earns up to three **stars** (built, quick, precise) and
  becomes a **trophy** in the cabinet on your left.
- You can **turn a finished molecule** in one hand, **resize** it with two hands, or **pull it
  apart** with two hands to build it again.
- Paracetamol, aspirin and caffeine also get a short decorative scene when finished.
- The **Molecules** button picks any of the six molecules; progress is saved on the device, so
  leaving VR, a pause or a reload never loses your work.
- On Meta VR Glasses, look at an atom and pinch to pick it up.

## The six molecules

| Molecule | Formula |
|---|---|
| Paracetamol | C8H9NO2 |
| Aspirin | C9H8O4 |
| Caffeine | C8H10N4O2 |
| Ibuprofen | C13H18O2 |
| Vitamin C | C6H8O6 |
| Vanillin | C8H8O3 |

## Accessibility

All options are on the **Settings** page of the panel, work with a pinch, and are saved.

- Every action works with **one hand**.
- **Calm mode:** no timer, mistakes not counted, no time or precision stars.
- **Reduce motion:** no pulsing, sparks or travelling light, only steady highlights.
- **Reach assist:** pick up atoms from a distance with a hand ray.
- **Table distance and height:** move the table (nearer by default), lower or higher.
- **Guide** on or off, **Mute**, element letters (C, N, O) on atoms, a different sound for each
  element, and a dark outline on every atom for contrast.

## Tech stack

- WebXR with the [Immersive Web SDK](https://iwsdk.dev/) (IWSDK) and Three.js, in TypeScript,
  built with Vite.
- Everything is made in code: the room, atoms, bonds, cabinet and story objects come from
  simple shapes and generated textures, and every sound is synthesized with Web Audio. There
  are no downloaded models or sounds.
- Published to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Run it locally

You need Node.js 22.12 or newer (see `.nvmrc`).

```sh
npm install
npm run dev
```

`npm run dev` starts the dev server and opens a managed browser with the Immersive Web
Emulator (IWER), where you can play with emulated hands. Other scripts: `npm run typecheck`
and `npm run build`.

Project notes: `ROADMAP.md` (phases and status), `TESTING.md` (checklist for a real headset),
`VIDEO_PLAN.md` and `SUBMISSION.md` (competition material).

## How it was made

I designed Molecule Lab and built it with an AI coding assistant, Claude Code, checking every
molecule structure and fact myself. It has been tested in the Immersive Web Emulator; a test on
a real headset is still to come.
