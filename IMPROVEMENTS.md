# PokerCrusher — Improvement Recommendations

Generated: 2026-04-16

---

## Priority 1 — Critical (Address Immediately)

### 1.1 XSS Vulnerability via `innerHTML` with Template Literals

**Files:** `training.js`, `ui.js`, `drills.js`, `sim.js`

Throughout the codebase, `.innerHTML` is assigned template literals that interpolate internal data:

```js
// training.js (pattern repeated 50+ times)
el.innerHTML = `<span>${handLabel}</span> — ${actionText}`;
```

While current data sources are internal (ranges, positions), this pattern is a footgun: any future path that injects user-visible or URL-derived data will silently introduce XSS. The correct default is `.textContent` for plain strings and `document.createElement` / `.appendChild` for structured markup.

**Recommended Fix:**
- Audit every `.innerHTML` assignment. Where the value is plain text, swap to `.textContent`.
- Where structure is required, build DOM nodes explicitly:
  ```js
  const span = document.createElement('span');
  span.textContent = handLabel;
  el.appendChild(span);
  ```
- For complex card/chip render helpers already building HTML strings, add a sanitization pass or isolate them behind a dedicated `renderHTML(trustedTemplate)` wrapper so all unsafe assignments are visually distinct.

---

### 1.2 No Automated Test Suite

**Files:** all JS files (none have tests)

Zero test coverage across ~25,600 LOC means regressions are caught only by manual play-testing. The highest-risk functions are:

| Function | Risk |
|---|---|
| `checkRangeHelper` (`engine.js`) | Wrong answer accepted / correct answer rejected |
| `buildSRKey` (`engine.js`) | Mastery attributed to wrong hand bucket |
| `computeCorrectAction` (`training.js`) | Incorrect GTO answer shown |
| `generateNextRound` (`engine.js`) | Broken drill queue construction |
| SR serialise/deserialise (localStorage) | Progress silently lost or corrupted |
| Push/fold threshold logic (`ranges.js`) | Wrong shove/fold boundary |

