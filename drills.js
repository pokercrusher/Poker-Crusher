// drills.js — Math & Decision Drill Engine
// Depends on: scenarios.js (data), engine.js (SR, state), cloud.js (profileKey)
// Loaded last, after ui.js

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────

const mathDrill = {
    type: null,         // 'POT_ODDS' | 'BET_SIZE' | 'RULE_42' | 'POT_RATIO' | 'RATIO_PCT' | 'MIXED'
    queue: [],          // Array of { s, srKey, drillType }
    idx: 0,
    answered: false,
    lastCorrect: false,
    lastGrade: null,    // 'best' | 'good' | 'wrong'
    sessionCorrect: 0,
    sessionTotal: 0,
    sessionLog: []      // Array of { id, drillType, category, correct }
};

// ─────────────────────────────────────────────────────────────────────────────
// CARD RENDERING
// ─────────────────────────────────────────────────────────────────────────────

function renderDrillCardHtml(card) {
    if (!card) return '';
    const rank = card.slice(0, -1);
    const suit = card[card.length - 1];
    const sym  = { h: '♥', d: '♦', c: '♣', s: '♠' }[suit] || '?';
    const red  = suit === 'h' || suit === 'd';
    const col  = red ? 'text-rose-500' : 'text-slate-800';
    return `<div class="flex flex-col items-center justify-between w-14 h-[80px] sm:w-16 sm:h-[90px] md:w-[96px] md:h-[132px] bg-white rounded-xl shadow-lg px-1.5 py-1.5 select-none">
        <span class="text-[15px] sm:text-[17px] md:text-[25px] font-black leading-none ${col} self-start">${rank}</span>
        <span class="text-[22px] sm:text-[26px] md:text-[40px] leading-none ${col}">${sym}</span>
        <span class="text-[15px] sm:text-[17px] md:text-[25px] font-black leading-none ${col} self-end rotate-180">${rank}</span>
    </div>`;
}

