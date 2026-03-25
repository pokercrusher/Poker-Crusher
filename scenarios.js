// ── MATH DRILL SR KEY TAXONOMY ──
// All math drill SR keys follow format: PREFIX|bucket-id
// Buckets are stable strings from category/street/sizing — NEVER from specific cards
// Generators produce random cards every time; SR key is always the same for a given bucket
//
// OUT_COUNT|flush-draw-flop
// OUT_COUNT|flush-draw-turn
// OUT_COUNT|backdoor-flush-draw-flop
// OUT_COUNT|oesd-flop
// OUT_COUNT|oesd-turn
// OUT_COUNT|double-gutshot-flop
// OUT_COUNT|double-gutshot-turn
// OUT_COUNT|gutshot-flop
// OUT_COUNT|gutshot-turn
// OUT_COUNT|straight-flush-draw-flop
// OUT_COUNT|straight-flush-draw-turn
// OUT_COUNT|royal-flush-draw-flop
// OUT_COUNT|royal-flush-draw-turn
// OUT_COUNT|combo-flush-oesd-flop
// OUT_COUNT|combo-flush-oesd-turn
// OUT_COUNT|combo-flush-gutshot-flop
// OUT_COUNT|combo-flush-gutshot-turn
// OUT_COUNT|backdoor-straight-flop
// OUT_COUNT|overcards-two-flop
// OUT_COUNT|overcards-two-turn
// OUT_COUNT|overcard-one-flop
// OUT_COUNT|overcard-one-turn
// OUT_COUNT|pair-plus-flush-draw-flop
// OUT_COUNT|pair-plus-flush-draw-turn
// OUT_COUNT|pair-plus-gutshot-flop
// OUT_COUNT|pair-plus-gutshot-turn
// OUT_COUNT|pair-plus-oesd-flop
// OUT_COUNT|pair-plus-oesd-turn
// OUT_COUNT|two-overcards-plus-gutshot-flop
// OUT_COUNT|two-overcards-plus-gutshot-turn
// OUT_COUNT|underpair-flop
// OUT_COUNT|underpair-turn
// OUT_COUNT|no-draw-flop
// OUT_COUNT|no-draw-turn
//
// RULE_42|2-outs-flop  ...  RULE_42|15-outs-turn
// (outs values: 2,3,4,5,6,7,8,9,10,12,14,15 × flop/turn)
//
// POT_RATIO|small-low  ...  POT_RATIO|overbet-high
// (sizing: small/medium/large/overbet × tier: low/mid/high)
//
// RATIO_PCT|1_5-to-1  ...  RATIO_PCT|6-to-1
// (ratios: 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6)
//
// EQUITY_DEC|flush-draw-small-bet-flop        EQUITY_DEC|flush-draw-large-bet-flop
// EQUITY_DEC|flush-draw-small-bet-turn        EQUITY_DEC|flush-draw-large-bet-turn
// EQUITY_DEC|oesd-small-bet-flop              EQUITY_DEC|oesd-large-bet-flop
// EQUITY_DEC|oesd-small-bet-turn              EQUITY_DEC|oesd-large-bet-turn
// EQUITY_DEC|gutshot-small-bet-flop           EQUITY_DEC|gutshot-large-bet-flop
// EQUITY_DEC|gutshot-small-bet-turn           EQUITY_DEC|gutshot-large-bet-turn
// EQUITY_DEC|double-gutshot-small-bet-flop    EQUITY_DEC|double-gutshot-large-bet-flop
// EQUITY_DEC|double-gutshot-small-bet-turn    EQUITY_DEC|double-gutshot-large-bet-turn
// EQUITY_DEC|combo-flush-oesd-small-bet-flop  EQUITY_DEC|combo-flush-oesd-large-bet-flop
// EQUITY_DEC|combo-flush-oesd-small-bet-turn  EQUITY_DEC|combo-flush-oesd-large-bet-turn
// EQUITY_DEC|combo-flush-gutshot-small-bet-flop EQUITY_DEC|combo-flush-gutshot-large-bet-flop
// EQUITY_DEC|combo-flush-gutshot-small-bet-turn EQUITY_DEC|combo-flush-gutshot-large-bet-turn
// EQUITY_DEC|straight-flush-draw-small-bet-flop EQUITY_DEC|straight-flush-draw-large-bet-flop
// EQUITY_DEC|royal-flush-draw-small-bet-flop  EQUITY_DEC|royal-flush-draw-large-bet-flop
// EQUITY_DEC|overcards-two-small-bet-flop     EQUITY_DEC|overcards-two-large-bet-flop
// EQUITY_DEC|overcards-two-small-bet-turn     EQUITY_DEC|overcards-two-large-bet-turn
// EQUITY_DEC|overcard-one-small-bet-flop      EQUITY_DEC|overcard-one-large-bet-flop
// EQUITY_DEC|overcard-one-small-bet-turn      EQUITY_DEC|overcard-one-large-bet-turn
// EQUITY_DEC|pair-plus-flush-draw-small-bet-flop EQUITY_DEC|pair-plus-flush-draw-large-bet-flop
// EQUITY_DEC|pair-plus-flush-draw-small-bet-turn EQUITY_DEC|pair-plus-flush-draw-large-bet-turn
// EQUITY_DEC|pair-plus-gutshot-small-bet-flop EQUITY_DEC|pair-plus-gutshot-large-bet-flop
// EQUITY_DEC|pair-plus-oesd-small-bet-flop    EQUITY_DEC|pair-plus-oesd-large-bet-flop
// EQUITY_DEC|two-overcards-plus-gutshot-small-bet-flop  EQUITY_DEC|two-overcards-plus-gutshot-large-bet-flop
// EQUITY_DEC|two-overcards-plus-gutshot-small-bet-turn  EQUITY_DEC|two-overcards-plus-gutshot-large-bet-turn
// EQUITY_DEC|underpair-small-bet-flop         EQUITY_DEC|underpair-large-bet-flop
// EQUITY_DEC|underpair-small-bet-turn         EQUITY_DEC|underpair-large-bet-turn
// EQUITY_DEC|backdoor-flush-small-bet-flop    EQUITY_DEC|backdoor-flush-large-bet-flop
// EQUITY_DEC|backdoor-straight-small-bet-flop EQUITY_DEC|backdoor-straight-large-bet-flop
// EQUITY_DEC|no-draw-any-bet
//
// BET_SIZE|dry-rainbow-ip-flop     BET_SIZE|dry-rainbow-oop-flop
// BET_SIZE|dry-rainbow-ip-turn     BET_SIZE|dry-rainbow-oop-turn
// BET_SIZE|dry-rainbow-ip-river    BET_SIZE|dry-rainbow-oop-river
// BET_SIZE|semi-wet-ip-flop        BET_SIZE|semi-wet-oop-flop
// BET_SIZE|semi-wet-ip-turn        BET_SIZE|semi-wet-oop-turn
// BET_SIZE|semi-wet-ip-river       BET_SIZE|semi-wet-oop-river
// BET_SIZE|wet-two-tone-ip-flop    BET_SIZE|wet-two-tone-oop-flop
// BET_SIZE|wet-two-tone-ip-turn    BET_SIZE|wet-two-tone-oop-turn
// BET_SIZE|wet-two-tone-ip-river   BET_SIZE|wet-two-tone-oop-river
// BET_SIZE|monotone-ip-flop        BET_SIZE|monotone-oop-flop
// BET_SIZE|monotone-ip-turn        BET_SIZE|monotone-oop-turn
// BET_SIZE|monotone-ip-river       BET_SIZE|monotone-oop-river
// BET_SIZE|paired-ip-flop          BET_SIZE|paired-oop-flop
// BET_SIZE|paired-ip-turn          BET_SIZE|paired-oop-turn
// BET_SIZE|paired-ip-river         BET_SIZE|paired-oop-river

// scenarios.js — Math & Decision Drill Data
// Loaded after ranges.js via defer script tag in index.html
//
// POT_ODDS_SCENARIOS: Hero faces a bet — call or fold based on equity vs. pot odds
// BET_SIZING_SCENARIOS: Hero bets — pick the right size given board/hand/position
//
// SR key format:
//   'POT_ODDS|' + scenario.id
//   'BET_SIZE|' + scenario.id
//
// potOddsNeeded = Math.round( bet / (pot + 2*bet) * 100 )
// Equity shown after answer — approximate, not solver output

// ─────────────────────────────────────────────────────────────────────────────
// POT ODDS SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────
// Categories: FLUSH_DRAW | STRAIGHT_DRAW | GUTSHOT | COMBO_DRAW | PAIR_EQUITY | RIVER
// Streets:    FLOP | TURN | RIVER
// correctAction: 'CALL' | 'FOLD'

