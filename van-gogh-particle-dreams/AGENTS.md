# Repository Guidelines

## Project Structure & Module Organization
The app is a Vite + React experience that renders a Mediapipe-driven particle scene. Entry points live in `index.html`/`index.tsx`, with the main canvas overlay in `App.tsx`. Reusable pieces sit in `components/` (`Scene.tsx` for particles, `VisionManager.tsx` for webcam and gesture plumbing). Shared data and types live in `constants.ts`, `types.ts`, and `utils/` (e.g., `imageProcessing.ts`). Static assets belong in `public/` (or `public2/` if you need staging variants). Avoid platform artifacts; delete items like `.DS_Store` before committing.

## Build, Test, and Development Commands
- `npm install` — install dependencies.
- `npm run dev` — start the Vite dev server for local iteration.
- `npm run build` — create a production bundle.
- `npm run preview` — serve the built bundle locally to sanity-check production output.
Run from the repo root. For camera permissions, use the dev server or any HTTPS host.

## Coding Style & Naming Conventions
Indent with 4 spaces; avoid tabs. Stick to TypeScript with functional React components, `const`/`let` over `var`, and small, focused functions. Use camelCase for identifiers and kebab-case for CSS class names. Keep inline comments for non-obvious math/geometry; otherwise prefer clear naming. Match the existing warm visual direction (paper-like textures, soft shadows) when adjusting UI, and keep the mirrored preview intact.

## Testing Guidelines
No automated tests yet. Do manual passes after changes: run `npm run dev`, allow camera access, confirm hand detection updates instructions, particles swirl with an open palm, and a closed fist triggers painting transitions smoothly. Check responsiveness (UI pinned correctly, no jitter when interacting) and the browser console for errors. If you adjust media handling, retest on at least one webcam-enabled desktop browser.

## Commit & Pull Request Guidelines
Favor small, focused commits with clear messages (e.g., `feat: add exposure control`, `fix: stabilize drag handling`). PRs should summarize changes, note any new assets or permissions, include manual test steps, and attach before/after visuals when UI shifts. Keep diffs tidy by grouping related HTML/CSS/JS edits and avoiding mixed whitespace changes.

## Security & Configuration Tips
Camera access only works on `localhost` or HTTPS; handle permission denials gracefully and log errors. Do not auto-save or transmit captured imagery without explicit consent. If adding third-party scripts, document their purpose and hosting location.
