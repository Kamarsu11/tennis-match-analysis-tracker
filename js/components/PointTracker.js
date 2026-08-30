/**
 * Courtside Point Tracker UI Component
 * Ultra-fast 1-5 tap courtside tennis logging interface with crystal-clear semantics,
 * scroll preservation, manual confirmation, mid-match jump, and full point editing.
 */

export class PointTrackerComponent {
  constructor(container, engine, onStateChange, onNavigate) {
    this.container = container;
    this.engine = engine;
    this.onStateChange = onStateChange;
    this.onNavigate = onNavigate;

    // Current in-progress draft point
    this.draft = this.getEmptyDraft();
    this.activeModal = null; // 'edit_point' | 'manual_override' | 'comment' | 'jump_score' | 'all_points' | 'match_notes'
    this.editingPointIndex = null;
    this.wakeLock = null;
  }

  getEmptyDraft() {
    return {
      eventPlayer: null,   // 'P1' | 'P2' (The player who hit the winner/error)
      winnerPlayer: null,  // 'P1' | 'P2' (The player who gets the point)
      serve: '1st',        // '1st' | '2nd' (1st serve in vs 2nd serve)
      outcome: null,       // 'ace' | 'double_fault' | 'service_winner' | 'winner' | 'unforced_error' | 'forced_error'
      shotType: null,      // 'forehand' | 'backhand' | 'volley' | 'overhead' | 'drop_shot' | 'return' | 'serve'
      courtPosition: null, // 'deep_baseline' | 'baseline' | 'mid_court' | 'net'
      rallyLength: null,   // '1-4' | '5-8' | '9+'
      netApproach: 'none',
      errorCause: null,    // 'spacing' | 'let_ball' | 'above_shoulder' | 'mindset'
      errorLocation: null, // 'net' | 'wide_left' | 'wide_right' | 'long'
      comment: '',
    };
  }

  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock error:', err);
      }
    }
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
    }
  }

  render() {
    // Preserve scroll position
    const mainEl = this.container.querySelector('main');
    const prevScrollTop = mainEl ? mainEl.scrollTop : 0;

    const sb = this.engine.getScoreboard();
    const curGame = this.engine.state.currentGame;
    const isP1Serving = curGame.server === 'P1';

    this.container.innerHTML = `
      <div class="tracker-root flex flex-col h-full select-none bg-slate-950 text-slate-100">
        
        <!-- TOP SCOREBOARD HEADER -->
        <header class="bg-slate-900 border-b border-slate-800 px-3 py-2 shrink-0">
          <div class="flex items-center justify-between gap-1.5">
            <!-- Exit / New Match & Stats button -->
            <div class="flex items-center gap-1">
              <button id="btn-exit-match" class="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 active:scale-95" title="Exit / Setup New Match">
                🏠 Exit
              </button>
              <button id="btn-to-stats" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 active:scale-95 flex items-center gap-1">
                📊 Analytics
              </button>
            </div>

            <!-- Leverage & Match State Badges -->
            <div class="flex items-center gap-1 flex-wrap justify-center">
              ${sb.isBreakPoint ? '<span class="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold animate-pulse">BREAK PT</span>' : ''}
              ${sb.isGamePoint && !sb.isBreakPoint ? '<span class="px-1.5 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold">GAME PT</span>' : ''}
              ${sb.isSetPoint ? '<span class="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold">SET PT</span>' : ''}
              ${sb.isMatchPoint ? '<span class="px-1.5 py-0.5 rounded bg-purple-600 text-white text-[10px] font-bold">MATCH PT</span>' : ''}
              ${sb.shouldChangeEnds ? '<span class="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold">CHANGE ENDS</span>' : ''}
            </div>

            <!-- Header Quick Actions -->
            <div class="flex items-center gap-1">
              <button id="btn-undo" class="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-slate-700 active:scale-95 disabled:opacity-30 disabled:pointer-events-none" ${this.engine.points.length === 0 ? 'disabled' : ''} title="Undo last point">
                ↩ Undo
              </button>
              <button id="btn-open-match-notes" class="px-2 py-1.5 rounded-lg bg-slate-800 text-amber-300 hover:text-amber-200 border border-slate-700 active:scale-95 text-xs font-semibold flex items-center gap-1" title="Match Notes & Observations">
                📝 Notes
              </button>
              <button id="btn-score-override" class="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 active:scale-95" title="Match Settings & Game Jump">
                ⚙️
              </button>
            </div>
          </div>

          <!-- Score Table -->
          <div class="mt-2 bg-slate-950/90 rounded-xl p-2 border border-slate-800/80">
            <div class="grid grid-cols-[1fr_repeat(auto-fit,minmax(28px,1fr))_48px] gap-1.5 items-center text-sm">
              <!-- Player 1 Row -->
              <div class="flex items-center gap-1.5 truncate">
                ${isP1Serving ? '<span class="w-2.5 h-2.5 rounded-full bg-lime-400 shrink-0 ring-2 ring-lime-400/40" title="Serving"></span>' : '<span class="w-2.5 h-2.5 shrink-0"></span>'}
                <span class="font-bold truncate text-slate-200 ${isP1Serving ? 'text-lime-300' : ''}">${sb.p1Name}</span>
                ${sb.p1Child ? '<span class="text-[10px] bg-sky-950 text-sky-400 px-1 rounded border border-sky-800">Child</span>' : ''}
              </div>
              <div class="flex items-center justify-end gap-2 text-center font-mono">
                ${sb.sets.map((s, idx) => `
                  <span class="w-6 py-0.5 rounded ${idx === sb.currentSet - 1 ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}">
                    ${s.p1}
                  </span>
                `).join('')}
              </div>
              <div class="text-center font-mono text-base font-extrabold text-amber-400 bg-amber-950/40 py-0.5 rounded border border-amber-800/50">
                ${sb.p1Point}
              </div>

              <!-- Player 2 Row -->
              <div class="flex items-center gap-1.5 truncate">
                ${!isP1Serving ? '<span class="w-2.5 h-2.5 rounded-full bg-lime-400 shrink-0 ring-2 ring-lime-400/40" title="Serving"></span>' : '<span class="w-2.5 h-2.5 shrink-0"></span>'}
                <span class="font-bold truncate text-slate-200 ${!isP1Serving ? 'text-lime-300' : ''}">${sb.p2Name}</span>
                ${sb.p2Child ? '<span class="text-[10px] bg-sky-950 text-sky-400 px-1 rounded border border-sky-800">Child</span>' : ''}
              </div>
              <div class="flex items-center justify-end gap-2 text-center font-mono">
                ${sb.sets.map((s, idx) => `
                  <span class="w-6 py-0.5 rounded ${idx === sb.currentSet - 1 ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}">
                    ${s.p2}
                  </span>
                `).join('')}
              </div>
              <div class="text-center font-mono text-base font-extrabold text-amber-400 bg-amber-950/40 py-0.5 rounded border border-amber-800/50">
                ${sb.p2Point}
              </div>
            </div>

            <!-- Sub-Scorebar Details -->
            <div class="mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <div class="flex items-center gap-1.5">
                <span>Server: <strong class="text-slate-200">${curGame.server === 'P1' ? sb.p1Name : sb.p2Name}</strong> (${curGame.servingSide.toUpperCase()})</span>
                <button id="btn-quick-swap-server" type="button" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-lime-400 border border-slate-700 active:scale-95 text-[10px] font-bold" title="Tap to switch who is serving">
                  ⇄ Switch
                </button>
              </div>
              <div>
                Set ${sb.currentSet} ${sb.isTiebreak ? '• <strong class="text-indigo-400">TIE-BREAK</strong>' : `• Game ${curGame.gameIndexInSet + 1}`}
              </div>
              <div class="font-mono text-slate-400">
                Pt #${sb.trackedPoints + 1}
              </div>
            </div>
          </div>

          <!-- RECENT POINTS TICKER (Quick Click to Edit Any Point) -->
          <div class="mt-1.5 flex items-center gap-1 overflow-x-auto text-[11px] no-scrollbar py-0.5">
            <button id="btn-view-all-points" class="text-slate-400 text-[10px] shrink-0 hover:text-white underline">
              All (${sb.trackedPoints}):
            </button>
            ${this.getRecentPointsHtml()}
          </div>
        </header>

        <!-- MAIN POINT ENTRY AREA -->
        ${sb.matchComplete ? this.renderMatchCompleteHtml(sb) : this.renderEntryFlowHtml(sb)}

        <!-- MODAL OVERLAYS -->
        ${this.renderModalsHtml()}
      </div>
    `;

    // Restore scroll position
    const newMainEl = this.container.querySelector('main');
    if (newMainEl) {
      newMainEl.scrollTop = prevScrollTop;
    }

    this.attachEventListeners();
  }

  getRecentPointsHtml() {
    if (this.engine.points.length === 0) {
      return '<span class="text-slate-400 italic">No points yet</span>';
    }

    const recent = this.engine.points.slice(-5).reverse();
    return recent.map(pt => {
      if (pt.type === 'score_jump' || pt.isUntracked) {
        return `
          <button data-jump-id="${pt.id}" class="btn-jump-pill px-2 py-0.5 rounded bg-indigo-950/90 border border-indigo-700 text-indigo-200 shrink-0 flex items-center gap-1 active:scale-95 text-[10px] font-semibold" title="${pt.summary || 'Score Jump'}">
            <span>⏩ Jump (${pt.summary || 'Score Sync'})</span>
          </button>
        `;
      }

      const winnerName = pt.winnerPlayer === 'P1' ? this.engine.config.p1Name : this.engine.config.p2Name;
      let label = `${winnerName} ${this.formatOutcomeShort(pt.outcome)}`;
      if (pt.shotType) label += ` (${pt.shotType.slice(0, 2).toUpperCase()})`;
      const ptNum = pt.trackedIndex || (pt.index + 1);

      return `
        <button data-edit-point-id="${pt.id}" class="btn-edit-recent px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700/80 text-slate-300 hover:text-white shrink-0 active:scale-95 flex items-center gap-1" title="Click to edit point #${ptNum}">
          ${pt.isStarred ? '<span class="text-amber-400 font-bold">⭐️</span>' : ''}
          <span>#${ptNum} ${label}</span>
          ${pt.comment ? '<span class="text-amber-400">💬</span>' : ''}
          <span class="text-[9px] text-slate-400">✏️</span>
        </button>
      `;
    }).join('');
  }

  formatOutcomeShort(outcome) {
    const map = {
      'ace': 'Ace',
      'double_fault': 'DF',
      'service_winner': 'Serv W',
      'winner': 'W',
      'unforced_error': 'UE',
      'forced_error': 'FE',
    };
    return map[outcome] || outcome;
  }

  renderMatchCompleteHtml(sb) {
    const winnerName = sb.matchWinner === 'P1' ? sb.p1Name : sb.p2Name;
    return `
      <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500 flex items-center justify-center text-3xl mb-3">
          🏆
        </div>
        <h2 class="text-2xl font-bold text-white mb-1">Match Finished!</h2>
        <p class="text-lg text-emerald-400 font-semibold mb-4">${winnerName} won the match</p>
        
        <div class="flex flex-col gap-2.5 w-full max-w-xs">
          <button id="btn-view-final-stats" class="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-base shadow-lg shadow-emerald-500/20 active:scale-95">
            📊 View Full Match Analytics
          </button>
          <button id="btn-undo-match-end" class="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm border border-slate-700 active:scale-95">
            ↩ Undo Last Point
          </button>
          <button id="btn-new-match-end" class="w-full py-2.5 rounded-xl bg-slate-900 text-slate-300 font-semibold text-sm border border-slate-800 active:scale-95">
            🏠 Start New Match
          </button>
        </div>
      </div>
    `;
  }

  renderEntryFlowHtml(sb) {
    const curGame = this.engine.state.currentGame;
    const server = curGame.server;
    const receiver = curGame.receiver;
    const draft = this.draft;

    const isEventPlayerSelected = draft.eventPlayer !== null;
    const isServerEvent = draft.eventPlayer === server;
    const isOutcomeSelected = draft.outcome !== null;
    const requiresDetailedFlow = draft.outcome === 'winner' || draft.outcome === 'unforced_error' || draft.outcome === 'forced_error';

    // Compute live summary breakdown
    let pointWinnerName = '';
    let explanationText = '';
    if (draft.winnerPlayer) {
      pointWinnerName = draft.winnerPlayer === 'P1' ? sb.p1Name : sb.p2Name;
      const eventPlayerName = draft.eventPlayer === 'P1' ? sb.p1Name : sb.p2Name;
      const opponentName = draft.eventPlayer === 'P1' ? sb.p2Name : sb.p1Name;

      if (draft.outcome === 'winner') {
        explanationText = `🎯 ${eventPlayerName} hit a Winner → Point to ${pointWinnerName}`;
      } else if (draft.outcome === 'unforced_error') {
        explanationText = `⚠️ ${eventPlayerName} made an Unforced Error → Point to ${pointWinnerName}`;
      } else if (draft.outcome === 'forced_error') {
        explanationText = `🛡️ ${eventPlayerName} was forced into Error by ${opponentName} → Point to ${pointWinnerName}`;
      } else if (draft.outcome === 'ace') {
        explanationText = `⚡ ${eventPlayerName} served an Ace → Point to ${pointWinnerName}`;
      } else if (draft.outcome === 'double_fault') {
        explanationText = `🚫 ${eventPlayerName} Double Faulted → Point to ${pointWinnerName}`;
      } else if (draft.outcome === 'service_winner') {
        explanationText = `🎾 ${eventPlayerName} Service Winner → Point to ${pointWinnerName}`;
      }
    }

    return `
      <main class="flex-1 overflow-y-auto px-3 py-2 space-y-3 pb-32">
        
        <!-- SERVE STATUS SELECTOR (1st Serve In vs 2nd Serve) -->
        <section class="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-xs font-bold text-slate-300 truncate">
            <span>🎾 Serve:</span>
            <span class="text-lime-300 font-bold truncate">${server === 'P1' ? sb.p1Name : sb.p2Name}</span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" data-serve="1st" class="btn-select-serve px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${draft.serve !== '2nd' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 border border-emerald-400' : 'bg-slate-950 text-slate-400 border border-slate-800'}">
              1st Serve In
            </button>
            <button type="button" data-serve="2nd" class="btn-select-serve px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${draft.serve === '2nd' ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20 border border-amber-400' : 'bg-slate-950 text-slate-400 border border-slate-800'}">
              2nd Serve
            </button>
          </div>
        </section>

        <!-- STEP 1: EVENT PLAYER (Whose shot / action is this point about?) -->
        <section>
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex justify-between items-center">
            <span>1. Event Player (Who hit the final shot / made error?)</span>
            ${draft.eventPlayer ? '<span class="text-emerald-400 text-[10px]">Selected ✓</span>' : '<span class="text-amber-400 text-[10px]">Tap player</span>'}
          </div>

          <div class="grid grid-cols-2 gap-2">
            <!-- P1 Button -->
            <button data-event-player="P1" class="btn-select-player p-3 rounded-xl border text-left transition-all active:scale-[0.98] ${draft.eventPlayer === 'P1' ? 'bg-emerald-900/60 border-emerald-500 text-white ring-2 ring-emerald-500/30' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'}">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-bold ${server === 'P1' ? 'text-lime-400' : 'text-slate-400'}">${server === 'P1' ? '🎾 Serving' : 'Receiving'}</span>
                ${sb.p1Child ? '<span class="text-[10px] text-sky-300 bg-sky-950 px-1 rounded">Child</span>' : ''}
              </div>
              <div class="text-base font-extrabold truncate">${sb.p1Name}</div>
            </button>

            <!-- P2 Button -->
            <button data-event-player="P2" class="btn-select-player p-3 rounded-xl border text-left transition-all active:scale-[0.98] ${draft.eventPlayer === 'P2' ? 'bg-emerald-900/60 border-emerald-500 text-white ring-2 ring-emerald-500/30' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'}">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-bold ${server === 'P2' ? 'text-lime-400' : 'text-slate-400'}">${server === 'P2' ? '🎾 Serving' : 'Receiving'}</span>
                ${sb.p2Child ? '<span class="text-[10px] text-sky-300 bg-sky-950 px-1 rounded">Child</span>' : ''}
              </div>
              <div class="text-base font-extrabold truncate">${sb.p2Name}</div>
            </button>
          </div>
        </section>

        <!-- STEP 2: OUTCOME -->
        ${isEventPlayerSelected ? `
          <section class="animate-fadeIn">
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex justify-between items-center">
              <span>2. Outcome</span>
              ${draft.outcome ? '<span class="text-emerald-400 text-[10px]">Selected ✓</span>' : ''}
            </div>

            <div class="grid grid-cols-3 gap-1.5">
              ${isServerEvent ? `
                <!-- Server Aces & Service Winners -->
                <button data-outcome="ace" class="btn-select-outcome py-2.5 px-1.5 rounded-lg font-bold text-xs text-center border transition-all active:scale-95 ${draft.outcome === 'ace' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/40'}">
                  ⚡ Ace
                </button>
                <button data-outcome="service_winner" class="btn-select-outcome py-2.5 px-1.5 rounded-lg font-bold text-xs text-center border transition-all active:scale-95 ${draft.outcome === 'service_winner' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/40'}">
                  🎾 Serv Winner
                </button>
                <button data-outcome="double_fault" class="btn-select-outcome py-2.5 px-1.5 rounded-lg font-bold text-xs text-center border transition-all active:scale-95 ${draft.outcome === 'double_fault' ? 'bg-rose-600 text-white border-rose-400' : 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/40'}">
                  🚫 Double Fault
                </button>
              ` : `
                <!-- Non-Server Options -->
              `}

              <button data-outcome="winner" class="btn-select-outcome py-2.5 px-1.5 rounded-lg font-bold text-xs text-center border transition-all active:scale-95 ${draft.outcome === 'winner' ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-900 text-slate-200 border-slate-800 hover:border-slate-700'}">
                🎯 Clean Winner
              </button>
              
              <button data-outcome="unforced_error" class="btn-select-outcome py-2.5 px-1.5 rounded-lg font-bold text-xs text-center border transition-all active:scale-95 ${draft.outcome === 'unforced_error' ? 'bg-amber-600 text-white border-amber-400' : 'bg-slate-900 text-slate-200 border-slate-800 hover:border-slate-700'}">
                ⚠️ Unforced Error
              </button>

              <button data-outcome="forced_error" class="btn-select-outcome py-2.5 px-1.5 rounded-lg font-bold text-xs text-center border transition-all active:scale-95 ${draft.outcome === 'forced_error' ? 'bg-purple-600 text-white border-purple-400' : 'bg-slate-900 text-slate-200 border-slate-800 hover:border-slate-700'}">
                🛡️ Forced Error
              </button>
            </div>
          </section>
        ` : ''}

        <!-- STEP 3: SHOT TYPE (If Winner, UE, FE) -->
        ${isOutcomeSelected && requiresDetailedFlow ? `
          <section class="animate-fadeIn">
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex justify-between items-center">
              <span>3. Shot Type (${draft.outcome === 'winner' ? 'Winning Shot' : 'Error Shot'})</span>
              ${draft.shotType ? '<span class="text-emerald-400 text-[10px]">Selected ✓</span>' : ''}
            </div>

            <div class="grid grid-cols-3 gap-1.5">
              ${['forehand', 'backhand', 'volley', 'overhead', 'drop_shot', 'return'].map(shot => `
                <button data-shot="${shot}" class="btn-select-shot py-2 px-1.5 rounded-lg text-xs font-semibold text-center border transition-all active:scale-95 ${draft.shotType === shot ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'}">
                  ${this.formatShotName(shot)}
                </button>
              `).join('')}
            </div>
          </section>

          <!-- STEP 4: COURT POSITION -->
          <section class="animate-fadeIn">
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex justify-between items-center">
              <span>4. Court Position of Hitter</span>
              ${draft.courtPosition ? '<span class="text-emerald-400 text-[10px]">Selected ✓</span>' : ''}
            </div>

            <div class="grid grid-cols-4 gap-1">
              ${[
                { id: 'deep_baseline', label: 'Deep Base' },
                { id: 'baseline', label: 'Baseline' },
                { id: 'mid_court', label: 'Mid-Court' },
                { id: 'net', label: 'At Net' }
              ].map(pos => `
                <button data-position="${pos.id}" class="btn-select-position py-2 px-1 rounded-lg text-[11px] font-semibold text-center border transition-all active:scale-95 ${draft.courtPosition === pos.id ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'}">
                  ${pos.label}
                </button>
              `).join('')}
            </div>
          </section>

          <!-- STEP 5: RALLY LENGTH -->
          <section class="animate-fadeIn">
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex justify-between items-center">
              <span>5. Rally Length</span>
              ${draft.rallyLength ? '<span class="text-emerald-400 text-[10px]">Selected ✓</span>' : ''}
            </div>

            <div class="grid grid-cols-3 gap-1.5">
              ${[
                { id: '1-4', label: '1–4 (Short)' },
                { id: '5-8', label: '5–8 (Medium)' },
                { id: '9+', label: '9+ (Long)' }
              ].map(rally => `
                <button data-rally="${rally.id}" class="btn-select-rally py-2.5 px-1 rounded-lg text-xs font-bold text-center border transition-all active:scale-95 ${draft.rallyLength === rally.id ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-900 text-slate-200 border-slate-800 hover:border-slate-700'}">
                  ${rally.label}
                </button>
              `).join('')}
            </div>
          </section>

          <!-- UNFORCED ERROR MISS LOCATION (Net, Left Single Out, Right Single Out, Long Out) -->
          ${draft.outcome === 'unforced_error' ? `
            <section class="animate-fadeIn">
              <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex justify-between items-center">
                <span>Where Did Ball Miss?</span>
                ${draft.errorLocation ? '<span class="text-emerald-400 text-[10px]">Selected ✓</span>' : '<span class="text-slate-400 text-[10px]">Optional</span>'}
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                ${[
                  { id: 'net', label: '🕸️ Net' },
                  { id: 'wide_left', label: '⬅️ Wide Left' },
                  { id: 'wide_right', label: '➡️ Wide Right' },
                  { id: 'long', label: '⬆️ Long Out' }
                ].map(loc => `
                  <button data-location="${loc.id}" class="btn-select-location py-2 px-1.5 rounded-xl text-xs font-bold text-center border transition-all active:scale-95 ${draft.errorLocation === loc.id ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-500/20' : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'}">
                    ${loc.label}
                  </button>
                `).join('')}
              </div>
            </section>
          ` : ''}

          <!-- ERROR / FORCING DIAGNOSTIC -->
          ${(draft.outcome === 'unforced_error' || draft.outcome === 'forced_error') ? `
            <section class="animate-fadeIn">
              <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex justify-between items-center">
                <span>${draft.outcome === 'unforced_error' ? '6. Error Diagnostic / Cause (Why missed?)' : '6. Forcing Cause (What forced error?)'}</span>
                ${draft.errorCause ? '<span class="text-emerald-400 text-[10px]">Selected ✓</span>' : '<span class="text-slate-400 text-[10px]">Optional</span>'}
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                ${[
                  { id: 'spacing', label: 'Spacing' },
                  { id: 'let_ball', label: 'Let ball' },
                  { id: 'above_shoulder', label: 'Above Shoulder' },
                  { id: 'mindset', label: 'Mindset' }
                ].map(c => `
                  <button data-cause="${c.id}" class="btn-select-cause py-2.5 px-2 rounded-xl text-xs font-bold text-center border transition-all active:scale-95 ${draft.errorCause === c.id ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/20' : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'}">
                    ${c.label}
                  </button>
                `).join('')}
              </div>
            </section>
          ` : ''}

          <!-- NET APPROACH, STAR & COMMENTS BAR -->
          <section class="flex items-center gap-2 pt-1">
            <button id="btn-toggle-net" type="button" class="flex-1 py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 ${draft.netApproach !== 'none' ? 'bg-teal-900/60 border-teal-500 text-teal-300' : 'bg-slate-900 border-slate-800 text-slate-400'}">
              <span>🏸 Net: ${this.formatNetApproach(draft.netApproach)}</span>
            </button>

            <button id="btn-toggle-star" type="button" class="py-2 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${draft.isStarred ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20' : 'bg-slate-900 border-slate-800 text-slate-400'}">
              <span>${draft.isStarred ? '⭐️ Starred' : '☆ Star'}</span>
            </button>

            <button id="btn-open-comment" type="button" class="py-2 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 ${draft.comment ? 'bg-amber-900/60 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'}">
              <span>💬 ${draft.comment ? 'Edit Note' : '+ Note'}</span>
            </button>
          </section>
        ` : ''}

        <!-- LIVE SUMMARY CARD (Crystal Clear Semantics Before Logging) -->
        ${draft.winnerPlayer ? `
          <div class="p-3 bg-slate-900/90 rounded-xl border border-emerald-500/40 space-y-1 animate-fadeIn">
            <div class="text-[11px] font-bold text-emerald-400 flex items-center justify-between">
              <span>📌 Point Preview:</span>
              <span class="text-[10px] font-mono font-bold ${draft.serve === '2nd' ? 'text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800' : 'text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800'}">${draft.serve === '2nd' ? '2nd Serve' : '1st Serve In'}</span>
            </div>
            <div class="text-xs font-semibold text-slate-200">${explanationText}</div>
            ${draft.shotType ? `<div class="text-[11px] text-slate-400">Shot: <strong class="text-white capitalize">${draft.shotType}</strong> from <strong class="text-white">${this.formatPosition(draft.courtPosition)}</strong> (${draft.rallyLength || '1-4'} shots)</div>` : ''}
            ${draft.errorLocation ? `<div class="text-[11px] text-rose-300">Miss: <strong>${this.formatLocation(draft.errorLocation)}</strong></div>` : ''}
            ${draft.errorCause ? `<div class="text-[11px] text-amber-300">Cause: <strong>${this.formatCause(draft.errorCause)}</strong></div>` : ''}
            ${draft.comment ? `<div class="text-[11px] text-slate-300 italic">Note: "${draft.comment}"</div>` : ''}
          </div>
        ` : ''}

      </main>

      <!-- FIXED BOTTOM BAR (Confirm / Reset) -->
      ${isEventPlayerSelected ? `
        <footer class="fixed bottom-0 left-0 right-0 p-3 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex items-center gap-2 max-w-md mx-auto z-20">
          <button id="btn-cancel-draft" class="py-3 px-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs border border-slate-700 active:scale-95">
            Reset
          </button>
          <button id="btn-confirm-point" class="flex-1 py-3 px-4 rounded-xl font-extrabold text-sm transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 ${this.canConfirm() ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20' : 'bg-slate-800 text-slate-400 cursor-not-allowed'}">
            <span>✓ Log Point</span>
          </button>
        </footer>
      ` : ''}
    `;
  }

  renderModalsHtml() {
    if (this.activeModal === 'comment') {
      return `
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-4 animate-slideUp">
            <h3 class="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span>💬</span> Point Note / Observation
            </h3>
            <textarea id="modal-comment-input" rows="3" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500" placeholder="e.g. Great cross-court FH angle, stayed aggressive...">${this.draft.comment || ''}</textarea>
            <div class="flex items-center justify-end gap-2 mt-3">
              <button id="btn-modal-comment-cancel" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Cancel</button>
              <button id="btn-modal-comment-save" class="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Save Note</button>
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeModal === 'match_notes') {
      const notes = this.engine.config.notes || '';
      return `
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-4 space-y-3 animate-slideUp max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 class="text-base font-bold text-white flex items-center gap-1.5">
                <span>📝 Match Notes & Comments</span>
              </h3>
              <button id="btn-close-modal" class="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>
            <p class="text-xs text-slate-400">Add overarching coaching notes, tactics, opponent patterns, momentum shifts, or match observations as the match progresses.</p>

            <div>
              <textarea id="input-match-notes-text" rows="7" placeholder="Write overall match comments, tactical patterns, opponent weaknesses, coaching advice..." class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500">${notes}</textarea>
            </div>

            <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button id="btn-close-modal" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs">Cancel</button>
              <button id="btn-save-match-notes" class="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95">
                ✓ Save Match Notes
              </button>
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeModal === 'edit_point' && this.editingPointIndex !== null) {
      const pt = this.engine.points[this.editingPointIndex];
      if (!pt) return '';

      const p1 = this.engine.config.p1Name;
      const p2 = this.engine.config.p2Name;
      const eventPlayer = this.editingDraft?.eventPlayer || pt.eventPlayer || (pt.outcome === 'unforced_error' || pt.outcome === 'forced_error' || pt.outcome === 'double_fault' ? (pt.winnerPlayer === 'P1' ? 'P2' : 'P1') : pt.winnerPlayer);
      const outcome = this.editingDraft?.outcome || pt.outcome || 'winner';
      const calculatedWinner = (outcome === 'winner' || outcome === 'ace' || outcome === 'service_winner') ? eventPlayer : (eventPlayer === 'P1' ? 'P2' : 'P1');
      const calculatedWinnerName = calculatedWinner === 'P1' ? p1 : p2;
      const eventPlayerName = eventPlayer === 'P1' ? p1 : p2;
      const ptNum = pt.trackedIndex || (this.editingPointIndex + 1);
      const serveVal = this.editingDraft?.serve || pt.serve || (pt.outcome === 'double_fault' ? '2nd' : '1st');
      const isStarredVal = this.editingDraft?.isStarred !== undefined ? this.editingDraft.isStarred : Boolean(pt.isStarred);
      const errorLocVal = this.editingDraft?.errorLocation !== undefined ? this.editingDraft.errorLocation : (pt.errorLocation || '');

      return `
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-4 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <h3 class="text-base font-bold text-white">Edit Point #${ptNum}</h3>
              <button id="btn-close-modal" class="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <div class="space-y-3 text-xs">
              <!-- Event Player Selection -->
              <div>
                <label class="block text-slate-400 font-semibold mb-1">Event Player (Who hit the final shot / made error?)</label>
                <div class="grid grid-cols-2 gap-2">
                  <button type="button" data-edit-event-player="P1" class="btn-edit-event-player-choice py-2 rounded-lg border ${eventPlayer === 'P1' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-800 text-slate-300 border-slate-700'} font-bold">
                    ${p1}
                  </button>
                  <button type="button" data-edit-event-player="P2" class="btn-edit-event-player-choice py-2 rounded-lg border ${eventPlayer === 'P2' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-800 text-slate-300 border-slate-700'} font-bold">
                    ${p2}
                  </button>
                </div>
              </div>

              <!-- Star / Favorite Toggle -->
              <div>
                <button id="btn-edit-toggle-star" type="button" class="w-full py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${isStarredVal ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' : 'bg-slate-950 border-slate-700 text-slate-300'}">
                  <span>${isStarredVal ? '⭐️ Marked as Favorite / Key Point' : '☆ Mark as Favorite / Key Point'}</span>
                </button>
              </div>

              <!-- Serve (1st In vs 2nd) -->
              <div>
                <label class="block text-slate-400 font-semibold mb-1">Serve Attempt</label>
                <select id="edit-serve-select" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-semibold">
                  <option value="1st" ${serveVal === '1st' ? 'selected' : ''}>1st Serve In</option>
                  <option value="2nd" ${serveVal === '2nd' ? 'selected' : ''}>2nd Serve</option>
                </select>
              </div>

              <!-- Outcome Selection -->
              <div>
                <label class="block text-slate-400 font-semibold mb-1">Outcome</label>
                <select id="edit-outcome-select" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white">
                  <option value="winner" ${outcome === 'winner' ? 'selected' : ''}>🎯 Clean Winner</option>
                  <option value="unforced_error" ${outcome === 'unforced_error' ? 'selected' : ''}>⚠️ Unforced Error</option>
                  <option value="forced_error" ${outcome === 'forced_error' ? 'selected' : ''}>🛡️ Forced Error</option>
                  <option value="ace" ${outcome === 'ace' ? 'selected' : ''}>⚡ Ace</option>
                  <option value="service_winner" ${outcome === 'service_winner' ? 'selected' : ''}>🎾 Service Winner</option>
                  <option value="double_fault" ${outcome === 'double_fault' ? 'selected' : ''}>🚫 Double Fault</option>
                </select>
              </div>

              <!-- Live Calculated Result Card -->
              <div class="p-2.5 bg-slate-950 rounded-xl border border-emerald-500/40 text-[11px] text-slate-200">
                <strong class="text-emerald-400">Result:</strong> ${eventPlayerName} (${this.formatOutcomeShort(outcome)}) → Point to <strong class="text-white">${calculatedWinnerName}</strong>
              </div>

              <div>
                <label class="block text-slate-400 font-semibold mb-1">Shot Type</label>
                <select id="edit-shot-select" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white">
                  <option value="forehand" ${pt.shotType === 'forehand' ? 'selected' : ''}>Forehand</option>
                  <option value="backhand" ${pt.shotType === 'backhand' ? 'selected' : ''}>Backhand</option>
                  <option value="volley" ${pt.shotType === 'volley' ? 'selected' : ''}>Volley</option>
                  <option value="overhead" ${pt.shotType === 'overhead' ? 'selected' : ''}>Overhead</option>
                  <option value="drop_shot" ${pt.shotType === 'drop_shot' ? 'selected' : ''}>Drop Shot</option>
                  <option value="return" ${pt.shotType === 'return' ? 'selected' : ''}>Return</option>
                  <option value="serve" ${pt.shotType === 'serve' ? 'selected' : ''}>Serve</option>
                </select>
              </div>

              <div>
                <label class="block text-slate-400 font-semibold mb-1">Court Position</label>
                <select id="edit-pos-select" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white">
                  <option value="baseline" ${pt.courtPosition === 'baseline' ? 'selected' : ''}>Baseline</option>
                  <option value="deep_baseline" ${pt.courtPosition === 'deep_baseline' ? 'selected' : ''}>Deep Baseline</option>
                  <option value="mid_court" ${pt.courtPosition === 'mid_court' ? 'selected' : ''}>Mid-Court</option>
                  <option value="net" ${pt.courtPosition === 'net' ? 'selected' : ''}>At Net</option>
                </select>
              </div>

              <div>
                <label class="block text-slate-400 font-semibold mb-1">Rally Length</label>
                <select id="edit-rally-select" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white">
                  <option value="1-4" ${pt.rallyLength === '1-4' ? 'selected' : ''}>1–4 Shots (First Strike)</option>
                  <option value="5-8" ${pt.rallyLength === '5-8' ? 'selected' : ''}>5–8 Shots (Medium)</option>
                  <option value="9+" ${pt.rallyLength === '9+' ? 'selected' : ''}>9+ Shots (Long Rally)</option>
                </select>
              </div>

              <!-- Miss Location for UE -->
              <div>
                <label class="block text-slate-400 font-semibold mb-1">Miss Location (For Unforced Errors)</label>
                <select id="edit-error-location-select" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white">
                  <option value="">None / Unspecified</option>
                  <option value="net" ${errorLocVal === 'net' ? 'selected' : ''}>🕸️ Net</option>
                  <option value="wide_left" ${errorLocVal === 'wide_left' ? 'selected' : ''}>⬅️ Wide Left</option>
                  <option value="wide_right" ${errorLocVal === 'wide_right' ? 'selected' : ''}>➡️ Wide Right</option>
                  <option value="long" ${errorLocVal === 'long' ? 'selected' : ''}>⬆️ Long Out</option>
                </select>
              </div>

              <div>
                <label class="block text-slate-400 font-semibold mb-1">Cause / Diagnostic</label>
                <select id="edit-cause-select" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white">
                  <option value="">None / Default</option>
                  <option value="spacing" ${pt.errorCause === 'spacing' ? 'selected' : ''}>Spacing</option>
                  <option value="let_ball" ${pt.errorCause === 'let_ball' ? 'selected' : ''}>Let ball</option>
                  <option value="above_shoulder" ${(pt.errorCause === 'above_shoulder' || pt.errorCause === 'above_sholder') ? 'selected' : ''}>Above Shoulder</option>
                  <option value="mindset" ${pt.errorCause === 'mindset' ? 'selected' : ''}>Mindset</option>
                </select>
              </div>

              <div>
                <label class="block text-slate-400 font-semibold mb-1">Note / Comment</label>
                <input id="edit-comment-input" type="text" value="${pt.comment || ''}" class="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white">
              </div>
            </div>

            <div class="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800">
              <button id="btn-delete-point" class="px-3 py-2 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 font-bold text-xs">
                Delete Point
              </button>
              <div class="flex gap-2">
                <button id="btn-close-modal" class="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs">Cancel</button>
                <button id="btn-save-edited-point" class="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeModal === 'all_points') {
      const points = this.engine.points;
      const config = this.engine.config;
      const trackedCount = points.filter(p => !p.isUntracked && p.type !== 'score_jump' && p.type !== 'server_switch').length;

      return `
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-4 max-h-[85vh] flex flex-col">
            <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <h3 class="text-base font-bold text-white">All Logged Points (${trackedCount} tracked)</h3>
              <button id="btn-close-modal" class="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <div class="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              ${points.length === 0 ? '<div class="text-slate-400 italic text-center py-4">No points logged yet.</div>' : points.slice().reverse().map(pt => {
                if (pt.type === 'score_jump') {
                  return `
                    <div class="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-700/60 flex items-center justify-between gap-2">
                      <div>
                        <div class="font-bold text-indigo-200 flex items-center gap-1.5">
                          <span>⏩ Score Jump</span>
                          <span class="text-slate-200 font-semibold">${pt.summary || 'Score adjusted'}</span>
                        </div>
                        <div class="text-[10px] text-indigo-300/80">Untracked games skipped / score synchronized</div>
                      </div>
                      <button data-delete-jump-id="${pt.id}" class="btn-delete-jump text-xs text-rose-400 hover:text-rose-300 px-2 py-1 bg-rose-950/50 rounded-lg border border-rose-800 shrink-0 active:scale-95">✕ Remove</button>
                    </div>
                  `;
                }

                if (pt.type === 'server_switch') {
                  const sName = pt.server === 'P1' ? config.p1Name : config.p2Name;
                  return `
                    <div class="p-2 rounded-xl bg-slate-950 border border-lime-800/40 flex items-center justify-between gap-2 text-[11px]">
                      <div class="flex items-center gap-1.5 text-lime-300 font-bold">
                        <span>🎾 Server Changed →</span>
                        <span class="text-white">${sName}</span>
                      </div>
                      <button data-delete-jump-id="${pt.id}" class="btn-delete-jump text-[10px] text-rose-400 hover:text-rose-300 px-1.5 py-0.5 bg-rose-950/50 rounded border border-rose-800 shrink-0">✕ Undo</button>
                    </div>
                  `;
                }

                const ptNum = pt.trackedIndex || (pt.index + 1);
                const is2nd = pt.serve === '2nd' || pt.outcome === 'double_fault';

                return `
                  <div data-edit-point-id="${pt.id}" class="btn-edit-recent p-2 rounded-xl bg-slate-950 border ${pt.isStarred ? 'border-amber-500/80 bg-amber-950/20' : 'border-slate-800'} hover:border-slate-700 cursor-pointer flex items-center justify-between">
                    <div>
                      <div class="font-bold text-white flex items-center gap-1.5 flex-wrap">
                        ${pt.isStarred ? '<span class="text-amber-400">⭐️</span>' : ''}
                        <span class="text-slate-400">#${ptNum}</span>
                        <span class="${pt.winnerPlayer === 'P1' ? 'text-emerald-400' : 'text-indigo-400'}">${pt.winnerPlayer === 'P1' ? config.p1Name : config.p2Name}</span>
                        <span>${this.formatOutcomeShort(pt.outcome)}</span>
                        ${pt.shotType ? `<span class="text-[10px] text-slate-400">(${pt.shotType})</span>` : ''}
                        <span class="text-[9px] px-1 py-0.2 rounded font-mono ${is2nd ? 'text-amber-400 bg-amber-950/60' : 'text-emerald-400 bg-emerald-950/60'}">${is2nd ? '2nd' : '1st'}</span>
                        ${pt.errorLocation ? `<span class="text-[9px] text-rose-300 bg-rose-950/60 px-1 rounded">${this.formatLocation(pt.errorLocation)}</span>` : ''}
                      </div>
                      ${pt.comment ? `<div class="text-[10px] text-amber-300 italic">"${pt.comment}"</div>` : ''}
                    </div>
                    <div class="text-slate-400 text-xs">✏️ Edit</div>
                  </div>
                `;
              }).join('')}
            </div>

            <div class="mt-3 pt-2 border-t border-slate-800 flex justify-end">
              <button id="btn-close-modal" class="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold">Done</button>
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeModal === 'manual_override') {
      const p1 = this.engine.config.p1Name;
      const p2 = this.engine.config.p2Name;
      const p1Child = this.engine.config.p1Child;
      const p2Child = this.engine.config.p2Child;
      const curServer = this.engine.state.currentGame.server;
      const hasNotes = Boolean(this.engine.config.notes && this.engine.config.notes.trim());

      return `
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-4 space-y-3.5 animate-slideUp max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 class="text-base font-bold text-white">⚙️ Match Settings & Controls</h3>
              <button id="btn-close-modal" class="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <!-- 1. EDIT PLAYERS -->
            <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
              <div class="font-bold text-xs text-slate-200">Edit Player Names</div>
              
              <div class="space-y-1">
                <label class="block text-[10px] text-slate-400">Player 1</label>
                <div class="flex items-center gap-2">
                  <input id="edit-player-p1-name" type="text" value="${p1}" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold">
                  <button id="btn-edit-toggle-p1-child" type="button" class="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold ${p1Child ? 'bg-sky-900/60 border-sky-400 text-sky-200' : 'bg-slate-900 border-slate-700 text-slate-400'}">
                    ${p1Child ? '⭐️ Child' : 'Child?'}
                  </button>
                </div>
              </div>

              <div class="space-y-1">
                <label class="block text-[10px] text-slate-400">Player 2</label>
                <div class="flex items-center gap-2">
                  <input id="edit-player-p2-name" type="text" value="${p2}" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold">
                  <button id="btn-edit-toggle-p2-child" type="button" class="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold ${p2Child ? 'bg-sky-900/60 border-sky-400 text-sky-200' : 'bg-slate-900 border-slate-700 text-slate-400'}">
                    ${p2Child ? '⭐️ Child' : 'Child?'}
                  </button>
                </div>
              </div>

              <button id="btn-save-player-names" class="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs active:scale-95">
                ✓ Update Player Info
              </button>
            </div>

            <!-- 2. EDIT / SWITCH SERVER -->
            <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div class="font-bold text-xs text-slate-200 flex items-center justify-between">
                <span>Who is Serving this Game?</span>
                <span class="text-[10px] text-lime-400 font-semibold">Current: ${curServer === 'P1' ? p1 : p2}</span>
              </div>
              <p class="text-[11px] text-slate-400">Kids chose to serve or served out of turn? Switch server below:</p>
              <div class="grid grid-cols-2 gap-2">
                <button id="btn-set-server-p1" type="button" class="py-2 px-3 rounded-lg border text-xs font-bold transition-all active:scale-95 ${curServer === 'P1' ? 'bg-lime-500 text-slate-950 border-lime-400 shadow-md shadow-lime-500/20' : 'bg-slate-900 text-slate-300 border-slate-700'}">
                  🎾 ${p1} Serving
                </button>
                <button id="btn-set-server-p2" type="button" class="py-2 px-3 rounded-lg border text-xs font-bold transition-all active:scale-95 ${curServer === 'P2' ? 'bg-lime-500 text-slate-950 border-lime-400 shadow-md shadow-lime-500/20' : 'bg-slate-900 text-slate-300 border-slate-700'}">
                  🎾 ${p2} Serving
                </button>
              </div>
            </div>

            <!-- 3. MATCH NOTES & QUICK ACTIONS -->
            <div class="space-y-2">
              <button id="btn-modal-open-match-notes" class="w-full py-2.5 px-3 rounded-xl bg-amber-950/50 border border-amber-700 text-left flex items-center justify-between text-xs font-bold text-amber-200 active:scale-95">
                <span>📝 Edit Overall Match Notes & Comments</span>
                <span class="text-[10px] ${hasNotes ? 'text-emerald-400' : 'text-slate-400'}">${hasNotes ? 'Has Notes ✓' : 'Add →'}</span>
              </button>

              <button id="btn-open-jump-score" class="w-full py-2.5 px-3 rounded-xl bg-indigo-950/60 border border-indigo-700 text-left flex items-center justify-between text-xs font-bold text-indigo-200 active:scale-95">
                <span>⏩ Set / Jump Exact Match Score (Mid-match Join)</span>
                <span>→</span>
              </button>

              <button id="btn-quick-add-p1" class="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left flex items-center justify-between text-xs font-semibold">
                <span>+1 Fast Point to ${p1} (Unobserved)</span>
                <span class="text-emerald-400">⚡</span>
              </button>

              <button id="btn-quick-add-p2" class="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left flex items-center justify-between text-xs font-semibold">
                <span>+1 Fast Point to ${p2} (Unobserved)</span>
                <span class="text-emerald-400">⚡</span>
              </button>

              <button id="btn-toggle-wakelock" class="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left flex items-center justify-between text-xs font-semibold">
                <span>Keep iPhone Screen Awake (Wake Lock)</span>
                <span class="${this.wakeLock ? 'text-emerald-400 font-bold' : 'text-slate-500'}">${this.wakeLock ? 'ON ✓' : 'OFF'}</span>
              </button>
            </div>

            <div class="pt-3 border-t border-slate-800 flex justify-end">
              <button id="btn-close-modal" class="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold">Done</button>
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeModal === 'jump_score') {
      const p1 = this.engine.config.p1Name;
      const p2 = this.engine.config.p2Name;
      const sets = this.engine.state.setScores;
      const curGame = this.engine.state.currentGame;

      return `
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-4 space-y-3 animate-slideUp max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 class="text-base font-bold text-white">⏩ Set Exact Match Score</h3>
              <button id="btn-close-modal" class="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>
            <p class="text-xs text-slate-400">Enter the exact score for each set and current game points.</p>

            <div class="space-y-3 text-xs">
              <!-- Set 1 Games -->
              <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <div class="font-bold text-slate-200 mb-1.5">Set 1 Score (Games)</div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[10px] text-slate-400 mb-0.5">${p1}</label>
                    <input id="score-s1-p1" type="number" min="0" max="7" value="${sets[0]?.p1Games || 0}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold text-center">
                  </div>
                  <div>
                    <label class="block text-[10px] text-slate-400 mb-0.5">${p2}</label>
                    <input id="score-s1-p2" type="number" min="0" max="7" value="${sets[0]?.p2Games || 0}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold text-center">
                  </div>
                </div>
              </div>

              ${this.engine.config.bestOf > 1 ? `
                <!-- Set 2 Games -->
                <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div class="font-bold text-slate-200 mb-1.5">Set 2 Score (Games)</div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="block text-[10px] text-slate-400 mb-0.5">${p1}</label>
                      <input id="score-s2-p1" type="number" min="0" max="7" value="${sets[1]?.p1Games || 0}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold text-center">
                    </div>
                    <div>
                      <label class="block text-[10px] text-slate-400 mb-0.5">${p2}</label>
                      <input id="score-s2-p2" type="number" min="0" max="7" value="${sets[1]?.p2Games || 0}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold text-center">
                    </div>
                  </div>
                </div>
              ` : ''}

              <!-- Current Game Point Score -->
              <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <div class="font-bold text-slate-200 mb-1.5">Current Game Points</div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[10px] text-slate-400 mb-0.5">${p1} Point</label>
                    <select id="score-game-p1" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-semibold text-center">
                      <option value="0" ${curGame.p1PointsRaw === 0 ? 'selected' : ''}>0</option>
                      <option value="1" ${curGame.p1PointsRaw === 1 ? 'selected' : ''}>15</option>
                      <option value="2" ${curGame.p1PointsRaw === 2 ? 'selected' : ''}>30</option>
                      <option value="3" ${curGame.p1PointsRaw === 3 ? 'selected' : ''}>40</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[10px] text-slate-400 mb-0.5">${p2} Point</label>
                    <select id="score-game-p2" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-semibold text-center">
                      <option value="0" ${curGame.p2PointsRaw === 0 ? 'selected' : ''}>0</option>
                      <option value="1" ${curGame.p2PointsRaw === 1 ? 'selected' : ''}>15</option>
                      <option value="2" ${curGame.p2PointsRaw === 2 ? 'selected' : ''}>30</option>
                      <option value="3" ${curGame.p2PointsRaw === 3 ? 'selected' : ''}>40</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <button id="btn-close-modal" class="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs">Cancel</button>
              <button id="btn-apply-exact-score" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs">
                ✓ Set Exact Score
              </button>
            </div>
          </div>
        </div>
      `;
    }

    return '';
  }

  canConfirm() {
    if (!this.draft.eventPlayer) return false;
    if (!this.draft.outcome) return false;
    if (this.draft.outcome === 'ace' || this.draft.outcome === 'double_fault' || this.draft.outcome === 'service_winner') {
      return true;
    }
    // For detailed points: Winner, UE, FE require shot type
    return Boolean(this.draft.shotType);
  }

  commitDraftPoint() {
    if (!this.canConfirm()) return;

    // Default rally length if not touched
    if (!this.draft.rallyLength) {
      this.draft.rallyLength = (this.draft.outcome === 'ace' || this.draft.outcome === 'double_fault' || this.draft.outcome === 'service_winner') ? '1-4' : '1-4';
    }

    // Default court position if not touched
    if (!this.draft.courtPosition) {
      this.draft.courtPosition = 'baseline';
    }

    // Assign shotType for serve outcomes
    if (this.draft.outcome === 'ace' || this.draft.outcome === 'service_winner' || this.draft.outcome === 'double_fault') {
      this.draft.shotType = 'serve';
    }

    this.engine.addPoint(this.draft);
    this.draft = this.getEmptyDraft();
    this.onStateChange();
    this.render();
  }

  attachEventListeners() {
    // 1. Navigation & Header
    const btnExit = this.container.querySelector('#btn-exit-match');
    if (btnExit) {
      btnExit.onclick = () => {
        if (confirm('Exit live tracker and return to Match Setup / History? Your match is automatically saved.')) {
          this.onNavigate('setup');
        }
      };
    }

    const btnNewMatchEnd = this.container.querySelector('#btn-new-match-end');
    if (btnNewMatchEnd) {
      btnNewMatchEnd.onclick = () => this.onNavigate('setup');
    }

    const btnStats = this.container.querySelector('#btn-to-stats');
    if (btnStats) btnStats.onclick = () => this.onNavigate('analytics');

    const btnFinalStats = this.container.querySelector('#btn-view-final-stats');
    if (btnFinalStats) btnFinalStats.onclick = () => this.onNavigate('analytics');

    const btnOpenNotes = this.container.querySelector('#btn-open-match-notes');
    if (btnOpenNotes) {
      btnOpenNotes.onclick = () => {
        this.activeModal = 'match_notes';
        this.render();
      };
    }

    const btnModalOpenNotes = this.container.querySelector('#btn-modal-open-match-notes');
    if (btnModalOpenNotes) {
      btnModalOpenNotes.onclick = () => {
        this.activeModal = 'match_notes';
        this.render();
      };
    }

    const btnSaveMatchNotes = this.container.querySelector('#btn-save-match-notes');
    if (btnSaveMatchNotes) {
      btnSaveMatchNotes.onclick = () => {
        const txt = this.container.querySelector('#input-match-notes-text')?.value || '';
        this.engine.updateMatchNotes(txt);
        this.activeModal = null;
        this.onStateChange();
        this.render();
      };
    }

    const btnViewAll = this.container.querySelector('#btn-view-all-points');
    if (btnViewAll) {
      btnViewAll.onclick = () => {
        this.activeModal = 'all_points';
        this.render();
      };
    }

    const btnUndo = this.container.querySelector('#btn-undo');
    if (btnUndo) {
      btnUndo.onclick = () => {
        this.engine.undoLastPoint();
        this.onStateChange();
        this.render();
      };
    }

    const btnUndoEnd = this.container.querySelector('#btn-undo-match-end');
    if (btnUndoEnd) {
      btnUndoEnd.onclick = () => {
        this.engine.undoLastPoint();
        this.onStateChange();
        this.render();
      };
    }

    const btnOverride = this.container.querySelector('#btn-score-override');
    if (btnOverride) {
      btnOverride.onclick = () => {
        this.activeModal = 'manual_override';
        this.render();
      };
    }

    // Serve Selector (1st Serve In vs 2nd Serve)
    this.container.querySelectorAll('.btn-select-serve').forEach(btn => {
      btn.onclick = () => {
        const s = btn.getAttribute('data-serve');
        this.draft.serve = s;
        this.render();
      };
    });

    // 2. Step 1: Event Player
    this.container.querySelectorAll('.btn-select-player').forEach(btn => {
      btn.onclick = () => {
        const p = btn.getAttribute('data-event-player');
        this.draft.eventPlayer = p;
        // reset outcome when event player switches
        this.draft.outcome = null;
        this.draft.winnerPlayer = null;
        this.render();
      };
    });

    // 3. Step 2: Outcome & Point Winner Assignment
    this.container.querySelectorAll('.btn-select-outcome').forEach(btn => {
      btn.onclick = () => {
        const out = btn.getAttribute('data-outcome');
        this.draft.outcome = out;
        const evP = this.draft.eventPlayer;
        const oppP = evP === 'P1' ? 'P2' : 'P1';

        // Auto set 2nd serve on double fault
        if (out === 'double_fault') {
          this.draft.serve = '2nd';
        }

        // Deterministic winner mapping:
        // - Winner, Ace, Service Winner -> eventPlayer wins point
        // - Unforced Error, Double Fault, Forced Error -> opponent wins point
        if (out === 'winner' || out === 'ace' || out === 'service_winner') {
          this.draft.winnerPlayer = evP;
        } else {
          this.draft.winnerPlayer = oppP;
        }

        this.render();
      };
    });

    // 4. Step 3: Shot Type
    this.container.querySelectorAll('.btn-select-shot').forEach(btn => {
      btn.onclick = () => {
        this.draft.shotType = btn.getAttribute('data-shot');
        this.render();
      };
    });

    // 5. Step 4: Court Position
    this.container.querySelectorAll('.btn-select-position').forEach(btn => {
      btn.onclick = () => {
        this.draft.courtPosition = btn.getAttribute('data-position');
        this.render();
      };
    });

    // 6. Step 5: Rally Length
    this.container.querySelectorAll('.btn-select-rally').forEach(btn => {
      btn.onclick = () => {
        this.draft.rallyLength = btn.getAttribute('data-rally');
        this.render();
      };
    });

    // Unforced Error Miss Location
    this.container.querySelectorAll('.btn-select-location').forEach(btn => {
      btn.onclick = () => {
        this.draft.errorLocation = btn.getAttribute('data-location');
        this.render();
      };
    });

    // 7. Error Cause
    this.container.querySelectorAll('.btn-select-cause').forEach(btn => {
      btn.onclick = () => {
        this.draft.errorCause = btn.getAttribute('data-cause');
        this.render();
      };
    });

    // 8. Net Approach Cycle
    const btnNet = this.container.querySelector('#btn-toggle-net');
    if (btnNet) {
      btnNet.onclick = () => {
        const cycle = ['none', 'P1', 'P2', 'both'];
        const nextIdx = (cycle.indexOf(this.draft.netApproach) + 1) % cycle.length;
        this.draft.netApproach = cycle[nextIdx];
        this.render();
      };
    }

    // 9. Comments Modal Trigger
    const btnComment = this.container.querySelector('#btn-open-comment');
    if (btnComment) {
      btnComment.onclick = () => {
        this.activeModal = 'comment';
        this.render();
      };
    }

    // 10. Confirm & Cancel Draft
    const btnConfirm = this.container.querySelector('#btn-confirm-point');
    if (btnConfirm) btnConfirm.onclick = () => this.commitDraftPoint();

    const btnCancel = this.container.querySelector('#btn-cancel-draft');
    if (btnCancel) {
      btnCancel.onclick = () => {
        this.draft = this.getEmptyDraft();
        this.render();
      };
    }

    // 11. Modal Handlers
    const closeBtns = this.container.querySelectorAll('#btn-close-modal, #btn-modal-comment-cancel');
    closeBtns.forEach(btn => {
      btn.onclick = () => {
        this.activeModal = null;
        this.editingPointIndex = null;
        this.render();
      };
    });

    const btnSaveComment = this.container.querySelector('#btn-modal-comment-save');
    if (btnSaveComment) {
      btnSaveComment.onclick = () => {
        const txt = this.container.querySelector('#modal-comment-input').value.trim();
        this.draft.comment = txt;
        this.activeModal = null;
        this.render();
      };
    }

    // Recent points click to edit
    this.container.querySelectorAll('.btn-edit-recent').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-edit-point-id');
        const idx = this.engine.points.findIndex(p => p.id === id);
        if (idx !== -1) {
          const pt = this.engine.points[idx];
          const calculatedEventPlayer = pt.eventPlayer || (pt.outcome === 'unforced_error' || pt.outcome === 'forced_error' || pt.outcome === 'double_fault' ? (pt.winnerPlayer === 'P1' ? 'P2' : 'P1') : pt.winnerPlayer);
          this.editingDraft = {
            eventPlayer: calculatedEventPlayer,
            outcome: pt.outcome || 'winner',
          };
          this.editingPointIndex = idx;
          this.activeModal = 'edit_point';
          this.render();
        }
      };
    });

    // Jump pills click in recent ticker
    this.container.querySelectorAll('.btn-jump-pill').forEach(btn => {
      btn.onclick = () => {
        this.activeModal = 'all_points';
        this.render();
      };
    });

    // Delete Jump Score
    this.container.querySelectorAll('.btn-delete-jump').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const jumpId = btn.getAttribute('data-delete-jump-id');
        if (confirm('Remove this score jump? The match score will recalculate from the remaining logged points.')) {
          const idx = this.engine.points.findIndex(p => p.id === jumpId);
          if (idx !== -1) {
            this.engine.points.splice(idx, 1);
            this.engine.recalculateStateFromPoints();
            this.onStateChange();
            this.render();
          }
        }
      };
    });

    // Edit point event player buttons
    this.container.querySelectorAll('.btn-edit-event-player-choice').forEach(btn => {
      btn.onclick = () => {
        const p = btn.getAttribute('data-edit-event-player');
        if (!this.editingDraft) this.editingDraft = {};
        this.editingDraft.eventPlayer = p;
        this.render();
      };
    });

    // Edit outcome select change
    const editOutcomeSel = this.container.querySelector('#edit-outcome-select');
    if (editOutcomeSel) {
      editOutcomeSel.onchange = (e) => {
        if (!this.editingDraft) this.editingDraft = {};
        this.editingDraft.outcome = e.target.value;
        this.render();
      };
    }

    // Edit point save
    const btnSaveEdit = this.container.querySelector('#btn-save-edited-point');
    if (btnSaveEdit && this.editingPointIndex !== null) {
      btnSaveEdit.onclick = () => {
        const pt = this.engine.points[this.editingPointIndex];
        const eventPlayer = this.editingDraft?.eventPlayer || pt.eventPlayer || 'P1';
        const outcome = this.container.querySelector('#edit-outcome-select').value;
        const calculatedWinner = (outcome === 'winner' || outcome === 'ace' || outcome === 'service_winner') ? eventPlayer : (eventPlayer === 'P1' ? 'P2' : 'P1');
        const isStarred = this.editingDraft?.isStarred !== undefined ? this.editingDraft.isStarred : Boolean(pt.isStarred);
        const serve = this.container.querySelector('#edit-serve-select')?.value || '1st';
        const shotType = this.container.querySelector('#edit-shot-select').value;
        const courtPosition = this.container.querySelector('#edit-pos-select').value;
        const rallyLength = this.container.querySelector('#edit-rally-select').value;
        const errorLocation = this.container.querySelector('#edit-error-location-select')?.value || undefined;
        const errorCause = this.container.querySelector('#edit-cause-select').value || undefined;
        const comment = this.container.querySelector('#edit-comment-input').value.trim();

        this.engine.editPoint(this.editingPointIndex, {
          eventPlayer,
          winnerPlayer: calculatedWinner,
          outcome,
          serve,
          isStarred,
          shotType,
          courtPosition,
          rallyLength,
          errorLocation,
          errorCause,
          comment,
        });

        this.activeModal = null;
        this.editingPointIndex = null;
        this.editingDraft = null;
        this.onStateChange();
        this.render();
      };
    }

    // Edit point delete
    const btnDeletePt = this.container.querySelector('#btn-delete-point');
    if (btnDeletePt && this.editingPointIndex !== null) {
      btnDeletePt.onclick = () => {
        if (confirm('Delete this point? The match score will recalculate automatically.')) {
          this.engine.points.splice(this.editingPointIndex, 1);
          this.engine.recalculateStateFromPoints();
          this.activeModal = null;
          this.editingPointIndex = null;
          this.editingDraft = null;
          this.onStateChange();
          this.render();
        }
      };
    }

    // Star / Favorite Toggle in Entry Flow
    const btnToggleStar = this.container.querySelector('#btn-toggle-star');
    if (btnToggleStar) {
      btnToggleStar.onclick = () => {
        this.draft.isStarred = !this.draft.isStarred;
        this.render();
      };
    }

    // Star Toggle in Edit Point Modal
    const btnEditToggleStar = this.container.querySelector('#btn-edit-toggle-star');
    if (btnEditToggleStar) {
      btnEditToggleStar.onclick = () => {
        if (!this.editingDraft) this.editingDraft = {};
        const cur = this.editingDraft.isStarred !== undefined ? this.editingDraft.isStarred : Boolean(this.engine.points[this.editingPointIndex]?.isStarred);
        this.editingDraft.isStarred = !cur;
        this.render();
      };
    }

    // Quick Swap Server from Scoreboard
    const btnQuickSwapServer = this.container.querySelector('#btn-quick-swap-server');
    if (btnQuickSwapServer) {
      btnQuickSwapServer.onclick = () => {
        this.engine.switchServer();
        this.onStateChange();
        this.render();
      };
    }

    // Modal Set Server P1 / P2
    const btnSetSrvP1 = this.container.querySelector('#btn-set-server-p1');
    if (btnSetSrvP1) {
      btnSetSrvP1.onclick = () => {
        this.engine.switchServer('P1');
        this.onStateChange();
        this.render();
      };
    }

    const btnSetSrvP2 = this.container.querySelector('#btn-set-server-p2');
    if (btnSetSrvP2) {
      btnSetSrvP2.onclick = () => {
        this.engine.switchServer('P2');
        this.onStateChange();
        this.render();
      };
    }

    // Modal Player Child Toggles
    const btnEditChild1 = this.container.querySelector('#btn-edit-toggle-p1-child');
    if (btnEditChild1) {
      btnEditChild1.onclick = () => {
        this.engine.config.p1Child = !this.engine.config.p1Child;
        this.render();
      };
    }

    const btnEditChild2 = this.container.querySelector('#btn-edit-toggle-p2-child');
    if (btnEditChild2) {
      btnEditChild2.onclick = () => {
        this.engine.config.p2Child = !this.engine.config.p2Child;
        this.render();
      };
    }

    // Modal Save Player Names
    const btnSavePlayers = this.container.querySelector('#btn-save-player-names');
    if (btnSavePlayers) {
      btnSavePlayers.onclick = () => {
        const p1Val = this.container.querySelector('#edit-player-p1-name')?.value;
        const p2Val = this.container.querySelector('#edit-player-p2-name')?.value;
        this.engine.updatePlayers({
          p1Name: p1Val,
          p2Name: p2Val,
          p1Child: this.engine.config.p1Child,
          p2Child: this.engine.config.p2Child,
        });
        this.activeModal = null;
        this.onStateChange();
        this.render();
      };
    }

    // Jump Score trigger
    const btnOpenJump = this.container.querySelector('#btn-open-jump-score');
    if (btnOpenJump) {
      btnOpenJump.onclick = () => {
        this.activeModal = 'jump_score';
        this.render();
      };
    }

    // Apply Exact Score
    const btnApplyExact = this.container.querySelector('#btn-apply-exact-score');
    if (btnApplyExact) {
      btnApplyExact.onclick = () => {
        const s1p1 = parseInt(this.container.querySelector('#score-s1-p1')?.value || '0', 10);
        const s1p2 = parseInt(this.container.querySelector('#score-s1-p2')?.value || '0', 10);
        const s2p1 = parseInt(this.container.querySelector('#score-s2-p1')?.value || '0', 10);
        const s2p2 = parseInt(this.container.querySelector('#score-s2-p2')?.value || '0', 10);
        const gameP1Pts = parseInt(this.container.querySelector('#score-game-p1')?.value || '0', 10);
        const gameP2Pts = parseInt(this.container.querySelector('#score-game-p2')?.value || '0', 10);

        const setsData = [{ p1: s1p1, p2: s1p2 }];
        if (this.engine.config.bestOf > 1 && (s2p1 > 0 || s2p2 > 0)) {
          setsData.push({ p1: s2p1, p2: s2p2 });
        }

        this.engine.setExactScore({
          sets: setsData,
          p1GamePoints: gameP1Pts,
          p2GamePoints: gameP2Pts,
        });

        this.activeModal = null;
        this.onStateChange();
        this.render();
      };
    }

    // Quick add unobserved points
    const btnQ1 = this.container.querySelector('#btn-quick-add-p1');
    if (btnQ1) {
      btnQ1.onclick = () => {
        this.engine.addPoint({
          winnerPlayer: 'P1',
          outcome: 'winner',
          shotType: 'forehand',
          rallyLength: '1-4',
          comment: 'Quick unobserved point',
        });
        this.activeModal = null;
        this.onStateChange();
        this.render();
      };
    }

    const btnQ2 = this.container.querySelector('#btn-quick-add-p2');
    if (btnQ2) {
      btnQ2.onclick = () => {
        this.engine.addPoint({
          winnerPlayer: 'P2',
          outcome: 'winner',
          shotType: 'forehand',
          rallyLength: '1-4',
          comment: 'Quick unobserved point',
        });
        this.activeModal = null;
        this.onStateChange();
        this.render();
      };
    }

    // Wake lock
    const btnWake = this.container.querySelector('#btn-toggle-wakelock');
    if (btnWake) {
      btnWake.onclick = async () => {
        if (this.wakeLock) {
          this.releaseWakeLock();
        } else {
          await this.requestWakeLock();
        }
        this.render();
      };
    }
  }

  formatShotName(shot) {
    const map = {
      'forehand': 'Forehand',
      'backhand': 'Backhand',
      'volley': 'Volley',
      'overhead': 'Overhead',
      'drop_shot': 'Drop Shot',
      'return': 'Return',
      'serve': 'Serve',
    };
    return map[shot] || shot;
  }

  formatPosition(pos) {
    const map = {
      'baseline': 'Baseline',
      'deep_baseline': 'Deep Baseline',
      'mid_court': 'Mid-Court',
      'net': 'At Net',
    };
    return map[pos] || pos || 'Baseline';
  }

  formatCause(cause) {
    const map = {
      'spacing': 'Spacing',
      'let_ball': 'Let ball',
      'above_shoulder': 'Above Shoulder',
      'above_sholder': 'Above Shoulder',
      'mindset': 'Mindset',
      // Backward compatibility for existing match logs
      'normal_execution': 'Execution / Timing',
      'depth': 'Opponent Deep Ball',
      'pace_rushed': 'Heavy Pace / Rushed',
      'high_heavy': 'High / Heavy Topspin',
      'low_slice': 'Low Ball / Slice',
      'wide': 'Wide / Stretched',
      'poor_footwork': 'Footwork / Balance',
      'short_angle': 'Short Angle Pull',
    };
    return map[cause] || cause;
  }

  formatLocation(loc) {
    const map = {
      'net': 'Net',
      'wide_left': 'Wide Left',
      'wide_right': 'Wide Right',
      'long': 'Long Out',
    };
    return map[loc] || loc || '';
  }

  formatNetApproach(approach) {
    if (approach === 'P1') return this.engine.config.p1Name;
    if (approach === 'P2') return this.engine.config.p2Name;
    if (approach === 'both') return 'Both Players';
    return 'None';
  }
}

