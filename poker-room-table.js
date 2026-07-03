// poker-room-table.js — Pass 5: the live Poker Room table.
// One state-driven renderer + one cancellable async loop per hand. No
// setTimeout choreography: every action mutates engine state, then the whole
// table re-renders from that state. Speed is a single delay scalar.
// Spectator mode after hero folds falls out of the same loop for free.
// Engine: poker-room.js · lobby: poker-room-ui.js · styles: tailwind + index.html

'use strict';

const PRT_SPEEDS = { slow: 1200, normal: 700, fast: 300 };
const PRT_SPEED_KEY = 'pc_pr_speed_v1';
const PRT_SUITS = { h: '♥', d: '♦', c: '♣', s: '♠' };

const PRT = {
    active: false,
    token: 0,           // bumps on enter/leave/new-hand; stale loops abort
    hand: null,         // current prHand
    session: null,
    cfg: null,          // tableConfig (villains carry persistent stacks/stats)
    room: null,
    offset: -1,         // position rotation; ++ each hand moves the button
    handNo: 0,
    speed: 'normal',
    pendingAction: null, // resolver while waiting on hero
    lastGrade: null,     // most recent hero grade (indicator chip)
    banner: null,        // end-of-hand banner text
    revealAll: false,    // showdown reveal state
};

function PRT_delay(ms) {
    return new Promise(function(res) { setTimeout(res, ms); });
}

function PRT_speedMs() { return PRT_SPEEDS[PRT.speed] || 700; }

function PRT_bb$() { return PR_STAKE_CONFIG[PRT.session.stake].bb; }

function PRT_fmtBB(n) {
    const v = Math.round(n * 10) / 10;
    return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + 'bb';
}

// ---------------------------------------------------------------------------
// Enter / leave
// ---------------------------------------------------------------------------
function PRT_enter(room, session, tableConfig) {
    PRT.active = true;
    PRT.token++;
    PRT.room = room;
    PRT.session = session;
    PRT.cfg = tableConfig;
    PRT.offset = -1;
    PRT.handNo = 0;
    PRT.lastGrade = null;
    try {
        const sp = localStorage.getItem(PRT_SPEED_KEY);
        if (PRT_SPEEDS[sp]) PRT.speed = sp;
    } catch (_) {}
    PRT_dealNext();
}

function PRT_leave() {
    PRT.token++; // cancel any running loop
    PRT.active = false;
    PRT.pendingAction = null;
    PRUI.room = PR_endSession(PRT.room, PRT.session);
    PRUI.session = null;
    PRUI.draft.buyIn = null; // recompute from the fresh bankroll
    PRUI_show();
}

// ---------------------------------------------------------------------------
// Hand loop
// ---------------------------------------------------------------------------
async function PRT_dealNext() {
    const myToken = ++PRT.token;
    PRT.banner = null;
    PRT.revealAll = false;
    PRT.offset++;
    PRT.handNo++;

    const built = PR_buildHandSeatsRotated(PRT.cfg, PRT.room.heroProfile, PRT.offset, PRT.session.stackBB);
    let hand = PR_createHand({ heroPos: built.heroPos, seats: built.seats, heroStackBB: PRT.session.stackBB });
    PRT.hand = hand;
    PRT_render();
    await PRT_delay(PRT_speedMs());
    if (myToken !== PRT.token) return;

    const heroLabel = built.heroPos;
    let guard = 0;

    while (guard++ < 300) {
        if (myToken !== PRT.token) return;
        hand = PRT.hand;

        if (hand.terminal) break;

        if (PR_isStreetComplete(hand)) {
            PRT.hand = PR_advanceStreet(hand);
            PRT_render();
            await PRT_delay(PRT_speedMs() * 1.3);
            continue;
        }

        const next = _PR_nextActor(hand);
        if (next === null) { PRT.hand = PR_advanceStreet(hand); PRT_render(); continue; }

        if (next === heroLabel && !hand.heroFolded) {
            const choice = await PRT_awaitHero(myToken);
            if (myToken !== PRT.token) return;
            PRT.hand = PR_applyHeroAction(PRT.hand, choice.action, choice.sizingBB);
            const g = PRT.hand.heroGrades[PRT.hand.heroGrades.length - 1];
            PRT.lastGrade = g || null;
            PRT_feedSR(g);
            PRT_render();
            await PRT_delay(Math.min(400, PRT_speedMs()));
        } else {
            PRT.hand = PR_applyVillainAction(hand);
            PRT_render();
            await PRT_delay(PRT_speedMs());
        }
    }

    if (myToken !== PRT.token) return;
    await PRT_settle(myToken);
}

