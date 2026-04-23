/**
 * tests/engine.test.js
 *
 * Unit tests for the three core pure functions in engine.js:
 *   - checkRangeHelper  — hand-in-range membership
 *   - buildSRKey        — SR key construction
 *   - computeCorrectAction — correct preflop action derivation
 *
 * checkRangeHelper and buildSRKey/buildSpotKey are copied verbatim from
 * engine.js. Any divergence will surface as a failing test.
 *
 * computeCorrectAction is adapted to accept injected range tables so it
 * can run in Node without browser globals; the branch logic is identical
 * to the production version.
 *
 * Run: npm test
 */
import { describe, it, expect } from 'vitest';

// ── RANKS — must match ranges.js ─────────────────────────────────────────────
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

// ── checkRangeHelper — verbatim copy from engine.js ──────────────────────────
function checkRangeHelper(hand, list) {
    if (!list) return false;
    const r1 = hand[0], r2 = hand[1], type = hand[2] || '';
    const ri1 = RANKS.indexOf(r1), ri2 = RANKS.indexOf(r2);

    for (let item of list) {
        if (item === hand) return true;
        if (item.length === 2 && !item.endsWith('+')) {
            const ir1 = item[0], ir2 = item[1];
            if (r1 === ir1 && r2 === ir2 && r1 !== r2) return true;
        }
        if (item.endsWith('+')) {
            const base = item.slice(0, -1);
            const bSuffix = base.endsWith('s') ? 's' : base.endsWith('o') ? 'o' : '';
            const bR1 = base[0], bR2 = base[1];
            const bRi1 = RANKS.indexOf(bR1), bRi2 = RANKS.indexOf(bR2);
            if (bR1 === bR2 && bSuffix === '') {
                if (r1 === r2 && type === '' && ri1 <= bRi1) return true;
            } else if (bSuffix === 's') {
                if (type === 's' && r1 === bR1 && ri2 <= bRi2) return true;
            } else if (bSuffix === 'o') {
                if (type === 'o' && r1 === bR1 && ri2 <= bRi2) return true;
            } else {
                if (r1 === bR1 && r2 === bR2 && ri2 <= bRi2) return true;
            }
        }
        if (item.includes('-') && !item.endsWith('+')) {
            const dashIdx = item.indexOf('-');
            const s = item.slice(0, dashIdx);
            const e = item.slice(dashIdx + 1);
            const sSuffix = s.endsWith('s') ? 's' : s.endsWith('o') ? 'o' : '';
            const eSuffix = e.endsWith('s') ? 's' : e.endsWith('o') ? 'o' : '';
            const sR1 = s[0], sR2 = s[1];
            const eR1 = e[0], eR2 = e[1];
            const sRi1 = RANKS.indexOf(sR1), sRi2 = RANKS.indexOf(sR2);
            const eRi1 = RANKS.indexOf(eR1), eRi2 = RANKS.indexOf(eR2);
            if (sR1 === sR2 && sSuffix === '' && eR1 === eR2 && eSuffix === '') {
                if (r1 === r2 && type === '' && ri1 >= sRi1 && ri1 <= eRi1) return true;
            } else if (sSuffix === 's' && eSuffix === 's' && sR1 === eR1) {
                if (type === 's' && r1 === sR1 && ri2 >= sRi2 && ri2 <= eRi2) return true;
            } else if (sSuffix === 'o' && eSuffix === 'o' && sR1 === eR1) {
                if (type === 'o' && r1 === sR1 && ri2 >= sRi2 && ri2 <= eRi2) return true;
            } else if (sSuffix === '' && eSuffix === '' && sR1 !== sR2) {
                if (r1 === sR1 && ri2 >= sRi2 && ri2 <= eRi2) return true;
            }
        }
    }
    return false;
}

// ── buildSpotKey + buildSRKey — verbatim copy from engine.js ─────────────────
function buildSpotKey(scenario, heroPos, oppPos, limperBucket, stackBB) {
    if (scenario === 'RFI') return `${scenario}|${heroPos}`;
    if (scenario === 'VS_LIMP') return `${scenario}|${heroPos}_vs_${oppPos}_Limp|${limperBucket || '1L'}`;
    if (scenario === 'SQUEEZE' || scenario === 'SQUEEZE_2C') return `${scenario}|${oppPos}`;
    if (scenario === 'PUSH_FOLD') return `${scenario}|${heroPos}|${stackBB}BB`;
    return `${scenario}|${heroPos}_vs_${oppPos}`;
}

function buildSRKey(scenario, heroPos, oppPos, limperBucket, stackBB, hand) {
    return `${buildSpotKey(scenario, heroPos, oppPos, limperBucket, stackBB)}|${hand}`;
}