const POT_ODDS_SCENARIOS = [

    // ── FLUSH DRAW ────────────────────────────────────────────────────────────
    // 9 outs. Flop equity ≈ 35–38% (× 4). Turn equity ≈ 18–20% (× 2).

    {
        id: 'fd-flop-standard',
        category: 'FLUSH_DRAW',
        street: 'FLOP',
        hand: ['Ah','Jh'],
        board: ['Kh','9h','3c'],
        pot: 85,
        bet: 60,
        potOddsNeeded: 29,      // 60 / (85 + 120) = 29.3%
        heroEquity: 38,
        correctAction: 'CALL',
        outsSummary: '9 flush outs (~36%) + ace-high value',
        explanation: 'You need 29% equity. Your nut flush draw gives ~38%. Clear call — and you have the best possible flush when you hit.'
    },
    {
        id: 'fd-flop-pot-bet',
        category: 'FLUSH_DRAW',
        street: 'FLOP',
        hand: ['7h','6h'],
        board: ['Ah','9h','2c'],
        pot: 60,
        bet: 60,
        potOddsNeeded: 33,      // 60 / (60 + 120) = 33.3%
        heroEquity: 35,
        correctAction: 'CALL',
        outsSummary: '9 flush outs (~35% over two streets)',
        explanation: 'Pot-sized bet needs 33% equity. Your flush draw gives ~35% — a thin but profitable call. Note: the ace on board reduces implied odds if you hit a small flush.'
    },
    {
        id: 'fd-flop-overbet',
        category: 'FLUSH_DRAW',
        street: 'FLOP',
        hand: ['5h','4h'],
        board: ['Ah','Kh','8c'],
        pot: 40,
        bet: 80,
        potOddsNeeded: 40,      // 80 / (40 + 160) = 40%
        heroEquity: 33,
        correctAction: 'FOLD',
        outsSummary: '9 flush outs (~35%), but overbet demands 40% equity',
        explanation: 'The 2× pot overbet means you need 40% equity — your flush draw only gives ~35%. Fold. With two high cards already on board, a flush-over-flush loss would be expensive too.'
    },
    {
        id: 'fd-flop-tiny-bet',
        category: 'FLUSH_DRAW',
        street: 'FLOP',
        hand: ['Qh','Jh'],
        board: ['8h','5h','2c'],
        pot: 80,
        bet: 25,
        potOddsNeeded: 19,      // 25 / (80 + 50) = 19.2%
        heroEquity: 42,
        correctAction: 'CALL',
        outsSummary: '9 flush outs (~35%) + two overcards (~6 outs) = ~42%',
        explanation: 'Only need 19% equity. You have ~42% with your flush draw plus overcards. You could even consider a raise — your equity justifies it.'
    },
    {
        id: 'fd-flop-with-pair',
        category: 'FLUSH_DRAW',
        street: 'FLOP',
        hand: ['Kh','8h'],
        board: ['8c','5h','2h'],
        pot: 70,
        bet: 45,
        potOddsNeeded: 28,      // 45 / (70 + 90) = 28.1%
        heroEquity: 46,
        correctAction: 'CALL',
        outsSummary: '9 flush outs (~35%) + 5 outs to two pair/trips (~11%) = ~46%',
        explanation: 'Middle pair plus flush draw is a monster. You have ~46% equity against most holdings. This hand is worth a semi-bluff raise — folding would be a mistake.'
    },
    {
        id: 'fd-turn-small-bet',
        category: 'FLUSH_DRAW',
        street: 'TURN',
        hand: ['Qh','Th'],
        board: ['Ah','8h','3c','2d'],
        pot: 150,
        bet: 40,
        potOddsNeeded: 17,      // 40 / (150 + 80) = 17.4%
        heroEquity: 20,
        correctAction: 'CALL',
        outsSummary: '9 flush outs on the turn = ~18–20% (one card left)',
        explanation: 'On the turn, 9 outs × 2 = ~18% equity. The small bet only needs 17% — just barely profitable. Call, but plan to fold any river bet if you miss.'
    },
    {
        id: 'fd-turn-big-bet',
        category: 'FLUSH_DRAW',
        street: 'TURN',
        hand: ['9h','8h'],
        board: ['Ac','Kd','Jh','4h'],
        pot: 80,
        bet: 70,
        potOddsNeeded: 32,      // 70 / (80 + 140) = 31.8%
        heroEquity: 20,
        correctAction: 'FOLD',
        outsSummary: '9 flush outs on the turn = ~18–20% equity',
        explanation: 'Turn flush draw vs. a big bet. You need 32% equity and only have ~20%. Fold. Don\'t fall in love with a draw on the turn when the price is too high — it\'s a costly habit.'
    },
    {
        id: 'fd-three-on-board',
        category: 'FLUSH_DRAW',
        street: 'FLOP',
        hand: ['6h','5h'],
        board: ['Ah','Kh','Qh'],
        pot: 60,
        bet: 55,
        potOddsNeeded: 32,      // 55 / (60 + 110) = 32.4%
        heroEquity: 4,
        correctAction: 'FOLD',
        outsSummary: 'Three hearts already on board — need running flush (turn AND river both hearts)',
        explanation: 'Three hearts on the flop means you need both the turn AND river to be hearts — about 4% chance. The pot odds math doesn\'t matter here. You have almost no equity. Fold immediately.'
    },

    // ── STRAIGHT DRAW ─────────────────────────────────────────────────────────
    // OESD = 8 outs. Flop equity ≈ 32%. Turn equity ≈ 17%.

    {
        id: 'oesd-flop-standard',
        category: 'STRAIGHT_DRAW',
        street: 'FLOP',
        hand: ['Jc','Tc'],
        board: ['9h','8d','2s'],
        pot: 70,
        bet: 45,
        potOddsNeeded: 28,      // 45 / (70 + 90) = 28.1%
        heroEquity: 32,
        correctAction: 'CALL',
        outsSummary: '8 outs (four Queens, four Sevens) = ~32% equity',
        explanation: 'Open-ended straight draw = 8 outs, both ends of the draw complete it. You need 28%, have 32%. Standard profitable call on the flop with two cards to come.'
    },
    {
        id: 'oesd-flop-big-bet',
        category: 'STRAIGHT_DRAW',
        street: 'FLOP',
        hand: ['7c','6h'],
        board: ['8h','5d','2c'],
        pot: 40,
        bet: 50,
        potOddsNeeded: 36,      // 50 / (40 + 100) = 35.7%
        heroEquity: 32,
        correctAction: 'FOLD',
        outsSummary: '8 outs (four Nines, four Fours) = ~32% equity',
        explanation: 'Your OESD gives 32% equity but the overbet demands 36%. Fold. Thin folds add up over time — and villain\'s large bet on this board often represents a set or two pair that\'s drawing thin against you anyway.'
    },
    {
        id: 'oesd-turn-small-bet',
        category: 'STRAIGHT_DRAW',
        street: 'TURN',
        hand: ['Js','Td'],
        board: ['9h','8d','2s','Ac'],
        pot: 180,
        bet: 40,
        potOddsNeeded: 15,      // 40 / (180 + 80) = 15.4%
        heroEquity: 17,
        correctAction: 'CALL',
        outsSummary: '8 outs on the turn = ~17% equity (one card left)',
        explanation: 'The small bet only needs 15% equity. Your OESD gives ~17% on the turn. Slight edge — call, but this hand is drawing dead to many turn bets. Be done on the river if you miss and face pressure.'
    },
    {
        id: 'oesd-turn-big-bet',
        category: 'STRAIGHT_DRAW',
        street: 'TURN',
        hand: ['Ts','9s'],
        board: ['Jh','8d','3c','Ac'],
        pot: 100,
        bet: 80,
        potOddsNeeded: 31,      // 80 / (100 + 160) = 30.8%
        heroEquity: 17,
        correctAction: 'FOLD',
        outsSummary: '8 outs on the turn = ~17% equity',
        explanation: 'Turn OESD vs. a big bet: need 31% equity, have 17%. Clear fold. The ace on the turn also makes bluff-catching even less likely — villain\'s range is heavily weighted toward made hands that crush you.'
    },
    {
        id: 'oesd-flop-overcards',
        category: 'STRAIGHT_DRAW',
        street: 'FLOP',
        hand: ['Ks','Qs'],
        board: ['Js','Tc','2h'],
        pot: 60,
        bet: 50,
        potOddsNeeded: 31,      // 50 / (60 + 100) = 31.3%
        heroEquity: 50,
        correctAction: 'CALL',
        outsSummary: '8 straight outs (Aces and Nines) + 6 overcard outs = ~50% equity',
        explanation: 'KQ on JT gives an OESD plus two overcards. Your equity is close to 50% — well above the 31% needed. This hand is worth a semi-bluff raise. Never fold this combination.'
    },

    // ── GUTSHOT ───────────────────────────────────────────────────────────────
    // 4 outs. Flop equity ≈ 16%. Turn equity ≈ 8–9%.

    {
        id: 'gutshot-flop-fold',
        category: 'GUTSHOT',
        street: 'FLOP',
        hand: ['Jc','9h'],
        board: ['Ks','Qd','3h'],
        pot: 60,
        bet: 40,
        potOddsNeeded: 29,      // 40 / (60 + 80) = 28.6%
        heroEquity: 16,
        correctAction: 'FOLD',
        outsSummary: '4 outs (four Tens complete K-Q-J-T-9) = ~16% equity',
        explanation: 'Gutshots give only 4 outs — one specific rank. On the flop with two cards to come that\'s ~16% equity. You need 29% to call. Fold gutshots to normal bets unless you have additional outs.'
    },
    {
        id: 'gutshot-flop-tiny-bet',
        category: 'GUTSHOT',
        street: 'FLOP',
        hand: ['Jc','9h'],
        board: ['Ks','Qd','4h'],
        pot: 80,
        bet: 12,
        potOddsNeeded: 12,      // 12 / (80 + 24) = 11.5%
        heroEquity: 16,
        correctAction: 'CALL',
        outsSummary: '4 outs (four Tens) = ~16% equity',
        explanation: 'The tiny bet only needs 13% equity. Your gutshot gives ~16%, plus you have implied odds if you hit the Ten. The low price makes even a weak gutshot profitable here.'
    },
    {
        id: 'gutshot-turn-fold',
        category: 'GUTSHOT',
        street: 'TURN',
        hand: ['Jc','9h'],
        board: ['Ks','Qd','4h','2c'],
        pot: 100,
        bet: 60,
        potOddsNeeded: 27,      // 60 / (100 + 120) = 27.3%
        heroEquity: 9,
        correctAction: 'FOLD',
        outsSummary: '4 outs on the turn = ~8–9% equity (one card left)',
        explanation: 'On the turn, one card left to hit. 4 outs × 2 = ~8% equity. You need 27% to call. This is the clearest fold in poker — a gutshot on the turn against a normal bet. Never call this.'
    },
    {
        id: 'gutshot-with-overcards',
        category: 'GUTSHOT',
        street: 'FLOP',
        hand: ['Ah','Jc'],
        board: ['Kd','Tc','3s'],
        pot: 70,
        bet: 60,
        potOddsNeeded: 32,      // 60 / (70 + 120) = 31.6%
        heroEquity: 22,
        correctAction: 'FOLD',
        outsSummary: '4 gutshot outs (Queens for A-K-Q-J-T) + ~3 ace outs = ~22%',
        explanation: 'AJ on KT3 has a gutshot to Broadway (need Q) and a weak ace out. That\'s about 22% equity. You still need 32% to call the big bet. Fold — real equity, wrong price.'
    },
    {
        id: 'gutshot-plus-pair-call',
        category: 'GUTSHOT',
        street: 'FLOP',
        hand: ['Kd','Jh'],
        board: ['Qh','9c','2s'],
        pot: 60,
        bet: 30,
        potOddsNeeded: 25,      // 30 / (60 + 60) = 25%
        heroEquity: 29,
        correctAction: 'CALL',
        outsSummary: '4 gutshot outs (Tens for K-Q-J-T-9) + 3 king outs = ~29%',
        explanation: 'KJ on Q92 has a gutshot (T fills K-Q-J-T-9) and top pair outs if a King hits. Combined ~29% equity just edges out the 25% needed. Call and reassess on the turn.'
    },

    // ── COMBO DRAW ────────────────────────────────────────────────────────────
    // FD + OESD = 15 outs (~54% flop). FD + gutshot = 12 outs (~45% flop).

    {
        id: 'combo-fd-oesd',
        category: 'COMBO_DRAW',
        street: 'FLOP',
        hand: ['Jh','Th'],
        board: ['9h','8d','2h'],
        pot: 60,
        bet: 60,
        potOddsNeeded: 33,      // 60 / (60 + 120) = 33.3%
        heroEquity: 54,
        correctAction: 'CALL',
        outsSummary: '15 outs: 9 flush + 8 straight − 2 overlap = 15 (~54% equity)',
        explanation: 'Flush draw plus open-ender = 15 outs. You\'re nearly a coin flip with most made hands. The pot-sized bet needs 33%, you have 54%. Raise is worth considering — you\'re not just drawing, you\'re the favorite.'
    },
    {
        id: 'combo-fd-gutshot',
        category: 'COMBO_DRAW',
        street: 'FLOP',
        hand: ['Ah','Qh'],
        board: ['Jh','9c','8d'],
        pot: 70,
        bet: 70,
        potOddsNeeded: 33,      // 70 / (70 + 140) = 33.3%
        heroEquity: 44,
        correctAction: 'CALL',
        outsSummary: '9 flush outs + 4 gutshot outs (Tens) − 1 overlap = 12 outs (~44%)',
        explanation: 'Nut flush draw plus a gutshot to the straight gives 12 outs and ~44% equity — well above the 33% needed. Always continue with nut flush draw plus any additional equity.'
    },
    {
        id: 'combo-fd-oesd-turn',
        category: 'COMBO_DRAW',
        street: 'TURN',
        hand: ['8h','7h'],
        board: ['6h','5d','2h','Ac'],
        pot: 100,
        bet: 50,
        potOddsNeeded: 25,      // 50 / (100 + 100) = 25%
        heroEquity: 30,
        correctAction: 'CALL',
        outsSummary: '9 flush outs + 8 straight outs − 2 overlap = 15 outs on turn = ~30%',
        explanation: 'On the turn, 15 outs still gives ~30% equity. You need 25% to call. Still profitable. The ace on the turn didn\'t hurt your draw — commit to seeing the river.'
    },
    {
        id: 'combo-pair-fd',
        category: 'COMBO_DRAW',
        street: 'FLOP',
        hand: ['8h','7h'],
        board: ['8c','5h','2h'],
        pot: 50,
        bet: 35,
        potOddsNeeded: 29,      // 35 / (50 + 70) = 29.2%
        heroEquity: 46,
        correctAction: 'CALL',
        outsSummary: 'Top pair + flush draw: 9 flush outs + 5 improvement outs = ~46%',
        explanation: 'Top pair plus flush draw is one of the strongest flop holdings. ~46% equity against most ranges, well above 29%. This hand is a semi-bluff raise candidate — at minimum, it\'s a clear call.'
    },

    // ── PAIR EQUITY ───────────────────────────────────────────────────────────
    // Overpairs/top pair — equity is vs. villain's realistic range, not outs

    {
        id: 'overpair-dry-board',
        category: 'PAIR_EQUITY',
        street: 'FLOP',
        hand: ['Kd','Kc'],
        board: ['9h','4d','2c'],
        pot: 80,
        bet: 55,
        potOddsNeeded: 29,      // 55 / (80 + 110) = 28.9%
        heroEquity: 70,
        correctAction: 'CALL',
        outsSummary: 'Overpair on dry board — ~70% equity vs. villain\'s c-bet range',
        explanation: 'Kings on 942 rainbow are a big favorite. Villain\'s c-bet range includes many missed hands and weaker pairs. You have ~70% equity. Call and consider raising.'
    },
    {
        id: 'overpair-wet-board',
        category: 'PAIR_EQUITY',
        street: 'FLOP',
        hand: ['Qd','Qc'],
        board: ['Jh','Th','4d'],
        pot: 90,
        bet: 70,
        potOddsNeeded: 30,      // 70 / (90 + 140) = 30.4%
        heroEquity: 55,
        correctAction: 'CALL',
        outsSummary: 'Overpair on wet board — ~55% equity, vulnerable to draws and two-pair',
        explanation: 'Queens on JT4 is strong but uncomfortable. Villain may have a flush draw, two pair, or a set. You still have ~55% equity vs. a realistic range — call, but be cautious about stack-off decisions.'
    },
    {
        id: 'tptk-dry-board',
        category: 'PAIR_EQUITY',
        street: 'FLOP',
        hand: ['As','Kd'],
        board: ['Ac','9h','3s'],
        pot: 75,
        bet: 60,
        potOddsNeeded: 31,      // 60 / (75 + 120) = 30.8%
        heroEquity: 72,
        correctAction: 'CALL',
        outsSummary: 'Top pair top kicker on dry board — ~72% equity vs. realistic range',
        explanation: 'AK on A93 rainbow is as strong as a one-pair hand gets. Very few hands beat you here. Need 31% equity, have ~72%. Call or raise — folding would be a significant error.'
    },
    {
        id: 'second-pair-big-bet-fold',
        category: 'PAIR_EQUITY',
        street: 'FLOP',
        hand: ['Tc','9c'],
        board: ['Ah','Kd','Ts'],
        pot: 80,
        bet: 90,
        potOddsNeeded: 35,      // 90 / (80 + 180) = 34.6%
        heroEquity: 25,
        correctAction: 'FOLD',
        outsSummary: 'Second pair (Tens) on two-overcard board — ~25% equity vs. big bet',
        explanation: 'Tens on AK board is second pair. A big bet from most live players heavily represents an ace or king. You need 35% equity and probably have ~25%. Fold — don\'t pay off top pair with second pair.'
    },
    {
        id: 'second-pair-small-bet-call',
        category: 'PAIR_EQUITY',
        street: 'FLOP',
        hand: ['Kh','Jd'],
        board: ['Ac','Kd','7s'],
        pot: 60,
        bet: 20,
        potOddsNeeded: 20,      // 20 / (60 + 40) = 20%
        heroEquity: 40,
        correctAction: 'CALL',
        outsSummary: 'Second pair (Kings) on dry board — ~40% equity vs. small bet range',
        explanation: 'The tiny bet doesn\'t credibly represent an ace — villain might have a weak king or be stabbing with air. At 20% equity needed vs. ~40% actual equity, call comfortably and reassess the turn.'
    },
    {
        id: 'bottom-pair-overbet-fold',
        category: 'PAIR_EQUITY',
        street: 'FLOP',
        hand: ['3c','2h'],
        board: ['Ah','9d','3s'],
        pot: 50,
        bet: 100,
        potOddsNeeded: 40,      // 100 / (50 + 200) = 40%
        heroEquity: 15,
        correctAction: 'FOLD',
        outsSummary: 'Bottom pair (Threes) vs. 2× pot overbet — ~15% equity',
        explanation: 'Threes on A93 is bottom pair. The 2× pot overbet demands 40% equity. Your hand has roughly 15% chance to be best at showdown. Fold without hesitation.'
    },

    // ── RIVER ─────────────────────────────────────────────────────────────────
    // No more outs — equity is pure showdown value vs. villain\'s bet/bluff frequency

    {
        id: 'river-missed-draw-fold',
        category: 'RIVER',
        street: 'RIVER',
        hand: ['Jc','Tc'],
        board: ['9h','8d','2s','Ac','3h'],
        pot: 120,
        bet: 110,
        potOddsNeeded: 32,      // 110 / (120 + 220) = 32.4%
        heroEquity: 0,
        correctAction: 'FOLD',
        outsSummary: 'Missed straight draw — jack-high has zero showdown value',
        explanation: 'You bricked the river. Jack-high almost never wins at showdown. No matter what the pot odds are, you can\'t call with zero equity. Fold every time — this isn\'t even close.'
    },
    {
        id: 'river-overbet-bluff-catch-fold',
        category: 'RIVER',
        street: 'RIVER',
        hand: ['Kh','Qd'],
        board: ['Ah','Jc','9s','3d','2h'],
        pot: 100,
        bet: 150,
        potOddsNeeded: 38,      // 150 / (100 + 300) = 37.5%
        heroEquity: 20,
        correctAction: 'FOLD',
        outsSummary: 'King-high — beats only bluffs. Villain needs to bluff 38%+ for a call to work',
        explanation: 'KQ with no pair needs villain to be bluffing. The 1.5× overbet needs them bluffing 38% of the time — most live 1/3 players overbet the river with value, rarely as a bluff. Fold.'
    },
    {
        id: 'river-top-pair-small-bet',
        category: 'RIVER',
        street: 'RIVER',
        hand: ['Ac','Qd'],
        board: ['Ah','8h','4c','3s','2d'],
        pot: 90,
        bet: 35,
        potOddsNeeded: 22,      // 35 / (90 + 70) = 21.9%
        heroEquity: 65,
        correctAction: 'CALL',
        outsSummary: 'Top pair (Aces) on bricked board — ~65% equity at showdown',
        explanation: 'Aces beat every missed draw, every weaker ace, every lower pair. The board bricked out. Small bet only needs 22% equity. Call easily — and consider whether to raise for thin value.'
    },
    {
        id: 'river-set-any-bet',
        category: 'RIVER',
        street: 'RIVER',
        hand: ['Kd','Kc'],
        board: ['Kh','8s','3d','7c','2h'],
        pot: 150,
        bet: 120,
        potOddsNeeded: 31,      // 120 / (150 + 240) = 30.8%
        heroEquity: 97,
        correctAction: 'CALL',
        outsSummary: 'Top set on a safe river — ~97% equity',
        explanation: 'This scenario teaches a mindset point: with top set on a blank board, you need 32% equity and have 97%. Never fold here. The real question is whether to raise for value — with a set on a safe river, a raise is often correct to extract maximum value from two-pair and overpairs. At minimum, call instantly.'
    },
    {
        id: 'river-broadway-nuts',
        category: 'RIVER',
        street: 'RIVER',
        hand: ['Jc','Tc'],
        board: ['Ah','Kd','Qh','3s','2c'],
        pot: 80,
        bet: 25,
        potOddsNeeded: 19,      // 25 / (80 + 50) = 19.2%
        heroEquity: 99,
        correctAction: 'CALL',
        outsSummary: 'Broadway straight (A-K-Q-J-T) — the nuts',
        explanation: 'Your J-T makes the Broadway straight on the river: A-K-Q-J-T. You have the nuts. You need 19% equity and have essentially 100%. Always call — and raise here.'
    },
    {
        id: 'river-medium-pair-medium-bet',
        category: 'RIVER',
        street: 'RIVER',
        hand: ['Qh','Jd'],
        board: ['Qd','8h','3c','2s','Td'],
        pot: 100,
        bet: 50,
        potOddsNeeded: 25,      // 50 / (100 + 100) = 25%
        heroEquity: 55,
        correctAction: 'CALL',
        outsSummary: 'Top pair (Queens) with J kicker on bricked river — ~55% equity',
        explanation: 'Top pair good kicker on a safe river faces a half-pot bet. You need 25% equity and have ~55%. The ten on the river didn\'t change much — villain\'s range still has many bluffs and weaker pairs. Call.'
    }
];

