# Poker Crusher — Codebase Audit

Date: 2026-07-02
Scope: all 10 JS files (~28k LOC), index.html, test suite, with focus on Poker Room readiness (Passes 1–2 committed, Passes 3–7 pending).

Priority key: **P0** = blocks Poker Room / corrupts player experience · **P1** = fix before the affected pass ships · **P2** = growing debt, schedule it.

---

## Executive summary

The codebase is in better shape than a 28k-LOC vanilla-JS project usually is: storage is centralized behind `safeGet`/`safeSet`, debug logging is gated, event wiring is centralized, and the Poker Room engine was correctly built UI-free. But the audit found **one P0 correctness bug that makes every Poker Room showdown a guaranteed loss for the hero**, and the root cause is structural: **the entire test suite runs against copied code, not production code**, so production can silently diverge from green tests — and already has.

Top 5 actions, in order:

1. **Fix `PR_evalShowdown` — no pot is ever awarded** (poker-room.js:756–758). Verified by loading the production file in a harness: hero holding the winning hand at showdown nets `-committed`, winners array is always empty.
2. **Make tests import production code** instead of verbatim copies (tests/engine.test.js). The test copy of `PR_evalShowdown` uses different field names than production — which is exactly how bug #1 passed 92/92 tests.
3. **Fix the chip ledger** before Pass 5: preflop calls overpay (blinds not credited), stacks can go negative, `allIn` is unreachable so side-pot code is dead in practice.
4. **Upgrade the showdown evaluator to full 5-card comparison** before Pass 5, not "a later pass" — hole-card-high tiebreaks misaward pots on ordinary two-pair-vs-two-pair runouts, which players notice within minutes.
5. **Verify/commit Firestore security rules and do the XSS pass before Pass 4** — villain names become user-editable in the Poker Room lobby and flow into `innerHTML` templates.

---

## 1. Code quality & maintainability

### 1.1 (P0) Tests validate copies of production code, not production code
`tests/engine.test.js` states it copies `checkRangeHelper`, `computeCorrectAction`, `evaluateRawHand`, `PR_evalShowdown`, etc. "verbatim" — but several copies have already drifted (the test `PR_evalShowdown_test` uses `seatLabel`/`handLabel`; production uses colliding `label` keys — see §4.1). Green tests currently prove nothing about shipped behavior.
**Fix:** the files are global-script style, so either (a) add a guarded export footer to each engine file (`if (typeof module !== 'undefined') module.exports = {...}`), (b) load files via `node:vm` with a stub context in a shared test helper (demonstrated to work during this audit), or (c) move pure logic to ESM modules consumed by both a bundling step and the tests. Then delete every copied function from the test file.

### 1.2 (P1) Preflop action-application switch duplicated 4×
The identical `switch (result.action) { raise/3bet/call/limp/fold }` block that mutates tableState + pushes actions + deducts stacks appears at sim.js:449–477, sim.js:524–552, poker-room.js:327–348, and poker-room.js:531–552. Any betting-semantics fix (§3.4) now has four places to go wrong.
**Fix:** extract one `applyPreflopResult(seat, result, tableState, applyFn)` shared helper.

### 1.3 (P2) Dead file: `events.js`
`events.js` (98 lines of listener wiring) is never loaded — index.html:1171–1180 has no script tag for it; the live wiring is `initEventListeners()` at ui.js:2728. It will drift and mislead. Delete it or actually load it and delete the ui.js duplicate.

### 1.4 (P2) Firebase config duplicated
The full `firebaseConfig` literal exists in both cloud.js:220–227 and index.html:1186–1193. Only the index.html copy is actually used to init the SDK; the cloud.js copy only gates a boolean. Keep one.

### 1.5 (P2) Mixed idiom within files
sim.js mixes `var`-style ES5 functions (`_resolveVillainPreflopAction`, `_runPreflopTableLoop`) with `const`/arrow style in adjacent helpers; poker-room.js does the same. Harmless individually, but it obscures which code is old vs new. Pick the modern idiom for all new Poker Room work and convert opportunistically.

---

## 2. Performance

### 2.1 (P1) ~1.1 MB of JS parsed up-front, dominated by ranges.js (509 KB)
All 10 scripts load with `defer` on every visit (index.html:1171–1180). GitHub Pages gzips, but parse/eval of a 509 KB data file on mid-range mobile costs real time before first interaction, and Poker Room adds more. IMPROVEMENTS.md item 4.4 (split ranges.js) is marked low priority — it should be revisited: split into `ranges-core.js` (classifiers + preflop, needed at boot) and lazily-fetched postflop/push-fold data blobs (JSON via `fetch` on first use), which also cuts the memory of `POSTFLOP_STRATEGY_V2` for users who never leave preflop drills.

