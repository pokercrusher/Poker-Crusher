// sim.js — HandRun state machine (Pass 3: River, lane expansion, BB defense, CO/SB lanes)
// Depends on: ranges.js (generatePostflopSpot, generateTurnCBetSpot, generateTurnDefendSpot,
//   generateDelayedTurnSpot, generateRiverCBetSpot, generateRiverDefendSpot,
//   generateRiverDelayedCBetSpot, generateRiverTurnCheckCBetSpot, generateRiverProbeSpot,
//   facingRfiRanges, RANKS)
//   engine.js (computeCorrectAction)
//   ui.js globals (getOpenSizeBB, getBigBlind$, getOpenSize$, get3betSize$, getSRPPot$, formatAmt)
// EXTENSION Pass 4: bankroll, session mode, career stats → sim_session.js

'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIM_SUPPORTED_LANES = [
    'BTN_vs_BB_SRP',
    'BB_vs_BTN_SRP',
    'CO_vs_BB_SRP',
    'SB_vs_BB_SRP',
    'HJ_vs_BB_SRP',
    'LJ_vs_BB_SRP',
    'UTG_vs_BB_SRP',
    'UTG1_vs_BB_SRP',
    'UTG2_vs_BB_SRP',
    'FULL_TABLE'
];

// Maps lane → preflopFamily key used by getSRPPot$ and postflop generators
const LANE_FAMILY = {
    'BTN_vs_BB_SRP':  'BTN_vs_BB',
    'BB_vs_BTN_SRP':  'BTN_vs_BB',
    'CO_vs_BB_SRP':   'CO_vs_BB',
    'SB_vs_BB_SRP':   'SB_vs_BB',
    'HJ_vs_BB_SRP':   'HJ_vs_BB',
    'LJ_vs_BB_SRP':   'LJ_vs_BB',
    'UTG_vs_BB_SRP':  'UTG_vs_BB',
    'UTG1_vs_BB_SRP': 'UTG_vs_BB',  // proxy: no distinct UTG1 postflop family
    'UTG2_vs_BB_SRP': 'LJ_vs_BB'    // proxy: UTG2 opens similar to LJ
};

// Maps lane → familyFilter array passed to all postflop generators
const LANE_POSTFLOP_FAMILY = {
    'BTN_vs_BB_SRP':  ['BTN_vs_BB'],
    'BB_vs_BTN_SRP':  ['BTN_vs_BB'],
    'CO_vs_BB_SRP':   ['CO_vs_BB'],
    'SB_vs_BB_SRP':   ['SB_vs_BB'],
    'HJ_vs_BB_SRP':   ['HJ_vs_BB'],
    'LJ_vs_BB_SRP':   ['LJ_vs_BB'],
    'UTG_vs_BB_SRP':  ['UTG_vs_BB'],
    'UTG1_vs_BB_SRP': ['UTG_vs_BB'],
    'UTG2_vs_BB_SRP': ['LJ_vs_BB']
};

const _SIM_SUITS = ['c', 'd', 'h', 's'];

// Open-raise frequency by position (approximate GTO baseline for full-table simulation)
const RFI_FREQ = { UTG:0.14, UTG1:0.15, UTG2:0.16, LJ:0.18, HJ:0.22, CO:0.28, BTN:0.45, SB:0.42 };
// Seat order for full-table preflop action loop (UTG first, BB last)
const FULL_TABLE_POSITIONS = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB','BB'];

// Rule of 4/2 outs map — draw categories from spot.heroDraws.primary
const OUTS_MAP = {
    'flush-draw': 9,
    'oesd': 8,
    'double-gutshot': 8,
    'gutshot': 4,
    'combo-flush-oesd': 15,
    'combo-flush-gutshot': 12,
    'straight-flush-draw': 15,
    'pair-plus-flush-draw': 14,
    'pair-plus-gutshot': 10,
    'pair-plus-oesd': 10,
    'backdoor-flush-draw': 2,
    'underpair': 2,
    'no-draw': 0
};

const MADE_HAND_EQUITY = {
    'SET': 90, 'TWO_PAIR_PLUS': 80,
    'OVERPAIR': 70, 'TOP_PAIR': 57,
    'SECOND_PAIR': 42, 'THIRD_PAIR': 32,
    'UNDERPAIR': 28, 'AIR': 15, 'OVERCARDS': 22
};

// ---------------------------------------------------------------------------
// Pass 3.5b — Sizing bucket lookup table
// [texture][spr][handStrength] → 'small' | 'medium' | 'large'
// ---------------------------------------------------------------------------

const SIZING_BUCKET_TABLE = {
    dry: {
        low:  { nut_value:'small',  nutted:'small',  strong:'small',  medium:'small',  thin:'small',  weak:'small',  semi_bluff:'small'  },
        mid:  { nut_value:'medium', nutted:'medium', strong:'small',  medium:'small',  thin:'small',  weak:'small',  semi_bluff:'medium' },
        high: { nut_value:'large',  nutted:'medium', strong:'medium', medium:'small',  thin:'small',  weak:'medium', semi_bluff:'medium' }
    },
    dynamic: {
        low:  { nut_value:'medium', nutted:'medium', strong:'medium', medium:'small',  thin:'small',  weak:'small',  semi_bluff:'medium' },
        mid:  { nut_value:'large',  nutted:'large',  strong:'large',  medium:'medium', thin:'small',  weak:'medium', semi_bluff:'large'  },
        high: { nut_value:'large',  nutted:'large',  strong:'large',  medium:'medium', thin:'medium', weak:'medium', semi_bluff:'large'  }
    },
    paired: {
        low:  { nut_value:'small',  nutted:'small',  strong:'small',  medium:'small',  thin:'small',  weak:'small',  semi_bluff:'small'  },
        mid:  { nut_value:'medium', nutted:'medium', strong:'small',  medium:'small',  thin:'small',  weak:'small',  semi_bluff:'small'  },
        high: { nut_value:'medium', nutted:'medium', strong:'medium', medium:'small',  thin:'small',  weak:'medium', semi_bluff:'small'  }
    },
    monotone: {
        low:  { nut_value:'large',  nutted:'large',  strong:'medium', medium:'small',  thin:'small',  weak:'medium', semi_bluff:'large'  },
        mid:  { nut_value:'large',  nutted:'large',  strong:'large',  medium:'medium', thin:'small',  weak:'medium', semi_bluff:'large'  },
        high: { nut_value:'large',  nutted:'large',  strong:'large',  medium:'medium', thin:'medium', weak:'medium', semi_bluff:'large'  }
    }
};

// Flop hand class → strength bucket (coarse — TWO_PAIR_PLUS covers 2P through quads)
// TODO: classifier-alignment pass — split TWO_PAIR_PLUS into FLUSH/STRAIGHT/FULL_HOUSE/QUADS
const _FLOP_HAND_BUCKETS = {
    SET:'nutted', TWO_PAIR_PLUS:'nutted',
    OVERPAIR:'strong',
    TOP_PAIR:'medium',
    SECOND_PAIR:'thin',
    THIRD_PAIR:'weak', UNDERPAIR:'weak', AIR:'weak', OVERCARDS:'weak', ACE_HIGH_BACKDOOR:'weak',
    FD:'semi_bluff', COMBO_DRAW:'semi_bluff'
};

// Turn/river hand class → strength bucket (fine-grained)
const _TURN_HAND_BUCKETS = {
    STRAIGHT_FLUSH:'nut_value', QUADS:'nut_value', FULL_HOUSE:'nut_value', FLUSH:'nut_value', STRAIGHT:'nut_value',
    SET:'nutted', TWO_PAIR:'nutted', TRIPS:'nutted',
    OVERPAIR:'strong', BOARD_TRIPS:'strong',
    TOP_PAIR:'medium',
    SECOND_PAIR:'thin', THIRD_PAIR:'thin',
    UNDERPAIR:'weak', AIR:'weak', OVERCARDS:'weak', ACE_HIGH:'weak', GUTSHOT:'weak',
    COMBO_DRAW:'semi_bluff', STRONG_DRAW:'semi_bluff', OESD:'semi_bluff', FD:'semi_bluff'
};

function _simTextureBucket(archetype) {
    if (!archetype) return 'dry';
    if (archetype === 'MONOTONE') return 'monotone';
    if (archetype === 'PAIRED_HIGH' || archetype === 'PAIRED_LOW' || archetype === 'TRIPS') return 'paired';
    if (archetype === 'A_HIGH_DYNAMIC' || archetype === 'BROADWAY_DYNAMIC' ||
        archetype === 'MID_CONNECTED'  || archetype === 'LOW_CONNECTED') return 'dynamic';
    return 'dry';
}

function _simSprBucket(spr) {
    if (!spr || spr <= 3) return 'low';
    if (spr <= 8) return 'mid';
    return 'high';
}

function _simHandStrengthBucket(heroHandClass, street) {
    if (!heroHandClass) return 'medium';
    const map = (street === 'flop') ? _FLOP_HAND_BUCKETS : _TURN_HAND_BUCKETS;
    return map[heroHandClass] || 'medium';
}

function resolveCorrectSizingBucket(spot, spr, street) {
    if (!spot) return 'medium';
    const archetype = spot.boardArchetype || spot.turnFamily || null;
    const texture = _simTextureBucket(archetype);
    const sprBucket = _simSprBucket(spr);
    const handBucket = _simHandStrengthBucket(spot.heroHandClass, street || 'flop');
    const row = SIZING_BUCKET_TABLE[texture] && SIZING_BUCKET_TABLE[texture][sprBucket];
    return (row && row[handBucket]) ? row[handBucket] : 'medium';
}

