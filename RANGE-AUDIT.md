# Range & Strategy Table Accuracy Audit

Date: 2026-07-04 · Method: automated sweep of every range token, coverage key,
and strategy entry against production code (see "Range data coherence" tests
in tests/engine.test.js, which now enforce the passing invariants forever).

## Clean bill of health

- **Zero dead tokens.** Every token in every range (RFI, facing-RFI, vs-3-bet,
  vs-4-bet, squeeze, limp, push/fold) parses and matches at least one hand.
- **Zero coverage gaps.** Every hero-after-opener pair has facing-RFI data;
  every opener/3-bettor pair has vs-3-bet data.
- **All 12,084 postflop strategy entries valid**: frequencies in [0,1],
  actions summing to 1 (flop c-bet 4,788 · turn barrel 1,512 · river barrel
  1,224 · flop defend 1,824 · turn defend 1,512 · river defend 1,224).
- **AA never folds** anywhere it faces aggression.
- **RFI ranges widen monotonically** UTG → BTN.
- **vs-3-bet continues ⊆ RFI range** everywhere (no spot defends a hand it
  would never have opened).
- **Push/fold**: wider at shallower stacks and later positions, everywhere.

## Finding 1 — the one real inconsistency: 3-bet style vs 4-bet defense style

The **vs-4-bet ranges assume a modern polarized 3-bettor** (5-bet bluffs with
A5s/A4s, call 4-bets with JJ/TT/AQs/KQs), but the **non-blind 3-bet ranges are
linear-tight (QQ+/AK only, no bluffs)**. The blinds got the modern treatment
(BB_vs_BTN 3-bets JJ+/AK/A5s-A4s); the other seats didn't.

Result: **90 hand/spot pairs** (offending hands: A5s, A4s, JJ, TT, AQs, KQs)
where the VS_4BET trainer teaches a continue with a hand that the FACING_RFI
trainer says never to 3-bet in that spot — the drill situation can't arise
from the app's own ranges, and the two scenarios train contradictory styles.

A regression test pins the count at exactly 90 so any edit is visible.

### Options (a strategy-content decision, not made unilaterally)
1. **Modernize the 3-bet ranges** (recommended vs CO/BTN/SB opens): add
   A5s/A4s bluffs and mix JJ/TT/AQs into non-blind 3-bet ranges vs late
   opens. Matches current solver play; changes FACING_RFI grading.
2. **Tighten the vs-4-bet ranges vs early opens**: remove A5s/A4s continues
   where the 3-bet range is QQ+/AK (vs UTG–HJ this tight style is defensible;
   holding A5s there is genuinely inconsistent).
3. Likely best: **both, split by opener position** — modern polarized 3-bets
   vs CO/BTN/SB, tight-linear (and correspondingly tight 4-bet defense) vs
   UTG–HJ.

### Resolution (2026-07-04) — option 3 implemented

- **Vs early opens (UTG–HJ)**: vs-4-bet defense tightened to match the
  QQ+/AK 3-bet ranges — 5-bet KK+/AKs/AKo, call QQ (QQ/JJ where the 3-bet
  range is JJ+). 30 entries rewritten.
- **Vs late opens (CO/BTN/SB)**: the six non-blind 3-bet ranges gained the
  modern A5s-A4s bluffs (matching the blinds' existing style); vs-4-bet
  continues trimmed to 5-bet QQ+/AK/A5s/A4s, call JJ.
- The subset invariant (vs-4-bet continues ⊆ 3-bet range) is now enforced by
  a permanent test (count pinned at 0). Finding 2 (tight house style) remains
  an open style decision.

## Finding 2 — house style runs tight (informational, not a bug)

RFI frequencies vs common solver baselines:

| Pos | App | Typical GTO |
|-----|------|------|
| UTG | 11.0% | ~15% |
| HJ | 17.6% | ~25% |
| CO | 22.2% | ~30% |
| BTN | 38.8% | ~44% |
| SB | 42.7% | ~44% |

Consistently ~20–30% tighter than solver baselines across the board. This is
a coherent, defensible "tight-solid live" style — but it is a *style choice*
the whole app teaches. Worth a deliberate decision rather than an inherited
one. (The villain simulator's assumed open frequencies in sim.js — UTG 14%,
BTN 45% — also run slightly wider than the hero ranges being trained.)
