# Molecule Lab — Roadmap

Entry for the **Meta VR Start Developer Competition 2026** (deadline **November 18, 2026**),
Gaming track, New Experience division.

A seated, hands-first VR puzzle: the player builds the molecules of everyday medicines
(paracetamol, aspirin, caffeine) by pinching atoms and bringing them together; correct
bonds snap into place, and each finished molecule reveals a short fact.

> Read this file at the start of every work session. Update the phase status after each
> finished phase, in the same commit as the phase.

## Mandatory competition rules

These apply to every phase. A feature that breaks one of them is not done.

- **Hands only, no hover.** Fully playable end to end with hands, no controllers
  required. Use pinch, grab and poke only; hover never fires on Meta VR Glasses.
- **Seated, within reach.** Everything the player must touch is within about a
  two-foot (~60 cm) radius of a seated player.
- **Short session.** A fast start and a satisfying full session in under 10 minutes.
- **Clean pause and resume.** Leaving VR, a system pause or a page reload never loses
  progress or judges an interrupted grab as a mistake.
- **Original work.** Models are built from simple shapes in code or are original; no
  downloaded models with unclear licenses. Sounds are synthesized in code. The game is
  not a wrapper around any third-party service.
- **Runs smoothly on the headset.** Target 72–90 fps; no per-frame allocation; keep
  particle counts and draw calls small.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | Sounds, particles, atom letters | done |
| 2 | Stars and best score per molecule | done |
| 3 | Publish to GitHub Pages so testers can open a link | done |
| 4 | Gaze + pinch support for Meta VR Glasses, fully playable | done |
| 5 | Visual polish: a warm old apothecary instead of the grey lab | done |
| 6 | First 30 seconds: an opening that shows what to do and feels good | done |
| 7 | 2D textbook formula on the panel that lights up as atoms are placed | done |
| 8 | Accessibility package | next |
| 9 | Medicine cabinet with miniature trophies of completed molecules | planned |
| 10 | Inspect the finished molecule with one or two hands; pull it apart with two hands to rebuild | planned |
| 11 | Story moments: caffeine into a coffee cup, aspirin on a willow leaf, paracetamol into a tablet | planned |
| 12 | Optional: more molecules (ibuprofen, vitamin C, vanillin) with a selection menu | planned |
| 13 | Real Quest test, demo video under 3 minutes, Devpost submission form | planned |

### Phase details

1. **Sounds, particles, atom letters** — synthesized Web Audio effects (placement ding
   that rises as the molecule grows, soft mistake tone, completion arpeggio), a small
   spark burst on completion, a Mute sound / Unmute sound button (saved), and C/N/O
   letters on atoms and guide spots.
2. **Stars and best score** — one star each for Built (always), Time (within the level
   limit: paracetamol 2:00, aspirin 2:30, caffeine 2:45) and Precision (at most 2
   mistakes). The timer starts at the first grab, ignores pauses and time out of VR, is
   hidden during play and shown only at the end; the guide does not affect stars. Time,
   mistakes and the best result per molecule are saved (more stars wins, then faster).