// Line description verbs for getHandSummary lineAssessment
const _LINE_VERBS = {
    preflop: { raise: 'raised preflop', fold: 'folded preflop', call: 'called preflop' },
    flop:    { bet: 'c-bet flop', check: 'checked flop', call: 'called flop bet', fold: 'folded flop', raise: 'raised flop' },
    turn:    { bet: 'barreled turn', check: 'checked turn', call: 'called turn bet', fold: 'folded turn', raise: 'raised turn' },
    river:   { bet: 'bet river', check: 'checked river', call: 'called river bet', fold: 'folded river', raise: 'raised river' }
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _freshDeck() {
    const deck = [];
    for (const r of RANKS) {
        for (const s of _SIM_SUITS) {
            deck.push(r + s);
        }
    }
    return deck;
}

function _shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function _dealHeroCards() {
    const deck = _shuffle(_freshDeck());
    return [deck[0], deck[1]];
}

// Deal `count` board cards from a real deck, excluding hero hole cards and existing board.
// Returns {rank, suit}[] — never touches gameState.board directly.
function _dealBoardCards(handRun, count) {
    const heroSeat = handRun.seats[handRun.heroSeatIndex];
    const exclude = new Set();
    if (heroSeat && heroSeat.holeCards) {
        for (const c of heroSeat.holeCards) exclude.add(c); // strings like 'Ac'
    }
    const board = handRun.gameState && handRun.gameState.board;
    if (board) {
        for (const c of board) {
            exclude.add(typeof c === 'string' ? c : c.rank + c.suit);
        }
    }
    const deck = _freshDeck().filter(c => !exclude.has(c));
    const shuffled = _shuffle(deck);
    return shuffled.slice(0, count).map(c => ({ rank: c[0], suit: c[1] }));
}

// Convert hole cards ['Ah','Kd'] → hand notation 'AKs'/'AKo'/'AA'
function _cardsToHandNotation(cards) {
    const [c1, c2] = cards;
    const r1 = c1[0], s1 = c1[1];
    const r2 = c2[0], s2 = c2[1];
    const ri1 = RANKS.indexOf(r1), ri2 = RANKS.indexOf(r2);
    if (r1 === r2) return r1 + r2;
    if (ri1 < ri2) return r1 + r2 + (s1 === s2 ? 's' : 'o');
    return r2 + r1 + (s1 === s2 ? 's' : 'o');
}

// Count approximate combos in a range token array
function _roughCombosInRange(rangeArray) {
    if (!rangeArray || rangeArray.length === 0) return 0;
    let count = 0;
    for (const token of rangeArray) {
        const r1 = RANKS.indexOf(token[0]);
        const r2 = RANKS.indexOf(token[1]);
        const isPair = token[0] === token[1];
        const isSuited = token.includes('s');
        const isOffsuit = token.includes('o');
        const isPlus = token.endsWith('+');
        const dashIdx = token.indexOf('-');
        const isDash = dashIdx !== -1;
        if (isPair) {
            if (isPlus) count += (r1 + 1) * 6;
            else if (isDash) count += (RANKS.indexOf(token[dashIdx + 1]) - r1 + 1) * 6;
            else count += 6;
        } else if (isSuited) {
            if (isPlus) count += (r2 - r1) * 4;
            else if (isDash) count += (RANKS.indexOf(token[dashIdx + 2]) - r2 + 1) * 4;
            else count += 4;
        } else if (isOffsuit) {
            count += isPlus ? (r2 - r1) * 12 : 12;
        } else {
            count += 16;
        }
    }
    return count;
}

function _deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Build committedBB dynamically from active (non-folded) seats — never hardcode per spec
function _buildCommittedBB(seats) {
    return Object.fromEntries(
        seats.filter(s => s !== null && !s.folded)
             .map(s => [s.label, 0])
    );
}

// ---------------------------------------------------------------------------
// _runPreflopTableLoop — Phase 1 full-table preflop simulation
// Simulates villain actions for all seats before hero, then collapses to 2-player.
// Sets hr.lane to a derived 2-player lane for postflop engine compatibility.
// Sets hr.preflopContext for UI display of table action summary.
// ---------------------------------------------------------------------------
function _runPreflopTableLoop(hr) {
    var heroPos = hr.seats[hr.heroSeatIndex].label;
    var heroOrderIdx = FULL_TABLE_POSITIONS.indexOf(heroPos);
    var ss = hr.gameState.streetState;
    var openSizeBB = (typeof getOpenSizeBB === 'function') ? getOpenSizeBB() : 2.5;
    var opener = null; // label of first raiser before hero

    // Simulate each seat that acts before hero in position order
    for (var i = 0; i < heroOrderIdx; i++) {
        var seat = hr.seats[i];
        if (!seat) continue;
        if (opener === null) {
            // No open yet: fold or open based on RFI frequency
            if (Math.random() < (RFI_FREQ[seat.label] || 0.15)) {
                opener = seat.label;
                ss.actions.push({ seatLabel: seat.label, action: 'raise', sizingBB: openSizeBB });
                ss.betMadeThisStreet = true;
                seat.stackBB = parseFloat((seat.stackBB - openSizeBB).toFixed(2));
            } else {
                ss.actions.push({ seatLabel: seat.label, action: 'fold', sizingBB: 0 });
                seat.folded = true;
            }
        } else {
            // Facing open: fold or occasionally call (3-bets excluded Phase 1 for clarity)
            var rangeKey = seat.label + '_vs_' + opener;
            var rangeData = (typeof facingRfiRanges !== 'undefined') ? facingRfiRanges[rangeKey] : null;
            var callProb = 0.07;
            if (rangeData) {
                var callCombos = _roughCombosInRange(rangeData['Call'] || []);
                callProb = callCombos / (callCombos + 1100); // ~1100 fold-equivalent combos
            }
            if (Math.random() < callProb) {
                ss.actions.push({ seatLabel: seat.label, action: 'call', sizingBB: openSizeBB });
                seat.stackBB = parseFloat((seat.stackBB - openSizeBB).toFixed(2));
            } else {
                ss.actions.push({ seatLabel: seat.label, action: 'fold', sizingBB: 0 });
                seat.folded = true;
            }
        }
    }

    // Capture table context for UI display before collapsing to 2-player
    hr.preflopContext = {
        heroPos: heroPos,
        opener: opener,
        tableActions: ss.actions.map(function(a) { return { seatLabel: a.seatLabel, action: a.action }; })
    };

    // The one villain hero plays against:
    //   nobody opened → villain is BB (BB will respond to hero's open)
    //   someone opened → villain is the opener (hero faces their raise)
    var villainLabel = (opener === null) ? 'BB' : opener;

    // Null out all seats except hero and designated villain → 2-player from here
    hr.seats = hr.seats.map(function(seat) {
        if (seat === null) return null;
        if (seat.isHero) return seat;
        if (seat.label === villainLabel) return seat;
        return null;
    });

    // Derive lane for postflop engine (all downstream functions key off hr.lane)
    if (opener === null) {
        // Hero is first to open: heroPos_vs_BB_SRP
        var openDerived = heroPos + '_vs_BB_SRP';
        hr.lane = SIM_SUPPORTED_LANES.includes(openDerived) ? openDerived : 'BTN_vs_BB_SRP';
    } else if (heroPos === 'BB') {
        // BB defending: standard OOP proxy
        hr.lane = 'BB_vs_BTN_SRP';
    } else {
        // Non-BB hero facing open: heroPos_vs_BB_SRP proxy (hero is IP relative to opener)
        var defDerived = heroPos + '_vs_BB_SRP';
        hr.lane = SIM_SUPPORTED_LANES.includes(defDerived) ? defDerived : 'BTN_vs_BB_SRP';
    }

    // Rebuild committedBB for the two remaining active seats
    ss.committedBB = _buildCommittedBB(hr.seats);
    // Restore opener's committed amount and stack so sizing logic is correct
    if (opener !== null) {
        ss.committedBB[opener] = openSizeBB;
        var openerSeat = hr.seats.find(function(s) { return s && s.label === opener; });
        if (openerSeat) openerSeat.stackBB = parseFloat((100 - openSizeBB).toFixed(2));
    }
}

// Street is complete when all active players have resolved per spec Part 5
function _isStreetComplete(hr) {
    const ss = hr.gameState.streetState;
    const activeSeats = hr.seats.filter(s => s !== null && !s.folded && !s.allIn);

    if (!ss.betMadeThisStreet) {
        // No bet: all active players must have checked
        return activeSeats.every(s =>
            ss.actions.some(a => a.seatLabel === s.label && a.action === 'check')
        );
    }

    // Bet/raise made: find last aggressor; all others must have called after
    let lastAggrIdx = -1;
    for (let i = ss.actions.length - 1; i >= 0; i--) {
        const act = ss.actions[i].action;
        if (act === 'bet' || act === 'raise' || act === '3bet' || act === '4bet') { lastAggrIdx = i; break; }
    }
    if (lastAggrIdx === -1) return false;
    const aggrLabel = ss.actions[lastAggrIdx].seatLabel;
    const actionsAfter = ss.actions.slice(lastAggrIdx + 1);
    return activeSeats
        .filter(s => s.label !== aggrLabel)
        .every(s => actionsAfter.some(a => a.seatLabel === s.label && (a.action === 'call' || a.action === 'fold')));
}

// ---------------------------------------------------------------------------
// _heroIsIP — single source of truth for postflop action order
// ---------------------------------------------------------------------------

function _heroIsIP(handRun) {
    // IP lanes: hero is opener and acts last postflop
    // SB_vs_BB_SRP and BB_vs_BTN_SRP are OOP — excluded intentionally
    return ['BTN_vs_BB_SRP', 'CO_vs_BB_SRP', 'HJ_vs_BB_SRP', 'LJ_vs_BB_SRP',
            'UTG_vs_BB_SRP', 'UTG1_vs_BB_SRP', 'UTG2_vs_BB_SRP'].includes(handRun.lane);
}

// ---------------------------------------------------------------------------
// _simResolveTurnGenerator — reads flop streetHistory to pick turn generator
// ---------------------------------------------------------------------------

function _simResolveTurnGenerator(gameState, heroLabel, villainLabel) {
    const flopActions = gameState.streetHistory.flop || [];
    const heroBetFlop = flopActions.some(a => a.seatLabel === heroLabel && a.action === 'bet');
    const heroCheckFlop = !heroBetFlop;
    const villainBetFlop = flopActions.some(a => a.seatLabel === villainLabel && a.action === 'bet');

    if (heroBetFlop && flopActions.some(a => a.seatLabel === villainLabel && a.action === 'call')) {
        return 'generateTurnCBetSpot';      // PFR bet flop, called — barreling
    }
    if (heroCheckFlop && !villainBetFlop) {
        return 'generateDelayedTurnSpot';   // both checked flop — delayed c-bet / OOP probe
    }
    if (villainBetFlop && flopActions.some(a => a.seatLabel === heroLabel && a.action === 'call')) {
        return 'generateTurnDefendSpot';    // villain bet flop, hero called — defending
    }
    return 'generateTurnCBetSpot';          // fallback
}

// ---------------------------------------------------------------------------
// _simResolveRiverGenerator — reads flop+turn streetHistory to pick river generator
// ---------------------------------------------------------------------------

function _simResolveRiverGenerator(gameState, heroLabel, villainLabel) {
    const flopActions = gameState.streetHistory.flop || [];
    const turnActions = gameState.streetHistory.turn || [];

    const heroBetFlop  = flopActions.some(a => a.seatLabel === heroLabel  && a.action === 'bet');
    const heroBetTurn  = turnActions.some(a => a.seatLabel === heroLabel  && a.action === 'bet');
    const villainBetFlop = flopActions.some(a => a.seatLabel === villainLabel && a.action === 'bet');
    const villainBetTurn = turnActions.some(a => a.seatLabel === villainLabel && a.action === 'bet');
    const heroCheckFlop = !heroBetFlop;
    const heroCheckTurn = !heroBetTurn;

    // PFR bet flop + bet turn → river barrel
    if (heroBetFlop && heroBetTurn) return 'generateRiverCBetSpot';

    // PFR bet flop + checked turn (villain didn't bet either) → river turn-check c-bet
    if (heroBetFlop && heroCheckTurn && !villainBetTurn) return 'generateRiverTurnCheckCBetSpot';

    // Both checked flop + PFR bet turn → river barrel after delayed
    if (heroCheckFlop && !villainBetFlop && heroBetTurn) return 'generateRiverDelayedCBetSpot';

    // Villain bet flop, hero called → river defend
    if (villainBetFlop && !heroBetFlop) return 'generateRiverDefendSpot';

    // Villain bet turn, hero called → river defend
    if (villainBetTurn && !heroBetTurn) return 'generateRiverDefendSpot';

    // Both checked flop + both checked turn → river probe
    if (heroCheckFlop && !villainBetFlop && heroCheckTurn && !villainBetTurn) {
        return 'generateRiverProbeSpot';
    }

    return 'generateRiverCBetSpot'; // fallback
}

// ---------------------------------------------------------------------------
// getPlayerLine
// ---------------------------------------------------------------------------

function getPlayerLine(handRun, seatLabel) {
    const history = handRun.gameState.streetHistory;
    const result = {};
    for (const street of ['preflop', 'flop', 'turn', 'river']) {
        const actions = (history[street] || [])
            .filter(a => a.seatLabel === seatLabel)
            .map(a => a.action);
        if (actions.length) result[street] = actions;
    }
    return result;
    // EXTENSION Pass 4: villain archetype reads full player line to model tendencies
}

// ---------------------------------------------------------------------------
// resolveMathContext
// ---------------------------------------------------------------------------

function resolveMathContext(handRun, callAmountBB) {
    callAmountBB = callAmountBB || 0;
    const potBB = handRun.gameState.potBB;
    const spot = handRun.postflopSpot;
    const street = handRun.street;
    const spr = handRun.gameState.spr;

    let potOddsRatio = null;
    let potOddsPct = null;
    if (callAmountBB > 0) {
        potOddsPct = Math.round(callAmountBB / (potBB + callAmountBB) * 100);
        potOddsRatio = (potBB / callAmountBB).toFixed(1) + ':1';
    }

    let heroEquityEst = null;
    let outsCount = null;
    let hint = '';

    if (street === 'preflop') {
        heroEquityEst = null;
        const openSizeBB = (typeof getOpenSizeBB === 'function') ? getOpenSizeBB() : 2.5;
        const fmtFn = (typeof formatAmt === 'function' && typeof getOpenSize$ === 'function')
            ? function() { return formatAmt(getOpenSize$()); }
            : function() { return openSizeBB.toFixed(1) + 'bb'; };
        hint = 'Open sizing: ' + fmtFn() + ' (' + openSizeBB.toFixed(1) + 'bb). Standard open from BTN.';

    } else if (spot) {
        // Draw-based equity — Rule of 4/2 from OUTS_MAP
        const drawCategory = spot.heroDraws && spot.heroDraws.primary;
        if (drawCategory !== undefined && drawCategory !== null && OUTS_MAP[drawCategory] !== undefined) {
            const outs = OUTS_MAP[drawCategory];
            const multiplier = (street === 'flop') ? 4 : 2;
            heroEquityEst = Math.min(outs * multiplier, 95);
            outsCount = outs;
            if (callAmountBB > 0 && potOddsPct !== null) {
                hint = outs + ' outs \u00d7 ' + multiplier + ' = ~' + heroEquityEst + '% equity. ' +
                    'You need ' + potOddsPct + '% \u2014 ' +
                    (heroEquityEst >= potOddsPct ? 'profitable call.' : 'not enough equity, lean fold.');
            } else {
                hint = outs + ' outs \u00d7 ' + multiplier + ' = ~' + heroEquityEst + '% equity.';
            }
        } else if (spot.heroHandClass && MADE_HAND_EQUITY[spot.heroHandClass] !== undefined) {
            // Made hand equity — range-based approximation
            heroEquityEst = MADE_HAND_EQUITY[spot.heroHandClass];
            if (callAmountBB > 0 && potOddsPct !== null) {
                hint = '~' + heroEquityEst + '% equity vs villain\u2019s range. You need ' + potOddsPct + '% to call.';
            } else {
                hint = '~' + heroEquityEst + '% equity vs villain\u2019s range.';
            }
        } else if (callAmountBB === 0) {
            hint = 'Check or bet \u2014 no price to call. Consider hand strength and board texture.';
        }

        // Append SPR context when stack-off territory
        if (spr !== null && spr !== undefined && spr < 4) {
            hint += ' SPR ' + spr + ' \u2014 stack-off territory with strong hands.';
        }
    } else if (callAmountBB === 0) {
        hint = 'Check or bet \u2014 no price to call. Consider hand strength and board texture.';
    }

    let evDecision = null;
    if (heroEquityEst !== null && potOddsPct !== null) {
        if (heroEquityEst >= potOddsPct + 5) evDecision = 'call';
        else if (heroEquityEst <= potOddsPct - 5) evDecision = 'fold';
        else evDecision = 'borderline';
    }

    return { potOddsRatio, potOddsPct, heroEquityEst, evDecision, outsCount, hint };
}

// ---------------------------------------------------------------------------
// resolveDecisionNode
// ---------------------------------------------------------------------------

function resolveDecisionNode(handRun) {
    // EXTENSION Pass 3: river resolution; Pass 5: full solver lookup tables
    const hr = handRun;
    const heroSeat = hr.seats[hr.heroSeatIndex];
    const villainSeat = hr.seats.find(s => s !== null && !s.isHero);
    const street = hr.street;
    const spot = hr.postflopSpot;
    const ss = hr.gameState.streetState;

    let nodeId, spotType, boardTexture, correctAction, mixFrequency, explanation, availableActions, position;
    let callAmountBB = 0;

    const heroLabel = heroSeat.label;

    if (street === 'preflop') {
        const heroHandNotation = _cardsToHandNotation(heroSeat.holeCards);
        boardTexture = null;
        availableActions = getAvailableActions(hr);

        // Hero (opener) facing villain's 3bet
        const _facing3bet = ss.actions.some(function(a) { return a.seatLabel !== heroLabel && a.action === '3bet'; });
        if (_facing3bet && heroLabel !== 'BB') {
            nodeId = 'preflop_vs3bet_' + heroLabel;
            spotType = 'RFI_VS_3BET';
            position = 'IP';
            const rawAction = computeCorrectAction(heroHandNotation, 'RFI_VS_3BET', heroLabel,
                villainSeat ? villainSeat.label : 'BB', null);
            correctAction = rawAction === 'RAISE' ? '4bet' : rawAction === 'CALL' ? 'call' : 'fold';
            const _3betEntry = [...ss.actions].reverse().find(function(a) { return a.action === '3bet'; });
            callAmountBB = _3betEntry ? _3betEntry.sizingBB : 0;
            mixFrequency = null;
            explanation = heroLabel + ' vs 3-bet: ' + (
                correctAction === '4bet' ? 'hand is in 4-bet range.' :
                correctAction === 'call' ? 'hand is in calling range vs 3-bet.' :
                'hand is outside continuing range \u2014 fold.'
            );

        } else if (heroLabel === 'BB') {
            const _bbOpenerAct = ss.actions.find(function(a) { return a.action === 'raise'; });
            if (!_bbOpenerAct) {
                // Folds to BB — BB has a free check option, no raise to defend against
                nodeId = 'preflop_BB_free_option';
                spotType = 'BB_FREE_OPTION';
                position = 'OOP';
                correctAction = 'check';
                mixFrequency = null;
                explanation = 'Folds to BB \u2014 check your option. Raise only with a strong raising hand.';
            } else {
                // BB defense — hero faces villain's preflop raise
                // Use actual opener from streetState (works for both existing lanes and FULL_TABLE)
                const _bbOpener = _bbOpenerAct.seatLabel;
                nodeId = 'preflop_defend_BB_vs_' + _bbOpener;
                spotType = 'FACING_RFI';
                position = 'OOP';
                const rawAction = computeCorrectAction(heroHandNotation, 'FACING_RFI', 'BB', _bbOpener, null);
                correctAction = rawAction === 'RAISE' ? '3bet' : (rawAction === 'CALL' ? 'call' : 'fold');
                mixFrequency = null;
                explanation = 'BB vs ' + _bbOpener + ': ' + (
                    correctAction === '3bet'  ? 'hand is in 3-bet range.' :
                    correctAction === 'call'  ? 'hand is in calling range.' :
                    'hand is outside defending range \u2014 fold.'
                );
            }
        } else if (ss.actions.some(function(a) { return a.seatLabel !== heroLabel && a.action === 'raise'; })) {
            // Non-BB hero facing a villain open (FULL_TABLE: opener pre-populated in streetState)
            const _openAct = ss.actions.find(function(a) { return a.action === 'raise'; });
            const _openerLabel = _openAct ? _openAct.seatLabel : 'BTN';
            nodeId = 'preflop_facing_open_' + heroLabel + '_vs_' + _openerLabel;
            spotType = 'FACING_RFI';
            position = 'IP';
            const _rawFacing = computeCorrectAction(heroHandNotation, 'FACING_RFI', heroLabel, _openerLabel, null);
            correctAction = _rawFacing === 'RAISE' ? '3bet' : (_rawFacing === 'CALL' ? 'call' : 'fold');
            mixFrequency = null;
            callAmountBB = _openAct ? _openAct.sizingBB : 0;
            explanation = heroLabel + ' vs ' + _openerLabel + ' open: ' + (
                correctAction === '3bet' ? 'hand is in 3-bet range.' :
                correctAction === 'call' ? 'hand is in calling range.' :
                'hand is outside continuing range \u2014 fold.'
            );
        } else {
            // RFI opener (BTN / CO / SB)
            nodeId = 'preflop_open_' + heroLabel;
            spotType = 'RFI';
            position = 'IP';
            const rawAction = computeCorrectAction(heroHandNotation, 'RFI', heroLabel, '', null);
            correctAction = rawAction === 'RAISE' ? 'raise' : 'fold';
            mixFrequency = null;
            explanation = heroLabel + ' RFI: ' + (
                rawAction === 'RAISE'
                    ? 'hand is in open-raising range.'
                    : 'hand is outside open-raising range \u2014 fold.'
            );
        }

    } else if (street === 'flop' || street === 'turn' || street === 'river') {
        // Check if hero is facing a villain bet (donk/probe)
        const facingVillainBet = ss.actions.some(function(a) {
            return a.seatLabel !== heroSeat.label && (a.action === 'bet' || a.action === 'raise');
        });

        if (facingVillainBet) {
            // Hero facing villain's bet — defender decision
            nodeId = street + '_vs_villainbet_' + heroLabel;
            spotType = 'DEFEND';
            boardTexture = spot ? spot.boardArchetype : null;
            position = _heroIsIP(hr) ? 'IP' : 'OOP';
            availableActions = getAvailableActions(hr);
            // Find villain bet size for pot odds
            const villainBet = [...ss.actions].reverse().find(function(a) {
                return a.seatLabel !== heroSeat.label && (a.action === 'bet' || a.action === 'raise');
            });
            callAmountBB = villainBet ? villainBet.sizingBB : 0;
            correctAction = 'call';
            mixFrequency = null;
            explanation = 'Facing villain\u2019s ' + street + ' bet \u2014 call with value/draw hands, fold weak air.';

        } else {
            // Hero as PFR / IP — c-bet, barrel, or OOP probe decision
            const isPFR = spot && spot.heroRole === 'PFR';
            const streetLabel = street === 'flop' ? 'flop' : street === 'turn' ? 'turn' : 'river';
            nodeId = streetLabel + '_' + (isPFR ? 'cbet' : 'defend') + '_' + heroLabel;
            spotType = street === 'flop'
                ? (isPFR ? 'CBET' : 'DEFEND')
                : (isPFR ? 'BARREL' : 'DEFEND');
            boardTexture = spot ? (spot.turnFamily || spot.boardArchetype) : null;
            position = _heroIsIP(hr) ? 'IP' : 'OOP';
            availableActions = getAvailableActions(hr);

            if (!isPFR) {
                // OOP hero acting first (probe decision) — no dedicated flop probe data yet.
                // Checking is correct GTO default for BB on the flop vs IP opener.
                correctAction = 'check';
                mixFrequency = null;
                explanation = 'OOP on the ' + streetLabel + ' \u2014 check is the correct default. Probe bet frequencies added in a future pass.';
            } else if (spot && spot.strategy) {
                const bet33Freq = spot.strategy.actions && spot.strategy.actions.bet33 !== undefined
                    ? spot.strategy.actions.bet33 : null;
                const checkFreq = spot.strategy.actions && spot.strategy.actions.check !== undefined
                    ? spot.strategy.actions.check : null;
                const preferred = (bet33Freq !== null && checkFreq !== null)
                    ? (bet33Freq >= checkFreq ? 'bet33' : 'check') : 'check';
                correctAction = preferred === 'bet33' ? 'bet' : 'check';
                if (bet33Freq !== null && checkFreq !== null && Math.abs(bet33Freq - checkFreq) < 0.2) {
                    mixFrequency = { bet: bet33Freq, check: checkFreq };
                } else {
                    mixFrequency = null;
                }
                explanation = spot.strategy.reasoning || 'See strategy data for details.';
            } else {
                correctAction = 'check';
                mixFrequency = null;
                explanation = 'No strategy data available \u2014 defaulting to check.';
            }
        }

    } else {
        nodeId = street + '_decision';
        spotType = 'CBET';
        boardTexture = null;
        position = 'IP';
        availableActions = getAvailableActions(hr);
        correctAction = 'check';
        mixFrequency = null;
        explanation = '';
    }

    const mathContext = resolveMathContext(hr, callAmountBB);

    hr.decisionNodes.push({
        nodeId,
        street,
        seatIndex: hr.heroSeatIndex,
        position,
        spotType,
        boardTexture,
        potBB: hr.gameState.potBB,
        heroStackBB: heroSeat.stackBB,
        villainStackBB: villainSeat ? villainSeat.stackBB : 0,
        availableActions,
        correctAction,
        correctSizingBucket: (correctAction === 'bet')
            ? resolveCorrectSizingBucket(spot, hr.gameState.spr, street)
            : null,
        mixFrequency,
        explanation,
        mathContext,
        heroHandClass: spot ? (spot.heroHandClass || null) : null,
        heroAction: null,
        chosenSizingBucket: null,
        sizeGrade: null,
        grade: null,
        timestamp: Date.now()
    });

    return hr;
}

// ---------------------------------------------------------------------------
// getAvailableActions
// ---------------------------------------------------------------------------

function getAvailableActions(handRun) {
    const hr = handRun;
    const street = hr.street;
    const heroLabel = hr.seats[hr.heroSeatIndex].label;

    if (street === 'preflop') {
        const _pfSS = hr.gameState.streetState;
        if (heroLabel === 'BB') {
            // Only offer call/3bet if there is actually a raise to face
            const _facingRaise = _pfSS.actions.some(function(a) {
                return a.seatLabel !== heroLabel && (a.action === 'raise' || a.action === '3bet');
            });
            if (_facingRaise) return ['fold', 'call', '3bet'];
            // Everyone folded to BB — BB gets the free check option
            return ['check', 'raise'];
        }
        // RFI opener facing a villain 3bet
        const _facing3bet = _pfSS.actions.some(function(a) { return a.seatLabel !== heroLabel && a.action === '3bet'; });
        if (_facing3bet) return ['fold', 'call', '4bet'];
        // Non-BB hero facing a villain open (FULL_TABLE: opener's raise pre-populated in actions)
        const _facingOpen = _pfSS.actions.some(function(a) { return a.seatLabel !== heroLabel && a.action === 'raise'; });
        if (_facingOpen) return ['fold', 'call', '3bet'];
        // RFI opener — open or fold
        return ['fold', 'raise'];
    }

    if (street === 'flop' || street === 'turn' || street === 'river') {
        const ss = hr.gameState.streetState;
        const facingBet = ss.actions.some(function(a) {
            return a.seatLabel !== heroLabel && (a.action === 'bet' || a.action === 'raise');
        });
        return facingBet ? ['fold', 'call', 'raise'] : ['check', 'bet'];
    }

    return ['check', 'fold'];
}

// ---------------------------------------------------------------------------
// resolveVillainAction
// ---------------------------------------------------------------------------

// EXTENSION Pass 4: replace range-weighted sampling with villain archetypes (nit, TAG, station, aggro reg)
function resolveVillainAction(handRun) {
    const hr = handRun;
    const street = hr.street;
    const villainSeat = hr.seats.find(s => s !== null && !s.isHero);
    if (!villainSeat) return 'fold';
    const heroLabel = hr.seats[hr.heroSeatIndex].label;
    const ss = hr.gameState.streetState;

    if (street === 'preflop') {
        if (hr.lane === 'BB_vs_BTN_SRP') {
            // Villain is BTN: if BTN hasn't acted yet → open-raise;
            // if BTN is responding to BB's 3bet → fold ~60%, call ~40%
            const villainHasActed = ss.actions.some(a => a.seatLabel === villainSeat.label);
            if (!villainHasActed) return 'raise';
            return Math.random() < 0.60 ? 'fold' : 'call';
        }
        // Villain (BB) facing hero's 4bet — fold ~65%, call ~35% (no 5bet this pass)
        const _heroFourbet = ss.actions.some(a => a.seatLabel === heroLabel && a.action === '4bet');
        if (_heroFourbet) return Math.random() < 0.65 ? 'fold' : 'call';
        // Villain is BB facing hero's open — use the correct facing range for this opener
        const _bbRangeKey = 'BB_vs_' + heroLabel;
        const rangeData = facingRfiRanges[_bbRangeKey] || facingRfiRanges['BB_vs_BTN'];
        if (!rangeData) return 'fold';
        const threeBetRange = rangeData['3-bet'] || [];
        const callRange = rangeData['Call'] || [];
        const threeBetCombos = _roughCombosInRange(threeBetRange);
        const callCombos = _roughCombosInRange(callRange);
        const totalNonFold = threeBetCombos + callCombos;
        const foldCombos = Math.round(totalNonFold * 0.61); // fold ≈ 38% overall
        const roll = Math.random() * (threeBetCombos + callCombos + foldCombos);
        if (roll < threeBetCombos) return '3bet';
        if (roll < threeBetCombos + callCombos) return 'call';
        return 'fold';
    }

    if (street === 'flop' || street === 'turn' || street === 'river') {
        const heroBet = ss.actions.some(a => a.seatLabel === heroLabel && (a.action === 'bet' || a.action === 'raise'));

        if (!heroBet) {
            // Hero checked — villain may bet (OOP probe) or check
            const betProb = street === 'river' ? 0.20 : 0.25;
            return Math.random() < betProb ? 'bet' : 'check';
        }
        // Hero bet — villain folds/calls/raises weighted
        const noise = (Math.random() - 0.5) * 0.15;
        const foldProb = Math.max(0, Math.min(1, 0.60 + noise));
        const roll = Math.random();
        if (roll < foldProb) return 'fold';
        if (roll < foldProb + 0.35) return 'call';
        return 'raise';
    }

    return 'check';
}

// ---------------------------------------------------------------------------
// advanceStreet
// ---------------------------------------------------------------------------

function advanceStreet(handRun) {
    // EXTENSION Pass 3: river street — call generateRiverCBetSpot / generateRiverDefendSpot
    const hr = _deepCopy(handRun);
    const gs = hr.gameState;
    const ss = gs.streetState;

    // Step 1: Copy streetState.actions into streetHistory for this street
    gs.streetHistory[ss.street] = [...ss.actions];

    // Step 2: Add total committed this street to running pot
    const streetCommitted = Object.values(ss.committedBB).reduce((s, v) => s + v, 0);
    gs.potBB = parseFloat((gs.potBB + streetCommitted).toFixed(2));

    // Step 3: Determine next street
    const streetOrder = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    const idx = streetOrder.indexOf(ss.street);
    if (idx === -1 || idx >= streetOrder.length - 1) {
        hr.street = 'showdown';
        hr.nodeType = 'terminal';
        hr.terminal = true;
        _resolveOutcome(hr);
        return hr;
    }
    const nextStreet = streetOrder[idx + 1];

    const laneFamily = LANE_FAMILY[hr.lane] || 'BTN_vs_BB';
    const familyFilter = LANE_POSTFLOP_FAMILY[hr.lane] || ['BTN_vs_BB'];
    const heroLabel = hr.seats[hr.heroSeatIndex].label;
    const villainSeatForGen = hr.seats.find(s => s !== null && !s.isHero);
    const villainLabelForGen = villainSeatForGen ? villainSeatForGen.label : 'BB';

    if (nextStreet === 'flop') {
        // Step 4: Deal board cards — append to gameState.board[], never replace
        const flopCards = _dealBoardCards(hr, 3);
        for (const c of flopCards) gs.board.push(c);

        // Override pot with canonical SRP value — eliminates preflop rounding drift
        const srpFn = (typeof getSRPPot$ === 'function') ? getSRPPot$ : function() { return 16.5; };
        const bbFn  = (typeof getBigBlind$ === 'function') ? getBigBlind$ : function() { return 3; };
        gs.potBB = parseFloat((srpFn(laneFamily) / bbFn()).toFixed(2));

        // Generate postflop spot for strategy lookup only — spot.flopCards never used for display
        hr.postflopSpot = generatePostflopSpot(20, familyFilter);
        // For BB_vs_BTN_SRP (hero is BB defending), override heroRole so resolveDecisionNode
        // uses the defender branch. SB_vs_BB_SRP is also OOP but SB is the PFR — keep PFR role.
        if (hr.lane === 'BB_vs_BTN_SRP' && hr.postflopSpot) {
            hr.postflopSpot.heroRole = 'DEFENDER';
        }

    } else if (nextStreet === 'turn') {
        // Step 4: Deal one turn card and append
        const turnCards = _dealBoardCards(hr, 1);
        for (const c of turnCards) gs.board.push(c);

        // Pick turn generator from flop history
        const genName = _simResolveTurnGenerator(gs, heroLabel, villainLabelForGen);
        let turnGenFn;
        if (genName === 'generateDelayedTurnSpot' && typeof generateDelayedTurnSpot === 'function') {
            turnGenFn = generateDelayedTurnSpot;
        } else if (genName === 'generateTurnDefendSpot' && typeof generateTurnDefendSpot === 'function') {
            turnGenFn = generateTurnDefendSpot;
        } else {
            turnGenFn = (typeof generateTurnCBetSpot === 'function') ? generateTurnCBetSpot : null;
        }
        if (turnGenFn) hr.postflopSpot = turnGenFn(20, familyFilter);

    } else if (nextStreet === 'river') {
        // Step 4: Deal one river card and append
        const riverCards = _dealBoardCards(hr, 1);
        for (const c of riverCards) gs.board.push(c);

        // Pick river generator from flop+turn history
        const riverGenName = _simResolveRiverGenerator(gs, heroLabel, villainLabelForGen);
        const riverGenMap = {
            'generateRiverCBetSpot':         typeof generateRiverCBetSpot         === 'function' ? generateRiverCBetSpot         : null,
            'generateRiverDefendSpot':        typeof generateRiverDefendSpot        === 'function' ? generateRiverDefendSpot        : null,
            'generateRiverDelayedCBetSpot':   typeof generateRiverDelayedCBetSpot   === 'function' ? generateRiverDelayedCBetSpot   : null,
            'generateRiverTurnCheckCBetSpot': typeof generateRiverTurnCheckCBetSpot === 'function' ? generateRiverTurnCheckCBetSpot : null,
            'generateRiverProbeSpot':         typeof generateRiverProbeSpot         === 'function' ? generateRiverProbeSpot         : null
        };
        const riverGenFn = riverGenMap[riverGenName] || riverGenMap['generateRiverCBetSpot'];
        if (riverGenFn) hr.postflopSpot = riverGenFn(20, familyFilter);

    } else if (nextStreet === 'showdown') {
        hr.street = 'showdown';
        hr.nodeType = 'terminal';
        hr.terminal = true;
        _resolveOutcome(hr);
        return hr;
    }

    // Step 5: Determine firstToActIndex — OOP player acts first postflop
    // IP hero (BTN/CO) → villain (OOP) acts first; OOP hero (BB/SB) → hero acts first
    const heroActsFirst = !_heroIsIP(hr);
    const villainSeat = hr.seats.find(s => s !== null && !s.isHero && !s.folded && !s.allIn);
    const firstActIdx = heroActsFirst
        ? hr.heroSeatIndex
        : (villainSeat ? villainSeat.index : hr.heroSeatIndex);

    // Step 6: Reset streetState completely
    gs.streetState = {
        street: nextStreet,
        actingIndex: firstActIdx,
        firstToActIndex: firstActIdx,
        betMadeThisStreet: false,
        raiseMadeThisStreet: false,
        committedBB: _buildCommittedBB(hr.seats),
        actions: []
    };

    // Mirror street at top level for backward-compat reads
    hr.street = nextStreet;

    // Step 7: Recalculate SPR
    const activeStacks = hr.seats
        .filter(s => s !== null && !s.folded && !s.allIn)
        .map(s => s.stackBB);
    if (activeStacks.length > 0 && gs.potBB > 0) {
        gs.spr = Math.round((Math.min(...activeStacks) / gs.potBB) * 10) / 10;
    }
    // EXTENSION Pass 3.5: SPR drives sizing bucket recommendations for postflop bet nodes
    // EXTENSION Pass 5: calculate SPR per opponent matchup — min(stacks) is heads-up approximation only

    // If hero acts first this street, resolve decision node immediately
    if (heroActsFirst) {
        hr.nodeType = 'hero_decision';
        resolveDecisionNode(hr);
    } else {
        hr.nodeType = 'villain_response';
    }

    return hr;
}

// ---------------------------------------------------------------------------
// isTerminal
// ---------------------------------------------------------------------------

function isTerminal(handRun) {
    if (handRun.terminal) return true;
    if (handRun.street === 'showdown') return true;
    if (handRun.seats.some(s => s !== null && s.folded)) return true;
    return false;
}

// ---------------------------------------------------------------------------
// applyHeroAction
// ---------------------------------------------------------------------------

function applyHeroAction(handRun, action, heroSizingBB) {
    const hr = _deepCopy(handRun);
    const heroSeat = hr.seats[hr.heroSeatIndex];
    const villainSeat = hr.seats.find(s => s !== null && !s.isHero);
    const gs = hr.gameState;
    const ss = gs.streetState;
    const street = ss.street;

    // Determine sizing per spec Part 6 & 7
    let sizingBB = 0;
    if (action === 'raise' && street === 'preflop') {
        sizingBB = (typeof getOpenSizeBB === 'function') ? getOpenSizeBB() : 2.5;
    } else if (action === 'bet') {
        // Use hero's chosen size (Pass 3.5a) if provided, else default to 33%
        sizingBB = (heroSizingBB !== undefined && heroSizingBB !== null)
            ? Math.round(heroSizingBB * 10) / 10
            : Math.round(gs.potBB * 0.33 * 10) / 10;
    } else if (action === 'raise' && (street === 'flop' || street === 'turn' || street === 'river')) {
        // Raise villain's bet: 2.5× villain bet
        const villainBet = [...ss.actions].reverse().find(a => a.seatLabel !== heroSeat.label && (a.action === 'bet' || a.action === 'raise'));
        sizingBB = villainBet ? Math.round(villainBet.sizingBB * 2.5 * 10) / 10 : Math.round(gs.potBB * 0.33 * 2.5 * 10) / 10;
    } else if (action === '4bet') {
        const _3betEntry = [...ss.actions].reverse().find(a => a.action === '3bet');
        sizingBB = _3betEntry ? Math.round(_3betEntry.sizingBB * 2.2 * 10) / 10 : 22;
    } else if (action === 'call') {
        const villainAggr = [...ss.actions].reverse().find(a => a.seatLabel !== heroSeat.label && (a.action === 'bet' || a.action === 'raise' || a.action === '3bet'));
        sizingBB = villainAggr ? villainAggr.sizingBB : 0;
    }

    // Record in streetState — append only
    ss.actions.push({ seatLabel: heroSeat.label, action, sizingBB });
    if (action === 'bet' || action === 'raise') { ss.betMadeThisStreet = true; ss.raiseMadeThisStreet = (action === 'raise'); }

    // Update committedBB and stack (pot updated only in advanceStreet step 2)
    if (sizingBB > 0) {
        ss.committedBB[heroSeat.label] = (ss.committedBB[heroSeat.label] || 0) + sizingBB;
        heroSeat.stackBB = parseFloat((heroSeat.stackBB - sizingBB).toFixed(2));
    }

    // Mirror street
    hr.street = ss.street;

    // Grade pending decision node
    const pendingNode = [...hr.decisionNodes].reverse().find(n => n.heroAction === null && n.street === street);
    if (pendingNode) {
        pendingNode.heroAction = action;
        pendingNode.chosenSizingBB = (action === 'bet' || action === 'raise') ? sizingBB : null;
        pendingNode.grade = (action === pendingNode.correctAction) ? 'correct'
            : (pendingNode.mixFrequency && pendingNode.mixFrequency[action] !== undefined) ? 'mixed'
            : 'error';

        // Size grading (Pass 3.5b) — only when hero bets and correctSizingBucket was set
        if (action === 'bet' && pendingNode.correctSizingBucket && gs.potBB > 0) {
            const ratio = sizingBB / gs.potBB;
            const chosenBucket = ratio < 0.50 ? 'small' : ratio < 0.85 ? 'medium' : 'large';
            const bucketOrder = { small: 0, medium: 1, large: 2 };
            const diff = Math.abs(
                (bucketOrder[chosenBucket] !== undefined ? bucketOrder[chosenBucket] : 1) -
                (bucketOrder[pendingNode.correctSizingBucket] !== undefined ? bucketOrder[pendingNode.correctSizingBucket] : 1)
            );
            pendingNode.chosenSizingBucket = chosenBucket;
            pendingNode.sizeGrade = diff === 0 ? 'correct' : diff === 1 ? 'close' : 'error';
        }
    }

    // Fold → terminal
    if (action === 'fold') {
        heroSeat.folded = true;
        hr.terminal = true;
        hr.nodeType = 'terminal';
        _resolveOutcome(hr);
        return hr;
    }

    // Check street completion
    if (_isStreetComplete(hr)) {
        hr.nodeType = 'street_advance';
        return hr;
    }

    // Villain must respond
    if (villainSeat) ss.actingIndex = villainSeat.index;
    hr.nodeType = 'villain_response';
    return hr;
}

// ---------------------------------------------------------------------------
// applyVillainAction
// ---------------------------------------------------------------------------

function applyVillainAction(handRun) {
    const hr = _deepCopy(handRun);
    const villainSeat = hr.seats.find(s => s !== null && !s.isHero);
    if (!villainSeat) return hr;

    const action = resolveVillainAction(hr);
    const gs = hr.gameState;
    const ss = gs.streetState;
    const street = ss.street;
    const heroSeat = hr.seats[hr.heroSeatIndex];
    let sizingBB = 0;

    if (action === '3bet') {
        const tbFn = (typeof get3betSize$ === 'function') ? get3betSize$ : function() { return 22.5; };
        const bbFn = (typeof getBigBlind$ === 'function') ? getBigBlind$ : function() { return 3; };
        sizingBB = parseFloat((tbFn('BB', 'BTN') / bbFn()).toFixed(2));
    } else if (action === 'raise' && street === 'preflop') {
        // Villain opening preflop (e.g. BTN in BB_vs_BTN_SRP)
        sizingBB = (typeof getOpenSizeBB === 'function') ? getOpenSizeBB() : 2.5;
    } else if (action === 'call') {
        if (street === 'preflop') {
            // Match the last hero aggression — covers open raise and 4bet
            const _heroAggr = [...ss.actions].reverse().find(a =>
                a.seatLabel !== villainSeat.label && (a.action === 'raise' || a.action === '4bet')
            );
            sizingBB = _heroAggr ? _heroAggr.sizingBB
                : (typeof getOpenSizeBB === 'function' ? getOpenSizeBB() : 2.5);
        } else {
            const heroBet = [...ss.actions].reverse().find(a => a.seatLabel !== villainSeat.label && (a.action === 'bet' || a.action === 'raise'));
            sizingBB = heroBet ? heroBet.sizingBB : 0;
        }
    } else if (action === 'bet') {
        sizingBB = Math.round(gs.potBB * 0.33 * 10) / 10;
    } else if (action === 'raise') {
        const heroBet = [...ss.actions].reverse().find(a => a.seatLabel !== villainSeat.label && (a.action === 'bet' || a.action === 'raise'));
        sizingBB = heroBet ? Math.round(heroBet.sizingBB * 2.5 * 10) / 10 : Math.round(gs.potBB * 0.33 * 2.5 * 10) / 10;
    }

    // Record in streetState — append only
    ss.actions.push({ seatLabel: villainSeat.label, action, sizingBB });
    if (action === 'bet' || action === 'raise' || action === '3bet') { ss.betMadeThisStreet = true; }
    if (action === 'raise' || action === '3bet') { ss.raiseMadeThisStreet = true; }

    // Update committedBB and stack
    if (sizingBB > 0) {
        ss.committedBB[villainSeat.label] = (ss.committedBB[villainSeat.label] || 0) + sizingBB;
        villainSeat.stackBB = parseFloat((villainSeat.stackBB - sizingBB).toFixed(2));
    }

    // Mirror street
    hr.street = ss.street;

    // Fold → terminal
    if (action === 'fold') {
        villainSeat.folded = true;
        hr.terminal = true;
        hr.nodeType = 'terminal';
        _resolveOutcome(hr);
        return hr;
    }

    // Villain 3bet — hero gets to respond (fold / call / 4bet)
    if (action === '3bet') {
        ss.actingIndex = hr.heroSeatIndex;
        hr.nodeType = 'hero_decision';
        resolveDecisionNode(hr);
        return hr;
    }

    // Check street completion
    if (_isStreetComplete(hr)) {
        hr.nodeType = 'street_advance';
        return hr;
    }

    // Hero must respond — create decision node
    ss.actingIndex = hr.heroSeatIndex;
    hr.nodeType = 'hero_decision';
    resolveDecisionNode(hr);
    return hr;
}

// ---------------------------------------------------------------------------
// _resolveOutcome (internal)
// ---------------------------------------------------------------------------

function _resolveOutcome(handRun) {
    const hr = handRun;
    const heroSeat  = hr.seats[hr.heroSeatIndex];
    const villainSeat = hr.seats.find(s => s !== null && !s.isHero);
    const gs  = hr.gameState;
    const ss  = gs.streetState;

    // Current street committed (not yet flushed into gs.potBB by advanceStreet)
    const streetCommitted = Object.values(ss.committedBB).reduce((s, v) => s + v, 0);

    // Blind amounts that are in the real pot but never reach committedBB:
    //   - Dead SB (always 0.5BB unless hero IS the SB)
    //   - BB's blind when BB folded preflop before calling (committedBB['BB'] stays 0)
    const deadSB = hr.lane === 'SB_vs_BB_SRP' ? 0 : 0.5;
    const bbLabel = (villainSeat && villainSeat.label === 'BB') ? 'BB'
                  : (heroSeat   && heroSeat.label   === 'BB') ? 'BB' : null;
    const bbAlreadyCommitted = bbLabel ? (ss.committedBB[bbLabel] || 0) : 0;
    const bbBlindMissing = (bbLabel && bbAlreadyCommitted === 0 && hr.street === 'preflop') ? 1 : 0;

    const totalPot = parseFloat((gs.potBB + streetCommitted + deadSB + bbBlindMissing).toFixed(2));

    // Hero's actual investment this hand = chips moved out of hero's starting stack.
    // stackBB is decremented for every hero bet/call (fold has sizingBB 0 so no change).
    // Special case: BB folds preflop without having acted — stackBB unchanged but blind was posted.
    const heroBBBlind = (hr.lane === 'BB_vs_BTN_SRP' && heroSeat && heroSeat.stackBB === 100) ? 1 : 0;
    const heroInvested = parseFloat(((100 - (heroSeat ? heroSeat.stackBB : 100)) + heroBBBlind).toFixed(2));

    let winner, heroNetBB;
    if (heroSeat && heroSeat.folded) {
        winner = villainSeat ? villainSeat.label : 'villain';
        heroNetBB = -heroInvested;
    } else if (villainSeat && villainSeat.folded) {
        winner = heroSeat ? heroSeat.label : 'hero';
        heroNetBB = parseFloat((totalPot - heroInvested).toFixed(2));
    } else {
        // Showdown — rough 50/50 for Pass 2.5
        const heroWins = Math.random() < 0.5;
        winner = heroWins ? (heroSeat ? heroSeat.label : 'hero') : (villainSeat ? villainSeat.label : 'villain');
        heroNetBB = heroWins
            ? parseFloat((totalPot - heroInvested).toFixed(2))
            : -heroInvested;
    }

    hr.outcome = {
        winner,
        potBB: totalPot,
        heroNetBB: parseFloat(heroNetBB.toFixed(2)),
        showdownReached: hr.street === 'showdown'
    };
}

// ---------------------------------------------------------------------------
// serializeHandRun
// ---------------------------------------------------------------------------

function serializeHandRun(handRun) {
    return _deepCopy(handRun);
}

// ---------------------------------------------------------------------------
// getHandSummary
// ---------------------------------------------------------------------------

function getHandSummary(handRun) {
    const nodes = handRun.decisionNodes.filter(n => n.heroAction !== null);
    const streetSummaries = nodes.map(n => ({
        street: n.street,
        heroAction: n.heroAction,
        correctAction: n.correctAction,
        grade: n.grade,
        explanation: n.explanation,
        chosenSizingBB: n.chosenSizingBB || null,
        correctSizingBucket: n.correctSizingBucket || null,
        chosenSizingBucket:  n.chosenSizingBucket  || null,
        sizeGrade:           n.sizeGrade           || null
    }));
    const mistakeCount = nodes.filter(n => n.grade === 'error').length;

    // Build line from actual streetHistory per spec Part 4
    const heroLabelForLine = handRun.seats[handRun.heroSeatIndex].label;
    const heroLine = getPlayerLine(handRun, heroLabelForLine);
    const lineParts = ['preflop', 'flop', 'turn', 'river']
        .filter(s => heroLine[s] && heroLine[s].length > 0)
        .map(function(s) {
            const act = heroLine[s][0];
            return (_LINE_VERBS[s] && _LINE_VERBS[s][act]) || (act + ' ' + s);
        });

    let lineStr = '';
    if (lineParts.length > 0) {
        lineStr = lineParts[0].charAt(0).toUpperCase() + lineParts[0].slice(1);
        if (lineParts.length > 1) lineStr += ' \u2192 ' + lineParts.slice(1).join(' \u2192 ');
    } else {
        lineStr = 'Hand complete';
    }

    const laneLabel = {
        'BTN_vs_BB_SRP': 'BTN vs BB',
        'BB_vs_BTN_SRP': 'BB vs BTN',
        'CO_vs_BB_SRP':  'CO vs BB',
        'SB_vs_BB_SRP':  'SB vs BB'
    }[handRun.lane] || handRun.lane;

    let lineAssessment;
    if (mistakeCount === 0) {
        lineAssessment = '[' + laneLabel + '] ' + lineStr + ' \u2014 no errors.';
    } else if (mistakeCount === 1) {
        const mistake = nodes.find(n => n.grade === 'error');
        lineAssessment = '[' + laneLabel + '] ' + lineStr + ' \u2014 1 error ('
            + (mistake ? mistake.explanation || ('wrong action on ' + mistake.street) : 'mistake detected') + ').';
    } else {
        lineAssessment = '[' + laneLabel + '] ' + lineStr + ' \u2014 ' + mistakeCount + ' errors.';
    }

    return { streetSummaries, mistakeCount, lineAssessment };
}

// ---------------------------------------------------------------------------
// createHandRun
// ---------------------------------------------------------------------------

function createHandRun(config) {
    // EXTENSION Pass 5: multiway pots — committedBB and streetHistory already support N players
    const lane = config && config.lane;
    if (!SIM_SUPPORTED_LANES.includes(lane)) {
        throw new Error('Lane not supported: ' + lane);
    }

    const holeCards = _dealHeroCards();

    // Build seats per lane — seats[0] = hero for opener lanes; seats[1] = hero for BB_vs_BTN
    // EXTENSION Pass 5: populate seats[2–8] for full 9-max
    let seats, heroSeatIndex, firstToActPreflopIndex;

    if (lane === 'BB_vs_BTN_SRP') {
        // Hero is BB (seat 1), villain is BTN (seat 0). BTN acts first preflop (opens).
        seats = [
            { index: 0, label: 'BTN', isHero: false, stackBB: 100, holeCards: null,      folded: false, allIn: false },
            { index: 1, label: 'BB',  isHero: true,  stackBB: 100, holeCards: holeCards, folded: false, allIn: false },
            null, null, null, null, null, null, null
        ];
        heroSeatIndex = 1;
        firstToActPreflopIndex = 0; // BTN opens
    } else if (lane === 'CO_vs_BB_SRP') {
        seats = [
            { index: 0, label: 'CO',  isHero: true,  stackBB: 100, holeCards: holeCards, folded: false, allIn: false },
            { index: 1, label: 'BB',  isHero: false, stackBB: 100, holeCards: null,      folded: false, allIn: false },
            null, null, null, null, null, null, null
        ];
        heroSeatIndex = 0;
        firstToActPreflopIndex = 0; // CO opens
    } else if (lane === 'SB_vs_BB_SRP') {
        seats = [
            { index: 0, label: 'SB',  isHero: true,  stackBB: 100, holeCards: holeCards, folded: false, allIn: false },
            { index: 1, label: 'BB',  isHero: false, stackBB: 100, holeCards: null,      folded: false, allIn: false },
            null, null, null, null, null, null, null
        ];
        heroSeatIndex = 0;
        firstToActPreflopIndex = 0; // SB opens
    } else if (lane === 'HJ_vs_BB_SRP') {
        seats = [
            { index: 0, label: 'HJ',  isHero: true,  stackBB: 100, holeCards: holeCards, folded: false, allIn: false },
            { index: 1, label: 'BB',  isHero: false, stackBB: 100, holeCards: null,      folded: false, allIn: false },
            null, null, null, null, null, null, null
        ];
        heroSeatIndex = 0;
        firstToActPreflopIndex = 0; // HJ opens
    } else if (lane === 'LJ_vs_BB_SRP') {
        seats = [
            { index: 0, label: 'LJ',  isHero: true,  stackBB: 100, holeCards: holeCards, folded: false, allIn: false },
            { index: 1, label: 'BB',  isHero: false, stackBB: 100, holeCards: null,      folded: false, allIn: false },
            null, null, null, null, null, null, null
        ];
        heroSeatIndex = 0;
        firstToActPreflopIndex = 0; // LJ opens
    } else if (lane === 'UTG_vs_BB_SRP') {
        seats = [
            { index: 0, label: 'UTG', isHero: true,  stackBB: 100, holeCards: holeCards, folded: false, allIn: false },
            { index: 1, label: 'BB',  isHero: false, stackBB: 100, holeCards: null,      folded: false, allIn: false },
            null, null, null, null, null, null, null
        ];
        heroSeatIndex = 0;
        firstToActPreflopIndex = 0; // UTG opens
    } else if (lane === 'UTG1_vs_BB_SRP') {
        seats = [
            { index: 0, label: 'UTG1', isHero: true,  stackBB: 100, holeCards: holeCards, folded: false, allIn: false },
            { index: 1, label: 'BB',   isHero: false, stackBB: 100, holeCards: null,      folded: false, allIn: false },
            null, null, null, null, null, null, null
        ];
        heroSeatIndex = 0;
        firstToActPreflopIndex = 0; // UTG1 opens
    } else if (lane === 'UTG2_vs_BB_SRP') {
        seats = [
            { index: 0, label: 'UTG2', isHero: true,  stackBB: 100, holeCards: holeCards, folded: false, allIn: false },
            { index: 1, label: 'BB',   isHero: false, stackBB: 100, holeCards: null,      folded: false, allIn: false },
            null, null, null, null, null, null, null
        ];
        heroSeatIndex = 0;
        firstToActPreflopIndex = 0; // UTG2 opens
    } else if (lane === 'FULL_TABLE') {
        // Use the rotation-supplied hero position if provided (live table rotation),
        // otherwise fall back to random for any standalone calls.
        var heroPos = (config && config.heroPos && FULL_TABLE_POSITIONS.includes(config.heroPos))
            ? config.heroPos
            : FULL_TABLE_POSITIONS[Math.floor(Math.random() * FULL_TABLE_POSITIONS.length)];
        var heroIdx = FULL_TABLE_POSITIONS.indexOf(heroPos);
        seats = FULL_TABLE_POSITIONS.map(function(pos, i) {
            return {
                index: i,
                label: pos,
                isHero: (pos === heroPos),
                stackBB: 100,
                holeCards: (pos === heroPos) ? holeCards : null,
                folded: false,
                allIn: false
            };
        });
        heroSeatIndex = heroIdx;
        firstToActPreflopIndex = heroIdx;
    } else {
        // BTN_vs_BB_SRP (default)
        seats = [
            { index: 0, label: 'BTN', isHero: true,  stackBB: 100, holeCards: holeCards, folded: false, allIn: false },
            { index: 1, label: 'BB',  isHero: false, stackBB: 100, holeCards: null,      folded: false, allIn: false },
            null, null, null, null, null, null, null
        ];
        heroSeatIndex = 0;
        firstToActPreflopIndex = 0; // BTN opens
    }

    // BB_vs_BTN starts as villain_response (BTN opens); all others start as hero_decision
    const initialNodeType = (lane === 'BB_vs_BTN_SRP') ? 'villain_response' : 'hero_decision';

    const hr = {
        id: 'hand_' + Date.now(),
        lane,
        seats,
        heroSeatIndex,
        street: 'preflop',
        nodeType: initialNodeType,
        terminal: false,
        outcome: null,
        decisionNodes: [],
        postflopSpot: null,

        gameState: {
            potBB: 0,       // starts at 0; flop override sets canonical SRP pot per spec Part 7
            board: [],      // append-only; never reset or replaced mid-hand
            spr: null,      // recalculated at each street start

            streetHistory: {    // append-only; never reset mid-hand
                preflop: [],
                flop: [],
                turn: [],
                river: []
            },

            streetState: {      // reset completely on every advanceStreet()
                street: 'preflop',
                actingIndex: firstToActPreflopIndex,
                firstToActIndex: firstToActPreflopIndex,
                betMadeThisStreet: false,
                raiseMadeThisStreet: false,
                committedBB: _buildCommittedBB(seats),
                actions: []
            }
        }
    };

    // FULL_TABLE: run preflop simulation loop now that hr.gameState is fully initialized.
    // This nulls irrelevant seats, sets hr.lane to derived 2-player lane, and populates
    // hr.preflopContext for UI display. Must run before resolveDecisionNode.
    if (config && config.lane === 'FULL_TABLE') {
        _runPreflopTableLoop(hr);
    }

    // Only resolve initial decision node for hero_decision starts (not BB_vs_BTN which starts villain_response)
    if (initialNodeType === 'hero_decision') resolveDecisionNode(hr);
    return hr;
}

// ---------------------------------------------------------------------------
// Validation block — runs only in Node.js (no window object)
// ---------------------------------------------------------------------------

if (typeof window === 'undefined') {
    global.RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
    global.computeCorrectAction = function(hand) { return 'RAISE'; };
    global.facingRfiRanges = {
        'BB_vs_BTN': { '3-bet': ['JJ+','AK','A5s-A4s'], 'Call': ['TT-22','A2s+','K9s+','Q9s+','J9s+','T9s','98s','87s','76s','AJo+','KQo','KJo','QJo'] }
    };
    global.getOpenSizeBB = function() { return 2.5; };
    global.getOpenSize$  = function() { return 7.5; };
    global.getBigBlind$  = function() { return 3; };
    global.getSRPPot$    = function() { return 16.5; };
    global.get3betSize$  = function() { return 22.5; };
    global.formatAmt     = function(amt) { return '$' + amt; };
    global.generatePostflopSpot = function() {
        return {
            heroRole: 'PFR', boardArchetype: 'A_HIGH_DRY',
            heroPos: 'BTN', villainPos: 'BB', positionState: 'IP',
            flopCards: [{rank:'A',suit:'h'},{rank:'7',suit:'d'},{rank:'2',suit:'c'}],
            preflopFamily: 'BTN_vs_BB',
            heroHand: 'KQs', heroHandClass: 'OVERCARDS',
            heroDraws: { primary: 'no-draw' },
            strategy: { actions: { bet33: 0.70, check: 0.30 }, reasoning: 'Bet for value.' }
        };
    };
    global.generateTurnCBetSpot          = global.generatePostflopSpot;
    global.generateTurnDefendSpot        = global.generatePostflopSpot;
    global.generateDelayedTurnSpot       = global.generatePostflopSpot;
    global.generateRiverCBetSpot         = global.generatePostflopSpot;
    global.generateRiverDefendSpot       = global.generatePostflopSpot;
    global.generateRiverDelayedCBetSpot  = global.generatePostflopSpot;
    global.generateRiverTurnCheckCBetSpot = global.generatePostflopSpot;
    global.generateRiverProbeSpot        = global.generatePostflopSpot;

    // --- Basic structure tests ---
    const h0 = createHandRun({ lane: 'BTN_vs_BB_SRP' });
    console.assert(Array.isArray(h0.seats), 'seats must be array');
    console.assert(h0.seats[h0.heroSeatIndex].isHero, 'hero seat not marked');
    console.assert(h0.decisionNodes.length === 1, 'initial decision node missing');
    console.assert(h0.gameState.potBB === 0, 'initial potBB must be 0');
    console.assert(h0.gameState.board.length === 0, 'initial board must be empty');
    console.assert(h0.decisionNodes[0].mathContext !== undefined, 'mathContext missing on node');
    console.assert(getAvailableActions(h0).includes('raise'), 'raise action missing');
    console.assert(getAvailableActions(h0).includes('fold'), 'fold action missing');
    console.assert(!getAvailableActions(h0).includes('raise_2.5bb'), 'old action name must not exist');

    // --- GameState and street history tests ---
    const h2 = applyHeroAction(h0, 'raise');
    console.assert(h2.gameState.streetState.actions.length === 1,
        'preflop action not recorded in streetState');
    console.assert(h2.gameState.streetState.committedBB['BTN'] > 0,
        'hero committedBB not updated');

    const h3 = applyVillainAction(h2);
    console.assert(h3.gameState.streetState.actions.length === 2,
        'villain action not recorded');

    // Construct a known street_advance state for deterministic advanceStreet test
    const h3adv = _deepCopy(h2);
    h3adv.gameState.streetState.actions.push({ seatLabel: 'BB', action: 'call', sizingBB: 2.5 });
    h3adv.gameState.streetState.committedBB['BB'] = 2.5;
    h3adv.nodeType = 'street_advance';

    const h4 = advanceStreet(h3adv);
    console.assert(h4.gameState.streetHistory.preflop.length >= 2,
        'preflop history not copied on advanceStreet');
    console.assert(h4.gameState.streetState.actions.length === 0,
        'streetState.actions not reset on advanceStreet');
    console.assert(h4.gameState.streetState.committedBB['BTN'] === 0,
        'committedBB not reset on advanceStreet');
    console.assert(h4.gameState.potBB > 0,
        'potBB not set on flop transition');
    console.assert(h4.gameState.streetState.street === 'flop',
        'street not advanced to flop');
    console.assert(h4.gameState.board.length === 3,
        'flop board cards not dealt');
    console.assert(h4.street === 'flop',
        'top-level street mirror not updated');

    // --- Board stability test — board must never regenerate mid-hand ---
    const boardAfterFlop = h4.gameState.board.map(c => c.rank + c.suit);
    const h5 = applyVillainAction(h4);
    const boardAfterVillain = h5.gameState.board.slice(0, 3).map(c => c.rank + c.suit);
    console.assert(
        JSON.stringify(boardAfterVillain) === JSON.stringify(boardAfterFlop),
        'CRITICAL: board regenerated after villain action — gameState.board must be stable'
    );

    // --- Player line test ---
    const line = getPlayerLine(h4, 'BTN');
    console.assert(line.preflop && line.preflop.includes('raise'),
        'getPlayerLine not reading streetHistory correctly');

    // --- Lane expansion tests ---
    const lanesOK = SIM_SUPPORTED_LANES.every(function(l) {
        try { const h = createHandRun({ lane: l }); return !!h.gameState; }
        catch(e) { console.error('Lane failed:', l, e.message); return false; }
    });
    console.assert(lanesOK, 'Not all supported lanes initialize correctly');

    // --- BB defense OOP test ---
    const hBB = createHandRun({ lane: 'BB_vs_BTN_SRP' });
    console.assert(!_heroIsIP(hBB), 'BB hero should be OOP');
    console.assert(hBB.seats[hBB.heroSeatIndex].label === 'BB', 'Hero should be BB seat');
    console.assert(hBB.nodeType === 'villain_response', 'BB_vs_BTN should start with villain_response');

    // --- River generator test ---
    const mockGameState = {
        streetHistory: {
            flop: [
                { seatLabel: 'BTN', action: 'bet', sizingBB: 1 },
                { seatLabel: 'BB', action: 'call', sizingBB: 1 }
            ],
            turn: [
                { seatLabel: 'BB', action: 'check', sizingBB: 0 },
                { seatLabel: 'BTN', action: 'check', sizingBB: 0 }
            ]
        }
    };
    console.assert(
        _simResolveRiverGenerator(mockGameState, 'BTN', 'BB') === 'generateRiverTurnCheckCBetSpot',
        'River generator not resolving correctly from street history'
    );

    // --- River street transition test ---
    const h4r = _deepCopy(h4);
    // Simulate BB check, BTN bet on flop → street_advance
    h4r.gameState.streetState.actions = [
        { seatLabel: 'BB', action: 'check', sizingBB: 0 },
        { seatLabel: 'BTN', action: 'bet', sizingBB: 2 },
        { seatLabel: 'BB', action: 'call', sizingBB: 2 }
    ];
    h4r.gameState.streetState.committedBB['BTN'] = 2;
    h4r.gameState.streetState.committedBB['BB'] = 2;
    h4r.gameState.streetState.betMadeThisStreet = true;
    h4r.nodeType = 'street_advance';
    const h4t = advanceStreet(h4r);
    console.assert(h4t.street === 'turn', 'Should advance to turn');
    console.assert(h4t.gameState.board.length === 4, 'Turn card should be dealt');

    const h4tadv = _deepCopy(h4t);
    h4tadv.gameState.streetState.actions = [
        { seatLabel: 'BB', action: 'check', sizingBB: 0 },
        { seatLabel: 'BTN', action: 'bet', sizingBB: 3 },
        { seatLabel: 'BB', action: 'call', sizingBB: 3 }
    ];
    h4tadv.gameState.streetState.committedBB['BTN'] = 3;
    h4tadv.gameState.streetState.committedBB['BB'] = 3;
    h4tadv.gameState.streetState.betMadeThisStreet = true;
    h4tadv.nodeType = 'street_advance';
    const h4rv = advanceStreet(h4tadv);
    console.assert(h4rv.street === 'river', 'Should advance to river');
    console.assert(h4rv.gameState.board.length === 5, 'River card should be dealt');

    console.log('GameState self-test passed');
    console.log('Pass 3 self-test passed');
    console.log('sim.js self-test passed');

    // EXTENSION Pass 3.5: sizing buckets — hero chooses small/medium/large before bet action
    // EXTENSION Pass 4: villain archetypes replace range-weighted sampling
    // EXTENSION Pass 4: add 3BP lanes (BTN_3BP_vs_CO, BB_3BP_vs_BTN etc.)
    // EXTENSION Pass 5: populate remaining seats for full 9-max multiway
}
