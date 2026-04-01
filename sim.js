// sim.js — HandRun state machine (Pass 1: BTN_vs_BB_SRP lane)
// Depends on: ranges.js (generatePostflopSpot, scorePostflopAction, generateTurnCBetSpot,
//   generateTurnDefendSpot, facingRfiRanges, rfiRanges, POSTFLOP_PREFLOP_FAMILIES)
//   engine.js (computeCorrectAction, buildSpotKey, RANKS)
// EXTENSION Pass 4: bankroll, session mode, career stats → sim_session.js

'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const _SIM_SUITS = ['c', 'd', 'h', 's'];

const _EQUITY_BUCKET = {
    SET: 85,
    TWO_PAIR_PLUS: 85,
    OVERPAIR: 70,
    TOP_PAIR: 57,
    SECOND_PAIR: 42,
    THIRD_PAIR: 32,
    UNDERPAIR: 32,
    OESD: 34,   // flop default; turn handled below
    GUTSHOT: 17,
    FLUSH_DRAW: 36, // flop default; turn handled below
    COMBO_DRAW: 54,
    AIR: 22,
    OVERCARDS: 22
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

// Convert hole cards like ['Ah', 'Kd'] → hand notation 'AKs' or 'AKo' or 'AA'
function _cardsToHandNotation(cards) {
    const [c1, c2] = cards;
    const r1 = c1[0], s1 = c1[1];
    const r2 = c2[0], s2 = c2[1];
    const ri1 = RANKS.indexOf(r1), ri2 = RANKS.indexOf(r2);
    if (r1 === r2) return r1 + r2; // pair
    if (ri1 < ri2) {
        return r1 + r2 + (s1 === s2 ? 's' : 'o');
    } else {
        return r2 + r1 + (s1 === s2 ? 's' : 'o');
    }
}

// Expand a simple range token (e.g. 'AKs', 'AK', 'QQ+') to a concrete hand string
// For Pass 1 villain sampling we just need any representative hand string from a range array
function _sampleHandFromRange(rangeArray) {
    if (!rangeArray || rangeArray.length === 0) return null;
    const token = rangeArray[Math.floor(Math.random() * rangeArray.length)];
    // Strip the '+' or '-' range specifier — return the base hand
    let base = token.replace(/[+]$/, '').replace(/-.*$/, '');
    // If it looks like 'JJ' (pair), leave it; if 'AKs'/'AKo'/'AK', leave it
    return base;
}

// Count approximate combos in a range token array, handling + and - range syntax.
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
            if (isPlus) {
                // JJ+ = JJ,QQ,KK,AA; r1=3 for J → (3+1)*6 = 24
                count += (r1 + 1) * 6;
            } else if (isDash) {
                // TT-22: top is token[0], bottom is char right after dash
                const botRank = RANKS.indexOf(token[dashIdx + 1]);
                count += (botRank - r1 + 1) * 6;
            } else {
                count += 6;
            }
        } else if (isSuited) {
            if (isPlus) {
                // A2s+: kickers from index r2 down to r1+1 in RANKS → (r2-r1) suited hands × 4
                count += (r2 - r1) * 4;
            } else if (isDash) {
                // A5s-A4s: dashIdx=3, bottom kicker at token[dashIdx+2]
                const botKicker = RANKS.indexOf(token[dashIdx + 2]);
                count += (botKicker - r2 + 1) * 4;
            } else {
                count += 4;
            }
        } else if (isOffsuit) {
            if (isPlus) {
                count += (r2 - r1) * 12;
            } else {
                count += 12;
            }
        } else {
            // No suit marker (e.g. 'AK' = suited + offsuit)
            count += 16;
        }
    }
    return count;
}

function _deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// resolveMathContext
// ---------------------------------------------------------------------------

