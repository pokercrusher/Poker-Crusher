# PokerCrusher — Claude Code Project Context

## Project Overview
GTO poker training web app hosted at pokercrusher.github.io. Built in **vanilla HTML/JavaScript with Tailwind CDN** — no build tools, no frameworks, no npm.

## File Structure & Load Order
All files loaded via `defer` script tags in this exact order:
1. `ranges.js` — range data, POSTFLOP_STRATEGY_V2 registry (312 entries), FAMILY_MODEL registry
2. `scenarios.js` — math drill data (POT_MATH, POT_ODDS, BET_SIZE, OUT_COUNT, etc.) and SR key taxonomy
3. `cloud.js` — Firebase cloud sync (**high-risk, low-touch**)
4. `engine.js` — core SR engine, `generateNextRound`, `checkRangeHelper` (canonical home)
5. `training.js` — training session logic, `sessionBuilder` state, `drillState` (backward-compat shim)
6. `sim.js` — Full Hand state machine (`createHandRun`), all 9 SRP lanes, street-by-street play
7. `challenge.js` — challenge path logic, FAMILY_GROUPS, MEDAL_THRESHOLDS
8. `ui.js` — UI rendering, animations, one-line `checkRangeHelper` alias
9. `drills.js` — math & decision drill engine (loaded last, depends on all prior files)
10. `index.html` — entry point, inline `onclick` wiring, script tags

## Core Training Scenarios
**Preflop:** `RFI`, `FACING_RFI`, `RFI_VS_3BET`, `VS_LIMP` (multi-limper buckets), `SQUEEZE`, `SQUEEZE_2C`, `PUSH_FOLD`

**Postflop (flop):** `POSTFLOP_CBET`, `POSTFLOP_3BP_CBET`, `POSTFLOP_DEFEND`, `POSTFLOP_3BP_DEFEND`

**Postflop (turn):** `POSTFLOP_TURN_CBET`, `POSTFLOP_TURN_DEFEND`, `POSTFLOP_TURN_DELAYED_CBET`, `POSTFLOP_TURN_DELAYED_DEFEND`, `POSTFLOP_TURN_PROBE`, `POSTFLOP_TURN_PROBE_DEFEND`

**Postflop (river):** `POSTFLOP_RIVER_CBET`, `POSTFLOP_RIVER_DEFEND`, `POSTFLOP_RIVER_DELAYED_CBET`, `POSTFLOP_RIVER_DELAYED_DEFEND`, `POSTFLOP_RIVER_PROBE`, `POSTFLOP_RIVER_PROBE_BET`, `POSTFLOP_RIVER_TURN_CHECK_CBET`, `POSTFLOP_RIVER_TURN_CHECK_DEFEND`, `POSTFLOP_RIVER_PROBE_CALL_BET`, `POSTFLOP_RIVER_PROBE_CALL_DEFEND`

## Positions
`UTG / UTG1 / UTG2 / LJ / HJ / CO / BTN / SB / BB`

## Current State
- **Session Builder** (unified config screen) is live. State stored in `gto_session_builder_v1` localStorage key, layered on `gto_config_v2`. Includes family chips (preflop + postflop), position filter, limper mix, push/fold stack depths, session length, and stake/display controls.
- **Full Hand Mode** — live. Players a full street-by-street SRP hand via `sim.js`. All 9 lanes supported: BTN/CO/HJ/LJ/UTG2/UTG1/UTG vs BB (IP), plus BB vs BTN (OOP) and SB vs BB. Session Mode (persistent stack across hands) also live.
- **Math & Decision Drills** — live in `drills.js`. Drill types: POT_MATH, POT_ODDS, BET_SIZE, OUT_COUNT, RULE_42, and MIXED. SR-keyed per bucket.
- **Challenge Path v2** — design complete, implementation not started. 24 nodes, 8 tiers, medal system (pass/silver/gold). Progress schema v2 with v1 migration.
- **Postflop training** — hero-hand-aware system active for BTN vs BB and CO vs BB SRP IP spots. Remaining SRP families (HJ/LJ/UTG2/UTG1/UTG vs BB, OOP spots) not yet hero-hand-aware.
- **Strategy Library** has Preflop and Postflop tabs (Overview, Matrix, Archetypes views).

## Key Principles — Follow These Always

### Surgical changes only
- Do NOT restructure core functions: `generateNextRound`, SR engine, boot flow, inline `onclick` wiring, cloud/storage behavior — unless explicitly scoped.
- `ranges.js` and `cloud.js` are **high-risk/low-touch**.

### All 9 files + index.html must be output together
Every implementation pass must deliver all changed files to prevent accidental omissions on GitHub Pages deployment. The full set is: `ranges.js`, `scenarios.js`, `cloud.js`, `engine.js`, `training.js`, `sim.js`, `challenge.js`, `ui.js`, `drills.js`, `index.html`.

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

### Checklist
1. **Rebuild CSS** (required if any Tailwind class was added or removed):
   ```sh
   npx tailwindcss -i src/input.css -o tailwind.min.css --minify
   ```
   Commit `tailwind.min.css`. Forgetting this step means new utility classes render unstyled in production.

2. **Cache-bust script tags** — after pushing, append the current git short SHA to each `<script src>` in `index.html` so browsers load the new files immediately:
   ```html
   <script src="engine.js?v=abc1234" defer></script>
   ```
   Use `git rev-parse --short HEAD` to get the SHA. This is the fix for the recurring "deployed but still seeing old behaviour" false bug.

3. **Deploy all changed files together** — GitHub Pages serves files independently. A partial deploy (e.g. pushing `training.js` without `engine.js`) can leave the app in a broken state mid-session for active users.

4. **Smoke test after deploy**:
   - Open the app in an incognito window (bypasses cache)
   - Complete one preflop drill — confirm correct answer grades correctly
   - Open DevTools → Network → confirm `tailwind.min.css` loads (not the CDN script)
   - Check Console — no errors should appear (warnings are OK with `PC_DEBUG` off)

### CSS Build
- Source: `src/input.css`
- Output: `tailwind.min.css` (committed, ~10 KB)
- Config: `tailwind.config.js` (scans `*.html` and `*.js` for used classes)
- Run the build command above whenever Tailwind classes change. The CDN is no longer used.

## Known Issues / On The Horizon
- **Challenge Path v2** — primary queued workstream. Design done, implementation not started.
- **Expand hero-hand-aware postflop** — HJ/LJ/UTG2/UTG1/UTG vs BB and OOP spots (BB vs BTN, SB vs BB) still use non-hero-hand-aware postflop logic.
- Hardcoded values in `ui.js` animations (bet sizes, chip amounts) — known audit needed.