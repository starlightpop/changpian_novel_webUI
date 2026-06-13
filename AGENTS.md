# Repository Guidelines

## Project Structure & Module Organization

This is a Vite + vanilla JS app for long-form novel planning and agent-driven editing. Main UI and orchestration live in `src/main.js`. Deterministic rules live in `src/domain/`:
`background-semantics.js`, `novel-integrity.js`, `character-integrity.js`, `narrative-memory.js`, and `agent-orchestration.js`.
Tests are in `test/*.test.js`. Static assets are in `src/assets/` and `public/`. Runtime data and generated user files live under `data/`.

## Build, Test, and Development Commands

- `npm run dev` starts the Vite dev server for local work.
- `npm test` runs the Node built-in test runner against `test/*.test.js`.
- `npm run build` creates the production bundle with Vite.

There is no configured lint or formatter. Keep edits consistent with the surrounding style.

## Coding Style & Naming Conventions

Use plain JavaScript with ES modules and 2-space indentation. Prefer small pure helpers in `src/domain/` and keep DOM-heavy logic in `src/main.js`. Use descriptive camelCase for functions and variables, and kebab-case for asset or file names.

## Testing Guidelines

Use `node:test` with `assert/strict`. Name new tests `*.test.js` and keep them focused on one behavior. Add regression coverage when changing validation, memory sync, or commit gates. Run `npm test` before finishing any non-trivial change.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects such as `fix: ...`, `feat: ...`, and `update: ...`. Follow that style. PRs should describe the user-facing change, list validation steps, and include screenshots for UI work or notes about data migrations if `data/`-related behavior changes.

## Agent-Specific Notes

The app enforces strict narrative rules. Do not reintroduce placeholder names, forbidden concepts, or one-off novel-specific repair logic into shared code. When editing `vite.config.js`, remember it also hosts server middleware and persistence logic.