// ─────────────────────────────────────────────────────────────────────────────
// POT ODDS MATH SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────
// Pure arithmetic — no cards. Given pot + bet, what % equity do you need?
// Formula: bet / (pot + 2×bet) × 100
// SR key: 'POT_MATH|' + scenario.id

const POT_MATH_SCENARIOS = [

    // ── SMALL BETS (1/3 pot → 20%) ───────────────────────────────────────────

    {
        id: 'pm-third-pot-a',
        category: 'SMALL_BET',
        pot: 90, bet: 30,
        correctPct: 20,
        choices: [15, 20, 25, 33],
        explanation: '30 \u00f7 (90 + 60) = 30 \u00f7 150 = 20%. A 1/3-pot bet gives the caller great odds \u2014 you only need to win 1 in 5 times to break even.'
    },
    {
        id: 'pm-third-pot-b',
        category: 'SMALL_BET',
        pot: 60, bet: 20,
        correctPct: 20,
        choices: [17, 20, 25, 33],
        explanation: '20 \u00f7 (60 + 40) = 20 \u00f7 100 = 20%. Same result \u2014 pot size doesn\'t change the math when the ratio stays the same. 1/3-pot always needs exactly 20%.'
    },

    // ── MEDIUM BETS (1/2 pot → 25%, 2/3 pot → 29%, 3/4 pot → 30%) ──────────

    {
        id: 'pm-half-pot-a',
        category: 'MEDIUM_BET',
        pot: 100, bet: 50,
        correctPct: 25,
        choices: [20, 25, 29, 33],
        explanation: '50 \u00f7 (100 + 100) = 50 \u00f7 200 = 25%. A half-pot bet is the most common sizing you\'ll face. Memorise this: half-pot always needs 25% equity.'
    },
    {
        id: 'pm-half-pot-b',
        category: 'MEDIUM_BET',
        pot: 80, bet: 40,
        correctPct: 25,
        choices: [20, 25, 33, 38],
        explanation: '40 \u00f7 (80 + 80) = 40 \u00f7 160 = 25%. The pot size changed but the answer didn\'t \u2014 because the ratio is still 1/2. Learn the bet-size ratios, not just specific dollar amounts.'
    },
    {
        id: 'pm-two-thirds-pot-a',
        category: 'MEDIUM_BET',
        pot: 90, bet: 60,
        correctPct: 29,
        choices: [25, 29, 33, 38],
        explanation: '60 \u00f7 (90 + 120) = 60 \u00f7 210 \u2248 29%. The 2/3-pot sizing is very common. A flush draw (~36%) calls comfortably; a gutshot (~16%) folds.'
    },
    {
        id: 'pm-two-thirds-pot-b',
        category: 'MEDIUM_BET',
        pot: 100, bet: 67,
        correctPct: 29,
        choices: [24, 29, 33, 38],
        explanation: '67 \u00f7 (100 + 134) = 67 \u00f7 234 \u2248 29%. The classic 2/3-pot c-bet. Needs 29% \u2014 right at the boundary for most semi-bluff draws on the turn.'
    },
    {
        id: 'pm-three-quarter-pot',
        category: 'MEDIUM_BET',
        pot: 80, bet: 60,
        correctPct: 30,
        choices: [25, 30, 33, 38],
        explanation: '60 \u00f7 (80 + 120) = 60 \u00f7 200 = 30%. A 3/4-pot bet pushes the requirement toward 30%. OESD on the turn (17% equity) is now a clear fold.'
    },

    // ── POT BETS (1x pot → 33%) ───────────────────────────────────────────────

    {
        id: 'pm-pot-bet-a',
        category: 'POT_BET',
        pot: 80, bet: 80,
        correctPct: 33,
        choices: [25, 29, 33, 40],
        explanation: '80 \u00f7 (80 + 160) = 80 \u00f7 240 = 33%. A pot-sized bet always needs 33% equity \u2014 one of the most important numbers in poker. You\'re being offered exactly 2-to-1.'
    },
    {
        id: 'pm-pot-bet-b',
        category: 'POT_BET',
        pot: 100, bet: 100,
        correctPct: 33,
        choices: [25, 33, 38, 43],
        explanation: '100 \u00f7 (100 + 200) = 100 \u00f7 300 = 33%. Same result. Pot bets always require 33%. A flush draw (36%) calls; a bare straight draw (32%) is a close fold.'
    },

    // ── OVERBETS (1.5x pot → 38%) ─────────────────────────────────────────────

    {
        id: 'pm-overbet-a',
        category: 'OVERBET',
        pot: 70, bet: 105,
        correctPct: 38,
        choices: [33, 38, 43, 50],
        explanation: '105 \u00f7 (70 + 210) = 105 \u00f7 280 = 37.5% \u2248 38%. A 1.5x overbet needs 38% equity \u2014 most draws don\'t qualify. Only combo draws or strong made hands can call here.'
    },
    {
        id: 'pm-overbet-b',
        category: 'OVERBET',
        pot: 80, bet: 120,
        correctPct: 38,
        choices: [33, 38, 43, 50],
        explanation: '120 \u00f7 (80 + 240) = 120 \u00f7 320 = 37.5% \u2248 38%. Overbets polarise the pressure. Only strong made hands or premium combo draws can call \u2014 everything else folds.'
    },
];


