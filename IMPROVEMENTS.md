# PokerCrusher — Improvement Recommendations

Generated: 2026-04-16  
Last updated: 2026-04-17

---

## Status Key
- ✅ Done — implemented and committed
- 🔄 Partial — some work done, more remains
- ⏳ Pending — not yet started

---

## Priority 1 — Critical

### ✅ 1.1 XSS Vulnerability via `innerHTML` with Template Literals
**Status:** Deferred — no active attack vector (all data is internal). Needs dedicated audit pass before any user-derived data touches these paths. Tracked in Claude.md Known Issues.

### ✅ 1.2 No Automated Test Suite
**Status:** Done. Vitest suite added (`tests/engine.test.js`), 72 tests covering `checkRangeHelper`, `buildSRKey`, `computeCorrectAction`. Run: `npm test`.

### ✅ 1.3 Fragile localStorage Error Handling
**Status:** Done. `safeGet`/`safeSet` helpers in `engine.js`. QuotaExceededError shows toast. All key call sites migrated.

---

## Priority 2 — Major

### ✅ 2.1 Magic Numbers / STORAGE_KEYS Registry
**Status:** Done. `STORAGE_KEYS` object in `engine.js` (13 keys). `UI_CONFIG` constants still pending (see Known Issues).

### ✅ 2.2 Production Console Noise
**Status:** Done. `_log`/`_warn` helpers in `engine.js`. All diagnostic console calls in `engine.js`, `training.js`, `cloud.js` gated behind `window.PC_DEBUG`.

### 🔄 2.3 Incomplete Postflop Hero-Hand Awareness
**Status:** Partial. **3BP is now fully hero-hand-aware across flop + turn + river** (Pass B, 2026-04-17): 13 bettor families, 5 defender families, 4 new strategy registries. SRP remains partial: BTN_vs_BB and CO_vs_BB are hero-hand-aware; HJ/LJ/UTG2/UTG1/UTG vs BB and OOP SRP spots still use fallback logic. SRP defender families expanded to 8 (Pass A). Tracked in Claude.md Known Issues.

### ✅ 2.4 Challenge Path v2
**Status:** Done. 24-node DAG, 8 tiers, pass/silver/gold medals live in `challenge.js`. Progress in `gto_challenge_v2` with v1 migration.

---

## Priority 3 — Moderate / Technical Debt

### ⏳ 3.1 Global State and Window-Scope Pollution
**Status:** Pending. 158 direct mutations to shared `state` object. High regression risk — needs own dedicated pass. Tracked in Claude.md Known Issues.

### ✅ 3.2 Inline `onclick` Handlers in `index.html`
**Status:** Done. All 57 `onclick=` attributes removed. `initEventListeners()` in `ui.js` registered via `window.onload`. Parameterised handlers use `data-*` attributes.

### ✅ 3.3 No JSDoc / Type Hints on Public Functions
**Status:** Done. JSDoc added to `SR.update`, `SR.classifySpot`, `launchReviewSession`, `EdgeWeight.classify`, `generateNextRound`, `handleInput`, `showToast`, `saveProgress`, `updateUI`, `markCloudDirty`, `cloudSaveSilent`.

### ✅ 3.4 SR Engine: Cache Hand Sampling
**Status:** Done. `HAND_GRID` IIFE in `engine.js` pre-builds the 169-entry 13×13 hand string table at startup.

### ✅ 3.5 Tailwind CSS Loaded Unoptimized via CDN
**Status:** Done. CDN replaced with local `tailwind.min.css` (~10 KB purged). Rebuild: `npx tailwindcss -i src/input.css -o tailwind.min.css --minify`.

---

## Priority 4 — Minor / Nice to Have

### ✅ 4.1 localStorage Key Registry
**Status:** Done — covered by `STORAGE_KEYS` in §2.1.

### ✅ 4.2 Error Boundary for Cloud Sync
**Status:** Done. Amber "● Unsynced" dot on dirty state; red "● Sync failing" after 3 consecutive failures; `_pcCloudFailCount` counter; resets on successful save.

### ✅ 4.3 Multi-Tab Safety
**Status:** Done. `window.addEventListener('storage', ...)` in `engine.js` detects competing writes and shows reload toast.

### ⏳ 4.4 `ranges.js` — Consider Splitting
**Status:** Pending. 7,800+ LOC single file; candidate for `ranges-preflop.js`, `ranges-postflop.js`, `push-fold.js`. Low priority — needs file structure read before scoping.

### ✅ 4.5 Deployment Checklist
**Status:** Done. Full checklist in `Claude.md` (CSS rebuild, cache-busting via git SHA, deploy-all-files, smoke test steps).

---

## Remaining Work (by priority)

| # | Item | Risk | Effort |
|---|---|---|---|
| 3.1 | Global state isolation (158 mutations) | High | High |
| 2.3 | Expand SRP hero-hand awareness (3BP complete) | Medium | Medium |
| 4.4 | Split `ranges.js` | Low | Low |
| 1.1 | XSS/innerHTML audit | Medium | Medium |
| — | `UI_CONFIG` animation constants | Low | Low |
