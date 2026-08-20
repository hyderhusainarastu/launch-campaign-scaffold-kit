# Asset notes — Lumen Deck (fictional example)

These three files exist only so `build-archive-manifest.mjs` has something small
and real to walk. They are placeholders, not campaign material.

- `cover/cover-proof.png` — a 24x16 colour ramp standing in for a cover proof.
- `clips/deal-chime.wav` — a quarter-second tone standing in for a sound cue.
- `docs/asset-notes.md` — this file, standing in for the notes that usually sit
  beside an asset set.

Run the tool against this directory to see checksums, sizes, and whatever media
probes your machine can supply:

    node ../../../tools/build-archive-manifest.mjs .