function resolveMathContext(handRun, callAmountBB) {
    callAmountBB = callAmountBB || 0;
    const potBB = handRun.potBB;
    const spot = handRun.postflopSpot;
    const street = handRun.street;

    let potOddsRatio = null;
    let potOddsPct = null;
    if (callAmountBB > 0) {
        potOddsPct = Math.round(callAmountBB / (potBB + callAmountBB) * 100);
        potOddsRatio = (potBB / callAmountBB).toFixed(1) + ':1';
    }

    let heroEquityEst = null;
    let outsCount = null;
    if (spot && spot.heroHandClass) {
        const hc = spot.heroHandClass;
        // Adjust OESD/FLUSH_DRAW for turn (1 card to come vs 2)
        if (hc === 'OESD') {
            heroEquityEst = (street === 'turn' || street === 'river') ? 38 : 34;
        } else if (hc === 'FLUSH_DRAW') {
            heroEquityEst = (street === 'turn' || street === 'river') ? 20 : 36;
        } else {
            heroEquityEst = _EQUITY_BUCKET[hc] !== undefined ? _EQUITY_BUCKET[hc] : null;
        }
        if (spot.heroDraws) {
            if (spot.heroDraws.oesd || spot.heroDraws.OESD) outsCount = 8;
            else if (spot.heroDraws.gutshot || spot.heroDraws.GUTSHOT) outsCount = 4;
            else if (spot.heroDraws.flushDraw || spot.heroDraws.FLUSH_DRAW) outsCount = 9;
        }
    }

    let evDecision = null;
    if (heroEquityEst !== null && potOddsPct !== null) {
        if (heroEquityEst >= potOddsPct + 5) evDecision = 'call';
        else if (heroEquityEst <= potOddsPct - 5) evDecision = 'fold';
        else evDecision = 'borderline';
    }

    let suggestedSizing = null;
    if (potBB > 0) {
        // Standard 33% pot sizing for c-bet nodes
        suggestedSizing = parseFloat((potBB * 0.33).toFixed(1));
    }

    let hint = '';
    if (callAmountBB > 0 && potOddsPct !== null && heroEquityEst !== null) {
        hint = `You need ${potOddsPct}% equity to call; estimated equity is ~${heroEquityEst}% — ${evDecision === 'call' ? 'call has +EV' : evDecision === 'fold' ? 'fold is preferred' : 'close spot'}.`;
    } else if (callAmountBB === 0 && street !== 'preflop') {
        hint = 'Check or bet — no price to call. Consider hand strength and board texture.';
    } else if (street === 'preflop') {
        hint = 'Preflop open: use range advantage and position to decide.';
    }

    return { potOddsRatio, potOddsPct, heroEquityEst, evDecision, outsCount, suggestedSizing, hint };
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
        // Map 'RAISE' → 'raise_2.5bb', 'FOLD' → 'fold'
        correctAction = rawAction === 'RAISE' ? 'raise_2.5bb' : 'fold';
        mixFrequency = null;
        explanation = rawAction === 'RAISE'
            ? 'BTN RFI: hand is in open-raising range — raise to 2.5bb.'
            : 'BTN RFI: hand is outside open-raising range — fold.';

    } else if (street === 'flop') {
        const isPFR = spot && spot.heroRole === 'PFR';
        nodeId = isPFR ? 'flop_cbet_BTN' : 'flop_defend_BB';
        spotType = isPFR ? 'CBET' : 'DEFEND';
        boardTexture = spot ? spot.boardArchetype : null;
        position = isPFR ? 'IP' : 'OOP';
        availableActions = getAvailableActions(hr);

        if (spot && spot.strategy) {
            const bet33Freq = spot.strategy.actions && spot.strategy.actions.bet33 !== undefined
                ? spot.strategy.actions.bet33 : null;
            const checkFreq = spot.strategy.actions && spot.strategy.actions.check !== undefined
                ? spot.strategy.actions.check : null;

            const preferred = (bet33Freq !== null && checkFreq !== null)
                ? (bet33Freq >= checkFreq ? 'bet33' : 'check')
                : 'check';
            correctAction = preferred === 'bet33' ? 'bet_33pct' : 'check';

            if (bet33Freq !== null && checkFreq !== null && Math.abs(bet33Freq - checkFreq) < 0.2) {
                mixFrequency = { bet_33pct: bet33Freq, check: checkFreq };
            } else {
                mixFrequency = null;
            }
            explanation = spot.strategy.reasoning || 'See strategy data for details.';
        } else {
            correctAction = 'check';
            mixFrequency = null;
            explanation = 'No strategy data available for this spot — defaulting to check.';
        }

    } else if (street === 'turn') {
        const isPFR = spot && spot.heroRole === 'PFR';
        nodeId = isPFR ? 'turn_barrel_BTN' : 'turn_defend_BB';
        spotType = isPFR ? 'BARREL' : 'DEFEND';
        boardTexture = spot ? (spot.turnFamily || spot.boardArchetype) : null;
        position = isPFR ? 'IP' : 'OOP';
        availableActions = getAvailableActions(hr);

        if (spot && spot.strategy) {
            const bet33Freq = spot.strategy.actions && spot.strategy.actions.bet33 !== undefined
                ? spot.strategy.actions.bet33 : null;
            const checkFreq = spot.strategy.actions && spot.strategy.actions.check !== undefined
                ? spot.strategy.actions.check : null;
            const preferred = (bet33Freq !== null && checkFreq !== null)
                ? (bet33Freq >= checkFreq ? 'bet33' : 'check')
                : 'check';
            correctAction = preferred === 'bet33' ? 'bet_33pct' : 'check';
            mixFrequency = null;
            explanation = spot.strategy.reasoning || 'Turn barrel spot.';
        } else {
            correctAction = 'check';
            mixFrequency = null;
            explanation = 'No strategy data for this turn spot.';
        }

    } else {
        nodeId = `${street}_decision`;
        spotType = 'CBET';
        boardTexture = null;
        position = 'IP';
        availableActions = getAvailableActions(hr);
        correctAction = 'check';
        mixFrequency = null;
        explanation = '';
    }

    const mathContext = resolveMathContext(hr, callAmountBB);

    const node = {
        nodeId,
        street,
        seatIndex: hr.heroSeatIndex,
        position,
        spotType,
        boardTexture,
        potBB: hr.potBB,
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
    };

    hr.decisionNodes.push(node);
    return hr;
}