### 2.2 (P2) `_deepCopy` = `JSON.parse(JSON.stringify(...))` per action
Every hero/villain action deep-copies the whole hand object (poker-room.js:469, 577, 652, 892; sim.js:302). State is small so this is not currently hot, but the spectator loop copies per villain action per street. Switch to `structuredClone` (supported everywhere the app targets) for correctness with future non-JSON-safe fields, and consider mutating within a hand and snapshotting only at street boundaries.

### 2.3 (P2) Animation choreography is raw `setTimeout` chains with no cancellation
`showActionBadge` (ui.js:43–65) and the preflop animation sequences (ui.js:230–470) schedule dozens of timeouts with no token to cancel on screen change; the defensive `ensureTableLayers()` re-checks at ui.js:107–123 are symptoms of exactly this race. Poker Room spectator mode will multiply the problem.
**Fix:** one tiny animation queue object per table view with a `cancelAll()` called on navigation, and drive delays off a single global speed scalar (see §6.3).

### 2.4 (P2) Full-layer innerHTML teardown per render
`updateTable` clears and rebuilds `bets-layer`/`cards-layer` wholesale (ui.js:125–126). Fine at 9 seats, but Poker Room re-renders per action; prefer updating only the seat/chip nodes that changed, or at minimum keep the current approach but batch it inside one rAF.

### 2.5 (P2) The ResizeObserver scaling IIFE is load-bearing and fragile
ui.js:2517–2600 hand-derives ~15 CSS vars and carries multi-paragraph comments proving it can't re-enter its own observer loop. It works, but every future layout change must re-prove that invariant. Migrating seat/chip sizing to CSS `cqw/cqh` container-query units would delete most of it.

---

## 3. Architectural decisions

### 3.1 (P1) Two competing chip ledgers — pick one
Poker Room tracks chips in `streetState.committedBB` (updated live at poker-room.js:194) but then **recomputes** totals at showdown by replaying the action log and re-adding blinds (poker-room.js:771–787, and again separately in `PR_resolveOutcome` at 940–949). Blinds are added in `initCommitted` (poker-room.js:265–266) *and* re-added in both recomputations; a caller's `sizingBB` disagrees with `_PR_facingAmount` (§5.2), so the two ledgers already disagree.
**Fix:** keep a single per-seat `totalCommittedBB` accumulated in `_PR_applyAction`, roll street totals into `potBB` in `PR_advanceStreet`, and derive showdown/side pots/net only from that.

### 3.2 (P1) Cloud sync is last-writer-wins on a whole-document overwrite
`setDoc(..., { merge: false })` (index.html:1207) replaces the entire user doc, guarded only by a read-then-compare of one counter (`totalHands`, cloud.js:333–347) — a classic TOCTOU race, and non-monotonic data (settings, medals earned on the lower-hand-count device) can be silently discarded.
**Fix:** per-key `updatedAt` timestamps merged with `merge: true`, or a field-level merge on load. At minimum, merge medal/challenge maps by max-rank instead of replacing.

### 3.3 (P2) Global mutable `state` (engine.js:4) — keep Poker Room out of it
594 `state.` references in training.js alone; IMPROVEMENTS.md 3.1 already flags this as the highest-risk item. The good news: poker-room.js Pass 1 is fully self-contained (state lives on `prHand`). Make that a hard rule for Passes 3–7 — Poker Room persistence goes only through its own `pc_poker_room_v1` module, never through `state` or the trainer's cloud payload, so the 3.1 refactor doesn't grow.

### 3.4 (P2) "Do not reorder script tags" is the module system
Every file's contract is implicit globals plus a comment header (poker-room.js:5–11 is a good example of documenting it). This is workable but has already produced duplication (§1.2–1.4) because sharing code across files is frictionless in the wrong direction. When the test refactor (§1.1) forces exports anyway, adopt option (c) there — a minimal esbuild/Vite bundle step — and the script-order constraint disappears.

---

## 4. Test coverage gaps

