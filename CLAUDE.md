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
- `evaluateRawHand` (ranges.js:3133) — takes `(heroCards, boardCards)` both `{rank,suit}[]`, returns `{rank:1–9, label}`
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

**Villain names:** Randomly generated from a pool of ~40 poker-flavored names on new table creation. Pool includes names like: Rocky, Layla, The Prof, Shark, Lucky, Grinder, Tex, Ace, Diamond, Cowboy, Slick, Maverick, Blaze, Dutch, Vega, Lola, Ghost, Stone, Remy, Duke, Sal, Monty, Chip, Ringo, Dex, Nova, Cash, Rio, Bear, Fox, Hawk, Cruz, Nate, Jules, Priest, Dagger, Smoke, Frost, King, Rook. Player can rename any villain in the seat editor.

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

---

## Implementation Passes

### Pass 1 — Core Engine (`poker-room.js`, ~750 lines)
Dealing, preflop loop, multi-player street resolver, postflop villain AI (hand-strength-gated + archetype frequencies), showdown evaluator with side pots, spectator runner, hero accuracy grading. No UI. Fully testable in isolation.

**Functions to build:**
- `PR_createHand(config)` — entry point, deals all 9 seats in position order from left of dealer
- `PR_runPreflopToHero(prHand)` — runs villain preflop actions until hero's turn
- `PR_resolveVillainPreflopAction(seat, tableState, playerType)` — delegates to sim.js:339, stub for Pass 2 archetypes
- `PR_applyHeroAction(prHand, action, sizingBB)` — records hero action, grades it, advances state
- `PR_applyVillainAction(prHand)` — resolves one villain action, advances actingIndex
- `PR_resolveVillainPostflopAction(seat, prHand)` — hand-strength-gated decisions with archetype freq tables
- `PR_isStreetComplete(prHand)` — checks if all active seats have acted
- `PR_advanceStreet(prHand)` — flushes street, deals board cards, resets state
- `PR_evalShowdown(prHand)` — evaluates all hands, builds side pots, assigns winners, applies muck rules
- `PR_evalBestHand(holeCards, board)` — wraps evaluateRawHand, returns {rank, label, tiebreaker}
- `PR_runSpectatorStreets(prHand, onAction, speedMs)` — async loop after hero folds
- `PR_resolveOutcome(prHand)` — uncontested win (everyone else folded)
- `PR_gradeHeroAction(prHand, action, sizingBB)` — returns {grade, explanation} using computeCorrectAction preflop, equity logic postflop

**Constants:**
- `PR_POSITIONS` — seat order array
- `PR_STAKE_CONFIG` — min/max buy-in per stake
- `PR_ARCHETYPE_POSTFLOP` — frequency tables per archetype (applied within hand-strength tiers only)

**Script tag:** Add `<script src="poker-room.js"></script>` after sim.js in index.html.

**Tests to add (tests/engine.test.js):**
1. 18 distinct cards dealt across 9 seats, no duplicates
2. Hero cards are at their seat position in deal order, not dealt first
3. Preflop loop completes without infinite loop across 100 random hands
4. `PR_isStreetComplete` false mid-action, true after all seats resolved
5. Flop board has exactly 3 cards not in any seat's hole cards
6. `PR_evalBestHand` ranks flush > straight > trips for known inputs
7. Split pot when two players hold identical 5-card hands
8. Side pot: all-in player at 30BB wins only main pot
9. `heroNetBB` = -0.5 when hero folds SB preflop without acting
10. `PR_gradeHeroAction` returns 'error' when hero folds pocket aces preflop

**Key design rule for postflop villain AI:**
Hand strength tiers gate the action floor; archetype frequencies tune within each tier:
- NUT_VALUE (SF/quads/FH/flush/straight): always continues, never folds to single bet
- STRONG (set/two pair/trips): always continues; archetype controls bet vs check-raise
- MEDIUM (overpair/top pair): almost always continues; archetype affects aggression level
- THIN (second/third pair): archetype-driven; NIT leans fold to raise, FISH calls down
- WEAK (underpair/air/overcards): archetype-driven bluff or fold
- DRAW (FD/OESD/gutshot): equity vs pot odds first, archetype modifies semi-bluff frequency

### Pass 2 — AI Archetypes (`ranges.js`, ~250 lines)
Add NIT/TAG/LAG/FISH/MANIAC/AGGRO preflop range profiles to `PLAYER_TYPE_RANGE_PROFILES`. Scalar multiplier system on GTO open ranges per position (NIT=0.6×, TAG=0.9×, LAG=1.35×, FISH=2.0×, MANIAC=1.8×, AGGRO=1.2×). Wire scalars into `PR_resolveVillainPreflopAction`. Each archetype also has modified 3-bet/call/fold frequencies vs opens.

### Pass 3 — Persistence (~250 lines)
`pc_poker_room_v1` localStorage schema (see above). Bankroll management: buy-in deducted on sit-down, winnings/losses applied after each hand, bust detection → prompt or auto-rebuy toggle. Seat config save/load. Session history append. Per-seat VPIP/PFR accumulation each hand. Random villain name generation from pool on new table.

### Pass 4 — Lobby UI (~350 lines)
New "Poker Room" nav tab in index.html alongside existing tabs. Lobby view: stake selector (1/2·1/3·2/5·5/10), bankroll display, type distribution editor (archetype weight controls, defaults to equal), seat editor (name + avatar per villain — avatar chosen from ~10 options), Sit Down button that validates bankroll vs buy-in range.

### Pass 5 — Table + Action UI (~450 lines)
Full 9-seat table view reusing `SEAT_COORDS_DESKTOP/MOBILE`. Villain name/avatar/stack displayed at each seat. Hero action buttons (fold/check/call/bet/raise) + sizing slider + pot odds always visible. Wire engine functions to UI: button clicks call `PR_applyHeroAction`, then drive villain responses via `PR_applyVillainAction` loop, then `PR_advanceStreet`. Hand flows end-to-end.

### Pass 6 — Spectator + Showdown UI (~350 lines)
Wire `PR_runSpectatorStreets` to `animateChip` / `showActionBadge`. Card flip animation reveals villain hole cards at showdown per muck rules. Winning seat gets pot chip animation. Speed slider (Slow 1200ms / Normal 700ms / Fast 300ms) controls `speedMs` param. Auto-advance to next hand after 3s, or "Next Hand" button. All-in runout shows remaining board cards dealt face-up.

### Pass 7 — History, Stats + Polish (~350 lines)
Collapsible hand history panel (last 10 hands: position, result, net BB). Session stats bar: hands played, net BB, net $, hero VPIP%, hero PFR%, decision accuracy %. Per-seat click popup: villain name, avatar, player type, session VPIP/PFR over N hands. Accuracy indicator (✓/~/✗) displayed after each hero decision — tap for one-line explanation. End-of-hand "Review Hand" collapsible showing all hero decisions with grades. Optional Pass 7 extension: save named villain profiles that persist across sessions with cumulative stats.

---

**Total estimated scope: ~2,750 lines across 7 passes.**
Passes 1–3: pure logic/data, no UI.
Passes 4–7: front-end.
Playable (unpolished) after Pass 5.
