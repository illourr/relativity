# Relativity, explained

An interactive, arithmetic-first explanation of special relativity, written for
people who don't already believe it.

Open `dist/index.html`. That's the whole thing — one self-contained file, no
build step needed to view it, no network requests, works offline.

## What it covers

1. **The one number that changes everything** — γ, and a light clock drawn from
   two frames to show *why* a moving clock runs slow
2. **What it costs you** — round trips to real destinations at real speeds
3. **"Right now" is not a fact** — simultaneity, and length contraction
4. **The traveller comes home older** — the twin paradox as a spacetime diagram
5. **The wall, not the goalpost** — velocity addition, and the energy curve
6. **Mass is energy, already** — E = mc² as a number rather than a slogan

## How it's built

Every figure is computed at runtime by [`src/relativity.ts`](src/relativity.ts),
which has no dependencies and is covered by 38 assertions. Nothing is
hard-coded — if you change a formula, the whole page follows.

```bash
npm install
npm run check   # typecheck, 38 assertions, build
npm run serve   # preview at http://localhost:8123/
```

`npm run build` bundles `src/playground/` into a single self-contained
`dist/index.html` via esbuild, inlining both the script and the stylesheet.
That is why the published page has no external requests: it can be emailed,
attached to a lecture slide, or opened from a USB stick with no network.

## Scope

Special relativity only: flat spacetime, inertial frames, no gravity. General
relativity — curved spacetime, black holes, cosmic expansion — is a different
and much larger subject, and agrees with everything here wherever they overlap.

The diagrams use one isotropic scale for both axes, so the light-cone edges
really are at 45° and path lengths can be compared honestly. The light clock
caps speed at 99% of c, because past that the geometry cannot be drawn at true
proportions and readable size at the same time.

## Layout

```
src/relativity.ts            physics core, dependency-free, tested
src/relativity.selfcheck.ts  38 assertions
src/playground/              one module per interactive visualisation
  ui.ts                      DOM, formatting, canvas, controls
index.html                   prose and mount points
build.mjs                    esbuild → single-file dist/index.html
```