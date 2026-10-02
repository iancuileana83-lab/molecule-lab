# Molecule Lab: demo video plan

Target length: **2:45** (hard limit 3:00). No voice-over: game sounds only, plus short
on-screen English captions added in editing. Each caption stays 2 to 3 seconds, one line,
large and high contrast (white on a dark bar), at most about 8 words.

The first 30 seconds hold the strongest material: the payoff first, then the hook of
building with bare hands.

## Recording setup

- Record the game in the Immersive Web Emulator, 1920x1080, browser window not minimized or
  covered (a covered window slows down and drops button presses).
- Use hand input mode, not controllers. The built-in emulator of `npm run dev` (it only runs
  on localhost) supports hand pinch and was used for all testing. If you use the Immersive Web
  Emulator browser extension on the live page instead, check first that its hand input works.
- Record the system audio too (the synthesized chimes and bond sounds are part of the film).
- Hide any browser banners or dev overlays. Use a clean browser profile.
- Pre-fill states through the browser's local storage so each shot starts ready:
  - `molecule-lab:cabinet:v1` = `["paracetamol","aspirin","caffeine"]` for the cabinet shot.
  - `molecule-lab:progress:v2`, a saved near-complete molecule for the opening payoff shot
    (place the last atom, then keep recording).
  - `molecule-lab:intro:v1`: remove it for the first-30-seconds shot so the introduction plays.
- Do two or three takes per shot and cut quickly. Keep Reduce motion off for the video
  (sparks and steam look better), and show it being turned on in the accessibility shot.

## Shot list

| Time | Shot | Caption |
|---|---|---|
| 0:00-0:06 | Cold open: the last caffeine atom snaps in, golden sparks, the molecule glows. | Build the molecules of medicines. |
| 0:06-0:12 | Story scene: a small copy floats above a coffee cup and is taken in, steam rises. | With your bare hands. |
| 0:12-0:17 | Title screen: Molecule Lab, the description and the Enter VR button; click it. | Molecule Lab, a hands-only VR puzzle |
| 0:17-0:30 | Enter VR: chime, lanterns brighten, the guide sketch draws itself; one atom starts to glow and a bead of light travels to its spot. | The game shows you what to do. |
| 0:30-0:42 | First pinch: pick up the glowing atom, bring it to the spot, it snaps with sparks. Panel: "Nice! That's your first bond." | Pinch. Bring. Snap. |
| 0:42-1:05 | Paracetamol: place several atoms quickly. The textbook formula on the panel lights up as each atom lands. One wrong atom flashes red and returns. | The textbook formula lights up as you build. |
| 1:05-1:15 | Molecule finished: arpeggio, sparks, a tablet scene, the info card with the fact and three stars. | Every molecule ends with a fact. |
| 1:15-1:35 | Inspect: grab the molecule with one hand and turn it; two hands resize it; spread the hands wide, the atoms glow amber, it comes apart. | Turn it. Resize it. Pull it apart. |
| 1:35-1:50 | The trophy cabinet on the left: look over, a new trophy pops onto the shelf; pan across the trophies. | Finished molecules become trophies. |
| 1:50-2:05 | Press Molecules; the menu shows six molecules, three green. Pick Ibuprofen; its larger structure and the formula appear. | Six medicines to build. |
| 2:05-2:30 | Settings: toggle Calm mode and Reduce motion, switch Reach assist on and move an atom from a distance, move Table to Near. | Made to be accessible. |
| 2:30-2:45 | Wide shot of the apothecary and the finished molecule. End card on a plain background. | Molecule Lab. Made by Ileana Mazilu, a pharmacy professional with 20 years in community pharmacy. |

End card (last 5 seconds, no caption): game name, the link
https://iancuileana83-lab.github.io/molecule-lab/, "Hands only. Seated. Under 10 minutes."

## Editing notes

- Cut every shot to its shortest clear version; the video should feel quick.
- Keep the cursor and any emulator controls out of frame. In hand mode the hands are shown by
  the emulator; make sure they are visible when pinching.
- Fade the game sound under the end card; do not add music (the game already has synthesized
  sounds).
- State clearly in the Devpost text that the video was recorded in the emulator.
- Do not show or claim any medical effect. The facts in the game are general history and
  information; the story scenes are decorative.
- If the time is over 3:00, drop the Ibuprofen menu shot first, then shorten the accessibility shot.
