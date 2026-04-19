# PokerCrusher — Claude Code Project Context

## Project Overview
GTO poker training web app hosted at pokercrusher.github.io. Built in **vanilla HTML/JavaScript with local purged Tailwind CSS** — no frameworks, no runtime npm.

## File Structure & Load Order
All files loaded via `defer` script tags in this exact order:
1. `ranges.js` — range data, POSTFLOP_STRATEGY_V2 registry (312 entries), FAMILY_MODEL registry
2. `scenarios.js` — math drill data (POT_MATH, POT_ODDS, BET_SIZE, OUT_COUNT, etc.) and SR key taxonomy
3. `cloud.js` — Firebase cloud sync (**high-risk, low-touch**)
4. `engine.js` — core SR engine, `generateNextRound`, `checkRangeHelper` (canonical home), `STORAGE_KEYS`, `safeGet`/`safeSet`, `HAND_GRID`
5. `training.js` — training session logic, `sessionBuilder` state, `drillState` (backward-compat shim)
6. `sim.js` — Full Hand state machine (`createHandRun`), all 9 SRP lanes, street-by-street play
7. `challenge.js` — Challenge Path v2: 24-node DAG, 8 tiers, medal system, FAMILY_GROUPS, MEDAL_THRESHOLDS
8. `ui.js` — UI rendering, animations, `initEventListeners()` boot wiring
9. `drills.js` — math & decision drill engine (loaded last, depends on all prior files)
10. `index.html` — entry point, `<link>` to `tailwind.min.css`, script tags

## Core Training Scenarios
**Preflop:** `RFI`, `FACING_RFI`, `RFI_VS_3BET`, `VS_LIMP` (multi-limper buckets), `SQUEEZE`, `SQUEEZE_2C`, `PUSH_FOLD`

**Postflop (flop):** `POSTFLOP_CBET`, `POSTFLOP_3BP_CBET`, `POSTFLOP_DEFEND`, `POSTFLOP_3BP_DEFEND`

**Postflop (turn):** `POSTFLOP_TURN_CBET`, `POSTFLOP_TURN_DEFEND`, `POSTFLOP_TURN_DELAYED_CBET`, `POSTFLOP_TURN_DELAYED_DEFEND`, `POSTFLOP_TURN_PROBE`, `POSTFLOP_TURN_PROBE_DEFEND`, `POSTFLOP_3BP_TURN_CBET`, `POSTFLOP_3BP_TURN_DEFEND`

**Postflop (river):** `POSTFLOP_RIVER_CBET`, `POSTFLOP_RIVER_DEFEND`, `POSTFLOP_RIVER_DELAYED_CBET`, `POSTFLOP_RIVER_DELAYED_DEFEND`, `POSTFLOP_RIVER_PROBE`, `POSTFLOP_RIVER_PROBE_BET`, `POSTFLOP_RIVER_TURN_CHECK_CBET`, `POSTFLOP_RIVER_TURN_CHECK_DEFEND`, `POSTFLOP_RIVER_PROBE_CALL_BET`, `POSTFLOP_RIVER_PROBE_CALL_DEFEND`, `POSTFLOP_3BP_RIVER_CBET`, `POSTFLOP_3BP_RIVER_DEFEND`

## Positions
`UTG / UTG1 / UTG2 / LJ / HJ / CO / BTN / SB / BB`

## Current State
- **Session Builder** (unified config screen) is live. State stored in `gto_session_builder_v1` localStorage key, layered on `gto_config_v2`. Includes family chips (preflop + postflop), position filter, limper mix, push/fold stack depths, session length, and stake/display controls.
- **Full Hand Mode** — live. Plays a full street-by-street SRP hand via `sim.js`. All 9 lanes supported: BTN/CO/HJ/LJ/UTG2/UTG1/UTG vs BB (IP), plus BB vs BTN (OOP) and SB vs BB. Session Mode (persistent stack across hands) also live.
- **Math & Decision Drills** — live in `drills.js`. Drill types: POT_MATH, POT_ODDS, BET_SIZE, OUT_COUNT, RULE_42, and MIXED. SR-keyed per bucket.
- **Challenge Path v2** — live in `challenge.js`. 24-node DAG, 8 tiers, pass/silver/gold medals. Progress stored in `gto_challenge_v2` with v1 migration.
- **Postflop training** — 3BP training is now fully hero-hand-aware across flop + turn + river (13 bettor families via `HERO_HAND_AWARE_3BP_FAMILIES`; 5 defender families via `HERO_HAND_AWARE_3BP_DEFEND_FAMILIES`). SRP hero-hand-aware system covers BTN vs BB and CO vs BB IP spots; remaining SRP PFR families (HJ/LJ/UTG2/UTG1/UTG vs BB, OOP spots) still use HERO_HAND_AWARE_FAMILIES (not full hero-hand class logic). SRP defender coverage expanded to 8 families (Pass A): BTN_vs_BB, CO_vs_BB, SB_vs_BB, HJ_vs_BB, LJ_vs_BB, UTG_vs_BB, BTN_vs_SB, CO_vs_BTN.
- **Strategy Library** has Preflop and Postflop tabs (Overview, Matrix, Archetypes views).

