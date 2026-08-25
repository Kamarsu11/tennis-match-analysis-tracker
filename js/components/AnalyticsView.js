/**
 * Match / Set / Game / Tie-break Analytics Dashboard Component
 * Senior Tennis Performance Analyst Level Visualizations
 */

import { TennisStats } from '../engine/TennisStats.js';
import { TennisStorage } from '../db/storage.js';

export class AnalyticsViewComponent {
  constructor(container, engine, onNavigate) {
    this.container = container;
    this.engine = engine;
    this.onNavigate = onNavigate;

    // Filter state
    this.activeFilter = {
      level: 'match', // 'match' | 'set' | 'game' | 'tiebreak'
      setIndex: 0,
      gameIndex: 0,
      searchComment: '',
      player: 'all',
      outcome: 'all',
      shotType: 'all',
      courtPosition: 'all',
      rallyLength: 'all',
      errorCause: 'all',
    };
  }

  render() {
    const config = this.engine.config;
    const allPoints = this.engine.points;
    const sb = this.engine.getScoreboard();

    // Prepare filter params
    let filterParams = {};
    if (this.activeFilter.level === 'set') {
      filterParams.setIndex = this.activeFilter.setIndex;
    } else if (this.activeFilter.level === 'game') {
      filterParams.setIndex = this.activeFilter.setIndex;
      filterParams.gameIndex = this.activeFilter.gameIndex;
    } else if (this.activeFilter.level === 'tiebreak') {
      filterParams.isTiebreak = true;
    }

    const stats = TennisStats.calculate(allPoints, config, filterParams);
    const p1 = stats.P1;
    const p2 = stats.P2;

    this.container.innerHTML = `
      <div class="analytics-root flex flex-col h-full bg-slate-950 text-slate-100 select-none">
        
        <!-- HEADER -->
        <header class="bg-slate-900 border-b border-slate-800 px-3 py-2.5 shrink-0 flex items-center justify-between">
          <button id="btn-back-to-tracker" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1 active:scale-95">
            🎾 Live Tracker
          </button>
          <div class="text-xs font-bold text-slate-200">
            Performance Analytics
          </div>
          <div class="flex items-center gap-1.5">
            <button id="btn-export-match-csv" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1 active:scale-95" title="Export Match CSV">
              📥 Match CSV
            </button>
          </div>
        </header>

        <!-- LEVEL FILTER TABS (Match / Set / Game / Tie-break) -->
        <nav class="bg-slate-900/90 border-b border-slate-800 px-2 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 text-xs">
          <button data-level="match" class="btn-filter-level px-3 py-1 rounded-lg font-bold transition-all ${this.activeFilter.level === 'match' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}">
            Match Overall
          </button>

          ${this.engine.state.setScores.map((s, idx) => `
            <button data-level="set" data-set-idx="${idx}" class="btn-filter-level px-3 py-1 rounded-lg font-bold transition-all ${this.activeFilter.level === 'set' && this.activeFilter.setIndex === idx ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}">
              Set ${idx + 1}
            </button>
          `).join('')}

          ${this.engine.points.some(p => p.isTiebreak) ? `
            <button data-level="tiebreak" class="btn-filter-level px-3 py-1 rounded-lg font-bold transition-all ${this.activeFilter.level === 'tiebreak' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'}">
              Tie-Breaks
            </button>
          ` : ''}
        </nav>

        <!-- MAIN SCROLLABLE DASHBOARD -->
        <main class="flex-1 overflow-y-auto p-3 space-y-4 pb-20">
          
          <!-- MATCH SCORE CARD -->
          <div class="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 shadow-lg">
            <div class="grid grid-cols-2 gap-3 text-center">
              <div>
                <div class="text-xs text-slate-400 font-semibold mb-0.5">${config.p1Name} ${config.p1Child ? '⭐️' : ''}</div>
                <div class="text-2xl font-black text-white">${p1.totalPointsWon} <span class="text-xs font-normal text-slate-400">pts</span></div>
              </div>
              <div>
                <div class="text-xs text-slate-400 font-semibold mb-0.5">${config.p2Name} ${config.p2Child ? '⭐️' : ''}</div>
                <div class="text-2xl font-black text-white">${p2.totalPointsWon} <span class="text-xs font-normal text-slate-400">pts</span></div>
              </div>
            </div>

            <!-- Total Points Progress Bar -->
            <div class="mt-2.5">
              <div class="h-2 rounded-full bg-slate-800 overflow-hidden flex">
                <div class="bg-emerald-500 transition-all duration-500" style="width: ${stats.totalPoints > 0 ? (p1.totalPointsWon / stats.totalPoints) * 100 : 50}%"></div>
                <div class="bg-indigo-500 transition-all duration-500" style="width: ${stats.totalPoints > 0 ? (p2.totalPointsWon / stats.totalPoints) * 100 : 50}%"></div>
              </div>
            </div>
          </div>

          <!-- KEY PERFORMANCE INDICATORS (Junior Development Focused) -->
          <section class="space-y-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Key Performance Indicators</h3>
            
            <div class="grid grid-cols-2 gap-2">
              <!-- Aggressive Margin -->
              <div class="bg-slate-900 rounded-xl p-3 border border-slate-800">
                <div class="text-[11px] text-slate-400 font-medium">Aggressive Margin</div>
                <div class="flex items-baseline justify-between mt-1">
                  <span class="text-base font-extrabold ${p1.aggressiveMarginPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${p1.aggressiveMarginPct}%</span>
                  <span class="text-base font-extrabold ${p2.aggressiveMarginPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${p2.aggressiveMarginPct}%</span>
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5">(Winners + Opp FE - UE)</div>
              </div>

              <!-- Dominance Ratio -->
              <div class="bg-slate-900 rounded-xl p-3 border border-slate-800">
                <div class="text-[11px] text-slate-400 font-medium">Dominance Ratio</div>
                <div class="flex items-baseline justify-between mt-1">
                  <span class="text-base font-extrabold ${p1.dominanceRatio >= 1 ? 'text-emerald-400' : 'text-amber-400'}">${p1.dominanceRatio}</span>
                  <span class="text-base font-extrabold ${p2.dominanceRatio >= 1 ? 'text-emerald-400' : 'text-amber-400'}">${p2.dominanceRatio}</span>
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5">Return Win % Ratio</div>
              </div>
            </div>
          </section>

          <!-- HEAD-TO-HEAD STATS COMPARISON TABLE -->
          <section class="bg-slate-900 rounded-2xl p-3 border border-slate-800 space-y-2.5">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800">
              Match Metrics Comparison
            </h3>

            ${this.renderStatRow('Serve Points Won %', `${p1.servePointsWonPct}% (${p1.servePointsWon}/${p1.servePointsTotal})`, `${p2.servePointsWonPct}% (${p2.servePointsWon}/${p2.servePointsTotal})`, p1.servePointsWonPct > p2.servePointsWonPct)}
            ${this.renderStatRow('Aces / Service Winners', `${p1.aces} / ${p1.serviceWinners}`, `${p2.aces} / ${p2.serviceWinners}`, p1.aces + p1.serviceWinners > p2.aces + p2.serviceWinners)}
            ${this.renderStatRow('Double Faults', p1.doubleFaults, p2.doubleFaults, p1.doubleFaults < p2.doubleFaults)}
            ${this.renderStatRow('Break Points Saved', `${p1.breakPointsSaved}/${p1.breakPointsFaced} (${p1.breakPointsSavedPct}%)`, `${p2.breakPointsSaved}/${p2.breakPointsFaced} (${p2.breakPointsSavedPct}%)`)}
            ${this.renderStatRow('Return Points Won %', `${p1.returnPointsWonPct}% (${p1.returnPointsWon}/${p1.returnPointsTotal})`, `${p2.returnPointsWonPct}% (${p2.returnPointsWon}/${p2.returnPointsTotal})`, p1.returnPointsWonPct > p2.returnPointsWonPct)}
            ${this.renderStatRow('Break Points Converted', `${p1.breakPointsConverted}/${p1.breakPointsOpportunities} (${p1.breakPointsConvertedPct}%)`, `${p2.breakPointsConverted}/${p2.breakPointsOpportunities} (${p2.breakPointsConvertedPct}%)`)}
            ${this.renderStatRow('Winners (Total)', p1.winnersTotal, p2.winnersTotal, p1.winnersTotal > p2.winnersTotal)}
            ${this.renderStatRow('Unforced Errors', p1.unforcedErrorsTotal, p2.unforcedErrorsTotal, p1.unforcedErrorsTotal < p2.unforcedErrorsTotal)}
            ${this.renderStatRow('Forced Errors Induced', p1.forcedErrorsInduced, p2.forcedErrorsInduced, p1.forcedErrorsInduced > p2.forcedErrorsInduced)}
            ${this.renderStatRow('Winner / UE Ratio', p1.winnerToUERatio, p2.winnerToUERatio, p1.winnerToUERatio > p2.winnerToUERatio)}
            ${this.renderStatRow('Net Points Won', `${p1.netPointsWon}/${p1.netApproaches} (${p1.netEfficiencyPct}%)`, `${p2.netPointsWon}/${p2.netApproaches} (${p2.netEfficiencyPct}%)`, p1.netEfficiencyPct > p2.netEfficiencyPct)}
          </section>

          <!-- RALLY LENGTH ANALYSIS (1-4, 5-8, 9+) -->
          <section class="bg-slate-900 rounded-2xl p-3 border border-slate-800 space-y-2.5">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800 flex justify-between items-center">
              <span>Rally Length Distribution & Win %</span>
              <span class="text-[10px] text-emerald-400 font-semibold">First-Strike vs Tolerance</span>
            </h3>

            ${['1-4', '5-8', '9+'].map(bracket => {
              const r = stats.rallyDistribution[bracket];
              const p1Pct = r.total > 0 ? Math.round((r.p1Won / r.total) * 100) : 0;
              const p2Pct = r.total > 0 ? Math.round((r.p2Won / r.total) * 100) : 0;
              const label = bracket === '1-4' ? '1–4 Shots (First Strike)' : (bracket === '5-8' ? '5–8 Shots (Rally Tolerance)' : '9+ Shots (Extended Grinding)');

              return `
                <div class="p-2 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1.5">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-slate-200">${label}</span>
                    <span class="text-slate-400">${r.total} points (${stats.totalPoints > 0 ? Math.round((r.total / stats.totalPoints) * 100) : 0}%)</span>
                  </div>

                  <div class="flex items-center justify-between text-[11px] font-mono">
                    <span class="text-emerald-400 font-bold">${config.p1Name}: ${r.p1Won} (${p1Pct}%)</span>
                    <span class="text-indigo-400 font-bold">${config.p2Name}: ${r.p2Won} (${p2Pct}%)</span>
                  </div>

                  <div class="h-2 rounded-full bg-slate-800 overflow-hidden flex">
                    <div class="bg-emerald-500" style="width: ${p1Pct}%"></div>
                    <div class="bg-indigo-500" style="width: ${p2Pct}%"></div>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                    <div>W: ${r.p1Winners} | UE: ${r.p1UEs} | FE: ${r.p1FEs}</div>
                    <div class="text-right">W: ${r.p2Winners} | UE: ${r.p2UEs} | FE: ${r.p2FEs}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </section>

          <!-- SHOT BREAKDOWN GRID (FH vs BH vs Net vs Serve) -->
          <section class="bg-slate-900 rounded-2xl p-3 border border-slate-800 space-y-2.5">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800">
              Shot Breakdown (Winners / UEs)
            </h3>

            <div class="grid grid-cols-2 gap-2">
              <!-- Player 1 Shots -->
              <div class="p-2 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                <div class="font-bold text-emerald-400 mb-1 truncate">${config.p1Name}</div>
                <div class="flex justify-between"><span>Forehand:</span> <strong class="text-slate-200">${p1.winnersByShot.forehand} W / ${p1.unforcedErrorsByShot.forehand} UE</strong></div>
                <div class="flex justify-between"><span>Backhand:</span> <strong class="text-slate-200">${p1.winnersByShot.backhand} W / ${p1.unforcedErrorsByShot.backhand} UE</strong></div>
                <div class="flex justify-between"><span>Volley/OH:</span> <strong class="text-slate-200">${p1.winnersByShot.volley + p1.winnersByShot.overhead} W / ${p1.unforcedErrorsByShot.volley + p1.unforcedErrorsByShot.overhead} UE</strong></div>
                <div class="flex justify-between"><span>Return:</span> <strong class="text-slate-200">${p1.winnersByShot.return} W / ${p1.unforcedErrorsByShot.return} UE</strong></div>
              </div>

              <!-- Player 2 Shots -->
              <div class="p-2 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                <div class="font-bold text-indigo-400 mb-1 truncate">${config.p2Name}</div>
                <div class="flex justify-between"><span>Forehand:</span> <strong class="text-slate-200">${p2.winnersByShot.forehand} W / ${p2.unforcedErrorsByShot.forehand} UE</strong></div>
                <div class="flex justify-between"><span>Backhand:</span> <strong class="text-slate-200">${p2.winnersByShot.backhand} W / ${p2.unforcedErrorsByShot.backhand} UE</strong></div>
                <div class="flex justify-between"><span>Volley/OH:</span> <strong class="text-slate-200">${p2.winnersByShot.volley + p2.winnersByShot.overhead} W / ${p2.unforcedErrorsByShot.volley + p2.unforcedErrorsByShot.overhead} UE</strong></div>
                <div class="flex justify-between"><span>Return:</span> <strong class="text-slate-200">${p2.winnersByShot.return} W / ${p2.unforcedErrorsByShot.return} UE</strong></div>
              </div>
            </div>
          </section>

          <!-- CHRONOLOGICAL POINT LOG WITH MULTI-CRITERIA AND-FILTERING -->
          <section class="bg-slate-900 rounded-2xl p-3 border border-slate-800 space-y-3">
            <div class="flex items-center justify-between pb-1 border-b border-slate-800">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">📊 Filterable Points Log & Patterns</h3>
              <span id="log-match-counter" class="text-[10px] text-emerald-400 font-mono font-bold"></span>
            </div>

            <!-- MULTI-CRITERIA AND FILTERS -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <!-- Event Player Filter (Who hit the shot / made error) -->
              <div>
                <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Event Player (Hitter/Error)</label>
                <select id="filter-player" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] text-white">
                  <option value="all">All Event Players</option>
                  <option value="P1" ${this.activeFilter.player === 'P1' ? 'selected' : ''}>${config.p1Name}</option>
                  <option value="P2" ${this.activeFilter.player === 'P2' ? 'selected' : ''}>${config.p2Name}</option>
                </select>
              </div>