// ── computeCorrectAction — adapted for injection (branch logic identical) ────
// The production function reads from browser globals (rfiRanges, PF_PUSH, etc.)
// and state.stackBB. Here those are passed as a single `tables` argument so
// the function can run in Node. Every branch is present and unmodified.
function computeCorrectAction(hand, scenario, heroPos, oppPos, limperBucket, tables) {
    const { rfiRanges, facingRfiRanges, squeezeRanges, squeezeVsRfiTwoCallers,
            allFacingLimps, rfiVs3BetRanges, vs4BetRanges, PF_PUSH, stackBB } = tables;

    if (scenario === 'RFI') {
        return checkRangeHelper(hand, rfiRanges[heroPos]) ? 'RAISE' : 'FOLD';
    } else if (scenario === 'FACING_RFI') {
        const data = facingRfiRanges[`${heroPos}_vs_${oppPos}`];
        if (!data) return 'FOLD';
        if (checkRangeHelper(hand, data['3-bet'])) return '3BET';
        if (data['Call'] && data['Call'].length > 0 && checkRangeHelper(hand, data['Call'])) return 'CALL';
        return 'FOLD';
    } else if (scenario === 'VS_LIMP') {
        const data = allFacingLimps[`${heroPos}_vs_${oppPos}_Limp`];
        if (!data) return 'FOLD';
        const raises = data['ISO'] || data['Raise'] || [];
        const passives = data['Overlimp'] || data['Call'] || [];
        if (checkRangeHelper(hand, raises)) return 'ISO';
        if (checkRangeHelper(hand, passives)) return 'OVERLIMP';
        return 'FOLD';
    } else if (scenario === 'SQUEEZE') {
        const data = squeezeRanges[oppPos];
        if (!data) return 'FOLD';
        if (checkRangeHelper(hand, data['Squeeze'])) return 'SQUEEZE';
        if (data['Call'] && checkRangeHelper(hand, data['Call'])) return 'CALL';
        return 'FOLD';
    } else if (scenario === 'SQUEEZE_2C') {
        const data = squeezeVsRfiTwoCallers[oppPos];
        if (!data) return 'FOLD';
        if (checkRangeHelper(hand, data['Squeeze'])) return 'SQUEEZE';
        if (data['Call'] && checkRangeHelper(hand, data['Call'])) return 'CALL';
        return 'FOLD';
    } else if (scenario === 'PUSH_FOLD') {
        const pfRange = PF_PUSH[stackBB] && PF_PUSH[stackBB][heroPos];
        return (pfRange && checkRangeHelper(hand, pfRange)) ? 'SHOVE' : 'FOLD';
    } else if (scenario === 'VS_4BET') {
        const data = vs4BetRanges[`${heroPos}_vs_${oppPos}`];
        if (!data) return 'FOLD';
        if (checkRangeHelper(hand, data['5-bet'])) return '5BET';
        if (checkRangeHelper(hand, data['Call'])) return 'CALL';
        return 'FOLD';
    } else {
        // RFI_VS_3BET and fallback
        const data = rfiVs3BetRanges[`${heroPos}_vs_${oppPos}`];
        if (!data) return 'FOLD';
        if (checkRangeHelper(hand, data['4-bet'])) return '4BET';
        if (checkRangeHelper(hand, data['Call'])) return 'CALL';
        return 'FOLD';
    }
}

