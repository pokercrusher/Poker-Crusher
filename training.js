// training.js — Medals, drills, daily run, challenge mode, generateNextRound, handleInput
// Auto-split from PokerCrusher monolith — do not reorder script tags

const SCENARIO_NAMES = { RFI: 'RFI (Unopened)', FACING_RFI: 'Defending vs RFI', RFI_VS_3BET: 'vs 3-Bet', VS_4BET: 'vs 4-Bet (5B/Call/Fold)', VS_LIMP: 'Vs Limpers (1–3+)', SQUEEZE: 'Squeeze', SQUEEZE_2C: 'Squeeze vs 2C', PUSH_FOLD: 'Push / Fold (Short Stack)', POSTFLOP_CBET: 'Flop C-Bet (Postflop)', POSTFLOP_3BP_CBET: '3BP Flop C-Bet (Postflop)', POSTFLOP_DEFEND: 'Defend vs C-Bet (Postflop)', POSTFLOP_3BP_DEFEND: '3BP Flop Defense (Postflop)', POSTFLOP_TURN_CBET: 'Turn Barrel (Postflop)', POSTFLOP_TURN_DEFEND: 'Turn Defense (Postflop)', POSTFLOP_TURN_DELAYED_CBET: 'Turn Delayed C-Bet (Postflop)', POSTFLOP_TURN_PROBE: 'Turn Probe Defense (Postflop)', POSTFLOP_TURN_PROBE_DEFEND: 'Turn Probe Bet (Postflop)', POSTFLOP_RIVER_CBET: 'River Barrel (Postflop)', POSTFLOP_RIVER_DEFEND: 'River Defense (Postflop)', POSTFLOP_RIVER_DELAYED_CBET: 'River Barrel — Delayed Line (Postflop)', POSTFLOP_RIVER_DELAYED_DEFEND: 'River Defense — Delayed Line (Postflop)', POSTFLOP_RIVER_PROBE: 'River Probe Defense (Postflop)', POSTFLOP_RIVER_PROBE_BET: 'River Probe Bet (Postflop)', POSTFLOP_TURN_DELAYED_DEFEND: 'Turn Delayed Defense (Postflop)', POSTFLOP_RIVER_TURN_CHECK_CBET: 'River Barrel — Turn Check-Check (Postflop)', POSTFLOP_RIVER_TURN_CHECK_DEFEND: 'River Defense — Turn Check-Check (Postflop)', POSTFLOP_RIVER_PROBE_CALL_BET: 'River 2nd Barrel — Probe Line (Postflop)', POSTFLOP_RIVER_PROBE_CALL_DEFEND: 'River Defense — Probe 2nd Barrel (Postflop)' };
const MEDAL_THRESHOLDS = {
    bronze: { hands: 10, accuracy: 65 },
    silver: { hands: 25, accuracy: 80 },
    gold:   { hands: 40, accuracy: 90 }
};
const MEDAL_ICONS = { gold: '🥇', silver: '🥈', bronze: '🥉', none: '' };
const MEDAL_COLORS = { gold: 'text-yellow-400', silver: 'text-slate-300', bronze: 'text-amber-600', none: 'text-slate-600' };

// ============================================================
// FAMILY MAPPING MODEL — drives the unified session builder
// ============================================================
const FAMILY_MODEL = {
    PREFLOP: [
        { id: 'OPEN',     label: 'Open',      scenarios: ['RFI'] },
        { id: 'DEFEND',   label: 'Defend',     scenarios: ['FACING_RFI'] },
        { id: 'VS_3BET',  label: 'vs 3bet',    scenarios: ['RFI_VS_3BET'] },
        { id: 'VS_4BET',  label: 'vs 4bet',    scenarios: ['VS_4BET'] },
        { id: 'LIMPERS',  label: 'Limpers',    scenarios: ['VS_LIMP'] },
        { id: 'SQUEEZE',  label: 'Squeeze',    scenarios: ['SQUEEZE', 'SQUEEZE_2C'] },
        { id: 'PUSH_FOLD',label: 'Push/Fold',  scenarios: ['PUSH_FOLD'] },
    ],
    POSTFLOP: [
        { id: 'FLOP_CBET',          label: 'Flop C-Bet',      scenarios: ['POSTFLOP_CBET'] },
        { id: '3BP_FLOP_CBET',      label: '3BP Flop C-Bet',  scenarios: ['POSTFLOP_3BP_CBET'] },
        { id: 'FLOP_DEFEND',        label: 'Flop Defense',     scenarios: ['POSTFLOP_DEFEND'] },
        { id: '3BP_FLOP_DEFEND',    label: '3BP Flop Defense', scenarios: ['POSTFLOP_3BP_DEFEND'] },
        { id: 'TURN_CBET',          label: 'Turn Barrel',      scenarios: ['POSTFLOP_TURN_CBET'] },
        { id: 'TURN_DEFEND',        label: 'Turn Defense',     scenarios: ['POSTFLOP_TURN_DEFEND'] },
        { id: 'TURN_DELAYED_CBET',    label: 'Turn Delayed Bet',    scenarios: ['POSTFLOP_TURN_DELAYED_CBET'] },
        { id: 'TURN_DELAYED_DEFEND',  label: 'Turn Delayed Defense', scenarios: ['POSTFLOP_TURN_DELAYED_DEFEND'] },
        { id: 'TURN_PROBE',         label: 'Turn Probe',       scenarios: ['POSTFLOP_TURN_PROBE'] },
        { id: 'TURN_PROBE_DEFEND',  label: 'Turn Probe Bet',   scenarios: ['POSTFLOP_TURN_PROBE_DEFEND'] },
        { id: 'RIVER_CBET',         label: 'River Barrel',          scenarios: ['POSTFLOP_RIVER_CBET'] },
        { id: 'RIVER_DEFEND',       label: 'River Defense',         scenarios: ['POSTFLOP_RIVER_DEFEND'] },
        { id: 'RIVER_DELAYED_CBET',    label: 'River Barrel (Delayed)',  scenarios: ['POSTFLOP_RIVER_DELAYED_CBET'] },
        { id: 'RIVER_DELAYED_DEFEND',  label: 'River Defense (Delayed)', scenarios: ['POSTFLOP_RIVER_DELAYED_DEFEND'] },
        { id: 'RIVER_PROBE',           label: 'River Probe',             scenarios: ['POSTFLOP_RIVER_PROBE'] },
        { id: 'RIVER_PROBE_BET',       label: 'River Probe Bet',         scenarios: ['POSTFLOP_RIVER_PROBE_BET'] },
        { id: 'RIVER_TURN_CHECK_CBET',    label: 'River TCC-Bet',           scenarios: ['POSTFLOP_RIVER_TURN_CHECK_CBET'] },
        { id: 'RIVER_TURN_CHECK_DEFEND',  label: 'River TCC-Def',           scenarios: ['POSTFLOP_RIVER_TURN_CHECK_DEFEND'] },
        { id: 'RIVER_PROBE_CALL_BET',     label: 'River P2-Bet',            scenarios: ['POSTFLOP_RIVER_PROBE_CALL_BET'] },
        { id: 'RIVER_PROBE_CALL_DEFEND',  label: 'River P2-Def',            scenarios: ['POSTFLOP_RIVER_PROBE_CALL_DEFEND'] },
    ]
    // Future: FULL_HAND: [...]
};
// Convenience: 'Mixed' is UI-only shortcut = all families selected

// Resolve selected family IDs → engine scenario keys
function familiesToScenarios(module, familyIds) {
    const families = FAMILY_MODEL[module] || [];
    const out = [];
    for (const fam of families) {
        if (familyIds.includes(fam.id)) {
            for (const sc of fam.scenarios) out.push(sc);
        }
    }
    return out;
}
// Reverse: scenario keys → family IDs (for loading saved config)
function scenariosToFamilies(module, scenarios) {
    const families = FAMILY_MODEL[module] || [];
    const ids = new Set();
    const scSet = new Set(scenarios);
    for (const fam of families) {
        if (fam.scenarios.some(s => scSet.has(s))) ids.add(fam.id);
    }
    return [...ids];
}

// ============================================================
// STAKE PRESETS — single source of truth for blind/sizing values
// ============================================================
const STAKE_PRESETS = {
    '1/2': { id: '1/2', label: '1/2', sb: 1, bb: 2, defaultOpen: 10,
              villainOpenPool: [4, 6, 8, 8, 10, 10, 10, 10, 12, 15, 17, 20] },
    '1/3': { id: '1/3', label: '1/3', sb: 1, bb: 3, defaultOpen: 15,
              villainOpenPool: [6, 10, 12, 12, 15, 15, 15, 15, 15, 15, 17, 18, 20, 25] },
    '2/5': { id: '2/5', label: '2/5', sb: 2, bb: 5, defaultOpen: 20,
              villainOpenPool: [10, 15, 15, 20, 20, 20, 20, 25, 25, 30, 35, 40] },
    '5/10': { id: '5/10', label: '5/10', sb: 5, bb: 10, defaultOpen: 40,
               villainOpenPool: [20, 25, 30, 30, 40, 40, 40, 50, 60, 75] },
};

// ============================================================
// UNIFIED SESSION BUILDER STATE
// ============================================================
// Natural live table rotation: as the button moves away each hand, hero cycles through
// all 9 positions in the order a seated player experiences them.
// BTN → SB → BB → UTG → UTG1 → UTG2 → LJ → HJ → CO → (repeat)
const LIVE_TABLE_ROTATION = ['BTN', 'SB', 'BB', 'UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO'];

// Legacy — kept for any external references; always uses FULL_TABLE lane now
const FULL_HAND_ALL_LANES = ['FULL_TABLE'];

function _simGetCurrentSessionLane() {
    return 'FULL_TABLE';
}

function _simGetCurrentHeroPos() {
    return LIVE_TABLE_ROTATION[(simSession.currentLaneIndex || 0) % LIVE_TABLE_ROTATION.length];
}

function _simAdvanceSessionLane() {
    simSession.currentLaneIndex = ((simSession.currentLaneIndex || 0) + 1) % LIVE_TABLE_ROTATION.length;
}

let sessionBuilder = {
    module: 'PREFLOP',  // legacy compat — derived from active families
    families: ['OPEN', 'DEFEND', 'VS_3BET', 'LIMPERS', 'SQUEEZE'],  // can span PREFLOP + POSTFLOP
    sessionLength: 'ENDLESS',  // 'ENDLESS' | 10 | 25 | 50
    stakeId: '1/3',            // key into STAKE_PRESETS
    displayMode: 'dollars',    // 'dollars' | 'bb'
    pfStacks: [5,8,10,13,15,20], // active push/fold stack depths
    fullHandMode: false,       // true = Full Hand mode — always uses live table rotation
    sessionMode: false,        // true = persistent stack session across hands
    sessionStack: 100          // starting stack in bb for session mode
};

// ============================================================
// SIM SESSION — persistent hand-to-hand state
// EXTENSION Pass 5: villainArchetype, tableSize, rebuys
// ============================================================
let simSession = {
    active: false,
    startStack: 100,
    currentStack: 100,
    peakStack: 100,
    troughStack: 100,
    handsPlayed: 0,
    totalDecisions: 0,
    correctDecisions: 0,
    currentLaneIndex: 0,
    handLog: []   // newest first; each entry = { handNum, lane, heroCards, villainCards, board, netBB, stackAfter, decisions, handAccuracy }
};

function startSimSession(stackBB) {
    var stack = (stackBB && stackBB > 0) ? stackBB : (sessionBuilder.sessionStack || 100);
    simSession = {
        active: true,
        startStack: stack,
        currentStack: stack,
        peakStack: stack,
        troughStack: stack,
        handsPlayed: 0,
        totalDecisions: 0,
        correctDecisions: 0,
        currentLaneIndex: 0,
        handLog: []
    };
    try { localStorage.setItem('gto_sim_session_active_v1', JSON.stringify(simSession)); } catch(e) {}
}

function endSimSession() {
    if (!simSession.active) return;
    simSession.active = false;
    var summary = {
        date: new Date().toISOString().slice(0, 10),
        handsPlayed: simSession.handsPlayed,
        startStack: simSession.startStack,
        endStack: simSession.currentStack,
        netBB: parseFloat((simSession.currentStack - simSession.startStack).toFixed(1)),
        overallAccuracy: simSession.totalDecisions > 0
            ? Math.round((simSession.correctDecisions / simSession.totalDecisions) * 100) : 0
    };
    try {
        var hist = JSON.parse(localStorage.getItem('gto_sim_history_v1') || '[]');
        hist.unshift(summary);
        if (hist.length > 20) hist.length = 20;
        localStorage.setItem('gto_sim_history_v1', JSON.stringify(hist));
        localStorage.removeItem('gto_sim_session_active_v1');
    } catch(e) {}
}

function _simRecordHandToSession(h) {
    if (!simSession.active || !h) return;
    var heroSeat = h.seats[h.heroSeatIndex];
    var villainSeat = h.seats.find(function(s) { return s !== null && !s.isHero; });
    var outcome = h.outcome;
    var netBB = outcome ? parseFloat(outcome.heroNetBB.toFixed(1)) : 0;

    simSession.currentStack = parseFloat((simSession.currentStack + netBB).toFixed(1));
    simSession.peakStack = Math.max(simSession.peakStack, simSession.currentStack);
    simSession.troughStack = Math.min(simSession.troughStack, simSession.currentStack);
    simSession.handsPlayed++;

    var decisions = h.decisionNodes.filter(function(n) { return n.heroAction !== null; }).map(function(n) {
        return {
            street: n.street,
            heroAction: n.heroAction,
            correctAction: n.correctAction,
            grade: n.grade,
            chosenSizingBucket: n.chosenSizingBucket || null,
            correctSizingBucket: n.correctSizingBucket || null,
            sizeGrade: n.sizeGrade || null,
            explanation: n.explanation || '',
            handClass: n.heroHandClass || null
        };
    });

    var correct = decisions.filter(function(d) { return d.grade === 'correct'; }).length;
    simSession.totalDecisions += decisions.length;
    simSession.correctDecisions += correct;

    simSession.handLog.unshift({
        handNum: simSession.handsPlayed,
        lane: h.lane,
        heroCards: heroSeat ? (heroSeat.holeCards || []) : [],
        villainCards: villainSeat ? (villainSeat.holeCards || []) : [],
        board: (h.gameState && h.gameState.board) ? h.gameState.board : [],
        showdownReached: h.outcome ? h.outcome.showdownReached : false,
        netBB: netBB,
        stackAfter: simSession.currentStack,
        decisions: decisions,
        handAccuracy: decisions.length > 0 ? correct / decisions.length : 1
    });

    try { localStorage.setItem('gto_sim_session_active_v1', JSON.stringify(simSession)); } catch(e) {}
}

function toggleSessionMode() {
    sessionBuilder.sessionMode = !sessionBuilder.sessionMode;
    saveSessionConfig();
    renderSessionBuilderUI();
}

function setSessionStack(val) {
    var n = parseInt(val, 10);
    if (!isNaN(n) && n >= 10 && n <= 999) {
        sessionBuilder.sessionStack = n;
        saveSessionConfig();
    }
}

function renderSessionModeUI() {
    var container = document.getElementById('session-mode-config');
    if (!container) return;
    if (!sessionBuilder.fullHandMode) { container.classList.add('hidden'); return; }
    container.classList.remove('hidden');
    var on = sessionBuilder.sessionMode;
    container.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;">' +
        '<span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;">Session mode</span>' +
        '<button onclick="toggleSessionMode()" style="position:relative;width:44px;height:24px;border-radius:999px;border:none;cursor:pointer;background:' + (on ? '#6366f1' : '#334155') + ';transition:background 0.2s;flex-shrink:0;">' +
        '<span style="position:absolute;top:3px;left:' + (on ? '23px' : '3px') + ';width:18px;height:18px;border-radius:50%;background:#fff;transition:left 0.2s;display:block;"></span>' +
        '</button></div>' +
        (on ?
        '<div style="display:flex;align-items:center;gap:8px;margin-top:8px;">' +
        '<span style="font-size:11px;color:#64748b;font-weight:600;">Starting stack</span>' +
        '<input type="number" min="10" max="999" value="' + (sessionBuilder.sessionStack || 100) + '" ' +
        'onchange="setSessionStack(this.value)" ' +
        'style="width:64px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#e2e8f0;font-weight:700;font-size:13px;padding:4px 8px;text-align:center;">' +
        '<span style="font-size:11px;color:#64748b;">bb</span>' +
        '</div>' : '');
}

// Which modules currently have at least one active family?
function getActiveModules() {
    const mods = [];
    for (const mod of Object.keys(FAMILY_MODEL)) {
        if (FAMILY_MODEL[mod].some(f => sessionBuilder.families.includes(f.id))) mods.push(mod);
    }
    return mods;
}

// Resolve families → scenarios across ALL modules
function allFamiliesToScenarios(familyIds) {
    const out = [];
    for (const mod of Object.keys(FAMILY_MODEL)) {
        for (const fam of FAMILY_MODEL[mod]) {
            if (familyIds.includes(fam.id)) {
                for (const sc of fam.scenarios) out.push(sc);
            }
        }
    }
    return out;
}

// Reverse: scenario keys → family IDs across all modules
function allScenariosToFamilies(scenarios) {
    const ids = new Set();
    const scSet = new Set(scenarios);
    for (const mod of Object.keys(FAMILY_MODEL)) {
        for (const fam of FAMILY_MODEL[mod]) {
            if (fam.scenarios.some(s => scSet.has(s))) ids.add(fam.id);
        }
    }
    return [...ids];
}

// drillState kept as backward-compat shim for challenge.js and internal systems
let drillState = {
    mode: 'open', // legacy — mapped from sessionBuilder
    active: false,
    scenario: 'RFI',
    handCount: 25,
    positions: [...ALL_POSITIONS],
    lockedLimperBucket: null  // set by challenge nodes to lock a specific bucket
};

// --- DAILY RUN (once per 24 hours) ---
const DAILY_RUN_KEY = 'pc_dailyRun_v1';
let dailyRunState = {
    active: false,
    option: null,           // 'easy' | 'medium' | 'hard'
    startedAt: 0,
    total: 0,               // attempts in this run
    correct: 0,             // correct answers in this run
    runStreak: 0,           // correct-in-a-row (score)
    ended: false,           // set true on first miss
    shownComplete: false,   // prevent double-modal
    bySpot: {},             // per-spot attempts in this run (for leak)
    allowedScenarios: [],   // scenario pool for this run
    _savedConfig: null,
    _rerollGuard: 0,
    _committed: false   // true once result has been written to meta (prevents loss on early navigation)
};

// Daily Run difficulty registry.
//
// Keep all tier tuning in this one block so future node/tree additions only need:
// 1) add the scenario key to the appropriate tier array below
// 2) ensure the scenario is actually supported by the current codebase/range data
//
// Pools are cumulative:
// - easy   = foundational/common spots only
// - medium = easy + moderately complex spots
// - hard   = medium + highest-complexity currently supported spots
const DAILY_RUN_TIER_RULES = {
    easy: {
        order: 0,
        label: 'Warm-Up',
        scenarios: [
            'RFI',
            'FACING_RFI'
        ]
    },
    medium: {
        order: 1,
        label: 'Grind',
        scenarios: [
            'VS_LIMP',
            'RFI_VS_3BET'
        ]
    },
    hard: {
        order: 2,
        label: 'Boss',
        scenarios: [
            'SQUEEZE',
            'SQUEEZE_2C',
            'PUSH_FOLD',
            'POSTFLOP_CBET',
            'POSTFLOP_3BP_CBET',
            'POSTFLOP_DEFEND',
            'POSTFLOP_3BP_DEFEND',
            'POSTFLOP_TURN_CBET',
            'POSTFLOP_TURN_DEFEND',
            'POSTFLOP_TURN_DELAYED_CBET',
            'POSTFLOP_TURN_PROBE',
            'POSTFLOP_TURN_PROBE_DEFEND',
            'POSTFLOP_RIVER_CBET',
            'POSTFLOP_RIVER_DEFEND',
            'POSTFLOP_RIVER_DELAYED_CBET',
            'POSTFLOP_RIVER_DELAYED_DEFEND',
            'POSTFLOP_RIVER_PROBE',
            'POSTFLOP_RIVER_PROBE_BET',
            'POSTFLOP_TURN_DELAYED_DEFEND',
            'POSTFLOP_RIVER_TURN_CHECK_CBET',
            'POSTFLOP_RIVER_TURN_CHECK_DEFEND',
            'POSTFLOP_RIVER_PROBE_CALL_BET',
            'POSTFLOP_RIVER_PROBE_CALL_DEFEND'
        ]
    }
};

function getDailyRunTierNamesUpTo(option) {
    const maxOrder = Number((DAILY_RUN_TIER_RULES[option] || {}).order);
    return Object.keys(DAILY_RUN_TIER_RULES)
        .filter(name => Number((DAILY_RUN_TIER_RULES[name] || {}).order) <= maxOrder)
        .sort((a, b) => Number(DAILY_RUN_TIER_RULES[a].order) - Number(DAILY_RUN_TIER_RULES[b].order));
}

function getDailyRunConfiguredScenariosForOption(option) {
    const seen = new Set();
    const ordered = [];
    getDailyRunTierNamesUpTo(option).forEach(tierName => {
        const list = (DAILY_RUN_TIER_RULES[tierName] && DAILY_RUN_TIER_RULES[tierName].scenarios) || [];
        list.forEach(sc => {
            if (!seen.has(sc)) {
                seen.add(sc);
                ordered.push(sc);
            }
        });
    });
    return ordered;
}

function applyDailyRunHUDState(active) {
    try {
        const dr = document.getElementById('dr-round-counter');
        const dc = document.getElementById('drill-counter');
        const sb = document.getElementById('streak-best-block');
        if (dr) dr.classList.toggle('hidden', !active);
        if (dc) dc.classList.toggle('hidden', !!active);
        if (sb) sb.classList.toggle('hidden', !active);
        if (active) {
            const bestEl = document.getElementById('streak-best');
            if (bestEl) bestEl.textContent = String(state.global.bestStreak || 0);
            updateDRRoundCounter();
        }
    } catch(_) {}
}

function restoreDailyRunConfigIfNeeded() {
    if (dailyRunState && dailyRunState._savedConfig) {
        try { state.config = dailyRunState._savedConfig; } catch(_) {}
    }
    if (dailyRunState) dailyRunState._savedConfig = null;
}

function resetDailyRunState(opts) {
    const options = Object.assign({ restoreConfig: true }, opts || {});
    if (options.restoreConfig) restoreDailyRunConfigIfNeeded();
    dailyRunState.active = false;
    dailyRunState.option = null;
    dailyRunState.startedAt = 0;
    dailyRunState.total = 0;
    dailyRunState.correct = 0;
    dailyRunState.runStreak = 0;
    dailyRunState.ended = false;
    dailyRunState.shownComplete = false;
    dailyRunState.bySpot = {};
    dailyRunState.allowedScenarios = [];
    dailyRunState._rerollGuard = 0;
    dailyRunState._committed = false;
    applyDailyRunHUDState(false);
}

function getDailyRunSupportedScenarios() {
    const supported = [];
    if (ALL_POSITIONS.some(p => rfiRanges && rfiRanges[p])) supported.push('RFI');
    if (typeof facingRfiRanges !== 'undefined' && Object.keys(facingRfiRanges).length) supported.push('FACING_RFI');
    if (typeof rfiVs3BetRanges !== 'undefined' && Object.keys(rfiVs3BetRanges).length) supported.push('RFI_VS_3BET');
    if (typeof vs4BetRanges !== 'undefined' && Object.keys(vs4BetRanges).length) supported.push('VS_4BET');
    if (typeof allFacingLimps !== 'undefined' && Object.keys(allFacingLimps).length) supported.push('VS_LIMP');
    if (typeof squeezeRanges !== 'undefined' && Object.keys(squeezeRanges).length) supported.push('SQUEEZE');
    if (typeof squeezeVsRfiTwoCallers !== 'undefined' && Object.keys(squeezeVsRfiTwoCallers).length) supported.push('SQUEEZE_2C');
    if (typeof PF_PUSH !== 'undefined' && Object.keys(PF_PUSH).length) supported.push('PUSH_FOLD');
    if (typeof generatePostflopSpot === 'function') supported.push('POSTFLOP_CBET');
    if (typeof generate3BPPostflopSpot === 'function') supported.push('POSTFLOP_3BP_CBET');
    if (typeof generateDefenderSpot === 'function') supported.push('POSTFLOP_DEFEND');
    if (typeof generate3BPDefenderSpot === 'function') supported.push('POSTFLOP_3BP_DEFEND');
    if (typeof generateTurnCBetSpot === 'function') supported.push('POSTFLOP_TURN_CBET');
    if (typeof generateTurnDefendSpot === 'function') supported.push('POSTFLOP_TURN_DEFEND');
    if (typeof generateDelayedTurnSpot === 'function') supported.push('POSTFLOP_TURN_DELAYED_CBET');
    if (typeof generateTurnDelayedDefendSpot === 'function') supported.push('POSTFLOP_TURN_DELAYED_DEFEND');
    if (typeof generateTurnProbeSpot === 'function') supported.push('POSTFLOP_TURN_PROBE');
    if (typeof generateTurnProbeDefendSpot === 'function') supported.push('POSTFLOP_TURN_PROBE_DEFEND');
    if (typeof generateRiverCBetSpot === 'function') supported.push('POSTFLOP_RIVER_CBET');
    if (typeof generateRiverDefendSpot === 'function') supported.push('POSTFLOP_RIVER_DEFEND');
    if (typeof generateRiverDelayedCBetSpot === 'function') supported.push('POSTFLOP_RIVER_DELAYED_CBET');
    if (typeof generateRiverDelayedDefendSpot === 'function') supported.push('POSTFLOP_RIVER_DELAYED_DEFEND');
    if (typeof generateRiverProbeSpot === 'function') supported.push('POSTFLOP_RIVER_PROBE');
    if (typeof generateRiverProbeBetSpot === 'function') supported.push('POSTFLOP_RIVER_PROBE_BET');
    if (typeof generateRiverTurnCheckCBetSpot === 'function') supported.push('POSTFLOP_RIVER_TURN_CHECK_CBET');
    if (typeof generateRiverTurnCheckDefendSpot === 'function') supported.push('POSTFLOP_RIVER_TURN_CHECK_DEFEND');
    if (typeof generateRiverProbeCallBetSpot === 'function') supported.push('POSTFLOP_RIVER_PROBE_CALL_BET');
    if (typeof generateRiverProbeCallDefendSpot === 'function') supported.push('POSTFLOP_RIVER_PROBE_CALL_DEFEND');
    return supported.filter(s => !!SCENARIO_NAMES[s]);
}

function getDailyRunScenarioPool(option) {
    const configured = getDailyRunConfiguredScenariosForOption(option);
    const supported = new Set(getDailyRunSupportedScenarios());
    return configured.filter(s => supported.has(s));
}

// Daily Run cleanup is handled natively inside exitToMenu (see ui.js).
// No runtime monkey-patching needed.

function loadDailyRunMeta() {
    const defaults = {
        // Day-based streak: count of consecutive days with ≥1 completed run
        streak: 0,
        bestStreak: 0,
        lastDayIndex: null,

        // Per-day cap — one slot per difficulty
        runsDayIndex: null,
        runsToday: 0,          // legacy; kept for backward compat
        completedToday: {},    // { easy: bool, medium: bool, hard: bool }

        // Lifetime
        totalRuns: 0,
        bestRun: 0,
        bestRunEasy: 0,
        bestRunMedium: 0,
        bestRunHard: 0,

        // Last run details
        lastCompletedAt: 0,
        lastOption: null,
        lastRun: 0,
        lastTotal: 0,
        lastCorrect: 0,
        lastLeakKey: null,

        // Rolling history (last ~60 days)
        history: []
    };
    try {
        const raw = localStorage.getItem(DAILY_RUN_KEY);
        if (!raw) return { ...defaults };
        const parsed = JSON.parse(raw);
        const merged = { ...defaults, ...(parsed || {}) };
        // Normalize types defensively
        merged.lastCompletedAt = Number(merged.lastCompletedAt || 0);
        merged.streak = Number(merged.streak || 0);
        merged.bestStreak = Number(merged.bestStreak || 0);

        merged.runsToday = Number(merged.runsToday || 0);
        if (merged.runsDayIndex !== null && merged.runsDayIndex !== undefined) merged.runsDayIndex = Number(merged.runsDayIndex);
        if (merged.runsDayIndex !== merged.runsDayIndex) merged.runsDayIndex = null;
        if (!merged.completedToday || typeof merged.completedToday !== 'object') merged.completedToday = {};

        merged.totalRuns = Number(merged.totalRuns || 0);
        merged.bestRun = Number(merged.bestRun || 0);
        merged.bestRunEasy = Number(merged.bestRunEasy || 0);
        merged.bestRunMedium = Number(merged.bestRunMedium || 0);
        merged.bestRunHard = Number(merged.bestRunHard || 0);

        merged.lastRun = Number(merged.lastRun || 0);
        merged.lastTotal = Number(merged.lastTotal || 0);
        merged.lastCorrect = Number(merged.lastCorrect || 0);

        if (merged.lastDayIndex !== null && merged.lastDayIndex !== undefined) merged.lastDayIndex = Number(merged.lastDayIndex);
        if (merged.lastDayIndex !== merged.lastDayIndex) merged.lastDayIndex = null;

        if (!Array.isArray(merged.history)) merged.history = [];
        // clamp history size
        if (merged.history.length > 120) merged.history = merged.history.slice(-120);
        return merged;
    } catch (_) {
        return { ...defaults };
    }
}

function saveDailyRunMeta(meta) {
    try { localStorage.setItem(DAILY_RUN_KEY, JSON.stringify(meta)); } catch (_) {}
}

function getLocalDayIndex(ts) {
    const d = new Date(ts);
    d.setHours(0,0,0,0);
    return Math.floor(d.getTime() / 86400000);
}

// ── Training Streak ──────────────────────────────────────────
function loadTrainingStreak() {
    try { const s = localStorage.getItem(profileKey('pc_training_streak_v1')); return s ? JSON.parse(s) : { current: 0, longest: 0, lastDayIndex: null }; } catch(e) { return { current: 0, longest: 0, lastDayIndex: null }; }
}
function saveTrainingStreak(data) {
    try { localStorage.setItem(profileKey('pc_training_streak_v1'), JSON.stringify(data)); } catch(e) {}
}
function updateTrainingStreak(handsPlayed) {
    if (!handsPlayed || handsPlayed < 5) return;
    const today = getLocalDayIndex(Date.now());
    const data = loadTrainingStreak();
    if (data.lastDayIndex === today) return; // already counted today
    data.current = (data.lastDayIndex === today - 1) ? (data.current || 0) + 1 : 1;
    data.longest = Math.max(data.longest || 0, data.current);
    data.lastDayIndex = today;
    saveTrainingStreak(data);
}