**Recommended Fix:**
- Add [Vitest](https://vitest.dev/) (zero-config, no build tool required — `npx vitest`).
- Start with pure-function unit tests (no DOM):
  ```
  tests/
    engine.test.js   — checkRangeHelper, buildSRKey, SR scheduling
    ranges.test.js   — push/fold thresholds, range expansion
    training.test.js — computeCorrectAction per scenario type
  ```
- A single `package.json` with `{ "devDependencies": { "vitest": "^1" }, "scripts": { "test": "vitest run" } }` is sufficient — no bundler needed.

---

### 1.3 Fragile localStorage Error Handling

**Files:** `engine.js`, `training.js`, `cloud.js`, `challenge.js`

`JSON.parse` calls on localStorage reads are scattered without consistent try/catch coverage. A corrupted value (truncated write, manual browser edit, storage migration failure) causes a silent JS exception and broken session state with no recovery path.

```js
// current pattern in multiple files
const data = JSON.parse(localStorage.getItem(key)); // throws on bad JSON
```

**Recommended Fix:**
```js
function safeGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    console.warn(`[Storage] Failed to parse key "${key}"; using fallback.`);
    return fallback;
  }
}
```
Centralise all localStorage reads/writes through `safeGet` / `safeSet` helpers (one small `storage.js` module or inline in `engine.js`). Add quota-exceeded handling on every `setItem`:

```js
function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      showToast('Storage full — some progress may not be saved.');
    }
  }
}
```

---

## Priority 2 — Major (Address in Next 1–2 Sprints)

### 2.1 Magic Numbers and Hardcoded Timeouts

**Files:** `ui.js` (lines 88–92, animation delays), `training.js` (per-action delays)

Animation timeouts and bet sizing offsets are scattered as raw integers:

```js
// ui.js — no indication of what these numbers mean
setTimeout(resolve, 800);
setTimeout(resolve, 1600);
const BET_JITTER = 12;
```

**Recommended Fix:**
Create a `UI_CONFIG` constants block at the top of `ui.js`:

```js
const UI_CONFIG = {
  ANIM_SHORT_MS:    400,
  ANIM_MEDIUM_MS:   800,
  ANIM_LONG_MS:    1600,
  BET_JITTER_PX:    12,
  CHIP_SCALE:       0.9,
  SEAT_COORDS: [ /* ... */ ],
};
```

Similarly, define a central `STORAGE_KEYS` object (in `engine.js` or a dedicated file) to replace string literals spread across 7 files:

```js
const STORAGE_KEYS = {
  RFI_STATS:       'gto_rfi_stats_v2',
  SR_DATA:         'gto_sr_v2',
  CONFIG:          'gto_config_v2',
  MEDALS:          'gto_medals_v1',
  CHALLENGE:       'gto_challenge_v2',
  SESSION_BUILDER: 'gto_session_builder_v1',
  DAILY_RUN:       'pc_dailyRun_v1',
};
```

---

### 2.2 Production Console Noise

**Files:** `cloud.js`, `engine.js`, `training.js`

50+ `console.log` / `console.warn` calls are active in production, including verbose SR debug traces (`[SR Edge Debug]`) and Firebase round-trip logs (`[PokerCrusher] Cloud load raw result:`).

**Recommended Fix:**

```js
// top of engine.js or a shared utils block
const DEBUG = typeof window !== 'undefined' && window.PC_DEBUG === true;
const log   = (...a) => DEBUG && console.log(...a);
const warn  = (...a) => DEBUG && console.warn(...a);
```

Replace all in-file `console.log/warn` with `log/warn`. Users enable diagnostics via `localStorage.setItem('PC_DEBUG', true); location.reload()`.

---

### 2.3 Incomplete Postflop Hero-Hand Awareness

**File:** `training.js`

BTN vs BB and CO vs BB SRP IP spots are fully hero-hand-aware (correct hand drawn before presenting the scenario). The remaining 7 SRP families — HJ/LJ/UTG2/UTG1/UTG vs BB and the two OOP spots (BB vs BTN, SB vs BB) — use a non-hero-hand-aware fallback that can present inconsistent hand/board combinations.

**Recommended Fix:**
Identify the hero-hand-aware code path in `training.js` (the BTN/CO branch) and abstract it into a shared `buildPostflopScenario(family, position, config)` helper. Extend it to accept any SRP family rather than hard-coding BTN/CO. Replace the fallback branch with calls to the shared helper. This is the correct fix rather than duplicating the BTN/CO logic eight more times.

---

### 2.4 Challenge Path v2 — Implement the Designed System

**File:** `challenge.js`

Per `Claude.md`, Challenge Path v2 design is complete (24 nodes, 8 tiers, bronze/silver/gold medals, DAG prerequisites) but implementation has not started. The data structures and progress schema (v2 with v1 migration) are already defined.

**Recommended Fix:**
This is the highest-ROI queued feature. Implement in three phases:
1. Render the 24-node DAG from `CHALLENGE_NODES` with locked/unlocked visual states.
2. Wire node selection to the existing session builder (reuse `sessionBuilder` state).
3. Persist medal progress to `gto_challenge_v2` and implement the v1 → v2 migration on first load.

---

## Priority 3 — Moderate (Ongoing / Technical Debt)

### 3.1 Global State and Window-Scope Pollution

**Files:** all JS files

All application state lives on a single mutable `state` object in window scope with no isolation. Mutations from async callbacks (cloud sync, SR writes) and synchronous UI handlers share the same object with no locking or queuing. This will manifest as subtle bugs when two operations run in adjacent event loop ticks (e.g., completing a hand while cloud sync is flushing).

**Recommended Fix (incremental):**
- Freeze the shape of `state` early in boot: define all keys with `null` defaults so unexpected keys stand out.
- Gate all mutations through named updater functions (`setState('sessionBuilder', val)`) rather than direct property assignment.
- Long term: consider a minimal event bus (`EventTarget` is built-in) so modules subscribe to state changes rather than reaching into each other's closures.

---

### 3.2 Inline `onclick` Handlers in `index.html`

**File:** `index.html`

Hundreds of `onclick="functionName()"` attributes are scattered in the HTML. This tightly couples markup to JS function names and makes it impossible to rename functions without grep-replacing HTML strings. It also prevents event delegation patterns.

**Recommended Fix:**
Migrate to `addEventListener` inside each module's `init()` function. This does not require a framework — a single `index.html` boot script that calls `TrainingUI.init()`, `ChallengeUI.init()`, etc. is sufficient.

---

### 3.3 No JSDoc / Type Hints on Public Functions

**Files:** all JS files

Functions like `checkRangeHelper`, `generateNextRound`, `buildSRKey`, and `createHandRun` have no documented signatures. Parameters like `edgeKey`, `bucket`, `family`, and `lane` use domain terms that are not self-evident.

**Recommended Fix:**
Add JSDoc blocks to the ~20 "core API" functions (those called across file boundaries). This costs roughly 2 hours and immediately improves IDE autocomplete and onboarding:

```js
/**
 * @param {string} hand  — canonical hand string e.g. "AKs", "72o"
 * @param {string} range — range string e.g. "ATs+, KQs, 88+"
 * @returns {boolean}
 */
function checkRangeHelper(hand, range) { ... }
```

---

### 3.4 SR Engine: Cache Hand Sampling

**File:** `engine.js`

`EdgeWeight.sampleHand` runs a nested loop over the 13×13 hand grid on every call to build a weighted sample. This executes on every drill round generation. The hand grid is static — it never changes at runtime.

**Recommended Fix:**
Pre-build the weighted hand array once at module load time and cache it:

```js
// Computed once at startup, reused on every sampleHand call
const HAND_WEIGHT_TABLE = buildHandWeightTable();
```

---

### 3.5 Tailwind CSS Loaded Unoptimized via CDN

**File:** `index.html`

The CDN version of Tailwind includes all ~4 MB of utility classes. Only a small fraction are used, inflating initial load time on slower connections.

**Recommended Fix (no build tool required):**
Use the [Tailwind Play CDN](https://tailwindcss.com/docs/installation/play-cdn) in development but run a one-command purge for production:

```sh
npx tailwindcss -i ./src/input.css -o ./tailwind.min.css --minify
```

Replace the CDN `<script>` tag with a local `<link rel="stylesheet">` pointing to the output file. This reduces CSS from ~4 MB to typically under 20 KB and removes the CDN network dependency.

---

## Priority 4 — Minor / Nice to Have

### 4.1 localStorage Key Registry

All storage keys are hardcoded strings in 7 different files. A typo in one file silently creates a new orphaned key. Centralising them in `STORAGE_KEYS` (see §2.1) also makes migrations auditable — you can search `STORAGE_KEYS.X` to find every read/write of a key.

### 4.2 Error Boundary for Cloud Sync

`cloud.js` is marked **high-risk, low-touch** in `Claude.md`. The sync path has `try/catch` but failures surface only as console warnings. A failed sync during an active session should:
1. Show a persistent (not auto-dismiss) toast with a retry button.
2. Flag the session as "unsynced" so the user is notified on next load.
3. Queue the sync payload for retry rather than discarding it.

### 4.3 Multi-Tab Safety

Opening the app in two browser tabs will result in concurrent `localStorage` writes from two independent `state` objects. The last write wins, silently discarding progress from the other tab.

**Minimal Fix:** Listen for the `storage` event and reload or show a warning when a competing write is detected:

```js
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEYS.SR_DATA) showToast('Progress updated in another tab — reloading.');
});
```

### 4.4 `ranges.js` — Consider Splitting

At 7,838 LOC, `ranges.js` is the largest file and hardest to navigate. It contains range tables, push/fold charts, POSTFLOP_STRATEGY_V2 (312 entries), FAMILY_MODEL registry, and the limp engine. Splitting into `ranges-preflop.js`, `ranges-postflop.js`, and `push-fold.js` would make each section independently reviewable without breaking the load-order contract (just add three `defer` tags).

### 4.5 Deployment Checklist

Browser cache issues are noted in `Claude.md` as a recurring false bug. Add a short `DEPLOY.md` (or section in `Claude.md`) with a step-by-step GitHub Pages deploy checklist, including cache-busting strategies (query string versioning on `<script src="engine.js?v=058698b">`) to eliminate the class of "deployed but cached" bugs.

---

## Summary Table

| # | Area | Priority | Effort | Impact |
|---|---|---|---|---|
| 1.1 | XSS via innerHTML | Critical | Medium | Security |
| 1.2 | No test suite | Critical | High | Reliability |
| 1.3 | localStorage error handling | Critical | Low | Resilience |
| 2.1 | Magic numbers / constants | Major | Low | Maintainability |
| 2.2 | Console noise in production | Major | Low | UX / perf |
| 2.3 | Postflop hero-hand awareness | Major | High | Feature parity |
| 2.4 | Challenge Path v2 | Major | High | Feature |
| 3.1 | Global state isolation | Moderate | High | Stability |
| 3.2 | Inline onclick → addEventListener | Moderate | Medium | Maintainability |
| 3.3 | JSDoc on public functions | Moderate | Low | DX |
| 3.4 | SR hand sampling cache | Moderate | Low | Performance |
| 3.5 | Tailwind CSS purge | Moderate | Low | Load time |
| 4.1 | localStorage key registry | Minor | Low | Correctness |
| 4.2 | Cloud sync error boundary | Minor | Medium | Resilience |
| 4.3 | Multi-tab safety | Minor | Low | Correctness |
| 4.4 | Split ranges.js | Minor | Low | Maintainability |
| 4.5 | Deploy checklist | Minor | Low | DX |