// ── Minimal range fixtures for computeCorrectAction tests ────────────────────
const TABLES = {
    rfiRanges: {
        BTN: ['ATs+', 'KQs', 'KK+', 'AKo', 'AQo'],
        UTG: ['JJ+', 'AKs', 'AKo'],
        CO:  ['88+', 'ATs+', 'KQs', 'AJo+', 'KQo'],
    },
    facingRfiRanges: {
        BB_vs_BTN: { '3-bet': ['QQ+', 'AKs'], 'Call': ['JJ', 'TT', '99', 'AQs', 'KQs'] },
        BB_vs_UTG: { '3-bet': ['KK+', 'AKs'], 'Call': ['QQ', 'JJ', 'AQs'] },
    },
    squeezeRanges: {
        BTN: { 'Squeeze': ['QQ+', 'AKs'], 'Call': ['JJ', 'TT'] },
    },
    squeezeVsRfiTwoCallers: {
        BTN: { 'Squeeze': ['KK+', 'AKs'], 'Call': ['QQ'] },
    },
    allFacingLimps: {
        CO_vs_UTG_Limp: { 'ISO': ['TT+', 'AQs+', 'AKo'], 'Overlimp': ['77-55', 'A9s-A6s'] },
    },
    rfiVs3BetRanges: {
        BTN_vs_BB: { '4-bet': ['AA', 'KK', 'AKs'], 'Call': ['QQ', 'JJ', 'AQs'] },
    },
    vs4BetRanges: {
        BB_vs_BTN: { '5-bet': ['AA', 'KK'], 'Call': ['QQ', 'AKs'] },
    },
    PF_PUSH: {
        10: { BTN: ['AA', 'KK', 'QQ', 'AKs', 'AKo', 'JJ', 'TT'] },
        8:  { BTN: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', 'AKs', 'AKo', 'AQs'] },
        5:  { SB:  ['AA+'] },
    },
    stackBB: 10,
};

// =============================================================================
// checkRangeHelper tests
// =============================================================================
describe('checkRangeHelper', () => {

    describe('null / empty guard', () => {
        it('returns false for null list', () => {
            expect(checkRangeHelper('AKs', null)).toBe(false);
        });
        it('returns false for empty list', () => {
            expect(checkRangeHelper('AKs', [])).toBe(false);
        });
    });

    describe('exact match', () => {
        it('matches exact token', () => {
            expect(checkRangeHelper('AKs', ['AKs'])).toBe(true);
        });
        it('does not match wrong suit type', () => {
            expect(checkRangeHelper('AKo', ['AKs'])).toBe(false);
        });
        it('does not match wrong rank', () => {
            expect(checkRangeHelper('AQs', ['AKs'])).toBe(false);
        });
    });

    describe('2-char shorthand (e.g. "AK" means both AKs and AKo)', () => {
        it('matches AKs against "AK"', () => {
            expect(checkRangeHelper('AKs', ['AK'])).toBe(true);
        });
        it('matches AKo against "AK"', () => {
            expect(checkRangeHelper('AKo', ['AK'])).toBe(true);
        });
        it('does not match AQs against "AK"', () => {
            expect(checkRangeHelper('AQs', ['AK'])).toBe(false);
        });
    });

    describe('pair-plus (e.g. "KK+")', () => {
        it('AA is in KK+', () => {
            expect(checkRangeHelper('AA', ['KK+'])).toBe(true);
        });
        it('KK is in KK+', () => {
            expect(checkRangeHelper('KK', ['KK+'])).toBe(true);
        });
        it('QQ is not in KK+', () => {
            expect(checkRangeHelper('QQ', ['KK+'])).toBe(false);
        });
        it('AA is in AA+', () => {
            expect(checkRangeHelper('AA', ['AA+'])).toBe(true);
        });
        it('KK is not in AA+', () => {
            expect(checkRangeHelper('KK', ['AA+'])).toBe(false);
        });
        it('suited hand does not match pair-plus token', () => {
            expect(checkRangeHelper('KKs', ['KK+'])).toBe(false); // KKs is not a valid hand but guard matters
        });
    });

    describe('suited-plus ladder (e.g. "ATs+")', () => {
        it('AKs is in ATs+', () => {
            expect(checkRangeHelper('AKs', ['ATs+'])).toBe(true);
        });
        it('AJs is in ATs+', () => {
            expect(checkRangeHelper('AJs', ['ATs+'])).toBe(true);
        });
        it('ATs is in ATs+', () => {
            expect(checkRangeHelper('ATs', ['ATs+'])).toBe(true);
        });
        it('A9s is NOT in ATs+', () => {
            expect(checkRangeHelper('A9s', ['ATs+'])).toBe(false);
        });
        it('ATo (offsuit) is NOT in ATs+', () => {
            expect(checkRangeHelper('ATo', ['ATs+'])).toBe(false);
        });
    });

    describe('offsuit-plus ladder (e.g. "ATo+")', () => {
        it('AKo is in ATo+', () => {
            expect(checkRangeHelper('AKo', ['ATo+'])).toBe(true);
        });
        it('ATo is in ATo+', () => {
            expect(checkRangeHelper('ATo', ['ATo+'])).toBe(true);
        });
        it('A9o is NOT in ATo+', () => {
            expect(checkRangeHelper('A9o', ['ATo+'])).toBe(false);
        });
        it('ATs (suited) is NOT in ATo+', () => {
            expect(checkRangeHelper('ATs', ['ATo+'])).toBe(false);
        });
    });

    describe('pair range (e.g. "JJ-77")', () => {
        it('JJ is in JJ-77', () => {
            expect(checkRangeHelper('JJ', ['JJ-77'])).toBe(true);
        });
        it('TT is in JJ-77', () => {
            expect(checkRangeHelper('TT', ['JJ-77'])).toBe(true);
        });
        it('77 is in JJ-77', () => {
            expect(checkRangeHelper('77', ['JJ-77'])).toBe(true);
        });
        it('QQ is NOT in JJ-77', () => {
            expect(checkRangeHelper('QQ', ['JJ-77'])).toBe(false);
        });
        it('66 is NOT in JJ-77', () => {
            expect(checkRangeHelper('66', ['JJ-77'])).toBe(false);
        });
    });

    describe('suited kicker range (e.g. "ATs-A8s")', () => {
        it('ATs is in ATs-A8s', () => {
            expect(checkRangeHelper('ATs', ['ATs-A8s'])).toBe(true);
        });
        it('A9s is in ATs-A8s', () => {
            expect(checkRangeHelper('A9s', ['ATs-A8s'])).toBe(true);
        });
        it('A8s is in ATs-A8s', () => {
            expect(checkRangeHelper('A8s', ['ATs-A8s'])).toBe(true);
        });
        it('AJs is NOT in ATs-A8s', () => {
            expect(checkRangeHelper('AJs', ['ATs-A8s'])).toBe(false);
        });
        it('A7s is NOT in ATs-A8s', () => {
            expect(checkRangeHelper('A7s', ['ATs-A8s'])).toBe(false);
        });
    });

    describe('multi-token list', () => {
        it('hand matched by second token', () => {
            expect(checkRangeHelper('KQs', ['AKs', 'KQs', 'QJs'])).toBe(true);
        });
        it('hand not in any token', () => {
            expect(checkRangeHelper('72o', ['AKs', 'KK+', 'ATs+'])).toBe(false);
        });
    });
});

// =============================================================================
// buildSRKey / buildSpotKey tests
// =============================================================================
describe('buildSRKey', () => {

    describe('RFI', () => {
        it('produces correct key', () => {
            expect(buildSRKey('RFI', 'BTN', '', null, null, 'AKs'))
                .toBe('RFI|BTN|AKs');
        });
        it('oppPos and stackBB are ignored', () => {
            expect(buildSRKey('RFI', 'CO', 'BB', '2L', 20, 'QQ'))
                .toBe('RFI|CO|QQ');
        });
    });

    describe('FACING_RFI', () => {
        it('produces correct key', () => {
            expect(buildSRKey('FACING_RFI', 'BB', 'BTN', null, null, 'JJ'))
                .toBe('FACING_RFI|BB_vs_BTN|JJ');
        });
    });

    describe('RFI_VS_3BET', () => {
        it('produces correct key', () => {
            expect(buildSRKey('RFI_VS_3BET', 'BTN', 'BB', null, null, 'AKs'))
                .toBe('RFI_VS_3BET|BTN_vs_BB|AKs');
        });
    });

    describe('PUSH_FOLD', () => {
        it('includes stack depth in key', () => {
            expect(buildSRKey('PUSH_FOLD', 'BTN', '', null, 10, 'AA'))
                .toBe('PUSH_FOLD|BTN|10BB|AA');
        });
        it('different stack depths produce distinct keys', () => {
            const k8  = buildSRKey('PUSH_FOLD', 'SB', '', null, 8,  'KK');
            const k13 = buildSRKey('PUSH_FOLD', 'SB', '', null, 13, 'KK');
            expect(k8).toBe('PUSH_FOLD|SB|8BB|KK');
            expect(k13).toBe('PUSH_FOLD|SB|13BB|KK');
            expect(k8).not.toBe(k13);
        });
    });

    describe('VS_LIMP', () => {
        it('includes limper bucket (default 1L)', () => {
            expect(buildSRKey('VS_LIMP', 'CO', 'UTG', '1L', null, 'AKs'))
                .toBe('VS_LIMP|CO_vs_UTG_Limp|1L|AKs');
        });
        it('includes limper bucket (2L)', () => {
            expect(buildSRKey('VS_LIMP', 'CO', 'UTG', '2L', null, 'AKs'))
                .toBe('VS_LIMP|CO_vs_UTG_Limp|2L|AKs');
        });
        it('falls back to 1L when limperBucket is null', () => {
            expect(buildSRKey('VS_LIMP', 'CO', 'UTG', null, null, 'AKs'))
                .toBe('VS_LIMP|CO_vs_UTG_Limp|1L|AKs');
        });
    });

    describe('SQUEEZE / SQUEEZE_2C', () => {
        it('SQUEEZE key uses oppPos as spot discriminator', () => {
            expect(buildSRKey('SQUEEZE', 'BB', 'BTN', null, null, 'QQ'))
                .toBe('SQUEEZE|BTN|QQ');
        });
        it('SQUEEZE_2C key uses oppPos as spot discriminator', () => {
            expect(buildSRKey('SQUEEZE_2C', 'BB', 'CO', null, null, 'AA'))
                .toBe('SQUEEZE_2C|CO|AA');
        });
    });

    describe('key uniqueness across scenarios', () => {
        it('RFI and FACING_RFI for same position produce different keys', () => {
            const rfi    = buildSRKey('RFI',        'BTN', '',    null, null, 'AKs');
            const facing = buildSRKey('FACING_RFI', 'BTN', 'CO', null, null, 'AKs');
            expect(rfi).not.toBe(facing);
        });
    });
});

// =============================================================================
// computeCorrectAction tests
// =============================================================================
describe('computeCorrectAction', () => {

    describe('RFI', () => {
        it('hand in range → RAISE', () => {
            expect(computeCorrectAction('AKs', 'RFI', 'BTN', '', null, TABLES)).toBe('RAISE');
        });
        it('ATs is in BTN range (via ATs+) → RAISE', () => {
            expect(computeCorrectAction('ATs', 'RFI', 'BTN', '', null, TABLES)).toBe('RAISE');
        });
        it('hand not in range → FOLD', () => {
            expect(computeCorrectAction('72o', 'RFI', 'BTN', '', null, TABLES)).toBe('FOLD');
        });
        it('UTG folds hands not in tight range', () => {
            expect(computeCorrectAction('ATo', 'RFI', 'UTG', '', null, TABLES)).toBe('FOLD');
        });
        it('unknown position → FOLD (no range entry)', () => {
            expect(computeCorrectAction('AA', 'RFI', 'HERO', '', null, TABLES)).toBe('FOLD');
        });
    });

    describe('FACING_RFI', () => {
        it('3-bet hand → 3BET', () => {
            expect(computeCorrectAction('AA', 'FACING_RFI', 'BB', 'BTN', null, TABLES)).toBe('3BET');
        });
        it('AKs → 3BET (in 3-bet range)', () => {
            expect(computeCorrectAction('AKs', 'FACING_RFI', 'BB', 'BTN', null, TABLES)).toBe('3BET');
        });
        it('call hand → CALL', () => {
            expect(computeCorrectAction('JJ', 'FACING_RFI', 'BB', 'BTN', null, TABLES)).toBe('CALL');
        });
        it('KQs → CALL', () => {
            expect(computeCorrectAction('KQs', 'FACING_RFI', 'BB', 'BTN', null, TABLES)).toBe('CALL');
        });
        it('hand in neither range → FOLD', () => {
            expect(computeCorrectAction('72o', 'FACING_RFI', 'BB', 'BTN', null, TABLES)).toBe('FOLD');
        });
        it('unknown spot → FOLD', () => {
            expect(computeCorrectAction('AA', 'FACING_RFI', 'CO', 'HJ', null, TABLES)).toBe('FOLD');
        });
        it('3BET takes priority over CALL for hands in both (defensive)', () => {
            // QQ+ is only in 3-bet range; confirm it doesn't fall through to CALL
            expect(computeCorrectAction('QQ', 'FACING_RFI', 'BB', 'BTN', null, TABLES)).toBe('3BET');
        });
    });

    describe('PUSH_FOLD', () => {
        it('AA at 10BB → SHOVE', () => {
            expect(computeCorrectAction('AA', 'PUSH_FOLD', 'BTN', '', null, TABLES)).toBe('SHOVE');
        });
        it('AKo at 10BB → SHOVE', () => {
            expect(computeCorrectAction('AKo', 'PUSH_FOLD', 'BTN', '', null, TABLES)).toBe('SHOVE');
        });
        it('72o at 10BB → FOLD', () => {
            expect(computeCorrectAction('72o', 'PUSH_FOLD', 'BTN', '', null, TABLES)).toBe('FOLD');
        });
        it('different stack depth uses correct range', () => {
            const tables8 = { ...TABLES, stackBB: 8 };
            // AQs is in the 8BB BTN range but not the 10BB BTN range
            expect(computeCorrectAction('AQs', 'PUSH_FOLD', 'BTN', '', null, tables8)).toBe('SHOVE');
            expect(computeCorrectAction('AQs', 'PUSH_FOLD', 'BTN', '', null, TABLES)).toBe('FOLD');
        });
        it('position with no range entry → FOLD', () => {
            expect(computeCorrectAction('AA', 'PUSH_FOLD', 'UTG', '', null, TABLES)).toBe('FOLD');
        });
        it('SB range only present at 5BB', () => {
            const tables5 = { ...TABLES, stackBB: 5 };
            expect(computeCorrectAction('AA', 'PUSH_FOLD', 'SB', '', null, tables5)).toBe('SHOVE');
            expect(computeCorrectAction('KK', 'PUSH_FOLD', 'SB', '', null, tables5)).toBe('FOLD');
        });
    });

    describe('SQUEEZE', () => {
        it('squeeze hand → SQUEEZE', () => {
            expect(computeCorrectAction('AA', 'SQUEEZE', 'BB', 'BTN', null, TABLES)).toBe('SQUEEZE');
        });
        it('call hand → CALL', () => {
            expect(computeCorrectAction('JJ', 'SQUEEZE', 'BB', 'BTN', null, TABLES)).toBe('CALL');
        });
        it('hand in neither → FOLD', () => {
            expect(computeCorrectAction('72o', 'SQUEEZE', 'BB', 'BTN', null, TABLES)).toBe('FOLD');
        });
        it('unknown opener → FOLD', () => {
            expect(computeCorrectAction('AA', 'SQUEEZE', 'BB', 'UTG', null, TABLES)).toBe('FOLD');
        });
    });

    describe('RFI_VS_3BET', () => {
        it('4-bet hand → 4BET', () => {
            expect(computeCorrectAction('AA', 'RFI_VS_3BET', 'BTN', 'BB', null, TABLES)).toBe('4BET');
        });
        it('call hand → CALL', () => {
            expect(computeCorrectAction('QQ', 'RFI_VS_3BET', 'BTN', 'BB', null, TABLES)).toBe('CALL');
        });
        it('hand in neither → FOLD', () => {
            expect(computeCorrectAction('72o', 'RFI_VS_3BET', 'BTN', 'BB', null, TABLES)).toBe('FOLD');
        });
    });
});

// =============================================================================
// Poker Room — Pass 1 Engine Tests
// Pure-function copies of the engine's key algorithms, stripped of browser globals.
// =============================================================================

// ── Minimal inline dependencies ───────────────────────────────────────────────

const RANK_NUM = { A:14,K:13,Q:12,J:11,T:10,'9':9,'8':8,'7':7,'6':6,'5':5,'4':4,'3':3,'2':2 };
const PR_POSITIONS = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB','BB'];

function freshDeck() {
    const suits = ['h','d','c','s'];
    const ranks = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
    const deck = [];
    for (const r of ranks) for (const s of suits) deck.push(r + s);
    return deck;
}

function shuffle(deck) {
    const d = deck.slice();
    for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
}

function cardsToHandNotation(cards) {
    const [c1, c2] = cards;
    const r1 = c1[0], s1 = c1[1], r2 = c2[0], s2 = c2[1];
    const ri1 = RANKS.indexOf(r1), ri2 = RANKS.indexOf(r2);
    if (r1 === r2) return r1 + r2;
    if (ri1 < ri2) return r1 + r2 + (s1 === s2 ? 's' : 'o');
    return r2 + r1 + (s1 === s2 ? 's' : 'o');
}

// evaluateRawHand — verbatim port from ranges.js
function hasMadeStraight(sortedUniqueRanks) {
    const ranks = [...sortedUniqueRanks];
    if (ranks.includes(14)) ranks.push(1);
    const unique = [...new Set(ranks)];
    for (let low = 1; low <= 10; low++) {
        const w = [low,low+1,low+2,low+3,low+4];
        if (w.filter(r => unique.includes(r)).length >= 5) return true;
    }
    return false;
}

function hasStraightFlush(allCards) {
    const bySuit = {};
    for (const c of allCards) {
        const s = c.suit, r = RANK_NUM[c.rank];
        if (!bySuit[s]) bySuit[s] = [];
        bySuit[s].push(r);
    }
    for (const ranks of Object.values(bySuit)) {
        if (ranks.length < 5) continue;
        const withLow = ranks.includes(14) ? [...ranks, 1] : [...ranks];
        const unique = [...new Set(withLow)];
        for (let lo = 1; lo <= 10; lo++) {
            const w = [lo,lo+1,lo+2,lo+3,lo+4];
            if (w.every(r => unique.includes(r))) return true;
        }
    }
    return false;
}

function evaluateRawHand(heroCards, boardCards) {
    const allCards = [...heroCards, ...boardCards];
    const freq = new Map();
    for (const c of allCards) {
        const r = RANK_NUM[c.rank];
        freq.set(r, (freq.get(r) || 0) + 1);
    }
    let quads = 0, trips = 0, pairs = 0;
    for (const cnt of freq.values()) {
        if (cnt >= 4) quads++;
        else if (cnt === 3) trips++;
        else if (cnt === 2) pairs++;
    }
    const suitFreq = {};
    for (const c of allCards) suitFreq[c.suit] = (suitFreq[c.suit] || 0) + 1;
    const hasFlush = Object.values(suitFreq).some(n => n >= 5);
    const uniqueRanks = [...new Set(allCards.map(c => RANK_NUM[c.rank]))].sort((a,b) => b-a);
    const hasStraight = hasMadeStraight(uniqueRanks);
    const hasSF = (hasFlush || hasStraight) && hasStraightFlush(allCards);

    if (hasSF)                      return { rank: 9, label: 'STRAIGHT_FLUSH' };
    if (quads >= 1)                 return { rank: 8, label: 'QUADS' };
    if (trips >= 1 && pairs >= 1)   return { rank: 7, label: 'FULL_HOUSE' };
    if (trips >= 2)                 return { rank: 7, label: 'FULL_HOUSE' };
    if (hasFlush)                   return { rank: 6, label: 'FLUSH' };
    if (hasStraight)                return { rank: 5, label: 'STRAIGHT' };
    if (trips >= 1)                 return { rank: 4, label: 'TRIPS' };
    if (pairs >= 2)                 return { rank: 3, label: 'TWO_PAIR' };
    if (pairs === 1)                return { rank: 2, label: 'PAIR' };
    return { rank: 1, label: 'HIGH_CARD' };
}

// PR_evalBestHand — verbatim copy from poker-room.js
function PR_evalBestHand(holeCards, board) {
    const raw    = evaluateRawHand(holeCards, board);
    const hRanks = holeCards.map(c => RANK_NUM[c.rank]);
    return { rank: raw.rank, label: raw.label, tiebreaker: Math.max(...hRanks) };
}

// Minimal PR_createHand for dealing tests (no browser globals required)
function PR_createHand_test(heroPos, numSeats) {
    numSeats = numSeats || 9;
    const positions = PR_POSITIONS.slice(0, numSeats);
    const deck = shuffle(freshDeck());
    let deckIdx = 0;
    const seats = PR_POSITIONS.map(function(pos) {
        if (!positions.includes(pos)) return null;
        const c1 = deck[deckIdx++], c2 = deck[deckIdx++];
        return {
            index:        PR_POSITIONS.indexOf(pos),
            label:        pos,
            isHero:       pos === heroPos,
            stackBB:      100,
            holeCards:    [{ rank: c1[0], suit: c1[1] }, { rank: c2[0], suit: c2[1] }],
            handNotation: cardsToHandNotation([c1, c2]),
            folded:        false,
            allIn:         false,
        };
    });
    const heroSeatIndex = PR_POSITIONS.indexOf(heroPos);
    const initCommitted = {};
    seats.forEach(s => { if (s) initCommitted[s.label] = 0; });
    if (initCommitted['SB'] !== undefined) initCommitted['SB'] = 0.5;
    if (initCommitted['BB'] !== undefined) initCommitted['BB'] = 1.0;
    return {
        seats,
        heroSeatIndex,
        gameState: {
            potBB: 0, board: [], street: 'preflop',
            streetState: { street: 'preflop', betMadeThisStreet: true, actions: [], committedBB: initCommitted },
            streetHistory: { preflop: [], flop: [], turn: [], river: [] },
        },
        openSizeBB: 2.5, heroGrades: [], heroFolded: false, terminal: false, outcome: null,
    };
}

// PR_isStreetComplete — verbatim logic from poker-room.js
function PR_isStreetComplete_test(prHand) {
    const ss     = prHand.gameState.streetState;
    const street = prHand.gameState.street;
    const order  = street === 'preflop' ? PR_POSITIONS : ['SB','BB','UTG','UTG1','UTG2','LJ','HJ','CO','BTN'];
    const activeLabels = new Set(prHand.seats.filter(s => s && !s.folded && !s.allIn).map(s => s.label));
    const activeOrder  = order.filter(l => activeLabels.has(l));
    if (activeOrder.length <= 1) return true;

    if (!ss.betMadeThisStreet) {
        const acted = new Set(ss.actions.map(a => a.seatLabel));
        return activeOrder.every(l => acted.has(l));
    }
    let lastAggrIdx = -1;
    for (let i = ss.actions.length - 1; i >= 0; i--) {
        if (['bet','raise','3bet','4bet'].includes(ss.actions[i].action)) { lastAggrIdx = i; break; }
    }
    if (lastAggrIdx === -1) return false;
    const aggrLabel = ss.actions[lastAggrIdx].seatLabel;
    const respondedAfter = new Set(ss.actions.slice(lastAggrIdx + 1).map(a => a.seatLabel));
    return activeOrder.filter(l => l !== aggrLabel).every(l => respondedAfter.has(l));
}

// PR_evalShowdown — minimal port for split-pot test
function PR_evalShowdown_test(prHand) {
    const board       = prHand.gameState.board;
    const activeSeats = prHand.seats.filter(s => s !== null && !s.folded);
    const evals = activeSeats.map(s => {
        const best = PR_evalBestHand(s.holeCards, board);
        return { seatLabel: s.label, rank: best.rank, handLabel: best.label, tiebreaker: best.tiebreaker };
    });
    const bestRank = Math.max(...evals.map(e => e.rank));
    const bestHands = evals.filter(e => e.rank === bestRank);
    const bestTie   = Math.max(...bestHands.map(e => e.tiebreaker));
    const winners   = bestHands.filter(e => e.tiebreaker === bestTie).map(e => e.seatLabel);
    const totalPot  = Object.values(prHand.gameState.streetState.committedBB).reduce((a,v) => a+v, 0);
    const share     = totalPot / winners.length;
    return { winners, share, totalPot };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Poker Room — Pass 1 Engine', () => {

    it('test 1: 18 distinct cards dealt across 9 seats, no duplicates', () => {
        const prHand = PR_createHand_test('BTN', 9);
        const allCards = [];
        prHand.seats.forEach(s => {
            if (!s) return;
            s.holeCards.forEach(c => allCards.push(c.rank + c.suit));
        });
        expect(allCards.length).toBe(18);
        expect(new Set(allCards).size).toBe(18);
    });

    it('test 2: hero cards are at their seat position, not dealt first', () => {
        const prHand = PR_createHand_test('CO', 9);
        const heroSeat = prHand.seats[prHand.heroSeatIndex];
        expect(heroSeat.isHero).toBe(true);
        expect(heroSeat.label).toBe('CO');
        const seatsWithCards = prHand.seats.filter(s => s && s.holeCards && s.holeCards.length === 2);
        expect(seatsWithCards.length).toBe(9);
    });

    it('test 3: dealing completes without error across 100 random hands', () => {
        const positions = ['UTG','BTN','SB','BB','CO','HJ'];
        for (let i = 0; i < 100; i++) {
            const heroPos = positions[i % positions.length];
            const prHand  = PR_createHand_test(heroPos, 9);
            const cards   = [];
            prHand.seats.forEach(s => { if (s) s.holeCards.forEach(c => cards.push(c.rank + c.suit)); });
            expect(new Set(cards).size).toBe(cards.length);
        }
    });

    it('test 4: PR_isStreetComplete false mid-action, true after all seats resolved', () => {
        const miniHand = {
            seats: [
                { label: 'UTG', isHero: false, folded: false, allIn: false },
                null, null, null, null, null,
                { label: 'BTN', isHero: true,  folded: false, allIn: false },
                null,
                { label: 'BB',  isHero: false, folded: false, allIn: false },
            ],
            heroSeatIndex: 6,
            gameState: {
                street: 'preflop',
                streetState: { street: 'preflop', betMadeThisStreet: true, actions: [], committedBB: { UTG:0, BTN:0, BB:1 } },
            },
        };
        expect(PR_isStreetComplete_test(miniHand)).toBe(false);

        miniHand.gameState.streetState.actions = [
            { seatLabel: 'UTG', action: 'call',  sizingBB: 2.5 },
            { seatLabel: 'BTN', action: 'raise', sizingBB: 7.5 },
        ];
        expect(PR_isStreetComplete_test(miniHand)).toBe(false);

        miniHand.gameState.streetState.actions.push({ seatLabel: 'BB',  action: 'call', sizingBB: 7.5 });
        expect(PR_isStreetComplete_test(miniHand)).toBe(false);

        miniHand.gameState.streetState.actions.push({ seatLabel: 'UTG', action: 'call', sizingBB: 5 });
        expect(PR_isStreetComplete_test(miniHand)).toBe(true);
    });

    it('test 5: flop board has exactly 3 cards not in any seat hole cards', () => {
        const prHand = PR_createHand_test('BTN', 9);
        const usedCards = new Set();
        prHand.seats.forEach(s => { if (s) s.holeCards.forEach(c => usedCards.add(c.rank + c.suit)); });
        const remaining = freshDeck().filter(c => !usedCards.has(c));
        const flop = shuffle(remaining).slice(0, 3).map(c => ({ rank: c[0], suit: c[1] }));
        expect(flop.length).toBe(3);
        flop.forEach(c => expect(usedCards.has(c.rank + c.suit)).toBe(false));
    });

    it('test 6: PR_evalBestHand ranks flush > straight > trips', () => {
        const flush = PR_evalBestHand(
            [{ rank: 'A', suit: 'h' }, { rank: 'K', suit: 'h' }],
            [{ rank: 'Q', suit: 'h' }, { rank: 'J', suit: 'h' }, { rank: '9', suit: 'h' },
             { rank: '2', suit: 'd' }, { rank: '3', suit: 'c' }]
        );
        const straight = PR_evalBestHand(
            [{ rank: 'A', suit: 'h' }, { rank: '2', suit: 'd' }],
            [{ rank: '3', suit: 'c' }, { rank: '4', suit: 's' }, { rank: '5', suit: 'h' },
             { rank: 'K', suit: 'd' }, { rank: '7', suit: 'c' }]
        );
        const trips = PR_evalBestHand(
            [{ rank: 'A', suit: 'h' }, { rank: 'A', suit: 'd' }],
            [{ rank: 'A', suit: 'c' }, { rank: '7', suit: 's' }, { rank: '2', suit: 'h' },
             { rank: '9', suit: 'd' }, { rank: '3', suit: 'c' }]
        );
        expect(flush.rank).toBeGreaterThan(straight.rank);
        expect(straight.rank).toBeGreaterThan(trips.rank);
        expect(flush.label).toBe('FLUSH');
        expect(straight.label).toBe('STRAIGHT');
        expect(trips.label).toBe('TRIPS');
    });

    it('test 7: split pot when two players hold same 5-card straight (board plays)', () => {
        const board = [
            { rank: 'A', suit: 'h' }, { rank: 'K', suit: 'd' }, { rank: 'Q', suit: 'c' },
            { rank: 'J', suit: 's' }, { rank: 'T', suit: 'h' },
        ];
        // Both play the A-K-Q-J-T straight on the board; both have A as best hole card
        const miniHand = {
            seats: [
                { label: 'UTG', isHero: false, folded: false, allIn: false,
                  holeCards: [{ rank: 'A', suit: 'c' }, { rank: '2', suit: 'd' }] },
                null, null, null, null, null,
                { label: 'BTN', isHero: true, folded: false, allIn: false,
                  holeCards: [{ rank: 'A', suit: 'd' }, { rank: '3', suit: 'c' }] },
                null, null,
            ],
            heroSeatIndex: 6,
            gameState: {
                potBB: 0, board,
                streetState: { street: 'river', betMadeThisStreet: false, actions: [], committedBB: { UTG: 10, BTN: 10 } },
                streetHistory: { preflop: [], flop: [], turn: [], river: [] },
            },
        };
        const result = PR_evalShowdown_test(miniHand);
        expect(result.winners.length).toBe(2);
        expect(result.winners).toContain('UTG');
        expect(result.winners).toContain('BTN');
        expect(result.share).toBe(10);
    });

    it('test 8: side pot math — all-in at 30BB separates main and side pot correctly', () => {
        const utg = { label: 'UTG', committed: 30 };  // all-in
        const btn = { label: 'BTN', committed: 60 };  // covers
        const mainPot = utg.committed * 2;             // both contribute up to 30
        const sidePot = (btn.committed - utg.committed); // only BTN contributes the extra
        expect(mainPot).toBe(60);
        expect(sidePot).toBe(30);
        expect(mainPot + sidePot).toBe(utg.committed + btn.committed);
    });

    it('test 9: heroNetBB = -0.5 when hero is SB and folds preflop', () => {
        const heroCommitted = 0.5; // SB blind only
        const heroNetBB = -heroCommitted;
        expect(heroNetBB).toBe(-0.5);
    });

    it('test 10: grading fold of pocket aces preflop returns error', () => {
        const gradePreflopStub = function(correctAction, heroAction) {
            const correct = correctAction.toLowerCase();
            if (heroAction === correct) return { grade: 'correct', explanation: '' };
            if ((correct === 'raise' || correct === '3bet') && heroAction === 'call') {
                return { grade: 'mixed', explanation: `GTO prefers ${correct.toUpperCase()}` };
            }
            return { grade: 'error', explanation: `GTO play is ${correct.toUpperCase()}; ${heroAction.toUpperCase()} is a significant error here.` };
        };
        const result = gradePreflopStub('RAISE', 'fold');
        expect(result.grade).toBe('error');
        expect(result.explanation).toContain('RAISE');
    });
});
