# Molecule Lab: real Quest test checklist

For a tester with a Meta Quest (Quest 3 / 3S preferred) and, if possible, Meta VR Glasses.
Everything below was built and checked in the Immersive Web Emulator only. Nothing here
has run on a headset yet, so please note what you see, even if it works.

- Game: https://iancuileana83-lab.github.io/molecule-lab/ (open in the Quest Browser)
- Hand tracking must be on: Settings > Movement tracking > Hand tracking. Put the
  controllers down and leave them off for the whole test.
- Sit at a table or desk, as you would to play. Say which chair/seat height you used.

## 1. Start and first 30 seconds

- [ ] The page loads in under about 15 s on Wi-Fi. Time it: ____ s
- [ ] The title screen is readable and the **Enter VR** button works with a pinch ray.
- [ ] After entering VR, a soft chime plays and the lanterns brighten.
- [ ] After about 3 s one atom glows and a bead of light travels to a glowing spot.
- [ ] The first atom can be picked up with a pinch **without leaning or stretching**.
- [ ] The first bond snaps with sparks and a chime; the panel says "Nice! That's your first bond."
- [ ] Clear the site data (or use a private window) to see this introduction again.

## 2. Hands only, no controllers

- [ ] Every action works with hands: pick up atoms, place them, press every panel button,
      open Settings and the Molecules menu, Next molecule, Build again.
- [ ] Atoms are never picked up by accident when the hand only passes near them.
- [ ] Losing hand tracking for a moment (hand out of view) while holding an atom sends
      the atom home and does not count as a mistake.

## 3. Reach (seated, within about 60 cm)

The emulator cannot judge this; it matters for the competition's seated rule.

- [ ] Without leaning, you can reach every atom in the tray (both ends of both rows).
- [ ] You can reach the top of the finished molecule and the panel buttons.
- [ ] The table is set to **Near** by default (15 cm closer than the original layout). Is that
      comfortable? Try Normal and Far too and note which felt best: ______
- [ ] Settings > Height Lower/Higher helps if the molecule is too high or low for you.
- [ ] Looking at the bottom row of panel buttons (Molecules, Settings, Build again): is it
      comfortable, and on Meta VR Glasses is it inside the view (see the audit below)?

## 4. Untested items that need a headset

- [ ] **Finger press (poke) on panel buttons.** Press Settings, Molecules, Build again and
      the six molecule buttons with an index finger. Does each fire once? Any double presses?
      (The emulator's hands have no usable fingertips, so this path could not be tested there.
      The panel is marked as poke-interactable and the buttons listen to the same pointer
      events as for the ray, so it should work.)
- [ ] **Pinch ray on panel buttons** (index finger and thumb pinch while pointing at a button,
      far or near): every button fires once on release. This was verified in the emulator
      with a hand ray and pinch-select, but real hand-ray aim needs a check.
- [ ] **Pause with the Meta menu while holding an atom.** Hold an atom, press the Meta
      button, then return. The atom must go back to its tray spot, and no mistake or time
      penalty may appear (the timer must not run during the pause).
- [ ] **Pause while holding the finished molecule** (inspect mode, one or two hands). On
      return the molecule must be back in its place at normal size.
- [ ] **Pause during a story scene** (cup, leaf, tablet): it should continue or end, not freeze.
- [ ] Take the headset off and put it on again mid-molecule; progress must be intact.
- [ ] Reload the page mid-molecule: the same atoms are placed. Reload after finishing:
      the trophy is still in the cabinet.
- [ ] Finish a molecule, then spread both hands apart: the atoms glow, then the molecule
      comes apart. Does this ever happen when you only wanted to resize? ______
- [ ] Reach assist (Settings): a hand ray plus pinch picks up atoms from a distance.

## 5. Comfort and legibility

- [ ] The panel (right) and the info card (left, after finishing) are readable and fully in view
      when you look at them. Does looking at the panel strain the neck?
- [ ] The atom letters (C, N, O) are readable on atoms and on the guide spots.
- [ ] The textbook formula on the panel is readable.
- [ ] The trophy cabinet is on the left of the bench. Can you see the trophies by turning your
      head? Are the upper-shelf trophies too high to look at comfortably? Are they legible?
- [ ] Sounds are audible and pleasant at normal volume. Mute works.
- [ ] No motion discomfort. Try Reduce motion and Calm mode.

## 6. Performance

- [ ] Smooth at 72/90 fps while placing atoms and during the sparks and story scene.
      Use the OVR Metrics Tool or the Quest Browser performance overlay if available.
      Note any dropped frames: ______
- [ ] No heating or slowdown after 15 minutes.

## 7. Play every molecule

Paracetamol, aspirin, caffeine, ibuprofen, vitamin C, vanillin (Molecules button picks one).

- [ ] Each can be completed with the guide on and, for one, with the guide off.
- [ ] Each shows its fact on the card, and the stars and time are sensible.
- [ ] A full session of the first three molecules takes under 10 minutes. Time: ____

## 8. Meta VR Glasses (only if available)

- [ ] Look at an atom and pinch: the atom you look at is the one that is picked up.
- [ ] Gaze accuracy and comfort: do small atoms get missed? Is looking at the atoms tiring?
- [ ] The panel and the info card fit the glasses' narrow view (about 25 degrees up, 43 down).

## What the emulator audit found (for the maintainer)

Measured by calculation from the code, with the seated head at the rig origin (head about
1.2 m high, 5 cm behind the origin) and variations of the head position of about 12 cm
sideways, 10 cm in height and 15 cm in depth. Real seat position and arm length will differ.

- **Reach.** With the original table position (Normal), 50 of 70 tray atoms (all six levels
  together) and the panel centre were farther than 60 cm from the head (tray up to 70 cm,
  molecule up to 66 cm, panel centre 67 cm). Since the table was moved nearer, **Near is now the
  default**: the tray reaches at most 60 cm (97% of the tray within 60 cm), the molecule at
  most 54 cm and the panel centre is 59 cm away. Measured from the shoulders instead of the
  head the numbers are a little worse (tray up to 64 cm with Near), so reach on the real device
  is still the item to check. People who already saved a Table choice keep it.
- With Near, the bottom corner of the panel is about 45 degrees below the straight-ahead
  view (38 degrees with Normal). Meta VR Glasses see about 43 degrees down, so the lowest
  buttons may sit at the very edge of their view; look down slightly to read them.
- No atom or guide spot of any of the six molecules is hidden by the panel, the info card, the
  cabinet or the story scene, from any of the tested head positions. A few tray atoms
  (about 1%) are partly behind the panel from extreme head positions.
- The trophy cabinet is up to about 60 degrees to the side, and its upper shelf up to
  about 30 degrees above the eye for low head positions (the glasses see 25 degrees up). It is
  decoration only, but it may be uncomfortable to look at.
- **Hand ray clicks on panel buttons work in the emulator.** The buttons react to generic pointer
  events (pointer down and up), not to a controller-only event, so a hand-tracked pinch ray
  and a controller ray take the same path. In a hand-input session with the controllers
  switched off, a hand ray with pinch-select activated Molecules, a molecule choice, Settings,
  Hide guide, Mute, Calm mode, Reduce motion, Reach assist, Table Near and Height Lower. The
  earlier failures in this audit were wrong aiming by the test script. Finger poke cannot be
  tried in the emulator (no fingertip support).
- Not measured after Phases 9 to 12: triangle count and draw calls (Phase 5 was about 11,000
  triangles in about 20 meshes for the room).
