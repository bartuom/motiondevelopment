# Motion Development

Browser-native game motion portfolio experiments built with HTML, CSS, SVG, Canvas 2D and vanilla JavaScript.

## Effect 01: Power Shot Impact

The first study is a football power-shot effect and the reusable foundation for later demos.

It combines:

- time-based shot trajectory driven by `requestAnimationFrame`
- SVG trajectory trail and impact vectors
- pooled Canvas 2D particles
- Web Animations API shockwave and net response
- CSS screen shake and UI motion
- live `Subtle`, `Arcade` and `Heavy` presets
- per-effect tuning for power, trail, particles, shake and flash
- five selectable shot targets
- responsive layout and `prefers-reduced-motion` handling

## Runtime architecture

There are no runtime dependencies and no framework.

```text
site/
├── index.html
├── styles.css
└── js/
    ├── main.js
    ├── core/
    │   └── timeline.js
    ├── fx/
    │   ├── particles.js
    │   ├── shake.js
    │   ├── shockwave.js
    │   └── trail.js
    └── demos/
        └── power-shot.js
```

The deployed `site/` directory is already browser-native static output. There is no build step.

## Run locally

Any static HTTP server is enough.

```bash
python -m http.server 8080 --directory site
```

Then open `http://localhost:8080`.

## GitHub Pages

`.github/workflows/pages.yml` publishes the `site/` directory directly to GitHub Pages on pushes to `main`.

In repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**.

## Controls

- `Space`, fire the shot
- `R`, reset
- click the goal, choose the nearest target
- use the target buttons for keyboard-friendly target selection

## Design intent

The effect is intentionally hybrid rather than Canvas-only. The code should make the rendering decision visible:

- DOM and CSS for semantic UI, punch, flash and shake
- SVG for crisp line-based game FX
- Canvas 2D for higher-count procedural particles
- JavaScript for orchestration and time-based simulation

This keeps the demo lightweight, inspectable and directly deployable as static files.