function getDailyRunLockInfo() {
    const meta = loadDailyRunMeta();
    const now = Date.now();
    const today = getLocalDayIndex(now);

    // reset daily slots if we've moved to a new local day
    if (meta.runsDayIndex === null || meta.runsDayIndex === undefined || meta.runsDayIndex !== today) {
        meta.runsDayIndex = today;
        meta.runsToday = 0;
        meta.completedToday = {};
        saveDailyRunMeta(meta);
    }
    if (!meta.completedToday || typeof meta.completedToday !== 'object') meta.completedToday = {};

    // Each difficulty has its own slot; "locked" means all three done
    const allDone = !!(meta.completedToday.easy && meta.completedToday.medium && meta.completedToday.hard);

    // ms left until next local midnight
    let msLeft = 0;
    if (allDone) {
        const d = new Date(now);
        d.setHours(24,0,0,0); // next midnight
        msLeft = Math.max(0, d.getTime() - now);
    }
    return { meta, locked: allDone, msLeft, completedToday: meta.completedToday };
}

// Commits the current run's result to localStorage meta immediately.
// Called right after a miss is recorded (not delayed like the modal), so navigation
// away during the 600 ms feedback window can't cause data loss.
// Idempotent: subsequent calls (e.g. from showDailyRunComplete) are no-ops.
// Returns the updated meta object, or null if already committed or no active run.
function _commitDailyRunToMeta() {
    if (!dailyRunState.option) return null;
    if (dailyRunState._committed) return null;
    dailyRunState._committed = true;

    const now = Date.now();
    const meta = loadDailyRunMeta();
    const today = getLocalDayIndex(now);
    const lastDay = (meta.lastDayIndex === null || meta.lastDayIndex === undefined) ? null : meta.lastDayIndex;

    // Reset daily counters if day has rolled over (also resets completedToday for consistency)
    if (meta.runsDayIndex === null || meta.runsDayIndex === undefined || meta.runsDayIndex !== today) {
        meta.runsDayIndex = today;
        meta.runsToday = 0;
        meta.completedToday = {};
    }
    if (!meta.completedToday || typeof meta.completedToday !== 'object') meta.completedToday = {};

    // Day-streak: only advances on the first completed run of a new calendar day
    const prevCompleted = Object.keys(meta.completedToday).length;
    if (prevCompleted === 0) {
        let streak = Number(meta.streak || 0);
        if (lastDay === null) streak = 1;
        else if (today === lastDay) streak = Math.max(1, streak);
        else if (today === lastDay + 1) streak = streak + 1;
        else streak = 1;
        meta.lastDayIndex = today;
        meta.streak = streak;
        meta.bestStreak = Math.max(Number(meta.bestStreak || 0), streak);
    }

    meta.runsToday = Number(meta.runsToday || 0) + 1;
    meta.completedToday[dailyRunState.option] = true;
    meta.lastCompletedAt = now;
    meta.lastOption = dailyRunState.option;
    meta.totalRuns = Number(meta.totalRuns || 0) + 1;

    const runScore = dailyRunState.runStreak || 0;
    const total = dailyRunState.total || 0;
    const correct = dailyRunState.correct || 0;
    meta.lastRun = runScore;
    meta.lastTotal = total;
    meta.lastCorrect = correct;
    meta.bestRun = Math.max(Number(meta.bestRun || 0), runScore);
    if (dailyRunState.option === 'easy')   meta.bestRunEasy   = Math.max(Number(meta.bestRunEasy   || 0), runScore);
    if (dailyRunState.option === 'medium') meta.bestRunMedium = Math.max(Number(meta.bestRunMedium || 0), runScore);
    if (dailyRunState.option === 'hard')   meta.bestRunHard   = Math.max(Number(meta.bestRunHard   || 0), runScore);

    // Biggest leak = lowest-accuracy spot (≥2 attempts), else most-missed spot
    let leakKey = null, leakScore = Infinity, leakMisses = -1;
    Object.entries(dailyRunState.bySpot || {}).forEach(([k, v]) => {
        const t = v.total || 0, c = v.correct || 0, miss = t - c, acc = t ? c / t : 0;
        if (t >= 2) { if (acc < leakScore) { leakScore = acc; leakKey = k; } }
        else        { if (miss > leakMisses) { leakMisses = miss; if (!leakKey) leakKey = k; } }
    });
    meta.lastLeakKey = leakKey || null;

    const hist = Array.isArray(meta.history) ? meta.history.slice() : [];
    hist.push({ dayIndex: today, at: now, option: dailyRunState.option, run: runScore, total, correct, leakKey: leakKey || null });
    while (hist.length > 120) hist.shift();
    meta.history = hist;

    saveDailyRunMeta(meta);
    return meta;
}

function formatDuration(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = n => String(n).padStart(2,'0');
    return `${h}:${pad(m)}:${pad(ss)}`;
}

