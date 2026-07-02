/**
 * tests/engine.test.js
 *
 * Tests run against PRODUCTION code loaded via tests/helpers/load-production.js
 * (ranges.js + engine.js + sim.js + poker-room.js executed in a node:vm context
 * with minimal browser stubs). Do NOT copy production functions into this file —
 * copies drift silently and mask bugs (a copied PR_evalShowdown with different
 * field names hid a production bug where showdown pots were never awarded).
 *
 * The one exception: computeCorrectAction below is an adapted copy that accepts
 * injected range tables, so its branch logic can be tested against small fixtures
 * instead of the full production range data. Branch logic is identical to
 * production; production computeCorrectAction is exercised with real ranges via
 * the Poker Room grading tests.
 *
 * Run: npm test
 */
import { describe, it, expect } from 'vitest';
import { loadProduction } from './helpers/load-production.js';

const PROD = loadProduction();

// Production globals under test
const { checkRangeHelper, buildSRKey, buildSpotKey } = PROD;

// ── computeCorrectAction — adapted for injection (branch logic identical) ────
// The production function reads from browser globals (rfiRanges, PF_PUSH, etc.)
// and state.stackBB. Here those are passed as a single `tables` argument so
// branch behavior can be pinned with small fixtures. Every branch is present
// and unmodified.
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
// Poker Room — production engine tests
// Every function below is the real one from poker-room.js (loaded via
// tests/helpers/load-production.js), running against the real range data.
// =============================================================================

const C = (rank, suit) => ({ rank, suit });
const cards2 = (r1, s1, r2, s2) => [C(r1, s1), C(r2, s2)];

function makeSeats(labels = PROD.PR_POSITIONS, stackBB = 100) {
    return labels.map(l => ({ label: l, type: 'GTO', name: l, stackBB }));
}

// Villain seat shape expected by PR_resolveVillainPreflopAction
function villainSeat(label, holeCards, handNotation) {
    return { label, holeCards, handNotation };
}