// ─────────────────────────────────────────────────────────────────────────────
// BET SIZING SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────
// Hero is betting. Pick the right size.
// Sizes: 'CHECK' | '25' | '33' | '50' | '75' | 'POT' | 'OVERBET'
// correctSizes: array — all acceptable answers
// bestSize: single best answer (shown in feedback)
// wrongSizes: clearly wrong choices (used for grading)

const BET_SIZING_SCENARIOS = [

    // ── DRY BOARD — THIN VALUE ────────────────────────────────────────────────
    // Dry boards: fewer draws, less urgency, smaller sizing extracts more thin calls

    {
        id: 'tptk-dry-rainbow-ip',
        category: 'DRY_BOARD',
        street: 'FLOP',
        hand: ['As','Kd'],
        board: ['Ac','7h','2d'],
        position: 'IP',
        potSize: 35,
        stackBehind: 280,
        correctSizes: ['33', '50'],
        bestSize: '33',
        wrongSizes: ['CHECK', '75', 'POT', 'OVERBET'],
        explanation: 'Dry rainbow board, top pair top kicker in position. Go small — the board misses most hands, so small bets get called by worse aces and pairs. Large bets only get called by hands that beat you.'
    },
    {
        id: 'overpair-dry-ip',
        category: 'DRY_BOARD',
        street: 'FLOP',
        hand: ['Qd','Qc'],
        board: ['8h','4d','2c'],
        position: 'IP',
        potSize: 30,
        stackBehind: 250,
        correctSizes: ['33', '50'],
        bestSize: '33',
        wrongSizes: ['CHECK', '75', 'POT', 'OVERBET'],
        explanation: 'Overpair on a dry low board. Small bet: villain calls with eights, fours, and any pocket pair. Big bet: only continues with sets and two pair. Extract thin value with a small sizing.'
    },
    {
        id: 'overpair-dry-oop',
        category: 'DRY_BOARD',
        street: 'FLOP',
        hand: ['Kh','Ks'],
        board: ['9c','5d','2h'],
        position: 'OOP',
        potSize: 40,
        stackBehind: 300,
        correctSizes: ['50', '33'],
        bestSize: '50',
        wrongSizes: ['CHECK', 'POT', 'OVERBET'],
        explanation: 'Out of position with an overpair on a dry board. Slightly larger than IP — you need some protection and can\'t control the pot size as easily. Half-pot gets the job done without over-inflating the pot.'
    },
    {
        id: 'tptk-dry-3bet-pot-ip',
        category: 'DRY_BOARD',
        street: 'FLOP',
        hand: ['As','Kh'],
        board: ['Ad','7c','3s'],
        position: 'IP',
        potSize: 90,
        stackBehind: 210,
        correctSizes: ['33', '25'],
        bestSize: '33',
        wrongSizes: ['75', 'POT', 'OVERBET'],
        explanation: 'Three-bet pot, top pair top kicker, dry board. Small bet in 3-bet pots forces opponent to fold or call with nothing — you want calls. SPR is low enough that a small bet sets up a manageable turn barrel.'
    },
    {
        id: 'middle-pair-dry-check',
        category: 'DRY_BOARD',
        street: 'FLOP',
        hand: ['Td','9h'],
        board: ['Ac','Th','3s'],
        position: 'IP',
        potSize: 30,
        stackBehind: 270,
        correctSizes: ['CHECK', '33'],
        bestSize: 'CHECK',
        wrongSizes: ['75', 'POT', 'OVERBET'],
        explanation: 'Second pair on an ace-high board in position. Check back: your hand has decent showdown value but no value betting equity — villain\'s calling range beats you. Control the pot and see a free turn.'
    },
    {
        id: 'bottom-set-dry-trap',
        category: 'DRY_BOARD',
        street: 'FLOP',
        hand: ['2d','2c'],
        board: ['Ah','2h','7s'],
        position: 'IP',
        potSize: 35,
        stackBehind: 265,
        correctSizes: ['33', '25'],
        bestSize: '33',
        wrongSizes: ['75', 'POT', 'OVERBET'],
        explanation: 'Bottom set on an ace-high dry board. Go small and let villain continue with ace-x hands they believe are ahead. Large bets chase off exactly the hands you want to trap. Build the pot gradually.'
    },

    // ── WET BOARD — PROTECTION & CHARGES ─────────────────────────────────────
    // Wet boards: more draws, more urgency — charge draws, protect your hand

    {
        id: 'tptk-two-tone-ip',
        category: 'WET_BOARD',
        street: 'FLOP',
        hand: ['As','Qd'],
        board: ['Ad','8d','5h'],
        position: 'IP',
        potSize: 35,
        stackBehind: 265,
        correctSizes: ['50', '75'],
        bestSize: '75',
        wrongSizes: ['CHECK', '33', 'POT'],
        explanation: 'Top pair on a two-tone board. The flush draw is live — charge it now. A 75% bet forces draws to pay a price they don\'t like, while still getting called by top pair worse kicker and weak aces.'
    },
    {
        id: 'set-wet-oop',
        category: 'WET_BOARD',
        street: 'FLOP',
        hand: ['7d','7c'],
        board: ['7h','8h','9d'],
        position: 'OOP',
        potSize: 45,
        stackBehind: 205,
        correctSizes: ['75', 'POT'],
        bestSize: '75',
        wrongSizes: ['CHECK', '33', '50'],
        explanation: 'Top set on a very wet board — flush draw, open-ended straight draw. You must charge these draws heavily. Small bets give them profitable implied odds. Bet 75%+ to make their calls mathematically incorrect.'
    },
    {
        id: 'overpair-two-tone-ip',
        category: 'WET_BOARD',
        street: 'FLOP',
        hand: ['Ks','Kd'],
        board: ['Jh','Th','4c'],
        position: 'IP',
        potSize: 40,
        stackBehind: 260,
        correctSizes: ['50', '75'],
        bestSize: '75',
        wrongSizes: ['CHECK', '33', 'OVERBET'],
        explanation: 'Overpair on a JT board with a flush draw present. Bet big: both draws (flush and straight) are live, and JT is a connected board where villain has many two-pair combos. Make them pay now.'
    },
    {
        id: 'two-pair-connected-board-oop',
        category: 'WET_BOARD',
        street: 'FLOP',
        hand: ['Jd','Tc'],
        board: ['Jh','Ts','6h'],
        position: 'OOP',
        potSize: 50,
        stackBehind: 250,
        correctSizes: ['75', 'POT'],
        bestSize: 'POT',
        wrongSizes: ['CHECK', '33', '50'],
        explanation: 'Top two pair on a highly connected, two-tone board. Many draws and straight cards available. Pot-sized bet here: protect your hand aggressively and build the pot before bad cards arrive.'
    },
    {
        id: 'monotone-board-check',
        category: 'WET_BOARD',
        street: 'FLOP',
        hand: ['Ac','Kd'],
        board: ['Qh','8h','3h'],
        position: 'IP',
        potSize: 30,
        stackBehind: 270,
        correctSizes: ['CHECK', '33'],
        bestSize: 'CHECK',
        wrongSizes: ['75', 'POT', 'OVERBET'],
        explanation: 'Monotone board and you don\'t have a heart. Check back: any bet is called only by hearts (which beat you) or bluff-catchers. You gain nothing by betting into a board that completely misses your hand.'
    },
    {
        id: 'flush-complete-top-pair-check',
        category: 'WET_BOARD',
        street: 'TURN',
        hand: ['As','Kd'],
        board: ['Ad','8d','5h','2d'],
        position: 'IP',
        potSize: 90,
        stackBehind: 210,
        correctSizes: ['CHECK', '33'],
        bestSize: 'CHECK',
        wrongSizes: ['75', 'POT', 'OVERBET'],
        explanation: 'Flush completes on the turn and you don\'t have a diamond. Check back: anyone who calls your bet likely has the flush. Your top pair has significant showdown value checked through. Protect your hand by not inflating the pot.'
    },
    {
        id: 'set-paired-board-ip',
        category: 'WET_BOARD',
        street: 'FLOP',
        hand: ['5d','5c'],
        board: ['5h','Qh','Qd'],
        position: 'IP',
        potSize: 35,
        stackBehind: 265,
        correctSizes: ['33', '50'],
        bestSize: '33',
        wrongSizes: ['75', 'POT', 'OVERBET'],
        explanation: 'Full house (fives full of queens) on a paired board. Go small: villain can\'t have much on this board, and a small bet looks like a steal they can bluff-raise. Draw them in rather than scaring them off.'
    },

    // ── RIVER SIZING ──────────────────────────────────────────────────────────
    // River: no more draws — sizing is about value extraction vs. bluff credibility

    {
        id: 'river-thin-value-medium-pair',
        category: 'RIVER_VALUE',
        street: 'RIVER',
        hand: ['Qh','Jd'],
        board: ['Qd','8c','3s','2h','6d'],
        position: 'IP',
        potSize: 100,
        stackBehind: 200,
        correctSizes: ['33', '50'],
        bestSize: '33',
        wrongSizes: ['75', 'POT', 'OVERBET'],
        explanation: 'Top pair on a bricked river — this is thin value. Bet small to get called by weaker queens, pairs, and missed draws taking a stab. A big bet only gets called by better hands. Extract thin value cheaply.'
    },
    {
        id: 'river-strong-value-top-two',
        category: 'RIVER_VALUE',
        street: 'RIVER',
        hand: ['Ah','Jh'],
        board: ['As','Jc','4d','8h','2c'],
        position: 'OOP',
        potSize: 110,
        stackBehind: 190,
        correctSizes: ['75', 'POT'],
        bestSize: '75',
        wrongSizes: ['CHECK', '33', 'OVERBET'],
        explanation: 'Top two pair on a safe river. This is a strong hand — bet for value against single-pair hands and weaker two-pair combinations. 75% gets called by aces, jacks, and draws that turned showdown value.'
    },
    {
        id: 'river-nut-flush-overbet',
        category: 'RIVER_VALUE',
        street: 'RIVER',
        hand: ['Ah','Kh'],
        board: ['Qh','8h','3c','Jh','2d'],
        position: 'IP',
        potSize: 120,
        stackBehind: 180,
        correctSizes: ['POT', 'OVERBET'],
        bestSize: 'OVERBET',
        wrongSizes: ['33', '50', 'CHECK'],
        explanation: 'Nut flush on the river. Overbet: you block the flush so villain is more likely to have showdown hands like sets or two pair that will call big. Polarize with an overbet and extract maximum value from hands that can\'t fold.'
    },
    {
        id: 'river-missed-bluff-sizing',
        category: 'RIVER_BLUFF',
        street: 'RIVER',
        hand: ['7h','6h'],
        board: ['Ah','Kc','Qd','3s','2c'],
        position: 'IP',
        potSize: 80,
        stackBehind: 220,
        correctSizes: ['75', 'POT'],
        bestSize: '75',
        wrongSizes: ['CHECK', '33', '50'],
        explanation: 'You have seven-high with no pair, no draw — total air. Villain checked to you IP. Go big: bluffs need to force folds, and small bets get looked up too often by live players with any pair. A 75% or pot-sized bluff is credible and forces real decisions. Small bluffs are the worst of both worlds.'
    },
    {
        id: 'river-check-medium-strength',
        category: 'RIVER_VALUE',
        street: 'RIVER',
        hand: ['Kc','Td'],
        board: ['Kh','9d','5c','3h','Jd'],
        position: 'IP',
        potSize: 85,
        stackBehind: 215,
        correctSizes: ['CHECK', '33'],
        bestSize: 'CHECK',
        wrongSizes: ['75', 'POT', 'OVERBET'],
        explanation: 'Top pair medium kicker on a river that completed a straight (if villain has QT or 8x). Check back: your hand has good showdown value against missed draws, but betting just inflates the pot when you might be behind. Check and snap off bluffs.'
    },

    // ── POSITION ADJUSTMENTS ──────────────────────────────────────────────────

    {
        id: 'c-bet-ip-dry-bluff',
        category: 'POSITION',
        street: 'FLOP',
        hand: ['7s','6s'],
        board: ['Ac','Kh','2d'],
        position: 'IP',
        potSize: 30,
        stackBehind: 270,
        correctSizes: ['33', '25'],
        bestSize: '33',
        wrongSizes: ['CHECK', '75', 'POT'],
        explanation: 'Bluffing in position on a dry ace-king board with a missed hand. Small c-bet: this board hits your perceived range (you 3-bet pre) hard. A small bet gets folds from all missed hands at a low cost.'
    },
    {
        id: 'c-bet-oop-wet-bluff',
        category: 'POSITION',
        street: 'FLOP',
        hand: ['7s','6s'],
        board: ['Jh','Th','4d'],
        position: 'OOP',
        potSize: 30,
        stackBehind: 270,
        correctSizes: ['50', '75'],
        bestSize: '50',
        wrongSizes: ['CHECK', '33', 'POT'],
        explanation: 'Bluffing out of position on a wet board. Need a bigger bet than IP — villain in position can float small bets cheaply and see what you do on the turn. A 50–75% bet gives your bluff more credibility and fold equity.'
    },
    {
        id: 'value-bet-oop-vs-draw-heavy',
        category: 'POSITION',
        street: 'TURN',
        hand: ['As','Ad'],
        board: ['9h','8h','3c','Kd'],
        position: 'OOP',
        potSize: 90,
        stackBehind: 210,
        correctSizes: ['75', 'POT'],
        bestSize: '75',
        wrongSizes: ['CHECK', '33', '50'],
        explanation: 'Overpair out of position on a turn that added a second overcard to a flush-draw board. Bet large: you can\'t afford to give a free card, and OOP you have no control over the river. Make draws pay now.'
    },

    // ── SPR AWARENESS ─────────────────────────────────────────────────────────

    {
        id: 'low-spr-commit',
        category: 'SPR',
        street: 'FLOP',
        hand: ['Ah','Kd'],
        board: ['As','8c','3h'],
        position: 'IP',
        potSize: 120,
        stackBehind: 80,
        correctSizes: ['POT', '75'],
        bestSize: 'POT',
        wrongSizes: ['CHECK', '33', '50'],
        explanation: 'Low SPR (stack-to-pot ratio ≈ 0.7). You\'re committed — the money is going in regardless. Bet the pot and set up an easy all-in on the turn. In low-SPR pots, small bets create weird sizing on later streets.'
    },
    {
        id: 'high-spr-thin-value',
        category: 'SPR',
        street: 'FLOP',
        hand: ['Ks','Qd'],
        board: ['Kh','7c','2d'],
        position: 'IP',
        potSize: 20,
        stackBehind: 480,
        correctSizes: ['33', '25'],
        bestSize: '25',
        wrongSizes: ['75', 'POT', 'OVERBET'],
        explanation: 'High SPR (≈ 24) with top pair good kicker. Bet very small: with deep stacks, you want to build the pot slowly and keep villain\'s range wide. Big bets with high SPR and a medium-strength hand risk inflating the pot unnecessarily.'
    },
    {
        id: 'medium-spr-two-pair',
        category: 'SPR',
        street: 'FLOP',
        hand: ['Jd','Tc'],
        board: ['Jh','Th','6c'],
        position: 'OOP',
        potSize: 60,
        stackBehind: 240,
        correctSizes: ['75', 'POT'],
        bestSize: '75',
        wrongSizes: ['CHECK', '33', '50'],
        explanation: 'Medium SPR (≈ 4) with top two pair on a wet board. Bet 75%: you want to get the money in over two streets, protect against draws, and set up a comfortable stack-off on the turn. Two pair on JT6 with a flush draw is worth aggressive commitment.'
    },

    // ── TURN BARRELS ──────────────────────────────────────────────────────────

    {
        id: 'turn-second-barrel-value',
        category: 'TURN',
        street: 'TURN',
        hand: ['As','Kd'],
        board: ['Ac','9h','3s','2d'],
        position: 'IP',
        potSize: 80,
        stackBehind: 220,
        correctSizes: ['50', '75'],
        bestSize: '50',
        wrongSizes: ['CHECK', '33', 'POT'],
        explanation: 'Second barrel with top pair top kicker. The turn bricked — you\'re still the best hand. Half-pot keeps the pot manageable while extracting value from worse aces and pairs. Going bigger risks bloating the pot in a spot where you\'re not certain you\'re ahead.'
    },
    {
        id: 'turn-delayed-cbet-strong',
        category: 'TURN',
        street: 'TURN',
        hand: ['Kd','Qc'],
        board: ['Ks','8h','3d','Jc'],
        position: 'IP',
        potSize: 60,
        stackBehind: 240,
        correctSizes: ['50', '75'],
        bestSize: '75',
        wrongSizes: ['CHECK', '33', 'POT'],
        explanation: 'You checked the flop and now the Jack came — a card that hits a lot of villain\'s range. Bet 75% as a delayed c-bet: the Jack improves your perceived range (KQ makes a straight draw now), you have top pair top kicker, and villain\'s checks on the flop suggested weakness.'
    },
    {
        id: 'turn-give-up-check',
        category: 'TURN',
        street: 'TURN',
        hand: ['7s','6s'],
        board: ['Ad','Kc','Qh','8d'],
        position: 'IP',
        potSize: 70,
        stackBehind: 230,
        correctSizes: ['CHECK'],
        bestSize: 'CHECK',
        wrongSizes: ['33', '50', '75', 'POT'],
        explanation: 'You c-bet the flop with nothing and got called. The turn brings an 8 that doesn\'t help you on AKQ. Give up: villain called the flop which means they have something. A second barrel here is burning money with no equity and no fold equity.'
    },

    // ── RIVER BLUFF SIZING ─────────────────────────────────────────────────────

    {
        id: 'river-bluff-missed-fd',
        category: 'RIVER_BLUFF',
        street: 'RIVER',
        hand: ['7c','6c'],
        board: ['Ac','Kd','Tc','3s','2h'],
        position: 'OOP',
        potSize: 90,
        stackBehind: 210,
        correctSizes: ['75', 'POT'],
        bestSize: '75',
        wrongSizes: ['CHECK', '33', '50'],
        explanation: 'You had a club flush draw through the turn (4 clubs: Ac Tc 7c 6c) that bricked on the river. Now you have seven-high — essentially air. If you decide to bluff, go big: small bets get called too often by live players with any pair. A 75% bet puts real pressure on villain\'s bluff-catchers. Small bluffs are the worst of both worlds — you risk chips without generating enough folds.'
    }
];


