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
    if (lastAggrIdx === -1) {
        // A bet is live but nobody in the log made it — preflop only: the BB's
        // blind. Treat the BB as the implicit aggressor so the street isn't
        // "complete" before anyone has acted. In a limped pot the BB acts last
        // and still gets the option.
        if (prHand.gameState.street !== 'preflop') return null;
        const acted = new Set(ss.actions.map(a => a.seatLabel));
        const nonBB = order.find(l => l !== 'BB' && !acted.has(l));
        if (nonBB) return nonBB;
        if (order.includes('BB') && !acted.has('BB')) return 'BB';
        return null;
    }

    const aggrLabel = ss.actions[lastAggrIdx].seatLabel;
    const respondedAfterAggr = new Set(
        ss.actions.slice(lastAggrIdx + 1).map(a => a.seatLabel)
    );
    const aggrOrderPos = order.indexOf(aggrLabel);

    if (aggrOrderPos === -1) {
        // Aggressor is no longer in the active order (their bet put them
        // all-in). Everyone still active must respond regardless — walking a
        // rotation from index -1 used to skip the last seat, letting a street
        // close with an unmatched bet.
        return order.find(l => !respondedAfterAggr.has(l)) || null;
    }

    for (let i = 1; i < order.length; i++) {
        const label = order[(aggrOrderPos + i) % order.length];
        if (label === aggrLabel) break; // wrapped all the way back
        if (!respondedAfterAggr.has(label)) return label;
    }
    return null; // everyone has responded
}

// ---------------------------------------------------------------------------
// PR_minRaiseTo — the smallest legal "raise to" total for this street.
// NLHE rule: a raise must add at least the size of the last bet/raise
// increment (min-bet 1BB when unopened; preflop's opening increment is the
// 1BB blind). Going all-in for less is always allowed — the stack clamp in
// _PR_applyAction handles that exception.
// ---------------------------------------------------------------------------
function PR_minRaiseTo(prHand, seatLabel) {
    const ss = prHand.gameState.streetState;
    const maxCommitted = Math.max(0, ...Object.values(ss.committedBB));
    const lastRaise = ss.lastRaiseBB || 1; // min-bet 1BB / preflop blind increment
    return parseFloat((maxCommitted + lastRaise).toFixed(2));
}

// ---------------------------------------------------------------------------
// PR_canRaise — TDA short-all-in rule: an all-in wager of less than a full
// raise does not reopen betting. A seat may raise only if it hasn't acted
// this street yet, or a FULL bet/raise (tracked as ss.lastFullRaiseIdx by
// _PR_applyAction) came in after its last action.
// ---------------------------------------------------------------------------
function PR_canRaise(prHand, seatLabel) {
    const ss = prHand.gameState.streetState;
    let lastActIdx = -1;
    ss.actions.forEach(function(a, i) { if (a.seatLabel === seatLabel) lastActIdx = i; });
    if (lastActIdx === -1) return true; // hasn't acted this street
    return typeof ss.lastFullRaiseIdx === 'number' && ss.lastFullRaiseIdx > lastActIdx;
}