describe('Poker Room — Pass 1 Engine (production)', () => {

    it('test 1: 18 distinct cards dealt across 9 seats, no duplicates', () => {
        const prHand = PROD.PR_createHand({ heroPos: 'BTN', seats: makeSeats() });
        const allCards = [];
        prHand.seats.forEach(s => {
            if (!s) return;
            s.holeCards.forEach(c => allCards.push(c.rank + c.suit));
        });
        expect(allCards.length).toBe(18);
        expect(new Set(allCards).size).toBe(18);
    });

    it('test 2: hero seat is at its position with cards; all 9 seats dealt', () => {
        const prHand = PROD.PR_createHand({ heroPos: 'CO', seats: makeSeats() });
        const heroSeat = prHand.seats[prHand.heroSeatIndex];
        expect(heroSeat.isHero).toBe(true);
        expect(heroSeat.label).toBe('CO');
        const seatsWithCards = prHand.seats.filter(s => s && s.holeCards && s.holeCards.length === 2);
        expect(seatsWithCards.length).toBe(9);
    });

    it('test 3: dealing + preflop loop completes without error across 100 random hands', () => {
        const positions = ['UTG', 'BTN', 'SB', 'BB', 'CO', 'HJ'];
        for (let i = 0; i < 100; i++) {
            const heroPos = positions[i % positions.length];
            let prHand = PROD.PR_createHand({ heroPos, seats: makeSeats() });
            prHand = PROD.PR_runPreflopToHero(prHand);
            const cards = [];
            prHand.seats.forEach(s => { if (s) s.holeCards.forEach(c => cards.push(c.rank + c.suit)); });
            expect(new Set(cards).size).toBe(cards.length);
            expect(prHand.preflopContext).toBeTruthy();
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
                streetState: { street: 'preflop', betMadeThisStreet: true, actions: [], committedBB: { UTG: 0, BTN: 0, BB: 1 } },
            },
        };
        expect(PROD.PR_isStreetComplete(miniHand)).toBe(false);

        miniHand.gameState.streetState.actions = [
            { seatLabel: 'UTG', action: 'call',  sizingBB: 2.5 },
            { seatLabel: 'BTN', action: 'raise', sizingBB: 7.5 },
        ];
        expect(PROD.PR_isStreetComplete(miniHand)).toBe(false);

        miniHand.gameState.streetState.actions.push({ seatLabel: 'BB', action: 'call', sizingBB: 7.5 });
        expect(PROD.PR_isStreetComplete(miniHand)).toBe(false);

        miniHand.gameState.streetState.actions.push({ seatLabel: 'UTG', action: 'call', sizingBB: 5 });
        expect(PROD.PR_isStreetComplete(miniHand)).toBe(true);
    });

    it('test 5: PR_advanceStreet deals a 3-card flop disjoint from all hole cards', () => {
        const prHand = PROD.PR_createHand({ heroPos: 'BTN', seats: makeSeats() });
        const used = new Set();
        prHand.seats.forEach(s => { if (s) s.holeCards.forEach(c => used.add(c.rank + c.suit)); });
        const next = PROD.PR_advanceStreet(prHand);
        expect(next.gameState.board.length).toBe(3);
        next.gameState.board.forEach(c => expect(used.has(c.rank + c.suit)).toBe(false));
        expect(next.gameState.street).toBe('flop');
    });

    it('test 6: PR_evalBestHand ranks flush > straight > trips', () => {
        const flush = PROD.PR_evalBestHand(
            cards2('A', 'h', 'K', 'h'),
            [C('Q', 'h'), C('J', 'h'), C('9', 'h'), C('2', 'd'), C('3', 'c')]
        );
        const straight = PROD.PR_evalBestHand(
            cards2('A', 'h', '2', 'd'),
            [C('3', 'c'), C('4', 's'), C('5', 'h'), C('K', 'd'), C('7', 'c')]
        );
        const trips = PROD.PR_evalBestHand(
            cards2('A', 'h', 'A', 'd'),
            [C('A', 'c'), C('7', 's'), C('2', 'h'), C('9', 'd'), C('3', 'c')]
        );
        expect(flush.rank).toBeGreaterThan(straight.rank);
        expect(straight.rank).toBeGreaterThan(trips.rank);
        expect(flush.label).toBe('FLUSH');
        expect(straight.label).toBe('STRAIGHT');
        expect(trips.label).toBe('TRIPS');
    });

    it('test 7: split pot when the board plays for both players', () => {
        const board = [C('A', 'h'), C('K', 'd'), C('Q', 'c'), C('J', 's'), C('T', 'h')];
        const prHand = {
            seats: [
                { label: 'UTG', isHero: false, folded: false, allIn: false, stackBB: 90,
                  holeCards: cards2('A', 'c', '2', 'd') },
                null, null, null, null, null,
                { label: 'BTN', isHero: true, folded: false, allIn: false, stackBB: 90,
                  holeCards: cards2('A', 'd', '3', 'c') },
                null, null,
            ],
            heroSeatIndex: 6,
            gameState: {
                potBB: 20, board, street: 'river',
                streetState: { street: 'river', betMadeThisStreet: false, actions: [], committedBB: { UTG: 0, BTN: 0 } },
                streetHistory: {
                    preflop: [
                        { seatLabel: 'UTG', action: 'bet',  sizingBB: 10 },
                        { seatLabel: 'BTN', action: 'call', sizingBB: 10 },
                    ],
                    flop: [], turn: [], river: [],
                },
            },
        };
        PROD.PR_evalShowdown(prHand);
        const pot = prHand.outcome.pots[0];
        expect(pot.amount).toBe(20);
        expect(pot.winners).toContain('UTG');
        expect(pot.winners).toContain('BTN');
        expect(pot.share).toBe(10);
        expect(prHand.outcome.heroNetBB).toBe(0); // paid 10, got 10 back
    });

    it('test 8: side pots — all-in at 30BB wins only the main pot', () => {
        const board = [C('A', 'c'), C('7', 's'), C('2', 'h'), C('9', 'd'), C('3', 'c')];
        const prHand = {
            seats: [
                { label: 'UTG', isHero: false, folded: false, allIn: true, stackBB: 0,
                  holeCards: cards2('A', 's', 'A', 'h') },   // trips aces — best hand
                null, null, null, null, null,
                { label: 'BTN', isHero: true, folded: false, allIn: false, stackBB: 40,
                  holeCards: cards2('K', 's', 'K', 'h') },   // pair of kings
                null, null,
            ],
            heroSeatIndex: 6,
            gameState: {
                potBB: 90, board, street: 'river',
                streetState: { street: 'river', betMadeThisStreet: false, actions: [], committedBB: { BTN: 0 } },
                streetHistory: {
                    preflop: [
                        { seatLabel: 'UTG', action: 'raise', sizingBB: 30 },
                        { seatLabel: 'BTN', action: 'raise', sizingBB: 60 },
                    ],
                    flop: [], turn: [], river: [],
                },
            },
        };
        PROD.PR_evalShowdown(prHand);
        const pots = prHand.outcome.pots;
        expect(pots.length).toBe(2);
        expect(pots[0].amount).toBe(60);            // main pot: 30 matched by both
        expect(pots[0].winners).toEqual(['UTG']);   // trips beat the pair
        expect(pots[1].amount).toBe(30);            // side pot: BTN's unmatched 30
        expect(pots[1].winners).toEqual(['BTN']);   // returned to BTN
        expect(prHand.outcome.heroNetBB).toBe(-30); // paid 60, got side 30 back
    });

    it('test 9: heroNetBB = -0.5 when hero is SB and folds preflop (full engine path)', () => {
        let prHand = PROD.PR_createHand({ heroPos: 'SB', seats: makeSeats(['SB', 'BB']) });
        prHand = PROD.PR_runPreflopToHero(prHand);
        const done = PROD.PR_applyHeroAction(prHand, 'fold', 0);
        expect(done.terminal).toBe(true);
        expect(done.outcome).toBeTruthy();
        expect(done.outcome.winner).toBe('BB');
        expect(done.outcome.heroNetBB).toBe(-0.5);
    });

    it('test 10: grading fold of pocket aces preflop returns error (real ranges)', () => {
        let prHand = PROD.PR_createHand({ heroPos: 'UTG', seats: makeSeats() });
        // Force hero's hand to AA (grading reads handNotation; duplicates elsewhere don't affect it)
        const heroSeat = prHand.seats[prHand.heroSeatIndex];
        heroSeat.holeCards = cards2('A', 's', 'A', 'h');
        heroSeat.handNotation = 'AA';
        prHand = PROD.PR_runPreflopToHero(prHand);
        const done = PROD.PR_applyHeroAction(prHand, 'fold', 0);
        expect(done.heroGrades.length).toBe(1);
        expect(done.heroGrades[0].grade).toBe('error');
        expect(done.heroGrades[0].explanation).toContain('RAISE');
    });
});