// ── Category metadata for UI labels and leak tracking ─────────────────────────

const POT_ODDS_CATEGORIES = {
    FLUSH_DRAW:    { label: 'Flush Draws',     color: 'text-indigo-400' },
    STRAIGHT_DRAW: { label: 'Straight Draws',  color: 'text-blue-400'   },
    GUTSHOT:       { label: 'Gutshots',         color: 'text-yellow-400' },
    COMBO_DRAW:    { label: 'Combo Draws',      color: 'text-emerald-400'},
    PAIR_EQUITY:   { label: 'Pair Equity',      color: 'text-slate-300'  },
    RIVER:         { label: 'River Decisions',  color: 'text-rose-400'   }
};

const BET_SIZING_CATEGORIES = {
    DRY_BOARD:    { label: 'Dry Boards',       color: 'text-slate-300'  },
    WET_BOARD:    { label: 'Wet Boards',        color: 'text-blue-400'   },
    RIVER_VALUE:  { label: 'River Value',       color: 'text-emerald-400'},
    RIVER_BLUFF:  { label: 'River Bluffs',      color: 'text-rose-400'   },
    POSITION:     { label: 'Position Plays',    color: 'text-indigo-400' },
    SPR:          { label: 'Stack-to-Pot',      color: 'text-yellow-400' },
    TURN:         { label: 'Turn Decisions',    color: 'text-orange-400' }
};

const POT_MATH_CATEGORIES = {
    SMALL_BET:   { label: 'Small Bets (1/3 pot)',    color: 'text-slate-300'  },
    MEDIUM_BET:  { label: 'Medium Bets (1/2\u20133/4 pot)', color: 'text-indigo-400' },
    POT_BET:     { label: 'Pot-Sized Bets',          color: 'text-yellow-400' },
    OVERBET:     { label: 'Overbets (1.5x+)',         color: 'text-rose-400'   },
};

// ── DECK UTILITIES ──
// Card string format: rank + suit e.g. 'Ah', 'Tc', '2s'
// RANKS/SUITS sourced from ranges.js (loaded before scenarios.js via defer)

function buildShuffledDeck() {
    const deck = [];
    for (const r of RANKS) for (const s of SUITS) deck.push(r + s);
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function dealCards(deck, n) {
    return deck.splice(0, n);
}

function validateNoDuplicates() {
    const all = [];
    for (const arr of arguments) for (const c of arr) all.push(c);
    return all.length === new Set(all).size;
}

function dealWithConstraints(handSize, boardSize, constraintFn, maxAttempts) {
    maxAttempts = maxAttempts || 50;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const deck = buildShuffledDeck();
        const hand = dealCards(deck, handSize);
        const board = dealCards(deck, boardSize);
        if (constraintFn(hand, board) && validateNoDuplicates(hand, board)) {
            return { hand, board };
        }
    }
    return null;
}

// ── MATH DRILL GENERATORS ──

const RULE42_OUTS_POOL = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15];

function generateRuleOf42Scenario(outs, street) {
    if (!outs) outs = RULE42_OUTS_POOL[Math.floor(Math.random() * RULE42_OUTS_POOL.length)];
    if (!street) street = Math.random() < 0.5 ? 'FLOP' : 'TURN';

    const mult = street === 'FLOP' ? 4 : 2;
    const correctEquity = outs * mult;

    // Wrong answers represent real mistakes: wrong street rule, adjacent out counts
    const wrongRule  = street === 'FLOP' ? outs * 2 : outs * 4;          // right outs, wrong street rule
    const wrongOuts1 = (outs + 1) * mult;                                  // one out too many, correct rule
    const wrongOuts2 = (outs - 1) * (street === 'FLOP' ? 2 : 4);         // one out short, wrong rule

    const used = new Set([correctEquity]);
    const wrongs = [];
    for (const c of [wrongRule, wrongOuts1, wrongOuts2]) {
        if (c > 0 && c <= 100 && !used.has(c)) { used.add(c); wrongs.push(c); }
    }
    // Pad with offsets if deduplication left fewer than 3
    for (let step = 2; wrongs.length < 3 && step <= 30; step += 2) {
        const f = correctEquity + step;
        if (f <= 100 && !used.has(f)) { used.add(f); wrongs.push(f); }
    }

    const choices = [correctEquity, ...wrongs];
    for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    const id = 'r42-' + outs + '-' + street.toLowerCase();
    const srKey = 'RULE_42|' + id;
    const explanation = outs + ' outs on the ' + street.toLowerCase() + '. ' + outs + ' \xd7 ' + mult + ' = ' + correctEquity + '%. ' +
        (street === 'FLOP' ? 'Two cards to come \u2014 use Rule of 4.' : 'One card to come \u2014 use Rule of 2.');

    return { id, srKey, type: 'RULE_42', street, outs, correctEquity, choices, explanation };
}

const POT_POOL = [20, 25, 30, 40, 50, 60, 75, 80, 90, 100, 120, 150, 180, 200, 240, 300];
const SIZING_MULTIPLIERS = {
    small:   [0.25, 0.33],
    medium:  [0.50, 0.67],
    large:   [0.75, 1.00],
    overbet: [1.50, 2.00]
};

