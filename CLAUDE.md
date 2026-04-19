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

## Planned Feature: Play vs AI Mode ("Poker Room")

### What It Is
A separate, non-graded mode where the user plays real poker hands against AI opponents at a persistent table. Focus on experience/immersion, not GTO correctness scoring.

### Core Differences from Full Hand Trainer
| Trainer | Play vs AI |
|---------|-----------|
| Collapses to 2-player postflop | Full multi-player postflop |
| Grades vs GTO | Lightweight accuracy indicator (non-blocking) |
| Hand ends when hero folds | Spectator mode continues hand |
| No persistent bankroll | Persistent bankroll + stacks |
| GTO villains only | 6 AI archetypes |
| No named seats | Custom names, avatars, types per seat |

### AI Archetypes (extend `PLAYER_TYPE_RANGE_PROFILES` in ranges.js)
| Type | Preflop | Postflop |
|------|---------|---------|
| NIT | Top 10%, folds to 3-bets | Low c-bet, folds to aggression |
| TAG | Top 18%, solid 3-bet | Standard |
| LAG | Top 28%, wide 3-bet/squeeze | High c-bet, barrels, bluffs |
| FISH | Top 50%+, calls 3-bets loose | Calls down, rarely bluffs |
| MANIAC | 40%+, always 3-bets | Very high aggression, random bluffs |
| AGGRO | Top 25%, 3-bet light | High c-bet, check-raise often |

**Preflop:** frequency scalar multipliers on GTO ranges (Pass 2).
**Postflop:** hand strength gates action first; archetype frequencies modify within realistic bounds.
- Strong hands (SET, TWO_PAIR+, OVERPAIR) never fold to a single bet — archetype controls HOW they continue
- Weak/air hands are where archetype bluff/fold frequencies apply
- This mirrors the existing preflop logic: ranges set hard limits, frequencies fine-tune within them

### Accuracy Feedback (non-intrusive)
- After each hero decision: small indicator (✓ / ~ / ✗) based on GTO assessment
- Does NOT pause gameplay — hero can ignore it
- Tap/click indicator for one-line explanation
- End-of-hand "Review Hand" panel shows all decisions with assessment
- Session stats bar tracks running accuracy % across all decisions
- Pot odds + equity estimate always visible in action controls (live math context)
- No spaced repetition — spots are unique, SR doesn't apply here

### New Engine File: `poker-room.js` (~750 LOC)
**Naming:** All functions prefixed `PR_`.
**Reused globals from sim.js (do not rewrite):**
- `_freshDeck`, `_shuffle`, `_dealBoardCards`, `_cardsToHandNotation`, `_buildCommittedBB`, `_deepCopy`
- `_resolveVillainPreflopAction`, `FULL_TABLE_POSITIONS`
**Reused globals from ranges.js:**
- `evaluateRawHand` (sim.js:3133) — takes `(heroCards, boardCards)` both `{rank,suit}[]`, returns `{rank:1–9, label}`
- `classifyFlopHand`, `classifyTurnHand`, `classifyRiverHand`, `checkRangeHelper`, `RANKS`
**Reused from engine.js:**
- `computeCorrectAction` — used by `PR_gradeHeroAction` for preflop grading

**Known Pass 1 limitation:** `evaluateRawHand` returns hand category (rank 1–9) but no kicker data.
Tiebreakers within same category use simple high-card hole card comparison. Full kicker comparison deferred to a later pass.

### Persistence Schema (`pc_poker_room_v1` in localStorage)
```js
{
  bankroll: 500.00,        // dollars, persists across sessions
  stake: '1/2',
  tableConfig: {
    seats: [
      { name: 'Rocky', type: 'NIT', avatar: 'bear', stackBB: 100 },
      // 7 more villain seats
    ]
  },
  sessionHistory: [{ date, handsPlayed, netBB, netDollars, stake }],
  allTimeStats: { handsPlayed, biggestWin, biggestLoss, totalNetBB }
}
```

### Confirmed Design Decisions