              <!-- Outcome Filter -->
              <div>
                <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Outcome</label>
                <select id="filter-outcome" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] text-white">
                  <option value="all">All Outcomes</option>
                  <option value="winner" ${this.activeFilter.outcome === 'winner' ? 'selected' : ''}>🎯 Winners</option>
                  <option value="unforced_error" ${this.activeFilter.outcome === 'unforced_error' ? 'selected' : ''}>⚠️ Unforced Errors</option>
                  <option value="forced_error" ${this.activeFilter.outcome === 'forced_error' ? 'selected' : ''}>🛡️ Forced Errors</option>
                  <option value="ace" ${this.activeFilter.outcome === 'ace' ? 'selected' : ''}>⚡ Aces</option>
                  <option value="double_fault" ${this.activeFilter.outcome === 'double_fault' ? 'selected' : ''}>🚫 Double Faults</option>
                  <option value="service_winner" ${this.activeFilter.outcome === 'service_winner' ? 'selected' : ''}>🎾 Service Winners</option>
                </select>
              </div>

              <!-- Shot Type Filter -->
              <div>
                <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Shot Type</label>
                <select id="filter-shot" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] text-white">
                  <option value="all">All Shots</option>
                  <option value="forehand" ${this.activeFilter.shotType === 'forehand' ? 'selected' : ''}>Forehand</option>
                  <option value="backhand" ${this.activeFilter.shotType === 'backhand' ? 'selected' : ''}>Backhand</option>
                  <option value="volley" ${this.activeFilter.shotType === 'volley' ? 'selected' : ''}>Volley</option>
                  <option value="overhead" ${this.activeFilter.shotType === 'overhead' ? 'selected' : ''}>Overhead</option>
                  <option value="drop_shot" ${this.activeFilter.shotType === 'drop_shot' ? 'selected' : ''}>Drop Shot</option>
                  <option value="return" ${this.activeFilter.shotType === 'return' ? 'selected' : ''}>Return</option>
                  <option value="serve" ${this.activeFilter.shotType === 'serve' ? 'selected' : ''}>Serve</option>
                </select>
              </div>

              <!-- Court Position Filter -->
              <div>
                <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Court Position</label>
                <select id="filter-pos" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] text-white">
                  <option value="all">All Positions</option>
                  <option value="baseline" ${this.activeFilter.courtPosition === 'baseline' ? 'selected' : ''}>Baseline</option>
                  <option value="deep_baseline" ${this.activeFilter.courtPosition === 'deep_baseline' ? 'selected' : ''}>Deep Baseline</option>
                  <option value="mid_court" ${this.activeFilter.courtPosition === 'mid_court' ? 'selected' : ''}>Mid-Court</option>
                  <option value="net" ${this.activeFilter.courtPosition === 'net' ? 'selected' : ''}>At Net</option>
                </select>
              </div>

              <!-- Rally Length Filter -->
              <div>
                <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Rally Length</label>
                <select id="filter-rally" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] text-white">
                  <option value="all">All Rallies</option>
                  <option value="1-4" ${this.activeFilter.rallyLength === '1-4' ? 'selected' : ''}>1–4 (Short)</option>
                  <option value="5-8" ${this.activeFilter.rallyLength === '5-8' ? 'selected' : ''}>5–8 (Medium)</option>
                  <option value="9+" ${this.activeFilter.rallyLength === '9+' ? 'selected' : ''}>9+ (Long)</option>
                </select>
              </div>

              <!-- Cause / Diagnostic Filter -->
              <div>
                <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Cause / Error Reason</label>
                <select id="filter-cause" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] text-white">
                  <option value="all">All Causes</option>
                  <option value="normal_execution" ${this.activeFilter.errorCause === 'normal_execution' ? 'selected' : ''}>Execution / Timing</option>
                  <option value="depth" ${this.activeFilter.errorCause === 'depth' ? 'selected' : ''}>Deep Ball</option>
                  <option value="pace_rushed" ${this.activeFilter.errorCause === 'pace_rushed' ? 'selected' : ''}>Heavy Pace / Rushed</option>
                  <option value="high_heavy" ${this.activeFilter.errorCause === 'high_heavy' ? 'selected' : ''}>High Topspin</option>
                  <option value="low_slice" ${this.activeFilter.errorCause === 'low_slice' ? 'selected' : ''}>Low / Slice</option>
                  <option value="wide" ${this.activeFilter.errorCause === 'wide' ? 'selected' : ''}>Wide / Stretched</option>
                  <option value="poor_footwork" ${this.activeFilter.errorCause === 'poor_footwork' ? 'selected' : ''}>Footwork / Balance</option>
                  <option value="short_angle" ${this.activeFilter.errorCause === 'short_angle' ? 'selected' : ''}>Short Angle</option>
                </select>
              </div>
            </div>

            <!-- Comment Free-Text Search + Reset button -->
            <div class="flex items-center gap-2">
              <input id="input-search-comments" type="text" placeholder="🔍 Search notes or keywords in combination..." value="${this.activeFilter.searchComment}" class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500">
              <button id="btn-reset-filters" class="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold shrink-0">
                Reset
              </button>
            </div>

            <div id="filtered-points-container" class="space-y-1.5 max-h-80 overflow-y-auto">
              ${this.renderPointLogHtml(allPoints, config)}
            </div>
          </section>

        </main>
      </div>
    `;

    this.attachEventListeners();
    this.updateLogCounter();
  }

  renderStatRow(label, val1, val2, p1Better = null) {
    return `
      <div class="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0">
        <span class="font-mono font-bold ${p1Better === true ? 'text-emerald-400' : 'text-slate-300'}">${val1}</span>
        <span class="text-slate-400 font-medium text-[11px] text-center px-1">${label}</span>
        <span class="font-mono font-bold ${p1Better === false ? 'text-indigo-400' : 'text-slate-300'}">${val2}</span>
      </div>
    `;
  }

  getFilteredPoints(points) {
    const f = this.activeFilter;
    const filterText = (f.searchComment || '').toLowerCase().trim();

    return points.filter(pt => {
      // 1. Level Filter (Set / Game / TB)
      if (f.level === 'set' && pt.setIndex !== f.setIndex) return false;
      if (f.level === 'game' && (pt.setIndex !== f.setIndex || pt.gameIndex !== f.gameIndex)) return false;
      if (f.level === 'tiebreak' && !pt.isTiebreak) return false;

      // 2. Event Player filter (Who hit the shot / made the error)
      if (f.player !== 'all') {
        const eventPlayer = pt.eventPlayer || (pt.outcome === 'unforced_error' || pt.outcome === 'forced_error' || pt.outcome === 'double_fault' ? (pt.winnerPlayer === 'P1' ? 'P2' : 'P1') : pt.winnerPlayer);
        if (eventPlayer !== f.player) return false;
      }

      // 3. Outcome filter
      if (f.outcome !== 'all' && pt.outcome !== f.outcome) return false;

      // 4. Shot Type filter
      if (f.shotType !== 'all' && pt.shotType !== f.shotType) return false;

      // 5. Court Position filter
      if (f.courtPosition !== 'all' && pt.courtPosition !== f.courtPosition) return false;

      // 6. Rally Length filter
      if (f.rallyLength !== 'all' && pt.rallyLength !== f.rallyLength) return false;

      // 7. Error Cause filter
      if (f.errorCause !== 'all' && pt.errorCause !== f.errorCause) return false;

      // 8. Text Search filter (ANDed)
      if (filterText) {
        const matchesComment = pt.comment && pt.comment.toLowerCase().includes(filterText);
        const matchesOutcome = pt.outcome && pt.outcome.toLowerCase().includes(filterText);
        const matchesShot = pt.shotType && pt.shotType.toLowerCase().includes(filterText);
        const matchesCause = pt.errorCause && pt.errorCause.toLowerCase().includes(filterText);
        if (!matchesComment && !matchesOutcome && !matchesShot && !matchesCause) return false;
      }

      return true;
    });
  }

  updateLogCounter() {
    const total = this.engine.points.length;
    const filtered = this.getFilteredPoints(this.engine.points).length;
    const counterEl = this.container.querySelector('#log-match-counter');
    if (counterEl) {
      if (total === 0) {
        counterEl.textContent = '0 Points';
      } else {
        const pct = Math.round((filtered / total) * 100);
        counterEl.textContent = `Showing ${filtered} of ${total} points (${pct}%)`;
      }
    }
  }

  renderPointLogHtml(points, config) {
    if (points.length === 0) {
      return '<div class="text-xs text-slate-400 italic text-center py-4">No points logged yet.</div>';
    }

    const filtered = this.getFilteredPoints(points);
    if (filtered.length === 0) {
      return '<div class="text-xs text-amber-400 italic text-center py-4">No points match the selected filter combination.</div>';
    }

    return filtered.slice().reverse().map(pt => {
      const winnerName = pt.winnerPlayer === 'P1' ? config.p1Name : config.p2Name;
      const isP1 = pt.winnerPlayer === 'P1';

      return `
        <div class="p-2 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 font-bold">
              <span class="text-[10px] font-mono text-slate-400">Pt #${pt.index + 1}</span>
              <span class="${isP1 ? 'text-emerald-400' : 'text-indigo-400'}">${winnerName}</span>
              <span class="text-slate-300">${this.formatOutcomeFull(pt.outcome)}</span>
            </div>
            <div class="text-[10px] font-mono text-slate-400">
              S${(pt.setIndex || 0) + 1} G${(pt.gameIndex || 0) + 1}
            </div>
          </div>

          <div class="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
            ${pt.shotType ? `<span class="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-semibold text-slate-300 capitalize">${pt.shotType}</span>` : ''}
            ${pt.courtPosition ? `<span class="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">${this.formatPositionName(pt.courtPosition)}</span>` : ''}
            ${pt.rallyLength ? `<span class="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">Rally: ${pt.rallyLength}</span>` : ''}
            ${pt.errorCause ? `<span class="bg-amber-950/60 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/60">${TennisStats.formatCause(pt.errorCause)}</span>` : ''}
          </div>

          ${pt.comment ? `
            <div class="text-[11px] text-amber-300 bg-amber-950/30 p-1.5 rounded-lg border border-amber-900/50 flex items-start gap-1">
              <span>💬</span>
              <span>${pt.comment}</span>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  formatPositionName(pos) {
    const map = {
      'baseline': 'Baseline',
      'deep_baseline': 'Deep Base',
      'mid_court': 'Mid-Court',
      'net': 'At Net',
    };
    return map[pos] || pos || 'Baseline';
  }

  formatOutcomeFull(outcome) {
    const map = {
      'ace': '⚡ Ace',
      'service_winner': '🎾 Service Winner',
      'double_fault': '🚫 Double Fault',
      'winner': '🎯 Winner',
      'unforced_error': '⚠️ Unforced Error',
      'forced_error': '🛡️ Forced Error',
    };
    return map[outcome] || outcome;
  }

  attachEventListeners() {
    const btnBack = this.container.querySelector('#btn-back-to-tracker');
    if (btnBack) btnBack.onclick = () => this.onNavigate('tracker');

    // Filter levels
    this.container.querySelectorAll('.btn-filter-level').forEach(btn => {
      btn.onclick = () => {
        const lvl = btn.getAttribute('data-level');
        const setIdx = btn.getAttribute('data-set-idx');

        this.activeFilter.level = lvl;
        if (setIdx !== null) {
          this.activeFilter.setIndex = parseInt(setIdx, 10);
        }
        this.render();
      };
    });

    const updateFilteredLog = () => {
      const container = this.container.querySelector('#filtered-points-container');
      if (container) {
        container.innerHTML = this.renderPointLogHtml(this.engine.points, this.engine.config);
      }
      this.updateLogCounter();
    };

    // Filter dropdowns
    const selPlayer = this.container.querySelector('#filter-player');
    if (selPlayer) selPlayer.onchange = (e) => { this.activeFilter.player = e.target.value; updateFilteredLog(); };

    const selOutcome = this.container.querySelector('#filter-outcome');
    if (selOutcome) selOutcome.onchange = (e) => { this.activeFilter.outcome = e.target.value; updateFilteredLog(); };

    const selShot = this.container.querySelector('#filter-shot');
    if (selShot) selShot.onchange = (e) => { this.activeFilter.shotType = e.target.value; updateFilteredLog(); };

    const selPos = this.container.querySelector('#filter-pos');
    if (selPos) selPos.onchange = (e) => { this.activeFilter.courtPosition = e.target.value; updateFilteredLog(); };

    const selRally = this.container.querySelector('#filter-rally');
    if (selRally) selRally.onchange = (e) => { this.activeFilter.rallyLength = e.target.value; updateFilteredLog(); };

    const selCause = this.container.querySelector('#filter-cause');
    if (selCause) selCause.onchange = (e) => { this.activeFilter.errorCause = e.target.value; updateFilteredLog(); };

    const searchInput = this.container.querySelector('#input-search-comments');
    if (searchInput) searchInput.oninput = (e) => { this.activeFilter.searchComment = e.target.value; updateFilteredLog(); };

    const btnReset = this.container.querySelector('#btn-reset-filters');
    if (btnReset) {
      btnReset.onclick = () => {
        this.activeFilter.player = 'all';
        this.activeFilter.outcome = 'all';
        this.activeFilter.shotType = 'all';
        this.activeFilter.courtPosition = 'all';
        this.activeFilter.rallyLength = 'all';
        this.activeFilter.errorCause = 'all';
        this.activeFilter.searchComment = '';
        this.render();
      };
    }

    // CSV export
    const btnCsv = this.container.querySelector('#btn-export-match-csv');
    if (btnCsv) {
      btnCsv.onclick = () => {
        const matchData = {
          config: this.engine.config,
          points: this.engine.points,
        };
        const csv = TennisStorage.generateMatchCSV(matchData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedP1 = (this.engine.config.p1Name || 'P1').replace(/\s+/g, '_');
        const sanitizedP2 = (this.engine.config.p2Name || 'P2').replace(/\s+/g, '_');
        a.download = `Tennis_Match_${sanitizedP1}_vs_${sanitizedP2}_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      };
    }
  }
}