## Hardening — Completed Passes
- **STORAGE_KEYS registry** (`engine.js`) — all 13 localStorage key literals centralised; `safeGet`/`safeSet` helpers with QuotaExceeded toast.
- **PC_DEBUG log gating** — `_log`/`_warn` helpers; all diagnostic console calls gated behind `window.PC_DEBUG`. Enable via `localStorage.setItem('PC_DEBUG','true'); location.reload()`.
- **HAND_GRID** (`engine.js`) — 169-entry static hand table pre-built at startup; eliminates per-call string construction in `sampleHand`.
- **Vitest test suite** (`tests/engine.test.js`) — 72 tests for `checkRangeHelper`, `buildSRKey`, `computeCorrectAction`. Run: `npm test`.
- **Multi-tab safety** (`engine.js`) — `window.addEventListener('storage', ...)` detects competing writes and shows a reload toast.
- **Cloud sync UX** (`cloud.js`) — amber "● Unsynced" dot on dirty state; red "● Sync failing" after 3 consecutive failures; resets on successful save.
- **Tailwind CSS** — CDN replaced with local purged build (`tailwind.min.css`, ~10 KB). Rebuild: `npx tailwindcss -i src/input.css -o tailwind.min.css --minify`.
- **onclick migration** (`index.html` + `ui.js`) — all 57 inline `onclick=` attributes removed; event listeners registered in `initEventListeners()` called from `window.onload`.
- **Pass A — SRP defender expansion** (`ranges.js`, `training.js`) — `DEFENDER_FAMILIES` expanded from 2 to 8 families: BTN_vs_BB, CO_vs_BB, SB_vs_BB, HJ_vs_BB, LJ_vs_BB, UTG_vs_BB, BTN_vs_SB, CO_vs_BTN. All 8 now have `POSTFLOP_DEFEND_STRATEGY` and `POSTFLOP_TURN_DEFEND_STRATEGY` coverage.
- **Pass B — 3BP turn + river** (`ranges.js`, `training.js`, `ui.js`) — Extended 3BP postflop from flop-only to full turn + river. Added 4 strategy registries (`POSTFLOP_3BP_TURN_STRATEGY`, `POSTFLOP_3BP_TURN_DEFEND_STRATEGY`, `POSTFLOP_3BP_RIVER_STRATEGY`, `POSTFLOP_3BP_RIVER_DEFEND_STRATEGY`) and 4 generators (`generate3BPTurnSpot`, `generate3BPTurnDefendSpot`, `generate3BPRiverSpot`, `generate3BPRiverDefendSpot`). Four new training scenarios live; pot sizing in `ui.js` uses 1.66× and 3.3× multipliers over the 3BP flop pot. SR keys encode `potType:'3BP'` to prevent mastery misattribution vs SRP.

## Key Principles — Follow These Always

### Branch strategy
Always push directly to `main`. Do not create feature branches unless the user explicitly requests one.

### Surgical changes only
- Do NOT restructure core functions: `generateNextRound`, SR engine, boot flow, `initEventListeners` wiring, cloud/storage behavior — unless explicitly scoped.
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
- **SRP hero-hand-aware expansion** — SRP PFR turn/river training uses `HERO_HAND_AWARE_FAMILIES` (only the two hero-hand-aware SRP families: BTN_vs_BB, CO_vs_BB). Remaining SRP families (HJ/LJ/UTG2/UTG1/UTG vs BB and all OOP spots) still use non-hero-hand-aware flop fallback logic. 3BP is now fully covered across all streets.
- **XSS via innerHTML** — `.innerHTML` with template literals is used throughout (`training.js`, `ui.js`, `drills.js`, `sim.js`). Current data is internal so no active vector, but needs a dedicated audit pass before any user-derived data touches these paths.
- **Global state isolation** — 158 direct mutations to the shared `state` object across 5 files. Needs own dedicated pass (high regression risk).
- **Hardcoded animation values** in `ui.js` (bet sizes, chip amounts, timeouts) — known audit needed; replace with `UI_CONFIG` constants block.
- **Split `ranges.js`** — ~9,000+ LOC single file (grown with Pass A + Pass B); candidate for splitting into `ranges-preflop.js`, `ranges-postflop.js`, `push-fold.js`.