function hideAllScreens() {
    const ids = [
        'menu-screen','config-screen','trainer-screen','stats-screen','settings-screen',
        'challenge-screen','library-screen','daily-run-screen',
        // end-state screens that can persist across mode transitions
        'review-preview-screen','review-complete-screen','session-summary-screen'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    // Hide modals if present
    const modals = ['chart-modal','drill-complete-screen','daily-run-complete-screen'];
    modals.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}


// Show main menu (alias used by several screens)
function showMenu() {
    applyDailyRunHUDState(false);
    hideAllScreens();
    // Safety: clear any stale mode flags so they can't contaminate the next session
    drillState.active = false;
    drillState.mode = 'open';
    drillState.lockedLimperBucket = null;
    if (typeof challengeState !== 'undefined') challengeState.active = false;
    const menu = document.getElementById('menu-screen');
    if (menu) menu.classList.remove('hidden');
    try { updateMenuUI(); } catch(_) {}
}

function showDailyRunMenu() {
    applyDailyRunHUDState(false);
    hideAllScreens();
    document.getElementById('daily-run-screen').classList.remove('hidden');
    updateDailyRunUI();
}

function updateDailyRunUI() {
    const { meta, locked, msLeft } = getDailyRunLockInfo();

    const streakDays = Number(meta.streak || 0);
    const runs = Number(meta.totalRuns || 0);
    const runsToday = Number(meta.runsToday || 0);
    const bestRun = Number(meta.bestRun || 0);

    const lastRun = Number(meta.lastRun || 0);
    const lastTotal = Number(meta.lastTotal || 0);
    const lastCorrect = Number(meta.lastCorrect || 0);
    const lastOpt = meta.lastOption || null;
    const lastWhen = meta.lastCompletedAt ? new Date(meta.lastCompletedAt) : null;
    const lastLeak = meta.lastLeakKey ? prettySpotName(meta.lastLeakKey) : null;

    const lastOptName = lastOpt === 'easy' ? 'Warm‑Up' : lastOpt === 'hard' ? 'Boss' : lastOpt === 'medium' ? 'Grind' : null;

    const subtitle = document.getElementById('daily-run-subtitle');
    if (subtitle) subtitle.textContent = 'One shot per difficulty · Score = correct in a row';

    const ct = meta.completedToday || {};
    const slotsDone = [ct.easy, ct.medium, ct.hard].filter(Boolean).length;

    const statusEl = document.getElementById('daily-run-status');
    if (statusEl) {
        const lockLine = locked
            ? `<div class="text-amber-300 font-black">All done for today!</div><div class="text-slate-400 text-xs font-semibold mt-1">Resets in ${formatDuration(msLeft)}</div>`
            : `<div class="text-emerald-300 font-black">${slotsDone}/3 completed today</div><div class="text-slate-400 text-xs font-semibold mt-1">One shot at each difficulty. First miss ends the run.</div>`;

        const slotRow = ['easy','medium','hard'].map(opt => {
            const done = !!ct[opt];
            const label = opt === 'easy' ? 'Warm-Up' : opt === 'medium' ? 'Grind' : 'Boss';
            const icon = opt === 'easy' ? '🟢' : opt === 'medium' ? '🟡' : '🔴';
            const bests = { easy: Number(meta.bestRunEasy||0), medium: Number(meta.bestRunMedium||0), hard: Number(meta.bestRunHard||0) };
            return `<div class="bg-slate-950/40 border ${done ? 'border-emerald-700/50' : 'border-slate-800'} rounded-2xl p-3 text-center">
                <div class="text-lg">${done ? '✅' : icon}</div>
                <div class="text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-1">${label}</div>
                <div class="text-slate-500 text-[9px] mt-0.5">Best: ${bests[opt]}</div>
            </div>`;
        }).join('');

        statusEl.innerHTML = `
            <div class="flex items-start justify-between gap-4">
                <div>${lockLine}</div>
                <div class="text-right">
                    <div class="text-slate-300 text-xs font-bold uppercase tracking-widest">Day streak</div>
                    <div class="text-slate-100 font-black text-2xl">${streakDays}</div>
                </div>
            </div>
            <div class="mt-4 grid grid-cols-3 gap-3">${slotRow}</div>
            <div id="dr-history-label" class="hidden mt-3 text-[9px] text-slate-600 uppercase font-bold tracking-widest">Recent runs (up to 14)</div>
            <div id="dr-history-sparkline" class="hidden mt-1 mb-2 rounded-lg overflow-hidden bg-slate-950/30 px-2 pt-2 pb-0.5"></div>
            <div class="mt-4 bg-slate-950/40 border border-slate-800 rounded-2xl p-4">
                <div class="text-slate-400 text-xs font-bold uppercase tracking-widest">Last run</div>
                <div class="text-slate-100 font-black text-lg mt-1">${lastOptName ? `${lastRun} · ${lastOptName}` : '—'}</div>
                <div class="text-slate-500 text-xs mt-1">${lastWhen ? lastWhen.toLocaleString() : ''}</div>
                <div class="text-slate-400 text-xs mt-2">${lastOptName ? `Accuracy: ${lastCorrect}/${lastTotal}` : ''}</div>
                <div class="text-slate-400 text-xs mt-1">${lastLeak ? `Leak: ${lastLeak}` : ''}</div>
            </div>
        `;
    }

    // UX #17: render history sparkline
    try {
        const histEl = document.getElementById('dr-history-sparkline');
        const histLabel = document.getElementById('dr-history-label');
        if (histEl && meta.history && meta.history.length > 0) {
            const last14 = meta.history.slice(-14);
            const maxScore = Math.max(...last14.map(h => h.run || 0), 1);
            const bars = last14.map(h => {
                const pct = Math.max(8, Math.round(((h.run || 0) / maxScore) * 100));
                const col = h.option === 'hard' ? '#f43f5e' : h.option === 'medium' ? '#eab308' : '#22c55e';
                return `<div title="Score: ${h.run}" style="flex:1;background:${col};opacity:0.75;height:${pct}%;border-radius:2px 2px 0 0;min-height:4px;"></div>`;
            }).join('');
            histEl.innerHTML = `<div style="display:flex;align-items:flex-end;gap:2px;height:36px;">${bars}</div>`;
            histEl.classList.remove('hidden');
            if (histLabel) histLabel.classList.remove('hidden');
        }
    } catch(_) {}

    // Disable buttons individually per completed slot
    ['easy','medium','hard'].forEach(opt => {
        const btn = document.getElementById(`daily-run-btn-${opt}`);
        if (!btn) return;
        const isDone = !!(ct[opt]);
        btn.disabled = isDone;
        btn.classList.toggle('opacity-50', isDone);
        btn.classList.toggle('pointer-events-none', isDone);
        // Show personal best inline
        const bestMap = { easy: Number(meta.bestRunEasy||0), medium: Number(meta.bestRunMedium||0), hard: Number(meta.bestRunHard||0) };
        const bestEl = btn.querySelector('.dr-btn-best');
        if (bestEl && bestMap[opt] > 0) {
            bestEl.textContent = 'Best: ' + bestMap[opt];
            bestEl.classList.remove('hidden');
        }
    });
}

function startDailyRun(option) {
    const { completedToday } = getDailyRunLockInfo();
    if (completedToday[option]) { updateDailyRunUI(); return; }

    const scenarioPool = getDailyRunScenarioPool(option);
    if (!scenarioPool.length) {
        console.warn('[DailyRun] No supported scenarios for option:', option);
        updateDailyRunUI();
        return;
    }

    // Clean out any stale state before starting a fresh run.
    resetDailyRunState({ restoreConfig: true });

    dailyRunState.active = true;
    dailyRunState.option = option; // easy|medium|hard
    dailyRunState.startedAt = Date.now();
    dailyRunState.total = 0;
    dailyRunState.correct = 0;
    dailyRunState.runStreak = 0;
    dailyRunState.ended = false;
    dailyRunState.shownComplete = false;
    dailyRunState.bySpot = {};
    dailyRunState.allowedScenarios = [...scenarioPool];
    dailyRunState._rerollGuard = 0;
    dailyRunState._savedConfig = JSON.parse(JSON.stringify(state.config));

    // Daily Run owns its own spot pool; do not inherit random user config state.
    state.config.scenarios = [...scenarioPool];
    state.config.positions = [...ALL_POSITIONS];

    // Start trainer session using a clean DR-owned config.
    state.sessionStats = { total: 0, correct: 0, streak: 0 };
    state.sessionLog = [];
    drillState.active = false;

    hideAllScreens();
    document.getElementById('trainer-screen').classList.remove('hidden');

    // Start the layout observer for this trainer entry path (Daily Run was previously
    // missing this call because ro is scoped to the ResizeObserver IIFE in ui.js).
    if (typeof window._trainerLayoutBoot === 'function') window._trainerLayoutBoot();

    applyDailyRunHUDState(true);
    updateUI();
    try { updateDrillCounter(); } catch(_) {}
    safeGenerateNextRound();
}

function updateDRRoundCounter() {
    const el = document.getElementById('dr-round-num');
    if (el && dailyRunState && dailyRunState.active) {
        el.textContent = String((dailyRunState.total || 0) + 1);
    }
}



function dailyRunAllowsScenario(scenario) {
    if (!dailyRunState || !dailyRunState.active) return true;
    const pool = Array.isArray(dailyRunState.allowedScenarios) ? dailyRunState.allowedScenarios : [];
    if (!pool.length) return true;
    return pool.includes(scenario);
}

function dailyRunSpotAllowedNow() {
    if (!dailyRunState || !dailyRunState.active) return true;
    return dailyRunAllowsScenario(state.scenario);
}
function checkDailyRunComplete() {
    if (!dailyRunState) return false;
    if (!dailyRunState.active && !dailyRunState.ended) return false;
    if (dailyRunState.ended && !dailyRunState.shownComplete) {
        dailyRunState.shownComplete = true;
        dailyRunState.active = false;
        showDailyRunComplete();
        return true;
    }
    return !!(dailyRunState.active && dailyRunState.ended);
}

function showDailyRunComplete() {
    const total = dailyRunState.total || 0;
    const correct = dailyRunState.correct || 0;
    const runScore = dailyRunState.runStreak || 0;
    const accuracy = total ? Math.round((correct / total) * 100) : 0;

    // Commit result to meta (idempotent — _commitDailyRunToMeta may have already been
    // called immediately after the miss to guard against navigation-away data loss).
    const meta = _commitDailyRunToMeta() || loadDailyRunMeta();
    const leakLabel = meta.lastLeakKey ? prettySpotName(meta.lastLeakKey) : '—';

    // Render modal
    const optName = dailyRunState.option === 'easy' ? 'Warm‑Up' : dailyRunState.option === 'hard' ? 'Boss' : 'Grind';
    const body = `
        <div class="mt-2 grid grid-cols-2 gap-3">
            <div class="bg-slate-950/40 border border-slate-800 rounded-2xl p-4">
                <div class="text-slate-400 text-xs font-bold uppercase tracking-widest">Run (Correct in a row)</div>
                <div class="text-slate-100 font-black text-3xl mt-1">${runScore}</div>
                <div class="text-slate-500 text-xs mt-1">${optName}</div>
            </div>
            <div class="bg-slate-950/40 border border-slate-800 rounded-2xl p-4">
                <div class="text-slate-400 text-xs font-bold uppercase tracking-widest">Accuracy</div>
                <div class="text-slate-100 font-black text-3xl mt-1">${accuracy}%</div>
                <div class="text-slate-500 text-xs mt-1">${correct}/${total}</div>
            </div>
        </div>
        <div class="mt-3 bg-slate-950/40 border border-slate-800 rounded-2xl p-4">
            <div class="text-slate-400 text-xs font-bold uppercase tracking-widest">Biggest leak</div>
            <div class="text-slate-100 font-black text-lg mt-1">${leakLabel}</div>
        </div>
        <div class="mt-3 text-slate-400 text-xs">
            Slots today: <span class="text-slate-200 font-bold">${['easy','medium','hard'].filter(o => (meta.completedToday||{})[o]).length}/3</span> · Day streak: <span class="text-slate-200 font-bold">${meta.streak}</span>
        </div>
    `;

    const modal = document.getElementById('daily-run-complete-screen');
    if (modal) {
        const titleEl = modal.querySelector('#daily-run-complete-title');
        const bodyEl = modal.querySelector('#daily-run-complete-body');
        if (titleEl) titleEl.textContent = 'Daily Run Complete';
        if (bodyEl) bodyEl.innerHTML = body;
        modal.classList.remove('hidden');
        const pab = document.getElementById('dr-play-again-btn');
        if (pab) {
            const ct2 = meta.completedToday || {};
            const slotsLeft = ['easy','medium','hard'].filter(o => !ct2[o]).length;
            pab.disabled = slotsLeft <= 0;
            pab.classList.toggle('opacity-40', slotsLeft <= 0);
            pab.classList.toggle('pointer-events-none', slotsLeft <= 0);
            pab.textContent = slotsLeft > 0 ? 'Play Another Difficulty (' + slotsLeft + ' left)' : 'All done today!';
        }
    }

    // mark run as finished but do not clear until the user leaves the DR flow
    dailyRunState.active = false;
}

function drPlayAgain() {
    const modal = document.getElementById('daily-run-complete-screen');
    if (modal) modal.classList.add('hidden');
    resetDailyRunState({ restoreConfig: true });
    showDailyRunMenu();
}

function endDailyRunToMenu() {
    const modal = document.getElementById('daily-run-complete-screen');
    if (modal) modal.classList.add('hidden');
    resetDailyRunState({ restoreConfig: true });
    showMenu();
}

function prettySpotName(spotKey) {
    try {
        const parts = String(spotKey).split('|');
        const sc = parts[0] || '';
        if (sc === 'SRP' || sc === '3BP' || sc === 'LIMP_POT') {
            const family = parts[1] || ''; const posState = parts[4] || ''; const archetype = parts[6] || '';
            const archLabel = (typeof ARCHETYPE_LABELS !== 'undefined' && ARCHETYPE_LABELS[archetype]) || archetype.replace(/_/g,' ');
            return `${sc} · ${family.replace(/_/g,' ')} · ${posState} · ${archLabel}`;
        }
        let rest = parts[1] || '';
        if (sc === 'VS_LIMP') { const bucket = parts[2] ? ` · ${parts[2]} limp${parts[2]==='1'?'':'s'}` : ''; return `${sc.replace('_',' ')} · ${rest.replaceAll('_',' ')}${bucket}`; }
        if (sc === 'PUSH_FOLD') { return `Push/Fold · ${POS_LABELS[rest] || rest} · ${parts[2] || ''}`; }
        return `${sc.replaceAll('_',' ')} · ${rest.replaceAll('_',' ')}`;
    } catch(_) { return spotKey; }
}


// Medal storage
function loadMedals() {
    try { const s = localStorage.getItem(profileKey('gto_medals_v1')); return s ? JSON.parse(s) : {}; } catch(e) { return {}; }
}
function saveMedals(m) {
    try { localStorage.setItem(profileKey('gto_medals_v1'), JSON.stringify(m)); } catch(e) {}
}
function getMedalForResult(hands, accuracy) {
    if (hands >= MEDAL_THRESHOLDS.gold.hands && accuracy >= MEDAL_THRESHOLDS.gold.accuracy) return 'gold';
    if (hands >= MEDAL_THRESHOLDS.silver.hands && accuracy >= MEDAL_THRESHOLDS.silver.accuracy) return 'silver';
    if (hands >= MEDAL_THRESHOLDS.bronze.hands && accuracy >= MEDAL_THRESHOLDS.bronze.accuracy) return 'bronze';
    return 'none';
}
function medalRank(m) { return { gold: 3, silver: 2, bronze: 1, none: 0 }[m] || 0; }

// ============================================================
// UNIFIED SESSION BUILDER — Config UI functions
// ============================================================

// --- Module header toggle (both can be active simultaneously) ---
function setSessionModule(mod) {
    if (!FAMILY_MODEL[mod]) return;
    // Exiting full hand mode: select all families in this module
    if (sessionBuilder.fullHandMode) {
        sessionBuilder.fullHandMode = false;
        sessionBuilder.families = FAMILY_MODEL[mod].map(f => f.id);
        sessionBuilder.module = mod;
        syncSessionToConfig();
        renderSessionBuilderUI();
        saveSessionConfig();
        return;
    }
    const modIds = FAMILY_MODEL[mod].map(f => f.id);
    const isActive = getActiveModules().includes(mod);

    if (isActive) {
        // Turning OFF — remove this module's families, only if others remain
        const remaining = sessionBuilder.families.filter(id => !modIds.includes(id));
        if (remaining.length === 0) return; // can't deselect everything
        sessionBuilder.families = remaining;
    } else {
        // Turning ON — add all families from this module
        for (const id of modIds) {
            if (!sessionBuilder.families.includes(id)) sessionBuilder.families.push(id);
        }
    }
    sessionBuilder.module = getActiveModules()[0] || 'PREFLOP';
    syncSessionToConfig();
    renderSessionBuilderUI();
    saveSessionConfig();
}

// --- Family chip toggling ---
function toggleFamily(familyId) {
    // Exiting full hand mode: select only this family (or module) and exit
    if (sessionBuilder.fullHandMode) {
        sessionBuilder.fullHandMode = false;
        if (familyId.startsWith('MIXED_')) {
            const mod = familyId.replace('MIXED_', '');
            sessionBuilder.families = (FAMILY_MODEL[mod] || []).map(f => f.id);
        } else {
            sessionBuilder.families = [familyId];
        }
        sessionBuilder.module = getActiveModules()[0] || 'PREFLOP';
        syncSessionToConfig();
        renderSessionBuilderUI();
        saveSessionConfig();
        return;
    }
    if (familyId.startsWith('MIXED_')) {
        // Per-module "All" toggle, e.g. MIXED_PREFLOP
        const mod = familyId.replace('MIXED_', '');
        const modIds = (FAMILY_MODEL[mod] || []).map(f => f.id);
        const allSelected = modIds.every(id => sessionBuilder.families.includes(id));
        if (allSelected) {
            // Deselect all from this module — only if other families remain
            const remaining = sessionBuilder.families.filter(id => !modIds.includes(id));
            if (remaining.length > 0) {
                sessionBuilder.families = remaining;
            } else {
                sessionBuilder.families = [modIds[0]];
            }
        } else {
            for (const id of modIds) {
                if (!sessionBuilder.families.includes(id)) sessionBuilder.families.push(id);
            }
        }
    } else {
        const idx = sessionBuilder.families.indexOf(familyId);
        if (idx > -1) {
            if (sessionBuilder.families.length > 1) sessionBuilder.families.splice(idx, 1);
        } else {
            sessionBuilder.families.push(familyId);
        }
    }
    sessionBuilder.module = getActiveModules()[0] || 'PREFLOP';
    // Sync to state.config.scenarios for engine compatibility
    syncSessionToConfig();
    renderSessionBuilderUI();
    saveSessionConfig();
}

// --- Position toggling (unified) ---
function toggleConfig(type, value) {
    if (type === 'pos') {
        const list = state.config.positions;
        const index = list.indexOf(value);
        if (index > -1) { if (list.length > 1) list.splice(index, 1); } else { list.push(value); }
    }
    renderSessionBuilderUI();
    saveConfig();
}

// --- Session length ---
function setSessionLength(len) {
    sessionBuilder.sessionLength = len;
    renderSessionBuilderUI();
    saveSessionConfig();
}

function setStakePreset(id) {
    if (!STAKE_PRESETS[id]) return;
    sessionBuilder.stakeId = id;
    const preset = STAKE_PRESETS[id];
    state.config.openSize = preset.defaultOpen;
    renderSessionBuilderUI();
    saveSessionConfig();
    saveConfig();
}

function setDisplayMode(mode) {
    if (mode !== 'dollars' && mode !== 'bb') return;
    sessionBuilder.displayMode = mode;
    renderSessionBuilderUI();
    saveSessionConfig();
}

function renderStakeDisplayUI(container) {
    if (!container) return;
    const stakeIds = Object.keys(STAKE_PRESETS);
    const stakeHtml = stakeIds.map(id => {
        const sel = sessionBuilder.stakeId === id;
        return `<button onclick="setStakePreset('${id}')" class="flex-1 py-2.5 rounded-xl text-xs font-black transition-all config-btn ${sel ? 'selected' : ''}">${id}</button>`;
    }).join('');
    const dollarsSel = sessionBuilder.displayMode === 'dollars';
    const bbSel = sessionBuilder.displayMode === 'bb';
    container.innerHTML = `
        <div class="flex flex-col gap-3">
            <div>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">Stakes</p>
                <div class="flex gap-2">${stakeHtml}</div>
            </div>
            <div>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">Display</p>
                <div class="flex gap-2">
                    <button onclick="setDisplayMode('dollars')" class="flex-1 py-2.5 rounded-xl text-xs font-black transition-all config-btn ${dollarsSel ? 'selected' : ''}">$</button>
                    <button onclick="setDisplayMode('bb')" class="flex-1 py-2.5 rounded-xl text-xs font-black transition-all config-btn ${bbSel ? 'selected' : ''}">BB</button>
                </div>
            </div>
        </div>`;
}

// --- Sync session builder → state.config.scenarios ---
function syncSessionToConfig() {
    state.config.scenarios = allFamiliesToScenarios(sessionBuilder.families);
    if (state.config.scenarios.length === 0) {
        // Fallback: at least one family must be active
        const firstFam = (FAMILY_MODEL.PREFLOP || [])[0];
        if (firstFam) {
            sessionBuilder.families = [firstFam.id];
            state.config.scenarios = [...firstFam.scenarios];
        }
    }
    state.pfStacks = sessionBuilder.pfStacks.length ? [...sessionBuilder.pfStacks] : [5,8,10,13,15,20];
}

// --- Limper mix (preserved behavior) ---
function setLimperMix(preset) {
    limperMixPreset = preset;
    saveLimperMix();
    renderSessionBuilderUI();
}

// --- Session config persistence ---
function saveSessionConfig() {
    try {
        localStorage.setItem(profileKey('gto_session_builder_v1'), JSON.stringify({
            module: sessionBuilder.module,
            families: sessionBuilder.families,
            sessionLength: sessionBuilder.sessionLength,
            stakeId: sessionBuilder.stakeId,
            displayMode: sessionBuilder.displayMode,
            pfStacks: sessionBuilder.pfStacks,
            fullHandMode: sessionBuilder.fullHandMode,
            sessionMode: sessionBuilder.sessionMode,
            sessionStack: sessionBuilder.sessionStack
        }));
    } catch(e) {}
}
function loadSessionConfig() {
    try {
        const s = localStorage.getItem(profileKey('gto_session_builder_v1'));
        if (s) {
            const c = JSON.parse(s);
            if (c.module && FAMILY_MODEL[c.module]) sessionBuilder.module = c.module;
            if (c.families && Array.isArray(c.families)) sessionBuilder.families = c.families;
            if (c.sessionLength !== undefined) sessionBuilder.sessionLength = c.sessionLength;
            if (c.stakeId && STAKE_PRESETS[c.stakeId]) sessionBuilder.stakeId = c.stakeId;
            if (c.displayMode === 'dollars' || c.displayMode === 'bb') sessionBuilder.displayMode = c.displayMode;
            if (Array.isArray(c.pfStacks) && c.pfStacks.length) sessionBuilder.pfStacks = c.pfStacks;
            if (c.fullHandMode === true) sessionBuilder.fullHandMode = true;
            if (c.sessionMode === true) sessionBuilder.sessionMode = true;
            if (c.sessionStack && Number.isFinite(c.sessionStack) && c.sessionStack >= 10) sessionBuilder.sessionStack = c.sessionStack;
        }
    } catch(e) {}
    // Sync openSize to match stake preset's defaultOpen
    const preset = STAKE_PRESETS[sessionBuilder.stakeId] || STAKE_PRESETS['1/3'];
    state.config.openSize = preset.defaultOpen;
    // If loading old config, convert scenarios→families across all modules
    if (sessionBuilder.families.length === 0 && state.config.scenarios.length > 0) {
        sessionBuilder.families = allScenariosToFamilies(state.config.scenarios);
    }
    // Validate: remove any family IDs that no longer exist
    const validIds = new Set();
    for (const mod of Object.keys(FAMILY_MODEL)) {
        for (const fam of FAMILY_MODEL[mod]) validIds.add(fam.id);
    }
    sessionBuilder.families = sessionBuilder.families.filter(id => validIds.has(id));
    if (sessionBuilder.families.length === 0) {
        sessionBuilder.families = ['OPEN', 'DEFEND', 'VS_3BET', 'LIMPERS', 'SQUEEZE'];
    }
    sessionBuilder.module = getActiveModules()[0] || 'PREFLOP';
    syncSessionToConfig();
}

// ============================================================
// SESSION BUILDER RENDERING
// ============================================================
function renderFamilyChips() {
    const container = document.getElementById('family-chips');
    if (!container) return;
    container.innerHTML = '';

    for (const mod of Object.keys(FAMILY_MODEL)) {
        const families = FAMILY_MODEL[mod];
        const modIds = families.map(f => f.id);
        const anySelected = !sessionBuilder.fullHandMode && modIds.some(id => sessionBuilder.families.includes(id));
        const allSelected = !sessionBuilder.fullHandMode && modIds.every(id => sessionBuilder.families.includes(id));

        // Module header row with label + divider
        const header = document.createElement('div');
        header.className = 'w-full flex items-center gap-2 mt-1 first:mt-0';
        header.innerHTML = `<span class="text-[9px] font-bold uppercase tracking-[0.15em] ${anySelected ? 'text-slate-400' : 'text-slate-600'}">${mod === 'PREFLOP' ? 'Preflop' : 'Postflop'}</span><div class="flex-1 border-t border-slate-800"></div>`;
        container.appendChild(header);

        // Chip row
        const row = document.createElement('div');
        row.className = 'flex flex-wrap gap-2';

        for (const fam of families) {
            const isSel = !sessionBuilder.fullHandMode && sessionBuilder.families.includes(fam.id);
            const btn = document.createElement('button');
            btn.onclick = () => toggleFamily(fam.id);
            btn.className = `config-btn px-4 py-2 rounded-full text-xs font-bold transition-all ${isSel ? 'selected' : ''}`;
            btn.textContent = fam.label;
            row.appendChild(btn);
        }
        // "All" chip per module (if >1 family)
        if (families.length > 1) {
            const btn = document.createElement('button');
            btn.onclick = () => toggleFamily('MIXED_' + mod);
            btn.className = `config-btn px-4 py-2 rounded-full text-xs font-bold transition-all ${allSelected ? 'selected-gold' : ''}`;
            btn.textContent = 'All';
            row.appendChild(btn);
        }
        container.appendChild(row);
    }
}

function renderPositionChips() {
    const container = document.getElementById('cfg-positions');
    if (!container) return;
    container.innerHTML = '';
    ALL_POSITIONS.forEach(p => {
        const isSel = state.config.positions.includes(p);
        const btn = document.createElement('button');
        btn.onclick = () => toggleConfig('pos', p);
        btn.className = `config-btn py-2.5 rounded-xl text-xs font-black ${isSel ? 'selected' : ''}`;
        btn.textContent = POS_LABELS[p] || p;
        container.appendChild(btn);
    });
}

function renderSessionLengthUI() {
    ['ENDLESS', 10, 25, 50].forEach(len => {
        const btn = document.getElementById(`slen-${len}`);
        if (btn) {
            const isSel = sessionBuilder.sessionLength === len;
            btn.className = `flex-1 py-2.5 rounded-xl text-xs font-black transition-all config-btn ${isSel ? 'selected' : ''}`;
        }
    });
}

function renderDynamicFilters() {
    if (sessionBuilder.fullHandMode) {
        const limperEl = document.getElementById('filter-limper-mix');
        if (limperEl) limperEl.classList.add('hidden');
        const pfStackEl = document.getElementById('filter-pf-stacks');
        if (pfStackEl) pfStackEl.classList.add('hidden');
        return;
    }
    const hasLimpers = sessionBuilder.families.includes('LIMPERS');
    const limperEl = document.getElementById('filter-limper-mix');
    if (limperEl) limperEl.classList.toggle('hidden', !hasLimpers);
    // Update limper mix button states
    ['mostly1','liveish','multiway'].forEach(p => {
        const btn = document.getElementById(`lmix-${p}`);
        if (btn) btn.className = `config-btn py-2.5 rounded-xl text-[11px] font-bold ${p === limperMixPreset ? 'selected' : ''}`;
    });
    // Push/fold stack depth filter
    const hasPushFold = sessionBuilder.families.includes('PUSH_FOLD');
    const pfStackEl = document.getElementById('filter-pf-stacks');
    if (pfStackEl) pfStackEl.classList.toggle('hidden', !hasPushFold);
    if (hasPushFold) renderPFStackChips();
}

function renderFullHandChips() {
    const container = document.getElementById('full-hand-chips');
    if (!container) return;
    container.innerHTML = '';
    const isSel = sessionBuilder.fullHandMode;
    const btn = document.createElement('button');
    btn.onclick = () => toggleFullHandLane();
    btn.className = `config-btn px-4 py-2 rounded-full text-xs font-bold transition-all ${isSel ? 'selected-gold' : ''}`;
    btn.textContent = 'Live Table';
    container.appendChild(btn);
    renderSessionModeUI();
}

function toggleFullHandLane() {
    sessionBuilder.fullHandMode = !sessionBuilder.fullHandMode;
    renderSessionBuilderUI();
    saveSessionConfig();
}

function renderPFStackChips() {
    const el = document.getElementById('cfg-pf-stacks');
    if (!el) return;
    const depths = (typeof PF_STACK_DEPTHS !== 'undefined') ? PF_STACK_DEPTHS : [5,8,10,13,15,20];
    el.innerHTML = depths.map(d => {
        const sel = sessionBuilder.pfStacks.includes(d);
        return `<button onclick="togglePFStack(${d})" class="config-btn py-2.5 rounded-xl text-[11px] font-bold ${sel ? 'selected' : ''}">${d}BB</button>`;
    }).join('');
}

function togglePFStack(depth) {
    const idx = sessionBuilder.pfStacks.indexOf(depth);
    if (idx >= 0) {
        if (sessionBuilder.pfStacks.length > 1) sessionBuilder.pfStacks.splice(idx, 1);
    } else {
        sessionBuilder.pfStacks.push(depth);
        sessionBuilder.pfStacks.sort((a,b) => a - b);
    }
    syncSessionToConfig();
    saveSessionConfig();
    renderPFStackChips();
}

function validatePool() {
    const msgEl = document.getElementById('cfg-pool-msg');
    const startBtn = document.getElementById('cfg-start-btn');
    if (!msgEl || !startBtn) return;

    if (sessionBuilder.fullHandMode) {
        msgEl.classList.add('hidden');
        startBtn.disabled = false;
        startBtn.classList.remove('opacity-40');
        return;
    }

    const scenarios = allFamiliesToScenarios(sessionBuilder.families);
    if (scenarios.length === 0) {
        msgEl.textContent = 'Select at least one spot family.';
        msgEl.classList.remove('hidden');
        startBtn.disabled = true;
        startBtn.classList.add('opacity-40');
        return;
    }
    msgEl.classList.add('hidden');
    startBtn.disabled = false;
    startBtn.classList.remove('opacity-40');
}

function renderSessionBuilderUI() {
    // Module buttons removed — families are now grouped in the Spots section
    renderFamilyChips();
    renderFullHandChips();
    // Hero position filter shows when any preflop family is active AND not in full hand mode
    const hasPreflop = !sessionBuilder.fullHandMode && getActiveModules().includes('PREFLOP');
    const posBlock = document.getElementById('filter-hero-position');
    if (posBlock) posBlock.classList.toggle('hidden', !hasPreflop);
    renderPositionChips();
    renderSessionLengthUI();
    renderDynamicFilters();
    // Stake + Display controls
    const sdBlock = document.getElementById('filter-stake-display');
    if (sdBlock) renderStakeDisplayUI(sdBlock);
    // CTA button label
    const startBtn = document.getElementById('cfg-start-btn');
    if (startBtn) startBtn.textContent = sessionBuilder.fullHandMode
        ? (sessionBuilder.sessionMode ? 'START SESSION' : 'PLAY FULL HAND')
        : 'START TRAINING';
    validatePool();
}

// Backward-compat aliases used by old code paths (challenge.js calls setDrillMode/setDrillCount)
function setDrillMode(mode) {
    // Challenge.js calls setDrillMode('focused') — map to session builder
    drillState.mode = mode;
}
function setDrillCount(n) {
    drillState.handCount = n;
    sessionBuilder.sessionLength = n;
}
// Challenge.js calls toggleDrillScenario indirectly — keep shim
function toggleDrillScenario(sc) { drillState.scenario = sc; }
function toggleDrillPos(pos) {
    const list = drillState.positions;
    const idx = list.indexOf(pos);
    if (idx > -1) { if (list.length > 1) list.splice(idx, 1); } else { list.push(pos); }
}
// Old buildDrillConfig no longer needed (no focused drill tab)
function buildDrillConfig() {}

// ==================================
// Challenge Mode — state stub (data + logic now in challenge.js)
// ==================================
// Runtime state for an active challenge attempt — referenced by showDrillComplete and other functions
let challengeState = { active: false, nodeId: null, reqAcc: 0, _thresholds: null };

function saveConfig() {
    localStorage.setItem(profileKey('gto_config_v2'), JSON.stringify(state.config));
}
function setOpenSize(size) {
    state.config.openSize = size;
    saveConfig();
    updateOpenSizeUI();
}
function updateOpenSizeUI() {
    [12, 15, 20].forEach(s => {
        const btn = document.getElementById(`osize-${s}`);
        if (btn) btn.className = `config-btn py-3 rounded-lg text-[10px] font-bold ${s === state.config.openSize ? 'selected' : ''}`;
    });
}
function loadConfig() {
    try {
        const s = localStorage.getItem(profileKey('gto_config_v2'));
        if (s) {
            const c = JSON.parse(s);
            const validScenarios = ['RFI', 'FACING_RFI', 'RFI_VS_3BET', 'VS_LIMP', 'SQUEEZE', 'SQUEEZE_2C', 'PUSH_FOLD', 'POSTFLOP_CBET', 'POSTFLOP_3BP_CBET', 'POSTFLOP_DEFEND', 'POSTFLOP_3BP_DEFEND', 'POSTFLOP_TURN_CBET', 'POSTFLOP_TURN_DEFEND', 'POSTFLOP_TURN_DELAYED_CBET', 'POSTFLOP_TURN_DELAYED_DEFEND', 'POSTFLOP_TURN_PROBE', 'POSTFLOP_TURN_PROBE_DEFEND', 'POSTFLOP_RIVER_CBET', 'POSTFLOP_RIVER_DEFEND', 'POSTFLOP_RIVER_DELAYED_CBET', 'POSTFLOP_RIVER_DELAYED_DEFEND', 'POSTFLOP_RIVER_PROBE', 'POSTFLOP_RIVER_PROBE_BET', 'POSTFLOP_RIVER_TURN_CHECK_CBET', 'POSTFLOP_RIVER_TURN_CHECK_DEFEND', 'POSTFLOP_RIVER_PROBE_CALL_BET', 'POSTFLOP_RIVER_PROBE_CALL_DEFEND'];
            if (c.scenarios && Array.isArray(c.scenarios)) {
                state.config.scenarios = c.scenarios.filter(s => validScenarios.includes(s));
                if (state.config.scenarios.length === 0) state.config.scenarios = ['RFI', 'FACING_RFI', 'RFI_VS_3BET', 'VS_LIMP', 'SQUEEZE', 'SQUEEZE_2C'];
            }
            if (c.positions && Array.isArray(c.positions)) {
                state.config.positions = c.positions.filter(p => ALL_POSITIONS.includes(p));
                if (state.config.positions.length === 0) state.config.positions = [...ALL_POSITIONS];
            }
            // openSize is now derived from stakePreset — only fall back to stored value
            // if no stake preset has been loaded yet (handled by loadSessionConfig below)
            if (c.openSize && [12, 15, 20].includes(c.openSize)) {
                state.config.openSize = c.openSize;
            }
        }
    } catch(e) {}
    // Load unified session builder config (layered on top — may override openSize via preset)
    loadSessionConfig();
}

// Unified updateConfigUI — delegates to session builder renderer
function updateConfigUI() {
    renderSessionBuilderUI();
}

function updateDrillCounter() {
    const counterEl = document.getElementById('drill-counter');
    const progressEl = document.getElementById('drill-progress');
    if (!counterEl || !progressEl) return;
    if (drillState.active && drillState.handCount) {
        counterEl.classList.remove('hidden');
        progressEl.innerText = `${state.sessionStats.total}/${drillState.handCount}`;
    } else if (sessionBuilder.sessionLength !== 'ENDLESS' && typeof sessionBuilder.sessionLength === 'number') {
        // Unified session builder: show counter for fixed-length sessions
        counterEl.classList.remove('hidden');
        progressEl.innerText = `${state.sessionStats.total}/${sessionBuilder.sessionLength}`;
    } else {
        counterEl.classList.add('hidden');
    }
}

function checkDrillComplete() {
    // Challenge mode / legacy drill check
    if (drillState.active && drillState.handCount) {
        if (state.sessionStats.total >= drillState.handCount) {
            showDrillComplete();
            return true;
        }
        return false;
    }
    // Unified session builder: fixed-length check
    if (!drillState.active && sessionBuilder.sessionLength !== 'ENDLESS' && typeof sessionBuilder.sessionLength === 'number') {
        if (state.sessionStats.total >= sessionBuilder.sessionLength) {
            showSessionSummary();
            return true;
        }
    }
    return false;
}

function showDrillComplete() {
    const total = state.sessionStats.total;
    const correct = state.sessionStats.correct;
    const accuracy = total ? Math.round(correct / total * 100) : 0;

    const isChallenge = (typeof challengeState !== 'undefined' && challengeState && challengeState.active);

    // === CHALLENGE MODE COMPLETE === (delegates to challenge.js)
    if (isChallenge) {
        if (typeof renderChallengeComplete === 'function') {
            renderChallengeComplete(total, correct, accuracy);
        }
        return;
    }

    // === NORMAL DRILL COMPLETE ===
    const medal = getMedalForResult(total, accuracy);

    // Save medal if it's an upgrade
    const medals = loadMedals();
    const scenarioKey = drillState.scenario;
    // Medal is per-scenario (not per-position) for focused drills
    const existing = medals[scenarioKey];
    const isUpgrade = !existing || medalRank(medal) > medalRank(existing.medal);
    if (medal !== 'none' && isUpgrade) {
        medals[scenarioKey] = { medal, accuracy, hands: total, date: Date.now() };
        saveMedals(medals);
    }

    const accColor = accuracy >= 90 ? 'text-emerald-400' : accuracy >= 75 ? 'text-yellow-400' : accuracy >= 60 ? 'text-orange-400' : 'text-rose-400';
    const medalIcon = medal !== 'none' ? MEDAL_ICONS[medal] : '';
    const medalLabel = medal !== 'none' ? medal.charAt(0).toUpperCase() + medal.slice(1) : '';
    const medalColor = MEDAL_COLORS[medal] || '';
    const scName = SCENARIO_NAMES[drillState.scenario] || drillState.scenario;

    let html = `
        <div class="text-center mb-2">
            <p class="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs mb-3">Drill Complete</p>
            <p class="text-xl font-black text-white">${scName}</p>
        </div>

        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-4">
            ${medal !== 'none' ? `
                <div class="medal-pop text-6xl mb-1">${medalIcon}</div>
                <p class="text-lg font-black ${medalColor}">${medalLabel}${isUpgrade ? ' — New Best!' : ''}</p>
            ` : `
                <p class="text-slate-500 font-bold text-sm">Keep practicing!</p>
            `}

            <div class="grid grid-cols-3 gap-4 w-full mt-2">
                <div class="text-center">
                    <p class="text-[9px] text-slate-500 uppercase font-bold mb-1">Accuracy</p>
                    <p class="text-2xl font-black ${accColor}">${accuracy}%</p>
                </div>
                <div class="text-center">
                    <p class="text-[9px] text-slate-500 uppercase font-bold mb-1">Correct</p>
                    <p class="text-2xl font-black text-white">${correct}</p>
                </div>
                <div class="text-center">
                    <p class="text-[9px] text-slate-500 uppercase font-bold mb-1">Best Streak</p>
                    <p class="text-2xl font-black text-orange-400">${state.global.bestStreak || 0}</p>
                </div>

            </div>

            ${medal === 'none' ? `
                <div class="w-full mt-2 bg-slate-800 rounded-xl p-3">
                    <p class="text-[10px] text-slate-400 text-center">Next: 🥉 Bronze — ${MEDAL_THRESHOLDS.bronze.accuracy}% accuracy on ${MEDAL_THRESHOLDS.bronze.hands}+ hands</p>
                </div>
            ` : medal === 'bronze' ? `
                <div class="w-full mt-2 bg-slate-800 rounded-xl p-3">
                    <p class="text-[10px] text-slate-400 text-center">Next: 🥈 Silver — ${MEDAL_THRESHOLDS.silver.accuracy}% accuracy on ${MEDAL_THRESHOLDS.silver.hands}+ hands</p>
                </div>
            ` : medal === 'silver' ? `
                <div class="w-full mt-2 bg-slate-800 rounded-xl p-3">
                    <p class="text-[10px] text-slate-400 text-center">Next: 🥇 Gold — ${MEDAL_THRESHOLDS.gold.accuracy}% accuracy on ${MEDAL_THRESHOLDS.gold.hands}+ hands</p>
                </div>
            ` : ''}
        </div>

        <div class="flex flex-col gap-3 w-full mt-2">
            <button onclick="continueDrill()" class="w-full py-4 pc-btn-primary transition-all">Keep Going</button>
            <button onclick="closeDrillComplete()" class="w-full py-4 pc-btn-utility font-bold text-sm">Done</button>
        </div>`;

    document.getElementById('drill-complete-body').innerHTML = html;
    document.getElementById('drill-complete-screen').classList.remove('hidden');
}


function continueDrill() {
    // Hide completion modal and continue the current drill/challenge run
    document.getElementById('drill-complete-screen').classList.add('hidden');
    // Reset per-session counters for the next segment
    state.sessionStats = { total: 0, correct: 0, streak: 0 };
    // Re-arm drill so checkDrillComplete fires again after the next batch
    drillState.active = true;
    updateUI(); saveProgress();
    try { __clearNextTimer(); __endResolve(); } catch(_) {}
    safeGenerateNextRound();
}

function closeDrillComplete() {
    document.getElementById('drill-complete-screen').classList.add('hidden');

    // If we just finished a challenge, go back to Challenge screen (not Menu)
    if (typeof challengeState !== 'undefined' && challengeState && challengeState.active) {
        // Keep nodeId around for the Challenge screen, but end the active run
        challengeState.active = false;
        exitToChallenge();
        return;
    }

    if (drillState._savedConfig) {
        state.config = drillState._savedConfig;
        drillState._savedConfig = null;
    }
    drillState.active = false;
    exitToMenu();
}


function showLibrary() {
    document.getElementById('library-screen').classList.remove('hidden');
    renderLibrary();
}

function hideLibrary() {
    document.getElementById('library-screen').classList.add('hidden');
}

// ── Library state ─────────────────────────────────────────────
const libSel = { category: 'RFI', heroPos: null, oppPos: null, bucket: '1L',
    pfPosState: 'IP', pfFamily: 'BTN_vs_BB', pfView: 'Overview', pfArchetype: 'A_HIGH_DRY', pfSelectedHandClass: null,
    pfStackDepth: 10 };

function setLibCategory(cat) {
    state.libCategory = cat;
    libSel.category = cat;
    libSel.heroPos = null;
    libSel.oppPos = null;
    libSel.bucket = '1L';
    renderLibrary();
}

function setLibHero(pos) {
    libSel.heroPos = pos;
    libSel.oppPos = null;
    renderLibrary();
}

function setLibOpp(opp) {
    libSel.oppPos = opp;
    renderLibrary();
}

function setLibBucket(b) {
    libSel.bucket = b;
    renderLibrary();
}

// ── Build spot index for current category ──────────────────────
function getLibSpots() {
    const cat = libSel.category;
    if (cat === 'RFI') {
        return Object.keys(rfiRanges).map(p => ({ hero: p, opp: null, key: p }));
    } else if (cat === 'FACING_RFI') {
        return Object.keys(facingRfiRanges).map(k => {
            const [p, o] = k.split('_vs_'); return { hero: p, opp: o, key: k };
        });
    } else if (cat === 'RFI_VS_3BET') {
        return Object.keys(rfiVs3BetRanges).map(k => {
            const [p, o] = k.split('_vs_'); return { hero: p, opp: o, key: k };
        });
    } else if (cat === 'VS_4BET') {
        return Object.keys(vs4BetRanges).map(k => {
            const [p, o] = k.split('_vs_'); return { hero: p, opp: o, key: k };
        });
    } else if (cat === 'VS_LIMP') {
        return Object.keys(allFacingLimps).map(k => {
            const m = k.match(/(.+)_vs_(.+)_Limp/);
            return { hero: m[1], opp: m[2], key: k };
        });
    } else if (cat === 'SQUEEZE') {
        return Object.keys(squeezeRanges).map(k => {
            const p = parseSqueezeKey(k);
            return { hero: p.hero, opp: k, key: k,
                     label: `${POS_LABELS[p.opener]} opens · ${POS_LABELS[p.caller]} calls` };
        });
    } else if (cat === 'SQUEEZE_2C') {
        return Object.keys(squeezeVsRfiTwoCallers).map(k => {
            const p = parseSqueeze2CKey(k);
            return { hero: p.hero, opp: k, key: k,
                     label: `${POS_LABELS[p.opener]} opens · ${POS_LABELS[p.caller1]} & ${POS_LABELS[p.caller2]} call` };
        });
    } else if (cat === 'PUSH_FOLD') {
        const depth = libSel.pfStackDepth || 10;
        const depthData = (typeof PF_PUSH !== 'undefined') ? (PF_PUSH[depth] || {}) : {};
        return Object.keys(depthData).map(p => ({ hero: p, opp: null, key: p }));
    }
    return [];
}

function setLibPFStack(depth) {
    libSel.pfStackDepth = depth;
    libSel.heroPos = null; // reset hero so first valid pos is selected
    renderLibrary();
}

// ── Render toggle rows + chart area ───────────────────────────
function renderLibrary() {
    const cat = libSel.category;
    const isPostflop = cat === 'POSTFLOP';

    // Update category tab styles
    ['RFI','FACING_RFI','RFI_VS_3BET','VS_4BET','VS_LIMP','SQUEEZE','SQUEEZE_2C','PUSH_FOLD','POSTFLOP'].forEach(tab => {
        const btn = document.getElementById(`lib-tab-${tab}`);
        if (btn) btn.className = `pc-chip pc-chip-sm ${cat === tab ? 'active' : ''}`;
    });

    // Hide/show preflop vs postflop rows
    const heroRow = document.getElementById('lib-hero-row');
    const oppRow = document.getElementById('lib-opp-row');
    const bucketRow = document.getElementById('lib-bucket-row');
    const pfPosRow = document.getElementById('lib-pf-posstate-row');
    const pfFamRow = document.getElementById('lib-pf-family-row');
    const pfViewRow = document.getElementById('lib-pf-view-row');

    if (isPostflop) {
        heroRow.classList.add('hidden');
        oppRow.classList.add('hidden');
        bucketRow.classList.add('hidden');
        pfPosRow.classList.remove('hidden');
        pfFamRow.classList.remove('hidden');
        pfViewRow.classList.remove('hidden');
        renderPostflopLibraryControls();
        renderPostflopLibraryContent();
        return;
    }

    // Preflop mode: hide postflop rows
    pfPosRow.classList.add('hidden');
    pfFamRow.classList.add('hidden');
    pfViewRow.classList.add('hidden');
    heroRow.classList.remove('hidden');

    const spots = getLibSpots();

    // Hero position row — unique heroes for this category
    const heroes = [...new Set(spots.map(s => s.hero))];
    if (!libSel.heroPos || !heroes.includes(libSel.heroPos)) libSel.heroPos = heroes[0] || null;

    heroRow.innerHTML = heroes.map(h => {
        const active = h === libSel.heroPos;
        return `<button onclick="setLibHero('${h}')" class="pc-chip pc-chip-sm transition-all ${active ? 'active' : ''}">${POS_LABELS[h] || h}</button>`;
    }).join('');

    // Opponent row (hidden for RFI and PUSH_FOLD which have no opponent)
    if (cat === 'RFI' || cat === 'PUSH_FOLD') {
        oppRow.classList.add('hidden');
        libSel.oppPos = null;
    } else {
        oppRow.classList.remove('hidden');
        const heroSpots = spots.filter(s => s.hero === libSel.heroPos);
        const opps = [...new Set(heroSpots.map(s => s.opp))];
        if (!libSel.oppPos || !opps.includes(libSel.oppPos)) libSel.oppPos = opps[0] || null;

        oppRow.innerHTML = opps.map(o => {
            const active = o === libSel.oppPos;
            const spot = heroSpots.find(s => s.opp === o);
            const label = spot && spot.label ? spot.label : (POS_LABELS[o] || o);
            return `<button onclick="setLibOpp('${o}')" class="pc-chip pc-chip-sm transition-all ${active ? 'active' : ''}">${label}</button>`;
        }).join('');
    }

    // Bucket row (VS_LIMP only) / Stack depth row (PUSH_FOLD only)
    if (cat === 'VS_LIMP') {
        bucketRow.classList.remove('hidden');
        bucketRow.innerHTML = [['1L','1 Limper'],['2L','2 Limpers'],['3P','3+ Limpers']].map(([b, lab]) => {
            const active = libSel.bucket === b;
            return `<button onclick="setLibBucket('${b}')" class="pc-chip pc-chip-sm transition-all ${active ? 'active' : ''}">${lab}</button>`;
        }).join('');
    } else if (cat === 'PUSH_FOLD') {
        bucketRow.classList.remove('hidden');
        const depths = (typeof PF_STACK_DEPTHS !== 'undefined') ? PF_STACK_DEPTHS : [5,8,10,13,15,20];
        bucketRow.innerHTML = depths.map(d => {
            const active = libSel.pfStackDepth === d;
            return `<button onclick="setLibPFStack(${d})" class="pc-chip pc-chip-sm transition-all ${active ? 'active' : ''}">${d}BB</button>`;
        }).join('');
    } else {
        bucketRow.classList.add('hidden');
    }

    renderLibraryChart();
}

// ═══════════════════════════════════════════════════════════════
// POSTFLOP LIBRARY — Study surface inside Strategy Library
// ═══════════════════════════════════════════════════════════════

function setLibPostflopPosState(ps) {
    libSel.pfPosState = ps;
    // Auto-select first family for new position state
    const fams = _getPostflopFamiliesForPosState(ps);
    libSel.pfFamily = fams[0] || 'BTN_vs_BB';
    libSel.pfView = 'Overview';
    libSel.pfArchetype = 'A_HIGH_DRY';
    libSel.pfSelectedHandClass = null;
    renderLibrary();
}

function setLibPostflopFamily(fam) {
    libSel.pfFamily = fam;
    // If switching to non-V2 family and Matrix is active, fall back to Overview
    if (libSel.pfView === 'Matrix' && !HERO_HAND_AWARE_FAMILIES.has(fam)) {
        libSel.pfView = 'Overview';
    }
    libSel.pfSelectedHandClass = null;
    renderLibrary();
}

function setLibPostflopView(v) {
    if (v === 'Matrix' && !HERO_HAND_AWARE_FAMILIES.has(libSel.pfFamily)) return;
    libSel.pfView = v;
    libSel.pfSelectedHandClass = null;
    renderLibrary();
}

function setLibPostflopArchetype(arch) {
    libSel.pfArchetype = arch;
    libSel.pfSelectedHandClass = null;
    renderLibrary();
}

function _pfJumpToArchetype(arch) {
    libSel.pfView = 'Archetypes';
    libSel.pfArchetype = arch;
    libSel.pfSelectedHandClass = null;
    renderLibrary();
}

function setLibPostflopHandClass(hc) {
    libSel.pfSelectedHandClass = libSel.pfSelectedHandClass === hc ? null : hc;
    renderLibrary();
}

function _getPostflopFamiliesForPosState(ps) {
    return Object.keys(POSTFLOP_PREFLOP_FAMILIES).filter(k => POSTFLOP_PREFLOP_FAMILIES[k].positionState === ps);
}

function _pfFamilyLabel(fam) {
    const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
    if (!fi) return fam;
    return `${POS_LABELS[fi.heroPos] || fi.heroPos} vs ${POS_LABELS[fi.villainPos] || fi.villainPos}`;
}

function _pfFreqBg(betPct) {
    if (betPct >= 80) return 'background:rgba(16,185,129,0.3);border:1px solid rgba(16,185,129,0.5)';
    if (betPct >= 60) return 'background:rgba(16,185,129,0.25);border:1px solid rgba(16,185,129,0.3)';
    if (betPct >= 40) return 'background:rgba(217,119,6,0.25);border:1px solid rgba(217,119,6,0.35)';
    if (betPct >= 20) return 'background:rgba(244,63,94,0.2);border:1px solid rgba(244,63,94,0.3)';
    return 'background:rgba(30,41,59,0.8);border:1px solid rgba(51,65,85,0.8)';
}

function _pfActionBadge(pa, betPct) {
    if (betPct >= 55) return '<span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-600/30 text-emerald-300 border border-emerald-500/30">Bet</span>';
    if (betPct <= 45) return '<span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-700/60 text-slate-300 border border-slate-600/40">Check</span>';
    return '<span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-700/30 text-amber-300 border border-amber-600/30">Mixed</span>';
}

function _pfFlopCardsHtml(cards) {
    if (!cards || !cards.length) return '';
    return cards.map(c => {
        const color = _darkBgSuitColor(c.suit);
        return `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:38px;background:#0f172a;border:1.5px solid #334155;border-radius:5px;font-weight:900;font-size:11px;color:${color};line-height:1;flex-direction:column;gap:0px;"><span>${c.rank}</span><span style="font-size:10px;">${SUIT_SYMBOLS[c.suit]}</span></span>`;
    }).join('');
}

function _pfFreqBars(betPct, checkPct) {
    return `<div class="flex flex-col gap-1.5 w-full">
        <div class="flex items-center gap-2"><div class="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden"><div class="h-full bg-emerald-500 rounded-full" style="width:${betPct}%"></div></div><span class="text-[10px] font-black text-emerald-400 w-16 text-right">Bet 33% ${betPct}%</span></div>
        <div class="flex items-center gap-2"><div class="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden"><div class="h-full bg-slate-500 rounded-full" style="width:${checkPct}%"></div></div><span class="text-[10px] font-black text-slate-400 w-16 text-right">Check ${checkPct}%</span></div>
    </div>`;
}

function _pfGetFamilyArchetypeStrategy(fam, arch) {
    const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
    if (!fi) return null;
    const sk = makePostflopSpotKey({ potType:'SRP', preflopFamily:fam, street:'FLOP', heroRole:'PFR', positionState:fi.positionState, nodeType:'CBET_DECISION', boardArchetype:arch });
    return POSTFLOP_STRATEGY[sk] || null;
}

function _pfGetV2Strategy(fam, arch, hc) {
    const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
    if (!fi) return null;
    const sk = makePostflopSpotKeyV2({ potType:'SRP', preflopFamily:fam, street:'FLOP', heroRole:'PFR', positionState:fi.positionState, nodeType:'CBET_DECISION', boardArchetype:arch, heroHandClass:hc });
    return POSTFLOP_STRATEGY_V2[sk] || null;
}

function _pfPotSizingHtml(fam) {
    const pot = getSRPPot$(fam);
    const cbet = roundLiveDollars(pot * 0.33);
    return `<span class="text-[10px] text-slate-500">Pot: ${formatAmt(pot)} · 33% c-bet: ${formatAmt(cbet)}</span>`;
}

// ARCHETYPE short labels for matrix columns
const _ARCH_SHORT = {
    A_HIGH_DRY:['A-hi','dry'], A_HIGH_DYNAMIC:['A-hi','dyn'], BROADWAY_STATIC:['Bwy','stat'],
    BROADWAY_DYNAMIC:['Bwy','dyn'], MID_DISCONNECTED:['Mid','disc'], MID_CONNECTED:['Mid','conn'],
    LOW_DISCONNECTED:['Low','disc'], LOW_CONNECTED:['Low','conn'], PAIRED_HIGH:['Pair','high'],
    PAIRED_LOW:['Pair','low'], MONOTONE:['Mono','tone'], TRIPS:['Trips','']
};

// Hand class short labels for matrix rows
const _HC_SHORT = {
    OVERPAIR:'Overpair', TOP_PAIR:'Top pair', SECOND_PAIR:'2nd pair', THIRD_PAIR:'3rd pair', UNDERPAIR:'Underpair',
    SET:'Set', TWO_PAIR_PLUS:'2 pair+', OESD:'OESD', GUTSHOT:'Gutshot',
    NFD:'NFD', FD:'Flush dr', COMBO_DRAW:'Combo dr', ACE_HIGH_BACKDOOR:'A-hi/BD', OVERCARDS:'Overcards', AIR:'Air'
};

const _HC_ORDER = ['OVERPAIR','TOP_PAIR','SECOND_PAIR','THIRD_PAIR','UNDERPAIR','SET','TWO_PAIR_PLUS','OESD','GUTSHOT','NFD','FD','COMBO_DRAW','ACE_HIGH_BACKDOOR','OVERCARDS','AIR'];

// ── Render postflop control rows ──────────────────────────────
function renderPostflopLibraryControls() {
    const pfPosRow = document.getElementById('lib-pf-posstate-row');
    const pfFamRow = document.getElementById('lib-pf-family-row');
    const pfViewRow = document.getElementById('lib-pf-view-row');

    // Position state pills
    pfPosRow.innerHTML = ['IP','OOP'].map(ps => {
        const active = libSel.pfPosState === ps;
        const label = ps === 'IP' ? 'In Position' : 'Out of Position';
        return `<button onclick="setLibPostflopPosState('${ps}')" class="pc-chip pc-chip-sm transition-all ${active ? 'active' : ''}">${label}</button>`;
    }).join('');

    // Family pills
    const families = _getPostflopFamiliesForPosState(libSel.pfPosState);
    if (!families.includes(libSel.pfFamily)) libSel.pfFamily = families[0] || 'BTN_vs_BB';
    pfFamRow.innerHTML = families.map(fam => {
        const active = libSel.pfFamily === fam;
        return `<button onclick="setLibPostflopFamily('${fam}')" class="pc-chip pc-chip-sm transition-all ${active ? 'active' : ''}">${_pfFamilyLabel(fam)}</button>`;
    }).join('');

    // View mode pills
    const isV2 = HERO_HAND_AWARE_FAMILIES.has(libSel.pfFamily);
    pfViewRow.innerHTML = ['Overview','Matrix','Archetypes'].map(v => {
        const active = libSel.pfView === v;
        const disabled = v === 'Matrix' && !isV2;
        return `<button onclick="setLibPostflopView('${v}')" class="pc-chip pc-chip-sm transition-all ${active ? 'active' : disabled ? 'opacity-30 cursor-not-allowed' : ''}" ${disabled ? 'disabled' : ''}>${v}</button>`;
    }).join('');
}

// ── Route to correct postflop view ────────────────────────────
function renderPostflopLibraryContent() {
    const area = document.getElementById('lib-chart-area');
    if (!area) return;
    const fam = libSel.pfFamily;
    const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
    if (!fi) { area.innerHTML = '<div class="text-slate-500 text-sm mt-10">Postflop library unavailable. No postflop study data found.</div>'; return; }

    if (libSel.pfView === 'Overview') renderPostflopOverview(area, fam, fi);
    else if (libSel.pfView === 'Matrix') renderPostflopMatrix(area, fam, fi);
    else if (libSel.pfView === 'Archetypes') renderPostflopArchetypes(area, fam, fi);
    else renderPostflopOverview(area, fam, fi);
}

// ═══ A. OVERVIEW VIEW ═════════════════════════════════════════
function renderPostflopOverview(area, fam, fi) {
    const isV2 = HERO_HAND_AWARE_FAMILIES.has(fam);
    const posLabel = fi.positionState === 'IP' ? 'In Position' : 'Out of Position';

    // Gather archetype data
    const archData = [];
    let totalBet = 0;
    for (const arch of FLOP_ARCHETYPES) {
        const strat = _pfGetFamilyArchetypeStrategy(fam, arch);
        const betPct = strat ? Math.round(strat.actions.bet33 * 100) : 0;
        totalBet += betPct;
        const exFlop = generateFlopForArchetype(arch);
        archData.push({ arch, strat, betPct, exFlop });
    }
    const avgBet = Math.round(totalBet / FLOP_ARCHETYPES.length);

    // Sort for takeaways
    const sorted = [...archData].sort((a, b) => b.betPct - a.betPct);
    const top3 = sorted.slice(0, 3);
    const bot3 = sorted.slice(-3).reverse();

    // Position takeaway
    let postureLine;
    if (avgBet >= 58) postureLine = 'This is a higher-frequency c-bet node overall.';
    else if (avgBet >= 42) postureLine = 'This is a mixed c-bet node overall.';
    else postureLine = 'This is a check-heavier node overall.';

    let html = '';

    // 1. Family header card
    html += `<div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div class="text-sm font-black text-white">${_pfFamilyLabel(fam)} — Flop C-Bet</div>
        <div class="text-[11px] text-slate-400 mt-0.5">Single-raised pot · PFR · ${posLabel}</div>
        <div class="text-[10px] mt-2 ${isV2 ? 'text-emerald-400' : 'text-slate-500'}">${isV2 ? 'Hand-class matrix available for this family.' : 'Archetype-level reference only for now.'}</div>
    </div>`;

    // 2. Core principles card
    html += `<div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">How to think about this node</div>
        <div class="flex flex-col gap-1.5 text-[11px] text-slate-300 leading-relaxed">
            <div>You are the preflop raiser deciding between check and a 33% c-bet on the flop.</div>
            <div>Dry, high-card boards usually favor the raiser more than low, connected boards.</div>
            <div>In position, you can c-bet more often. Out of position, checking increases.</div>
            <div>Strong made hands and good draws bet more. Weak hands depend on board texture.</div>
        </div>
    </div>`;

    // 3. Archetype summary heat-strip (2-column grid)
    html += `<div class="w-full max-w-md">
        <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Board texture summary</div>
        <div class="grid grid-cols-2 gap-2">`;
    for (const ad of archData) {
        const label = ARCHETYPE_LABELS[ad.arch] || ad.arch;
        const flopHtml = _pfFlopCardsHtml(ad.exFlop);
        html += `<button onclick="_pfJumpToArchetype('${ad.arch}')" class="bg-slate-900 border border-slate-800 rounded-xl p-3 text-left hover:border-slate-600 transition-all" style="${_pfFreqBg(ad.betPct)}">
            <div class="text-[10px] font-black text-white mb-1">${label}</div>
            <div class="flex gap-0.5 mb-1.5">${flopHtml}</div>
            <div class="flex items-center justify-between">
                ${_pfActionBadge(ad.strat?.preferredAction, ad.betPct)}
                <span class="text-[11px] font-black ${ad.betPct >= 50 ? 'text-emerald-400' : 'text-slate-400'}">${ad.betPct}%</span>
            </div>
        </button>`;
    }
    html += `</div></div>`;

    // 4. Position takeaway card
    html += `<div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Key takeaways</div>
        <div class="text-[12px] font-bold text-white mb-2">${postureLine}</div>
        <div class="text-[11px] text-slate-300 mb-1"><span class="text-emerald-400 font-bold">Best boards for betting:</span> ${top3.map(a => ARCHETYPE_LABELS[a.arch]).join(', ')}</div>
        <div class="text-[11px] text-slate-300"><span class="text-slate-400 font-bold">Best boards for checking:</span> ${bot3.map(a => ARCHETYPE_LABELS[a.arch]).join(', ')}</div>
        <div class="mt-2">${_pfPotSizingHtml(fam)}</div>
    </div>`;

    // 5. Study CTA footer
    html += `<div class="w-full max-w-md flex flex-col gap-2">`;
    if (isV2) {
        html += `<button onclick="setLibPostflopView('Matrix')" class="w-full py-3 pc-btn-aggressive transition-all" style="border-radius:14px;font-size:12px;font-weight:900;letter-spacing:.05em;">Open hand-class matrix</button>`;
    }
    html += `<button onclick="setLibPostflopView('Archetypes')" class="w-full py-3 pc-btn-utility transition-all" style="font-size:12px;font-weight:900;letter-spacing:.05em;">Study board textures</button>`;
    html += `</div>`;

    area.innerHTML = html;
}

// ═══ B. MATRIX VIEW ═══════════════════════════════════════════
function renderPostflopMatrix(area, fam, fi) {
    if (!HERO_HAND_AWARE_FAMILIES.has(fam)) {
        libSel.pfView = 'Overview';
        renderPostflopOverview(area, fam, fi);
        return;
    }

    let html = '';

    // 1. Sticky matrix header
    html += `<div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-1">
        <div class="text-sm font-black text-white">Hand-Class Matrix</div>
        <div class="text-[11px] text-slate-400 mt-0.5">${_pfFamilyLabel(fam)} · ${fi.positionState === 'IP' ? 'In Position' : 'Out of Position'}</div>
        <div class="text-[10px] text-slate-500 mt-1">Tap any cell to see exact frequency and why.</div>
    </div>`;

    // 2. Matrix
    const cellW = 58;
    const rowLabelW = 68;
    const totalW = rowLabelW + FLOP_ARCHETYPES.length * cellW;

    html += `<div class="w-full overflow-x-auto scroll-hide" style="max-width:100%;">
        <div style="min-width:${totalW}px;padding:0 4px;">
        <div class="flex">
            <div style="min-width:${rowLabelW}px;max-width:${rowLabelW}px;" class="text-[8px] font-black text-slate-500 flex items-end pb-1 px-1">Hand / Board</div>`;
    // Column headers
    for (const arch of FLOP_ARCHETYPES) {
        const sh = _ARCH_SHORT[arch] || [arch.slice(0,4),''];
        html += `<div style="min-width:${cellW}px;max-width:${cellW}px;" class="text-center px-0.5 pb-1">
            <div class="text-[8px] font-black text-slate-400 leading-tight">${sh[0]}</div>
            <div class="text-[7px] font-bold text-slate-500 leading-tight">${sh[1]}</div>
        </div>`;
    }
    html += `</div>`;

    // Rows: each hand class
    // Track column/row averages for pattern strip
    const colTotals = new Array(FLOP_ARCHETYPES.length).fill(0);
    const rowTotals = {};

    for (const hc of _HC_ORDER) {
        const label = _HC_SHORT[hc] || hc;
        html += `<div class="flex border-t border-slate-800/50">
            <div style="min-width:${rowLabelW}px;max-width:${rowLabelW}px;" class="text-[9px] font-bold text-slate-300 flex items-center px-1 py-0.5">${label}</div>`;
        let rowSum = 0;
        FLOP_ARCHETYPES.forEach((arch, ci) => {
            const v2 = _pfGetV2Strategy(fam, arch, hc);
            const betPct = v2 ? Math.round(v2.actions.bet33 * 100) : 0;
            rowSum += betPct;
            colTotals[ci] += betPct;
            const isSelected = libSel.pfSelectedHandClass === `${hc}|${arch}`;
            const selBorder = isSelected ? 'border:2px solid #818cf8;' : '';
            html += `<button onclick="setLibPostflopMatrixCell('${hc}','${arch}')" style="min-width:${cellW}px;max-width:${cellW}px;${_pfFreqBg(betPct)};${selBorder}" class="flex flex-col items-center justify-center py-1.5 px-0.5 transition-all hover:brightness-125">
                <span class="text-[11px] font-black ${betPct >= 50 ? 'text-white' : 'text-slate-300'}">${betPct}%</span>
                <span class="text-[7px] font-bold ${betPct >= 50 ? 'text-emerald-300' : 'text-slate-500'}">${betPct >= 50 ? 'B' : 'X'}</span>
            </button>`;
        });
        rowTotals[hc] = Math.round(rowSum / FLOP_ARCHETYPES.length);
        html += `</div>`;
    }
    html += `</div></div>`;

    // 3. Cell detail panel
    if (libSel.pfSelectedHandClass) {
        const [selHC, selArch] = libSel.pfSelectedHandClass.split('|');
        html += _renderMatrixCellDetail(fam, fi, selHC, selArch);
    }

    // 4. Quick pattern strip
    html += _renderMatrixPatternStrip(colTotals, rowTotals);

    area.innerHTML = html;
}

function setLibPostflopMatrixCell(hc, arch) {
    const key = `${hc}|${arch}`;
    libSel.pfSelectedHandClass = libSel.pfSelectedHandClass === key ? null : key;
    renderLibrary();
}

function _renderMatrixCellDetail(fam, fi, hc, arch) {
    const v2 = _pfGetV2Strategy(fam, arch, hc);
    const archStrat = _pfGetFamilyArchetypeStrategy(fam, arch);
    if (!v2) return '<div class="w-full max-w-md mt-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm text-slate-500">No strategy data for this selection.</div>';

    const betPct = Math.round(v2.actions.bet33 * 100);
    const checkPct = 100 - betPct;
    const hcLabel = HAND_CLASS_LABELS[hc] || hc;
    const archLabel = ARCHETYPE_LABELS[arch] || arch;
    const exFlops = [generateFlopForArchetype(arch), generateFlopForArchetype(arch)];

    return `<div class="w-full max-w-md mt-2 bg-slate-900 border border-indigo-500/30 rounded-2xl p-4">
        <div class="text-xs font-black text-white">${hcLabel} on ${archLabel}</div>
        <div class="text-[10px] text-slate-400 mt-0.5 mb-3">${_pfFamilyLabel(fam)} · Flop C-Bet · 33% sizing</div>
        ${_pfFreqBars(betPct, checkPct)}
        <div class="mt-3 mb-3">${_pfActionBadge(v2.preferredAction, betPct)}</div>
        <div class="flex flex-col gap-2 text-[11px] leading-relaxed">
            <div><span class="font-black text-slate-400">Board principle:</span> <span class="text-slate-300">${archStrat?.reasoning || '—'}</span></div>
            <div><span class="font-black text-slate-400">Hand-class principle:</span> <span class="text-slate-300">${v2.reasoning || '—'}</span></div>
        </div>
        <div class="mt-3">
            <div class="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Example flops</div>
            <div class="flex gap-3">${exFlops.map(f => `<div class="flex gap-0.5">${_pfFlopCardsHtml(f)}</div>`).join('')}</div>
        </div>
        <div class="mt-3">${_pfPotSizingHtml(fam)}</div>
    </div>`;
}

function _renderMatrixPatternStrip(colTotals, rowTotals) {
    // Column averages (boards)
    const colAvg = FLOP_ARCHETYPES.map((arch, i) => ({ arch, avg: Math.round(colTotals[i] / _HC_ORDER.length) }));
    const sortedCols = [...colAvg].sort((a, b) => b.avg - a.avg);
    const topBoardsBet = sortedCols.slice(0, 3);
    const botBoardsCheck = sortedCols.slice(-3).reverse();

    // Row averages (hand classes)
    const rowArr = _HC_ORDER.map(hc => ({ hc, avg: rowTotals[hc] || 0 }));
    const sortedRows = [...rowArr].sort((a, b) => b.avg - a.avg);
    // Draws/bluffs: OESD,GUTSHOT,NFD,FD,COMBO_DRAW,ACE_HIGH_BACKDOOR,AIR
    const drawLike = new Set(['OESD','GUTSHOT','NFD','FD','COMBO_DRAW','ACE_HIGH_BACKDOOR','AIR']);
    const topBluffs = sortedRows.filter(r => drawLike.has(r.hc)).slice(0, 3);
    const checkHeavy = [...rowArr].sort((a, b) => a.avg - b.avg).slice(0, 3);

    return `<div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-4 mt-1">
        <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">What stands out</div>
        <div class="flex flex-col gap-1.5 text-[11px] text-slate-300 leading-relaxed">
            <div><span class="text-emerald-400 font-bold">Best semi-bluff classes:</span> ${topBluffs.map(r => _HC_SHORT[r.hc] + ' ' + r.avg + '%').join(', ')}</div>
            <div><span class="text-slate-400 font-bold">Most check-heavy classes:</span> ${checkHeavy.map(r => _HC_SHORT[r.hc] + ' ' + r.avg + '%').join(', ')}</div>
            <div><span class="text-emerald-400 font-bold">Most bet-heavy boards:</span> ${topBoardsBet.map(b => ARCHETYPE_LABELS[b.arch] + ' ' + b.avg + '%').join(', ')}</div>
            <div><span class="text-slate-400 font-bold">Most check-heavy boards:</span> ${botBoardsCheck.map(b => ARCHETYPE_LABELS[b.arch] + ' ' + b.avg + '%').join(', ')}</div>
        </div>
    </div>`;
}

// ═══ C. ARCHETYPES VIEW ═══════════════════════════════════════
function renderPostflopArchetypes(area, fam, fi) {
    const isV2 = HERO_HAND_AWARE_FAMILIES.has(fam);
    const arch = libSel.pfArchetype || 'A_HIGH_DRY';

    let html = '';

    // 1. Archetype picker strip
    html += `<div class="w-full overflow-x-auto scroll-hide pb-1 flex gap-1.5">`;
    for (const a of FLOP_ARCHETYPES) {
        const active = a === arch;
        const label = ARCHETYPE_LABELS[a] || a;
        html += `<button onclick="setLibPostflopArchetype('${a}')" class="pc-chip pc-chip-sm transition-all ${active ? 'active' : ''}">${label}</button>`;
    }
    html += `</div>`;

    // 2. Selected archetype detail card
    const strat = _pfGetFamilyArchetypeStrategy(fam, arch);
    const betPct = strat ? Math.round(strat.actions.bet33 * 100) : 0;
    const checkPct = 100 - betPct;
    const archLabel = ARCHETYPE_LABELS[arch] || arch;
    const exFlops = [generateFlopForArchetype(arch), generateFlopForArchetype(arch), generateFlopForArchetype(arch)];

    html += `<div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div class="text-sm font-black text-white mb-1">${archLabel}</div>
        <div class="text-[11px] text-slate-400 mb-3">${_pfFamilyLabel(fam)} · Flop C-Bet</div>
        <div class="flex gap-3 mb-3">${exFlops.map(f => `<div class="flex gap-0.5">${_pfFlopCardsHtml(f)}</div>`).join('')}</div>
        ${_pfFreqBars(betPct, checkPct)}
        <div class="mt-3 mb-2">${_pfActionBadge(strat?.preferredAction, betPct)}</div>
        <div class="text-[11px] text-slate-300 leading-relaxed">${strat?.reasoning || 'No data.'}</div>
        <div class="mt-3">${_pfPotSizingHtml(fam)}</div>
    </div>`;

    // 3. If V2-capable: hand-class recommendations list
    if (isV2) {
        const hcData = _HC_ORDER.map(hc => {
            const v2 = _pfGetV2Strategy(fam, arch, hc);
            const bet = v2 ? Math.round(v2.actions.bet33 * 100) : 0;
            return { hc, bet, v2 };
        }).sort((a, b) => b.bet - a.bet);

        html += `<div class="w-full max-w-md">
            <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 mt-1">Hand-class recommendations</div>
            <div class="flex flex-col gap-1">`;

        for (const item of hcData) {
            const label = HAND_CLASS_LABELS[item.hc] || item.hc;
            const isExpanded = libSel.pfSelectedHandClass === item.hc;
            const chevron = isExpanded ? '▾' : '▸';
            html += `<button onclick="setLibPostflopHandClass('${item.hc}')" class="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-left hover:border-slate-600 transition-all">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-[11px] font-bold text-white">${label}</span>
                        ${_pfActionBadge(item.v2?.preferredAction, item.bet)}
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-[11px] font-black ${item.bet >= 50 ? 'text-emerald-400' : 'text-slate-400'}">${item.bet}%</span>
                        <span class="text-slate-500 text-[10px]">${chevron}</span>
                    </div>
                </div>`;
            if (isExpanded && item.v2) {
                html += `<div class="mt-2 pt-2 border-t border-slate-800">
                    ${_pfFreqBars(item.bet, 100 - item.bet)}
                    <div class="mt-2 text-[11px] text-slate-300 leading-relaxed">${item.v2.reasoning || ''}</div>
                </div>`;
            }
            html += `</button>`;
        }
        html += `</div></div>`;
    } else {
        // 4. Non-V2 fallback card
        html += `<div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div class="text-xs font-black text-white mb-1">No hand-class matrix yet</div>
            <div class="text-[11px] text-slate-400 leading-relaxed">This family is available at the board-texture level only.</div>
            <div class="text-[11px] text-slate-400 leading-relaxed mt-1">For hand-class study, switch to BTN vs BB or CO vs BB.</div>
        </div>`;
    }

    area.innerHTML = html;
}

// ── Render the single chart for current selection ─────────────
function renderLibraryChart() {
    const cat = libSel.category;
    const area = document.getElementById('lib-chart-area');
    if (!area) return;
    if (cat === 'POSTFLOP') return; // handled by renderPostflopLibraryContent

    const spots = getLibSpots();
    let spot = null;

    if (cat === 'RFI') {
        spot = spots.find(s => s.hero === libSel.heroPos);
    } else {
        spot = spots.find(s => s.hero === libSel.heroPos && s.opp === libSel.oppPos);
    }

    if (!spot) { area.innerHTML = '<div class="text-slate-600 text-sm mt-10">No data for this selection.</div>'; return; }

    // Get data
    let data = null;
    if (cat === 'RFI') data = rfiRanges[spot.key];
    else if (cat === 'FACING_RFI') data = facingRfiRanges[spot.key];
    else if (cat === 'RFI_VS_3BET') data = rfiVs3BetRanges[spot.key];
    else if (cat === 'VS_LIMP') {
        data = getLimpDataForBucket(spot.hero, spot.opp, libSel.bucket) || allFacingLimps[spot.key];
    } else if (cat === 'SQUEEZE') data = squeezeRanges[spot.key];
    else if (cat === 'SQUEEZE_2C') data = squeezeVsRfiTwoCallers[spot.key];
    else if (cat === 'PUSH_FOLD') {
        const depth = libSel.pfStackDepth || 10;
        data = (typeof PF_PUSH !== 'undefined' && PF_PUSH[depth]) ? PF_PUSH[depth][spot.key] : null;
    }

    if (!data) { area.innerHTML = '<div class="text-slate-600 text-sm mt-10">No data for this selection.</div>'; return; }

    // Title
    let title = '';
    if (cat === 'RFI') title = `${POS_LABELS[spot.hero]} Open Range`;
    else if (cat === 'VS_LIMP') title = `${POS_LABELS[spot.hero]} vs ${POS_LABELS[spot.opp]} Limp`;
    else if (cat === 'PUSH_FOLD') title = `${POS_LABELS[spot.hero] || spot.hero} Push Range — ${libSel.pfStackDepth}BB`;
    else if (cat === 'SQUEEZE' || cat === 'SQUEEZE_2C') {
        const p = cat === 'SQUEEZE' ? parseSqueezeKey(spot.key) : parseSqueeze2CKey(spot.key);
        title = cat === 'SQUEEZE'
            ? `${POS_LABELS[p.hero]} Squeeze — ${POS_LABELS[p.opener]} opens, ${POS_LABELS[p.caller]} calls`
            : `${POS_LABELS[p.hero]} Squeeze — ${POS_LABELS[p.opener]} opens, ${POS_LABELS[p.caller1]} & ${POS_LABELS[p.caller2]} call`;
    } else {
        title = `${POS_LABELS[spot.hero]} vs ${POS_LABELS[spot.opp]}`;
    }

    // Legend
    let legendHtml = '';
    if (cat === 'PUSH_FOLD') {
        legendHtml = '<div class="flex gap-4 text-[10px] font-bold uppercase tracking-wider"><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-rose-600 inline-block"></span>Shove</span><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-slate-950 border border-slate-700 inline-block"></span>Fold</span></div>';
    } else if (cat === 'RFI') {
        legendHtml = '<div class="flex gap-4 text-[10px] font-bold uppercase tracking-wider"><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-indigo-600 inline-block"></span>Open</span><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-slate-950 border border-slate-700 inline-block"></span>Fold</span></div>';
    } else if (cat === 'VS_LIMP') {
        legendHtml = '<div class="flex gap-4 text-[10px] font-bold uppercase tracking-wider"><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-orange-600 inline-block"></span>Iso</span><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-cyan-700 inline-block"></span>Limp</span><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-slate-950 border border-slate-700 inline-block"></span>Fold</span></div>';
    } else if (cat === 'SQUEEZE' || cat === 'SQUEEZE_2C') {
        legendHtml = '<div class="flex gap-4 text-[10px] font-bold uppercase tracking-wider"><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-red-600 inline-block"></span>Squeeze</span><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-emerald-600 inline-block"></span>Call</span><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-slate-950 border border-slate-700 inline-block"></span>Fold</span></div>';
    } else {
        const raiseLabel = cat === 'RFI_VS_3BET' ? '4-Bet' : '3-Bet';
        legendHtml = `<div class="flex gap-4 text-[10px] font-bold uppercase tracking-wider"><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-indigo-600 inline-block"></span>${raiseLabel}</span><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-emerald-600 inline-block"></span>Call</span><span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-slate-950 border border-slate-700 inline-block"></span>Fold</span></div>`;
    }

    // Build grid
    let grid = '';
    // Rank labels row
    grid += RANKS.map(r => `<div class="aspect-square flex items-center justify-center text-[7px] font-black text-slate-600">${r}</div>`).join('');
    for (let i = 0; i < 13; i++) {
        for (let j = 0; j < 13; j++) {
            const r1 = RANKS[i], r2 = RANKS[j];
            const hKey = (i === j) ? r1 + r2 : (i < j ? r1 + r2 + 's' : r2 + r1 + 'o');
            let bg = 'bg-slate-900';
            if (cat === 'PUSH_FOLD') {
                if (checkRangeHelper(hKey, data)) bg = 'bg-rose-600';
            } else if (cat === 'RFI') {
                if (checkRangeHelper(hKey, data)) bg = 'bg-indigo-600';
            } else if (cat === 'VS_LIMP') {
                if (checkRangeHelper(hKey, getLimpRaise(data))) bg = 'bg-orange-600';
                else if (checkRangeHelper(hKey, getLimpPassive(data))) bg = 'bg-cyan-700';
            } else if (cat === 'SQUEEZE' || cat === 'SQUEEZE_2C') {
                if (checkRangeHelper(hKey, data["Squeeze"])) { bg = isSqueezeBluff(hKey, data) ? 'bg-red-600 sq-bluff-stripe' : 'bg-red-600'; }
                else if (data["Call"] && checkRangeHelper(hKey, data["Call"])) bg = 'bg-emerald-600';
            } else {
                if (checkRangeHelper(hKey, data["3-bet"] || data["4-bet"])) bg = 'bg-indigo-600';
                else if (checkRangeHelper(hKey, data["Call"])) bg = 'bg-emerald-600';
            }
            // Cell label: suits label on diagonal, otherwise hand key small
            const isP = i === j, isS = i < j;
            const cellLabel = `<span class="text-[5px] font-black leading-none select-none ${bg === 'bg-slate-900' ? 'text-slate-700' : 'text-white/60'}">${hKey}</span>`;
            grid += `<div class="aspect-square rounded-[1px] ${bg} flex items-center justify-center">${cellLabel}</div>`;
        }
    }

    // Hand counts
    let counts = '';
    if (cat === 'PUSH_FOLD') {
        const n = (data || []).reduce((acc, combo) => acc + countCombos(combo), 0);
        counts = `<div class="text-[11px] text-slate-500"><span class="font-bold text-rose-400">${n}</span> shove combos</div>`;
    } else if (cat === 'RFI') {
        const n = (data || []).reduce((acc, combo) => acc + countCombos(combo), 0);
        counts = `<div class="text-[11px] text-slate-500"><span class="font-bold text-slate-300">${n}</span> combos</div>`;
    } else if (data["3-bet"] || data["4-bet"] || data["Squeeze"]) {
        const raiseKey = data["3-bet"] ? "3-bet" : data["4-bet"] ? "4-bet" : "Squeeze";
        const nR = (data[raiseKey]||[]).reduce((acc,c)=>acc+countCombos(c),0);
        const nC = (data["Call"]||[]).reduce((acc,c)=>acc+countCombos(c),0);
        const raiseLabel = cat === 'RFI_VS_3BET' ? '4-bet' : cat === 'SQUEEZE' || cat === 'SQUEEZE_2C' ? 'Squeeze' : '3-bet';
        counts = `<div class="flex gap-5 text-[11px] text-slate-500"><span><span class="font-bold text-indigo-400">${nR}</span> ${raiseLabel}</span><span><span class="font-bold text-emerald-400">${nC}</span> call</span></div>`;
    }

    area.innerHTML = `
        <div class="w-full max-w-sm flex flex-col items-center gap-3">
            <div class="text-center">
                <div class="text-[11px] font-black uppercase tracking-widest text-slate-300">${title}</div>
            </div>
            ${legendHtml}
            <div class="range-grid w-full gap-[1px]" style="grid-template-columns: repeat(13,1fr);">${grid}</div>
            ${counts}
            <button onclick="zoomSpot('${spot.hero}','${cat === 'SQUEEZE' || cat === 'SQUEEZE_2C' ? spot.key : (spot.opp||'')}','${cat}',null)" class="mt-1 px-5 py-2.5 pc-btn-aggressive transition-all" style="border-radius:12px;font-size:11px;font-weight:900;letter-spacing:.05em;">Full View</button>
        </div>
    `;
}

function countCombos(rangeStr) {
    // Quick combo counter for display
    if (!rangeStr) return 0;
    try {
        const expanded = expandList([rangeStr]);
        return expanded.reduce((acc, h) => {
            if (h.length === 2) return acc + 6; // pair
            if (h.endsWith('s')) return acc + 4;
            if (h.endsWith('o')) return acc + 12;
            return acc + 6;
        }, 0);
    } catch(_) { return 0; }
}

function zoomSpot(pos, opp, cat, spotIdx) {
    _chartIsReview = true;
    // Pass the library's selected bucket as a chart-local override so we never
    // mutate state.limperBucket (which belongs to the active training session).
    const bucket = (cat === 'VS_LIMP') ? (libSel.bucket || '1L') : null;
    showChart(pos, null, cat, opp, bucket);
}

// Legacy stub — keep for backward compat with any saved references
function switchLibBucket(spotIdx, pos, opp, bucket) {
    libSel.bucket = bucket;
    renderLibraryChart();
}

// --- TRAINER LOGIC ---

function generateNextRound() {
    // FIX Bug D: reset per-round so guard doesn't saturate across the session
    if (dailyRunState && dailyRunState.active) dailyRunState._rerollGuard = 0;

    const srDb = SR.getAll();

    if (reviewSession.active) {
        // SR-driven review: hand-level keys like "FACING_RFI|CO_vs_UTG|AKs"
        if (reviewSession.answered >= reviewSession.maxQ) {
            reviewSession.active = false;
            showReviewComplete();
            return;
        }
        const handLevelKey = SR.selectSpot(reviewSession.queue, reviewSession.recentKeys);
        reviewSession.recentKeys.push(handLevelKey);
        reviewSession.answered++;

        // Parse hand-level key: last segment is hand, rest is spotKey
        const lastPipe = handLevelKey.lastIndexOf('|');
        const reviewHand = handLevelKey.substring(lastPipe + 1);
        const spotKeyPart = handLevelKey.substring(0, lastPipe);
        const parts = spotKeyPart.split('|');
        state.scenario = parts[0];
        // Override hand if it's a real hand (not _LEGACY)
        state._reviewHandOverride = (reviewHand && reviewHand !== '_LEGACY' && reviewHand.length <= 4) ? reviewHand : null;

        if (state.scenario === 'RFI') {
            state.currentPos = parts[1];
            state.oppPos = '';
            state.villainOpenSize = 15; // RFI: hero opens, no villain open
        } else if (state.scenario === 'FACING_RFI') {
            const [p, o] = parts[1].split('_vs_');
            state.currentPos = p; state.oppPos = o;
            state.villainOpenSize = pickVillainOpenSize(); // FIX Bug A: was stale
        } else if (state.scenario === 'RFI_VS_3BET') {
            const [p, o] = parts[1].split('_vs_');
            state.currentPos = p; state.oppPos = o;
            state.villainOpenSize = getOpenSize$(); // FIX Bug A: was stale
        } else if (state.scenario === 'VS_LIMP') {
            const m = parts[1].match(/(.+)_vs_(.+)_Limp/);
            state.currentPos = m ? m[1] : 'BTN';
            state.oppPos = m ? m[2] : 'UTG';
            const possibleBucket = parts[2];
            if (possibleBucket === '1L' || possibleBucket === '2L' || possibleBucket === '3P') {
                state.limperBucket = possibleBucket;
            } else {
                state.limperBucket = '1L';
            }
            if (state.limperBucket === '1L') {
                state.limperPositions = [state.oppPos];
            } else {
                const numL = state.limperBucket === '2L' ? 2 : 3;
                let limpers = generateLimperPositions(numL, state.currentPos);
                if (!limpers.includes(state.oppPos)) {
                    if (limpers.length >= numL) limpers[limpers.length - 1] = state.oppPos;
                    else limpers.push(state.oppPos);
                    const ao = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB','BB'];
                    limpers.sort((a, b) => ao.indexOf(a) - ao.indexOf(b));
                }
                state.limperPositions = limpers;
                state.oppPos = limpers[0];
            }
        } else if (state.scenario === 'SQUEEZE') {
            const p = parseSqueezeKey(parts[1]);
            state.currentPos = p.hero;
            state.squeezeOpener = p.opener;
            state.squeezeCaller = p.caller;
            state.oppPos = parts[1];
        } else if (state.scenario === 'SQUEEZE_2C') {
            const p = parseSqueeze2CKey(parts[1]);
            state.currentPos = p.hero;
            state.squeezeOpener = p.opener;
            state.squeezeCaller = p.caller1;
            state.squeezeCaller2 = p.caller2;
            state.oppPos = parts[1];
        } else if (state.scenario === 'PUSH_FOLD') {
            state.currentPos = parts[1];
            state.oppPos = '';
            const bbStr = parts[2] || '10BB';
            state.stackBB = parseInt(bbStr) || 10;
        } else {
            // Fallback for any other scenario with a pos_vs_pos key
            const [p, o] = parts[1].split('_vs_');
            state.currentPos = p; state.oppPos = o;
        }
    } else {
        // Normal training: random scenario/spot respecting config
        const validScenarios = state.config.scenarios.filter(s => {
            if (s === 'RFI') return state.config.positions.some(p => rfiRanges[p]);
            if (s === 'FACING_RFI') {
                const _oppF = state.config.oppPositions;
                return Object.keys(facingRfiRanges).some(k => {
                    const [hp, op] = k.split('_vs_');
                    if (!state.config.positions.includes(hp)) return false;
                    if (_oppF && _oppF.length > 0 && !_oppF.includes(op)) return false;
                    return true;
                });
            }
            if (s === 'RFI_VS_3BET') {
                const _oppV = state.config.oppPositions;
                return Object.keys(rfiVs3BetRanges).some(k => {
                    const [hp, op] = k.split('_vs_');
                    if (!state.config.positions.includes(hp)) return false;
                    if (_oppV && _oppV.length > 0 && !_oppV.includes(op)) return false;
                    return true;
                });
            }
            if (s === 'VS_4BET') {
                const _opp4 = state.config.oppPositions;
                return Object.keys(vs4BetRanges).some(k => {
                    const [hp, op] = k.split('_vs_');
                    if (!state.config.positions.includes(hp)) return false;
                    if (_opp4 && _opp4.length > 0 && !_opp4.includes(op)) return false;
                    return true;
                });
            }
            if (s === 'VS_LIMP') { const lp = state.config.positions; return Object.keys(allFacingLimps).some(k => { const m = k.match(/(.+)_vs_(.+)_Limp/); return m && lp.includes(m[1]); }); }
            if (s === 'SQUEEZE') { return Object.keys(squeezeRanges).some(k => { const p = parseSqueezeKey(k); return p && state.config.positions.includes(p.hero); }); }
            if (s === 'SQUEEZE_2C') { return Object.keys(squeezeVsRfiTwoCallers).some(k => { const p = parseSqueeze2CKey(k); return p && state.config.positions.includes(p.hero); }); }
            if (s === 'PUSH_FOLD') { return (state.pfStacks || state.config.pfStacks || [10]).length > 0 && state.config.positions.some(p => p !== 'BB'); }
            if (s === 'POSTFLOP_CBET') { return typeof POSTFLOP_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_STRATEGY).length > 0; }
            if (s === 'POSTFLOP_3BP_CBET') { return typeof generate3BPPostflopSpot === 'function'; }
            if (s === 'POSTFLOP_DEFEND') { return typeof POSTFLOP_DEFEND_VS_CBET !== 'undefined' && Object.keys(POSTFLOP_DEFEND_VS_CBET).length > 0; }
            if (s === 'POSTFLOP_3BP_DEFEND') { return typeof POSTFLOP_3BP_DEFEND_VS_CBET !== 'undefined' && Object.keys(POSTFLOP_3BP_DEFEND_VS_CBET).length > 0; }
            if (s === 'POSTFLOP_TURN_CBET') { return typeof POSTFLOP_TURN_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_TURN_STRATEGY).length > 0; }
            if (s === 'POSTFLOP_TURN_DEFEND') { return typeof POSTFLOP_TURN_DEFEND_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_TURN_DEFEND_STRATEGY).length > 0; }
            if (s === 'POSTFLOP_TURN_DELAYED_CBET') { return typeof POSTFLOP_TURN_DELAYED_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_TURN_DELAYED_STRATEGY).length > 0; }
            if (s === 'POSTFLOP_TURN_DELAYED_DEFEND') { return typeof POSTFLOP_TURN_DELAYED_DEFEND_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_TURN_DELAYED_DEFEND_STRATEGY).length > 0; }
            if (s === 'POSTFLOP_TURN_PROBE') { return typeof POSTFLOP_TURN_PROBE_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_TURN_PROBE_STRATEGY).length > 0; }
            if (s === 'POSTFLOP_TURN_PROBE_DEFEND') { return typeof POSTFLOP_TURN_PROBE_DEFEND_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_TURN_PROBE_DEFEND_STRATEGY).length > 0; }
            if (s === 'POSTFLOP_RIVER_CBET') { return typeof POSTFLOP_RIVER_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_RIVER_STRATEGY).length > 0; }
            if (s === 'POSTFLOP_RIVER_DEFEND') { return typeof POSTFLOP_RIVER_DEFEND_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_RIVER_DEFEND_STRATEGY).length > 0; }
            if (s === 'POSTFLOP_RIVER_DELAYED_CBET') { return typeof POSTFLOP_RIVER_DELAYED_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_RIVER_DELAYED_STRATEGY).length > 0; }
            if (s === 'POSTFLOP_RIVER_DELAYED_DEFEND') { return typeof POSTFLOP_RIVER_DELAYED_DEFEND_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_RIVER_DELAYED_DEFEND_STRATEGY).length > 0; }
            if (s === 'POSTFLOP_RIVER_PROBE') { return typeof POSTFLOP_RIVER_PROBE_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_RIVER_PROBE_STRATEGY).length > 0; }
            if (s === 'POSTFLOP_RIVER_PROBE_BET') { return typeof POSTFLOP_RIVER_PROBE_BET_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_RIVER_PROBE_BET_STRATEGY).length > 0; }
            if (s === 'POSTFLOP_RIVER_TURN_CHECK_CBET') { return typeof POSTFLOP_RIVER_TURN_CHECK_CBET_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_RIVER_TURN_CHECK_CBET_STRATEGY).length > 0; }
            if (s === 'POSTFLOP_RIVER_TURN_CHECK_DEFEND') { return typeof POSTFLOP_RIVER_TURN_CHECK_DEFEND_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_RIVER_TURN_CHECK_DEFEND_STRATEGY).length > 0; }
            if (s === 'POSTFLOP_RIVER_PROBE_CALL_BET') { return typeof POSTFLOP_RIVER_PROBE_CALL_BET_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_RIVER_PROBE_CALL_BET_STRATEGY).length > 0; }
            if (s === 'POSTFLOP_RIVER_PROBE_CALL_DEFEND') { return typeof POSTFLOP_RIVER_PROBE_CALL_DEFEND_STRATEGY !== 'undefined' && Object.keys(POSTFLOP_RIVER_PROBE_CALL_DEFEND_STRATEGY).length > 0; }
            return false;
        });
        if (!validScenarios.length) { console.warn('[Trainer] No valid scenarios for config:', JSON.stringify(state.config)); return; }
        console.log('[Trainer] Config scenarios:', state.config.scenarios, '→ valid:', validScenarios);

        // 80/20 due-item priority: if SR has due hands matching config, pick from due set 80% of the time
        let usedDuePick = false;
        const validScSet = new Set(validScenarios);
        const dueKeys = SR.getDueSpots(false).filter(k => {
            const parts = k.split('|');
            if (!validScSet.has(parts[0])) return false;
            // Check position is in config
            const spotId = parts[1] || '';
            const heroPos = spotId.split('_vs_')[0].replace(/_Limp$/, '');
            if (parts[0] === 'SQUEEZE') {
                const sq = parseSqueezeKey(spotId);
                return sq && state.config.positions.includes(sq.hero);
            }
            if (parts[0] === 'SQUEEZE_2C') {
                const sq = parseSqueeze2CKey(spotId);
                return sq && state.config.positions.includes(sq.hero);
            }
            if (!state.config.positions.includes(heroPos)) return false;
            // oppPositions filter for due keys (FACING_RFI, RFI_VS_3BET)
            if (state.config.oppPositions && state.config.oppPositions.length > 0) {
                const oppPos = spotId.split('_vs_')[1];
                if (oppPos && (parts[0] === 'FACING_RFI' || parts[0] === 'RFI_VS_3BET')) {
                    if (!state.config.oppPositions.includes(oppPos)) return false;
                }
            }
            return true;
        });
        if (dueKeys.length > 0 && Math.random() < 0.8) {
            const dueKey = dueKeys[Math.floor(Math.random() * dueKeys.length)];
            const lastPipe = dueKey.lastIndexOf('|');
            const spotKeyPart = dueKey.substring(0, lastPipe);
            const dueHand = dueKey.substring(lastPipe + 1);
            const parts = spotKeyPart.split('|');
            state.scenario = parts[0];
            if (state.scenario === 'RFI') {
                state.currentPos = parts[1]; state.oppPos = '';
            } else if (state.scenario === 'VS_LIMP') {
                const m = parts[1].match(/(.+)_vs_(.+)_Limp/);
                state.currentPos = m ? m[1] : 'BTN'; state.oppPos = m ? m[2] : 'UTG';
                // Extract limper bucket from SR key if present (part after _Limp| e.g. "|2L")
                // SR keys: VS_LIMP|BTN_vs_UTG_Limp|2L|AKs - bucket is parts[2] if it matches
                const possibleBucket = parts[2];
                if (possibleBucket === '1L' || possibleBucket === '2L' || possibleBucket === '3P') {
                    state.limperBucket = possibleBucket;
                } else {
                    state.limperBucket = '1L';
                }
                if (state.limperBucket === '1L') {
                    state.limperPositions = [state.oppPos];
                } else {
                    const numL = state.limperBucket === '2L' ? 2 : 3;
                    let limpers = generateLimperPositions(numL, state.currentPos);
                    if (!limpers.includes(state.oppPos)) {
                        if (limpers.length >= numL) limpers[limpers.length - 1] = state.oppPos;
                        else limpers.push(state.oppPos);
                        const ao = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB','BB'];
                        limpers.sort((a, b) => ao.indexOf(a) - ao.indexOf(b));
                    }
                    state.limperPositions = limpers;
                    state.oppPos = limpers[0];
                }
            } else if (state.scenario === 'SQUEEZE') {
                const p = parseSqueezeKey(parts[1]);
                if (p) { state.currentPos = p.hero; state.squeezeOpener = p.opener; state.squeezeCaller = p.caller; state.oppPos = parts[1]; }
            } else if (state.scenario === 'SQUEEZE_2C') {
                const p = parseSqueeze2CKey(parts[1]);
                if (p) { state.currentPos = p.hero; state.squeezeOpener = p.opener; state.squeezeCaller = p.caller1; state.squeezeCaller2 = p.caller2; state.oppPos = parts[1]; }
            } else if (state.scenario === 'PUSH_FOLD') {
                state.currentPos = parts[1];
                state.oppPos = '';
                // stack depth encoded as "10BB" in parts[2]
                const bbStr = parts[2] || '10BB';
                state.stackBB = parseInt(bbStr) || 10;
            } else {
                const [p, o] = parts[1].split('_vs_');
                state.currentPos = p; state.oppPos = o;
            }
            // Override hand selection with the due hand if valid
            if (dueHand && dueHand !== '_LEGACY' && dueHand.length <= 4) {
                state._reviewHandOverride = dueHand;
            }
            usedDuePick = true;
        }

        if (!usedDuePick) {
        state.scenario = validScenarios[Math.floor(Math.random() * validScenarios.length)];
        if (state.scenario === 'RFI') {
            const avail = state.config.positions.filter(p => rfiRanges[p]);
            state.currentPos = avail[Math.floor(Math.random() * avail.length)];
            state.oppPos = '';
        } else if (state.scenario === 'FACING_RFI') {
            let pairs = Object.keys(facingRfiRanges).filter(p => state.config.positions.includes(p.split('_vs_')[0]));
            // oppPositions filter: restrict to allowed opponent positions
            if (state.config.oppPositions && state.config.oppPositions.length > 0) {
                pairs = pairs.filter(p => state.config.oppPositions.includes(p.split('_vs_')[1]));
            }
            const key = pairs[Math.floor(Math.random() * pairs.length)];
            [state.currentPos, state.oppPos] = key.split('_vs_');
            state.villainOpenSize = pickVillainOpenSize();
        } else if (state.scenario === 'RFI_VS_3BET' || state.scenario === 'RFI_VS_3') {
            let pairs = Object.keys(rfiVs3BetRanges).filter(p => state.config.positions.includes(p.split('_vs_')[0]));
            // oppPositions filter: restrict to allowed 3-bettor positions
            if (state.config.oppPositions && state.config.oppPositions.length > 0) {
                pairs = pairs.filter(p => state.config.oppPositions.includes(p.split('_vs_')[1]));
            }
            const key = pairs[Math.floor(Math.random() * pairs.length)];
            [state.currentPos, state.oppPos] = key.split('_vs_');
            state.villainOpenSize = getOpenSize$(); // hero opened; villain 3-bet sizes off hero's open
        } else if (state.scenario === 'VS_4BET') {
            let pairs4 = Object.keys(vs4BetRanges).filter(p => state.config.positions.includes(p.split('_vs_')[0]));
            if (state.config.oppPositions && state.config.oppPositions.length > 0) {
                pairs4 = pairs4.filter(p => state.config.oppPositions.includes(p.split('_vs_')[1]));
            }
            const key4 = pairs4[Math.floor(Math.random() * pairs4.length)];
            [state.currentPos, state.oppPos] = key4.split('_vs_');
            state.villainOpenSize = getOpenSize$();
        } else if (state.scenario === 'VS_LIMP') {
            // Filter limp keys to enabled hero positions
            const limpKeys = Object.keys(allFacingLimps).filter(k => {
                const m = k.match(/(.+)_vs_(.+)_Limp/);
                return m && state.config.positions.includes(m[1]);
            });
            const key = limpKeys[Math.floor(Math.random() * limpKeys.length)];
            const m = key.match(/(.+)_vs_(.+)_Limp/);
            state.currentPos = m[1];
            state.oppPos = m[2]; // firstLimper position
            // Pick limper bucket — respect challenge node lock if active
            state.limperBucket = (drillState.lockedLimperBucket) ? drillState.lockedLimperBucket : pickLimperBucket();
            // Generate limper positions for multi-limp
            if (state.limperBucket === '1L') {
                state.limperPositions = [state.oppPos];
            } else {
                const numLimpers = state.limperBucket === '2L' ? 2 : 3;
                let limpers = generateLimperPositions(numLimpers, state.currentPos);
                // Ensure firstLimper is in the list (it anchors the base range)
                if (!limpers.includes(state.oppPos)) {
                    // Replace a random non-first limper or add
                    if (limpers.length >= numLimpers) limpers[limpers.length - 1] = state.oppPos;
                    else limpers.push(state.oppPos);
                    const actionOrder = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB','BB'];
                    limpers.sort((a, b) => actionOrder.indexOf(a) - actionOrder.indexOf(b));
                }
                state.limperPositions = limpers;
                // oppPos stays as first limper (for range lookup)
                state.oppPos = limpers[0];
            }
        } else if (state.scenario === 'SQUEEZE') {
            const sqKeys = Object.keys(squeezeRanges).filter(k => {
                const p = parseSqueezeKey(k);
                return p && state.config.positions.includes(p.hero);
            });
            const key = sqKeys[Math.floor(Math.random() * sqKeys.length)];
            const p = parseSqueezeKey(key);
            state.currentPos = p.hero;
            state.squeezeOpener = p.opener;
            state.squeezeCaller = p.caller;
            state.oppPos = key; // full key for data lookup
            state.villainOpenSize = pickVillainOpenSize();
        } else if (state.scenario === 'SQUEEZE_2C') {
            const sqKeys = Object.keys(squeezeVsRfiTwoCallers).filter(k => {
                const p = parseSqueeze2CKey(k);
                return p && state.config.positions.includes(p.hero);
            });
            const key = sqKeys[Math.floor(Math.random() * sqKeys.length)];
            const p = parseSqueeze2CKey(key);
            state.currentPos = p.hero;
            state.squeezeOpener = p.opener;
            state.squeezeCaller = p.caller1;
            state.squeezeCaller2 = p.caller2;
            state.oppPos = key;
            state.villainOpenSize = pickVillainOpenSize();
        } else if (state.scenario === 'PUSH_FOLD') {
            // Pick a random enabled stack depth and a random eligible hero position
            const stacks = state.pfStacks || state.config.pfStacks || [5,8,10,13,15,20];
            state.stackBB = stacks[Math.floor(Math.random() * stacks.length)];
            // Hero can be any configured position except BB (BB is call-only, handled separately as oppPos)
            const pfPositions = state.config.positions.filter(p => p !== 'BB' && PF_PUSH[state.stackBB] && PF_PUSH[state.stackBB][p]);
            if (!pfPositions.length) { state.currentPos = 'BTN'; } else {
                state.currentPos = pfPositions[Math.floor(Math.random() * pfPositions.length)];
            }
            state.oppPos = '';
        } else if (state.scenario === 'POSTFLOP_CBET') {
            // Postflop: generate spot, store in state.postflop, skip normal hand sampling
            // Build family filter: use explicit postflopFamilies if set (challenge nodes),
            // otherwise filter HERO_HAND_AWARE_FAMILIES by the user's selected hero positions.
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                pfFamFilter = [...HERO_HAND_AWARE_FAMILIES].filter(fam => {
                    const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                    return fi && posSet.has(fi.heroPos);
                });
                if (pfFamFilter.length === 0) pfFamFilter = null; // fallback to all
            }
            const spot = generatePostflopSpot(20, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_3BP_CBET') {
            // 3BP Flop C-Bet: BTN 3bets CO, CO calls, BTN is IP c-bettor
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                pfFamFilter = [...HERO_HAND_AWARE_3BP_FAMILIES].filter(fam => {
                    const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                    return fi && posSet.has(fi.heroPos);
                });
                if (pfFamFilter.length === 0) pfFamFilter = null;
            }
            const spot = generate3BPPostflopSpot(20, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_DEFEND') {
            // Defender vs c-bet: hero is BB facing c-bet
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                // For defender, hero is always BB. Filter families by villain (PFR) position
                // matching user's selected positions, OR if BB is selected.
                const posSet = new Set(state.config.positions);
                if (posSet.has('BB')) {
                    pfFamFilter = null; // BB selected → all defender families
                } else {
                    // Filter by villain position matching user selection
                    pfFamFilter = DEFENDER_FAMILIES.filter(fam => {
                        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                        return fi && posSet.has(fi.heroPos); // fi.heroPos is the PFR (villain in defend)
                    });
                    if (pfFamFilter.length === 0) pfFamFilter = null;
                }
            }
            const spot = generateDefenderSpot(20, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_3BP_DEFEND') {
            // 3BP Defender: hero called the 3bet, now faces c-bet from 3bettor
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                pfFamFilter = [...HERO_HAND_AWARE_3BP_DEFEND_FAMILIES].filter(fam => {
                    const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                    return fi && posSet.has(fi.heroPos);
                });
                if (pfFamFilter.length === 0) pfFamFilter = null;
            }
            const spot = generate3BPDefenderSpot(20, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_TURN_CBET') {
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                pfFamFilter = [...HERO_HAND_AWARE_FAMILIES].filter(fam => {
                    const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                    return fi && posSet.has(fi.heroPos);
                });
                if (pfFamFilter.length === 0) pfFamFilter = null;
            }
            const spot = generateTurnCBetSpot(25, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_TURN_DEFEND') {
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                if (posSet.has('BB')) {
                    pfFamFilter = null;
                } else {
                    pfFamFilter = DEFENDER_FAMILIES.filter(fam => {
                        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                        return fi && posSet.has(fi.heroPos);
                    });
                    if (pfFamFilter.length === 0) pfFamFilter = null;
                }
            }
            const spot = generateTurnDefendSpot(25, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_TURN_DELAYED_CBET') {
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                pfFamFilter = [...HERO_HAND_AWARE_FAMILIES].filter(fam => {
                    const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                    return fi && posSet.has(fi.heroPos);
                });
                if (pfFamFilter.length === 0) pfFamFilter = null;
            }
            const spot = generateDelayedTurnSpot(25, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_TURN_DELAYED_DEFEND') {
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                if (posSet.has('BB')) {
                    pfFamFilter = null;
                } else {
                    pfFamFilter = [...DEFENDER_FAMILIES].filter(fam => {
                        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                        return fi && posSet.has(fi.heroPos);
                    });
                    if (pfFamFilter.length === 0) pfFamFilter = null;
                }
            }
            const spot = generateTurnDelayedDefendSpot(25, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_TURN_PROBE') {
            // IP hero (BTN/CO) faces BB's turn probe after flop check-through
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                // Probe families are IP-only (BTN_vs_BB, CO_vs_BB); filter by hero position
                const PROBE_FAMS = (typeof PROBE_IP_FAMILIES !== 'undefined') ? PROBE_IP_FAMILIES : ['BTN_vs_BB', 'CO_vs_BB'];
                pfFamFilter = PROBE_FAMS.filter(fam => {
                    const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                    return fi && posSet.has(fi.heroPos);
                });
                if (pfFamFilter.length === 0) pfFamFilter = null;
            }
            const spot = generateTurnProbeSpot(25, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_TURN_PROBE_DEFEND') {
            // BB hero probes the turn after flop check-through
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                // Hero is always BB; if BB is selected allow all probe families, else filter by villain (PFR) position
                if (posSet.has('BB')) {
                    pfFamFilter = null;
                } else {
                    const PROBE_FAMS = (typeof PROBE_IP_FAMILIES !== 'undefined') ? PROBE_IP_FAMILIES : ['BTN_vs_BB', 'CO_vs_BB'];
                    pfFamFilter = PROBE_FAMS.filter(fam => {
                        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                        return fi && posSet.has(fi.heroPos); // fi.heroPos is the IP PFR (villain here)
                    });
                    if (pfFamFilter.length === 0) pfFamFilter = null;
                }
            }
            const spot = generateTurnProbeDefendSpot(25, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_RIVER_CBET') {
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                pfFamFilter = [...HERO_HAND_AWARE_FAMILIES].filter(fam => {
                    const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                    return fi && posSet.has(fi.heroPos);
                });
                if (pfFamFilter.length === 0) pfFamFilter = null;
            }
            const spot = generateRiverCBetSpot(25, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_RIVER_DEFEND') {
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                if (posSet.has('BB')) {
                    pfFamFilter = null;
                } else {
                    pfFamFilter = DEFENDER_FAMILIES.filter(fam => {
                        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                        return fi && posSet.has(fi.heroPos);
                    });
                    if (pfFamFilter.length === 0) pfFamFilter = null;
                }
            }
            const spot = generateRiverDefendSpot(25, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_RIVER_DELAYED_CBET') {
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                pfFamFilter = [...HERO_HAND_AWARE_FAMILIES].filter(fam => {
                    const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                    return fi && posSet.has(fi.heroPos);
                });
                if (pfFamFilter.length === 0) pfFamFilter = null;
            }
            const spot = generateRiverDelayedCBetSpot(25, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_RIVER_DELAYED_DEFEND') {
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                if (posSet.has('BB')) {
                    pfFamFilter = null;
                } else {
                    pfFamFilter = DEFENDER_FAMILIES.filter(fam => {
                        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                        return fi && posSet.has(fi.heroPos);
                    });
                    if (pfFamFilter.length === 0) pfFamFilter = null;
                }
            }
            const spot = generateRiverDelayedDefendSpot(25, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_RIVER_PROBE') {
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                pfFamFilter = [...PROBE_IP_FAMILIES].filter(fam => {
                    const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                    return fi && posSet.has(fi.heroPos);
                });
                if (pfFamFilter.length === 0) pfFamFilter = null;
            }
            const spot = generateRiverProbeSpot(25, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_RIVER_PROBE_BET') {
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                if (posSet.has('BB')) {
                    pfFamFilter = null;
                } else {
                    pfFamFilter = [...PROBE_IP_FAMILIES].filter(fam => {
                        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                        return fi && posSet.has(fi.heroPos);
                    });
                    if (pfFamFilter.length === 0) pfFamFilter = null;
                }
            }
            const spot = generateRiverProbeBetSpot(25, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_RIVER_TURN_CHECK_CBET') {
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                pfFamFilter = [...HERO_HAND_AWARE_FAMILIES].filter(fam => {
                    const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                    return fi && posSet.has(fi.heroPos);
                });
                if (pfFamFilter.length === 0) pfFamFilter = null;
            }
            const spot = generateRiverTurnCheckCBetSpot(25, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_RIVER_TURN_CHECK_DEFEND') {
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                if (posSet.has('BB')) {
                    pfFamFilter = null;
                } else {
                    pfFamFilter = [...DEFENDER_FAMILIES].filter(fam => {
                        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                        return fi && posSet.has(fi.heroPos);
                    });
                    if (pfFamFilter.length === 0) pfFamFilter = null;
                }
            }
            const spot = generateRiverTurnCheckDefendSpot(25, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_RIVER_PROBE_CALL_BET') {
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                if (posSet.has('BB')) {
                    pfFamFilter = null;
                } else {
                    pfFamFilter = [...PROBE_IP_FAMILIES].filter(fam => {
                        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                        return fi && posSet.has(fi.heroPos);
                    });
                    if (pfFamFilter.length === 0) pfFamFilter = null;
                }
            }
            const spot = generateRiverProbeCallBetSpot(25, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        } else if (state.scenario === 'POSTFLOP_RIVER_PROBE_CALL_DEFEND') {
            let pfFamFilter = state.config.postflopFamilies || null;
            if (!pfFamFilter && state.config.positions && state.config.positions.length > 0) {
                const posSet = new Set(state.config.positions);
                pfFamFilter = [...PROBE_IP_FAMILIES].filter(fam => {
                    const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
                    return fi && posSet.has(fi.heroPos);
                });
                if (pfFamFilter.length === 0) pfFamFilter = null;
            }
            const spot = generateRiverProbeCallDefendSpot(25, pfFamFilter);
            state.postflop = spot;
            state.currentPos = spot.heroPos;
            state.oppPos = spot.villainPos;
        }
        } // end if (!usedDuePick)
    }

    // Unified spot header — always routes through #turn-context-line.
    // #scenario-hint-row is hidden for all scenarios.
    { const _shr = document.getElementById('scenario-hint-row'); if (_shr) _shr.classList.add('hidden'); }
    { const _shel = document.getElementById('scenario-hint'); if (_shel) _shel.innerText = ''; }

    // Flop spot headers (rendered here before early return; preflop rendered after clearCommunityCards below)
    if ((state.scenario === 'POSTFLOP_CBET' || state.scenario === 'POSTFLOP_3BP_CBET') && state.postflop) {
        const spot = state.postflop;
        const posLabel = spot.positionState === 'IP' ? 'IP' : 'OOP';
        const potLabel = spot.potType === '3BP' ? '3BP Flop C-Bet' : 'Flop C-Bet';
        _renderSpotHeader(`${potLabel} · ${POS_LABELS[spot.heroPos]} vs ${POS_LABELS[spot.villainPos]}`, `${posLabel} · c-bet or check?`, '#34d399');
    } else if (state.scenario === 'POSTFLOP_DEFEND' && state.postflop) {
        const spot = state.postflop;
        _renderSpotHeader(`Flop Defense · BB vs ${POS_LABELS[spot.villainPos]}`, `${POS_LABELS[spot.villainPos]} bets 33%`, '#34d399');
    } else if (state.scenario === 'POSTFLOP_3BP_DEFEND' && state.postflop) {
        const spot = state.postflop;
        const posLabel = spot.positionState === 'IP' ? 'IP' : 'OOP';
        _renderSpotHeader(`3BP Defense · ${POS_LABELS[spot.heroPos]} vs ${POS_LABELS[spot.villainPos]}`, `${posLabel} · ${POS_LABELS[spot.villainPos]} bets 33% · fold / call / raise?`, '#34d399');
    }
    // Turn scenarios: _renderTurnContext handles the header inside their render blocks below

    // 

    // Daily Run: enforce the run-owned scenario pool strictly.
    if (dailyRunState && dailyRunState.active && !dailyRunAllowsScenario(state.scenario)) {
        dailyRunState._rerollGuard = (dailyRunState._rerollGuard || 0) + 1;
        if (dailyRunState._rerollGuard < 120) {
            return generateNextRound();
        }
        console.warn('[DailyRun] Could not build an allowed spot after many rerolls. Resetting guard and trying again.');
        dailyRunState._rerollGuard = 0;
        state._reviewHandOverride = null;
        return generateNextRound();
    }