### 4.1 (P0) The bug the tests missed: showdown never awards a pot
poker-room.js:756–758:
```js
const evals = activeSeat.map(function(s) {
    const best = PR_evalBestHand(s.holeCards, board);
    return { label: s.label, seat: s, ...best };   // best.label ('FLUSH') clobbers s.label ('BTN')
});
```
Downstream, `pot.eligible.includes(e.label)` compares hand labels against seat labels, so `eligible` is always empty and every pot resolves `winners: []` (poker-room.js:793–794). Verified against the production file: hero wins the hand, `outcome.heroNetBB` = −2.5, pot vanishes. The showdown display array (poker-room.js:811–814) additionally has a duplicate `label:` key and assigns `handLabel: e.label` — after the fix, seat identity and hand name must be distinct fields (`seatLabel`, `handLabel`) end-to-end.
**Add a test that runs the real `PR_evalShowdown` and asserts the better hand is paid** — impossible until §1.1 is done, which is why §1.1 is P0.

### 4.2 (P1) No conservation-of-chips invariant tests
Nothing asserts: sum of all seats' net = 0 per hand; no stack ever negative; pot at showdown equals sum of commitments. A property test (500 random hands, random hero actions through the full PR loop, assert invariants) would have caught §4.1, §5.2 and §5.3 all at once. This is the single highest-value test to add.

