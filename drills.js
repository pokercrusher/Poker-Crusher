// drills.js — Math & Decision Drill Engine
// Depends on: scenarios.js (data), engine.js (SR, state), cloud.js (profileKey)
// Loaded last, after ui.js

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────

const mathDrill = {
    type: null,         // 'POT_ODDS' | 'BET_SIZE' | 'MIXED'
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
    return `<div class="flex flex-col items-center justify-between w-14 h-[80px] sm:w-16 sm:h-[90px] bg-white rounded-xl shadow-lg px-1.5 py-1.5 select-none">
        <span class="text-[15px] sm:text-[17px] font-black leading-none ${col} self-start">${rank}</span>
        <span class="text-[22px] sm:text-[26px] leading-none ${col}">${sym}</span>
        <span class="text-[15px] sm:text-[17px] font-black leading-none ${col} self-end rotate-180">${rank}</span>
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
        (BET_SIZING_SCENARIOS || []).forEach(s =>
            items.push({ s, srKey: 'BET_SIZE|' + s.id, drillType: 'BET_SIZE' }));
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

    // Light shuffle within same priority so sessions don't always start identically
    const tiers = [[], [], [], []];
    scored.forEach(x => tiers[x.priority].push(x));
    tiers.forEach(t => {
        for (let i = t.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [t[i], t[j]] = [t[j], t[i]];
        }
    });
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
        const typeLabel = item.drillType === 'POT_MATH'  ? 'Pot Odds Math'
                        : item.drillType === 'POT_ODDS'  ? 'Equity Recognition'
                        :                                  'Bet Sizing';
        if (titleEl) titleEl.textContent = typeLabel;
        if (progEl)  progEl.textContent  = `${mathDrill.idx + 1} / ${mathDrill.queue.length}`;
        content.innerHTML = item.drillType === 'POT_MATH'  ? renderPotMathQuestion(item.s)
                          : item.drillType === 'POT_ODDS'  ? renderPotOddsQuestion(item.s)
                          :                                  renderBetSizeQuestion(item.s);
    } else if (view === 'feedback') {
        const item = mathDrill.queue[mathDrill.idx];
        if (!item) return;
        if (titleEl) titleEl.textContent = mathDrill.lastCorrect ? '✓ Correct' : '✗ Review';
        if (progEl)  progEl.textContent  = `${mathDrill.idx + 1} / ${mathDrill.queue.length}`;
        content.innerHTML = item.drillType === 'POT_MATH'  ? renderPotMathFeedback(item.s)
                          : item.drillType === 'POT_ODDS'  ? renderPotOddsFeedback(item.s)
                          :                                  renderBetSizeFeedback(item.s);
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
    const now = Date.now();
    function dueCount(prefix, scenarios) {
        return (scenarios || []).filter(s => {
            const rec = SR.get(prefix + '|' + s.id);
            return !rec || !rec.totalAttempts || rec.dueAt <= now;
        }).length;
    }
    const pmDue  = dueCount('POT_MATH', POT_MATH_SCENARIOS);
    const poDue  = dueCount('POT_ODDS', POT_ODDS_SCENARIOS);
    const bsDue  = dueCount('BET_SIZE', BET_SIZING_SCENARIOS);
    const mixDue = pmDue + poDue + bsDue;

    function dueTag(n, total) {
        if (n === 0) return `<span class="text-[9px] text-emerald-400 font-bold">All caught up</span>`;
        if (n >= total) return `<span class="text-[9px] text-rose-400 font-bold">${n} due</span>`;
        return `<span class="text-[9px] text-yellow-400 font-bold">${n} due</span>`;
    }

    function drillCard(type, step, title, desc, detail, due, total) {
        return `
        <button onclick="startMathDrill('${type}')"
            class="w-full bg-slate-900 border border-slate-700 hover:border-indigo-500 active:scale-[0.98] rounded-2xl p-5 text-left transition-all">
            <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2">
                    <span class="text-[9px] font-black text-slate-600 bg-slate-800 rounded-full w-5 h-5 flex items-center justify-center shrink-0">${step}</span>
                    <span class="text-base font-black text-slate-100">${title}</span>
                </div>
                ${dueTag(due, total)}
            </div>
            <p class="text-[11px] text-slate-500 leading-snug pl-7">${desc}</p>
            <p class="text-[10px] text-indigo-400 font-bold mt-2 pl-7">${detail}</p>
        </button>`;
    }

    const totalAll = (POT_MATH_SCENARIOS||[]).length + (POT_ODDS_SCENARIOS||[]).length + (BET_SIZING_SCENARIOS||[]).length;

    return `
    <div class="flex flex-col items-center gap-4 px-4 py-8 max-w-md mx-auto w-full">
        <div class="text-center">
            <p class="text-2xl font-black text-slate-100">Poker Math</p>
            <p class="text-xs text-slate-500 mt-1">Build the instincts that cost you money at the table</p>
        </div>

        <div class="w-full flex flex-col gap-3">

            ${drillCard('POT_MATH', 1,
                'Pot Odds Math',
                'Given the pot and bet size, calculate the exact % equity you need to call. Pure arithmetic — no cards.',
                `${(POT_MATH_SCENARIOS||[]).length} scenarios \xb7 4 bet-size categories`,
                pmDue, (POT_MATH_SCENARIOS||[]).length)}

            ${drillCard('POT_ODDS', 2,
                'Equity Recognition',
                'You\u2019re shown a hand and board with the pot odds already calculated. Decide: does your hand have enough equity?',
                `${(POT_ODDS_SCENARIOS||[]).length} scenarios \xb7 6 hand categories`,
                poDue, (POT_ODDS_SCENARIOS||[]).length)}

            ${drillCard('BET_SIZE', 3,
                'Bet Sizing',
                'You have a hand \u2014 pick the right size. Dry vs. wet boards, river value, bluffs, SPR, position.',
                `${(BET_SIZING_SCENARIOS||[]).length} scenarios \xb7 7 categories`,
                bsDue, (BET_SIZING_SCENARIOS||[]).length)}

            <button onclick="startMathDrill('MIXED')"
                class="w-full bg-indigo-900/40 border border-indigo-700/50 hover:border-indigo-400 active:scale-[0.98] rounded-2xl p-4 text-left transition-all">
                <div class="flex items-start justify-between mb-1">
                    <span class="text-sm font-black text-indigo-200">Mixed Session</span>
                    ${dueTag(mixDue, totalAll)}
                </div>
                <p class="text-[11px] text-slate-400 pl-0">All three drill types in one session \u2014 recommended for daily practice.</p>
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
            class="py-5 rounded-2xl font-black text-2xl bg-slate-800 border border-slate-700 text-slate-200 hover:border-indigo-500 hover:text-indigo-200 active:scale-[0.97] transition-all">
            ${pct}%
        </button>`
    ).join('');

    return `
    <div class="flex flex-col items-center gap-6 px-4 py-8 max-w-md mx-auto w-full">

        <!-- Pot / bet display -->
        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div class="flex justify-between items-center mb-4">
                <span class="text-slate-400 text-base">Pot</span>
                <span class="font-black text-slate-100 text-3xl">$${s.pot}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-slate-400 text-base">Villain bets</span>
                <span class="font-black text-indigo-300 text-3xl">$${s.bet}</span>
            </div>
            <div class="border-t border-slate-800 mt-4 pt-3 flex justify-between text-sm text-slate-600">
                <span>Pot if you call</span>
                <span>$${totalIfCall}</span>
            </div>
        </div>

        <!-- Question -->
        <p class="text-base text-slate-200 text-center font-semibold">
            What % equity do you need to call?
        </p>

        <!-- Multiple choice -->
        <div class="w-full grid grid-cols-2 gap-3">${btns}</div>

        <p class="text-[10px] text-slate-700 text-center italic">Formula: bet \u00f7 (pot + 2\u00d7bet)</p>
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
    <div class="flex flex-col items-center gap-5 px-4 py-6 max-w-md mx-auto w-full">

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
                class="py-5 rounded-2xl font-black text-base bg-rose-900/50 border border-rose-700/60 text-rose-200 hover:bg-rose-800/60 active:scale-[0.97] transition-all">
                FOLD
            </button>
            <button onclick="submitPotOddsAnswer('CALL')"
                class="py-5 rounded-2xl font-black text-base bg-emerald-900/50 border border-emerald-700/60 text-emerald-200 hover:bg-emerald-800/60 active:scale-[0.97] transition-all">
                CALL
            </button>
        </div>

    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BET SIZING QUESTION
// ─────────────────────────────────────────────────────────────────────────────

function renderBetSizeQuestion(s) {
    const streetLabel = { FLOP: 'Flop', TURN: 'Turn', RIVER: 'River' }[s.street] || s.street;
    const catLabel    = (BET_SIZING_CATEGORIES && BET_SIZING_CATEGORIES[s.category])
        ? BET_SIZING_CATEGORIES[s.category].label : s.category;
    const posLabel    = s.position === 'IP' ? 'In position' : 'Out of position';
    const spr         = s.stackBehind ? (s.stackBehind / s.potSize).toFixed(1) : null;

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
            class="py-3 rounded-xl font-black text-sm bg-slate-800 border border-slate-700 text-slate-200 hover:border-indigo-500 hover:text-indigo-200 active:scale-[0.97] transition-all">
            ${b.label}
        </button>`
    ).join('');

    return `
    <div class="flex flex-col items-center gap-5 px-4 py-6 max-w-md mx-auto w-full">

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

        <!-- Situation info -->
        <div class="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
            <div class="flex justify-between text-sm">
                <span class="text-slate-400">Pot</span>
                <span class="font-black text-slate-200">$${s.potSize}</span>
            </div>
            <div class="flex justify-between text-sm">
                <span class="text-slate-400">Position</span>
                <span class="font-black text-slate-200">${posLabel}</span>
            </div>
            ${s.stackBehind ? `
            <div class="flex justify-between text-sm">
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
        category: s.category, correct,
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
    <div class="flex flex-col items-center gap-4 px-4 py-6 max-w-md mx-auto w-full">

        <!-- Result banner -->
        <div class="w-full border ${resultBg} rounded-2xl p-4 text-center">
            <span class="text-lg font-black ${resultCol}">${resultIcon} ${verdict}</span>
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
            <p class="text-[12px] text-slate-400 leading-relaxed">${s.explanation}</p>
        </div>

        <!-- Next button -->
        <button onclick="advanceMathDrill()"
            class="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-2xl font-black text-base transition-all">
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
    <div class="flex flex-col items-center gap-4 px-4 py-6 max-w-md mx-auto w-full">

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
            <div class="flex flex-wrap gap-2">${sizePills}</div>
            <div class="flex gap-4 mt-3 text-[9px] text-slate-600">
                <span><span class="text-emerald-400 font-bold">Green</span> = best</span>
                <span><span class="text-yellow-400 font-bold">Yellow</span> = ok</span>
                <span><span class="text-rose-600 font-bold">Red</span> = avoid</span>
            </div>
        </div>

        <!-- Explanation -->
        <div class="w-full bg-slate-900/40 border border-slate-800/50 rounded-xl px-4 py-3">
            <p class="text-[12px] text-slate-400 leading-relaxed">${s.explanation}</p>
        </div>

        <!-- Next button -->
        <button onclick="advanceMathDrill()"
            class="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-2xl font-black text-base transition-all">
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
    <div class="flex flex-col items-center gap-4 px-4 py-6 max-w-md mx-auto w-full">

        <!-- Result banner -->
        <div class="w-full border ${resultBg} rounded-2xl p-4 text-center">
            <span class="text-lg font-black ${resultCol}">${icon} ${verdict}</span>
        </div>

        <!-- Choice review -->
        <div class="flex gap-2 justify-center flex-wrap">${pills}</div>

        <!-- Formula breakdown -->
        <div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p class="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-4">Formula worked out</p>
            <div class="flex flex-col gap-1.5 text-center">
                <p class="text-slate-500 text-sm">bet \u00f7 (pot + 2 \u00d7 bet)</p>
                <p class="text-slate-400 text-base">$${s.bet} \u00f7 ($${s.pot} + $${s.bet * 2})</p>
                <p class="text-slate-300 text-base">$${s.bet} \u00f7 $${totalIfCall}</p>
                <p class="text-white font-black text-3xl mt-1">${s.correctPct}%</p>
            </div>
        </div>

        <!-- Explanation -->
        <div class="w-full bg-slate-900/40 border border-slate-800/50 rounded-xl px-4 py-3">
            <p class="text-[12px] text-slate-400 leading-relaxed">${s.explanation}</p>
        </div>

        <!-- Next -->
        <button onclick="advanceMathDrill()"
            class="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-2xl font-black text-base transition-all">
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
        const catMeta = c.drillType === 'POT_MATH'
            ? (POT_MATH_CATEGORIES    && POT_MATH_CATEGORIES[c.category]    ? POT_MATH_CATEGORIES[c.category].label    : c.category)
            : c.drillType === 'POT_ODDS'
            ? (POT_ODDS_CATEGORIES    && POT_ODDS_CATEGORIES[c.category]    ? POT_ODDS_CATEGORIES[c.category].label    : c.category)
            : (BET_SIZING_CATEGORIES  && BET_SIZING_CATEGORIES[c.category]  ? BET_SIZING_CATEGORIES[c.category].label  : c.category);
        const typeTag = c.drillType === 'POT_MATH' ? 'PM' : c.drillType === 'POT_ODDS' ? 'PO' : 'BS';
        return `<div class="flex items-center gap-2 py-2 border-b border-slate-800/30 last:border-0">
            <span class="text-[8px] font-bold text-slate-700 w-5 shrink-0">${typeTag}</span>
            <span class="text-[11px] text-slate-400 flex-1">${catMeta}</span>
            <span class="text-[11px] font-bold ${col}">${c.correct}/${c.total}</span>
        </div>`;
    }).join('');

    // Weakest category for recommendation
    const weakest = Object.values(cats).sort((a,b) => (a.correct/a.total) - (b.correct/b.total))[0];
    const weakLabel = weakest && weakest.correct < weakest.total
        ? ((weakest.drillType === 'POT_MATH' ? POT_MATH_CATEGORIES
            : weakest.drillType === 'POT_ODDS' ? POT_ODDS_CATEGORIES
            : BET_SIZING_CATEGORIES)?.[weakest.category]?.label || weakest.category)
        : null;

    const againType = mathDrill.type;

    return `
    <div class="flex flex-col items-center gap-5 px-4 py-8 max-w-md mx-auto w-full">

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
                class="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-2xl font-black text-base transition-all">
                DRILL AGAIN
            </button>
            <button onclick="exitMathDrill()"
                class="w-full py-3 bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl font-bold text-slate-400 transition-all">
                HOME
            </button>
        </div>

    </div>`;
}