// Sample hand using EdgeWeight (edge-case focus), or use review override
    // POSTFLOP: skip hand sampling, render community cards and postflop buttons instead
    if ((state.scenario === 'POSTFLOP_CBET' || state.scenario === 'POSTFLOP_3BP_CBET') && state.postflop) {
        clearToast();
        // Clear any stale turn context from a previous turn scenario
        const _tcl = document.getElementById('turn-context-line'); if (_tcl) { _tcl.classList.add('hidden'); _tcl.innerHTML = ''; }
        // Set currentHand to full hero hand object so renderHand uses actual dealt suits
        state.currentHand = state.postflop.heroHand || null;
        // Show card backs immediately so the layout is stable while the table animates
        if (state.currentHand) renderHeroCardBacks();
        // Show flop info line
        const flopInfoEl = document.getElementById('flop-info-line');
        if (flopInfoEl) {
            const spot = state.postflop;
            const archLabel = ARCHETYPE_LABELS[spot.boardArchetype] || spot.boardArchetype;
            flopInfoEl.innerHTML = `<span class="text-slate-400">Flop:</span> ${_flopCardsHtml(spot.flopCards)} <span class="text-slate-500 text-[10px] font-bold uppercase tracking-wider ml-1">(${archLabel})</span>`;
            flopInfoEl.classList.remove('hidden');
        }
        // Render community cards on felt
        renderCommunityCards(state.postflop.flopCards);
        // Clear preflop card/bet layers
        const cl = document.getElementById('cards-layer'); if (cl) cl.innerHTML = '';
        const bl = document.getElementById('bets-layer'); if (bl) bl.innerHTML = '';
        // Update table seats
        try { updateTable(state.postflop.heroPos, state.postflop.villainPos); } catch(_) {}
        // Villain checked — show check indicator near their seat
        try { renderVillainCheck(document.getElementById('bets-layer'), state.postflop.heroPos, state.postflop.villainPos); } catch(_) {}
        // Render postflop buttons hidden, then reveal; simultaneously flip hero cards
        renderPostflopButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            renderPostflopButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP DEFEND: render community cards and defender buttons
    if (state.scenario === 'POSTFLOP_DEFEND' && state.postflop) {
        clearToast();
        // Clear any stale turn context from a previous turn scenario
        const _tcl = document.getElementById('turn-context-line'); if (_tcl) { _tcl.classList.add('hidden'); _tcl.innerHTML = ''; }
        state.currentHand = state.postflop.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoEl = document.getElementById('flop-info-line');
        if (flopInfoEl) {
            const spot = state.postflop;
            const archLabel = ARCHETYPE_LABELS[spot.boardArchetype] || spot.boardArchetype;
            flopInfoEl.innerHTML = `<span class="text-slate-400">Flop:</span> ${_flopCardsHtml(spot.flopCards)} <span class="text-slate-500 text-[10px] font-bold uppercase tracking-wider ml-1">(${archLabel})</span>`;
            flopInfoEl.classList.remove('hidden');
        }
        renderCommunityCards(state.postflop.flopCards);
        const cl = document.getElementById('cards-layer'); if (cl) cl.innerHTML = '';
        const bl = document.getElementById('bets-layer'); if (bl) bl.innerHTML = '';
        try { updateTable(state.postflop.heroPos, state.postflop.villainPos); } catch(_) {}
        // Villain bet — show bet chip near their seat
        try { const _pot = getScenarioPot$(state.scenario); renderVillainBet(document.getElementById('bets-layer'), state.postflop.heroPos, state.postflop.villainPos, Math.round(_pot * 0.33)); } catch(_) {}
        renderDefenderButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            // Show c-bet toast before revealing buttons
            try {
                const spot = state.postflop;
                showToast(`${POS_LABELS[spot.villainPos]} bets 33%`, 'neutral', 1200);
            } catch(_) {}
            renderDefenderButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP 3BP DEFEND: hero called 3bet, faces c-bet
    if (state.scenario === 'POSTFLOP_3BP_DEFEND' && state.postflop) {
        clearToast();
        const _tcl = document.getElementById('turn-context-line'); if (_tcl) { _tcl.classList.add('hidden'); _tcl.innerHTML = ''; }
        state.currentHand = state.postflop.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoEl = document.getElementById('flop-info-line');
        if (flopInfoEl) {
            const spot = state.postflop;
            const archLabel = ARCHETYPE_LABELS[spot.boardArchetype] || spot.boardArchetype;
            flopInfoEl.innerHTML = `<span class="text-slate-400">Flop:</span> ${_flopCardsHtml(spot.flopCards)} <span class="text-slate-500 text-[10px] font-bold uppercase tracking-wider ml-1">(${archLabel})</span>`;
            flopInfoEl.classList.remove('hidden');
        }
        renderCommunityCards(state.postflop.flopCards);
        const cl = document.getElementById('cards-layer'); if (cl) cl.innerHTML = '';
        const bl = document.getElementById('bets-layer'); if (bl) bl.innerHTML = '';
        try { updateTable(state.postflop.heroPos, state.postflop.villainPos); } catch(_) {}
        try { const _pot = getScenarioPot$(state.scenario); renderVillainBet(document.getElementById('bets-layer'), state.postflop.heroPos, state.postflop.villainPos, Math.round(_pot * 0.33)); } catch(_) {}
        render3BPDefenderButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            try {
                const spot = state.postflop;
                showToast(`${POS_LABELS[spot.villainPos]} bets 33%`, 'neutral', 1200);
            } catch(_) {}
            render3BPDefenderButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP TURN CBET: PFR deciding barrel or check on turn
    if (state.scenario === 'POSTFLOP_TURN_CBET' && state.postflop) {
        clearToast();
        const spot = state.postflop;
        state.currentHand = spot.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoEl = document.getElementById('flop-info-line');
        if (flopInfoEl) flopInfoEl.classList.add('hidden');
        renderCommunityCards([...spot.flopCards, spot.turnCard]);
        const cl1 = document.getElementById('cards-layer'); if (cl1) cl1.innerHTML = '';
        const bl1 = document.getElementById('bets-layer'); if (bl1) bl1.innerHTML = '';
        try { updateTable(spot.heroPos, spot.villainPos); } catch(_) {}
        // Villain checked turn — show check indicator
        try { renderVillainCheck(document.getElementById('bets-layer'), spot.heroPos, spot.villainPos); } catch(_) {}
        try { _renderTurnContext(spot, 'POSTFLOP_TURN_CBET'); } catch(_) {}
        renderTurnCBetButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            renderTurnCBetButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP TURN DEFEND: BB deciding fold/call/raise facing PFR's turn barrel
    if (state.scenario === 'POSTFLOP_TURN_DEFEND' && state.postflop) {
        clearToast();
        const spot = state.postflop;
        state.currentHand = spot.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoEl2 = document.getElementById('flop-info-line');
        if (flopInfoEl2) flopInfoEl2.classList.add('hidden');
        renderCommunityCards([...spot.flopCards, spot.turnCard]);
        const cl2 = document.getElementById('cards-layer'); if (cl2) cl2.innerHTML = '';
        const bl2 = document.getElementById('bets-layer'); if (bl2) bl2.innerHTML = '';
        try { updateTable(spot.heroPos, spot.villainPos); } catch(_) {}
        // Villain bet turn — show bet chip near their seat
        try { const _pot = getScenarioPot$(state.scenario); renderVillainBet(document.getElementById('bets-layer'), spot.heroPos, spot.villainPos, Math.round(_pot * 0.5)); } catch(_) {}
        try { _renderTurnContext(spot, 'POSTFLOP_TURN_DEFEND'); } catch(_) {}
        renderTurnDefenderButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            try { showToast(`${POS_LABELS[spot.villainPos]} bets 50%`, 'neutral', 1200); } catch(_) {}
            renderTurnDefenderButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP TURN DELAYED C-BET: PFR deciding bet or check after flop check-through
    if (state.scenario === 'POSTFLOP_TURN_DELAYED_CBET' && state.postflop) {
        clearToast();
        const spot = state.postflop;
        state.currentHand = spot.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoEl = document.getElementById('flop-info-line');
        if (flopInfoEl) flopInfoEl.classList.add('hidden');
        renderCommunityCards([...spot.flopCards, spot.turnCard]);
        const cl3 = document.getElementById('cards-layer'); if (cl3) cl3.innerHTML = '';
        const bl3 = document.getElementById('bets-layer'); if (bl3) bl3.innerHTML = '';
        try { updateTable(spot.heroPos, spot.villainPos); } catch(_) {}
        // Villain checked turn — show check indicator
        try { renderVillainCheck(document.getElementById('bets-layer'), spot.heroPos, spot.villainPos); } catch(_) {}
        try { _renderTurnContext(spot, 'POSTFLOP_TURN_DELAYED_CBET'); } catch(_) {}
        renderDelayedTurnButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            renderDelayedTurnButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP TURN DELAYED DEFEND: BB deciding fold/call/raise facing PFR's delayed turn bet
    if (state.scenario === 'POSTFLOP_TURN_DELAYED_DEFEND' && state.postflop) {
        clearToast();
        const spot = state.postflop;
        state.currentHand = spot.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoElTDD = document.getElementById('flop-info-line');
        if (flopInfoElTDD) flopInfoElTDD.classList.add('hidden');
        renderCommunityCards([...spot.flopCards, spot.turnCard]);
        const clTDD = document.getElementById('cards-layer'); if (clTDD) clTDD.innerHTML = '';
        const blTDD = document.getElementById('bets-layer'); if (blTDD) blTDD.innerHTML = '';
        try { updateTable(spot.heroPos, spot.villainPos); } catch(_) {}
        try { const _pot = getScenarioPot$(state.scenario); renderVillainBet(document.getElementById('bets-layer'), spot.heroPos, spot.villainPos, Math.round(_pot * 0.5)); } catch(_) {}
        try { _renderPostflopContext(spot, 'POSTFLOP_TURN_DELAYED_DEFEND'); } catch(_) {}
        renderDelayedTurnDefendButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            try { showToast(`${POS_LABELS[spot.villainPos] || spot.villainPos} bets 50%`, 'neutral', 1200); } catch(_) {}
            renderDelayedTurnDefendButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP TURN PROBE: IP hero faces BB's probe after flop check-through
    if (state.scenario === 'POSTFLOP_TURN_PROBE' && state.postflop) {
        clearToast();
        const spot = state.postflop;
        state.currentHand = spot.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoElP = document.getElementById('flop-info-line');
        if (flopInfoElP) flopInfoElP.classList.add('hidden');
        renderCommunityCards([...spot.flopCards, spot.turnCard]);
        const clP = document.getElementById('cards-layer'); if (clP) clP.innerHTML = '';
        const blP = document.getElementById('bets-layer'); if (blP) blP.innerHTML = '';
        try { updateTable(spot.heroPos, spot.villainPos); } catch(_) {}
        // Villain (BB) probed — show bet chip
        try { const _pot = getScenarioPot$(state.scenario); renderVillainBet(document.getElementById('bets-layer'), spot.heroPos, spot.villainPos, Math.round(_pot * 0.33)); } catch(_) {}
        try { _renderTurnContext(spot, 'POSTFLOP_TURN_PROBE'); } catch(_) {}
        renderTurnProbeButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            try { showToast(`${POS_LABELS[spot.villainPos]} probes 33%`, 'neutral', 1200); } catch(_) {}
            renderTurnProbeButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP TURN PROBE DEFEND: BB hero decides whether to probe after flop check-through
    if (state.scenario === 'POSTFLOP_TURN_PROBE_DEFEND' && state.postflop) {
        clearToast();
        const spot = state.postflop;
        state.currentHand = spot.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoElPD = document.getElementById('flop-info-line');
        if (flopInfoElPD) flopInfoElPD.classList.add('hidden');
        renderCommunityCards([...spot.flopCards, spot.turnCard]);
        const clPD = document.getElementById('cards-layer'); if (clPD) clPD.innerHTML = '';
        const blPD = document.getElementById('bets-layer'); if (blPD) blPD.innerHTML = '';
        try { updateTable(spot.heroPos, spot.villainPos); } catch(_) {}
        // Villain (IP) checked turn — show check indicator
        try { renderVillainCheck(document.getElementById('bets-layer'), spot.heroPos, spot.villainPos); } catch(_) {}
        try { _renderTurnContext(spot, 'POSTFLOP_TURN_PROBE_DEFEND'); } catch(_) {}
        renderTurnProbeDefendButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            renderTurnProbeDefendButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP RIVER CBET: PFR deciding barrel or check on river
    if (state.scenario === 'POSTFLOP_RIVER_CBET' && state.postflop) {
        clearToast();
        const spot = state.postflop;
        state.currentHand = spot.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoElRC = document.getElementById('flop-info-line');
        if (flopInfoElRC) flopInfoElRC.classList.add('hidden');
        renderCommunityCards([...spot.flopCards, spot.turnCard, spot.riverCard]);
        const clRC = document.getElementById('cards-layer'); if (clRC) clRC.innerHTML = '';
        const blRC = document.getElementById('bets-layer'); if (blRC) blRC.innerHTML = '';
        try { updateTable(spot.heroPos, spot.villainPos); } catch(_) {}
        try { renderVillainCheck(document.getElementById('bets-layer'), spot.heroPos, spot.villainPos); } catch(_) {}
        try { _renderPostflopContext(spot, 'POSTFLOP_RIVER_CBET'); } catch(_) {}
        renderRiverCBetButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            renderRiverCBetButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP RIVER DEFEND: BB deciding fold/call/raise facing PFR's river barrel
    if (state.scenario === 'POSTFLOP_RIVER_DEFEND' && state.postflop) {
        clearToast();
        const spot = state.postflop;
        state.currentHand = spot.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoElRD = document.getElementById('flop-info-line');
        if (flopInfoElRD) flopInfoElRD.classList.add('hidden');
        renderCommunityCards([...spot.flopCards, spot.turnCard, spot.riverCard]);
        const clRD = document.getElementById('cards-layer'); if (clRD) clRD.innerHTML = '';
        const blRD = document.getElementById('bets-layer'); if (blRD) blRD.innerHTML = '';
        try { updateTable(spot.heroPos, spot.villainPos); } catch(_) {}
        try { const _pot = getScenarioPot$(state.scenario); renderVillainBet(document.getElementById('bets-layer'), spot.heroPos, spot.villainPos, Math.round(_pot * 0.5)); } catch(_) {}
        try { _renderPostflopContext(spot, 'POSTFLOP_RIVER_DEFEND'); } catch(_) {}
        renderRiverDefenderButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            try { showToast(`${POS_LABELS[spot.villainPos] || spot.villainPos} bets 50%`, 'neutral', 1200); } catch(_) {}
            renderRiverDefenderButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP RIVER DELAYED DEFEND: BB deciding fold/call/raise facing PFR's river barrel (delayed line)
    if (state.scenario === 'POSTFLOP_RIVER_DELAYED_DEFEND' && state.postflop) {
        clearToast();
        const spot = state.postflop;
        state.currentHand = spot.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoElRDD = document.getElementById('flop-info-line');
        if (flopInfoElRDD) flopInfoElRDD.classList.add('hidden');
        renderCommunityCards([...spot.flopCards, spot.turnCard, spot.riverCard]);
        const clRDD = document.getElementById('cards-layer'); if (clRDD) clRDD.innerHTML = '';
        const blRDD = document.getElementById('bets-layer'); if (blRDD) blRDD.innerHTML = '';
        try { updateTable(spot.heroPos, spot.villainPos); } catch(_) {}
        try { const _pot = getScenarioPot$(state.scenario); renderVillainBet(document.getElementById('bets-layer'), spot.heroPos, spot.villainPos, Math.round(_pot * 0.5)); } catch(_) {}
        try { _renderPostflopContext(spot, 'POSTFLOP_RIVER_DELAYED_DEFEND'); } catch(_) {}
        renderRiverDelayedDefenderButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            try { showToast(`${POS_LABELS[spot.villainPos] || spot.villainPos} bets 50%`, 'neutral', 1200); } catch(_) {}
            renderRiverDelayedDefenderButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP RIVER DELAYED: PFR deciding barrel or check on river (delayed-cbet line)
    if (state.scenario === 'POSTFLOP_RIVER_DELAYED_CBET' && state.postflop) {
        clearToast();
        const spot = state.postflop;
        state.currentHand = spot.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoElRDC = document.getElementById('flop-info-line');
        if (flopInfoElRDC) flopInfoElRDC.classList.add('hidden');
        renderCommunityCards([...spot.flopCards, spot.turnCard, spot.riverCard]);
        const clRDC = document.getElementById('cards-layer'); if (clRDC) clRDC.innerHTML = '';
        const blRDC = document.getElementById('bets-layer'); if (blRDC) blRDC.innerHTML = '';
        try { updateTable(spot.heroPos, spot.villainPos); } catch(_) {}
        // IP hero: villain (BB) checks to hero on river. OOP hero acts first — no villain check shown.
        if (spot.positionState === 'IP') {
            try { renderVillainCheck(document.getElementById('bets-layer'), spot.heroPos, spot.villainPos); } catch(_) {}
        }
        try { _renderPostflopContext(spot, 'POSTFLOP_RIVER_DELAYED_CBET'); } catch(_) {}
        renderRiverDelayedButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            renderRiverDelayedButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP RIVER PROBE: IP PFR facing BB's river probe after double check-through
    if (state.scenario === 'POSTFLOP_RIVER_PROBE' && state.postflop) {
        clearToast();
        const spot = state.postflop;
        state.currentHand = spot.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoElRP = document.getElementById('flop-info-line');
        if (flopInfoElRP) flopInfoElRP.classList.add('hidden');
        renderCommunityCards([...spot.flopCards, spot.turnCard, spot.riverCard]);
        const clRP = document.getElementById('cards-layer'); if (clRP) clRP.innerHTML = '';
        const blRP = document.getElementById('bets-layer'); if (blRP) blRP.innerHTML = '';
        try { updateTable(spot.heroPos, spot.villainPos); } catch(_) {}
        try { const _pot = getScenarioPot$(state.scenario); renderVillainBet(document.getElementById('bets-layer'), spot.heroPos, spot.villainPos, Math.round(_pot * 0.5)); } catch(_) {}
        try { _renderPostflopContext(spot, 'POSTFLOP_RIVER_PROBE'); } catch(_) {}
        renderRiverProbeButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            try { showToast(`${POS_LABELS[spot.villainPos] || spot.villainPos} probes 50%`, 'neutral', 1200); } catch(_) {}
            renderRiverProbeButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP RIVER PROBE BET: BB decides to probe river or check after double check-through
    if (state.scenario === 'POSTFLOP_RIVER_PROBE_BET' && state.postflop) {
        clearToast();
        const spot = state.postflop;
        state.currentHand = spot.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoElRPB = document.getElementById('flop-info-line');
        if (flopInfoElRPB) flopInfoElRPB.classList.add('hidden');
        renderCommunityCards([...spot.flopCards, spot.turnCard, spot.riverCard]);
        const clRPB = document.getElementById('cards-layer'); if (clRPB) clRPB.innerHTML = '';
        const blRPB = document.getElementById('bets-layer'); if (blRPB) blRPB.innerHTML = '';
        try { updateTable(spot.heroPos, spot.villainPos); } catch(_) {}
        try { renderVillainCheck(document.getElementById('bets-layer'), spot.heroPos, spot.villainPos); } catch(_) {}
        try { _renderPostflopContext(spot, 'POSTFLOP_RIVER_PROBE_BET'); } catch(_) {}
        renderRiverProbeBetButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            renderRiverProbeBetButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP RIVER TURN CHECK CBET: PFR decides to barrel river after flop c-bet/call + turn check-check
    if (state.scenario === 'POSTFLOP_RIVER_TURN_CHECK_CBET' && state.postflop) {
        clearToast();
        const spot = state.postflop;
        state.currentHand = spot.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoElRTCC = document.getElementById('flop-info-line');
        if (flopInfoElRTCC) flopInfoElRTCC.classList.add('hidden');
        renderCommunityCards([...spot.flopCards, spot.turnCard, spot.riverCard]);
        const clRTCC = document.getElementById('cards-layer'); if (clRTCC) clRTCC.innerHTML = '';
        const blRTCC = document.getElementById('bets-layer'); if (blRTCC) blRTCC.innerHTML = '';
        try { updateTable(spot.heroPos, spot.villainPos); } catch(_) {}
        if (spot.positionState === 'IP') {
            try { renderVillainCheck(document.getElementById('bets-layer'), spot.heroPos, spot.villainPos); } catch(_) {}
        }
        try { _renderPostflopContext(spot, 'POSTFLOP_RIVER_TURN_CHECK_CBET'); } catch(_) {}
        renderRiverTurnCheckCBetButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            renderRiverTurnCheckCBetButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP RIVER TURN CHECK DEFEND: BB faces PFR river barrel after flop c-bet/call + turn check-check
    if (state.scenario === 'POSTFLOP_RIVER_TURN_CHECK_DEFEND' && state.postflop) {
        clearToast();
        const spot = state.postflop;
        state.currentHand = spot.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoElRTCD = document.getElementById('flop-info-line');
        if (flopInfoElRTCD) flopInfoElRTCD.classList.add('hidden');
        renderCommunityCards([...spot.flopCards, spot.turnCard, spot.riverCard]);
        const clRTCD = document.getElementById('cards-layer'); if (clRTCD) clRTCD.innerHTML = '';
        const blRTCD = document.getElementById('bets-layer'); if (blRTCD) blRTCD.innerHTML = '';
        try { updateTable(spot.heroPos, spot.villainPos); } catch(_) {}
        try { const _pot = getScenarioPot$(state.scenario); renderVillainBet(document.getElementById('bets-layer'), spot.heroPos, spot.villainPos, Math.round(_pot * 0.5)); } catch(_) {}
        try { _renderPostflopContext(spot, 'POSTFLOP_RIVER_TURN_CHECK_DEFEND'); } catch(_) {}
        renderRiverTurnCheckDefendButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            try { showToast(`${POS_LABELS[spot.villainPos] || spot.villainPos} bets 50%`, 'neutral', 1200); } catch(_) {}
            renderRiverTurnCheckDefendButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP RIVER PROBE CALL BET: BB decides to fire 2nd barrel after turn probe was called
    if (state.scenario === 'POSTFLOP_RIVER_PROBE_CALL_BET' && state.postflop) {
        clearToast();
        const spot = state.postflop;
        state.currentHand = spot.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoElRPCB = document.getElementById('flop-info-line');
        if (flopInfoElRPCB) flopInfoElRPCB.classList.add('hidden');
        renderCommunityCards([...spot.flopCards, spot.turnCard, spot.riverCard]);
        const clRPCB = document.getElementById('cards-layer'); if (clRPCB) clRPCB.innerHTML = '';
        const blRPCB = document.getElementById('bets-layer'); if (blRPCB) blRPCB.innerHTML = '';
        try { updateTable(spot.heroPos, spot.villainPos); } catch(_) {}
        try { _renderPostflopContext(spot, 'POSTFLOP_RIVER_PROBE_CALL_BET'); } catch(_) {}
        renderRiverProbeCallBetButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            renderRiverProbeCallBetButtons(false);
        }, 300);
        return;
    }
    // POSTFLOP RIVER PROBE CALL DEFEND: IP PFR faces BB's 2nd barrel after probe-call line
    if (state.scenario === 'POSTFLOP_RIVER_PROBE_CALL_DEFEND' && state.postflop) {
        clearToast();
        const spot = state.postflop;
        state.currentHand = spot.heroHand || null;
        if (state.currentHand) renderHeroCardBacks();
        const flopInfoElRPCD = document.getElementById('flop-info-line');
        if (flopInfoElRPCD) flopInfoElRPCD.classList.add('hidden');
        renderCommunityCards([...spot.flopCards, spot.turnCard, spot.riverCard]);
        const clRPCD = document.getElementById('cards-layer'); if (clRPCD) clRPCD.innerHTML = '';
        const blRPCD = document.getElementById('bets-layer'); if (blRPCD) blRPCD.innerHTML = '';
        try { updateTable(spot.heroPos, spot.villainPos); } catch(_) {}
        try { const _pot = getScenarioPot$(state.scenario); renderVillainBet(document.getElementById('bets-layer'), spot.heroPos, spot.villainPos, Math.round(_pot * 0.5)); } catch(_) {}
        try { _renderPostflopContext(spot, 'POSTFLOP_RIVER_PROBE_CALL_DEFEND'); } catch(_) {}
        renderRiverProbeCallDefendButtons(true);
        setTimeout(() => {
            if (state.currentHand) {
                try { renderHand(state.currentHand); } catch(_) {}
                try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
            }
            try { showToast(`${POS_LABELS[spot.villainPos] || spot.villainPos} bets 50%`, 'neutral', 1200); } catch(_) {}
            renderRiverProbeCallDefendButtons(false);
        }, 300);
        return;
    }
    // Clear postflop UI elements if we're in a preflop round
    try { clearCommunityCards(); } catch(_) {}

    // Render unified spot header for preflop scenarios (after clearCommunityCards so it isn't wiped)
    try {
        if (state.scenario === 'RFI') {
            _renderSpotHeader('Open · ' + (POS_LABELS[state.currentPos] || state.currentPos), 'Folded to you', '#818cf8');
        } else if (state.scenario === 'FACING_RFI') {
            _renderSpotHeader('Defend · ' + (POS_LABELS[state.currentPos] || state.currentPos), `${POS_LABELS[state.oppPos]} raises to ${fmt$(getVillainOpenSize$())}`, '#34d399');
        } else if (state.scenario === 'VS_LIMP') {
            let limpCtx;
            if (state.limperBucket === '3P') { limpCtx = `3+ limp pot — ${POS_LABELS[state.currentPos]}`; }
            else if (state.limperBucket === '2L') { const l1=POS_LABELS[(state.limperPositions||[])[0]]||'?'; const l2=POS_LABELS[(state.limperPositions||[])[1]]||'?'; limpCtx=`${l1} & ${l2} limp`; }
            else { limpCtx = `${POS_LABELS[state.oppPos]} limps`; }
            _renderSpotHeader('vs Limpers · ' + (POS_LABELS[state.currentPos] || state.currentPos), limpCtx, '#f59e0b');
        } else if (state.scenario === 'SQUEEZE') {
            _renderSpotHeader('Squeeze · ' + (POS_LABELS[state.currentPos] || state.currentPos), `${POS_LABELS[state.squeezeOpener]} opens, ${POS_LABELS[state.squeezeCaller]} calls`, '#f97316');
        } else if (state.scenario === 'SQUEEZE_2C') {
            _renderSpotHeader('Squeeze · ' + (POS_LABELS[state.currentPos] || state.currentPos), `${POS_LABELS[state.squeezeOpener]} opens, ${POS_LABELS[state.squeezeCaller]} & ${POS_LABELS[state.squeezeCaller2]} call`, '#f97316');
        } else if (state.scenario === 'PUSH_FOLD') {
            _renderSpotHeader('Push / Fold · ' + (POS_LABELS[state.currentPos] || state.currentPos), `${state.stackBB}BB effective`, '#e11d48');
        } else if (state.scenario === 'RFI_VS_3BET' || state.scenario === 'RFI_VS_3') {
            _renderSpotHeader('vs 3-Bet · ' + (POS_LABELS[state.currentPos] || state.currentPos), `${POS_LABELS[state.oppPos]} 3-bets to ${fmt$(get3betSize$(state.oppPos, state.currentPos))}`, '#818cf8');
        } else {
            _renderSpotHeader(POS_LABELS[state.currentPos] || state.currentPos, `${POS_LABELS[state.oppPos]} 3-bets to ${fmt$(get3betSize$(state.oppPos, state.currentPos))}`, '#818cf8');
        }
    } catch(_) {}

    if (state._reviewHandOverride) {
        state.currentHand = state._reviewHandOverride;
        state._reviewHandOverride = null;
    } else {
        const missBoostData = {
            byHand: state.global.byHand || {},
            recentHandKeys: state.recentHandKeys || []
        };
        state.currentHand = EdgeWeight.sampleHand(state.scenario, state.currentPos,
            state.scenario === 'VS_LIMP' ? state.oppPos + '|' + state.limperBucket : state.oppPos,
            srDb, missBoostData);
        // Track for variety guard — use canonical key builder
        const curSRKey = buildSRKey(state.scenario, state.currentPos, state.oppPos, state.limperBucket, state.stackBB, state.currentHand);
        state.recentHandKeys.push(curSRKey);
        if (state.recentHandKeys.length > 10) state.recentHandKeys = state.recentHandKeys.slice(-10);
    }

    // Immediately show card backs and dimmed buttons so layout is stable
    renderHeroCardBacks();
    renderButtons(true); // hidden state
    clearToast();

    // Run the animated table sequence, then flip cards + reveal buttons
    // Safety: occasionally mobile Safari loses/clears layers during resize or a stale animation.
    // Recreate missing table layers before animating so we don't get stuck.
    try { ensureTableLayers(); } catch(e) {}

    runTableAnimation(state.currentPos, state.oppPos, state.scenario, () => {
        try {
            renderHand(state.currentHand);
        } catch (e) {
            console.warn('[Render] renderHand failed; forcing layer reset', e);
            try { ensureTableLayers(true); } catch(_) {}
            try { renderHand(state.currentHand); } catch(_) {}
        }
        // Flip after a tick so the DOM settles
        try { requestAnimationFrame(() => { try { flipHeroCards(); } catch(_) {} }); } catch(_) {}
        try { revealButtons(); } catch(_) {}
    });
}


// === Round guard to prevent double-advance / race conditions (especially on mobile + Challenge Mode) ===
window.__roundGuard = window.__roundGuard || { resolving: false, nextTimer: null };
function __clearNextTimer() {
    try {
        if (window.__roundGuard && window.__roundGuard.nextTimer) {
            clearTimeout(window.__roundGuard.nextTimer);
            window.__roundGuard.nextTimer = null;
        }
    } catch(_) {}
}
function __endResolve() { try { if (window.__roundGuard) window.__roundGuard.resolving = false; } catch(_) {} }
function __beginResolve() {
    window.__roundGuard = window.__roundGuard || { resolving: false, nextTimer: null };
    if (window.__roundGuard.resolving) return false;
    window.__roundGuard.resolving = true;
    __clearNextTimer();
    return true;
}

function handleInput(action) {
    if (!__beginResolve()) return;
    // Immediately disable buttons to prevent double-clicks
    const grid = document.querySelector('#action-buttons > div');
    if (grid) { grid.classList.remove('action-buttons-revealed'); grid.classList.add('action-buttons-hidden'); }

    // Use the canonical single source of truth for correct action derivation
    const correctAction = computeCorrectAction(state.currentHand, state.scenario, state.currentPos, state.oppPos, state.limperBucket);

    const correct = action === correctAction;
    state.sessionStats.total++; state.global.totalHands++;

    // Track per-scenario stats
    const sc = state.scenario;
    const hp = state.currentPos;
    const spotKey = buildSpotKey(sc, hp, state.oppPos, state.limperBucket, state.stackBB);


    // Daily Run tracking (UI wrapper only — does not affect SR or core stats)
    if (dailyRunState && dailyRunState.active) {
        dailyRunState.total++;
        if (correct) {
            dailyRunState.correct++;
            dailyRunState.runStreak++;
            try { updateDRRoundCounter(); } catch(_){}
            try { if(navigator.vibrate) navigator.vibrate(25); } catch(_){}
        } else {
            // run ends on first miss — keep active true until checkDailyRunComplete fires
            dailyRunState.ended = true;
            try { const ov=document.getElementById('miss-flash-overlay'); if(ov){ov.classList.remove('active');void ov.offsetWidth;ov.classList.add('active');} } catch(_){}
            try { if(navigator.vibrate) navigator.vibrate([40,30,40]); } catch(_){}
        }
        if (!dailyRunState.bySpot[spotKey]) dailyRunState.bySpot[spotKey] = { total: 0, correct: 0 };
        dailyRunState.bySpot[spotKey].total++;
        if (correct) dailyRunState.bySpot[spotKey].correct++;
        // Commit immediately on miss so navigation away during the 600 ms feedback delay
        // can't cause the result to be lost.
        if (dailyRunState.ended) try { _commitDailyRunToMeta(); } catch(_) {}
    }

    // Update SR for this hand within the spot
    const handSRKey = buildSRKey(sc, hp, state.oppPos, state.limperBucket, state.stackBB, state.currentHand);
    const srGrade = correct ? 'Good' : 'Again';
    SR.update(handSRKey, srGrade);
    // Track reviewed hands so they don't show again today
    if (reviewSession.active) reviewSession.todayDoneKeys.add(handSRKey);
    
    if (!state.global.byScenario[sc]) state.global.byScenario[sc] = { total: 0, correct: 0 };
    state.global.byScenario[sc].total++;

    if (!state.global.byPos[hp]) state.global.byPos[hp] = { total: 0, correct: 0 };
    state.global.byPos[hp].total++;
    const pg = normalizePos(hp);
    if (!state.global.byPosGroup[pg]) state.global.byPosGroup[pg] = { total: 0, correct: 0 };
    state.global.byPosGroup[pg].total++;
    if (!state.global.bySpot[spotKey]) state.global.bySpot[spotKey] = { total: 0, correct: 0 };
    state.global.bySpot[spotKey].total++;

    // Track per-hand stats within a spot (e.g. "RFI|BTN|AKs") — reuse canonical handSRKey
    if (!state.global.byHand[handSRKey]) state.global.byHand[handSRKey] = { total: 0, correct: 0 };
    state.global.byHand[handSRKey].total++;

    // Track miss metadata for mistake-prioritization (does not touch SR)
    if (!correct) {
        state.global.byHand[handSRKey].lastMissedAt = Date.now();
        state.global.byHand[handSRKey].recentMissCount = (state.global.byHand[handSRKey].recentMissCount || 0) + 1;
    }

    // Detect squeeze bluffs
    let _isBluff = false;
    if (correctAction === 'SQUEEZE' && (sc === 'SQUEEZE' || sc === 'SQUEEZE_2C')) {
        const sqData = sc === 'SQUEEZE' ? squeezeRanges[state.oppPos] : squeezeVsRfiTwoCallers[state.oppPos];
        _isBluff = isSqueezeBluff(state.currentHand, sqData);
    }

    // Session log entry
    const logEntry = {
        hand: state.currentHand, pos: hp, oppPos: state.oppPos,
        scenario: sc, action: action, correctAction: correctAction,
        correct: correct, spotKey: spotKey, isBluff: _isBluff,
        limperBucket: state.limperBucket, limperPositions: state.limperPositions ? [...state.limperPositions] : []
    };
    if (!logEntry.spotKey) logEntry.spotKey = spotKey;
    state.sessionLog.unshift(logEntry); // newest first
    
    if (correct) {
        state.sessionStats.correct++; state.global.totalCorrect++; state.sessionStats.streak++;
        state.global.byScenario[sc].correct++;
        state.global.byPos[hp].correct++;
        state.global.byPosGroup[normalizePos(hp)].correct++;
        state.global.bySpot[spotKey].correct++;
        state.global.byHand[handSRKey].correct++;
        if (state.sessionStats.streak > (state.global.bestStreak || 0)) state.global.bestStreak = state.sessionStats.streak;
        // Tag bluff squeezes in correct toast
        if (correctAction === 'SQUEEZE' && (sc === 'SQUEEZE' || sc === 'SQUEEZE_2C')) {
            const sqData2 = sc === 'SQUEEZE' ? squeezeRanges[state.oppPos] : squeezeVsRfiTwoCallers[state.oppPos];
            if (isSqueezeBluff(state.currentHand, sqData2)) {
                showToast("Correct · Squeeze (Bluff)", "correct", 700);
            } else {
                showToast("Correct", "correct", 500);
            }
        } else {
            showToast("Correct", "correct", 500);
        }

        // Visual-only: slide hero bet chip onto table for correct betting actions
        const __bet$ = computeHeroBetDollarsForAction(action);
        if (__bet$ != null) animateHeroBetDollars(__bet$);

        updateUI(); saveProgress(); window.__roundGuard.nextTimer = setTimeout(() => { __endResolve(); if (!checkDrillComplete() && !checkDailyRunComplete()) safeGenerateNextRound(); }, 600);
    } else {
        state.sessionStats.streak = 0;
        let correctLabel = ACTION_LABELS[correctAction] || correctAction;
        // SB/BB vs limp uses different terminology
        if (state.scenario === 'VS_LIMP' && (state.currentPos === 'SB' || state.currentPos === 'BB')) {
            if (correctAction === 'ISO') correctLabel = 'Raise';
            else if (correctAction === 'OVERLIMP') correctLabel = state.currentPos === 'BB' ? 'Check' : 'Complete';
        }
        // Tag squeeze bluffs
        if (correctAction === 'SQUEEZE' && (state.scenario === 'SQUEEZE' || state.scenario === 'SQUEEZE_2C')) {
            const sqData = state.scenario === 'SQUEEZE' ? squeezeRanges[state.oppPos] : squeezeVsRfiTwoCallers[state.oppPos];
            if (isSqueezeBluff(state.currentHand, sqData)) correctLabel = 'Squeeze (Bluff)';
        }
        showToast(`Incorrect · ${correctLabel}`, "incorrect", 1500);
        updateUI(); saveProgress();
        setTimeout(() => showChart(state.currentPos, state.currentHand, state.scenario, state.oppPos), 0);
    
        // FAIL-SAFE: stored in nextTimer so __clearNextTimer() cancels it when the user
        // answers the next hand — prevents double-advance if user closes chart quickly.
        window.__roundGuard.nextTimer = setTimeout(() => {
            const trainerHidden = document.getElementById('trainer-screen')?.classList?.contains('hidden');
            const chartHidden = document.getElementById('chart-modal')?.classList?.contains('hidden');
            if (trainerHidden) return;
            if (chartHidden && !checkDrillComplete() && !checkDailyRunComplete()) { __endResolve(); safeGenerateNextRound(); }
        }, 3500);
}
}


// --- TABLE UI FAIL-SAFES ---
// Mobile Safari (and some Android WebViews) can occasionally drop/clear DOM nodes inside the felt during
// resize/orientation changes or when a stale animation aborts mid-flight. If that happens, animations can throw
// before calling the "onDone" callback, leaving the app stuck with hidden buttons and an empty table.
function ensureTableLayers(forceReset = false) {
    const felt = document.getElementById('poker-felt-container');
    if (!felt) return false;

    const dealer = document.getElementById('dealer-button');
    const ensureLayer = (id) => {
        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement('div');
            el.id = id;
            // Keep layers above felt, below seats
            el.style.position = 'absolute';
            el.style.inset = '0';
            el.style.pointerEvents = 'none';
            // Insert right after dealer button if possible, otherwise append
            if (dealer && dealer.parentNode === felt && dealer.nextSibling) felt.insertBefore(el, dealer.nextSibling);
            else if (dealer && dealer.parentNode === felt) felt.insertBefore(el, dealer.nextSibling);
            else felt.appendChild(el);
        }
        if (forceReset) el.innerHTML = '';
        return el;
    };

    const bets = ensureLayer('bets-layer');
    const cards = ensureLayer('cards-layer');
    return !!(bets && cards);
}

function safeGenerateNextRound() {
    window.__roundGuard = window.__roundGuard || { resolving:false, nextTimer:null, generating:false };
    if (window.__roundGuard.generating) return;
    window.__roundGuard.generating = true;
    try {
        generateNextRound();
        window.__roundGuard.generating = false;
    } catch (e) {
        console.error('[Trainer] generateNextRound failed; attempting recovery', e);
        try { window.__roundGuard.generating = false; } catch(_) {}
        try { ensureTableLayers(true); } catch(_) {}
        // Small retry (next tick) in case we were mid-resize / DOM update.
        setTimeout(() => {
            try { generateNextRound(); } catch (e2) { console.error('[Trainer] recovery retry failed', e2); } finally { try { window.__roundGuard.generating = false; } catch(_) {} }
        }, 50);
    }
}


// Helper: get seat element coords as percentage strings

// ============================================================
// POSTFLOP TRAINING HELPERS
// ============================================================
let postflopStats = { total:0, correct:0, streak:0, byArchetype:{}, byFamily:{}, byPosition:{} };
function loadPostflopStats(){ try { const s=localStorage.getItem(profileKey('gto_postflop_stats_v1')); if(s) postflopStats=JSON.parse(s); } catch(e){} if(!postflopStats.byArchetype) postflopStats.byArchetype={}; if(!postflopStats.byFamily) postflopStats.byFamily={}; if(!postflopStats.byPosition) postflopStats.byPosition={}; }
function savePostflopStats(){ try { localStorage.setItem(profileKey('gto_postflop_stats_v1'),JSON.stringify(postflopStats)); } catch(e){} }

// Fix 7: use _darkBgSuitColor so clubs/spades appear light on the dark trainer background
function _flopCardsHtml(cards){ return cards.map(c => { const color=_darkBgSuitColor(c.suit); return `<span style="color:${color};font-weight:900;">${c.rank}${SUIT_SYMBOLS[c.suit]}</span>`; }).join(' '); }

function renderPostflopButtons(hidden){
    const container=document.getElementById('action-buttons');
    setSizingHint('');
    const sc=hidden?'action-buttons-hidden':'action-buttons-revealed';
    const bs=`style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML=`<div class="grid grid-cols-2 gap-3 ${sc}"><button onclick="handlePostflopInput('CHECK')" ${bs} class="pc-btn pc-btn-passive">CHECK</button><button onclick="handlePostflopInput('CBET')" ${bs} class="pc-btn pc-btn-aggressive">C-BET</button></div>`;
}

function renderDefenderButtons(hidden){
    const container=document.getElementById('action-buttons');
    setSizingHint('');
    const sc=hidden?'action-buttons-hidden':'action-buttons-revealed';
    const bs=`style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML=`<div class="grid grid-cols-3 gap-2 ${sc}"><button onclick="handleDefenderInput('fold')" ${bs} class="pc-btn pc-btn-fold">FOLD</button><button onclick="handleDefenderInput('call')" ${bs} class="pc-btn pc-btn-passive">CALL</button><button onclick="handleDefenderInput('raise')" ${bs} class="pc-btn pc-btn-aggressive">RAISE</button></div>`;
}

function handleDefenderInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreDefenderAction, scenario: 'POSTFLOP_DEFEND',
        feedbackFn: showDefenderFeedback,
        srDiscriminator: s => s.boardArchetype,
        correctActionFn: (a, r) => r.correct ? a : r.preferredLabel.toLowerCase(),
        includeTurn: false
    });
}

function showDefenderFeedback(spot, result) {
    _showPostflopFCRFeedback(spot, result, {
        headerText: `BB vs ${POS_LABELS[spot.villainPos]} c-bet · Defend`
    });
}

function render3BPDefenderButtons(hidden){
    const container=document.getElementById('action-buttons');
    setSizingHint('');
    const sc=hidden?'action-buttons-hidden':'action-buttons-revealed';
    const bs=`style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML=`<div class="grid grid-cols-3 gap-2 ${sc}"><button onclick="handle3BPDefenderInput('fold')" ${bs} class="pc-btn pc-btn-fold">FOLD</button><button onclick="handle3BPDefenderInput('call')" ${bs} class="pc-btn pc-btn-passive">CALL</button><button onclick="handle3BPDefenderInput('raise')" ${bs} class="pc-btn pc-btn-aggressive">RAISE</button></div>`;
}

function handle3BPDefenderInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreDefenderAction, scenario: 'POSTFLOP_3BP_DEFEND',
        feedbackFn: show3BPDefenderFeedback,
        srDiscriminator: s => s.boardArchetype,
        correctActionFn: (a, r) => r.correct ? a : r.preferredLabel.toLowerCase(),
        includeTurn: false
    });
}

function show3BPDefenderFeedback(spot, result) {
    const posLabel = spot.positionState === 'IP' ? ' · IP' : ' · OOP';
    _showPostflopFCRFeedback(spot, result, {
        headerText: `${POS_LABELS[spot.heroPos]} vs ${POS_LABELS[spot.villainPos]} c-bet · 3BP Defend${posLabel}`
    });
}

function _renderCardRow(container, cards){
    cards.forEach((c,i)=>{ const color=flopSuitColor(c.suit); const el=document.createElement('div'); el.className='card-display'; el.style.cssText=`width:var(--cc-w,42px);height:var(--cc-h,58px);display:flex;flex-direction:column;align-items:center;justify-content:center;animation:ccDeal 0.25s ease-out both;animation-delay:${i*0.12}s;`; el.innerHTML=`<div style="font-size:var(--cc-rank-size,16px);font-weight:900;color:${color};line-height:1;">${c.rank}</div><div style="font-size:var(--cc-suit-size,14px);color:${color};line-height:1;">${SUIT_SYMBOLS[c.suit]}</div>`; container.appendChild(el); });
}
function renderCommunityCards(cards){
    const isMob = typeof SEAT_COORDS !== 'undefined' && typeof SEAT_COORDS_MOBILE !== 'undefined' && SEAT_COORDS === SEAT_COORDS_MOBILE;
    if (isMob) {
        // Clear any stale felt cards
        const feltCc = document.getElementById('community-cards'); if (feltCc) feltCc.innerHTML = '';
        // Render into the dedicated strip below the felt
        const strip = document.getElementById('community-cards-strip'); if (!strip) return;
        strip.innerHTML = ''; strip.classList.remove('hidden');
        _renderCardRow(strip, cards);
        // Fix 4: show board/hero card separator when community cards are present
        const divider = document.getElementById('postflop-card-divider'); if (divider) divider.classList.remove('hidden');
        return;
    }
    // Desktop: render inside felt
    let cc=document.getElementById('community-cards');
    if(!cc){ const felt=document.getElementById('poker-felt-container'); if(!felt) return; cc=document.createElement('div'); cc.id='community-cards'; cc.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;gap:clamp(3px,0.8vw,8px);z-index:25;pointer-events:none;'; felt.appendChild(cc); }
    cc.innerHTML='';
    _renderCardRow(cc, cards);
}
function clearCommunityCards(){
    const cc=document.getElementById('community-cards'); if(cc) cc.innerHTML='';
    const strip=document.getElementById('community-cards-strip'); if(strip){ strip.innerHTML=''; strip.classList.add('hidden'); }
    // Fix 4: hide board/hero card separator when community cards are cleared
    const divider=document.getElementById('postflop-card-divider'); if(divider) divider.classList.add('hidden');
    const fi=document.getElementById('flop-info-line'); if(fi) fi.classList.add('hidden');
    const tc=document.getElementById('turn-context-line'); if(tc){ tc.classList.add('hidden'); tc.innerHTML=''; }
}

// --- Turn context UI layer ---
// _renderSpotHeader: unified trainer header for ALL scenarios.
// Eyebrow = small accent badge (scenario label).
// Context = dim action line below.
// Writes into #turn-context-line — the single source of truth for all trainer headers.
function _renderSpotHeader(eyebrow, contextLine, accentColor) {
    const el = document.getElementById('turn-context-line');
    if (!el) return;
    try {
        const color = accentColor || '#818cf8';

        const dotIdx = eyebrow.indexOf(' · ');
        const badge = dotIdx !== -1 ? eyebrow.slice(0, dotIdx).toUpperCase() : eyebrow.toUpperCase();

        const badgeHtml = `<span style="display:inline-block;padding:1px 8px;border-radius:9999px;background:${color}1a;border:1px solid ${color}44;color:${color};font-size:11px;font-weight:900;letter-spacing:.08em;white-space:nowrap;">${badge}</span>`;
        const infoText = contextLine || (dotIdx !== -1 ? eyebrow.slice(dotIdx + 3) : '');
        const infoHtml = infoText
            ? `<span style="color:#64748b;font-size:11px;font-weight:600;white-space:nowrap;">${infoText}</span>`
            : '';

        el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;">${badgeHtml}${infoHtml}</div>`;
        el.classList.remove('hidden');
    } catch(_) {
        el.classList.add('hidden');
    }
}

const _POSTFLOP_SPOT_LABELS = {
    POSTFLOP_CBET:               'Flop C-Bet',
    POSTFLOP_3BP_CBET:           '3BP Flop C-Bet',
    POSTFLOP_DEFEND:             'Flop Defense',
    POSTFLOP_3BP_DEFEND:         '3BP Flop Defense',
    POSTFLOP_TURN_CBET:          'Turn Barrel',
    POSTFLOP_TURN_DEFEND:        'Turn Defense',
    POSTFLOP_TURN_DELAYED_CBET:  'Delayed Turn Bet',
    POSTFLOP_TURN_PROBE:         'Turn Probe Defense',
    POSTFLOP_TURN_PROBE_DEFEND:  'Turn Probe Bet',
    POSTFLOP_RIVER_CBET:         'River Barrel',
    POSTFLOP_RIVER_DEFEND:       'River Defense',
    POSTFLOP_TURN_DELAYED_DEFEND: 'Turn Delayed Defense',
    POSTFLOP_RIVER_DELAYED_CBET:  'River Barrel (Delayed)',
    POSTFLOP_RIVER_DELAYED_DEFEND:'River Defense (Delayed)',
    POSTFLOP_RIVER_PROBE:         'River Probe Defense',
    POSTFLOP_RIVER_PROBE_BET:     'River Probe Bet',
    POSTFLOP_RIVER_TURN_CHECK_CBET:   'River Barrel (TCC)',
    POSTFLOP_RIVER_TURN_CHECK_DEFEND: 'River Defense (TCC)',
    POSTFLOP_RIVER_PROBE_CALL_BET:    'River 2nd Barrel (Probe)',
    POSTFLOP_RIVER_PROBE_CALL_DEFEND: 'River Defense (Probe 2B)'
};
// Backward-compat alias — callers still using the old name continue to work.
const _TURN_SPOT_LABELS = _POSTFLOP_SPOT_LABELS;

function _renderPostflopContext(spot, scenario) {
    try {
        // Street badge color
        const boardLen = (spot.riverCard) ? 5 : (spot.turnCard) ? 4 : (spot.flopCards ? spot.flopCards.length : 0);
        const street      = boardLen >= 5 ? 'RIVER' : boardLen >= 4 ? 'TURN' : 'FLOP';
        const streetColor = street === 'RIVER' ? '#f59e0b' : street === 'TURN' ? '#818cf8' : '#34d399';

        // Eyebrow: [STREET] · Spot Label
        const spotLabel = _POSTFLOP_SPOT_LABELS[scenario] || '';
        const eyebrow   = spotLabel ? `${street} · ${spotLabel}` : street;

        _renderSpotHeader(eyebrow, spotLabel, streetColor);
    } catch(_) {
        const el = document.getElementById('turn-context-line');
        if (el) el.classList.add('hidden');
    }
}
// Backward-compat alias — existing call sites use the old name.
const _renderTurnContext = _renderPostflopContext;

// ============================================================
// SHARED POSTFLOP PIPELINE HELPERS
// ============================================================

// Returns (or creates) the single shared postflop feedback modal element.
function _postflopModalSetup() {
    let modal = document.getElementById('postflop-feedback-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'postflop-feedback-modal';
        modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6';
        modal.onclick = e => { if (e.target === modal) closePostflopFeedback(); };
        document.body.appendChild(modal);
    }
    return modal;
}

// Renders the board line for a postflop feedback modal.
// Flop-only: "Kh Td 2c (Paired)" · Turn: adds turn card + family label.
function _postflopBoardHtml(spot) {
    const flopHtml  = _flopCardsHtmlDark(spot.flopCards);
    const archLabel = ARCHETYPE_LABELS[spot.flopArchetype || spot.boardArchetype] || (spot.flopArchetype || spot.boardArchetype) || '';
    if (!spot.turnCard) {
        return `${flopHtml} <span class="text-slate-500 text-xs">(${archLabel})</span>`;
    }
    const turnHtml = `<span style="color:${_darkBgSuitColor(spot.turnCard.suit)};font-weight:900;">${spot.turnCard.rank}${SUIT_SYMBOLS[spot.turnCard.suit]}</span>`;
    if (!spot.riverCard) {
        const tfLabel = (typeof TURN_FAMILY_LABELS !== 'undefined' && TURN_FAMILY_LABELS[spot.turnFamily]) || spot.turnFamily || '';
        return `${flopHtml} <span class="text-slate-500 mx-1">·</span> ${turnHtml} <span class="text-slate-500 text-[10px] font-bold uppercase tracking-wider ml-1">(${archLabel} · ${tfLabel})</span>`;
    }
    const riverHtml = `<span style="color:${_darkBgSuitColor(spot.riverCard.suit)};font-weight:900;">${spot.riverCard.rank}${SUIT_SYMBOLS[spot.riverCard.suit]}</span>`;
    const rfLabel   = (typeof RIVER_FAMILY_LABELS !== 'undefined' && RIVER_FAMILY_LABELS[spot.riverFamily]) || spot.riverFamily || '';
    return `${flopHtml} <span class="text-slate-500 mx-1">·</span> ${turnHtml} <span class="text-slate-500 mx-1">·</span> ${riverHtml} <span class="text-slate-500 text-[10px] font-bold uppercase tracking-wider ml-1">(${archLabel} · ${rfLabel})</span>`;
}

// Renders the hero hand section for a postflop feedback modal (empty string if no hero hand).
function _postflopHeroSection(spot) {
    const heroHtml = _heroCardsHtml(spot.heroHand);
    if (!heroHtml) return '';
    const hcLabel = spot.heroHandClass
        ? ((typeof TURN_HAND_CLASS_LABELS !== 'undefined' && TURN_HAND_CLASS_LABELS[spot.heroHandClass])
            || (typeof HAND_CLASS_LABELS !== 'undefined' && HAND_CLASS_LABELS[spot.heroHandClass])
            || spot.heroHandClass)
        : '';
    return `<div class="flex items-center gap-3 mb-3 bg-slate-950/50 rounded-xl px-3 py-2.5 border border-slate-800/50"><div class="flex items-center gap-1.5">${heroHtml}</div>${hcLabel ? `<span class="text-xs font-bold text-slate-300">${hcLabel}</span>` : ''}</div>`;
}

// Shared feedback renderer for bet/check 2-bar modal (flop c-bet, turn barrel, delayed, probe-defend).
// opts: { betActionKey, betLabel, betColor, betLabelColor, headerText }
function _showPostflopBetCheckFeedback(spot, result, opts) {
    const modal      = _postflopModalSetup();
    const boardHtml  = _postflopBoardHtml(spot);
    const heroSection= _postflopHeroSection(spot);
    const actions    = (spot.strategy && spot.strategy.actions) || {};
    const betFreq    = Math.round((actions[opts.betActionKey] || 0) * 100);
    const checkFreq  = Math.round((actions.check || 0) * 100);
    const borderCol  = result.correct ? 'border-emerald-600' : 'border-slate-700';
    modal.innerHTML = `<div class="bg-slate-900 border ${borderCol} rounded-2xl p-5 max-w-sm w-full shadow-2xl" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-3"><div class="text-xs font-black uppercase tracking-widest text-slate-400">${opts.headerText}</div><button onclick="closePostflopFeedback()" class="text-slate-500 hover:text-white text-lg font-bold">✕</button></div>
        <div class="text-sm font-bold text-slate-200 mb-2">${boardHtml}</div>
        ${heroSection}
        <div class="flex gap-2 items-center mb-2"><div class="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden"><div class="h-full bg-${opts.betColor} rounded-full" style="width:0%;transition:width 0.4s ease-out" data-w="${betFreq}"></div></div><div class="text-xs font-black text-${opts.betLabelColor} w-20 text-right">${opts.betLabel} ${betFreq}%</div></div>
        <div class="flex gap-2 items-center mb-4"><div class="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden"><div class="h-full bg-slate-500 rounded-full" style="width:0%;transition:width 0.4s ease-out" data-w="${checkFreq}"></div></div><div class="text-xs font-black text-slate-400 w-20 text-right">Check ${checkFreq}%</div></div>
        <div class="text-xs text-slate-400 leading-relaxed">${result.reasoning || result.feedback || ''}</div></div>`;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => { modal.querySelectorAll('[data-w]').forEach(el => { el.style.width = el.dataset.w + '%'; }); });
}

// Shared feedback renderer for fold/call/raise 3-bar modal (flop defend, turn defend, turn probe).
// opts: { headerText }
function _showPostflopFCRFeedback(spot, result, opts) {
    const modal      = _postflopModalSetup();
    const boardHtml  = _postflopBoardHtml(spot);
    const heroSection= _postflopHeroSection(spot);
    const actions    = (spot.strategy && spot.strategy.actions) || {};
    const foldFreq   = Math.round((actions.fold  || 0) * 100);
    const callFreq   = Math.round((actions.call  || 0) * 100);
    const raiseFreq  = Math.round((actions.raise || 0) * 100);
    const borderCol  = result.correct ? 'border-emerald-600' : 'border-slate-700';
    modal.innerHTML = `<div class="bg-slate-900 border ${borderCol} rounded-2xl p-5 max-w-sm w-full shadow-2xl" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-3"><div class="text-xs font-black uppercase tracking-widest text-slate-400">${opts.headerText}</div><button onclick="closePostflopFeedback()" class="text-slate-500 hover:text-white text-lg font-bold">✕</button></div>
        <div class="text-sm font-bold text-slate-200 mb-2">${boardHtml}</div>
        ${heroSection}
        <div class="flex gap-2 items-center mb-2"><div class="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden"><div class="h-full bg-slate-600 rounded-full" style="width:0%;transition:width 0.4s ease-out" data-w="${foldFreq}"></div></div><div class="text-xs font-black text-slate-400 w-14 text-right">Fold ${foldFreq}%</div></div>
        <div class="flex gap-2 items-center mb-2"><div class="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden"><div class="h-full bg-emerald-500 rounded-full" style="width:0%;transition:width 0.4s ease-out" data-w="${callFreq}"></div></div><div class="text-xs font-black text-emerald-400 w-14 text-right">Call ${callFreq}%</div></div>
        <div class="flex gap-2 items-center mb-3"><div class="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden"><div class="h-full bg-red-500 rounded-full" style="width:0%;transition:width 0.4s ease-out" data-w="${raiseFreq}"></div></div><div class="text-xs font-black text-red-400 w-14 text-right">Raise ${raiseFreq}%</div></div>
        <div class="text-xs text-slate-400 leading-relaxed">${result.reasoning || result.feedback || ''}</div></div>`;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => { modal.querySelectorAll('[data-w]').forEach(el => { el.style.width = el.dataset.w + '%'; }); });
}

// Shared handler core for all postflop input handlers.
// params: { action, scoreFn, scenario, feedbackFn, srDiscriminator, engineActionFn?, correctActionFn, includeTurn, includeRiver }
function _resolvePostflopAction(params) {
    const { action, scoreFn, scenario, feedbackFn, srDiscriminator, engineActionFn, correctActionFn, includeTurn, includeRiver } = params;
    if (!__beginResolve()) return;
    const grid = document.querySelector('#action-buttons > div');
    if (grid) { grid.classList.remove('action-buttons-revealed'); grid.classList.add('action-buttons-hidden'); }
    const spot = state.postflop;
    if (!spot || !spot.strategy) { __endResolve(); return; }
    const ea     = engineActionFn ? engineActionFn(action) : action;
    const result = scoreFn(ea, spot.strategy, spot);

    postflopStats.total++; state.sessionStats.total++; state.global.totalHands++;

    const srKey = buildPostflopSRKey(spot.spotKey, srDiscriminator(spot));
    SR.update(srKey, result.correct ? 'Good' : 'Again');
    if (reviewSession.active) reviewSession.todayDoneKeys.add(srKey);

    if (!postflopStats.byArchetype[spot.boardArchetype]) postflopStats.byArchetype[spot.boardArchetype] = { total: 0, correct: 0 };
    postflopStats.byArchetype[spot.boardArchetype].total++;
    if (!postflopStats.byFamily[spot.preflopFamily]) postflopStats.byFamily[spot.preflopFamily] = { total: 0, correct: 0 };
    postflopStats.byFamily[spot.preflopFamily].total++;
    if (!postflopStats.byPosition[spot.positionState]) postflopStats.byPosition[spot.positionState] = { total: 0, correct: 0 };
    postflopStats.byPosition[spot.positionState].total++;

    const sc = scenario;
    if (!state.global.byScenario[sc]) state.global.byScenario[sc] = { total: 0, correct: 0 };
    state.global.byScenario[sc].total++;
    if (!state.global.bySpot[spot.spotKey]) state.global.bySpot[spot.spotKey] = { total: 0, correct: 0 };
    state.global.bySpot[spot.spotKey].total++;

    const _pfHero = spot.heroPos;
    if (!state.global.byPos[_pfHero]) state.global.byPos[_pfHero] = { total: 0, correct: 0 };
    state.global.byPos[_pfHero].total++;
    const _pfPg = normalizePos(_pfHero);
    if (!state.global.byPosGroup[_pfPg]) state.global.byPosGroup[_pfPg] = { total: 0, correct: 0 };
    state.global.byPosGroup[_pfPg].total++;

    if (dailyRunState && dailyRunState.active) {
        dailyRunState.total++;
        if (result.correct) {
            dailyRunState.correct++; dailyRunState.runStreak++;
            try { updateDRRoundCounter(); } catch(_) {}
            try { if (navigator.vibrate) navigator.vibrate(25); } catch(_) {}
        } else {
            dailyRunState.ended = true;
            try { const ov = document.getElementById('miss-flash-overlay'); if (ov) { ov.classList.remove('active'); void ov.offsetWidth; ov.classList.add('active'); } } catch(_) {}
            try { if (navigator.vibrate) navigator.vibrate([40, 30, 40]); } catch(_) {}
        }
        if (!dailyRunState.bySpot[spot.spotKey]) dailyRunState.bySpot[spot.spotKey] = { total: 0, correct: 0 };
        dailyRunState.bySpot[spot.spotKey].total++;
        if (result.correct) dailyRunState.bySpot[spot.spotKey].correct++;
        // Commit immediately on miss so navigation away during the 600 ms feedback delay
        // can't cause the result to be lost.
        if (dailyRunState.ended) try { _commitDailyRunToMeta(); } catch(_) {}
    }

    const logEntry = {
        scenario: sc, pos: spot.heroPos, oppPos: spot.villainPos,
        hand: flopStr(spot.flopCards), action,
        correctAction: correctActionFn(action, result),
        correct: result.correct, spotKey: spot.spotKey,
        archetype: spot.boardArchetype, positionState: spot.positionState,
        feedback: result.feedback, flopCards: spot.flopCards,
        ...(includeTurn ? { turnCard: spot.turnCard, turnFamily: spot.turnFamily } : {}),
        ...(includeRiver ? { riverCard: spot.riverCard, riverFamily: spot.riverFamily } : {}),
        strategy: spot.strategy,
        grade: result.grade, freqPct: result.freqPct, reasoning: result.reasoning,
        heroHand: spot.heroHand || null, heroHandClass: spot.heroHandClass || null
    };
    state.sessionLog.unshift(logEntry);

    if (result.correct) {
        postflopStats.correct++; postflopStats.streak = (postflopStats.streak || 0) + 1;
        state.sessionStats.correct++; state.sessionStats.streak++; state.global.totalCorrect++;
        if (state.sessionStats.streak > (state.global.bestStreak || 0)) state.global.bestStreak = state.sessionStats.streak;
        postflopStats.byArchetype[spot.boardArchetype].correct++;
        postflopStats.byFamily[spot.preflopFamily].correct++;
        postflopStats.byPosition[spot.positionState].correct++;
        state.global.byScenario[sc].correct++;
        state.global.bySpot[spot.spotKey].correct++;
        state.global.byPos[_pfHero].correct++;
        state.global.byPosGroup[_pfPg].correct++;
        showToast(result.grade === 'marginal' ? 'Correct · Close spot' : 'Correct', 'correct', result.grade === 'marginal' ? 700 : 500);
        updateUI(); saveProgress(); savePostflopStats();
        window.__roundGuard.nextTimer = setTimeout(() => { __endResolve(); if (!checkDrillComplete() && !checkDailyRunComplete()) safeGenerateNextRound(); }, 600);
    } else {
        postflopStats.streak = 0; state.sessionStats.streak = 0;
        const fb = result.grade === 'marginal_wrong'
            ? `Close · ${result.preferredLabel} preferred (${result.freqPct}%)`
            : `Incorrect · ${result.preferredLabel} (${result.freqPct}%)`;
        showToast(fb, 'incorrect', 2000);
        updateUI(); saveProgress(); savePostflopStats();
        setTimeout(() => feedbackFn(spot, result), 200);
    }
}

function handlePostflopInput(action) {
    const scenario = (state.scenario === 'POSTFLOP_3BP_CBET') ? 'POSTFLOP_3BP_CBET' : 'POSTFLOP_CBET';
    _resolvePostflopAction({
        action, scoreFn: scorePostflopAction, scenario,
        feedbackFn: showPostflopFeedback,
        srDiscriminator: s => s.boardArchetype,
        correctActionFn: (a, r) => r.correct ? a : (a === 'CBET' ? 'CHECK' : 'CBET'),
        includeTurn: false
    });
}

// Dark-background-safe suit color (for modals with bg-slate-900)
// Fix 7: clubs/spades use white for maximum contrast on dark chip/modal backgrounds
function _darkBgSuitColor(suit){ return (suit==='h'||suit==='d')?'#dc2626':'#ffffff'; }
// Render hero hole cards as styled HTML for dark-bg modal
function _heroCardsHtml(heroHand){
    if(!heroHand||!heroHand.cards||heroHand.cards.length<2) return '';
    return heroHand.cards.map(c => {
        const color=_darkBgSuitColor(c.suit);
        return `<span style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:50px;background:#1e293b;border:1.5px solid #334155;border-radius:6px;font-weight:900;font-size:14px;color:${color};line-height:1;flex-direction:column;gap:1px;"><span>${c.rank}</span><span style="font-size:12px;">${SUIT_SYMBOLS[c.suit]}</span></span>`;
    }).join(' ');
}
// Render flop cards for dark-bg modal (override suit colors)
function _flopCardsHtmlDark(cards){
    if(!cards||!cards.length) return '<span class="text-slate-500">—</span>';
    return cards.map(c => { const color=_darkBgSuitColor(c.suit); return `<span style="color:${color};font-weight:900;">${c.rank}${SUIT_SYMBOLS[c.suit]}</span>`; }).join(' ');
}
function showPostflopFeedback(spot, result) {
    const potLabel = spot.potType === '3BP' ? ' · 3BP' : '';
    _showPostflopBetCheckFeedback(spot, result, {
        betActionKey: 'bet33', betLabel: 'C-Bet', betColor: 'orange-500', betLabelColor: 'orange-400',
        headerText: `${POS_LABELS[spot.heroPos]} vs ${POS_LABELS[spot.villainPos]}${potLabel} · ${spot.positionState}`
    });
}
function closePostflopFeedback(){
    const m = document.getElementById('postflop-feedback-modal');
    const logReview = m && m.dataset.logReview === '1';
    if (m) { delete m.dataset.logReview; m.classList.add('hidden'); }
    if (!logReview && !checkDrillComplete() && !checkDailyRunComplete()) { __endResolve(); safeGenerateNextRound(); }
}
// ============================================================
// TURN TRAINING — BUTTONS, HANDLERS, FEEDBACK
// ============================================================

// Inline turn card HTML for the board display line (plain colored text, no box)
function _turnCardInlineHtml(card) {
    if (!card) return '';
    const color = flopSuitColor(card.suit);
    return `<span style="color:${color};font-weight:900;">${card.rank}${SUIT_SYMBOLS[card.suit]}</span>`;
}

function renderTurnCBetButtons(hidden) {
    const container = document.getElementById('action-buttons');
    setSizingHint('');
    const sc = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
    const bs = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML = `<div class="grid grid-cols-2 gap-3 ${sc}"><button onclick="handleTurnCBetInput('CHECK')" ${bs} class="pc-btn pc-btn-passive">CHECK</button><button onclick="handleTurnCBetInput('BARREL')" ${bs} class="pc-btn pc-btn-aggressive">BARREL (50%)</button></div>`;
}

function renderTurnDefenderButtons(hidden) {
    const container = document.getElementById('action-buttons');
    setSizingHint('');
    const sc = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
    const bs = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML = `<div class="grid grid-cols-3 gap-2 ${sc}"><button onclick="handleTurnDefenderInput('fold')" ${bs} class="pc-btn pc-btn-fold">FOLD</button><button onclick="handleTurnDefenderInput('call')" ${bs} class="pc-btn pc-btn-passive">CALL</button><button onclick="handleTurnDefenderInput('raise')" ${bs} class="pc-btn pc-btn-aggressive">RAISE</button></div>`;
}

function handleTurnCBetInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreTurnAction, scenario: 'POSTFLOP_TURN_CBET',
        feedbackFn: showTurnCBetFeedback,
        srDiscriminator: _postflopSRDiscriminator,
        correctActionFn: (a, r) => r.correct ? a : (a === 'BARREL' ? 'CHECK' : 'BARREL'),
        includeTurn: true
    });
}

function handleTurnDefenderInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreTurnDefenderAction, scenario: 'POSTFLOP_TURN_DEFEND',
        feedbackFn: showTurnDefenderFeedback,
        srDiscriminator: _postflopSRDiscriminator,
        correctActionFn: (a, r) => r.correct ? a : r.preferredLabel.toLowerCase(),
        includeTurn: true
    });
}

function showTurnCBetFeedback(spot, result) {
    _showPostflopBetCheckFeedback(spot, result, {
        betActionKey: 'bet50', betLabel: 'Barrel', betColor: 'indigo-500', betLabelColor: 'indigo-400',
        headerText: `${POS_LABELS[spot.heroPos] || spot.heroPos} vs ${POS_LABELS[spot.villainPos] || spot.villainPos} · Turn · ${spot.positionState}`
    });
}

function showTurnDefenderFeedback(spot, result) {
    _showPostflopFCRFeedback(spot, result, {
        headerText: `BB vs ${POS_LABELS[spot.villainPos] || spot.villainPos} turn bet · Defend`
    });
}

// ============================================================
// TURN DELAYED C-BET — BUTTONS, HANDLER, FEEDBACK
// ============================================================

function renderDelayedTurnButtons(hidden) {
    const container = document.getElementById('action-buttons');
    setSizingHint('');
    const sc = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
    const bs = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML = `<div class="grid grid-cols-2 gap-3 ${sc}"><button onclick="handleDelayedTurnInput('CHECK')" ${bs} class="pc-btn pc-btn-passive">CHECK</button><button onclick="handleDelayedTurnInput('BET')" ${bs} class="pc-btn pc-btn-aggressive">BET (50%)</button></div>`;
}

function handleDelayedTurnInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreDelayedTurnAction, scenario: 'POSTFLOP_TURN_DELAYED_CBET',
        feedbackFn: showDelayedTurnFeedback,
        srDiscriminator: _postflopSRDiscriminator,
        engineActionFn: a => a === 'BET' ? 'BARREL' : 'CHECK',
        correctActionFn: (a, r) => r.correct ? a : (a === 'BET' ? 'CHECK' : 'BET'),
        includeTurn: true
    });
}