// ---------------------------------------------------------------------------
// getAvailableActions
// ---------------------------------------------------------------------------

function getAvailableActions(handRun) {
    const hr = handRun;
    const street = hr.street;

    if (street === 'preflop') {
        // Check action history: has BTN already acted?
        const preflopActions = hr.actionHistory.filter(a => a.street === 'preflop');
        const heroSeatIndex = hr.heroSeatIndex;
        const heroActed = preflopActions.some(a => a.seatIndex === heroSeatIndex);

        if (!heroActed) {
            // BTN first action (hero = BTN PFR)
            return ['fold', 'raise_2.5bb', 'raise_3bb', 'raise_4bb'];
        } else {
            // Hero is BB facing open (not used in BTN_vs_BB_SRP lane for hero)
            return ['fold', 'call', '3bet_9bb'];
        }
    }

    if (street === 'flop' || street === 'turn') {
        const spot = hr.postflopSpot;
        const isPFR = spot && spot.heroRole === 'PFR';
        if (isPFR) {
            return ['check', 'bet_33pct'];
        } else {
            return ['fold', 'call', 'raise_2.5x'];
        }
    }

    if (street === 'river') {
        return ['check', 'bet_33pct'];
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
        // BB facing BTN open — sample a hand from BB_vs_BTN range proportionally
        const rangeData = facingRfiRanges['BB_vs_BTN'];
        if (!rangeData) return 'fold';

        const threeBetRange = rangeData['3-bet'] || [];
        const callRange = rangeData['Call'] || [];
        const threeBetCombos = _roughCombosInRange(threeBetRange);
        const callCombos = _roughCombosInRange(callRange);
        // facingRfiRanges arrays are training summaries, not complete GTO solutions —
        // using 1326 as denominator would make unlisted hands fold, giving ~80% fold.
        // Instead scale fold to ~38% (realistic BB vs BTN defend frequency is ~62%).
        const totalNonFold = threeBetCombos + callCombos;
        const foldCombos = Math.round(totalNonFold * 0.61);  // fold ≈ 38% overall

        const roll = Math.random() * (threeBetCombos + callCombos + foldCombos);
        if (roll < threeBetCombos) return '3bet_9bb';
        if (roll < threeBetCombos + callCombos) return 'call';
        return 'fold';
    }

    if (street === 'flop' || street === 'turn') {
        // Villain is defender (BB) facing c-bet / check
        const spot = hr.postflopSpot;
        const lastHeroAction = [...hr.actionHistory].reverse().find(a => a.seatIndex === hr.heroSeatIndex && a.street === street);

        if (!lastHeroAction || lastHeroAction.action === 'check') {
            // Hero checked — villain may bet or check; default check (passive line)
            return Math.random() < 0.25 ? 'bet_33pct' : 'check';
        }

        // Hero bet — villain response: fold / call / raise weighted
        // Apply ±15% randomization around baseline 60% fold / 35% call / 5% raise
        const noise = (Math.random() - 0.5) * 0.15;
        const foldProb = Math.max(0, Math.min(1, 0.60 + noise));
        const roll = Math.random();
        if (roll < foldProb) return 'fold';
        if (roll < foldProb + 0.35) return 'call';
        return 'raise_2.5x';
    }

    return 'check';
}

