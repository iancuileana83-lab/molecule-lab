# Molecule Lab: Devpost submission drafts

Meta VR Start Developer Competition 2026. Category: Gaming. Division: New Experience.
These are drafts. Check the field names and limits on the live Devpost form, and replace
the placeholders before submitting.

## Tagline (max 140 characters)

Build real molecules, from paracetamol to vanillin, with your bare hands in a cosy VR apothecary. Pinch, snap, learn.

(117 characters)

## Description (under 500 words)

**Inspiration.** I have spent 20 years in community pharmacy, and customers often asked me what is actually inside their medicine. I would explain that every tablet holds an active substance, plus excipients that give the final product its shape, size and colour. The active substance is a molecule, but on paper it is only a row of letters and lines. I wanted people to hold one: to pick up the atoms, feel where each one belongs, and see the whole structure appear in front of them. Molecule Lab is a small, calm puzzle for that moment of "so this is what it looks like".

**What you do.** Sitting at an old apothecary's bench, you build the molecules of six everyday
substances: paracetamol, aspirin, caffeine, ibuprofen, vitamin C and vanillin. You pinch an
atom, bring it next to the growing molecule, and a correct bond snaps into place with a bell
note that rises as the molecule grows. A wrong bond bounces back with a soft tone, never a
punishment. A faint guide shows the target, and a textbook structural formula on the panel lights
up atom by atom. A finished molecule shows a short fact, earns up to three stars (built,
quick, precise) and becomes a small trophy in a glass cabinet. A short decorative scene
follows for three of them: caffeine meets a coffee cup, aspirin a willow leaf, paracetamol a
tablet. You can also turn a finished molecule in your hands, resize it with two hands, or pull
it apart to build it again.

**How it was built.** I designed Molecule Lab and built it with an AI coding assistant (Claude Code), checking every molecule structure and fact myself. Molecule Lab is a WebXR experience made with the Immersive Web SDK
(IWSDK) and Three.js in TypeScript. Nothing is downloaded: the apothecary room, atoms, bonds,
cabinet and story objects are generated from simple shapes and code-made textures, and every
sound is synthesized with Web Audio. Each molecule is described by its real structure (atoms,
bonds, bond orders), and the game checks every bond against it. Progress, stars, trophies and
settings are saved on the device, so leaving VR, a pause or a reload never loses your work. It
is published as a web page, so there is nothing to install.

**Designed for a short seated session.** Everything you touch is within arm's reach of a seated
player, a molecule takes a few minutes, and the first atom invites you after three seconds.

**What I have tested.** I built and checked the game in the Immersive Web Emulator. A test on a
real headset is the next step. [UPDATE after the Quest test.]

**What's next.** More molecules and story scenes for all of them, a choice of languages, a
classroom mode for teachers and pharmacy students, and tuning on real headsets (comfort,
reach and eye-gaze accuracy on Meta VR Glasses).

*Molecule Lab is for education and fun. It does not give medical advice.*

## How hand interactions are implemented

- **Hands only.** The session asks for hand tracking as an optional feature and the game never
  reads a controller button. Every action is a pinch, a grab or a poke; nothing depends on hover.
- **Atoms** use the SDK's near-hand grab with hand pinch mapped to grab. Atoms are about 7 cm
  across so they are easy to pinch. On release, the game decides what the player meant: a
  release near the right spot snaps the atom there; a release near a wrong bond bounces it
  back; a release anywhere else simply returns the atom, with no penalty.
- **Pauses are never judged.** If the headset is taken off, the Meta menu opens or the app is
  suspended, a held atom is quietly returned home and the release is ignored for half a second
  after returning, so an interrupted grab is never counted as a mistake.
- **Panel buttons** fire when a pinch is pressed and then released over them, however long the
  pinch lasts, so slow, careful pinches are not lost to a short click limit. Finger-press
  (poke) is supported too.
- **Finished molecule:** one hand moves and turns it, two hands also resize it; spreading
  the hands far apart takes it apart to rebuild. A growing amber glow warns before it
  separates. Letting go glides it back into place.
- **Meta VR Glasses:** when the session offers eye gaze, the atom you look at is the one a pinch
  picks up (distance grab), and the instructions change to match. Quest players can get the
  same with the hand ray using the Reach assist option.

## Accessibility features

All saved on the device and reachable from a Settings page on the panel with pinch.

- **One hand is enough.** Every action is a single pinch with either hand.
- **Calm mode:** no timer, mistakes are not counted, no time or precision stars, and the
  hint to start appears sooner. Finished molecules still earn their trophy.
- **Reduce motion:** no pulsing, bobbing, sparks, rings, travelling light or story scenes; only
  steady highlights.
- **Reach assist:** pick up atoms from a distance with a hand ray; Meta VR Glasses always use
  gaze plus pinch.
- **Table distance and height:** the table starts at the nearer setting so everything is
  within a seated reach of about 60 cm; it can be moved nearer or farther, and lower or higher, to
  fit the player's seat and reach.
- **Guide on or off:** a see-through guide with the same colours and letters shows where each
  atom goes, and can be hidden for a bigger challenge.
- **Not colour alone:** every atom and guide spot carries its element letter (C, N, O), each
  element has its own sound, and atoms have a dark outline for contrast.
- **Sound:** a Mute button; all game feedback also appears on screen.
- **Readable text:** large panel text with strong contrast, panel and cards sized and placed with the
  limited vertical view of Meta VR Glasses in mind.
- **Pause and resume** never lose progress.

## Target launch date

Already live as a free web experience at https://iancuileana83-lab.github.io/molecule-lab/ (no install needed). A store release will be decided after testing on a real headset.

## Credit line (use as is)

Made by Ileana Mazilu, a pharmacy professional with 20 years in community pharmacy.

## Other fields to prepare

- Built with: WebXR, Immersive Web SDK (IWSDK), Three.js, TypeScript, Vite, Web Audio, GitHub Pages.
- Try it: https://iancuileana83-lab.github.io/molecule-lab/ (Quest Browser, hand tracking on).
- Code: https://github.com/iancuileana83-lab/molecule-lab
- Video: [LINK after upload; see VIDEO_PLAN.md]. State that it was recorded in the emulator.
- Content notes: no downloaded models or sounds; the facts are general public information and
  the story scenes are decorative.
