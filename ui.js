// ui.js — Table animation, rendering, buttons, toasts, charts, library, stats, responsive
// Auto-split from PokerCrusher monolith — do not reorder script tags

function getSeatCoords(heroPos, pos) {
    const heroIdx = TABLE_ORDER.indexOf(heroPos);
    const i = TABLE_ORDER.indexOf(pos);
    const slotIdx = (i - heroIdx + 9) % 9;
    return { ...SEAT_COORDS[slotIdx], pos };
}

// Place card backs near a seat, offset toward table center
function placeCardBacks(cardsLayer, coords, animated, folded) {
    const el = document.createElement('div');
    el.className = 'seat-cards';
    // Offset slightly toward center — smaller on mobile
    let cL = parseFloat(coords.left), cT = parseFloat(coords.top);
    let offL = 0, offT = 0;
    const isMob = SEAT_COORDS === SEAT_COORDS_MOBILE;
    // Separate H/V offsets because the felt is ~2.5x wider than tall:
    // a uniform % offset clears seat edges horizontally but not vertically.
    const cbOffH = isMob ? 7 : 5;
    const cbOffV = isMob ? 12 : 9;
    // Bottom-center seat (hero) needs a bigger upward offset so cards sit above the box
    const isBottomCenter = Math.abs(cL - 50) < 10 && cT > 75;
    if (isBottomCenter) {
        offT = isMob ? -8 : -11;
    } else {
        if (cL < 35) offL = cbOffH; else if (cL > 65) offL = -cbOffH;
        if (cT < 35) offT = cbOffV; else if (cT > 65) offT = -cbOffV;
        if (Math.abs(cL - 50) < 15 && cT < 35) offT = cbOffV;
        if (Math.abs(cL - 50) < 15 && cT > 65) offT = -cbOffV;
    }
    el.style.left = (cL + offL) + '%';
    el.style.top = (cT + offT) + '%';
    el.style.transform = 'translate(-50%, -50%)';
    if (folded) el.style.opacity = '0';
    el.innerHTML = `<div class="card-back${animated ? ' dealing' : ''}"></div><div class="card-back${animated ? ' dealing' : ''}" style="${animated ? 'animation-delay:0.05s' : ''}"></div>`;
    cardsLayer.appendChild(el);
    return el;
}

// Show a floating action badge near a seat (rendered in cards-layer, not inside seat)
function showActionBadge(seatEl, text, badgeClass, duration, cb) {
    const cardsLayer = document.getElementById('cards-layer');
    // Get seat's position as percentages from its style
    const left = seatEl.style.left;
    const top = seatEl.style.top;
    const badge = document.createElement('div');
    badge.className = `action-badge ${badgeClass}`;
    badge.innerText = text;
    badge.style.position = 'absolute';
    badge.style.left = left;
    // Offset upward from the seat — smaller on mobile
    const topPct = parseFloat(top);
    const badgeOff = SEAT_COORDS === SEAT_COORDS_MOBILE ? 6 : 8;
    badge.style.top = (topPct - badgeOff) + '%';
    badge.style.transform = 'translate(-50%, -100%)';
    badge.style.zIndex = '50';
    cardsLayer.appendChild(badge);
    setTimeout(() => {
        badge.style.opacity = '0';
        badge.style.transition = 'opacity 0.2s';
        setTimeout(() => { badge.remove(); if (cb) cb(); }, 220);
    }, duration);
}

// Animate a chip appearing at a position
function animateChip(betsLayer, coords, amountBb, labelOverride) {
    const betDiv = document.createElement('div');
    betDiv.className = 'absolute flex items-center gap-1 z-40 -translate-x-1/2 -translate-y-1/2 pointer-events-none chip-anim';
    const origL = parseFloat(coords.left), origT = parseFloat(coords.top);
    let betL = origL, betT = origT;

    // Base nudge toward table center so chips don't collide with seat/position boxes
    const isMob = (SEAT_COORDS === SEAT_COORDS_MOBILE);
    const bOff = isMob ? 12 : 16;
    if (betL < 45) betL += bOff; else if (betL > 55) betL -= bOff;
    if (betT < 45) betT += bOff; else if (betT > 55) betT -= bOff;

    // Extra vertical clearance for bottom seats (hero area) and top seats
    if (origT > (isMob ? 80 : 84)) betT -= (isMob ? 10 : 12);
    if (origT < (isMob ? 12 : 10)) betT += (isMob ? 8 : 10);

    // Extra horizontal clearance for extreme side seats
    if (origL < (isMob ? 8 : 6)) betL += (isMob ? 10 : 12);
    if (origL > (isMob ? 92 : 94)) betL -= (isMob ? 10 : 12);

                // Small per-position horizontal jitter to prevent adjacent bet overlaps
    if (coords && coords.pos && typeof BET_JITTER !== 'undefined' && BET_JITTER[coords.pos] != null) {
        betL += BET_JITTER[coords.pos];
    }

// Clamp into a safe box so chips never clip off the felt container
    const minL = isMob ? 10 : 8, maxL = isMob ? 90 : 92;
    const minT = isMob ? 12 : 10, maxT = isMob ? 88 : 90;
    betL = Math.max(minL, Math.min(maxL, betL));
    betT = Math.max(minT, Math.min(maxT, betT));

    betDiv.style.left = betL + '%';
    betDiv.style.top = betT + '%';
    betDiv.innerHTML = `<div style="width:var(--chip-size,16px);height:var(--chip-size,16px);" class="rounded-full bg-rose-600 border border-white/20"></div><span style="font-size:var(--chip-font,9px);" class="font-black text-yellow-400 bg-black/40 px-1 rounded">${labelOverride ? labelOverride : bbTo$(amountBb)}</span>`;
    betsLayer.appendChild(betDiv);
    return betDiv;
}

function updateTable(heroPos, oppPos) {
    // Defensive: ensure layers exist before rendering (challenge transitions can drop them)
    try { ensureTableLayers(); } catch(_) {}

    const heroIdx = TABLE_ORDER.indexOf(heroPos);
    const btnEl = document.getElementById('dealer-button');
    let betsLayer = document.getElementById('bets-layer');
    let cardsLayer = document.getElementById('cards-layer');

    if (!betsLayer || !cardsLayer) {
        try { ensureTableLayers(true); } catch(_) {}
        betsLayer = document.getElementById('bets-layer');
        cardsLayer = document.getElementById('cards-layer');
    }
    if (!betsLayer || !cardsLayer) {
        console.warn('[updateTable] Missing table layers; aborting render');
        return;
    }

    betsLayer.innerHTML = '';
    cardsLayer.innerHTML = '';
    
    TABLE_ORDER.forEach((pos, i) => {
        const slotIdx = (i - heroIdx + 9) % 9;
        const coords = SEAT_COORDS[slotIdx];
        const el = document.getElementById(`seat-${pos}`);
        if (el) {
            el.style.left = coords.left; el.style.top = coords.top;

            if (pos === heroPos) el.className = `seat bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center font-black text-slate-300 seat-active`;
            else if (pos === oppPos) el.className = `seat border rounded-lg flex items-center justify-center font-black bg-rose-900/40 border-rose-500/50 text-rose-200`;
            else el.className = `seat bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center font-black text-slate-300`;
        }

        // Card backs for all seats (safe)
        try { placeCardBacks(cardsLayer, coords, false, false); } catch(_) {}

        if (pos === 'BTN' && btnEl) {
            let bL = parseFloat(coords.left), bT = parseFloat(coords.top);
            if (bL < 50) bL += 5; else bL -= 5;
            if (bT < 50) bT += 5; else bT -= 5;
            btnEl.style.left = bL + '%'; btnEl.style.top = bT + '%';
        }
    });

    // Render a single central pot badge instead of per-seat chips.
    // This is used by the static/postflop path; the animation path (runTableAnimation)
    // collects chips into the pot at the end of its animation sequence.
    if (state.scenario) {
        try { renderPotBadge(betsLayer, getScenarioPot$(state.scenario)); } catch(_) {}
    }
}