**Table size:** 9-handed primary (matches live play focus). Easy toggle for 6-max / other sizes is desirable if low effort.

**Antes:** Not in v1.

**Buy-in:** Player chooses within a stake-scaled range (e.g. 40–200BB). Prompted on sit-down.

**Bankroll:** Single global bankroll in dollars. Persists across sessions. When hero busts → prompt to rebuy (with optional toggle for auto-rebuy).

**Villain stacks:** Do NOT persist between sessions. On new session, randomize starting stacks realistically (e.g. 60–150BB range) — not all 100BB.

**Showdown / muck rules:** Realistic. Called hand must show; uncalled hand can muck. Winner shows if everyone folds to them. Cards shown in last-aggressor order at showdown.

**Speed of play:** Global configurable speed slider (Slow / Normal / Fast) affecting ALL action animations — preflop, postflop, and spectator alike.

**AI player types:**
- Default: fully random assignment across all archetypes on each new table.
- Player can optionally adjust the **type distribution** before sitting down — simple controls to weight certain archetypes higher (e.g. more FISH, fewer NITs). No named presets.
- Types are NOT visible on the table by default — player clicks a seat to inspect that villain (popup showing name, avatar, player type, session stats).
- Live VPIP/PFR stats shown in the per-seat popup only (not always-visible on table).

**UI placement:** New top-level tab — "Poker Room" — alongside Train Now, Daily Run, Challenge Mode.

**Buy-in ranges (standard casino):**
| Stake | Min | Max |
|-------|-----|-----|
| 1/2 | $100 (50BB) | $300 (150BB) |
| 1/3 | $100 (~33BB) | $500 (~167BB) |
| 2/5 | $200 (40BB) | $1,000 (200BB) |
| 5/10 | $500 (50BB) | $2,000 (200BB) |

Villain starting stacks randomized within each stake's range at session start (not all 100BB).

### UI Sections
- **Poker Room tab**: Top-level nav entry point
- **Lobby**: Stake selector, optional type distribution editor, bankroll display, "Sit Down"
- **Table**: 9-seat view, villain names/avatars/stacks visible; click any seat → popup with player type, avatar, VPIP/PFR for session
- **Action controls**: Hero fold/check/call/bet/raise buttons + sizing slider + pot odds display
- **Spectator**: After hero folds, remaining action animates to completion; realistic showdown/muck reveal
- **Hand History Panel**: Collapsible, last 10 hands with result summary
- **Session Stats Bar**: Hands, net BB, net $, hero VPIP/PFR, decision accuracy %

### Reused Existing Pieces
- `_resolveVillainPreflopAction()` — preflop villain logic (sim.js:339)
- `classifyFlopHand()` / `classifyTurnHand()` / `classifyRiverHand()` — villain hand eval (ranges.js)
- `evaluateRawHand()` — showdown hand category (ranges.js:3133)
- `computeCorrectAction()` — hero preflop grading (engine.js)
- `STAKE_PRESETS` — dollar/BB conversion
- `animateChip()`, `showActionBadge()` — spectator animations
- `SEAT_COORDS_DESKTOP/MOBILE` — seat positioning
- `safeGet()` / `safeSet()` — storage helpers

### Implementation Phases
1. **Phase 1** — Core engine (`poker-room.js`): dealing, preflop loop, multi-player street resolver, showdown eval, spectator loop, hero accuracy grading
2. **Phase 2** — AI archetypes: 5 new preflop profiles added to `ranges.js`
3. **Phase 3** — Persistence: `pc_poker_room_v1` storage schema + seat editor save/load
4. **Phase 4** — UI: lobby, table view, action controls, spectator driver, hand history

Estimated scope: ~2,000–2,500 lines new code across 2–3 files.

### Decision: Multiway in Trainer First?
**No.** The trainer's collapse-to-heads-up is intentional — it creates clean, focused learning spots. Multiway GTO postflop strategy data doesn't exist in the codebase. The Play vs AI engine uses simpler frequency-based archetype logic (not GTO), so the two have different requirements and should be built separately.
