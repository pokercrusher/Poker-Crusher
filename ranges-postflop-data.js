// ranges-postflop-data.js — strategy-table population (audit §2.1).
//
// The 25 generator IIFEs that fill the POSTFLOP_* strategy tables, extracted
// verbatim from ranges.js. The empty `const TABLE = {}` declarations and every
// function stay in ranges.js; this file only POPULATES them, so it can load
// off the critical path (injected after window.load by index.html). Until it
// lands, lane-support checks see empty tables and the poker room grades with
// the heuristic — the app's normal degraded mode, never an error.
//
// Script order requirement: after ranges.js. Never reference from top-level
// code in other files.

(function(){
    const IP={A_HIGH_DRY:{bet33:0.80,check:0.20,r:"PFR has massive range advantage on A-high dry boards."},A_HIGH_DYNAMIC:{bet33:0.55,check:0.45,r:"A-high with draws. Range advantage partially offset by flush potential."},BROADWAY_STATIC:{bet33:0.70,check:0.30,r:"PFR retains strong range advantage on dry broadway textures."},BROADWAY_DYNAMIC:{bet33:0.50,check:0.50,r:"Connected broadway boards hit both ranges. Mixed strategy."},MID_DISCONNECTED:{bet33:0.55,check:0.45,r:"Moderate PFR advantage. Mid cards connect more with caller's range."},MID_CONNECTED:{bet33:0.35,check:0.65,r:"Connected mid boards favor the caller's wider range."},LOW_DISCONNECTED:{bet33:0.45,check:0.55,r:"Low boards slightly favor the caller."},LOW_CONNECTED:{bet33:0.25,check:0.75,r:"Low connected boards strongly favor the caller's range."},MONOTONE:{bet33:0.35,check:0.65,r:"Monotone boards reduce PFR's range advantage."},PAIRED_HIGH:{bet33:0.65,check:0.35,r:"PFR has more overpairs and strong kickers on high paired boards."},PAIRED_LOW:{bet33:0.50,check:0.50,r:"Low paired boards are more neutral. Mixed strategy."},TRIPS:{bet33:0.40,check:0.60,r:"Trip boards are rare and equity runs close."}};
    const OOP={A_HIGH_DRY:{bet33:0.65,check:0.35,r:"A-high dry still favors PFR but OOP penalty reduces c-bet frequency."},A_HIGH_DYNAMIC:{bet33:0.40,check:0.60,r:"OOP with draws present. Checking preferred to control pot."},BROADWAY_STATIC:{bet33:0.55,check:0.45,r:"Range advantage present but OOP. C-bet slightly preferred."},BROADWAY_DYNAMIC:{bet33:0.35,check:0.65,r:"Connected broadway OOP. Checking preferred."},MID_DISCONNECTED:{bet33:0.40,check:0.60,r:"Moderate texture OOP. Lean toward checking."},MID_CONNECTED:{bet33:0.25,check:0.75,r:"Connected mid boards OOP. Check heavily."},LOW_DISCONNECTED:{bet33:0.30,check:0.70,r:"Low boards OOP. Check frequently."},LOW_CONNECTED:{bet33:0.15,check:0.85,r:"Low connected OOP. Almost always check."},MONOTONE:{bet33:0.25,check:0.75,r:"Monotone boards OOP. Check heavily."},PAIRED_HIGH:{bet33:0.50,check:0.50,r:"High paired board OOP. Mixed strategy."},PAIRED_LOW:{bet33:0.35,check:0.65,r:"Low paired board OOP. Lean toward checking."},TRIPS:{bet33:0.30,check:0.70,r:"Trip board OOP. Checking preferred."}};
    const OFF={UTG_vs_BB:0.05,LJ_vs_BB:0.03,HJ_vs_BB:0.02,CO_vs_BB:0,BTN_vs_BB:0,BTN_vs_SB:0,SB_vs_BB:0,CO_vs_BTN:-0.03};
    for(const[fk,fi]of Object.entries(POSTFLOP_PREFLOP_FAMILIES)){const base=fi.positionState==='IP'?IP:OOP;const off=OFF[fk]||0;for(const arch of FLOP_ARCHETYPES){const raw=base[arch];if(!raw)continue;const ab=Math.max(0.05,Math.min(0.95,raw.bet33+off));const ac=parseFloat((1-ab).toFixed(2));const actions={check:ac,bet33:parseFloat(ab.toFixed(2))};const pa=ab>=0.50?'bet33':'check';const sk=makePostflopSpotKey({potType:'SRP',preflopFamily:fk,street:'FLOP',heroRole:'PFR',positionState:fi.positionState,nodeType:'CBET_DECISION',boardArchetype:arch});POSTFLOP_STRATEGY[sk]={actions,preferredAction:pa,reasoning:raw.r,simplification:'Phase 1: C-Bet vs Check'};}}
})();

