# PokerCrusher — Claude Code Project Context

## Project Overview
GTO poker training web app hosted at pokercrusher.github.io. Built in **vanilla HTML/JavaScript with Tailwind CDN** — no build tools, no frameworks, no npm.

## File Structure & Load Order
All files loaded via `defer` script tags in this exact order:
1. `ranges.js` — range data, POSTFLOP_STRATEGY_V2 registry (312 entries), FAMILY_MODEL registry
2. `cloud.js` — Firebase cloud sync (**high-risk, low-touch**)
3. `engine.js` — core SR engine, `generateNextRound`, `checkRangeHelper` (canonical home)
4. `training.js` — training session logic, `drillState` (backward-compat shim)
5. `challenge.js` — challenge path logic
6. `ui.js` — UI rendering, animations, one-line `checkRangeHelper` alias
7. `index.html` — entry point, inline `onclick` wiring, script tags

## Core Training Scenarios
`RFI`, `FACING_RFI`, `RFI_VS_3BET`, `VS_LIMP` (multi-limper buckets), `SQUEEZE`, `SQUEEZE_2C`, `PUSH_FOLD`, `POSTFLOP_CBET`, `POSTFLOP_DEFEND`

## Positions
`UTG / UTG1 / UTG2 / LJ / HJ / CO / BTN / SB / BB`

## Current State
- **Session Builder** (unified config screen) is live. State stored in `gto_session_builder_v1` localStorage key, layered on `gto_config_v2`.
- **Challenge Path v2** — design complete, implementation not started. 24 nodes, 8 tiers, medal system (pass/silver/gold). Progress schema v2 with v1 migration.
- **Postflop training** — hero-hand-aware system active for BTN vs BB and CO vs BB SRP IP spots.
- **Strategy Library** has Preflop and Postflop tabs (Overview, Matrix, Archetypes views).

## Key Principles — Follow These Always

### Surgical changes only
- Do NOT restructure core functions: `generateNextRound`, SR engine, boot flow, inline `onclick` wiring, cloud/storage behavior — unless explicitly scoped.
- `ranges.js` and `cloud.js` are **high-risk/low-touch**.

### All 7 files must be output together
Every implementation pass must deliver all seven files to prevent accidental omissions on GitHub Pages deployment.

### Syntax validate before delivering
Run `node --check <file>` on every modified file before considering the task done.

### Backward compatibility is non-negotiable
New state objects/keys must coexist with existing ones. Never replace range objects wholesale.

### Integrate, don't parallel
New features go inside existing UI patterns — not separate entry paths or parallel flows.

### SR key discipline
SR keys must include all relevant context (scenario, position, bucket, hand) to avoid mastery misattribution.

## State Management Patterns
- New feature state objects (e.g., `sessionBuilder`) stored alongside existing state with null-safe guards and fallback paths to legacy behavior.
- New localStorage keys layered on top of existing keys, never replacing them.

## Deployment
- GitHub Pages (pokercrusher.github.io) — all changed files must be deployed together.
- Browser cache issues are a recurring false "bug" — confirm all files are deployed before debugging.

## Known Issues / On The Horizon
- Hardcoded values in `ui.js` animations (bet sizes, chip amounts) — known audit needed.
- Expand hero-hand-aware postflop coverage beyond BTN vs BB and CO vs BB to remaining SRP families.
- Challenge Path v2 implementation is the primary queued workstream.