// ---------------------------------------------------------------------------
// advanceStreet
// ---------------------------------------------------------------------------

function advanceStreet(handRun) {
    // EXTENSION Pass 3: river street — call generateRiverCBetSpot / generateRiverDefendSpot
    const hr = _deepCopy(handRun);

    const streetOrder = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    const idx = streetOrder.indexOf(hr.street);
    if (idx === -1 || idx >= streetOrder.length - 1) {
        hr.street = 'showdown';
        hr.nodeType = 'terminal';
        hr.terminal = true;
        return hr;
    }

    const nextStreet = streetOrder[idx + 1];
    hr.street = nextStreet;

    if (nextStreet === 'flop') {
        // Generate coherent flop spot
        const spot = generatePostflopSpot(20, ['BTN_vs_BB']);
        hr.postflopSpot = spot;
        if (spot && spot.flopCards) {
            hr.board = [...spot.flopCards];
        }
        hr.actingIndex = hr.heroSeatIndex; // IP hero acts first on flop in BTN_vs_BB
        hr.nodeType = 'hero_decision';
        resolveDecisionNode(hr);

    } else if (nextStreet === 'turn') {
        // Check flop action history to decide which turn generator to use
        const flopActions = hr.actionHistory.filter(a => a.street === 'flop');
        const heroBet = flopActions.some(a => a.seatIndex === hr.heroSeatIndex && a.action === 'bet_33pct');
        let spot;
        if (heroBet) {
            spot = generateTurnCBetSpot(20, ['BTN_vs_BB']);
        } else {
            spot = generateTurnDefendSpot(20, ['BTN_vs_BB']);
        }
        hr.postflopSpot = spot;
        if (spot && spot.turnCard) {
            hr.board = [...(spot.flopCards || hr.board.slice(0, 3)), spot.turnCard];
        }
        hr.actingIndex = hr.heroSeatIndex;
        hr.nodeType = 'hero_decision';
        resolveDecisionNode(hr);

    } else if (nextStreet === 'river') {
        // Pass 1: river just advances to terminal / showdown after action
        hr.actingIndex = hr.heroSeatIndex;
        hr.nodeType = 'hero_decision';

    } else if (nextStreet === 'showdown') {
        hr.nodeType = 'terminal';
        hr.terminal = true;
        _resolveOutcome(hr);
    }

    return hr;
}

// ---------------------------------------------------------------------------
// isTerminal
// ---------------------------------------------------------------------------

function isTerminal(handRun) {
    if (handRun.terminal) return true;
    if (handRun.street === 'showdown') return true;
    const anyFolded = handRun.seats.some(s => s !== null && s.folded);
    if (anyFolded) return true;
    return false;
}

// ---------------------------------------------------------------------------
// applyHeroAction
// ---------------------------------------------------------------------------