// Wait for a hero button press (resolved in the click handler)
function PRT_awaitHero(myToken) {
    return new Promise(function(resolve) {
        PRT.pendingAction = function(choice) {
            if (myToken !== PRT.token) return;
            PRT.pendingAction = null;
            resolve(choice);
        };
        PRT_render();
    });
}

// ---------------------------------------------------------------------------
// Hand settlement: pots → stacks, session, persistence, next hand
// ---------------------------------------------------------------------------
async function PRT_settle(myToken) {
    const hand = PRT.hand;
    const outcome = hand.outcome || { pots: [], heroNetBB: 0 };
    const heroLabel = hand.seats[hand.heroSeatIndex].label;

    // Reveal + banner
    PRT.revealAll = true;
    const heroNet = outcome.heroNetBB || 0;
    const winners = [];
    (outcome.pots || []).forEach(function(pot) {
        (pot.winners || []).forEach(function(w) { if (!winners.includes(w)) winners.push(w); });
    });
    const winnerNames = winners.map(function(label) {
        const s = hand.seats.find(x => x && x.label === label);
        return s ? s.name : label;
    });
    PRT.banner = winners.length
        ? (winners.includes(heroLabel)
            ? 'You win ' + PRT_fmtBB(Math.abs(heroNet) + (outcome.totalCommitted ? (outcome.totalCommitted[heroLabel] || 0) : 0)) + '!'
            : winnerNames.join(', ') + ' takes it')
        : 'Hand over';
    PRT_render();

    // Session + per-villain bookkeeping
    PR_applySessionHandResult(PRT.session, heroNet);
    PR_accumulateSeatStats(PRT.cfg, hand);

    // Update villain persistent stacks: final in-hand stack + any pot shares
    const shares = {};
    (outcome.pots || []).forEach(function(pot) {
        (pot.winners || []).forEach(function(w) {
            shares[w] = (shares[w] || 0) + (pot.share !== undefined ? pot.share : pot.amount / pot.winners.length);
        });
    });
    PRT.cfg.villains.forEach(function(villain) {
        const seat = hand.seats.find(s => s && s.villainId === villain.id);
        if (!seat) return;
        let stack = seat.stackBB + (shares[seat.label] || 0);
        if (stack < 1) stack = PR_randomVillainStackBB(PRT.session.stake); // busted villain rebuys
        villain.stackBB = parseFloat(stack.toFixed(2));
    });

    // Persist table state (stacks, stats). Bankroll settles at cash-out.
    PRT.room.tableConfig = PRT.cfg;
    PR_saveRoomState(PRT.room);

    await PRT_delay(Math.max(1800, PRT_speedMs() * 2.2));
    if (myToken !== PRT.token) return;

    if (PR_isBusted(PRT.session)) {
        PRT.banner = 'busted';
        PRT_render();
        return; // rebuy panel takes over; no auto-deal
    }
    PRT_dealNext();
}