function generatePotOddsRatioScenario(sizingCategory, potTier) {
    const sizings = Object.keys(SIZING_MULTIPLIERS);
    if (!sizingCategory || !SIZING_MULTIPLIERS[sizingCategory]) {
        sizingCategory = sizings[Math.floor(Math.random() * sizings.length)];
    }
    const tiers = ['low', 'mid', 'high'];
    if (!potTier || !tiers.includes(potTier)) {
        potTier = tiers[Math.floor(Math.random() * tiers.length)];
    }

    let potPool = POT_POOL.slice();
    if (potTier === 'low')  potPool = POT_POOL.filter(p => p <= 50);
    if (potTier === 'mid')  potPool = POT_POOL.filter(p => p > 50 && p <= 120);
    if (potTier === 'high') potPool = POT_POOL.filter(p => p > 120);
    if (!potPool.length) potPool = POT_POOL;

    const pot = potPool[Math.floor(Math.random() * potPool.length)];
    const mults = SIZING_MULTIPLIERS[sizingCategory];
    const multiplier = mults[Math.floor(Math.random() * mults.length)];
    const bet = Math.max(5, Math.round(pot * multiplier / 5) * 5);

    const correctRatioNum = Math.round((pot + bet) / bet * 10) / 10;
    const correctRatio = correctRatioNum.toFixed(1) + ':1';

    const offsets = [0.5, 1.0, 1.5];
    for (let i = offsets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
    }

    const usedNums = new Set([correctRatioNum]);
    const wrongs = [];
    for (const off of offsets) {
        const tryUp = Math.random() < 0.5;
        const c1 = Math.round((correctRatioNum + (tryUp ? off : -off)) * 10) / 10;
        const c2 = Math.round((correctRatioNum + (tryUp ? -off : off)) * 10) / 10;
        let candidate = null;
        if (c1 >= 1.0 && !usedNums.has(c1)) candidate = c1;
        else if (c2 >= 1.0 && !usedNums.has(c2)) candidate = c2;
        else {
            for (let step = 1; step <= 20; step++) {
                const f = Math.round((correctRatioNum + step * 0.5) * 10) / 10;
                if (f >= 1.0 && !usedNums.has(f)) { candidate = f; break; }
            }
        }
        if (candidate !== null) { usedNums.add(candidate); wrongs.push(candidate.toFixed(1) + ':1'); }
    }

    const choices = [correctRatio, ...wrongs];
    for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    const id = 'por-' + sizingCategory + '-' + potTier;
    const srKey = 'POT_RATIO|' + id;
    const explanation = 'Pot $' + pot + ' + bet $' + bet + ' = $' + (pot + bet) + ' total. You call $' + bet + ' to win $' + (pot + bet) + '. That\u2019s ' + correctRatio + '. ' +
        'Quick check: if bet equals pot you always get 2:1. ' +
        (bet < pot ? 'Bet is smaller than pot \u2014 so you\u2019re getting better than 2:1.' : bet > pot ? 'Bet is larger than pot \u2014 so you\u2019re getting worse than 2:1.' : 'Bet equals pot \u2014 exactly 2:1.');

    return { id, srKey, type: 'POT_RATIO', sizingCategory, potTier, pot, bet, correctRatio, choices, explanation };
}

const RATIO_POOL = [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6];

function generateRatioToPercentScenario(ratio) {
    if (!ratio) ratio = RATIO_POOL[Math.floor(Math.random() * RATIO_POOL.length)];

    const correctPct = Math.round(1 / (ratio + 1) * 100);
    const ratioDisplay = ratio + ':1';

    // Wrong answers: common formula errors
    const wrongAdd2   = Math.round(1 / (ratio + 2) * 100);   // added 2 instead of 1
    const wrongRatioD = Math.round(ratio / (ratio + 1) * 100); // used ratio directly instead of 1

    const used = new Set([correctPct]);
    const wrongs = [];
    for (const c of [wrongAdd2, wrongRatioD]) {
        if (c > 0 && c <= 100 && !used.has(c)) { used.add(c); wrongs.push(c); }
    }
    // Pad with offsets if needed
    const padOffsets = [4, 8, 13, 17];
    for (const off of padOffsets) {
        if (wrongs.length >= 3) break;
        for (const sign of [1, -1]) {
            const c = correctPct + sign * off;
            if (c > 0 && c <= 100 && !used.has(c)) { used.add(c); wrongs.push(c); break; }
        }
    }

    const choices = [correctPct, ...wrongs];
    for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    const id = 'r2p-' + String(ratio).replace('.', '_') + '-to-1';
    const srKey = 'RATIO_PCT|' + id;
    const explanation = ratioDisplay + ' means 1 part yours, ' + ratio + ' parts theirs. You need to win 1 in ' + (ratio + 1) + ' times = ' + correctPct + '%. Shortcut: 1 \xf7 (ratio + 1).';

    return { id, srKey, type: 'RATIO_PCT', ratio, ratioDisplay, correctPct, choices, explanation };
}

// ── OUT COUNTING CONSTANTS ──

const OC_CATEGORIES = [
    'flush-draw', 'backdoor-flush-draw', 'oesd', 'double-gutshot',
    'gutshot', 'straight-flush-draw', 'royal-flush-draw',
    'combo-flush-oesd', 'combo-flush-gutshot', 'backdoor-straight',
    'pair-plus-flush-draw',
    'pair-plus-gutshot', 'pair-plus-oesd', 'two-overcards-plus-gutshot',
    'underpair', 'no-draw'
];

const OC_STREETS = ['FLOP', 'TURN'];

// Categories only valid on flop (no turn variant)
const OC_FLOP_ONLY = [
    'backdoor-flush-draw', 'backdoor-straight',
    'royal-flush-draw', 'straight-flush-draw'
];

const OUTS_BY_CATEGORY = {
    'flush-draw':                  9,
    'backdoor-flush-draw':         2,
    'oesd':                        8,
    'double-gutshot':              8,
    'gutshot':                     4,
    'straight-flush-draw':        15,
    'royal-flush-draw':           15,
    'combo-flush-oesd':           15,
    'combo-flush-gutshot':        12,
    'backdoor-straight':           2,
    'pair-plus-flush-draw':       14,
    'pair-plus-gutshot':          10,
    'pair-plus-oesd':             10,
    'two-overcards-plus-gutshot': 10,
    'underpair':                   2,
    'no-draw':                     1
};

// Wrong answer offsets per category — plausible but never correct
const OC_WRONG_OFFSETS = {
    'flush-draw':                  [2, 4, 6],
    'backdoor-flush-draw':         [1, 3, 5],
    'oesd':                        [2, 4, 6],
    'double-gutshot':              [2, 4, 6],
    'gutshot':                     [2, 4, 6],
    'straight-flush-draw':         [2, 4, 7],
    'royal-flush-draw':            [2, 4, 7],
    'combo-flush-oesd':            [2, 4, 7],
    'combo-flush-gutshot':         [2, 4, 6],
    'backdoor-straight':           [1, 3, 5],
    'pair-plus-flush-draw':        [2, 4, 6],
    'pair-plus-gutshot':           [2, 4, 6],
    'pair-plus-oesd':              [2, 4, 6],
    'two-overcards-plus-gutshot':  [2, 4, 6],
    'underpair':                   [1, 3, 5],
    'no-draw':                     [1, 2, 3]
};

// ── OUT COUNTING HELPERS ──

// Extract rank character from card string: 'Ah' -> 'A'
function cardRank(c) { return c.slice(0, -1); }

// Extract suit character from card string: 'Ah' -> 'h'
function cardSuit(c) { return c[c.length - 1]; }

// Convert rank char to number — delegates to RANK_NUM from ranges.js
function rankNum(r) { return RANK_NUM[r] || 0; }

// Get all rank numbers from a card array, sorted descending
function rankNums(cards) {
    return cards.map(c => rankNum(cardRank(c))).sort((a, b) => b - a);
}

// Count cards of a given suit in a card array
function suitCount(cards, suit) {
    return cards.filter(c => cardSuit(c) === suit).length;
}