function showDelayedTurnFeedback(spot, result) {
    _showPostflopBetCheckFeedback(spot, result, {
        betActionKey: 'bet50', betLabel: 'Bet', betColor: 'violet-500', betLabelColor: 'violet-400',
        headerText: `${POS_LABELS[spot.heroPos] || spot.heroPos} vs ${POS_LABELS[spot.villainPos] || spot.villainPos} · Delayed C-Bet · ${spot.positionState}`
    });
}
// ============================================================
// TURN PROBE — BUTTONS, HANDLERS, FEEDBACK
// ============================================================
// POSTFLOP_TURN_PROBE: IP hero (BTN/CO) faces BB's probe after flop check-through.
// Actions: FOLD / CALL / RAISE (mirrors turn defender pattern).

function renderTurnProbeButtons(hidden) {
    const container = document.getElementById('action-buttons');
    setSizingHint('');
    const sc = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
    const bs = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML = `<div class="grid grid-cols-3 gap-2 ${sc}"><button onclick="handleTurnProbeInput('fold')" ${bs} class="pc-btn pc-btn-fold">FOLD</button><button onclick="handleTurnProbeInput('call')" ${bs} class="pc-btn pc-btn-passive">CALL</button><button onclick="handleTurnProbeInput('raise')" ${bs} class="pc-btn pc-btn-aggressive">RAISE</button></div>`;
}

function handleTurnProbeInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreTurnProbeAction, scenario: 'POSTFLOP_TURN_PROBE',
        feedbackFn: showTurnProbeFeedback,
        srDiscriminator: _postflopSRDiscriminator,
        correctActionFn: (a, r) => r.correct ? a : r.preferredAction,
        includeTurn: true
    });
}

function showTurnProbeFeedback(spot, result) {
    _showPostflopFCRFeedback(spot, result, {
        headerText: `${POS_LABELS[spot.heroPos] || spot.heroPos} vs ${POS_LABELS[spot.villainPos] || spot.villainPos} probe · IP Defense`
    });
}

// ============================================================
// TURN PROBE DEFEND — BUTTONS, HANDLER, FEEDBACK
// ============================================================
// POSTFLOP_TURN_PROBE_DEFEND: BB hero decides bet vs check as the prober.
// Actions: CHECK / BET (33%) (mirrors delayed cbet pattern).

function renderTurnProbeDefendButtons(hidden) {
    const container = document.getElementById('action-buttons');
    setSizingHint('');
    const sc = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
    const bs = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML = `<div class="grid grid-cols-2 gap-3 ${sc}"><button onclick="handleTurnProbeDefendInput('CHECK')" ${bs} class="pc-btn pc-btn-passive">CHECK</button><button onclick="handleTurnProbeDefendInput('BET')" ${bs} class="pc-btn pc-btn-aggressive">PROBE (33%)</button></div>`;
}

function handleTurnProbeDefendInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreTurnProbeDefendAction, scenario: 'POSTFLOP_TURN_PROBE_DEFEND',
        feedbackFn: showTurnProbeDefendFeedback,
        srDiscriminator: _postflopSRDiscriminator,
        engineActionFn: a => a === 'BET' ? 'BARREL' : 'CHECK',
        correctActionFn: (a, r) => r.correct ? a : (a === 'BET' ? 'CHECK' : 'BET'),
        includeTurn: true
    });
}

function showTurnProbeDefendFeedback(spot, result) {
    _showPostflopBetCheckFeedback(spot, result, {
        betActionKey: 'bet50', betLabel: 'Probe', betColor: 'teal-500', betLabelColor: 'teal-400',
        headerText: `BB vs ${POS_LABELS[spot.villainPos] || spot.villainPos} · Turn Probe · OOP`
    });
}

// ============================================================
// RIVER BARREL — BUTTONS, HANDLER, FEEDBACK
// ============================================================

function renderRiverCBetButtons(hidden) {
    const container = document.getElementById('action-buttons');
    setSizingHint('');
    const sc = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
    const bs = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML = `<div class="grid grid-cols-2 gap-3 ${sc}"><button onclick="handleRiverCBetInput('CHECK')" ${bs} class="pc-btn pc-btn-passive">CHECK</button><button onclick="handleRiverCBetInput('BARREL')" ${bs} class="pc-btn pc-btn-aggressive">BARREL (50%)</button></div>`;
}

function handleRiverCBetInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreRiverAction, scenario: 'POSTFLOP_RIVER_CBET',
        feedbackFn: showRiverCBetFeedback,
        srDiscriminator: _postflopSRDiscriminator,
        correctActionFn: (a, r) => r.correct ? a : (a === 'BARREL' ? 'CHECK' : 'BARREL'),
        includeTurn: true, includeRiver: true
    });
}

function showRiverCBetFeedback(spot, result) {
    _showPostflopBetCheckFeedback(spot, result, {
        betActionKey: 'bet50', betLabel: 'Barrel', betColor: 'amber-500', betLabelColor: 'amber-400',
        headerText: `${POS_LABELS[spot.heroPos] || spot.heroPos} vs ${POS_LABELS[spot.villainPos] || spot.villainPos} · River · ${spot.positionState}`
    });
}

// ============================================================
// RIVER DEFENSE — BUTTONS, HANDLER, FEEDBACK
// ============================================================

// TURN DELAYED DEFENSE — BUTTONS, HANDLER, FEEDBACK
function renderDelayedTurnDefendButtons(hidden) {
    const container = document.getElementById('action-buttons');
    setSizingHint('');
    const sc = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
    const bs = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML = `<div class="grid grid-cols-3 gap-2 ${sc}"><button onclick="handleDelayedTurnDefendInput('fold')" ${bs} class="pc-btn pc-btn-fold">FOLD</button><button onclick="handleDelayedTurnDefendInput('call')" ${bs} class="pc-btn pc-btn-passive">CALL</button><button onclick="handleDelayedTurnDefendInput('raise')" ${bs} class="pc-btn pc-btn-aggressive">RAISE</button></div>`;
}

function handleDelayedTurnDefendInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreTurnDelayedDefenderAction, scenario: 'POSTFLOP_TURN_DELAYED_DEFEND',
        feedbackFn: showDelayedTurnDefendFeedback,
        srDiscriminator: _postflopSRDiscriminator,
        correctActionFn: (a, r) => r.correct ? a : r.preferredLabel.toLowerCase(),
        includeTurn: true
    });
}

function showDelayedTurnDefendFeedback(spot, result) {
    _showPostflopFCRFeedback(spot, result, {
        headerText: `BB vs ${POS_LABELS[spot.villainPos] || spot.villainPos} · Turn · Delayed Line · Defend`
    });
}

function renderRiverDefenderButtons(hidden) {
    const container = document.getElementById('action-buttons');
    setSizingHint('');
    const sc = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
    const bs = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML = `<div class="grid grid-cols-3 gap-2 ${sc}"><button onclick="handleRiverDefenderInput('fold')" ${bs} class="pc-btn pc-btn-fold">FOLD</button><button onclick="handleRiverDefenderInput('call')" ${bs} class="pc-btn pc-btn-passive">CALL</button><button onclick="handleRiverDefenderInput('raise')" ${bs} class="pc-btn pc-btn-aggressive">RAISE</button></div>`;
}

function handleRiverDefenderInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreRiverDefenderAction, scenario: 'POSTFLOP_RIVER_DEFEND',
        feedbackFn: showRiverDefenderFeedback,
        srDiscriminator: _postflopSRDiscriminator,
        correctActionFn: (a, r) => r.correct ? a : r.preferredLabel.toLowerCase(),
        includeTurn: true, includeRiver: true
    });
}

function showRiverDefenderFeedback(spot, result) {
    _showPostflopFCRFeedback(spot, result, {
        headerText: `BB vs ${POS_LABELS[spot.villainPos] || spot.villainPos} river bet · Defend`
    });
}

// RIVER BARREL (DELAYED LINE) — BUTTONS, HANDLER, FEEDBACK
function renderRiverDelayedButtons(hidden) {
    const container = document.getElementById('action-buttons');
    setSizingHint('');
    const sc = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
    const bs = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML = `<div class="grid grid-cols-2 gap-3 ${sc}"><button onclick="handleRiverDelayedInput('CHECK')" ${bs} class="pc-btn pc-btn-passive">CHECK</button><button onclick="handleRiverDelayedInput('BARREL')" ${bs} class="pc-btn pc-btn-aggressive">BARREL (50%)</button></div>`;
}

function handleRiverDelayedInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreRiverDelayedAction, scenario: 'POSTFLOP_RIVER_DELAYED_CBET',
        feedbackFn: showRiverDelayedFeedback,
        srDiscriminator: _postflopSRDiscriminator,
        correctActionFn: (a, r) => r.correct ? a : (a === 'BARREL' ? 'CHECK' : 'BARREL'),
        includeTurn: true, includeRiver: true
    });
}

function showRiverDelayedFeedback(spot, result) {
    _showPostflopBetCheckFeedback(spot, result, {
        betActionKey: 'bet50', betLabel: 'Barrel', betColor: 'amber-500', betLabelColor: 'amber-400',
        headerText: `${POS_LABELS[spot.heroPos] || spot.heroPos} vs ${POS_LABELS[spot.villainPos] || spot.villainPos} · River · Delayed Line · ${spot.positionState}`
    });
}

// RIVER DEFENSE (DELAYED LINE) — BUTTONS, HANDLER, FEEDBACK
function renderRiverDelayedDefenderButtons(hidden) {
    const container = document.getElementById('action-buttons');
    setSizingHint('');
    const sc = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
    const bs = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML = `<div class="grid grid-cols-3 gap-2 ${sc}"><button onclick="handleRiverDelayedDefenderInput('fold')" ${bs} class="pc-btn pc-btn-fold">FOLD</button><button onclick="handleRiverDelayedDefenderInput('call')" ${bs} class="pc-btn pc-btn-passive">CALL</button><button onclick="handleRiverDelayedDefenderInput('raise')" ${bs} class="pc-btn pc-btn-aggressive">RAISE</button></div>`;
}

function handleRiverDelayedDefenderInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreRiverDelayedDefenderAction, scenario: 'POSTFLOP_RIVER_DELAYED_DEFEND',
        feedbackFn: showRiverDelayedDefenderFeedback,
        srDiscriminator: _postflopSRDiscriminator,
        correctActionFn: (a, r) => r.correct ? a : r.preferredLabel.toLowerCase(),
        includeTurn: true, includeRiver: true
    });
}

function showRiverDelayedDefenderFeedback(spot, result) {
    _showPostflopFCRFeedback(spot, result, {
        headerText: `BB vs ${POS_LABELS[spot.villainPos] || spot.villainPos} · River · Delayed Line · Defend`
    });
}

// RIVER PROBE DEFENSE — BUTTONS, HANDLER, FEEDBACK
function renderRiverProbeButtons(hidden) {
    const container = document.getElementById('action-buttons');
    setSizingHint('');
    const sc = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
    const bs = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML = `<div class="grid grid-cols-3 gap-2 ${sc}"><button onclick="handleRiverProbeInput('fold')" ${bs} class="pc-btn pc-btn-fold">FOLD</button><button onclick="handleRiverProbeInput('call')" ${bs} class="pc-btn pc-btn-passive">CALL</button><button onclick="handleRiverProbeInput('raise')" ${bs} class="pc-btn pc-btn-aggressive">RAISE</button></div>`;
}

function handleRiverProbeInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreRiverProbeAction, scenario: 'POSTFLOP_RIVER_PROBE',
        feedbackFn: showRiverProbeFeedback,
        srDiscriminator: _postflopSRDiscriminator,
        correctActionFn: (a, r) => r.correct ? a : r.preferredLabel.toLowerCase(),
        includeTurn: true, includeRiver: true
    });
}

function showRiverProbeFeedback(spot, result) {
    _showPostflopFCRFeedback(spot, result, {
        headerText: `${POS_LABELS[spot.heroPos] || spot.heroPos} vs ${POS_LABELS[spot.villainPos] || spot.villainPos} · River · Probe Defense`
    });
}

// RIVER PROBE BET — BUTTONS, HANDLER, FEEDBACK
function renderRiverProbeBetButtons(hidden) {
    const container = document.getElementById('action-buttons');
    setSizingHint('');
    const sc = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
    const bs = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML = `<div class="grid grid-cols-2 gap-3 ${sc}"><button onclick="handleRiverProbeBetInput('CHECK')" ${bs} class="pc-btn pc-btn-passive">CHECK</button><button onclick="handleRiverProbeBetInput('BARREL')" ${bs} class="pc-btn pc-btn-aggressive">PROBE (50%)</button></div>`;
}

function handleRiverProbeBetInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreRiverProbeBetAction, scenario: 'POSTFLOP_RIVER_PROBE_BET',
        feedbackFn: showRiverProbeBetFeedback,
        srDiscriminator: _postflopSRDiscriminator,
        correctActionFn: (a, r) => r.correct ? a : (a === 'BARREL' ? 'CHECK' : 'BARREL'),
        includeTurn: true, includeRiver: true
    });
}

function showRiverProbeBetFeedback(spot, result) {
    _showPostflopBetCheckFeedback(spot, result, {
        betActionKey: 'bet50', betLabel: 'Probe', betColor: 'amber-500', betLabelColor: 'amber-400',
        headerText: `BB vs ${POS_LABELS[spot.villainPos] || spot.villainPos} · River · Probe Bet Decision`
    });
}

// RIVER TURN CHECK CBET — BUTTONS, HANDLER, FEEDBACK
function renderRiverTurnCheckCBetButtons(hidden) {
    const container = document.getElementById('action-buttons');
    setSizingHint('');
    const sc = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
    const bs = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML = `<div class="grid grid-cols-2 gap-3 ${sc}"><button onclick="handleRiverTurnCheckCBetInput('CHECK')" ${bs} class="pc-btn pc-btn-passive">CHECK</button><button onclick="handleRiverTurnCheckCBetInput('BARREL')" ${bs} class="pc-btn pc-btn-aggressive">BARREL (50%)</button></div>`;
}

function handleRiverTurnCheckCBetInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreRiverTurnCheckAction, scenario: 'POSTFLOP_RIVER_TURN_CHECK_CBET',
        feedbackFn: showRiverTurnCheckFeedback,
        srDiscriminator: _postflopSRDiscriminator,
        correctActionFn: (a, r) => r.correct ? a : (a === 'BARREL' ? 'CHECK' : 'BARREL'),
        includeTurn: true, includeRiver: true
    });
}

function showRiverTurnCheckFeedback(spot, result) {
    _showPostflopBetCheckFeedback(spot, result, {
        betActionKey: 'bet50', betLabel: 'Barrel', betColor: 'amber-500', betLabelColor: 'amber-400',
        headerText: `${POS_LABELS[spot.heroPos] || spot.heroPos} vs ${POS_LABELS[spot.villainPos] || spot.villainPos} · River · Turn-Check Line`
    });
}

// RIVER TURN CHECK DEFEND — BUTTONS, HANDLER, FEEDBACK
function renderRiverTurnCheckDefendButtons(hidden) {
    const container = document.getElementById('action-buttons');
    setSizingHint('');
    const sc = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
    const bs = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML = `<div class="grid grid-cols-3 gap-2 ${sc}"><button onclick="handleRiverTurnCheckDefendInput('fold')" ${bs} class="pc-btn pc-btn-fold">FOLD</button><button onclick="handleRiverTurnCheckDefendInput('call')" ${bs} class="pc-btn pc-btn-passive">CALL</button><button onclick="handleRiverTurnCheckDefendInput('raise')" ${bs} class="pc-btn pc-btn-aggressive">RAISE</button></div>`;
}

function handleRiverTurnCheckDefendInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreRiverTurnCheckDefenderAction, scenario: 'POSTFLOP_RIVER_TURN_CHECK_DEFEND',
        feedbackFn: showRiverTurnCheckDefenderFeedback,
        srDiscriminator: _postflopSRDiscriminator,
        correctActionFn: (a, r) => r.correct ? a : r.preferredLabel.toLowerCase(),
        includeTurn: true, includeRiver: true
    });
}

function showRiverTurnCheckDefenderFeedback(spot, result) {
    _showPostflopFCRFeedback(spot, result, {
        headerText: `BB vs ${POS_LABELS[spot.villainPos] || spot.villainPos} · River · Turn Check-Check · Defend`
    });
}

// RIVER PROBE CALL BET — BUTTONS, HANDLER, FEEDBACK
function renderRiverProbeCallBetButtons(hidden) {
    const container = document.getElementById('action-buttons');
    setSizingHint('');
    const sc = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
    const bs = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML = `<div class="grid grid-cols-2 gap-3 ${sc}"><button onclick="handleRiverProbeCallBetInput('CHECK')" ${bs} class="pc-btn pc-btn-passive">CHECK</button><button onclick="handleRiverProbeCallBetInput('BARREL')" ${bs} class="pc-btn pc-btn-aggressive">PROBE (50%)</button></div>`;
}

function handleRiverProbeCallBetInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreRiverProbeCallBetAction, scenario: 'POSTFLOP_RIVER_PROBE_CALL_BET',
        feedbackFn: showRiverProbeCallBetFeedback,
        srDiscriminator: _postflopSRDiscriminator,
        correctActionFn: (a, r) => r.correct ? a : (a === 'BARREL' ? 'CHECK' : 'BARREL'),
        includeTurn: true, includeRiver: true
    });
}

function showRiverProbeCallBetFeedback(spot, result) {
    _showPostflopBetCheckFeedback(spot, result, {
        betActionKey: 'bet50', betLabel: 'Probe', betColor: 'amber-500', betLabelColor: 'amber-400',
        headerText: `BB vs ${POS_LABELS[spot.villainPos] || spot.villainPos} · River · Probe 2nd Barrel`
    });
}

// RIVER PROBE CALL DEFEND — BUTTONS, HANDLER, FEEDBACK
function renderRiverProbeCallDefendButtons(hidden) {
    const container = document.getElementById('action-buttons');
    setSizingHint('');
    const sc = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
    const bs = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;
    container.innerHTML = `<div class="grid grid-cols-3 gap-2 ${sc}"><button onclick="handleRiverProbeCallDefendInput('fold')" ${bs} class="pc-btn pc-btn-fold">FOLD</button><button onclick="handleRiverProbeCallDefendInput('call')" ${bs} class="pc-btn pc-btn-passive">CALL</button><button onclick="handleRiverProbeCallDefendInput('raise')" ${bs} class="pc-btn pc-btn-aggressive">RAISE</button></div>`;
}

function handleRiverProbeCallDefendInput(action) {
    _resolvePostflopAction({
        action, scoreFn: scoreRiverProbeCallDefenderAction, scenario: 'POSTFLOP_RIVER_PROBE_CALL_DEFEND',
        feedbackFn: showRiverProbeCallDefenderFeedback,
        srDiscriminator: _postflopSRDiscriminator,
        correctActionFn: (a, r) => r.correct ? a : r.preferredLabel.toLowerCase(),
        includeTurn: true, includeRiver: true
    });
}

function showRiverProbeCallDefenderFeedback(spot, result) {
    _showPostflopFCRFeedback(spot, result, {
        headerText: `${POS_LABELS[spot.heroPos] || spot.heroPos} vs ${POS_LABELS[spot.villainPos] || spot.villainPos} · River · Probe 2nd Barrel · Defend`
    });
}
