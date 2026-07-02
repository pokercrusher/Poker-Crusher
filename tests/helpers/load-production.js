/**
 * tests/helpers/load-production.js
 *
 * Loads the REAL production scripts (ranges.js, engine.js, sim.js,
 * poker-room.js) into a single `node:vm` context with minimal browser
 * stubs, and exposes their globals to the test suite.
 *
 * This replaces the old pattern of copying functions "verbatim" into the
 * test file — copies drift silently (a field-name divergence in the copied
 * PR_evalShowdown masked a production bug where showdown pots were never
 * awarded). Tests that import from here exercise the exact code that ships.
 *
 * The files are classic browser globals (no exports), loaded in the same
 * order as the <script> tags in index.html. `const`/`let` declarations live
 * in the context's global lexical scope, not on the sandbox object, so the
 * exports are pulled out with one final extraction expression evaluated
 * inside the context.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Browser stubs — just enough for top-level side effects in each file.
function makeSandbox() {
    const storage = new Map();
    const localStorage = {
        getItem: (k) => (storage.has(k) ? storage.get(k) : null),
        setItem: (k, v) => storage.set(k, String(v)),
        removeItem: (k) => storage.delete(k),
        clear: () => storage.clear(),
    };
    const window = {
        PC_DEBUG: false,
        RANGE_VALIDATE: false,
        addEventListener: () => {},
        dispatchEvent: () => {},
    };
    return {
        window,
        localStorage,
        console,
        setTimeout,
        clearTimeout,
        // cloud.js is not loaded (Firebase-only); engine.js needs these at top level
        profileKey: (k) => k,
        showToast: () => {},
    };
}

const FILES = ['ranges.js', 'engine.js', 'sim.js', 'poker-room.js'];

// Names the tests need. Mix of `function` and `const` declarations —
// both are reachable from an expression evaluated inside the context.
const EXPORT_NAMES = [
    // ranges.js
    'RANKS', 'RANK_NUM', 'ALL_POSITIONS', 'evaluateRawHand',
    'classifyFlopHand', 'classifyTurnHand', 'classifyRiverHand',
    'PLAYER_TYPE_RANGE_PROFILES',
    // engine.js
    'checkRangeHelper', 'buildSRKey', 'buildSpotKey', 'computeCorrectAction',
    // sim.js
    'FULL_TABLE_POSITIONS', '_freshDeck', '_shuffle', '_cardsToHandNotation',
    '_deepCopy', '_resolveVillainPreflopAction',
    // poker-room.js
    'PR_POSITIONS', 'PR_STAKE_CONFIG', 'PR_ARCHETYPE_POSTFLOP', 'PR_ARCHETYPE_PREFLOP',
    'PR_createHand', 'PR_runPreflopToHero', 'PR_applyHeroAction', 'PR_applyVillainAction',
    'PR_resolveVillainPreflopAction', 'PR_resolveVillainPostflopAction',
    'PR_isStreetComplete', 'PR_advanceStreet', 'PR_evalShowdown', 'PR_evalBestHand',
    'PR_resolveOutcome', 'PR_gradeHeroAction', 'PR_runSpectatorStreets',
    '_PR_handStrengthScore', '_PR_applyAction', '_PR_facingAmount', '_PR_nextActor',
];

let cached = null;

/** Load (once) and return an object holding every production global in EXPORT_NAMES. */
export function loadProduction() {
    if (cached) return cached;
    const ctx = vm.createContext(makeSandbox());
    for (const file of FILES) {
        const src = readFileSync(path.join(ROOT, file), 'utf8');
        vm.runInContext(src, ctx, { filename: file });
    }
    cached = vm.runInContext(`({ ${EXPORT_NAMES.join(', ')} })`, ctx);
    return cached;
}