// Apply a resolved action to prHand state (mutates in place — caller deep-copies first).
// Single choke point for chip movement: call/limp amounts are derived from the
// facing amount here (resolver-provided sizes ignore blinds already committed),
// aggressive sizings are bumped up to the legal minimum raise, every
// commitment is capped at the remaining stack, and a stack reaching zero
// marks the seat all-in.
function _PR_applyAction(prHand, seatLabel, action, sizingBB) {
    const seat = prHand.seats.find(s => s !== null && s.label === seatLabel);
    const ss = prHand.gameState.streetState;

    // Betting not reopened for this seat (only a short all-in has come in
    // since it last acted) → an attempted raise is illegal and becomes a call.
    if (['bet', 'raise', '3bet', '4bet'].includes(action) &&
        ss.betMadeThisStreet && !PR_canRaise(prHand, seatLabel)) {
        action = 'call';
    }
    const isAggressive = ['bet', 'raise', '3bet', '4bet'].includes(action);

    let sizing = sizingBB || 0;
    if (action === 'call' || action === 'limp') {
        sizing = _PR_facingAmount(prHand, seatLabel);
    }
    if (isAggressive) {
        // Enforce the minimum raise: bump an undersized raise-to up to legal.
        const myCommitted = ss.committedBB[seatLabel] || 0;
        const minTo = PR_minRaiseTo(prHand, seatLabel);
        if (myCommitted + sizing < minTo) {
            sizing = parseFloat((minTo - myCommitted).toFixed(2));
        }
    }
    if (seat && sizing > seat.stackBB) {
        sizing = seat.stackBB; // all-in for less is the one legal undersize
    }

    ss.actions.push({ seatLabel, action, sizingBB: sizing });

    if (isAggressive) {
        ss.betMadeThisStreet = true;
        // Track the raise increment for the NEXT raiser's minimum. Only a
        // full raise updates it (an all-in undercall doesn't reopen action).
        const prevMax = Math.max(0, ...Object.values(ss.committedBB));
        const newTo = (ss.committedBB[seatLabel] || 0) + sizing;
        const increment = parseFloat((newTo - prevMax).toFixed(2));
        if (increment >= (ss.lastRaiseBB || 1)) {
            ss.lastRaiseBB = increment;
            ss.lastFullRaiseIdx = ss.actions.length - 1; // reopens betting for everyone
        }
    }
    if (sizing > 0 && seat) {
        ss.committedBB[seatLabel] = parseFloat(((ss.committedBB[seatLabel] || 0) + sizing).toFixed(2));
        seat.stackBB = parseFloat((seat.stackBB - sizing).toFixed(2));
        if (seat.stackBB <= 0) {
            seat.stackBB = 0;
            seat.allIn = true;
        }
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
            villainId:    cfg.villainId || null, // stable id across hands (positions rotate)
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
                lastRaiseBB:       1,     // the blind itself is the first increment
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
// _PR_deriveTableState — derive the preflop table context purely from the
// action log, so it's always current no matter how many betting rounds have
// happened. threeBettor tracks the LATEST re-raiser (a 4-bettor takes the
// slot), which is what the score-gated resolver needs to price a continue.
// ---------------------------------------------------------------------------
function _PR_deriveTableState(prHand) {
    const ss = prHand.gameState.streetState;
    const ts = {
        opener:      null,
        callers:     [],
        threeBettor: null,
        limpers:     [],
        openSizeBB:  prHand.openSizeBB || 2.5,
        raiseCount:  0,
        committedBB: ss.committedBB,
    };
    for (const a of ss.actions) {
        if (a.action === 'raise') {
            ts.raiseCount++;
            if (!ts.opener) { ts.opener = a.seatLabel; ts.limpers = []; }
            else ts.threeBettor = a.seatLabel;
        } else if (a.action === '3bet' || a.action === '4bet') {
            ts.raiseCount++;
            ts.threeBettor = a.seatLabel;
        } else if (a.action === 'call') {
            if (ts.opener) ts.callers.push(a.seatLabel);
            else ts.limpers.push(a.seatLabel);
        } else if (a.action === 'limp') {
            ts.limpers.push(a.seatLabel);
        }
    }
    return ts;
}

// Build the display/grading context from the current derived table state
function _PR_buildPreflopContext(prHand) {
    const ts = _PR_deriveTableState(prHand);
    const heroSeat = prHand.seats[prHand.heroSeatIndex];
    return {
        heroPos:      heroSeat ? heroSeat.label : null,
        opener:       ts.opener,
        threeBettor:  ts.threeBettor,
        callers:      ts.callers.slice(),
        limpers:      ts.limpers.slice(),
        potStructure: ts.threeBettor ? '3BP' : (ts.limpers.length > 0 ? 'LIMP_POT' : 'SRP'),
        tableActions: prHand.gameState.streetState.actions.map(function(a) {
            return { seatLabel: a.seatLabel, action: a.action };
        }),
    };
}

// ---------------------------------------------------------------------------
// PR_runPreflopToHero — run villain actions until it's hero's turn (or the
// hand resolves without hero). Uses the same generic actor loop as postflop,
// so multi-round action (3-bets, re-acts, BB option) works naturally.
// Mutates prHand's gameState. Returns prHand.
// ---------------------------------------------------------------------------
function PR_runPreflopToHero(prHand) {
    const heroLabel = prHand.seats[prHand.heroSeatIndex].label;

    let guard = 0;
    while (guard++ < 100) {
        if (!_PR_hasMultipleActive(prHand)) break;
        const next = _PR_nextActor(prHand);
        if (next === null || next === heroLabel) break;
        _PR_resolveAndApplyVillainPreflop(prHand, next);
    }

    prHand.preflopContext = _PR_buildPreflopContext(prHand);

    // Walk: everyone folded before hero — the hand is over and hero wins the
    // blinds uncontested. Hero never gets (or needs) an action.
    if (!_PR_hasMultipleActive(prHand)) {
        prHand.terminal = true;
        PR_resolveOutcome(prHand);
    }

    return prHand;
}

// Resolve one villain's preflop action from the derived table state and apply it.
// A resolved "fold" with nothing to call becomes a check (e.g. BB option).
function _PR_resolveAndApplyVillainPreflop(prHand, seatLabel) {
    const seat = prHand.seats.find(s => s !== null && s.label === seatLabel);
    if (!seat) return;
    const ts = _PR_deriveTableState(prHand);
    const result = PR_resolveVillainPreflopAction(seat, ts, seat.type);
    let action = result.action;
    if (action === 'fold' && _PR_facingAmount(prHand, seatLabel) <= 0) {
        action = 'check';
    }
    _PR_applyAction(prHand, seatLabel, action, result.sizingBB || 0);
}

// Score a hole-card holding 0–99.
// Pairs: 50 + (rank-2)*4  →  22=50, 33=54 … AA=98.
// Non-pairs: base 20 + high-card contribution + low-card contribution
//            + suitedness bonus + connectivity bonus.
function _PR_handStrengthScore(holeCards) {
    const RV = { 2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,T:10,J:11,Q:12,K:13,A:14 };
    const r1 = RV[holeCards[0].rank];
    const r2 = RV[holeCards[1].rank];
    const hi = Math.max(r1, r2);
    const lo = Math.min(r1, r2);
    if (hi === lo) return 50 + (hi - 2) * 4;
    const h = (hi - 2) / 12;
    const k = (lo - 2) / 12;
    const suited = holeCards[0].suit === holeCards[1].suit ? 1 : 0;
    const connBonus = Math.max(0, 4 - (hi - lo - 1));
    return Math.round(20 + h * 35 + k * 18 + suited * 8 + connBonus * 3);
}

// Per-archetype preflop thresholds (score-based, deterministic).
// Each archetype folds the WEAKEST part of GTO's range, not random hands.
//   openThreshold         : min score for a GTO-open to actually open (NIT folds marginal hands)
//   extraOpenThreshold    : min score to open when GTO says fold (widens beyond GTO; 999 = never)
//   threeBetThreshold     : min score for a GTO-3bet hand to 3-bet (below threshold → call or fold)
//   extraThreeBetThreshold: min score to 3-bet when GTO says call (light squeeze; 999 = never)
//   callThreshold         : min score for GTO-call or downgraded-3bet hand to call (below → fold)
//   looseCallThreshold    : min score to call when GTO says fold (passive overcall; 999 = never)
//   callVs3BetThreshold   : min score to continue vs a 3-bet (below → fold)
//   fourBetThreshold      : min score to 4-bet instead of calling a 3-bet
const PR_ARCHETYPE_PREFLOP = {
    NIT:    { openThreshold:55, extraOpenThreshold:999, threeBetThreshold:82, extraThreeBetThreshold:999, callThreshold:60, looseCallThreshold:999, callVs3BetThreshold:88, fourBetThreshold:95 },
    TAG:    { openThreshold:42, extraOpenThreshold:999, threeBetThreshold:70, extraThreeBetThreshold:999, callThreshold:48, looseCallThreshold:999, callVs3BetThreshold:75, fourBetThreshold:93 },
    LAG:    { openThreshold:35, extraOpenThreshold:62,  threeBetThreshold:55, extraThreeBetThreshold:70,  callThreshold:40, looseCallThreshold:999, callVs3BetThreshold:62, fourBetThreshold:91 },
    FISH:   { openThreshold:30, extraOpenThreshold:45,  threeBetThreshold:88, extraThreeBetThreshold:999, callThreshold:30, looseCallThreshold:38,  callVs3BetThreshold:45, fourBetThreshold:97 },
    MANIAC: { openThreshold:30, extraOpenThreshold:48,  threeBetThreshold:40, extraThreeBetThreshold:52,  callThreshold:45, looseCallThreshold:999, callVs3BetThreshold:48, fourBetThreshold:82 },
    AGGRO:  { openThreshold:38, extraOpenThreshold:70,  threeBetThreshold:60, extraThreeBetThreshold:72,  callThreshold:44, looseCallThreshold:999, callVs3BetThreshold:68, fourBetThreshold:91 },
};

// ---------------------------------------------------------------------------
// PR_resolveVillainPreflopAction — GTO baseline + archetype score-gate modifier
// ---------------------------------------------------------------------------
function PR_resolveVillainPreflopAction(seat, tableState, playerType) {
    const type = playerType || seat.type || 'GTO';
    const gto = _resolveVillainPreflopAction(seat, tableState, 'GTO');
    const arch = PR_ARCHETYPE_PREFLOP[type];

    const openSizeBB  = tableState.openSizeBB || 2.5;
    const committed   = tableState.committedBB || {};
    const myCommitted = committed[seat.label] || 0;
    const maxCommitted = Math.max(openSizeBB, ...Object.values(committed));
    // Cap raising wars: after open + 3-bet + 4-bet, remaining decisions are call/fold
    const canReraise = (tableState.raiseCount || 0) < 3;
    // "Raise to" → incremental commit for this seat
    const raiseToSizing = function(toBB) {
        return Math.max(1, Math.round((toBB - myCommitted) * 10) / 10);
    };

    if (!arch) {
        // GTO passthrough — with one upgrade over the base resolver: an opener
        // facing a re-raise continues via the real vs-3-bet ranges instead of
        // always folding.
        if (tableState.threeBettor && tableState.opener === seat.label &&
            typeof rfiVs3BetRanges !== 'undefined') {
            const data = rfiVs3BetRanges[seat.label + '_vs_' + tableState.threeBettor];
            if (data) {
                if (canReraise && checkRangeHelper(seat.handNotation, data['4-bet'] || [])) {
                    return { action: '4bet', sizingBB: raiseToSizing(maxCommitted * 2.3) };
                }
                if (checkRangeHelper(seat.handNotation, data['Call'] || [])) {
                    return { action: 'call', sizingBB: 0 }; // amount derived from facing
                }
            }
            return { action: 'fold', sizingBB: 0 };
        }
        return gto;
    }

    const score = _PR_handStrengthScore(seat.holeCards);

    // --- Facing a 3-bet (or later re-raise): score gates 4-bet / call / fold ---
    if (tableState.threeBettor) {
        if (canReraise && score >= arch.fourBetThreshold) {
            return { action: '4bet', sizingBB: raiseToSizing(maxCommitted * 2.3) };
        }
        if (score >= arch.callVs3BetThreshold) {
            return { action: 'call', sizingBB: 0 }; // amount derived from facing
        }
        return { action: 'fold', sizingBB: 0 };
    }

    // --- No open yet: RFI ---
    if (!tableState.opener && tableState.limpers.length === 0) {
        if (gto.action === 'raise') {
            return score >= arch.openThreshold ? gto : { action: 'fold', sizingBB: 0 };
        }
        if (arch.extraOpenThreshold < 999 && score >= arch.extraOpenThreshold) {
            return { action: 'raise', sizingBB: openSizeBB };
        }
        return { action: 'fold', sizingBB: 0 };
    }

    // --- Facing an open ---
    if (tableState.opener && !tableState.threeBettor) {
        if (gto.action === '3bet') {
            if (score >= arch.threeBetThreshold) return gto;
            if (score >= arch.callThreshold) return { action: 'call', sizingBB: openSizeBB };
            return { action: 'fold', sizingBB: 0 };
        }
        if (gto.action === 'call') {
            if (arch.extraThreeBetThreshold < 999 && score >= arch.extraThreeBetThreshold) {
                const tbSize = Math.round(openSizeBB * (['SB','BB'].includes(seat.label) ? 4 : 3) * 10) / 10;
                return { action: '3bet', sizingBB: tbSize };
            }
            return score >= arch.callThreshold ? gto : { action: 'fold', sizingBB: 0 };
        }
        // GTO says fold — loose call for passive archetypes
        if (arch.looseCallThreshold < 999 && score >= arch.looseCallThreshold) {
            return { action: 'call', sizingBB: openSizeBB };
        }
        return { action: 'fold', sizingBB: 0 };
    }

    // --- Limpers present ---
    return gto;
}

// ---------------------------------------------------------------------------
// PR_applyHeroAction — record hero's action and grade it. Preflop, hero acts
// exactly like any other seat in the actor loop: the caller then drives
// villain responses via PR_applyVillainAction until PR_isStreetComplete or
// _PR_nextActor returns hero again (e.g. a villain 3-bet hero's open).
// action: 'fold' | 'check' | 'call' | 'raise' | '3bet' | '4bet' | 'bet'
// sizingBB: amount (0 for fold/check; derived for call)
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

    // Grade the hero's decision against the pre-action state
    const grade = PR_gradeHeroAction(prHand, action, sizing);
    hr.heroGrades.push({ street, action, sizingBB: sizing, grade: grade.grade,
                         explanation: grade.explanation, spot: grade.spot || null });

    if (street === 'preflop') {
        hr.preflopContext = _PR_buildPreflopContext(hr);
    }

    if (action === 'fold') {
        hr.heroFolded = true;
        hr.terminal = !_PR_hasMultipleActive(hr); // terminal only if nobody else can contest
        if (hr.terminal) PR_resolveOutcome(hr);   // hand over — award the uncontested pot
        // Allow spectator mode: not terminal if other players still active
        return hr;
    }

    return hr;
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

    if (street === 'preflop') {
        _PR_resolveAndApplyVillainPreflop(hr, nextLabel);
        hr.preflopContext = _PR_buildPreflopContext(hr);
    } else {
        const result = PR_resolveVillainPostflopAction(seat, hr);
        _PR_applyAction(hr, nextLabel, result.action, result.sizingBB || 0);
    }

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
        // The final street was archived above — clear live streetState so the
        // showdown accounting doesn't count those actions a second time.
        gs.streetState = { street: 'showdown', betMadeThisStreet: false, actions: [], committedBB: {} };
        hr.terminal = true;
        PR_evalShowdown(hr);
        return hr;
    }

    // Uncontested (only one non-folded player)? The hand is over NOW — no
    // further board cards are dealt. This check must precede the deal: betting
    // out the turn must not flash a river. All-in runouts still deal, because
    // all-in players are active (not folded) and keep multipleActive true.
    if (!_PR_hasMultipleActive(hr)) {
        hr.terminal = true;
        // Previous street already archived — clear live state before resolving
        // so its actions aren't counted twice.
        gs.streetState = { street: ss.street, betMadeThisStreet: false, actions: [], committedBB: {} };
        PR_resolveOutcome(hr);
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

    // Build fresh committedBB for remaining active seats
    const freshCommitted = {};
    hr.seats.forEach(function(s) {
        if (s && !s.folded && !s.allIn) freshCommitted[s.label] = 0;
    });

    gs.streetState = {
        street:            nextStreet,
        betMadeThisStreet: false,
        lastRaiseBB:       0, // no bet yet; min-bet floor of 1BB applies
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
// _PR_rank5 — score one exact 5-card hand.
// Returns a comparable array [category, k1..k5] where category is
// 8=straight flush, 7=quads, 6=full house, 5=flush, 4=straight, 3=trips,
// 2=two pair, 1=pair, 0=high card, and k1..k5 are ordered kickers.
// Two hands compare lexicographically: earlier element wins; full equality
// means a genuine chop.
// ---------------------------------------------------------------------------
function _PR_rank5(cards) {
    const ranks = cards.map(c => RANK_NUM[c.rank]).sort((a, b) => b - a);
    const isFlush = cards.every(c => c.suit === cards[0].suit);

    // Straight: 5 distinct descending ranks, window of 4; wheel A-5 counts as 5-high
    let straightHigh = 0;
    const distinct = [...new Set(ranks)];
    if (distinct.length === 5) {
        if (distinct[0] - distinct[4] === 4) straightHigh = distinct[0];
        else if (distinct[0] === 14 && distinct[1] === 5 && distinct[1] - distinct[4] === 3) straightHigh = 5; // A-2-3-4-5
    }

    // Group ranks by count, order groups by (count desc, rank desc)
    const freq = new Map();
    for (const r of ranks) freq.set(r, (freq.get(r) || 0) + 1);
    const groups = [...freq.entries()].sort((a, b) => (b[1] - a[1]) || (b[0] - a[0]));
    const counts = groups.map(g => g[1]);

    if (straightHigh && isFlush)            return [8, straightHigh, 0, 0, 0, 0];
    if (counts[0] === 4)                    return [7, groups[0][0], groups[1][0], 0, 0, 0];
    if (counts[0] === 3 && counts[1] === 2) return [6, groups[0][0], groups[1][0], 0, 0, 0];
    if (isFlush)                            return [5, ...ranks];
    if (straightHigh)                       return [4, straightHigh, 0, 0, 0, 0];
    if (counts[0] === 3)                    return [3, groups[0][0], groups[1][0], groups[2][0], 0, 0];
    if (counts[0] === 2 && counts[1] === 2) return [2, groups[0][0], groups[1][0], groups[2][0], 0, 0];
    if (counts[0] === 2)                    return [1, groups[0][0], groups[1][0], groups[2][0], groups[3][0], 0];
    return [0, ...ranks];
}

// Compare two _PR_rank5 arrays: positive if a wins, negative if b wins, 0 = chop
function _PR_compareRanks(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const d = (a[i] || 0) - (b[i] || 0);
        if (d !== 0) return d;
    }
    return 0;
}

// ---------------------------------------------------------------------------
// PR_evalBestHand — evaluate a seat's best 5-card hand out of hole + board.
// Iterates all C(7,5)=21 five-card combinations and keeps the best.
// Returns { rank, label, tiebreaker } where:
//   rank/label — category from evaluateRawHand (display + tier logic)
//   tiebreaker — full comparable array from _PR_rank5 (kickers included)
// ---------------------------------------------------------------------------
function PR_evalBestHand(holeCards, board) {
    const raw = evaluateRawHand(holeCards, board);
    const all = [...holeCards, ...board];

    let best = null;
    if (all.length <= 5) {
        best = _PR_rank5(all);
    } else if (all.length === 6) {
        for (let i = 0; i < 6; i++) {
            const score = _PR_rank5(all.filter((_, k) => k !== i));
            if (best === null || _PR_compareRanks(score, best) > 0) best = score;
        }
    } else { // 7 cards: exclude every pair of indices
        for (let i = 0; i < all.length - 1; i++) {
            for (let j = i + 1; j < all.length; j++) {
                const score = _PR_rank5(all.filter((_, k) => k !== i && k !== j));
                if (best === null || _PR_compareRanks(score, best) > 0) best = score;
            }
        }
    }

    return {
        rank:        raw.rank,
        label:       raw.label,
        tiebreaker:  best,
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

    // Evaluate each active hand. Seat identity and hand name are distinct
    // fields — never share a key (a spread here once clobbered the seat
    // label with the hand label, so no pot was ever awarded).
    const evals = activeSeat.map(function(s) {
        const best = PR_evalBestHand(s.holeCards, board);
        return { seatLabel: s.label, seat: s, rank: best.rank, handLabel: best.label, tiebreaker: best.tiebreaker };
    });

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

    // Award each pot to the best hand among eligible players.
    // Winner selection uses the full kicker-aware tiebreaker arrays; an exact
    // tie across every element is a genuine chop.
    const potResults = pots.map(function(pot) {
        const eligible = evals.filter(e => pot.eligible.includes(e.seatLabel));
        if (eligible.length === 0) return { ...pot, winners: [] };

        let best = eligible[0].tiebreaker;
        for (const e of eligible) {
            if (_PR_compareRanks(e.tiebreaker, best) > 0) best = e.tiebreaker;
        }
        const winners = eligible.filter(e => _PR_compareRanks(e.tiebreaker, best) === 0)
                                .map(e => e.seatLabel);
        const share   = parseFloat((pot.amount / winners.length).toFixed(2));
        return { ...pot, winners, share };
    });

    // Uncalled excess: whatever the top contributor committed beyond the
    // second-highest commitment was never matched by anyone. The side-pot
    // machinery already returns it (a top pot they alone are eligible for),
    // but it's a refund, not winnings — tag it so settlement and history
    // don't report a losing hand as "You win".
    let refund = null;
    const sortedCommits = Object.values(totalCommitted).filter(v => v > 0).sort((a, b) => b - a);
    const excess = sortedCommits.length >= 2
        ? parseFloat((sortedCommits[0] - sortedCommits[1]).toFixed(2)) : 0;
    if (excess > 0 && potResults.length > 0) {
        const top = potResults[potResults.length - 1];
        if (top.eligible.length === 1 && top.winners.length === 1) {
            top.refundBB = Math.min(excess, top.amount);
            refund = { seatLabel: top.winners[0], amountBB: top.refundBB };
        }
    }

    // Everyone who reaches showdown shows — this is a training tool, and
    // real-world muck etiquette was hiding losers' cards from hand review.
    const mustShow = new Set(evals.map(function(e) { return e.seatLabel; }));
    const showdown = evals.map(function(e) {
        return { seatLabel: e.seatLabel, holeCards: e.seat.holeCards, rank: e.rank,
                 handLabel: e.handLabel, show: mustShow.has(e.seatLabel) };
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
        refund:        refund,
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

    // Dead-money sweep: a level can end up with no eligible players (e.g. a
    // player bet above everyone's commitment and then folded to a raise).
    // Those chips belong to the pot below them — merge downward so no pot
    // ever resolves winnerless and chips are conserved.
    for (let i = pots.length - 1; i >= 0; i--) {
        if (pots[i].eligible.length === 0) {
            const target = i > 0 ? pots[i - 1] : pots[i + 1];
            if (target) {
                target.amount = parseFloat((target.amount + pots[i].amount).toFixed(2));
                pots.splice(i, 1);
            }
        }
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

    // The winner's commitment beyond the best-matched opponent is their own
    // uncalled bet coming back, not winnings (e.g. an open that steals the
    // blinds "wins" 2.5bb less than the raise size suggests).
    let refund = null;
    const pot = { amount: parseFloat(totalPot.toFixed(2)), eligible: activeSeats.map(s => s.label), winners: winner ? [winner.label] : [] };
    if (winner) {
        const others = Object.entries(totalCommitted)
            .filter(function([l, v]) { return l !== winner.label && v > 0; })
            .map(function([, v]) { return v; });
        const secondTop = others.length ? Math.max(...others) : 0;
        const excess = Math.max(0, parseFloat(((totalCommitted[winner.label] || 0) - secondTop).toFixed(2)));
        if (excess > 0) {
            pot.refundBB = excess;
            refund = { seatLabel: winner.label, amountBB: excess };
        }
    }

    prHand.outcome = {
        winner:        winner ? winner.label : null,
        pots:          [pot],
        showdown:      [],
        heroNetBB:     parseFloat(heroNetBB.toFixed(2)),
        refund:        refund,
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

    // Determine scenario from table context. The live table grades hero's
    // decision before the preflop loop stamps prHand.preflopContext, so
    // derive it on demand — otherwise every spot fell through to "Complex".
    const ctx = prHand.preflopContext || _PR_buildPreflopContext(prHand);
    let scenario, oppPos;

    if (!ctx.opener && !ctx.threeBettor && ctx.limpers && ctx.limpers.length === 0) {
        scenario = 'RFI';
        oppPos   = 'BB';
    } else if (ctx.opener && !ctx.threeBettor) {
        scenario = 'FACING_RFI';
        oppPos   = ctx.opener;
    } else if (ctx.threeBettor && ctx.opener === heroPos) {
        // Hero opened and faces a 3-bet — the rfiVs3BetRanges keys apply
        scenario = 'RFI_VS_3BET';
        oppPos   = ctx.threeBettor;
    } else if (ctx.threeBettor) {
        // Cold vs a 3-bet (hero was not the opener) — no range data exists for
        // this spot, so grade against a premium-continue heuristic.
        const premium = checkRangeHelper(hand, ['QQ+', 'AKs', 'AKo']);
        if (heroAction === 'fold') {
            return premium
                ? { grade: 'error',   explanation: 'Folding a premium hand cold vs a 3-bet is a significant error.' }
                : { grade: 'correct', explanation: 'Cold vs a 3-bet, folding everything but premium hands is correct.' };
        }
        return premium
            ? { grade: 'correct', explanation: 'Continuing cold vs a 3-bet with a premium hand is correct.' }
            : { grade: 'error',   explanation: 'Cold vs a 3-bet, only premium hands (QQ+, AK) can continue.' };
    } else if (!ctx.opener && !ctx.threeBettor && ctx.limpers && ctx.limpers.length > 0) {
        // Limped pot: no dedicated ranges, but the house style is clear —
        // iso-raise every hand you would have opened, fold the rest.
        if (heroAction === 'check') {
            return { grade: 'correct', explanation: 'Checking your option in a limped pot is free — see the flop.' };
        }
        let rfiAction;
        try {
            rfiAction = computeCorrectAction(hand, 'RFI', heroPos, 'BB', null);
        } catch (e) {
            return { grade: 'mixed', explanation: 'GTO data unavailable for this spot.' };
        }
        const inRfi = rfiAction === 'RAISE';
        const limpTxt = ctx.limpers.length === 1 ? 'the limper' : ctx.limpers.length + ' limpers';
        if (heroAction === 'raise') {
            return inRfi
                ? { grade: 'correct', explanation: 'Iso-raising ' + limpTxt + ' with a hand you would open is the standard play.' }
                : { grade: 'error', explanation: hand + ' is not in your opening range — iso-raising ' + limpTxt + ' with it is too loose.' };
        }
        if (heroAction === 'call' || heroAction === 'limp') {
            return inRfi
                ? { grade: 'mixed', explanation: 'Overlimping is passive — prefer iso-raising ' + limpTxt + ' with a hand you would open.' }
                : { grade: 'error', explanation: 'Overlimping weak hands bleeds chips — fold ' + hand + ' behind ' + limpTxt + '.' };
        }
        // fold
        if (!inRfi) {
            return { grade: 'correct', explanation: 'Folding behind ' + limpTxt + ' is right without a hand you would open.' };
        }
        return checkRangeHelper(hand, ['QQ+', 'AKs', 'AKo'])
            ? { grade: 'error', explanation: 'Folding a premium hand to limpers is a significant error — iso-raise big.' }
            : { grade: 'mixed', explanation: hand + ' is strong enough to iso-raise ' + limpTxt + ' — folding gives up value.' };
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

    // spot metadata lets callers build an SR key for this decision (study mode)
    const spot = { scenario, heroPos, oppPos, hand };

    if (heroAction === correct) {
        return { grade: 'correct', spot, explanation: `${correct.toUpperCase()} is the GTO play in this spot.` };
    }
    if ((correct === 'raise' || correct === '3bet') && (heroAction === 'call')) {
        return { grade: 'mixed', spot, explanation: `GTO prefers ${correct.toUpperCase()}; calling is not a blunder but gives up equity.` };
    }
    return { grade: 'error', spot, explanation: `GTO play is ${correct.toUpperCase()}; ${heroAction.toUpperCase()} is a significant error here.` };
}

// ---------------------------------------------------------------------------
// _PR_gradeCbetV2 — real GTO grading via the trainer's strategy tables for
// heads-up-equivalent bet/check decisions where hero was the preflop
// aggressor and no bet faces them:
//   FLOP:  POSTFLOP_STRATEGY_V2  (SRP + 3BP c-bet, board archetype keyed)
//   TURN:  POSTFLOP_TURN_STRATEGY  (SRP double barrel; flop c-bet was called)
//   RIVER: POSTFLOP_RIVER_STRATEGY (SRP triple barrel; both barrels called)
// Returns a grade object or null when the spot isn't covered (fall back to
// the heuristic — never fake authority).
// ---------------------------------------------------------------------------

// Proxy positions without their own postflop trees onto the nearest family,
// exactly as the trainer's LANE_FAMILY does: UTG1 plays like UTG, UTG2 like LJ.
function _PR_proxyFamily(family) {
    return family.split('_').map(function(seg) {
        return seg === 'UTG1' ? 'UTG' : seg === 'UTG2' ? 'LJ' : seg;
    }).join('_');
}

// True when this street's log is exactly "bettorLabel bet, other player(s) only called"
function _PR_betWasCalled(actions, bettorLabel) {
    const aggressive = actions.filter(a => ['bet', 'raise', '3bet', '4bet'].includes(a.action));
    if (aggressive.length !== 1) return false;
    const bet = aggressive[0];
    if (bet.seatLabel !== bettorLabel || bet.action !== 'bet') return false;
    return actions.some(a => a.action === 'call' && a.seatLabel !== bettorLabel);
}

function _PR_gradeCbetV2(prHand, heroAction, heroSeat) {
    try {
        if (typeof POSTFLOP_PREFLOP_FAMILIES === 'undefined' || typeof classifyFlop !== 'function') return null;
        const street = prHand.gameState.street;
        if (!['flop', 'turn', 'river'].includes(street)) return null;
        if (heroAction !== 'bet' && heroAction !== 'check') return null;
        if (_PR_facingAmount(prHand, heroSeat.label) > 0) return null;

        const active = prHand.seats.filter(s => s !== null && !s.folded);
        if (active.length !== 2) return null; // heads-up spots only
        const villain = active.find(s => !s.isHero);
        if (!villain) return null;

        // Hero must be the preflop aggressor (last preflop raise is hero's)
        const hist = prHand.gameState.streetHistory;
        const pre = hist.preflop || [];
        const lastRaise = [...pre].reverse().find(a => ['raise', '3bet', '4bet'].includes(a.action));
        if (!lastRaise || lastRaise.seatLabel !== heroSeat.label) return null;

        // Family: SRP opener vs caller (all streets), or 3BP 3-bettor (flop only)
        const ctx = prHand.preflopContext || {};
        let potType, family;
        if (ctx.potStructure === 'SRP' && ctx.opener === heroSeat.label) {
            potType = 'SRP';
            family = heroSeat.label + '_vs_' + villain.label;
        } else if (ctx.potStructure === '3BP' && ctx.threeBettor === heroSeat.label) {
            potType = '3BP';
            family = heroSeat.label + '_3BP_vs_' + villain.label;
        } else {
            return null;
        }
        family = _PR_proxyFamily(family);
        let fi = POSTFLOP_PREFLOP_FAMILIES[family];
        if (!fi && potType === 'SRP') {
            // Trees are keyed vs specific callers (mostly _vs_BB). When this
            // exact matchup has no tree, grade vs the BB-caller tree — the
            // same proxying the trainer's LANE_FAMILY applies.
            family = _PR_proxyFamily(heroSeat.label + '_vs_BB');
            fi = POSTFLOP_PREFLOP_FAMILIES[family];
        }
        if (!fi) return null;

        const board = prHand.gameState.board;
        const flop = board.slice(0, 3);
        const heroHand = { cards: heroSeat.holeCards };
        let strat = null, heroHandClass = null, betKey = 'bet33';

        if (street === 'flop') {
            if (typeof POSTFLOP_STRATEGY_V2 === 'undefined' || typeof makePostflopSpotKeyV2 !== 'function') return null;
            heroHandClass = classifyFlopHand(heroHand, flop);
            strat = POSTFLOP_STRATEGY_V2[makePostflopSpotKeyV2({
                potType, preflopFamily: family, street: 'FLOP', heroRole: 'PFR',
                positionState: fi.positionState, nodeType: 'CBET_DECISION',
                boardArchetype: classifyFlop(flop).archetype, heroHandClass,
            })];
        } else if (street === 'turn') {
            // Double-barrel node: the flop line must be hero-c-bet → called
            if (typeof POSTFLOP_TURN_STRATEGY === 'undefined' || typeof classifyTurnCard !== 'function') return null;
            if (board.length < 4 || !_PR_betWasCalled(hist.flop || [], heroSeat.label)) return null;
            heroHandClass = classifyTurnHand(heroHand, flop, board[3]);
            const turnFamily = classifyTurnCard(board[3], flop);
            const turnReg = potType === '3BP'
                ? (typeof POSTFLOP_3BP_TURN_STRATEGY !== 'undefined' ? POSTFLOP_3BP_TURN_STRATEGY : {})
                : POSTFLOP_TURN_STRATEGY;
            strat = turnReg[potType + '|' + family + '|TURN|PFR|' + fi.positionState +
                '|TURN_CBET_DECISION|' + turnFamily + '|' + heroHandClass];
            betKey = 'bet50';
        } else {
            // Triple-barrel node: flop AND turn were hero-bet → called
            if (typeof POSTFLOP_RIVER_STRATEGY === 'undefined' || typeof classifyRiverCard !== 'function') return null;
            if (board.length < 5 ||
                !_PR_betWasCalled(hist.flop || [], heroSeat.label) ||
                !_PR_betWasCalled(hist.turn || [], heroSeat.label)) return null;
            heroHandClass = classifyRiverHand(heroHand, flop, board[3], board[4]);
            const riverFamily = classifyRiverCard(board[4], board.slice(0, 4));
            const riverReg = potType === '3BP'
                ? (typeof POSTFLOP_3BP_RIVER_STRATEGY !== 'undefined' ? POSTFLOP_3BP_RIVER_STRATEGY : {})
                : POSTFLOP_RIVER_STRATEGY;
            strat = riverReg[potType + '|' + family + '|RIVER|PFR|' + fi.positionState +
                '|RIVER_CBET_DECISION|' + riverFamily + '|' + heroHandClass];
            betKey = 'bet50';
        }
        if (!strat || !strat.actions) return null;

        const chosenFreq = heroAction === 'bet' ? (strat.actions[betKey] || 0) : (strat.actions.check || 0);
        const pct = Math.round(chosenFreq * 100);
        const base = heroHandClass.replace(/_/g, ' ').toLowerCase() + ' on this ' + street + ': GTO ' +
            heroAction + 's ' + pct + '% here. ' + (strat.reasoning || '');
        if (chosenFreq >= 0.65) return { grade: 'correct', explanation: 'Good ' + heroAction + ' — ' + base };
        if (chosenFreq >= 0.35) return { grade: 'mixed', explanation: 'Mixed spot — ' + base };
        return { grade: 'error', explanation: 'GTO strongly prefers ' +
            (heroAction === 'bet' ? 'checking' : 'betting') + ' — ' + base };
    } catch (_) {
        return null;
    }
}

// ---------------------------------------------------------------------------
// _PR_gradeDefendV2 — hero called preflop and faces the aggressor's bet.
// Grades fold/call/raise via the trainer's defender tables when the line is
// trainer-equivalent: heads-up SRP, villain is the PFR, hero faces exactly one
// unraised bet this street, and (turn/river) hero called each earlier barrel.
// ---------------------------------------------------------------------------
function _PR_gradeDefendV2(prHand, heroAction, heroSeat) {
    try {
        if (typeof POSTFLOP_PREFLOP_FAMILIES === 'undefined' || typeof classifyFlop !== 'function') return null;
        const street = prHand.gameState.street;
        if (!['flop', 'turn', 'river'].includes(street)) return null;
        if (!['fold', 'call', 'raise'].includes(heroAction)) return null;
        if (_PR_facingAmount(prHand, heroSeat.label) <= 0) return null;

        const active = prHand.seats.filter(s => s !== null && !s.folded);
        if (active.length !== 2) return null;
        const villain = active.find(s => !s.isHero);
        if (!villain) return null;

        // Villain must be the preflop aggressor; hero the caller. Covered pots:
        // SRP (villain opened, hero called) and 3BP (hero opened, villain
        // 3-bet, hero called — the CALL_3BP defender trees).
        const hist = prHand.gameState.streetHistory;
        const pre = hist.preflop || [];
        const lastRaise = [...pre].reverse().find(a => ['raise', '3bet', '4bet'].includes(a.action));
        if (!lastRaise || lastRaise.seatLabel !== villain.label) return null;
        const ctx = prHand.preflopContext || {};
        let potType;
        if (ctx.potStructure === 'SRP' && ctx.opener === villain.label) {
            potType = 'SRP';
        } else if (ctx.potStructure === '3BP' && ctx.threeBettor === villain.label &&
                   ctx.opener === heroSeat.label) {
            potType = '3BP';
        } else {
            return null;
        }

        // Facing exactly one unraised bet this street, made by the villain
        const cur = prHand.gameState.streetState.actions;
        const aggressive = cur.filter(a => ['bet', 'raise', '3bet', '4bet'].includes(a.action));
        if (aggressive.length !== 1 || aggressive[0].seatLabel !== villain.label ||
            aggressive[0].action !== 'bet') return null;

        const family = _PR_proxyFamily(potType === 'SRP'
            ? villain.label + '_vs_' + heroSeat.label            // SRP: PFR_vs_caller
            : heroSeat.label + '_CALL_3BP_vs_' + villain.label); // 3BP: caller-first
        const fi = POSTFLOP_PREFLOP_FAMILIES[family];
        if (!fi) return null;
        // SRP defend tables are built with a literal OOP position state
        const posState = potType === 'SRP' ? 'OOP' : fi.positionState;

        const board = prHand.gameState.board;
        const flop = board.slice(0, 3);
        const heroHand = { cards: heroSeat.holeCards };
        let strat = null, heroHandClass = null;

        if (street === 'flop') {
            if (typeof POSTFLOP_DEFEND_VS_CBET === 'undefined' || typeof makePostflopSpotKeyV2 !== 'function') return null;
            heroHandClass = classifyFlopHand(heroHand, flop);
            const flopReg = potType === '3BP'
                ? (typeof POSTFLOP_3BP_DEFEND_VS_CBET !== 'undefined' ? POSTFLOP_3BP_DEFEND_VS_CBET : {})
                : POSTFLOP_DEFEND_VS_CBET;
            strat = flopReg[makePostflopSpotKeyV2({
                potType, preflopFamily: family, street: 'FLOP', heroRole: 'DEFENDER',
                positionState: posState, nodeType: 'VS_CBET_DECISION',
                boardArchetype: classifyFlop(flop).archetype, heroHandClass,
            })];
        } else if (street === 'turn') {
            if (typeof POSTFLOP_TURN_DEFEND_STRATEGY === 'undefined' || typeof classifyTurnCard !== 'function') return null;
            if (board.length < 4 || !_PR_betWasCalled(hist.flop || [], villain.label)) return null;
            heroHandClass = classifyTurnHand(heroHand, flop, board[3]);
            const tdReg = potType === '3BP'
                ? (typeof POSTFLOP_3BP_TURN_DEFEND_STRATEGY !== 'undefined' ? POSTFLOP_3BP_TURN_DEFEND_STRATEGY : {})
                : POSTFLOP_TURN_DEFEND_STRATEGY;
            strat = tdReg[potType + '|' + family + '|TURN|DEFENDER|' + posState + '|TURN_VS_BET_DECISION|' +
                classifyTurnCard(board[3], flop) + '|' + heroHandClass];
        } else {
            if (typeof POSTFLOP_RIVER_DEFEND_STRATEGY === 'undefined' || typeof classifyRiverCard !== 'function') return null;
            if (board.length < 5 ||
                !_PR_betWasCalled(hist.flop || [], villain.label) ||
                !_PR_betWasCalled(hist.turn || [], villain.label)) return null;
            heroHandClass = classifyRiverHand(heroHand, flop, board[3], board[4]);
            const rdReg = potType === '3BP'
                ? (typeof POSTFLOP_3BP_RIVER_DEFEND_STRATEGY !== 'undefined' ? POSTFLOP_3BP_RIVER_DEFEND_STRATEGY : {})
                : POSTFLOP_RIVER_DEFEND_STRATEGY;
            strat = rdReg[potType + '|' + family + '|RIVER|DEFENDER|' + posState + '|RIVER_VS_BET_DECISION|' +
                classifyRiverCard(board[4], board.slice(0, 4)) + '|' + heroHandClass];
        }
        if (!strat || !strat.actions) return null;

        const chosenFreq = strat.actions[heroAction] || 0;
        const pct = Math.round(chosenFreq * 100);
        const base = heroHandClass.replace(/_/g, ' ').toLowerCase() + ' vs the ' + street + ' bet: GTO ' +
            heroAction + 's ' + pct + '% here. ' + (strat.reasoning || '');
        if (chosenFreq >= 0.65) return { grade: 'correct', explanation: 'Good ' + heroAction + ' — ' + base };
        if (chosenFreq >= 0.35) return { grade: 'mixed', explanation: 'Mixed spot — ' + base };
        return { grade: 'error', explanation: 'GTO rarely ' + heroAction + 's here (' + pct + '%) — ' +
            'preferred: ' + (strat.preferredAction || 'call') + '. ' + base };
    } catch (_) {
        return null;
    }
}

// ---------------------------------------------------------------------------
// _PR_gradeDonkNode — hero called preflop and is first to act with no bet in
// front. Betting into the raiser (donking) is a rare part of any solid
// strategy; checking to the aggressor is near-universal. Turn/river only
// qualify when the aggressor barreled the previous street — a lead after the
// aggressor checks back is a probe, a real strategy left to the heuristic.
// ---------------------------------------------------------------------------
function _PR_gradeDonkNode(prHand, heroAction, heroSeat) {
    try {
        const street = prHand.gameState.street;
        if (!['flop', 'turn', 'river'].includes(street)) return null;
        if (heroAction !== 'bet' && heroAction !== 'check') return null;
        const ss = prHand.gameState.streetState;
        if (ss.betMadeThisStreet || _PR_facingAmount(prHand, heroSeat.label) > 0) return null;

        const hist = prHand.gameState.streetHistory;
        const pre = hist.preflop || [];
        const lastRaise = [...pre].reverse().find(a => ['raise', '3bet', '4bet'].includes(a.action));
        if (!lastRaise || lastRaise.seatLabel === heroSeat.label) return null;
        const aggr = prHand.seats.find(s => s !== null && s.label === lastRaise.seatLabel);
        if (!aggr || aggr.folded) return null;

        if (street === 'turn' && !_PR_betWasCalled(hist.flop || [], aggr.label)) return null;
        if (street === 'river' && (!_PR_betWasCalled(hist.flop || [], aggr.label) ||
                                   !_PR_betWasCalled(hist.turn || [], aggr.label))) return null;

        if (heroAction === 'check') {
            return { grade: 'correct', explanation: 'Standard — as the preflop caller you check to the raiser. Strong hands too: check-raising builds a bigger pot.' };
        }
        const tier = _PR_seatHandTier(heroSeat, prHand);
        if (tier === 'NUT_VALUE' || tier === 'STRONG') {
            return { grade: 'mixed', explanation: 'Donk-leading a strong hand can work, but GTO overwhelmingly checks to the raiser here — check-raise instead.' };
        }
        return { grade: 'error', explanation: 'Donk-betting into the preflop raiser is rarely correct — check and let the aggressor act first.' };
    } catch (_) {
        return null;
    }
}

function _PR_gradePostflopAction(prHand, heroAction, heroSeat, sizingBB) {
    // Heads-up decisions grade against the real strategy tables:
    // c-bets/barrels when hero was the aggressor, fold/call/raise when
    // hero defends against the aggressor's bet — plus the donk node, where
    // check-to-the-raiser is near-universal.
    const v2 = _PR_gradeCbetV2(prHand, heroAction, heroSeat) ||
               _PR_gradeDefendV2(prHand, heroAction, heroSeat) ||
               _PR_gradeDonkNode(prHand, heroAction, heroSeat);
    if (v2) return v2;

    // Everything else: lightweight equity-heuristic grading (multiway/turn/river)
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
        return { grade: 'mixed', explanation: `No strategy tree for this exact line — graded by hand-strength heuristic.` };
    }

    // No bet facing
    if ((tier === 'NUT_VALUE' || tier === 'STRONG') && heroAction === 'check') {
        return { grade: 'mixed', explanation: `Checking ${handClass} is fine for deception but GTO usually bets for value.` };
    }
    return { grade: 'mixed', explanation: `No strategy tree for this exact line — graded by hand-strength heuristic.` };
}

// ===========================================================================
// Pass 3 — Persistence: bankroll, sessions, table config
// Storage: pc_poker_room_v1 (localStorage via safeGet/safeSet from engine.js).
// All dollar amounts are numbers in dollars; BB conversion via PR_STAKE_CONFIG.
// ===========================================================================

const PR_STORAGE_KEY = 'pc_poker_room_v1';
const PR_DEFAULT_BANKROLL = 1000;
const PR_SESSION_HISTORY_CAP = 200; // guard localStorage quota

const PR_VILLAIN_NAME_POOL = [
    'Rocky', 'Layla', 'The Prof', 'Shark', 'Lucky', 'Grinder', 'Tex', 'Ace',
    'Diamond', 'Cowboy', 'Slick', 'Maverick', 'Blaze', 'Dutch', 'Vega', 'Lola',
    'Ghost', 'Stone', 'Remy', 'Duke', 'Sal', 'Monty', 'Chip', 'Ringo',
    'Dex', 'Nova', 'Cash', 'Rio', 'Bear', 'Fox', 'Hawk', 'Cruz',
    'Nate', 'Jules', 'Priest', 'Dagger', 'Smoke', 'Frost', 'King', 'Rook',
];

const PR_ARCHETYPE_KEYS = ['NIT', 'TAG', 'LAG', 'FISH', 'MANIAC', 'AGGRO'];

const PR_HERO_NAME_MAX = 14;

function PR_defaultRoomState() {
    return {
        version: 1,
        bankroll: PR_DEFAULT_BANKROLL,
        stake: '1/2',
        heroProfile: { name: 'You', avatar: '😎' },
        studyMode: false,           // opt-in: graded room decisions feed the trainer's SR queue
        tableConfig: null,          // built on sit-down via PR_generateTableConfig
        sessionHistory: [],         // newest first: { date, handsPlayed, netBB, netDollars, stake }
        allTimeStats: { handsPlayed: 0, biggestWin: 0, biggestLoss: 0, totalNetBB: 0 },
    };
}

// Load persisted room state; malformed or missing data falls back per-field
// so one bad key can never brick the room.
function PR_loadRoomState() {
    const raw = (typeof safeGet === 'function') ? safeGet(PR_STORAGE_KEY, null) : null;
    const def = PR_defaultRoomState();
    if (!raw || typeof raw !== 'object') return def;
    return {
        version: 1,
        bankroll: (typeof raw.bankroll === 'number' && isFinite(raw.bankroll) && raw.bankroll >= 0)
            ? raw.bankroll : def.bankroll,
        stake: PR_STAKE_CONFIG[raw.stake] ? raw.stake : def.stake,
        heroProfile: (raw.heroProfile && typeof raw.heroProfile.name === 'string')
            ? {
                name:   raw.heroProfile.name.slice(0, PR_HERO_NAME_MAX) || def.heroProfile.name,
                avatar: (typeof raw.heroProfile.avatar === 'string' && raw.heroProfile.avatar)
                    ? raw.heroProfile.avatar : def.heroProfile.avatar,
              }
            : def.heroProfile,
        studyMode: raw.studyMode === true,
        // Table config holds VILLAINS only — hero is always the remaining seat.
        // (Older saves stored a 'seats' array including all positions; discard those.)
        tableConfig: (raw.tableConfig && Array.isArray(raw.tableConfig.villains)) ? raw.tableConfig : null,
        sessionHistory: Array.isArray(raw.sessionHistory)
            ? raw.sessionHistory.slice(0, PR_SESSION_HISTORY_CAP) : [],
        allTimeStats: (raw.allTimeStats && typeof raw.allTimeStats === 'object')
            ? {
                handsPlayed: raw.allTimeStats.handsPlayed || 0,
                biggestWin:  raw.allTimeStats.biggestWin  || 0,
                biggestLoss: raw.allTimeStats.biggestLoss || 0,
                totalNetBB:  raw.allTimeStats.totalNetBB  || 0,
              }
            : def.allTimeStats,
    };
}

function PR_saveRoomState(state) {
    if (state.sessionHistory && state.sessionHistory.length > PR_SESSION_HISTORY_CAP) {
        state.sessionHistory.length = PR_SESSION_HISTORY_CAP;
    }
    if (typeof safeSet === 'function') safeSet(PR_STORAGE_KEY, state);
    return state;
}

// ---------------------------------------------------------------------------
// Villain generation
// ---------------------------------------------------------------------------

// N distinct names drawn from the pool (pool is larger than any table)
function PR_randomVillainNames(count) {
    const pool = _shuffle(PR_VILLAIN_NAME_POOL.slice());
    return pool.slice(0, count);
}

// Random archetype honoring optional weights { NIT: 1, FISH: 3, ... }.
// Default: uniform across all archetypes.
function PR_randomArchetype(weights) {
    const w = PR_ARCHETYPE_KEYS.map(k => Math.max(0, (weights && weights[k] !== undefined) ? weights[k] : 1));
    const total = w.reduce((a, v) => a + v, 0);
    if (total <= 0) return PR_ARCHETYPE_KEYS[Math.floor(Math.random() * PR_ARCHETYPE_KEYS.length)];
    let roll = Math.random() * total;
    for (let i = 0; i < PR_ARCHETYPE_KEYS.length; i++) {
        roll -= w[i];
        if (roll < 0) return PR_ARCHETYPE_KEYS[i];
    }
    return PR_ARCHETYPE_KEYS[PR_ARCHETYPE_KEYS.length - 1];
}

// Villain starting stack in BB, randomized within the stake's buy-in range
function PR_randomVillainStackBB(stake) {
    const cfg = PR_STAKE_CONFIG[stake] || PR_STAKE_CONFIG['1/2'];
    const minBB = cfg.minBuy / cfg.bb;
    const maxBB = cfg.maxBuy / cfg.bb;
    return Math.round(minBB + Math.random() * (maxBB - minBB));
}

// Build a fresh table: hero seat + villains with random names/types/stacks.
// Build a fresh table. seatCount (2–9) is TOTAL players INCLUDING hero, so
// this generates seatCount−1 villains. Villains carry stable ids (not
// position labels) because positions rotate with the button every hand;
// per-hand seat assignment happens at deal time.
// typeWeights: optional archetype weight map for the distribution editor.
function PR_generateTableConfig(stake, seatCount, typeWeights) {
    const count = Math.min(9, Math.max(2, seatCount || 9));
    const names = PR_randomVillainNames(count - 1);
    const villains = names.map(function(name, i) {
        return {
            id:      'v' + (i + 1),
            name,
            type:    PR_randomArchetype(typeWeights),
            avatar:  'default',
            stackBB: PR_randomVillainStackBB(stake),
            sessionStats: { handsDealt: 0, vpipHands: 0, pfrHands: 0 },
        };
    });
    return { stake, seatCount: count, villains };
}

// ---------------------------------------------------------------------------
// Bankroll & session flow
// ---------------------------------------------------------------------------

// Validate and execute a buy-in. Returns { ok, error?, state?, session? }.
function PR_buyIn(state, stake, buyInDollars) {
    const cfg = PR_STAKE_CONFIG[stake];
    if (!cfg) return { ok: false, error: 'Unknown stake: ' + stake };
    if (buyInDollars < cfg.minBuy || buyInDollars > cfg.maxBuy) {
        return { ok: false, error: 'Buy-in must be between $' + cfg.minBuy + ' and $' + cfg.maxBuy + '.' };
    }
    if (buyInDollars > state.bankroll) {
        return { ok: false, error: 'Bankroll too small for this buy-in.' };
    }
    const next = { ...state, stake, bankroll: parseFloat((state.bankroll - buyInDollars).toFixed(2)) };
    const session = {
        stake,
        buyInDollars,
        stackBB: parseFloat((buyInDollars / cfg.bb).toFixed(2)),
        handsPlayed: 0,
        netBB: 0,
        decisions: 0,
        correctDecisions: 0,
        startedAt: new Date().toISOString(),
    };
    return { ok: true, state: next, session };
}

// Apply one finished hand's result to the live session (does not persist).
function PR_applySessionHandResult(session, heroNetBB) {
    session.handsPlayed++;
    session.netBB = parseFloat((session.netBB + heroNetBB).toFixed(2));
    session.stackBB = parseFloat((session.stackBB + heroNetBB).toFixed(2));
    if (session.stackBB < 0) session.stackBB = 0; // engine clamps all-ins; guard rounding
    return session;
}

// Hero busted mid-session? (stack too short to post the big blind)
function PR_isBusted(session) {
    return session.stackBB < 1;
}

// Rebuy from bankroll during a session. Same bounds as a fresh buy-in.
function PR_rebuy(state, session, rebuyDollars) {
    const cfg = PR_STAKE_CONFIG[session.stake];
    if (!cfg) return { ok: false, error: 'Unknown stake.' };
    if (rebuyDollars < cfg.minBuy || rebuyDollars > cfg.maxBuy) {
        return { ok: false, error: 'Rebuy must be between $' + cfg.minBuy + ' and $' + cfg.maxBuy + '.' };
    }
    if (rebuyDollars > state.bankroll) {
        return { ok: false, error: 'Bankroll too small for this rebuy.' };
    }
    state.bankroll = parseFloat((state.bankroll - rebuyDollars).toFixed(2));
    session.buyInDollars = parseFloat((session.buyInDollars + rebuyDollars).toFixed(2));
    session.stackBB = parseFloat((session.stackBB + rebuyDollars / cfg.bb).toFixed(2));
    return { ok: true, state, session };
}

// End the session: cash out the stack to the bankroll, append history,
// roll up all-time stats, persist. Returns the persisted state.
function PR_endSession(state, session) {
    const cfg = PR_STAKE_CONFIG[session.stake] || PR_STAKE_CONFIG['1/2'];
    const cashOut = parseFloat((session.stackBB * cfg.bb).toFixed(2));
    const netDollars = parseFloat((cashOut - session.buyInDollars).toFixed(2));

    state.bankroll = parseFloat((state.bankroll + cashOut).toFixed(2));
    state.sessionHistory.unshift({
        date: new Date().toISOString().slice(0, 10),
        handsPlayed: session.handsPlayed,
        netBB: session.netBB,
        netDollars,
        stake: session.stake,
    });
    if (state.sessionHistory.length > PR_SESSION_HISTORY_CAP) {
        state.sessionHistory.length = PR_SESSION_HISTORY_CAP;
    }

    const at = state.allTimeStats;
    at.handsPlayed = (at.handsPlayed || 0) + session.handsPlayed;
    at.totalNetBB = parseFloat(((at.totalNetBB || 0) + session.netBB).toFixed(2));
    if (netDollars > (at.biggestWin || 0)) at.biggestWin = netDollars;
    if (netDollars < (at.biggestLoss || 0)) at.biggestLoss = netDollars;

    return PR_saveRoomState(state);
}

// Top up the bankroll itself (bust recovery). Resets to the default amount.
function PR_topUpBankroll(state) {
    state.bankroll = PR_DEFAULT_BANKROLL;
    return PR_saveRoomState(state);
}

// ---------------------------------------------------------------------------
// PR_buildHandSeats — per-hand seat assignment.
// Positions rotate with the button, so each hand: hero takes heroPos, and the
// villains fill the remaining position labels in table order. Returns the
// seats config array for PR_createHand; each villain seat carries its stable
// villainId so session stats can follow the player, not the position.
// ---------------------------------------------------------------------------
function PR_buildHandSeats(tableConfig, heroProfile, heroPos, heroStackBB) {
    const labels = PR_POSITIONS.slice(0, tableConfig.seatCount);
    if (!labels.includes(heroPos)) heroPos = labels[0];
    let v = 0;
    return labels.map(function(label) {
        if (label === heroPos) {
            return { label, name: (heroProfile && heroProfile.name) || 'You', type: 'HERO', stackBB: heroStackBB };
        }
        const villain = tableConfig.villains[v++];
        return villain
            ? { label, villainId: villain.id, name: villain.name, type: villain.type, stackBB: villain.stackBB }
            : null;
    }).filter(Boolean);
}

// ---------------------------------------------------------------------------
// PR_buildHandSeatsRotated — physical-table variant for the live view.
// Players sit in fixed physical order (hero, then villains v1..vN clockwise);
// position labels rotate around them as the button moves. physicalSeat i gets
// labels[(i + offset) % N], so incrementing offset each hand moves every
// position one seat — exactly like a real table.
// Returns { seats, heroPos } — seats feed PR_createHand directly.
// ---------------------------------------------------------------------------
function PR_buildHandSeatsRotated(tableConfig, heroProfile, offset, heroStackBB) {
    const n = tableConfig.seatCount;
    const labels = PR_POSITIONS.slice(0, n);
    const shift = ((offset % n) + n) % n;
    const heroPos = labels[shift];
    const seats = [{ label: heroPos, name: (heroProfile && heroProfile.name) || 'You', type: 'HERO', stackBB: heroStackBB }];
    tableConfig.villains.forEach(function(villain, i) {
        const label = labels[(i + 1 + shift) % n];
        seats.push({ label, villainId: villain.id, name: villain.name, type: villain.type, stackBB: villain.stackBB });
    });
    return { seats, heroPos };
}

// ---------------------------------------------------------------------------
// Per-villain VPIP / PFR accumulation
// Call once per completed hand with the hand's preflop action log. Villains
// are matched by villainId (positions rotate, ids don't).
// VPIP: voluntarily put money in preflop (call/limp/raise — blinds excluded).
// PFR:  raised preflop (raise/3bet/4bet).
// ---------------------------------------------------------------------------
function PR_accumulateSeatStats(tableConfig, prHand) {
    if (!tableConfig || !prHand) return;
    const preflopActions = (prHand.gameState.streetHistory.preflop || [])
        .concat(prHand.gameState.street === 'preflop' ? prHand.gameState.streetState.actions : []);
    tableConfig.villains.forEach(function(villain) {
        const seat = prHand.seats.find(s => s && s.villainId === villain.id);
        if (!seat) return;
        const stats = villain.sessionStats || (villain.sessionStats = { handsDealt: 0, vpipHands: 0, pfrHands: 0 });
        stats.handsDealt++;
        const acts = preflopActions.filter(a => a.seatLabel === seat.label);
        if (acts.some(a => ['call', 'limp', 'raise', '3bet', '4bet'].includes(a.action))) stats.vpipHands++;
        if (acts.some(a => ['raise', '3bet', '4bet'].includes(a.action))) stats.pfrHands++;
    });
}
