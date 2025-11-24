# Repository Guidelines

## Project Structure & Module Organization
- `palide/ai_studio_code-2.html`: Single-page experience containing inline HTML, CSS, and JavaScript for the Polaroid camera wall. Treat this as the source of truth when editing behavior or layout.
- `palide/polaroid.jpg`: Camera shell artwork referenced by the page; keep the filename and relative path stable.
- Remove platform artifacts like `palide/.DS_Store` before sharing or committing.

## Build, Test, and Development Commands
- Static site—no build step. Open directly in a modern browser or serve locally to satisfy camera permissions:  
  `cd palide && python -m http.server 8000` then visit `http://localhost:8000/ai_studio_code-2.html`.
- If you add new assets, keep them alongside the HTML or adjust relative paths accordingly.

## Coding Style & Naming Conventions
- Indent with 4 spaces; avoid tabs. Keep CSS and JS blocks readable with logical section comments.
- Use kebab-case for CSS class names (`.camera-container`, `.shutter-trigger`) and camelCase for JS identifiers (`initCamera`, `triggerFlash`).
- Favor `const`/`let` over `var`; keep functions small and focused. Inline comments are fine for non-obvious math (e.g., positioning calculations).
- Match existing visual direction (warm palette, paper texture, drop shadows) when adding UI elements.

## Testing Guidelines
- No automated tests yet; perform manual checks after changes: load via local server, allow camera, take a snapshot, confirm flash animation, image capture, development effect, and drag-and-drop still work.
- Verify responsiveness: camera UI anchored bottom-left, photos draggable without jitter, and no console errors.
- When altering media handling, test on at least one desktop browser with webcam support and confirm mirrored preview is preserved.

## Commit & Pull Request Guidelines
- Prefer small, focused changes. Use clear messages (e.g., `feat: add exposure control`, `fix: stabilize drag handling`).
- In PRs, include a brief description of what changed, manual test steps run, and before/after screenshots or GIFs if visuals changed.
- Note any new assets or permissions required. Keep HTML/CSS/JS diffs readable by grouping related edits and avoiding mixed whitespace/style shifts.

## Security & Configuration Tips
- Camera access requires `localhost` or HTTPS; handle permission denials gracefully and log errors. Avoid shipping code that auto-saves or transmits captured images without explicit consent.
- Keep dependencies zero where possible; if you introduce third-party scripts, document their purpose and hosting location.