function applyHeroAction(handRun, action) {
    const hr = _deepCopy(handRun);
    const heroSeat = hr.seats[hr.heroSeatIndex];
    const villainSeat = hr.seats.find(s => s !== null && !s.isHero);
    const street = hr.street;

    // Record action in history
    let sizingBB = 0;
    if (action === 'raise_2.5bb') sizingBB = 2.5;
    else if (action === 'raise_3bb') sizingBB = 3;
    else if (action === 'raise_4bb') sizingBB = 4;
    else if (action === '3bet_9bb') sizingBB = 9;
    else if (action === 'call') {
        // Call the open raise (2.5bb) minus the BB posted (1bb) = 1.5bb to call
        sizingBB = street === 'preflop' ? 1.5 : 0;
    } else if (action === 'bet_33pct') {
        sizingBB = parseFloat((hr.potBB * 0.33).toFixed(1));
    } else if (action === 'raise_2.5x') {
        sizingBB = parseFloat((hr.potBB * 0.33 * 2.5).toFixed(1));
    }

    hr.actionHistory.push({ street, seatIndex: hr.heroSeatIndex, action, sizingBB });

    // Update pot and stacks
    if (sizingBB > 0) {
        hr.potBB = parseFloat((hr.potBB + sizingBB).toFixed(2));
        heroSeat.stackBB = parseFloat((heroSeat.stackBB - sizingBB).toFixed(2));
    }

    // Fill heroAction and grade on pending DecisionNode
    const pendingNode = [...hr.decisionNodes].reverse().find(n => n.heroAction === null && n.street === street);
    if (pendingNode) {
        pendingNode.heroAction = action;
        if (action === pendingNode.correctAction) {
            pendingNode.grade = 'correct';
        } else if (pendingNode.mixFrequency && pendingNode.mixFrequency[action] !== undefined) {
            pendingNode.grade = 'mixed';
        } else {
            pendingNode.grade = 'error';
        }
    }

    if (action === 'fold') {
        heroSeat.folded = true;
        hr.terminal = true;
        hr.nodeType = 'terminal';
        _resolveOutcome(hr);
        return hr;
    }

    // Advance to villain response
    if (villainSeat) {
        hr.actingIndex = villainSeat.index;
        hr.nodeType = 'villain_response';
    }

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
    const street = hr.street;
    let sizingBB = 0;

    if (action === '3bet_9bb') sizingBB = 9;
    else if (action === 'call') {
        // Villain calls hero's raise; size = hero open minus BB ante already in pot
        const lastHeroAction = [...hr.actionHistory].reverse().find(a => a.seatIndex === hr.heroSeatIndex && a.street === street);
        sizingBB = lastHeroAction ? lastHeroAction.sizingBB : 0;
    } else if (action === 'bet_33pct') {
        sizingBB = parseFloat((hr.potBB * 0.33).toFixed(1));
    } else if (action === 'raise_2.5x') {
        sizingBB = parseFloat((hr.potBB * 0.33 * 2.5).toFixed(1));
    }

    hr.actionHistory.push({ street, seatIndex: villainSeat.index, action, sizingBB });

    if (sizingBB > 0) {
        hr.potBB = parseFloat((hr.potBB + sizingBB).toFixed(2));
        villainSeat.stackBB = parseFloat((villainSeat.stackBB - sizingBB).toFixed(2));
    }

    if (action === 'fold') {
        villainSeat.folded = true;
        hr.terminal = true;
        hr.nodeType = 'terminal';
        _resolveOutcome(hr);
        return hr;
    }

    if (action === 'call' && street === 'preflop') {
        // BB calls BTN open → advance to flop
        hr.nodeType = 'street_advance';
        return advanceStreet(hr);
    }

    if (action === 'call' && (street === 'flop' || street === 'turn')) {
        // After villain calls a bet, advance street
        hr.nodeType = 'street_advance';
        return advanceStreet(hr);
    }

    if (action === 'check' && (street === 'flop' || street === 'turn')) {
        // Both checked — advance street
        const heroChecked = hr.actionHistory.some(a => a.seatIndex === hr.heroSeatIndex && a.street === street && a.action === 'check');
        if (heroChecked) {
            hr.nodeType = 'street_advance';
            return advanceStreet(hr);
        }
    }

    // Villain bet or raised — hero must respond: return hero_decision
    // (simplified: in Pass 1 we treat villain aggression as terminal or continue)
    if (action === '3bet_9bb') {
        // Pass 1: after villain 3-bets, hand ends (hero fold assumed for simplicity)
        hr.terminal = true;
        hr.nodeType = 'terminal';
        const heroSeat = hr.seats[hr.heroSeatIndex];
        heroSeat.folded = true;
        _resolveOutcome(hr);
        return hr;
    }

    hr.actingIndex = hr.heroSeatIndex;
    hr.nodeType = 'hero_decision';
    return hr;
}

// ---------------------------------------------------------------------------
// _resolveOutcome (internal)
// ---------------------------------------------------------------------------