function renderDrillCardsHtml(cards) {
    return `<div class="flex gap-2">${(cards || []).map(renderDrillCardHtml).join('')}</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

function showMathDrillMenu() {
    document.getElementById('math-drill-screen').classList.remove('hidden');
    renderMathDrillView('menu');
}

function exitMathDrill() {
    // During an active drill (question / feedback / summary), EXIT goes back to the
    // Math Drills menu rather than closing the whole screen.
    if (mathDrill.queue.length > 0) {
        mathDrill.queue = [];
        mathDrill.idx   = 0;
        renderMathDrillView('menu');
        return;
    }
    document.getElementById('math-drill-screen').classList.add('hidden');
}

// ─────────────────────────────────────────────────────────────────────────────
// QUEUE BUILDER — SR-aware ordering
// ─────────────────────────────────────────────────────────────────────────────

function buildMathQueue(type) {
    let items = [];
    if (type === 'POT_MATH' || type === 'MIXED') {
        (POT_MATH_SCENARIOS || []).forEach(s =>
            items.push({ s, srKey: 'POT_MATH|' + s.id, drillType: 'POT_MATH' }));
    }
    if (type === 'POT_ODDS' || type === 'MIXED') {
        (POT_ODDS_SCENARIOS || []).forEach(s =>
            items.push({ s, srKey: 'POT_ODDS|' + s.id, drillType: 'POT_ODDS' }));
    }
    if (type === 'BET_SIZE' || type === 'MIXED') {
        BS_CATEGORIES.forEach(textureCategory => {
            BS_POSITIONS.forEach(position => {
                BS_STREETS.forEach(street => {
                    const s = generateBetSizingScenario(textureCategory, position, street);
                    items.push({ s, srKey: s.srKey, drillType: 'BET_SIZE' });
                });
            });
        });
    }
    if (type === 'RULE_42' || type === 'MIXED') {
        const outsBuckets = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15];
        const streets = ['FLOP', 'TURN'];
        outsBuckets.forEach(outs => streets.forEach(street => {
            const s = generateRuleOf42Scenario(outs, street);
            items.push({ s, srKey: s.srKey, drillType: 'RULE_42' });
        }));
    }
    if (type === 'POT_RATIO' || type === 'MIXED') {
        const sizings = ['small', 'medium', 'large', 'overbet'];
        const tiers = ['low', 'mid', 'high'];
        sizings.forEach(sz => tiers.forEach(tier => {
            const s = generatePotOddsRatioScenario(sz, tier);
            items.push({ s, srKey: s.srKey, drillType: 'POT_RATIO' });
        }));
    }
    if (type === 'RATIO_PCT' || type === 'MIXED') {
        const ratios = [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6];
        ratios.forEach(ratio => {
            const s = generateRatioToPercentScenario(ratio);
            items.push({ s, srKey: s.srKey, drillType: 'RATIO_PCT' });
        });
    }
    if (type === 'OUT_COUNTING' || type === 'MIXED') {
        OC_CATEGORIES.forEach(category => {
            const streets = OC_FLOP_ONLY.includes(category) ? ['FLOP'] : ['FLOP', 'TURN'];
            streets.forEach(street => {
                const s = generateOutCountingScenario(category, street);
                items.push({ s, srKey: s.srKey, drillType: 'OUT_COUNTING' });
            });
        });
    }
    if (type === 'EQUITY_DEC' || type === 'MIXED') {
        const edCategories = OC_CATEGORIES.filter(c => c !== 'no-draw');
        const betSizes = ['small', 'large'];
        edCategories.forEach(category => {
            const streets = OC_FLOP_ONLY.includes(category) ? ['FLOP'] : ['FLOP', 'TURN'];
            streets.forEach(street => {
                betSizes.forEach(betSizeCategory => {
                    const s = generateEquityDecisionScenario(category, street, betSizeCategory);
                    items.push({ s, srKey: s.srKey, drillType: 'EQUITY_DEC' });
                });
            });
        });
        const noDraw = generateEquityDecisionScenario('no-draw', 'FLOP', 'large');
        items.push({ s: noDraw, srKey: noDraw.srKey, drillType: 'EQUITY_DEC' });
    }

    const now = Date.now();
    const scored = items.map(item => {
        const rec = SR.get(item.srKey);
        // Priority: 0 = never seen, 1 = due/overdue, 2 = learning, 3 = comfortable
        let priority = 3;
        if (!rec || !rec.totalAttempts) {
            priority = 0;
        } else if (rec.dueAt <= now) {
            priority = 1;
        } else if (rec.intervalDays < 2) {
            priority = 2;
        }
        const recent = rec ? rec.recentResults.slice(-10) : [];
        const recentAcc = recent.length ? recent.filter(x => x).length / recent.length : 0;
        return { ...item, priority, recentAcc, dueAt: rec ? rec.dueAt : 0 };
    });

    // Sort within each priority tier; shuffle to vary within tier
    scored.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.priority === 1) return a.dueAt - b.dueAt; // most overdue first
        return a.recentAcc - b.recentAcc;               // weakest first otherwise
    });

    // Bucket into priority tiers
    const tiers = [[], [], [], []];
    scored.forEach(x => tiers[x.priority].push(x));

    if (type === 'MIXED') {
        // Round-robin interleave by drill type within each tier
        tiers.forEach((tier, idx) => {
            if (!tier.length) return;
            const byType = {};
            tier.forEach(item => {
                if (!byType[item.drillType]) byType[item.drillType] = [];
                byType[item.drillType].push(item);
            });
            // Shuffle within each type bucket
            Object.values(byType).forEach(typeItems => {
                for (let i = typeItems.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [typeItems[i], typeItems[j]] = [typeItems[j], typeItems[i]];
                }
            });
            // Interleave across types
            const interleaved = [];
            const typeQueues = Object.values(byType);
            let i = 0;
            while (typeQueues.some(q => q.length > 0)) {
                const q = typeQueues[i % typeQueues.length];
                if (q.length > 0) interleaved.push(q.shift());
                i++;
            }
            tiers[idx] = interleaved;
        });
    } else {
        // Simple shuffle within each tier
        tiers.forEach(t => {
            for (let i = t.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [t[i], t[j]] = [t[j], t[i]];
            }
        });
    }

    return [...tiers[0], ...tiers[1], ...tiers[2], ...tiers[3]].slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION START
// ─────────────────────────────────────────────────────────────────────────────

function startMathDrill(type) {
    mathDrill.type    = type;
    mathDrill.queue   = buildMathQueue(type);
    mathDrill.idx     = 0;
    mathDrill.answered = false;
    mathDrill.sessionCorrect = 0;
    mathDrill.sessionTotal   = 0;
    mathDrill.sessionLog     = [];
    renderMathDrillView('question');
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────

function renderMathDrillView(view) {
    const content  = document.getElementById('math-drill-content');
    const titleEl  = document.getElementById('math-drill-title');
    const progEl   = document.getElementById('math-drill-progress');
    if (!content) return;

    if (view === 'menu') {
        if (titleEl) titleEl.textContent = 'Math Drills';
        if (progEl)  progEl.textContent  = '';
        content.innerHTML = renderMenuView();
    } else if (view === 'question') {
        const item = mathDrill.queue[mathDrill.idx];
        if (!item) { renderMathDrillView('summary'); return; }
        const typeLabel = item.drillType === 'POT_MATH'     ? 'Pot Odds Math'
                        : item.drillType === 'POT_ODDS'     ? 'Equity Recognition'
                        : item.drillType === 'RULE_42'      ? 'Rule of 4/2'
                        : item.drillType === 'POT_RATIO'    ? 'Pot Odds: Ratio'
                        : item.drillType === 'RATIO_PCT'    ? 'Ratio to %'
                        : item.drillType === 'OUT_COUNTING' ? 'Out Counting'
                        : item.drillType === 'EQUITY_DEC'   ? 'Equity Decision'
                        :                                     'Bet Sizing';
        if (titleEl) titleEl.textContent = typeLabel;
        if (progEl)  progEl.textContent  = `${mathDrill.idx + 1} / ${mathDrill.queue.length}`;
        content.innerHTML = item.drillType === 'POT_MATH'     ? renderPotMathQuestion(item.s)
                          : item.drillType === 'POT_ODDS'     ? renderPotOddsQuestion(item.s)
                          : item.drillType === 'RULE_42'      ? renderRule42Question(item.s)
                          : item.drillType === 'POT_RATIO'    ? renderPotRatioQuestion(item.s)
                          : item.drillType === 'RATIO_PCT'    ? renderRatioPctQuestion(item.s)
                          : item.drillType === 'OUT_COUNTING' ? renderOutCountingQuestion(item.s)
                          : item.drillType === 'EQUITY_DEC'   ? renderEquityDecQuestion(item.s)
                          :                                     renderBetSizeQuestion(item.s);
    } else if (view === 'feedback') {
        const item = mathDrill.queue[mathDrill.idx];
        if (!item) return;
        if (titleEl) titleEl.textContent = mathDrill.lastCorrect ? '✓ Correct' : '✗ Review';
        if (progEl)  progEl.textContent  = `${mathDrill.idx + 1} / ${mathDrill.queue.length}`;
        content.innerHTML = item.drillType === 'POT_MATH'     ? renderPotMathFeedback(item.s)
                          : item.drillType === 'POT_ODDS'     ? renderPotOddsFeedback(item.s)
                          : item.drillType === 'RULE_42'      ? renderRule42Feedback(item.s)
                          : item.drillType === 'POT_RATIO'    ? renderPotRatioFeedback(item.s)
                          : item.drillType === 'RATIO_PCT'    ? renderRatioPctFeedback(item.s)
                          : item.drillType === 'OUT_COUNTING' ? renderOutCountingFeedback(item.s)
                          : item.drillType === 'EQUITY_DEC'   ? renderEquityDecFeedback(item.s)
                          :                                     renderBetSizeFeedback(item.s);
    } else if (view === 'summary') {
        if (titleEl) titleEl.textContent = 'Session Complete';
        if (progEl)  progEl.textContent  = '';
        content.innerHTML = renderSummaryView();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MENU VIEW
// ─────────────────────────────────────────────────────────────────────────────

function renderMenuView() {
    // Compute accuracy for a prefix by summing SR records across all scenarios in that array.
    // Returns { attempts, correct } or null if no attempts recorded yet.
    function prefixAccuracy(prefix, scenarios) {
        if (!scenarios || !scenarios.length) return null;
        let attempts = 0, wrong = 0;
        scenarios.forEach(s => {
            const rec = SR.get(prefix + '|' + s.id);
            if (rec && rec.totalAttempts) {
                attempts += rec.totalAttempts;
                wrong    += (rec.totalWrong || 0);
            }
        });
        return attempts > 0 ? { attempts, correct: attempts - wrong } : null;
    }

    function accTag(acc) {
        if (!acc) return `<span class="text-[11px] text-slate-600">Not started</span>`;
        const pct = Math.round(acc.correct / acc.attempts * 100);
        return `<span class="text-[11px] text-indigo-400 font-bold">${pct}% accuracy</span>`;
    }

    function node(onclick, step, title, desc, acc) {
        return `
        <button onclick="${onclick}"
            class="w-full bg-slate-900 border border-slate-700 hover:border-indigo-500 active:scale-[0.98] rounded-2xl p-5 text-left transition-all">
            <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                    <span class="text-[9px] font-black text-slate-600 bg-slate-800 rounded-full w-5 h-5 flex items-center justify-center shrink-0">${step}</span>
                    <span class="text-base font-black text-slate-100">${title}</span>
                </div>
                ${accTag(acc)}
            </div>
            <p class="text-[11px] text-slate-500 leading-snug pl-7">${desc}</p>
        </button>`;
    }

    // Compute accuracy for generator-based drills from known bucket SR keys
    function generatorAccuracy(prefix, ids) {
        let attempts = 0, wrong = 0;
        ids.forEach(id => {
            const rec = SR.get(prefix + '|' + id);
            if (rec && rec.totalAttempts) {
                attempts += rec.totalAttempts;
                wrong    += (rec.totalWrong || 0);
            }
        });
        return attempts > 0 ? { attempts, correct: attempts - wrong } : null;
    }

    const r42Ids = [];
    [2,3,4,5,6,7,8,9,10,12,14,15].forEach(o => ['flop','turn'].forEach(st => r42Ids.push('r42-'+o+'-'+st)));
    const porIds = [];
    ['small','medium','large','overbet'].forEach(sz => ['low','mid','high'].forEach(t => porIds.push('por-'+sz+'-'+t)));
    const rpIds = [1.5,2,2.5,3,3.5,4,4.5,5,6].map(r => 'r2p-'+String(r).replace('.','_')+'-to-1');

    // OUT_COUNTING bucket IDs
    const ocIds = [];
    OC_CATEGORIES.forEach(cat => {
        const streets = OC_FLOP_ONLY.includes(cat) ? ['FLOP'] : ['FLOP', 'TURN'];
        streets.forEach(st => ocIds.push('oc-' + cat + '-' + st.toLowerCase()));
    });

    // EQUITY_DEC bucket IDs (mirrors buildMathQueue logic)
    const edIds = [];
    OC_CATEGORIES.filter(c => c !== 'no-draw').forEach(cat => {
        const streets = OC_FLOP_ONLY.includes(cat) ? ['FLOP'] : ['FLOP', 'TURN'];
        streets.forEach(st => {
            ['small', 'large'].forEach(bsc => {
                const bb = bsc === 'small' ? 'small-bet' : 'large-bet';
                if (cat === 'backdoor-flush-draw') edIds.push('backdoor-flush-' + bb + '-flop');
                else if (cat === 'backdoor-straight') edIds.push('backdoor-straight-' + bb + '-flop');
                else edIds.push(cat + '-' + bb + '-' + st.toLowerCase());
            });
        });
    });
    edIds.push('no-draw-any-bet');

    const ocAcc  = generatorAccuracy('OUT_COUNT', ocIds);
    const r42Acc = generatorAccuracy('RULE_42', r42Ids);
    const porAcc = generatorAccuracy('POT_RATIO', porIds);
    const rpAcc  = generatorAccuracy('RATIO_PCT', rpIds);
    const edAcc  = generatorAccuracy('EQUITY_DEC', edIds);
    const bsAcc  = prefixAccuracy('BET_SIZE', BET_SIZING_SCENARIOS);

    return `
    <div class="flex flex-col items-center gap-4 px-4 py-8 max-w-md md:max-w-2xl mx-auto w-full h-full overflow-y-auto">
        <div class="text-center">
            <p class="text-2xl font-black text-slate-100">Poker Math</p>
            <p class="text-xs text-slate-500 mt-1">Build the instincts that cost you money at the table</p>
        </div>

        <div class="w-full flex flex-col gap-3">

            ${node("startMathDrill('OUT_COUNTING')", 1,
                'Out Counting',
                'Identify your outs on the board',
                ocAcc)}

            ${node("startMathDrill('RULE_42')", 2,
                'Rule of 4/2',
                'Convert outs to equity %',
                r42Acc)}

            ${node("startMathDrill('POT_RATIO')", 3,
                'Pot Odds: Ratio',
                'What odds are you getting?',
                porAcc)}

            ${node("startMathDrill('RATIO_PCT')", 4,
                'Ratio to %',
                'Convert pot odds ratio to equity needed',
                rpAcc)}

            ${node("startMathDrill('EQUITY_DEC')", 5,
                'Equity Decision',
                'Do your odds beat your equity?',
                edAcc)}

            ${node("startMathDrill('BET_SIZE')", 6,
                'Bet Sizing',
                'Pick the right size for the situation',
                bsAcc)}

            <button onclick="startMathDrill('MIXED')"
                class="w-full bg-indigo-900/40 border border-indigo-700/50 hover:border-indigo-400 active:scale-[0.98] rounded-2xl p-4 text-left transition-all">
                <div class="mb-1">
                    <span class="text-sm font-black text-indigo-200">Mixed Session</span>
                </div>
                <p class="text-[11px] text-slate-400">All three drill types in one session \u2014 recommended for daily practice.</p>
            </button>

        </div>

        <p class="text-[9px] text-slate-700 font-bold uppercase tracking-widest text-center">
            Spaced repetition \xb7 Sessions auto-prioritise your weak spots
        </p>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// POT MATH QUESTION & SUBMIT
// ─────────────────────────────────────────────────────────────────────────────

function renderPotMathQuestion(s) {
    const totalIfCall = s.pot + s.bet * 2;
    const btns = (s.choices || []).map(pct =>
        `<button onclick="submitPotMathAnswer(${pct})"
            class="py-5 md:py-8 rounded-2xl font-black text-2xl md:text-4xl bg-slate-800 border border-slate-700 text-slate-200 hover:border-indigo-500 hover:text-indigo-200 active:scale-[0.97] transition-all">
            ${pct}%
        </button>`
    ).join('');

    return `
    <div class="flex-1 flex flex-col justify-between items-center px-4 md:px-8 py-4 max-w-md md:max-w-2xl mx-auto w-full">

        <!-- Pot / bet display -->
        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8">
            <div class="flex justify-between items-center mb-4 md:mb-6">
                <span class="text-slate-400 text-base md:text-xl">Pot</span>
                <span class="font-black text-slate-100 text-3xl md:text-5xl">$${s.pot}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-slate-400 text-base md:text-xl">Villain bets</span>
                <span class="font-black text-indigo-300 text-3xl md:text-5xl">$${s.bet}</span>
            </div>
            <div class="border-t border-slate-800 mt-4 pt-3 flex justify-between text-sm text-slate-600">
                <span>Pot if you call</span>
                <span>$${totalIfCall}</span>
            </div>
        </div>

        <!-- Question -->
        <p class="text-base md:text-xl text-slate-200 text-center font-semibold">
            What % equity do you need to call?
        </p>

        <!-- Multiple choice -->
        <div class="w-full grid grid-cols-2 gap-3">${btns}</div>

        <p class="text-[10px] md:text-sm text-slate-700 text-center italic">Formula: bet \u00f7 (pot + 2\u00d7bet)</p>
    </div>`;
}

function submitPotMathAnswer(pct) {
    if (mathDrill.answered) return;
    mathDrill.answered = true;

    const item    = mathDrill.queue[mathDrill.idx];
    const correct = pct === item.s.correctPct;
    mathDrill.lastCorrect = correct;
    mathDrill.lastGrade   = correct ? 'good' : 'wrong';
    mathDrill.sessionTotal++;
    if (correct) mathDrill.sessionCorrect++;
    mathDrill.sessionLog.push({
        id: item.s.id, drillType: 'POT_MATH',
        category: item.s.category, correct,
        answer: pct, correctPct: item.s.correctPct
    });

    try { SR.update(item.srKey, correct ? 'Good' : 'Again'); } catch(_) {}

    renderMathDrillView('feedback');
}

// ─────────────────────────────────────────────────────────────────────────────
// POT ODDS QUESTION
// ─────────────────────────────────────────────────────────────────────────────

function renderPotOddsQuestion(s) {
    const streetLabel = { FLOP: 'Flop', TURN: 'Turn', RIVER: 'River' }[s.street] || s.street;
    const catLabel    = (POT_ODDS_CATEGORIES && POT_ODDS_CATEGORIES[s.category])
        ? POT_ODDS_CATEGORIES[s.category].label : s.category;
    const totalIfCall = s.pot + s.bet * 2;
    const pct         = Math.round(s.bet / totalIfCall * 100);

    return `
    <div class="flex-1 flex flex-col justify-between items-center px-4 md:px-8 py-4 max-w-md md:max-w-2xl mx-auto w-full">

        <!-- Category + street pill -->
        <div class="flex gap-2 items-center">
            <span class="text-[9px] font-bold uppercase tracking-widest text-indigo-400">${catLabel}</span>
            <span class="text-slate-700">·</span>
            <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500">${streetLabel}</span>
        </div>

        <!-- Hole cards -->
        <div class="flex flex-col items-center gap-2">
            <span class="text-[9px] font-bold uppercase tracking-widest text-slate-600">Your hand</span>
            ${renderDrillCardsHtml(s.hand)}
        </div>

        <!-- Board -->
        <div class="flex flex-col items-center gap-2">
            <span class="text-[9px] font-bold uppercase tracking-widest text-slate-600">Board</span>
            ${renderDrillCardsHtml(s.board)}
        </div>

        <!-- Pot info -->
        <div class="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 flex flex-col gap-2 md:gap-3">
            <div class="flex justify-between text-sm md:text-base">
                <span class="text-slate-400">Pot</span>
                <span class="font-black text-slate-200">$${s.pot}</span>
            </div>
            <div class="flex justify-between text-sm md:text-base">
                <span class="text-slate-400">Villain bets</span>
                <span class="font-black text-slate-200">$${s.bet}</span>
            </div>
            <div class="border-t border-slate-800 pt-2 flex justify-between text-[11px]">
                <span class="text-slate-600">Pot if you call</span>
                <span class="text-slate-500">$${totalIfCall}</span>
            </div>
        </div>

        <!-- Prompt -->
        <div class="text-center">
            <p class="text-sm text-slate-300">
                You need <span class="text-white font-black">${pct}% equity</span> to call profitably.
            </p>
            <p class="text-xs text-slate-500 mt-1">Does your hand have it?</p>
        </div>

        <!-- Hint -->
        <div class="w-full">
            <button id="po-hint-btn" onclick="showPotOddsHint()"
                class="w-full py-2.5 rounded-xl text-[12px] font-bold text-amber-400 border border-amber-800/40 bg-amber-950/20 hover:bg-amber-900/30 active:scale-[0.98] transition-all">
                💡 How do I estimate my equity?
            </button>
            <div id="po-hint-panel" class="hidden mt-2 bg-slate-900 border border-amber-800/30 rounded-xl px-4 py-3">
                <!-- populated by showPotOddsHint() -->
            </div>
        </div>

        <!-- Action buttons -->
        <div class="w-full grid grid-cols-2 gap-3">
            <button onclick="submitPotOddsAnswer('FOLD')"
                class="py-5 md:py-8 rounded-2xl font-black text-base md:text-xl bg-rose-900/50 border border-rose-700/60 text-rose-200 hover:bg-rose-800/60 active:scale-[0.97] transition-all">
                FOLD
            </button>
            <button onclick="submitPotOddsAnswer('CALL')"
                class="py-5 md:py-8 rounded-2xl font-black text-base md:text-xl bg-emerald-900/50 border border-emerald-700/60 text-emerald-200 hover:bg-emerald-800/60 active:scale-[0.97] transition-all">
                CALL
            </button>
        </div>

    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BET SIZING QUESTION
// ─────────────────────────────────────────────────────────────────────────────

// Returns a plain-English label for the player's hand relative to the board
function classifyHandContextBs(hand, board) {
    const boardSuits = board.map(cardSuit);
    // Made flush (all board cards same suit, hero has matching)
    if (boardSuits.every(s => s === boardSuits[0]) && suitCount(hand, boardSuits[0]) >= 1) {
        return 'Made flush';
    }
    // Flush draw
    if (constraintFlushDraw(hand, board)) return 'Flush draw';
    // Straight draws
    const allRanks = [...hand, ...board].map(c => rankNum(cardRank(c)));
    if (hasOESD(allRanks)) return 'OESD';
    if (hasDoubleGutshot(allRanks)) return 'Double gutshot';
    if (hasGutshot(allRanks)) return 'Gutshot';
    // Pocket pair
    if (cardRank(hand[0]) === cardRank(hand[1])) {
        const pairRank = rankNum(cardRank(hand[0]));
        const bRanks   = board.map(c => rankNum(cardRank(c)));
        if (bRanks.every(r => r < pairRank)) return 'Overpair';
        if (bRanks.every(r => r > pairRank)) return 'Underpair';
        return 'Middle pair';
    }
    // Pair on board
    const boardRankSet = new Set(board.map(c => cardRank(c)));
    if (hand.some(c => boardRankSet.has(cardRank(c)))) {
        const bRankNums = board.map(c => rankNum(cardRank(c))).sort((a, b) => b - a);
        const heroRankNums = hand.map(c => rankNum(cardRank(c)));
        const pairedRank = heroRankNums.find(r => bRankNums.includes(r));
        if (pairedRank === bRankNums[0]) return 'Top pair';
        if (pairedRank === bRankNums[bRankNums.length - 1]) return 'Bottom pair';
        return 'Middle pair';
    }
    // Overcards
    const maxBoard = Math.max(...board.map(c => rankNum(cardRank(c))));
    const heroRanks = hand.map(c => rankNum(cardRank(c)));
    const overcards = heroRanks.filter(r => r > maxBoard);
    if (overcards.length === 2) return 'Two overcards';
    if (overcards.length === 1) return 'One overcard';
    return 'Air';
}

function renderBetSizeQuestion(s) {
    const streetLabel = { FLOP: 'Flop', TURN: 'Turn', RIVER: 'River' }[s.street] || s.street;
    const catLabel    = (BET_SIZING_CATEGORIES && BET_SIZING_CATEGORIES[s.textureCategory || s.category])
        ? BET_SIZING_CATEGORIES[s.textureCategory || s.category].label : (s.textureCategory || s.category);
    const posLabel    = s.position === 'IP' ? 'In position' : 'Out of position';
    const spr         = s.stackBehind ? (s.stackBehind / s.potSize).toFixed(1) : null;
    const handContext = classifyHandContextBs(s.hand, s.board);

    const sizeButtons = [
        { val: 'CHECK', label: 'Check' },
        { val: '25',    label: '25%'   },
        { val: '33',    label: '33%'   },
        { val: '50',    label: '50%'   },
        { val: '75',    label: '75%'   },
        { val: 'POT',   label: 'Pot'   },
        { val: 'OVERBET', label: 'Overbet' }
    ];

    const btns = sizeButtons.map(b =>
        `<button onclick="submitBetSizeAnswer('${b.val}')"
            class="py-3 md:py-5 rounded-xl font-black text-sm md:text-base bg-slate-800 border border-slate-700 text-slate-200 hover:border-indigo-500 hover:text-indigo-200 active:scale-[0.97] transition-all">
            ${b.label}
        </button>`
    ).join('');

    return `
    <div class="flex-1 flex flex-col justify-between items-center px-4 md:px-8 py-4 max-w-md md:max-w-2xl mx-auto w-full">

        <!-- Category + street pill -->
        <div class="flex gap-2 items-center">
            <span class="text-[9px] font-bold uppercase tracking-widest text-indigo-400">${catLabel}</span>
            <span class="text-slate-700">·</span>
            <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500">${streetLabel}</span>
        </div>

        <!-- Board (top) -->
        <div class="flex flex-col items-center gap-2">
            <span class="text-[9px] font-bold uppercase tracking-widest text-slate-600">Board</span>
            ${renderDrillCardsHtml(s.board)}
        </div>

        <!-- Divider -->
        <div class="w-full border-t border-slate-800"></div>

        <!-- Hole cards (bottom, closer to action) -->
        <div class="flex flex-col items-center gap-2">
            <span class="text-[9px] font-bold uppercase tracking-widest text-slate-600">Your hand</span>
            ${renderDrillCardsHtml(s.hand)}
            <span class="text-[10px] text-slate-500 italic">You have: ${handContext}</span>
        </div>

        <!-- Situation info -->
        <div class="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 flex flex-col gap-2 md:gap-3">
            <div class="flex justify-between text-sm md:text-base">
                <span class="text-slate-400">Pot</span>
                <span class="font-black text-slate-200">$${s.potSize}</span>
            </div>
            <div class="flex justify-between text-sm md:text-base">
                <span class="text-slate-400">Position</span>
                <span class="font-black text-slate-200">${posLabel}</span>
            </div>
            ${s.stackBehind ? `
            <div class="flex justify-between text-sm md:text-base">
                <span class="text-slate-400">Stack behind</span>
                <span class="font-black text-slate-200">$${s.stackBehind}</span>
            </div>
            ${spr ? `<div class="border-t border-slate-800 pt-2 flex justify-between text-[11px]">
                <span class="text-slate-600">SPR (stack / pot)</span>
                <span class="text-slate-500">${spr}</span>
            </div>` : ''}` : ''}
        </div>

        <!-- Prompt -->
        ${s.position === 'IP'
            ? `<p class="text-sm text-slate-300 text-center">Villain checks to you on the <span class="text-white font-semibold">${streetLabel.toLowerCase()}</span>.</p>`
            : `<p class="text-sm text-slate-300 text-center">Action is on you on the <span class="text-white font-semibold">${streetLabel.toLowerCase()}</span>.</p>`
        }

        <!-- Size buttons -->
        <div class="w-full grid grid-cols-4 gap-2">${btns}</div>

    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBMIT HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

function submitPotOddsAnswer(action) {
    if (mathDrill.answered) return;
    mathDrill.answered = true;

    const item    = mathDrill.queue[mathDrill.idx];
    const correct = action === item.s.correctAction;
    mathDrill.lastCorrect = correct;
    mathDrill.lastGrade   = correct ? 'good' : 'wrong';
    mathDrill.sessionTotal++;
    if (correct) mathDrill.sessionCorrect++;
    mathDrill.sessionLog.push({
        id: item.s.id, drillType: 'POT_ODDS',
        category: item.s.category, correct
    });

    // SR update: 'Good' for correct, 'Again' for wrong
    try { SR.update(item.srKey, correct ? 'Good' : 'Again'); } catch(_) {}

    renderMathDrillView('feedback');
}

function submitBetSizeAnswer(size) {
    if (mathDrill.answered) return;
    mathDrill.answered = true;

    const item    = mathDrill.queue[mathDrill.idx];
    const s       = item.s;
    let grade;
    if (size === s.bestSize) {
        grade = 'best';
    } else if ((s.correctSizes || []).includes(size)) {
        grade = 'good';
    } else {
        grade = 'wrong';
    }
    const correct = grade !== 'wrong';
    mathDrill.lastCorrect = correct;
    mathDrill.lastGrade   = grade;
    mathDrill.sessionTotal++;
    if (correct) mathDrill.sessionCorrect++;
    mathDrill.sessionLog.push({
        id: s.id, drillType: 'BET_SIZE',
        category: s.textureCategory || s.category, correct,
        answer: size, bestSize: s.bestSize
    });

    try { SR.update(item.srKey, correct ? 'Good' : 'Again'); } catch(_) {}

    renderMathDrillView('feedback');
}

// ─────────────────────────────────────────────────────────────────────────────
// HINT HANDLER (Pot Odds)
// ─────────────────────────────────────────────────────────────────────────────

function showPotOddsHint() {
    const item = mathDrill.queue[mathDrill.idx];
    if (!item) return;
    const hintPanel = document.getElementById('po-hint-panel');
    const hintBtn   = document.getElementById('po-hint-btn');
    if (!hintPanel) return;

    const s = item.s;
    // Rule-of-4: outs × 4 on flop, outs × 2 on turn (approximation guide)
    const ruleNote = s.street === 'FLOP'
        ? 'On the flop, multiply your outs × 4 for a rough equity %.'
        : s.street === 'TURN'
        ? 'On the turn, multiply your outs × 2 for a rough equity %.'
        : '';

    hintPanel.innerHTML = `
        <p class="text-[11px] font-bold uppercase tracking-widest text-amber-500 mb-2">Equity Guide</p>
        <p class="text-[12px] text-slate-300 leading-relaxed mb-2">${s.outsSummary}</p>
        ${ruleNote ? `<p class="text-[11px] text-slate-500 italic">${ruleNote}</p>` : ''}`;
    hintPanel.classList.remove('hidden');
    if (hintBtn) hintBtn.classList.add('hidden');
}

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK VIEWS
// ─────────────────────────────────────────────────────────────────────────────

function renderPotOddsFeedback(s) {
    const correct     = mathDrill.lastCorrect;
    const totalIfCall = s.pot + s.bet * 2;
    const resultBg    = correct
        ? 'bg-emerald-950/50 border-emerald-700/50'
        : 'bg-rose-950/50 border-rose-700/50';
    const resultIcon  = correct ? '✓' : '✗';
    const resultCol   = correct ? 'text-emerald-400' : 'text-rose-400';
    const verdict     = correct
        ? `${s.correctAction} is correct`
        : `Correct answer: ${s.correctAction}`;

    const equityVsNeeded = s.heroEquity > s.potOddsNeeded
        ? `<span class="text-emerald-400">${s.heroEquity}%</span> &gt; <span class="text-slate-400">${s.potOddsNeeded}%</span> needed — profitable`
        : s.heroEquity === s.potOddsNeeded
        ? `<span class="text-yellow-400">${s.heroEquity}% = ${s.potOddsNeeded}%</span> — breakeven`
        : `<span class="text-rose-400">${s.heroEquity}%</span> &lt; <span class="text-slate-400">${s.potOddsNeeded}%</span> needed — unprofitable`;

    return `
    <div class="flex-1 flex flex-col justify-between items-center px-4 md:px-8 py-4 max-w-md md:max-w-2xl mx-auto w-full">

        <!-- Result banner -->
        <div class="w-full border ${resultBg} rounded-2xl p-4 text-center">
            <span class="text-lg md:text-2xl font-black ${resultCol}">${resultIcon} ${verdict}</span>
        </div>

        <!-- Cards (compact reminder) -->
        <div class="flex items-center gap-4">
            <div class="flex flex-col items-center gap-1">
                <span class="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Hand</span>
                ${renderDrillCardsHtml(s.hand)}
            </div>
            <div class="text-slate-700 text-lg font-bold">vs</div>
            <div class="flex flex-col items-center gap-1">
                <span class="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Board</span>
                ${renderDrillCardsHtml(s.board)}
            </div>
        </div>

        <!-- Math breakdown -->
        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">

            <div>
                <p class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Pot Odds Calculation</p>
                <div class="flex flex-col gap-1 text-[12px]">
                    <div class="flex justify-between">
                        <span class="text-slate-500">Call</span>
                        <span class="text-slate-300 font-semibold">$${s.bet}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-500">Pot if call ($${s.pot} + $${s.bet} + $${s.bet})</span>
                        <span class="text-slate-300 font-semibold">$${totalIfCall}</span>
                    </div>
                    <div class="flex justify-between border-t border-slate-800 pt-1.5 mt-0.5">
                        <span class="text-slate-400 font-bold">Equity needed</span>
                        <span class="text-slate-200 font-black">${s.potOddsNeeded}%</span>
                    </div>
                </div>
            </div>

            <div class="border-t border-slate-800 pt-3">
                <p class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Your Equity</p>
                <p class="text-[12px] text-slate-400">${s.outsSummary}</p>
                <p class="text-[13px] font-bold mt-1.5">${equityVsNeeded}</p>
            </div>
        </div>

        <!-- Explanation -->
        <div class="w-full bg-slate-900/40 border border-slate-800/50 rounded-xl px-4 py-3">
            <p class="text-[12px] md:text-sm text-slate-400 leading-relaxed">${s.explanation}</p>
        </div>

        <!-- Next button -->
        <button onclick="advanceMathDrill()"
            class="w-full py-4 md:py-6 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-2xl font-black text-base md:text-xl transition-all">
            ${mathDrill.idx + 1 < mathDrill.queue.length ? 'NEXT →' : 'SEE RESULTS'}
        </button>
    </div>`;
}

function renderBetSizeFeedback(s) {
    const grade     = mathDrill.lastGrade;
    const correct   = grade !== 'wrong';
    const last      = mathDrill.sessionLog[mathDrill.sessionLog.length - 1];
    const chosen    = last ? last.answer : '?';

    const resultBg  = grade === 'best'  ? 'bg-emerald-950/50 border-emerald-700/50'
                    : grade === 'good'  ? 'bg-yellow-950/50 border-yellow-700/50'
                    :                    'bg-rose-950/50 border-rose-700/50';
    const resultCol = grade === 'best'  ? 'text-emerald-400'
                    : grade === 'good'  ? 'text-yellow-400'
                    :                    'text-rose-400';
    const verdict   = grade === 'best'  ? `${chosen === 'CHECK' ? 'Check' : chosen + '%'} — perfect choice`
                    : grade === 'good'  ? `${chosen === 'CHECK' ? 'Check' : chosen + '%'} is acceptable — best is ${s.bestSize === 'CHECK' ? 'Check' : s.bestSize + '%'}`
                    : `${chosen === 'CHECK' ? 'Check' : chosen + '%'} — correct answer: ${s.bestSize === 'CHECK' ? 'Check' : s.bestSize + '%'}`;
    const icon      = grade === 'best' ? '✓' : grade === 'good' ? '~' : '✗';

    const posLabel  = s.position === 'IP' ? 'In position' : 'Out of position';
    const spr       = s.stackBehind ? (s.stackBehind / s.potSize).toFixed(1) : null;

    // Size range display
    const allSizes = ['CHECK', '25', '33', '50', '75', 'POT', 'OVERBET'];
    const sizePills = allSizes.map(sz => {
        const isBest    = sz === s.bestSize;
        const isGood    = !isBest && (s.correctSizes || []).includes(sz);
        const isWrong   = (s.wrongSizes || []).includes(sz);
        const isChosen  = sz === chosen;
        let bg = 'bg-slate-800 text-slate-600 border-slate-700';
        if (isBest)   bg = 'bg-emerald-900/60 text-emerald-300 border-emerald-600';
        else if (isGood)  bg = 'bg-yellow-900/40 text-yellow-400 border-yellow-700/60';
        else if (isWrong) bg = 'bg-rose-950/40 text-rose-600 border-rose-800/60';
        const ring = isChosen ? ' ring-2 ring-white/40' : '';
        const label = sz === 'CHECK' ? 'Check' : sz === 'OVERBET' ? 'Overbet' : sz === 'POT' ? 'Pot' : sz + '%';
        return `<span class="px-2 py-1 rounded-lg text-[10px] font-bold border ${bg}${ring}">${label}</span>`;
    }).join('');

    return `
    <div class="flex-1 flex flex-col justify-between items-center px-4 md:px-8 py-4 max-w-md md:max-w-2xl mx-auto w-full">

        <!-- Result banner -->
        <div class="w-full border ${resultBg} rounded-2xl p-4 text-center">
            <span class="text-base font-black ${resultCol}">${icon} ${verdict}</span>
        </div>

        <!-- Cards reminder -->
        <div class="flex items-center gap-4">
            <div class="flex flex-col items-center gap-1">
                <span class="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Hand</span>
                ${renderDrillCardsHtml(s.hand)}
            </div>
            <div class="text-slate-700 text-lg font-bold">on</div>
            <div class="flex flex-col items-center gap-1">
                <span class="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Board</span>
                ${renderDrillCardsHtml(s.board)}
            </div>
        </div>

        <!-- Situation recap -->
        <div class="w-full flex gap-3 text-[11px] text-slate-500">
            <span>${posLabel}</span>
            <span>·</span>
            <span>Pot: $${s.potSize}</span>
            ${spr ? `<span>·</span><span>SPR ${spr}</span>` : ''}
        </div>

        <!-- Size rating display -->
        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-3">Sizing Scale</p>
            <div class="flex gap-2" style="flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px;">${sizePills}</div>
            <div class="flex gap-4 mt-3 text-[9px] text-slate-600">
                <span><span class="text-emerald-400 font-bold">Green</span> = best</span>
                <span><span class="text-yellow-400 font-bold">Yellow</span> = ok</span>
                <span><span class="text-rose-600 font-bold">Red</span> = avoid</span>
            </div>
        </div>

        <!-- Explanation -->
        <div class="w-full bg-slate-900/40 border border-slate-800/50 rounded-xl px-4 py-3">
            <p class="text-[12px] md:text-sm text-slate-400 leading-relaxed">${s.explanation}</p>
        </div>

        <!-- Next button -->
        <button onclick="advanceMathDrill()"
            class="w-full py-4 md:py-6 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-2xl font-black text-base md:text-xl transition-all">
            ${mathDrill.idx + 1 < mathDrill.queue.length ? 'NEXT →' : 'SEE RESULTS'}
        </button>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// POT MATH FEEDBACK
// ─────────────────────────────────────────────────────────────────────────────

function renderPotMathFeedback(s) {
    const correct     = mathDrill.lastCorrect;
    const last        = mathDrill.sessionLog[mathDrill.sessionLog.length - 1];
    const chosen      = last ? last.answer : null;
    const totalIfCall = s.pot + s.bet * 2;

    const resultBg  = correct ? 'bg-emerald-950/50 border-emerald-700/50' : 'bg-rose-950/50 border-rose-700/50';
    const resultCol = correct ? 'text-emerald-400' : 'text-rose-400';
    const icon      = correct ? '\u2713' : '\u2717';
    const verdict   = correct ? `${s.correctPct}% \u2014 correct!` : `${s.correctPct}% was the answer`;

    const pills = (s.choices || []).map(pct => {
        const isBest   = pct === s.correctPct;
        const isChosen = pct === chosen;
        let bg = 'bg-slate-800 text-slate-600 border-slate-700';
        if (isBest)             bg = 'bg-emerald-900/60 text-emerald-300 border-emerald-600';
        else if (isChosen)      bg = 'bg-rose-950/50 text-rose-400 border-rose-700';
        const ring = isChosen ? ' ring-2 ring-white/30' : '';
        return `<span class="px-4 py-2.5 rounded-xl text-base font-black border ${bg}${ring}">${pct}%</span>`;
    }).join('');

    return `
    <div class="flex-1 flex flex-col justify-between items-center px-4 md:px-8 py-4 max-w-md md:max-w-2xl mx-auto w-full">

        <!-- Result banner -->
        <div class="w-full border ${resultBg} rounded-2xl p-4 text-center">
            <span class="text-lg md:text-2xl font-black ${resultCol}">${icon} ${verdict}</span>
        </div>

        <!-- Choice review -->
        <div class="flex gap-2 justify-center flex-wrap">${pills}</div>

        <!-- Formula breakdown -->
        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-4">Formula worked out</p>
            <div class="flex flex-col gap-1.5 text-center">
                <p class="text-slate-500 text-sm">bet \u00f7 (pot + 2 \u00d7 bet)</p>
                <p class="text-slate-400 text-base md:text-xl">$${s.bet} \u00f7 ($${s.pot} + $${s.bet * 2})</p>
                <p class="text-slate-300 text-base">$${s.bet} \u00f7 $${totalIfCall}</p>
                <p class="text-white font-black text-3xl md:text-5xl mt-1">${s.correctPct}%</p>
            </div>
        </div>

        <!-- Explanation -->
        <div class="w-full bg-slate-900/40 border border-slate-800/50 rounded-xl px-4 py-3">
            <p class="text-[12px] md:text-sm text-slate-400 leading-relaxed">${s.explanation}</p>
        </div>

        <!-- Next -->
        <button onclick="advanceMathDrill()"
            class="w-full py-4 md:py-6 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-2xl font-black text-base md:text-xl transition-all">
            ${mathDrill.idx + 1 < mathDrill.queue.length ? 'NEXT \u2192' : 'SEE RESULTS'}
        </button>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// OUT COUNTING QUESTION, SUBMIT, FEEDBACK
// ─────────────────────────────────────────────────────────────────────────────

function renderOutCountingQuestion(s) {
    const streetLabel = s.street === 'FLOP' ? 'Flop' : 'Turn';
    const isBackdoor  = s.category === 'backdoor-flush-draw' || s.category === 'backdoor-straight';
    const catLabels = {
        'flush-draw': 'Flush Draw', 'backdoor-flush-draw': 'Backdoor Flush Draw',
        'oesd': 'OESD', 'double-gutshot': 'Double Gutshot', 'gutshot': 'Gutshot',
        'straight-flush-draw': 'Straight Flush Draw', 'royal-flush-draw': 'Royal Flush Draw',
        'combo-flush-oesd': 'Flush Draw + OESD', 'combo-flush-gutshot': 'Flush Draw + Gutshot',
        'backdoor-straight': 'Backdoor Straight', 'pair-plus-flush-draw': 'Pair + Flush Draw',
        'pair-plus-gutshot': 'Pair + Gutshot', 'pair-plus-oesd': 'Pair + OESD',
        'two-overcards-plus-gutshot': 'Two Overcards + Gutshot',
        'underpair': 'Underpair', 'no-draw': 'No Draw'
    };
    const drawLabel = catLabels[s.category] || s.category;

    const btns = (s.choices || []).map(outs =>
        `<button onclick="submitOutCountingAnswer(${outs})"
            class="py-5 md:py-8 rounded-2xl font-black text-2xl md:text-4xl bg-slate-800 border border-slate-700 text-slate-200 hover:border-indigo-500 hover:text-indigo-200 active:scale-[0.97] transition-all">
            ${outs}
        </button>`
    ).join('');

    return `
    <div class="flex-1 flex flex-col justify-between items-center px-4 md:px-8 py-4 max-w-md md:max-w-2xl mx-auto w-full">

        <!-- Street pill -->
        <div class="flex gap-2 items-center">
            <span class="text-[9px] font-bold uppercase tracking-widest text-indigo-400">Out Counting</span>
            <span class="text-slate-700">\u00b7</span>
            <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500">${streetLabel}</span>
        </div>

        <!-- Board (top) -->
        <div class="flex flex-col items-center gap-2">
            <span class="text-[9px] font-bold uppercase tracking-widest text-slate-600">Board</span>
            ${renderDrillCardsHtml(s.board)}
        </div>

        <!-- Divider -->
        <div class="w-full border-t border-slate-800"></div>

        <!-- Hole cards (bottom, closer to action) -->
        <div class="flex flex-col items-center gap-2">
            <span class="text-[9px] font-bold uppercase tracking-widest text-slate-600">Your hand</span>
            ${renderDrillCardsHtml(s.hand)}
        </div>

        <!-- Draw type label -->
        <div class="text-center">
            <p class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Draw Type</p>
            <p class="text-base font-black text-slate-200">${drawLabel}${isBackdoor ? ' <span class="text-[9px] font-bold text-amber-500 bg-amber-950/40 border border-amber-800/40 rounded-full px-2 py-0.5 ml-1">approximation only</span>' : ''}</p>
        </div>

        <!-- Question -->
        <p class="text-base md:text-xl text-slate-200 text-center font-semibold">
            How many outs do you have?
        </p>

        <!-- Multiple choice -->
        <div class="w-full grid grid-cols-2 gap-3">${btns}</div>

        <p class="text-[10px] md:text-sm text-slate-700 text-center italic">Count cards that improve your hand to likely best</p>
    </div>`;
}

function submitOutCountingAnswer(outs) {
    if (mathDrill.answered) return;
    mathDrill.answered = true;
    const item    = mathDrill.queue[mathDrill.idx];
    const correct = outs === item.s.correctOuts;
    mathDrill.lastCorrect = correct;
    mathDrill.lastGrade   = correct ? 'good' : 'wrong';
    mathDrill.sessionTotal++;
    if (correct) mathDrill.sessionCorrect++;
    mathDrill.sessionLog.push({
        id: item.s.id, drillType: 'OUT_COUNTING',
        category: item.s.category, correct,
        answer: outs, correctOuts: item.s.correctOuts
    });
    try { SR.update(item.srKey, correct ? 'Good' : 'Again'); } catch(_) {}
    renderMathDrillView('feedback');
}

function renderOutCountingFeedback(s) {
    const correct = mathDrill.lastCorrect;
    const last    = mathDrill.sessionLog[mathDrill.sessionLog.length - 1];
    const chosen  = last ? last.answer : null;
    const streetLabel = s.street === 'FLOP' ? 'Flop' : 'Turn';

    const resultBg  = correct ? 'bg-emerald-950/50 border-emerald-700/50' : 'bg-rose-950/50 border-rose-700/50';
    const resultCol = correct ? 'text-emerald-400' : 'text-rose-400';
    const icon      = correct ? '\u2713' : '\u2717';
    const outsLabel = s.correctOuts === 1 ? 'out' : 'outs';
    const verdict   = correct ? `${s.correctOuts} ${outsLabel} \u2014 correct!` : `${s.correctOuts} ${outsLabel} was the answer`;

    const pills = (s.choices || []).map(outs => {
        const isBest   = outs === s.correctOuts;
        const isChosen = outs === chosen;
        let bg = 'bg-slate-800 text-slate-600 border-slate-700';
        if (isBest)             bg = 'bg-emerald-900/60 text-emerald-300 border-emerald-600';
        else if (isChosen)      bg = 'bg-rose-950/50 text-rose-400 border-rose-700';
        const ring = isChosen ? ' ring-2 ring-white/30' : '';
        return `<span class="px-4 py-2.5 rounded-xl text-base font-black border ${bg}${ring}">${outs}</span>`;
    }).join('');

    return `
    <div class="flex-1 flex flex-col justify-between items-center px-4 md:px-8 py-4 max-w-md md:max-w-2xl mx-auto w-full">

        <div class="w-full border ${resultBg} rounded-2xl p-4 text-center">
            <span class="text-lg md:text-2xl font-black ${resultCol}">${icon} ${verdict}</span>
        </div>

        <!-- Cards reminder -->
        <div class="flex items-center gap-4">
            <div class="flex flex-col items-center gap-1">
                <span class="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Hand</span>
                ${renderDrillCardsHtml(s.hand)}
            </div>
            <div class="text-slate-700 text-lg font-bold">on</div>
            <div class="flex flex-col items-center gap-1">
                <span class="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Board</span>
                ${renderDrillCardsHtml(s.board)}
            </div>
        </div>

        <div class="flex gap-2 justify-center flex-wrap">${pills}</div>

        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-2">Draw Type</p>
            <p class="text-sm text-slate-300">${s.outsSummary}</p>
        </div>

        <div class="w-full bg-slate-900/40 border border-slate-800/50 rounded-xl px-4 py-3">
            <p class="text-[12px] md:text-sm text-slate-400 leading-relaxed">${s.explanation}</p>
        </div>

        <button onclick="advanceMathDrill()"
            class="w-full py-4 md:py-6 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-2xl font-black text-base md:text-xl transition-all">
            ${mathDrill.idx + 1 < mathDrill.queue.length ? 'NEXT \u2192' : 'SEE RESULTS'}
        </button>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// EQUITY DECISION QUESTION, SUBMIT, FEEDBACK
// ─────────────────────────────────────────────────────────────────────────────

function renderEquityDecQuestion(s) {
    const streetLabel = s.street === 'FLOP' ? 'Flop' : 'Turn';
    const totalIfCall = s.pot + s.bet * 2;

    return `
    <div class="flex-1 flex flex-col justify-between items-center px-4 md:px-8 py-4 max-w-md md:max-w-2xl mx-auto w-full">

        <!-- Street pill -->
        <div class="flex gap-2 items-center">
            <span class="text-[9px] font-bold uppercase tracking-widest text-indigo-400">Equity Decision</span>
            <span class="text-slate-700">\u00b7</span>
            <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500">${streetLabel}</span>
        </div>

        <!-- Board (top) -->
        <div class="flex flex-col items-center gap-2">
            <span class="text-[9px] font-bold uppercase tracking-widest text-slate-600">Board</span>
            ${renderDrillCardsHtml(s.board)}
        </div>

        <!-- Divider -->
        <div class="w-full border-t border-slate-800"></div>

        <!-- Hole cards (bottom, closer to action) -->
        <div class="flex flex-col items-center gap-2">
            <span class="text-[9px] font-bold uppercase tracking-widest text-slate-600">Your hand</span>
            ${renderDrillCardsHtml(s.hand)}
        </div>

        <!-- Pot info -->
        <div class="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 flex flex-col gap-2 md:gap-3">
            <div class="flex justify-between text-sm md:text-base">
                <span class="text-slate-400">Pot</span>
                <span class="font-black text-slate-200">$${s.pot}</span>
            </div>
            <div class="flex justify-between text-sm md:text-base">
                <span class="text-slate-400">Villain bets</span>
                <span class="font-black text-slate-200">$${s.bet}</span>
            </div>
            <div class="border-t border-slate-800 pt-2 flex justify-between text-[11px]">
                <span class="text-slate-600">Pot if you call</span>
                <span class="text-slate-500">$${totalIfCall}</span>
            </div>
        </div>

        <!-- Hint -->
        <div class="w-full">
            <button id="ed-hint-btn" onclick="showEquityDecHint()"
                class="w-full py-2.5 rounded-xl text-[12px] font-bold text-amber-400 border border-amber-800/40 bg-amber-950/20 hover:bg-amber-900/30 active:scale-[0.98] transition-all">
                \ud83d\udca1 How do I solve this?
            </button>
            <div id="ed-hint-panel" class="hidden mt-2 bg-slate-900 border border-amber-800/30 rounded-xl px-4 py-3">
            </div>
        </div>

        <!-- Action buttons -->
        <div class="w-full grid grid-cols-2 gap-3">
            <button onclick="submitEquityDecAnswer('FOLD')"
                class="py-5 md:py-8 rounded-2xl font-black text-base md:text-xl bg-rose-900/50 border border-rose-700/60 text-rose-200 hover:bg-rose-800/60 active:scale-[0.97] transition-all">
                FOLD
            </button>
            <button onclick="submitEquityDecAnswer('CALL')"
                class="py-5 md:py-8 rounded-2xl font-black text-base md:text-xl bg-emerald-900/50 border border-emerald-700/60 text-emerald-200 hover:bg-emerald-800/60 active:scale-[0.97] transition-all">
                CALL
            </button>
        </div>

    </div>`;
}

function showEquityDecHint() {
    const hintPanel = document.getElementById('ed-hint-panel');
    const hintBtn   = document.getElementById('ed-hint-btn');
    if (!hintPanel) return;
    const s = mathDrill.queue[mathDrill.idx] && mathDrill.queue[mathDrill.idx].s;
    hintPanel.innerHTML = `
        ${s ? `<div class="mb-3 pb-3 border-b border-amber-800/30">
            <p class="text-[11px] font-bold uppercase tracking-widest text-amber-500 mb-2">Pot Odds</p>
            <div class="flex justify-between text-[11px]">
                <span class="text-slate-500">Ratio</span>
                <span class="text-slate-300 font-semibold">${s.potOddsRatio}</span>
            </div>
            <div class="flex justify-between text-[11px] mt-1">
                <span class="text-slate-500">Equity needed</span>
                <span class="text-slate-300 font-semibold">${s.equityNeededPct}%</span>
            </div>
        </div>` : ''}
        <p class="text-[11px] font-bold uppercase tracking-widest text-amber-500 mb-3">How to Solve</p>
        <div class="flex flex-col gap-2.5 text-[11px]">
            <div>
                <p class="font-bold text-slate-300">Step 1 \u2014 Count your outs</p>
                <p class="text-slate-500 mt-0.5">Flush draw = 9 \u00b7 OESD = 8 \u00b7 Gutshot = 4 \u00b7 Underpair = 2</p>
            </div>
            <div>
                <p class="font-bold text-slate-300">Step 2 \u2014 Convert to equity</p>
                <p class="text-slate-500 mt-0.5">Flop: outs \u00d7 4 &nbsp;&nbsp;&nbsp; Turn: outs \u00d7 2</p>
            </div>
            <div>
                <p class="font-bold text-slate-300">Step 3 \u2014 Read pot odds</p>
                <p class="text-slate-500 mt-0.5">2:1 = 33% \u00b7 3:1 = 25% \u00b7 4:1 = 20% \u00b7 5:1 = 17%</p>
            </div>
            <div>
                <p class="font-bold text-slate-300">Step 4 \u2014 Compare</p>
                <p class="text-slate-500 mt-0.5">Equity &gt; needed? CALL &nbsp;&nbsp; Equity &lt; needed? FOLD</p>
            </div>
        </div>`;
    hintPanel.classList.remove('hidden');
    if (hintBtn) hintBtn.classList.add('hidden');
}

function showRatioPctHint() {
    const hintPanel = document.getElementById('rp-hint-panel');
    const hintBtn   = document.getElementById('rp-hint-btn');
    if (!hintPanel) return;
    hintPanel.innerHTML = `
        <p class="text-[11px] font-bold uppercase tracking-widest text-amber-500 mb-3">How to Convert</p>
        <div class="flex flex-col gap-2.5 text-[11px]">
            <div>
                <p class="font-bold text-slate-300">Formula</p>
                <p class="text-slate-500 mt-0.5">1 &divide; (ratio + 1) = equity needed</p>
            </div>
            <div>
                <p class="font-bold text-slate-300">Common ratios</p>
                <p class="text-slate-500 mt-0.5">2:1 = 33% &nbsp;&middot;&nbsp; 3:1 = 25% &nbsp;&middot;&nbsp; 4:1 = 20% &nbsp;&middot;&nbsp; 5:1 = 17%</p>
            </div>
        </div>`;
    hintPanel.classList.remove('hidden');
    if (hintBtn) hintBtn.classList.add('hidden');
}

function submitEquityDecAnswer(action) {
    if (mathDrill.answered) return;
    mathDrill.answered = true;
    const item    = mathDrill.queue[mathDrill.idx];
    const correct = action === item.s.correctAction;
    mathDrill.lastCorrect = correct;
    mathDrill.lastGrade   = correct ? 'good' : 'wrong';
    mathDrill.sessionTotal++;
    if (correct) mathDrill.sessionCorrect++;
    mathDrill.sessionLog.push({
        id: item.s.id, drillType: 'EQUITY_DEC',
        category: item.s.category, correct
    });
    try { SR.update(item.srKey, correct ? 'Good' : 'Again'); } catch(_) {}
    renderMathDrillView('feedback');
}

function renderEquityDecFeedback(s) {
    const correct     = mathDrill.lastCorrect;
    const resultBg    = correct ? 'bg-emerald-950/50 border-emerald-700/50' : 'bg-rose-950/50 border-rose-700/50';
    const resultCol   = correct ? 'text-emerald-400' : 'text-rose-400';
    const resultIcon  = correct ? '\u2713' : '\u2717';
    const verdict     = correct ? `${s.correctAction} is correct` : `Correct answer: ${s.correctAction}`;
    const totalIfCall = s.pot + s.bet * 2;

    const equityComp = s.heroEquityPct >= s.equityNeededPct
        ? `<span class="text-emerald-400">${s.heroEquityPct}%</span> &gt; <span class="text-slate-400">${s.equityNeededPct}%</span> needed \u2014 profitable`
        : `<span class="text-rose-400">${s.heroEquityPct}%</span> &lt; <span class="text-slate-400">${s.equityNeededPct}%</span> needed \u2014 unprofitable`;

    return `
    <div class="flex-1 flex flex-col justify-between items-center px-4 md:px-8 py-4 max-w-md md:max-w-2xl mx-auto w-full">

        <div class="w-full border ${resultBg} rounded-2xl p-4 text-center">
            <span class="text-lg md:text-2xl font-black ${resultCol}">${resultIcon} ${verdict}</span>
        </div>

        <!-- Cards reminder -->
        <div class="flex items-center gap-4">
            <div class="flex flex-col items-center gap-1">
                <span class="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Hand</span>
                ${renderDrillCardsHtml(s.hand)}
            </div>
            <div class="text-slate-700 text-lg font-bold">on</div>
            <div class="flex flex-col items-center gap-1">
                <span class="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Board</span>
                ${renderDrillCardsHtml(s.board)}
            </div>
        </div>

        <!-- Pot / bet sizing (same layout as question screen) -->
        <div class="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
            <div class="flex justify-between text-sm">
                <span class="text-slate-400">Pot</span>
                <span class="font-black text-slate-200">$${s.pot}</span>
            </div>
            <div class="flex justify-between text-sm">
                <span class="text-slate-400">Villain bets</span>
                <span class="font-black text-slate-200">$${s.bet}</span>
            </div>
            <div class="border-t border-slate-800 pt-2 flex justify-between text-[11px]">
                <span class="text-slate-600">Pot if you call</span>
                <span class="text-slate-500">$${totalIfCall}</span>
            </div>
        </div>

        <!-- Math breakdown -->
        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div>
                <p class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Pot Odds</p>
                <div class="flex justify-between text-[12px] md:text-sm">
                    <span class="text-slate-500">Ratio</span>
                    <span class="text-slate-300 font-semibold">${s.potOddsRatio}</span>
                </div>
                <div class="flex justify-between text-[12px] md:text-sm">
                    <span class="text-slate-500">Equity needed</span>
                    <span class="text-slate-300 font-semibold">${s.equityNeededPct}%</span>
                </div>
            </div>
            <div class="border-t border-slate-800 pt-3">
                <p class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1.5">Your Equity</p>
                <p class="text-[12px] text-slate-400">${s.outsSummary}</p>
                <p class="text-[12px] font-black text-slate-200 mt-0.5">~${s.heroEquityPct}% (${s.street === 'FLOP' ? 'outs \u00d7 4' : 'outs \u00d7 2'})</p>
                <p class="text-[13px] font-bold mt-1.5">${equityComp}</p>
            </div>
        </div>

        <div class="w-full bg-slate-900/40 border border-slate-800/50 rounded-xl px-4 py-3">
            <p class="text-[12px] md:text-sm text-slate-400 leading-relaxed">${s.explanation}</p>
        </div>

        <button onclick="advanceMathDrill()"
            class="w-full py-4 md:py-6 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-2xl font-black text-base md:text-xl transition-all">
            ${mathDrill.idx + 1 < mathDrill.queue.length ? 'NEXT \u2192' : 'SEE RESULTS'}
        </button>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// RULE OF 4/2 QUESTION, SUBMIT, FEEDBACK
// ─────────────────────────────────────────────────────────────────────────────

function renderRule42Question(s) {
    const streetLabel = s.street === 'FLOP' ? 'Flop' : 'Turn';
    const rule = s.street === 'FLOP' ? 'Rule of 4' : 'Rule of 2';
    const mult = s.street === 'FLOP' ? 4 : 2;
    const btns = (s.choices || []).map(pct =>
        `<button onclick="submitRule42Answer(${pct})"
            class="py-5 md:py-8 rounded-2xl font-black text-2xl md:text-4xl bg-slate-800 border border-slate-700 text-slate-200 hover:border-indigo-500 hover:text-indigo-200 active:scale-[0.97] transition-all">
            ${pct}%
        </button>`
    ).join('');

    return `
    <div class="flex-1 flex flex-col justify-between items-center px-4 md:px-8 py-4 max-w-md md:max-w-2xl mx-auto w-full">
        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8">
            <div class="flex justify-between items-center mb-4 md:mb-6">
                <span class="text-slate-400 text-base md:text-xl">Outs</span>
                <span class="font-black text-slate-100 text-3xl md:text-5xl">${s.outs}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-slate-400 text-base md:text-xl">Street</span>
                <span class="font-black text-indigo-300 text-3xl md:text-5xl">${streetLabel}</span>
            </div>
        </div>
        <p class="text-base md:text-xl text-slate-200 text-center font-semibold">
            What is your approximate equity?
        </p>
        <div class="w-full grid grid-cols-2 gap-3">${btns}</div>
        <p class="text-[10px] md:text-sm text-slate-700 text-center italic">${rule}: outs \u00d7 ${mult}</p>
    </div>`;
}

function submitRule42Answer(pct) {
    if (mathDrill.answered) return;
    mathDrill.answered = true;
    const item    = mathDrill.queue[mathDrill.idx];
    const correct = pct === item.s.correctEquity;
    mathDrill.lastCorrect = correct;
    mathDrill.lastGrade   = correct ? 'good' : 'wrong';
    mathDrill.sessionTotal++;
    if (correct) mathDrill.sessionCorrect++;
    mathDrill.sessionLog.push({
        id: item.s.id, drillType: 'RULE_42',
        category: item.s.street, correct,
        answer: pct, correctEquity: item.s.correctEquity
    });
    try { SR.update(item.srKey, correct ? 'Good' : 'Again'); } catch(_) {}
    renderMathDrillView('feedback');
}

function renderRule42Feedback(s) {
    const correct = mathDrill.lastCorrect;
    const last    = mathDrill.sessionLog[mathDrill.sessionLog.length - 1];
    const chosen  = last ? last.answer : null;
    const streetLabel = s.street === 'FLOP' ? 'Flop' : 'Turn';
    const mult        = s.street === 'FLOP' ? 4 : 2;

    const resultBg  = correct ? 'bg-emerald-950/50 border-emerald-700/50' : 'bg-rose-950/50 border-rose-700/50';
    const resultCol = correct ? 'text-emerald-400' : 'text-rose-400';
    const icon      = correct ? '\u2713' : '\u2717';
    const verdict   = correct ? `${s.correctEquity}% \u2014 correct!` : `${s.correctEquity}% was the answer`;

    const pills = (s.choices || []).map(pct => {
        const isBest   = pct === s.correctEquity;
        const isChosen = pct === chosen;
        let bg = 'bg-slate-800 text-slate-600 border-slate-700';
        if (isBest)             bg = 'bg-emerald-900/60 text-emerald-300 border-emerald-600';
        else if (isChosen)      bg = 'bg-rose-950/50 text-rose-400 border-rose-700';
        const ring = isChosen ? ' ring-2 ring-white/30' : '';
        return `<span class="px-4 py-2.5 rounded-xl text-base font-black border ${bg}${ring}">${pct}%</span>`;
    }).join('');

    return `
    <div class="flex-1 flex flex-col justify-between items-center px-4 md:px-8 py-4 max-w-md md:max-w-2xl mx-auto w-full">
        <div class="w-full border ${resultBg} rounded-2xl p-4 text-center">
            <span class="text-lg md:text-2xl font-black ${resultCol}">${icon} ${verdict}</span>
        </div>
        <div class="flex gap-2 justify-center flex-wrap">${pills}</div>
        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-4">Rule of 4/2 worked out</p>
            <div class="flex flex-col gap-1.5 text-center">
                <p class="text-slate-500 text-sm">${s.outs} outs \u00d7 ${mult} (${streetLabel})</p>
                <p class="text-white font-black text-3xl md:text-5xl mt-1">${s.correctEquity}%</p>
            </div>
        </div>
        <div class="w-full bg-slate-900/40 border border-slate-800/50 rounded-xl px-4 py-3">
            <p class="text-[12px] md:text-sm text-slate-400 leading-relaxed">${s.explanation}</p>
        </div>
        <button onclick="advanceMathDrill()"
            class="w-full py-4 md:py-6 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-2xl font-black text-base md:text-xl transition-all">
            ${mathDrill.idx + 1 < mathDrill.queue.length ? 'NEXT \u2192' : 'SEE RESULTS'}
        </button>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// POT ODDS RATIO QUESTION, SUBMIT, FEEDBACK
// ─────────────────────────────────────────────────────────────────────────────

function renderPotRatioQuestion(s) {
    const btns = (s.choices || []).map(ratio =>
        `<button onclick="submitPotRatioAnswer('${ratio}')"
            class="py-5 md:py-8 rounded-2xl font-black text-2xl md:text-4xl bg-slate-800 border border-slate-700 text-slate-200 hover:border-indigo-500 hover:text-indigo-200 active:scale-[0.97] transition-all">
            ${ratio}
        </button>`
    ).join('');

    return `
    <div class="flex-1 flex flex-col justify-between items-center px-4 md:px-8 py-4 max-w-md md:max-w-2xl mx-auto w-full">
        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8">
            <div class="flex justify-between items-center mb-4 md:mb-6">
                <span class="text-slate-400 text-base md:text-xl">Pot</span>
                <span class="font-black text-slate-100 text-3xl md:text-5xl">$${s.pot}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-slate-400 text-base md:text-xl">Villain bets</span>
                <span class="font-black text-indigo-300 text-3xl md:text-5xl">$${s.bet}</span>
            </div>
        </div>
        <p class="text-base md:text-xl text-slate-200 text-center font-semibold">
            What pot odds are you getting?
        </p>
        <div class="w-full grid grid-cols-2 gap-3">${btns}</div>
        <p class="text-[10px] md:text-sm text-slate-700 text-center italic">Formula: (pot + bet) \u00f7 bet</p>
    </div>`;
}

function submitPotRatioAnswer(ratio) {
    if (mathDrill.answered) return;
    mathDrill.answered = true;
    const item    = mathDrill.queue[mathDrill.idx];
    const correct = ratio === item.s.correctRatio;
    mathDrill.lastCorrect = correct;
    mathDrill.lastGrade   = correct ? 'good' : 'wrong';
    mathDrill.sessionTotal++;
    if (correct) mathDrill.sessionCorrect++;
    mathDrill.sessionLog.push({
        id: item.s.id, drillType: 'POT_RATIO',
        category: item.s.sizingCategory, correct,
        answer: ratio, correctRatio: item.s.correctRatio
    });
    try { SR.update(item.srKey, correct ? 'Good' : 'Again'); } catch(_) {}
    renderMathDrillView('feedback');
}

function renderPotRatioFeedback(s) {
    const correct = mathDrill.lastCorrect;
    const last    = mathDrill.sessionLog[mathDrill.sessionLog.length - 1];
    const chosen  = last ? last.answer : null;

    const resultBg  = correct ? 'bg-emerald-950/50 border-emerald-700/50' : 'bg-rose-950/50 border-rose-700/50';
    const resultCol = correct ? 'text-emerald-400' : 'text-rose-400';
    const icon      = correct ? '\u2713' : '\u2717';
    const verdict   = correct ? `${s.correctRatio} \u2014 correct!` : `${s.correctRatio} was the answer`;

    const pills = (s.choices || []).map(ratio => {
        const isBest   = ratio === s.correctRatio;
        const isChosen = ratio === chosen;
        let bg = 'bg-slate-800 text-slate-600 border-slate-700';
        if (isBest)             bg = 'bg-emerald-900/60 text-emerald-300 border-emerald-600';
        else if (isChosen)      bg = 'bg-rose-950/50 text-rose-400 border-rose-700';
        const ring = isChosen ? ' ring-2 ring-white/30' : '';
        return `<span class="px-4 py-2.5 rounded-xl text-base font-black border ${bg}${ring}">${ratio}</span>`;
    }).join('');

    return `
    <div class="flex-1 flex flex-col justify-between items-center px-4 md:px-8 py-4 max-w-md md:max-w-2xl mx-auto w-full">
        <div class="w-full border ${resultBg} rounded-2xl p-4 text-center">
            <span class="text-lg md:text-2xl font-black ${resultCol}">${icon} ${verdict}</span>
        </div>
        <div class="flex gap-2 justify-center flex-wrap">${pills}</div>
        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-4">Formula worked out</p>
            <div class="flex flex-col gap-1.5 text-center">
                <p class="text-slate-500 text-sm">($${s.pot} + $${s.bet}) \u00f7 $${s.bet}</p>
                <p class="text-slate-400 text-base md:text-xl">$${s.pot + s.bet} \u00f7 $${s.bet}</p>
                <p class="text-white font-black text-3xl md:text-5xl mt-1">${s.correctRatio}</p>
            </div>
        </div>
        <div class="w-full bg-slate-900/40 border border-slate-800/50 rounded-xl px-4 py-3">
            <p class="text-[12px] md:text-sm text-slate-400 leading-relaxed">${s.explanation}</p>
        </div>
        <button onclick="advanceMathDrill()"
            class="w-full py-4 md:py-6 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-2xl font-black text-base md:text-xl transition-all">
            ${mathDrill.idx + 1 < mathDrill.queue.length ? 'NEXT \u2192' : 'SEE RESULTS'}
        </button>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// RATIO TO % QUESTION, SUBMIT, FEEDBACK
// ─────────────────────────────────────────────────────────────────────────────

function renderRatioPctQuestion(s) {
    const btns = (s.choices || []).map(pct =>
        `<button onclick="submitRatioPctAnswer(${pct})"
            class="py-5 md:py-8 rounded-2xl font-black text-2xl md:text-4xl bg-slate-800 border border-slate-700 text-slate-200 hover:border-indigo-500 hover:text-indigo-200 active:scale-[0.97] transition-all">
            ${pct}%
        </button>`
    ).join('');

    return `
    <div class="flex-1 flex flex-col justify-between items-center px-4 md:px-8 py-4 max-w-md md:max-w-2xl mx-auto w-full">
        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 text-center">
            <p class="text-slate-400 text-base md:text-xl mb-3">Pot odds you're getting</p>
            <p class="font-black text-slate-100 text-5xl md:text-7xl">${s.ratioDisplay}</p>
        </div>
        <p class="text-base md:text-xl text-slate-200 text-center font-semibold">
            What % equity do you need to call?
        </p>
        <div class="w-full grid grid-cols-2 gap-3">${btns}</div>
        <div class="w-full">
            <button id="rp-hint-btn" onclick="showRatioPctHint()"
                class="w-full py-2.5 rounded-xl text-[12px] font-bold text-amber-400 border border-amber-800/40 bg-amber-950/20 hover:bg-amber-900/30 active:scale-[0.98] transition-all">
                \ud83d\udca1 How do I convert this?
            </button>
            <div id="rp-hint-panel" class="hidden mt-2 bg-slate-900 border border-amber-800/30 rounded-xl px-4 py-3">
            </div>
        </div>
    </div>`;
}

function submitRatioPctAnswer(pct) {
    if (mathDrill.answered) return;
    mathDrill.answered = true;
    const item    = mathDrill.queue[mathDrill.idx];
    const correct = pct === item.s.correctPct;
    mathDrill.lastCorrect = correct;
    mathDrill.lastGrade   = correct ? 'good' : 'wrong';
    mathDrill.sessionTotal++;
    if (correct) mathDrill.sessionCorrect++;
    mathDrill.sessionLog.push({
        id: item.s.id, drillType: 'RATIO_PCT',
        category: 'RATIOS', correct,
        answer: pct, correctPct: item.s.correctPct
    });
    try { SR.update(item.srKey, correct ? 'Good' : 'Again'); } catch(_) {}
    renderMathDrillView('feedback');
}

function renderRatioPctFeedback(s) {
    const correct = mathDrill.lastCorrect;
    const last    = mathDrill.sessionLog[mathDrill.sessionLog.length - 1];
    const chosen  = last ? last.answer : null;

    const resultBg  = correct ? 'bg-emerald-950/50 border-emerald-700/50' : 'bg-rose-950/50 border-rose-700/50';
    const resultCol = correct ? 'text-emerald-400' : 'text-rose-400';
    const icon      = correct ? '\u2713' : '\u2717';
    const verdict   = correct ? `${s.correctPct}% \u2014 correct!` : `${s.correctPct}% was the answer`;

    const pills = (s.choices || []).map(pct => {
        const isBest   = pct === s.correctPct;
        const isChosen = pct === chosen;
        let bg = 'bg-slate-800 text-slate-600 border-slate-700';
        if (isBest)             bg = 'bg-emerald-900/60 text-emerald-300 border-emerald-600';
        else if (isChosen)      bg = 'bg-rose-950/50 text-rose-400 border-rose-700';
        const ring = isChosen ? ' ring-2 ring-white/30' : '';
        return `<span class="px-4 py-2.5 rounded-xl text-base font-black border ${bg}${ring}">${pct}%</span>`;
    }).join('');

    return `
    <div class="flex-1 flex flex-col justify-between items-center px-4 md:px-8 py-4 max-w-md md:max-w-2xl mx-auto w-full">
        <div class="w-full border ${resultBg} rounded-2xl p-4 text-center">
            <span class="text-lg md:text-2xl font-black ${resultCol}">${icon} ${verdict}</span>
        </div>
        <div class="flex gap-2 justify-center flex-wrap">${pills}</div>
        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-4">Conversion worked out</p>
            <div class="flex flex-col gap-1.5 text-center">
                <p class="text-slate-500 text-sm">1 \u00f7 (${s.ratio} + 1) = 1 \u00f7 ${s.ratio + 1}</p>
                <p class="text-white font-black text-3xl md:text-5xl mt-1">${s.correctPct}%</p>
            </div>
        </div>
        <div class="w-full bg-slate-900/40 border border-slate-800/50 rounded-xl px-4 py-3">
            <p class="text-[12px] md:text-sm text-slate-400 leading-relaxed">${s.explanation}</p>
        </div>
        <button onclick="advanceMathDrill()"
            class="w-full py-4 md:py-6 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-2xl font-black text-base md:text-xl transition-all">
            ${mathDrill.idx + 1 < mathDrill.queue.length ? 'NEXT \u2192' : 'SEE RESULTS'}
        </button>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADVANCE (next question or summary)
// ─────────────────────────────────────────────────────────────────────────────

function advanceMathDrill() {
    mathDrill.idx++;
    mathDrill.answered = false;
    mathDrill.lastCorrect = false;
    mathDrill.lastGrade = null;
    if (mathDrill.idx >= mathDrill.queue.length) {
        renderMathDrillView('summary');
    } else {
        renderMathDrillView('question');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY VIEW
// ─────────────────────────────────────────────────────────────────────────────

function renderSummaryView() {
    const total   = mathDrill.sessionTotal;
    const correct = mathDrill.sessionCorrect;
    const acc     = total ? Math.round(correct / total * 100) : 0;
    const accCol  = acc >= 80 ? 'text-emerald-400' : acc >= 60 ? 'text-yellow-400' : 'text-rose-400';

    // Category breakdown
    const cats = {};
    mathDrill.sessionLog.forEach(entry => {
        const key = entry.drillType + '|' + entry.category;
        if (!cats[key]) cats[key] = { correct: 0, total: 0, drillType: entry.drillType, category: entry.category };
        cats[key].total++;
        if (entry.correct) cats[key].correct++;
    });

    const catRows = Object.values(cats).map(c => {
        const cAcc = Math.round(c.correct / c.total * 100);
        const col  = cAcc >= 80 ? 'text-emerald-400' : cAcc >= 50 ? 'text-yellow-400' : 'text-rose-400';
        const catMeta = c.drillType === 'POT_MATH'     ? (POT_MATH_CATEGORIES?.[c.category]?.label    || c.category)
                      : c.drillType === 'POT_ODDS'     ? (POT_ODDS_CATEGORIES?.[c.category]?.label    || c.category)
                      : c.drillType === 'RULE_42'      ? (c.category === 'FLOP' ? 'Flop' : 'Turn')
                      : c.drillType === 'POT_RATIO'    ? (c.category.charAt(0).toUpperCase() + c.category.slice(1) + ' Bets')
                      : c.drillType === 'RATIO_PCT'    ? 'Ratio Conversion'
                      : c.drillType === 'OUT_COUNTING' ? (c.category.replace(/-/g, ' '))
                      : c.drillType === 'EQUITY_DEC'   ? (c.category.replace(/-/g, ' '))
                      : (BET_SIZING_CATEGORIES?.[c.category]?.label || c.category);
        const typeTag = c.drillType === 'POT_MATH'     ? 'PM'
                      : c.drillType === 'POT_ODDS'     ? 'PO'
                      : c.drillType === 'RULE_42'      ? 'R4'
                      : c.drillType === 'POT_RATIO'    ? 'PR'
                      : c.drillType === 'RATIO_PCT'    ? 'RP'
                      : c.drillType === 'OUT_COUNTING' ? 'OC'
                      : c.drillType === 'EQUITY_DEC'   ? 'ED'
                      : 'BS';
        return `<div class="flex items-center gap-2 py-2 border-b border-slate-800/30 last:border-0">
            <span class="text-[8px] font-bold text-slate-700 w-5 shrink-0">${typeTag}</span>
            <span class="text-[11px] text-slate-400 flex-1">${catMeta}</span>
            <span class="text-[11px] font-bold ${col}">${c.correct}/${c.total}</span>
        </div>`;
    }).join('');

    // Weakest category for recommendation
    const weakest = Object.values(cats).sort((a,b) => (a.correct/a.total) - (b.correct/b.total))[0];
    const _weakCatMap = weakest && (
        weakest.drillType === 'POT_MATH'  ? POT_MATH_CATEGORIES
      : weakest.drillType === 'POT_ODDS'  ? POT_ODDS_CATEGORIES
      : weakest.drillType === 'BET_SIZE'  ? BET_SIZING_CATEGORIES
      : null);
    const _weakCatLabel = weakest
        ? (weakest.drillType === 'RULE_42'      ? (weakest.category === 'FLOP' ? 'Flop (Rule of 4/2)' : 'Turn (Rule of 4/2)')
         : weakest.drillType === 'POT_RATIO'    ? (weakest.category.charAt(0).toUpperCase() + weakest.category.slice(1) + ' Bet Sizes')
         : weakest.drillType === 'RATIO_PCT'    ? 'Ratio Conversion'
         : weakest.drillType === 'OUT_COUNTING' ? (weakest.category.replace(/-/g, ' '))
         : weakest.drillType === 'EQUITY_DEC'   ? (weakest.category.replace(/-/g, ' ') + ' (equity decision)')
         : (_weakCatMap?.[weakest.category]?.label || weakest.category))
        : null;
    const weakLabel = weakest && weakest.correct < weakest.total ? _weakCatLabel : null;

    const againType = mathDrill.type;

    return `
    <div class="flex flex-col items-center gap-5 px-4 py-8 max-w-md md:max-w-2xl mx-auto w-full h-full overflow-y-auto">

        <!-- Score -->
        <div class="text-center">
            <p class="text-5xl font-black ${accCol}">${acc}%</p>
            <p class="text-slate-500 text-sm mt-1">${correct} of ${total} correct</p>
        </div>

        <!-- Category breakdown -->
        ${catRows.length > 1 ? `
        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <p class="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-slate-600 border-b border-slate-800">By Category</p>
            <div class="px-4 py-1">${catRows}</div>
        </div>` : ''}

        <!-- Recommendation -->
        ${weakLabel ? `
        <div class="w-full bg-indigo-950/40 border border-indigo-800/40 rounded-2xl px-4 py-3">
            <p class="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Focus Area</p>
            <p class="text-sm text-slate-300">${weakLabel} — drill this category again to lock it in.</p>
        </div>` : `
        <div class="w-full bg-emerald-950/40 border border-emerald-800/40 rounded-2xl px-4 py-3 text-center">
            <p class="text-sm text-emerald-300 font-bold">Clean session — strong work.</p>
        </div>`}

        <!-- Navigation -->
        <div class="w-full flex flex-col gap-3">
            <button onclick="startMathDrill('${againType}')"
                class="w-full py-4 md:py-6 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-2xl font-black text-base md:text-xl transition-all">
                Play Again
            </button>
            <button onclick="renderMathDrillView('menu')"
                class="w-full py-3 bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl font-bold text-slate-400 transition-all">
                Math Drills Menu
            </button>
        </div>

    </div>`;
}
