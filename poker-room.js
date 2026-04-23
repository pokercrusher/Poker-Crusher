// poker-room.js — Pass 1: Core Poker Room Engine
// No UI. Fully testable in isolation.
// All public functions prefixed PR_.
//
// Depends on (browser globals):
//   ranges.js  : evaluateRawHand, classifyFlopHand, classifyTurnHand, classifyRiverHand,
//                checkRangeHelper, RANKS, RANK_NUM
//   sim.js     : _freshDeck, _shuffle, _dealBoardCards, _cardsToHandNotation,
//                _buildCommittedBB, _deepCopy, _resolveVillainPreflopAction,
//                FULL_TABLE_POSITIONS
//   engine.js  : computeCorrectAction

'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PR_POSITIONS = FULL_TABLE_POSITIONS; // ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB','BB']

// Postflop action order: OOP first (left of dealer), IP last (BTN)
const PR_POSTFLOP_ORDER = ['SB', 'BB', 'UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN'];

const PR_STAKE_CONFIG = {
    '1/2':  { sb: 1,  bb: 2,  minBuy: 100,  maxBuy: 300  },
    '1/3':  { sb: 1,  bb: 3,  minBuy: 100,  maxBuy: 500  },
    '2/5':  { sb: 2,  bb: 5,  minBuy: 200,  maxBuy: 1000 },
    '5/10': { sb: 5,  bb: 10, minBuy: 500,  maxBuy: 2000 },
};