// Get the suit with the most cards across a card array
function dominantSuit(cards) {
    const counts = {};
    cards.forEach(c => { const s = cardSuit(c); counts[s] = (counts[s] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// Check if ranks contain an open-ended straight draw
function hasOESD(allRanks) {
    const ranks = [...new Set(allRanks)].sort((a, b) => a - b);
    const withLow = ranks.includes(14) ? [1, ...ranks] : ranks;
    const unique = [...new Set(withLow)].sort((a, b) => a - b);
    for (let i = 0; i <= unique.length - 4; i++) {
        const window = unique.slice(i, i + 4);
        if (window[3] - window[0] === 3 && window.length === 4) {
            const low = window[0], high = window[3];
            if (low > 1 && high < 14) return true;
        }
    }
    return false;
}

// Check if ranks contain exactly a gutshot (not OESD)
function hasGutshot(allRanks) {
    const ranks = [...new Set(allRanks)].sort((a, b) => a - b);
    const withLow = ranks.includes(14) ? [1, ...ranks] : ranks;
    const unique = [...new Set(withLow)].sort((a, b) => a - b);
    for (let i = 0; i <= unique.length - 4; i++) {
        const window = unique.slice(i, i + 4);
        if (window[3] - window[0] === 4 && window.length === 4) return true;
    }
    return false;
}

// Check if ranks contain a double gutshot (two different cards each independently complete a different straight)
function hasDoubleGutshot(allRanks) {
    const ranks = [...new Set(allRanks)].sort((a, b) => a - b);
    const withLow = ranks.includes(14) ? [1, ...ranks] : ranks;
    const unique = [...new Set(withLow)].sort((a, b) => a - b);
    const completingCards = new Set();
    for (let low = 1; low <= 10; low++) {
        const straight = [low, low + 1, low + 2, low + 3, low + 4];
        const missing = straight.filter(r => !unique.includes(r));
        if (missing.length === 1 && straight.filter(r => unique.includes(r)).length === 4) {
            completingCards.add(missing[0]);
        }
    }
    if (completingCards.size === 2) {
        const cards = [...completingCards].sort((a, b) => a - b);
        if (cards[1] - cards[0] > 1) return true;
    }
    return false;
}

// ── OUT COUNTING CONSTRAINTS ──

function constraintFlushDraw(hand, board) {
    for (const suit of ['s', 'h', 'd', 'c']) {
        if (suitCount(hand, suit) === 2 && suitCount(board, suit) === 2) return true;
    }
    return false;
}

function constraintBackdoorFlushDraw(hand, board) {
    if (board.length !== 3) return false;
    for (const suit of ['s', 'h', 'd', 'c']) {
        if (suitCount(hand, suit) === 2 && suitCount(board, suit) === 1) return true;
    }
    return false;
}

function constraintOESD(hand, board) {
    const allRanks = [...hand, ...board].map(c => rankNum(cardRank(c)));
    return hasOESD(allRanks) && !constraintFlushDraw(hand, board);
}

function constraintDoubleGutshot(hand, board) {
    const allRanks = [...hand, ...board].map(c => rankNum(cardRank(c)));
    return hasDoubleGutshot(allRanks) && !hasOESD(allRanks) && !constraintFlushDraw(hand, board);
}

function constraintGutshot(hand, board) {
    const allRanks = [...hand, ...board].map(c => rankNum(cardRank(c)));
    return hasGutshot(allRanks) && !hasOESD(allRanks) && !hasDoubleGutshot(allRanks) && !constraintFlushDraw(hand, board);
}

function constraintStraightFlushDraw(hand, board) {
    if (board.length !== 3) return false;
    for (const suit of ['s', 'h', 'd', 'c']) {
        const heroSuited = hand.filter(c => cardSuit(c) === suit);
        const boardSuited = board.filter(c => cardSuit(c) === suit);
        if (heroSuited.length === 2 && boardSuited.length === 2) {
            const allRanks = [...heroSuited, ...boardSuited].map(c => rankNum(cardRank(c)));
            if (hasOESD(allRanks)) return true;
        }
    }
    return false;
}

function constraintRoyalFlushDraw(hand, board) {
    if (board.length !== 3) return false;
    const broadway = new Set([10, 11, 12, 13, 14]);
    for (const suit of ['s', 'h', 'd', 'c']) {
        const heroSuited = hand.filter(c => cardSuit(c) === suit && broadway.has(rankNum(cardRank(c))));
        const boardSuited = board.filter(c => cardSuit(c) === suit && broadway.has(rankNum(cardRank(c))));
        if (heroSuited.length === 2 && boardSuited.length === 2) return true;
    }
    return false;
}

function constraintComboFlushOESD(hand, board) {
    if (!constraintFlushDraw(hand, board)) return false;
    const allRanks = [...hand, ...board].map(c => rankNum(cardRank(c)));
    return hasOESD(allRanks);
}

function constraintComboFlushGutshot(hand, board) {
    if (!constraintFlushDraw(hand, board)) return false;
    const allRanks = [...hand, ...board].map(c => rankNum(cardRank(c)));
    return hasGutshot(allRanks) && !hasOESD(allRanks);
}

function constraintBackdoorStraight(hand, board) {
    if (board.length !== 3) return false;
    const allRanks = [...hand, ...board].map(c => rankNum(cardRank(c)));
    const unique = [...new Set(allRanks)].sort((a, b) => a - b);
    for (let i = 0; i <= unique.length - 3; i++) {
        if (unique[i + 2] - unique[i] <= 4) return true;
    }
    return false;
}


function constraintPairPlusFlushDraw(hand, board) {
    const boardRankSet = new Set(board.map(c => cardRank(c)));
    const hasPair = hand.some(c => boardRankSet.has(cardRank(c)));
    return hasPair && constraintFlushDraw(hand, board);
}

function constraintPairPlusGutshot(hand, board) {
    const boardRankSet = new Set(board.map(c => cardRank(c)));
    const hasPair = hand.some(c => boardRankSet.has(cardRank(c)));
    const allRanks = [...hand, ...board].map(c => rankNum(cardRank(c)));
    return hasPair && hasGutshot(allRanks) && !hasOESD(allRanks) && !constraintFlushDraw(hand, board);
}

function constraintPairPlusOESD(hand, board) {
    const boardRankSet = new Set(board.map(c => cardRank(c)));
    const hasPair = hand.some(c => boardRankSet.has(cardRank(c)));
    const allRanks = [...hand, ...board].map(c => rankNum(cardRank(c)));
    return hasPair && hasOESD(allRanks) && !constraintFlushDraw(hand, board);
}

function constraintTwoOvercardsGutshot(hand, board) {
    const boardRanks = board.map(c => rankNum(cardRank(c)));
    const maxBoard = Math.max(...boardRanks);
    const heroRanks = hand.map(c => rankNum(cardRank(c)));
    const bothOvercards = heroRanks.every(r => r > maxBoard);
    const allRanks = [...heroRanks, ...boardRanks];
    return bothOvercards && hasGutshot(allRanks) && !hasOESD(allRanks) && !constraintFlushDraw(hand, board);
}

function constraintUnderpair(hand, board) {
    if (cardRank(hand[0]) !== cardRank(hand[1])) return false;
    const pairRank = rankNum(cardRank(hand[0]));
    const boardRanks = board.map(c => rankNum(cardRank(c)));
    return boardRanks.every(r => r > pairRank);
}

function constraintNoDraw(hand, board) {
    const allRanks = [...hand, ...board].map(c => rankNum(cardRank(c)));
    const boardRankSet = new Set(board.map(c => cardRank(c)));
    const hasPair = hand.some(c => boardRankSet.has(cardRank(c)));
    const isPocketPair = cardRank(hand[0]) === cardRank(hand[1]);
    return !hasPair && !isPocketPair &&
        !hasOESD(allRanks) && !hasGutshot(allRanks) &&
        !constraintFlushDraw(hand, board) && !constraintBackdoorFlushDraw(hand, board);
}

// Dispatch map — must be defined after all constraint functions
const OC_CONSTRAINT_FNS = {
    'flush-draw':                  constraintFlushDraw,
    'backdoor-flush-draw':         constraintBackdoorFlushDraw,
    'oesd':                        constraintOESD,
    'double-gutshot':              constraintDoubleGutshot,
    'gutshot':                     constraintGutshot,
    'straight-flush-draw':         constraintStraightFlushDraw,
    'royal-flush-draw':            constraintRoyalFlushDraw,
    'combo-flush-oesd':            constraintComboFlushOESD,
    'combo-flush-gutshot':         constraintComboFlushGutshot,
    'backdoor-straight':           constraintBackdoorStraight,
    'pair-plus-flush-draw':        constraintPairPlusFlushDraw,
    'pair-plus-gutshot':           constraintPairPlusGutshot,
    'pair-plus-oesd':              constraintPairPlusOESD,
    'two-overcards-plus-gutshot':  constraintTwoOvercardsGutshot,
    'underpair':                   constraintUnderpair,
    'no-draw':                     constraintNoDraw
};

// ── OUT COUNTING EXPLANATIONS ──

const OC_EXPLANATIONS = {
    'flush-draw':                  function(h, b) { return 'You have two suited cards and there are two more of your suit on board. Any of the remaining ' + OUTS_BY_CATEGORY['flush-draw'] + ' cards of that suit complete your flush. 9 outs.'; },
    'backdoor-flush-draw':         function(h, b) { return 'Backdoor flush draws have no direct outs \u2014 you need two running cards (turn AND river both your suit). This is roughly 4% equity total, sometimes expressed as \u201c2 outs equivalent\u201d as a mental shorthand. It is not a real out count.'; },
    'oesd':                        function(h, b) { return 'You have an open-ended straight draw \u2014 both the low and high end complete your straight. 8 outs.'; },
    'double-gutshot':              function(h, b) { return 'You have a double gutshot \u2014 two different single cards each independently complete a different straight. 8 outs total.'; },
    'gutshot':                     function(h, b) { return 'You have a gutshot straight draw \u2014 only one specific rank completes your straight. 4 outs.'; },
    'straight-flush-draw':         function(h, b) { return 'You have a straight flush draw \u2014 suited connectors with two board cards of the same suit in sequence. Up to 15 outs (9 flush + 6 straight, some overlap).'; },
    'royal-flush-draw':            function(h, b) { return 'You have a royal flush draw \u2014 two broadway suited cards with two more broadway cards of the same suit on board. 15 outs to the nuts.'; },
    'combo-flush-oesd':            function(h, b) { return 'You have a combination flush draw and open-ended straight draw. Up to 15 outs (9 flush + 8 straight minus overlap).'; },
    'combo-flush-gutshot':         function(h, b) { return 'You have a combination flush draw and gutshot straight draw. 12 outs total (9 flush + 4 straight minus overlap).'; },
    'backdoor-straight':           function(h, b) { return 'Backdoor straight draws need two running cards to complete. Roughly 2\u20133% equity total. Expressed as \u201c2 outs equivalent\u201d as a shorthand only \u2014 not a real out count.'; },
    'pair-plus-flush-draw':        function(h, b) { return 'You have a pair on the board plus a flush draw. You\u2019re not drawing dead \u2014 5 outs to improve your pair to trips plus 9 flush outs. 14 outs total.'; },
    'pair-plus-gutshot':           function(h, b) { return 'You have a pair on the board plus a gutshot straight draw. 6 outs to trips plus 4 straight outs. 10 outs total.'; },
    'pair-plus-oesd':              function(h, b) { return 'You have a pair on the board plus an open-ended straight draw. 6 outs to trips plus 8 straight outs (with some overlap). ~10 outs.'; },
    'two-overcards-plus-gutshot':  function(h, b) { return 'You have two overcards plus a gutshot. 6 overcard outs plus 4 straight outs. 10 outs total.'; },
    'underpair':                   function(h, b) { return 'You have a pocket pair lower than all board cards. Your only outs are the 2 remaining cards of your rank to make a set. 2 outs.'; },
    'no-draw':                     function(h, b) { return 'You have complete air \u2014 no pair, no draw, no overcard. You have at most 1\u20132 runner-runner outs. Generally a fold to any significant bet.'; }
};

// ── GENERATORS (continued) ──

function generateOutCountingScenario(category, street) {
    if (!category) category = OC_CATEGORIES[Math.floor(Math.random() * OC_CATEGORIES.length)];

    if (OC_FLOP_ONLY.includes(category)) {
        street = 'FLOP';
    } else if (!street) {
        street = OC_STREETS[Math.floor(Math.random() * OC_STREETS.length)];
    }

    const boardSize = street === 'FLOP' ? 3 : 4;
    const constraintFn = OC_CONSTRAINT_FNS[category];

    const result = dealWithConstraints(2, boardSize, constraintFn, 50);

    const hand  = result ? result.hand  : ['Ah', 'Jh'];
    const board = result ? result.board : (street === 'FLOP' ? ['Kh', '9h', '3c'] : ['Kh', '9h', '3c', '2d']);
    const usedCategory = result ? category : 'flush-draw';

    if (!result) {
        console.warn('generateOutCountingScenario: dealWithConstraints failed for ' + category + '/' + street + ', using fallback');
    }

    const correctOuts = OUTS_BY_CATEGORY[usedCategory];

    const offsets = (OC_WRONG_OFFSETS[usedCategory] || [2, 4, 6]).slice();
    for (let i = offsets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
    }

    const used = new Set([correctOuts]);
    const wrongs = [];
    for (const off of offsets) {
        const sign = Math.random() < 0.5 ? 1 : -1;
        let val = correctOuts + sign * off;
        if (val <= 0) val = correctOuts + off;
        if (val > 20) val = correctOuts - off;
        if (!used.has(val) && val > 0 && val <= 20) { used.add(val); wrongs.push(val); }
    }
    while (wrongs.length < 3) {
        const v = correctOuts + wrongs.length + 1;
        if (!used.has(v) && v <= 20) { used.add(v); wrongs.push(v); }
    }

    const choices = [correctOuts, ...wrongs.slice(0, 3)];
    for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    const id = 'oc-' + usedCategory + '-' + street.toLowerCase();
    const srKey = 'OUT_COUNT|' + id;
    const explanationFn = OC_EXPLANATIONS[usedCategory];

    return {
        id, srKey,
        type: 'OUT_COUNTING',
        category: usedCategory,
        street,
        hand, board,
        correctOuts,
        choices,
        outsSummary: correctOuts + ' outs \u2014 ' + usedCategory.replace(/-/g, ' '),
        explanation: explanationFn ? explanationFn(hand, board) : correctOuts + ' outs.'
    };
}

const ED_BET_SIZES = {
    small:   [0.25, 0.33],
    medium:  [0.50, 0.67],
    large:   [0.75, 1.00],
    overbet: [1.50, 2.00]
};

function generateEquityDecisionScenario(category, street, betSizeCategory) {
    if (!category) category = OC_CATEGORIES[Math.floor(Math.random() * OC_CATEGORIES.length)];

    if (OC_FLOP_ONLY.includes(category)) {
        street = 'FLOP';
    } else if (!street) {
        street = OC_STREETS[Math.floor(Math.random() * OC_STREETS.length)];
    }

    if (!betSizeCategory) {
        const sizes = Object.keys(ED_BET_SIZES);
        betSizeCategory = sizes[Math.floor(Math.random() * sizes.length)];
    }

    const boardSize = street === 'FLOP' ? 3 : 4;
    const constraintFn = OC_CONSTRAINT_FNS[category];

    const result = dealWithConstraints(2, boardSize, constraintFn, 50);

    const hand  = result ? result.hand  : ['Ah', 'Jh'];
    const board = result ? result.board : (street === 'FLOP' ? ['Kh', '9h', '3c'] : ['Kh', '9h', '3c', '2d']);
    const usedCategory = result ? category : 'flush-draw';

    if (!result) {
        console.warn('generateEquityDecisionScenario: dealWithConstraints failed for ' + category + '/' + street);
    }

    const pot = POT_POOL[Math.floor(Math.random() * POT_POOL.length)];
    const multipliers = ED_BET_SIZES[betSizeCategory] || ED_BET_SIZES.medium;
    const multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
    const bet = Math.max(5, Math.round(pot * multiplier / 5) * 5);

    const potOddsRatioNum = (pot + bet) / bet;
    const potOddsRatio = potOddsRatioNum.toFixed(1) + ':1';
    const equityNeededPct = Math.round(bet / (pot + 2 * bet) * 100);

    const outs = OUTS_BY_CATEGORY[usedCategory];
    const heroEquityPct = street === 'FLOP' ? outs * 4 : outs * 2;
    const correctAction = heroEquityPct >= equityNeededPct ? 'CALL' : 'FOLD';

    const betBucket = (betSizeCategory === 'small' || betSizeCategory === 'medium') ? 'small-bet' : 'large-bet';

    let bucketId;
    if (usedCategory === 'no-draw') {
        bucketId = 'no-draw-any-bet';
    } else if (usedCategory === 'backdoor-flush-draw') {
        bucketId = 'backdoor-flush-' + betBucket + '-flop';
    } else if (usedCategory === 'backdoor-straight') {
        bucketId = 'backdoor-straight-' + betBucket + '-flop';
    } else {
        bucketId = usedCategory + '-' + betBucket + '-' + street.toLowerCase();
    }

    const id = 'ed-' + bucketId;
    const srKey = 'EQUITY_DEC|' + bucketId;

    const explanation = 'You have ' + outs + ' outs = ~' + heroEquityPct + '% equity on the ' + street.toLowerCase() + '. ' +
        'You\u2019re getting ' + potOddsRatio + ' (need ' + equityNeededPct + '% to call). ' +
        (heroEquityPct >= equityNeededPct ? 'You have enough equity \u2014 CALL.' : 'You don\u2019t have enough equity \u2014 FOLD.');

    return {
        id, srKey,
        type: 'EQUITY_DEC',
        category: usedCategory,
        street,
        betSizeCategory,
        hand, board,
        pot, bet,
        potOddsRatio,
        equityNeededPct,
        heroEquityPct,
        correctAction,
        outsSummary: outs + ' outs \u2014 ' + usedCategory.replace(/-/g, ' '),
        explanation
    };
}

/* CONSTRAINT TESTS — remove before production
   constraintFlushDraw(['Ah','Jh'], ['Kh','9h','3c'])          // should be true
   constraintOESD(['8s','7d'], ['9h','6c','2d'])                // should be true
   constraintDoubleGutshot(['Tc','Qs'], ['Ah','Jd','8h'])       // should be true (needs 9 or K)
   constraintGutshot(['Js','9d'], ['Kh','Tc','3c'])             // should be true
   constraintUnderpair(['5s','5d'], ['Ah','Kc','9d'])           // should be true
   constraintNoDraw(['2s','7d'], ['Ah','Kc','9d'])              // should be true
*/

// ── BET SIZING CONSTRAINTS ──

function bsConstraintDryRainbow(hand, board) {
    const boardSuits = board.map(cardSuit);
    if (new Set(boardSuits).size < 3) return false;
    for (const suit of ['s', 'h', 'd', 'c']) {
        if (suitCount(hand, suit) === 2 && suitCount(board, suit) >= 1) return false;
    }
    const boardRanks = board.map(c => cardRank(c));
    if (new Set(boardRanks).size < boardRanks.length) return false;
    const allRanks = [...hand, ...board].map(c => rankNum(cardRank(c)));
    if (hasOESD(allRanks) || hasGutshot(allRanks)) return false;
    return true;
}

function bsConstraintSemiWet(hand, board) {
    const boardSuits = board.map(cardSuit);
    const suitCounts = {};
    boardSuits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1; });
    const maxSuit = Math.max(...Object.values(suitCounts));
    if (maxSuit !== 2) return false;
    const boardRanks = board.map(c => cardRank(c));
    if (new Set(boardRanks).size < boardRanks.length) return false;
    const allRanks = [...hand, ...board].map(c => rankNum(cardRank(c)));
    return hasOESD(allRanks) || hasGutshot(allRanks) || constraintFlushDraw(hand, board);
}

function bsConstraintWetTwoTone(hand, board) {
    const boardSuits = board.map(cardSuit);
    const suitCounts = {};
    boardSuits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1; });
    const maxSuit = Math.max(...Object.values(suitCounts));
    if (maxSuit < 2 || maxSuit === 3) return false;
    if (!constraintFlushDraw(hand, board)) return false;
    const allRanks = [...hand, ...board].map(c => rankNum(cardRank(c)));
    if (!hasOESD(allRanks) && !hasGutshot(allRanks)) return false;
    const boardRanks = board.map(c => cardRank(c));
    if (new Set(boardRanks).size < boardRanks.length) return false;
    return true;
}