// =============================================================================
// Poker Room — showdown awarding & chip conservation (production)
// These invariants would have caught the shipped bug where PR_evalShowdown
// never awarded a pot (seat label clobbered by hand label via object spread).
// =============================================================================

describe('Poker Room — showdown awarding & chip conservation', () => {

    it('showdown awards the pot to the better hand', () => {
        const board = [C('K', 's'), C('9', 'h'), C('4', 'c'), C('J', 'd'), C('3', 's')];
        const prHand = {
            seats: [
                { label: 'UTG', isHero: false, folded: false, allIn: false, stackBB: 97.5,
                  holeCards: cards2('A', 's', 'A', 'h') },   // pair of aces
                null, null, null, null, null,
                { label: 'BTN', isHero: true, folded: false, allIn: false, stackBB: 97.5,
                  holeCards: cards2('7', 'c', '2', 'd') },   // high card
                null, null,
            ],
            heroSeatIndex: 6,
            gameState: {
                potBB: 5, board, street: 'river',
                streetState: { street: 'river', betMadeThisStreet: false, actions: [], committedBB: { UTG: 0, BTN: 0 } },
                streetHistory: {
                    preflop: [
                        { seatLabel: 'UTG', action: 'raise', sizingBB: 2.5 },
                        { seatLabel: 'BTN', action: 'call',  sizingBB: 2.5 },
                    ],
                    flop: [], turn: [], river: [],
                },
            },
        };
        PROD.PR_evalShowdown(prHand);
        expect(prHand.outcome.pots[0].winners).toEqual(['UTG']);
        expect(prHand.outcome.pots[0].amount).toBe(5);
        expect(prHand.outcome.heroNetBB).toBe(-2.5);
        // showdown entries carry distinct seat + hand labels
        const utgShow = prHand.outcome.showdown.find(e => e.seatLabel === 'UTG');
        expect(utgShow).toBeTruthy();
        expect(utgShow.handLabel).toBe('PAIR');
        expect(utgShow.show).toBe(true); // winner + last aggressor must show
    });

    it('property: chips are conserved across 300 random full hands', () => {
        const types = ['GTO', 'NIT', 'TAG', 'LAG', 'FISH', 'MANIAC', 'AGGRO'];
        const positions = PROD.PR_POSITIONS;

        for (let n = 0; n < 300; n++) {
            const heroPos = positions[n % positions.length];
            const seatCfgs = positions.map(l => ({
                label: l,
                type: types[Math.floor(Math.random() * types.length)],
                name: l,
                stackBB: 40 + Math.floor(Math.random() * 80),
            }));
            const startStacks = {};
            seatCfgs.forEach(c => { startStacks[c.label] = c.label === heroPos ? 100 : c.stackBB; });

            let hr = PROD.PR_createHand({ heroPos, seats: seatCfgs, heroStackBB: 100 });
            hr = PROD.PR_runPreflopToHero(hr);

            // Random hero preflop action
            const pre = ['fold', 'call', 'raise'][Math.floor(Math.random() * 3)];
            hr = PROD.PR_applyHeroAction(hr, pre, pre === 'raise' ? 7.5 : 0);

            // Drive the hand to completion
            let guard = 0;
            while (!hr.terminal && guard++ < 500) {
                if (PROD.PR_isStreetComplete(hr)) {
                    hr = PROD.PR_advanceStreet(hr);
                    continue;
                }
                const next = PROD._PR_nextActor(hr);
                if (next === null) { hr = PROD.PR_advanceStreet(hr); continue; }
                const heroLabel = hr.seats[hr.heroSeatIndex].label;
                if (next === heroLabel) {
                    const facing = PROD._PR_facingAmount(hr, heroLabel);
                    const opts = facing > 0 ? ['fold', 'call'] : ['check', 'bet'];
                    const act = opts[Math.floor(Math.random() * opts.length)];
                    hr = PROD.PR_applyHeroAction(hr, act, act === 'bet' ? 3 : 0);
                } else {
                    hr = PROD.PR_applyVillainAction(hr);
                }
            }
            expect(guard).toBeLessThan(500);
            expect(hr.terminal).toBe(true);
            expect(hr.outcome).toBeTruthy();

            const tc = hr.outcome.totalCommitted;

            // Invariant 1: no seat's stack went negative
            hr.seats.forEach(s => { if (s) expect(s.stackBB).toBeGreaterThanOrEqual(0); });

            // Invariant 2: every chip that left a stack is accounted for in totalCommitted
            hr.seats.forEach(s => {
                if (!s) return;
                const spent = startStacks[s.label] - s.stackBB;
                expect(Math.abs(spent - (tc[s.label] || 0))).toBeLessThan(0.05);
            });

            // Invariant 3: the pots exactly redistribute what was committed
            const committedSum = Object.values(tc).reduce((a, v) => a + v, 0);
            const potSum = hr.outcome.pots.reduce((a, p) => a + p.amount, 0);
            expect(Math.abs(potSum - committedSum)).toBeLessThan(0.05);

            // Invariant 4: every non-empty pot has at least one winner
            hr.outcome.pots.forEach(p => {
                if (p.amount > 0) expect(p.winners.length).toBeGreaterThan(0);
            });

            // Invariant 5: hero net is coherent
            expect(Number.isFinite(hr.outcome.heroNetBB)).toBe(true);
            const heroLabel = hr.seats[hr.heroSeatIndex].label;
            expect(hr.outcome.heroNetBB).toBeGreaterThanOrEqual(-(tc[heroLabel] || 0) - 0.05);
        }
    });
});