// Per-archetype postflop frequency tables, keyed by hand-strength tier.
//   bet       : frequency to lead / c-bet when first to act with no prior bet
//   callVsBet : frequency to call when facing a bet (remainder folds)
//   raiseVsBet: frequency to raise when facing a bet (comes out of the call budget)
// Hard constraint: strong/nut tiers never fold to a single bet (callVsBet ≥ 0.90).
const PR_ARCHETYPE_POSTFLOP = {
    NIT: {
        NUT_VALUE: { bet: 0.45, callVsBet: 0.95, raiseVsBet: 0.25 },
        STRONG:    { bet: 0.35, callVsBet: 0.90, raiseVsBet: 0.15 },
        MEDIUM:    { bet: 0.25, callVsBet: 0.72, raiseVsBet: 0.04 },
        THIN:      { bet: 0.10, callVsBet: 0.32, raiseVsBet: 0.02 },
        WEAK:      { bet: 0.05, callVsBet: 0.08, raiseVsBet: 0.01 },
        DRAW:      { bet: 0.12, callVsBet: 0.45, raiseVsBet: 0.04 },
    },
    TAG: {
        NUT_VALUE: { bet: 0.60, callVsBet: 0.97, raiseVsBet: 0.40 },
        STRONG:    { bet: 0.55, callVsBet: 0.93, raiseVsBet: 0.28 },
        MEDIUM:    { bet: 0.42, callVsBet: 0.80, raiseVsBet: 0.10 },
        THIN:      { bet: 0.22, callVsBet: 0.48, raiseVsBet: 0.05 },
        WEAK:      { bet: 0.18, callVsBet: 0.18, raiseVsBet: 0.04 },
        DRAW:      { bet: 0.28, callVsBet: 0.55, raiseVsBet: 0.09 },
    },
    LAG: {
        NUT_VALUE: { bet: 0.78, callVsBet: 0.98, raiseVsBet: 0.55 },
        STRONG:    { bet: 0.72, callVsBet: 0.95, raiseVsBet: 0.45 },
        MEDIUM:    { bet: 0.62, callVsBet: 0.88, raiseVsBet: 0.20 },
        THIN:      { bet: 0.42, callVsBet: 0.65, raiseVsBet: 0.12 },
        WEAK:      { bet: 0.38, callVsBet: 0.35, raiseVsBet: 0.08 },
        DRAW:      { bet: 0.52, callVsBet: 0.65, raiseVsBet: 0.15 },
    },
    FISH: {
        NUT_VALUE: { bet: 0.38, callVsBet: 0.99, raiseVsBet: 0.08 },
        STRONG:    { bet: 0.32, callVsBet: 0.97, raiseVsBet: 0.06 },
        MEDIUM:    { bet: 0.22, callVsBet: 0.90, raiseVsBet: 0.04 },
        THIN:      { bet: 0.14, callVsBet: 0.78, raiseVsBet: 0.02 },
        WEAK:      { bet: 0.08, callVsBet: 0.62, raiseVsBet: 0.01 },
        DRAW:      { bet: 0.14, callVsBet: 0.72, raiseVsBet: 0.02 },
    },
    MANIAC: {
        NUT_VALUE: { bet: 0.90, callVsBet: 0.99, raiseVsBet: 0.70 },
        STRONG:    { bet: 0.85, callVsBet: 0.97, raiseVsBet: 0.60 },
        MEDIUM:    { bet: 0.76, callVsBet: 0.90, raiseVsBet: 0.35 },
        THIN:      { bet: 0.62, callVsBet: 0.75, raiseVsBet: 0.25 },
        WEAK:      { bet: 0.55, callVsBet: 0.50, raiseVsBet: 0.15 },
        DRAW:      { bet: 0.65, callVsBet: 0.75, raiseVsBet: 0.20 },
    },
    AGGRO: {
        NUT_VALUE: { bet: 0.72, callVsBet: 0.98, raiseVsBet: 0.65 },
        STRONG:    { bet: 0.68, callVsBet: 0.95, raiseVsBet: 0.55 },
        MEDIUM:    { bet: 0.58, callVsBet: 0.85, raiseVsBet: 0.25 },
        THIN:      { bet: 0.38, callVsBet: 0.58, raiseVsBet: 0.15 },
        WEAK:      { bet: 0.32, callVsBet: 0.28, raiseVsBet: 0.10 },
        DRAW:      { bet: 0.45, callVsBet: 0.62, raiseVsBet: 0.12 },
    },
    GTO: {
        NUT_VALUE: { bet: 0.60, callVsBet: 0.97, raiseVsBet: 0.40 },
        STRONG:    { bet: 0.55, callVsBet: 0.93, raiseVsBet: 0.32 },
        MEDIUM:    { bet: 0.45, callVsBet: 0.82, raiseVsBet: 0.12 },
        THIN:      { bet: 0.25, callVsBet: 0.52, raiseVsBet: 0.07 },
        WEAK:      { bet: 0.20, callVsBet: 0.22, raiseVsBet: 0.05 },
        DRAW:      { bet: 0.30, callVsBet: 0.60, raiseVsBet: 0.09 },
    },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Map a hand class string (from classifyFlopHand/Turn/River) to a postflop AI tier
function _PR_handClassToTier(handClass) {
    if (!handClass) return 'WEAK';
    if (['STRAIGHT_FLUSH', 'QUADS', 'FULL_HOUSE', 'FLUSH', 'STRAIGHT'].includes(handClass)) return 'NUT_VALUE';
    if (['SET', 'TWO_PAIR', 'TRIPS', 'BOARD_TRIPS'].includes(handClass)) return 'STRONG';
    if (['OVERPAIR', 'TOP_PAIR', 'TPTK', 'TOP_PAIR_TOP_KICKER'].includes(handClass)) return 'MEDIUM';
    if (['SECOND_PAIR', 'THIRD_PAIR', 'MIDDLE_PAIR', 'BOTTOM_PAIR', 'UNDERPAIR'].includes(handClass)) return 'THIN';
    if (['OESD', 'FD', 'NFD', 'COMBO_DRAW', 'GUTSHOT', 'DOUBLE_GUTSHOT', 'BACKDOOR_FD'].includes(handClass)) return 'DRAW';
    return 'WEAK'; // AIR, OVERCARDS, HIGH_CARD, ACE_HIGH, etc.
}

// Classify a seat's hand on the current street; returns a PR tier string
function _PR_seatHandTier(seat, prHand) {
    const board = prHand.gameState.board;
    const street = prHand.gameState.street;
    const heroHand = { cards: seat.holeCards };

    let handClass;
    if (street === 'flop' && board.length >= 3) {
        handClass = classifyFlopHand(heroHand, board.slice(0, 3));
    } else if (street === 'turn' && board.length >= 4) {
        handClass = classifyTurnHand(heroHand, board.slice(0, 3), board[3]);
    } else if (street === 'river' && board.length >= 5) {
        handClass = classifyRiverHand(heroHand, board.slice(0, 3), board[3], board[4]);
    } else {
        handClass = 'AIR';
    }
    return _PR_handClassToTier(handClass);
}

// Return the amount currently facing a player (what they'd need to call)
function _PR_facingAmount(prHand, seatLabel) {
    const ss = prHand.gameState.streetState;
    const maxCommitted = Math.max(0, ...Object.values(ss.committedBB));
    const myCommitted = ss.committedBB[seatLabel] || 0;
    return parseFloat((maxCommitted - myCommitted).toFixed(2));
}

// Build the action order array for the current street, filtered to active (non-folded, non-allIn) seats
function _PR_actionOrder(prHand) {
    const street = prHand.gameState.street;
    const activeLabels = new Set(
        prHand.seats.filter(s => s !== null && !s.folded && !s.allIn).map(s => s.label)
    );
    const base = street === 'preflop' ? PR_POSITIONS : PR_POSTFLOP_ORDER;
    return base.filter(l => activeLabels.has(l));
}

// Determine the label of the seat that should act next. Returns null if the street is complete.
function _PR_nextActor(prHand) {
    const ss = prHand.gameState.streetState;
    const order = _PR_actionOrder(prHand);
    if (order.length <= 1) return null;

    if (!ss.betMadeThisStreet) {
        // No bet yet: first seat that hasn't acted this round
        const acted = new Set(ss.actions.map(a => a.seatLabel));
        return order.find(l => !acted.has(l)) || null;
    }

    // Bet/raise exists: find last aggressor, then first seat after them that hasn't responded
    let lastAggrIdx = -1;
    for (let i = ss.actions.length - 1; i >= 0; i--) {
        if (['bet', 'raise', '3bet', '4bet'].includes(ss.actions[i].action)) {
            lastAggrIdx = i;
            break;
        }
    }
    if (lastAggrIdx === -1) return null;

    const aggrLabel = ss.actions[lastAggrIdx].seatLabel;
    const respondedAfterAggr = new Set(
        ss.actions.slice(lastAggrIdx + 1).map(a => a.seatLabel)
    );
    const aggrOrderPos = order.indexOf(aggrLabel);

    for (let i = 1; i < order.length; i++) {
        const label = order[(aggrOrderPos + i) % order.length];
        if (label === aggrLabel) break; // wrapped all the way back
        if (!respondedAfterAggr.has(label)) return label;
    }
    return null; // everyone has responded
}

// Apply a resolved action to prHand state (mutates in place — caller deep-copies first)
function _PR_applyAction(prHand, seatLabel, action, sizingBB) {
    const seat = prHand.seats.find(s => s !== null && s.label === seatLabel);
    const ss = prHand.gameState.streetState;

    ss.actions.push({ seatLabel, action, sizingBB });

    if (['bet', 'raise', '3bet', '4bet'].includes(action)) {
        ss.betMadeThisStreet = true;
    }
    if (sizingBB > 0) {
        ss.committedBB[seatLabel] = parseFloat(((ss.committedBB[seatLabel] || 0) + sizingBB).toFixed(2));
        if (seat) seat.stackBB = parseFloat((seat.stackBB - sizingBB).toFixed(2));
    }
    if (action === 'fold' && seat) {
        seat.folded = true;
    }
    if (action === 'allin' && seat) {
        seat.allIn = true;
    }
}

// ---------------------------------------------------------------------------
// PR_createHand
// config: {
//   heroPos:       string   (label from PR_POSITIONS, e.g. 'BTN')
//   seats:         Array<{ label, type, name, stackBB } | null>  length 9, hero identified by label
//   heroStackBB:   number
//   openSizeBB:    number   default 2.5
// }
// ---------------------------------------------------------------------------
function PR_createHand(config) {
    const heroPos     = config.heroPos;
    const openSizeBB  = config.openSizeBB || 2.5;
    const heroStackBB = config.heroStackBB || 100;

    // Build normalized seats array — index = position order, value = seat or null
    const seats = PR_POSITIONS.map(function(pos) {
        const cfg = config.seats && config.seats.find(function(s) { return s && s.label === pos; });
        if (!cfg) return null;
        return {
            index:        PR_POSITIONS.indexOf(pos),
            label:        pos,
            isHero:       pos === heroPos,
            type:         cfg.type || 'GTO',
            name:         cfg.name || pos,
            stackBB:      pos === heroPos ? heroStackBB : (cfg.stackBB || 100),
            holeCards:    null,
            handNotation: null,
            folded:        false,
            allIn:         false,
        };
    });

    const heroSeatIndex = PR_POSITIONS.indexOf(heroPos);

    // Deal hole cards: build a full deck, exclude nothing yet, deal 2 cards per active seat
    const activeSeatIndices = seats
        .map(function(s, i) { return s ? i : -1; })
        .filter(function(i) { return i >= 0; });

    // Build the exclude set and deck fresh
    const deck = _shuffle(_freshDeck());
    let deckIdx = 0;
    const cardSet = new Set();

    // Deal in position order (UTG first, then UTG1, etc.) per spec
    activeSeatIndices.forEach(function(i) {
        const c1 = deck[deckIdx++];
        const c2 = deck[deckIdx++];
        seats[i].holeCards    = [{ rank: c1[0], suit: c1[1] }, { rank: c2[0], suit: c2[1] }];
        seats[i].handNotation = _cardsToHandNotation([c1, c2]);
        cardSet.add(c1);
        cardSet.add(c2);
    });

    // Initial committedBB: blinds pre-committed (SB = 0.5, BB = 1.0)
    const initCommitted = {};
    seats.forEach(function(s) {
        if (!s) return;
        initCommitted[s.label] = 0;
    });
    if (initCommitted['SB'] !== undefined) initCommitted['SB'] = 0.5;
    if (initCommitted['BB'] !== undefined) initCommitted['BB'] = 1.0;

    // Deduct blind amounts from stacks
    const sbSeat = seats.find(function(s) { return s && s.label === 'SB'; });
    const bbSeat = seats.find(function(s) { return s && s.label === 'BB'; });
    if (sbSeat) sbSeat.stackBB = parseFloat((sbSeat.stackBB - 0.5).toFixed(2));
    if (bbSeat) bbSeat.stackBB = parseFloat((bbSeat.stackBB - 1.0).toFixed(2));

    const prHand = {
        id:             'pr_' + Date.now(),
        seats:          seats,
        heroSeatIndex:  heroSeatIndex,
        gameState: {
            potBB:  0,
            board:  [],
            street: 'preflop',
            streetState: {
                street:            'preflop',
                betMadeThisStreet: true,  // BB's blind is the opening bet
                actions:           [],
                committedBB:       initCommitted,
            },
            streetHistory: { preflop: [], flop: [], turn: [], river: [] },
        },
        openSizeBB:   openSizeBB,
        heroGrades:   [],
        heroFolded:   false,
        terminal:     false,
        outcome:      null,
        _dealtCards:  Array.from(cardSet),  // for board dealing exclusion
    };

    return prHand;
}

// ---------------------------------------------------------------------------
// PR_runPreflopToHero — simulate villain actions until hero's turn
// Mutates prHand's gameState. Returns prHand.
// ---------------------------------------------------------------------------
function PR_runPreflopToHero(prHand) {
    const heroLabel = prHand.seats[prHand.heroSeatIndex].label;
    const heroOrderIdx = PR_POSITIONS.indexOf(heroLabel);

    // Build preflop tableState for _resolveVillainPreflopAction
    const openSizeBB = prHand.openSizeBB || 2.5;
    const tableState = {
        opener:      null,
        callers:     [],
        threeBettor: null,
        limpers:     [],
        openSizeBB:  openSizeBB,
    };

    // Simulate each position before hero in preflop order
    for (let i = 0; i < heroOrderIdx; i++) {
        const seat = prHand.seats[i];
        if (!seat) continue;

        const result = PR_resolveVillainPreflopAction(seat, tableState, seat.type);
        const sizingBB = result.sizingBB || 0;

        switch (result.action) {
            case 'raise':
                tableState.opener  = seat.label;
                tableState.limpers = [];
                _PR_applyAction(prHand, seat.label, 'raise', sizingBB);
                break;
            case '3bet':
                tableState.threeBettor = seat.label;
                _PR_applyAction(prHand, seat.label, '3bet', sizingBB);
                break;
            case 'call':
                tableState.callers.push(seat.label);
                _PR_applyAction(prHand, seat.label, 'call', sizingBB);
                break;
            case 'limp':
                tableState.limpers.push(seat.label);
                _PR_applyAction(prHand, seat.label, 'limp', 1);
                break;
            default:
                _PR_applyAction(prHand, seat.label, 'fold', 0);
                break;
        }
    }

    // Store preflop table context for UI display
    prHand.preflopContext = {
        heroPos:      heroLabel,
        opener:       tableState.opener,
        threeBettor:  tableState.threeBettor,
        callers:      tableState.callers.slice(),
        limpers:      tableState.limpers.slice(),
        potStructure: tableState.threeBettor ? '3BP' : (tableState.limpers.length > 0 ? 'LIMP_POT' : 'SRP'),
    };
    prHand._preflopTableState = tableState; // carried through for post-hero Phase 2

    return prHand;
}

// ---------------------------------------------------------------------------
// PR_resolveVillainPreflopAction — delegate to sim.js, stub for Pass 2 archetypes
// ---------------------------------------------------------------------------
function PR_resolveVillainPreflopAction(seat, tableState, playerType) {
    return _resolveVillainPreflopAction(seat, tableState, playerType || 'GTO');
}

// ---------------------------------------------------------------------------
// PR_applyHeroAction — record hero's action, grade it, run Phase 2 preflop if needed
// action: 'fold' | 'call' | 'raise' | '3bet' | 'check'
// sizingBB: amount (0 for fold/check)
// Returns updated prHand.
// ---------------------------------------------------------------------------
function PR_applyHeroAction(prHand, action, sizingBB) {
    const hr = _deepCopy(prHand);
    const heroSeat = hr.seats[hr.heroSeatIndex];
    const heroLabel = heroSeat.label;
    const ss = hr.gameState.streetState;
    const street = ss.street;

    // Derive sizing if not provided
    let sizing = sizingBB || 0;
    if (action === 'raise' && street === 'preflop' && !sizingBB) {
        sizing = hr.openSizeBB || 2.5;
    } else if (action === 'call' && !sizingBB) {
        sizing = _PR_facingAmount(hr, heroLabel);
    }

    _PR_applyAction(hr, heroLabel, action, sizing);

    // Grade the hero's decision
    const grade = PR_gradeHeroAction(prHand, action, sizing); // grade before applying
    hr.heroGrades.push({ street, action, sizingBB: sizing, grade: grade.grade, explanation: grade.explanation });

    if (action === 'fold') {
        hr.heroFolded = true;
        if (street === 'preflop') {
            // Complete Phase 2 preflop even after hero folds so table action is accurate
            _PR_finishPreflopPhase2(hr, action, sizing);
        }
        hr.terminal = !_PR_hasMultipleActive(hr); // terminal only if nobody else can contest
        // Allow spectator mode: not terminal if other players still active
        return hr;
    }

    // Preflop Phase 2: run remaining positions after hero
    if (street === 'preflop' && hr._preflopTableState) {
        _PR_finishPreflopPhase2(hr, action, sizing);
    }

    hr.gameState.street = hr.gameState.streetState.street;
    return hr;
}

// Run villain positions after hero in preflop order (Phase 2), then clean up
function _PR_finishPreflopPhase2(hr, heroAction, heroSizingBB) {
    const tableState   = hr._preflopTableState;
    const heroLabel    = hr.seats[hr.heroSeatIndex].label;
    const heroOrderIdx = PR_POSITIONS.indexOf(heroLabel);
    const openSizeBB   = hr.openSizeBB || 2.5;

    // Reflect hero's action in tableState
    if (heroAction === 'raise')       { tableState.opener = heroLabel; tableState.limpers = []; }
    else if (heroAction === '3bet')   { tableState.threeBettor = heroLabel; }
    else if (heroAction === 'call')   { tableState.callers.push(heroLabel); }
    else if (heroAction === 'limp')   { tableState.limpers.push(heroLabel); }

    if (heroAction !== 'fold') {
        for (let i = heroOrderIdx + 1; i < PR_POSITIONS.length; i++) {
            const seat = hr.seats[i];
            if (!seat) continue;
            let result = PR_resolveVillainPreflopAction(seat, tableState, seat.type);
            // If villain would 3-bet behind hero's open, cap at fold — hero can't re-act in this pass
            if (result.action === '3bet' && tableState.opener === heroLabel) {
                result = { action: 'fold', sizingBB: 0 };
            }
            switch (result.action) {
                case 'raise':
                    tableState.opener  = seat.label;
                    tableState.limpers = [];
                    _PR_applyAction(hr, seat.label, 'raise', result.sizingBB);
                    break;
                case '3bet':
                    tableState.threeBettor = seat.label;
                    _PR_applyAction(hr, seat.label, '3bet', result.sizingBB);
                    break;
                case 'call':
                    tableState.callers.push(seat.label);
                    _PR_applyAction(hr, seat.label, 'call', result.sizingBB);
                    break;
                case 'limp':
                    tableState.limpers.push(seat.label);
                    _PR_applyAction(hr, seat.label, 'limp', 1);
                    break;
                default:
                    _PR_applyAction(hr, seat.label, 'fold', 0);
                    break;
            }
        }
    }

    // Update preflopContext with full picture
    hr.preflopContext = {
        heroPos:      heroLabel,
        opener:       tableState.opener,
        threeBettor:  tableState.threeBettor,
        callers:      tableState.callers.slice(),
        limpers:      tableState.limpers.slice(),
        potStructure: tableState.threeBettor ? '3BP' : (tableState.limpers.length > 0 ? 'LIMP_POT' : 'SRP'),
        tableActions: hr.gameState.streetState.actions.map(function(a) {
            return { seatLabel: a.seatLabel, action: a.action };
        }),
    };

    delete hr._preflopTableState;
}

// ---------------------------------------------------------------------------
// PR_applyVillainAction — advance one villain action for the current actor.
// Returns updated prHand; caller loops until PR_isStreetComplete or hero's turn.
// ---------------------------------------------------------------------------
function PR_applyVillainAction(prHand) {
    const hr = _deepCopy(prHand);
    const nextLabel = _PR_nextActor(hr);
    if (!nextLabel) return hr; // nothing to do
    if (nextLabel === hr.seats[hr.heroSeatIndex].label) return hr; // hero's turn

    const seat = hr.seats.find(s => s !== null && s.label === nextLabel);
    if (!seat) return hr;

    const street = hr.gameState.street;
    let action, sizing;

    if (street === 'preflop') {
        // Shouldn't reach here for preflop (PR_runPreflopToHero handles pre-hero;
        // _PR_finishPreflopPhase2 handles post-hero). Defensive fallback.
        action  = 'fold';
        sizing  = 0;
    } else {
        const result = PR_resolveVillainPostflopAction(seat, hr);
        action  = result.action;
        sizing  = result.sizingBB || 0;
    }

    _PR_applyAction(hr, nextLabel, action, sizing);
    hr.gameState.street = hr.gameState.streetState.street;
    return hr;
}

// ---------------------------------------------------------------------------
// PR_resolveVillainPostflopAction — hand-strength-gated + archetype freq postflop AI
// Returns { action, sizingBB }
// ---------------------------------------------------------------------------
function PR_resolveVillainPostflopAction(seat, prHand) {
    const ss    = prHand.gameState.streetState;
    const type  = seat.type || 'GTO';
    const freqs = (PR_ARCHETYPE_POSTFLOP[type] || PR_ARCHETYPE_POSTFLOP.GTO);

    const tier  = _PR_seatHandTier(seat, prHand);
    const freq  = freqs[tier] || freqs.WEAK;

    const facing = _PR_facingAmount(prHand, seat.label); // amount to call
    const potBB  = prHand.gameState.potBB + Object.values(ss.committedBB).reduce((a, v) => a + v, 0);
    const betSizing = parseFloat((potBB * 0.65).toFixed(1)) || 1;
    const raiseSizing = parseFloat((facing * 2.5).toFixed(1)) || 2;

    if (facing > 0) {
        // Facing a bet or raise
        const r = Math.random();
        if (r < freq.raiseVsBet) {
            return { action: 'raise', sizingBB: raiseSizing };
        }
        if (r < freq.callVsBet) {
            return { action: 'call', sizingBB: facing };
        }
        return { action: 'fold', sizingBB: 0 };
    }

    // No bet yet: bet or check
    if (Math.random() < freq.bet) {
        return { action: 'bet', sizingBB: betSizing };
    }
    return { action: 'check', sizingBB: 0 };
}

// ---------------------------------------------------------------------------
// PR_isStreetComplete — true when all active players have resolved for this street
// ---------------------------------------------------------------------------
function PR_isStreetComplete(prHand) {
    return _PR_nextActor(prHand) === null;
}

// ---------------------------------------------------------------------------
// PR_advanceStreet — flush current street, deal board cards, reset streetState
// Returns updated prHand (or terminal if river is done).
// ---------------------------------------------------------------------------
function PR_advanceStreet(prHand) {
    const hr = _deepCopy(prHand);
    const gs = hr.gameState;
    const ss = gs.streetState;

    // Archive this street's actions
    gs.streetHistory[ss.street] = ss.actions.slice();

    // Add committed chips to pot
    const streetCommitted = Object.values(ss.committedBB).reduce((a, v) => a + v, 0);
    gs.potBB = parseFloat((gs.potBB + streetCommitted).toFixed(2));

    // Determine next street
    const streetOrder = ['preflop', 'flop', 'turn', 'river'];
    const idx         = streetOrder.indexOf(ss.street);
    const nextStreet  = streetOrder[idx + 1] || 'showdown';

    if (nextStreet === 'showdown') {
        gs.street = 'showdown';
        hr.terminal = true;
        PR_evalShowdown(hr);
        return hr;
    }

    // Deal board cards
    if (nextStreet === 'flop') {
        const cards = _PR_dealBoardCards(hr, 3);
        for (const c of cards) gs.board.push(c);
    } else if (nextStreet === 'turn' || nextStreet === 'river') {
        const cards = _PR_dealBoardCards(hr, 1);
        gs.board.push(cards[0]);
    }

    // Check for immediate terminal (only one active player left)
    if (!_PR_hasMultipleActive(hr)) {
        hr.terminal = true;
        PR_resolveOutcome(hr);
        return hr;
    }

    // Build fresh committedBB for remaining active seats
    const freshCommitted = {};
    hr.seats.forEach(function(s) {
        if (s && !s.folded && !s.allIn) freshCommitted[s.label] = 0;
    });

    gs.streetState = {
        street:            nextStreet,
        betMadeThisStreet: false,
        actions:           [],
        committedBB:       freshCommitted,
    };
    gs.street = nextStreet;
    hr.gameState.street = nextStreet;

    return hr;
}

// Deal N board cards, excluding already-dealt hole cards and existing board cards
function _PR_dealBoardCards(prHand, n) {
    const exclude = new Set();
    prHand.seats.forEach(function(s) {
        if (!s || !s.holeCards) return;
        s.holeCards.forEach(function(c) { exclude.add(c.rank + c.suit); });
    });
    prHand.gameState.board.forEach(function(c) { exclude.add(c.rank + c.suit); });
    const deck    = _freshDeck().filter(function(c) { return !exclude.has(c); });
    const shuffled = _shuffle(deck);
    return shuffled.slice(0, n).map(function(c) { return { rank: c[0], suit: c[1] }; });
}

// Check that at least 2 active (non-folded) players remain
function _PR_hasMultipleActive(prHand) {
    const active = prHand.seats.filter(s => s !== null && !s.folded);
    return active.length >= 2;
}

// ---------------------------------------------------------------------------
// PR_evalBestHand — evaluate a seat's best 5-card hand
// Returns { rank, label, tiebreaker } where tiebreaker is max hole card rank num
// ---------------------------------------------------------------------------
function PR_evalBestHand(holeCards, board) {
    const raw  = evaluateRawHand(holeCards, board);
    const hRanks = holeCards.map(c => RANK_NUM[c.rank]);
    return {
        rank:        raw.rank,
        label:       raw.label,
        tiebreaker:  Math.max(...hRanks),
    };
}

// ---------------------------------------------------------------------------
// PR_evalShowdown — evaluate all remaining hands, build side pots, assign winners
// Applies muck rules. Mutates prHand.outcome in place.
// ---------------------------------------------------------------------------
function PR_evalShowdown(prHand) {
    const board       = prHand.gameState.board;
    const activeSeat  = prHand.seats.filter(s => s !== null && !s.folded);

    if (activeSeat.length === 0) {
        prHand.outcome = { winners: [], pots: [], mucked: [], showdown: [] };
        return;
    }

    // Evaluate each active hand
    const evals = activeSeat.map(function(s) {
        const best = PR_evalBestHand(s.holeCards, board);
        return { label: s.label, seat: s, ...best };
    });

    // Determine last aggressor (must show); everyone else can muck unless called
    const allActions = Object.values(prHand.gameState.streetHistory)
        .flat()
        .concat(prHand.gameState.streetState.actions);
    const lastAggrAction = [...allActions].reverse()
        .find(a => ['bet', 'raise', '3bet', '4bet'].includes(a.action));
    const lastAggrLabel = lastAggrAction ? lastAggrAction.seatLabel : null;

    // Build side pots from all-in players
    // Collect total committed per seat across all streets
    const totalCommitted = {};
    prHand.seats.forEach(function(s) {
        if (!s) return;
        let total = 0;
        Object.values(prHand.gameState.streetHistory).forEach(function(actions) {
            actions.filter(a => a.seatLabel === s.label)
                   .forEach(function(a) { total += (a.sizingBB || 0); });
        });
        // Include current street
        prHand.gameState.streetState.actions
            .filter(a => a.seatLabel === s.label)
            .forEach(function(a) { total += (a.sizingBB || 0); });
        totalCommitted[s.label] = parseFloat(total.toFixed(2));
    });
    // Add blind amounts
    if (totalCommitted['SB'] !== undefined) totalCommitted['SB'] = parseFloat((totalCommitted['SB'] + 0.5).toFixed(2));
    if (totalCommitted['BB'] !== undefined) totalCommitted['BB'] = parseFloat((totalCommitted['BB'] + 1.0).toFixed(2));

    const pots = _PR_buildSidePots(activeSeat, totalCommitted, prHand.seats);

    // Award each pot to the best hand among eligible players
    const potResults = pots.map(function(pot) {
        const eligible = evals.filter(e => pot.eligible.includes(e.label));
        if (eligible.length === 0) return { ...pot, winners: [] };

        const bestRank = Math.max(...eligible.map(e => e.rank));
        const bestHands = eligible.filter(e => e.rank === bestRank);
        const bestTie   = Math.max(...bestHands.map(e => e.tiebreaker));
        const winners   = bestHands.filter(e => e.tiebreaker === bestTie).map(e => e.label);
        const share     = parseFloat((pot.amount / winners.length).toFixed(2));
        return { ...pot, winners, share };
    });

    // Muck logic: called hands must show; uncalled hands can muck
    // Simplification: all-in players and called players show; uncalled folders are already marked folded
    const mustShow = new Set();
    if (lastAggrLabel) mustShow.add(lastAggrLabel);
    potResults.forEach(function(pot) {
        pot.winners.forEach(function(l) { mustShow.add(l); });
    });
    const showdown = evals.map(function(e) {
        return { label: e.label, holeCards: e.seat.holeCards, rank: e.rank, label: e.label,
                 handLabel: e.label, show: mustShow.has(e.label) };
    });

    // Compute net for hero
    const heroSeat = prHand.seats[prHand.heroSeatIndex];
    const heroLabel = heroSeat ? heroSeat.label : null;
    let heroNet = heroLabel ? -(totalCommitted[heroLabel] || 0) : 0;
    potResults.forEach(function(pot) {
        if (pot.winners && pot.winners.includes(heroLabel)) {
            heroNet = parseFloat((heroNet + pot.share).toFixed(2));
        }
    });

    prHand.outcome = {
        pots:          potResults,
        showdown:      showdown,
        heroNetBB:     heroNet,
        totalCommitted,
    };
}

// Build side pots: for each all-in level, create a pot with eligible players
function _PR_buildSidePots(activeSeats, totalCommitted, allSeats) {
    // Collect every seat (including folded) that contributed chips
    const allContributors = Object.entries(totalCommitted)
        .filter(function([, v]) { return v > 0; })
        .map(function([label, committed]) { return { label, committed }; })
        .sort(function(a, b) { return a.committed - b.committed; });

    if (allContributors.length === 0) return [{ amount: 0, eligible: activeSeats.map(s => s.label) }];

    const allInLabels = new Set(activeSeats.filter(s => s.allIn).map(s => s.label));
    const activeLookup = new Set(activeSeats.map(s => s.label));

    const pots = [];
    let previousCap = 0;

    // Levels defined by all-in amounts
    const caps = [...new Set(
        allContributors
            .filter(c => allInLabels.has(c.label))
            .map(c => c.committed)
    )].sort((a, b) => a - b);

    caps.push(Infinity); // main pot catches the rest

    for (const cap of caps) {
        const level = Math.min(cap, Math.max(...allContributors.map(c => c.committed)));
        const potAmount = allContributors.reduce(function(sum, c) {
            return sum + Math.max(0, Math.min(c.committed, level) - previousCap);
        }, 0);

        if (potAmount <= 0) continue;

        // Players eligible for this pot: must have committed at least up to previousCap + 1
        const eligible = activeSeats
            .filter(s => (totalCommitted[s.label] || 0) > previousCap)
            .map(s => s.label);

        pots.push({ amount: parseFloat(potAmount.toFixed(2)), eligible });
        previousCap = level;
        if (level >= Math.max(...allContributors.map(c => c.committed))) break;
    }

    // Fallback: single pot if no all-ins
    if (pots.length === 0) {
        const total = allContributors.reduce((s, c) => s + c.committed, 0);
        pots.push({ amount: parseFloat(total.toFixed(2)), eligible: activeSeats.map(s => s.label) });
    }

    return pots;
}

// ---------------------------------------------------------------------------
// PR_runSpectatorStreets — async loop driving remaining action after hero folds
// onAction(prHand, seatLabel, action, sizingBB) called after each villain action
// speedMs controls delay between actions
// ---------------------------------------------------------------------------
async function PR_runSpectatorStreets(prHand, onAction, speedMs) {
    let hr = _deepCopy(prHand);
    const delay = function(ms) { return new Promise(function(res) { setTimeout(res, ms); }); };

    while (!hr.terminal) {
        if (PR_isStreetComplete(hr)) {
            hr = PR_advanceStreet(hr);
            if (hr.terminal) break;
            await delay(speedMs || 700);
            continue;
        }

        const nextLabel = _PR_nextActor(hr);
        if (!nextLabel) break; // safety
        if (nextLabel === hr.seats[hr.heroSeatIndex].label) break; // shouldn't happen in spectator

        const prevHr = hr;
        hr = PR_applyVillainAction(hr);

        // Find what action was just applied
        const ss = hr.gameState.streetState;
        const lastAction = ss.actions[ss.actions.length - 1];
        if (lastAction && onAction) {
            onAction(hr, lastAction.seatLabel, lastAction.action, lastAction.sizingBB);
        }

        if (!_PR_hasMultipleActive(hr)) {
            PR_resolveOutcome(hr);
            hr.terminal = true;
            break;
        }

        await delay(speedMs || 700);
    }

    return hr;
}

// ---------------------------------------------------------------------------
// PR_resolveOutcome — uncontested win (one player left after all others fold)
// ---------------------------------------------------------------------------
function PR_resolveOutcome(prHand) {
    const activeSeats = prHand.seats.filter(s => s !== null && !s.folded);
    const winner = activeSeats.length === 1 ? activeSeats[0] : null;

    const allActions = Object.values(prHand.gameState.streetHistory)
        .flat()
        .concat(prHand.gameState.streetState.actions);

    const totalCommitted = {};
    prHand.seats.forEach(function(s) {
        if (!s) return;
        let total = 0;
        allActions.filter(a => a.seatLabel === s.label)
                  .forEach(function(a) { total += (a.sizingBB || 0); });
        totalCommitted[s.label] = parseFloat(total.toFixed(2));
    });
    if (totalCommitted['SB'] !== undefined) totalCommitted['SB'] = parseFloat((totalCommitted['SB'] + 0.5).toFixed(2));
    if (totalCommitted['BB'] !== undefined) totalCommitted['BB'] = parseFloat((totalCommitted['BB'] + 1.0).toFixed(2));

    const totalPot = Object.values(totalCommitted).reduce((s, v) => s + v, 0);
    const heroSeat = prHand.seats[prHand.heroSeatIndex];
    const heroLabel = heroSeat ? heroSeat.label : null;
    const heroCommitted = totalCommitted[heroLabel] || 0;

    let heroNetBB;
    if (winner && winner.label === heroLabel) {
        heroNetBB = parseFloat((totalPot - heroCommitted).toFixed(2));
    } else {
        heroNetBB = -heroCommitted;
    }

    prHand.outcome = {
        winner:        winner ? winner.label : null,
        pots:          [{ amount: parseFloat(totalPot.toFixed(2)), eligible: activeSeats.map(s => s.label), winners: winner ? [winner.label] : [] }],
        showdown:      [],
        heroNetBB:     parseFloat(heroNetBB.toFixed(2)),
        totalCommitted,
    };
}

// ---------------------------------------------------------------------------
// PR_gradeHeroAction — returns { grade: 'correct'|'mixed'|'error', explanation }
// Preflop: delegates to computeCorrectAction via rfiRanges globals.
// Postflop: equity-based heuristic (no GTO data in Pass 1).
// ---------------------------------------------------------------------------
function PR_gradeHeroAction(prHand, action, sizingBB) {
    const heroSeat = prHand.seats[prHand.heroSeatIndex];
    const ss       = prHand.gameState.streetState;
    const street   = ss.street;

    if (street === 'preflop') {
        return _PR_gradePreflopAction(prHand, action, heroSeat);
    }
    return _PR_gradePostflopAction(prHand, action, heroSeat, sizingBB);
}

function _PR_gradePreflopAction(prHand, heroAction, heroSeat) {
    const hand     = heroSeat.handNotation;
    const heroPos  = heroSeat.label;
    const ss       = prHand.gameState.streetState;

    // Determine scenario from table context
    const ctx = prHand.preflopContext || {};
    let scenario, oppPos;

    if (!ctx.opener && !ctx.threeBettor && ctx.limpers && ctx.limpers.length === 0) {
        scenario = 'RFI';
        oppPos   = 'BB';
    } else if (ctx.opener && !ctx.threeBettor) {
        scenario = 'FACING_RFI';
        oppPos   = ctx.opener;
    } else if (ctx.threeBettor) {
        scenario = 'RFI_VS_3BET';
        oppPos   = ctx.threeBettor;
    } else {
        return { grade: 'mixed', explanation: 'Complex spot — no GTO data available.' };
    }

    // computeCorrectAction expects browser globals (rfiRanges etc.)
    let correctAction;
    try {
        correctAction = computeCorrectAction(hand, scenario, heroPos, oppPos, null);
    } catch (e) {
        return { grade: 'mixed', explanation: 'GTO data unavailable for this spot.' };
    }

    // Map trainer action codes to PR action strings
    const actionMap = { RAISE: 'raise', FOLD: 'fold', CALL: 'call',
                        '3BET': '3bet', '4BET': '4bet', SHOVE: 'raise' };
    const correct = actionMap[correctAction] || correctAction.toLowerCase();

    if (heroAction === correct) {
        return { grade: 'correct', explanation: `${correct.toUpperCase()} is the GTO play in this spot.` };
    }
    if ((correct === 'raise' || correct === '3bet') && (heroAction === 'call')) {
        return { grade: 'mixed', explanation: `GTO prefers ${correct.toUpperCase()}; calling is not a blunder but gives up equity.` };
    }
    return { grade: 'error', explanation: `GTO play is ${correct.toUpperCase()}; ${heroAction.toUpperCase()} is a significant error here.` };
}

function _PR_gradePostflopAction(prHand, heroAction, heroSeat, sizingBB) {
    // Pass 1: lightweight equity-heuristic grading (no POSTFLOP_STRATEGY_V2 for multiway)
    const board   = prHand.gameState.board;
    const ss      = prHand.gameState.streetState;
    const street  = prHand.gameState.street;
    const facing  = _PR_facingAmount(prHand, heroSeat.label);
    const potBB   = prHand.gameState.potBB + Object.values(ss.committedBB).reduce((a, v) => a + v, 0);

    const heroHand = { cards: heroSeat.holeCards };
    let handClass = 'AIR';
    if (street === 'flop' && board.length >= 3) {
        handClass = classifyFlopHand(heroHand, board.slice(0, 3));
    } else if (street === 'turn' && board.length >= 4) {
        handClass = classifyTurnHand(heroHand, board.slice(0, 3), board[3]);
    } else if (street === 'river' && board.length >= 5) {
        handClass = classifyRiverHand(heroHand, board.slice(0, 3), board[3], board[4]);
    }
    const tier = _PR_handClassToTier(handClass);

    if (facing > 0) {
        const potOdds = facing / (potBB + facing);
        if ((tier === 'NUT_VALUE' || tier === 'STRONG') && heroAction === 'fold') {
            return { grade: 'error', explanation: `Folding ${handClass} is a significant error — you have the best of it here.` };
        }
        if (tier === 'WEAK' && heroAction === 'call' && potOdds > 0.4) {
            return { grade: 'error', explanation: `Calling with ${handClass} offers poor pot odds (need ${Math.round(potOdds * 100)}%).` };
        }
        if (tier === 'MEDIUM' && heroAction === 'fold') {
            return { grade: 'mixed', explanation: `Folding ${handClass} is marginal — usually a call or raise here.` };
        }
        return { grade: 'mixed', explanation: `Postflop GTO data not yet available for multiway spots.` };
    }

    // No bet facing
    if ((tier === 'NUT_VALUE' || tier === 'STRONG') && heroAction === 'check') {
        return { grade: 'mixed', explanation: `Checking ${handClass} is fine for deception but GTO usually bets for value.` };
    }
    return { grade: 'mixed', explanation: `Postflop GTO data not yet available for multiway spots.` };
}