function bsConstraintMonotone(hand, board) {
    const boardSuits = board.map(cardSuit);
    return boardSuits.every(s => s === boardSuits[0]);
}

function bsConstraintPaired(hand, board) {
    const boardRanks = board.map(c => cardRank(c));
    return new Set(boardRanks).size < boardRanks.length;
}

const BS_CONSTRAINT_FNS = {
    'dry-rainbow':  bsConstraintDryRainbow,
    'semi-wet':     bsConstraintSemiWet,
    'wet-two-tone': bsConstraintWetTwoTone,
    'monotone':     bsConstraintMonotone,
    'paired':       bsConstraintPaired
};

const BS_CATEGORIES = ['dry-rainbow', 'semi-wet', 'wet-two-tone', 'monotone', 'paired'];
const BS_POSITIONS  = ['IP', 'OOP'];
const BS_STREETS    = ['FLOP']; // board is always 3 cards; turn/river require 4-5 card boards

const BET_SIZE_ANSWERS = {
    'dry-rainbow-IP-FLOP':    { correctSizes: ['25', '33'], bestSize: '33',  wrongSizes: ['75', 'POT', 'OVERBET'] },
    'dry-rainbow-OOP-FLOP':   { correctSizes: ['25', '33'], bestSize: '33',  wrongSizes: ['75', 'POT', 'OVERBET'] },
    'dry-rainbow-IP-TURN':    { correctSizes: ['33', '50'], bestSize: '50',  wrongSizes: ['POT', 'OVERBET'] },
    'dry-rainbow-OOP-TURN':   { correctSizes: ['33', '50'], bestSize: '50',  wrongSizes: ['POT', 'OVERBET'] },
    'dry-rainbow-IP-RIVER':   { correctSizes: ['50', '75'], bestSize: '75',  wrongSizes: ['25', 'OVERBET'] },
    'dry-rainbow-OOP-RIVER':  { correctSizes: ['33', '50'], bestSize: '50',  wrongSizes: ['POT', 'OVERBET'] },
    'semi-wet-IP-FLOP':       { correctSizes: ['33', '50'], bestSize: '50',  wrongSizes: ['25', 'OVERBET'] },
    'semi-wet-OOP-FLOP':      { correctSizes: ['33', '50'], bestSize: '33',  wrongSizes: ['POT', 'OVERBET'] },
    'semi-wet-IP-TURN':       { correctSizes: ['50', '75'], bestSize: '75',  wrongSizes: ['25', 'OVERBET'] },
    'semi-wet-OOP-TURN':      { correctSizes: ['50', '75'], bestSize: '50',  wrongSizes: ['25', 'OVERBET'] },
    'semi-wet-IP-RIVER':      { correctSizes: ['50', '75'], bestSize: '75',  wrongSizes: ['25', 'POT'] },
    'semi-wet-OOP-RIVER':     { correctSizes: ['33', '50'], bestSize: '50',  wrongSizes: ['POT', 'OVERBET'] },
    'wet-two-tone-IP-FLOP':   { correctSizes: ['50', '75'], bestSize: '75',  wrongSizes: ['25', 'OVERBET'] },
    'wet-two-tone-OOP-FLOP':  { correctSizes: ['33', '50'], bestSize: '50',  wrongSizes: ['25', 'OVERBET'] },
    'wet-two-tone-IP-TURN':   { correctSizes: ['75', 'POT'], bestSize: 'POT', wrongSizes: ['25', '33'] },
    'wet-two-tone-OOP-TURN':  { correctSizes: ['50', '75'], bestSize: '75',  wrongSizes: ['25', 'OVERBET'] },
    'wet-two-tone-IP-RIVER':  { correctSizes: ['75', 'POT'], bestSize: 'POT', wrongSizes: ['25', '33'] },
    'wet-two-tone-OOP-RIVER': { correctSizes: ['50', '75'], bestSize: '75',  wrongSizes: ['25', 'OVERBET'] },
    'monotone-IP-FLOP':       { correctSizes: ['33', '50'], bestSize: '33',  wrongSizes: ['POT', 'OVERBET'] },
    'monotone-OOP-FLOP':      { correctSizes: ['25', '33'], bestSize: '33',  wrongSizes: ['POT', 'OVERBET'] },
    'monotone-IP-TURN':       { correctSizes: ['33', '50'], bestSize: '50',  wrongSizes: ['POT', 'OVERBET'] },
    'monotone-OOP-TURN':      { correctSizes: ['33', '50'], bestSize: '33',  wrongSizes: ['POT', 'OVERBET'] },
    'monotone-IP-RIVER':      { correctSizes: ['50', '75'], bestSize: '75',  wrongSizes: ['25', 'OVERBET'] },
    'monotone-OOP-RIVER':     { correctSizes: ['33', '50'], bestSize: '50',  wrongSizes: ['25', 'OVERBET'] },
    'paired-IP-FLOP':         { correctSizes: ['50', '75'], bestSize: '75',  wrongSizes: ['25', 'OVERBET'] },
    'paired-OOP-FLOP':        { correctSizes: ['33', '50'], bestSize: '50',  wrongSizes: ['25', 'OVERBET'] },
    'paired-IP-TURN':         { correctSizes: ['50', '75'], bestSize: '75',  wrongSizes: ['25', 'OVERBET'] },
    'paired-OOP-TURN':        { correctSizes: ['50', '75'], bestSize: '50',  wrongSizes: ['25', 'OVERBET'] },
    'paired-IP-RIVER':        { correctSizes: ['75', 'POT'], bestSize: 'POT', wrongSizes: ['25', '33'] },
    'paired-OOP-RIVER':       { correctSizes: ['50', '75'], bestSize: '75',  wrongSizes: ['25', 'OVERBET'] }
};

// Priority order for board texture classification — more specific textures checked first
const TEXTURE_PRIORITY = ['monotone', 'paired', 'wet-two-tone', 'semi-wet', 'dry-rainbow'];

function classifyBoardTexture(hand, board) {
    for (const tex of TEXTURE_PRIORITY) {
        if (BS_CONSTRAINT_FNS[tex] && BS_CONSTRAINT_FNS[tex](hand, board)) return tex;
    }
    return 'dry-rainbow';
}

function generateBetSizingScenario(textureCategory, position, street) {
    if (!textureCategory || !BS_CATEGORIES.includes(textureCategory)) {
        textureCategory = BS_CATEGORIES[Math.floor(Math.random() * BS_CATEGORIES.length)];
    }
    if (!position || !BS_POSITIONS.includes(position)) {
        position = BS_POSITIONS[Math.floor(Math.random() * BS_POSITIONS.length)];
    }
    // Board is always 3 cards; street is always FLOP
    street = 'FLOP';

    // Deal a board and verify it classifies as the requested texture (not just satisfies constraint)
    let hand = null, board = null;
    const constraintFn = BS_CONSTRAINT_FNS[textureCategory];
    for (let attempt = 0; attempt < 10; attempt++) {
        const result = dealWithConstraints(2, 3, constraintFn, 50);
        if (result) {
            const classified = classifyBoardTexture(result.hand, result.board);
            if (classified === textureCategory) {
                hand  = result.hand;
                board = result.board;
                break;
            }
        }
    }
    if (!hand) {
        console.warn('generateBetSizingScenario: fallback for ' + textureCategory);
        hand  = ['Ah', 'Kd'];
        board = ['Jc', '7d', '2s'];
    }

    const pot = POT_POOL[Math.floor(Math.random() * POT_POOL.length)];
    const stackBehind = Math.round(pot * (2 + Math.random() * 4) / 5) * 5;
    const sprValue = (stackBehind / pot).toFixed(1);

    const answerKey = textureCategory + '-' + position + '-' + street;
    const answers = BET_SIZE_ANSWERS[answerKey] || { correctSizes: ['33', '50'], bestSize: '50', wrongSizes: ['25', 'OVERBET'] };

    const bucketId = textureCategory.toLowerCase() + '-' + position.toLowerCase() + '-' + street.toLowerCase();
    const id    = 'bs-' + bucketId;
    const srKey = 'BET_SIZE|' + bucketId;

    const textureDescriptions = {
        'dry-rainbow':  'dry, rainbow (no flush draws)',
        'semi-wet':     'semi-wet (some draw potential)',
        'wet-two-tone': 'wet, two-tone (flush + straight draws)',
        'monotone':     'monotone (three of a suit)',
        'paired':       'paired board'
    };
    const textureDesc = textureDescriptions[textureCategory] || textureCategory;
    const streetLow = street.toLowerCase();
    const posDesc = position === 'IP' ? 'in position' : 'out of position';

    const explanation = 'On a ' + textureDesc + ' ' + streetLow + ' ' + posDesc + ', the optimal sizing is ' +
        (answers.bestSize === 'POT' ? 'pot' : answers.bestSize === 'OVERBET' ? 'overbet' : answers.bestSize + '%') +
        '. Correct range: ' + answers.correctSizes.map(sz => sz === 'POT' ? 'pot' : sz === 'OVERBET' ? 'overbet' : sz + '%').join(' or ') + '.';

    return {
        id, srKey,
        type: 'BET_SIZE',
        textureCategory,
        position,
        street,
        hand, board,
        potSize: pot,
        stackBehind,
        sprValue,
        correctSizes: answers.correctSizes,
        bestSize:     answers.bestSize,
        wrongSizes:   answers.wrongSizes,
        explanation
    };
}
