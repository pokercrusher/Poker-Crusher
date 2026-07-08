// poker-room-ui.js — Pass 4: Poker Room lobby UI
// Renders into #poker-room-body inside #poker-room-screen (index.html).
// Engine + persistence live in poker-room.js; this file is presentation only.
// All user-derived strings (villain names) pass through escapeHtml.

'use strict';

const PRUI_AVATARS = ['🐻', '🦊', '🦅', '🦈', '🐺', '🦁', '🐸', '🐙', '🐴', '🐹'];
const PRUI_TYPE_LABELS = {
    NIT: 'Nit', TAG: 'TAG', LAG: 'LAG', FISH: 'Fish', MANIAC: 'Maniac', AGGRO: 'Aggro',
};
const PRUI_TYPE_COLORS = {
    NIT: '#64748b', TAG: '#38bdf8', LAG: '#f472b6', FISH: '#4ade80', MANIAC: '#f87171', AGGRO: '#fb923c',
};
const PRUI_NAME_MAX = 14;

// UI state: room = persisted state; draft = lobby selections; session = live session
const PRUI = {
    room: null,
    draft: { stake: '1/2', seatCount: 9, buyIn: null, typeWeights: null, tableConfig: null },
    session: null,
};

function PRUI_fmt$(n) {
    const v = (typeof n === 'number' && isFinite(n)) ? n : 0;
    return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function PRUI_defaultBuyIn(stake, bankroll) {
    const cfg = PR_STAKE_CONFIG[stake];
    const hundredBB = cfg.bb * 100;
    return Math.max(cfg.minBuy, Math.min(cfg.maxBuy, Math.min(hundredBB, Math.floor(bankroll))));
}

// ---------------------------------------------------------------------------
// Entry / navigation
// ---------------------------------------------------------------------------
function PRUI_show() {
    PRUI.room = PR_loadRoomState();
    if (!PRUI.draft.tableConfig) {
        PRUI.draft.stake = PRUI.room.stake;
        PRUI.draft.tableConfig = PRUI.room.tableConfig && PRUI.room.tableConfig.stake === PRUI.draft.stake
            ? PRUI.room.tableConfig
            : PR_generateTableConfig(PRUI.draft.stake, PRUI.draft.seatCount, PRUI.draft.typeWeights, PRUI.room.regulars);
        PRUI.draft.seatCount = PRUI.draft.tableConfig.seatCount;
    }
    if (PRUI.draft.buyIn === null) {
        PRUI.draft.buyIn = PRUI_defaultBuyIn(PRUI.draft.stake, PRUI.room.bankroll);
    }
    hideAllScreens();
    document.getElementById('poker-room-screen').classList.remove('hidden');
    PRUI_render();
}

function PRUI_exit() {
    if (typeof showMenu === 'function') showMenu();
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function PRUI_render() {
    const body = document.getElementById('poker-room-body');
    if (!body) return;
    // The live table (poker-room-table.js) owns rendering while a session runs
    if (PRUI.session && typeof PRT !== 'undefined' && PRT.active) return;
    body.innerHTML = PRUI_lobbyHtml();
}

function PRUI_headerHtml(subtitle) {
    return '' +
        '<div class="flex items-center justify-between">' +
            '<div class="text-left">' +
                '<p class="pc-eyebrow text-amber-400/80">' + subtitle + '</p>' +
                '<h2 class="pc-title mt-0.5">Poker Room</h2>' +
            '</div>' +
            '<button data-pr="exit" class="pc-btn-utility px-3 py-2 text-xs">Back</button>' +
        '</div>';
}

function PRUI_lobbyHtml() {
    const room = PRUI.room;
    const cfg = PR_STAKE_CONFIG[PRUI.draft.stake];
    const buyIn = PRUI.draft.buyIn;
    const canSit = buyIn >= cfg.minBuy && buyIn <= cfg.maxBuy && buyIn <= room.bankroll;
    const busted = room.bankroll < cfg.minBuy;

    // Stake chips
    const stakeChips = Object.keys(PR_STAKE_CONFIG).map(function(k) {
        const active = k === PRUI.draft.stake;
        return '<button data-pr="stake" data-stake="' + k + '" class="px-3 py-2 rounded-xl text-xs font-black transition-all ' +
            (active ? 'bg-amber-600 text-white' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:border-amber-500') +
            '">' + k + '</button>';
    }).join('');

    // Seat count selector (2–9 players, including hero)
    const seatOpts = [];
    for (let n = 2; n <= 9; n++) {
        seatOpts.push('<option value="' + n + '"' + (n === PRUI.draft.seatCount ? ' selected' : '') +
            '>' + n + ' players (you + ' + (n - 1) + ')</option>');
    }

    // Type distribution editor
    const weights = PRUI.draft.typeWeights || {};
    const typeRows = Object.keys(PRUI_TYPE_LABELS).map(function(t) {
        const w = weights[t] !== undefined ? weights[t] : 1;
        return '<div class="flex items-center justify-between py-1">' +
            '<span class="text-[11px] font-bold" style="color:' + PRUI_TYPE_COLORS[t] + '">' + PRUI_TYPE_LABELS[t] + '</span>' +
            '<div class="flex items-center gap-2">' +
                '<button data-pr="weight" data-type="' + t + '" data-delta="-1" class="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-black">−</button>' +
                '<span class="w-4 text-center text-xs font-black text-slate-200">' + w + '</span>' +
                '<button data-pr="weight" data-type="' + t + '" data-delta="1" class="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-black">+</button>' +
            '</div></div>';
    }).join('');

    // Your seat — pinned first, visually distinct. Profile persists with the room.
    const hero = room.heroProfile;
    const heroRow =
        '<div class="flex items-center gap-2 py-2 px-2 -mx-2 rounded-xl bg-amber-500/10 border border-amber-500/30">' +
            '<button data-pr="hero-avatar" class="w-9 h-9 rounded-xl bg-slate-800 text-lg shrink-0" title="Change your avatar">' +
                escapeHtml(hero.avatar) +
            '</button>' +
            '<div class="flex-1 min-w-0">' +
                '<input data-pr="hero-name" value="' + escapeHtml(hero.name) + '" maxlength="' + PRUI_NAME_MAX + '" ' +
                    'class="w-full bg-transparent text-[13px] font-bold text-amber-200 outline-none border-b border-transparent focus:border-amber-500/50" />' +
                '<div class="text-[9px] text-amber-500/70 font-bold uppercase tracking-wider">Your seat · buys in ' + Math.round(buyIn / cfg.bb) + 'bb</div>' +
            '</div>' +
            '<span class="text-[10px] font-black px-2 py-1 rounded-lg text-amber-300 bg-slate-950/60">YOU</span>' +
        '</div>';

    // Villain rows — no position labels (positions rotate with the button every
    // hand) and no player types: reading your opponents is the gameplay. The
    // mix editor shapes the distribution; who's who stays hidden.
    const seatRows = PRUI.draft.tableConfig.villains.map(function(villain, i) {
        return '<div class="flex items-center gap-2 py-1.5 border-b border-slate-800/60">' +
            '<button data-pr="avatar" data-idx="' + i + '" class="w-9 h-9 rounded-xl bg-slate-800 text-lg shrink-0" title="Change avatar">' +
                (PRUI_AVATARS.includes(villain.avatar) ? villain.avatar : PRUI_AVATARS[i % PRUI_AVATARS.length]) +
            '</button>' +
            '<div class="flex-1 min-w-0">' +
                '<input data-pr="name" data-idx="' + i + '" value="' + escapeHtml(villain.name) + '" maxlength="' + PRUI_NAME_MAX + '" ' +
                    'class="w-full bg-transparent text-[13px] font-bold text-slate-200 outline-none border-b border-transparent focus:border-amber-500/50" />' +
                '<div class="text-[9px] text-slate-500 font-bold uppercase tracking-wider">' + villain.stackBB + 'bb stack</div>' +
            '</div>' +
        '</div>';
    }).join('');

    // Recent sessions
    const history = (room.sessionHistory || []).slice(0, 3).map(function(h) {
        const pos = h.netDollars >= 0;
        return '<div class="flex justify-between text-[11px] py-0.5">' +
            '<span class="text-slate-500">' + escapeHtml(h.date) + ' · ' + escapeHtml(h.stake) + ' · ' + h.handsPlayed + ' hands</span>' +
            '<span class="font-bold" style="color:' + (pos ? '#4ade80' : '#f87171') + '">' + (pos ? '+' : '') + PRUI_fmt$(h.netDollars) + '</span>' +
        '</div>';
    }).join('');

    return PRUI_headerHtml('Play vs AI') +

        // Bankroll
        '<div class="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">' +
            '<div><p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Bankroll</p>' +
            '<p class="text-2xl font-black text-amber-300">' + PRUI_fmt$(room.bankroll) + '</p></div>' +
            (busted
                ? '<button data-pr="topup" class="pc-btn-utility px-3 py-2 text-xs">Top up to ' + PRUI_fmt$(PR_DEFAULT_BANKROLL) + '</button>'
                : '<div class="text-right text-[10px] text-slate-500">' +
                    (room.allTimeStats.handsPlayed || 0) + ' hands all-time<br>' +
                    'net ' + (room.allTimeStats.totalNetBB >= 0 ? '+' : '') + (room.allTimeStats.totalNetBB || 0) + 'bb</div>') +
        '</div>' +

        // Stake + buy-in
        '<div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">' +
            '<div class="flex items-center justify-between">' +
                '<p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Stakes</p>' +
                '<div class="flex gap-1.5">' + stakeChips + '</div>' +
            '</div>' +
            '<div class="flex items-center justify-between gap-3">' +
                '<div class="flex-1">' +
                    '<p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Buy-in (' + PRUI_fmt$(cfg.minBuy) + '–' + PRUI_fmt$(cfg.maxBuy) + ')</p>' +
                    '<input data-pr="buyin" type="range" min="' + cfg.minBuy + '" max="' + cfg.maxBuy + '" step="' + cfg.bb * 5 + '" value="' + buyIn + '" class="w-full mt-1" />' +
                '</div>' +
                '<div class="text-right shrink-0">' +
                    '<p class="text-lg font-black text-slate-100">' + PRUI_fmt$(buyIn) + '</p>' +
                    '<p class="text-[10px] text-slate-500 font-bold">' + Math.round(buyIn / cfg.bb) + 'bb</p>' +
                '</div>' +
            '</div>' +
            '<div class="flex items-center justify-between">' +
                '<p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Table size</p>' +
                '<select data-pr="seats" class="bg-slate-800 text-slate-200 text-xs font-bold rounded-lg px-2 py-1.5">' + seatOpts.join('') + '</select>' +
            '</div>' +
        '</div>' +

        // Type distribution (collapsible)
        '<details class="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">' +
            '<summary class="text-[10px] text-slate-500 font-bold uppercase tracking-widest cursor-pointer select-none">Player type mix (applies on shuffle)</summary>' +
            '<div class="mt-2">' + typeRows + '</div>' +
        '</details>' +

        // Table preview / seat editor
        '<div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">' +
            '<div class="flex items-center justify-between mb-2">' +
                '<p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Your table</p>' +
                '<button data-pr="shuffle" class="pc-btn-utility px-3 py-1.5 text-[11px]">↻ Shuffle opponents</button>' +
            '</div>' +
            heroRow +
            '<div class="mt-1">' + seatRows + '</div>' +
            '<p class="text-[9px] text-slate-600 mt-2">Tap an avatar to change it · tap a name to rename · seats rotate with the button, player types stay hidden</p>' +
        '</div>' +

        // Table style — live cardroom sizing (default) vs online solver sizing
        '<div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">' +
            '<p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Table style</p>' +
            '<div class="grid grid-cols-2 gap-2 mt-2">' +
                '<button data-pr="sizing" data-val="live" class="py-2.5 rounded-xl text-xs font-black transition-all ' +
                    (room.sizing !== 'online' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-800 border border-slate-700 text-slate-500') +
                    '">LIVE<span class="block text-[9px] font-bold opacity-80">3bb opens · +1/limper</span></button>' +
                '<button data-pr="sizing" data-val="online" class="py-2.5 rounded-xl text-xs font-black transition-all ' +
                    (room.sizing === 'online' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-800 border border-slate-700 text-slate-500') +
                    '">ONLINE<span class="block text-[9px] font-bold opacity-80">2.5bb opens</span></button>' +
            '</div>' +
        '</div>' +

        // Study mode — opt-in bridge to the trainer's spaced repetition
        '<div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">' +
            '<div class="flex-1">' +
                '<p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Study mode</p>' +
                '<p class="text-[10px] text-slate-600 leading-snug mt-0.5">Mistakes at the table quietly join your trainer review queue. Playing a spot well counts as a review. Never interrupts play.</p>' +
            '</div>' +
            '<button data-pr="study" class="px-3 py-2 rounded-xl text-xs font-black transition-all ' +
                (room.studyMode ? 'bg-emerald-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-500') +
                '">' + (room.studyMode ? 'ON' : 'OFF') + '</button>' +
        '</div>' +

        // Sit down
        '<button data-pr="sit" class="w-full py-4 rounded-2xl font-black text-base transition-all shadow-lg ' +
            (canSit ? 'bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed') +
            '"' + (canSit ? '' : ' disabled') + '>SIT DOWN — ' + PRUI_fmt$(buyIn) + '</button>' +
        (canSit ? '' : '<p class="text-[10px] text-rose-400/80 text-center -mt-2">' +
            (buyIn > room.bankroll ? 'Bankroll too small for this buy-in.' : 'Buy-in outside the allowed range.') + '</p>') +

        // History
        (history ? '<div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">' +
            '<p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Recent sessions</p>' + history + '</div>' : '');
}

// ---------------------------------------------------------------------------
// Event wiring — one delegated listener each for click / input / change
// ---------------------------------------------------------------------------
function PRUI_onClick(e) {
    const el = e.target.closest('[data-pr]');
    if (!el) return;
    const kind = el.dataset.pr;

    if (kind === 'exit') {
        PRUI_exit();
    } else if (kind === 'stake') {
        const stake = el.dataset.stake;
        if (!PR_STAKE_CONFIG[stake]) return;
        PRUI.draft.stake = stake;
        PRUI.draft.buyIn = PRUI_defaultBuyIn(stake, PRUI.room.bankroll);
        PRUI.draft.tableConfig = PR_generateTableConfig(stake, PRUI.draft.seatCount, PRUI.draft.typeWeights, PRUI.room.regulars);
        PRUI_render();
    } else if (kind === 'weight') {
        const t = el.dataset.type;
        const w = PRUI.draft.typeWeights || (PRUI.draft.typeWeights = { NIT: 1, TAG: 1, LAG: 1, FISH: 1, MANIAC: 1, AGGRO: 1 });
        w[t] = Math.max(0, Math.min(5, (w[t] !== undefined ? w[t] : 1) + parseInt(el.dataset.delta, 10)));
        PRUI_render();
    } else if (kind === 'shuffle') {
        PRUI.draft.tableConfig = PR_generateTableConfig(PRUI.draft.stake, PRUI.draft.seatCount, PRUI.draft.typeWeights, PRUI.room.regulars);
        PRUI_render();
    } else if (kind === 'avatar') {
        const villain = PRUI.draft.tableConfig.villains[parseInt(el.dataset.idx, 10)];
        if (!villain) return;
        const cur = PRUI_AVATARS.indexOf(villain.avatar);
        villain.avatar = PRUI_AVATARS[(cur + 1) % PRUI_AVATARS.length];
        // Regulars keep their face across sessions — persist the change
        if (PRUI.room.regulars && PRUI.room.regulars[villain.name]) {
            PRUI.room.regulars[villain.name].avatar = villain.avatar;
            PR_saveRoomState(PRUI.room);
        }
        PRUI_render();
    } else if (kind === 'hero-avatar') {
        const cur = PRUI_AVATARS.indexOf(PRUI.room.heroProfile.avatar);
        PRUI.room.heroProfile.avatar = PRUI_AVATARS[(cur + 1) % PRUI_AVATARS.length];
        PR_saveRoomState(PRUI.room);
        PRUI_render();
    } else if (kind === 'topup') {
        PRUI.room = PR_topUpBankroll(PRUI.room);
        PRUI.draft.buyIn = PRUI_defaultBuyIn(PRUI.draft.stake, PRUI.room.bankroll);
        PRUI_render();
    } else if (kind === 'study') {
        PRUI.room.studyMode = !PRUI.room.studyMode;
        PR_saveRoomState(PRUI.room);
        PRUI_render();
    } else if (kind === 'sizing') {
        PRUI.room.sizing = el.dataset.val === 'online' ? 'online' : 'live';
        PR_saveRoomState(PRUI.room);
        PRUI_render();
    } else if (kind === 'sit') {
        const r = PR_buyIn(PRUI.room, PRUI.draft.stake, PRUI.draft.buyIn);
        if (!r.ok) {
            if (typeof showToast === 'function') showToast(r.error, 'incorrect', 2200);
            return;
        }
        PRUI.room = r.state;
        PRUI.room.tableConfig = PRUI.draft.tableConfig;
        PR_saveRoomState(PRUI.room);
        PRUI.session = r.session;
        PRT_enter(PRUI.room, PRUI.session, PRUI.draft.tableConfig);
    }
}

function PRUI_onInput(e) {
    const el = e.target.closest('[data-pr]');
    if (!el) return;
    if (el.dataset.pr === 'name') {
        const villain = PRUI.draft.tableConfig.villains[parseInt(el.dataset.idx, 10)];
        if (villain) villain.name = el.value.slice(0, PRUI_NAME_MAX);
        // no re-render while typing — the input holds focus
    } else if (el.dataset.pr === 'hero-name') {
        PRUI.room.heroProfile.name = el.value.slice(0, PRUI_NAME_MAX) || 'You';
        PR_saveRoomState(PRUI.room);
        // no re-render while typing — the input holds focus
    } else if (el.dataset.pr === 'buyin') {
        PRUI.draft.buyIn = parseInt(el.value, 10) || PRUI.draft.buyIn;
        PRUI_renderBuyInLabelOnly(el);
    }
}

// Live-update the buy-in figures without a full re-render (slider keeps focus)
function PRUI_renderBuyInLabelOnly(slider) {
    const cfg = PR_STAKE_CONFIG[PRUI.draft.stake];
    const wrap = slider.closest('div.flex-1');
    const right = wrap && wrap.parentElement.querySelector('.text-right');
    if (right) {
        right.innerHTML = '<p class="text-lg font-black text-slate-100">' + PRUI_fmt$(PRUI.draft.buyIn) + '</p>' +
            '<p class="text-[10px] text-slate-500 font-bold">' + Math.round(PRUI.draft.buyIn / cfg.bb) + 'bb</p>';
    }
}

function PRUI_onChange(e) {
    const el = e.target.closest('[data-pr]');
    if (!el) return;
    if (el.dataset.pr === 'seats') {
        PRUI.draft.seatCount = parseInt(el.value, 10) || 9;
        PRUI.draft.tableConfig = PR_generateTableConfig(PRUI.draft.stake, PRUI.draft.seatCount, PRUI.draft.typeWeights, PRUI.room.regulars);
        PRUI_render();
    } else if (el.dataset.pr === 'buyin') {
        PRUI_render(); // settle full render once the slider is released
    }
}

// ---------------------------------------------------------------------------
// Bootstrap — deferred script, DOM is ready at execute time
// ---------------------------------------------------------------------------
(function PRUI_init() {
    const menuBtn = document.getElementById('btn-poker-room');
    if (menuBtn) menuBtn.addEventListener('click', PRUI_show);
    const body = document.getElementById('poker-room-body');
    if (body) {
        body.addEventListener('click', PRUI_onClick);
        body.addEventListener('input', PRUI_onInput);
        body.addEventListener('change', PRUI_onChange);
    }
})();
