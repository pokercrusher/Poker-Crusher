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

### Live-optimized identity (Phase 1, 2026-07-08)
- House ranges are deliberately tight = the LIVE baseline (RANGE-AUDIT
  Finding 2 resolved: keep, own it). Grading language says "baseline",
  not "GTO", for house-range verdicts; V2 postflop tables still say GTO
  (they are solver-derived).
- Sizing profile in room state (`sizing: 'live'|'online'`, default live):
  live = 3bb opens +1bb per limper (iso bump in `_PR_deriveTableState`),
  online = 2.5bb. Lobby "Table style" chips; raise slider defaults are
  street-aware (preflop unopened → profile open, vs raise → 3x, postflop
  → 2/3 pot). Trainer already sized live via stake presets ($ opens).
- Phase 2 DONE: persistent regulars roster (`room.regulars` by name:
  {type, avatar, lifetime{handsDealt,vpipHands,pfrHands,threeBetHands,
  sessions}}). `PR_generateTableConfig(..., regulars)` keeps a re-drawn
  name's archetype+avatar forever; `PR_accumulateSeatStats(cfg, hand,
  regulars)` upserts lifetime reads; sanitized on load
  (`PR_sanitizeRegulars`). Popup shows "Regular · N sessions · All-time"
  once history exceeds this session (`PRT_lifetimeLine`).
- Phase 3 DONE (exploit notes): `PR_exploitNote(prHand, statsByLabel)` —
  read classified from OBSERVED stats only (never hidden archetype), 30+
  hand sample gate (`PR_EXPLOIT_MIN_SAMPLE`), reads NIT/STATION/MANIAC/LAG
  × spots VS_3BET/VS_OPEN/VS_LIMP/FACING_BET/BETTING_INTO
  (`PR_EXPLOIT_NOTES`). Table computes on PRE-action state, attaches
  `grade.exploit`; renders as amber "READ:" line in grade detail + history
  rows + ● dot on the grade indicator. Baseline grade/SR feed untouched.
  Exploit-principles drill family still TODO (Phase 3b).
- Roadmap: Phase 3b exploit drills → Phase 4 multiway rules + SR keys
  (add, never rename) → Phase 5 polish.

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
  from facing amount, commitments clamp at stack → all-in, min-raise enforced
  (`PR_minRaiseTo`), illegal raises (betting not reopened) convert to calls,
  conservation is property-tested (300 random hands/run).
- Betting completeness DONE (2026-07-08): TDA short-all-in rule
  (`PR_canRaise` + `streetState.lastFullRaiseIdx`; table UI hides raise in
  call-or-fold spots), uncalled-bet excess tagged as refund
  (`pot.refundBB` + `outcome.refund`) so settlement/history never call a
  refund a win. Side-pot eligibility verified correct for partial calls.

### Grading coverage (audited 2026-07-08, 4k-hand sim)
- Preflop: 100% covered — ranges (78%), premium cold-vs-3bet heuristic (6%),
  limp-pot iso rule vs RFI range (`_PR_gradePreflopAction` limp branch).
- Postflop: V2 tables (c-bet/barrel + SRP/3BP defend) + `_PR_gradeDonkNode`
  (check-to-the-raiser rule; turn/river only when aggressor barreled prior
  street — probes stay heuristic). ~11% of all decisions fall to the honest
  tier heuristic: delayed c-bets, probes, multiway — no data by design.

### Engine invariants (tests/engine.test.js, ~167 tests, run vs PRODUCTION code)
- Tests load real files via `tests/helpers/load-production.js` (node:vm).
  NEVER copy production functions into tests — a drifted copy once masked a
  showdown that awarded no pots.
- Conservation property test + kicker battles + split pots + side pots +
  walk/BB-option + 3-bet re-act + archetype gates + persistence round-trips +
  short-all-in no-reopen + refund tagging + limp/donk grading rules.

### Remaining Poker Room work
- Pass 6 cosmetic polish: card-flip animation, chip-slide to winner (optional).
- Named villain profiles persisting across sessions (optional Pass 7 ext).
- OPEN USER DECISION: house RFI ranges ~20-30% tighter than solver baselines
  (RANGE-AUDIT.md Finding 2) — keep as house style or loosen.

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
- **Cache busting: bump the `?v=` param on every script/css tag in index.html
  whenever any JS/CSS ships** (single find-replace of the old version string).
  Without it, returning mobile users run stale code until a hard refresh.
- GitHub Pages deploys can wedge (build ok, deploy queued forever): re-save
  Settings → Pages source, then push any commit.