(function() {
    const HAND_CLASSES = [
        'OVERPAIR','TOP_PAIR','SECOND_PAIR','THIRD_PAIR','UNDERPAIR','SET','TWO_PAIR_PLUS',
        'FULL_HOUSE','QUADS','TRIPS','BOARD_TRIPS',
        'OESD','GUTSHOT','NFD','FD','COMBO_DRAW','ACE_HIGH_BACKDOOR','OVERCARDS','AIR'
    ];

    // Base c-bet frequencies by hand class × board archetype (IP PFR)
    // Format: { handClass: { archetype: bet33 freq } }
    // Missing combos inherit a default per hand class.
    const BASE_IP = {
        SET:              { _default: 0.90, LOW_CONNECTED: 0.80, MONOTONE: 0.75, TRIPS: 0.50 },
        TWO_PAIR_PLUS:    { _default: 0.85, LOW_CONNECTED: 0.75, MONOTONE: 0.70, TRIPS: 0.50 },
        FULL_HOUSE:       { _default: 0.90, LOW_CONNECTED: 0.85, MONOTONE: 0.80, TRIPS: 0.85, PAIRED_HIGH: 0.90, PAIRED_LOW: 0.88 },
        QUADS:            { _default: 0.65, TRIPS: 0.60 },
        TRIPS:            { _default: 0.85, PAIRED_HIGH: 0.85, PAIRED_LOW: 0.80, LOW_CONNECTED: 0.75, MONOTONE: 0.70 },
        BOARD_TRIPS:      { _default: 0.85, TRIPS: 0.85 },
        OVERPAIR:         { _default: 0.85, A_HIGH_DRY: 0.90, A_HIGH_DYNAMIC: 0.75, BROADWAY_STATIC: 0.85, BROADWAY_DYNAMIC: 0.70, MID_CONNECTED: 0.65, LOW_CONNECTED: 0.55, MONOTONE: 0.50 },
        TOP_PAIR:         { _default: 0.70, A_HIGH_DRY: 0.80, A_HIGH_DYNAMIC: 0.60, BROADWAY_STATIC: 0.75, BROADWAY_DYNAMIC: 0.55, MID_DISCONNECTED: 0.65, MID_CONNECTED: 0.50, LOW_DISCONNECTED: 0.55, LOW_CONNECTED: 0.40, MONOTONE: 0.40, PAIRED_HIGH: 0.60, PAIRED_LOW: 0.55 },
        SECOND_PAIR:      { _default: 0.35, A_HIGH_DRY: 0.45, BROADWAY_STATIC: 0.40, MID_DISCONNECTED: 0.35, MID_CONNECTED: 0.25, LOW_DISCONNECTED: 0.30, LOW_CONNECTED: 0.20, MONOTONE: 0.20 },
        THIRD_PAIR:       { _default: 0.25, A_HIGH_DRY: 0.35, BROADWAY_STATIC: 0.30, MID_DISCONNECTED: 0.25, MID_CONNECTED: 0.15, LOW_DISCONNECTED: 0.20, LOW_CONNECTED: 0.10, MONOTONE: 0.15 },
        UNDERPAIR:        { _default: 0.30, A_HIGH_DRY: 0.40, BROADWAY_STATIC: 0.35, MID_DISCONNECTED: 0.30, MID_CONNECTED: 0.20, LOW_DISCONNECTED: 0.25, LOW_CONNECTED: 0.15, MONOTONE: 0.15 },
        COMBO_DRAW:       { _default: 0.80, A_HIGH_DRY: 0.60, BROADWAY_STATIC: 0.65, MID_CONNECTED: 0.85, LOW_CONNECTED: 0.80, MONOTONE: 0.75 },
        NFD:              { _default: 0.70, A_HIGH_DRY: 0.50, BROADWAY_STATIC: 0.55, MID_CONNECTED: 0.75, LOW_CONNECTED: 0.70, MONOTONE: 0.60 },
        FD:               { _default: 0.55, A_HIGH_DRY: 0.40, BROADWAY_STATIC: 0.45, MID_CONNECTED: 0.60, LOW_CONNECTED: 0.55, MONOTONE: 0.45 },
        OESD:             { _default: 0.60, A_HIGH_DRY: 0.45, BROADWAY_DYNAMIC: 0.65, MID_CONNECTED: 0.65, LOW_CONNECTED: 0.60 },
        GUTSHOT:          { _default: 0.40, A_HIGH_DRY: 0.35, BROADWAY_DYNAMIC: 0.45, MID_CONNECTED: 0.45, LOW_CONNECTED: 0.40 },
        ACE_HIGH_BACKDOOR:{ _default: 0.45, A_HIGH_DRY: 0.70, A_HIGH_DYNAMIC: 0.55, BROADWAY_STATIC: 0.55, BROADWAY_DYNAMIC: 0.40, MID_DISCONNECTED: 0.40, MID_CONNECTED: 0.30, LOW_DISCONNECTED: 0.35, LOW_CONNECTED: 0.25, MONOTONE: 0.25 },
        OVERCARDS:        { _default: 0.35, A_HIGH_DRY: 0.50, A_HIGH_DYNAMIC: 0.40, BROADWAY_STATIC: 0.45, BROADWAY_DYNAMIC: 0.35, MID_DISCONNECTED: 0.35, MID_CONNECTED: 0.20, LOW_DISCONNECTED: 0.30, LOW_CONNECTED: 0.15, MONOTONE: 0.20, PAIRED_HIGH: 0.35, PAIRED_LOW: 0.30, TRIPS: 0.25 },
        AIR:              { _default: 0.30, A_HIGH_DRY: 0.45, BROADWAY_STATIC: 0.35, MID_DISCONNECTED: 0.30, MID_CONNECTED: 0.15, LOW_DISCONNECTED: 0.25, LOW_CONNECTED: 0.10, MONOTONE: 0.15, PAIRED_HIGH: 0.30, PAIRED_LOW: 0.25, TRIPS: 0.20 }
    };

    // OOP PFR base frequencies — significantly lower c-bet frequency due to positional disadvantage
    const BASE_OOP = {
        SET:              { _default: 0.80, LOW_CONNECTED: 0.70, MONOTONE: 0.65, TRIPS: 0.45 },
        TWO_PAIR_PLUS:    { _default: 0.75, LOW_CONNECTED: 0.65, MONOTONE: 0.60, TRIPS: 0.40 },
        FULL_HOUSE:       { _default: 0.80, LOW_CONNECTED: 0.75, MONOTONE: 0.70, TRIPS: 0.75, PAIRED_HIGH: 0.80, PAIRED_LOW: 0.78 },
        QUADS:            { _default: 0.55, TRIPS: 0.50 },
        TRIPS:            { _default: 0.75, PAIRED_HIGH: 0.75, PAIRED_LOW: 0.70, LOW_CONNECTED: 0.65, MONOTONE: 0.60 },
        BOARD_TRIPS:      { _default: 0.75, TRIPS: 0.75 },
        OVERPAIR:         { _default: 0.70, A_HIGH_DRY: 0.80, A_HIGH_DYNAMIC: 0.60, BROADWAY_STATIC: 0.70, BROADWAY_DYNAMIC: 0.55, MID_CONNECTED: 0.50, LOW_CONNECTED: 0.40, MONOTONE: 0.35 },
        TOP_PAIR:         { _default: 0.55, A_HIGH_DRY: 0.65, A_HIGH_DYNAMIC: 0.45, BROADWAY_STATIC: 0.60, BROADWAY_DYNAMIC: 0.40, MID_DISCONNECTED: 0.50, MID_CONNECTED: 0.35, LOW_DISCONNECTED: 0.40, LOW_CONNECTED: 0.25, MONOTONE: 0.25, PAIRED_HIGH: 0.45, PAIRED_LOW: 0.40 },
        SECOND_PAIR:      { _default: 0.20, A_HIGH_DRY: 0.30, BROADWAY_STATIC: 0.25, MID_DISCONNECTED: 0.20, MID_CONNECTED: 0.15, LOW_DISCONNECTED: 0.20, LOW_CONNECTED: 0.10, MONOTONE: 0.10 },
        THIRD_PAIR:       { _default: 0.15, A_HIGH_DRY: 0.20, BROADWAY_STATIC: 0.18, MID_DISCONNECTED: 0.15, MID_CONNECTED: 0.10, LOW_DISCONNECTED: 0.12, LOW_CONNECTED: 0.08, MONOTONE: 0.08 },
        UNDERPAIR:        { _default: 0.18, A_HIGH_DRY: 0.25, BROADWAY_STATIC: 0.22, MID_DISCONNECTED: 0.18, MID_CONNECTED: 0.12, LOW_DISCONNECTED: 0.15, LOW_CONNECTED: 0.08, MONOTONE: 0.08 },
        COMBO_DRAW:       { _default: 0.65, A_HIGH_DRY: 0.45, BROADWAY_STATIC: 0.50, MID_CONNECTED: 0.70, LOW_CONNECTED: 0.65, MONOTONE: 0.55 },
        NFD:              { _default: 0.55, A_HIGH_DRY: 0.35, BROADWAY_STATIC: 0.40, MID_CONNECTED: 0.60, LOW_CONNECTED: 0.55, MONOTONE: 0.45 },
        FD:               { _default: 0.40, A_HIGH_DRY: 0.25, BROADWAY_STATIC: 0.30, MID_CONNECTED: 0.45, LOW_CONNECTED: 0.40, MONOTONE: 0.30 },
        OESD:             { _default: 0.45, A_HIGH_DRY: 0.30, BROADWAY_DYNAMIC: 0.50, MID_CONNECTED: 0.50, LOW_CONNECTED: 0.45 },
        GUTSHOT:          { _default: 0.25, A_HIGH_DRY: 0.20, BROADWAY_DYNAMIC: 0.30, MID_CONNECTED: 0.30, LOW_CONNECTED: 0.25 },
        ACE_HIGH_BACKDOOR:{ _default: 0.30, A_HIGH_DRY: 0.50, A_HIGH_DYNAMIC: 0.35, BROADWAY_STATIC: 0.35, BROADWAY_DYNAMIC: 0.25, MID_DISCONNECTED: 0.25, MID_CONNECTED: 0.15, LOW_DISCONNECTED: 0.20, LOW_CONNECTED: 0.12, MONOTONE: 0.12 },
        OVERCARDS:        { _default: 0.22, A_HIGH_DRY: 0.35, A_HIGH_DYNAMIC: 0.25, BROADWAY_STATIC: 0.28, BROADWAY_DYNAMIC: 0.20, MID_DISCONNECTED: 0.20, MID_CONNECTED: 0.10, LOW_DISCONNECTED: 0.18, LOW_CONNECTED: 0.08, MONOTONE: 0.10, PAIRED_HIGH: 0.22, PAIRED_LOW: 0.18, TRIPS: 0.15 },
        AIR:              { _default: 0.18, A_HIGH_DRY: 0.30, BROADWAY_STATIC: 0.22, MID_DISCONNECTED: 0.18, MID_CONNECTED: 0.08, LOW_DISCONNECTED: 0.15, LOW_CONNECTED: 0.05, MONOTONE: 0.08, PAIRED_HIGH: 0.18, PAIRED_LOW: 0.15, TRIPS: 0.12 }
    };

    // Reasoning templates per hand class
    const REASONING = {
        SET: 'Sets are strong; bet for value and protection.',
        TWO_PAIR_PLUS: 'Two pair+ is strong; bet for value.',
        FULL_HOUSE: 'Full house is a monster; bet for value on almost all textures.',
        QUADS: 'Quads is the near-nuts; bet or slow-play to maximize value.',
        TRIPS: 'Trips is a strong made hand; bet for value frequently.',
        BOARD_TRIPS: 'Board trips with strong kicker; bet for value — villain plays the same trips.',
        OVERPAIR: 'Overpairs are premium made hands; bet for value and protection.',
        TOP_PAIR: 'Top pair should usually bet for value, but check on dynamic boards.',
        SECOND_PAIR: 'Second pair has showdown value; check to control pot, or thin value bet on dry boards.',
        THIRD_PAIR: 'Third pair is weak; mostly check to get to showdown cheaply.',
        UNDERPAIR: 'Underpairs are marginal; mostly check to realize equity.',
        COMBO_DRAW: 'Combo draws have great equity and fold equity; bet aggressively.',
        NFD: 'Nut flush draws have strong equity; semi-bluff frequently.',
        FD: 'Flush draws have decent equity; semi-bluff on favorable textures.',
        OESD: 'Open-ended straight draws have ~32% equity; semi-bluff on many textures.',
        GUTSHOT: 'Gutshots have some equity but low hit rate; selective bluffs.',
        ACE_HIGH_BACKDOOR: 'Ace-high with backdoor equity; can bet on favorable textures as a bluff.',
        OVERCARDS: 'Two overcards have some equity and can improve; bet as a bluff on PFR-favorable boards.',
        AIR: 'No made hand or draw; bet as a bluff on PFR-favorable boards, check otherwise.'
    };

    // Family offsets: small adjustments per family on top of IP/OOP base tables
    // BTN is the widest/most aggressive opener → baseline (0)
    // CO slightly tighter, HJ/LJ tighter still, UTG tightest (strongest range → can bet more)
    // OOP families: SB_vs_BB uses OOP base (0 offset), CO_vs_BTN slightly negative (tighter range OOP)
    const FAMILY_OFF = {
        BTN_vs_BB: 0, CO_vs_BB: -0.03, HJ_vs_BB: -0.02, LJ_vs_BB: -0.01,
        UTG_vs_BB: 0.02,   // UTG has the strongest range → slight bet frequency boost
        BTN_vs_SB: 0.02,   // BTN vs SB: tighter caller, PFR has bigger advantage
        SB_vs_BB: 0,        // OOP base already accounts for positional penalty
        CO_vs_BTN: -0.03    // OOP + wider caller range → bet a touch less
    };

    for (const fam of HERO_HAND_AWARE_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;
        // Use OOP base tables for OOP families, IP for IP families
        const baseTable = fi.positionState === 'OOP' ? BASE_OOP : BASE_IP;

        for (const arch of FLOP_ARCHETYPES) {
            for (const hc of HAND_CLASSES) {
                const baseFreqs = baseTable[hc];
                if (!baseFreqs) continue;
                const raw = baseFreqs[arch] !== undefined ? baseFreqs[arch] : baseFreqs._default;
                const bet = Math.max(0.05, Math.min(0.95, parseFloat((raw + famOff).toFixed(2))));
                const chk = parseFloat((1 - bet).toFixed(2));
                const preferred = bet >= 0.50 ? 'bet33' : 'check';
                const sk = makePostflopSpotKeyV2({
                    potType:'SRP', preflopFamily:fam, street:'FLOP', heroRole:'PFR',
                    positionState:fi.positionState, nodeType:'CBET_DECISION',
                    boardArchetype:arch, heroHandClass:hc
                });
                POSTFLOP_STRATEGY_V2[sk] = {
                    actions: { check: chk, bet33: bet },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: 'V3: Hero-hand-aware C-Bet'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[PostflopV3] Built ${Object.keys(POSTFLOP_STRATEGY_V2).length} hero-hand-aware strategy entries.`);
    }
})();

(function() {
    const HAND_CLASSES = [
        'OVERPAIR','TOP_PAIR','SECOND_PAIR','THIRD_PAIR','UNDERPAIR','SET','TWO_PAIR_PLUS',
        'FULL_HOUSE','QUADS','TRIPS','BOARD_TRIPS',
        'OESD','GUTSHOT','NFD','FD','COMBO_DRAW','ACE_HIGH_BACKDOOR','OVERCARDS','AIR'
    ];

    // IP base frequencies (BTN vs CO baseline). ~10-15% above SRP IP.
    const BASE_IP = {
        OVERPAIR:          { _default:0.90, MONOTONE:0.75, TRIPS:0.75 },
        TOP_PAIR:          { _default:0.85, A_HIGH_DRY:0.88, A_HIGH_DYNAMIC:0.78,
                             BROADWAY_DYNAMIC:0.75, MID_CONNECTED:0.75, LOW_CONNECTED:0.70,
                             MONOTONE:0.68, TRIPS:0.72 },
        SECOND_PAIR:       { _default:0.62, A_HIGH_DRY:0.68, MID_CONNECTED:0.55,
                             LOW_CONNECTED:0.50, MONOTONE:0.48 },
        THIRD_PAIR:        { _default:0.40, A_HIGH_DRY:0.48, LOW_CONNECTED:0.32, MONOTONE:0.28 },
        UNDERPAIR:         { _default:0.42, A_HIGH_DRY:0.52, LOW_CONNECTED:0.32, MONOTONE:0.30 },
        SET:               { _default:0.90, MONOTONE:0.72, TRIPS:0.50 },
        TWO_PAIR_PLUS:     { _default:0.90, MONOTONE:0.72, TRIPS:0.55 },
        FULL_HOUSE:        { _default:0.72, TRIPS:0.50 },
        QUADS:             { _default:0.50, TRIPS:0.50 },
        TRIPS:             { _default:0.75 },
        BOARD_TRIPS:       { _default:0.72 },
        COMBO_DRAW:        { _default:0.90 },
        NFD:               { _default:0.80, MONOTONE:0.15 },
        FD:                { _default:0.68, MONOTONE:0.15 },
        OESD:              { _default:0.72, MONOTONE:0.60, TRIPS:0.55 },
        GUTSHOT:           { _default:0.52, LOW_CONNECTED:0.50, MONOTONE:0.42 },
        ACE_HIGH_BACKDOOR: { _default:0.60, A_HIGH_DRY:0.75, A_HIGH_DYNAMIC:0.68,
                             LOW_CONNECTED:0.38, MONOTONE:0.35 },
        OVERCARDS:         { _default:0.55, A_HIGH_DRY:0.72, A_HIGH_DYNAMIC:0.65,
                             BROADWAY_STATIC:0.62, MID_CONNECTED:0.45,
                             LOW_CONNECTED:0.38, MONOTONE:0.35 },
        AIR:               { _default:0.50, A_HIGH_DRY:0.70, A_HIGH_DYNAMIC:0.62,
                             BROADWAY_STATIC:0.58, MID_CONNECTED:0.40,
                             LOW_CONNECTED:0.35, MONOTONE:0.30, TRIPS:0.30 }
    };

    // OOP base frequencies (BB vs BTN baseline). ~12-15% below IP equivalent.
    // BB/SB retain range advantage on high boards but are penalised by position.
    const BASE_OOP = {
        OVERPAIR:          { _default:0.78, MONOTONE:0.62, TRIPS:0.62 },
        TOP_PAIR:          { _default:0.72, A_HIGH_DRY:0.75, A_HIGH_DYNAMIC:0.65,
                             BROADWAY_DYNAMIC:0.62, MID_CONNECTED:0.60, LOW_CONNECTED:0.55,
                             MONOTONE:0.55, TRIPS:0.58 },
        SECOND_PAIR:       { _default:0.45, A_HIGH_DRY:0.52, MID_CONNECTED:0.38,
                             LOW_CONNECTED:0.32, MONOTONE:0.30 },
        THIRD_PAIR:        { _default:0.25, A_HIGH_DRY:0.32, LOW_CONNECTED:0.18, MONOTONE:0.15 },
        UNDERPAIR:         { _default:0.28, A_HIGH_DRY:0.38, LOW_CONNECTED:0.18, MONOTONE:0.18 },
        SET:               { _default:0.80, MONOTONE:0.60, TRIPS:0.42 },
        TWO_PAIR_PLUS:     { _default:0.80, MONOTONE:0.60, TRIPS:0.45 },
        FULL_HOUSE:        { _default:0.62, TRIPS:0.42 },
        QUADS:             { _default:0.42, TRIPS:0.42 },
        TRIPS:             { _default:0.65 },
        BOARD_TRIPS:       { _default:0.62 },
        COMBO_DRAW:        { _default:0.82 },
        NFD:               { _default:0.70, MONOTONE:0.12 },
        FD:                { _default:0.55, MONOTONE:0.12 },
        OESD:              { _default:0.60, MONOTONE:0.48, TRIPS:0.42 },
        GUTSHOT:           { _default:0.38, LOW_CONNECTED:0.35, MONOTONE:0.28 },
        ACE_HIGH_BACKDOOR: { _default:0.45, A_HIGH_DRY:0.62, A_HIGH_DYNAMIC:0.55,
                             LOW_CONNECTED:0.25, MONOTONE:0.22 },
        OVERCARDS:         { _default:0.40, A_HIGH_DRY:0.58, A_HIGH_DYNAMIC:0.50,
                             BROADWAY_STATIC:0.48, MID_CONNECTED:0.30,
                             LOW_CONNECTED:0.22, MONOTONE:0.20 },
        AIR:               { _default:0.35, A_HIGH_DRY:0.55, A_HIGH_DYNAMIC:0.48,
                             BROADWAY_STATIC:0.42, MID_CONNECTED:0.25,
                             LOW_CONNECTED:0.20, MONOTONE:0.15, TRIPS:0.15 }
    };

    // Per-family offsets. Tighter caller = more range advantage = higher c-bet frequency.
    // OOP families share the OOP base; IP families share the IP base.
    const FAMILY_OFF = {
        // IP families
        BTN_3BP_vs_CO:  0,      // baseline: CO is widest IP caller
        BTN_3BP_vs_HJ:  0.03,   // HJ flats 3bets tighter than CO
        CO_3BP_vs_HJ:   0.02,
        BTN_3BP_vs_UTG: 0.05,   // UTG calling range is very condensed
        CO_3BP_vs_UTG:  0.04,
        HJ_3BP_vs_UTG:  0.04,   // HJ vs UTG: UTG caller is condensed
        // OOP families (applied on top of BASE_OOP)
        BB_3BP_vs_BTN:  0,      // baseline: BTN calls 3bets wide → least range advantage for BB
        BB_3BP_vs_CO:   0.03,   // CO's flatting range is tighter than BTN's
        SB_3BP_vs_BTN:  0.02,   // SB's 3bet range is more linear/strong than BB's
        SB_3BP_vs_CO:   0.03,   // SB vs CO: CO caller is tighter than BTN
        SB_3BP_vs_HJ:   0.04,   // SB vs HJ: HJ caller is tight
        SB_3BP_vs_UTG:  0.05,   // SB vs UTG: UTG caller is very condensed
        BB_3BP_vs_HJ:   0.04,   // BB vs HJ: HJ caller is tight
    };

    const REASONING = {
        OVERPAIR: 'Overpairs are premium in 3BP; caller\'s condensed range has few better hands. Bet for value and protection.',
        TOP_PAIR: 'Top pair is strong in 3BP; caller\'s condensed range has fewer two-pair combos than in SRP.',
        SECOND_PAIR: 'Second pair has some showdown value in 3BP; bet selectively on dry boards.',
        THIRD_PAIR: 'Third pair is marginal in 3BP; mostly check to get to showdown cheaply.',
        UNDERPAIR: 'Underpairs are weak in 3BP; check mostly and reassess on later streets.',
        SET: 'Sets are the nuts in 3BP — bet to build the large pot. Slow-play monotone carefully.',
        TWO_PAIR_PLUS: 'Two pair+ is strong value in 3BP; bet to charge caller\'s draws in the inflated pot.',
        FULL_HOUSE: 'Full house — bet mostly for value; occasional slow-play on paired boards.',
        QUADS: 'Quads — slow play to extract maximum value from overpairs and full houses.',
        TRIPS: 'Trips — bet for value; caller\'s condensed range has fewer full house combinations.',
        BOARD_TRIPS: 'Board trips — bet for value with your kicker advantage.',
        COMBO_DRAW: 'Combo draws have ~50%+ equity in 3BP; semi-bluff the large pot aggressively.',
        NFD: 'Nut flush draw has strong equity in 3BP; semi-bluff frequently to build the pot.',
        FD: 'Flush draws have decent equity in 3BP; semi-bluff on favorable textures.',
        OESD: 'OESD has ~32% equity; semi-bluff the 3BP pot frequently.',
        GUTSHOT: 'Gutshot has some equity; semi-bluff selectively on 3BP-favorable textures.',
        ACE_HIGH_BACKDOOR: 'Ace-high with backdoor equity — good bluff candidate in 3BP on A-high boards.',
        OVERCARDS: 'Overcards can semi-bluff in 3BP on boards where hero\'s polar range has maximum equity.',
        AIR: 'Pure air in 3BP — bluff on textures where hero\'s polar range has maximum fold equity.'
    };

    for (const fam of HERO_HAND_AWARE_3BP_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;
        const baseTable = fi.positionState === 'OOP' ? BASE_OOP : BASE_IP;

        for (const arch of FLOP_ARCHETYPES) {
            for (const hc of HAND_CLASSES) {
                const row = baseTable[hc];
                if (!row) continue;
                const rawBet = row[arch] !== undefined ? row[arch] : row._default;
                const bet = Math.max(0.05, Math.min(0.95, parseFloat((rawBet + famOff).toFixed(2))));
                const chk = parseFloat((1 - bet).toFixed(2));
                const preferred = bet >= 0.50 ? 'bet33' : 'check';
                const sk = makePostflopSpotKeyV2({
                    potType:'3BP', preflopFamily:fam, street:'FLOP', heroRole:'PFR',
                    positionState:fi.positionState, nodeType:'CBET_DECISION',
                    boardArchetype:arch, heroHandClass:hc
                });
                POSTFLOP_STRATEGY_V2[sk] = {
                    actions: { check: chk, bet33: bet },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: fi.positionState === 'OOP' ? '3BP OOP: Hero-hand-aware Flop C-Bet' : '3BP: Hero-hand-aware Flop C-Bet'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        const count = Object.keys(POSTFLOP_STRATEGY_V2).filter(k => k.startsWith('3BP|')).length;
        console.log(`[3BP Flop] Built ${count} strategy entries across ${HERO_HAND_AWARE_3BP_FAMILIES.size} families (IP + OOP).`);
    }
})();

(function() {
    const HAND_CLASSES = [
        'OVERPAIR','TOP_PAIR','SECOND_PAIR','THIRD_PAIR','UNDERPAIR','SET','TWO_PAIR_PLUS',
        'FULL_HOUSE','QUADS','TRIPS','BOARD_TRIPS',
        'OESD','GUTSHOT','NFD','FD','COMBO_DRAW','ACE_HIGH_BACKDOOR','OVERCARDS','AIR'
    ];

    // Base defender frequencies: { handClass: { archetype: { fold, call, raise } } }
    // _default used when archetype not specified.
    // Hero is BB (OOP) facing a 33% c-bet in SRP.
    // General logic:
    //   Strong hands → raise for value, some slow-play (call)
    //   Top pair → mostly call, occasional raise on dry boards
    //   Medium pairs → call or fold depending on texture
    //   Draws → call often, raise sometimes as semi-bluff
    //   Air → mostly fold, bluff raise occasionally

    const BASE = {
        SET:              { _default: { fold: 0.00, call: 0.40, raise: 0.60 },
                            MONOTONE: { fold: 0.00, call: 0.30, raise: 0.70 }, TRIPS: { fold: 0.00, call: 0.55, raise: 0.45 },
                            LOW_CONNECTED: { fold: 0.00, call: 0.35, raise: 0.65 } },
        TWO_PAIR_PLUS:    { _default: { fold: 0.00, call: 0.45, raise: 0.55 },
                            MONOTONE: { fold: 0.00, call: 0.35, raise: 0.65 }, TRIPS: { fold: 0.00, call: 0.60, raise: 0.40 },
                            A_HIGH_DRY: { fold: 0.00, call: 0.50, raise: 0.50 } },
        FULL_HOUSE:       { _default: { fold: 0.00, call: 0.28, raise: 0.72 },
                            TRIPS: { fold: 0.00, call: 0.38, raise: 0.62 },
                            MONOTONE: { fold: 0.00, call: 0.25, raise: 0.75 } },
        QUADS:            { _default: { fold: 0.00, call: 0.65, raise: 0.35 } },
        TRIPS:            { _default: { fold: 0.00, call: 0.40, raise: 0.60 },
                            MONOTONE: { fold: 0.00, call: 0.32, raise: 0.68 } },
        BOARD_TRIPS:      { _default: { fold: 0.00, call: 0.55, raise: 0.45 },
                            TRIPS: { fold: 0.00, call: 0.58, raise: 0.42 } },
        OVERPAIR:         { _default: { fold: 0.00, call: 0.65, raise: 0.35 },
                            A_HIGH_DRY: { fold: 0.00, call: 0.60, raise: 0.40 }, A_HIGH_DYNAMIC: { fold: 0.00, call: 0.70, raise: 0.30 },
                            BROADWAY_DYNAMIC: { fold: 0.00, call: 0.70, raise: 0.30 }, LOW_CONNECTED: { fold: 0.00, call: 0.55, raise: 0.45 },
                            MONOTONE: { fold: 0.05, call: 0.65, raise: 0.30 } },
        TOP_PAIR:         { _default: { fold: 0.02, call: 0.80, raise: 0.18 },
                            A_HIGH_DRY: { fold: 0.00, call: 0.82, raise: 0.18 }, A_HIGH_DYNAMIC: { fold: 0.05, call: 0.78, raise: 0.17 },
                            BROADWAY_STATIC: { fold: 0.02, call: 0.80, raise: 0.18 }, BROADWAY_DYNAMIC: { fold: 0.05, call: 0.78, raise: 0.17 },
                            MID_CONNECTED: { fold: 0.05, call: 0.75, raise: 0.20 }, LOW_CONNECTED: { fold: 0.05, call: 0.72, raise: 0.23 },
                            MONOTONE: { fold: 0.10, call: 0.72, raise: 0.18 } },
        SECOND_PAIR:      { _default: { fold: 0.25, call: 0.65, raise: 0.10 },
                            A_HIGH_DRY: { fold: 0.20, call: 0.70, raise: 0.10 }, BROADWAY_STATIC: { fold: 0.22, call: 0.68, raise: 0.10 },
                            MID_CONNECTED: { fold: 0.30, call: 0.58, raise: 0.12 }, LOW_CONNECTED: { fold: 0.35, call: 0.52, raise: 0.13 },
                            MONOTONE: { fold: 0.35, call: 0.55, raise: 0.10 } },
        THIRD_PAIR:       { _default: { fold: 0.40, call: 0.52, raise: 0.08 },
                            A_HIGH_DRY: { fold: 0.35, call: 0.57, raise: 0.08 }, MID_CONNECTED: { fold: 0.45, call: 0.45, raise: 0.10 },
                            LOW_CONNECTED: { fold: 0.50, call: 0.40, raise: 0.10 }, MONOTONE: { fold: 0.50, call: 0.42, raise: 0.08 } },
        UNDERPAIR:        { _default: { fold: 0.45, call: 0.48, raise: 0.07 },
                            A_HIGH_DRY: { fold: 0.38, call: 0.55, raise: 0.07 }, MID_CONNECTED: { fold: 0.50, call: 0.42, raise: 0.08 },
                            LOW_CONNECTED: { fold: 0.55, call: 0.38, raise: 0.07 }, MONOTONE: { fold: 0.55, call: 0.38, raise: 0.07 } },
        COMBO_DRAW:       { _default: { fold: 0.02, call: 0.55, raise: 0.43 },
                            A_HIGH_DRY: { fold: 0.05, call: 0.60, raise: 0.35 }, MID_CONNECTED: { fold: 0.00, call: 0.48, raise: 0.52 },
                            LOW_CONNECTED: { fold: 0.00, call: 0.45, raise: 0.55 }, MONOTONE: { fold: 0.05, call: 0.50, raise: 0.45 } },
        NFD:              { _default: { fold: 0.03, call: 0.62, raise: 0.35 },
                            A_HIGH_DRY: { fold: 0.05, call: 0.65, raise: 0.30 }, MID_CONNECTED: { fold: 0.02, call: 0.55, raise: 0.43 },
                            MONOTONE: { fold: 0.05, call: 0.58, raise: 0.37 } },
        FD:               { _default: { fold: 0.08, call: 0.70, raise: 0.22 },
                            A_HIGH_DRY: { fold: 0.10, call: 0.72, raise: 0.18 }, MID_CONNECTED: { fold: 0.05, call: 0.65, raise: 0.30 },
                            MONOTONE: { fold: 0.10, call: 0.68, raise: 0.22 } },
        OESD:             { _default: { fold: 0.05, call: 0.68, raise: 0.27 },
                            A_HIGH_DRY: { fold: 0.10, call: 0.70, raise: 0.20 }, BROADWAY_DYNAMIC: { fold: 0.03, call: 0.62, raise: 0.35 },
                            MID_CONNECTED: { fold: 0.03, call: 0.60, raise: 0.37 }, LOW_CONNECTED: { fold: 0.03, call: 0.58, raise: 0.39 } },
        GUTSHOT:          { _default: { fold: 0.30, call: 0.58, raise: 0.12 },
                            A_HIGH_DRY: { fold: 0.35, call: 0.55, raise: 0.10 }, BROADWAY_DYNAMIC: { fold: 0.25, call: 0.60, raise: 0.15 },
                            MID_CONNECTED: { fold: 0.25, call: 0.58, raise: 0.17 } },
        ACE_HIGH_BACKDOOR:{ _default: { fold: 0.35, call: 0.52, raise: 0.13 },
                            A_HIGH_DRY: { fold: 0.25, call: 0.60, raise: 0.15 }, A_HIGH_DYNAMIC: { fold: 0.30, call: 0.55, raise: 0.15 },
                            BROADWAY_STATIC: { fold: 0.30, call: 0.55, raise: 0.15 }, MID_CONNECTED: { fold: 0.40, call: 0.47, raise: 0.13 },
                            LOW_CONNECTED: { fold: 0.45, call: 0.43, raise: 0.12 }, MONOTONE: { fold: 0.42, call: 0.45, raise: 0.13 } },
        OVERCARDS:        { _default: { fold: 0.50, call: 0.40, raise: 0.10 },
                            A_HIGH_DRY: { fold: 0.40, call: 0.48, raise: 0.12 }, BROADWAY_STATIC: { fold: 0.42, call: 0.46, raise: 0.12 },
                            MID_DISCONNECTED: { fold: 0.50, call: 0.40, raise: 0.10 }, LOW_CONNECTED: { fold: 0.60, call: 0.32, raise: 0.08 },
                            MONOTONE: { fold: 0.58, call: 0.34, raise: 0.08 } },
        AIR:              { _default: { fold: 0.72, call: 0.18, raise: 0.10 },
                            A_HIGH_DRY: { fold: 0.65, call: 0.22, raise: 0.13 }, BROADWAY_STATIC: { fold: 0.68, call: 0.20, raise: 0.12 },
                            MID_DISCONNECTED: { fold: 0.72, call: 0.18, raise: 0.10 }, MID_CONNECTED: { fold: 0.78, call: 0.14, raise: 0.08 },
                            LOW_CONNECTED: { fold: 0.82, call: 0.12, raise: 0.06 }, MONOTONE: { fold: 0.78, call: 0.14, raise: 0.08 },
                            TRIPS: { fold: 0.68, call: 0.20, raise: 0.12 } }
    };

    const REASONING = {
        SET: 'Sets should raise for value and protection. Sometimes slow-play on dry boards.',
        TWO_PAIR_PLUS: 'Two pair+ is strong; raise frequently, call to trap on dry textures.',
        FULL_HOUSE: 'Full house is a monster; raise for value, occasionally call to trap.',
        QUADS: 'Quads is the near-nuts; slow-play by calling, or raise to build the pot.',
        TRIPS: 'Trips is strong; raise frequently for value and protection.',
        BOARD_TRIPS: 'Board trips — villain also has trips; raise with strong kickers, call with weak ones.',
        OVERPAIR: 'Overpairs are strong vs a c-bet range; mostly call, raise on wet boards for protection.',
        TOP_PAIR: 'Top pair is a core calling hand. Rarely fold. Raise occasionally for value on dry boards.',
        SECOND_PAIR: 'Second pair is a medium-strength call. Fold on very wet boards.',
        THIRD_PAIR: 'Third/bottom pair is marginal. Call on dry boards, fold on wet/dynamic boards.',
        UNDERPAIR: 'Underpairs are weak. Call sometimes on dry boards, fold on wet textures.',
        COMBO_DRAW: 'Combo draws have excellent equity. Raise as a semi-bluff frequently.',
        NFD: 'Nut flush draws have strong equity. Call or raise as a semi-bluff.',
        FD: 'Flush draws have decent equity. Mostly call, raise occasionally.',
        OESD: 'Open-ended draws have ~32% equity. Call is standard, raise on wet boards.',
        GUTSHOT: 'Gutshots are marginal. Call with good implied odds, fold weak gutshots.',
        ACE_HIGH_BACKDOOR: 'Ace-high with backdoor equity. Call on favorable boards, fold on wet ones.',
        OVERCARDS: 'Two overcards have some equity but no pair. Call sparingly, mostly fold.',
        AIR: 'No made hand or draw. Fold is default; raise-bluff occasionally on PFR-favorable boards.'
    };

    // Family offsets: positive = call wider vs baseline (BTN_vs_BB).
    // Tighter opener range → defender folds more (negative offset).
    // IP defender (CO_vs_BTN: hero is BTN) calls wider due to positional advantage.
    const FAM_OFF = {
        BTN_vs_BB:  0,      // baseline: BTN opens widest, BB defends most
        CO_vs_BB:   0.02,   // CO slightly tighter, small adj
        SB_vs_BB:   0.03,   // BB is IP vs SB; SB range wide → call more
        HJ_vs_BB:  -0.02,   // HJ ~21% range → BB folds slightly more
        LJ_vs_BB:  -0.04,   // LJ ~15% range → fold more
        UTG_vs_BB: -0.06,   // UTG ~12% range, very tight → fold significantly more
        BTN_vs_SB: -0.02,   // SB OOP vs BTN; BTN range wide but positional disadvantage
        CO_vs_BTN:  0.03,   // BTN IP as defender vs CO; position compensates range disadvantage
    };
    // Applied as: fold -= off, call += off*0.5, raise += off*0.5 (then normalised)

    for (const fam of DEFENDER_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const off = FAM_OFF[fam] || 0;

        for (const arch of FLOP_ARCHETYPES) {
            for (const hc of HAND_CLASSES) {
                const hcData = BASE[hc];
                if (!hcData) continue;
                const raw = hcData[arch] || hcData._default;
                if (!raw) continue;

                // Apply family offset
                let fold = Math.max(0, raw.fold - off);
                let call = raw.call + off * 0.5;
                let raise = raw.raise + off * 0.5;
                // Normalize to sum to 1
                const total = fold + call + raise;
                fold = parseFloat((fold / total).toFixed(2));
                call = parseFloat((call / total).toFixed(2));
                raise = parseFloat((1 - fold - call).toFixed(2));
                // Clamp
                fold = Math.max(0, Math.min(1, fold));
                call = Math.max(0, Math.min(1, call));
                raise = Math.max(0, Math.min(1, raise));

                // Determine preferred action
                let preferred;
                if (fold >= call && fold >= raise) preferred = 'fold';
                else if (raise >= call && raise >= fold) preferred = 'raise';
                else preferred = 'call';

                const sk = makePostflopSpotKeyV2({
                    potType:'SRP', preflopFamily:fam, street:'FLOP', heroRole:'DEFENDER',
                    positionState:'OOP', nodeType:'VS_CBET_DECISION',
                    boardArchetype:arch, heroHandClass:hc
                });
                POSTFLOP_DEFEND_VS_CBET[sk] = {
                    actions: { fold, call, raise },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: 'V3.1: Defender vs C-Bet'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[DefendVsCbet] Built ${Object.keys(POSTFLOP_DEFEND_VS_CBET).length} defender strategy entries.`);
    }
})();

(function() {
    const HAND_CLASSES = [
        'OVERPAIR','TOP_PAIR','SECOND_PAIR','THIRD_PAIR','UNDERPAIR','SET','TWO_PAIR_PLUS',
        'FULL_HOUSE','QUADS','TRIPS','BOARD_TRIPS',
        'OESD','GUTSHOT','NFD','FD','COMBO_DRAW','ACE_HIGH_BACKDOOR','OVERCARDS','AIR'
    ];

    // IP 3BP defender: BTN/CO called BB's or SB's 3bet, now has position vs c-bet.
    // Folds less on medium hands, raises more aggressively with strong hands and semi-bluffs.
    const BASE_IP = {
        SET:              { _default:{fold:0.00,call:0.30,raise:0.70}, MONOTONE:{fold:0.00,call:0.25,raise:0.75},
                            TRIPS:{fold:0.00,call:0.50,raise:0.50} },
        TWO_PAIR_PLUS:    { _default:{fold:0.00,call:0.32,raise:0.68}, MONOTONE:{fold:0.00,call:0.28,raise:0.72},
                            TRIPS:{fold:0.00,call:0.55,raise:0.45} },
        FULL_HOUSE:       { _default:{fold:0.00,call:0.22,raise:0.78}, TRIPS:{fold:0.00,call:0.35,raise:0.65} },
        QUADS:            { _default:{fold:0.00,call:0.58,raise:0.42} },
        TRIPS:            { _default:{fold:0.00,call:0.30,raise:0.70}, MONOTONE:{fold:0.00,call:0.28,raise:0.72} },
        BOARD_TRIPS:      { _default:{fold:0.00,call:0.42,raise:0.58} },
        OVERPAIR:         { _default:{fold:0.00,call:0.55,raise:0.45}, A_HIGH_DRY:{fold:0.00,call:0.50,raise:0.50},
                            A_HIGH_DYNAMIC:{fold:0.00,call:0.60,raise:0.40}, MONOTONE:{fold:0.03,call:0.60,raise:0.37},
                            LOW_CONNECTED:{fold:0.00,call:0.48,raise:0.52} },
        TOP_PAIR:         { _default:{fold:0.00,call:0.68,raise:0.32}, A_HIGH_DRY:{fold:0.00,call:0.70,raise:0.30},
                            A_HIGH_DYNAMIC:{fold:0.02,call:0.68,raise:0.30}, MID_CONNECTED:{fold:0.03,call:0.65,raise:0.32},
                            LOW_CONNECTED:{fold:0.03,call:0.62,raise:0.35}, MONOTONE:{fold:0.08,call:0.65,raise:0.27} },
        SECOND_PAIR:      { _default:{fold:0.18,call:0.70,raise:0.12}, A_HIGH_DRY:{fold:0.12,call:0.76,raise:0.12},
                            MID_CONNECTED:{fold:0.22,call:0.65,raise:0.13}, LOW_CONNECTED:{fold:0.28,call:0.60,raise:0.12},
                            MONOTONE:{fold:0.28,call:0.62,raise:0.10} },
        THIRD_PAIR:       { _default:{fold:0.32,call:0.58,raise:0.10}, A_HIGH_DRY:{fold:0.25,call:0.65,raise:0.10},
                            MID_CONNECTED:{fold:0.38,call:0.52,raise:0.10}, LOW_CONNECTED:{fold:0.42,call:0.48,raise:0.10},
                            MONOTONE:{fold:0.40,call:0.50,raise:0.10} },
        UNDERPAIR:        { _default:{fold:0.35,call:0.55,raise:0.10}, A_HIGH_DRY:{fold:0.28,call:0.62,raise:0.10},
                            MID_CONNECTED:{fold:0.42,call:0.48,raise:0.10}, LOW_CONNECTED:{fold:0.48,call:0.42,raise:0.10},
                            MONOTONE:{fold:0.45,call:0.45,raise:0.10} },
        COMBO_DRAW:       { _default:{fold:0.00,call:0.42,raise:0.58}, MID_CONNECTED:{fold:0.00,call:0.38,raise:0.62},
                            MONOTONE:{fold:0.02,call:0.45,raise:0.53} },
        NFD:              { _default:{fold:0.00,call:0.48,raise:0.52}, MONOTONE:{fold:0.03,call:0.52,raise:0.45},
                            MID_CONNECTED:{fold:0.00,call:0.42,raise:0.58} },
        FD:               { _default:{fold:0.03,call:0.58,raise:0.39}, MONOTONE:{fold:0.08,call:0.62,raise:0.30},
                            MID_CONNECTED:{fold:0.02,call:0.52,raise:0.46} },
        OESD:             { _default:{fold:0.02,call:0.55,raise:0.43}, MID_CONNECTED:{fold:0.00,call:0.48,raise:0.52},
                            LOW_CONNECTED:{fold:0.00,call:0.45,raise:0.55} },
        GUTSHOT:          { _default:{fold:0.20,call:0.65,raise:0.15}, A_HIGH_DRY:{fold:0.25,call:0.62,raise:0.13},
                            MID_CONNECTED:{fold:0.18,call:0.65,raise:0.17} },
        ACE_HIGH_BACKDOOR:{ _default:{fold:0.22,call:0.65,raise:0.13}, A_HIGH_DRY:{fold:0.15,call:0.72,raise:0.13},
                            LOW_CONNECTED:{fold:0.30,call:0.58,raise:0.12}, MONOTONE:{fold:0.32,call:0.56,raise:0.12} },
        OVERCARDS:        { _default:{fold:0.38,call:0.50,raise:0.12}, A_HIGH_DRY:{fold:0.28,call:0.60,raise:0.12},
                            LOW_CONNECTED:{fold:0.50,call:0.40,raise:0.10}, MONOTONE:{fold:0.48,call:0.42,raise:0.10} },
        AIR:              { _default:{fold:0.62,call:0.25,raise:0.13}, A_HIGH_DRY:{fold:0.55,call:0.32,raise:0.13},
                            MID_CONNECTED:{fold:0.68,call:0.20,raise:0.12}, LOW_CONNECTED:{fold:0.72,call:0.18,raise:0.10},
                            MONOTONE:{fold:0.68,call:0.22,raise:0.10} }
    };

    // OOP 3BP defender: CO/HJ called BTN's 3bet OOP, faces BTN c-bet with no position.
    // More folding on marginal hands; condensed range means strong hands fold rarely.
    const BASE_OOP = {
        SET:              { _default:{fold:0.00,call:0.42,raise:0.58}, MONOTONE:{fold:0.00,call:0.32,raise:0.68},
                            TRIPS:{fold:0.00,call:0.58,raise:0.42} },
        TWO_PAIR_PLUS:    { _default:{fold:0.00,call:0.48,raise:0.52}, MONOTONE:{fold:0.00,call:0.38,raise:0.62},
                            TRIPS:{fold:0.00,call:0.62,raise:0.38} },
        FULL_HOUSE:       { _default:{fold:0.00,call:0.30,raise:0.70}, TRIPS:{fold:0.00,call:0.40,raise:0.60} },
        QUADS:            { _default:{fold:0.00,call:0.68,raise:0.32} },
        TRIPS:            { _default:{fold:0.00,call:0.42,raise:0.58}, MONOTONE:{fold:0.00,call:0.35,raise:0.65} },
        BOARD_TRIPS:      { _default:{fold:0.00,call:0.58,raise:0.42} },
        OVERPAIR:         { _default:{fold:0.00,call:0.68,raise:0.32}, A_HIGH_DRY:{fold:0.00,call:0.62,raise:0.38},
                            A_HIGH_DYNAMIC:{fold:0.00,call:0.72,raise:0.28}, MONOTONE:{fold:0.05,call:0.68,raise:0.27},
                            LOW_CONNECTED:{fold:0.00,call:0.60,raise:0.40} },
        TOP_PAIR:         { _default:{fold:0.03,call:0.82,raise:0.15}, A_HIGH_DRY:{fold:0.00,call:0.85,raise:0.15},
                            A_HIGH_DYNAMIC:{fold:0.05,call:0.80,raise:0.15}, MID_CONNECTED:{fold:0.07,call:0.77,raise:0.16},
                            LOW_CONNECTED:{fold:0.08,call:0.75,raise:0.17}, MONOTONE:{fold:0.12,call:0.73,raise:0.15} },
        SECOND_PAIR:      { _default:{fold:0.35,call:0.55,raise:0.10}, A_HIGH_DRY:{fold:0.28,call:0.62,raise:0.10},
                            MID_CONNECTED:{fold:0.42,call:0.48,raise:0.10}, LOW_CONNECTED:{fold:0.48,call:0.42,raise:0.10},
                            MONOTONE:{fold:0.45,call:0.45,raise:0.10} },
        THIRD_PAIR:       { _default:{fold:0.50,call:0.42,raise:0.08}, A_HIGH_DRY:{fold:0.42,call:0.50,raise:0.08},
                            MID_CONNECTED:{fold:0.58,call:0.35,raise:0.07}, LOW_CONNECTED:{fold:0.62,call:0.32,raise:0.06},
                            MONOTONE:{fold:0.60,call:0.34,raise:0.06} },
        UNDERPAIR:        { _default:{fold:0.58,call:0.35,raise:0.07}, A_HIGH_DRY:{fold:0.48,call:0.45,raise:0.07},
                            MID_CONNECTED:{fold:0.65,call:0.28,raise:0.07}, LOW_CONNECTED:{fold:0.70,call:0.24,raise:0.06},
                            MONOTONE:{fold:0.68,call:0.26,raise:0.06} },
        COMBO_DRAW:       { _default:{fold:0.02,call:0.58,raise:0.40}, MID_CONNECTED:{fold:0.00,call:0.50,raise:0.50},
                            MONOTONE:{fold:0.05,call:0.52,raise:0.43} },
        NFD:              { _default:{fold:0.03,call:0.65,raise:0.32}, MONOTONE:{fold:0.05,call:0.60,raise:0.35},
                            MID_CONNECTED:{fold:0.02,call:0.58,raise:0.40} },
        FD:               { _default:{fold:0.10,call:0.72,raise:0.18}, MONOTONE:{fold:0.12,call:0.70,raise:0.18},
                            MID_CONNECTED:{fold:0.07,call:0.68,raise:0.25} },
        OESD:             { _default:{fold:0.08,call:0.68,raise:0.24}, MID_CONNECTED:{fold:0.05,call:0.62,raise:0.33},
                            LOW_CONNECTED:{fold:0.05,call:0.60,raise:0.35} },
        GUTSHOT:          { _default:{fold:0.38,call:0.52,raise:0.10}, A_HIGH_DRY:{fold:0.42,call:0.48,raise:0.10},
                            MID_CONNECTED:{fold:0.32,call:0.56,raise:0.12} },
        ACE_HIGH_BACKDOOR:{ _default:{fold:0.42,call:0.47,raise:0.11}, A_HIGH_DRY:{fold:0.32,call:0.56,raise:0.12},
                            LOW_CONNECTED:{fold:0.52,call:0.38,raise:0.10}, MONOTONE:{fold:0.50,call:0.40,raise:0.10} },
        OVERCARDS:        { _default:{fold:0.58,call:0.32,raise:0.10}, A_HIGH_DRY:{fold:0.48,call:0.42,raise:0.10},
                            LOW_CONNECTED:{fold:0.68,call:0.24,raise:0.08}, MONOTONE:{fold:0.65,call:0.27,raise:0.08} },
        AIR:              { _default:{fold:0.80,call:0.13,raise:0.07}, A_HIGH_DRY:{fold:0.72,call:0.18,raise:0.10},
                            MID_CONNECTED:{fold:0.85,call:0.10,raise:0.05}, LOW_CONNECTED:{fold:0.88,call:0.08,raise:0.04},
                            MONOTONE:{fold:0.85,call:0.10,raise:0.05} }
    };

    const REASONING = {
        SET: 'Sets are the nuts in 3BP; raise for value to build the large pot. IP: push aggression; OOP: mix raise/call.',
        TWO_PAIR_PLUS: 'Two pair+ is strong; raise frequently for value in the inflated 3BP pot.',
        FULL_HOUSE: 'Full house — raise for value mostly; rare slow-play on paired boards.',
        QUADS: 'Quads — slow-play by calling to extract maximum value from opponent\'s range.',
        TRIPS: 'Trips — raise for value; opponent\'s polar range has strong holdings too.',
        BOARD_TRIPS: 'Board trips — raise with strong kickers; call to trap on paired boards.',
        OVERPAIR: 'Overpairs are strong in 3BP — caller\'s condensed range rarely has better. IP: raise more; OOP: mostly call.',
        TOP_PAIR: 'Top pair is a strong calling hand in 3BP. Raise more often when IP. Protect against draws.',
        SECOND_PAIR: 'Second pair in 3BP. IP: call freely on dry boards; OOP: fold on wet textures.',
        THIRD_PAIR: 'Third pair is marginal in 3BP. IP: can float position; OOP: mostly fold.',
        UNDERPAIR: 'Underpairs are weak in 3BP. IP: can float on dry boards; OOP: fold frequently.',
        COMBO_DRAW: 'Combo draws have 50%+ equity; semi-bluff raise aggressively in the 3BP pot.',
        NFD: 'Nut flush draws have strong equity in 3BP; raise as semi-bluff or call for implied odds.',
        FD: 'Flush draws have decent equity. IP: mix raise/call; OOP: mostly call and realize equity.',
        OESD: 'OESD has ~32% equity. IP: semi-bluff raise; OOP: mostly call with equity.',
        GUTSHOT: 'Gutshots are marginal in 3BP. IP: occasionally float; OOP: mostly fold.',
        ACE_HIGH_BACKDOOR: 'Ace-high with backdoor draws. IP: can float; OOP: fold on most textures.',
        OVERCARDS: 'Overcards have marginal equity in 3BP. IP: float on favorable boards; OOP: mostly fold.',
        AIR: 'Pure air in 3BP. IP: occasional float or bluff; OOP: fold heavily.'
    };

    // Family offsets: positive = folds less (stronger defense), negative = folds more
    const FAM_OFF = {
        // IP families: BTN/CO who called OOP 3bet. Positive = less folding.
        BTN_CALL_3BP_vs_BB:  0,    // baseline IP defender vs BB's c-bet
        BTN_CALL_3BP_vs_SB:  0.01, // SB 3bet range is slightly stronger, but BTN still IP
        CO_CALL_3BP_vs_BB:  -0.01, // CO vs BB: slight adjustment (CO's calling range vs BB 3bet)
        // OOP families: CO/HJ who called BTN's 3bet. No adjustments needed (pure OOP).
        CO_CALL_3BP_vs_BTN:  0,
        HJ_CALL_3BP_vs_BTN:  0.02  // HJ called BTN 3bet with even tighter range → stronger hands
    };

    for (const fam of HERO_HAND_AWARE_3BP_DEFEND_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const off = FAM_OFF[fam] || 0;
        const BASE = fi.positionState === 'IP' ? BASE_IP : BASE_OOP;

        for (const arch of FLOP_ARCHETYPES) {
            for (const hc of HAND_CLASSES) {
                const hcData = BASE[hc];
                if (!hcData) continue;
                const raw = hcData[arch] || hcData._default;
                if (!raw) continue;

                // Apply family offset (positive = less folding)
                let fold = Math.max(0, raw.fold - off);
                let call = raw.call + off * 0.5;
                let raise = raw.raise + off * 0.5;
                // Normalize
                const total = fold + call + raise;
                fold = parseFloat((fold / total).toFixed(2));
                call = parseFloat((call / total).toFixed(2));
                raise = parseFloat((1 - fold - call).toFixed(2));
                fold  = Math.max(0, Math.min(1, fold));
                call  = Math.max(0, Math.min(1, call));
                raise = Math.max(0, Math.min(1, raise));

                let preferred;
                if (fold >= call && fold >= raise) preferred = 'fold';
                else if (raise >= call && raise >= fold) preferred = 'raise';
                else preferred = 'call';

                const sk = makePostflopSpotKeyV2({
                    potType:'3BP', preflopFamily:fam, street:'FLOP', heroRole:'DEFENDER',
                    positionState: fi.positionState, nodeType:'VS_CBET_DECISION',
                    boardArchetype:arch, heroHandClass:hc
                });
                POSTFLOP_3BP_DEFEND_VS_CBET[sk] = {
                    actions: { fold, call, raise },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: fi.positionState === 'IP' ? '3BP IP Defender vs C-Bet' : '3BP OOP Defender vs C-Bet'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[3BP Defend] Built ${Object.keys(POSTFLOP_3BP_DEFEND_VS_CBET).length} entries across ${HERO_HAND_AWARE_3BP_DEFEND_FAMILIES.size} families.`);
    }
})();

(function() {
    // Base IP frequencies for bet50 (50% pot) on the turn
    // Format: { handClass: { turnFamily: freq } }  _default is fallback
    const BASE_IP = {
        STRAIGHT_FLUSH: { _default: 0.90 },
        QUADS:         { _default: 0.88 },
        FULL_HOUSE:    { _default: 0.88, FLUSH_COMPLETE: 0.82, STRAIGHT_COMPLETE: 0.80 },
        FLUSH:         { _default: 0.85, FLUSH_COMPLETE: 0.80 },
        STRAIGHT:      { _default: 0.78 },
        SET:           { _default: 0.85, FLUSH_COMPLETE: 0.75, STRAIGHT_COMPLETE: 0.70 },
        TRIPS:         { _default: 0.82, FLUSH_COMPLETE: 0.72, STRAIGHT_COMPLETE: 0.68,
                         BOARD_PAIR: 0.80, ACE_OVERCARD: 0.75, BROADWAY_OVERCARD: 0.78 },
        BOARD_TRIPS:   { _default: 0.48, BRICK: 0.52, LOW_BLANK: 0.55, FLUSH_COMPLETE: 0.32,
                         STRAIGHT_COMPLETE: 0.28, ACE_OVERCARD: 0.38, BROADWAY_OVERCARD: 0.42,
                         OVERCARD: 0.40, BOARD_PAIR: 0.45, DYNAMIC_CONNECTOR: 0.40 },
        TWO_PAIR:      { _default: 0.78, FLUSH_COMPLETE: 0.65, STRAIGHT_COMPLETE: 0.62, ACE_OVERCARD: 0.70 },
        OVERPAIR:      { _default: 0.70, ACE_OVERCARD: 0.30, FLUSH_COMPLETE: 0.55, STRAIGHT_COMPLETE: 0.50,
                         BROADWAY_OVERCARD: 0.58, OVERCARD: 0.55, BOARD_PAIR: 0.65, DYNAMIC_CONNECTOR: 0.62 },
        TOP_PAIR:      { _default: 0.58, BRICK: 0.62, LOW_BLANK: 0.65, ACE_OVERCARD: 0.35,
                         FLUSH_COMPLETE: 0.40, STRAIGHT_COMPLETE: 0.38, BROADWAY_OVERCARD: 0.45,
                         OVERCARD: 0.45, BOARD_PAIR: 0.52, DYNAMIC_CONNECTOR: 0.48 },
        SECOND_PAIR:   { _default: 0.28, BRICK: 0.32, LOW_BLANK: 0.35, ACE_OVERCARD: 0.18,
                         FLUSH_COMPLETE: 0.18, STRAIGHT_COMPLETE: 0.15, BROADWAY_OVERCARD: 0.22,
                         OVERCARD: 0.20, BOARD_PAIR: 0.25, DYNAMIC_CONNECTOR: 0.25 },
        THIRD_PAIR:    { _default: 0.18, BRICK: 0.22, LOW_BLANK: 0.25, ACE_OVERCARD: 0.10,
                         FLUSH_COMPLETE: 0.10, STRAIGHT_COMPLETE: 0.08, BOARD_PAIR: 0.18 },
        UNDERPAIR:     { _default: 0.20, BRICK: 0.24, LOW_BLANK: 0.28, ACE_OVERCARD: 0.10,
                         FLUSH_COMPLETE: 0.12, STRAIGHT_COMPLETE: 0.10, BOARD_PAIR: 0.20 },
        COMBO_DRAW:    { _default: 0.75, BRICK: 0.78, FLUSH_COMPLETE: 0.55, STRAIGHT_COMPLETE: 0.55,
                         ACE_OVERCARD: 0.65, BROADWAY_OVERCARD: 0.70, DYNAMIC_CONNECTOR: 0.80 },
        STRONG_DRAW:   { _default: 0.65, BRICK: 0.68, LOW_BLANK: 0.70, FLUSH_COMPLETE: 0.50,
                         STRAIGHT_COMPLETE: 0.50, ACE_OVERCARD: 0.55, BROADWAY_OVERCARD: 0.58,
                         DYNAMIC_CONNECTOR: 0.72, BOARD_PAIR: 0.62 },
        OESD:          { _default: 0.52, BRICK: 0.55, LOW_BLANK: 0.58, FLUSH_COMPLETE: 0.38,
                         STRAIGHT_COMPLETE: 0.35, ACE_OVERCARD: 0.45, BROADWAY_OVERCARD: 0.48 },
        GUTSHOT:       { _default: 0.32, BRICK: 0.35, LOW_BLANK: 0.38, FLUSH_COMPLETE: 0.22,
                         STRAIGHT_COMPLETE: 0.20, ACE_OVERCARD: 0.28, BROADWAY_OVERCARD: 0.30 },
        ACE_HIGH:      { _default: 0.42, BRICK: 0.48, LOW_BLANK: 0.50, ACE_OVERCARD: 0.30,
                         FLUSH_COMPLETE: 0.28, STRAIGHT_COMPLETE: 0.25, BROADWAY_OVERCARD: 0.38,
                         OVERCARD: 0.35, BOARD_PAIR: 0.40, DYNAMIC_CONNECTOR: 0.38 },
        OVERCARDS:     { _default: 0.28, BRICK: 0.32, LOW_BLANK: 0.35, ACE_OVERCARD: 0.18,
                         FLUSH_COMPLETE: 0.18, STRAIGHT_COMPLETE: 0.15, BROADWAY_OVERCARD: 0.22,
                         OVERCARD: 0.20, BOARD_PAIR: 0.25, DYNAMIC_CONNECTOR: 0.25 },
        AIR:           { _default: 0.22, BRICK: 0.26, LOW_BLANK: 0.30, ACE_OVERCARD: 0.12,
                         FLUSH_COMPLETE: 0.12, STRAIGHT_COMPLETE: 0.10, BROADWAY_OVERCARD: 0.18,
                         OVERCARD: 0.15, BOARD_PAIR: 0.20, DYNAMIC_CONNECTOR: 0.18 }
    };

    // OOP PFR: reduce bet frequency ~12-15pp across the board
    const BASE_OOP = {
        STRAIGHT_FLUSH: { _default: 0.80 },
        QUADS:         { _default: 0.78 },
        FULL_HOUSE:    { _default: 0.78, FLUSH_COMPLETE: 0.70, STRAIGHT_COMPLETE: 0.68 },
        FLUSH:         { _default: 0.75, FLUSH_COMPLETE: 0.68 },
        STRAIGHT:      { _default: 0.68 },
        SET:           { _default: 0.75, FLUSH_COMPLETE: 0.62, STRAIGHT_COMPLETE: 0.58 },
        TRIPS:         { _default: 0.70, FLUSH_COMPLETE: 0.58, STRAIGHT_COMPLETE: 0.55,
                         BOARD_PAIR: 0.68, ACE_OVERCARD: 0.62, BROADWAY_OVERCARD: 0.65 },
        BOARD_TRIPS:   { _default: 0.35, BRICK: 0.40, LOW_BLANK: 0.42, FLUSH_COMPLETE: 0.22,
                         STRAIGHT_COMPLETE: 0.18, ACE_OVERCARD: 0.28, BROADWAY_OVERCARD: 0.30,
                         OVERCARD: 0.28, BOARD_PAIR: 0.32 },
        TWO_PAIR:      { _default: 0.66, FLUSH_COMPLETE: 0.52, STRAIGHT_COMPLETE: 0.50 },
        OVERPAIR:      { _default: 0.56, ACE_OVERCARD: 0.22, FLUSH_COMPLETE: 0.42, STRAIGHT_COMPLETE: 0.38,
                         BROADWAY_OVERCARD: 0.44, OVERCARD: 0.42, BOARD_PAIR: 0.50 },
        TOP_PAIR:      { _default: 0.44, BRICK: 0.48, LOW_BLANK: 0.52, ACE_OVERCARD: 0.25,
                         FLUSH_COMPLETE: 0.28, STRAIGHT_COMPLETE: 0.25, BROADWAY_OVERCARD: 0.32,
                         OVERCARD: 0.30, BOARD_PAIR: 0.38, DYNAMIC_CONNECTOR: 0.35 },
        SECOND_PAIR:   { _default: 0.18, BRICK: 0.22, LOW_BLANK: 0.25, ACE_OVERCARD: 0.10,
                         FLUSH_COMPLETE: 0.10, STRAIGHT_COMPLETE: 0.08 },
        THIRD_PAIR:    { _default: 0.10, BRICK: 0.14, ACE_OVERCARD: 0.05, FLUSH_COMPLETE: 0.05 },
        UNDERPAIR:     { _default: 0.12, BRICK: 0.16, ACE_OVERCARD: 0.05, FLUSH_COMPLETE: 0.06 },
        COMBO_DRAW:    { _default: 0.62, BRICK: 0.65, FLUSH_COMPLETE: 0.44, STRAIGHT_COMPLETE: 0.42,
                         ACE_OVERCARD: 0.52, BROADWAY_OVERCARD: 0.56, DYNAMIC_CONNECTOR: 0.68 },
        STRONG_DRAW:   { _default: 0.52, BRICK: 0.55, FLUSH_COMPLETE: 0.38, STRAIGHT_COMPLETE: 0.36,
                         ACE_OVERCARD: 0.42, BROADWAY_OVERCARD: 0.46, DYNAMIC_CONNECTOR: 0.58 },
        OESD:          { _default: 0.40, BRICK: 0.44, FLUSH_COMPLETE: 0.28, STRAIGHT_COMPLETE: 0.24,
                         ACE_OVERCARD: 0.34, BROADWAY_OVERCARD: 0.36 },
        GUTSHOT:       { _default: 0.22, BRICK: 0.26, FLUSH_COMPLETE: 0.14, STRAIGHT_COMPLETE: 0.12,
                         ACE_OVERCARD: 0.18 },
        ACE_HIGH:      { _default: 0.30, BRICK: 0.36, LOW_BLANK: 0.40, ACE_OVERCARD: 0.20,
                         FLUSH_COMPLETE: 0.18, STRAIGHT_COMPLETE: 0.14 },
        OVERCARDS:     { _default: 0.18, BRICK: 0.22, LOW_BLANK: 0.26, ACE_OVERCARD: 0.10,
                         FLUSH_COMPLETE: 0.10, STRAIGHT_COMPLETE: 0.08 },
        AIR:           { _default: 0.14, BRICK: 0.18, LOW_BLANK: 0.22, ACE_OVERCARD: 0.06,
                         FLUSH_COMPLETE: 0.06, STRAIGHT_COMPLETE: 0.04 }
    };

    const TURN_REASONING = {
        STRAIGHT_FLUSH: 'Straight flush — the virtual nuts. Bet for maximum value on every turn.',
        QUADS:        'Quads — near-unbeatable. Bet or slow-play to extract maximum value.',
        FULL_HOUSE:   'Full house — near-nutted. Bet for value; consider sizing up on safe runouts.',
        FLUSH:        'Flush made — bet for value. Occasionally check back to balance.',
        STRAIGHT:     'Straight made — bet for value on most turns.',
        SET:          'Set is extremely strong — value bet consistently. Slow-play on scary boards.',
        TRIPS:        'Hero-made trips on a paired board — bet for value consistently.',
        BOARD_TRIPS:  'Trips are on the board — this is a kicker / showdown-value spot. Bet selectively with strong kickers.',
        TWO_PAIR:     'Two pair is strong — bet for value and protection.',
        OVERPAIR:     'Overpair is a solid value hand on safe turns.',
        TOP_PAIR:     'Top pair is a core value/protection hand.',
        SECOND_PAIR:  'Second pair has limited value. Checking is usually preferred.',
        THIRD_PAIR:   'Third pair is weak — mostly check to see the river cheaply.',
        UNDERPAIR:    'Underpair is marginal — mostly check for pot control.',
        COMBO_DRAW:   'Combo draw has excellent equity — semi-bluff frequently.',
        STRONG_DRAW:  'Flush draw on the turn — semi-bluff on favorable turns.',
        OESD:         'OESD — semi-bluff as balanced barrel.',
        GUTSHOT:      'Gutshot — selective bluffs only, mostly check.',
        ACE_HIGH:     'Ace-high with no pair — bluff on safe turns, check on scary ones.',
        OVERCARDS:    'Overcards only — bluff occasionally on safe turns, mostly check.',
        AIR:          'No hand — give up unless the turn is very favorable for a bluff.'
    };

    // Family offsets (applied to IP base — OOP already uses lower base)
    const FAMILY_OFF = {
        BTN_vs_BB: 0, CO_vs_BB: -0.03, HJ_vs_BB: -0.02, LJ_vs_BB: -0.01,
        UTG_vs_BB: 0.02, BTN_vs_SB: 0.02, SB_vs_BB: 0, CO_vs_BTN: -0.03
    };

    for (const fam of HERO_HAND_AWARE_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;
        const baseTable = fi.positionState === 'OOP' ? BASE_OOP : BASE_IP;

        for (const tf of TURN_FAMILIES) {
            for (const hc of TURN_HAND_CLASSES) {
                const baseFreqs = baseTable[hc];
                if (!baseFreqs) continue;
                const raw = (baseFreqs[tf] !== undefined) ? baseFreqs[tf] : baseFreqs._default;
                const bet = Math.max(0.05, Math.min(0.95, parseFloat((raw + famOff).toFixed(2))));
                const chk = parseFloat((1 - bet).toFixed(2));
                const preferred = bet >= 0.50 ? 'bet50' : 'check';
                const sk = makeTurnCBetSpotKeyV1({
                    preflopFamily: fam, positionState: fi.positionState,
                    turnFamily: tf, heroHandClass: hc
                });
                POSTFLOP_TURN_STRATEGY[sk] = {
                    actions: { check: chk, bet50: bet },
                    preferredAction: preferred,
                    reasoning: TURN_REASONING[hc] || '',
                    simplification: 'Phase 2: Turn Barrel (50% pot)'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[TurnV1] Built ${Object.keys(POSTFLOP_TURN_STRATEGY).length} PFR turn strategy entries.`);
    }
})();

(function() {
    const BASE = {
        STRAIGHT_FLUSH: { _default: { fold: 0.00, call: 0.15, raise: 0.85 } },
        QUADS:        { _default: { fold: 0.00, call: 0.20, raise: 0.80 } },
        FULL_HOUSE:   { _default: { fold: 0.00, call: 0.25, raise: 0.75 },
                        FLUSH_COMPLETE: { fold: 0.00, call: 0.22, raise: 0.78 } },
        FLUSH:        { _default: { fold: 0.00, call: 0.30, raise: 0.70 } },
        STRAIGHT:     { _default: { fold: 0.00, call: 0.35, raise: 0.65 } },
        SET:          { _default: { fold: 0.00, call: 0.38, raise: 0.62 },
                        FLUSH_COMPLETE: { fold: 0.00, call: 0.30, raise: 0.70 } },
        TRIPS:        { _default: { fold: 0.00, call: 0.35, raise: 0.65 },
                        FLUSH_COMPLETE: { fold: 0.00, call: 0.28, raise: 0.72 },
                        STRAIGHT_COMPLETE: { fold: 0.00, call: 0.30, raise: 0.70 } },
        BOARD_TRIPS:  { _default: { fold: 0.10, call: 0.65, raise: 0.25 },
                        BRICK: { fold: 0.08, call: 0.68, raise: 0.24 },
                        FLUSH_COMPLETE: { fold: 0.18, call: 0.60, raise: 0.22 },
                        STRAIGHT_COMPLETE: { fold: 0.20, call: 0.58, raise: 0.22 },
                        ACE_OVERCARD: { fold: 0.15, call: 0.62, raise: 0.23 } },
        TWO_PAIR:     { _default: { fold: 0.00, call: 0.50, raise: 0.50 },
                        FLUSH_COMPLETE: { fold: 0.05, call: 0.55, raise: 0.40 },
                        STRAIGHT_COMPLETE: { fold: 0.05, call: 0.58, raise: 0.37 } },
        OVERPAIR:     { _default: { fold: 0.00, call: 0.72, raise: 0.28 },
                        ACE_OVERCARD: { fold: 0.00, call: 0.80, raise: 0.20 },
                        FLUSH_COMPLETE: { fold: 0.05, call: 0.72, raise: 0.23 },
                        STRAIGHT_COMPLETE: { fold: 0.08, call: 0.72, raise: 0.20 },
                        BROADWAY_OVERCARD: { fold: 0.00, call: 0.76, raise: 0.24 } },
        TOP_PAIR:     { _default: { fold: 0.08, call: 0.78, raise: 0.14 },
                        BRICK: { fold: 0.05, call: 0.82, raise: 0.13 },
                        LOW_BLANK: { fold: 0.04, call: 0.83, raise: 0.13 },
                        ACE_OVERCARD: { fold: 0.18, call: 0.72, raise: 0.10 },
                        FLUSH_COMPLETE: { fold: 0.20, call: 0.68, raise: 0.12 },
                        STRAIGHT_COMPLETE: { fold: 0.22, call: 0.67, raise: 0.11 },
                        BROADWAY_OVERCARD: { fold: 0.15, call: 0.73, raise: 0.12 } },
        SECOND_PAIR:  { _default: { fold: 0.40, call: 0.50, raise: 0.10 },
                        BRICK: { fold: 0.35, call: 0.55, raise: 0.10 },
                        ACE_OVERCARD: { fold: 0.52, call: 0.40, raise: 0.08 },
                        FLUSH_COMPLETE: { fold: 0.55, call: 0.38, raise: 0.07 },
                        STRAIGHT_COMPLETE: { fold: 0.58, call: 0.35, raise: 0.07 } },
        THIRD_PAIR:   { _default: { fold: 0.60, call: 0.33, raise: 0.07 },
                        BRICK: { fold: 0.55, call: 0.38, raise: 0.07 },
                        FLUSH_COMPLETE: { fold: 0.70, call: 0.23, raise: 0.07 } },
        UNDERPAIR:    { _default: { fold: 0.65, call: 0.28, raise: 0.07 },
                        BRICK: { fold: 0.60, call: 0.33, raise: 0.07 } },
        COMBO_DRAW:   { _default: { fold: 0.02, call: 0.50, raise: 0.48 },
                        FLUSH_COMPLETE: { fold: 0.08, call: 0.50, raise: 0.42 },
                        STRAIGHT_COMPLETE: { fold: 0.08, call: 0.48, raise: 0.44 } },
        STRONG_DRAW:  { _default: { fold: 0.08, call: 0.62, raise: 0.30 },
                        FLUSH_COMPLETE: { fold: 0.12, call: 0.60, raise: 0.28 },
                        BRICK: { fold: 0.06, call: 0.65, raise: 0.29 } },
        OESD:         { _default: { fold: 0.18, call: 0.62, raise: 0.20 },
                        STRAIGHT_COMPLETE: { fold: 0.10, call: 0.52, raise: 0.38 }, // improved
                        BRICK: { fold: 0.15, call: 0.65, raise: 0.20 } },
        GUTSHOT:      { _default: { fold: 0.48, call: 0.42, raise: 0.10 },
                        BRICK: { fold: 0.42, call: 0.48, raise: 0.10 } },
        ACE_HIGH:     { _default: { fold: 0.52, call: 0.38, raise: 0.10 },
                        BRICK: { fold: 0.45, call: 0.44, raise: 0.11 } },
        OVERCARDS:    { _default: { fold: 0.65, call: 0.28, raise: 0.07 },
                        BRICK: { fold: 0.58, call: 0.34, raise: 0.08 } },
        AIR:          { _default: { fold: 0.82, call: 0.12, raise: 0.06 },
                        BRICK: { fold: 0.75, call: 0.16, raise: 0.09 } }
    };

    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush — raise for maximum value.',
        QUADS:        'Quads — raise to build the pot.',
        FULL_HOUSE:   'Full house — raise for value.',
        FLUSH:        'Made flush — raise for value, or flat to trap.',
        STRAIGHT:     'Made straight — raise for value, or flat to keep bluffs in.',
        SET:          'Set is very strong — raise or flat to build the pot.',
        TRIPS:        'Hero-made trips — strong value hand. Raise or call confidently.',
        BOARD_TRIPS:  'Trips are on the board — kicker and blockers matter. Mostly call; raise only with premium kickers.',
        TWO_PAIR:     'Two pair — raise for value, call on scary runouts.',
        OVERPAIR:     'Overpair is strong — mostly call.',
        TOP_PAIR:     'Top pair is mainly a calling hand here.',
        SECOND_PAIR:  'Second pair is marginal — call only on safe turns.',
        THIRD_PAIR:   'Third pair is weak — mostly fold facing a second barrel.',
        UNDERPAIR:    'Underpair is too weak for most turn calls.',
        COMBO_DRAW:   'Combo draw — raise as semi-bluff; you have outs and fold equity.',
        STRONG_DRAW:  'Flush draw — call often; raise as semi-bluff occasionally.',
        OESD:         'OESD — call with good pot odds. Raise on very favorable turns.',
        GUTSHOT:      'Gutshot alone — thin equity; mostly fold unless pot odds are excellent.',
        ACE_HIGH:     'Ace-high — fold to most turn bets without a draw.',
        OVERCARDS:    'Overcards only — usually fold on the turn.',
        AIR:          'No hand — fold. Raise-bluff is occasionally correct on safe boards.'
    };

    // Family offsets: positive = call wider. Tighter opener → more folding (negative).
    const FAM_OFF = {
        BTN_vs_BB:  0,     CO_vs_BB:   0.02,  SB_vs_BB:   0.03,
        HJ_vs_BB:  -0.02,  LJ_vs_BB:  -0.04,  UTG_vs_BB: -0.06,
        BTN_vs_SB: -0.02,  CO_vs_BTN:  0.03,
    };

    for (const fam of DEFENDER_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const off = FAM_OFF[fam] || 0;

        for (const tf of TURN_FAMILIES) {
            for (const hc of TURN_HAND_CLASSES) {
                const hcData = BASE[hc];
                if (!hcData) continue;
                const raw = hcData[tf] || hcData._default;
                if (!raw) continue;

                let fold  = Math.max(0, raw.fold - off);
                let call  = raw.call + off * 0.5;
                let raise = raw.raise + off * 0.5;
                const total = fold + call + raise;
                fold  = parseFloat((fold  / total).toFixed(2));
                call  = parseFloat((call  / total).toFixed(2));
                raise = parseFloat((1 - fold - call).toFixed(2));
                fold  = Math.max(0, Math.min(1, fold));
                call  = Math.max(0, Math.min(1, call));
                raise = Math.max(0, Math.min(1, raise));

                let preferred;
                if (fold >= call && fold >= raise) preferred = 'fold';
                else if (raise >= call && raise >= fold) preferred = 'raise';
                else preferred = 'call';

                const sk = makeTurnDefendSpotKeyV1({
                    preflopFamily: fam, turnFamily: tf, heroHandClass: hc
                });
                POSTFLOP_TURN_DEFEND_STRATEGY[sk] = {
                    actions: { fold, call, raise },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: 'Phase 2: Turn Defender vs Bet'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[TurnV1] Built ${Object.keys(POSTFLOP_TURN_DEFEND_STRATEGY).length} defender turn strategy entries.`);
    }
})();

(function() {
    const BASE_IP = {
        STRAIGHT_FLUSH: { _default: 0.92 },
        QUADS:          { _default: 0.90 },
        FULL_HOUSE:     { _default: 0.90, FLUSH_COMPLETE: 0.85, STRAIGHT_COMPLETE: 0.83 },
        FLUSH:          { _default: 0.88, FLUSH_COMPLETE: 0.83 },
        STRAIGHT:       { _default: 0.82 },
        SET:            { _default: 0.90, FLUSH_COMPLETE: 0.80, STRAIGHT_COMPLETE: 0.76 },
        TRIPS:          { _default: 0.86, FLUSH_COMPLETE: 0.76, STRAIGHT_COMPLETE: 0.72,
                          BOARD_PAIR: 0.84, ACE_OVERCARD: 0.78, BROADWAY_OVERCARD: 0.82 },
        BOARD_TRIPS:    { _default: 0.52, BRICK: 0.56, LOW_BLANK: 0.60, FLUSH_COMPLETE: 0.36,
                          STRAIGHT_COMPLETE: 0.32, ACE_OVERCARD: 0.42, BROADWAY_OVERCARD: 0.46,
                          OVERCARD: 0.44, BOARD_PAIR: 0.50, DYNAMIC_CONNECTOR: 0.44 },
        TWO_PAIR:       { _default: 0.82, FLUSH_COMPLETE: 0.69, STRAIGHT_COMPLETE: 0.66, ACE_OVERCARD: 0.74 },
        OVERPAIR:       { _default: 0.76, ACE_OVERCARD: 0.36, FLUSH_COMPLETE: 0.60, STRAIGHT_COMPLETE: 0.55,
                          BROADWAY_OVERCARD: 0.63, OVERCARD: 0.60, BOARD_PAIR: 0.70, DYNAMIC_CONNECTOR: 0.67 },
        TOP_PAIR:       { _default: 0.64, BRICK: 0.68, LOW_BLANK: 0.72, ACE_OVERCARD: 0.40,
                          FLUSH_COMPLETE: 0.45, STRAIGHT_COMPLETE: 0.42, BROADWAY_OVERCARD: 0.50,
                          OVERCARD: 0.50, BOARD_PAIR: 0.58, DYNAMIC_CONNECTOR: 0.54 },
        SECOND_PAIR:    { _default: 0.32, BRICK: 0.36, LOW_BLANK: 0.40, ACE_OVERCARD: 0.22,
                          FLUSH_COMPLETE: 0.22, STRAIGHT_COMPLETE: 0.18, BROADWAY_OVERCARD: 0.26,
                          OVERCARD: 0.24, BOARD_PAIR: 0.28, DYNAMIC_CONNECTOR: 0.28 },
        THIRD_PAIR:     { _default: 0.20, BRICK: 0.24, LOW_BLANK: 0.28, ACE_OVERCARD: 0.12,
                          FLUSH_COMPLETE: 0.12, STRAIGHT_COMPLETE: 0.10, BOARD_PAIR: 0.20 },
        UNDERPAIR:      { _default: 0.22, BRICK: 0.28, LOW_BLANK: 0.32, ACE_OVERCARD: 0.12,
                          FLUSH_COMPLETE: 0.14, STRAIGHT_COMPLETE: 0.12, BOARD_PAIR: 0.22 },
        COMBO_DRAW:     { _default: 0.80, BRICK: 0.83, FLUSH_COMPLETE: 0.60, STRAIGHT_COMPLETE: 0.60,
                          ACE_OVERCARD: 0.70, BROADWAY_OVERCARD: 0.75, DYNAMIC_CONNECTOR: 0.85 },
        STRONG_DRAW:    { _default: 0.70, BRICK: 0.73, LOW_BLANK: 0.75, FLUSH_COMPLETE: 0.55,
                          STRAIGHT_COMPLETE: 0.55, ACE_OVERCARD: 0.60, BROADWAY_OVERCARD: 0.63,
                          DYNAMIC_CONNECTOR: 0.77, BOARD_PAIR: 0.67 },
        OESD:           { _default: 0.57, BRICK: 0.60, LOW_BLANK: 0.63, FLUSH_COMPLETE: 0.43,
                          STRAIGHT_COMPLETE: 0.40, ACE_OVERCARD: 0.50, BROADWAY_OVERCARD: 0.53 },
        GUTSHOT:        { _default: 0.36, BRICK: 0.40, LOW_BLANK: 0.43, FLUSH_COMPLETE: 0.26,
                          STRAIGHT_COMPLETE: 0.24, ACE_OVERCARD: 0.32, BROADWAY_OVERCARD: 0.34 },
        ACE_HIGH:       { _default: 0.48, BRICK: 0.54, LOW_BLANK: 0.56, ACE_OVERCARD: 0.35,
                          FLUSH_COMPLETE: 0.32, STRAIGHT_COMPLETE: 0.28, BROADWAY_OVERCARD: 0.43,
                          OVERCARD: 0.40, BOARD_PAIR: 0.45, DYNAMIC_CONNECTOR: 0.43 },
        OVERCARDS:      { _default: 0.33, BRICK: 0.37, LOW_BLANK: 0.40, ACE_OVERCARD: 0.22,
                          FLUSH_COMPLETE: 0.22, STRAIGHT_COMPLETE: 0.18, BROADWAY_OVERCARD: 0.26,
                          OVERCARD: 0.24, BOARD_PAIR: 0.28, DYNAMIC_CONNECTOR: 0.28 },
        AIR:            { _default: 0.28, BRICK: 0.32, LOW_BLANK: 0.36, ACE_OVERCARD: 0.16,
                          FLUSH_COMPLETE: 0.16, STRAIGHT_COMPLETE: 0.14, BROADWAY_OVERCARD: 0.23,
                          OVERCARD: 0.20, BOARD_PAIR: 0.25, DYNAMIC_CONNECTOR: 0.23 }
    };

    const BASE_OOP = {
        STRAIGHT_FLUSH: { _default: 0.86 },
        QUADS:          { _default: 0.84 },
        FULL_HOUSE:     { _default: 0.84, FLUSH_COMPLETE: 0.76, STRAIGHT_COMPLETE: 0.74 },
        FLUSH:          { _default: 0.81, FLUSH_COMPLETE: 0.74 },
        STRAIGHT:       { _default: 0.74 },
        SET:            { _default: 0.81, FLUSH_COMPLETE: 0.68, STRAIGHT_COMPLETE: 0.64 },
        TRIPS:          { _default: 0.76, FLUSH_COMPLETE: 0.64, STRAIGHT_COMPLETE: 0.61,
                          BOARD_PAIR: 0.74, ACE_OVERCARD: 0.68, BROADWAY_OVERCARD: 0.71 },
        BOARD_TRIPS:    { _default: 0.40, BRICK: 0.46, LOW_BLANK: 0.48, FLUSH_COMPLETE: 0.27,
                          STRAIGHT_COMPLETE: 0.23, ACE_OVERCARD: 0.33, BROADWAY_OVERCARD: 0.36,
                          OVERCARD: 0.33, BOARD_PAIR: 0.37 },
        TWO_PAIR:       { _default: 0.72, FLUSH_COMPLETE: 0.58, STRAIGHT_COMPLETE: 0.56 },
        OVERPAIR:       { _default: 0.62, ACE_OVERCARD: 0.27, FLUSH_COMPLETE: 0.48,
                          STRAIGHT_COMPLETE: 0.44, BROADWAY_OVERCARD: 0.50, OVERCARD: 0.48, BOARD_PAIR: 0.56 },
        TOP_PAIR:       { _default: 0.50, BRICK: 0.54, LOW_BLANK: 0.58, ACE_OVERCARD: 0.30,
                          FLUSH_COMPLETE: 0.33, STRAIGHT_COMPLETE: 0.30, BROADWAY_OVERCARD: 0.37,
                          OVERCARD: 0.35, BOARD_PAIR: 0.44, DYNAMIC_CONNECTOR: 0.41 },
        SECOND_PAIR:    { _default: 0.22, BRICK: 0.27, LOW_BLANK: 0.30, ACE_OVERCARD: 0.14,
                          FLUSH_COMPLETE: 0.14, STRAIGHT_COMPLETE: 0.12 },
        THIRD_PAIR:     { _default: 0.14, BRICK: 0.18, ACE_OVERCARD: 0.07, FLUSH_COMPLETE: 0.07 },
        UNDERPAIR:      { _default: 0.16, BRICK: 0.20, ACE_OVERCARD: 0.07, FLUSH_COMPLETE: 0.08 },
        COMBO_DRAW:     { _default: 0.68, BRICK: 0.71, FLUSH_COMPLETE: 0.50, STRAIGHT_COMPLETE: 0.48,
                          ACE_OVERCARD: 0.58, BROADWAY_OVERCARD: 0.62, DYNAMIC_CONNECTOR: 0.74 },
        STRONG_DRAW:    { _default: 0.58, BRICK: 0.61, FLUSH_COMPLETE: 0.44, STRAIGHT_COMPLETE: 0.42,
                          ACE_OVERCARD: 0.48, BROADWAY_OVERCARD: 0.52, DYNAMIC_CONNECTOR: 0.64 },
        OESD:           { _default: 0.46, BRICK: 0.50, FLUSH_COMPLETE: 0.34,
                          STRAIGHT_COMPLETE: 0.30, ACE_OVERCARD: 0.40, BROADWAY_OVERCARD: 0.42 },
        GUTSHOT:        { _default: 0.27, BRICK: 0.31, FLUSH_COMPLETE: 0.18,
                          STRAIGHT_COMPLETE: 0.16, ACE_OVERCARD: 0.22 },
        ACE_HIGH:       { _default: 0.36, BRICK: 0.42, LOW_BLANK: 0.46, ACE_OVERCARD: 0.25,
                          FLUSH_COMPLETE: 0.22, STRAIGHT_COMPLETE: 0.18 },
        OVERCARDS:      { _default: 0.22, BRICK: 0.27, LOW_BLANK: 0.31, ACE_OVERCARD: 0.14,
                          FLUSH_COMPLETE: 0.14, STRAIGHT_COMPLETE: 0.12 },
        AIR:            { _default: 0.20, BRICK: 0.24, LOW_BLANK: 0.28, ACE_OVERCARD: 0.10,
                          FLUSH_COMPLETE: 0.10, STRAIGHT_COMPLETE: 0.08 }
    };

    const TURN_REASONING = {
        STRAIGHT_FLUSH: 'Straight flush in 3BP — the virtual nuts. Bet for maximum value.',
        QUADS:          'Quads in 3BP — near-unbeatable. Extract maximum value.',
        FULL_HOUSE:     'Full house in 3BP — bet for value; pot is large.',
        FLUSH:          'Flush in 3BP — bet for value.',
        STRAIGHT:       'Straight in 3BP — bet for value; pot commitment.',
        SET:            'Set in 3BP — almost always bet; very few hands beat you.',
        TRIPS:          'Trips in 3BP — bet for value on most turns.',
        BOARD_TRIPS:    'Board trips in 3BP — kicker-dependent value betting.',
        TWO_PAIR:       'Two pair in 3BP — strong value hand, bet for value.',
        OVERPAIR:       'Overpair in 3BP — strong value hand in inflated pot.',
        TOP_PAIR:       'Top pair in 3BP — value bet on safe turns; protect equity.',
        SECOND_PAIR:    'Second pair in 3BP — thin value, mostly check.',
        THIRD_PAIR:     'Third pair in 3BP — check; not enough equity in large pot.',
        UNDERPAIR:      'Underpair in 3BP — check; dominated by caller\'s range.',
        COMBO_DRAW:     'Combo draw in 3BP — semi-bluff aggressively in the inflated pot.',
        STRONG_DRAW:    'Flush draw in 3BP — semi-bluff; strong equity in large pot.',
        OESD:           'OESD in 3BP — semi-bluff selectively.',
        GUTSHOT:        'Gutshot in 3BP — occasional semi-bluff; mostly check.',
        ACE_HIGH:       'Ace-high in 3BP — bluff selectively on turns favoring polar range.',
        OVERCARDS:      'Overcards in 3BP — occasional semi-bluff.',
        AIR:            'Air in 3BP — give up unless runout heavily favors polar range.'
    };

    const FAMILY_OFF = {
        BTN_3BP_vs_CO:  0,    BTN_3BP_vs_HJ:  0.03, CO_3BP_vs_HJ:   0.02,
        BTN_3BP_vs_UTG: 0.05, CO_3BP_vs_UTG:  0.04, HJ_3BP_vs_UTG:  0.04,
        BB_3BP_vs_BTN:  0,    BB_3BP_vs_CO:   0.03, SB_3BP_vs_BTN:  0.02,
        SB_3BP_vs_CO:   0.03, SB_3BP_vs_HJ:   0.04, SB_3BP_vs_UTG:  0.05, BB_3BP_vs_HJ: 0.04
    };

    for (const fam of HERO_HAND_AWARE_3BP_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;
        const baseTable = fi.positionState === 'OOP' ? BASE_OOP : BASE_IP;
        for (const tf of TURN_FAMILIES) {
            for (const hc of TURN_HAND_CLASSES) {
                const baseFreqs = baseTable[hc];
                if (!baseFreqs) continue;
                const raw = (baseFreqs[tf] !== undefined) ? baseFreqs[tf] : baseFreqs._default;
                const bet = Math.max(0.05, Math.min(0.95, parseFloat((raw + famOff).toFixed(2))));
                const chk = parseFloat((1 - bet).toFixed(2));
                const sk = make3BPTurnCBetSpotKeyV1({ preflopFamily: fam, positionState: fi.positionState, turnFamily: tf, heroHandClass: hc });
                POSTFLOP_3BP_TURN_STRATEGY[sk] = {
                    actions: { check: chk, bet50: bet },
                    preferredAction: bet >= 0.50 ? 'bet50' : 'check',
                    reasoning: TURN_REASONING[hc] || '',
                    simplification: fi.positionState === 'OOP' ? '3BP OOP Turn Barrel (50% pot)' : '3BP IP Turn Barrel (50% pot)'
                };
            }
        }
    }
    if (window.RANGE_VALIDATE) {
        console.log(`[3BPTurnV1] Built ${Object.keys(POSTFLOP_3BP_TURN_STRATEGY).length} 3BP PFR turn strategy entries.`);
    }
})();

(function() {
    const BASE = {
        STRAIGHT_FLUSH: { _default: { fold: 0.00, call: 0.10, raise: 0.90 } },
        QUADS:          { _default: { fold: 0.00, call: 0.15, raise: 0.85 } },
        FULL_HOUSE:     { _default: { fold: 0.00, call: 0.20, raise: 0.80 },
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.18, raise: 0.82 } },
        FLUSH:          { _default: { fold: 0.00, call: 0.25, raise: 0.75 } },
        STRAIGHT:       { _default: { fold: 0.00, call: 0.28, raise: 0.72 } },
        SET:            { _default: { fold: 0.00, call: 0.30, raise: 0.70 },
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.25, raise: 0.75 } },
        TRIPS:          { _default: { fold: 0.00, call: 0.30, raise: 0.70 },
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.24, raise: 0.76 },
                          STRAIGHT_COMPLETE: { fold: 0.00, call: 0.26, raise: 0.74 } },
        BOARD_TRIPS:    { _default: { fold: 0.08, call: 0.65, raise: 0.27 },
                          BRICK: { fold: 0.06, call: 0.68, raise: 0.26 },
                          FLUSH_COMPLETE: { fold: 0.15, call: 0.62, raise: 0.23 },
                          STRAIGHT_COMPLETE: { fold: 0.12, call: 0.64, raise: 0.24 } },
        TWO_PAIR:       { _default: { fold: 0.00, call: 0.38, raise: 0.62 },
                          FLUSH_COMPLETE: { fold: 0.04, call: 0.48, raise: 0.48 },
                          STRAIGHT_COMPLETE: { fold: 0.05, call: 0.50, raise: 0.45 } },
        OVERPAIR:       { _default: { fold: 0.00, call: 0.68, raise: 0.32 },
                          ACE_OVERCARD: { fold: 0.02, call: 0.74, raise: 0.24 },
                          FLUSH_COMPLETE: { fold: 0.04, call: 0.70, raise: 0.26 },
                          STRAIGHT_COMPLETE: { fold: 0.06, call: 0.70, raise: 0.24 } },
        TOP_PAIR:       { _default: { fold: 0.08, call: 0.76, raise: 0.16 },
                          BRICK: { fold: 0.05, call: 0.80, raise: 0.15 },
                          LOW_BLANK: { fold: 0.04, call: 0.82, raise: 0.14 },
                          ACE_OVERCARD: { fold: 0.20, call: 0.68, raise: 0.12 },
                          FLUSH_COMPLETE: { fold: 0.22, call: 0.66, raise: 0.12 },
                          STRAIGHT_COMPLETE: { fold: 0.25, call: 0.64, raise: 0.11 } },
        SECOND_PAIR:    { _default: { fold: 0.38, call: 0.54, raise: 0.08 },
                          BRICK: { fold: 0.28, call: 0.62, raise: 0.10 },
                          LOW_BLANK: { fold: 0.24, call: 0.66, raise: 0.10 },
                          ACE_OVERCARD: { fold: 0.52, call: 0.42, raise: 0.06 },
                          FLUSH_COMPLETE: { fold: 0.54, call: 0.40, raise: 0.06 },
                          STRAIGHT_COMPLETE: { fold: 0.56, call: 0.40, raise: 0.04 } },
        THIRD_PAIR:     { _default: { fold: 0.68, call: 0.28, raise: 0.04 },
                          BRICK: { fold: 0.58, call: 0.36, raise: 0.06 },
                          ACE_OVERCARD: { fold: 0.80, call: 0.18, raise: 0.02 },
                          FLUSH_COMPLETE: { fold: 0.78, call: 0.20, raise: 0.02 } },
        UNDERPAIR:      { _default: { fold: 0.72, call: 0.24, raise: 0.04 },
                          BRICK: { fold: 0.60, call: 0.34, raise: 0.06 },
                          ACE_OVERCARD: { fold: 0.84, call: 0.14, raise: 0.02 },
                          FLUSH_COMPLETE: { fold: 0.80, call: 0.18, raise: 0.02 } },
        COMBO_DRAW:     { _default: { fold: 0.00, call: 0.32, raise: 0.68 },
                          FLUSH_COMPLETE: { fold: 0.02, call: 0.38, raise: 0.60 },
                          STRAIGHT_COMPLETE: { fold: 0.02, call: 0.40, raise: 0.58 } },
        STRONG_DRAW:    { _default: { fold: 0.02, call: 0.50, raise: 0.48 },
                          FLUSH_COMPLETE: { fold: 0.04, call: 0.58, raise: 0.38 },
                          BRICK: { fold: 0.00, call: 0.45, raise: 0.55 } },
        OESD:           { _default: { fold: 0.20, call: 0.58, raise: 0.22 },
                          FLUSH_COMPLETE: { fold: 0.28, call: 0.58, raise: 0.14 },
                          STRAIGHT_COMPLETE: { fold: 0.30, call: 0.58, raise: 0.12 } },
        GUTSHOT:        { _default: { fold: 0.50, call: 0.44, raise: 0.06 },
                          FLUSH_COMPLETE: { fold: 0.60, call: 0.38, raise: 0.02 } },
        ACE_HIGH:       { _default: { fold: 0.65, call: 0.30, raise: 0.05 },
                          BRICK: { fold: 0.52, call: 0.40, raise: 0.08 },
                          FLUSH_COMPLETE: { fold: 0.75, call: 0.22, raise: 0.03 } },
        OVERCARDS:      { _default: { fold: 0.76, call: 0.20, raise: 0.04 },
                          BRICK: { fold: 0.62, call: 0.32, raise: 0.06 },
                          FLUSH_COMPLETE: { fold: 0.84, call: 0.14, raise: 0.02 } },
        AIR:            { _default: { fold: 0.88, call: 0.10, raise: 0.02 },
                          BRICK: { fold: 0.78, call: 0.18, raise: 0.04 } }
    };

    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush — raise all-in for maximum value.',
        QUADS: 'Quads in 3BP — raise to build the pot.', FULL_HOUSE: 'Full house in 3BP — raise for value.',
        FLUSH: 'Flush in 3BP — raise nutted flushes; call non-nuts.',
        STRAIGHT: 'Straight in 3BP — raise or call depending on draw possibilities.',
        SET: 'Set in 3BP — raise to build pot.', TRIPS: 'Trips in 3BP — raise or call for value.',
        BOARD_TRIPS: 'Board trips — kicker-dependent; call or fold.',
        TWO_PAIR: 'Two pair in 3BP — raise most combos for value.',
        OVERPAIR: 'Overpair in 3BP — call; too strong to fold, not enough to raise for value.',
        TOP_PAIR: 'Top pair in 3BP — call on blanks; fold on dangerous cards.',
        SECOND_PAIR: 'Second pair in 3BP — fold on dangerous turns; call on blanks.',
        THIRD_PAIR: 'Third pair in 3BP — mostly fold.', UNDERPAIR: 'Underpair in 3BP — mostly fold.',
        COMBO_DRAW: 'Combo draw in 3BP — raise to semi-bluff the inflated pot.',
        STRONG_DRAW: 'Flush draw in 3BP — semi-bluff raise or call depending on equity.',
        OESD: 'OESD in 3BP — call or fold; semi-bluff selectively.',
        GUTSHOT: 'Gutshot in 3BP — mostly fold.', ACE_HIGH: 'Ace-high in 3BP — fold most; occasional peel.',
        OVERCARDS: 'Overcards in 3BP — fold mostly.', AIR: 'Air in 3BP — fold.'
    };

    const FAM_OFF = {
        BTN_CALL_3BP_vs_BB: 0,   BTN_CALL_3BP_vs_SB:  0.01,
        CO_CALL_3BP_vs_BB: -0.01, CO_CALL_3BP_vs_BTN: 0, HJ_CALL_3BP_vs_BTN: 0.02
    };

    for (const fam of HERO_HAND_AWARE_3BP_DEFEND_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAM_OFF[fam] || 0;
        for (const tf of TURN_FAMILIES) {
            for (const hc of TURN_HAND_CLASSES) {
                const row = BASE[hc];
                if (!row) continue;
                const rawObj = row[tf] !== undefined ? row[tf] : row._default;
                const fold  = Math.max(0, Math.min(1, parseFloat((rawObj.fold  - famOff).toFixed(2))));
                const raise = Math.max(0, Math.min(1, parseFloat((rawObj.raise + famOff).toFixed(2))));
                const call  = parseFloat(Math.max(0, 1 - fold - raise).toFixed(2));
                let preferred = 'call';
                if (fold >= 0.50) preferred = 'fold';
                else if (raise >= 0.50) preferred = 'raise';
                const sk = make3BPTurnDefendSpotKeyV1({ preflopFamily: fam, positionState: fi.positionState, turnFamily: tf, heroHandClass: hc });
                POSTFLOP_3BP_TURN_DEFEND_STRATEGY[sk] = {
                    actions: { fold, call, raise }, preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: fi.positionState === 'IP' ? '3BP IP Defender vs Turn Barrel' : '3BP OOP Defender vs Turn Barrel'
                };
            }
        }
    }
    if (window.RANGE_VALIDATE) {
        console.log(`[3BPTurnDefend] Built ${Object.keys(POSTFLOP_3BP_TURN_DEFEND_STRATEGY).length} 3BP defender turn strategy entries.`);
    }
})();

(function() {
    // IP base bet50 frequencies (bet half pot as delayed c-bet)
    const BASE_IP = {
        STRAIGHT_FLUSH: { _default: 0.92 },
        QUADS:         { _default: 0.90 },
        FULL_HOUSE:    { _default: 0.92, FLUSH_COMPLETE: 0.86, STRAIGHT_COMPLETE: 0.84 },
        FLUSH:         { _default: 0.90, FLUSH_COMPLETE: 0.85 },
        STRAIGHT:      { _default: 0.85 },
        SET:           { _default: 0.90, FLUSH_COMPLETE: 0.80, STRAIGHT_COMPLETE: 0.78 },
        TRIPS:         { _default: 0.86, FLUSH_COMPLETE: 0.76, STRAIGHT_COMPLETE: 0.74,
                         BOARD_PAIR: 0.84, ACE_OVERCARD: 0.78, BROADWAY_OVERCARD: 0.80 },
        BOARD_TRIPS:   { _default: 0.52, BRICK: 0.56, LOW_BLANK: 0.58, FLUSH_COMPLETE: 0.35,
                         STRAIGHT_COMPLETE: 0.32, ACE_OVERCARD: 0.42, BROADWAY_OVERCARD: 0.46,
                         OVERCARD: 0.44, BOARD_PAIR: 0.48, DYNAMIC_CONNECTOR: 0.44 },
        TWO_PAIR:      { _default: 0.80, FLUSH_COMPLETE: 0.65, STRAIGHT_COMPLETE: 0.62, ACE_OVERCARD: 0.72 },
        OVERPAIR:      { _default: 0.50, ACE_OVERCARD: 0.20, FLUSH_COMPLETE: 0.38, STRAIGHT_COMPLETE: 0.35,
                         BROADWAY_OVERCARD: 0.40, OVERCARD: 0.38, BOARD_PAIR: 0.48, DYNAMIC_CONNECTOR: 0.44 },
        TOP_PAIR:      { _default: 0.42, BRICK: 0.48, LOW_BLANK: 0.52, ACE_OVERCARD: 0.25,
                         FLUSH_COMPLETE: 0.28, STRAIGHT_COMPLETE: 0.25, BROADWAY_OVERCARD: 0.32,
                         OVERCARD: 0.30, BOARD_PAIR: 0.38, DYNAMIC_CONNECTOR: 0.36 },
        SECOND_PAIR:   { _default: 0.22, BRICK: 0.28, LOW_BLANK: 0.30, ACE_OVERCARD: 0.12,
                         FLUSH_COMPLETE: 0.12, STRAIGHT_COMPLETE: 0.10, BROADWAY_OVERCARD: 0.16,
                         OVERCARD: 0.14, BOARD_PAIR: 0.20, DYNAMIC_CONNECTOR: 0.20 },
        THIRD_PAIR:    { _default: 0.12, BRICK: 0.16, LOW_BLANK: 0.18, ACE_OVERCARD: 0.06,
                         FLUSH_COMPLETE: 0.06, STRAIGHT_COMPLETE: 0.05 },
        UNDERPAIR:     { _default: 0.14, BRICK: 0.18, LOW_BLANK: 0.20, ACE_OVERCARD: 0.06,
                         FLUSH_COMPLETE: 0.07, STRAIGHT_COMPLETE: 0.05 },
        COMBO_DRAW:    { _default: 0.72, BRICK: 0.76, FLUSH_COMPLETE: 0.52, STRAIGHT_COMPLETE: 0.52,
                         ACE_OVERCARD: 0.62, BROADWAY_OVERCARD: 0.68, DYNAMIC_CONNECTOR: 0.78 },
        STRONG_DRAW:   { _default: 0.60, BRICK: 0.65, LOW_BLANK: 0.68, FLUSH_COMPLETE: 0.45,
                         STRAIGHT_COMPLETE: 0.45, ACE_OVERCARD: 0.50, BROADWAY_OVERCARD: 0.55,
                         DYNAMIC_CONNECTOR: 0.70, BOARD_PAIR: 0.58 },
        OESD:          { _default: 0.48, BRICK: 0.52, LOW_BLANK: 0.55, FLUSH_COMPLETE: 0.32,
                         STRAIGHT_COMPLETE: 0.30, ACE_OVERCARD: 0.40, BROADWAY_OVERCARD: 0.44 },
        GUTSHOT:       { _default: 0.26, BRICK: 0.30, LOW_BLANK: 0.34, FLUSH_COMPLETE: 0.15,
                         STRAIGHT_COMPLETE: 0.13, ACE_OVERCARD: 0.20, BROADWAY_OVERCARD: 0.22 },
        ACE_HIGH:      { _default: 0.36, BRICK: 0.44, LOW_BLANK: 0.48, ACE_OVERCARD: 0.22,
                         FLUSH_COMPLETE: 0.18, STRAIGHT_COMPLETE: 0.15, BROADWAY_OVERCARD: 0.30,
                         OVERCARD: 0.28, BOARD_PAIR: 0.32, DYNAMIC_CONNECTOR: 0.30 },
        OVERCARDS:     { _default: 0.22, BRICK: 0.28, LOW_BLANK: 0.32, ACE_OVERCARD: 0.12,
                         FLUSH_COMPLETE: 0.12, STRAIGHT_COMPLETE: 0.10, BROADWAY_OVERCARD: 0.16,
                         OVERCARD: 0.14, BOARD_PAIR: 0.18, DYNAMIC_CONNECTOR: 0.18 },
        AIR:           { _default: 0.16, BRICK: 0.20, LOW_BLANK: 0.24, ACE_OVERCARD: 0.08,
                         FLUSH_COMPLETE: 0.08, STRAIGHT_COMPLETE: 0.06, BROADWAY_OVERCARD: 0.12,
                         OVERCARD: 0.10, BOARD_PAIR: 0.14, DYNAMIC_CONNECTOR: 0.13 }
    };

    // OOP PFR: check-through line hurts OOP PFR more; reduce frequencies ~12-15pp
    const BASE_OOP = {
        STRAIGHT_FLUSH: { _default: 0.82 },
        QUADS:         { _default: 0.80 },
        FULL_HOUSE:    { _default: 0.82, FLUSH_COMPLETE: 0.74, STRAIGHT_COMPLETE: 0.72 },
        FLUSH:         { _default: 0.82, FLUSH_COMPLETE: 0.75 },
        STRAIGHT:      { _default: 0.75 },
        SET:           { _default: 0.80, FLUSH_COMPLETE: 0.68, STRAIGHT_COMPLETE: 0.65 },
        TRIPS:         { _default: 0.76, FLUSH_COMPLETE: 0.63, STRAIGHT_COMPLETE: 0.60,
                         BOARD_PAIR: 0.74, ACE_OVERCARD: 0.66, BROADWAY_OVERCARD: 0.68 },
        BOARD_TRIPS:   { _default: 0.38, BRICK: 0.42, LOW_BLANK: 0.44, FLUSH_COMPLETE: 0.24,
                         STRAIGHT_COMPLETE: 0.20, ACE_OVERCARD: 0.30, BROADWAY_OVERCARD: 0.32,
                         OVERCARD: 0.30, BOARD_PAIR: 0.36 },
        TWO_PAIR:      { _default: 0.68, FLUSH_COMPLETE: 0.52, STRAIGHT_COMPLETE: 0.50, ACE_OVERCARD: 0.58 },
        OVERPAIR:      { _default: 0.36, ACE_OVERCARD: 0.14, FLUSH_COMPLETE: 0.26, STRAIGHT_COMPLETE: 0.24,
                         BROADWAY_OVERCARD: 0.28, OVERCARD: 0.26, BOARD_PAIR: 0.34, DYNAMIC_CONNECTOR: 0.30 },
        TOP_PAIR:      { _default: 0.30, BRICK: 0.36, LOW_BLANK: 0.40, ACE_OVERCARD: 0.16,
                         FLUSH_COMPLETE: 0.18, STRAIGHT_COMPLETE: 0.16, BROADWAY_OVERCARD: 0.22,
                         OVERCARD: 0.20, BOARD_PAIR: 0.26, DYNAMIC_CONNECTOR: 0.24 },
        SECOND_PAIR:   { _default: 0.13, BRICK: 0.18, LOW_BLANK: 0.20, ACE_OVERCARD: 0.07,
                         FLUSH_COMPLETE: 0.07, STRAIGHT_COMPLETE: 0.05 },
        THIRD_PAIR:    { _default: 0.07, BRICK: 0.10, ACE_OVERCARD: 0.03 },
        UNDERPAIR:     { _default: 0.08, BRICK: 0.11, ACE_OVERCARD: 0.03 },
        COMBO_DRAW:    { _default: 0.58, BRICK: 0.62, FLUSH_COMPLETE: 0.40, STRAIGHT_COMPLETE: 0.40,
                         ACE_OVERCARD: 0.48, BROADWAY_OVERCARD: 0.54, DYNAMIC_CONNECTOR: 0.65 },
        STRONG_DRAW:   { _default: 0.47, BRICK: 0.52, FLUSH_COMPLETE: 0.32, STRAIGHT_COMPLETE: 0.30,
                         ACE_OVERCARD: 0.38, BROADWAY_OVERCARD: 0.42, DYNAMIC_CONNECTOR: 0.56 },
        OESD:          { _default: 0.36, BRICK: 0.40, FLUSH_COMPLETE: 0.22, STRAIGHT_COMPLETE: 0.20,
                         ACE_OVERCARD: 0.28, BROADWAY_OVERCARD: 0.32 },
        GUTSHOT:       { _default: 0.16, BRICK: 0.20, FLUSH_COMPLETE: 0.09, STRAIGHT_COMPLETE: 0.07,
                         ACE_OVERCARD: 0.12 },
        ACE_HIGH:      { _default: 0.24, BRICK: 0.32, LOW_BLANK: 0.36, ACE_OVERCARD: 0.14,
                         FLUSH_COMPLETE: 0.10, STRAIGHT_COMPLETE: 0.08 },
        OVERCARDS:     { _default: 0.13, BRICK: 0.18, LOW_BLANK: 0.22, ACE_OVERCARD: 0.07,
                         FLUSH_COMPLETE: 0.07, STRAIGHT_COMPLETE: 0.05 },
        AIR:           { _default: 0.09, BRICK: 0.13, LOW_BLANK: 0.16, ACE_OVERCARD: 0.04,
                         FLUSH_COMPLETE: 0.04, STRAIGHT_COMPLETE: 0.03 }
    };

    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush after check-through — bet for maximum value. Board disguises hand strength.',
        QUADS:        'Quads after check-through — slow-play complete. Time to bet for value.',
        FULL_HOUSE:   'Full house after check-through — max value time. Board pair disguises your strength.',
        FLUSH:        'Made flush on flop check-through — bet for full value now.',
        STRAIGHT:     'Made straight — delayed value bet is very strong here.',
        SET:          'Set after check-through — now is the time to build the pot.',
        TRIPS:        'Hero-made trips after check-through — strong hand. Bet for value now.',
        BOARD_TRIPS:  'Board trips after check-through — this is a kicker / showdown-value spot, not a pure value hand.',
        TWO_PAIR:     'Two pair — bet for value and protection. Flop slow-play complete.',
        OVERPAIR:     'Overpair — check-through capped your range. Bet cautiously on safe turns.',
        TOP_PAIR:     'Top pair — delayed bet on safe turns; check on dynamic turns.',
        SECOND_PAIR:  'Second pair — mostly check. Villain\'s range is uncapped after checking back.',
        THIRD_PAIR:   'Third pair — check almost always. Too little value and too little fold equity.',
        UNDERPAIR:    'Underpair — check. No value and a scary board for a delayed bluff.',
        COMBO_DRAW:   'Combo draw — semi-bluff. Excellent equity + fold equity against uncapped range.',
        STRONG_DRAW:  'Flush draw — semi-bluff on safe turns. Check on completed flush boards.',
        OESD:         'OESD — semi-bluff on safe turns. Check on straight-completing turns.',
        GUTSHOT:      'Gutshot — mostly check. Delayed bluff with gutshot is very thin.',
        ACE_HIGH:     'Ace-high — delayed bluff only on safe turns where range advantage is clear.',
        OVERCARDS:    'Overcards — check mostly. Delayed bluff selectively on pure brick turns.',
        AIR:          'Air — check-through exposes your range. Give up unless turn is very favorable.'
    };

    // Per-family small offsets identical to regular turn strategy
    const FAMILY_OFF = {
        BTN_vs_BB: 0, CO_vs_BB: -0.03, HJ_vs_BB: -0.02, LJ_vs_BB: -0.01,
        UTG_vs_BB: 0.02, BTN_vs_SB: 0.02, SB_vs_BB: 0, CO_vs_BTN: -0.03
    };

    for (const fam of HERO_HAND_AWARE_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;
        const baseTable = fi.positionState === 'OOP' ? BASE_OOP : BASE_IP;

        for (const tf of TURN_FAMILIES) {
            for (const hc of TURN_HAND_CLASSES) {
                const baseFreqs = baseTable[hc];
                if (!baseFreqs) continue;
                const raw = (baseFreqs[tf] !== undefined) ? baseFreqs[tf] : baseFreqs._default;
                if (raw === undefined) continue;
                const bet = Math.max(0.05, Math.min(0.95, parseFloat((raw + famOff).toFixed(2))));
                const chk = parseFloat((1 - bet).toFixed(2));
                const preferred = bet >= 0.50 ? 'bet50' : 'check';
                const sk = makeDelayedTurnSpotKeyV1({
                    preflopFamily: fam, positionState: fi.positionState,
                    turnFamily: tf, heroHandClass: hc
                });
                POSTFLOP_TURN_DELAYED_STRATEGY[sk] = {
                    actions: { check: chk, bet50: bet },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: 'Phase 2: Turn Delayed C-Bet (50% pot)'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[TurnDelayed] Built ${Object.keys(POSTFLOP_TURN_DELAYED_STRATEGY).length} delayed turn strategy entries.`);
    }
})();

(function() {
    // BB is uncapped after flop check-through; PFR is capped.
    // BB folds less, raises more with value and semi-bluffs vs PFR's capped range.
    const BASE = {
        STRAIGHT_FLUSH: { _default: { fold: 0.00, call: 0.08, raise: 0.92 } },
        QUADS:          { _default: { fold: 0.00, call: 0.12, raise: 0.88 } },
        FULL_HOUSE:     { _default: { fold: 0.00, call: 0.16, raise: 0.84 },
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.14, raise: 0.86 } },
        FLUSH:          { _default: { fold: 0.00, call: 0.22, raise: 0.78 } },
        STRAIGHT:       { _default: { fold: 0.00, call: 0.28, raise: 0.72 } },
        SET:            { _default: { fold: 0.00, call: 0.28, raise: 0.72 },
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.22, raise: 0.78 } },
        TRIPS:          { _default: { fold: 0.00, call: 0.26, raise: 0.74 },
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.20, raise: 0.80 },
                          STRAIGHT_COMPLETE: { fold: 0.00, call: 0.22, raise: 0.78 } },
        BOARD_TRIPS:    { _default: { fold: 0.08, call: 0.67, raise: 0.25 },
                          BRICK: { fold: 0.06, call: 0.70, raise: 0.24 },
                          FLUSH_COMPLETE: { fold: 0.14, call: 0.62, raise: 0.24 },
                          STRAIGHT_COMPLETE: { fold: 0.16, call: 0.60, raise: 0.24 },
                          ACE_OVERCARD: { fold: 0.12, call: 0.65, raise: 0.23 } },
        TWO_PAIR:       { _default: { fold: 0.00, call: 0.42, raise: 0.58 },
                          FLUSH_COMPLETE: { fold: 0.04, call: 0.50, raise: 0.46 },
                          STRAIGHT_COMPLETE: { fold: 0.04, call: 0.52, raise: 0.44 } },
        OVERPAIR:       { _default: { fold: 0.00, call: 0.65, raise: 0.35 },
                          ACE_OVERCARD: { fold: 0.00, call: 0.72, raise: 0.28 },
                          FLUSH_COMPLETE: { fold: 0.04, call: 0.68, raise: 0.28 },
                          STRAIGHT_COMPLETE: { fold: 0.06, call: 0.66, raise: 0.28 },
                          BROADWAY_OVERCARD: { fold: 0.00, call: 0.68, raise: 0.32 } },
        TOP_PAIR:       { _default: { fold: 0.05, call: 0.75, raise: 0.20 },
                          BRICK: { fold: 0.03, call: 0.78, raise: 0.19 },
                          LOW_BLANK: { fold: 0.02, call: 0.80, raise: 0.18 },
                          ACE_OVERCARD: { fold: 0.15, call: 0.72, raise: 0.13 },
                          FLUSH_COMPLETE: { fold: 0.16, call: 0.70, raise: 0.14 },
                          STRAIGHT_COMPLETE: { fold: 0.18, call: 0.68, raise: 0.14 },
                          BROADWAY_OVERCARD: { fold: 0.10, call: 0.74, raise: 0.16 } },
        SECOND_PAIR:    { _default: { fold: 0.28, call: 0.58, raise: 0.14 },
                          BRICK: { fold: 0.22, call: 0.62, raise: 0.16 },
                          ACE_OVERCARD: { fold: 0.42, call: 0.48, raise: 0.10 },
                          FLUSH_COMPLETE: { fold: 0.45, call: 0.44, raise: 0.11 },
                          STRAIGHT_COMPLETE: { fold: 0.48, call: 0.42, raise: 0.10 } },
        THIRD_PAIR:     { _default: { fold: 0.48, call: 0.40, raise: 0.12 },
                          BRICK: { fold: 0.40, call: 0.48, raise: 0.12 },
                          FLUSH_COMPLETE: { fold: 0.58, call: 0.30, raise: 0.12 } },
        UNDERPAIR:      { _default: { fold: 0.52, call: 0.36, raise: 0.12 },
                          BRICK: { fold: 0.45, call: 0.43, raise: 0.12 } },
        COMBO_DRAW:     { _default: { fold: 0.00, call: 0.42, raise: 0.58 },
                          FLUSH_COMPLETE: { fold: 0.06, call: 0.46, raise: 0.48 },
                          STRAIGHT_COMPLETE: { fold: 0.06, call: 0.44, raise: 0.50 } },
        STRONG_DRAW:    { _default: { fold: 0.05, call: 0.55, raise: 0.40 },
                          FLUSH_COMPLETE: { fold: 0.10, call: 0.55, raise: 0.35 },
                          BRICK: { fold: 0.04, call: 0.58, raise: 0.38 } },
        OESD:           { _default: { fold: 0.12, call: 0.56, raise: 0.32 },
                          STRAIGHT_COMPLETE: { fold: 0.08, call: 0.48, raise: 0.44 },
                          BRICK: { fold: 0.10, call: 0.60, raise: 0.30 } },
        GUTSHOT:        { _default: { fold: 0.38, call: 0.50, raise: 0.12 },
                          BRICK: { fold: 0.32, call: 0.56, raise: 0.12 } },
        ACE_HIGH:       { _default: { fold: 0.42, call: 0.44, raise: 0.14 },
                          BRICK: { fold: 0.35, call: 0.52, raise: 0.13 } },
        OVERCARDS:      { _default: { fold: 0.55, call: 0.32, raise: 0.13 },
                          BRICK: { fold: 0.46, call: 0.40, raise: 0.14 } },
        AIR:            { _default: { fold: 0.72, call: 0.16, raise: 0.12 },
                          BRICK: { fold: 0.62, call: 0.22, raise: 0.16 } }
    };

    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush — raise for maximum value. PFR is capped from flop check.',
        QUADS:          'Quads — raise to build the pot vs PFR\'s capped range.',
        FULL_HOUSE:     'Full house — raise for value. PFR checked flop, so your slow-play is well-disguised.',
        FLUSH:          'Made flush — raise for value, or flat to trap PFR\'s capped range.',
        STRAIGHT:       'Made straight — raise for value vs PFR\'s capped delayed bet.',
        SET:            'Set — raise or flat. BB is uncapped here; raises are very credible.',
        TRIPS:          'Trips — raise or call confidently. PFR\'s range is capped after flop check.',
        BOARD_TRIPS:    'Board trips — call down. Kicker matters; PFR may have the same trips.',
        TWO_PAIR:       'Two pair — raise for value. BB is uncapped; PFR is capped. Excellent spot to build the pot.',
        OVERPAIR:       'Overpair — call or raise. BB is uncapped; this is top of your range after check-through.',
        TOP_PAIR:       'Top pair — call mainly. Fold on scary turns; raise on safe turns as protection.',
        SECOND_PAIR:    'Second pair — call more vs delayed bet; PFR\'s capped range means more bluffs.',
        THIRD_PAIR:     'Third pair — marginal. Call on brick turns; fold on scary turns.',
        UNDERPAIR:      'Underpair — mostly fold. Call selectively on blank turns with implied odds.',
        COMBO_DRAW:     'Combo draw — raise as semi-bluff. Excellent equity vs PFR\'s capped delayed range.',
        STRONG_DRAW:    'Flush draw — raise or call. BB is uncapped; semi-bluff more vs capped PFR.',
        OESD:           'OESD — call or raise as semi-bluff. PFR\'s capped range gives you fold equity.',
        GUTSHOT:        'Gutshot — call or fold. Raise selectively on favorable turns.',
        ACE_HIGH:       'Ace-high — call on brick turns, fold on scary boards. More call vs delayed bet.',
        OVERCARDS:      'Overcards — fold on most turns. Occasional semi-bluff raise on brick turns.',
        AIR:            'Air — mostly fold. Raise-bluff selectively on favorable textures vs capped PFR.'
    };

    // Family offsets: positive = call wider. Tighter opener → more folding (negative).
    const FAM_OFF = {
        BTN_vs_BB:  0,     CO_vs_BB:   0.02,  SB_vs_BB:   0.03,
        HJ_vs_BB:  -0.02,  LJ_vs_BB:  -0.04,  UTG_vs_BB: -0.06,
        BTN_vs_SB: -0.02,  CO_vs_BTN:  0.03,
    };

    for (const fam of DEFENDER_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const off = FAM_OFF[fam] || 0;

        for (const tf of TURN_FAMILIES) {
            for (const hc of TURN_HAND_CLASSES) {
                const hcData = BASE[hc];
                if (!hcData) continue;
                const raw = hcData[tf] || hcData._default;
                if (!raw) continue;

                let fold  = Math.max(0, raw.fold - off);
                let call  = raw.call + off * 0.5;
                let raise = raw.raise + off * 0.5;
                const total = fold + call + raise;
                fold  = parseFloat((fold  / total).toFixed(2));
                call  = parseFloat((call  / total).toFixed(2));
                raise = parseFloat((1 - fold - call).toFixed(2));
                fold  = Math.max(0, Math.min(1, fold));
                call  = Math.max(0, Math.min(1, call));
                raise = Math.max(0, Math.min(1, raise));

                let preferred;
                if (fold >= call && fold >= raise) preferred = 'fold';
                else if (raise >= call && raise >= fold) preferred = 'raise';
                else preferred = 'call';

                const sk = makeDelayedTurnDefendSpotKeyV1({
                    preflopFamily: fam, turnFamily: tf, heroHandClass: hc
                });
                POSTFLOP_TURN_DELAYED_DEFEND_STRATEGY[sk] = {
                    actions: { fold, call, raise },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: 'Turn Delayed Defend (BB vs PFR delayed bet)'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[TurnDelayedDefend] Built ${Object.keys(POSTFLOP_TURN_DELAYED_DEFEND_STRATEGY).length} delayed turn defend strategy entries.`);
    }
})();

(function() {
    // IP hero base fold/call/raise frequencies vs BB turn probe (33% sizing)
    // IP hero was the PFR who checked back flop — range is capped.
    // BB's probe range is wide (semi-bluffs + value) due to checked-through flop.
    const BASE_IP = {
        STRAIGHT_FLUSH: { fold: 0.00, call: 0.05, raise: 0.95 },
        QUADS:          { fold: 0.00, call: 0.10, raise: 0.90 },
        FULL_HOUSE:     { fold: 0.00, call: 0.12, raise: 0.88,
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.20, raise: 0.80 } },
        FLUSH:          { fold: 0.00, call: 0.15, raise: 0.85,
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.25, raise: 0.75 } },
        STRAIGHT:       { fold: 0.00, call: 0.15, raise: 0.85 },
        SET:            { fold: 0.00, call: 0.18, raise: 0.82,
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.28, raise: 0.72 },
                          STRAIGHT_COMPLETE: { fold: 0.00, call: 0.30, raise: 0.70 } },
        TRIPS:          { fold: 0.00, call: 0.22, raise: 0.78,
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.35, raise: 0.65 },
                          STRAIGHT_COMPLETE: { fold: 0.00, call: 0.38, raise: 0.62 },
                          ACE_OVERCARD: { fold: 0.00, call: 0.28, raise: 0.72 } },
        BOARD_TRIPS:    { fold: 0.05, call: 0.58, raise: 0.37,
                          FLUSH_COMPLETE: { fold: 0.10, call: 0.62, raise: 0.28 },
                          STRAIGHT_COMPLETE: { fold: 0.12, call: 0.62, raise: 0.26 },
                          ACE_OVERCARD: { fold: 0.08, call: 0.62, raise: 0.30 } },
        TWO_PAIR:       { fold: 0.00, call: 0.30, raise: 0.70,
                          FLUSH_COMPLETE: { fold: 0.05, call: 0.52, raise: 0.43 },
                          STRAIGHT_COMPLETE: { fold: 0.05, call: 0.55, raise: 0.40 },
                          ACE_OVERCARD: { fold: 0.02, call: 0.38, raise: 0.60 } },
        OVERPAIR:       { fold: 0.05, call: 0.52, raise: 0.43,
                          ACE_OVERCARD: { fold: 0.20, call: 0.60, raise: 0.20 },
                          FLUSH_COMPLETE: { fold: 0.12, call: 0.62, raise: 0.26 },
                          STRAIGHT_COMPLETE: { fold: 0.15, call: 0.62, raise: 0.23 },
                          BROADWAY_OVERCARD: { fold: 0.10, call: 0.62, raise: 0.28 },
                          OVERCARD: { fold: 0.12, call: 0.60, raise: 0.28 },
                          BOARD_PAIR: { fold: 0.08, call: 0.55, raise: 0.37 },
                          DYNAMIC_CONNECTOR: { fold: 0.10, call: 0.58, raise: 0.32 },
                          BRICK: { fold: 0.03, call: 0.45, raise: 0.52 },
                          LOW_BLANK: { fold: 0.02, call: 0.40, raise: 0.58 } },
        TOP_PAIR:       { fold: 0.08, call: 0.62, raise: 0.30,
                          BRICK: { fold: 0.04, call: 0.55, raise: 0.41 },
                          LOW_BLANK: { fold: 0.04, call: 0.52, raise: 0.44 },
                          ACE_OVERCARD: { fold: 0.28, call: 0.62, raise: 0.10 },
                          FLUSH_COMPLETE: { fold: 0.22, call: 0.65, raise: 0.13 },
                          STRAIGHT_COMPLETE: { fold: 0.25, call: 0.65, raise: 0.10 },
                          BROADWAY_OVERCARD: { fold: 0.18, call: 0.68, raise: 0.14 },
                          OVERCARD: { fold: 0.20, call: 0.65, raise: 0.15 },
                          BOARD_PAIR: { fold: 0.10, call: 0.65, raise: 0.25 },
                          DYNAMIC_CONNECTOR: { fold: 0.15, call: 0.65, raise: 0.20 } },
        SECOND_PAIR:    { fold: 0.28, call: 0.62, raise: 0.10,
                          BRICK: { fold: 0.18, call: 0.68, raise: 0.14 },
                          LOW_BLANK: { fold: 0.15, call: 0.68, raise: 0.17 },
                          ACE_OVERCARD: { fold: 0.52, call: 0.45, raise: 0.03 },
                          FLUSH_COMPLETE: { fold: 0.48, call: 0.50, raise: 0.02 },
                          STRAIGHT_COMPLETE: { fold: 0.52, call: 0.46, raise: 0.02 },
                          BROADWAY_OVERCARD: { fold: 0.40, call: 0.56, raise: 0.04 },
                          OVERCARD: { fold: 0.38, call: 0.58, raise: 0.04 } },
        THIRD_PAIR:     { fold: 0.55, call: 0.42, raise: 0.03,
                          BRICK: { fold: 0.40, call: 0.56, raise: 0.04 },
                          ACE_OVERCARD: { fold: 0.72, call: 0.27, raise: 0.01 },
                          FLUSH_COMPLETE: { fold: 0.70, call: 0.28, raise: 0.02 } },
        UNDERPAIR:      { fold: 0.58, call: 0.40, raise: 0.02,
                          BRICK: { fold: 0.42, call: 0.55, raise: 0.03 },
                          LOW_BLANK: { fold: 0.38, call: 0.58, raise: 0.04 },
                          ACE_OVERCARD: { fold: 0.75, call: 0.24, raise: 0.01 },
                          FLUSH_COMPLETE: { fold: 0.72, call: 0.26, raise: 0.02 } },
        COMBO_DRAW:     { fold: 0.04, call: 0.45, raise: 0.51,
                          BRICK: { fold: 0.02, call: 0.35, raise: 0.63 },
                          FLUSH_COMPLETE: { fold: 0.12, call: 0.58, raise: 0.30 },
                          STRAIGHT_COMPLETE: { fold: 0.12, call: 0.58, raise: 0.30 },
                          ACE_OVERCARD: { fold: 0.06, call: 0.44, raise: 0.50 },
                          DYNAMIC_CONNECTOR: { fold: 0.02, call: 0.35, raise: 0.63 } },
        STRONG_DRAW:    { fold: 0.08, call: 0.60, raise: 0.32,
                          BRICK: { fold: 0.04, call: 0.46, raise: 0.50 },
                          LOW_BLANK: { fold: 0.04, call: 0.44, raise: 0.52 },
                          FLUSH_COMPLETE: { fold: 0.20, call: 0.68, raise: 0.12 },
                          STRAIGHT_COMPLETE: { fold: 0.20, call: 0.68, raise: 0.12 },
                          DYNAMIC_CONNECTOR: { fold: 0.04, call: 0.40, raise: 0.56 } },
        OESD:           { fold: 0.12, call: 0.65, raise: 0.23,
                          BRICK: { fold: 0.06, call: 0.56, raise: 0.38 },
                          FLUSH_COMPLETE: { fold: 0.30, call: 0.65, raise: 0.05 },
                          STRAIGHT_COMPLETE: { fold: 0.35, call: 0.62, raise: 0.03 } },
        GUTSHOT:        { fold: 0.38, call: 0.55, raise: 0.07,
                          BRICK: { fold: 0.22, call: 0.65, raise: 0.13 },
                          FLUSH_COMPLETE: { fold: 0.55, call: 0.43, raise: 0.02 },
                          STRAIGHT_COMPLETE: { fold: 0.60, call: 0.38, raise: 0.02 } },
        ACE_HIGH:       { fold: 0.35, call: 0.50, raise: 0.15,
                          BRICK: { fold: 0.20, call: 0.52, raise: 0.28 },
                          LOW_BLANK: { fold: 0.18, call: 0.52, raise: 0.30 },
                          ACE_OVERCARD: { fold: 0.30, call: 0.55, raise: 0.15 },
                          FLUSH_COMPLETE: { fold: 0.52, call: 0.44, raise: 0.04 },
                          STRAIGHT_COMPLETE: { fold: 0.55, call: 0.42, raise: 0.03 } },
        OVERCARDS:      { fold: 0.58, call: 0.38, raise: 0.04,
                          BRICK: { fold: 0.38, call: 0.52, raise: 0.10 },
                          LOW_BLANK: { fold: 0.35, call: 0.53, raise: 0.12 },
                          ACE_OVERCARD: { fold: 0.55, call: 0.42, raise: 0.03 },
                          FLUSH_COMPLETE: { fold: 0.72, call: 0.26, raise: 0.02 },
                          STRAIGHT_COMPLETE: { fold: 0.75, call: 0.24, raise: 0.01 } },
        AIR:            { fold: 0.72, call: 0.25, raise: 0.03,
                          BRICK: { fold: 0.55, call: 0.36, raise: 0.09 },
                          LOW_BLANK: { fold: 0.52, call: 0.38, raise: 0.10 },
                          FLUSH_COMPLETE: { fold: 0.82, call: 0.17, raise: 0.01 },
                          STRAIGHT_COMPLETE: { fold: 0.85, call: 0.14, raise: 0.01 },
                          ACE_OVERCARD: { fold: 0.68, call: 0.30, raise: 0.02 } }
    };

    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush vs a probe — raise for maximum value. Villain is stabbing with wide range.',
        QUADS:          'Quads — raise for value. Probe bet hands pay off big.',
        FULL_HOUSE:     'Full house vs probe — raise. Strong enough to get value from villain\'s bluffs.',
        FLUSH:          'Flush vs probe — raise or call. Value is high even on a wet board.',
        STRAIGHT:       'Straight — raise for value vs probe. Villain\'s range is wide after check-through.',
        SET:            'Set vs probe — raise or call. Sets are nutted vs BB\'s probing range.',
        TRIPS:          'Trips vs probe — raise for value or call to keep draws in.',
        BOARD_TRIPS:    'Board trips — kicker spot. Call vs probe. Villain has range advantage here.',
        TWO_PAIR:       'Two pair vs probe — raise or call depending on texture. Solid value hand.',
        OVERPAIR:       'Overpair vs probe — call on most turns. Raise on brick turns only. Check-through caps your range.',
        TOP_PAIR:       'Top pair vs probe — call on safe turns, fold on scary turns. Range is capped after check-through.',
        SECOND_PAIR:    'Second pair vs probe — fold on bad turns, call on brick turns with implied odds.',
        THIRD_PAIR:     'Third pair vs probe — mostly fold. Too little equity to profitably call often.',
        UNDERPAIR:      'Underpair vs probe — mostly fold. BB\'s probing range destroys your equity.',
        COMBO_DRAW:     'Combo draw vs probe — raise for maximum semi-bluff equity.',
        STRONG_DRAW:    'Flush draw vs probe — call or raise as semi-bluff on safe turns.',
        OESD:           'OESD vs probe — call with implied odds, raise selectively as semi-bluff.',
        GUTSHOT:        'Gutshot vs probe — mostly call, occasionally raise as semi-bluff on brick turns.',
        ACE_HIGH:       'Ace-high vs probe — call on brick turns, fold on scary boards.',
        OVERCARDS:      'Overcards vs probe — fold on bad turns. Call selectively on brick turns only.',
        AIR:            'Air vs probe — fold most of the time. Reverse implied odds are severe.'
    };

    // Per-family small offsets for IP families
    const FAMILY_OFF = { BTN_vs_BB: 0, CO_vs_BB: -0.02 };

    for (const fam of PROBE_IP_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;

        for (const tf of TURN_FAMILIES) {
            for (const hc of TURN_HAND_CLASSES) {
                const baseEntry = BASE_IP[hc];
                if (!baseEntry) continue;

                // Look for texture-specific override first, then _default
                const tfEntry = baseEntry[tf];
                let fold, call, raise;
                if (tfEntry && typeof tfEntry === 'object' && 'fold' in tfEntry) {
                    fold = tfEntry.fold; call = tfEntry.call; raise = tfEntry.raise;
                } else {
                    fold = baseEntry.fold; call = baseEntry.call; raise = baseEntry.raise;
                }
                if (fold === undefined) continue;

                // Apply family offset to call frequency (shift between fold and call)
                call = parseFloat(Math.max(0, Math.min(1, call + famOff)).toFixed(2));
                fold = parseFloat(Math.max(0, Math.min(1, fold - famOff * 0.5)).toFixed(2));
                raise = parseFloat(Math.max(0, Math.min(1, raise - famOff * 0.5)).toFixed(2));

                // Normalize to sum to 1
                const total = fold + call + raise;
                if (total <= 0) continue;
                fold  = parseFloat((fold  / total).toFixed(2));
                call  = parseFloat((call  / total).toFixed(2));
                raise = parseFloat((1 - fold - call).toFixed(2));
                fold  = Math.max(0, Math.min(1, fold));
                call  = Math.max(0, Math.min(1, call));
                raise = Math.max(0, Math.min(1, raise));

                let preferred;
                if (fold >= call && fold >= raise) preferred = 'fold';
                else if (raise >= call && raise >= fold) preferred = 'raise';
                else preferred = 'call';

                const sk = makeProbeFacingSpotKeyV1({
                    preflopFamily: fam, positionState: 'IP',
                    turnFamily: tf, heroHandClass: hc
                });
                POSTFLOP_TURN_PROBE_STRATEGY[sk] = {
                    actions: { fold, call, raise },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: 'Phase 2: Turn Probe Facing (IP hero)'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[TurnProbe] Built ${Object.keys(POSTFLOP_TURN_PROBE_STRATEGY).length} probe-facing strategy entries.`);
    }
})();

(function() {
    // OOP BB base bet50 frequencies for turn probe
    // BB is uncapped after flop check-through; can have all strong hands.
    // Bet frequencies are higher than typical OOP because villain's range is CAPPED.
    const BASE_OOP = {
        STRAIGHT_FLUSH: { _default: 0.90 },
        QUADS:          { _default: 0.88 },
        FULL_HOUSE:     { _default: 0.88, FLUSH_COMPLETE: 0.80, STRAIGHT_COMPLETE: 0.78 },
        FLUSH:          { _default: 0.86, FLUSH_COMPLETE: 0.80 },
        STRAIGHT:       { _default: 0.82 },
        SET:            { _default: 0.85, FLUSH_COMPLETE: 0.72, STRAIGHT_COMPLETE: 0.68 },
        TRIPS:          { _default: 0.80, FLUSH_COMPLETE: 0.67, STRAIGHT_COMPLETE: 0.63,
                          BOARD_PAIR: 0.78, ACE_OVERCARD: 0.72, BROADWAY_OVERCARD: 0.74 },
        BOARD_TRIPS:    { _default: 0.52, BRICK: 0.57, LOW_BLANK: 0.60, FLUSH_COMPLETE: 0.36,
                          STRAIGHT_COMPLETE: 0.32, ACE_OVERCARD: 0.44, BROADWAY_OVERCARD: 0.48,
                          OVERCARD: 0.46, BOARD_PAIR: 0.50, DYNAMIC_CONNECTOR: 0.46 },
        TWO_PAIR:       { _default: 0.76, FLUSH_COMPLETE: 0.60, STRAIGHT_COMPLETE: 0.58,
                          ACE_OVERCARD: 0.68, BROADWAY_OVERCARD: 0.70, BRICK: 0.80 },
        OVERPAIR:       { _default: 0.60, ACE_OVERCARD: 0.38, FLUSH_COMPLETE: 0.46,
                          STRAIGHT_COMPLETE: 0.42, BROADWAY_OVERCARD: 0.50, OVERCARD: 0.48,
                          BOARD_PAIR: 0.55, DYNAMIC_CONNECTOR: 0.52,
                          BRICK: 0.66, LOW_BLANK: 0.68 },
        TOP_PAIR:       { _default: 0.52, BRICK: 0.60, LOW_BLANK: 0.64, ACE_OVERCARD: 0.32,
                          FLUSH_COMPLETE: 0.34, STRAIGHT_COMPLETE: 0.30, BROADWAY_OVERCARD: 0.40,
                          OVERCARD: 0.38, BOARD_PAIR: 0.46, DYNAMIC_CONNECTOR: 0.42 },
        SECOND_PAIR:    { _default: 0.30, BRICK: 0.40, LOW_BLANK: 0.44, ACE_OVERCARD: 0.15,
                          FLUSH_COMPLETE: 0.14, STRAIGHT_COMPLETE: 0.12, BROADWAY_OVERCARD: 0.22,
                          OVERCARD: 0.18, BOARD_PAIR: 0.26, DYNAMIC_CONNECTOR: 0.24 },
        THIRD_PAIR:     { _default: 0.16, BRICK: 0.24, LOW_BLANK: 0.28, ACE_OVERCARD: 0.08,
                          FLUSH_COMPLETE: 0.07, STRAIGHT_COMPLETE: 0.06 },
        UNDERPAIR:      { _default: 0.18, BRICK: 0.26, LOW_BLANK: 0.30, ACE_OVERCARD: 0.08,
                          FLUSH_COMPLETE: 0.08, STRAIGHT_COMPLETE: 0.06 },
        COMBO_DRAW:     { _default: 0.68, BRICK: 0.74, FLUSH_COMPLETE: 0.48, STRAIGHT_COMPLETE: 0.48,
                          ACE_OVERCARD: 0.58, BROADWAY_OVERCARD: 0.62, DYNAMIC_CONNECTOR: 0.76 },
        STRONG_DRAW:    { _default: 0.56, BRICK: 0.62, LOW_BLANK: 0.66, FLUSH_COMPLETE: 0.38,
                          STRAIGHT_COMPLETE: 0.36, ACE_OVERCARD: 0.46, BROADWAY_OVERCARD: 0.50,
                          DYNAMIC_CONNECTOR: 0.68, BOARD_PAIR: 0.52 },
        OESD:           { _default: 0.44, BRICK: 0.50, LOW_BLANK: 0.54, FLUSH_COMPLETE: 0.28,
                          STRAIGHT_COMPLETE: 0.26, ACE_OVERCARD: 0.36, BROADWAY_OVERCARD: 0.40 },
        GUTSHOT:        { _default: 0.24, BRICK: 0.32, LOW_BLANK: 0.36, FLUSH_COMPLETE: 0.13,
                          STRAIGHT_COMPLETE: 0.11, ACE_OVERCARD: 0.18, BROADWAY_OVERCARD: 0.20 },
        ACE_HIGH:       { _default: 0.38, BRICK: 0.48, LOW_BLANK: 0.54, ACE_OVERCARD: 0.28,
                          FLUSH_COMPLETE: 0.18, STRAIGHT_COMPLETE: 0.14, BROADWAY_OVERCARD: 0.32,
                          OVERCARD: 0.30, BOARD_PAIR: 0.34, DYNAMIC_CONNECTOR: 0.32 },
        OVERCARDS:      { _default: 0.22, BRICK: 0.32, LOW_BLANK: 0.38, ACE_OVERCARD: 0.12,
                          FLUSH_COMPLETE: 0.10, STRAIGHT_COMPLETE: 0.08, BROADWAY_OVERCARD: 0.16,
                          OVERCARD: 0.14, BOARD_PAIR: 0.18, DYNAMIC_CONNECTOR: 0.18 },
        AIR:            { _default: 0.14, BRICK: 0.22, LOW_BLANK: 0.28, ACE_OVERCARD: 0.07,
                          FLUSH_COMPLETE: 0.06, STRAIGHT_COMPLETE: 0.05, BROADWAY_OVERCARD: 0.10,
                          OVERCARD: 0.08, BOARD_PAIR: 0.12, DYNAMIC_CONNECTOR: 0.12 }
    };

    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush after check-through — probe for maximum value. IP hero\'s range is capped.',
        QUADS:          'Quads — probe for value. Villain cannot have the nuts on a check-through line.',
        FULL_HOUSE:     'Full house — probe the turn. IP hero\'s range is capped and cannot fight back.',
        FLUSH:          'Made flush — probe. IP hero checked back to try to keep you in pots.',
        STRAIGHT:       'Straight — probe for value. Villain\'s capped range will call incorrectly.',
        SET:            'Set — probe the turn. Strong value bet vs a range that can\'t nutted.',
        TRIPS:          'Trips — probe for value. Villain\'s check-through range is heavily capped.',
        BOARD_TRIPS:    'Board trips — probe selectively. This is a showdown-value spot; kicker matters.',
        TWO_PAIR:       'Two pair — probe for value. BB is uncapped here; bet to build the pot.',
        OVERPAIR:       'Overpair — probe on favorable turns. As BB you are uncapped with pairs.',
        TOP_PAIR:       'Top pair — probe on brick turns. Check on dynamic turns where IP may have improved.',
        SECOND_PAIR:    'Second pair — probe on brick turns for thin value. Check on dangerous turns.',
        THIRD_PAIR:     'Third pair — mostly check. Probe only on the most favorable brick turns.',
        UNDERPAIR:      'Underpair — mostly check. Occasional probe only on pure blank turns.',
        COMBO_DRAW:     'Combo draw — probe as semi-bluff. Excellent equity + fold equity against capped range.',
        STRONG_DRAW:    'Flush draw — probe on favorable turns. BB is uncapped and can use fold equity.',
        OESD:           'OESD — probe on safe turns. IP hero\'s capped range gives you fold equity.',
        GUTSHOT:        'Gutshot — probe selectively on favorable brick turns. Mostly check.',
        ACE_HIGH:       'Ace-high — probe on brick turns where IP hero\'s capped range folds enough.',
        OVERCARDS:      'Overcards — probe selectively only on blank turns. Check on dynamic boards.',
        AIR:            'Air — probe rarely on very favorable blank turns. Mostly check-fold.'
    };

    // Per-family offsets for probe defender (OOP BB)
    const FAMILY_OFF = { BTN_vs_BB: 0, CO_vs_BB: -0.02 };

    for (const fam of PROBE_IP_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;

        for (const tf of TURN_FAMILIES) {
            for (const hc of TURN_HAND_CLASSES) {
                const baseFreqs = BASE_OOP[hc];
                if (!baseFreqs) continue;
                const raw = (baseFreqs[tf] !== undefined) ? baseFreqs[tf] : baseFreqs._default;
                if (raw === undefined) continue;
                const bet = Math.max(0.05, Math.min(0.95, parseFloat((raw + famOff).toFixed(2))));
                const chk = parseFloat((1 - bet).toFixed(2));
                const preferred = bet >= 0.50 ? 'bet50' : 'check';
                const sk = makeProbeDefendSpotKeyV1({
                    preflopFamily: fam, positionState: 'OOP',
                    turnFamily: tf, heroHandClass: hc
                });
                POSTFLOP_TURN_PROBE_DEFEND_STRATEGY[sk] = {
                    actions: { check: chk, bet50: bet },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: 'Phase 2: Turn Probe Bet (OOP BB)'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[TurnProbeDefend] Built ${Object.keys(POSTFLOP_TURN_PROBE_DEFEND_STRATEGY).length} probe-defend strategy entries.`);
    }
})();

(function() {
    const BASE_IP = {
        STRAIGHT_FLUSH: { _default: 0.92 },
        QUADS:         { _default: 0.90 },
        FULL_HOUSE:    { _default: 0.88, FLUSH_COMPLETE: 0.84, STRAIGHT_COMPLETE: 0.82 },
        FLUSH:         { _default: 0.85, FLUSH_COMPLETE: 0.78 },
        STRAIGHT:      { _default: 0.80 },
        SET:           { _default: 0.86, FLUSH_COMPLETE: 0.74, STRAIGHT_COMPLETE: 0.70 },
        TRIPS:         { _default: 0.82, FLUSH_COMPLETE: 0.70, STRAIGHT_COMPLETE: 0.66,
                         BOARD_PAIR: 0.78, ACE_OVERCARD: 0.74, BROADWAY_OVERCARD: 0.76 },
        BOARD_TRIPS:   { _default: 0.50, BRICK: 0.54, LOW_BLANK: 0.56, FLUSH_COMPLETE: 0.34,
                         STRAIGHT_COMPLETE: 0.30, ACE_OVERCARD: 0.40, BROADWAY_OVERCARD: 0.44,
                         BOARD_PAIR: 0.46, OVERCARD: 0.42 },
        TWO_PAIR:      { _default: 0.78, FLUSH_COMPLETE: 0.62, STRAIGHT_COMPLETE: 0.60, ACE_OVERCARD: 0.68 },
        OVERPAIR:      { _default: 0.65, ACE_OVERCARD: 0.25, FLUSH_COMPLETE: 0.48, STRAIGHT_COMPLETE: 0.45,
                         BROADWAY_OVERCARD: 0.52, OVERCARD: 0.50, BOARD_PAIR: 0.60, DYNAMIC_CONNECTOR: 0.58 },
        TOP_PAIR:      { _default: 0.52, BRICK: 0.58, LOW_BLANK: 0.60, ACE_OVERCARD: 0.30,
                         FLUSH_COMPLETE: 0.35, STRAIGHT_COMPLETE: 0.32, BROADWAY_OVERCARD: 0.40,
                         OVERCARD: 0.40, BOARD_PAIR: 0.48, DYNAMIC_CONNECTOR: 0.44 },
        SECOND_PAIR:   { _default: 0.22, BRICK: 0.26, LOW_BLANK: 0.28, ACE_OVERCARD: 0.12,
                         FLUSH_COMPLETE: 0.12, STRAIGHT_COMPLETE: 0.10 },
        THIRD_PAIR:    { _default: 0.12, BRICK: 0.16, FLUSH_COMPLETE: 0.06 },
        UNDERPAIR:     { _default: 0.14, BRICK: 0.18, FLUSH_COMPLETE: 0.06 },
        ACE_HIGH:      { _default: 0.45, BRICK: 0.50, LOW_BLANK: 0.52, ACE_OVERCARD: 0.28,
                         FLUSH_COMPLETE: 0.25, STRAIGHT_COMPLETE: 0.22, BROADWAY_OVERCARD: 0.38,
                         OVERCARD: 0.32, BOARD_PAIR: 0.38 },
        OVERCARDS:     { _default: 0.30, BRICK: 0.34, LOW_BLANK: 0.36, ACE_OVERCARD: 0.15,
                         FLUSH_COMPLETE: 0.14, STRAIGHT_COMPLETE: 0.12 },
        AIR:           { _default: 0.28, BRICK: 0.32, LOW_BLANK: 0.34, ACE_OVERCARD: 0.12,
                         FLUSH_COMPLETE: 0.10, STRAIGHT_COMPLETE: 0.08, BROADWAY_OVERCARD: 0.20 }
    };

    const BASE_OOP = {
        STRAIGHT_FLUSH: { _default: 0.82 },
        QUADS:         { _default: 0.80 },
        FULL_HOUSE:    { _default: 0.78, FLUSH_COMPLETE: 0.72, STRAIGHT_COMPLETE: 0.70 },
        FLUSH:         { _default: 0.75, FLUSH_COMPLETE: 0.68 },
        STRAIGHT:      { _default: 0.70 },
        SET:           { _default: 0.76, FLUSH_COMPLETE: 0.62, STRAIGHT_COMPLETE: 0.58 },
        TRIPS:         { _default: 0.70, FLUSH_COMPLETE: 0.58, STRAIGHT_COMPLETE: 0.54 },
        BOARD_TRIPS:   { _default: 0.38, BRICK: 0.42, LOW_BLANK: 0.44, FLUSH_COMPLETE: 0.24,
                         STRAIGHT_COMPLETE: 0.20, ACE_OVERCARD: 0.30 },
        TWO_PAIR:      { _default: 0.66, FLUSH_COMPLETE: 0.50, STRAIGHT_COMPLETE: 0.48 },
        OVERPAIR:      { _default: 0.52, ACE_OVERCARD: 0.18, FLUSH_COMPLETE: 0.38, STRAIGHT_COMPLETE: 0.35 },
        TOP_PAIR:      { _default: 0.40, BRICK: 0.46, LOW_BLANK: 0.48, ACE_OVERCARD: 0.22,
                         FLUSH_COMPLETE: 0.24, STRAIGHT_COMPLETE: 0.22 },
        SECOND_PAIR:   { _default: 0.14, BRICK: 0.18, FLUSH_COMPLETE: 0.07 },
        THIRD_PAIR:    { _default: 0.08 },
        UNDERPAIR:     { _default: 0.10 },
        ACE_HIGH:      { _default: 0.32, BRICK: 0.38, LOW_BLANK: 0.40, FLUSH_COMPLETE: 0.16 },
        OVERCARDS:     { _default: 0.20, BRICK: 0.24, FLUSH_COMPLETE: 0.08 },
        AIR:           { _default: 0.18, BRICK: 0.22, LOW_BLANK: 0.25, FLUSH_COMPLETE: 0.06 }
    };

    const RIVER_REASONING = {
        STRAIGHT_FLUSH: 'Straight flush — the nuts. Bet for maximum value.',
        QUADS:        'Quads — near-unbeatable. Bet for value.',
        FULL_HOUSE:   'Full house — strong. Bet for value.',
        FLUSH:        'Flush made — bet for value.',
        STRAIGHT:     'Straight made — bet for value.',
        SET:          'Set is strong — bet for value on most rivers.',
        TRIPS:        'Trips — bet for value.',
        BOARD_TRIPS:  'Board trips — kicker-dependent. Bet selectively with strong kickers.',
        TWO_PAIR:     'Two pair — bet for value.',
        OVERPAIR:     'Overpair — bet for value on safe rivers; check on dynamic ones.',
        TOP_PAIR:     'Top pair — bet for thin value on blanks; check on scary rivers.',
        SECOND_PAIR:  'Second pair — check for showdown value.',
        THIRD_PAIR:   'Third pair — check; no value on river.',
        UNDERPAIR:    'Underpair — check; no value on river.',
        ACE_HIGH:     'Ace-high — bluff on favorable rivers; check otherwise.',
        OVERCARDS:    'Overcards — occasional bluff; mostly check.',
        AIR:          'No hand — give up or bluff on the very best runouts.'
    };

    const FAMILY_OFF = {
        BTN_vs_BB: 0, CO_vs_BB: -0.03, HJ_vs_BB: -0.02, LJ_vs_BB: -0.01,
        UTG_vs_BB: 0.02, BTN_vs_SB: 0.02, SB_vs_BB: 0, CO_vs_BTN: -0.03
    };

    for (const fam of HERO_HAND_AWARE_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;
        const baseTable = fi.positionState === 'OOP' ? BASE_OOP : BASE_IP;

        for (const rf of RIVER_FAMILIES) {
            for (const hc of RIVER_HAND_CLASSES) {
                const baseFreqs = baseTable[hc];
                if (!baseFreqs) continue;
                const raw = (baseFreqs[rf] !== undefined) ? baseFreqs[rf] : baseFreqs._default;
                if (raw === undefined) continue;
                const bet = Math.max(0.05, Math.min(0.95, parseFloat((raw + famOff).toFixed(2))));
                const chk = parseFloat((1 - bet).toFixed(2));
                const preferred = bet >= 0.50 ? 'bet50' : 'check';
                const sk = makeRiverCBetSpotKeyV1({
                    preflopFamily: fam, positionState: fi.positionState,
                    riverFamily: rf, heroHandClass: hc
                });
                POSTFLOP_RIVER_STRATEGY[sk] = {
                    actions: { check: chk, bet50: bet },
                    preferredAction: preferred,
                    reasoning: RIVER_REASONING[hc] || '',
                    simplification: 'Phase 3: River Barrel (50% pot)'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[RiverV1] Built ${Object.keys(POSTFLOP_RIVER_STRATEGY).length} PFR river strategy entries.`);
    }
})();

(function() {
    const BASE = {
        STRAIGHT_FLUSH: { _default: { fold: 0.00, call: 0.10, raise: 0.90 } },
        QUADS:        { _default: { fold: 0.00, call: 0.15, raise: 0.85 } },
        FULL_HOUSE:   { _default: { fold: 0.00, call: 0.20, raise: 0.80 },
                        FLUSH_COMPLETE: { fold: 0.00, call: 0.18, raise: 0.82 } },
        FLUSH:        { _default: { fold: 0.00, call: 0.25, raise: 0.75 } },
        STRAIGHT:     { _default: { fold: 0.00, call: 0.28, raise: 0.72 } },
        SET:          { _default: { fold: 0.00, call: 0.32, raise: 0.68 },
                        FLUSH_COMPLETE: { fold: 0.00, call: 0.26, raise: 0.74 } },
        TRIPS:        { _default: { fold: 0.00, call: 0.30, raise: 0.70 },
                        FLUSH_COMPLETE: { fold: 0.00, call: 0.24, raise: 0.76 } },
        BOARD_TRIPS:  { _default: { fold: 0.12, call: 0.65, raise: 0.23 },
                        FLUSH_COMPLETE: { fold: 0.22, call: 0.60, raise: 0.18 },
                        STRAIGHT_COMPLETE: { fold: 0.20, call: 0.62, raise: 0.18 } },
        TWO_PAIR:     { _default: { fold: 0.00, call: 0.48, raise: 0.52 },
                        FLUSH_COMPLETE: { fold: 0.05, call: 0.54, raise: 0.41 },
                        STRAIGHT_COMPLETE: { fold: 0.06, call: 0.56, raise: 0.38 } },
        OVERPAIR:     { _default: { fold: 0.00, call: 0.75, raise: 0.25 },
                        ACE_OVERCARD: { fold: 0.00, call: 0.82, raise: 0.18 },
                        FLUSH_COMPLETE: { fold: 0.06, call: 0.74, raise: 0.20 },
                        STRAIGHT_COMPLETE: { fold: 0.10, call: 0.72, raise: 0.18 } },
        TOP_PAIR:     { _default: { fold: 0.10, call: 0.78, raise: 0.12 },
                        BRICK: { fold: 0.07, call: 0.82, raise: 0.11 },
                        LOW_BLANK: { fold: 0.06, call: 0.83, raise: 0.11 },
                        ACE_OVERCARD: { fold: 0.22, call: 0.70, raise: 0.08 },
                        FLUSH_COMPLETE: { fold: 0.25, call: 0.66, raise: 0.09 },
                        STRAIGHT_COMPLETE: { fold: 0.28, call: 0.64, raise: 0.08 } },
        SECOND_PAIR:  { _default: { fold: 0.55, call: 0.40, raise: 0.05 },
                        BRICK: { fold: 0.48, call: 0.46, raise: 0.06 },
                        FLUSH_COMPLETE: { fold: 0.65, call: 0.30, raise: 0.05 } },
        THIRD_PAIR:   { _default: { fold: 0.72, call: 0.24, raise: 0.04 },
                        BRICK: { fold: 0.65, call: 0.30, raise: 0.05 } },
        UNDERPAIR:    { _default: { fold: 0.78, call: 0.18, raise: 0.04 },
                        BRICK: { fold: 0.70, call: 0.26, raise: 0.04 } },
        ACE_HIGH:     { _default: { fold: 0.70, call: 0.26, raise: 0.04 },
                        BRICK: { fold: 0.62, call: 0.32, raise: 0.06 } },
        OVERCARDS:    { _default: { fold: 0.80, call: 0.16, raise: 0.04 },
                        BRICK: { fold: 0.72, call: 0.22, raise: 0.06 } },
        AIR:          { _default: { fold: 0.90, call: 0.07, raise: 0.03 },
                        BRICK: { fold: 0.82, call: 0.12, raise: 0.06 } }
    };

    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush — raise for maximum value.',
        QUADS:        'Quads — raise for maximum value.',
        FULL_HOUSE:   'Full house — raise for value.',
        FLUSH:        'Made flush — raise or call for value.',
        STRAIGHT:     'Made straight — raise or call for value.',
        SET:          'Set — raise for value.',
        TRIPS:        'Trips — raise or call for value.',
        BOARD_TRIPS:  'Board trips — kicker matters. Mostly call; raise with the best kickers.',
        TWO_PAIR:     'Two pair — raise or call for value.',
        OVERPAIR:     'Overpair is a bluff-catcher on the river — mostly call.',
        TOP_PAIR:     'Top pair is a bluff-catcher — call; rarely raise.',
        SECOND_PAIR:  'Second pair is thin on the river — mostly fold.',
        THIRD_PAIR:   'Third pair — fold to river bets.',
        UNDERPAIR:    'Underpair — fold to river bets.',
        ACE_HIGH:     'Ace-high — fold to most river bets.',
        OVERCARDS:    'Overcards only — fold.',
        AIR:          'No hand — fold.'
    };

    const FAM_OFF = {
        BTN_vs_BB:  0,     CO_vs_BB:   0.02,  SB_vs_BB:   0.03,
        HJ_vs_BB:  -0.02,  LJ_vs_BB:  -0.04,  UTG_vs_BB: -0.06,
        BTN_vs_SB: -0.02,  CO_vs_BTN:  0.03,
    };

    for (const fam of DEFENDER_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const off = FAM_OFF[fam] || 0;

        for (const rf of RIVER_FAMILIES) {
            for (const hc of RIVER_HAND_CLASSES) {
                const hcData = BASE[hc];
                if (!hcData) continue;
                const raw = hcData[rf] || hcData._default;
                if (!raw) continue;

                let fold  = Math.max(0, raw.fold - off);
                let call  = raw.call + off * 0.5;
                let raise = raw.raise + off * 0.5;
                const total = fold + call + raise;
                fold  = parseFloat((fold  / total).toFixed(2));
                call  = parseFloat((call  / total).toFixed(2));
                raise = parseFloat((1 - fold - call).toFixed(2));
                fold  = Math.max(0, Math.min(1, fold));
                call  = Math.max(0, Math.min(1, call));
                raise = Math.max(0, Math.min(1, raise));

                let preferred;
                if (fold >= call && fold >= raise) preferred = 'fold';
                else if (raise >= call && raise >= fold) preferred = 'raise';
                else preferred = 'call';

                const sk = makeRiverDefendSpotKeyV1({
                    preflopFamily: fam, riverFamily: rf, heroHandClass: hc
                });
                POSTFLOP_RIVER_DEFEND_STRATEGY[sk] = {
                    actions: { fold, call, raise },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: 'Phase 3: River Defender vs Bet'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[RiverV1] Built ${Object.keys(POSTFLOP_RIVER_DEFEND_STRATEGY).length} defender river strategy entries.`);
    }
})();

(function() {
    const BASE_IP = {
        STRAIGHT_FLUSH: { _default: 0.94 },
        QUADS:          { _default: 0.92 },
        FULL_HOUSE:     { _default: 0.90, FLUSH_COMPLETE: 0.86, STRAIGHT_COMPLETE: 0.84 },
        FLUSH:          { _default: 0.88, FLUSH_COMPLETE: 0.80 },
        STRAIGHT:       { _default: 0.83 },
        SET:            { _default: 0.90, FLUSH_COMPLETE: 0.78, STRAIGHT_COMPLETE: 0.74 },
        TRIPS:          { _default: 0.86, FLUSH_COMPLETE: 0.74, STRAIGHT_COMPLETE: 0.70,
                          BOARD_PAIR: 0.82, ACE_OVERCARD: 0.78, BROADWAY_OVERCARD: 0.80 },
        BOARD_TRIPS:    { _default: 0.54, BRICK: 0.58, LOW_BLANK: 0.60, FLUSH_COMPLETE: 0.38,
                          STRAIGHT_COMPLETE: 0.34, ACE_OVERCARD: 0.44, BROADWAY_OVERCARD: 0.48, BOARD_PAIR: 0.50 },
        TWO_PAIR:       { _default: 0.82, FLUSH_COMPLETE: 0.66, STRAIGHT_COMPLETE: 0.64, ACE_OVERCARD: 0.72 },
        OVERPAIR:       { _default: 0.70, ACE_OVERCARD: 0.28, FLUSH_COMPLETE: 0.52, STRAIGHT_COMPLETE: 0.48,
                          BROADWAY_OVERCARD: 0.56, OVERCARD: 0.54, BOARD_PAIR: 0.64, DYNAMIC_CONNECTOR: 0.62 },
        TOP_PAIR:       { _default: 0.56, BRICK: 0.62, LOW_BLANK: 0.64, ACE_OVERCARD: 0.33,
                          FLUSH_COMPLETE: 0.38, STRAIGHT_COMPLETE: 0.35, BROADWAY_OVERCARD: 0.44,
                          OVERCARD: 0.44, BOARD_PAIR: 0.52, DYNAMIC_CONNECTOR: 0.48 },
        SECOND_PAIR:    { _default: 0.25, BRICK: 0.30, LOW_BLANK: 0.32, ACE_OVERCARD: 0.15,
                          FLUSH_COMPLETE: 0.15, STRAIGHT_COMPLETE: 0.12 },
        THIRD_PAIR:     { _default: 0.14, BRICK: 0.18, FLUSH_COMPLETE: 0.07 },
        UNDERPAIR:      { _default: 0.16, BRICK: 0.20, FLUSH_COMPLETE: 0.07 },
        ACE_HIGH:       { _default: 0.50, BRICK: 0.56, LOW_BLANK: 0.58, ACE_OVERCARD: 0.32,
                          FLUSH_COMPLETE: 0.28, STRAIGHT_COMPLETE: 0.25, BROADWAY_OVERCARD: 0.42,
                          OVERCARD: 0.36, BOARD_PAIR: 0.42 },
        OVERCARDS:      { _default: 0.34, BRICK: 0.38, LOW_BLANK: 0.40, ACE_OVERCARD: 0.18,
                          FLUSH_COMPLETE: 0.16, STRAIGHT_COMPLETE: 0.14 },
        AIR:            { _default: 0.32, BRICK: 0.36, LOW_BLANK: 0.38, ACE_OVERCARD: 0.15,
                          FLUSH_COMPLETE: 0.12, STRAIGHT_COMPLETE: 0.10, BROADWAY_OVERCARD: 0.24 }
    };

    const BASE_OOP = {
        STRAIGHT_FLUSH: { _default: 0.86 },
        QUADS:          { _default: 0.84 },
        FULL_HOUSE:     { _default: 0.82, FLUSH_COMPLETE: 0.76, STRAIGHT_COMPLETE: 0.74 },
        FLUSH:          { _default: 0.79, FLUSH_COMPLETE: 0.72 },
        STRAIGHT:       { _default: 0.74 },
        SET:            { _default: 0.80, FLUSH_COMPLETE: 0.66, STRAIGHT_COMPLETE: 0.62 },
        TRIPS:          { _default: 0.74, FLUSH_COMPLETE: 0.62, STRAIGHT_COMPLETE: 0.58 },
        BOARD_TRIPS:    { _default: 0.42, BRICK: 0.46, LOW_BLANK: 0.48, FLUSH_COMPLETE: 0.28,
                          STRAIGHT_COMPLETE: 0.24, ACE_OVERCARD: 0.34 },
        TWO_PAIR:       { _default: 0.70, FLUSH_COMPLETE: 0.54, STRAIGHT_COMPLETE: 0.52 },
        OVERPAIR:       { _default: 0.56, ACE_OVERCARD: 0.22, FLUSH_COMPLETE: 0.42, STRAIGHT_COMPLETE: 0.38 },
        TOP_PAIR:       { _default: 0.44, BRICK: 0.50, LOW_BLANK: 0.52, ACE_OVERCARD: 0.26,
                          FLUSH_COMPLETE: 0.28, STRAIGHT_COMPLETE: 0.26 },
        SECOND_PAIR:    { _default: 0.16, BRICK: 0.20, FLUSH_COMPLETE: 0.08 },
        THIRD_PAIR:     { _default: 0.10 },
        UNDERPAIR:      { _default: 0.12 },
        ACE_HIGH:       { _default: 0.36, BRICK: 0.42, LOW_BLANK: 0.44, FLUSH_COMPLETE: 0.18 },
        OVERCARDS:      { _default: 0.22, BRICK: 0.26, FLUSH_COMPLETE: 0.09 },
        AIR:            { _default: 0.22, BRICK: 0.26, LOW_BLANK: 0.29, FLUSH_COMPLETE: 0.08 }
    };

    const RIVER_REASONING = {
        STRAIGHT_FLUSH: 'Straight flush in 3BP — extract maximum value from committed ranges.',
        QUADS: 'Quads in 3BP — bet for maximum value.', FULL_HOUSE: 'Full house in 3BP — bet for value.',
        FLUSH: 'Flush in 3BP — bet for value.', STRAIGHT: 'Straight in 3BP — bet for value.',
        SET: 'Set in 3BP — bet for value; committed 3BP pot.',
        TRIPS: 'Trips in 3BP — bet for value.', BOARD_TRIPS: 'Board trips in 3BP — kicker-dependent.',
        TWO_PAIR: 'Two pair in 3BP — bet for value.',
        OVERPAIR: 'Overpair in 3BP — bet for thin value; ranges are committed.',
        TOP_PAIR: 'Top pair in 3BP — bet for thin value on blanks.',
        SECOND_PAIR: 'Second pair in 3BP — check for showdown.',
        THIRD_PAIR: 'Third pair in 3BP — check.', UNDERPAIR: 'Underpair in 3BP — check.',
        ACE_HIGH: 'Ace-high in 3BP — bluff on polar-range-favoring rivers.',
        OVERCARDS: 'Overcards in 3BP — occasional bluff; mostly check.',
        AIR: 'Air in 3BP — bluff on very favorable runouts; otherwise check.'
    };

    const FAMILY_OFF = {
        BTN_3BP_vs_CO:  0,    BTN_3BP_vs_HJ:  0.03, CO_3BP_vs_HJ:   0.02,
        BTN_3BP_vs_UTG: 0.05, CO_3BP_vs_UTG:  0.04, HJ_3BP_vs_UTG:  0.04,
        BB_3BP_vs_BTN:  0,    BB_3BP_vs_CO:   0.03, SB_3BP_vs_BTN:  0.02,
        SB_3BP_vs_CO:   0.03, SB_3BP_vs_HJ:   0.04, SB_3BP_vs_UTG:  0.05, BB_3BP_vs_HJ: 0.04
    };

    for (const fam of HERO_HAND_AWARE_3BP_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;
        const baseTable = fi.positionState === 'OOP' ? BASE_OOP : BASE_IP;
        for (const rf of RIVER_FAMILIES) {
            for (const hc of RIVER_HAND_CLASSES) {
                const baseFreqs = baseTable[hc];
                if (!baseFreqs) continue;
                const raw = (baseFreqs[rf] !== undefined) ? baseFreqs[rf] : baseFreqs._default;
                if (raw === undefined) continue;
                const bet = Math.max(0.05, Math.min(0.95, parseFloat((raw + famOff).toFixed(2))));
                const chk = parseFloat((1 - bet).toFixed(2));
                const sk = make3BPRiverCBetSpotKeyV1({ preflopFamily: fam, positionState: fi.positionState, riverFamily: rf, heroHandClass: hc });
                POSTFLOP_3BP_RIVER_STRATEGY[sk] = {
                    actions: { check: chk, bet50: bet },
                    preferredAction: bet >= 0.50 ? 'bet50' : 'check',
                    reasoning: RIVER_REASONING[hc] || '',
                    simplification: fi.positionState === 'OOP' ? '3BP OOP River Barrel (50% pot)' : '3BP IP River Barrel (50% pot)'
                };
            }
        }
    }
    if (window.RANGE_VALIDATE) {
        console.log(`[3BPRiverV1] Built ${Object.keys(POSTFLOP_3BP_RIVER_STRATEGY).length} 3BP PFR river strategy entries.`);
    }
})();

(function() {
    const BASE = {
        STRAIGHT_FLUSH: { _default: { fold: 0.00, call: 0.08, raise: 0.92 } },
        QUADS:          { _default: { fold: 0.00, call: 0.12, raise: 0.88 } },
        FULL_HOUSE:     { _default: { fold: 0.00, call: 0.18, raise: 0.82 },
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.16, raise: 0.84 } },
        FLUSH:          { _default: { fold: 0.00, call: 0.22, raise: 0.78 } },
        STRAIGHT:       { _default: { fold: 0.00, call: 0.26, raise: 0.74 } },
        SET:            { _default: { fold: 0.00, call: 0.28, raise: 0.72 },
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.22, raise: 0.78 } },
        TRIPS:          { _default: { fold: 0.00, call: 0.28, raise: 0.72 },
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.22, raise: 0.78 } },
        BOARD_TRIPS:    { _default: { fold: 0.10, call: 0.66, raise: 0.24 },
                          FLUSH_COMPLETE: { fold: 0.20, call: 0.62, raise: 0.18 },
                          STRAIGHT_COMPLETE: { fold: 0.18, call: 0.64, raise: 0.18 } },
        TWO_PAIR:       { _default: { fold: 0.00, call: 0.44, raise: 0.56 },
                          FLUSH_COMPLETE: { fold: 0.04, call: 0.52, raise: 0.44 },
                          STRAIGHT_COMPLETE: { fold: 0.05, call: 0.54, raise: 0.41 } },
        OVERPAIR:       { _default: { fold: 0.00, call: 0.72, raise: 0.28 },
                          ACE_OVERCARD: { fold: 0.02, call: 0.78, raise: 0.20 },
                          FLUSH_COMPLETE: { fold: 0.05, call: 0.72, raise: 0.23 },
                          STRAIGHT_COMPLETE: { fold: 0.08, call: 0.70, raise: 0.22 } },
        TOP_PAIR:       { _default: { fold: 0.12, call: 0.76, raise: 0.12 },
                          BRICK: { fold: 0.08, call: 0.80, raise: 0.12 },
                          LOW_BLANK: { fold: 0.07, call: 0.82, raise: 0.11 },
                          ACE_OVERCARD: { fold: 0.26, call: 0.66, raise: 0.08 },
                          FLUSH_COMPLETE: { fold: 0.30, call: 0.62, raise: 0.08 },
                          STRAIGHT_COMPLETE: { fold: 0.32, call: 0.60, raise: 0.08 } },
        SECOND_PAIR:    { _default: { fold: 0.45, call: 0.50, raise: 0.05 },
                          BRICK: { fold: 0.32, call: 0.62, raise: 0.06 },
                          LOW_BLANK: { fold: 0.28, call: 0.66, raise: 0.06 },
                          ACE_OVERCARD: { fold: 0.60, call: 0.36, raise: 0.04 },
                          FLUSH_COMPLETE: { fold: 0.62, call: 0.34, raise: 0.04 },
                          STRAIGHT_COMPLETE: { fold: 0.65, call: 0.32, raise: 0.03 } },
        THIRD_PAIR:     { _default: { fold: 0.72, call: 0.26, raise: 0.02 },
                          BRICK: { fold: 0.60, call: 0.36, raise: 0.04 },
                          FLUSH_COMPLETE: { fold: 0.80, call: 0.18, raise: 0.02 } },
        UNDERPAIR:      { _default: { fold: 0.76, call: 0.22, raise: 0.02 },
                          BRICK: { fold: 0.64, call: 0.32, raise: 0.04 } },
        ACE_HIGH:       { _default: { fold: 0.72, call: 0.24, raise: 0.04 },
                          BRICK: { fold: 0.56, call: 0.38, raise: 0.06 },
                          FLUSH_COMPLETE: { fold: 0.82, call: 0.16, raise: 0.02 } },
        OVERCARDS:      { _default: { fold: 0.82, call: 0.16, raise: 0.02 },
                          BRICK: { fold: 0.68, call: 0.28, raise: 0.04 } },
        AIR:            { _default: { fold: 0.92, call: 0.07, raise: 0.01 },
                          BRICK: { fold: 0.82, call: 0.15, raise: 0.03 } }
    };

    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush in 3BP — raise for maximum value.',
        QUADS: 'Quads in 3BP — raise to extract value.', FULL_HOUSE: 'Full house in 3BP — raise.',
        FLUSH: 'Flush in 3BP — raise nutted flush.', STRAIGHT: 'Straight in 3BP — raise or call.',
        SET: 'Set in 3BP — raise for value.', TRIPS: 'Trips in 3BP — raise or call for value.',
        BOARD_TRIPS: 'Board trips in 3BP — kicker-dependent call.',
        TWO_PAIR: 'Two pair in 3BP — raise most combos on the river.',
        OVERPAIR: 'Overpair in 3BP — call; no worse hands call a raise.',
        TOP_PAIR: 'Top pair in 3BP — call on blanks; fold on dangerous rivers.',
        SECOND_PAIR: 'Second pair in 3BP — fold most; call only on bricks.',
        THIRD_PAIR: 'Third pair in 3BP — fold most.', UNDERPAIR: 'Underpair in 3BP — fold.',
        ACE_HIGH: 'Ace-high in 3BP — mostly fold.', OVERCARDS: 'Overcards in 3BP — fold.',
        AIR: 'Air in 3BP — fold.'
    };

    const FAM_OFF = {
        BTN_CALL_3BP_vs_BB: 0,   BTN_CALL_3BP_vs_SB:  0.01,
        CO_CALL_3BP_vs_BB: -0.01, CO_CALL_3BP_vs_BTN: 0, HJ_CALL_3BP_vs_BTN: 0.02
    };

    for (const fam of HERO_HAND_AWARE_3BP_DEFEND_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAM_OFF[fam] || 0;
        for (const rf of RIVER_FAMILIES) {
            for (const hc of RIVER_HAND_CLASSES) {
                const row = BASE[hc];
                if (!row) continue;
                const rawObj = row[rf] !== undefined ? row[rf] : row._default;
                const fold  = Math.max(0, Math.min(1, parseFloat((rawObj.fold  - famOff).toFixed(2))));
                const raise = Math.max(0, Math.min(1, parseFloat((rawObj.raise + famOff).toFixed(2))));
                const call  = parseFloat(Math.max(0, 1 - fold - raise).toFixed(2));
                let preferred = 'call';
                if (fold >= 0.50) preferred = 'fold';
                else if (raise >= 0.50) preferred = 'raise';
                const sk = make3BPRiverDefendSpotKeyV1({ preflopFamily: fam, positionState: fi.positionState, riverFamily: rf, heroHandClass: hc });
                POSTFLOP_3BP_RIVER_DEFEND_STRATEGY[sk] = {
                    actions: { fold, call, raise }, preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: fi.positionState === 'IP' ? '3BP IP Defender vs River Barrel' : '3BP OOP Defender vs River Barrel'
                };
            }
        }
    }
    if (window.RANGE_VALIDATE) {
        console.log(`[3BPRiverDefend] Built ${Object.keys(POSTFLOP_3BP_RIVER_DEFEND_STRATEGY).length} 3BP defender river strategy entries.`);
    }
})();

(function() {
    const BASE_IP = {
        STRAIGHT_FLUSH: { _default: 0.94 },
        QUADS:          { _default: 0.92 },
        FULL_HOUSE:     { _default: 0.91, FLUSH_COMPLETE: 0.86, STRAIGHT_COMPLETE: 0.84 },
        FLUSH:          { _default: 0.88, FLUSH_COMPLETE: 0.80 },
        STRAIGHT:       { _default: 0.82 },
        SET:            { _default: 0.88, FLUSH_COMPLETE: 0.76, STRAIGHT_COMPLETE: 0.72 },
        TRIPS:          { _default: 0.82, FLUSH_COMPLETE: 0.68, STRAIGHT_COMPLETE: 0.64, BOARD_PAIR: 0.78, ACE_OVERCARD: 0.72, BROADWAY_OVERCARD: 0.74 },
        BOARD_TRIPS:    { _default: 0.44, BRICK: 0.50, LOW_BLANK: 0.52, FLUSH_COMPLETE: 0.28, STRAIGHT_COMPLETE: 0.24, ACE_OVERCARD: 0.34, BROADWAY_OVERCARD: 0.38, BOARD_PAIR: 0.40, OVERCARD: 0.36 },
        TWO_PAIR:       { _default: 0.74, FLUSH_COMPLETE: 0.58, STRAIGHT_COMPLETE: 0.55, ACE_OVERCARD: 0.64 },
        OVERPAIR:       { _default: 0.58, ACE_OVERCARD: 0.20, FLUSH_COMPLETE: 0.42, STRAIGHT_COMPLETE: 0.38, BROADWAY_OVERCARD: 0.46, OVERCARD: 0.44, BOARD_PAIR: 0.54, DYNAMIC_CONNECTOR: 0.50 },
        TOP_PAIR:       { _default: 0.44, BRICK: 0.50, LOW_BLANK: 0.52, ACE_OVERCARD: 0.24, FLUSH_COMPLETE: 0.28, STRAIGHT_COMPLETE: 0.25, BROADWAY_OVERCARD: 0.34, OVERCARD: 0.32, BOARD_PAIR: 0.40, DYNAMIC_CONNECTOR: 0.38 },
        SECOND_PAIR:    { _default: 0.18, BRICK: 0.22, LOW_BLANK: 0.25, ACE_OVERCARD: 0.09, FLUSH_COMPLETE: 0.09, STRAIGHT_COMPLETE: 0.07 },
        THIRD_PAIR:     { _default: 0.09, BRICK: 0.12, FLUSH_COMPLETE: 0.04 },
        UNDERPAIR:      { _default: 0.10, BRICK: 0.13, FLUSH_COMPLETE: 0.04 },
        ACE_HIGH:       { _default: 0.38, BRICK: 0.43, LOW_BLANK: 0.45, ACE_OVERCARD: 0.20, FLUSH_COMPLETE: 0.18, STRAIGHT_COMPLETE: 0.15, BROADWAY_OVERCARD: 0.30, OVERCARD: 0.25, BOARD_PAIR: 0.30 },
        OVERCARDS:      { _default: 0.22, BRICK: 0.26, LOW_BLANK: 0.28, ACE_OVERCARD: 0.10, FLUSH_COMPLETE: 0.09, STRAIGHT_COMPLETE: 0.07 },
        AIR:            { _default: 0.20, BRICK: 0.24, LOW_BLANK: 0.26, ACE_OVERCARD: 0.08, FLUSH_COMPLETE: 0.07, STRAIGHT_COMPLETE: 0.05, BROADWAY_OVERCARD: 0.14 }
    };
    const BASE_OOP = {
        STRAIGHT_FLUSH: { _default: 0.84 },
        QUADS:          { _default: 0.82 },
        FULL_HOUSE:     { _default: 0.81, FLUSH_COMPLETE: 0.74, STRAIGHT_COMPLETE: 0.72 },
        FLUSH:          { _default: 0.78, FLUSH_COMPLETE: 0.70 },
        STRAIGHT:       { _default: 0.72 },
        SET:            { _default: 0.78, FLUSH_COMPLETE: 0.64, STRAIGHT_COMPLETE: 0.60 },
        TRIPS:          { _default: 0.70, FLUSH_COMPLETE: 0.56, STRAIGHT_COMPLETE: 0.52, BOARD_PAIR: 0.68, ACE_OVERCARD: 0.60, BROADWAY_OVERCARD: 0.62 },
        BOARD_TRIPS:    { _default: 0.32, BRICK: 0.38, LOW_BLANK: 0.40, FLUSH_COMPLETE: 0.18, STRAIGHT_COMPLETE: 0.15, ACE_OVERCARD: 0.24, BROADWAY_OVERCARD: 0.28, OVERCARD: 0.26, BOARD_PAIR: 0.30 },
        TWO_PAIR:       { _default: 0.62, FLUSH_COMPLETE: 0.46, STRAIGHT_COMPLETE: 0.44, ACE_OVERCARD: 0.54 },
        OVERPAIR:       { _default: 0.45, ACE_OVERCARD: 0.14, FLUSH_COMPLETE: 0.30, STRAIGHT_COMPLETE: 0.26, BROADWAY_OVERCARD: 0.33, OVERCARD: 0.30, BOARD_PAIR: 0.40, DYNAMIC_CONNECTOR: 0.36 },
        TOP_PAIR:       { _default: 0.33, BRICK: 0.39, LOW_BLANK: 0.41, ACE_OVERCARD: 0.16, FLUSH_COMPLETE: 0.17, STRAIGHT_COMPLETE: 0.15, BROADWAY_OVERCARD: 0.22, OVERCARD: 0.20, BOARD_PAIR: 0.28, DYNAMIC_CONNECTOR: 0.25 },
        SECOND_PAIR:    { _default: 0.11, BRICK: 0.15, FLUSH_COMPLETE: 0.05 },
        THIRD_PAIR:     { _default: 0.06 },
        UNDERPAIR:      { _default: 0.07 },
        ACE_HIGH:       { _default: 0.26, BRICK: 0.32, LOW_BLANK: 0.35, FLUSH_COMPLETE: 0.12 },
        OVERCARDS:      { _default: 0.14, BRICK: 0.18, FLUSH_COMPLETE: 0.06 },
        AIR:            { _default: 0.12, BRICK: 0.16, LOW_BLANK: 0.18, FLUSH_COMPLETE: 0.04 }
    };
    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush slow-played through flop -- ultimate value bet on river.',
        QUADS:          'Quads slow-played -- extract max value on river.',
        FULL_HOUSE:     'Full house slow-played through flop -- bet for full value.',
        FLUSH:          'Flush slow-played -- bet for value now.',
        STRAIGHT:       'Straight slow-played -- bet for value.',
        SET:            'Set slow-played flop, bet turn -- extract full value on river.',
        TRIPS:          'Trips -- strong enough to barrel the river for value.',
        BOARD_TRIPS:    'Board trips -- marginal value. Bet selectively on safe rivers.',
        TWO_PAIR:       'Two pair -- barrel for value on blank rivers.',
        OVERPAIR:       'Overpair -- villain range is strong after flop check-through. Be selective on 2nd barrel.',
        TOP_PAIR:       'Top pair -- thin value only on pure blank rivers. Villain is uncapped.',
        SECOND_PAIR:    'Second pair -- check. Villain has too many strong hands after flop check-through.',
        THIRD_PAIR:     'Third pair -- check. No value on river.',
        UNDERPAIR:      'Underpair -- check. No value on river.',
        ACE_HIGH:       'Ace-high -- bluff only on perfect runouts. Villain range is strong after calling delayed c-bet.',
        OVERCARDS:      'Overcards -- give up mostly. Villain uncapped range makes bluffing very thin.',
        AIR:            'Air -- check. Villain is too strong after surviving flop check-through.'
    };
    const FAMILY_OFF = { BTN_vs_BB: 0, CO_vs_BB: -0.03, HJ_vs_BB: -0.02, LJ_vs_BB: -0.01, UTG_vs_BB: 0.02, BTN_vs_SB: 0.02, SB_vs_BB: 0, CO_vs_BTN: -0.03 };
    for (const fam of HERO_HAND_AWARE_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;
        const baseTable = fi.positionState === 'OOP' ? BASE_OOP : BASE_IP;
        for (const rf of RIVER_FAMILIES) {
            for (const hc of RIVER_HAND_CLASSES) {
                const baseFreqs = baseTable[hc];
                if (!baseFreqs) continue;
                const raw = (baseFreqs[rf] !== undefined) ? baseFreqs[rf] : baseFreqs._default;
                if (raw === undefined) continue;
                const bet = Math.max(0.05, Math.min(0.95, parseFloat((raw + famOff).toFixed(2))));
                const chk = parseFloat((1 - bet).toFixed(2));
                const preferred = bet >= 0.50 ? 'bet50' : 'check';
                const sk = makeRiverDelayedCBetSpotKeyV1({ preflopFamily: fam, positionState: fi.positionState, riverFamily: rf, heroHandClass: hc });
                POSTFLOP_RIVER_DELAYED_STRATEGY[sk] = { actions: { check: chk, bet50: bet }, preferredAction: preferred, reasoning: REASONING[hc] || '', simplification: 'Phase 3: River Barrel -- Delayed Line (50% pot)' };
            }
        }
    }
    if (window.RANGE_VALIDATE) { console.log('[RiverDelayed] Built ' + Object.keys(POSTFLOP_RIVER_DELAYED_STRATEGY).length + ' delayed river strategy entries.'); }
})();

(function() {
    // PFR checked flop → range is less nut-heavy → BB calls more, folds less, raises more with nuts
    const BASE = {
        STRAIGHT_FLUSH: { _default: { fold: 0.00, call: 0.06, raise: 0.94 } },
        QUADS:          { _default: { fold: 0.00, call: 0.10, raise: 0.90 } },
        FULL_HOUSE:     { _default: { fold: 0.00, call: 0.15, raise: 0.85 },
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.13, raise: 0.87 } },
        FLUSH:          { _default: { fold: 0.00, call: 0.18, raise: 0.82 } },
        STRAIGHT:       { _default: { fold: 0.00, call: 0.22, raise: 0.78 } },
        SET:            { _default: { fold: 0.00, call: 0.24, raise: 0.76 },
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.18, raise: 0.82 } },
        TRIPS:          { _default: { fold: 0.00, call: 0.22, raise: 0.78 },
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.16, raise: 0.84 } },
        BOARD_TRIPS:    { _default: { fold: 0.05, call: 0.74, raise: 0.21 },
                          FLUSH_COMPLETE: { fold: 0.14, call: 0.70, raise: 0.16 },
                          STRAIGHT_COMPLETE: { fold: 0.12, call: 0.72, raise: 0.16 } },
        TWO_PAIR:       { _default: { fold: 0.00, call: 0.56, raise: 0.44 },
                          FLUSH_COMPLETE: { fold: 0.03, call: 0.62, raise: 0.35 },
                          STRAIGHT_COMPLETE: { fold: 0.04, call: 0.64, raise: 0.32 } },
        OVERPAIR:       { _default: { fold: 0.00, call: 0.82, raise: 0.18 },
                          ACE_OVERCARD: { fold: 0.00, call: 0.87, raise: 0.13 },
                          FLUSH_COMPLETE: { fold: 0.04, call: 0.80, raise: 0.16 },
                          STRAIGHT_COMPLETE: { fold: 0.07, call: 0.77, raise: 0.16 } },
        TOP_PAIR:       { _default: { fold: 0.05, call: 0.85, raise: 0.10 },
                          BRICK: { fold: 0.03, call: 0.88, raise: 0.09 },
                          LOW_BLANK: { fold: 0.02, call: 0.89, raise: 0.09 },
                          ACE_OVERCARD: { fold: 0.16, call: 0.76, raise: 0.08 },
                          FLUSH_COMPLETE: { fold: 0.18, call: 0.74, raise: 0.08 },
                          STRAIGHT_COMPLETE: { fold: 0.20, call: 0.72, raise: 0.08 } },
        SECOND_PAIR:    { _default: { fold: 0.40, call: 0.54, raise: 0.06 },
                          BRICK: { fold: 0.30, call: 0.63, raise: 0.07 },
                          FLUSH_COMPLETE: { fold: 0.54, call: 0.40, raise: 0.06 } },
        THIRD_PAIR:     { _default: { fold: 0.58, call: 0.37, raise: 0.05 },
                          BRICK: { fold: 0.48, call: 0.46, raise: 0.06 } },
        UNDERPAIR:      { _default: { fold: 0.63, call: 0.31, raise: 0.06 },
                          BRICK: { fold: 0.53, call: 0.41, raise: 0.06 } },
        ACE_HIGH:       { _default: { fold: 0.58, call: 0.36, raise: 0.06 },
                          BRICK: { fold: 0.46, call: 0.47, raise: 0.07 } },
        OVERCARDS:      { _default: { fold: 0.68, call: 0.25, raise: 0.07 },
                          BRICK: { fold: 0.55, call: 0.36, raise: 0.09 } },
        AIR:            { _default: { fold: 0.78, call: 0.14, raise: 0.08 },
                          BRICK: { fold: 0.65, call: 0.24, raise: 0.11 } }
    };

    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush — raise for maximum value.',
        QUADS:          'Quads — raise for maximum value.',
        FULL_HOUSE:     'Full house — raise; PFR checked flop so range is less polar.',
        FLUSH:          'Made flush — raise; PFR\'s delayed line is less nut-heavy.',
        STRAIGHT:       'Made straight — raise; PFR\'s range is capped by flop check.',
        SET:            'Set — raise; PFR has fewer nutted hands on delayed line.',
        TRIPS:          'Trips — raise; PFR\'s delayed triple-barrel is bluff-heavy.',
        BOARD_TRIPS:    'Board trips — PFR checked flop; call down more liberally.',
        TWO_PAIR:       'Two pair — raise or call; PFR\'s range is merged, not polar.',
        OVERPAIR:       'Overpair — call; PFR is less polar, call wider than standard river.',
        TOP_PAIR:       'Top pair — call; PFR\'s delayed line warrants wider defense.',
        SECOND_PAIR:    'Second pair — call more vs delayed line; PFR has more missed draws.',
        THIRD_PAIR:     'Third pair — lean fold, but PFR\'s delayed bluff frequency warrants some calls.',
        UNDERPAIR:      'Underpair — lean fold; still facing a river barrel after turn bet.',
        ACE_HIGH:       'Ace-high — call more vs delayed line; PFR has more bluffs.',
        OVERCARDS:      'Overcards — thin; fold most, call some vs heavily bluffed delayed lines.',
        AIR:            'No hand — fold; even a wider PFR range beats air.'
    };

    const FAM_OFF = {
        BTN_vs_BB:  0,     CO_vs_BB:   0.02,  SB_vs_BB:   0.03,
        HJ_vs_BB:  -0.02,  LJ_vs_BB:  -0.04,  UTG_vs_BB: -0.06,
        BTN_vs_SB: -0.02,  CO_vs_BTN:  0.03,
    };

    for (const fam of DEFENDER_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const off = FAM_OFF[fam] || 0;

        for (const rf of RIVER_FAMILIES) {
            for (const hc of RIVER_HAND_CLASSES) {
                const hcData = BASE[hc];
                if (!hcData) continue;
                const raw = hcData[rf] || hcData._default;
                if (!raw) continue;

                let fold  = Math.max(0, raw.fold - off);
                let call  = raw.call + off * 0.5;
                let raise = raw.raise + off * 0.5;
                const total = fold + call + raise;
                fold  = parseFloat((fold  / total).toFixed(2));
                call  = parseFloat((call  / total).toFixed(2));
                raise = parseFloat((1 - fold - call).toFixed(2));
                fold  = Math.max(0, Math.min(1, fold));
                call  = Math.max(0, Math.min(1, call));
                raise = Math.max(0, Math.min(1, raise));

                let preferred;
                if (fold >= call && fold >= raise) preferred = 'fold';
                else if (raise >= call && raise >= fold) preferred = 'raise';
                else preferred = 'call';

                const sk = makeRiverDelayedDefendSpotKeyV1({ preflopFamily: fam, riverFamily: rf, heroHandClass: hc });
                POSTFLOP_RIVER_DELAYED_DEFEND_STRATEGY[sk] = {
                    actions: { fold, call, raise },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || ''
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[RiverDelayedDefend] Built ${Object.keys(POSTFLOP_RIVER_DELAYED_DEFEND_STRATEGY).length} entries.`);
    }
})();

(function() {
    // IP PFR faces BB's river probe after DOUBLE check-through.
    // IP's range is very capped (checked flop AND turn back).
    // BB's probe is polar on river: strong value or bluffs (no draws remain).
    // IP must defend ~67% MDF vs 50% bet, but range is condensed.
    const BASE_IP = {
        STRAIGHT_FLUSH: { fold: 0.00, call: 0.05, raise: 0.95 },
        QUADS:          { fold: 0.00, call: 0.08, raise: 0.92 },
        FULL_HOUSE:     { fold: 0.00, call: 0.12, raise: 0.88,
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.18, raise: 0.82 } },
        FLUSH:          { fold: 0.00, call: 0.15, raise: 0.85,
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.22, raise: 0.78 } },
        STRAIGHT:       { fold: 0.00, call: 0.18, raise: 0.82 },
        SET:            { fold: 0.00, call: 0.20, raise: 0.80,
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.30, raise: 0.70 },
                          STRAIGHT_COMPLETE: { fold: 0.00, call: 0.32, raise: 0.68 } },
        TRIPS:          { fold: 0.00, call: 0.25, raise: 0.75,
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.38, raise: 0.62 },
                          STRAIGHT_COMPLETE: { fold: 0.00, call: 0.42, raise: 0.58 },
                          ACE_OVERCARD: { fold: 0.00, call: 0.30, raise: 0.70 } },
        BOARD_TRIPS:    { fold: 0.06, call: 0.62, raise: 0.32,
                          FLUSH_COMPLETE: { fold: 0.12, call: 0.66, raise: 0.22 },
                          STRAIGHT_COMPLETE: { fold: 0.14, call: 0.66, raise: 0.20 },
                          ACE_OVERCARD: { fold: 0.10, call: 0.65, raise: 0.25 } },
        TWO_PAIR:       { fold: 0.00, call: 0.36, raise: 0.64,
                          FLUSH_COMPLETE: { fold: 0.06, call: 0.58, raise: 0.36 },
                          STRAIGHT_COMPLETE: { fold: 0.08, call: 0.60, raise: 0.32 },
                          ACE_OVERCARD: { fold: 0.03, call: 0.42, raise: 0.55 } },
        OVERPAIR:       { fold: 0.06, call: 0.68, raise: 0.26,
                          ACE_OVERCARD: { fold: 0.24, call: 0.66, raise: 0.10 },
                          FLUSH_COMPLETE: { fold: 0.16, call: 0.68, raise: 0.16 },
                          STRAIGHT_COMPLETE: { fold: 0.20, call: 0.66, raise: 0.14 },
                          BROADWAY_OVERCARD: { fold: 0.12, call: 0.70, raise: 0.18 },
                          OVERCARD: { fold: 0.14, call: 0.68, raise: 0.18 },
                          BOARD_PAIR: { fold: 0.08, call: 0.64, raise: 0.28 },
                          BRICK: { fold: 0.03, call: 0.54, raise: 0.43 },
                          LOW_BLANK: { fold: 0.02, call: 0.50, raise: 0.48 } },
        TOP_PAIR:       { fold: 0.10, call: 0.74, raise: 0.16,
                          BRICK: { fold: 0.05, call: 0.66, raise: 0.29 },
                          LOW_BLANK: { fold: 0.05, call: 0.64, raise: 0.31 },
                          ACE_OVERCARD: { fold: 0.34, call: 0.59, raise: 0.07 },
                          FLUSH_COMPLETE: { fold: 0.28, call: 0.64, raise: 0.08 },
                          STRAIGHT_COMPLETE: { fold: 0.32, call: 0.61, raise: 0.07 },
                          BROADWAY_OVERCARD: { fold: 0.22, call: 0.69, raise: 0.09 },
                          OVERCARD: { fold: 0.24, call: 0.68, raise: 0.08 },
                          BOARD_PAIR: { fold: 0.12, call: 0.72, raise: 0.16 } },
        SECOND_PAIR:    { fold: 0.36, call: 0.58, raise: 0.06,
                          BRICK: { fold: 0.22, call: 0.70, raise: 0.08 },
                          LOW_BLANK: { fold: 0.20, call: 0.72, raise: 0.08 },
                          ACE_OVERCARD: { fold: 0.58, call: 0.38, raise: 0.04 },
                          FLUSH_COMPLETE: { fold: 0.56, call: 0.40, raise: 0.04 },
                          STRAIGHT_COMPLETE: { fold: 0.60, call: 0.36, raise: 0.04 },
                          BROADWAY_OVERCARD: { fold: 0.48, call: 0.48, raise: 0.04 },
                          OVERCARD: { fold: 0.46, call: 0.50, raise: 0.04 } },
        THIRD_PAIR:     { fold: 0.62, call: 0.35, raise: 0.03,
                          BRICK: { fold: 0.46, call: 0.50, raise: 0.04 },
                          LOW_BLANK: { fold: 0.42, call: 0.54, raise: 0.04 },
                          ACE_OVERCARD: { fold: 0.78, call: 0.20, raise: 0.02 },
                          FLUSH_COMPLETE: { fold: 0.76, call: 0.22, raise: 0.02 } },
        UNDERPAIR:      { fold: 0.68, call: 0.30, raise: 0.02,
                          BRICK: { fold: 0.52, call: 0.45, raise: 0.03 },
                          LOW_BLANK: { fold: 0.48, call: 0.49, raise: 0.03 },
                          ACE_OVERCARD: { fold: 0.82, call: 0.17, raise: 0.01 },
                          FLUSH_COMPLETE: { fold: 0.80, call: 0.18, raise: 0.02 } },
        ACE_HIGH:       { fold: 0.48, call: 0.44, raise: 0.08,
                          BRICK: { fold: 0.30, call: 0.56, raise: 0.14 },
                          LOW_BLANK: { fold: 0.26, call: 0.60, raise: 0.14 },
                          ACE_OVERCARD: { fold: 0.42, call: 0.50, raise: 0.08 },
                          FLUSH_COMPLETE: { fold: 0.64, call: 0.32, raise: 0.04 },
                          STRAIGHT_COMPLETE: { fold: 0.68, call: 0.28, raise: 0.04 } },
        OVERCARDS:      { fold: 0.68, call: 0.28, raise: 0.04,
                          BRICK: { fold: 0.50, call: 0.44, raise: 0.06 },
                          LOW_BLANK: { fold: 0.46, call: 0.48, raise: 0.06 },
                          ACE_OVERCARD: { fold: 0.64, call: 0.32, raise: 0.04 },
                          FLUSH_COMPLETE: { fold: 0.80, call: 0.18, raise: 0.02 },
                          STRAIGHT_COMPLETE: { fold: 0.84, call: 0.14, raise: 0.02 } },
        AIR:            { fold: 0.80, call: 0.14, raise: 0.06,
                          BRICK: { fold: 0.62, call: 0.28, raise: 0.10 },
                          LOW_BLANK: { fold: 0.58, call: 0.32, raise: 0.10 },
                          FLUSH_COMPLETE: { fold: 0.88, call: 0.10, raise: 0.02 },
                          STRAIGHT_COMPLETE: { fold: 0.90, call: 0.08, raise: 0.02 },
                          ACE_OVERCARD: { fold: 0.74, call: 0.20, raise: 0.06 } }
    };

    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush vs river probe — raise for max value. IP slow-played, now gets paid.',
        QUADS:          'Quads — raise for value vs BB\'s polar river probe.',
        FULL_HOUSE:     'Full house vs river probe — raise. IP is double-capped so raising is correct.',
        FLUSH:          'Flush vs river probe — raise. IP\'s double-check-back still contains nutted slow-plays.',
        STRAIGHT:       'Straight — raise for value vs BB\'s river probe.',
        SET:            'Set vs river probe — raise. IP checked twice, so raises here are credible slow-plays.',
        TRIPS:          'Trips vs river probe — raise or call depending on texture.',
        BOARD_TRIPS:    'Board trips — kicker-dependent. Call down vs river probe. IP is capped.',
        TWO_PAIR:       'Two pair vs probe — raise or call. IP double-checked; two-pair is top of range.',
        OVERPAIR:       'Overpair — call on most rivers. IP is heavily capped but overpair is top of range.',
        TOP_PAIR:       'Top pair vs probe — call on safe rivers, fold on scary rivers. IP is capped.',
        SECOND_PAIR:    'Second pair — fold on bad rivers, call on brick rivers with sufficient pot odds.',
        THIRD_PAIR:     'Third pair — mostly fold. River probe is too strong to profitably call.',
        UNDERPAIR:      'Underpair — mostly fold. Against a polar river probe, too little equity.',
        ACE_HIGH:       'Ace-high — call on blank rivers, fold on scary boards. IP double-checked.',
        OVERCARDS:      'Overcards — mostly fold. Call only on pure blank rivers against heavy bluffing lines.',
        AIR:            'Air — fold vs river probe. No equity, no implied odds on the river.'
    };

    const FAMILY_OFF = { BTN_vs_BB: 0, CO_vs_BB: -0.02 };

    for (const fam of PROBE_IP_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;

        for (const rf of RIVER_FAMILIES) {
            for (const hc of RIVER_HAND_CLASSES) {
                const baseEntry = BASE_IP[hc];
                if (!baseEntry) continue;
                const rfEntry = baseEntry[rf];
                let fold, call, raise;
                if (rfEntry && typeof rfEntry === 'object' && 'fold' in rfEntry) {
                    fold = rfEntry.fold; call = rfEntry.call; raise = rfEntry.raise;
                } else {
                    fold = baseEntry.fold; call = baseEntry.call; raise = baseEntry.raise;
                }
                if (fold === undefined) continue;

                call  = parseFloat(Math.max(0, Math.min(1, call  + famOff)).toFixed(2));
                fold  = parseFloat(Math.max(0, Math.min(1, fold  - famOff * 0.5)).toFixed(2));
                raise = parseFloat(Math.max(0, Math.min(1, raise - famOff * 0.5)).toFixed(2));

                const total = fold + call + raise;
                if (total <= 0) continue;
                fold  = parseFloat((fold  / total).toFixed(2));
                call  = parseFloat((call  / total).toFixed(2));
                raise = parseFloat((1 - fold - call).toFixed(2));
                fold  = Math.max(0, Math.min(1, fold));
                call  = Math.max(0, Math.min(1, call));
                raise = Math.max(0, Math.min(1, raise));

                let preferred;
                if (fold >= call && fold >= raise) preferred = 'fold';
                else if (raise >= call && raise >= fold) preferred = 'raise';
                else preferred = 'call';

                const sk = makeRiverProbeSpotKeyV1({ preflopFamily: fam, riverFamily: rf, heroHandClass: hc });
                POSTFLOP_RIVER_PROBE_STRATEGY[sk] = {
                    actions: { fold, call, raise },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: 'Tier 3: River Probe Facing (IP hero)'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[RiverProbe] Built ${Object.keys(POSTFLOP_RIVER_PROBE_STRATEGY).length} probe-facing strategy entries.`);
    }
})();

(function() {
    const BASE_OOP = {
        STRAIGHT_FLUSH: { _default: 0.92 },
        QUADS:          { _default: 0.90 },
        FULL_HOUSE:     { _default: 0.90, FLUSH_COMPLETE: 0.82, STRAIGHT_COMPLETE: 0.80 },
        FLUSH:          { _default: 0.88, FLUSH_COMPLETE: 0.82 },
        STRAIGHT:       { _default: 0.86 },
        SET:            { _default: 0.88, FLUSH_COMPLETE: 0.74, STRAIGHT_COMPLETE: 0.70 },
        TRIPS:          { _default: 0.82, FLUSH_COMPLETE: 0.70, STRAIGHT_COMPLETE: 0.66,
                          BOARD_PAIR: 0.80, ACE_OVERCARD: 0.76 },
        BOARD_TRIPS:    { _default: 0.55, BRICK: 0.62, LOW_BLANK: 0.66, FLUSH_COMPLETE: 0.38,
                          STRAIGHT_COMPLETE: 0.34, ACE_OVERCARD: 0.48, BROADWAY_OVERCARD: 0.52,
                          OVERCARD: 0.50, BOARD_PAIR: 0.52, DYNAMIC_CONNECTOR: 0.50 },
        TWO_PAIR:       { _default: 0.80, FLUSH_COMPLETE: 0.64, STRAIGHT_COMPLETE: 0.62,
                          ACE_OVERCARD: 0.72, BROADWAY_OVERCARD: 0.74, BRICK: 0.84 },
        OVERPAIR:       { _default: 0.48, ACE_OVERCARD: 0.30, FLUSH_COMPLETE: 0.36,
                          STRAIGHT_COMPLETE: 0.32, BROADWAY_OVERCARD: 0.40, OVERCARD: 0.38,
                          BOARD_PAIR: 0.44, BRICK: 0.55, LOW_BLANK: 0.58 },
        TOP_PAIR:       { _default: 0.40, BRICK: 0.50, LOW_BLANK: 0.54, ACE_OVERCARD: 0.24,
                          FLUSH_COMPLETE: 0.26, STRAIGHT_COMPLETE: 0.22, BROADWAY_OVERCARD: 0.32,
                          OVERCARD: 0.30, BOARD_PAIR: 0.36 },
        SECOND_PAIR:    { _default: 0.20, BRICK: 0.30, LOW_BLANK: 0.34, ACE_OVERCARD: 0.10,
                          FLUSH_COMPLETE: 0.08, STRAIGHT_COMPLETE: 0.07, BROADWAY_OVERCARD: 0.15,
                          OVERCARD: 0.12, BOARD_PAIR: 0.18 },
        THIRD_PAIR:     { _default: 0.12, BRICK: 0.20, LOW_BLANK: 0.24, ACE_OVERCARD: 0.06,
                          FLUSH_COMPLETE: 0.05, STRAIGHT_COMPLETE: 0.04 },
        UNDERPAIR:      { _default: 0.14, BRICK: 0.22, LOW_BLANK: 0.26, ACE_OVERCARD: 0.06,
                          FLUSH_COMPLETE: 0.05, STRAIGHT_COMPLETE: 0.04 },
        ACE_HIGH:       { _default: 0.46, BRICK: 0.58, LOW_BLANK: 0.64, ACE_OVERCARD: 0.36,
                          FLUSH_COMPLETE: 0.22, STRAIGHT_COMPLETE: 0.18, BROADWAY_OVERCARD: 0.40,
                          OVERCARD: 0.38, BOARD_PAIR: 0.42 },
        OVERCARDS:      { _default: 0.34, BRICK: 0.46, LOW_BLANK: 0.52, ACE_OVERCARD: 0.22,
                          FLUSH_COMPLETE: 0.14, STRAIGHT_COMPLETE: 0.12, BROADWAY_OVERCARD: 0.26,
                          OVERCARD: 0.22, BOARD_PAIR: 0.28 },
        AIR:            { _default: 0.52, BRICK: 0.64, LOW_BLANK: 0.68, ACE_OVERCARD: 0.44,
                          FLUSH_COMPLETE: 0.28, STRAIGHT_COMPLETE: 0.24, BROADWAY_OVERCARD: 0.46,
                          OVERCARD: 0.42, BOARD_PAIR: 0.48 }
    };

    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush after double check-through — probe for max value. IP cannot have the nuts.',
        QUADS:          'Quads — probe for value. IP checked twice and cannot fight back.',
        FULL_HOUSE:     'Full house — probe. IP\'s double-check-back range is very weak.',
        FLUSH:          'Made flush — probe for value. IP is heavily capped after double check.',
        STRAIGHT:       'Straight — probe. IP\'s range cannot have premium holdings.',
        SET:            'Set — probe for value. IP double-checked, so BB dominates with sets.',
        TRIPS:          'Trips — probe for value on most rivers. IP has few trips combos after double-check.',
        BOARD_TRIPS:    'Board trips — probe selectively. Kicker matters; IP can have kickers too.',
        TWO_PAIR:       'Two pair — probe for value. IP\'s double-check range pays off medium-value hands.',
        OVERPAIR:       'Overpair — mixed strategy. Good showdown value; probe on blank rivers only.',
        TOP_PAIR:       'Top pair — probe on blank rivers for thin value. Check on dynamic rivers.',
        SECOND_PAIR:    'Second pair — mostly check. Thin probe only on blank rivers.',
        THIRD_PAIR:     'Third pair — mostly check. Probe selectively only on blank rivers.',
        UNDERPAIR:      'Underpair — mostly check. Very thin probe only on pure blank rivers.',
        ACE_HIGH:       'Ace-high (missed draw) — probe as bluff. IP double-checked, range is very weak.',
        OVERCARDS:      'Overcards (missed draws) — probe as bluff on favorable rivers. IP has little calling range.',
        AIR:            'Air (complete miss) — probe as bluff. IP\'s double-check-back range cannot call wide.'
    };

    const FAMILY_OFF = { BTN_vs_BB: 0, CO_vs_BB: -0.02 };

    for (const fam of PROBE_IP_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;

        for (const rf of RIVER_FAMILIES) {
            for (const hc of RIVER_HAND_CLASSES) {
                const baseFreqs = BASE_OOP[hc];
                if (!baseFreqs) continue;
                const raw = (baseFreqs[rf] !== undefined) ? baseFreqs[rf] : baseFreqs._default;
                if (raw === undefined) continue;
                const bet = Math.max(0.05, Math.min(0.95, parseFloat((raw + famOff).toFixed(2))));
                const chk = parseFloat((1 - bet).toFixed(2));
                const preferred = bet >= 0.50 ? 'bet50' : 'check';
                const sk = makeRiverProbeBetSpotKeyV1({ preflopFamily: fam, riverFamily: rf, heroHandClass: hc });
                POSTFLOP_RIVER_PROBE_BET_STRATEGY[sk] = {
                    actions: { check: chk, bet50: bet },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || '',
                    simplification: 'Tier 3: River Probe Bet (OOP BB)'
                };
            }
        }
    }

    if (window.RANGE_VALIDATE) {
        console.log(`[RiverProbeBet] Built ${Object.keys(POSTFLOP_RIVER_PROBE_BET_STRATEGY).length} probe-bet strategy entries.`);
    }
})();

(function() {
    // PFR c-bet flop, called. Both checked turn. BB's calling range is stronger than vs delayed cbet.
    // Strong hands bet slightly more (were trapping). Medium hands similar. Bluffs slightly less.
    const BASE_IP = {
        STRAIGHT_FLUSH: { _default: 0.95 },
        QUADS:          { _default: 0.93 },
        FULL_HOUSE:     { _default: 0.92, FLUSH_COMPLETE: 0.87, STRAIGHT_COMPLETE: 0.85 },
        FLUSH:          { _default: 0.90, FLUSH_COMPLETE: 0.81 },
        STRAIGHT:       { _default: 0.84 },
        SET:            { _default: 0.90, FLUSH_COMPLETE: 0.77, STRAIGHT_COMPLETE: 0.73 },
        TRIPS:          { _default: 0.84, FLUSH_COMPLETE: 0.69, STRAIGHT_COMPLETE: 0.65, BOARD_PAIR: 0.80, ACE_OVERCARD: 0.73, BROADWAY_OVERCARD: 0.75 },
        BOARD_TRIPS:    { _default: 0.43, BRICK: 0.49, LOW_BLANK: 0.51, FLUSH_COMPLETE: 0.27, STRAIGHT_COMPLETE: 0.23, ACE_OVERCARD: 0.33, BROADWAY_OVERCARD: 0.37, BOARD_PAIR: 0.39, OVERCARD: 0.35 },
        TWO_PAIR:       { _default: 0.74, FLUSH_COMPLETE: 0.57, STRAIGHT_COMPLETE: 0.54, ACE_OVERCARD: 0.63 },
        OVERPAIR:       { _default: 0.57, ACE_OVERCARD: 0.19, FLUSH_COMPLETE: 0.41, STRAIGHT_COMPLETE: 0.37, BROADWAY_OVERCARD: 0.45, OVERCARD: 0.43, BOARD_PAIR: 0.53, DYNAMIC_CONNECTOR: 0.49 },
        TOP_PAIR:       { _default: 0.43, BRICK: 0.49, LOW_BLANK: 0.51, ACE_OVERCARD: 0.23, FLUSH_COMPLETE: 0.27, STRAIGHT_COMPLETE: 0.24, BROADWAY_OVERCARD: 0.33, OVERCARD: 0.31, BOARD_PAIR: 0.39, DYNAMIC_CONNECTOR: 0.37 },
        SECOND_PAIR:    { _default: 0.16, BRICK: 0.20, LOW_BLANK: 0.23, ACE_OVERCARD: 0.08, FLUSH_COMPLETE: 0.08, STRAIGHT_COMPLETE: 0.06 },
        THIRD_PAIR:     { _default: 0.08, BRICK: 0.11, FLUSH_COMPLETE: 0.04 },
        UNDERPAIR:      { _default: 0.09, BRICK: 0.12, FLUSH_COMPLETE: 0.04 },
        ACE_HIGH:       { _default: 0.35, BRICK: 0.40, LOW_BLANK: 0.42, ACE_OVERCARD: 0.18, FLUSH_COMPLETE: 0.16, STRAIGHT_COMPLETE: 0.13, BROADWAY_OVERCARD: 0.27, OVERCARD: 0.22, BOARD_PAIR: 0.28 },
        OVERCARDS:      { _default: 0.19, BRICK: 0.23, LOW_BLANK: 0.25, ACE_OVERCARD: 0.09, FLUSH_COMPLETE: 0.08, STRAIGHT_COMPLETE: 0.06 },
        AIR:            { _default: 0.17, BRICK: 0.21, LOW_BLANK: 0.23, ACE_OVERCARD: 0.07, FLUSH_COMPLETE: 0.06, STRAIGHT_COMPLETE: 0.05, BROADWAY_OVERCARD: 0.12 }
    };
    const BASE_OOP = {
        STRAIGHT_FLUSH: { _default: 0.86 },
        QUADS:          { _default: 0.84 },
        FULL_HOUSE:     { _default: 0.83, FLUSH_COMPLETE: 0.76, STRAIGHT_COMPLETE: 0.74 },
        FLUSH:          { _default: 0.80, FLUSH_COMPLETE: 0.72 },
        STRAIGHT:       { _default: 0.74 },
        SET:            { _default: 0.80, FLUSH_COMPLETE: 0.66, STRAIGHT_COMPLETE: 0.62 },
        TRIPS:          { _default: 0.72, FLUSH_COMPLETE: 0.58, STRAIGHT_COMPLETE: 0.54, BOARD_PAIR: 0.70, ACE_OVERCARD: 0.62, BROADWAY_OVERCARD: 0.64 },
        BOARD_TRIPS:    { _default: 0.31, BRICK: 0.37, LOW_BLANK: 0.39, FLUSH_COMPLETE: 0.17, STRAIGHT_COMPLETE: 0.14, ACE_OVERCARD: 0.23, BROADWAY_OVERCARD: 0.27, OVERCARD: 0.25, BOARD_PAIR: 0.29 },
        TWO_PAIR:       { _default: 0.62, FLUSH_COMPLETE: 0.46, STRAIGHT_COMPLETE: 0.44, ACE_OVERCARD: 0.54 },
        OVERPAIR:       { _default: 0.44, ACE_OVERCARD: 0.13, FLUSH_COMPLETE: 0.29, STRAIGHT_COMPLETE: 0.25, BROADWAY_OVERCARD: 0.32, OVERCARD: 0.29, BOARD_PAIR: 0.39, DYNAMIC_CONNECTOR: 0.35 },
        TOP_PAIR:       { _default: 0.32, BRICK: 0.38, LOW_BLANK: 0.40, ACE_OVERCARD: 0.15, FLUSH_COMPLETE: 0.16, STRAIGHT_COMPLETE: 0.14, BROADWAY_OVERCARD: 0.21, OVERCARD: 0.19, BOARD_PAIR: 0.27, DYNAMIC_CONNECTOR: 0.24 },
        SECOND_PAIR:    { _default: 0.10, BRICK: 0.14, FLUSH_COMPLETE: 0.05 },
        THIRD_PAIR:     { _default: 0.05 },
        UNDERPAIR:      { _default: 0.06 },
        ACE_HIGH:       { _default: 0.24, BRICK: 0.30, LOW_BLANK: 0.33, FLUSH_COMPLETE: 0.11 },
        OVERCARDS:      { _default: 0.12, BRICK: 0.16, FLUSH_COMPLETE: 0.05 },
        AIR:            { _default: 0.10, BRICK: 0.14, LOW_BLANK: 0.16, FLUSH_COMPLETE: 0.04 }
    };
    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush after c-bet/call flop, check-check turn — extract max value on river.',
        QUADS:          'Quads slow-played turn — extract full value on river.',
        FULL_HOUSE:     'Full house — bet for value. BB called flop c-bet but checked turn.',
        FLUSH:          'Flush — bet for value after turn trap.',
        STRAIGHT:       'Straight slow-played — bet for value on river.',
        SET:            'Set — bet for full value. BB checked turn, slightly weighted medium.',
        TRIPS:          'Trips — barrel for value. BB\'s range is solid but trips is ahead.',
        BOARD_TRIPS:    'Board trips — marginal. Bet selectively on blank rivers only.',
        TWO_PAIR:       'Two pair — barrel for value. BB has strong calling hands but two pair is ahead on blank rivers.',
        OVERPAIR:       'Overpair — be selective. BB called flop c-bet; range is solid.',
        TOP_PAIR:       'Top pair — thin value on blank rivers only. BB has medium-strong hands.',
        SECOND_PAIR:    'Second pair — mostly check. BB has too many strong hands.',
        THIRD_PAIR:     'Third pair — check. No value.',
        UNDERPAIR:      'Underpair — check. No value on river.',
        ACE_HIGH:       'Ace-high — bluff selectively. BB calling range is robust after flop call.',
        OVERCARDS:      'Overcards — mostly give up. BB range is stronger than delayed-cbet line.',
        AIR:            'Air — check. BB survived flop c-bet; range is too strong to bluff into.'
    };
    const FAMILY_OFF = { BTN_vs_BB: 0, CO_vs_BB: -0.03, HJ_vs_BB: -0.02, LJ_vs_BB: -0.01, UTG_vs_BB: 0.02, BTN_vs_SB: 0.02, SB_vs_BB: 0, CO_vs_BTN: -0.03 };
    for (const fam of HERO_HAND_AWARE_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;
        const baseTable = fi.positionState === 'OOP' ? BASE_OOP : BASE_IP;
        for (const rf of RIVER_FAMILIES) {
            for (const hc of RIVER_HAND_CLASSES) {
                const baseFreqs = baseTable[hc];
                if (!baseFreqs) continue;
                const raw = (baseFreqs[rf] !== undefined) ? baseFreqs[rf] : baseFreqs._default;
                if (raw === undefined) continue;
                const bet = Math.max(0.05, Math.min(0.95, parseFloat((raw + famOff).toFixed(2))));
                const chk = parseFloat((1 - bet).toFixed(2));
                const preferred = bet >= 0.50 ? 'bet50' : 'check';
                const sk = makeRiverTurnCheckCBetSpotKeyV1({ preflopFamily: fam, positionState: fi.positionState, riverFamily: rf, heroHandClass: hc });
                POSTFLOP_RIVER_TURN_CHECK_CBET_STRATEGY[sk] = { actions: { check: chk, bet50: bet }, preferredAction: preferred, reasoning: REASONING[hc] || '' };
            }
        }
    }
    if (window.RANGE_VALIDATE) { console.log('[RiverTurnCheckCBet] Built ' + Object.keys(POSTFLOP_RIVER_TURN_CHECK_CBET_STRATEGY).length + ' entries.'); }
})();

(function() {
    // PFR c-bet flop, called, then checked turn back — range is capped (no big hands).
    // BB calls more than vs standard river barrel because PFR capped himself by checking turn.
    const BASE = {
        STRAIGHT_FLUSH: { _default: { fold: 0.00, call: 0.05, raise: 0.95 } },
        QUADS:          { _default: { fold: 0.00, call: 0.08, raise: 0.92 } },
        FULL_HOUSE:     { _default: { fold: 0.00, call: 0.13, raise: 0.87 },
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.11, raise: 0.89 } },
        FLUSH:          { _default: { fold: 0.00, call: 0.16, raise: 0.84 } },
        STRAIGHT:       { _default: { fold: 0.00, call: 0.20, raise: 0.80 } },
        SET:            { _default: { fold: 0.00, call: 0.22, raise: 0.78 },
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.16, raise: 0.84 } },
        TRIPS:          { _default: { fold: 0.00, call: 0.20, raise: 0.80 },
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.14, raise: 0.86 } },
        BOARD_TRIPS:    { _default: { fold: 0.04, call: 0.76, raise: 0.20 },
                          FLUSH_COMPLETE: { fold: 0.12, call: 0.72, raise: 0.16 },
                          STRAIGHT_COMPLETE: { fold: 0.10, call: 0.74, raise: 0.16 } },
        TWO_PAIR:       { _default: { fold: 0.00, call: 0.58, raise: 0.42 },
                          FLUSH_COMPLETE: { fold: 0.02, call: 0.64, raise: 0.34 },
                          STRAIGHT_COMPLETE: { fold: 0.03, call: 0.66, raise: 0.31 } },
        OVERPAIR:       { _default: { fold: 0.00, call: 0.84, raise: 0.16 },
                          ACE_OVERCARD: { fold: 0.00, call: 0.89, raise: 0.11 },
                          FLUSH_COMPLETE: { fold: 0.03, call: 0.82, raise: 0.15 },
                          STRAIGHT_COMPLETE: { fold: 0.06, call: 0.79, raise: 0.15 } },
        TOP_PAIR:       { _default: { fold: 0.04, call: 0.87, raise: 0.09 },
                          BRICK: { fold: 0.02, call: 0.90, raise: 0.08 },
                          LOW_BLANK: { fold: 0.01, call: 0.91, raise: 0.08 },
                          ACE_OVERCARD: { fold: 0.14, call: 0.78, raise: 0.08 },
                          FLUSH_COMPLETE: { fold: 0.16, call: 0.76, raise: 0.08 },
                          STRAIGHT_COMPLETE: { fold: 0.18, call: 0.74, raise: 0.08 } },
        SECOND_PAIR:    { _default: { fold: 0.37, call: 0.56, raise: 0.07 },
                          BRICK: { fold: 0.27, call: 0.66, raise: 0.07 },
                          FLUSH_COMPLETE: { fold: 0.52, call: 0.42, raise: 0.06 } },
        THIRD_PAIR:     { _default: { fold: 0.55, call: 0.40, raise: 0.05 },
                          BRICK: { fold: 0.45, call: 0.49, raise: 0.06 } },
        UNDERPAIR:      { _default: { fold: 0.60, call: 0.34, raise: 0.06 },
                          BRICK: { fold: 0.50, call: 0.44, raise: 0.06 } },
        ACE_HIGH:       { _default: { fold: 0.55, call: 0.39, raise: 0.06 },
                          BRICK: { fold: 0.43, call: 0.50, raise: 0.07 } },
        OVERCARDS:      { _default: { fold: 0.65, call: 0.27, raise: 0.08 },
                          BRICK: { fold: 0.52, call: 0.39, raise: 0.09 } },
        AIR:            { _default: { fold: 0.75, call: 0.17, raise: 0.08 },
                          BRICK: { fold: 0.62, call: 0.27, raise: 0.11 } }
    };
    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush — raise for max value. PFR checked turn, range is capped.',
        QUADS:          'Quads — raise; PFR checking turn after c-bet is very range-capping.',
        FULL_HOUSE:     'Full house — raise; PFR\'s capped range cannot fight back.',
        FLUSH:          'Flush — raise; PFR\'s turn check-back caps nut holdings.',
        STRAIGHT:       'Straight — raise; PFR is range-capped from turn check-back.',
        SET:            'Set — raise; PFR has fewer premium hands after checking turn.',
        TRIPS:          'Trips — raise; PFR\'s range is merged-weak after check-back.',
        BOARD_TRIPS:    'Board trips — call wider; PFR is capped from checking turn after c-betting flop.',
        TWO_PAIR:       'Two pair — raise or call; PFR\'s range is weak-medium after turn check.',
        OVERPAIR:       'Overpair — call wider; PFR checked turn after c-bet, very capped range.',
        TOP_PAIR:       'Top pair — call; PFR\'s turn check-back means more bluffs on river.',
        SECOND_PAIR:    'Second pair — call some; PFR has many missed draws after 2-street check.',
        THIRD_PAIR:     'Third pair — lean fold; PFR still has some value hands in range.',
        UNDERPAIR:      'Underpair — lean fold; PFR\'s range still has enough value combos.',
        ACE_HIGH:       'Ace-high — call slightly more than usual; PFR has high bluff frequency here.',
        OVERCARDS:      'Overcards — fold most; PFR\'s range has enough value to make calling thin.',
        AIR:            'Air — fold; no equity against even a capped PFR range.'
    };
    const FAM_OFF = {
        BTN_vs_BB:  0,     CO_vs_BB:   0.02,  SB_vs_BB:   0.03,
        HJ_vs_BB:  -0.02,  LJ_vs_BB:  -0.04,  UTG_vs_BB: -0.06,
        BTN_vs_SB: -0.02,  CO_vs_BTN:  0.03,
    };
    for (const fam of DEFENDER_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const off = FAM_OFF[fam] || 0;
        for (const rf of RIVER_FAMILIES) {
            for (const hc of RIVER_HAND_CLASSES) {
                const hcData = BASE[hc];
                if (!hcData) continue;
                const raw = hcData[rf] || hcData._default;
                if (!raw) continue;
                let fold  = Math.max(0, raw.fold - off);
                let call  = raw.call + off * 0.5;
                let raise = raw.raise + off * 0.5;
                const total = fold + call + raise;
                fold  = parseFloat((fold  / total).toFixed(2));
                call  = parseFloat((call  / total).toFixed(2));
                raise = parseFloat((1 - fold - call).toFixed(2));
                fold  = Math.max(0, Math.min(1, fold));
                call  = Math.max(0, Math.min(1, call));
                raise = Math.max(0, Math.min(1, raise));
                let preferred;
                if (fold >= call && fold >= raise) preferred = 'fold';
                else if (raise >= call && raise >= fold) preferred = 'raise';
                else preferred = 'call';
                const sk = makeRiverTurnCheckDefendSpotKeyV1({ preflopFamily: fam, riverFamily: rf, heroHandClass: hc });
                POSTFLOP_RIVER_TURN_CHECK_DEFEND_STRATEGY[sk] = {
                    actions: { fold, call, raise },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || ''
                };
            }
        }
    }
    if (window.RANGE_VALIDATE) { console.log('[RiverTurnCheckDefend] Built ' + Object.keys(POSTFLOP_RIVER_TURN_CHECK_DEFEND_STRATEGY).length + ' entries.'); }
})();

(function() {
    // BB probed turn and IP called. River strategy is very polar (2-barrel).
    // Bet strong value + air bluffs aggressively; check medium made hands.
    const BASE_OOP = {
        STRAIGHT_FLUSH: { _default: 0.94 },
        QUADS:          { _default: 0.92 },
        FULL_HOUSE:     { _default: 0.91, FLUSH_COMPLETE: 0.84, STRAIGHT_COMPLETE: 0.82 },
        FLUSH:          { _default: 0.90, FLUSH_COMPLETE: 0.84 },
        STRAIGHT:       { _default: 0.88 },
        SET:            { _default: 0.90, FLUSH_COMPLETE: 0.76, STRAIGHT_COMPLETE: 0.72 },
        TRIPS:          { _default: 0.86, FLUSH_COMPLETE: 0.74, STRAIGHT_COMPLETE: 0.70,
                          BOARD_PAIR: 0.84, ACE_OVERCARD: 0.80 },
        BOARD_TRIPS:    { _default: 0.52, BRICK: 0.60, LOW_BLANK: 0.64, FLUSH_COMPLETE: 0.34,
                          STRAIGHT_COMPLETE: 0.30, ACE_OVERCARD: 0.44, BROADWAY_OVERCARD: 0.48,
                          OVERCARD: 0.46, BOARD_PAIR: 0.50 },
        TWO_PAIR:       { _default: 0.82, FLUSH_COMPLETE: 0.66, STRAIGHT_COMPLETE: 0.64,
                          ACE_OVERCARD: 0.74, BROADWAY_OVERCARD: 0.76, BRICK: 0.86 },
        OVERPAIR:       { _default: 0.44, ACE_OVERCARD: 0.26, FLUSH_COMPLETE: 0.32,
                          STRAIGHT_COMPLETE: 0.28, BROADWAY_OVERCARD: 0.36, OVERCARD: 0.34,
                          BOARD_PAIR: 0.40, BRICK: 0.52, LOW_BLANK: 0.55 },
        TOP_PAIR:       { _default: 0.36, BRICK: 0.46, LOW_BLANK: 0.50, ACE_OVERCARD: 0.20,
                          FLUSH_COMPLETE: 0.22, STRAIGHT_COMPLETE: 0.18, BROADWAY_OVERCARD: 0.28,
                          OVERCARD: 0.26, BOARD_PAIR: 0.32 },
        SECOND_PAIR:    { _default: 0.16, BRICK: 0.26, LOW_BLANK: 0.30, ACE_OVERCARD: 0.08,
                          FLUSH_COMPLETE: 0.06, STRAIGHT_COMPLETE: 0.05, BROADWAY_OVERCARD: 0.12,
                          OVERCARD: 0.10, BOARD_PAIR: 0.14 },
        THIRD_PAIR:     { _default: 0.10, BRICK: 0.18, LOW_BLANK: 0.22, ACE_OVERCARD: 0.05,
                          FLUSH_COMPLETE: 0.04, STRAIGHT_COMPLETE: 0.03 },
        UNDERPAIR:      { _default: 0.12, BRICK: 0.20, LOW_BLANK: 0.24, ACE_OVERCARD: 0.05,
                          FLUSH_COMPLETE: 0.04, STRAIGHT_COMPLETE: 0.03 },
        ACE_HIGH:       { _default: 0.58, BRICK: 0.70, LOW_BLANK: 0.74, ACE_OVERCARD: 0.48,
                          FLUSH_COMPLETE: 0.30, STRAIGHT_COMPLETE: 0.24, BROADWAY_OVERCARD: 0.52,
                          OVERCARD: 0.50, BOARD_PAIR: 0.55 },
        OVERCARDS:      { _default: 0.60, BRICK: 0.72, LOW_BLANK: 0.76, ACE_OVERCARD: 0.50,
                          FLUSH_COMPLETE: 0.32, STRAIGHT_COMPLETE: 0.26, BROADWAY_OVERCARD: 0.54,
                          OVERCARD: 0.52, BOARD_PAIR: 0.58 },
        AIR:            { _default: 0.65, BRICK: 0.76, LOW_BLANK: 0.80, ACE_OVERCARD: 0.55,
                          FLUSH_COMPLETE: 0.36, STRAIGHT_COMPLETE: 0.30, BROADWAY_OVERCARD: 0.58,
                          OVERCARD: 0.55, BOARD_PAIR: 0.62 }
    };
    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush — 2-barrel for max value. IP called turn probe and is capped.',
        QUADS:          'Quads — fire 2nd barrel for full value.',
        FULL_HOUSE:     'Full house — 2-barrel. IP called but his range is capped after calling probe.',
        FLUSH:          'Flush — fire 2nd barrel for value.',
        STRAIGHT:       'Straight — 2-barrel for value.',
        SET:            'Set — fire 2nd barrel. IP\'s calling range on turn probe is medium-strong.',
        TRIPS:          'Trips — 2-barrel for value on most runouts.',
        BOARD_TRIPS:    'Board trips — bet selectively. Kicker matters on river after 2 streets.',
        TWO_PAIR:       'Two pair — 2-barrel for value. IP has medium hands; two pair gets called.',
        OVERPAIR:       'Overpair — check more. Too thin for a 2nd barrel; IP will call with medium-plus.',
        TOP_PAIR:       'Top pair — mostly check. IP will call down with top pair; 2-barrel is thin.',
        SECOND_PAIR:    'Second pair — check. Two streets of aggression with 2nd pair is too thin.',
        THIRD_PAIR:     'Third pair — check. No value for 2nd barrel.',
        UNDERPAIR:      'Underpair — check. No value.',
        ACE_HIGH:       'Ace-high — fire 2nd barrel as bluff. Fold equity is high after 2 streets.',
        OVERCARDS:      'Overcards — fire 2nd barrel aggressively. High fold equity after probe-call.',
        AIR:            'Air — fire 2nd barrel bluff. IP cannot call down wide after probe-call.'
    };
    const FAMILY_OFF = { BTN_vs_BB: 0, CO_vs_BB: -0.02 };
    for (const fam of PROBE_IP_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;
        for (const rf of RIVER_FAMILIES) {
            for (const hc of RIVER_HAND_CLASSES) {
                const baseFreqs = BASE_OOP[hc];
                if (!baseFreqs) continue;
                const raw = (baseFreqs[rf] !== undefined) ? baseFreqs[rf] : baseFreqs._default;
                if (raw === undefined) continue;
                const bet = Math.max(0.05, Math.min(0.95, parseFloat((raw + famOff).toFixed(2))));
                const chk = parseFloat((1 - bet).toFixed(2));
                const preferred = bet >= 0.50 ? 'bet50' : 'check';
                const sk = makeRiverProbeCallBetSpotKeyV1({ preflopFamily: fam, riverFamily: rf, heroHandClass: hc });
                POSTFLOP_RIVER_PROBE_CALL_BET_STRATEGY[sk] = {
                    actions: { check: chk, bet50: bet },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || ''
                };
            }
        }
    }
    if (window.RANGE_VALIDATE) { console.log('[RiverProbeCallBet] Built ' + Object.keys(POSTFLOP_RIVER_PROBE_CALL_BET_STRATEGY).length + ' entries.'); }
})();

(function() {
    // BB bet twice (probe turn + 2nd barrel river). IP's range is capped (called probe, checked back flop).
    // BB is polar (strong value + bluffs). IP folds more medium hands vs this 2-barrel line.
    const BASE_IP = {
        STRAIGHT_FLUSH: { fold: 0.00, call: 0.04, raise: 0.96 },
        QUADS:          { fold: 0.00, call: 0.07, raise: 0.93 },
        FULL_HOUSE:     { fold: 0.00, call: 0.10, raise: 0.90,
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.16, raise: 0.84 } },
        FLUSH:          { fold: 0.00, call: 0.13, raise: 0.87,
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.20, raise: 0.80 } },
        STRAIGHT:       { fold: 0.00, call: 0.16, raise: 0.84 },
        SET:            { fold: 0.00, call: 0.18, raise: 0.82,
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.28, raise: 0.72 },
                          STRAIGHT_COMPLETE: { fold: 0.00, call: 0.30, raise: 0.70 } },
        TRIPS:          { fold: 0.00, call: 0.22, raise: 0.78,
                          FLUSH_COMPLETE: { fold: 0.00, call: 0.36, raise: 0.64 },
                          STRAIGHT_COMPLETE: { fold: 0.00, call: 0.40, raise: 0.60 },
                          ACE_OVERCARD: { fold: 0.00, call: 0.28, raise: 0.72 } },
        BOARD_TRIPS:    { fold: 0.08, call: 0.60, raise: 0.32,
                          FLUSH_COMPLETE: { fold: 0.14, call: 0.64, raise: 0.22 },
                          STRAIGHT_COMPLETE: { fold: 0.16, call: 0.64, raise: 0.20 },
                          ACE_OVERCARD: { fold: 0.12, call: 0.62, raise: 0.26 } },
        TWO_PAIR:       { fold: 0.00, call: 0.34, raise: 0.66,
                          FLUSH_COMPLETE: { fold: 0.08, call: 0.56, raise: 0.36 },
                          STRAIGHT_COMPLETE: { fold: 0.10, call: 0.58, raise: 0.32 },
                          ACE_OVERCARD: { fold: 0.05, call: 0.40, raise: 0.55 } },
        OVERPAIR:       { fold: 0.10, call: 0.66, raise: 0.24,
                          ACE_OVERCARD: { fold: 0.28, call: 0.64, raise: 0.08 },
                          FLUSH_COMPLETE: { fold: 0.20, call: 0.66, raise: 0.14 },
                          STRAIGHT_COMPLETE: { fold: 0.24, call: 0.64, raise: 0.12 },
                          BROADWAY_OVERCARD: { fold: 0.16, call: 0.68, raise: 0.16 },
                          OVERCARD: { fold: 0.18, call: 0.66, raise: 0.16 },
                          BOARD_PAIR: { fold: 0.10, call: 0.62, raise: 0.28 },
                          BRICK: { fold: 0.05, call: 0.52, raise: 0.43 },
                          LOW_BLANK: { fold: 0.04, call: 0.48, raise: 0.48 } },
        TOP_PAIR:       { fold: 0.14, call: 0.72, raise: 0.14,
                          BRICK: { fold: 0.08, call: 0.64, raise: 0.28 },
                          LOW_BLANK: { fold: 0.07, call: 0.62, raise: 0.31 },
                          ACE_OVERCARD: { fold: 0.38, call: 0.56, raise: 0.06 },
                          FLUSH_COMPLETE: { fold: 0.32, call: 0.62, raise: 0.06 },
                          STRAIGHT_COMPLETE: { fold: 0.36, call: 0.58, raise: 0.06 },
                          BROADWAY_OVERCARD: { fold: 0.26, call: 0.67, raise: 0.07 },
                          OVERCARD: { fold: 0.28, call: 0.66, raise: 0.06 },
                          BOARD_PAIR: { fold: 0.16, call: 0.70, raise: 0.14 } },
        SECOND_PAIR:    { fold: 0.42, call: 0.54, raise: 0.04,
                          BRICK: { fold: 0.28, call: 0.66, raise: 0.06 },
                          LOW_BLANK: { fold: 0.26, call: 0.68, raise: 0.06 },
                          ACE_OVERCARD: { fold: 0.64, call: 0.34, raise: 0.02 },
                          FLUSH_COMPLETE: { fold: 0.62, call: 0.36, raise: 0.02 },
                          STRAIGHT_COMPLETE: { fold: 0.66, call: 0.32, raise: 0.02 },
                          BROADWAY_OVERCARD: { fold: 0.54, call: 0.44, raise: 0.02 },
                          OVERCARD: { fold: 0.52, call: 0.46, raise: 0.02 } },
        THIRD_PAIR:     { fold: 0.68, call: 0.30, raise: 0.02,
                          BRICK: { fold: 0.52, call: 0.46, raise: 0.02 },
                          LOW_BLANK: { fold: 0.48, call: 0.50, raise: 0.02 },
                          ACE_OVERCARD: { fold: 0.84, call: 0.15, raise: 0.01 },
                          FLUSH_COMPLETE: { fold: 0.82, call: 0.17, raise: 0.01 } },
        UNDERPAIR:      { fold: 0.74, call: 0.25, raise: 0.01,
                          BRICK: { fold: 0.58, call: 0.41, raise: 0.01 },
                          LOW_BLANK: { fold: 0.54, call: 0.45, raise: 0.01 },
                          ACE_OVERCARD: { fold: 0.88, call: 0.11, raise: 0.01 },
                          FLUSH_COMPLETE: { fold: 0.86, call: 0.13, raise: 0.01 } },
        ACE_HIGH:       { fold: 0.54, call: 0.40, raise: 0.06,
                          BRICK: { fold: 0.36, call: 0.52, raise: 0.12 },
                          LOW_BLANK: { fold: 0.32, call: 0.56, raise: 0.12 },
                          ACE_OVERCARD: { fold: 0.48, call: 0.46, raise: 0.06 },
                          FLUSH_COMPLETE: { fold: 0.70, call: 0.28, raise: 0.02 },
                          STRAIGHT_COMPLETE: { fold: 0.74, call: 0.24, raise: 0.02 } },
        OVERCARDS:      { fold: 0.74, call: 0.24, raise: 0.02,
                          BRICK: { fold: 0.56, call: 0.40, raise: 0.04 },
                          LOW_BLANK: { fold: 0.52, call: 0.44, raise: 0.04 },
                          ACE_OVERCARD: { fold: 0.70, call: 0.28, raise: 0.02 },
                          FLUSH_COMPLETE: { fold: 0.86, call: 0.13, raise: 0.01 },
                          STRAIGHT_COMPLETE: { fold: 0.90, call: 0.09, raise: 0.01 } },
        AIR:            { fold: 0.86, call: 0.10, raise: 0.04,
                          BRICK: { fold: 0.68, call: 0.24, raise: 0.08 },
                          LOW_BLANK: { fold: 0.64, call: 0.28, raise: 0.08 },
                          FLUSH_COMPLETE: { fold: 0.92, call: 0.07, raise: 0.01 },
                          STRAIGHT_COMPLETE: { fold: 0.94, call: 0.05, raise: 0.01 },
                          ACE_OVERCARD: { fold: 0.80, call: 0.16, raise: 0.04 } }
    };
    const REASONING = {
        STRAIGHT_FLUSH: 'Straight flush vs 2nd barrel — raise for max value. IP slow-played twice.',
        QUADS:          'Quads — raise; BB bet twice, now we extract.',
        FULL_HOUSE:     'Full house vs 2nd barrel — raise. IP\'s slow-play gets paid off.',
        FLUSH:          'Flush vs 2nd barrel — raise. IP slow-played; now raise.',
        STRAIGHT:       'Straight — raise vs BB\'s 2nd barrel.',
        SET:            'Set vs 2nd barrel — raise. IP is capped but set is top of range.',
        TRIPS:          'Trips vs 2nd barrel — raise or call depending on texture.',
        BOARD_TRIPS:    'Board trips — call; IP is capped but BB is polar on 2-barrel.',
        TWO_PAIR:       'Two pair vs 2nd barrel — raise or call. IP has few nut holdings.',
        OVERPAIR:       'Overpair — call on most rivers. IP is capped; fold more than vs single probe.',
        TOP_PAIR:       'Top pair vs 2nd barrel — call only on safe runouts. Fold more than vs single probe.',
        SECOND_PAIR:    'Second pair — fold more. BB firing 2nd barrel has very high value frequency.',
        THIRD_PAIR:     'Third pair — mostly fold. BB\'s 2-barrel range is very strong.',
        UNDERPAIR:      'Underpair — fold mostly. Against 2 streets of BB aggression.',
        ACE_HIGH:       'Ace-high — call blank rivers; fold scary boards.',
        OVERCARDS:      'Overcards — mostly fold vs 2-barrel. BB has too much value.',
        AIR:            'Air — fold vs 2-barrel probe. BB cannot be bluffing enough.'
    };
    const FAMILY_OFF = { BTN_vs_BB: 0, CO_vs_BB: -0.02 };
    for (const fam of PROBE_IP_FAMILIES) {
        const fi = POSTFLOP_PREFLOP_FAMILIES[fam];
        if (!fi) continue;
        const famOff = FAMILY_OFF[fam] || 0;
        for (const rf of RIVER_FAMILIES) {
            for (const hc of RIVER_HAND_CLASSES) {
                const baseEntry = BASE_IP[hc];
                if (!baseEntry) continue;
                const rfEntry = baseEntry[rf];
                let fold, call, raise;
                if (rfEntry && typeof rfEntry === 'object' && 'fold' in rfEntry) {
                    fold = rfEntry.fold; call = rfEntry.call; raise = rfEntry.raise;
                } else {
                    fold = baseEntry.fold; call = baseEntry.call; raise = baseEntry.raise;
                }
                if (fold === undefined) continue;
                call  = parseFloat(Math.max(0, Math.min(1, call  + famOff)).toFixed(2));
                fold  = parseFloat(Math.max(0, Math.min(1, fold  - famOff * 0.5)).toFixed(2));
                raise = parseFloat(Math.max(0, Math.min(1, raise - famOff * 0.5)).toFixed(2));
                const total = fold + call + raise;
                if (total <= 0) continue;
                fold  = parseFloat((fold  / total).toFixed(2));
                call  = parseFloat((call  / total).toFixed(2));
                raise = parseFloat((1 - fold - call).toFixed(2));
                fold  = Math.max(0, Math.min(1, fold));
                call  = Math.max(0, Math.min(1, call));
                raise = Math.max(0, Math.min(1, raise));
                let preferred;
                if (fold >= call && fold >= raise) preferred = 'fold';
                else if (raise >= call && raise >= fold) preferred = 'raise';
                else preferred = 'call';
                const sk = makeRiverProbeCallDefendSpotKeyV1({ preflopFamily: fam, riverFamily: rf, heroHandClass: hc });
                POSTFLOP_RIVER_PROBE_CALL_DEFEND_STRATEGY[sk] = {
                    actions: { fold, call, raise },
                    preferredAction: preferred,
                    reasoning: REASONING[hc] || ''
                };
            }
        }
    }
    if (window.RANGE_VALIDATE) { console.log('[RiverProbeCallDefend] Built ' + Object.keys(POSTFLOP_RIVER_PROBE_CALL_DEFEND_STRATEGY).length + ' entries.'); }
})();
