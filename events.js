// events.js — addEventListener wiring (Spec 3.2)
// All onclick= attributes have been removed from index.html.
// Pure wiring — no logic changes, no renames.

(function () {
    // ── Menu Screen ──
    document.getElementById('btn-dismiss-onboarding').addEventListener('click', dismissOnboarding);
    document.getElementById('btn-train-now').addEventListener('click', showConfigMenu);
    document.getElementById('btn-daily-run').addEventListener('click', showDailyRunMenu);
    document.getElementById('btn-challenge-mode').addEventListener('click', showChallengeMenu);
    document.getElementById('btn-strategy-library').addEventListener('click', showLibrary);
    document.getElementById('btn-math-drills').addEventListener('click', showMathDrillMenu);
    document.getElementById('btn-my-stats').addEventListener('click', showUserStats);
    document.getElementById('btn-settings').addEventListener('click', showSettings);

    // ── Challenge Screen ──
    document.getElementById('btn-close-challenge-menu').addEventListener('click', closeChallengeMenu);
    document.getElementById('btn-reset-challenge').addEventListener('click', resetChallengeProgress);

    // ── Library Screen ──
    document.getElementById('btn-close-library').addEventListener('click', hideLibrary);
    document.getElementById('lib-tab-RFI').addEventListener('click', function () { setLibCategory('RFI'); });
    document.getElementById('lib-tab-FACING_RFI').addEventListener('click', function () { setLibCategory('FACING_RFI'); });
    document.getElementById('lib-tab-RFI_VS_3BET').addEventListener('click', function () { setLibCategory('RFI_VS_3BET'); });
    document.getElementById('lib-tab-VS_4BET').addEventListener('click', function () { setLibCategory('VS_4BET'); });
    document.getElementById('lib-tab-VS_LIMP').addEventListener('click', function () { setLibCategory('VS_LIMP'); });
    document.getElementById('lib-tab-SQUEEZE').addEventListener('click', function () { setLibCategory('SQUEEZE'); });
    document.getElementById('lib-tab-SQUEEZE_2C').addEventListener('click', function () { setLibCategory('SQUEEZE_2C'); });
    document.getElementById('lib-tab-PUSH_FOLD').addEventListener('click', function () { setLibCategory('PUSH_FOLD'); });
    document.getElementById('lib-tab-POSTFLOP').addEventListener('click', function () { setLibCategory('POSTFLOP'); });

    // ── Review Complete Screen ──
    document.getElementById('btn-review-complete-back').addEventListener('click', closeReviewComplete);

    // ── Session Summary Screen ──
    document.getElementById('btn-session-summary-back').addEventListener('click', closeSessionSummary);

    // ── Review Preview Screen ──
    document.getElementById('btn-review-preview-back').addEventListener('click', hideReviewPreview);
    document.getElementById('btn-launch-review').addEventListener('click', launchReviewSession);

    // ── User Stats Screen ──
    document.getElementById('btn-close-stats').addEventListener('click', hideUserStats);

    // ── Daily Run Screen ──
    document.getElementById('btn-daily-run-back').addEventListener('click', showMenu);
    document.getElementById('daily-run-btn-easy').addEventListener('click', function () { startDailyRun('easy'); });
    document.getElementById('daily-run-btn-medium').addEventListener('click', function () { startDailyRun('medium'); });
    document.getElementById('daily-run-btn-hard').addEventListener('click', function () { startDailyRun('hard'); });

    // ── Daily Run Complete Modal ──
    document.getElementById('dr-play-again-btn').addEventListener('click', drPlayAgain);
    document.getElementById('btn-daily-run-to-menu').addEventListener('click', endDailyRunToMenu);

    // ── Config / Session Builder Screen ──
    document.getElementById('btn-config-back-top').addEventListener('click', hideConfigMenu);
    document.getElementById('lmix-mostly1').addEventListener('click', function () { setLimperMix('mostly1'); });
    document.getElementById('lmix-liveish').addEventListener('click', function () { setLimperMix('liveish'); });
    document.getElementById('lmix-multiway').addEventListener('click', function () { setLimperMix('multiway'); });
    document.getElementById('slen-ENDLESS').addEventListener('click', function () { setSessionLength('ENDLESS'); });
    document.getElementById('slen-10').addEventListener('click', function () { setSessionLength(10); });
    document.getElementById('slen-25').addEventListener('click', function () { setSessionLength(25); });
    document.getElementById('slen-50').addEventListener('click', function () { setSessionLength(50); });
    document.getElementById('cfg-start-btn').addEventListener('click', launchConfiguredSession);
    document.getElementById('btn-config-back-bottom').addEventListener('click', hideConfigMenu);

    // ── Trainer Screen ──
    document.getElementById('btn-confirm-exit').addEventListener('click', confirmExit);
    document.getElementById('btn-show-session-log').addEventListener('click', showSessionLog);

    // ── Settings Screen ──
    document.getElementById('btn-close-settings').addEventListener('click', hideSettings);
    document.getElementById('btn-sign-in-google').addEventListener('click', signInWithGoogle);
    document.getElementById('btn-sign-out').addEventListener('click', signOutCloud);
    document.getElementById('btn-cloud-sync-now').addEventListener('click', cloudSyncNow);
    document.getElementById('btn-export-data').addEventListener('click', exportTrainerData);
    document.getElementById('btn-import-data').addEventListener('click', triggerImport);

    // ── Session Log Panel — backdrop dismiss ──
    document.getElementById('session-log-panel').addEventListener('click', function (e) {
        if (e.target === this) hideSessionLog();
    });
    document.getElementById('btn-close-session-log').addEventListener('click', hideSessionLog);

    // ── Stats Drill-Down Panel ──
    document.getElementById('btn-drilldown-back').addEventListener('click', hideDrilldown);
    document.getElementById('btn-close-drilldown').addEventListener('click', hideDrilldown);

    // ── Mistake Chart Modal ──
    document.getElementById('btn-close-chart').addEventListener('click', closeChart);

    // ── Campaign Complete Screen ──
    document.getElementById('btn-campaign-complete-back').addEventListener('click', closeCampaignComplete);
    document.getElementById('btn-campaign-complete-menu').addEventListener('click', closeCampaignCompleteToMenu);

    // ── Math Drills Screen ──
    document.getElementById('btn-exit-math-drill').addEventListener('click', exitMathDrill);
}());