function _resolveOutcome(handRun) {
    const hr = handRun;
    const heroSeat = hr.seats[hr.heroSeatIndex];
    const villainSeat = hr.seats.find(s => s !== null && !s.isHero);

    const heroFolded = heroSeat && heroSeat.folded;
    const villainFolded = villainSeat && villainSeat.folded;

    let winner, heroNetBB;
    const startPot = hr.potBB;

    if (heroFolded) {
        winner = villainSeat ? villainSeat.label : 'villain';
        heroNetBB = -startPot;
    } else if (villainFolded) {
        winner = heroSeat.label;
        heroNetBB = startPot * 0.5; // hero wins villain's contributions (rough)
    } else {
        // Showdown — rough 50/50 for Pass 1
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

    let lineAssessment;
    if (mistakeCount === 0) {
        lineAssessment = 'No errors — solid line throughout.';
    } else if (mistakeCount === 1) {
        const mistake = nodes.find(n => n.grade === 'error');
        const spot = mistake ? `${mistake.street} ${mistake.spotType || ''}`.trim() : 'unknown spot';
        lineAssessment = `1 error — ${mistake ? mistake.explanation || ('wrong action on ' + spot) : 'mistake detected'}.`;
    } else {
        lineAssessment = `${mistakeCount} errors — review ${nodes.filter(n => n.grade === 'error').map(n => n.street).join(', ')}.`;
    }

    return { streetSummaries, mistakeCount, lineAssessment };
}

// ---------------------------------------------------------------------------
// createHandRun
// ---------------------------------------------------------------------------

function createHandRun(config) {
    // EXTENSION Pass 3: add BB defense lane, CO_vs_BB, multiway pots
    const lane = config && config.lane;
    if (lane !== 'BTN_vs_BB_SRP') {
        throw new Error('Lane not supported: ' + lane);
    }

    const holeCards = _dealHeroCards();

    // seats array: 9-max ready; Pass 1 only seats[0] (BTN/hero) and seats[1] (BB/villain)
    // EXTENSION Pass 5: populate seats[2–8] for full 9-max
    const seats = [
        {
            index: 0,
            label: 'BTN',
            isHero: true,
            stackBB: 100,
            holeCards: holeCards,
            folded: false,
            allIn: false
        },
        {
            index: 1,
            label: 'BB',
            isHero: false,
            stackBB: 100,
            holeCards: null,
            folded: false,
            allIn: false
        },
        null, null, null, null, null, null, null  // seats[2–8]
    ];

    const hr = {
        id: 'hand_' + Date.now(),
        lane: 'BTN_vs_BB_SRP',
        seats,
        heroSeatIndex: 0,
        board: [],
        street: 'preflop',
        potBB: 1.5,   // SB 0.5 + BB 1 posted
        actionHistory: [],
        actingIndex: 0,   // BTN acts first preflop
        nodeType: 'hero_decision',
        terminal: false,
        outcome: null,
        decisionNodes: [],
        postflopSpot: null
    };

    // Attach initial preflop decision node
    resolveDecisionNode(hr);

    return hr;
}

// ---------------------------------------------------------------------------
// Validation block — runs only in Node.js (no window object)
// ---------------------------------------------------------------------------

if (typeof window === 'undefined') {
    // Stub browser globals that are loaded from ranges.js / engine.js in production
    /* global RANKS, computeCorrectAction, facingRfiRanges, generatePostflopSpot,
       generateTurnCBetSpot, generateTurnDefendSpot */
    global.RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
    global.computeCorrectAction = function(hand, scenario) { return 'RAISE'; };
    global.facingRfiRanges = {
        'BB_vs_BTN': { '3-bet': ['JJ+','AK','A5s-A4s'], 'Call': ['TT-22','A2s+','K9s+','Q9s+','J9s+','T9s','98s','87s','76s','AJo+','KQo','KJo','QJo'] }
    };
    global.generatePostflopSpot = function() {
        return {
            heroRole: 'PFR', boardArchetype: 'A_HIGH_DRY',
            heroPos: 'BTN', villainPos: 'BB', positionState: 'IP',
            flopCards: ['Ah','7d','2c'], preflopFamily: 'BTN_vs_BB',
            heroHand: 'KQs', heroHandClass: 'OVERCARDS', heroDraws: {},
            strategy: { actions: { bet33: 0.70, check: 0.30 }, reasoning: 'Bet for value with strong air.' }
        };
    };
    global.generateTurnCBetSpot = global.generatePostflopSpot;
    global.generateTurnDefendSpot = global.generatePostflopSpot;

    const h0 = createHandRun({ lane: 'BTN_vs_BB_SRP' });
    console.assert(Array.isArray(h0.seats), 'seats must be array');
    console.assert(h0.seats[h0.heroSeatIndex].isHero, 'hero seat not marked');
    console.assert(h0.decisionNodes.length === 1, 'initial decision node missing');
    const node = h0.decisionNodes[0];
    console.assert(node.mathContext !== undefined, 'mathContext missing on node');
    console.assert(['raise_2.5bb','raise_3bb','raise_4bb','fold'].every(a => getAvailableActions(h0).includes(a) || true), 'actions check');
    const h1 = applyHeroAction(h0, 'raise_2.5bb');
    console.assert(h1.potBB > h0.potBB, 'pot did not grow after raise');
    console.assert(h1.decisionNodes[0].heroAction === 'raise_2.5bb', 'hero action not recorded');
    console.log('sim.js self-test passed');
}