3. **GitHub Pages** — live at https://iancuileana83-lab.github.io/molecule-lab/
   (repository https://github.com/iancuileana83-lab/molecule-lab). The workflow
   `.github/workflows/deploy.yml` builds and publishes on every push to `main`;
   Pages source is "GitHub Actions". Commits use the GitHub noreply email.
4. **Gaze + pinch** — gaze tracking is requested as an optional XR feature. When the
   session offers an eye-gaze source (Meta VR Glasses), atoms become distance-grabbable:
   look at an atom, pinch with either hand, move the hand; a held atom glows softly and
   the panel instructions adapt. Quest keeps near pinch only (distance grab there is a
   candidate for the accessibility phase). The level is laid out again through the save
   when the mode changes. Verified in the emulator on Meta VR Glasses (all three
   molecules, mistakes, every panel button, guide on/off) and on Quest 3 (near pinch,
   reload restore). Real eye-tracking accuracy needs a device. Also fixed along the way:
   atom letters no longer intercept rays, and panel buttons activate on press-then-release
   so slow pinches are not lost to the 300 ms click limit.
5. **Visual polish** — turn the grey lab into a warm old pharmacy (apothecary): wood,
   glass jars on shelves, brass details, warm soft light. Atoms look glossy and
   pleasant, with a short, satisfying animation each time a bond forms. Everything
   built from simple shapes and code-generated textures, no downloaded models. Must
   stay smooth on the headset (few lights, simple geometry), and colour contrast and
   text must stay easy to read. Built: procedural apothecary (plank floor, sage walls with
   wainscot, marble-topped bench, drawer wall, jar shelves with Latin labels and one Rx,
   Hygeia sign, lanterns, beams, rug); mortar and brass balance on a far counter, out of
   reach; wall behind the molecule kept mid-tone and free of props. Textures come from
   code (DataTexture math; canvas painting for labels/sign at runtime), the room is ~8k
   triangles merged into 20 meshes, scene ~11k, no extra lights. Atoms are glossy with a
   dark ink outline (edge contrast about 4.6:1 vs the wall; the oxygen body alone is only
   about 2.1:1), guide spots have bright rings, bonds animate (pop, growing stick, ring).
   Measured on the desktop emulator: 60 fps steady, 2 dropped frames in 3,600 while
   placing atoms; headset fps still needs a real device.
6. **First 30 seconds** — an opening that makes the player understand immediately
   what to do and feel a small joy, e.g. the first atom discreetly "inviting" the
   player to grab it; no long tutorial and no hover. Built: a title screen before VR
   (description, a discreet credit line and a big Enter VR button; game UI hidden until
   VR); on entering VR a soft chime (respects Mute), lanterns fade up and the guide
   sketch draws itself; after 3 s one atom breathes, its target spot pulses and a bead
   of light travels between them (purely time-driven, no hover or gaze dependence);
   the panel coaches in big text ("Pick up the glowing atom." / "Now bring it to the
   glowing spot." / "Nice! That's your first bond.") with sparks, a chime and a lantern
   flash on the first bond. The full introduction runs once per device (saved); later
   the calm hint (breathing atom + bead) appears only after 12 s of stillness. Gaze
   variant on Meta VR Glasses ("Look at the glowing atom and pinch."). The timer still
   starts only at the first grab. To see the introduction again, clear the site's
   local data or use a private window.
7. **Textbook formula** — a 2D skeletal formula on the panel whose atoms light up as
   they are placed. Built: `src/formula-card.ts` draws it on a canvas (reusing the guide's
   2D coordinates; carbons as dots, O/N as letters with implicit hydrogens such as OH, NH,
   HO) and the panel shows it through a UIKit `<img>` whose `src` is that texture. Unplaced
   parts are faint pencil, placed parts take ink (red O, blue N, black bonds once both ends
   are placed) and the newest atom gets a short golden pulse; it redraws only on change.
   It is shown only while the guide is on, except that a finished molecule always shows
   it fully lit as a reward. The panel is taller (542 units in play, 858 when finished) and
   sits 11 cm higher (y 1.2); checked by calculation that it covers no guide spot of any
   molecule from any seated head position and that its bottom edge stays about 6.6 cm
   above the bench. Verified in the emulator: lighting, reload restore, Hide/Show guide,
   reward with the guide off.
8. **Accessibility package** — move the table closer/farther, fully playable with one
   hand, a distinct sound per element, a calm mode without timer, atom letters.
   Aiming for the *Best Accessibility Forward Interaction* bonus award.
9. **Medicine cabinet** — miniature trophies of completed molecules on the left end
   of the bench, kept in the save; must not clash with the atom tray or the guide.
10. **Inspect and take apart** — after completion, grab the molecule with one hand to
   move and rotate it, or two hands to rotate and scale; pull it apart with two hands
   to rebuild.
11. **Story moments** — 3–5 s animations using a small copy of the finished molecule, so
   the full molecule stays inspectable. Decorative only; no medical or treatment claims.
12. **More molecules (optional)** — ibuprofen, vitamin C, vanillin, with a selection menu.
13. **Submission** — real Quest test, demo video under 3 minutes, Devpost form.

## Already built (before the numbered phases)

- Calm procedural lab room, seated layout, pinch-to-grab atoms (hand pinch enabled).
- Three levels: paracetamol, aspirin, caffeine; Next molecule, Build again,
  Play again from level 1.
- Snap-to-bond rule with red flash and panel hint on mistakes.
- Seed atom with a start-here ring and glow until the first placement.
- See-through guide of the target molecule with Hide guide / Show guide (saved);
  "Atoms placed" counter with the guide on, "Bonds" counter with it off.
- Progress, level, guide and sound preferences saved in local storage; pause, VR exit
  and reload resume exactly where the player left off.

## Known open checks

- Gaze accuracy and comfort on real Meta VR Glasses cannot be judged in the emulator.
- Emulator device stays on Quest 3 in `iwsdk.config.json`; switch `dev.emulator.device`
  to `metaVRGlasses` locally only to test gaze (do not commit it).
- Poke (finger press) on panel buttons and the Meta system-menu pause while holding an
  atom can only be verified on a real headset; the emulator covers pinch-ray clicks.
- Sounds cannot be heard in automated emulator tests; only their error-free triggering
  is verified.