// Animated table sequence — positions the seats instantly, then plays the action animation
function runTableAnimation(heroPos, oppPos, scenario, onDone) {
    // Prevent overlapping animations from leaving duplicate chips/bets on screen.
    // If a new round starts while an old animation is mid-flight, the old one becomes "stale"
    // and all pending async steps abort.
    window.__tableAnimToken = (window.__tableAnimToken || 0) + 1;
    const _animToken = window.__tableAnimToken;
    const STALE = Symbol('tableAnimStale');
    const isStale = () => _animToken !== window.__tableAnimToken;


    let __doneCalled = false;

    const heroIdx = TABLE_ORDER.indexOf(heroPos);
    const btnEl = document.getElementById('dealer-button');
    // Mobile Safari can drop absolutely-positioned layers during rapid screen changes.
    try { ensureTableLayers(); } catch(_) {}
    let betsLayer = document.getElementById('bets-layer');
    let cardsLayer = document.getElementById('cards-layer');
    if (!betsLayer || !cardsLayer) {
        try { ensureTableLayers(true); } catch(_) {}
        betsLayer = document.getElementById('bets-layer');
        cardsLayer = document.getElementById('cards-layer');
    }
    if (!betsLayer || !cardsLayer) {
        console.warn('[TableAnim] Missing table layers; skipping animation');
        try { if (onDone) onDone(); } catch(e) {}
        return;
    }
    betsLayer.innerHTML = '';
    cardsLayer.innerHTML = '';

    // Position all seats, reset styles
    const seatCardEls = {};
    TABLE_ORDER.forEach((pos, i) => {
        const slotIdx = (i - heroIdx + 9) % 9;
        const coords = SEAT_COORDS[slotIdx];
        const el = document.getElementById(`seat-${pos}`);
        if (el) { el.style.left = coords.left; el.style.top = coords.top; }
        const isSqueezeOpp = (scenario === 'SQUEEZE' && (pos === state.squeezeOpener || pos === state.squeezeCaller)) || (scenario === 'SQUEEZE_2C' && (pos === state.squeezeOpener || pos === state.squeezeCaller || pos === state.squeezeCaller2));
        const isLimper = scenario === 'VS_LIMP' && state.limperPositions && state.limperPositions.includes(pos);
        if (el && pos === heroPos) el.className = `seat bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center font-black text-slate-300 seat-active`;
        else if (el && (isSqueezeOpp || isLimper || (pos === oppPos && scenario !== 'SQUEEZE'))) el.className = `seat border rounded-lg flex items-center justify-center font-black bg-rose-900/40 border-rose-500/50 text-rose-200`;
        else if (el) el.className = `seat bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center font-black text-slate-300`;
        if (pos === 'BTN') {
            let bL = parseFloat(coords.left), bT = parseFloat(coords.top);
            if (bL < 50) bL += 5; else bL -= 5;
            if (bT < 50) bT += 5; else bT -= 5;
            if (btnEl) btnEl.style.left = bL + '%'; if (btnEl) btnEl.style.top = bT + '%';
        }
    });

    const delay = (ms) => new Promise(r => setTimeout(r, ms)).then(() => { if (isStale()) throw STALE; });

    async function animate() {
        try {
        // Step 1: Deal cards to all seats with stagger
        TABLE_ORDER.forEach((pos, i) => {
            const coords = getSeatCoords(heroPos, pos);
            const isHero = pos === heroPos;
            setTimeout(() => {
                seatCardEls[pos] = placeCardBacks(cardsLayer, coords, true, false);
            }, i * 50);
        });
        await delay(TABLE_ORDER.length * 50 + 200);

        // Step 2: Post blinds with chip animation + badge
        const sbCoords = getSeatCoords(heroPos, 'SB');
        const bbCoords = getSeatCoords(heroPos, 'BB');

        if (scenario !== 'RFI_VS_3BET') {
            animateChip(betsLayer, sbCoords, 0.5, formatAmt(getSmallBlind$()));
            showActionBadge(document.getElementById('seat-SB'), 'BLIND', 'badge-blind', 600);
            await delay(200);
            animateChip(betsLayer, bbCoords, 1, formatAmt(getBigBlind$()));
            showActionBadge(document.getElementById('seat-BB'), 'BLIND', 'badge-blind', 600);
            await delay(350);
        }

        // Step 3: Action sequence - fold positions before the raiser, then raise
        if (scenario === 'RFI') {
            // Fold everyone from UTG up to (but not including) heroPos
            const actionOrder = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB'];
            const heroActionIdx = actionOrder.indexOf(heroPos);
            if (heroActionIdx > 0) {
                for (let k = 0; k < heroActionIdx; k++) {
                    const foldPos = actionOrder[k];
                    const foldEl = document.getElementById(`seat-${foldPos}`);
                    const cardEl = seatCardEls[foldPos];
                    foldEl.classList.add('seat-folded-state');
                    if (cardEl) { cardEl.classList.add('folding'); }
                    showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                    await delay(120);
                }
            }
            await delay(150);
        } else if (scenario === 'FACING_RFI') {
            // Fold everyone from UTG up to (not including) oppPos, then oppPos raises, then hero acts
            const actionOrder = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB'];
            const oppActionIdx = actionOrder.indexOf(oppPos);
            const heroActionIdx = actionOrder.indexOf(heroPos);
            // Fold positions before the raiser (oppPos)
            for (let k = 0; k < oppActionIdx; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            // Raiser raises
            const oppCoords = getSeatCoords(heroPos, oppPos);
            animateChip(betsLayer, oppCoords, getVillainOpenSize$() / BB_DOLLARS);
            showActionBadge(document.getElementById(`seat-${oppPos}`), 'RAISE ' + formatAmt(getVillainOpenSize$()), 'badge-raise', 700);
            await delay(300);
            // Fold positions between raiser and hero (stop at hero — don't fold players who act after hero)
            const facingFoldEnd = heroActionIdx >= 0 ? heroActionIdx : actionOrder.length;
            for (let k = oppActionIdx + 1; k < facingFoldEnd; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos || foldPos === oppPos) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            await delay(150);
        } else if (scenario === 'RFI_VS_3BET') {
            // Fold everyone before hero, hero raises, fold between hero and 3bettor, 3bet
            const actionOrder = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB'];
            const heroActionIdx = actionOrder.indexOf(heroPos);
            const oppActionIdx = actionOrder.indexOf(oppPos);
            // Fold before hero
            for (let k = 0; k < heroActionIdx; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === oppPos) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            // Hero raises
            const heroCoords = getSeatCoords(heroPos, heroPos);
            animateChip(betsLayer, heroCoords, getOpenSizeBB());
            showActionBadge(document.getElementById(`seat-${heroPos}`), 'RAISE ' + formatAmt(getOpenSize$()), 'badge-raise', 700);
            await delay(300);
            // Fold between hero and 3bettor
            for (let k = heroActionIdx + 1; k < 8; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === oppPos || foldPos === heroPos) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            await delay(150);
            // BB might fold too if oppPos is BB — but BB can 3bet, so show 3bet
            // Keep hero's open-raise chip visible alongside the villain's 3-bet chip
            const oppCoords = getSeatCoords(heroPos, oppPos);
            const threeBetAnim$ = get3betSize$(oppPos, heroPos);
            const threeBetAnimBB = threeBetAnim$ / BB_DOLLARS;
            animateChip(betsLayer, oppCoords, threeBetAnimBB);
            showActionBadge(document.getElementById(`seat-${oppPos}`), '3-BET ' + formatAmt(threeBetAnim$), 'badge-3bet', 800);
            await delay(400);
        } else if (scenario === 'VS_4BET') {
            // fold before opener (oppPos), opener raises, fold between, hero 3-bets, opener 4-bets
            const actionOrder = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB'];
            const openerIdx = actionOrder.indexOf(oppPos);
            const heroActionIdx = actionOrder.indexOf(heroPos);
            // Fold before opener
            for (let k = 0; k < openerIdx; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            // Opener raises
            const openerCoords = getSeatCoords(heroPos, oppPos);
            animateChip(betsLayer, openerCoords, getOpenSizeBB());
            showActionBadge(document.getElementById(`seat-${oppPos}`), 'RAISE ' + formatAmt(getOpenSize$()), 'badge-raise', 700);
            await delay(300);
            // Fold between opener and hero
            for (let k = openerIdx + 1; k < 8; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos || foldPos === oppPos) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            await delay(150);
            // Hero 3-bets — clear prior chips so only current bet shows
            betsLayer.innerHTML = '';
            const heroCoords4 = getSeatCoords(heroPos, heroPos);
            const threeBet4$ = get3betSize$(heroPos, oppPos);
            animateChip(betsLayer, heroCoords4, threeBet4$ / getBigBlind$());
            showActionBadge(document.getElementById(`seat-${heroPos}`), '3-BET ' + formatAmt(threeBet4$), 'badge-3bet', 800);
            await delay(350);
            // Opener 4-bets — clear prior chips so only current bet shows
            betsLayer.innerHTML = '';
            const oppCoords4 = getSeatCoords(heroPos, oppPos);
            const fourBet4$ = get4betSize$(oppPos, heroPos);
            animateChip(betsLayer, oppCoords4, fourBet4$ / getBigBlind$());
            showActionBadge(document.getElementById(`seat-${oppPos}`), '4-BET ' + formatAmt(fourBet4$), 'badge-raise', 900);
            await delay(400);
        } else if (scenario === 'VS_LIMP') {
            // Multi-limp animation: fold to first limper, each limper limps, fold between, hero acts
            // BB must be in the action order so the hero-position stop works for all seats
            const actionOrder = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB','BB'];
            const allLimpers = state.limperPositions || [oppPos];
            const limperSet = new Set(allLimpers);
            const firstLimperIdx = actionOrder.indexOf(allLimpers[0]);
            const heroIdx_ao = actionOrder.indexOf(heroPos);
            
            // Fold before first limper
            for (let k = 0; k < firstLimperIdx; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos || limperSet.has(foldPos)) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            
            // Process each limper and fold positions between them
            for (let li = 0; li < allLimpers.length; li++) {
                const lPos = allLimpers[li];
                const lIdx = actionOrder.indexOf(lPos);
                
                // Fold positions between previous limper and this one
                const prevIdx = li === 0 ? firstLimperIdx : actionOrder.indexOf(allLimpers[li - 1]) + 1;
                for (let k = prevIdx; k < lIdx; k++) {
                    const foldPos = actionOrder[k];
                    if (foldPos === heroPos || limperSet.has(foldPos)) continue;
                    const foldEl = document.getElementById(`seat-${foldPos}`);
                    const cardEl = seatCardEls[foldPos];
                    foldEl.classList.add('seat-folded-state');
                    if (cardEl) cardEl.classList.add('folding');
                    showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                    await delay(100);
                }
                
                // This limper limps
                const lCoords = getSeatCoords(heroPos, lPos);
                animateChip(betsLayer, lCoords, 1);
                showActionBadge(document.getElementById(`seat-${lPos}`), 'LIMP', 'badge-limp', 700);
                await delay(300);
            }
            
            // Fold between last limper and hero — stop AT hero, don't fold past
            const lastLimperIdx = actionOrder.indexOf(allLimpers[allLimpers.length - 1]);
            const foldEnd = heroIdx_ao >= 0 ? heroIdx_ao : actionOrder.length;
            for (let k = lastLimperIdx + 1; k < foldEnd; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos || limperSet.has(foldPos)) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            await delay(150);
        }

        // SQUEEZE: fold to opener, opener raises, fold to caller, caller calls, fold to hero
        else if (scenario === 'SQUEEZE') {
            const opener = state.squeezeOpener;
            const caller = state.squeezeCaller;
            const actionOrder = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB'];
            const openerIdx = actionOrder.indexOf(opener);
            const callerIdx = actionOrder.indexOf(caller);
            for (let k = 0; k < openerIdx; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            const openerCoords = getSeatCoords(heroPos, opener);
            animateChip(betsLayer, openerCoords, getVillainOpenSize$() / BB_DOLLARS);
            showActionBadge(document.getElementById(`seat-${opener}`), 'RAISE ' + formatAmt(getVillainOpenSize$()), 'badge-raise', 700);
            await delay(300);
            for (let k = openerIdx + 1; k < callerIdx; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos || foldPos === opener) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            const callerCoords = getSeatCoords(heroPos, caller);
            animateChip(betsLayer, callerCoords, getVillainOpenSize$() / BB_DOLLARS);
            showActionBadge(document.getElementById(`seat-${caller}`), 'CALL', 'badge-call', 700);
            await delay(300);
            const squeezeHeroIdx = actionOrder.indexOf(heroPos);
            const squeezeFoldEnd = squeezeHeroIdx >= 0 ? squeezeHeroIdx : actionOrder.length;
            for (let k = callerIdx + 1; k < squeezeFoldEnd; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos || foldPos === opener || foldPos === caller) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            await delay(150);
        }

        // SQUEEZE_2C: fold to opener, opener raises, fold to caller1, caller1 calls, fold to caller2, caller2 calls, fold to hero
        else if (scenario === 'SQUEEZE_2C') {
            const opener = state.squeezeOpener;
            const c1 = state.squeezeCaller;
            const c2 = state.squeezeCaller2;
            const actionOrder = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB'];
            const openerIdx = actionOrder.indexOf(opener);
            const c1Idx = actionOrder.indexOf(c1);
            const c2Idx = actionOrder.indexOf(c2);
            // Fold before opener
            for (let k = 0; k < openerIdx; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            // Opener raises
            animateChip(betsLayer, getSeatCoords(heroPos, opener), getVillainOpenSize$() / BB_DOLLARS);
            showActionBadge(document.getElementById(`seat-${opener}`), 'RAISE ' + formatAmt(getVillainOpenSize$()), 'badge-raise', 700);
            await delay(300);
            // Fold between opener and caller1
            for (let k = openerIdx + 1; k < c1Idx; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos || foldPos === opener) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            // Caller1 calls
            animateChip(betsLayer, getSeatCoords(heroPos, c1), getVillainOpenSize$() / BB_DOLLARS);
            showActionBadge(document.getElementById(`seat-${c1}`), 'CALL', 'badge-call', 700);
            await delay(300);
            // Fold between caller1 and caller2
            for (let k = c1Idx + 1; k < c2Idx; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos || foldPos === opener || foldPos === c1) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            // Caller2 calls
            animateChip(betsLayer, getSeatCoords(heroPos, c2), getVillainOpenSize$() / BB_DOLLARS);
            showActionBadge(document.getElementById(`seat-${c2}`), 'CALL', 'badge-call', 700);
            await delay(300);
            // Fold between caller2 and hero (stop at hero — don't fold players who act after hero)
            const sq2cHeroIdx = actionOrder.indexOf(heroPos);
            const sq2cFoldEnd = sq2cHeroIdx >= 0 ? sq2cHeroIdx : actionOrder.length;
            for (let k = c2Idx + 1; k < sq2cFoldEnd; k++) {
                const foldPos = actionOrder[k];
                if (foldPos === heroPos || foldPos === opener || foldPos === c1 || foldPos === c2) continue;
                const foldEl = document.getElementById(`seat-${foldPos}`);
                const cardEl = seatCardEls[foldPos];
                foldEl.classList.add('seat-folded-state');
                if (cardEl) cardEl.classList.add('folding');
                showActionBadge(foldEl, 'FOLD', 'badge-fold', 400);
                await delay(100);
            }
            await delay(150);
        }
        // Leave per-seat chips in place so the player can see each position's action
        // while deciding. The pot badge is only appropriate after a flop is dealt;
        // the postflop path uses updateTable() which calls renderPotBadge directly.
        if (onDone && !isStale()) { __doneCalled = true; onDone(); }
        } catch (e) {
            if (e === STALE) return; // silently abort stale animations
            console.error(e);
        } finally {
            if (!__doneCalled && !isStale()) {
                try { if (onDone) onDone(); } catch(_e) {}
            }
        }
    }

    animate();
}

function renderHand(handKeyOrHeroHand) {
    const SUIT_MAP = { s: '♠', h: '♥', c: '♣', d: '♦', '♠': '♠', '♥': '♥', '♣': '♣', '♦': '♦' };
    const color = (s) => (s === '♥' || s === '♦') ? 'text-rose-600' : 'text-slate-900';
    const card = (r, s) => `
        <div class="hero-card-wrapper" style="width:var(--hero-card-w, 64px);height:var(--hero-card-h, 96px);">
            <div class="hero-card-inner" style="width:100%;height:100%;">
                <div class="hero-card-back-face"></div>
                <div class="hero-card-front card-display flex flex-col items-center" style="width:100%;height:100%;">
                    <div class="h-1/2 w-full flex items-end justify-center pb-1"><span class="font-black leading-none ${color(s)}" style="font-size:var(--hero-rank-size, 32px);">${r}</span></div>
                    <div class="h-1/2 w-full flex items-start justify-center pt-1"><span class="leading-none ${color(s)}" style="font-size:var(--hero-suit-size, 28px);">${s}</span></div>
                </div>
            </div>
        </div>`;

    let cards = null;
    if (handKeyOrHeroHand && typeof handKeyOrHeroHand === 'object' && Array.isArray(handKeyOrHeroHand.cards) && handKeyOrHeroHand.cards.length >= 2) {
        // Postflop: use actual dealt suits from the hero hand object
        cards = handKeyOrHeroHand.cards.slice(0, 2).map(c => ({ rank: c.rank, suit: SUIT_MAP[c.suit] || c.suit }));
    } else {
        // Preflop: generate random suits from abstract hand key like 'AKs'
        const handKey = String(handKeyOrHeroHand || '');
        const r1 = handKey[0], r2 = handKey[1], type = handKey[2] || '';
        const suits = ['♠','♥','♣','♦'];
        const s1 = suits[Math.floor(Math.random()*4)];
        const s2 = type === 's' ? s1 : suits.filter(s => s !== s1)[Math.floor(Math.random()*3)];
        cards = [{ rank: r1, suit: s1 }, { rank: r2, suit: s2 }];
    }

    document.getElementById('hand-display').innerHTML = cards.map(c => card(c.rank, c.suit)).join('');
}

// Show card backs (placeholder) immediately
function renderHeroCardBacks() {
    const card = `
        <div class="hero-card-wrapper" style="width:var(--hero-card-w, 64px);height:var(--hero-card-h, 96px);">
            <div class="hero-card-inner" style="width:100%;height:100%;">
                <div class="hero-card-back-face"></div>
                <div class="hero-card-front card-display flex flex-col items-center" style="width:100%;height:100%;"></div>
            </div>
        </div>`;
    document.getElementById('hand-display').innerHTML = card + card;
}

// Flip hero cards from back to face
function flipHeroCards() {
    const cards = document.querySelectorAll('#hand-display .hero-card-inner');
    cards.forEach((c, i) => {
        setTimeout(() => c.classList.add('flipped'), i * 100);
    });
}


// ==============================
// Live $1/$3 visual bet sizing (display-only)
// ==============================
// ==============================
// Stake-aware sizing + display helpers
// ==============================

function getCurrentStakePreset() {
    if (typeof STAKE_PRESETS !== 'undefined' && typeof sessionBuilder !== 'undefined' && sessionBuilder.stakeId) {
        return STAKE_PRESETS[sessionBuilder.stakeId] || STAKE_PRESETS['1/3'];
    }
    return { id:'1/3', sb:1, bb:3, defaultOpen:15, villainOpenPool:[6,10,12,12,15,15,15,15,15,15,17,18,20,25] };
}
function getSmallBlind$()  { return getCurrentStakePreset().sb; }
function getBigBlind$()    { return getCurrentStakePreset().bb; }
function getBlindTotal$()  { return getSmallBlind$() + getBigBlind$(); }

// BB_DOLLARS: dynamic getter so all existing internal callers continue to work
function _currentBBDollars() { return getBigBlind$(); }
Object.defineProperty(window, 'BB_DOLLARS', { get: _currentBBDollars, configurable: true });

function roundLiveDollars(n) {
    if (!isFinite(n)) return n;
    if (n < 30) return Math.round(n);
    return Math.round(n / 5) * 5;
}

function fmt$(n) {
    const v = roundLiveDollars(n);
    return `$${v}`;
}

// Central user-facing amount formatter.
// displayMode = 'dollars' → "$15"  |  displayMode = 'bb' → "5bb"
function formatAmt(dollars) {
    const mode = (typeof sessionBuilder !== 'undefined') ? sessionBuilder.displayMode : 'dollars';
    if (mode === 'bb') {
        const bb = getBigBlind$();
        if (!bb) return fmt$(dollars);
        const rounded = Math.round((dollars / bb) * 2) / 2;
        return `${rounded}bb`;
    }
    return fmt$(dollars);
}
function formatPot(dollars) { return formatAmt(dollars); }

// --- Hero bet slide animation (visual-only) ---
function _heroSeatPct(pos){
const el = document.getElementById(`seat-${pos}`);
if(!el) return null;
const l = parseFloat(el.style.left);
const t = parseFloat(el.style.top);
if (Number.isNaN(l) || Number.isNaN(t)) return null;
return {left:l, top:t};
}
function _betTargetFromSeatPct(seat, pos){
let betL = seat.left, betT = seat.top;
const isMob = (SEAT_COORDS === SEAT_COORDS_MOBILE);
const bOff = isMob ? 12 : 16;
if (betL < 45) betL += bOff; else if (betL > 55) betL -= bOff;
if (betT < 45) betT += bOff; else if (betT > 55) betT -= bOff;

if (seat.top > (isMob ? 80 : 84)) betT -= (isMob ? 10 : 12);
if (seat.top < (isMob ? 12 : 10)) betT += (isMob ? 8 : 10);

if (seat.left < (isMob ? 8 : 6)) betL += (isMob ? 10 : 12);
if (seat.left > (isMob ? 92 : 94)) betL -= (isMob ? 10 : 12);

if (typeof BET_JITTER !== 'undefined' && pos && BET_JITTER[pos] != null) betL += BET_JITTER[pos];

const minL = isMob ? 10 : 8, maxL = isMob ? 90 : 92;
const minT = isMob ? 12 : 10, maxT = isMob ? 88 : 90;
betL = Math.max(minL, Math.min(maxL, betL));
betT = Math.max(minT, Math.min(maxT, betT));
return {left: betL, top: betT};
}
function animateHeroBetDollars(amountDollars){
try{
const betsLayer = document.getElementById('bets-layer');
if(!betsLayer) return;
const seat = _heroSeatPct(state.currentPos);
if(!seat) return;

const target = _betTargetFromSeatPct(seat, state.currentPos);

// start slightly "in front" of hero (toward table center)
const start = {
    left: seat.left + (target.left - seat.left) * 0.35,
    top:  seat.top  + (target.top  - seat.top)  * 0.35
};

const existing = document.getElementById('hero-bet-anim');
if(existing && existing.parentNode) existing.parentNode.removeChild(existing);

const betDiv = document.createElement('div');
betDiv.id = 'hero-bet-anim';
betDiv.className = 'hero-bet-anim';
betDiv.style.left = start.left + '%';
betDiv.style.top = start.top + '%';
betDiv.innerHTML = `<div style="width:var(--chip-size,16px);height:var(--chip-size,16px);" class="rounded-full bg-indigo-500 border border-white/20"></div>
    <span style="font-size:var(--chip-font,9px);" class="font-black text-yellow-400 bg-black/40 px-1 rounded">${formatAmt(amountDollars)}</span>`;
betsLayer.appendChild(betDiv);

requestAnimationFrame(() => {
    betDiv.classList.add('show');
    betDiv.style.left = target.left + '%';
    betDiv.style.top = target.top + '%';
});

setTimeout(() => {
    if(betDiv && betDiv.parentNode){
        betDiv.style.opacity = '0';
        setTimeout(() => { if(betDiv.parentNode) betDiv.parentNode.removeChild(betDiv); }, 220);
    }
}, 850);
} catch(e) { /* no-op */ }
}

function computeHeroBetDollarsForAction(action){
const open$ = getOpenSize$();

// RFI tree
if (state.scenario === 'RFI' && action === 'RAISE') return open$;

// Facing RFI tree
if (state.scenario === 'FACING_RFI' && action === '3BET') return get3betSize$(state.currentPos, state.oppPos, getVillainOpenSize$());

// Vs limpers (action is 'ISO' from renderButtons)
if (state.scenario === 'VS_LIMP' && (action === 'ISO' || action === 'RAISE')) {
const limpers = (state.limperPositions && Array.isArray(state.limperPositions)) ? state.limperPositions.length : (state.numLimpers || 1);
return getIsoSize$(limpers);
}

// Squeeze scenarios (your app uses separate scenario keys for 1 or 2 callers)
if ((state.scenario === 'SQUEEZE' || state.scenario === 'SQUEEZE_1C') && action === 'SQUEEZE') return getSqueezeSize$(state.currentPos, state.squeezeOpener, 1);
if (state.scenario === 'SQUEEZE_2C' && action === 'SQUEEZE') return getSqueezeSize$(state.currentPos, state.squeezeOpener, 2);

if ((state.scenario === 'RFI_VS_3BET' || state.scenario === 'RFI_VS_3') && action === '4BET') return get4betSize$(state.currentPos, state.oppPos);
if (state.scenario === 'VS_4BET' && action === '5BET') return get5betSize$(state.currentPos, state.oppPos);

// Push/fold shove
if (state.scenario === 'PUSH_FOLD' && action === 'SHOVE') {
return (state.stackBB || 10) * BB_DOLLARS;
}

return null;
}

function bbTo$(bb) {
return formatAmt(bb * getBigBlind$());
}

function postflopIP(heroPos, oppPos) {
// Postflop order in holdem: SB, BB, then UTG..BTN. Later in this order = IP.
const ORDER = ['SB','BB','UTG','UTG1','UTG2','LJ','HJ','CO','BTN'];
return ORDER.indexOf(heroPos) > ORDER.indexOf(oppPos);
}

function getOpenSize$() { return (state && state.config && state.config.openSize) ? state.config.openSize : getCurrentStakePreset().defaultOpen; }
function getOpenSizeBB() { return getOpenSize$() / getBigBlind$(); }

// ---------------------------------------------------------------------------
// Central pot display helpers
// ---------------------------------------------------------------------------

// Total committed money (in $) at hero's decision point, per scenario.
// Used by both the animation end-state and the static updateTable renderer.
function getScenarioPot$(scenario) {
    const open$ = getOpenSize$();
    const villain$ = getVillainOpenSize$();
    const blinds$ = getBlindTotal$(); // SB + BB — stake-aware

    if (scenario === 'RFI') {
        // Blinds only — hero hasn't committed yet
        return blinds$;
    }
    if (scenario === 'FACING_RFI') {
        // Villain opened + both blinds in pot
        return villain$ + blinds$;
    }
    if (scenario === 'RFI_VS_3BET' || scenario === 'RFI_VS_3') {
        // Hero open + villain 3-bet + dead SB ($1); villain is typically BB so already counted in 3-bet
        const threeBet$ = get3betSize$(state.oppPos, state.currentPos || state.heroPos || 'BTN');
        return open$ + threeBet$ + getSmallBlind$(); // dead SB
    }
    if (scenario === 'VS_4BET') {
        // Hero 3-bet + villain 4-bet + dead SB
        const hp = state.currentPos || 'BTN';
        const op = state.oppPos || 'UTG';
        const threeBet$ = get3betSize$(hp, op); // hero's 3-bet
        const fourBet$ = get4betSize$(op, hp);  // villain's 4-bet
        return threeBet$ + fourBet$ + getSmallBlind$();
    }
    if (scenario === 'VS_LIMP') {
        // Each limper called 1BB ($3) + SB ($1) + BB ($3)
        const limpers = (state.limperPositions && state.limperPositions.length) || 1;
        return limpers * getBigBlind$() + blinds$;
    }
    if (scenario === 'SQUEEZE') {
        // Opener + 1 caller + blinds
        return villain$ * 2 + blinds$;
    }
    if (scenario === 'SQUEEZE_2C') {
        // Opener + 2 callers + blinds
        return villain$ * 3 + blinds$;
    }
    if (scenario === 'PUSH_FOLD') {
        // Just the blinds before hero shoves
        return blinds$;
    }
    if (scenario === 'POSTFLOP_CBET') {
        if (state.postflop) return getSRPPot$(state.postflop.preflopFamily);
        return open$ * 2 + getSmallBlind$();
    }
    if (scenario === 'POSTFLOP_3BP_CBET') {
        if (state.postflop) return get3BPPot$(state.postflop.preflopFamily);
        return open$ * 6 + getSmallBlind$() + getBigBlind$();
    }
    if (scenario === 'POSTFLOP_DEFEND') {
        if (state.postflop) return getSRPPot$(state.postflop.preflopFamily);
        return open$ * 2 + getSmallBlind$();
    }
    if (scenario === 'POSTFLOP_3BP_DEFEND') {
        if (state.postflop) return get3BPPot$(state.postflop.preflopFamily);
        return open$ * 6 + getSmallBlind$() + getBigBlind$();
    }
    if (scenario === 'POSTFLOP_3BP_TURN_CBET' || scenario === 'POSTFLOP_3BP_TURN_DEFEND') {
        if (state.postflop) return Math.round(get3BPPot$(state.postflop.preflopFamily) * 1.66);
        return Math.round((open$ * 6 + getSmallBlind$() + getBigBlind$()) * 1.66);
    }
    if (scenario === 'POSTFLOP_3BP_RIVER_CBET' || scenario === 'POSTFLOP_3BP_RIVER_DEFEND') {
        if (state.postflop) return Math.round(get3BPPot$(state.postflop.preflopFamily) * 3.3);
        return Math.round((open$ * 6 + getSmallBlind$() + getBigBlind$()) * 3.3);
    }
    if (scenario === 'POSTFLOP_TURN_CBET') {
        if (state.postflop) return Math.round(getSRPPot$(state.postflop.preflopFamily) * 1.66);
        return Math.round((open$ * 2 + getSmallBlind$()) * 1.66);
    }
    if (scenario === 'POSTFLOP_TURN_DEFEND') {
        if (state.postflop) return Math.round(getSRPPot$(state.postflop.preflopFamily) * 1.66);
        return Math.round((open$ * 2 + getSmallBlind$()) * 1.66);
    }
    if (scenario === 'POSTFLOP_TURN_DELAYED_CBET') {
        if (state.postflop) return getSRPPot$(state.postflop.preflopFamily);
        return open$ * 2 + getSmallBlind$();
    }
    if (scenario === 'POSTFLOP_TURN_PROBE' || scenario === 'POSTFLOP_TURN_DELAYED_DEFEND') {
        // Flop checked through, no flop bet — pot = 1.0x flop SRP
        if (state.postflop) return getSRPPot$(state.postflop.preflopFamily);
        return open$ * 2 + getSmallBlind$();
    }
    if (scenario === 'POSTFLOP_TURN_PROBE_DEFEND') {
        // BB hero probing: pot same as checked-through flop
        if (state.postflop) return getSRPPot$(state.postflop.preflopFamily);
        return open$ * 2 + getSmallBlind$();
    }
    if (scenario === 'POSTFLOP_RIVER_CBET') {
        // Flop 33% bet + turn 50% bet → river pot ≈ 3.3x flop pot
        if (state.postflop) return Math.round(getSRPPot$(state.postflop.preflopFamily) * 3.3);
        return Math.round((open$ * 2 + getSmallBlind$()) * 3.3);
    }
    if (scenario === 'POSTFLOP_RIVER_DEFEND') {
        if (state.postflop) return Math.round(getSRPPot$(state.postflop.preflopFamily) * 3.3);
        return Math.round((open$ * 2 + getSmallBlind$()) * 3.3);
    }
    if (scenario === 'POSTFLOP_RIVER_DELAYED_CBET' || scenario === 'POSTFLOP_RIVER_DELAYED_DEFEND') {
        // Flop checked through (no growth) + turn 50% bet → river pot = 2.0x flop pot
        if (state.postflop) return Math.round(getSRPPot$(state.postflop.preflopFamily) * 2.0);
        return Math.round((open$ * 2 + getSmallBlind$()) * 2.0);
    }
    if (scenario === 'POSTFLOP_RIVER_PROBE' || scenario === 'POSTFLOP_RIVER_PROBE_BET') {
        // Double check-through (no betting) → river pot = 1.0x flop pot
        if (state.postflop) return getSRPPot$(state.postflop.preflopFamily);
        return open$ * 2 + getSmallBlind$();
    }
    if (scenario === 'POSTFLOP_RIVER_TURN_CHECK_CBET' || scenario === 'POSTFLOP_RIVER_TURN_CHECK_DEFEND') {
        // Flop c-bet called, turn checks → river pot = 1.66x flop SRP
        if (state.postflop) return Math.round(getSRPPot$(state.postflop.preflopFamily) * 1.66);
        return Math.round((open$ * 2 + getSmallBlind$()) * 1.66);
    }
    if (scenario === 'POSTFLOP_RIVER_PROBE_CALL_BET' || scenario === 'POSTFLOP_RIVER_PROBE_CALL_DEFEND') {
        // Flop check + turn probe called → river pot = 2.0x flop SRP
        if (state.postflop) return Math.round(getSRPPot$(state.postflop.preflopFamily) * 2.0);
        return Math.round((open$ * 2 + getSmallBlind$()) * 2.0);
    }
    return blinds$;
}

// Pot size for a SRP (Single Raised Pot) heading into the flop.
// Dead money (folded blinds) differs by preflop family.
function getSRPPot$(preflopFamily) {
    const sb = getSmallBlind$();
    const dead = { BTN_vs_BB:sb, CO_vs_BB:sb, HJ_vs_BB:sb, LJ_vs_BB:sb, UTG_vs_BB:sb,
                   SB_vs_BB:0, BTN_vs_SB:getBigBlind$(), CO_vs_BTN:getBlindTotal$() };
    return getOpenSize$() * 2 + (dead[preflopFamily] !== undefined ? dead[preflopFamily] : sb);
}
// Pot size for a 3BP (Three Bet Pot) heading into the flop.
// Formula: (3bet size × 2) + dead money. Dead money differs by who 3bet.
// IP families: both blinds fold → dead = SB + BB.
// BB 3bets: only SB folds → dead = SB (BB's own blind is already in BB's total).
// SB 3bets: only BB folds → dead = BB.
function get3BPPot$(preflopFamily) {
    const threeBet = getOpenSize$() * 3;
    const sb = getSmallBlind$(), bb = getBigBlind$();
    const dead = {
        BB_3BP_vs_BTN: sb, BB_3BP_vs_CO: sb, BB_3BP_vs_HJ: sb,  // only SB is dead
        SB_3BP_vs_BTN: bb, SB_3BP_vs_CO: bb, SB_3BP_vs_HJ: bb, SB_3BP_vs_UTG: bb, // only BB is dead
    };
    const deadAmt = dead[preflopFamily] !== undefined ? dead[preflopFamily] : sb + bb;
    return threeBet * 2 + deadAmt;
}

// Render a single central pot badge on the felt — positioned above community cards
// (which sit at top:50%) but below the top seats (top:8-20%).
// Safe zone: top ~38% desktop, ~36% mobile.
function renderPotBadge(betsLayer, total$) {
    const isMob = (SEAT_COORDS === SEAT_COORDS_MOBILE);
    // Position in the gap between the left side-seats (left ~3-12%) and the
    // community cards (centered at left:50%). left:22% sits comfortably in that
    // gap on both desktop and mobile. Vertically aligned with the card row (top:50%).
    // Mobile: community cards moved to strip below felt, so felt center is free.
    // Center the pot badge at 50% to sit naturally in the now-open felt.
    const potLeft = isMob ? 50 : 22;
    const potTop  = isMob ? 48 : 50;
    const badge = document.createElement('div');
    badge.id = 'pot-badge';
    badge.className = 'absolute z-40 pointer-events-none flex flex-col items-center gap-0.5';
    badge.style.cssText = `left:${potLeft}%;top:${potTop}%;transform:translate(-50%,-50%);`;
    badge.innerHTML =
        `<div style="width:var(--pot-chip,18px);height:var(--pot-chip,18px);" ` +
        `class="rounded-full bg-amber-500 border-2 border-white/30 shadow-md"></div>` +
        `<span style="font-size:var(--chip-font,9px);" ` +
        `class="font-black text-amber-300 bg-black/60 px-1.5 py-0.5 rounded-full whitespace-nowrap">` +
        `${formatPot(total$)}</span>`;
    betsLayer.appendChild(badge);
}

// ---------------------------------------------------------------------------
// Postflop action indicators — check mark or bet chip near villain seat
// ---------------------------------------------------------------------------

// Show a "✓ Check" badge next to the villain's seat
function renderVillainCheck(betsLayer, heroPos, villainPos) {
    const coords = getSeatCoords(heroPos, villainPos);
    const origL = parseFloat(coords.left), origT = parseFloat(coords.top);
    const isMob = (SEAT_COORDS === SEAT_COORDS_MOBILE);

    // Nudge toward center
    let cL = origL, cT = origT;
    const off = isMob ? 10 : 14;
    if (cL < 45) cL += off; else if (cL > 55) cL -= off;
    if (cT < 45) cT += off; else if (cT > 55) cT -= off;
    // Extra clearance for edge seats
    if (origT > (isMob ? 75 : 80)) cT -= (isMob ? 8 : 10);
    if (origT < (isMob ? 15 : 12)) cT += (isMob ? 6 : 8);
    cL = Math.max(8, Math.min(92, cL));
    cT = Math.max(10, Math.min(88, cT));

    const el = document.createElement('div');
    el.className = 'absolute z-40 pointer-events-none flex items-center gap-1';
    el.style.cssText = `left:${cL}%;top:${cT}%;transform:translate(-50%,-50%);animation:ccDeal 0.25s ease-out both;`;
    el.innerHTML =
        `<div style="width:var(--chip-size,16px);height:var(--chip-size,16px);" ` +
        `class="rounded-full bg-slate-700 border-2 border-slate-500 flex items-center justify-center">` +
        `<span style="font-size:var(--chip-font,9px);" class="font-black text-emerald-400 leading-none">✓</span></div>` +
        `<span style="font-size:var(--chip-font,9px);" class="font-black text-slate-400 bg-black/40 px-1 rounded">Check</span>`;
    betsLayer.appendChild(el);
}

// Show a bet chip + amount next to the villain's seat (separate from pot)
function renderVillainBet(betsLayer, heroPos, villainPos, betAmount$) {
    const coords = getSeatCoords(heroPos, villainPos);
    const origL = parseFloat(coords.left), origT = parseFloat(coords.top);
    const isMob = (SEAT_COORDS === SEAT_COORDS_MOBILE);

    // Nudge toward center
    let cL = origL, cT = origT;
    const off = isMob ? 10 : 14;
    if (cL < 45) cL += off; else if (cL > 55) cL -= off;
    if (cT < 45) cT += off; else if (cT > 55) cT -= off;
    // Extra clearance for edge seats
    if (origT > (isMob ? 75 : 80)) cT -= (isMob ? 8 : 10);
    if (origT < (isMob ? 15 : 12)) cT += (isMob ? 6 : 8);
    cL = Math.max(8, Math.min(92, cL));
    cT = Math.max(10, Math.min(88, cT));

    const el = document.createElement('div');
    el.className = 'absolute z-40 pointer-events-none flex items-center gap-1';
    el.style.cssText = `left:${cL}%;top:${cT}%;transform:translate(-50%,-50%);animation:ccDeal 0.25s ease-out both;`;
    el.innerHTML =
        `<div style="width:var(--chip-size,16px);height:var(--chip-size,16px);" ` +
        `class="rounded-full bg-rose-600 border-2 border-white/20 shadow-md"></div>` +
        `<span style="font-size:var(--chip-font,9px);" class="font-black text-yellow-400 bg-black/40 px-1 rounded">${formatAmt(betAmount$)}</span>`;
    betsLayer.appendChild(el);
}

// Villain open size: randomized per-hand from a realistic pool for the current stake.
function pickVillainOpenSize() {
    const pool = getCurrentStakePreset().villainOpenPool;
    return pool[Math.floor(Math.random() * pool.length)];
}
function getVillainOpenSize$() {
return (state && state.villainOpenSize) ? state.villainOpenSize : getCurrentStakePreset().defaultOpen;
}

function getIsoSize$(numLimpers) {
const bb = 5 + (numLimpers || 0);
return bb * getBigBlind$();
}


function get4betSize$(heroPos, villainPos){
const open$ = getOpenSize$();
const threeBet$ = get3betSize$(villainPos, heroPos); // villain 3-bet size vs hero open
const heroIP = postflopIP(heroPos, villainPos);
const mult = heroIP ? 2.2 : 2.5;
return roundLiveDollars(threeBet$ * mult);
}
function get5betSize$(heroPos, villainPos){
// 5-bet is typically a shove in live poker, approximated as 2.2× the 4-bet
const fourBet$ = get4betSize$(villainPos, heroPos); // villain's 4-bet size (they are 4-betting hero)
return roundLiveDollars(fourBet$ * 2.2);
}
function get3betSize$(heroPos, oppPos, openOverride) {
const open = openOverride !== undefined ? openOverride : getOpenSize$();
const isIP = postflopIP(heroPos, oppPos);
const mult = isIP ? 3.0 : 4.0; // IP: 3× open, OOP: 4× open
return open * mult;
}

function getSqueezeSize$(heroPos, openerPos, numCallers, openOverride) {
const open = openOverride !== undefined ? openOverride : getOpenSize$();
const isIP = postflopIP(heroPos, openerPos);
const base = isIP ? 3.5 : 4.5;
const callers = numCallers || 0;
return open * (base + callers * 1.0);
}

function buttonLabelWithHint(main, hint) {
return main; // hint rendered below buttons
}

function setSizingHint(text) {
const el = document.getElementById('sizing-hint-line');
if (!el) return;
el.textContent = text || '';
}

function renderButtons(hidden) {
const container = document.getElementById('action-buttons');
setSizingHint('');
const stateClass = hidden ? 'action-buttons-hidden' : 'action-buttons-revealed';
const btnStyle = `style="padding:var(--btn-pad, 14px) 0;font-size:var(--btn-font, 14px);"`;

// Compute sizing context (display only)
const open$ = getOpenSize$();
const openBB = getOpenSizeBB();
const limpers = (state.limperPositions && Array.isArray(state.limperPositions)) ? state.limperPositions.length : 1;

if (state.scenario === 'RFI') {
const raiseMain = `RAISE TO ${formatAmt(open$)}`;
const raiseHint = `Open: ${openBB.toFixed(0)}bb`;
setSizingHint(raiseHint);
container.innerHTML = `<div class="grid grid-cols-2 gap-3 ${stateClass}">
    <button onclick="handleInput('FOLD')" ${btnStyle} class="pc-btn pc-btn-fold">FOLD</button>
    <button onclick="handleInput('RAISE')" ${btnStyle} class="pc-btn pc-btn-aggressive">${raiseMain}</button>
</div>`;
} else if (state.scenario === 'FACING_RFI') {
const villainOpen$ = getVillainOpenSize$();
const threeBet$ = get3betSize$(state.currentPos, state.oppPos, villainOpen$);
const isIP = postflopIP(state.currentPos, state.oppPos);
const threeMain = `3-BET TO ${formatAmt(threeBet$)}`;
const threeHint = isIP ? `IP 3-bet: 3× open (${formatAmt(villainOpen$)})` : `OOP 3-bet: 4× open (${formatAmt(villainOpen$)})`;
setSizingHint(threeHint);
container.innerHTML = `<div class="grid grid-cols-3 gap-3 ${stateClass}">
    <button onclick="handleInput('FOLD')" ${btnStyle} class="pc-btn pc-btn-fold">FOLD</button>
    <button onclick="handleInput('CALL')" ${btnStyle} class="pc-btn pc-btn-passive">CALL</button>
    <button onclick="handleInput('3BET')" ${btnStyle} class="pc-btn pc-btn-aggressive">${threeMain}</button>
</div>`;
} else if (state.scenario === 'VS_LIMP') {
const isBB = state.currentPos === 'BB';
const isSB = state.currentPos === 'SB';

const passiveLabel = isBB ? 'CHECK' : isSB ? 'COMPLETE' : 'LIMP';
const raiseAction = 'ISO';
const raiseLabel = (isSB || isBB) ? 'RAISE' : 'ISO RAISE';

const iso$ = getIsoSize$(limpers);
const isoMain = `${raiseLabel} TO ${formatAmt(iso$)}`;
const isoHint = `Iso: 5bb + 1bb/limper (${limpers} limper${limpers===1?'':'s'})`;
setSizingHint(isoHint);

container.innerHTML = `<div class="grid grid-cols-3 gap-3 ${stateClass}">
    <button onclick="handleInput('${isBB ? 'OVERLIMP' : 'FOLD'}')" ${btnStyle} class="pc-btn pc-btn-fold">${isBB ? 'CHECK' : 'FOLD'}</button>
    ${isBB ? '' : `<button onclick="handleInput('OVERLIMP')" ${btnStyle} class="pc-btn pc-btn-passive">${passiveLabel}</button>`}
    <button onclick="handleInput('${raiseAction}')" ${btnStyle} class="pc-btn pc-btn-aggressive ${isBB ? 'col-span-2' : ''}">${isoMain}</button>
</div>`;
} else if (state.scenario === 'SQUEEZE' || state.scenario === 'SQUEEZE_2C') {
const callers = (state.scenario === 'SQUEEZE_2C') ? 2 : 1;
const opener = state.squeezeOpener || state.oppPos;
const villainOpen$ = getVillainOpenSize$();
const squeeze$ = getSqueezeSize$(state.currentPos, opener, callers, villainOpen$);
const isIP = postflopIP(state.currentPos, opener);
const main = `SQUEEZE TO ${formatAmt(squeeze$)}`;
const hint = isIP ? `IP squeeze: 3.5× + 1×/caller off ${formatAmt(villainOpen$)} open` : `OOP squeeze: 4.5× + 1×/caller off ${formatAmt(villainOpen$)} open`;
setSizingHint(hint);

container.innerHTML = `<div class="grid grid-cols-3 gap-3 ${stateClass}">
    <button onclick="handleInput('FOLD')" ${btnStyle} class="pc-btn pc-btn-fold">FOLD</button>
    <button onclick="handleInput('CALL')" ${btnStyle} class="pc-btn pc-btn-passive">CALL</button>
    <button onclick="handleInput('SQUEEZE')" ${btnStyle} class="pc-btn pc-btn-squeeze">${main}</button>
</div>`;

} else if (state.scenario === 'RFI_VS_3BET' || state.scenario === 'RFI_VS_3') {
const threeBet$ = get3betSize$(state.oppPos, state.currentPos);
const heroIP = postflopIP(state.currentPos, state.oppPos);
const fourBet$ = get4betSize$(state.currentPos, state.oppPos);
const hint = heroIP ? `IP 4-bet: 2.2× 3-bet (${formatAmt(threeBet$)})` : `OOP 4-bet: 2.5× 3-bet (${formatAmt(threeBet$)})`;
setSizingHint(hint);

container.innerHTML = `<div class="grid grid-cols-3 gap-3 ${stateClass}">
    <button onclick="handleInput('FOLD')" ${btnStyle} class="pc-btn pc-btn-fold">FOLD</button>
    <button onclick="handleInput('CALL')" ${btnStyle} class="pc-btn pc-btn-passive">CALL</button>
    <button onclick="handleInput('4BET')" ${btnStyle} class="pc-btn pc-btn-aggressive">4-BET TO ${formatAmt(fourBet$)}</button>
</div>`;

} else if (state.scenario === 'VS_4BET') {
const fourBet$ = get4betSize$(state.oppPos, state.currentPos); // villain's 4-bet
const fiveBet$ = get5betSize$(state.currentPos, state.oppPos);
setSizingHint(`Villain 4-bet: ${formatAmt(fourBet$)} · 5-bet shove: 2.2× ${formatAmt(fourBet$)} = ${formatAmt(fiveBet$)}`);

container.innerHTML = `<div class="grid grid-cols-3 gap-3 ${stateClass}">
    <button onclick="handleInput('FOLD')" ${btnStyle} class="pc-btn pc-btn-fold">FOLD</button>
    <button onclick="handleInput('CALL')" ${btnStyle} class="pc-btn pc-btn-passive">CALL</button>
    <button onclick="handleInput('5BET')" ${btnStyle} class="pc-btn pc-btn-shove">5-BET SHOVE</button>
</div>`;

} else if (state.scenario === 'PUSH_FOLD') {
const shove$ = (state.stackBB || 10) * getBigBlind$();
setSizingHint(`Shoving ${state.stackBB}BB (${formatAmt(shove$)})`);
container.innerHTML = `<div class="grid grid-cols-2 gap-3 ${stateClass}">
    <button onclick="handleInput('FOLD')" ${btnStyle} class="pc-btn pc-btn-fold">FOLD</button>
    <button onclick="handleInput('SHOVE')" ${btnStyle} class="pc-btn pc-btn-shove">ALL IN</button>
</div>`;
} else {
container.innerHTML = `<div class="grid grid-cols-2 gap-3 ${stateClass}">
    <button onclick="handleInput('FOLD')" ${btnStyle} class="pc-btn pc-btn-fold">FOLD</button>
    <button onclick="handleInput('RAISE')" ${btnStyle} class="pc-btn pc-btn-aggressive">RAISE</button>
</div>`;
}
}


// Reveal the action buttons (swap hidden -> revealed)
function revealButtons() {
    const grid = document.querySelector('#action-buttons > div');
    if (grid) {
        grid.classList.remove('action-buttons-hidden');
        grid.classList.add('action-buttons-revealed');
    }
}

// checkRangeHelper — alias to canonical definition in engine.js
// All callers in ui.js continue to work without modification.
// (Canonical definition moved to engine.js Phase 1 refactor.)
// checkRangeHelper is now a global defined in engine.js; no alias needed here.
// This comment block preserves the location for reference.

// Store chart context so bucket toggle can re-render
// _chartCtx.bucket is the chart-LOCAL bucket — never written back to state.limperBucket.
let _chartCtx = { pos: null, target: null, scenario: null, oppPos: null, bucket: '1L' };

function showChart(pos, target, scenario, oppPos, bucketOverride) {
    // Snapshot the correct bucket for chart display at open-time.
    // bucketOverride is provided by library/log-row callers that must not touch state.
    // For in-training mistake charts, state.limperBucket is correct at this moment.
    const chartBucket = bucketOverride != null
        ? bucketOverride
        : (scenario === 'VS_LIMP' ? (state.limperBucket || '1L') : '1L');
    _chartCtx = { pos, target, scenario, oppPos, bucket: chartBucket };
    _renderChart(pos, target, scenario, oppPos);
    document.getElementById('chart-modal').classList.remove('hidden');
}


// === "WHY" EXPLANATIONS for chart modal ===
// Returns a short explanation string for the correct action given hand/scenario/position context.
// Covers edge cases and common confusions — empty string for trivial/obvious situations.
function getWhyText(hand, correctAction, scenario, heroPos, oppPos) {
    const r1 = hand[0], r2 = hand[1], suited = hand[2] === 's', pair = r1 === r2;
    const RANKS_STR = 'AKQJT98765432';
    const rank = r => RANKS_STR.indexOf(r);
    const topRank = rank(r1); // lower index = higher rank
    const isIP = postflopIP(heroPos, oppPos);
    const posLabel = p => POS_LABELS[p] || p;

    // Helper: is this hand a blocker hand (Ax suited/offsuit)?
    const isAx = r1 === 'A' && !pair;
    const isSuited = suited && !pair;
    const isBroadway = !pair && rank(r1) <= 4 && rank(r2) <= 4; // T or better on both
    const isConnector = !pair && Math.abs(rank(r1) - rank(r2)) === 1;
    const isOneGapper = !pair && Math.abs(rank(r1) - rank(r2)) === 2;
    const highRank = Math.min(rank(r1), rank(r2)); // smaller index = stronger

    if (scenario === 'RFI') {
        if (correctAction === 'RAISE') {
            if (pair && rank(r1) >= 6) return `Small pairs have set-mining value — open from ${posLabel(heroPos)} and get stacks in on the flop.`;
            if (isAx && suited && rank(r2) >= 5) return `Ax suited hands have strong equity + nut flush potential — always open from ${posLabel(heroPos)}.`;
            if (isSuited && isConnector) return `Suited connectors make straights and flushes — worth opening from ${posLabel(heroPos)} for their multiway potential.`;
            if (isBroadway) return `Broadway hands dominate calling ranges and have strong showdown value.`;
            return ''; // don't explain obvious opens
        } else { // FOLD
            if (isSuited && isConnector) return `${hand} is too weak to open from ${posLabel(heroPos)} — the range is tight here. Wait for better spots.`;
            if (pair) return `${hand} is marginal from ${posLabel(heroPos)} — not enough equity to profitably open this early.`;
            if (isAx && !suited) return `Weak offsuit Ax hands are dominated too often from ${posLabel(heroPos)} — fold and wait for suited or better kickers.`;
            return `${hand} doesn't have enough raw equity or playability to open from ${posLabel(heroPos)}.`;
        }
    }

    if (scenario === 'FACING_RFI') {
        const opener = posLabel(oppPos);
        const pos = posLabel(heroPos);
        if (correctAction === '3BET') {
            if (pair && rank(r1) <= 2) return `${hand} is a value 3-bet — you have near-top equity. Charge ${opener} to continue.`;
            if (isAx && suited && rank(r2) <= 3) return `A5s–A2s are classic 3-bet bluffs — they block the villain's 4-bet range (AA) and have good equity when called.`;
            if (isAx && suited) return `Strong Ax suited hands are 3-bet value from ${pos} — great equity vs ${opener}'s range and builds pots in position.`;
            if (isBroadway && suited) return `${hand} is a thin 3-bet — strong enough for value, blocks villain's best broadway combos.`;
            return `${hand} 3-bets here for value — your hand dominates ${opener}'s continuing range.`;
        } else if (correctAction === 'CALL') {
            if (pair && rank(r1) >= 5 && rank(r1) <= 8) return `Medium pairs — too strong to fold, not strong enough to 3-bet. Call and set-mine or play fit-or-fold.`;
            if (pair && rank(r1) > 8) return `Small pairs play best as calls vs ${opener} — you want to see a cheap flop and hit your set.`;
            if (isSuited && (isConnector || isOneGapper)) return `${hand} has good implied odds when called — suited rundowns flop well multiway and disguise their strength.`;
            if (isAx && suited) return `${hand} calls here — strong enough to continue but not the nut 3-bet hand from this position.`;
            if (isBroadway) return `${hand} has good equity and dominates ${opener}'s weaker broadway hands — flat and realize that equity.`;
            return `${hand} is a call vs ${opener} — good equity to continue but not strong enough to repot.`;
        } else { // FOLD
            if (isSuited && isConnector) return `${hand} is a fold vs ${opener} — too weak to 3-bet profitably and implied odds aren't there out of position.`;
            if (isAx && !suited) return `Weak offsuit Ax folds vs ${opener} — you'll often be dominated and have no backdoor equity.`;
            if (pair && rank(r1) >= 9) return `${hand} is a fold — too small to set-mine profitably here and not good enough to 3-bet.`;
            return `${hand} doesn't have enough equity or playability to continue vs ${opener}'s opening range.`;
        }
    }

    if (scenario === 'RFI_VS_3BET') {
        const threeBettor = posLabel(oppPos);
        if (correctAction === '4BET') {
            if (pair && rank(r1) <= 2) return `${hand} is a 4-bet for value — you have near-nuts. Get it in.`;
            if (isAx && suited && rank(r2) >= 4) return `A5s–A3s are 4-bet bluffs — they block AA (reducing villain's value combos) and have decent equity if called.`;
            if (isAx && !suited && rank(r2) >= 5) return `Ax offsuit 4-bets as a bluff here — blocks AA combos and folds out hands that have you beat.`;
            return `${hand} 4-bets for value vs ${threeBettor}'s 3-bet range.`;
        } else if (correctAction === 'CALL') {
            if (pair) return `${hand} calls the 3-bet — set-mining odds are good at these depths, and you avoid flipping against a tight 4-bet range.`;
            if (isBroadway && suited) return `${hand} has strong equity vs ${threeBettor}'s 3-bet range — call and realize equity ${isIP ? 'in position' : 'with your hand strength'}.`;
            if (isSuited && (isConnector || isOneGapper)) return `${hand} has the implied odds to call a 3-bet — you flop well and can stack villain on good boards.`;
            return `${hand} calls here — strong enough to continue, not strong enough to 4-bet without blockers.`;
        } else { // FOLD
            if (isSuited && isConnector) return `${hand} folds to the 3-bet — implied odds aren't there at these stack depths${isIP ? '' : ' out of position'}.`;
            if (isAx && !suited) return `Weak offsuit Ax folds vs a 3-bet — you don't block enough and the equity vs a 3-bet range is thin.`;
            return `${hand} isn't strong enough to continue vs ${threeBettor}'s 3-bet — fold and wait for better spots.`;
        }
    }

    if (scenario === 'VS_LIMP') {
        const isBlinds = heroPos === 'SB' || heroPos === 'BB';
        if (correctAction === 'ISO' || correctAction === 'RAISE') {
            if (pair && rank(r1) <= 4) return `${hand} iso-raises to thin the field and build a pot — you have strong equity and don't want multiway action.`;
            if (isBroadway) return `${hand} iso-raises — strong hand that plays best heads-up or short-handed, not multiway.`;
            if (isAx && suited) return `${hand} iso-raises — nut flush potential plus strong equity heads-up.`;
            return `${hand} is strong enough to iso-raise — take initiative and build the pot with a quality hand.`;
        } else if (correctAction === 'OVERLIMP') {
            if (pair && rank(r1) >= 5) return `${hand} overlimps for set value — good implied odds in a multiway pot, no need to iso with a medium pair.`;
            if (isSuited && (isConnector || isOneGapper)) return `${hand} overlimps — suited rundowns want to see cheap multiway flops where they can make disguised straights and flushes.`;
            return `${hand} calls — good multiway value but not strong enough to iso-raise and play heads-up.`;
        } else { // FOLD
            if (!isBlinds) return `${hand} folds — not worth investing even a limp with this hand from ${posLabel(heroPos)}.`;
            return `${hand} folds — even in the blinds, this hand doesn't play well enough multiway.`;
        }
    }

    if (scenario === 'SQUEEZE' || scenario === 'SQUEEZE_2C') {
        const numCallers = scenario === 'SQUEEZE_2C' ? 2 : 1;
        if (correctAction === 'SQUEEZE') {
            if (pair && rank(r1) <= 3) return `${hand} squeezes for value — your hand dominates. More callers = more dead money.`;
            if (isAx && suited && rank(r2) >= 4) return `${hand} is a squeeze bluff — blocks AA/AK combos, and if called you have nut-flush outs.`;
            return `${hand} squeezes — ${numCallers > 1 ? 'two callers means more dead money and' : ''} your hand has strong enough equity to pile it in.`;
        } else if (correctAction === 'CALL') {
            return `${hand} calls — your hand plays well multiway but isn't strong enough to repot vs the opener and ${numCallers} caller${numCallers > 1 ? 's' : ''}.`;
        } else {
            return `${hand} folds — squeezing requires a strong hand or great blocker. This hand has neither here.`;
        }
    }

    return ''; // fallback: no explanation
}

function _renderChart(pos, target, scenario, oppPos) {
    let html = '';
    const legendEl = document.getElementById('chart-legend');
    const bucketToggle = document.getElementById('chart-bucket-toggle');

    // "Why" explanation — only shown when called after a wrong answer (target is the missed hand)
    const whyEl = document.getElementById('chart-why-text');
    if (whyEl && target) {
        try {
            const effOpp = (scenario === 'VS_LIMP') ? `${oppPos}|${_chartCtx.bucket}` : oppPos;
const correctAction = EdgeWeight.getCorrectAction(target, scenario, pos, effOpp);
const why = getWhyText(target, correctAction, scenario, pos, effOpp);
            if (why) {
                whyEl.textContent = why;
                whyEl.classList.remove('hidden');
            } else {
                whyEl.textContent = '';
                whyEl.classList.add('hidden');
            }
        } catch(e) {
            whyEl.textContent = '';
            whyEl.classList.add('hidden');
        }
    } else if (whyEl) {
        whyEl.textContent = '';
        whyEl.classList.add('hidden');
    }
    
    if (scenario === 'RFI') {
        legendEl.innerHTML = `<div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-indigo-600 rounded"></div><span>Raise</span></div>`;
    } else if (scenario === 'VS_LIMP') {
        const lData = getLimpDataForBucket(pos, oppPos, _chartCtx.bucket) || allFacingLimps[`${pos}_vs_${oppPos}_Limp`];
        const isBB = lData && isLimpBBSpot(lData);
        const isBlinds = lData && isLimpBlindSpot(lData);
        const rLabel = isBlinds ? 'Raise' : 'Iso Raise';
        const pLabel = isBB ? 'Check' : isBlinds ? 'Complete' : 'Overlimp';
        legendEl.innerHTML = `<div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-orange-600 rounded"></div><span>${rLabel}</span></div><div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-cyan-700 rounded"></div><span>${pLabel}</span></div>`;
    } else if (scenario === 'SQUEEZE' || scenario === 'SQUEEZE_2C') {
        legendEl.innerHTML = `<div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-red-600 rounded"></div><span>Squeeze</span></div><div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-red-600 rounded sq-bluff-stripe"></div><span>Squeeze (Bluff)</span></div><div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-emerald-600 rounded"></div><span>Call</span></div>`;
    } else if (scenario === 'VS_4BET') {
        legendEl.innerHTML = `<div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-red-600 rounded"></div><span>5-Bet Shove</span></div><div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-emerald-600 rounded"></div><span>Call</span></div>`;
    } else {
        const label1 = scenario === 'RFI_VS_3BET' ? '4-Bet' : '3-Bet';
        legendEl.innerHTML = `<div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-indigo-600 rounded"></div><span>${label1}</span></div><div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-emerald-600 rounded"></div><span>Call</span></div>`;
    }

    // Bucket toggle for VS_LIMP
    if (scenario === 'VS_LIMP') {
        const buckets = ['1L', '2L', '3P'];
        const labels = { '1L': '1 Limper', '2L': '2 Limpers', '3P': '3+ Limpers' };
        bucketToggle.classList.remove('hidden');
        bucketToggle.innerHTML = buckets.map(b => {
            const sel = b === _chartCtx.bucket;
            return `<button onclick="switchChartBucket('${b}')" class="pc-chip pc-chip-sm ${sel ? 'active' : ''}">${labels[b]}</button>`;
        }).join('');
    } else {
        bucketToggle.classList.add('hidden');
        bucketToggle.innerHTML = '';
    }

    for (let i = 0; i < 13; i++) {
        for (let j = 0; j < 13; j++) {
            const r1 = RANKS[i], r2 = RANKS[j];
            let hKey = (i === j) ? r1 + r2 : (i < j ? r1 + r2 + 's' : r2 + r1 + 'o');
            let bg = 'bg-slate-800';
            if (scenario === 'RFI') {
                if (checkRangeHelper(hKey, rfiRanges[pos])) bg = 'bg-indigo-600';
            } else if (scenario === 'FACING_RFI') {
                const d = facingRfiRanges[`${pos}_vs_${oppPos}`];
                if (checkRangeHelper(hKey, d["3-bet"])) bg = 'bg-indigo-600';
                else if (checkRangeHelper(hKey, d["Call"])) bg = 'bg-emerald-600';
            } else if (scenario === 'VS_LIMP') {
                const d = getLimpDataForBucket(pos, oppPos, _chartCtx.bucket) || allFacingLimps[`${pos}_vs_${oppPos}_Limp`];
                if (d && checkRangeHelper(hKey, getLimpRaise(d))) bg = 'bg-orange-600';
                else if (d && checkRangeHelper(hKey, getLimpPassive(d))) bg = 'bg-cyan-700';
            } else if (scenario === 'SQUEEZE') {
                const d = squeezeRanges[oppPos];
                if (d && checkRangeHelper(hKey, d["Squeeze"])) { bg = 'bg-red-600'; if (isSqueezeBluff(hKey, d)) bg = 'bg-red-600 sq-bluff-stripe'; }
                else if (d && d["Call"] && checkRangeHelper(hKey, d["Call"])) bg = 'bg-emerald-600';
            } else if (scenario === 'SQUEEZE_2C') {
                const d = squeezeVsRfiTwoCallers[oppPos];
                if (d && checkRangeHelper(hKey, d["Squeeze"])) { bg = 'bg-red-600'; if (isSqueezeBluff(hKey, d)) bg = 'bg-red-600 sq-bluff-stripe'; }
                else if (d && d["Call"] && checkRangeHelper(hKey, d["Call"])) bg = 'bg-emerald-600';
            } else if (scenario === 'VS_4BET') {
                const d = vs4BetRanges[`${pos}_vs_${oppPos}`];
                if (d && checkRangeHelper(hKey, d["5-bet"])) bg = 'bg-red-600';
                else if (d && checkRangeHelper(hKey, d["Call"])) bg = 'bg-emerald-600';
            } else {
                const d = rfiVs3BetRanges[`${pos}_vs_${oppPos}`];
                if (d && checkRangeHelper(hKey, d["4-bet"])) bg = 'bg-indigo-600';
                else if (d && checkRangeHelper(hKey, d["Call"])) bg = 'bg-emerald-600';
            }
            const ring = target ? (hKey === target ? 'ring-[3px] ring-white z-10 scale-110 shadow-xl' : 'opacity-50') : '';
            html += `<div class="aspect-square flex items-center justify-center rounded-[2px] text-[5px] sm:text-[7px] font-black ${bg} ${ring} text-white/95">${hKey}</div>`;
        }
    }
    document.getElementById('chart-container').innerHTML = html;

    // Position label
    if (scenario === 'SQUEEZE') {
        const p = parseSqueezeKey(oppPos);
        document.getElementById('chart-pos-label').innerText = p ? `${POS_LABELS[p.hero]} vs ${POS_LABELS[p.opener]} open, ${POS_LABELS[p.caller]} call` : '';
    } else if (scenario === 'SQUEEZE_2C') {
        const p = parseSqueeze2CKey(oppPos);
        document.getElementById('chart-pos-label').innerText = p ? `${POS_LABELS[p.hero]} vs ${POS_LABELS[p.opener]} open, ${POS_LABELS[p.caller1]} & ${POS_LABELS[p.caller2]} call` : '';
    } else if (scenario === 'VS_LIMP') {
        const bucketTag = { '1L': '1 Limper', '2L': '2 Limpers', '3P': '3+ Limpers' }[_chartCtx.bucket] || '';
        document.getElementById('chart-pos-label').innerText = `${POS_LABELS[pos]} vs ${POS_LABELS[oppPos] || 'Field'} · ${bucketTag}`;
    } else {
        document.getElementById('chart-pos-label').innerText = `${POS_LABELS[pos]} vs ${POS_LABELS[oppPos] || 'Field'}`;
    }
}

function switchChartBucket(bucket) {
    // Chart-local only — must never write back to state.limperBucket.
    // state.limperBucket belongs to the active training session and must not be
    // changed by browsing the chart while a drill or challenge is running.
    _chartCtx.bucket = bucket;
    _renderChart(_chartCtx.pos, _chartCtx.target, _chartCtx.scenario, _chartCtx.oppPos);
}

let _toastTimer = null;
/**
 * showToast — display a transient notification banner.
 * @param {string} text — message to display
 * @param {string} [type] — visual style: 'correct' | 'incorrect' | 'warn' (default neutral)
 * @param {number} [duration] — visible duration in ms (default ~1800)
 */
function showToast(text, type, duration) {
    const container = document.getElementById('toast-container');
    if (!container) { console.warn('[Toast] Missing #toast-container:', text); return; }
    // Fix 1 (mobile): Recalculate toast position fresh from the spacer's live position
    // before each show. Layout changes between rounds (preflop ↔ postflop, community
    // cards toggling) can leave --toast-top stale from the previous layout state.
    if (window.innerWidth <= 768) {
        const toastSpacer = document.getElementById('trainer-toast-spacer');
        if (toastSpacer) {
            const sr = toastSpacer.getBoundingClientRect();
            const th = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--toast-h')) || 28;
            if (sr.top > 0) {
                document.documentElement.style.setProperty('--toast-top', (sr.top + sr.height / 2 - th / 2) + 'px');
            }
        }
    }
    // Clear any existing toast
    if (_toastTimer) clearTimeout(_toastTimer);
    container.innerHTML = '';
    
    const toastClass = type === 'correct' ? 'toast-correct' : type === 'neutral' ? 'toast-neutral' : 'toast-incorrect';
    const icon = type === 'correct' ? '✓' : type === 'neutral' ? 'ℹ' : '✗';
    const toast = document.createElement('div');
    toast.className = `toast ${toastClass}`;
    toast.style.fontSize = 'var(--toast-font, 12px)';
    toast.style.padding = 'var(--toast-pad-y, 4px) var(--toast-pad-x, 12px)';
    toast.innerHTML = `<span>${icon}</span><span>${text}</span>`;
    container.appendChild(toast);
    
    _toastTimer = setTimeout(() => {
        toast.classList.add('leaving');
        setTimeout(() => { if (container.contains(toast)) container.removeChild(toast); }, 220);
    }, duration || 1200);
}
function clearToast() {
    const container = document.getElementById('toast-container');
    if (_toastTimer) clearTimeout(_toastTimer);
    if (container) container.innerHTML = '';
}

function showConfigMenu() { document.getElementById('config-screen').classList.remove('hidden'); hydrateCloudUI(); hydrateCloudAutoUI(); renderSessionBuilderUI(); }
function hideConfigMenu() { document.getElementById('config-screen').classList.add('hidden'); }
let _chartIsReview = false;
function closeChart() {
    document.getElementById('chart-modal').classList.add('hidden');
    // Cancel the wrong-answer failsafe timer — user manually closed the chart,
    // so we drive advancement from here instead. Without this, the 3500ms failsafe
    // fires after closeChart() already started a new round, causing a double-advance.
    try { __clearNextTimer(); } catch(_) {}
    // Release round guard (user is returning to trainer)
    __endResolve();
    if (document.getElementById('trainer-screen').classList.contains('hidden')) return;
    if (!_chartIsReview) {
        if (!checkDrillComplete() && !checkDailyRunComplete()) safeGenerateNextRound();
    }
    _chartIsReview = false;
}
function startConfiguredTraining() {
    try { __clearNextTimer(); __endResolve(); } catch(_) {}
    try { window.__tableAnimToken = (window.__tableAnimToken || 0) + 1; } catch(_) {}

    state.sessionStats = { total: 0, correct: 0, streak: 0 };
    state.sessionLog = [];

    if (drillState.mode === 'focused') {
        // Challenge mode or legacy drill: save original config, override for drill
        drillState.active = true;
        drillState._savedConfig = JSON.parse(JSON.stringify(state.config));
        state.config.scenarios = [drillState.scenario];
        state.config.positions = [...drillState.positions];
    } else {
        // Unified session builder: sync families → scenarios
        drillState.active = false;
        syncSessionToConfig();
    }

    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('config-screen').classList.add('hidden');
    // Safety: if Challenge overlay is open, close it
    const ch = document.getElementById('challenge-screen');
    if (ch) ch.classList.add('hidden');
    try { document.getElementById('sim-session-hud').style.display = 'none'; } catch(_) {}
    try { if (typeof simSession !== 'undefined' && simSession.active) { simSession.active = false; } } catch(_) {}
    document.getElementById('trainer-screen').classList.remove('hidden');
    // Start layout observer — must be called after trainer screen is visible.
    if (typeof window._trainerLayoutBoot === 'function') window._trainerLayoutBoot();
    updateUI();
    if (typeof updateDrillCounter === 'function') updateDrillCounter();
    safeGenerateNextRound();
}
function confirmExit() {
    const hands = state.sessionStats && state.sessionStats.total;
    // No confirmation needed for 0 hands or review sessions
    if (!hands || hands < 3 || reviewSession.active) { exitToMenu(); return; }
    // Show inline confirm by temporarily changing button text
    const btn = document.querySelector('#trainer-screen button[onclick="confirmExit()"]');
    if (!btn) { exitToMenu(); return; }
    if (btn.dataset.confirming === '1') { exitToMenu(); return; }
    btn.dataset.confirming = '1';
    const orig = btn.textContent;
    btn.textContent = 'Sure?';
    btn.classList.add('text-rose-400');
    setTimeout(() => {
        btn.textContent = orig;
        btn.classList.remove('text-rose-400');
        delete btn.dataset.confirming;
    }, 2500);
}

function exitToMenu() {
    try { __clearNextTimer(); __endResolve(); } catch(_) {}
    // Disconnect the layout ResizeObserver — re-connected on next trainer entry via _trainerLayoutBoot.
    if (typeof window._trainerLayoutTeardown === 'function') window._trainerLayoutTeardown();
    try { document.getElementById('dr-round-counter').classList.add('hidden'); } catch(_) {}
    try { document.getElementById('streak-best-block').classList.add('hidden'); } catch(_) {}
    try { window.__tableAnimToken = (window.__tableAnimToken || 0) + 1; } catch(_) {}
    // Clean up postflop UI
    try { if(typeof clearCommunityCards==='function') clearCommunityCards(); } catch(_) {}
    try { if(typeof closePostflopFeedback==='function') closePostflopFeedback(); } catch(_) {}
    state.postflop = null;

    const wasOpenTraining = !drillState.active && !reviewSession.active &&
        !(dailyRunState && dailyRunState.active) &&
        !(typeof challengeState !== 'undefined' && challengeState && challengeState.active);
    const handsPlayed = state.sessionStats && state.sessionStats.total || 0;

    // Restore config if drill was active
    if (drillState._savedConfig) {
        state.config = drillState._savedConfig;
        drillState._savedConfig = null;
    }
    // Restore sessionBuilder if this was a spot drill launched from My Stats
    if (drillState._savedSessionBuilder) {
        try {
            const sb = drillState._savedSessionBuilder;
            sessionBuilder.module = sb.module;
            sessionBuilder.families = sb.families;
            sessionBuilder.sessionLength = sb.sessionLength;
        } catch(_) {}
        drillState._savedSessionBuilder = null;
    }
    drillState.active = false;
    drillState.mode = 'open';  // reset to unified mode after any drill/challenge
    drillState.lockedLimperBucket = null;  // prevent bucket lock leaking into next session
    drillState._challengeMultiScenarios = null;
    reviewSession.active = false;
    // Ensure challenge mode flags are cleared so they can't contaminate the next session
    if (typeof challengeState !== 'undefined') challengeState.active = false;
    // Clean up challenge-specific config filters
    state.config.oppPositions = null;
    state.config.postflopFamilies = null;
    // Daily Run cleanup — native replacement for the removed installDailyRunExitPatch monkey-patch.
    // Restores state.config from dailyRunState._savedConfig if a DR was interrupted mid-run.
    if (typeof resetDailyRunState === 'function' &&
        dailyRunState && (dailyRunState.active || dailyRunState.ended || dailyRunState._savedConfig)) {
        resetDailyRunState({ restoreConfig: true });
    }

    try { if (typeof updateTrainingStreak === 'function') updateTrainingStreak(handsPlayed); } catch(_) {}

    if (wasOpenTraining && handsPlayed >= 5) {
        showSessionSummary();
    } else {
        document.getElementById('trainer-screen').classList.add('hidden');
        showConfigMenu();
    }
}

function showReviewComplete() {
    const s = state.sessionStats;
    const total = s.total || 0;
    const correct = s.correct || 0;
    const acc = total ? Math.round(correct / total * 100) : 0;
    const accColor = acc >= 85 ? 'text-emerald-400' : acc >= 70 ? 'text-yellow-400' : 'text-rose-400';

    // Find hands still wrong this session
    const stillWrong = (state.sessionLog || []).filter(e => !e.correct);
    const wrongSpots = [...new Set(stillWrong.map(e => e.spotKey).filter(Boolean))];

    const wrongRows = wrongSpots.slice(0, 4).map(sk =>
        `<div class="text-[11px] text-rose-300 font-semibold py-1 border-b border-slate-800/40 last:border-0">${prettySpotName(sk)}</div>`
    ).join('');

    const el = document.getElementById('review-complete-screen');
    if (!el) { exitToMenu(); return; }
    el.querySelector('#rc-hands').textContent = total;
    el.querySelector('#rc-accuracy').textContent = acc + '%';
    el.querySelector('#rc-accuracy').className = 'text-4xl font-black ' + accColor;
    el.querySelector('#rc-wrong-rows').innerHTML = wrongRows ||
        '<div class="text-emerald-400 text-[11px] font-bold">Clean sweep — all correct!</div>';

    document.getElementById('trainer-screen').classList.add('hidden');
    el.classList.remove('hidden');
}

function closeReviewComplete() {
    const el = document.getElementById('review-complete-screen');
    if (el) el.classList.add('hidden');
    try { if (typeof updateTrainingStreak === 'function') updateTrainingStreak(state.sessionStats && state.sessionStats.total || 0); } catch(_) {}
    document.getElementById('menu-screen').classList.remove('hidden');
    updateMenuUI();
}

function saveSessionHistoryRecord() {
    const s = state.sessionStats;
    if ((s.total || 0) < 5) return; // skip micro-sessions
    const record = {
        at: Date.now(),
        scenarios: state.config.scenarios ? [...state.config.scenarios] : [],
        hands: s.total || 0,
        correct: s.correct || 0,
        acc: s.total ? Math.round(s.correct / s.total * 100) : 0,
        bestStreak: state.global.bestStreak || 0
    };
    const key = profileKey('gto_train_history_v1');
    let hist = [];
    try { hist = JSON.parse(localStorage.getItem(key) || '[]'); } catch(_) {}
    if (!Array.isArray(hist)) hist = [];
    hist.unshift(record);
    if (hist.length > 30) hist = hist.slice(0, 30);
    try { localStorage.setItem(key, JSON.stringify(hist)); } catch(_) {}
}

function showSessionSummary() {
    try { saveSessionHistoryRecord(); } catch(_) {}
    const s = state.sessionStats;
    const total = s.total || 0;
    const correct = s.correct || 0;
    const acc = total ? Math.round(correct / total * 100) : 0;
    const accColor = acc >= 85 ? 'text-emerald-400' : acc >= 70 ? 'text-yellow-400' : acc >= 55 ? 'text-orange-400' : 'text-rose-400';
    const streak = state.global.bestStreak || 0;

    // Find worst spot this session from sessionLog
    const spotErr = {};
    (state.sessionLog || []).forEach(entry => {
        if (!entry.spotKey) return;
        if (!spotErr[entry.spotKey]) spotErr[entry.spotKey] = { w: 0, t: 0 };
        spotErr[entry.spotKey].t++;
        if (!entry.correct) spotErr[entry.spotKey].w++;
    });
    const worstSpots = Object.entries(spotErr)
        .filter(([,v]) => v.t >= 2)
        .map(([k,v]) => ({ key: k, acc: Math.round((v.t-v.w)/v.t*100), wrong: v.w, total: v.t }))
        .sort((a,b) => a.acc - b.acc)
        .slice(0, 3);

    const spotRows = worstSpots.length ? worstSpots.map(sp => {
        const col = sp.acc >= 80 ? 'text-emerald-400' : sp.acc >= 60 ? 'text-yellow-400' : 'text-rose-400';
        return `<div class="flex items-center justify-between py-1.5 border-b border-slate-800/50 last:border-0">
            <span class="text-[11px] text-slate-300 font-semibold">${prettySpotName(sp.key)}</span>
            <span class="text-[11px] font-black ${col}">${sp.acc}%</span>
        </div>`;
    }).join('') : '<div class="text-slate-600 text-xs italic">Not enough data yet</div>';

    const el = document.getElementById('session-summary-screen');
    if (!el) { document.getElementById('trainer-screen').classList.add('hidden'); showConfigMenu(); return; }

    el.querySelector('#ss-hands').textContent = total;
    el.querySelector('#ss-accuracy').textContent = acc + '%';
    el.querySelector('#ss-accuracy').className = 'text-4xl font-black ' + accColor;
    el.querySelector('#ss-streak').textContent = streak;
    el.querySelector('#ss-spot-rows').innerHTML = spotRows;

    document.getElementById('trainer-screen').classList.add('hidden');
    el.classList.remove('hidden');
}

function closeSessionSummary() {
    const el = document.getElementById('session-summary-screen');
    if (el) el.classList.add('hidden');
    showConfigMenu();
}
/** saveProgress — persist `state.global` to localStorage, flush SR, and mark cloud dirty. */
function saveProgress() { localStorage.setItem(profileKey(STORAGE_KEYS.RFI_STATS), JSON.stringify(state.global)); SR.save(); markCloudDirty(); }
function loadProgress() { const s = localStorage.getItem(profileKey(STORAGE_KEYS.RFI_STATS)); if (s) state.global = JSON.parse(s); if (!state.global.byScenario) state.global.byScenario = {}; if (!state.global.byPos) state.global.byPos = {}; if (!state.global.byPosGroup) state.global.byPosGroup = {}; if (!state.global.bestStreak) state.global.bestStreak = 0; if (!state.global.bySpot) state.global.bySpot = {}; if (!state.global.byHand) state.global.byHand = {}; loadConfig(); loadLimperMix(); SR.load(); try { if(typeof loadPostflopStats==='function') loadPostflopStats(); } catch(_) {} updateMenuUI(); if (window.RANGE_VALIDATE) { validateAndNormalizeRanges(facingRfiRanges); validateAndNormalizeRanges(rfiVs3BetRanges); validateAndNormalizeRanges(allFacingLimps); } }
/** updateUI — re-render session stats bar (accuracy, streak) and current action buttons. */
function updateUI() {
    document.getElementById('accuracy').innerText = (state.sessionStats.total ? Math.round(state.sessionStats.correct/state.sessionStats.total*100) : 0) + '%';
    document.getElementById('streak').innerText = state.sessionStats.streak;
    updateDrillCounter();
    // Show/hide stack badge
    try {
        const sb = document.getElementById('stack-bb-badge');
        if (sb) {
            if (state.scenario === 'PUSH_FOLD' && state.stackBB) {
                sb.textContent = state.stackBB + 'BB';
                sb.classList.remove('hidden');
            } else { sb.classList.add('hidden'); }
        }
    } catch(_) {}
}
function updateMenuUI() {
    const allSpots = getAllSpotKeys();
    const g = state.global;
    const total = g.totalHands || 0;
    const pct = total ? Math.round(g.totalCorrect / total * 100) : 0;

    // Classify spots using two-tier rollup
    function classifySpot(key) { return SR.classifySpot(key, edgeClassify); }
    const tiers = { mastered: 0, learning: 0, struggling: 0, unseen: 0 };
    allSpots.forEach(k => tiers[classifySpot(k)]++);
    const masteryPct = allSpots.length ? Math.round(tiers.mastered / allSpots.length * 100) : 0;
    const dueCount = SR.getDueSpots(false).length;

    // Mini mastery ring
    const rs = 80, rStroke = 7;
    const rr = (rs - rStroke) / 2;
    const rc = 2 * Math.PI * rr;
    const ro2 = rc * (1 - masteryPct / 100);
    const ringCol = masteryPct >= 80 ? '#10b981' : masteryPct >= 50 ? '#eab308' : masteryPct >= 20 ? '#f97316' : '#475569';

    let html = `<div class="flex items-center gap-4">
        <div class="relative shrink-0" style="width:${rs}px;height:${rs}px;">
            <svg width="${rs}" height="${rs}" class="transform -rotate-90">
                <circle cx="${rs/2}" cy="${rs/2}" r="${rr}" fill="none" stroke="#1e293b" stroke-width="${rStroke}"/>
                <circle cx="${rs/2}" cy="${rs/2}" r="${rr}" fill="none" stroke="${ringCol}" stroke-width="${rStroke}" stroke-linecap="round" stroke-dasharray="${rc}" stroke-dashoffset="${ro2}" style="transition:stroke-dashoffset 0.6s ease"/>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-xl font-black text-white">${masteryPct}%</span>
                <span class="text-[7px] text-slate-500 font-bold uppercase">Mastery</span>
            </div>
        </div>
        <div class="flex-1 flex flex-col gap-1.5 text-left">
            <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-emerald-500"></div><span class="text-[11px] text-slate-400 flex-1">Mastered</span><span class="text-[11px] font-black text-emerald-400">${tiers.mastered}</span></div>
            <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-indigo-500"></div><span class="text-[11px] text-slate-400 flex-1">Learning</span><span class="text-[11px] font-black text-indigo-400">${tiers.learning}</span></div>
            <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-rose-500"></div><span class="text-[11px] text-slate-400 flex-1">Struggling</span><span class="text-[11px] font-black text-rose-400">${tiers.struggling}</span></div>
            <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-slate-700"></div><span class="text-[11px] text-slate-400 flex-1">Unseen</span><span class="text-[11px] font-black text-slate-600">${tiers.unseen}</span></div>
        </div>
    </div>
    <div class="mt-4 bg-slate-950/40 border border-slate-800/40 rounded-2xl px-4 py-3">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <span class="text-lg">🔥</span>
                <div>
                    <div class="text-slate-200 font-black text-sm">Training Streak</div>
                    <div id="menu-streak-sub" class="text-slate-500 text-[10px] font-bold">5+ hands counts</div>
                </div>
            </div>
            <div id="menu-training-streak" class="text-orange-400 font-black text-2xl">0</div>
        </div>
        <div class="mt-2 pt-2 border-t border-slate-800/40 flex items-center justify-between">
            <div class="flex items-center gap-1.5">
                <span class="text-xs">⚡</span>
                <span class="text-[10px] text-slate-500 font-bold">Daily Run</span>
                <span id="menu-daily-lock" class="text-[10px] text-slate-500 font-bold"></span>
            </div>
            <span id="menu-daily-streak" class="text-indigo-300 font-black text-sm">0</span>
        </div>
    </div>
`;

    // Coverage bar
    const bM = allSpots.length ? Math.round(tiers.mastered / allSpots.length * 100) : 0;
    const bL = allSpots.length ? Math.round(tiers.learning / allSpots.length * 100) : 0;
    const bS = allSpots.length ? Math.round(tiers.struggling / allSpots.length * 100) : 0;
    html += `<div class="mt-3">
        <div class="w-full bg-slate-800 rounded-full h-1.5 flex overflow-hidden">
            <div class="bg-emerald-500 h-1.5" style="width:${bM}%"></div>
            <div class="bg-indigo-500 h-1.5" style="width:${bL}%"></div>
            <div class="bg-rose-500 h-1.5" style="width:${bS}%"></div>
        </div>
    </div>`;

    // Quick stats row
    html += `<div class="grid grid-cols-3 gap-2 mt-3">
        <div class="bg-slate-950/50 rounded-xl py-2 px-1 border border-slate-800/30 flex flex-col items-center">
            <span class="text-[8px] text-slate-500 uppercase font-bold">Hands</span>
            <span class="text-sm font-black text-slate-300">${total}</span>
        </div>
        <div class="bg-slate-950/50 rounded-xl py-2 px-1 border border-slate-800/30 flex flex-col items-center">
            <span class="text-[8px] text-slate-500 uppercase font-bold">Accuracy</span>
            <span class="text-sm font-black ${pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-yellow-400' : total > 0 ? 'text-orange-400' : 'text-slate-600'}">${total > 0 ? pct + '%' : '—'}</span>
        </div>
        <div class="bg-slate-950/50 rounded-xl py-2 px-1 border border-slate-800/30 flex flex-col items-center">
            <span class="text-[8px] text-slate-500 uppercase font-bold">Streak</span>
            <span class="text-sm font-black text-orange-400">${g.bestStreak || 0}</span>
        </div>
    </div>`;

    document.getElementById('menu-dashboard').innerHTML = html;

    // Training streak
    try {
        const ts = loadTrainingStreak();
        const tsEl = document.getElementById('menu-training-streak');
        if (tsEl) tsEl.textContent = String(ts.current || 0);
        const subEl = document.getElementById('menu-streak-sub');
        if (subEl) {
            const today = getLocalDayIndex(Date.now());
            const trainedToday = ts.lastDayIndex === today;
            subEl.textContent = trainedToday ? 'Trained today \u2713' : (ts.current > 0 ? 'Train today to keep it!' : '5+ hands counts');
            subEl.className = 'text-[10px] font-bold ' + (trainedToday ? 'text-emerald-500' : ts.current > 0 ? 'text-amber-500' : 'text-slate-500');
        }
    } catch(_) {}

    // Daily Run streak/lock
    try {
        const { meta, locked, msLeft } = getDailyRunLockInfo();
        const dsEl = document.getElementById('menu-daily-streak');
        if (dsEl) dsEl.textContent = String(meta.streak || 0);
        const lockEl = document.getElementById('menu-daily-lock');
        if (lockEl) lockEl.textContent = locked ? `Locked: ${formatDuration(msLeft)}` : 'Ready';
    } catch(_) {}

    // Onboarding card — show until 50 hands or dismissed
    try {
        const ob = document.getElementById('menu-onboarding');
        if (ob) {
            const dismissed = localStorage.getItem('pkOnboardingDismissed');
            const totalHands = (state.global && state.global.totalHands) || 0;
            ob.classList.toggle('hidden', !!(dismissed || totalHands >= 50));
        }
    } catch(_) {}

    // Challenge progress label under Challenge Mode button
    try {
        const cpEl = document.getElementById('menu-challenge-progress');
        if (cpEl && typeof CHALLENGE_NODES !== 'undefined' && typeof getChallengeProgress === 'function') {
            const prog = getChallengeProgress();
            const done = CHALLENGE_NODES.filter(n => isNodePassed(prog, n.id)).length;
            if (done > 0) {
                let label = '';
                if (prog.completedAt) {
                    label = 'Poker Crusher Champion \uD83C\uDFC6 \u00B7 ' + done + '/' + CHALLENGE_NODES.length + ' nodes';
                } else {
                    // Highest cleared tier's playerLabel
                    let playerLabel = '';
                    for (let i = CHALLENGE_TIERS.length - 1; i >= 0; i--) {
                        if (_allTierNodesPassed(prog, CHALLENGE_TIERS[i].id)) {
                            playerLabel = CHALLENGE_TIERS[i].playerLabel;
                            break;
                        }
                    }
                    label = (playerLabel ? playerLabel + ' \u00B7 ' : '') + done + '/' + CHALLENGE_NODES.length + ' nodes';
                }
                cpEl.textContent = label;
                cpEl.classList.remove('hidden');
            } else {
                cpEl.classList.add('hidden');
            }
        }
    } catch(_) {}

    // Prescription card
    renderPrescriptionCard();
}

function renderPrescriptionCard() {
    const el = document.getElementById('menu-prescription-card');
    if (!el) return;

    const totalHands = (state.global && state.global.totalHands) || 0;
    let leaks = [];
    try { leaks = SR.analyzeWeakSpots(); } catch(_) {}

    if (totalHands < 10 || leaks.length === 0) {
        el.innerHTML = `<p class="text-slate-500 text-xs text-center py-1">Keep training — your biggest leak will appear here</p>`;
        return;
    }

    const top = leaks[0];
    if (top.recentAcc >= 85) {
        el.innerHTML = `<p class="text-slate-400 text-xs text-center font-semibold py-1">Looking solid — no major leaks detected</p>`;
        return;
    }

    const spotName = (typeof prettySpotName === 'function') ? prettySpotName(top.spotKey) : top.spotKey;
    const handStr = top.worstHands.length ? top.worstHands.join(' · ') : '';
    const accColor = top.recentAcc >= 70 ? 'text-yellow-400' : 'text-rose-400';
    const escapedKey = top.spotKey.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    el.innerHTML = `
        <button onclick="toggleLeakCard(this)" style="width:100%;background:none;border:none;cursor:pointer;text-align:left;" class="flex items-center justify-between gap-2 py-0.5">
            <div class="flex items-center gap-2 min-w-0">
                <span class="text-[10px] font-black text-rose-400/80 uppercase tracking-widest shrink-0">Biggest Leak</span>
                <span class="text-slate-200 font-bold text-xs leading-tight truncate">${spotName}</span>
            </div>
            <span class="${accColor} font-black text-sm shrink-0">${top.recentAcc}%</span>
        </button>
        <div class="leak-card-detail" style="max-height:0;overflow:hidden;transition:max-height 0.25s ease-out;">
            ${handStr ? `<p class="text-slate-500 text-[11px] mt-2">Leaking on: ${handStr}</p>` : ''}
            <button onclick="launchTargetedSession('${escapedKey}')" class="mt-2 w-full py-2.5 bg-rose-600/80 hover:bg-rose-500 active:scale-[0.98] rounded-xl font-black text-sm transition-all">Fix This Now — 15 hands</button>
        </div>`;
}

function toggleLeakCard(btn) {
    const card = btn.closest('#menu-prescription-card');
    if (!card) return;
    const detail = card.querySelector('.leak-card-detail');
    if (!detail) return;
    const closed = !detail.style.maxHeight || detail.style.maxHeight === '0' || detail.style.maxHeight === '0px';
    detail.style.maxHeight = closed ? detail.scrollHeight + 'px' : '0';
}

function launchTargetedSession(spotKey) {
    if (!spotKey) return;
    const PREFLOP_SCENARIOS = ['RFI','FACING_RFI','RFI_VS_3BET','VS_4BET','VS_LIMP','SQUEEZE','SQUEEZE_2C','PUSH_FOLD'];
    const parts = spotKey.split('|');
    const sc = parts[0];

    if (!PREFLOP_SCENARIOS.includes(sc)) { showToast('Cannot launch targeted drill for this spot.'); return; }

    const spotId = parts[1] || '';
    let heroPos = null, oppPos = null, limperBucket = null;

    try {
        if (sc === 'RFI' || sc === 'PUSH_FOLD') {
            heroPos = spotId;
        } else if (sc === 'VS_LIMP') {
            const m = spotId.match(/^(.+)_vs_(.+)_Limp$/);
            if (m) { heroPos = m[1]; oppPos = m[2]; }
            limperBucket = parts[2] || null;
        } else if (sc === 'SQUEEZE' || sc === 'SQUEEZE_2C') {
            const sq = typeof parseSqueezeKey === 'function' ? parseSqueezeKey(spotId) : null;
            if (sq) heroPos = sq.hero;
        } else {
            const m = spotId.match(/^(.+)_vs_(.+)$/);
            if (m) { heroPos = m[1]; oppPos = m[2]; }
            else heroPos = spotId;
        }
    } catch(e) {}

    const savedConfig = JSON.parse(JSON.stringify(state.config));
    const savedBuilder = JSON.parse(JSON.stringify(sessionBuilder));

    state.config.scenarios = [sc];
    state.config.positions = (heroPos && (typeof ALL_POSITIONS !== 'undefined') && ALL_POSITIONS.includes(heroPos)) ? [heroPos] : (typeof ALL_POSITIONS !== 'undefined' ? [...ALL_POSITIONS] : []);
    state.config.oppPositions = oppPos ? [oppPos] : null;
    state.config.postflopFamilies = null;

    drillState.mode = 'focused';
    drillState.active = true;
    drillState.handCount = 15;
    drillState.scenario = sc;
    drillState.positions = state.config.positions;
    drillState.lockedLimperBucket = (sc === 'VS_LIMP' && limperBucket) ? limperBucket : null;
    drillState._savedConfig = savedConfig;
    drillState._savedSessionBuilder = savedBuilder;

    hideAllScreens();
    startConfiguredTraining();
}
function formatHandKey(r1, r2, s) { const i1 = RANKS.indexOf(r1), i2 = RANKS.indexOf(r2); const hi = i1 < i2 ? r1 : r2, lo = i1 < i2 ? r2 : r1; return hi === lo ? hi + lo : hi + lo + (s ? 's' : 'o'); }

// --- SESSION LOG ---
function formatSpotLabel(rawSpotId) {
    // Squeeze 2C keys: CO_vs_UTG_RFI_UTG1_Call_UTG2_Call
    const sq2 = parseSqueeze2CKey(rawSpotId);
    if (sq2) return `${POS_LABELS[sq2.hero]} vs ${POS_LABELS[sq2.opener]} open, ${POS_LABELS[sq2.caller1]} & ${POS_LABELS[sq2.caller2]} call`;
    // Squeeze keys: CO_vs_UTG_RFI_LJ_Call
    const sq = parseSqueezeKey(rawSpotId);
    if (sq) return `${POS_LABELS[sq.hero]} vs ${POS_LABELS[sq.opener]} open, ${POS_LABELS[sq.caller]} call`;
    // Handle bucket suffixes for limp spots (e.g. from spotKey "VS_LIMP|BTN_vs_UTG_Limp|2L")
    // rawSpotId here might just be "BTN_vs_UTG_Limp" (already split from scenario)
    const clean = rawSpotId.replace(/_Limp$/, '');
    if (clean.includes('_vs_')) {
        return clean.replace('_vs_', ' vs ').split(' ').map(w => POS_LABELS[w] || w).join(' ');
    }
    // Could be a bucket tag like "1L", "2L", "3P" — skip it
    if (rawSpotId === '1L' || rawSpotId === '2L' || rawSpotId === '3P') return '';
    return POS_LABELS[clean] || clean;
}
const SCENARIO_SHORT = { RFI: 'RFI', FACING_RFI: 'vs RFI', RFI_VS_3BET: 'vs 3Bet', VS_4BET: 'vs 4Bet', VS_LIMP: 'vs Limps', SQUEEZE: 'Squeeze', SQUEEZE_2C: 'Squeeze vs 2C', PUSH_FOLD: 'Push/Fold', POSTFLOP_CBET: 'Flop C-Bet', POSTFLOP_DEFEND: 'vs C-Bet', POSTFLOP_TURN_CBET: 'Turn Barrel', POSTFLOP_TURN_DEFEND: 'Turn Defense', POSTFLOP_TURN_DELAYED_CBET: 'Turn Delayed', POSTFLOP_TURN_PROBE: 'Turn Probe', POSTFLOP_TURN_PROBE_DEFEND: 'Probe Bet', POSTFLOP_RIVER_CBET: 'River Barrel', POSTFLOP_RIVER_DEFEND: 'River Defense', POSTFLOP_TURN_DELAYED_DEFEND: 'Turn D-Defend', POSTFLOP_RIVER_DELAYED_CBET: 'River Delayed', POSTFLOP_RIVER_DELAYED_DEFEND: 'River D-Defend', POSTFLOP_RIVER_PROBE: 'River Probe', POSTFLOP_RIVER_PROBE_BET: 'River Probe Bet', POSTFLOP_RIVER_TURN_CHECK_CBET: 'River TCC-Bet', POSTFLOP_RIVER_TURN_CHECK_DEFEND: 'River TCC-Def', POSTFLOP_RIVER_PROBE_CALL_BET: 'River P2-Bet', POSTFLOP_RIVER_PROBE_CALL_DEFEND: 'River P2-Def' };
const ACTION_LABELS = { FOLD: 'Fold', RAISE: 'Raise', CALL: 'Call', '3BET': '3-Bet', '4BET': '4-Bet', '5BET': '5-Bet Shove', ISO: 'Iso Raise', OVERLIMP: 'Overlimp', SQUEEZE: 'Squeeze', SHOVE: 'Shove All-In', CHECK: 'Check', CBET: 'C-Bet' };

function _showTrainingSessionLog() {
    const list = document.getElementById('session-log-list');
    if (state.sessionLog.length === 0) {
        list.innerHTML = '<p class="text-slate-600 text-xs text-center py-6">No hands played yet this session.</p>';
    } else {
        list.innerHTML = state.sessionLog.map((e, idx) => {
            let spot;
            if (e.scenario === 'SQUEEZE') {
                const sq = parseSqueezeKey(e.oppPos);
                spot = sq ? `${POS_LABELS[sq.hero]} vs ${POS_LABELS[sq.opener]}/${POS_LABELS[sq.caller]}` : e.oppPos;
            } else if (e.scenario === 'SQUEEZE_2C') {
                const sq = parseSqueeze2CKey(e.oppPos);
                spot = sq ? `${POS_LABELS[sq.hero]} vs ${POS_LABELS[sq.opener]}/${POS_LABELS[sq.caller1]}/${POS_LABELS[sq.caller2]}` : e.oppPos;
            } else {
                spot = e.oppPos ? `${POS_LABELS[e.pos]} vs ${POS_LABELS[e.oppPos]}` : POS_LABELS[e.pos];
                if (e.scenario === 'VS_LIMP' && e.limperBucket && e.limperBucket !== '1L') {
                    spot += ` (${e.limperBucket})`;
                }
            }
            const resultClass = e.correct ? 'log-row-correct' : 'log-row-incorrect';
            const resultIcon = e.correct ? '✓' : '✗';
            const resultColor = e.correct ? 'text-emerald-400' : 'text-rose-400';
            const actionLabel = ACTION_LABELS[e.action] || e.action;
            const correctLabel = e.isBluff ? 'Squeeze (Bluff)' : (ACTION_LABELS[e.correctAction] || e.correctAction);
            // For postflop entries show hero hole cards; for preflop show hand string
            let handDisplay = e.hand || '';
            if (e.heroHand && e.heroHand.cards && e.heroHand.cards.length >= 2) {
                const hc = e.heroHand.cards;
                const suitColor = s => (s === 'h' || s === 'd') ? '#f87171' : '#94a3b8';
                handDisplay = hc.slice(0, 2).map(c =>
                    `<span style="color:${suitColor(c.suit)};font-weight:900;">${c.rank}${(SUIT_SYMBOLS && SUIT_SYMBOLS[c.suit]) || c.suit}</span>`
                ).join('');
            }
            return `<div class="bg-slate-800/60 rounded-xl px-3 py-2.5 ${resultClass} cursor-pointer hover:bg-slate-800 transition-colors" onclick="logRowChart(${idx})">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <span class="${resultColor} font-black text-sm">${resultIcon}</span>
                        <span class="font-black text-sm text-white">${handDisplay}</span>
                        <span class="text-[10px] text-slate-400 font-bold">${SCENARIO_SHORT[e.scenario]} · ${spot}</span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
                ${!e.correct ? `<div class="mt-1 text-[10px] text-slate-400">You: <span class="text-rose-400 font-bold">${actionLabel}</span> · Correct: <span class="text-emerald-400 font-bold">${correctLabel}</span></div>` : ''}
            </div>`;
        }).join('');
    }
    document.getElementById('session-log-panel').classList.remove('hidden');
}

function hideSessionLog() { document.getElementById('session-log-panel').classList.add('hidden'); }

function logRowChart(idx) {
    const e = state.sessionLog[idx];
    // Postflop log entries: show the postflop feedback modal (read-only) instead
    // of the preflop range chart, which has no handler for postflop spots.
    if (e.scenario === 'POSTFLOP_CBET' || e.scenario === 'POSTFLOP_3BP_CBET' || e.scenario === 'POSTFLOP_DEFEND' || e.scenario === 'POSTFLOP_3BP_DEFEND' ||
        e.scenario === 'POSTFLOP_TURN_CBET' || e.scenario === 'POSTFLOP_TURN_DEFEND' ||
        e.scenario === 'POSTFLOP_TURN_DELAYED_CBET' ||
        e.scenario === 'POSTFLOP_TURN_PROBE' || e.scenario === 'POSTFLOP_TURN_PROBE_DEFEND' ||
        e.scenario === 'POSTFLOP_RIVER_CBET' || e.scenario === 'POSTFLOP_RIVER_DEFEND' ||
        e.scenario === 'POSTFLOP_RIVER_DELAYED_CBET' || e.scenario === 'POSTFLOP_RIVER_DELAYED_DEFEND' ||
        e.scenario === 'POSTFLOP_RIVER_TURN_CHECK_CBET' || e.scenario === 'POSTFLOP_RIVER_TURN_CHECK_DEFEND' ||
        e.scenario === 'POSTFLOP_RIVER_PROBE_CALL_BET' || e.scenario === 'POSTFLOP_RIVER_PROBE_CALL_DEFEND') {
        hideSessionLog();
        const logSpot = {
            heroPos: e.pos,
            villainPos: e.oppPos,
            positionState: e.positionState || '',
            boardArchetype: e.archetype || '',
            flopCards: e.flopCards || [],
            heroHand: e.heroHand || null,
            heroHandClass: e.heroHandClass || null,
            strategy: e.strategy || null
        };
        const logResult = {
            correct: e.correct,
            grade: e.grade || (e.correct ? 'strong' : 'clear_wrong'),
            preferredLabel: e.correct
                ? (ACTION_LABELS[e.action] || e.action)
                : (ACTION_LABELS[e.correctAction] || e.correctAction),
            freqPct: e.freqPct || 0,
            reasoning: e.reasoning || '',
            feedback: e.feedback || ''
        };
        if (e.scenario === 'POSTFLOP_DEFEND' && typeof showDefenderFeedback === 'function') {
            showDefenderFeedback(logSpot, logResult);
        } else if (e.scenario === 'POSTFLOP_3BP_DEFEND' && typeof show3BPDefenderFeedback === 'function') {
            show3BPDefenderFeedback(logSpot, logResult);
        } else if (e.scenario === 'POSTFLOP_TURN_CBET' && typeof showTurnCBetFeedback === 'function') {
            // Reconstruct spot with turnCard/turnFamily for display
            logSpot.turnCard = e.turnCard || null;
            logSpot.turnFamily = e.turnFamily || null;
            logSpot.flopArchetype = e.archetype || '';
            showTurnCBetFeedback(logSpot, logResult);
        } else if (e.scenario === 'POSTFLOP_TURN_DEFEND' && typeof showTurnDefenderFeedback === 'function') {
            logSpot.turnCard = e.turnCard || null;
            logSpot.turnFamily = e.turnFamily || null;
            logSpot.flopArchetype = e.archetype || '';
            showTurnDefenderFeedback(logSpot, logResult);
        } else if (e.scenario === 'POSTFLOP_TURN_DELAYED_CBET' && typeof showDelayedTurnFeedback === 'function') {
            logSpot.turnCard = e.turnCard || null;
            logSpot.turnFamily = e.turnFamily || null;
            logSpot.flopArchetype = e.archetype || '';
            showDelayedTurnFeedback(logSpot, logResult);
        } else if (e.scenario === 'POSTFLOP_TURN_DELAYED_DEFEND' && typeof showDelayedTurnDefendFeedback === 'function') {
            logSpot.turnCard = e.turnCard || null;
            logSpot.turnFamily = e.turnFamily || null;
            logSpot.flopArchetype = e.archetype || '';
            showDelayedTurnDefendFeedback(logSpot, logResult);
        } else if (e.scenario === 'POSTFLOP_TURN_PROBE' && typeof showTurnProbeFeedback === 'function') {
            logSpot.turnCard = e.turnCard || null;
            logSpot.turnFamily = e.turnFamily || null;
            logSpot.flopArchetype = e.archetype || '';
            showTurnProbeFeedback(logSpot, logResult);
        } else if (e.scenario === 'POSTFLOP_TURN_PROBE_DEFEND' && typeof showTurnProbeDefendFeedback === 'function') {
            logSpot.turnCard = e.turnCard || null;
            logSpot.turnFamily = e.turnFamily || null;
            logSpot.flopArchetype = e.archetype || '';
            showTurnProbeDefendFeedback(logSpot, logResult);
        } else if (e.scenario === 'POSTFLOP_RIVER_CBET' && typeof showRiverCBetFeedback === 'function') {
            logSpot.turnCard = e.turnCard || null;
            logSpot.turnFamily = e.turnFamily || null;
            logSpot.riverCard = e.riverCard || null;
            logSpot.riverFamily = e.riverFamily || null;
            logSpot.flopArchetype = e.archetype || '';
            showRiverCBetFeedback(logSpot, logResult);
        } else if (e.scenario === 'POSTFLOP_RIVER_DEFEND' && typeof showRiverDefenderFeedback === 'function') {
            logSpot.turnCard = e.turnCard || null;
            logSpot.turnFamily = e.turnFamily || null;
            logSpot.riverCard = e.riverCard || null;
            logSpot.riverFamily = e.riverFamily || null;
            logSpot.flopArchetype = e.archetype || '';
            showRiverDefenderFeedback(logSpot, logResult);
        } else if (e.scenario === 'POSTFLOP_RIVER_DELAYED_CBET' && typeof showRiverDelayedFeedback === 'function') {
            logSpot.turnCard = e.turnCard || null;
            logSpot.turnFamily = e.turnFamily || null;
            logSpot.riverCard = e.riverCard || null;
            logSpot.riverFamily = e.riverFamily || null;
            logSpot.flopArchetype = e.archetype || '';
            showRiverDelayedFeedback(logSpot, logResult);
        } else if (e.scenario === 'POSTFLOP_RIVER_DELAYED_DEFEND' && typeof showRiverDelayedDefenderFeedback === 'function') {
            logSpot.turnCard = e.turnCard || null;
            logSpot.turnFamily = e.turnFamily || null;
            logSpot.riverCard = e.riverCard || null;
            logSpot.riverFamily = e.riverFamily || null;
            logSpot.flopArchetype = e.archetype || '';
            showRiverDelayedDefenderFeedback(logSpot, logResult);
        } else if (e.scenario === 'POSTFLOP_RIVER_PROBE' && typeof showRiverProbeFeedback === 'function') {
            logSpot.turnCard = e.turnCard || null;
            logSpot.turnFamily = e.turnFamily || null;
            logSpot.riverCard = e.riverCard || null;
            logSpot.riverFamily = e.riverFamily || null;
            logSpot.flopArchetype = e.archetype || '';
            showRiverProbeFeedback(logSpot, logResult);
        } else if (e.scenario === 'POSTFLOP_RIVER_PROBE_BET' && typeof showRiverProbeBetFeedback === 'function') {
            logSpot.turnCard = e.turnCard || null;
            logSpot.turnFamily = e.turnFamily || null;
            logSpot.riverCard = e.riverCard || null;
            logSpot.riverFamily = e.riverFamily || null;
            logSpot.flopArchetype = e.archetype || '';
            showRiverProbeBetFeedback(logSpot, logResult);
        } else if (e.scenario === 'POSTFLOP_RIVER_TURN_CHECK_CBET' && typeof showRiverTurnCheckFeedback === 'function') {
            logSpot.turnCard = e.turnCard || null;
            logSpot.turnFamily = e.turnFamily || null;
            logSpot.riverCard = e.riverCard || null;
            logSpot.riverFamily = e.riverFamily || null;
            logSpot.flopArchetype = e.archetype || '';
            showRiverTurnCheckFeedback(logSpot, logResult);
        } else if (e.scenario === 'POSTFLOP_RIVER_TURN_CHECK_DEFEND' && typeof showRiverTurnCheckDefenderFeedback === 'function') {
            logSpot.turnCard = e.turnCard || null;
            logSpot.turnFamily = e.turnFamily || null;
            logSpot.riverCard = e.riverCard || null;
            logSpot.riverFamily = e.riverFamily || null;
            logSpot.flopArchetype = e.archetype || '';
            showRiverTurnCheckDefenderFeedback(logSpot, logResult);
        } else if (e.scenario === 'POSTFLOP_RIVER_PROBE_CALL_BET' && typeof showRiverProbeCallBetFeedback === 'function') {
            logSpot.turnCard = e.turnCard || null;
            logSpot.turnFamily = e.turnFamily || null;
            logSpot.riverCard = e.riverCard || null;
            logSpot.riverFamily = e.riverFamily || null;
            logSpot.flopArchetype = e.archetype || '';
            showRiverProbeCallBetFeedback(logSpot, logResult);
        } else if (e.scenario === 'POSTFLOP_RIVER_PROBE_CALL_DEFEND' && typeof showRiverProbeCallDefenderFeedback === 'function') {
            logSpot.turnCard = e.turnCard || null;
            logSpot.turnFamily = e.turnFamily || null;
            logSpot.riverCard = e.riverCard || null;
            logSpot.riverFamily = e.riverFamily || null;
            logSpot.flopArchetype = e.archetype || '';
            showRiverProbeCallDefenderFeedback(logSpot, logResult);
        } else {
            showPostflopFeedback(logSpot, logResult, e.correct);
        }
        // Mark modal as log-review so closing it doesn't advance the game state
        try { const m = document.getElementById('postflop-feedback-modal'); if (m) m.dataset.logReview = '1'; } catch(_) {}
        return;
    }
    _chartIsReview = true;
    // Pass limperBucket as a chart-local override — do NOT write state.limperBucket here.
    hideSessionLog();
    showChart(e.pos, e.hand, e.scenario, e.oppPos, e.limperBucket || null);
}

// --- STATS DRILL-DOWN ---
function showDrilldown(title, contentFn) {
    document.getElementById('drilldown-title').innerText = title;
    const content = document.getElementById('drilldown-content');
    content.innerHTML = '';
    contentFn(content);
    document.getElementById('drilldown-panel').classList.remove('hidden');
}

function hideDrilldown() { document.getElementById('drilldown-panel').classList.add('hidden'); }

function drilldownScenario(sc) {
    const SCENARIO_LABELS = { RFI: 'RFI (Unopened)', FACING_RFI: 'Defending vs RFI', RFI_VS_3BET: 'vs 3-Bet', VS_4BET: 'vs 4-Bet', VS_LIMP: 'Vs Limpers (1–3+)', SQUEEZE: 'Squeeze', SQUEEZE_2C: 'Squeeze vs 2C', PUSH_FOLD: 'Push / Fold', POSTFLOP_CBET: 'Flop C-Bet', POSTFLOP_DEFEND: 'vs C-Bet', POSTFLOP_TURN_CBET: 'Turn Barrel', POSTFLOP_TURN_DEFEND: 'Turn Defense', POSTFLOP_TURN_DELAYED_CBET: 'Turn Delayed C-Bet', POSTFLOP_TURN_PROBE: 'Turn Probe Defense', POSTFLOP_TURN_PROBE_DEFEND: 'Turn Probe Bet' };

    // Daily Run meta (UI only)
    const drm = loadDailyRunMeta();
    const drmRuns = Number(drm.totalRuns || 0);
    const drmDayStreak = Number(drm.streak || 0);
    const drmRunsToday = Number(drm.runsToday || 0);
    const drmBestRun = Number(drm.bestRun || 0);
    const drmBestEasy = Number(drm.bestRunEasy || 0);
    const drmBestMed = Number(drm.bestRunMedium || 0);
    const drmBestHard = Number(drm.bestRunHard || 0);

    const drmLastRun = Number(drm.lastRun || 0);
    const drmLastTotal = Number(drm.lastTotal || 0);
    const drmLastCorrect = Number(drm.lastCorrect || 0);
    const drmLastWhen = drm.lastCompletedAt ? new Date(drm.lastCompletedAt) : null;
    const drmLastOpt = drm.lastOption || null;
    const drmLastOptName = drmLastOpt === 'easy' ? 'Warm‑Up' : drmLastOpt === 'hard' ? 'Boss' : drmLastOpt === 'medium' ? 'Grind' : null;
    const drmLastLeak = drm.lastLeakKey ? prettySpotName(drm.lastLeakKey) : null;
    showDrilldown(SCENARIO_LABELS[sc] || sc, (content) => {
        // Find all spots for this scenario
        // POSTFLOP_CBET spots use SRP|/3BP|/LIMP_POT| prefixes; all other scenarios key with sc| directly
        const spots = sc === 'POSTFLOP_CBET'
            ? Object.keys(state.global.bySpot).filter(k => typeof POSTFLOP_KEY_PREFIX_LIST !== 'undefined' && POSTFLOP_KEY_PREFIX_LIST.some(p => k.startsWith(p + '|')))
            : Object.keys(state.global.bySpot).filter(k => k.startsWith(sc + '|'));
        if (spots.length === 0) {
            content.innerHTML = '<p class="text-slate-600 text-sm">No data yet. Play some hands in this scenario.</p>';
            return;
        }
        // Sort by accuracy ascending (worst first)
        spots.sort((a, b) => {
            const da = state.global.bySpot[a], db = state.global.bySpot[b];
            return (da.correct/da.total) - (db.correct/db.total);
        });
        const spotsHtml = spots.map(spotKey => {
            const d = state.global.bySpot[spotKey];
            const p = Math.round(d.correct / d.total * 100);
            const parts = spotKey.split('|');
            const spotLabel = formatSpotLabel(parts[1]);
            const color = p >= 80 ? 'text-emerald-400' : p >= 60 ? 'text-yellow-400' : 'text-rose-400';
            const barColor = p >= 80 ? 'bg-emerald-500' : p >= 60 ? 'bg-yellow-500' : 'bg-rose-500';
            return `<div class="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-slate-600 transition-colors" onclick="drilldownSpot('${spotKey}')">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-bold text-slate-200">${spotLabel}</span>
                    <div class="flex items-center gap-2">
                        <span class="font-black text-sm ${color}">${p}%</span>
                        <span class="text-slate-600 text-xs">${d.total} hands</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-1.5"><div class="${barColor} h-1.5 rounded-full" style="width:${p}%"></div></div>
            </div>`;
        }).join('');
        content.innerHTML = `<div class="flex flex-col gap-3">${spotsHtml}</div>`;
    });
}

function drilldownPosition(pos) {
    showDrilldown(POS_LABELS[pos] + ' — All Spots', (content) => {
        const spots = Object.keys(state.global.bySpot).filter(k => {
            const parts = k.split('|');
            return parts[1].startsWith(pos + '_vs_') || parts[1] === pos;
        });
        if (spots.length === 0) {
            content.innerHTML = '<p class="text-slate-600 text-sm">No data yet for this position.</p>';
            return;
        }
        spots.sort((a, b) => {
            const da = state.global.bySpot[a], db = state.global.bySpot[b];
            return (da.correct/da.total) - (db.correct/db.total);
        });
        const spotsHtml = spots.map(spotKey => {
            const d = state.global.bySpot[spotKey];
            const p = Math.round(d.correct / d.total * 100);
            const parts = spotKey.split('|');
            const scLabel = SCENARIO_SHORT[parts[0]] || parts[0];
            const spotLabel = formatSpotLabel(parts[1]);
            const color = p >= 80 ? 'text-emerald-400' : p >= 60 ? 'text-yellow-400' : 'text-rose-400';
            const barColor = p >= 80 ? 'bg-emerald-500' : p >= 60 ? 'bg-yellow-500' : 'bg-rose-500';
            return `<div class="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-slate-600 transition-colors" onclick="drilldownSpot('${spotKey}')">
                <div class="flex justify-between items-center mb-2">
                    <div><span class="text-sm font-bold text-slate-200">${spotLabel}</span><span class="text-[10px] text-slate-500 ml-2">${scLabel}</span></div>
                    <div class="flex items-center gap-2">
                        <span class="font-black text-sm ${color}">${p}%</span>
                        <span class="text-slate-600 text-xs">${d.total} hands</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-1.5"><div class="${barColor} h-1.5 rounded-full" style="width:${p}%"></div></div>
            </div>`;
        }).join('');
        content.innerHTML = `<div class="flex flex-col gap-3">${spotsHtml}</div>`;
    });
}

// ============================================================
// SPOT DRILL LAUNCH — decode a spotKey → focused 25-hand drill
// ============================================================
function launchSpotDrill(spotKey) {
    if (!spotKey) { showToast('No spot to launch.'); return; }

    const SPOT_DRILL_COUNT = 25;
    const parts = spotKey.split('|');
    const sc = parts[0];

    // Map spotKey to training config filters
    const VALID_SCENARIOS = ['RFI','FACING_RFI','RFI_VS_3BET','VS_LIMP','SQUEEZE','SQUEEZE_2C','PUSH_FOLD',
        'POSTFLOP_CBET','POSTFLOP_3BP_CBET','POSTFLOP_DEFEND','POSTFLOP_3BP_DEFEND','POSTFLOP_TURN_CBET','POSTFLOP_TURN_DEFEND','POSTFLOP_TURN_DELAYED_CBET'];

    // Resolve scenario — POSTFLOP_CBET spots use SRP|/3BP|/LIMP_POT| prefixes
    let resolvedSc = sc;
    if (!VALID_SCENARIOS.includes(sc)) {
        if (typeof POSTFLOP_KEY_PREFIX_LIST !== 'undefined' && POSTFLOP_KEY_PREFIX_LIST.includes(sc)) {
            resolvedSc = 'POSTFLOP_CBET';
        } else {
            showToast('Cannot launch drill for this spot type.');
            return;
        }
    }

    // Parse hero position and optional opponent position from spotId
    const spotId = parts[1] || '';
    let heroPos = null, oppPos = null, limperBucket = null;

    try {
        if (resolvedSc === 'RFI') {
            heroPos = spotId; // spotId is just the position e.g. "CO"
        } else if (resolvedSc === 'PUSH_FOLD') {
            heroPos = spotId;
        } else if (resolvedSc === 'VS_LIMP') {
            const m = spotId.match(/^(.+)_vs_(.+)_Limp$/);
            if (m) { heroPos = m[1]; oppPos = m[2]; }
            limperBucket = parts[2] || null;
        } else if (resolvedSc === 'SQUEEZE') {
            const sq = typeof parseSqueezeKey === 'function' ? parseSqueezeKey(spotId) : null;
            if (sq) { heroPos = sq.hero; }
        } else if (resolvedSc === 'SQUEEZE_2C') {
            const sq = typeof parseSqueeze2CKey === 'function' ? parseSqueeze2CKey(spotId) : null;
            if (sq) { heroPos = sq.hero; }
        } else {
            // FACING_RFI, RFI_VS_3BET, postflop: "HERO_vs_OPP" pattern
            const m = spotId.match(/^(.+)_vs_(.+)$/);
            if (m) { heroPos = m[1]; oppPos = m[2]; }
            else { heroPos = spotId; } // fallback
        }
    } catch(e) {
        console.warn('[launchSpotDrill] parse error', e);
    }

    if (!heroPos || !ALL_POSITIONS.includes(heroPos)) {
        showToast('Loaded closest match — position could not be pinpointed.');
        heroPos = null; // will use all positions
    }

    // Save current config + sessionBuilder state
    const savedConfig = JSON.parse(JSON.stringify(state.config));
    const savedBuilder = JSON.parse(JSON.stringify(sessionBuilder));

    // Build focused config
    state.config.scenarios = [resolvedSc];
    state.config.positions = heroPos ? [heroPos] : [...ALL_POSITIONS];
    state.config.oppPositions = oppPos ? [oppPos] : null;
    state.config.postflopFamilies = null;

    // Wire drillState for focused 25-question run
    drillState.mode = 'focused';
    drillState.active = true;
    drillState.handCount = SPOT_DRILL_COUNT;
    drillState.scenario = resolvedSc;
    drillState.positions = heroPos ? [heroPos] : [...ALL_POSITIONS];
    drillState.lockedLimperBucket = (resolvedSc === 'VS_LIMP' && limperBucket) ? limperBucket : null;
    drillState._savedConfig = savedConfig;

    // Restore sessionBuilder on exit — patch into _savedConfig bundle
    drillState._savedSessionBuilder = savedBuilder;

    // Close drilldown panel and stats, then launch
    hideDrilldown();
    hideAllScreens();
    startConfiguredTraining();
}

// Restore sessionBuilder after spot drill (called from exitToMenu path via drillState cleanup)
// _savedSessionBuilder is set by launchSpotDrill and read in exitToMenu below.

function drilldownSpot(spotKey) {
    const parts = spotKey.split('|');
    const sc = parts[0], spotId = parts[1];
    let spotLabel = formatSpotLabel(spotId);
    // Add bucket label for VS_LIMP
    if (sc === 'VS_LIMP' && parts[2]) {
        const bucketLabel = { '1L': '1 Limper', '2L': '2 Limpers', '3P': '3+ Limpers' }[parts[2]] || '';
        if (bucketLabel) spotLabel += ` · ${bucketLabel}`;
    }
    const SC_LABELS = { RFI: 'RFI', FACING_RFI: 'Defending vs RFI', RFI_VS_3BET: 'vs 3-Bet', VS_LIMP: 'Vs Limpers', SQUEEZE: 'Squeeze', SQUEEZE_2C: 'Squeeze vs 2C', PUSH_FOLD: 'Push/Fold', POSTFLOP_CBET: 'Flop C-Bet', POSTFLOP_3BP_CBET: '3BP Flop C-Bet', POSTFLOP_DEFEND: 'vs C-Bet', POSTFLOP_3BP_DEFEND: '3BP Defense', POSTFLOP_TURN_CBET: 'Turn Barrel', POSTFLOP_TURN_DEFEND: 'Turn Defense', POSTFLOP_TURN_DELAYED_CBET: 'Delayed C-Bet' };
    const scLabel = SC_LABELS[sc] || sc;

    showDrilldown(`${spotLabel}${scLabel ? ' · ' + scLabel : ''}`, (content) => {
        const d = state.global.bySpot[spotKey];
        const stats = SR.getSpotStats(spotKey, edgeClassify);
        if (!d && stats.totalAttempts === 0) { content.innerHTML = '<p class="text-slate-600 text-sm">No data.</p>'; return; }
        const pct = d ? Math.round(d.correct / d.total * 100) : stats.accuracy;
        const color = pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-yellow-400' : 'text-rose-400';
        const statusColor = { mastered: 'text-emerald-400', learning: 'text-indigo-400', struggling: 'text-rose-400', unseen: 'text-slate-500' }[stats.status];
        const statusLabel = stats.status.charAt(0).toUpperCase() + stats.status.slice(1);

        // Run This Spot CTA
        const escapedKey = spotKey.replace(/'/g, "\\'");
        const runBtn = `<button onclick="launchSpotDrill('${escapedKey}')"
            class="w-full py-3.5 pc-btn-primary transition-all flex items-center justify-center gap-2" style="font-size:14px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            Run This Spot
            <span class="text-indigo-300 font-semibold text-xs ml-1">· 25 hands</span>
        </button>`;

        // Summary with coverage, accuracy, due, status
        let summaryHtml = `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div class="flex justify-between items-center mb-3">
                <span class="text-[10px] text-slate-500 uppercase font-bold">Status</span>
                <span class="text-sm font-black ${statusColor}">${statusLabel}</span>
            </div>
            <div class="grid grid-cols-4 gap-2">
                <div class="text-center"><p class="text-[8px] text-slate-500 uppercase font-bold mb-0.5">Accuracy</p><p class="text-lg font-black ${color}">${stats.accuracy}%</p></div>
                <div class="text-center"><p class="text-[8px] text-slate-500 uppercase font-bold mb-0.5">Coverage</p><p class="text-lg font-black text-slate-200">${stats.coverage}%</p></div>
                <div class="text-center"><p class="text-[8px] text-slate-500 uppercase font-bold mb-0.5">Hands</p><p class="text-lg font-black text-slate-200">${stats.handsSeen}</p></div>
                <div class="text-center"><p class="text-[8px] text-slate-500 uppercase font-bold mb-0.5">Due</p><p class="text-lg font-black ${stats.dueCount > 0 ? 'text-amber-400' : 'text-slate-500'}">${stats.dueCount}</p></div>
            </div>
        </div>`;

        // Per-hand heatmap grid
        let gridHtml = '<div class="bg-slate-900 border border-slate-800 rounded-2xl p-4"><p class="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3">Hand Accuracy Heatmap</p><p class="text-[9px] text-slate-600 mb-3">Green = correct, red = missed, grey = not seen</p><div class="range-grid w-full" style="gap:1px;">';
        for (let i = 0; i < 13; i++) {
            for (let j = 0; j < 13; j++) {
                const r1 = RANKS[i], r2 = RANKS[j];
                const hKey = (i === j) ? r1+r2 : (i < j ? r1+r2+'s' : r2+r1+'o');
                const hd = state.global.byHand[`${spotKey}|${hKey}`];
                let bg, title;
                if (!hd || hd.total === 0) {
                    bg = 'background:#1e293b;';
                    title = `${hKey}: not seen`;
                } else {
                    const hp2 = hd.correct / hd.total;
                    // Green for high accuracy, red for low
                    const r = Math.round(255 * (1 - hp2));
                    const g = Math.round(180 * hp2);
                    bg = `background:rgb(${r},${g},40);`;
                    title = `${hKey}: ${Math.round(hp2*100)}% (${hd.correct}/${hd.total})`;
                }
                gridHtml += `<div class="drilldown-hand-cell" style="${bg}" title="${title}">${hKey}</div>`;
            }
        }
        gridHtml += '</div></div>';

        // Worst hands list
        const handEntries = Object.entries(state.global.byHand)
            .filter(([k]) => k.startsWith(spotKey + '|'))
            .map(([k, v]) => ({ hand: k.split('|').pop(), ...v, pct: Math.round(v.correct/v.total*100) }))
            .filter(e => e.total >= 2)
            .sort((a, b) => a.pct - b.pct)
            .slice(0, 8);

        let worstHtml = '';
        if (handEntries.length > 0) {
            worstHtml = `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <p class="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3">Trickiest Hands</p>
                <div class="flex flex-col gap-2">${handEntries.map(e => {
                    const c2 = e.pct >= 80 ? 'text-emerald-400' : e.pct >= 50 ? 'text-yellow-400' : 'text-rose-400';
                    const b2 = e.pct >= 80 ? 'bg-emerald-500' : e.pct >= 50 ? 'bg-yellow-500' : 'bg-rose-500';
                    return `<div class="flex items-center gap-3">
                        <span class="font-black text-sm text-white w-10 shrink-0">${e.hand}</span>
                        <div class="flex-1 bg-slate-800 rounded-full h-1.5"><div class="${b2} h-1.5 rounded-full" style="width:${e.pct}%"></div></div>
                        <span class="font-black text-xs ${c2} w-10 text-right shrink-0">${e.pct}%</span>
                        <span class="text-[10px] text-slate-600 w-12 text-right shrink-0">${e.correct}/${e.total}</span>
                    </div>`;
                }).join('')}</div>
            </div>`;
        }

        content.innerHTML = runBtn + summaryHtml + gridHtml + worstHtml;
    });
}

// ============================================================
// RESPONSIVE SCALING SYSTEM
// ============================================================
// Observes the poker felt container and sets CSS custom properties
// so seats, cards, chips, badges, hero cards, and buttons all
// scale proportionally based on the actual rendered table size.
(function() {
    let feltW = 0, feltH = 0;
    function applyScale() {
        const root = document.documentElement.style;
        const main = document.getElementById('trainer-main');
        const winH = window.innerHeight;
        const winW = window.innerWidth;
        const isPortrait = winH > winW;
        const isMobile = winW < 600;

        // Table wrapper height cap — guard all writes to avoid triggering the RO loop.
        // Mobile: constrain wrapper to just the felt height (+ 6% breathing room) so the
        //   felt fills the wrapper and items-center leaves almost no dead-space gap.
        //   Safe because feltH = wW/ratio, so setting maxH = feltH*1.06 makes the RO see
        //   newFeltW = min(wW, wW*1.06) = wW — zero delta, loop never fires.
        // Desktop: cap to 62% of viewport so the table doesn't dominate tall screens.
        // Never touch alignItems — let the Tailwind items-center class handle it.
        const tableWrapper = document.getElementById('table-wrapper');
        if (tableWrapper) {
            const newMaxH = isMobile
                ? (feltH > 0 ? Math.round(feltH * 1.06) + 'px' : '')
                : Math.round(winH * 0.62) + 'px';
            if (tableWrapper.style.maxHeight !== newMaxH) tableWrapper.style.maxHeight = newMaxH;
            // Clear any stale flex-end alignment written by a previous code version
            if (tableWrapper.style.alignItems === 'flex-end') tableWrapper.style.alignItems = '';
        }

        // outerW / outerH: stable proxy dimensions for elements OUTSIDE table-wrapper
        // (hero cards, action buttons, toast spacer).  Derived from winW/winH only —
        // never from feltW/feltH — so that CSS vars computed from these cannot trigger
        // a new ResizeObserver callback.  Without this, the felt can enter a
        // height-constrained regime (feltW = wrapperH * ratio) where any
        // felt-derived variable that affects sibling heights creates a closed loop.
        // On mobile, feltW is always width-constrained (maxHeight = feltH*1.06 proof),
        // so using feltW/feltH there is safe and gives accurate sizing.
        const outerW = isMobile ? feltW : Math.round(Math.min(winW * 0.88, 1150));
        const outerH = isMobile ? feltH : Math.round(Math.min(winH * 0.56, outerW / (isMobile ? 2.0 : 2.4)));
        const refH = (isMobile && isPortrait) ? winH : outerH;

        // Switch seat coordinate set based on screen size
        SEAT_COORDS = isMobile ? SEAT_COORDS_MOBILE : SEAT_COORDS_DESKTOP;
        // Tighten vertical gap on mobile — guard write to avoid spurious layout recalcs
        const newGap = isMobile ? '2px' : 'clamp(4px,1.2vh,12px)';
        if (main && main.style.gap !== newGap) main.style.gap = newGap;
        // Seat sizing
        const seatScale = isMobile ? 0.115 : 0.09;
        const seatW = Math.max(40, Math.round(feltW * seatScale));
        const seatH = Math.round(seatW * 0.68);
        const seatFont = Math.max(8, Math.round(seatW * 0.2));
        root.setProperty('--seat-w', seatW + 'px');
        root.setProperty('--seat-h', seatH + 'px');
        root.setProperty('--seat-font', seatFont + 'px');
        // Card backs on table
        const cbW = Math.max(9, Math.round(feltW * (isMobile ? 0.024 : 0.018)));
        const cbH = Math.round(cbW * 1.4);
        root.setProperty('--cb-w', cbW + 'px');
        root.setProperty('--cb-h', cbH + 'px');
        // Dealer button
        root.setProperty('--dealer-size', Math.max(18, Math.round(feltW * (isMobile ? 0.045 : 0.035))) + 'px');
        root.setProperty('--dealer-font', Math.max(9, Math.round(feltW * (isMobile ? 0.02 : 0.016))) + 'px');
        // Action badge
        const badgeFont = Math.max(7, Math.round(feltW * (isMobile ? 0.018 : 0.014)));
        root.setProperty('--badge-font', badgeFont + 'px');
        root.setProperty('--badge-px', Math.round(badgeFont * 0.5) + 'px');
        root.setProperty('--badge-py', Math.round(badgeFont * 0.15) + 'px');
        root.setProperty('--badge-radius', Math.round(badgeFont * 0.5) + 'px');
        // Chip
        const chipSize = Math.max(14, Math.round(feltW * (isMobile ? 0.035 : 0.028)));
        root.setProperty('--chip-size', chipSize + 'px');
        root.setProperty('--chip-font', Math.max(8, Math.round(chipSize * 0.6)) + 'px');
        // Toast — size relative to window width on mobile, felt on desktop
        const toastFont = Math.max(13, Math.round((isMobile ? winW : outerW) * (isMobile ? 0.038 : 0.016)));
        const toastH = Math.round(toastFont * 2.6);
        root.setProperty('--toast-font', toastFont + 'px');
        root.setProperty('--toast-pad-x', Math.round(toastFont * 0.9) + 'px');
        root.setProperty('--toast-pad-y', Math.round(toastFont * 0.35) + 'px');
        root.setProperty('--toast-h', toastH + 'px');
        // Toast top — position over the spacer between hero cards and action buttons
        const toastSpacer = document.getElementById('trainer-toast-spacer');
        const header = document.getElementById('trainer-header');
        const toastTop = toastSpacer
            ? (toastSpacer.getBoundingClientRect().top + (toastSpacer.getBoundingClientRect().height / 2) - (toastH / 2))
            : header ? (header.getBoundingClientRect().bottom + 6) : 16;
        root.setProperty('--toast-top', toastTop + 'px');
        // Hero cards — scale off window height on mobile portrait
        const cardScale = isMobile ? 0.17 : 0.09;
        const cardHScale = isMobile ? (isPortrait ? 0.11 : 0.48) : 0.35;
        const cardW = Math.max(52, Math.round(Math.min(outerW * cardScale, refH * cardHScale)));
        const cardH = Math.round(cardW * 1.5);
        root.setProperty('--hero-card-w', cardW + 'px');
        root.setProperty('--hero-card-h', cardH + 'px');
        root.setProperty('--hero-rank-size', Math.round(cardW * 0.52) + 'px');
        root.setProperty('--hero-suit-size', Math.round(cardW * 0.42) + 'px');
        root.setProperty('--card-gap', Math.round(cardW * 0.2) + 'px');
        // Hint text — also drives _renderSpotHeader title via CSS var.
        // IMPORTANT: use winW for BOTH breakpoints — not feltW. feltW is derived from the
        // observed table-wrapper, so using it here creates a feedback loop:
        // bigger hint → taller hint-row → shorter wrapper → smaller feltW → different hint → repeat.
        root.setProperty('--hint-size', Math.max(13, Math.round(winW * (isMobile ? 0.050 : 0.017))) + 'px');
        // Community cards (postflop) — on mobile cards live in the strip below the felt,
        // so they have more horizontal room and can be sized a bit larger.
        const ccW = Math.max(28, Math.round(feltW * (isMobile ? 0.13 : 0.08)));
        root.setProperty('--cc-w', ccW + 'px');
        root.setProperty('--cc-h', Math.round(ccW * 1.38) + 'px');
        root.setProperty('--cc-rank-size', Math.round(ccW * 0.4) + 'px');
        root.setProperty('--cc-suit-size', Math.round(ccW * 0.32) + 'px');
        // Fix 3 (mobile): hero hole cards must be >= community board cards.
        // Re-apply hero card vars if the calculated cardW fell below ccW.
        if (isMobile && ccW >= cardW) {
            const hcW = ccW + 4; // slightly larger than board cards
            const hcH = Math.round(hcW * 1.5);
            root.setProperty('--hero-card-w', hcW + 'px');
            root.setProperty('--hero-card-h', hcH + 'px');
            root.setProperty('--hero-rank-size', Math.round(hcW * 0.52) + 'px');
            root.setProperty('--hero-suit-size', Math.round(hcW * 0.42) + 'px');
        }
        // Action buttons — scale off window height on mobile portrait
        const btnPad = Math.max(14, Math.round(refH * (isMobile ? 0.047 : 0.06)));
        const btnFont = Math.max(15, Math.round((isMobile ? winW : outerW) * (isMobile ? 0.041 : 0.022)));
        root.setProperty('--btn-pad', btnPad + 'px');
        root.setProperty('--btn-font', btnFont + 'px');
        root.setProperty('--btn-max-w', Math.min(640, Math.round(feltW * 0.95)) + 'px');
        // Aspect ratio — guard write to avoid triggering layout recalc loop
        // NOTE: do NOT dynamically scale borderWidth here — changing the border shifts the
        // felt's content-box height (aspect-ratio applies to content box), which resizes
        // table-wrapper, which fires the ResizeObserver again → oscillation loop at 100% zoom.
        const targetRatio = isMobile ? '2.0/1' : '2.4/1';
        const feltEl = document.getElementById('poker-felt-container');
        if (feltEl && feltEl.style.aspectRatio !== targetRatio) feltEl.style.aspectRatio = targetRatio;
    }

    let _roRaf = null;
    const ro = new ResizeObserver(entries => {
        let changed = false;
        for (const entry of entries) {
            const wW = entry.contentRect.width;
            const wH = entry.contentRect.height;
            // Skip when table-wrapper is hidden (terminal state) — a 0×0 rect would
            // set --btn-max-w:0 and collapse the action-buttons container.
            if (wW === 0 && wH === 0) continue;
            // Snap to integer pixels to prevent sub-pixel oscillation
            const ratio = (window.innerWidth < 600) ? 2.0 : 2.4;
            const newFeltW = Math.round(Math.min(wW, wH * ratio));
            // Only recompute if the felt width changed by at least 2px
            if (Math.abs(newFeltW - feltW) >= 2) {
                feltW = newFeltW;
                feltH = Math.round(feltW / ratio);
                changed = true;
            }
        }
        if (!changed) return;
        // Debounce via rAF — collapses burst of observer callbacks into one applyScale
        if (_roRaf) cancelAnimationFrame(_roRaf);
        _roRaf = requestAnimationFrame(() => { _roRaf = null; applyScale(); });
    });

    // Expose boot/teardown helpers so every trainer entry path can call them directly.
    // Called by: startConfiguredTraining, _startReviewWithQueue, startDailyRun.
    window._trainerLayoutBoot = function() {
        // Clear any inline borderWidth left by old code — CSS value (12px) takes over.
        const feltEl = document.getElementById('poker-felt-container');
        if (feltEl) feltEl.style.borderWidth = '';
        const wrapper = document.getElementById('table-wrapper');
        if (wrapper) ro.observe(wrapper);
    };
    window._trainerLayoutTeardown = function() {
        if (_roRaf) { cancelAnimationFrame(_roRaf); _roRaf = null; }
        ro.disconnect();
    };
})();

// ============================================================
// SETTINGS SCREEN — stake/display controls
// ============================================================
function renderSettingsStakeDisplay() {
    const el = document.getElementById('settings-stake-display');
    if (!el) return;
    const stakeIds = typeof STAKE_PRESETS !== 'undefined' ? Object.keys(STAKE_PRESETS) : ['1/2','1/3','2/5','5/10'];
    const curStake = (typeof sessionBuilder !== 'undefined') ? sessionBuilder.stakeId : '1/3';
    const curMode  = (typeof sessionBuilder !== 'undefined') ? sessionBuilder.displayMode : 'dollars';
    const stakeHtml = stakeIds.map(id => {
        const sel = curStake === id;
        return `<button onclick="setStakePreset('${id}');renderSettingsStakeDisplay();" class="flex-1 py-2.5 rounded-xl text-xs font-black transition-all config-btn ${sel ? 'selected' : ''}">${id}</button>`;
    }).join('');
    const dollarsSel = curMode === 'dollars';
    const bbSel = curMode === 'bb';
    el.innerHTML = `
        <div class="flex flex-col gap-3">
            <div>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">Stakes</p>
                <div class="flex gap-2">${stakeHtml}</div>
            </div>
            <div>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-2">Display</p>
                <div class="flex gap-2">
                    <button onclick="setDisplayMode('dollars');renderSettingsStakeDisplay();" class="flex-1 py-2.5 rounded-xl text-xs font-black transition-all config-btn ${dollarsSel ? 'selected' : ''}">$</button>
                    <button onclick="setDisplayMode('bb');renderSettingsStakeDisplay();" class="flex-1 py-2.5 rounded-xl text-xs font-black transition-all config-btn ${bbSel ? 'selected' : ''}">BB</button>
                </div>
            </div>
        </div>`;
}

// Patch showSettings to also render stake/display controls
(function() {
    const _orig = window.showSettings;
    window.showSettings = function() {
        if (_orig) _orig.apply(this, arguments);
        try { renderSettingsStakeDisplay(); } catch(_) {}
    };
})();

function initEventListeners() {
    // ── Menu screen ──
    document.getElementById('btn-dismiss-onboarding').addEventListener('click', dismissOnboarding);
    document.getElementById('btn-train-now').addEventListener('click', showConfigMenu);
    document.getElementById('btn-daily-run').addEventListener('click', showDailyRunMenu);
    document.getElementById('btn-challenge').addEventListener('click', showChallengeMenu);
    document.getElementById('btn-library').addEventListener('click', showLibrary);
    document.getElementById('btn-math-drills').addEventListener('click', showMathDrillMenu);
    document.getElementById('btn-my-stats').addEventListener('click', showUserStats);
    document.getElementById('btn-settings').addEventListener('click', showSettings);

    // ── Challenge screen ──
    document.getElementById('btn-close-challenge').addEventListener('click', closeChallengeMenu);
    document.getElementById('btn-reset-challenge').addEventListener('click', resetChallengeProgress);

    // ── Library screen ──
    document.getElementById('btn-hide-library').addEventListener('click', hideLibrary);
    // setLibCategory: delegate on #lib-nav; buttons carry data-lib-category
    document.getElementById('lib-nav').addEventListener('click', function(e) {
        var cat = e.target.closest('[data-lib-category]');
        if (cat) setLibCategory(cat.dataset.libCategory);
    });

    // ── Review / session summary / review preview ──
    document.getElementById('btn-close-review-complete').addEventListener('click', closeReviewComplete);
    document.getElementById('btn-close-session-summary').addEventListener('click', closeSessionSummary);
    document.getElementById('btn-hide-review-preview').addEventListener('click', hideReviewPreview);
    document.getElementById('btn-launch-review').addEventListener('click', launchReviewSession);

    // ── Stats screen ──
    document.getElementById('btn-hide-stats').addEventListener('click', hideUserStats);

    // ── Daily run screen ──
    document.getElementById('btn-daily-run-back').addEventListener('click', showMenu);
    document.getElementById('daily-run-btn-easy').addEventListener('click', function() { startDailyRun('easy'); });
    document.getElementById('daily-run-btn-medium').addEventListener('click', function() { startDailyRun('medium'); });
    document.getElementById('daily-run-btn-hard').addEventListener('click', function() { startDailyRun('hard'); });
    document.getElementById('dr-play-again-btn').addEventListener('click', drPlayAgain);
    document.getElementById('btn-daily-run-to-menu').addEventListener('click', endDailyRunToMenu);

    // ── Session builder (config screen) ──
    document.getElementById('btn-config-back-header').addEventListener('click', hideConfigMenu);
    document.getElementById('btn-config-back-footer').addEventListener('click', hideConfigMenu);
    document.getElementById('lmix-mostly1').addEventListener('click', function() { setLimperMix('mostly1'); });
    document.getElementById('lmix-liveish').addEventListener('click', function() { setLimperMix('liveish'); });
    document.getElementById('lmix-multiway').addEventListener('click', function() { setLimperMix('multiway'); });
    document.getElementById('slen-ENDLESS').addEventListener('click', function() { setSessionLength('ENDLESS'); });
    document.getElementById('slen-10').addEventListener('click', function() { setSessionLength(10); });
    document.getElementById('slen-25').addEventListener('click', function() { setSessionLength(25); });
    document.getElementById('slen-50').addEventListener('click', function() { setSessionLength(50); });
    document.getElementById('cfg-start-btn').addEventListener('click', launchConfiguredSession);

    // ── Trainer screen ──
    document.getElementById('btn-confirm-exit').addEventListener('click', confirmExit);
    document.getElementById('btn-show-log').addEventListener('click', showSessionLog);

    // ── Settings screen ──
    document.getElementById('btn-hide-settings').addEventListener('click', hideSettings);
    document.getElementById('btn-sign-in').addEventListener('click', signInWithGoogle);
    document.getElementById('btn-sign-out').addEventListener('click', signOutCloud);
    document.getElementById('btn-sync-now').addEventListener('click', cloudSyncNow);
    document.getElementById('btn-export').addEventListener('click', exportTrainerData);
    document.getElementById('btn-import').addEventListener('click', triggerImport);

    // ── Session log panel ──
    document.getElementById('session-log-panel').addEventListener('click', function(e) {
        if (e.target === e.currentTarget) hideSessionLog();
    });
    document.getElementById('btn-close-log').addEventListener('click', hideSessionLog);

    // ── Stats drilldown panel ──
    document.getElementById('btn-drilldown-back').addEventListener('click', hideDrilldown);
    document.getElementById('btn-drilldown-close').addEventListener('click', hideDrilldown);

    // ── Chart modal ──
    document.getElementById('btn-close-chart').addEventListener('click', closeChart);

    // ── Campaign complete screen ──
    document.getElementById('btn-close-campaign').addEventListener('click', closeCampaignComplete);
    document.getElementById('btn-campaign-to-menu').addEventListener('click', closeCampaignCompleteToMenu);

    // ── Math drills screen ──
    document.getElementById('btn-exit-math-drill').addEventListener('click', exitMathDrill);
}

window.onload = function(){ loadProgress(); try{ updateMenuUI(); }catch(e){} try{ updateOpenSizeUI(); }catch(e){} startCloudAutosaveLoop(false); initEventListeners(); };

// Forward wheel events to #menu-screen when it is the active screen,
// so scrolling works even when the mouse is outside the narrow center column.
// Do not intercept when any overlay screen is open on top of the menu.
document.addEventListener('wheel', function(e) {
    const menuScreen = document.getElementById('menu-screen');
    if (!menuScreen || menuScreen.classList.contains('hidden')) return;
    const overlayIds = ['config-screen','challenge-screen','library-screen','settings-screen','stats-screen','daily-run-screen','drilldown-panel','math-drill-screen'];
    const anyOverlayOpen = overlayIds.some(id => { const el = document.getElementById(id); return el && !el.classList.contains('hidden'); });
    if (anyOverlayOpen) return;
    menuScreen.scrollTop += e.deltaY;
    e.preventDefault();
}, { passive: false });
function showUserStats() {
    hideAllScreens();
    const screen = document.getElementById('stats-screen');
    if (screen) screen.classList.remove('hidden');

    // Render after screen is visible; if something fails, show a readable error instead of a blank page.
    try {
        renderUserStats();
    } catch (e) {
        const body = document.getElementById('stats-body');
        if (body) {
            body.innerHTML = `
                <div class="p-5 rounded-2xl bg-slate-900 border border-rose-900/40">
                    <div class="text-lg font-bold text-rose-300 mb-2">Stats render error</div>
                    <div class="text-sm text-slate-300">This means a JS error prevented the stats UI from rendering.</div>
                    <pre class="mt-3 text-xs whitespace-pre-wrap text-slate-200 bg-slate-950/60 p-3 rounded-xl overflow-auto">${String(e && (e.stack || e.message || e))}</pre>
                </div>`;
        }
        console.error('renderUserStats failed:', e);
    }
}
function hideUserStats() {
    hideAllScreens();
    showMenu();
}

        // ============================================================
// PROFILE (simple username) — namespaced storage keys
// ============================================================


// ============================================================
// === SIMULATOR UI ===
// Pass 2 REDO (fixed): bugs addressed —
//   1. Cards no longer re-flip on every state change (_simTableInitialized guard)
//   2. Summary uses #turn-context-line (flex-1) + hides table — no more squish
//   3. River skipped in sim.js — turn now terminates correctly
//   4. Villain action shown inline with delay; street context in #scenario-hint
// All functions here are new — nothing above is modified.
// ============================================================

let _simRun = null;
let _simPendingTimeout = null;
let _simTableInitialized = false;   // guard: only set up table/cards once per hand
let _simRenderedBoardLen = 0;       // guard: only call renderCommunityCards when board grows
let _simLastStreet = '';            // guard: detect street transitions to sweep stale bets

// ---------------------------------------------------------------------------
// simActionLabel
// ---------------------------------------------------------------------------
function simActionLabel(action) {
    const map = {
        'fold':  'FOLD',
        'call':  'CALL',
        'check': 'CHECK',
        'raise': 'RAISE TO ' + (typeof formatAmt === 'function' && typeof getOpenSize$ === 'function' ? formatAmt(getOpenSize$()) : '2.5bb'),
        'bet':   'BET ' + (typeof formatAmt === 'function' && typeof getBigBlind$ === 'function'
                     ? formatAmt(Math.round((_simRun ? _simRun.gameState.potBB * 0.33 : 1) * getBigBlind$()))
                     : '33%'),
        '3bet':  '3-BET',
        '4bet':  '4-BET',
        'raise_2.5x': 'RAISE 2.5\u00d7'
    };
    return map[action] || action;
}

// ---------------------------------------------------------------------------
// _simSetScenarioHint — writes street/context into #scenario-hint
// ---------------------------------------------------------------------------
function _simSetScenarioHint(text) {
    const el = document.getElementById('scenario-hint');
    if (el) el.textContent = text || '';
}

// ---------------------------------------------------------------------------
// _simRestoreLayout — undo terminal layout overrides before new hand / exit
// ---------------------------------------------------------------------------
function _simRestoreLayout() {
    try {
        const tw = document.getElementById('table-wrapper');
        if (tw) tw.classList.remove('hidden');
        const ha = document.getElementById('hero-area');
        if (ha) ha.classList.remove('hidden');
        const ab = document.getElementById('action-buttons');
        if (ab) {
            // preserve minHeight lock across hands so the table doesn't resize
        }
        const tcl = document.getElementById('turn-context-line');
        if (tcl) {
            tcl.classList.add('hidden');
            tcl.style.flex = '';
            tcl.style.overflowY = '';
            tcl.style.minHeight = '';
            tcl.style.padding = '';
            tcl.style.justifyContent = '';
            tcl.style.alignItems = '';
            tcl.innerHTML = '';
        }
        // Restore elements hidden in terminal state
        const ccs = document.getElementById('community-cards-strip');
        if (ccs) ccs.classList.remove('hidden');
        const pcd = document.getElementById('postflop-card-divider');
        if (pcd) pcd.classList.remove('hidden');
        // Remove recap drawer if present
        try { const d = document.getElementById('sim-recap-drawer'); if (d) d.remove(); } catch(_) {}
    } catch(_) {}
}

// ---------------------------------------------------------------------------
// _simEnsureVillainCards — deal 2 hole cards to villain if not already dealt
// ---------------------------------------------------------------------------
function _simEnsureVillainCards(h) {
    const villainSeat = h.seats.find(function(s) { return s !== null && !s.isHero; });
    if (!villainSeat || (villainSeat.holeCards && villainSeat.holeCards.length >= 2)) return;
    const heroSeat = h.seats[h.heroSeatIndex];
    const exclude = new Set();
    if (heroSeat && heroSeat.holeCards) {
        heroSeat.holeCards.forEach(function(c) { exclude.add(typeof c === 'string' ? c : c.rank + c.suit); });
    }
    ((h.gameState && h.gameState.board) || []).forEach(function(c) { exclude.add(typeof c === 'string' ? c : c.rank + c.suit); });
    const ranks = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
    const suits = ['h','d','c','s'];
    const deck = [];
    for (var ri = 0; ri < ranks.length; ri++) {
        for (var si = 0; si < suits.length; si++) {
            var cc = ranks[ri] + suits[si];
            if (!exclude.has(cc)) deck.push(cc);
        }
    }
    for (var i = deck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
    }
    villainSeat.holeCards = [deck[0], deck[1]];
}

// ---------------------------------------------------------------------------
// _simRenderShowdownHands — appends villain cards (face-down) to #hand-display
// ---------------------------------------------------------------------------
function _simRenderShowdownHands(h) {
    const hd = document.getElementById('hand-display');
    if (!hd) return;
    const villainSeat = h.seats.find(function(s) { return s !== null && !s.isHero; });
    if (!villainSeat || !villainSeat.holeCards || villainSeat.holeCards.length < 2) return;

    const SUIT_MAP = { s: '♠', h: '♥', c: '♣', d: '♦' };
    const colorClass = function(s) { return (s === '♥' || s === '♦') ? 'text-rose-600' : 'text-slate-900'; };

    function villainCardHtml(cardStr) {
        const raw = typeof cardStr === 'string' ? cardStr : (cardStr.rank + cardStr.suit);
        const r = raw.slice(0, -1);
        const rawSuit = raw.slice(-1);
        const s = SUIT_MAP[rawSuit] || rawSuit;
        const cc = colorClass(s);
        return '<div class="hero-card-wrapper sim-villain-card" style="width:var(--hero-card-w,64px);height:var(--hero-card-h,96px);">' +
            '<div class="hero-card-inner" style="width:100%;height:100%;">' +
            '<div class="hero-card-back-face"></div>' +
            '<div class="hero-card-front card-display flex flex-col items-center" style="width:100%;height:100%;">' +
            '<div class="h-1/2 w-full flex items-end justify-center pb-1"><span class="font-black leading-none ' + cc + '" style="font-size:var(--hero-rank-size,32px);">' + r + '</span></div>' +
            '<div class="h-1/2 w-full flex items-start justify-center pt-1"><span class="leading-none ' + cc + '" style="font-size:var(--hero-suit-size,28px);">' + s + '</span></div>' +
            '</div></div></div>';
    }

    const vsHtml = '<div class="flex items-center px-1" style="color:#64748b;font-weight:900;font-size:var(--btn-font,14px);">vs</div>';
    const villainHtml = villainSeat.holeCards.map(villainCardHtml).join('');
    hd.innerHTML = hd.innerHTML + vsHtml + villainHtml;
}

// ---------------------------------------------------------------------------
// _simFlipVillainCards — reveal villain cards with staggered flip
// ---------------------------------------------------------------------------
function _simFlipVillainCards() {
    const cards = document.querySelectorAll('#hand-display .sim-villain-card .hero-card-inner');
    cards.forEach(function(c, i) {
        setTimeout(function() { c.classList.add('flipped'); }, i * 120);
    });
}

// ---------------------------------------------------------------------------
// _simShowRecapDrawer — slide-up bottom sheet: accuracy + street recap + CTAs
// ---------------------------------------------------------------------------
function _simShowRecapDrawer(h) {
    // Remove any stale drawer first
    try { const old = document.getElementById('sim-recap-drawer'); if (old) old.remove(); } catch(_) {}

    const summary = getHandSummary(h);
    const btnStyle = 'style="padding:var(--btn-pad,14px) 0;font-size:var(--btn-font,14px);"';

    // Accuracy chip
    const total = summary.streetSummaries.filter(function(r) { return r.heroAction; }).length;
    const correct = summary.streetSummaries.filter(function(r) { return r.grade === 'correct'; }).length;
    let chipHtml = '';
    if (total > 0) {
        const pct = Math.round((correct / total) * 100);
        const chipColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
        chipHtml = '<div style="display:flex;justify-content:center;margin-bottom:12px;">' +
            '<div style="background:' + chipColor + '22;border:1.5px solid ' + chipColor + ';border-radius:999px;padding:4px 16px;display:flex;align-items:center;gap:6px;">' +
            '<span style="font-size:18px;font-weight:900;color:' + chipColor + ';">' + pct + '%</span>' +
            '<span style="font-size:12px;color:#94a3b8;font-weight:700;">accuracy</span>' +
            '</div></div>';
    }

    // Outcome line
    const heroSeat = h.seats[h.heroSeatIndex];
    const outcome = h.outcome;
    let outcomeLine = '';
    if (outcome) {
        const villainSeat = h.seats.find(function(s) { return s !== null && !s.isHero; });
        const prefix = outcome.showdownReached ? 'Showdown' :
            (villainSeat && villainSeat.folded) ? 'Villain folded' :
            (heroSeat && heroSeat.folded) ? 'Hero folded' : '';
        let resultStr;
        if (outcome.heroNetBB > 0)
            resultStr = '<span style="color:#34d399;font-weight:900;">+' + outcome.heroNetBB.toFixed(1) + 'bb</span>';
        else if (outcome.heroNetBB < 0)
            resultStr = '<span style="color:#f87171;font-weight:900;">' + outcome.heroNetBB.toFixed(1) + 'bb</span>';
        else
            resultStr = '<span style="color:#94a3b8;font-weight:900;">0bb</span>';
        outcomeLine = '<div style="text-align:center;font-size:15px;font-weight:700;color:#e2e8f0;margin-bottom:12px;">' +
            (prefix ? prefix + ' \u2014 ' : '') + resultStr + '</div>';
    }

    // Street rows
    const gradeIcon  = { correct: '✓', error: '✗', mixed: '≈' };
    const gradeColor = { correct: '#34d399', error: '#f87171', mixed: '#fbbf24' };
    const streetColor = { preflop: '#818cf8', flop: '#fcd34d', turn: '#fb923c', river: '#f87171' };

    const _rcBbDollars = (typeof getBigBlind$ === 'function') ? getBigBlind$() : 3;
    const rowsHtml = summary.streetSummaries.map(function(row) {
        if (!row.heroAction) return '';
        const gc = gradeColor[row.grade] || '#94a3b8';
        const gi = gradeIcon[row.grade] || '?';
        const sc = streetColor[row.street] || '#94a3b8';
        const corrLine = (row.grade === 'error')
            ? '<div style="font-size:11px;color:#94a3b8;margin-top:2px;padding-left:4px;">\u2192 should be <span style="color:#e2e8f0;font-weight:700;">' + simActionLabel(row.correctAction) + '</span></div>'
            : '';
        var sizeGradeLine = '';
        if (row.sizeGrade && row.sizeGrade !== 'correct' && row.chosenSizingBucket && row.correctSizingBucket) {
            var sizeColor = row.sizeGrade === 'error' ? '#fbbf24' : '#94a3b8';
            var sizeMsg = row.sizeGrade === 'error'
                ? '\u2192 size: should be <span style="color:#e2e8f0;font-weight:700;">' + row.correctSizingBucket + '</span> (you chose ' + row.chosenSizingBucket + ')'
                : '\u2192 size: <span style="color:#e2e8f0;font-weight:700;">' + row.correctSizingBucket + '</span> preferred (you chose ' + row.chosenSizingBucket + ')';
            sizeGradeLine = '<div style="font-size:11px;color:' + sizeColor + ';margin-top:2px;padding-left:4px;">' + sizeMsg + '</div>';
        }
        let actionLabel = simActionLabel(row.heroAction);
        if (row.chosenSizingBB && (row.heroAction === 'bet' || row.heroAction === 'raise')) {
            const amtDollars = Math.round(row.chosenSizingBB * _rcBbDollars);
            actionLabel += ' <span style="font-size:11px;color:#64748b;font-weight:600;">($' + amtDollars + ')</span>';
        }
        return '<div style="display:flex;flex-direction:column;padding:10px 0;border-bottom:1px solid #1e293b;">' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:' + sc + ';background:' + sc + '22;border-radius:4px;padding:2px 7px;">' + row.street + '</span>' +
            '<span style="flex:1;font-size:14px;font-weight:700;color:#e2e8f0;">' + actionLabel + '</span>' +
            '<span style="font-size:18px;font-weight:900;color:' + gc + ';">' + gi + '</span>' +
            '</div>' + corrLine + sizeGradeLine + '</div>';
    }).filter(Boolean).join('');

    const rowsBlock = rowsHtml
        ? '<div style="background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:0 12px;margin-bottom:14px;">' + rowsHtml + '</div>'
        : '';

    const assessLine = summary.lineAssessment
        ? '<div style="font-size:12px;color:#64748b;font-style:italic;text-align:center;margin-bottom:14px;">' + summary.lineAssessment + '</div>'
        : '';

    // Cards display
    function _recapMiniCard(cardStr) {
        if (!cardStr || cardStr.length < 2) return '';
        var rank = cardStr.slice(0, -1);
        var suit = cardStr.slice(-1);
        var suitSym = { h: '\u2665', d: '\u2666', c: '\u2663', s: '\u2660' }[suit] || suit;
        var color = (suit === 'h' || suit === 'd') ? '#ef4444' : '#1e293b';
        return '<div style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;' +
            'width:30px;height:42px;background:#fff;border-radius:5px;border:1px solid #475569;' +
            'color:' + color + ';font-weight:900;font-size:12px;line-height:1;gap:1px;flex-shrink:0;">' +
            '<span>' + rank + '</span><span style="font-size:10px;">' + suitSym + '</span>' +
            '</div>';
    }
    var _rcVillainSeat = h.seats.find(function(s) { return s !== null && !s.isHero; });
    var _rcBoard = (h.gameState && h.gameState.board) ? h.gameState.board : [];
    var cardsBlock = '';
    if (heroSeat && heroSeat.holeCards && heroSeat.holeCards.length >= 2) {
        var _rcHeroHtml = heroSeat.holeCards.map(_recapMiniCard).join('');
        var _rcVillainHtml = (summary.showdownReached && _rcVillainSeat && _rcVillainSeat.holeCards && _rcVillainSeat.holeCards.length >= 2)
            ? _rcVillainSeat.holeCards.map(_recapMiniCard).join('') : '';
        var _rcBoardHtml = _rcBoard.length ? _rcBoard.map(_recapMiniCard).join('') : '';
        var _rcParts = '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">' +
            '<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Hero</span>' +
            '<div style="display:flex;gap:4px;">' + _rcHeroHtml + '</div></div>';
        if (_rcBoardHtml) {
            _rcParts += '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">' +
                '<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Board</span>' +
                '<div style="display:flex;gap:4px;">' + _rcBoardHtml + '</div></div>';
        }
        if (_rcVillainHtml) {
            _rcParts += '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">' +
                '<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Villain</span>' +
                '<div style="display:flex;gap:4px;">' + _rcVillainHtml + '</div></div>';
        }
        cardsBlock = '<div style="background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:12px;margin-bottom:14px;">' +
            '<div style="display:flex;align-items:flex-end;justify-content:center;gap:16px;flex-wrap:wrap;">' +
            _rcParts + '</div></div>';
    }

    const drawer = document.createElement('div');
    drawer.id = 'sim-recap-drawer';
    drawer.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;' +
        'background:#1e293b;border-top:1.5px solid #334155;border-radius:20px 20px 0 0;' +
        'padding:16px 16px 24px;max-height:75vh;overflow-y:auto;' +
        'transform:translateY(100%);transition:transform 0.38s cubic-bezier(0.34,1.1,0.64,1);' +
        'box-shadow:0 -8px 32px rgba(0,0,0,0.5);';

    // Session strip — only when session active
    var sessionStrip = '';
    if (typeof simSession !== 'undefined' && simSession.active && simSession.handsPlayed > 0) {
        var _sNetBB = parseFloat((simSession.currentStack - simSession.startStack).toFixed(1));
        var _sNetStr = _sNetBB >= 0 ? '+' + _sNetBB : '' + _sNetBB;
        var _sNetColor = _sNetBB > 0 ? '#34d399' : _sNetBB < 0 ? '#f87171' : '#94a3b8';
        var _sAccPct = simSession.totalDecisions > 0
            ? Math.round((simSession.correctDecisions / simSession.totalDecisions) * 100) + '%' : '--';
        sessionStrip =
            '<div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:10px 12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">' +
            '<div style="display:flex;flex-direction:column;gap:2px;">' +
            '<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#475569;">Session · Hand ' + simSession.handsPlayed + '</span>' +
            '<span style="font-size:13px;font-weight:800;color:#e2e8f0;">' + simSession.currentStack + 'bb <span style="color:' + _sNetColor + ';font-size:11px;">(' + _sNetStr + ')</span></span>' +
            '</div>' +
            '<div style="text-align:right;">' +
            '<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#475569;">Session acc</span><br>' +
            '<span style="font-size:13px;font-weight:800;color:#e2e8f0;">' + _sAccPct + '</span>' +
            '</div></div>';
    }

    var isSession = typeof simSession !== 'undefined' && simSession.active;
    var nextHandLabel = isSession ? 'Next Hand' : 'Play Another Hand';
    var exitLabel = isSession ? 'End Session' : 'Back to Menu';
    var exitOnclick = isSession ? '_simEndSessionAndSummary()' : '_simExitToMenu()';

    drawer.innerHTML =
        '<div style="width:40px;height:4px;background:#334155;border-radius:2px;margin:0 auto 14px;"></div>' +
        '<div style="max-width:360px;margin:0 auto;">' +
        chipHtml +
        outcomeLine +
        sessionStrip +
        cardsBlock +
        rowsBlock +
        assessLine +
        '<div style="display:flex;flex-direction:column;gap:10px;">' +
        '<button onclick="startSimulator()" ' + btnStyle + ' class="pc-btn pc-btn-primary w-full">' + nextHandLabel + '</button>' +
        '<button onclick="' + exitOnclick + '" ' + btnStyle + ' class="pc-btn pc-btn-fold w-full">' + exitLabel + '</button>' +
        '</div></div>';

    document.body.appendChild(drawer);

    // Trigger slide-up
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            drawer.style.transform = 'translateY(0)';
        });
    });
}

// ---------------------------------------------------------------------------
// startSimulator — entry point; also called by "Play Another Hand"
// ---------------------------------------------------------------------------
function launchConfiguredSession() {
    if (typeof sessionBuilder !== 'undefined' && sessionBuilder.fullHandMode) {
        // Full Hand / Live Table always runs as a session: rotation + stack tracking
        if (typeof startSimSession === 'function') {
            startSimSession(sessionBuilder.sessionStack || 100);
        }
        startSimulator('FULL_TABLE');
    } else {
        startConfiguredTraining();
    }
}

function startSimulator(lane) {
    if (!lane) {
        lane = 'FULL_TABLE';
    }
    try { __clearNextTimer(); __endResolve(); } catch(_) {}
    try { window.__tableAnimToken = (window.__tableAnimToken || 0) + 1; } catch(_) {}
    if (_simPendingTimeout) { clearTimeout(_simPendingTimeout); _simPendingTimeout = null; }
    _simTableInitialized = false;
    _simRenderedBoardLen = 0;
    _simLastStreet = '';
    var heroPos = (typeof _simGetCurrentHeroPos === 'function') ? _simGetCurrentHeroPos() : null;
    _simRun = createHandRun({ lane: lane, heroPos: heroPos });
    _simEnsureVillainCards(_simRun); // deal villain cards upfront so they're available for log

    hideAllScreens();
    document.getElementById('trainer-screen').classList.remove('hidden');
    if (typeof window._trainerLayoutBoot === 'function') window._trainerLayoutBoot();
    try { ensureTableLayers(true); } catch(_) {}
    _simRestoreLayout();

    // Hide trainer chrome that doesn't apply to simulator
    ['dr-round-counter', 'drill-counter', 'streak-best-block',
     'stack-bb-badge', 'flop-info-line'].forEach(function(id) {
        try { document.getElementById(id).classList.add('hidden'); } catch(_) {}
    });

    _simUpdateSessionHud();
    try { clearCommunityCards(); } catch(_) {}

    const simHeroLabel = _simRun.seats[_simRun.heroSeatIndex].label;
    const simVillainSeat = _simRun.seats.find(function(s) { return s && !s.isHero; });
    const simVillainLabel = simVillainSeat ? simVillainSeat.label : 'BB';

    state.currentPos = simHeroLabel;
    state.oppPos = simVillainLabel;
    const simScenario = (_simRun.lane === 'BB_vs_BTN_SRP' ||
        (_simRun.preflopContext && _simRun.preflopContext.opener)) ? 'FACING_RFI' : 'RFI';
    state.scenario = simScenario;
    state.villainOpenSize = getOpenSize$();

    // Show card backs + greyed-out buttons before animation (matches trainer UX)
    renderHeroCardBacks();
    _simRenderActionArea(_simRun);
    try {
        const btnDiv = document.querySelector('#action-buttons > div');
        if (btnDiv) { btnDiv.classList.remove('action-buttons-revealed'); btnDiv.classList.add('action-buttons-hidden'); }
    } catch(_) {}

    runTableAnimation(simHeroLabel, simVillainLabel, simScenario, function() {
        const heroSeat = _simRun.seats[_simRun.heroSeatIndex];
        if (heroSeat && heroSeat.holeCards && heroSeat.holeCards.length >= 2) {
            renderHand({
                cards: heroSeat.holeCards.map(function(c) {
                    return typeof c === 'string' ? { rank: c[0], suit: c[1] } : c;
                })
            });
            requestAnimationFrame(flipHeroCards);
        }
        _simTableInitialized = true;
        revealButtons();
    });
}

// ---------------------------------------------------------------------------
// _simAppendCommunityCards — append only newly dealt cards without clearing existing ones
// Used for turn/river so flop cards don't re-animate
// ---------------------------------------------------------------------------
function _simAppendCommunityCards(newCards) {
    const isMob = typeof SEAT_COORDS !== 'undefined' && typeof SEAT_COORDS_MOBILE !== 'undefined' && SEAT_COORDS === SEAT_COORDS_MOBILE;
    const cc = isMob
        ? document.getElementById('community-cards-strip')
        : document.getElementById('community-cards');
    if (!cc) return;
    newCards.forEach(function(c) {
        const rank = c.rank || (typeof c === 'string' ? c.slice(0, -1) : '?');
        const suit = c.suit || (typeof c === 'string' ? c.slice(-1) : '?');
        const color = (typeof flopSuitColor === 'function') ? flopSuitColor(suit) : ((suit === 'h' || suit === 'd') ? '#e11d48' : '#f1f5f9');
        const sym = (typeof SUIT_SYMBOLS !== 'undefined' && SUIT_SYMBOLS[suit]) ? SUIT_SYMBOLS[suit] : suit;
        const el = document.createElement('div');
        el.className = 'card-display';
        el.style.cssText = 'width:var(--cc-w,42px);height:var(--cc-h,58px);display:flex;flex-direction:column;align-items:center;justify-content:center;animation:ccDeal 0.25s ease-out both;';
        el.innerHTML = '<div style="font-size:var(--cc-rank-size,16px);font-weight:900;color:' + color + ';line-height:1;">' + rank + '</div>' +
            '<div style="font-size:var(--cc-suit-size,14px);color:' + color + ';line-height:1;">' + sym + '</div>';
        cc.appendChild(el);
    });
}

// ---------------------------------------------------------------------------
// _simRenderRound — main render; guards re-initializing table/cards each call
// ---------------------------------------------------------------------------
function _simRenderRound() {
    if (!_simRun) return;
    const h = _simRun;

    // One-time per hand: set up table seats
    // Cards and table animation are handled by startSimulator → runTableAnimation.
    // This fallback fires when _simRenderRound is called before the animation completes
    // (e.g. BB_vs_BTN_SRP villain_response fires ~1600ms, animation takes ~2350ms).
    // Use actual seat labels so non-BTN/BB lanes render correctly.
    if (!_simTableInitialized) {
        _simTableInitialized = true;
        const _fbHero = (h.seats && h.seats[h.heroSeatIndex]) ? h.seats[h.heroSeatIndex].label : 'BTN';
        const _fbVillain = h.seats ? h.seats.find(function(s) { return s && !s.isHero; }) : null;
        updateTable(_fbHero, _fbVillain ? _fbVillain.label : 'BB');
    }

    // Board: flop → full render; turn/river → append only (no re-animation of existing cards)
    const board = h.gameState.board;
    if (board && board.length > 0) {
        if (board.length > _simRenderedBoardLen) {
            if (_simRenderedBoardLen === 0) {
                renderCommunityCards(board);
            } else {
                _simAppendCommunityCards(board.slice(_simRenderedBoardLen));
            }
            _simRenderedBoardLen = board.length;
        }
    } else {
        if (_simRenderedBoardLen > 0) {
            clearCommunityCards();
            _simRenderedBoardLen = 0;
        }
    }

    // Detect street transition — sweep stale bet chips off the felt, keep pot badge
    try {
        const betsLayer = document.getElementById('bets-layer');
        if (betsLayer && _simLastStreet !== '' && h.street !== _simLastStreet) {
            Array.from(betsLayer.children).forEach(function(child) {
                if (child.id !== 'pot-badge') child.remove();
            });
        }
    } catch(_) {}
    _simLastStreet = h.street;

    // Pot badge: preflop shows blind total since potBB starts at 0
    try {
        const betsLayer = document.getElementById('bets-layer');
        if (betsLayer) {
            const existing = document.getElementById('pot-badge');
            if (existing) existing.remove();
            const potAmt = h.gameState.potBB > 0
                ? h.gameState.potBB * getBigBlind$()
                : (h.street === 'preflop' ? getBlindTotal$() : 0);
            renderPotBadge(betsLayer, potAmt);
        }
    } catch(_) {}

    // Persistent per-seat bet chips for current street
    try { _simRenderStreetBetChips(h); } catch(_) {}

    _simRenderActionArea(h);
}

// ---------------------------------------------------------------------------
// _simRenderStreetBetChips — render a persistent chip near each seat that has
// committed chips this street. Removes old chips first so this is idempotent.
// ---------------------------------------------------------------------------
function _simRenderStreetBetChips(h) {
    const betsLayer = document.getElementById('bets-layer');
    if (!betsLayer) return;

    // Remove previous per-seat chips (leave pot-badge alone)
    Array.from(betsLayer.querySelectorAll('.sim-street-chip')).forEach(function(el) { el.remove(); });

    const ss = h.gameState && h.gameState.streetState;
    if (!ss || !ss.committedBB) return;

    const heroPos = h.seats[h.heroSeatIndex] ? h.seats[h.heroSeatIndex].label : null;
    const isMob = (SEAT_COORDS === SEAT_COORDS_MOBILE);
    const bOff = isMob ? 11 : 14;

    Object.keys(ss.committedBB).forEach(function(seatLabel) {
        var amtBB = ss.committedBB[seatLabel];
        if (!amtBB || amtBB <= 0) return;

        var coords = (typeof getSeatCoords === 'function' && heroPos)
            ? getSeatCoords(heroPos, seatLabel)
            : null;
        if (!coords) return;

        var origL = parseFloat(coords.left), origT = parseFloat(coords.top);
        var betL = origL, betT = origT;

        // Nudge toward table center
        if (betL < 45) betL += bOff; else if (betL > 55) betL -= bOff;
        if (betT < 45) betT += bOff; else if (betT > 55) betT -= bOff;
        if (origT > (isMob ? 80 : 84)) betT -= (isMob ? 10 : 12);
        if (origT < (isMob ? 12 : 10)) betT += (isMob ? 8 : 10);
        if (origL < (isMob ? 8 : 6)) betL += (isMob ? 10 : 12);
        if (origL > (isMob ? 92 : 94)) betL -= (isMob ? 10 : 12);
        if (typeof BET_JITTER !== 'undefined' && BET_JITTER[seatLabel] != null) betL += BET_JITTER[seatLabel];

        betL = Math.max(isMob ? 10 : 8, Math.min(isMob ? 90 : 92, betL));
        betT = Math.max(isMob ? 12 : 10, Math.min(isMob ? 88 : 90, betT));

        var isHero = (seatLabel === heroPos);
        var chipColor = isHero ? '#4f46e5' : '#be123c';
        var amtLabel = (typeof bbTo$ === 'function') ? bbTo$(amtBB) : (amtBB + 'bb');

        var chip = document.createElement('div');
        chip.className = 'sim-street-chip absolute flex items-center gap-1 z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2';
        chip.style.left = betL + '%';
        chip.style.top = betT + '%';
        chip.innerHTML =
            '<div style="width:var(--chip-size,16px);height:var(--chip-size,16px);border-radius:50%;background:' + chipColor + ';border:2px solid rgba(255,255,255,0.3);flex-shrink:0;"></div>' +
            '<span style="font-size:var(--chip-font,9px);font-weight:900;color:#fde68a;background:rgba(0,0,0,0.55);padding:1px 4px;border-radius:4px;white-space:nowrap;">' + amtLabel + '</span>';
        betsLayer.appendChild(chip);
    });
}

// ---------------------------------------------------------------------------
// _simRenderActionArea — dispatches on nodeType; manages layout for terminal
// ---------------------------------------------------------------------------
function _simRenderActionArea(h) {
    const container = document.getElementById('action-buttons');
    if (!container) return;
    setSizingHint('');

    const btnStyle = 'style="padding:var(--btn-pad,14px) 0;font-size:var(--btn-font,14px);"';

    // ---- Terminal: keep table visible, reveal villain cards, slide-up recap ----
    if (isTerminal(h)) {
        try { const ab = document.getElementById('action-buttons'); if (ab) { ab.innerHTML = ''; } } catch(_) {}
        try { const tcl = document.getElementById('turn-context-line'); if (tcl) { tcl.style.minHeight = '0'; tcl.innerHTML = ''; } } catch(_) {}
        // Remove any stale drawer from a previous hand
        try { const d = document.getElementById('sim-recap-drawer'); if (d) d.remove(); } catch(_) {}

        _simSetScenarioHint('Hand Complete');

        const isSessionActive = typeof simSession !== 'undefined' && simSession.active;
        const outcome = (typeof getHandSummary === 'function') ? getHandSummary(h) : null;
        const isShowdown = outcome && outcome.showdownReached;

        // Only deal/show villain cards at showdown
        if (isShowdown) {
            _simEnsureVillainCards(h);
            _simRenderShowdownHands(h);
        }

        // Record hand to session
        if (typeof _simRecordHandToSession === 'function') {
            _simRecordHandToSession(h);
            _simUpdateSessionHud();
        }

        // Guard: if _simRun changes (new hand started) abort pending callbacks
        const handRef = h;

        if (isSessionActive) {
            // Session mode: flip villain cards only at showdown, then auto-advance
            setTimeout(function() {
                if (_simRun !== handRef) return;
                if (isShowdown) _simFlipVillainCards();
                setTimeout(function() {
                    if (_simRun !== handRef) return;
                    _simAdvanceSessionLane();
                    startSimulator();
                }, isShowdown ? 800 : 400);
            }, 350);
        } else {
            // Single-hand mode: flip villain cards only at showdown, then show recap
            setTimeout(function() {
                if (_simRun !== handRef) return;
                if (isShowdown) _simFlipVillainCards();
                setTimeout(function() {
                    if (_simRun !== handRef) return;
                    _simShowRecapDrawer(handRef);
                }, isShowdown ? 800 : 300);
            }, 350);
        }
        return;
    }

    // ---- Villain response ----
    if (h.nodeType === 'villain_response') {
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.innerHTML =
            '<span class="text-slate-400 font-bold" style="font-size:var(--btn-font,14px);">Villain thinking\u2026</span>';
        _simPendingTimeout = setTimeout(function() {
            _simPendingTimeout = null;
            _simRun = applyVillainAction(_simRun);

            // Read villain's action from streetState.actions (last BB entry)
            const villainActions = _simRun.gameState.streetState.actions;
            const _villainLabelForAct = (_simRun.seats.find(function(s) { return s && !s.isHero; }) || {}).label || 'BB';
            const lastAct = [...villainActions].reverse().find(function(a) { return a.seatLabel === _villainLabelForAct; });
            const villainAction = lastAct ? lastAct.action : '';
            const actLabel = simActionLabel(villainAction);

            // Villain animations per spec Part 9 — use dynamic seat labels
            try {
                const _animHeroLabel = _simRun.seats[_simRun.heroSeatIndex].label;
                const _animVillainSeat = _simRun.seats.find(function(s) { return s && !s.isHero; });
                const _animVillainLabel = _animVillainSeat ? _animVillainSeat.label : 'BB';
                const betsLayer = document.getElementById('bets-layer');
                const villainSeatEl = document.getElementById('seat-' + _animVillainLabel);
                if (villainAction === 'check') {
                    if (betsLayer) renderVillainCheck(betsLayer, _animHeroLabel, _animVillainLabel);
                    if (villainSeatEl) showActionBadge(villainSeatEl, 'CHECK', 'badge-call', 700);
                } else if (villainAction === 'bet') {
                    const betAmt$ = Math.round(_simRun.gameState.potBB * 0.33 * getBigBlind$());
                    if (betsLayer) renderVillainBet(betsLayer, _animHeroLabel, _animVillainLabel, betAmt$);
                    if (villainSeatEl) showActionBadge(villainSeatEl, 'BET ' + formatAmt(betAmt$), 'badge-raise', 700);
                } else if (villainAction === 'fold') {
                    if (villainSeatEl) showActionBadge(villainSeatEl, 'FOLD', 'badge-fold', 700);
                } else if (villainAction === 'call') {
                    if (villainSeatEl) showActionBadge(villainSeatEl, 'CALL', 'badge-call', 1000);
                } else if (villainAction === '3bet') {
                    if (villainSeatEl) showActionBadge(villainSeatEl, '3-BET', 'badge-raise', 1000);
                } else if (villainAction === 'raise') {
                    const raiseAmt$ = getOpenSize$();
                    if (betsLayer) renderVillainBet(betsLayer, _animHeroLabel, _animVillainLabel, raiseAmt$);
                    if (villainSeatEl) showActionBadge(villainSeatEl, 'RAISE ' + formatAmt(raiseAmt$), 'badge-raise', 1000);
                }
            } catch(_) {}

            // Show inline for 1.1s so player can read it before buttons appear
            if (container && actLabel) {
                const badgeColor = villainAction === 'fold' ? 'text-rose-400'
                    : (villainAction === 'bet' || villainAction === 'raise' || villainAction === '3bet') ? 'text-amber-400'
                    : 'text-emerald-400';
                container.style.display = 'flex';
                container.style.alignItems = 'center';
                container.style.justifyContent = 'center';
                container.innerHTML =
                    '<span><span class="text-slate-400 font-bold" style="font-size:var(--btn-font,14px);">Villain: </span>' +
                    '<span class="font-black ' + badgeColor + '" style="font-size:var(--btn-font,14px);">' + actLabel + '</span></span>';
            }
            setTimeout(function() { _simRenderRound(); }, 1100);
        }, 500);
        return;
    }

    // ---- Street advance (triggered from _simRenderActionArea, not applyVillainAction) ----
    if (h.nodeType === 'street_advance') {
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.innerHTML =
            '<span class="text-slate-500 font-bold" style="font-size:var(--btn-font,14px);">Dealing\u2026</span>';
        _simPendingTimeout = setTimeout(function() {
            _simPendingTimeout = null;
            _simRun = advanceStreet(_simRun);
            _simRenderRound();
        }, 800);
        return;
    }

    // ---- Hero decision ----
    if (h.nodeType === 'hero_decision') {
        const actions = getAvailableActions(h);
        const node = [...h.decisionNodes].reverse().find(function(n) { return n.heroAction === null; });
        const math = node ? node.mathContext : null;

        // Street + board context + running accuracy in scenario-hint
        const gsBoard = h.gameState.board;
        const boardStr = (gsBoard && gsBoard.length > 0)
            ? ' \u00b7 ' + gsBoard.map(function(c) {
                return typeof c === 'string' ? c : (c.rank + c.suit);
              }).join(' ')
            : '';
        const accStr = _simRunningAccuracy(h);
        _simSetScenarioHint(h.street.toUpperCase() + boardStr + (accStr ? ' \u00b7 ' + accStr : ''));

        // Check if postflop bet is an option — if so, split into action row + sizing row
        const hasBet = h.street !== 'preflop' && actions.indexOf('bet') !== -1;
        let buttonsHtml;

        if (hasBet) {
            // Single 4-col row: [CHECK/FOLD | SMALL | MED | LARGE]
            // Prefer CHECK over FOLD — fold is dominated when check is free
            const nonBetActions = actions.filter(function(a) { return a !== 'bet'; });
            const passAction = nonBetActions.indexOf('check') !== -1 ? 'check' : 'fold';
            const passCls = passAction === 'fold' ? 'pc-btn pc-btn-fold' : 'pc-btn pc-btn-passive';
            const passBtn = '<button onclick="handleSimAction(\'' + passAction + '\')" ' + btnStyle + ' class="' + passCls + '">' + simActionLabel(passAction) + '</button>';

            const potBB = h.gameState.potBB;
            const bbDollars = (typeof getBigBlind$ === 'function') ? getBigBlind$() : 3;
            const sizeTiers = [
                { label: 'Small', pct: 33, fraction: 0.33 },
                { label: 'Med',   pct: 67, fraction: 0.67 },
                { label: 'Pot',   pct: 100, fraction: 1.0 }
            ];
            const sizingBtns = sizeTiers.map(function(sz) {
                const amtBB = Math.round(potBB * sz.fraction * 10) / 10;
                const amtDollars = Math.round(potBB * sz.fraction * bbDollars);
                return '<button onclick="handleSimAction(\'bet\',' + amtBB + ')" ' +
                    'style="padding:var(--btn-pad,14px) 0;display:flex;flex-direction:column;align-items:center;gap:1px;font-size:var(--btn-font,14px);" ' +
                    'class="pc-btn pc-btn-aggressive">' +
                    '<span style="font-weight:900;">' + sz.label + '</span>' +
                    '<span style="font-size:10px;opacity:0.8;">' + sz.pct + '% \u00b7 $' + amtDollars + '</span>' +
                    '</button>';
            }).join('');

            buttonsHtml = '<div class="grid grid-cols-4 gap-3 action-buttons-revealed">' + passBtn + sizingBtns + '</div>';
        } else {
            const cols = actions.length <= 2 ? 2 : 3;
            // Precompute postflop raise size (2.5× villain bet) for button label
            const _postflopRaiseLabel = (function() {
                if (h.street === 'preflop') return null;
                const _heroLbl = h.seats[h.heroSeatIndex].label;
                const _vBet = [...h.gameState.streetState.actions].reverse()
                    .find(function(a) { return a.seatLabel !== _heroLbl && (a.action === 'bet' || a.action === 'raise'); });
                if (!_vBet) return null;
                const _raiseBB = Math.round(_vBet.sizingBB * 2.5 * 10) / 10;
                const _raise$ = Math.round(_raiseBB * getBigBlind$());
                return 'RAISE TO $' + _raise$;
            })();
            const btns = actions.map(function(action) {
                const label = (action === 'raise' && _postflopRaiseLabel) ? _postflopRaiseLabel : simActionLabel(action);
                const isFold = action === 'fold';
                const isAggr = action.startsWith('raise') || action.startsWith('3bet') || action.startsWith('bet');
                const cls = isFold ? 'pc-btn pc-btn-fold'
                    : isAggr ? 'pc-btn pc-btn-aggressive'
                    : 'pc-btn pc-btn-passive';
                return '<button onclick="handleSimAction(\'' + action + '\')" ' + btnStyle + ' class="' + cls + '">' + label + '</button>';
            }).join('');
            buttonsHtml = '<div class="grid grid-cols-' + cols + ' gap-3 action-buttons-revealed">' + btns + '</div>';
        }

        let mathHtml = '';
        if (math && (math.potOddsRatio || (math.heroEquityEst !== null && math.heroEquityEst !== undefined))) {
            const parts = [];
            if (math.potOddsRatio) parts.push('Pot odds: ' + math.potOddsRatio + ' (need ' + math.potOddsPct + '%)');
            if (math.heroEquityEst !== null && math.heroEquityEst !== undefined) parts.push('Equity: ~' + math.heroEquityEst + '%');
            if (math.outsCount) parts.push('Outs: ' + math.outsCount);
            mathHtml =
                '<div id="sim-math-hint" class="hidden text-center text-slate-400 font-bold mt-1" style="font-size:var(--hint-size,13px);">' +
                parts.join(' \u00b7 ') + '</div>' +
                '<div class="text-center mt-0.5"><button onclick="toggleSimMath()" class="text-slate-600 hover:text-slate-400 font-bold" style="font-size:11px;">[Show math]</button></div>';
        }

        // Reset flex centering used by transient states, restore normal block flow
        // Preflop context banner (FULL_TABLE): show table action summary above buttons
        var preflopContextHtml = '';
        if (h.preflopContext && h.street === 'preflop') {
            var _ctx = h.preflopContext;
            var _ctxText;
            if (!_ctx.opener) {
                _ctxText = 'Folds to ' + _ctx.heroPos + ' \u00b7 First to act';
            } else {
                var _foldCount = _ctx.tableActions.filter(function(a) { return a.action === 'fold'; }).length;
                var _callerCount = _ctx.tableActions.filter(function(a) { return a.action === 'call'; }).length;
                _ctxText = (_foldCount > 0 ? _foldCount + ' fold' + (_foldCount > 1 ? 's' : '') + ' \u00b7 ' : '') +
                    _ctx.opener + ' opens' +
                    (_callerCount > 0 ? ' \u00b7 ' + _callerCount + ' caller' + (_callerCount > 1 ? 's' : '') : '') +
                    ' \u00b7 action on ' + _ctx.heroPos;
            }
            preflopContextHtml = '<div class="text-slate-500 text-center font-bold mb-2" style="font-size:11px;letter-spacing:0.05em;">' + _ctxText + '</div>';
        }

        container.style.display = '';
        container.style.alignItems = '';
        container.style.justifyContent = '';
        container.innerHTML = preflopContextHtml + buttonsHtml + mathHtml;
        // Lock container height after first render so transient states don't resize the table
        if (!container._simMinHeightLocked) {
            requestAnimationFrame(function() {
                if (container && !container._simMinHeightLocked) {
                    container.style.minHeight = container.offsetHeight + 'px';
                    container._simMinHeightLocked = true;
                }
            });
        }
        return;
    }
}

// ---------------------------------------------------------------------------
// handleSimAction — button tap handler
// ---------------------------------------------------------------------------
function handleSimAction(action, heroSizingBB) {
    if (!_simRun || isTerminal(_simRun)) return;
    if (_simPendingTimeout) { clearTimeout(_simPendingTimeout); _simPendingTimeout = null; }

    const isBet = action === 'bet' || action === 'raise' || action === '4bet';
    if (isBet) {
        try {
            if (action === 'bet') {
                const betBB = (heroSizingBB !== undefined && heroSizingBB !== null)
                    ? heroSizingBB
                    : _simRun.gameState.potBB * 0.33;
                animateHeroBetDollars(betBB * getBigBlind$());
            } else if (action === '4bet') {
                const _3betEntry = _simRun.gameState.streetState.actions
                    .slice().reverse().find(function(a) { return a.action === '3bet'; });
                const fourBetBB = _3betEntry ? Math.round(_3betEntry.sizingBB * 2.2 * 10) / 10 : 22;
                animateHeroBetDollars(fourBetBB * getBigBlind$());
            } else {
                animateHeroBetDollars(getOpenSize$());
            }
        } catch(_) {}
    }

    try {
        const _heroLabel = _simRun ? _simRun.seats[_simRun.heroSeatIndex].label : 'BTN';
        const heroEl = document.getElementById('seat-' + _heroLabel);
        if (heroEl) {
            const bc = isBet ? 'badge-raise' : action === 'fold' ? 'badge-fold' : 'badge-call';
            let badgeLabel = simActionLabel(action).toUpperCase();
            if (action === 'bet' && heroSizingBB !== undefined && heroSizingBB !== null) {
                badgeLabel = 'BET $' + Math.round(heroSizingBB * getBigBlind$());
            }
            showActionBadge(heroEl, badgeLabel, bc, 700);
        }
    } catch(_) {}

    _simRun = applyHeroAction(_simRun, action, heroSizingBB);
    _simRenderRound();
}

// ---------------------------------------------------------------------------
// _simRunningAccuracy — live accuracy string for scenario hint
// ---------------------------------------------------------------------------
function _simRunningAccuracy(h) {
    if (!h || !h.decisionNodes) return '';
    var graded = h.decisionNodes.filter(function(n) { return n.heroAction !== null; });
    if (!graded.length) return '';
    var correct = graded.filter(function(n) { return n.grade === 'correct'; }).length;
    return correct + '/' + graded.length + ' \u2713';
}

// ---------------------------------------------------------------------------
// _simUpdateSessionHud — refreshes the session strip above the table
// ---------------------------------------------------------------------------
function _simUpdateSessionHud() {
    var hud = document.getElementById('sim-session-hud');
    if (!hud) return;
    if (typeof simSession === 'undefined' || !simSession.active) {
        hud.style.display = 'none';
        return;
    }
    hud.style.display = 'flex';
    var netBB = parseFloat((simSession.currentStack - simSession.startStack).toFixed(1));
    var netStr = netBB >= 0 ? '+' + netBB : '' + netBB;
    var netColor = netBB > 0 ? '#34d399' : netBB < 0 ? '#f87171' : '#94a3b8';
    var accPct = simSession.totalDecisions > 0
        ? Math.round((simSession.correctDecisions / simSession.totalDecisions) * 100) + '%' : '--';
    var _hudLaneMap = {
        'BTN_vs_BB_SRP':'BTN vs BB','BB_vs_BTN_SRP':'BB vs BTN','CO_vs_BB_SRP':'CO vs BB',
        'SB_vs_BB_SRP':'SB vs BB','HJ_vs_BB_SRP':'HJ vs BB','LJ_vs_BB_SRP':'LJ vs BB',
        'UTG_vs_BB_SRP':'UTG vs BB','UTG1_vs_BB_SRP':'UTG1 vs BB','UTG2_vs_BB_SRP':'UTG2 vs BB'
    };
    var laneLabel = (_simRun && _hudLaneMap[_simRun.lane]) ? _hudLaneMap[_simRun.lane] : '';
    hud.innerHTML =
        (laneLabel ? '<span style="font-size:10px;font-weight:800;color:#818cf8;">' + laneLabel + '</span><span style="color:#334155;">·</span>' : '') +
        '<span style="font-size:10px;font-weight:700;color:#e2e8f0;">Stack: ' + simSession.currentStack + 'bb</span>' +
        '<span style="font-size:10px;font-weight:700;color:' + netColor + ';">(' + netStr + ')</span>' +
        '<span style="color:#334155;">·</span>' +
        '<span style="font-size:10px;color:#64748b;">Hand ' + simSession.handsPlayed + '</span>' +
        '<span style="color:#334155;">·</span>' +
        '<span style="font-size:10px;color:#64748b;">' + accPct + ' acc</span>';
}

// ---------------------------------------------------------------------------
// showSessionLog — slide-up log drawer (called by [Log] button in header)
// ---------------------------------------------------------------------------
function showSessionLog() {
    if (typeof simSession === 'undefined' || !simSession.active || simSession.handLog.length === 0) {
        _showTrainingSessionLog();
        return;
    }
    var old = document.getElementById('sim-session-log-drawer');
    if (old) { old.remove(); return; } // toggle

    var _logMiniCard = function(card) {
        if (!card) return '';
        var rank, suit;
        if (typeof card === 'string') {
            if (card.length < 2) return '';
            rank = card.slice(0, -1);
            suit = card.slice(-1);
        } else {
            rank = card.rank || '';
            suit = card.suit || '';
        }
        var sym = { h:'\u2665', d:'\u2666', c:'\u2663', s:'\u2660' }[suit] || suit;
        var color = (suit === 'h' || suit === 'd') ? '#ef4444' : '#1e293b';
        return '<span style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;width:22px;height:30px;background:#fff;border-radius:3px;font-weight:900;font-size:9px;color:' + color + ';line-height:1;gap:1px;flex-shrink:0;">' +
            '<span>' + rank + '</span><span style="font-size:8px;">' + sym + '</span></span>';
    };

    var _gradeIcon = { correct: '<span style="color:#34d399;">✓</span>', error: '<span style="color:#f87171;">✗</span>', mixed: '<span style="color:#fbbf24;">≈</span>' };
    var _laneLabel = { 'BTN_vs_BB_SRP':'BTN vs BB','BB_vs_BTN_SRP':'BB vs BTN','CO_vs_BB_SRP':'CO vs BB','SB_vs_BB_SRP':'SB vs BB','HJ_vs_BB_SRP':'HJ vs BB','LJ_vs_BB_SRP':'LJ vs BB','UTG_vs_BB_SRP':'UTG vs BB','UTG1_vs_BB_SRP':'UTG1 vs BB','UTG2_vs_BB_SRP':'UTG2 vs BB' };
    var _streetColor = { preflop:'#818cf8', flop:'#fcd34d', turn:'#fb923c', river:'#f87171' };

    // Build a display label for a log entry, using preflopContext when available (FULL_TABLE hands).
    var _entryLaneLabel = function(entry) {
        var ctx = entry.preflopContext;
        if (ctx) {
            // FULL_TABLE hand: derive a precise label from actual table action
            if (!ctx.opener) {
                // Hero was first to act — label by hero position
                return ctx.heroPos + ' vs BB';
            } else if (ctx.heroPos === 'BB') {
                // BB defending: show actual opener, not the proxy lane
                return 'BB vs ' + ctx.opener;
            } else {
                // Hero facing an open from another position
                return ctx.heroPos + ' vs ' + ctx.opener;
            }
        }
        return _laneLabel[entry.lane] || entry.lane;
    };

    var entriesHtml = simSession.handLog.map(function(entry) {
        var gradeIcons = entry.decisions.map(function(d) { return (_gradeIcon[d.grade] || ''); }).join('');
        var netStr = entry.netBB >= 0 ? '+' + entry.netBB + 'bb' : entry.netBB + 'bb';
        var netColor = entry.netBB > 0 ? '#34d399' : entry.netBB < 0 ? '#f87171' : '#94a3b8';
        var heroCardsHtml = entry.heroCards.map(_logMiniCard).join('');
        var boardHtml = entry.board.map(_logMiniCard).join(''); // full board

        var decisionRows = entry.decisions.map(function(d) {
            var sc = _streetColor[d.street] || '#94a3b8';
            var gi = _gradeIcon[d.grade] || '';
            var corrLine = d.grade === 'error'
                ? '<div style="font-size:10px;color:#94a3b8;padding-left:4px;">\u2192 should be <span style="color:#e2e8f0;font-weight:700;">' + d.correctAction + '</span></div>' : '';
            var szLine = (d.sizeGrade && d.sizeGrade !== 'correct' && d.chosenSizingBucket)
                ? '<div style="font-size:10px;color:' + (d.sizeGrade === 'error' ? '#fbbf24' : '#64748b') + ';padding-left:4px;">\u2192 size: should be ' + d.correctSizingBucket + ' (chose ' + d.chosenSizingBucket + ')</div>' : '';
            var hcLabel = d.handClass ? '<span style="font-size:9px;color:#64748b;font-weight:600;margin-left:4px;">' + d.handClass.replace(/_/g,' ') + '</span>' : '';
            return '<div style="display:flex;flex-direction:column;padding:5px 0;border-top:1px solid #1e293b;">' +
                '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
                '<span style="font-size:9px;font-weight:900;text-transform:uppercase;color:' + sc + ';background:' + sc + '22;border-radius:3px;padding:1px 5px;">' + d.street + '</span>' +
                '<span style="flex:1;font-size:12px;font-weight:700;color:#e2e8f0;">' + d.heroAction + '</span>' +
                hcLabel + gi + '</div>' + corrLine + szLine + '</div>';
        }).join('');

        // Villain cards — always show if available; label as "Showdown" if reached
        var villainCardsHtml = '';
        if (entry.villainCards && entry.villainCards.length >= 2) {
            var vcLabel = entry.showdownReached
                ? '<span style="font-size:9px;color:#f87171;font-weight:700;">SHOWDOWN</span>'
                : '<span style="font-size:9px;color:#475569;font-weight:600;">Villain</span>';
            villainCardsHtml = '<div style="display:flex;align-items:center;gap:4px;margin-top:6px;">' +
                vcLabel +
                '<div style="display:flex;gap:2px;margin-left:4px;">' + entry.villainCards.map(_logMiniCard).join('') + '</div>' +
                '</div>';
        }

        var entryId = 'log-entry-' + entry.handNum;
        return '<div style="border-bottom:1px solid #1e293b;padding:10px 0;">' +
            '<div onclick="var d=document.getElementById(\'' + entryId + '\');d.style.display=d.style.display===\'none\'?\'block\':\'none\';" ' +
            'style="display:flex;align-items:center;gap:8px;cursor:pointer;">' +
            '<span style="font-size:10px;color:#475569;font-weight:700;flex-shrink:0;">H' + entry.handNum + '</span>' +
            '<span style="font-size:10px;color:#64748b;flex-shrink:0;">' + _entryLaneLabel(entry) + '</span>' +
            '<div style="display:flex;gap:2px;">' + heroCardsHtml + '</div>' +
            (boardHtml ? '<div style="display:flex;gap:2px;flex-wrap:nowrap;">' + boardHtml + '</div>' : '') +
            '<span style="font-size:11px;font-weight:800;color:' + netColor + ';margin-left:auto;">' + netStr + '</span>' +
            '<span style="font-size:11px;">' + gradeIcons + '</span>' +
            '</div>' +
            '<div id="' + entryId + '" style="display:none;padding-top:4px;">' + villainCardsHtml + decisionRows + '</div>' +
            '</div>';
    }).join('');

    var drawer = document.createElement('div');
    drawer.id = 'sim-session-log-drawer';
    drawer.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#1e293b;border-top:1.5px solid #334155;border-radius:20px 20px 0 0;padding:16px 16px 32px;max-height:80vh;overflow-y:auto;transform:translateY(100%);transition:transform 0.35s cubic-bezier(0.34,1.1,0.64,1);box-shadow:0 -8px 32px rgba(0,0,0,0.5);';
    drawer.innerHTML =
        '<div style="width:40px;height:4px;background:#334155;border-radius:2px;margin:0 auto 12px;"></div>' +
        '<div style="max-width:360px;margin:0 auto;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
        '<span style="font-size:13px;font-weight:900;color:#e2e8f0;">Session Log · ' + simSession.handsPlayed + ' hands</span>' +
        '<button onclick="document.getElementById(\'sim-session-log-drawer\').remove();" style="font-size:11px;color:#64748b;font-weight:700;background:none;border:none;cursor:pointer;">Close</button>' +
        '</div>' +
        entriesHtml +
        '</div>';
    document.body.appendChild(drawer);
    requestAnimationFrame(function() { requestAnimationFrame(function() { drawer.style.transform = 'translateY(0)'; }); });
}

// ---------------------------------------------------------------------------
// _simShowSessionEndSummary — full summary overlay after ending session
// ---------------------------------------------------------------------------
function _simShowSessionEndSummary() {
    var old = document.getElementById('sim-session-end');
    if (old) old.remove();

    var netBB = parseFloat((simSession.currentStack - simSession.startStack).toFixed(1));
    var netStr = netBB >= 0 ? '+' + netBB + 'bb' : netBB + 'bb';
    var netColor = netBB > 0 ? '#34d399' : netBB < 0 ? '#f87171' : '#94a3b8';
    var accPct = simSession.totalDecisions > 0
        ? Math.round((simSession.correctDecisions / simSession.totalDecisions) * 100) : 0;

    // Accuracy by street
    var byStreet = { preflop:{c:0,t:0}, flop:{c:0,t:0}, turn:{c:0,t:0}, river:{c:0,t:0} };
    simSession.handLog.forEach(function(entry) {
        entry.decisions.forEach(function(d) {
            if (byStreet[d.street]) {
                byStreet[d.street].t++;
                if (d.grade === 'correct') byStreet[d.street].c++;
            }
        });
    });
    var streetRows = ['preflop','flop','turn','river'].map(function(s) {
        var st = byStreet[s];
        if (!st.t) return '';
        var pct = Math.round((st.c / st.t) * 100);
        return '<div style="display:flex;justify-content:space-between;padding:3px 0;">' +
            '<span style="font-size:12px;color:#94a3b8;text-transform:capitalize;">' + s + '</span>' +
            '<span style="font-size:12px;font-weight:700;color:#e2e8f0;">' + st.c + '/' + st.t + ' (' + pct + '%)</span></div>';
    }).join('');

    var overlay = document.createElement('div');
    overlay.id = 'sim-session-end';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#0f172a;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;';
    overlay.innerHTML =
        '<div style="width:100%;max-width:360px;">' +
        '<div style="text-align:center;margin-bottom:20px;">' +
        '<div style="font-size:22px;font-weight:900;color:#e2e8f0;margin-bottom:4px;">Session Complete</div>' +
        '<div style="font-size:13px;color:#64748b;">' + simSession.handsPlayed + ' hands played</div>' +
        '</div>' +
        '<div style="background:#1e293b;border:1px solid #334155;border-radius:14px;padding:16px;margin-bottom:14px;">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">' +
        '<span style="font-size:12px;color:#64748b;">Stack</span>' +
        '<span style="font-size:13px;font-weight:800;color:' + netColor + ';">' + simSession.startStack + 'bb \u2192 ' + simSession.currentStack + 'bb (' + netStr + ')</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
        '<span style="font-size:12px;color:#64748b;">Peak</span>' +
        '<span style="font-size:12px;font-weight:700;color:#34d399;">' + simSession.peakStack + 'bb</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;">' +
        '<span style="font-size:12px;color:#64748b;">Trough</span>' +
        '<span style="font-size:12px;font-weight:700;color:#f87171;">' + simSession.troughStack + 'bb</span>' +
        '</div>' +
        '</div>' +
        '<div style="background:#1e293b;border:1px solid #334155;border-radius:14px;padding:16px;margin-bottom:14px;">' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#475569;margin-bottom:8px;">Accuracy</div>' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:6px;">' +
        '<span style="font-size:12px;color:#64748b;">Overall</span>' +
        '<span style="font-size:14px;font-weight:900;color:' + (accPct >= 80 ? '#34d399' : accPct >= 60 ? '#fbbf24' : '#f87171') + ';">' + accPct + '%</span>' +
        '</div>' + streetRows +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:10px;">' +
        '<button onclick="_simSessionEndNewSession()" style="width:100%;padding:14px 0;font-size:14px;font-weight:900;" class="pc-btn pc-btn-primary">New Session</button>' +
        '<button onclick="showSessionLog();document.getElementById(\'sim-session-end\').remove();" style="width:100%;padding:12px 0;font-size:14px;font-weight:700;" class="pc-btn pc-btn-passive">Review Log</button>' +
        '<button onclick="_simSessionEndExit()" style="width:100%;padding:12px 0;font-size:14px;font-weight:700;" class="pc-btn pc-btn-fold">Back to Menu</button>' +
        '</div></div>';
    document.body.appendChild(overlay);
}

function _simSessionEndNewSession() {
    var old = document.getElementById('sim-session-end');
    if (old) old.remove();
    if (typeof endSimSession === 'function') endSimSession();
    showConfigMenu();
}

function _simSessionEndExit() {
    var old = document.getElementById('sim-session-end');
    if (old) old.remove();
    if (typeof endSimSession === 'function') endSimSession();
    _simExitToMenu();
}

// ---------------------------------------------------------------------------
// toggleSimMath — DOM-only toggle of math hint row
// ---------------------------------------------------------------------------
function toggleSimMath() {
    const panel = document.getElementById('sim-math-hint');
    if (!panel) return;
    const nowHidden = panel.classList.toggle('hidden');
    const btn = document.querySelector('button[onclick="toggleSimMath()"]');
    if (btn) btn.textContent = nowHidden ? '[Show math]' : '[Hide math]';
}

// ---------------------------------------------------------------------------
// _simExitToMenu — clean teardown back to main menu
// ---------------------------------------------------------------------------
function _simEndSessionAndSummary() {
    // Close recap drawer
    try { var d = document.getElementById('sim-recap-drawer'); if (d) d.remove(); } catch(_) {}
    _simShowSessionEndSummary();
}

function _simExitToMenu() {
    if (typeof endSimSession === 'function' && typeof simSession !== 'undefined' && simSession.active) {
        endSimSession();
    }
    var hudEl = document.getElementById('sim-session-hud');
    if (hudEl) hudEl.style.display = 'none';
    if (_simPendingTimeout) { clearTimeout(_simPendingTimeout); _simPendingTimeout = null; }
    _simRun = null;
    _simTableInitialized = false;
    _simRestoreLayout();
    try { clearCommunityCards(); } catch(_) {}
    // Restore trainer chrome hidden by startSimulator
    ['dr-round-counter', 'drill-counter', 'streak-best-block',
     'stack-bb-badge', 'flop-info-line'].forEach(function(id) {
        try { document.getElementById(id).classList.remove('hidden'); } catch(_) {}
    });
    // Clean up sim-specific state properties so trainer starts fresh
    try { delete state.scenario; delete state.currentPos; delete state.oppPos; delete state.villainOpenSize; } catch(_) {}
    try { if (typeof window._trainerLayoutTeardown === 'function') window._trainerLayoutTeardown(); } catch(_) {}
    hideAllScreens();
    document.getElementById('menu-screen').classList.remove('hidden');
    updateMenuUI();
}

// ---------------------------------------------------------------------------
// _simBuildReviewHtml — summary rendered into #turn-context-line
// ---------------------------------------------------------------------------
function _simReviewCardHtml(card) {
    // card is a string like "Ac", "Kh", or an object {rank, suit}
    var rank, suit;
    if (typeof card === 'string') {
        rank = card.slice(0, -1);
        suit = card.slice(-1);
    } else {
        rank = card.rank;
        suit = card.suit;
    }
    var color = (suit === 'h' || suit === 'd') ? '#dc2626' : '#e2e8f0';
    var sym = (typeof SUIT_SYMBOLS !== 'undefined' && SUIT_SYMBOLS[suit]) ? SUIT_SYMBOLS[suit] : suit;
    return '<span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:44px;background:#1e293b;border:1.5px solid #334155;border-radius:6px;font-weight:900;font-size:13px;color:' + color + ';line-height:1;flex-direction:column;gap:1px;">' +
        '<span>' + rank + '</span><span style="font-size:11px;">' + sym + '</span></span>';
}

function _simBuildReviewHtml(h) {
    const summary = getHandSummary(h);
    const outcome = h.outcome;

    // Hero hole cards
    const heroSeat = h.seats[h.heroSeatIndex];
    const holeCards = heroSeat && heroSeat.holeCards;
    const cardsHtml = holeCards && holeCards.length >= 2
        ? '<div class="flex justify-center gap-2 mb-1">' + holeCards.map(_simReviewCardHtml).join('') + '</div>'
        : '';

    // Board cards — read exclusively from gameState.board
    const gsBoard = h.gameState && h.gameState.board;
    const boardHtml = (gsBoard && gsBoard.length > 0)
        ? '<div class="flex justify-center gap-1.5 mb-1">' + gsBoard.map(_simReviewCardHtml).join('') + '</div>'
        : '';

    // Outcome line
    let outcomeLine = 'Hand complete';
    if (outcome) {
        const villainSeat = h.seats.find(function(s) { return s !== null && !s.isHero; });
        const prefix = outcome.showdownReached ? 'Showdown' :
            (villainSeat && villainSeat.folded) ? 'Villain folded' :
            (heroSeat && heroSeat.folded) ? 'Hero folded' : '';
        let resultStr;
        if (outcome.heroNetBB > 0)
            resultStr = '<span class="text-emerald-400 font-black">+' + outcome.heroNetBB.toFixed(1) + 'bb</span>';
        else if (outcome.heroNetBB < 0)
            resultStr = '<span class="text-rose-400 font-black">' + outcome.heroNetBB.toFixed(1) + 'bb</span>';
        else
            resultStr = '<span class="text-slate-400 font-black">0bb</span>';
        outcomeLine = (prefix ? prefix + ' \u2014 ' : '') + resultStr;
    }

    const gradeIcon  = { correct: '\u2713', error: '\u2717', mixed: '\u2248' };
    const gradeColor = { correct: 'text-emerald-400', error: 'text-rose-400', mixed: 'text-amber-400' };
    const streetBg   = {
        preflop: 'bg-indigo-900/60 text-indigo-300',
        flop:    'bg-amber-900/40 text-amber-300',
        turn:    'bg-orange-900/40 text-orange-300',
        river:   'bg-rose-900/40 text-rose-300'
    };

    const rowsHtml = summary.streetSummaries.map(function(row) {
        if (!row.heroAction) return '';
        const gc = gradeColor[row.grade] || 'text-slate-500';
        const gi = gradeIcon[row.grade] || '?';
        const bc = streetBg[row.street] || 'bg-slate-800 text-slate-400';
        const corrSpan = (row.grade === 'error')
            ? '<div class="text-xs text-slate-400 mt-1 pl-1">\u2192 should be <span class="text-slate-100 font-bold">' + simActionLabel(row.correctAction) + '</span></div>'
            : '';
        const expHtml = row.explanation
            ? '<div class="text-xs text-slate-500 leading-snug mt-1 pl-1">' + row.explanation + '</div>'
            : '';
        return '<div class="flex flex-col py-3 border-b border-slate-800/50 last:border-0">' +
            '<div class="flex items-center gap-2">' +
            '<span class="shrink-0 text-xs font-black uppercase tracking-wide px-2 py-0.5 rounded ' + bc + '">' + row.street + '</span>' +
            '<span class="text-base font-bold text-slate-100 flex-1">' + simActionLabel(row.heroAction) + '</span>' +
            '<span class="text-lg font-black ' + gc + '">' + gi + '</span>' +
            '</div>' + corrSpan + expHtml + '</div>';
    }).filter(Boolean).join('');

    return '<div class="w-full max-w-sm mx-auto px-4 flex flex-col gap-3 pb-4">' +
        cardsHtml +
        boardHtml +
        '<div class="text-center text-lg font-bold py-1">' + outcomeLine + '</div>' +
        (rowsHtml
            ? '<div class="bg-slate-900/60 border border-slate-800/60 rounded-2xl px-3 py-1 flex flex-col">' + rowsHtml + '</div>'
            : '') +
        '<div class="text-sm text-slate-400 italic text-center">' + summary.lineAssessment + '</div>' +
        '</div>';
}
