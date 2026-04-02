// sim.js — HandRun state machine (Pass 2.5: GameState formalization, poker accuracy,
//   animation parity, math correctness)
// Depends on: ranges.js (generatePostflopSpot, generateTurnCBetSpot,
//   generateTurnDefendSpot, facingRfiRanges, RANKS)
//   engine.js (computeCorrectAction)
//   ui.js globals (getOpenSizeBB, getBigBlind$, getOpenSize$, get3betSize$, getSRPPot$, formatAmt)
// EXTENSION Pass 4: bankroll, session mode, career stats → sim_session.js

'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const _SIM_SUITS = ['c', 'd', 'h', 's'];

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
        if (act === 'bet' || act === 'raise' || act === '3bet') { lastAggrIdx = i; break; }
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
    return handRun.seats[handRun.heroSeatIndex].label === 'BTN';
    // EXTENSION Pass 5: generalize for all position matchups
}

// ---------------------------------------------------------------------------
// _simResolveTurnGenerator — reads flop streetHistory to pick turn generator
// ---------------------------------------------------------------------------

function _simResolveTurnGenerator(gameState) {
    const flopActions = gameState.streetHistory.flop || [];
    const heroFlopAction = flopActions.find(a => a.seatLabel === 'BTN');
    const villainFlopAction = flopActions.find(a => a.seatLabel === 'BB');

    const heroBetFlop = heroFlopAction && heroFlopAction.action === 'bet';
    const heroCheckFlop = !heroBetFlop;
    const villainBetFlop = villainFlopAction && villainFlopAction.action === 'bet';
    const villainCheckFlop = villainFlopAction && villainFlopAction.action === 'check';

    if (heroBetFlop && villainFlopAction && villainFlopAction.action === 'call') {
        return 'generateTurnCBetSpot';      // PFR bet flop, called — barreling
    }
    if (heroCheckFlop && villainCheckFlop) {
        return 'generateDelayedTurnSpot';   // both checked flop — delayed c-bet
    }
    if (villainBetFlop && heroFlopAction && heroFlopAction.action === 'call') {
        return 'generateTurnDefendSpot';    // villain bet flop, hero called — defending
    }
    return 'generateTurnCBetSpot';          // fallback
    // EXTENSION Pass 3: add river generator resolution using streetHistory.turn
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

    if (street === 'preflop') {
        nodeId = 'preflop_open_BTN';
        spotType = 'RFI';
        boardTexture = null;
        availableActions = getAvailableActions(hr);
        position = 'IP';

        const heroHandNotation = _cardsToHandNotation(heroSeat.holeCards);
        const rawAction = computeCorrectAction(heroHandNotation, 'RFI', 'BTN', '', null);
        correctAction = rawAction === 'RAISE' ? 'raise' : 'fold';
        mixFrequency = null;
        explanation = rawAction === 'RAISE'
            ? 'BTN RFI: hand is in open-raising range.'
            : 'BTN RFI: hand is outside open-raising range \u2014 fold.';

    } else if (street === 'flop' || street === 'turn') {
        // Check if hero is facing a villain bet (donk/probe)
        const facingVillainBet = ss.actions.some(function(a) {
            return a.seatLabel !== heroSeat.label && (a.action === 'bet' || a.action === 'raise');
        });

        if (facingVillainBet) {
            // Hero facing villain's bet — defender decision
            nodeId = street + '_vs_villainbet_BTN';
            spotType = 'DEFEND';
            boardTexture = spot ? spot.boardArchetype : null;
            position = 'IP';
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
            // Hero as PFR / IP — c-bet or barrel decision
            const isPFR = spot && spot.heroRole === 'PFR';
            nodeId = street === 'flop'
                ? (isPFR ? 'flop_cbet_BTN' : 'flop_defend_BB')
                : (isPFR ? 'turn_barrel_BTN' : 'turn_defend_BB');
            spotType = street === 'flop'
                ? (isPFR ? 'CBET' : 'DEFEND')
                : (isPFR ? 'BARREL' : 'DEFEND');
            boardTexture = spot ? (spot.turnFamily || spot.boardArchetype) : null;
            position = isPFR ? 'IP' : 'OOP';
            availableActions = getAvailableActions(hr);

            if (spot && spot.strategy) {
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
        mixFrequency,
        explanation,
        mathContext,
        heroAction: null,
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

    if (street === 'preflop') {
        // Single raise sizing only — no size choices per spec Part 6
        return ['fold', 'raise'];
    }

    if (street === 'flop' || street === 'turn') {
        if (!_heroIsIP(hr)) {
            // OOP defender (future lanes)
            return ['fold', 'call', 'raise'];
        }
        // IP hero (BTN in BTN_vs_BB_SRP) — check if facing a villain bet
        const heroLabel = hr.seats[hr.heroSeatIndex].label;
        const ss = hr.gameState.streetState;
        const facingBet = ss.actions.some(function(a) {
            return a.seatLabel !== heroLabel && (a.action === 'bet' || a.action === 'raise');
        });
        return facingBet ? ['fold', 'call', 'raise'] : ['check', 'bet'];
    }

    if (street === 'river') {
        return ['check', 'bet'];
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

    if (street === 'preflop') {
        const rangeData = facingRfiRanges['BB_vs_BTN'];
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

    if (street === 'flop' || street === 'turn') {
        const ss = hr.gameState.streetState;
        const heroLabel = hr.seats[hr.heroSeatIndex].label;
        const heroBet = ss.actions.some(a => a.seatLabel === heroLabel && (a.action === 'bet' || a.action === 'raise'));

        if (!heroBet) {
            // Hero checked — villain may bet (OOP probe) or check
            return Math.random() < 0.25 ? 'bet' : 'check';
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

    if (nextStreet === 'flop') {
        // Step 4: Deal board cards — append to gameState.board[], never replace
        const flopCards = _dealBoardCards(hr, 3);
        for (const c of flopCards) gs.board.push(c);

        // Override pot with canonical SRP value — eliminates preflop rounding drift
        const srpFn = (typeof getSRPPot$ === 'function') ? getSRPPot$ : function() { return 16.5; };
        const bbFn  = (typeof getBigBlind$ === 'function') ? getBigBlind$ : function() { return 3; };
        gs.potBB = parseFloat((srpFn('BTN_vs_BB') / bbFn()).toFixed(2));

        // Generate postflop spot for strategy lookup only — spot.flopCards never used for display
        const spot = generatePostflopSpot(20, ['BTN_vs_BB']);
        hr.postflopSpot = spot;

    } else if (nextStreet === 'turn') {
        // Step 4: Deal one turn card and append
        const turnCards = _dealBoardCards(hr, 1);
        for (const c of turnCards) gs.board.push(c);

        // Pick turn generator from flop history
        const genName = _simResolveTurnGenerator(gs);
        let turnGenFn;
        if (genName === 'generateDelayedTurnSpot' && typeof generateDelayedTurnSpot === 'function') {
            turnGenFn = generateDelayedTurnSpot;
        } else if (genName === 'generateTurnDefendSpot') {
            turnGenFn = generateTurnDefendSpot;
        } else {
            turnGenFn = generateTurnCBetSpot;
        }
        hr.postflopSpot = turnGenFn(20, ['BTN_vs_BB']);

    } else if (nextStreet === 'river') {
        // Pass 2.5: no river spot generators — go straight to showdown
        // EXTENSION Pass 3: river street — call generateRiverCBetSpot / generateRiverDefendSpot
        hr.street = 'showdown';
        hr.nodeType = 'terminal';
        hr.terminal = true;
        _resolveOutcome(hr);
        return hr;

    } else if (nextStreet === 'showdown') {
        hr.street = 'showdown';
        hr.nodeType = 'terminal';
        hr.terminal = true;
        _resolveOutcome(hr);
        return hr;
    }

    // Step 5: Determine firstToActIndex — OOP seat acts first postflop
    // For BTN_vs_BB_SRP: BB is always OOP → acts first
    const villainSeat = hr.seats.find(s => s !== null && !s.isHero && !s.folded && !s.allIn);
    const firstActIdx = villainSeat ? villainSeat.index : hr.heroSeatIndex;
    const heroActsFirst = (firstActIdx === hr.heroSeatIndex);

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

function applyHeroAction(handRun, action) {
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
        // C-bet: 33% of pot per spec Part 7
        sizingBB = Math.round(gs.potBB * 0.33 * 10) / 10;
    } else if (action === 'raise' && (street === 'flop' || street === 'turn' || street === 'river')) {
        // Raise villain's bet: 2.5× villain bet
        const villainBet = [...ss.actions].reverse().find(a => a.seatLabel !== heroSeat.label && (a.action === 'bet' || a.action === 'raise'));
        sizingBB = villainBet ? Math.round(villainBet.sizingBB * 2.5 * 10) / 10 : Math.round(gs.potBB * 0.33 * 2.5 * 10) / 10;
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
        pendingNode.grade = (action === pendingNode.correctAction) ? 'correct'
            : (pendingNode.mixFrequency && pendingNode.mixFrequency[action] !== undefined) ? 'mixed'
            : 'error';
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
    } else if (action === 'call') {
        if (street === 'preflop') {
            sizingBB = (typeof getOpenSizeBB === 'function') ? getOpenSizeBB() : 2.5;
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

    // Pass 2.5: 3-bet terminates hand (hero folds assumed for simplicity)
    if (action === '3bet') {
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
    const heroSeat = hr.seats[hr.heroSeatIndex];
    const villainSeat = hr.seats.find(s => s !== null && !s.isHero);
    const gs = hr.gameState;
    const startPot = gs.potBB;

    let winner, heroNetBB;
    if (heroSeat && heroSeat.folded) {
        winner = villainSeat ? villainSeat.label : 'villain';
        heroNetBB = -(startPot * 0.5);
    } else if (villainSeat && villainSeat.folded) {
        winner = heroSeat.label;
        heroNetBB = startPot * 0.5;
    } else {
        // Showdown — rough 50/50 for Pass 2.5
        const heroWins = Math.random() < 0.5;
        winner = heroWins ? heroSeat.label : (villainSeat ? villainSeat.label : 'villain');
        heroNetBB = heroWins ? startPot * 0.5 : -(startPot * 0.5);
    }

    hr.outcome = {
        winner,
        potBB: startPot,
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
        explanation: n.explanation
    }));
    const mistakeCount = nodes.filter(n => n.grade === 'error').length;

    // Build line from actual streetHistory per spec Part 4
    const heroLine = getPlayerLine(handRun, 'BTN');
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

    let lineAssessment;
    if (mistakeCount === 0) {
        lineAssessment = lineStr + ' \u2014 no errors.';
    } else if (mistakeCount === 1) {
        const mistake = nodes.find(n => n.grade === 'error');
        lineAssessment = lineStr + ' \u2014 1 error ('
            + (mistake ? mistake.explanation || ('wrong action on ' + mistake.street) : 'mistake detected') + ').';
    } else {
        lineAssessment = lineStr + ' \u2014 ' + mistakeCount + ' errors.';
    }

    return { streetSummaries, mistakeCount, lineAssessment };
}

// ---------------------------------------------------------------------------
// createHandRun
// ---------------------------------------------------------------------------

function createHandRun(config) {
    // EXTENSION Pass 3: add BB defense lane, CO_vs_BB, additional families
    // EXTENSION Pass 5: multiway pots — committedBB and streetHistory already support N players
    const lane = config && config.lane;
    if (lane !== 'BTN_vs_BB_SRP') {
        throw new Error('Lane not supported: ' + lane);
    }

    const holeCards = _dealHeroCards();

    // 9-max ready; Pass 2.5 only seats[0] (BTN/hero) and seats[1] (BB/villain)
    // EXTENSION Pass 5: populate seats[2–8] for full 9-max
    const seats = [
        { index: 0, label: 'BTN', isHero: true,  stackBB: 100, holeCards: holeCards, folded: false, allIn: false },
        { index: 1, label: 'BB',  isHero: false, stackBB: 100, holeCards: null,      folded: false, allIn: false },
        null, null, null, null, null, null, null
    ];

    const hr = {
        id: 'hand_' + Date.now(),
        lane: 'BTN_vs_BB_SRP',
        seats,
        heroSeatIndex: 0,
        street: 'preflop',   // mirror of gameState.streetState.street
        nodeType: 'hero_decision',
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
                actingIndex: 0,         // BTN acts first preflop
                firstToActIndex: 0,
                betMadeThisStreet: false,
                raiseMadeThisStreet: false,
                committedBB: _buildCommittedBB(seats),
                actions: []
            }
        }
    };

    resolveDecisionNode(hr);
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
    global.generateTurnCBetSpot    = global.generatePostflopSpot;
    global.generateTurnDefendSpot  = global.generatePostflopSpot;
    global.generateDelayedTurnSpot = global.generatePostflopSpot;

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

    console.log('GameState self-test passed');
    console.log('sim.js self-test passed');
}