// Study mode: feed graded preflop decisions into the trainer's SR queue.
// correct → 'Good' (real play counts as review), error → 'Again' (queued for
// drilling), mixed → skipped. Only spots in the trainer's taxonomy are fed.
function PRT_feedSR(gradeEntry) {
    if (!PRT.room || !PRT.room.studyMode) return;
    if (!gradeEntry || !gradeEntry.spot || gradeEntry.grade === 'mixed') return;
    if (!['RFI', 'FACING_RFI', 'RFI_VS_3BET'].includes(gradeEntry.spot.scenario)) return;
    try {
        if (typeof SR === 'undefined' || typeof buildSRKey !== 'function') return;
        const sp = gradeEntry.spot;
        const key = buildSRKey(sp.scenario, sp.heroPos, sp.oppPos, null, null, sp.hand);
        SR.update(key, gradeEntry.grade === 'correct' ? 'Good' : 'Again');
        if (typeof markCloudDirty === 'function') markCloudDirty();
    } catch (_) {}
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

// Physical slot for each player: hero at slot 0 (bottom center), villains
// spread across the remaining ring positions.
function PRT_slotFor(playerIdx, playerCount) {
    if (playerIdx === 0) return 0;
    if (playerCount === 2) return 4;
    return Math.round(1 + ((playerIdx - 1) * 7) / (playerCount - 2));
}

function PRT_cardHtml(card, small) {
    const suit = PRT_SUITS[card.suit] || card.suit;
    const red = card.suit === 'h' || card.suit === 'd';
    const size = small ? 'width:26px;height:36px;font-size:12px;' : 'width:34px;height:48px;font-size:15px;';
    return '<div class="card-display" style="' + size + 'display:inline-flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;font-weight:900;color:' +
        (red ? '#e11d48' : '#0f172a') + '">' + card.rank + '<span style="font-size:0.85em">' + suit + '</span></div>';
}

function PRT_cardBackHtml(small) {
    const size = small ? 'width:22px;height:30px;' : 'width:26px;height:36px;';
    return '<div style="' + size + 'display:inline-block;border-radius:4px;background:linear-gradient(145deg,#4338ca,#312e81);border:1px solid rgba(255,255,255,0.25)"></div>';
}

function PRT_render() {
    const body = document.getElementById('poker-room-body');
    if (!body || !PRT.active) return;
    const hand = PRT.hand;
    if (!hand) return;

    const gs = hand.gameState;
    const ss = gs.streetState;
    const heroSeat = hand.seats[hand.heroSeatIndex];
    const heroLabel = heroSeat.label;
    const bb$ = PRT_bb$();
    const committedSum = Object.values(ss.committedBB || {}).reduce(function(a, v) { return a + v; }, 0);
    const potBB = gs.potBB + committedSum;
    const facing = hand.terminal ? 0 : _PR_facingAmount(hand, heroLabel);
    const waiting = !!PRT.pendingAction;
    const nextActor = hand.terminal ? null : _PR_nextActor(hand);

    // Players in physical order: hero first, then villains by id order
    const players = [heroSeat].concat(
        PRT.cfg.villains.map(function(v) { return hand.seats.find(s => s && s.villainId === v.id); }).filter(Boolean)
    );
    const n = players.length;

    // ---- Seats ----
    const seatHtml = players.map(function(seat, i) {
        const slot = PRT_slotFor(i, n);
        const c = SEAT_COORDS_DESKTOP[slot];
        const isHero = seat.isHero;
        const acting = !hand.terminal && nextActor === seat.label && (isHero ? waiting : true);
        const lastAct = [...ss.actions].reverse().find(a => a.seatLabel === seat.label);
        const inHand = !seat.folded;
        const showCards = isHero || (PRT.revealAll && hand.outcome && (hand.outcome.showdown || [])
            .some(e => e.seatLabel === seat.label && e.show));
        const showdownEntry = (hand.outcome && hand.outcome.showdown || []).find(e => e.seatLabel === seat.label);

        let cards = '';
        if (inHand && seat.holeCards) {
            if (showCards) {
                cards = seat.holeCards.map(function(cd) { return PRT_cardHtml(cd, !isHero); }).join('');
            } else if (!isHero) {
                cards = PRT_cardBackHtml(true) + PRT_cardBackHtml(true);
            }
        }

        const villain = seat.villainId ? PRT.cfg.villains.find(v => v.id === seat.villainId) : null;
        const avatar = isHero ? escapeHtml(PRT.room.heroProfile.avatar)
            : (villain && PRUI_AVATARS.includes(villain.avatar) ? villain.avatar : PRUI_AVATARS[(i - 1) % PRUI_AVATARS.length]);

        const ring = acting ? 'box-shadow:0 0 0 2px #f59e0b;' : '';
        const dim = !inHand ? 'opacity:0.35;' : '';
        const isWinner = PRT.revealAll && hand.outcome && (hand.outcome.pots || [])
            .some(p => (p.winners || []).includes(seat.label));
        const winRing = isWinner ? 'box-shadow:0 0 0 2px #4ade80;' : '';

        return '<div style="position:absolute;left:' + c.left + ';top:' + c.top + ';transform:translate(-50%,-50%);' + dim + 'z-index:20;text-align:center;min-width:64px">' +
            '<div style="display:flex;gap:1px;justify-content:center;margin-bottom:2px;min-height:' + (isHero ? '48' : '30') + 'px">' + cards + '</div>' +
            '<div style="background:#1e293b;border:1px solid #475569;border-radius:10px;padding:3px 8px;' + ring + winRing + '">' +
                '<div style="font-size:10px;font-weight:800;color:' + (isHero ? '#fcd34d' : '#e2e8f0') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px">' +
                    avatar + ' ' + escapeHtml(seat.name) + '</div>' +
                '<div style="font-size:9px;font-weight:700;color:#94a3b8">' +
                    seat.label + ' · ' + PRT_fmtBB(seat.stackBB) +
                    (seat.allIn ? ' · <span style="color:#f87171">ALL-IN</span>' : '') + '</div>' +
                (lastAct && inHand ? '<div style="font-size:8px;font-weight:900;color:#fbbf24;text-transform:uppercase">' +
                    lastAct.action + (lastAct.sizingBB > 0 ? ' ' + PRT_fmtBB(lastAct.sizingBB) : '') + '</div>' : '') +
                (!inHand ? '<div style="font-size:8px;font-weight:900;color:#64748b">FOLDED</div>' : '') +
            '</div>' +
            (showCards && !isHero && showdownEntry ? '<div style="font-size:8px;color:#a5b4fc;font-weight:700;margin-top:1px">' +
                (showdownEntry.handLabel || '').replace(/_/g, ' ') + '</div>' : '') +
        '</div>';
    }).join('');

    // ---- Bets (chips pulled toward center) ----
    const betHtml = players.filter(s => (ss.committedBB[s.label] || 0) > 0).map(function(seat) {
        const i = players.indexOf(seat);
        const c = SEAT_COORDS_DESKTOP[PRT_slotFor(i, n)];
        const L = parseFloat(c.left), T = parseFloat(c.top);
        const bl = L + (50 - L) * 0.38, bt = T + (50 - T) * 0.38;
        return '<div style="position:absolute;left:' + bl + '%;top:' + bt + '%;transform:translate(-50%,-50%);z-index:15;display:flex;align-items:center;gap:2px">' +
            '<div style="width:10px;height:10px;border-radius:50%;background:#e11d48;border:1px solid rgba(255,255,255,0.4)"></div>' +
            '<span style="font-size:9px;font-weight:900;color:#fde68a;background:rgba(0,0,0,0.5);padding:0 3px;border-radius:3px">' +
                PRT_fmtBB(ss.committedBB[seat.label]) + '</span></div>';
    }).join('');

    // ---- Board + pot + dealer button ----
    const boardHtml = (gs.board || []).map(function(cd) { return PRT_cardHtml(cd, false); }).join('');
    const btnSeatIdx = players.findIndex(s => s.label === 'BTN');
    let dealerHtml = '';
    if (btnSeatIdx >= 0) {
        const c = SEAT_COORDS_DESKTOP[PRT_slotFor(btnSeatIdx, n)];
        const L = parseFloat(c.left), T = parseFloat(c.top);
        const dl = L + (50 - L) * 0.22, dt = T + (50 - T) * 0.22;
        dealerHtml = '<div style="position:absolute;left:' + dl + '%;top:' + dt + '%;transform:translate(-50%,-50%);z-index:16;' +
            'width:16px;height:16px;border-radius:50%;background:#f8fafc;color:#0f172a;font-size:9px;font-weight:900;display:flex;align-items:center;justify-content:center">D</div>';
    }

    // ---- Header ----
    const net = PRT.session.netBB;
    const header =
        '<div class="flex items-center justify-between">' +
            '<button data-prt="leave" class="pc-btn-utility px-3 py-2 text-xs">← Cash out</button>' +
            '<div class="text-center">' +
                '<p class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Hand ' + PRT.handNo + ' · ' + escapeHtml(PRT.session.stake) + '</p>' +
                '<p class="text-[12px] font-black ' + (net >= 0 ? 'text-emerald-400' : 'text-rose-400') + '">' +
                    (net >= 0 ? '+' : '') + PRT_fmtBB(net) + ' · stack ' + PRT_fmtBB(PRT.session.stackBB) + '</p>' +
            '</div>' +
            '<button data-prt="speed" class="pc-btn-utility px-3 py-2 text-xs capitalize">' + PRT.speed + '</button>' +
        '</div>';

    // ---- Felt ----
    const felt =
        '<div class="poker-felt" style="position:relative;width:100%;height:340px;border-radius:170px/120px">' +
            seatHtml + betHtml + dealerHtml +
            '<div style="position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);text-align:center;z-index:10">' +
                '<div style="display:flex;gap:3px;justify-content:center;min-height:48px">' + boardHtml + '</div>' +
                '<div style="font-size:11px;font-weight:900;color:#fde68a;margin-top:4px">Pot ' + PRT_fmtBB(potBB) + '</div>' +
                (PRT.banner && PRT.banner !== 'busted'
                    ? '<div style="font-size:12px;font-weight:900;color:#4ade80;margin-top:2px">' + escapeHtml(PRT.banner) + '</div>' : '') +
            '</div>' +
        '</div>';

    // ---- Action area ----
    let actionArea = '';
    if (PRT.banner === 'busted') {
        const cfg = PR_STAKE_CONFIG[PRT.session.stake];
        const rebuy = Math.min(cfg.maxBuy, Math.max(cfg.minBuy, PRT.session.buyInDollars));
        const canRebuy = PRT.room.bankroll >= cfg.minBuy;
        actionArea =
            '<div class="bg-slate-900/60 border border-rose-500/30 rounded-2xl p-4 text-center flex flex-col gap-2">' +
                '<p class="text-rose-300 font-black text-sm">You’re felted!</p>' +
                '<p class="text-[11px] text-slate-500">Bankroll: ' + PRUI_fmt$(PRT.room.bankroll) + '</p>' +
                (canRebuy
                    ? '<button data-prt="rebuy" data-amount="' + Math.min(rebuy, Math.floor(PRT.room.bankroll)) + '" class="w-full py-3 pc-btn-primary font-black">REBUY ' + PRUI_fmt$(Math.min(rebuy, Math.floor(PRT.room.bankroll))) + '</button>'
                    : '<p class="text-[11px] text-rose-400">Bankroll too small to rebuy.</p>') +
                '<button data-prt="leave" class="w-full py-3 pc-btn-utility font-bold text-xs">Leave table</button>' +
            '</div>';
    } else if (waiting) {
        const myCommitted = ss.committedBB[heroLabel] || 0;
        const stack = heroSeat.stackBB;
        const canCheck = facing <= 0;
        const potOdds = facing > 0 ? Math.round((facing / (potBB + facing)) * 100) : 0;
        // Raise-to slider: total for this street
        const minTo = facing > 0 ? Math.min(myCommitted + stack, Math.max(facing + myCommitted + facing, 2)) : Math.min(stack, 1);
        const maxTo = myCommitted + stack;
        const slider = PRT.sliderTo !== null && PRT.sliderTo !== undefined
            ? Math.min(maxTo, Math.max(minTo, PRT.sliderTo)) : Math.min(maxTo, Math.max(minTo, potBB * 0.66));
        const sliderVal = Math.round(slider * 2) / 2;
        const aggrLabel = facing > 0 ? 'Raise to' : 'Bet';

        actionArea =
            '<div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">' +
                '<div class="flex items-center justify-between text-[10px] font-bold text-slate-400">' +
                    '<span>Pot ' + PRT_fmtBB(potBB) + (facing > 0 ? ' · call ' + PRT_fmtBB(facing) + ' (' + potOdds + '%)' : '') + '</span>' +
                    (PRT.lastGrade ? '<span data-prt="grade" class="cursor-pointer">' +
                        (PRT.lastGrade.grade === 'correct' ? '✓' : PRT.lastGrade.grade === 'mixed' ? '~' : '✗') + '</span>' : '<span></span>') +
                '</div>' +
                '<div class="flex items-center gap-2">' +
                    '<input data-prt="slider" type="range" min="' + minTo + '" max="' + maxTo + '" step="0.5" value="' + sliderVal + '" class="flex-1" />' +
                    '<span id="prt-slider-label" class="text-[11px] font-black text-slate-200 w-20 text-right">' + PRT_fmtBB(sliderVal) + ' ($' + Math.round(sliderVal * bb$) + ')</span>' +
                '</div>' +
                '<div class="grid grid-cols-3 gap-2">' +
                    '<button data-prt="fold" class="py-3 rounded-xl font-black text-sm bg-rose-900/60 text-rose-200 border border-rose-700/40">FOLD</button>' +
                    (canCheck
                        ? '<button data-prt="check" class="py-3 rounded-xl font-black text-sm bg-slate-800 text-slate-200 border border-slate-600">CHECK</button>'
                        : '<button data-prt="call" class="py-3 rounded-xl font-black text-sm bg-slate-800 text-slate-200 border border-slate-600">CALL ' + PRT_fmtBB(facing) + '</button>') +
                    '<button data-prt="aggr" class="py-3 rounded-xl font-black text-sm bg-amber-600 text-white">' + aggrLabel.toUpperCase() + '</button>' +
                '</div>' +
            '</div>';
    } else {
        const actorSeat = nextActor ? hand.seats.find(s => s && s.label === nextActor) : null;
        actionArea = '<div class="text-center text-[11px] text-slate-500 font-bold py-3">' +
            (hand.terminal ? (hand.heroFolded ? 'Watching the hand play out…' : 'Next hand coming up…')
                : actorSeat ? escapeHtml(actorSeat.name) + ' is thinking…' : 'Dealing…') + '</div>';
    }

    // ---- Grade explanation (tap the indicator) ----
    const gradeLine = (PRT.showGradeDetail && PRT.lastGrade)
        ? '<p class="text-[10px] text-slate-500 text-center leading-snug">' + escapeHtml(PRT.lastGrade.explanation || '') + '</p>' : '';

    body.innerHTML = header + felt + actionArea + gradeLine;
}

// ---------------------------------------------------------------------------
// Events (delegated from #poker-room-body — set up alongside PRUI's handlers)
// ---------------------------------------------------------------------------
function PRT_onClick(e) {
    const el = e.target.closest('[data-prt]');
    if (!el || !PRT.active) return;
    const kind = el.dataset.prt;

    if (kind === 'leave') {
        PRT_leave();
    } else if (kind === 'speed') {
        const order = ['slow', 'normal', 'fast'];
        PRT.speed = order[(order.indexOf(PRT.speed) + 1) % order.length];
        try { localStorage.setItem(PRT_SPEED_KEY, PRT.speed); } catch (_) {}
        PRT_render();
    } else if (kind === 'grade') {
        PRT.showGradeDetail = !PRT.showGradeDetail;
        PRT_render();
    } else if (kind === 'rebuy') {
        const amount = parseInt(el.dataset.amount, 10);
        const r = PR_rebuy(PRT.room, PRT.session, amount);
        if (!r.ok) {
            if (typeof showToast === 'function') showToast(r.error, 'incorrect', 2200);
            return;
        }
        PR_saveRoomState(PRT.room);
        PRT.banner = null;
        PRT_dealNext();
    } else if (PRT.pendingAction) {
        const hand = PRT.hand;
        const heroLabel = hand.seats[hand.heroSeatIndex].label;
        const facing = _PR_facingAmount(hand, heroLabel);
        const myCommitted = hand.gameState.streetState.committedBB[heroLabel] || 0;
        if (kind === 'fold') {
            PRT.pendingAction({ action: 'fold', sizingBB: 0 });
        } else if (kind === 'check') {
            PRT.pendingAction({ action: 'check', sizingBB: 0 });
        } else if (kind === 'call') {
            PRT.pendingAction({ action: 'call', sizingBB: 0 });
        } else if (kind === 'aggr') {
            const sliderEl = document.querySelector('[data-prt="slider"]');
            const to = sliderEl ? parseFloat(sliderEl.value) : 0;
            const inc = Math.max(0.5, Math.round((to - myCommitted) * 10) / 10);
            const street = hand.gameState.street;
            const action = facing > 0
                ? (street === 'preflop' ? 'raise' : 'raise')
                : (street === 'preflop' ? 'raise' : 'bet');
            PRT.sliderTo = null;
            PRT.pendingAction({ action, sizingBB: inc });
        }
    }
}

function PRT_onInput(e) {
    const el = e.target.closest('[data-prt="slider"]');
    if (!el || !PRT.active) return;
    PRT.sliderTo = parseFloat(el.value);
    const label = document.getElementById('prt-slider-label');
    if (label) {
        label.textContent = PRT_fmtBB(PRT.sliderTo) + ' ($' + Math.round(PRT.sliderTo * PRT_bb$()) + ')';
    }
}

(function PRT_init() {
    const body = document.getElementById('poker-room-body');
    if (body) {
        body.addEventListener('click', PRT_onClick);
        body.addEventListener('input', PRT_onInput);
    }
})();
