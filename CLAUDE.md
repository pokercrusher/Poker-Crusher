# Poker Crusher — Project Memory

## Tech Stack
- Vanilla HTML/JS, no frameworks. Tailwind CSS (local build).
- Deployed to GitHub Pages (`pokercrusher.github.io`).
- Tests: Vitest (`npm test`), suite in `tests/engine.test.js`.
- CSS rebuild: `npx tailwindcss -i src/input.css -o tailwind.min.css --minify`

## Key Files
| File | Purpose |
|------|---------|
| `ranges.js` (8600 LOC) | All range data, `POSTFLOP_STRATEGY_V2`, hand classifiers, `PLAYER_TYPE_RANGE_PROFILES` |
| `sim.js` (1880 LOC) | Full Hand Trainer state machine (`createHandRun`), `_runPreflopTableLoop` |
| `engine.js` (1230 LOC) | `computeCorrectAction`, `checkRangeHelper`, SR (spaced rep) engine |
| `training.js` (4800 LOC) | `generateNextRound`, medals, challenges, session loop |
| `ui.js` (4090 LOC) | Table rendering, `animateChip`, `showActionBadge`, seat coords |
| `drills.js` (1790 LOC) | Math/decision drills (POT_MATH, POT_ODDS, BET_SIZE, etc.) |
| `challenge.js` (830 LOC) | 24-node DAG challenge path, 8-tier medal system |
| `cloud.js` (1320 LOC) | Firebase sync, profile management, `safeGet`/`safeSet` |
| `scenarios.js` (2260 LOC) | Math drill data, SR key taxonomy |

## Current Full Table Trainer (sim.js)
- `createHandRun({ lane: 'FULL_TABLE' })` — entry point
- `_runPreflopTableLoop(hr)` — simulates 9-player preflop, then **collapses to 2-player heads-up** for postflop
- Postflop uses `POSTFLOP_STRATEGY_V2` (GTO only, heads-up spots)
- Hero decision is graded vs GTO; no bankroll, no persistence beyond SR tracking
- When hero folds → hand ends immediately (no spectator mode)

## Poker Room — BUILT (2026-07-03)

The Play-vs-AI mode is live. Passes 1–5 and 7 are shipped; Pass 6 polish
(card-flip/chip animations) is deliberately absorbed into the state-driven
renderer and mostly unnecessary.

### Files
| File | Purpose |
|------|---------|
| `poker-room.js` (~1500 LOC) | Engine: multi-round preflop actor loop, hand-strength-gated postflop AI, kicker-aware 5-card showdown (`_PR_rank5`), side pots, archetype preflop score gates, persistence (`pc_poker_room_v1`), `PR_buildHandSeatsRotated` |
| `poker-room-ui.js` (~330 LOC) | Lobby: bankroll, stake chips + buy-in slider, table size (players incl. hero), type-mix editor, hero profile + villain seat editor, study-mode toggle |
| `poker-room-table.js` (~550 LOC) | Live table: state-driven renderer + ONE cancellable async loop per hand (no setTimeout choreography), speed scalar, spectator = same loop, settlement, rebuy, villain popups, session panel |

### Architecture decisions (deviations from the original 7-pass spec)
- **Hero is a seat, not a label**: tableConfig stores VILLAINS only (stable ids
  v1..vN). Each hand `PR_buildHandSeatsRotated` deals position labels clockwise
  around fixed physical players; offset++ moves the button. Hero profile
  (name + avatar) persists in room state.
- **State-driven table**: every engine action → full re-render from state.
  Speed (slow/normal/fast, persisted) is one delay scalar. A token cancels
  stale loops. Spectator mode after hero folds is the same loop.
- **Villain types hidden** in lobby/table; revealed only in the tap-a-seat
  popup alongside live VPIP/PFR — reading opponents is the gameplay.
- **Study mode** (opt-in, room state): graded preflop decisions at the table
  feed the trainer SR queue via `buildSRKey` — errors → 'Again' (become review
  cards), correct → 'Good' (real play maintains intervals), mixed skipped.
  Spot metadata rides on `heroGrades[].spot` = {scenario, heroPos, oppPos, hand}.
- Chip movement has ONE choke point (`_PR_applyAction`): calls/limps derive
  from facing amount, commitments clamp at stack → all-in, conservation is
  property-tested (300 random hands/run).

### Engine invariants (tests/engine.test.js, ~125 tests, run vs PRODUCTION code)
- Tests load real files via `tests/helpers/load-production.js` (node:vm).
  NEVER copy production functions into tests — a drifted copy once masked a
  showdown that awarded no pots.
- Conservation property test + kicker battles + split pots + side pots +
  walk/BB-option + 3-bet re-act + archetype gates + persistence round-trips.

### Remaining Poker Room work
- Pass 6 cosmetic polish: card-flip animation, chip-slide to winner (optional).
- Postflop grading depth: replace the tier heuristic with POSTFLOP_STRATEGY_V2
  lookups where heads-up-equivalent spots exist.
- Betting completeness (audit §5.4 leftovers): min-raise rule, uncalled-bet
  refund fairness for undercall all-ins, side-pot eligibility for partial calls.
- Named villain profiles persisting across sessions (optional Pass 7 ext).

## Trainer notes (2026-07-02 fixes)
- `isTerminal` = hero folded OR <2 active (NOT "any fold").
- Villains can 3-bet hero's open in FULL_TABLE; hero re-acts via
  `preflop_vs3bet` node; hero-call → CALL_3BP lane when supported.
- Cold-vs-3bet grades vs premium heuristic (QQ+/AK), not opener ranges.
- Calls (hero + villain) pay maxCommitted − own committed, never the raiser's
  incremental size.

## Deployment checklist additions
- Rebuild `tailwind.min.css` whenever new utility classes appear in ANY js/html
  (`npx @tailwindcss/cli -i src/input.css -o tailwind.min.css --minify`).
- GitHub Pages deploys can wedge (build ok, deploy queued forever): re-save
  Settings → Pages source, then push any commit.