### 4.3 (P1) `evaluateRawHand` production edge cases untested
The copy in tests covers flush>straight>trips, but production (ranges.js:3133) also returns `ROYAL_FLUSH` (the copy doesn't — drift again) and its correctness on wheel straights (A-2-3-4-5), straight+flush-but-not-straight-flush boards, and double-paired boards is only ever exercised implicitly. Add direct table-driven tests against the production function.

### 4.4 (P2) Untested critical flows: SR scheduling and challenge migration
`SR.update`/`SR.selectSpot` (engine.js:320+) drive what users see every session, and `_migrateChallengeV1` (challenge.js:290) rewrites saved progress; neither has a test. Both are pure enough to test once §1.1 lands.

### 4.5 (P2) No smoke test of the real page
A single Playwright test — load index.html, start a training hand, click an action, assert a grade renders — would catch script-order breakage, missing DOM ids (events.js:7 would throw today if it were ever loaded), and layer races that unit tests can't see. Chromium is already available in CI-like environments.

---

## 5. Feature readiness — Poker Room (before Pass 3–5)

### 5.1 (P0) Fix showdown before any UI work
§4.1. Pass 5 wires buttons to an engine where every called river is a loss; the mode is unshippable until fixed. ~10-line fix + real-code test.

### 5.2 (P0) Preflop call sizing ignores blinds and prior commitments
`PR_resolveVillainPreflopAction` returns `{ action:'call', sizingBB: openSizeBB }` (poker-room.js:441, 453) and vs-3-bet `tableState.threeBetSize || openSizeBB * 3` where `threeBetSize` is never written (poker-room.js:421). So a BB caller commits 1.0 (blind) + 2.5 = 3.5BB against a 2.5BB open. `_PR_facingAmount` (poker-room.js:130) already computes the correct amount — resolvers should return intent (`call`) and let `_PR_applyAction` derive the chips from `facingAmount`, exactly as hero's call already does (poker-room.js:479–481). Same flaw exists in sim.js:388 but is masked by the trainer's collapse-and-rebuild (sim.js:592–615, which also hardcodes 100BB stacks at line 603 — will break once Poker Room-style variable stacks reach the trainer).

### 5.3 (P0) All-in is unreachable; stacks go negative; side pots are dead code
`_PR_applyAction` deducts `sizingBB` with no cap at `seat.stackBB` (poker-room.js:193–196), and nothing ever emits an `'allin'` action, so `seat.allIn` is never set, `_PR_buildSidePots`' all-in caps never trigger, and a MANIAC raise war drives stacks negative. **Fix in the one choke point:** in `_PR_applyAction`, clamp `sizingBB = Math.min(sizingBB, seat.stackBB)`, set `seat.allIn = seat.stackBB === 0`, and add the uncalled-bet refund when the last caller is short. Then side pots (poker-room.js:835) and test 8 become meaningful against production.

### 5.4 (P1) Replace the two-phase single-pass preflop with the generic actor loop
The Phase1/Phase2 design means: villains never 3-bet a hero open (forcibly downgraded to fold, poker-room.js:527–530), earlier callers never respond to a 3-bet behind them (they stay in the pot for 2.5BB while others are in for 7.5 — pot corruption with no all-in to justify it), and BB never gets an option check. Acceptable simplifications for the grading trainer; not for a mode whose whole pitch is "real poker hands." `_PR_nextActor` (poker-room.js:148) is already street-generic and handles reopened action — run preflop through the same loop used postflop (seed `betMadeThisStreet=true` with BB as pseudo-aggressor) and delete both Phase 2 functions. This also unlocks facing-3-bet training spots for free.

### 5.5 (P1) Full 5-card evaluator before Pass 5, not "later"
`PR_evalBestHand`'s tiebreaker is max hole-card rank (poker-room.js:732–740). Concrete failures players will hit constantly: KK on an A-high board loses to A2 correctly, but K9 two pair beats K9 two pair with different kickers randomly; QQ overpair vs JJ overpair ties if both hold a Q-high... it doesn't — but A5 pair-of-fives beats K5 pair-of-fives *and* beats KK pair-of-kings ties incorrectly on paired boards; board-plays chops are misawarded to the bigger hole card. A standard best-5-of-7 evaluator returning a comparable array `[category, r1..r5]` is ~60 lines; write it once with real tests and delete `tiebreaker`.

### 5.6 (P1) Grading maps cold-facing-3-bet spots to the wrong range family
`_PR_gradePreflopAction` uses `RFI_VS_3BET` whenever a 3-bettor exists (poker-room.js:1003–1005), but `rfiVs3BetRanges` keys are *opener*_vs_*3bettor* — valid only when hero **is** the opener. When hero faces a 3-bet cold (or after limping), the lookup either misses (→ silent 'mixed') or grades hero with the opener's range. Guard on `ctx.opener === heroPos`, and wire the existing `VS_LIMP` data (engine.js handles it; the PR grader never emits it) for limped pots.

---

## 6. Accessibility & UX debt

### 6.1 (P1) Pinch-zoom is disabled
`<meta name="viewport" ... maximum-scale=1.0, user-scalable=no>` (index.html:5) is a WCAG 1.4.4 failure and genuinely painful on a UI whose seat font floors at 8px (ui.js:2565). Remove `maximum-scale`/`user-scalable`; the tap-highlight and layout code don't need them.

### 6.2 (P1) Zero ARIA anywhere
`grep aria-|role=` over index.html returns 0 hits across ~15 full-screen overlay "screens". Minimum viable pass: `role="dialog"` + `aria-modal` on overlays, `aria-live="polite"` on the toast container and the grade/feedback region (core feedback is currently invisible to screen readers), and `aria-label`s on icon-only buttons. Focus is never moved into or trapped inside overlays — keyboard users can tab into the hidden screen behind.

### 6.3 (P1) No `prefers-reduced-motion`, and speed is hardcoded per call site
No reduced-motion handling anywhere; durations are literals sprinkled through ui.js (400/600/700/800/900ms badges). The Poker Room spec already plans a Slow/Normal/Fast slider — implement it now as one global `SPEED_SCALE` consumed by every `showActionBadge`/`animateChip`/spectator delay, with `prefers-reduced-motion` forcing the fast/instant tier. One mechanism, three requirements solved.

### 6.4 (P2) Menu is a flat list of 7 buttons and growing
events.js/menu wiring shows: Train Now, Daily Run, Challenge, Library, Math Drills, Stats, Settings — and Poker Room makes 8. Group into "Play" (Poker Room), "Train" (Train Now, Daily Run, Challenge, Math Drills) and "Reference" (Library, Stats, Settings) sections, or promote a persistent bottom tab bar on mobile. Also adopt a small screen-manager (stack of screen ids, one `show(screen)` API) instead of 15 independently-toggled `fixed inset-0` divs with escalating z-indexes (z-50 … z-[80]) — Poker Room adds at least 3 more screens.

### 6.5 (P2) Fast tappers can desync the table
Because action rendering is timeout choreography (§2.3) with no input lockout, double-clicking an action button mid-animation can fire handlers against stale state (the `ensureTableLayers` guards exist because this already happens on challenge transitions, ui.js:107). Disable action buttons from click until the state transition (not the animation) completes.

---

## 7. Security & data integrity

### 7.1 (P0-verify) Firestore rules are the only barrier — verify and commit them
The client writes `/users/{uid}` with a public API key (correct for Firebase). Everything depends on rules being exactly `allow read, write: if request.auth != null && request.auth.uid == userId;`. The rules aren't in this repo, so they can't be audited or change-tracked. Export `firestore.rules` into the repo and note the console deploy step in the deployment checklist. If rules are currently open (the cloud.js:209 comment "for a real public product, you'd add proper auth + rules" predates Google sign-in and suggests they may be permissive), every user's profile is readable/writable by anyone with the projectId.

### 7.2 (P1) XSS audit graduates from "deferred" to "required" at Pass 4
IMPROVEMENTS.md 1.1 deferred the innerHTML audit because "all data is internal." Pass 4 makes villain names user-editable and Pass 5 renders them at seats; ui.js has 64 innerHTML sites and training.js 99. Add one `esc(s)` helper, use it for every user-derived string (names, avatars, sync-code-adjacent fields), and prefer `textContent` for plain-text nodes (`showActionBadge` already does this correctly with `innerText`, ui.js:50).

### 7.3 (P1) Cloud payload applied without validation
`cloudSaveSilent` JSON.parses cloud fields (cloud.js:336) inside try/catch, but the load path writes cloud strings back into localStorage keys wholesale. A malformed/oversized doc (or a future schema change) can brick startup until the user clears storage. Validate shape + version per key on load, fall back per-key (not all-or-nothing), and cap accepted payload size.

### 7.4 (P2) Poker Room bankroll: bound it and keep it honest
The `pc_poker_room_v1` schema appends `sessionHistory` unboundedly (quota risk alongside a 5MB localStorage budget shared with SR data) — cap at ~200 sessions. And since bankroll is trivially editable client-side, never surface it in anything shared/synced/leaderboard-like without moving it server-side; a one-line note in the schema comment will keep future passes from drifting into that.

### 7.5 (P2) Multi-tab conflict handling is notify-only
The storage listener (engine.js:90–96) shows a toast on foreign writes but both tabs keep writing; last writer wins locally, then races the cloud (§3.2). Cheap improvement: a heartbeat key claiming "active tab," with other tabs going read-only for training writes.

---

## 8. UX / UI design & graphics

(Static-code review; no rendered inspection.)

### 8.1 (P2) Design tokens exist but half the styling bypasses them
There's a real token layer (`pc-btn-primary`, `pc-eyebrow`, `pc-title`, CSS vars for seat/chip sizing) — good — but arbitrary values like `text-[11px]`, `z-[80]`, per-call badge offsets are repeated inline throughout index.html and ui.js. Extract the recurring ones (`pc-label-xs`, a z-index scale, badge offset vars) so the Poker Room UI can't fork the visual language.

### 8.2 (P2) Chip/badge placement is a growing pile of special cases
`animateChip` carries ~10 positional nudge branches plus per-position jitter plus clamping (ui.js:74–97); `placeCardBacks` has parallel logic (ui.js:15–32). Replace with one function: `betAnchor(coords) = lerp(coords, tableCenter, k)` — pull every seat's chip point toward center by a fixed fraction — which handles all 9 seats, both breakpoints, and any future 2–9 seat configs without new branches. Poker Room's configurable seat count will otherwise multiply the special cases.

### 8.3 (P2) Table readability at small sizes
Seat boxes floor at 40px wide / 8px font (ui.js:2563–2565) and Poker Room adds name + stack + avatar per seat. On a 360px phone that's illegible. Plan the Poker Room seat as avatar + stack only, with the name in the tap-popup (already the design for type/VPIP) — don't try to render three text lines in a 40px box.

### 8.4 (P2) Feedback hierarchy for Poker Room is right — keep the trainer's out
The non-blocking ✓/~/✗ indicator design is correct for an immersion mode. Implementation guard: don't reuse the trainer's full-screen grade overlay components; build the small indicator as its own component with the session accuracy stat living in the stats bar. The one design detail to add: the indicator should fade after ~2s but remain tappable from the hand-history row, so a player who ignored it live can still ask "what did I miss" at hand end.

### 8.5 (P2) Empty/first-run states
The menu assumes returning users (stats, streaks, review queue). Poker Room's lobby is a natural first-run surface: default table pre-filled (random names/types already specced), one primary CTA ("Sit Down — $200"), advanced controls (type distribution, seat editor) behind a disclosure. Resist making the lobby a settings page.

---

## Suggested sequencing

| When | Items |
|---|---|
| Now (before any Pass 3+ code) | §4.1 showdown fix · §1.1 real-code tests · §5.2/§5.3 chip ledger + all-in · §4.2 conservation property test |
| Before Pass 4 (lobby) | §7.2 XSS/esc helper · §7.1 rules in repo · §6.1 viewport zoom |
| Before Pass 5 (table UI) | §5.5 real evaluator · §5.4 generic preflop loop · §6.3 speed scalar + reduced motion · §2.3 cancellable animation queue |
| Before Pass 6–7 | §3.1 single ledger cleanup · §6.4 screen manager · §7.4 history cap |
| Background debt | §3.2 cloud merge · §2.1 ranges split · §1.2–1.4 dedupe/dead code · §6.2 ARIA pass |