// =============================================================================
// Poker Room — Pass 2 Archetypes (production, real range data)
// GTO baselines asserted here were verified against the shipped ranges:
//   22 @ BTN RFI = raise · KQs BTN vs UTG open = call · T7o BTN vs UTG = fold
//   A5s BB vs BTN open = 3bet
// =============================================================================

describe('Poker Room — Pass 2 Archetypes (production)', () => {

    const RFI_TS = () => ({ opener: null, threeBettor: null, callers: [], limpers: [], openSizeBB: 2.5 });
    const VS_OPEN_TS = (opener) => ({ opener, threeBettor: null, callers: [], limpers: [], openSizeBB: 2.5 });
    const VS_3BET_TS = () => ({ opener: 'UTG', threeBettor: 'CO', callers: [], limpers: [], openSizeBB: 2.5 });

    it('test 1: AA scores 98, 22 scores 50 (pair formula)', () => {
        expect(PROD._PR_handStrengthScore(cards2('A', 's', 'A', 'h'))).toBe(98);
        expect(PROD._PR_handStrengthScore(cards2('2', 's', '2', 'h'))).toBe(50);
    });

    it('test 2: suitedness raises the score (AKs > AKo, T9s > T9o)', () => {
        expect(PROD._PR_handStrengthScore(cards2('A', 's', 'K', 's')))
            .toBeGreaterThan(PROD._PR_handStrengthScore(cards2('A', 's', 'K', 'h')));
        expect(PROD._PR_handStrengthScore(cards2('T', 's', '9', 's')))
            .toBeGreaterThan(PROD._PR_handStrengthScore(cards2('T', 's', '9', 'h')));
    });

    it('test 3: NIT opens KK but folds 22 (both GTO opens at BTN)', () => {
        const kk = PROD.PR_resolveVillainPreflopAction(
            villainSeat('BTN', cards2('K', 's', 'K', 'h'), 'KK'), RFI_TS(), 'NIT');
        const deuces = PROD.PR_resolveVillainPreflopAction(
            villainSeat('BTN', cards2('2', 's', '2', 'h'), '22'), RFI_TS(), 'NIT');
        expect(kk.action).toBe('raise');
        expect(deuces.action).toBe('fold');
    });

    it('test 4: FISH loose-calls a GTO-fold hand (T7o vs UTG open)', () => {
        const score = PROD._PR_handStrengthScore(cards2('T', 's', '7', 'h'));
        expect(score).toBeGreaterThanOrEqual(38); // ≥ FISH looseCallThreshold
        const result = PROD.PR_resolveVillainPreflopAction(
            villainSeat('BTN', cards2('T', 's', '7', 'h'), 'T7o'), VS_OPEN_TS('UTG'), 'FISH');
        expect(result.action).toBe('call');
    });

    it('test 5: MANIAC converts a GTO-call into a 3-bet (KQs vs UTG open)', () => {
        const score = PROD._PR_handStrengthScore(cards2('K', 's', 'Q', 's'));
        expect(score).toBeGreaterThanOrEqual(52); // ≥ MANIAC extraThreeBetThreshold
        const result = PROD.PR_resolveVillainPreflopAction(
            villainSeat('BTN', cards2('K', 's', 'Q', 's'), 'KQs'), VS_OPEN_TS('UTG'), 'MANIAC');
        expect(result.action).toBe('3bet');
    });

    it('test 6: NIT folds 22 vs a 3-bet (score 50 < callVs3BetThreshold 88)', () => {
        const result = PROD.PR_resolveVillainPreflopAction(
            villainSeat('BTN', cards2('2', 's', '2', 'h'), '22'), VS_3BET_TS(), 'NIT');
        expect(result.action).toBe('fold');
    });

    it('test 7: all archetypes 4-bet AA vs a 3-bet', () => {
        for (const type of ['NIT', 'TAG', 'LAG', 'FISH', 'MANIAC', 'AGGRO']) {
            const result = PROD.PR_resolveVillainPreflopAction(
                villainSeat('BTN', cards2('A', 's', 'A', 'h'), 'AA'), VS_3BET_TS(), type);
            expect(result.action).toBe('4bet');
        }
    });

    it('test 8: FISH calls a 3-bet with 66 (score 66 in [45, 97))', () => {
        const result = PROD.PR_resolveVillainPreflopAction(
            villainSeat('BTN', cards2('6', 's', '6', 'h'), '66'), VS_3BET_TS(), 'FISH');
        expect(result.action).toBe('call');
    });

    it('test 9: NIT downgrades a GTO 3-bet bluff to a call (A5s BB vs BTN open)', () => {
        const score = PROD._PR_handStrengthScore(cards2('A', 's', '5', 's'));
        expect(score).toBeGreaterThanOrEqual(60); // ≥ NIT callThreshold
        expect(score).toBeLessThan(82);           // < NIT threeBetThreshold
        const result = PROD.PR_resolveVillainPreflopAction(
            villainSeat('BB', cards2('A', 's', '5', 's'), 'A5s'), VS_OPEN_TS('BTN'), 'NIT');
        expect(result.action).toBe('call');
    });

    it('test 10: GTO type is a pure passthrough of the GTO baseline (AA RFI = raise)', () => {
        const result = PROD.PR_resolveVillainPreflopAction(
            villainSeat('BTN', cards2('A', 's', 'A', 'h'), 'AA'), RFI_TS(), 'GTO');
        expect(result.action).toBe('raise');
    });
});
