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

    // Active sub-tab: 'summary' | 'momentum' | 'pressure' | 'diagnostics' | 'points'
    this.activeTab = 'summary';
    this.selectedPhaseIndex = null;
    this.momentumViewMode = 'games'; // 'games' | 'points'
    this.momentumGameFilter = 'all'; // 'all' | '1-6' | '7-12' | '13-18' | custom
    this.isFullScreenWave = false;

    // Filter state
    this.activeFilter = {
      level: 'match', // 'match' | 'set' | 'game' | 'tiebreak'
      setIndex: 0,
      gameIndex: 0,
      searchComment: '',
      player: 'all',
      outcome: 'all',
      serve: 'all',
      shotType: 'all',
      courtPosition: 'all',
      rallyLength: 'all',
      errorLocation: 'all',
      errorCause: 'all',
      isStarredOnly: false,
      isPressureOnly: false,
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
    const momentumData = TennisStats.calculateMomentumSeries(allPoints, config);
    const pressureData = TennisStats.calculatePressureMetrics(allPoints, config, filterParams);
    const starredCount = allPoints.filter(p => p.isStarred).length;

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
              📥 CSV
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

        <!-- PRIMARY ANALYSIS TABS (Clean iOS Segmented Navigation) -->
        <div class="bg-slate-950 px-2 py-2 border-b border-slate-800/80 shrink-0">
          <div class="grid grid-cols-5 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[11px] font-bold text-center">
            <button data-tab="summary" class="btn-subtab py-1.5 rounded-lg transition-all ${this.activeTab === 'summary' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}">
              📊 Overview
            </button>
            <button data-tab="momentum" class="btn-subtab py-1.5 rounded-lg transition-all ${this.activeTab === 'momentum' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}">
              🌊 Wave
            </button>
            <button data-tab="pressure" class="btn-subtab py-1.5 rounded-lg transition-all ${this.activeTab === 'pressure' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}">
              🎯 Pressure
            </button>
            <button data-tab="diagnostics" class="btn-subtab py-1.5 rounded-lg transition-all ${this.activeTab === 'diagnostics' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}">
              🎾 Diagnostics
            </button>
            <button data-tab="points" class="btn-subtab py-1.5 rounded-lg transition-all ${this.activeTab === 'points' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}">
              📋 Log ${starredCount > 0 ? `(${starredCount}⭐)` : ''}
            </button>
          </div>
        </div>

        <!-- MAIN SCROLLABLE DASHBOARD CONTENT -->
        <main class="flex-1 overflow-y-auto p-3 space-y-4 pb-24">
          ${this.renderActiveTabContent(stats, momentumData, pressureData, config, sb)}
        </main>
      </div>
    `;

    this.attachEventListeners();
    if (this.activeTab === 'points') {
      this.updateLogCounter();
    }
  }

  renderActiveTabContent(stats, momentumData, pressureData, config, sb) {
    switch (this.activeTab) {
      case 'momentum':
        return this.renderMomentumTab(momentumData, config);
      case 'pressure':
        return this.renderPressureTab(pressureData, config);
      case 'diagnostics':
        return this.renderDiagnosticsTab(stats, config);
      case 'points':
        return this.renderPointsLogTab(config);
      case 'summary':
      default:
        return this.renderSummaryTab(stats, config, sb);
    }
  }

  // --- TAB 1: SUMMARY TAB ---
  renderSummaryTab(stats, config, sb) {
    const p1 = stats.P1;
    const p2 = stats.P2;

    return `
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

      <!-- OVERALL MATCH NOTES CARD -->
      ${config.notes && config.notes.trim() ? `
        <section class="bg-slate-900 rounded-2xl p-3 border border-amber-800/40 space-y-1.5 shadow-md">
          <div class="flex items-center justify-between text-xs font-bold text-amber-300">
            <span class="flex items-center gap-1.5">📝 Overall Match Notes & Comments</span>
          </div>
          <div class="text-xs text-slate-200 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed">
            ${config.notes}
          </div>
        </section>
      ` : ''}

      <!-- SET BY SET SCORE SUMMARY -->
      ${stats.setStats && stats.setStats.length > 0 ? `
        <section class="bg-slate-900 rounded-2xl p-3 border border-slate-800 space-y-2">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Set-by-Set Score Summary</h3>
          <div class="grid grid-cols-${Math.min(stats.setStats.length, 3)} gap-2">
            ${stats.setStats.map((set, idx) => `
              <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                <div class="text-[10px] uppercase font-bold text-slate-400 mb-1">Set ${idx + 1}</div>
                <div class="text-sm font-black font-mono">
                  <span class="${set.p1Score > set.p2Score ? 'text-emerald-400' : 'text-slate-300'}">${set.p1Score}</span>
                  <span class="text-slate-600 mx-1">-</span>
                  <span class="${set.p2Score > set.p1Score ? 'text-indigo-400' : 'text-slate-300'}">${set.p2Score}</span>
                </div>
                <div class="text-[10px] text-slate-400 mt-1">${set.totalPoints} pts</div>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <!-- KEY PERFORMANCE INDICATORS -->
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

        ${this.renderStatRow('1st Serve In %', `${p1.firstServePct}% (${p1.firstServesIn}/${p1.servePointsTotal})`, `${p2.firstServePct}% (${p2.firstServesIn}/${p2.servePointsTotal})`, p1.firstServePct > p2.firstServePct)}
        ${this.renderStatRow('1st Serve Won %', `${p1.firstServeWonPct}% (${p1.firstServePointsWon}/${p1.firstServesIn})`, `${p2.firstServeWonPct}% (${p2.firstServePointsWon}/${p2.firstServesIn})`, p1.firstServeWonPct > p2.firstServeWonPct)}
        ${this.renderStatRow('2nd Serve Won %', `${p1.secondServeWonPct}% (${p1.secondServePointsWon}/${p1.secondServesTotal})`, `${p2.secondServeWonPct}% (${p2.secondServePointsWon}/${p2.secondServesTotal})`, p1.secondServeWonPct > p2.secondServeWonPct)}
        ${this.renderStatRow('Total Serve Points Won %', `${p1.servePointsWonPct}% (${p1.servePointsWon}/${p1.servePointsTotal})`, `${p2.servePointsWonPct}% (${p2.servePointsWon}/${p2.servePointsTotal})`, p1.servePointsWonPct > p2.servePointsWonPct)}
        ${this.renderStatRow('Aces / Service Winners', `${p1.aces} / ${p1.serviceWinners}`, `${p2.aces} / ${p2.serviceWinners}`, p1.aces + p1.serviceWinners > p2.aces + p2.serviceWinners)}
        ${this.renderStatRow('Double Faults', p1.doubleFaults, p2.doubleFaults, p1.doubleFaults < p2.doubleFaults)}
        ${this.renderStatRow('Break Points Saved', `${p1.breakPointsSaved}/${p1.breakPointsFaced} (${p1.breakPointsSavedPct}%)`, `${p2.breakPointsSaved}/${p2.breakPointsFaced} (${p2.breakPointsSavedPct}%)`)}
        ${this.renderStatRow('Return Points Won %', `${p1.returnPointsWonPct}% (${p1.returnPointsWon}/${p1.returnPointsTotal})`, `${p2.returnPointsWonPct}% (${p2.returnPointsWon}/${p2.returnPointsTotal})`, p1.returnPointsWonPct > p2.returnPointsWonPct)}
        ${this.renderStatRow('1st Serve Return Won %', `${p1.firstServeReturnWonPct}% (${p1.firstServeReturnPointsWon}/${p2.firstServesIn})`, `${p2.firstServeReturnWonPct}% (${p2.firstServeReturnPointsWon}/${p1.firstServesIn})`, p1.firstServeReturnWonPct > p2.firstServeReturnWonPct)}
        ${this.renderStatRow('2nd Serve Return Won %', `${p1.secondServeReturnWonPct}% (${p1.secondServeReturnPointsWon}/${p2.secondServesTotal})`, `${p2.secondServeReturnWonPct}% (${p2.secondServeReturnPointsWon}/${p1.secondServesTotal})`, p1.secondServeReturnWonPct > p2.secondServeReturnWonPct)}
        ${this.renderStatRow('Break Points Converted', `${p1.breakPointsConverted}/${p1.breakPointsOpportunities} (${p1.breakPointsConvertedPct}%)`, `${p2.breakPointsConverted}/${p2.breakPointsOpportunities} (${p2.breakPointsConvertedPct}%)`)}
        ${this.renderStatRow('Winners (Total)', p1.winnersTotal, p2.winnersTotal, p1.winnersTotal > p2.winnersTotal)}
        ${this.renderStatRow('Unforced Errors', p1.unforcedErrorsTotal, p2.unforcedErrorsTotal, p1.unforcedErrorsTotal < p2.unforcedErrorsTotal)}
        ${this.renderStatRow('Forced Errors Induced', p1.forcedErrorsInduced, p2.forcedErrorsInduced, p1.forcedErrorsInduced > p2.forcedErrorsInduced)}
        ${this.renderStatRow('Winner / UE Ratio', p1.winnerToUERatio, p2.winnerToUERatio, p1.winnerToUERatio > p2.winnerToUERatio)}
        ${this.renderStatRow('Net Points Won', `${p1.netPointsWon}/${p1.netApproaches} (${p1.netEfficiencyPct}%)`, `${p2.netPointsWon}/${p2.netApproaches} (${p2.netEfficiencyPct}%)`, p1.netEfficiencyPct > p2.netEfficiencyPct)}
      </section>
    `;
  }

  // --- TAB 2: MOMENTUM WAVE TAB ---
  renderMomentumTab(momentumData, config) {
    const rawSeries = momentumData.series || [];
    const allGameBlocks = momentumData.gameBlocks || [];
    const allPhases = momentumData.phases || [];

    if (rawSeries.length === 0 && allGameBlocks.length === 0) {
      return `
        <div class="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400">
          <p class="text-sm font-semibold">No momentum data available yet.</p>
          <p class="text-xs mt-1">Track at least a few points to visualize the match momentum wave.</p>
        </div>
      `;
    }

    // Determine current game filtering
    let startG = 1;
    let endG = allGameBlocks.length || 1;
    if (this.momentumGameFilter !== 'all') {
      const parts = this.momentumGameFilter.split('-');
      if (parts.length === 2) {
        startG = parseInt(parts[0], 10) || 1;
        endG = parseInt(parts[1], 10) || allGameBlocks.length;
      }
    }

    const filteredGameBlocks = allGameBlocks.filter(g => g.gameNumber >= startG && g.gameNumber <= endG);
    const filteredPoints = rawSeries.filter(pt => {
      const gNum = pt.gameNumber || (allGameBlocks.findIndex(g => g.setIndex === pt.setIndex && g.gameIndex === pt.gameIndex && Boolean(g.isTiebreak) === Boolean(pt.isTiebreak)) + 1);
      return gNum >= startG && gNum <= endG;
    });

    const isPointsMode = this.momentumViewMode === 'points';
    const isFull = Boolean(this.isFullScreenWave);

    const svgWidth = isFull ? 900 : 620;
    const svgHeight = isFull ? 320 : 230;
    const paddingX = 45;
    const paddingY = 28;
    const plotWidth = svgWidth - paddingX * 2;
    const plotHeight = svgHeight - paddingY * 2;
    const midY = paddingY + plotHeight / 2;

    let coords = [];
    let pathD = '';
    let posAreaD = '';
    let negAreaD = '';

    if (isPointsMode) {
      const dataArr = filteredPoints;
      const n = dataArr.length;
      coords = dataArr.map((pt, idx) => {
        const x = n > 1 ? paddingX + (idx / (n - 1)) * plotWidth : paddingX + plotWidth / 2;
        const mVal = typeof pt.momentum === 'number' ? pt.momentum : 0;
        const clampedVal = Math.max(-100, Math.min(100, mVal));
        const y = midY - (clampedVal / 100) * (plotHeight / 2);
        return { x, y, pt, idx, momentumVal: mVal, isGame: false };
      });
    } else {
      const dataArr = filteredGameBlocks;
      const n = dataArr.length;
      coords = dataArr.map((g, idx) => {
        const x = n > 1 ? paddingX + (idx / (n - 1)) * plotWidth : paddingX + plotWidth / 2;
        const mVal = typeof g.momentum === 'number' ? g.momentum : 0;
        const clampedVal = Math.max(-100, Math.min(100, mVal));
        const y = midY - (clampedVal / 100) * (plotHeight / 2);
        return { x, y, g, idx, momentumVal: mVal, isGame: true };
      });
    }

    if (coords.length > 0) {
      pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
      const n = coords.length;
      posAreaD = `M ${coords[0].x.toFixed(1)} ${midY} ` + 
        coords.map(c => `L ${c.x.toFixed(1)} ${Math.min(midY, c.y).toFixed(1)}`).join(' ') + 
        ` L ${coords[n - 1].x.toFixed(1)} ${midY} Z`;

      negAreaD = `M ${coords[0].x.toFixed(1)} ${midY} ` + 
        coords.map(c => `L ${c.x.toFixed(1)} ${Math.max(midY, c.y).toFixed(1)}`).join(' ') + 
        ` L ${coords[n - 1].x.toFixed(1)} ${midY} Z`;
    }

    // Group game blocks dynamically by set
    const setGroups = [];
    allGameBlocks.forEach(g => {
      let setGroup = setGroups.find(sg => sg.setIndex === g.setIndex);
      if (!setGroup) {
        setGroup = {
          setIndex: g.setIndex,
          setNumber: g.setNumber,
          isTiebreak: g.isTiebreak,
          startG: g.gameNumber,
          endG: g.gameNumber,
          games: []
        };
        setGroups.push(setGroup);
      }
      setGroup.endG = g.gameNumber;
      setGroup.games.push(g);
    });

    // Filter turning point phases according to game selection
    const displayPhases = allPhases.filter(ph => {
      if (this.momentumGameFilter === 'all') return true;
      const phStartG = allGameBlocks.findIndex(g => ph.startIndex >= (g.points[0]?.index || 0) && ph.startIndex <= (g.points[g.points.length - 1]?.index || 0)) + 1;
      return (phStartG >= startG && phStartG <= endG);
    });

    return `
      <!-- FULL SCREEN / NORMAL WRAPPER -->
      <div class="${isFull ? 'fixed inset-0 z-50 bg-slate-950 p-4 flex flex-col overflow-y-auto' : 'space-y-3'}">
        
        <!-- HEADER & TOOLBAR -->
        <section class="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <span>🌊 Match Momentum Wave</span>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                  ${isPointsMode ? 'Point-by-Point Drilldown' : 'Game-by-Game Macro Wave'}
                </span>
              </h3>
              <p class="text-[11px] text-slate-400 mt-0.5">
                ${isPointsMode ? `Detailed micro point flow (${filteredPoints.length} points)` : `Overall match game control (${allGameBlocks.length} games)`}
              </p>
            </div>

            <!-- CONTROLS: VIEW TOGGLE (Games vs Points) & FULL SCREEN -->
            <div class="flex items-center gap-1.5">
              <!-- Games vs Points Toggle -->
              <div class="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-bold">
                <button 
                  id="btn-wave-mode-games" 
                  class="px-2.5 py-1 rounded-md transition-colors ${!isPointsMode ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}"
                >
                  🎮 Games Wave
                </button>
                <button 
                  id="btn-wave-mode-points" 
                  class="px-2.5 py-1 rounded-md transition-colors ${isPointsMode ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}"
                >
                  🎾 Points Wave
                </button>
              </div>

              <!-- Full Screen / Exit Full Screen -->
              <button 
                id="btn-toggle-fullscreen-wave" 
                class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1 active:scale-95"
                title="${isFull ? 'Exit Wide View' : 'Open Wide / Full Screen View'}"
              >
                <span>${isFull ? '🗗 Normal' : '⛶ Wide'}</span>
              </button>
            </div>
          </div>

          <!-- DYNAMIC GAME RANGE DRILLDOWN CHIPS (Calculated Dynamically from Real Set Boundaries) -->
          <div class="flex items-center justify-between gap-2 flex-wrap text-xs bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-slate-400 text-[11px] font-semibold">Scope:</span>
              <button class="btn-game-range-chip px-2 py-0.5 rounded-md border text-[11px] font-bold transition-all ${this.momentumGameFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500' : 'bg-slate-900 text-slate-400 border-slate-800'}" data-range="all">
                All Games (1–${allGameBlocks.length})
              </button>
              ${setGroups.map(sg => {
                const rangeKey = `${sg.startG}-${sg.endG}`;
                const label = sg.isTiebreak && sg.startG === sg.endG 
                  ? `Set ${sg.setNumber} Match TB (G${sg.startG})`
                  : (sg.startG === sg.endG ? `Set ${sg.setNumber} (G${sg.startG})` : `Set ${sg.setNumber} (G${sg.startG}–${sg.endG})`);
                const isSelected = this.momentumGameFilter === rangeKey;
                return `
                  <button 
                    class="btn-game-range-chip px-2 py-0.5 rounded-md border text-[11px] font-bold transition-all ${isSelected ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500' : 'bg-slate-900 text-slate-400 border-slate-800'}" 
                    data-range="${rangeKey}"
                  >
                    ${label}
                  </button>
                `;
              }).join('')}
            </div>

            <!-- Custom Game Filter Dropdowns -->
            <div class="flex items-center gap-1 text-[11px]">
              <span class="text-slate-400">Games:</span>
              <select id="sel-wave-game-start" class="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white">
                ${allGameBlocks.map(g => `<option value="${g.gameNumber}" ${g.gameNumber === startG ? 'selected' : ''}>G${g.gameNumber}</option>`).join('')}
              </select>
              <span class="text-slate-500">to</span>
              <select id="sel-wave-game-end" class="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white">
                ${allGameBlocks.map(g => `<option value="${g.gameNumber}" ${g.gameNumber === endG ? 'selected' : ''}>G${g.gameNumber}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- SVG WAVE CONTAINER -->
          <div class="relative bg-slate-950 rounded-xl p-2 border border-slate-800 overflow-x-auto">
            <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="w-full h-auto min-w-[540px]" preserveAspectRatio="none">
              <defs>
                <linearGradient id="p1Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#10b981" stop-opacity="0.45"/>
                  <stop offset="100%" stop-color="#10b981" stop-opacity="0.0"/>
                </linearGradient>
                <linearGradient id="p2Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#6366f1" stop-opacity="0.0"/>
                  <stop offset="100%" stop-color="#6366f1" stop-opacity="0.45"/>
                </linearGradient>
              </defs>

              <!-- Background Grid & Neutral Baseline -->
              <line x1="${paddingX}" y1="${midY}" x2="${svgWidth - paddingX}" y2="${midY}" stroke="#475569" stroke-width="1.5" stroke-dasharray="4 3"/>
              <text x="${paddingX - 6}" y="${midY + 3}" fill="#94a3b8" font-size="9" text-anchor="end" font-family="monospace">0 (Even)</text>
              <text x="${paddingX - 6}" y="${paddingY + 8}" fill="#10b981" font-size="9" text-anchor="end" font-family="monospace">+100</text>
              <text x="${paddingX - 6}" y="${svgHeight - paddingY}" fill="#6366f1" font-size="9" text-anchor="end" font-family="monospace">-100</text>

              <!-- Zone Label Watermarks -->
              <text x="${svgWidth / 2}" y="${paddingY + 14}" fill="#10b981" opacity="0.6" font-size="11" font-weight="bold" text-anchor="middle">▲ ${config.p1Name} Dominating Momentum</text>
              <text x="${svgWidth / 2}" y="${svgHeight - paddingY - 6}" fill="#6366f1" opacity="0.6" font-size="11" font-weight="bold" text-anchor="middle">▼ ${config.p2Name} Dominating Momentum</text>

              <!-- Shaded Momentum Areas -->
              <path d="${posAreaD}" fill="url(#p1Grad)"/>
              <path d="${negAreaD}" fill="url(#p2Grad)"/>

              <!-- Momentum Curve Line -->
              <path d="${pathD}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>

              <!-- Individual Data Circles (Clean Two-Player Colors) -->
              ${coords.map(c => {
                if (c.isGame) {
                  const isP1Won = c.g.winner === 'P1';
                  const fillColor = isP1Won ? '#10b981' : '#6366f1';
                  const srvName = c.g.server === 'P1' ? config.p1Name : config.p2Name;
                  const gWinnerName = isP1Won ? config.p1Name : config.p2Name;
                  const scoreDesc = `Set ${c.g.setNumber} Game ${c.g.gameIndex + 1} (${c.g.p1ScoreBefore}-${c.g.p2ScoreBefore} ➔ ${c.g.p1GamesAfter}-${c.g.p2GamesAfter})`;

                  return `
                    <circle 
                      cx="${c.x.toFixed(1)}" 
                      cy="${c.y.toFixed(1)}" 
                      r="5.5" 
                      fill="${fillColor}" 
                      stroke="#ffffff" 
                      stroke-width="1.5"
                      class="cursor-pointer hover:scale-150 transition-transform momentum-wave-dot"
                      data-type="game"
                      data-game-num="${c.g.gameNumber}"
                      data-winner="${c.g.winner}"
                      data-val="${c.momentumVal}"
                      data-desc="${scoreDesc}"
                      data-p1-pts="${c.g.p1Points}"
                      data-p2-pts="${c.g.p2Points}"
                      data-p1-w="${c.g.p1Winners}"
                      data-p2-w="${c.g.p2Winners}"
                      data-p1-ue="${c.g.p1UEs}"
                      data-p2-ue="${c.g.p2UEs}"
                      data-srv="${srvName}"
                    />
                  `;
                } else {
                  const isP1Won = c.pt.winner === 'P1';
                  const fillColor = isP1Won ? '#10b981' : '#6366f1';
                  const pWinnerName = isP1Won ? config.p1Name : config.p2Name;
                  const ptScoreDesc = `S${c.pt.set || 1} G${c.pt.game || 1} [${c.pt.p1Games}-${c.pt.p2Games}] • At ${c.pt.p1Score}-${c.pt.p2Score}`;

                  return `
                    <circle 
                      cx="${c.x.toFixed(1)}" 
                      cy="${c.y.toFixed(1)}" 
                      r="3.5" 
                      fill="${fillColor}" 
                      stroke="#0f172a" 
                      stroke-width="1"
                      class="cursor-pointer hover:scale-150 transition-transform momentum-wave-dot"
                      data-type="point"
                      data-pt-idx="${c.pt.index}"
                      data-pt-num="${c.pt.index}"
                      data-winner="${c.pt.winner}"
                      data-val="${c.momentumVal}"
                      data-desc="${ptScoreDesc}"
                      data-outcome="${c.pt.outcome || ''}"
                    />
                  `;
                }
              }).join('')}
            </svg>
          </div>

          <!-- TOUCH / CLICK INSPECTION CARD (MOBILE & DESKTOP COMPATIBLE) -->
          <div id="momentum-detail-banner" class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs min-h-[48px] flex items-center justify-between">
            <div class="flex items-center gap-2 text-slate-300">
              <span class="text-base">👆</span>
              <span><strong>Tap or click</strong> any dot on the wave to inspect game/point outcome and performance drivers.</span>
            </div>
          </div>

          <!-- CLEAN TWO-PLAYER COLOR NOTATION LEGEND -->
          <div class="grid grid-cols-2 gap-3 pt-1 text-xs bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
            <div class="flex items-center gap-2">
              <span class="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block shrink-0 shadow-sm shadow-emerald-500/30"></span>
              <span class="text-slate-200 font-semibold">${config.p1Name} Won (Peak Above 0)</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3.5 h-3.5 rounded-full bg-indigo-500 inline-block shrink-0 shadow-sm shadow-indigo-500/30"></span>
              <span class="text-slate-200 font-semibold">${config.p2Name} Won (Valley Below 0)</span>
            </div>
          </div>
        </section>

        <!-- MAJOR MOMENTUM TURNING POINTS & SURGES -->
        <section class="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between pb-1 border-b border-slate-800">
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-amber-400">🔥 Match Swings & Turning Points</h3>
              <p class="text-[11px] text-slate-400 mt-0.5">Key scoring surges and turning points that shaped the match</p>
            </div>
            <span class="text-[10px] font-mono text-slate-400 font-bold">${displayPhases.length} Decisive Runs</span>
          </div>

          <div class="space-y-2.5">
            ${displayPhases.length === 0 ? `
              <div class="text-xs text-slate-400 p-3 text-center bg-slate-950 rounded-xl">
                No single dominant momentum run over consecutive points yet for this scope.
              </div>
            ` : displayPhases.map((phase, idx) => {
              const isP1Dom = phase.dominantPlayer === 'P1';
              const domName = isP1Dom ? config.p1Name : config.p2Name;
              const borderCol = isP1Dom ? 'border-emerald-800/60 bg-emerald-950/20' : 'border-indigo-800/60 bg-indigo-950/20';
              const badgeCol = isP1Dom ? 'bg-emerald-500/20 text-emerald-300 border-emerald-700' : 'bg-indigo-500/20 text-indigo-300 border-indigo-700';

              return `
                <div class="p-3 rounded-xl border ${borderCol} space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${badgeCol} font-bold">
                        ${isP1Dom ? '▲' : '▼'} Run #${idx + 1}
                      </span>
                      <span class="text-xs font-bold ${isP1Dom ? 'text-emerald-400' : 'text-indigo-400'}">
                        ${domName} Surge (+${phase.pointsWonByDom}/${phase.totalPoints} pts)
                      </span>
                    </div>
                    <span class="text-[10px] font-mono text-slate-400">Pts #${phase.startIndex + 1}–${phase.endIndex + 1}</span>
                  </div>

                  <!-- SCORE TRANSITION & RUN STATS -->
                  <div class="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                    <div>
                      <span class="text-[10px] text-slate-400 block">Score Transition:</span>
                      <span class="font-mono font-bold text-slate-200">${phase.startScore} ➔ ${phase.endScore}</span>
                    </div>
                    <div>
                      <span class="text-[10px] text-slate-400 block">Key Drivers:</span>
                      <span class="text-slate-200">${phase.domWinners} Winners | ${phase.oppUEs} Opp UEs</span>
                    </div>
                  </div>

                  <!-- DRILLDOWN BUTTON -->
                  <div class="flex justify-end pt-1">
                    <button 
                      class="btn-drilldown-phase px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-sky-300 flex items-center gap-1 transition-colors"
                      data-start="${phase.startIndex}"
                      data-end="${phase.endIndex}"
                      data-player="${phase.dominantPlayer}"
                    >
                      <span>🔍 Drill Down Points Log</span>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>

      </div>
    `;
  }

  // --- TAB 3: PRESSURE & CLUTCH POINTS TAB ---
  renderPressureTab(pressureData, config) {
    const p1 = pressureData.P1 || {};
    const p2 = pressureData.P2 || {};
    const scenarios = pressureData.breakdown || {};
    const errors = pressureData.pressureErrors || { P1: {}, P2: {} };
    const totalPressure = pressureData.pressureTotal || 0;

    const p1Clutch = p1.clutchDiff || 0;
    const p2Clutch = p2.clutchDiff || 0;

    const p1ClutchColor = p1Clutch > 0 ? 'text-emerald-400' : (p1Clutch < 0 ? 'text-rose-400' : 'text-slate-300');
    const p2ClutchColor = p2Clutch > 0 ? 'text-indigo-400' : (p2Clutch < 0 ? 'text-rose-400' : 'text-slate-300');

    const getBadge = (cIdx) => {
      if (cIdx >= 8) return { label: '🔥 Clutch Master', bg: 'bg-emerald-950/60 text-emerald-300 border-emerald-700' };
      if (cIdx >= -4) return { label: '⚖️ Steady Under Pressure', bg: 'bg-sky-950/60 text-sky-300 border-sky-700' };
      return { label: '⚠️ Pressure Vulnerable', bg: 'bg-rose-950/60 text-rose-300 border-rose-700' };
    };

    const p1Badge = getBadge(p1Clutch);
    const p2Badge = getBadge(p2Clutch);

    const bp = scenarios.breakPoints || {};
    const gp = scenarios.gamePoints || {};
    const sp = scenarios.setPoints || {};
    const mp = scenarios.matchPoints || {};
    const dp = scenarios.deucePoints || {};
    const ltb = scenarios.lateTiebreakPoints || {};

    return `
      <!-- CLUTCH INDEX HERO CARDS -->
      <section class="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 space-y-3">
        <div class="flex items-center justify-between pb-1 border-b border-slate-800">
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider text-amber-400">⚡ Clutch Index & Pressure Mastery</h3>
            <p class="text-[11px] text-slate-400 mt-0.5">Win rate differential on Pressure Points vs Standard Points</p>
          </div>
          <span class="text-[10px] font-mono text-slate-400 font-bold">${totalPressure} Pressure Pts</span>
        </div>

        <div class="grid grid-cols-2 gap-2.5">
          <!-- P1 Clutch Card -->
          <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-center">
            <div class="font-bold text-emerald-400 text-xs truncate">${config.p1Name}</div>
            <div class="text-2xl font-black font-mono ${p1ClutchColor}">
              ${p1Clutch > 0 ? '+' : ''}${p1Clutch}%
            </div>
            <div class="text-[10px] px-2 py-0.5 rounded-full border ${p1Badge.bg} font-semibold inline-block">
              ${p1Badge.label}
            </div>
            <div class="text-[10px] text-slate-400 pt-1 border-t border-slate-900 flex justify-between">
              <span>Pressure Win:</span>
              <strong class="text-white">${p1.pressureWonPct || 0}% (${p1.pressureWon || 0}/${totalPressure})</strong>
            </div>
            <div class="text-[10px] text-slate-400 flex justify-between">
              <span>Standard Win:</span>
              <strong class="text-slate-300">${p1.nonPressureWonPct || 0}% (${p1.nonPressureWon || 0}/${pressureData.nonPressureTotal || 0})</strong>
            </div>
          </div>

          <!-- P2 Clutch Card -->
          <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-center">
            <div class="font-bold text-indigo-400 text-xs truncate">${config.p2Name}</div>
            <div class="text-2xl font-black font-mono ${p2ClutchColor}">
              ${p2Clutch > 0 ? '+' : ''}${p2Clutch}%
            </div>
            <div class="text-[10px] px-2 py-0.5 rounded-full border ${p2Badge.bg} font-semibold inline-block">
              ${p2Badge.label}
            </div>
            <div class="text-[10px] text-slate-400 pt-1 border-t border-slate-900 flex justify-between">
              <span>Pressure Win:</span>
              <strong class="text-white">${p2.pressureWonPct || 0}% (${p2.pressureWon || 0}/${totalPressure})</strong>
            </div>
            <div class="text-[10px] text-slate-400 flex justify-between">
              <span>Standard Win:</span>
              <strong class="text-slate-300">${p2.nonPressureWonPct || 0}% (${p2.nonPressureWon || 0}/${pressureData.nonPressureTotal || 0})</strong>
            </div>
          </div>
        </div>
      </section>

      <!-- PRESSURE SCENARIOS CONVERSION BREAKDOWN -->
      <section class="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 space-y-2.5">
        <div class="flex items-center justify-between pb-1 border-b border-slate-800">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Key Pressure Situations</h3>
          <span class="text-[10px] text-slate-400 font-semibold">Break, Game, Set, Match & Deuce</span>
        </div>

        ${this.renderStatRow('Break Points Won / Opps', `${bp.p1Converted || 0}/${bp.p1Opportunities || 0} (${bp.p1ConvertedPct || 0}%)`, `${bp.p2Converted || 0}/${bp.p2Opportunities || 0} (${bp.p2ConvertedPct || 0}%)`, (bp.p1ConvertedPct || 0) > (bp.p2ConvertedPct || 0))}
        ${this.renderStatRow('Break Points Saved', `${bp.p1Saved || 0}/${bp.p1Faced || 0} (${bp.p1SavedPct || 0}%)`, `${bp.p2Saved || 0}/${bp.p2Faced || 0} (${bp.p2SavedPct || 0}%)`)}
        ${this.renderStatRow('Game Points Converted', `${gp.p1Won || 0}/${gp.p1Opportunities || 0} (${gp.p1WonPct || 0}%)`, `${gp.p2Won || 0}/${gp.p2Opportunities || 0} (${gp.p2WonPct || 0}%)`, (gp.p1WonPct || 0) > (gp.p2WonPct || 0))}
        ${this.renderStatRow('Set Points Won / Chances', `${sp.p1Won || 0}/${sp.p1Opportunities || 0}`, `${sp.p2Won || 0}/${sp.p2Opportunities || 0}`)}
        ${this.renderStatRow('Match Points Won / Chances', `${mp.p1Won || 0}/${mp.p1Opportunities || 0}`, `${mp.p2Won || 0}/${mp.p2Opportunities || 0}`)}
        ${this.renderStatRow('Deuce Points (40-40) Won', `${dp.p1Won || 0}/${dp.total || 0} (${dp.p1WonPct || 0}%)`, `${dp.p2Won || 0}/${dp.total || 0} (${dp.p2WonPct || 0}%)`)}
        ${this.renderStatRow('Late Tiebreak Points (≥4-4)', `${ltb.p1Won || 0}/${ltb.total || 0}`, `${ltb.p2Won || 0}/${ltb.total || 0}`)}
      </section>

      <!-- PRESSURE UNFORCED ERRORS & MISS LOCATIONS -->
      <section class="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 space-y-2.5">
        <div class="flex items-center justify-between pb-1 border-b border-slate-800">
          <h3 class="text-xs font-bold uppercase tracking-wider text-rose-400">⚠️ Unforced Errors on Pressure Points</h3>
          <span class="text-[10px] text-slate-400">Where shots broke down</span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <!-- P1 Pressure Errors -->
          <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <div class="font-bold text-emerald-400 mb-1 truncate">${config.p1Name} (${errors.P1?.totalUE || 0} UEs)</div>
            <div class="flex justify-between text-[11px]"><span>🕸️ Net Misses:</span> <strong>${errors.P1?.net || 0}</strong></div>
            <div class="flex justify-between text-[11px]"><span>⬅️ Wide Left:</span> <strong>${errors.P1?.wide_left || 0}</strong></div>
            <div class="flex justify-between text-[11px]"><span>➡️ Wide Right:</span> <strong>${errors.P1?.wide_right || 0}</strong></div>
            <div class="flex justify-between text-[11px]"><span>⬆️ Long Out:</span> <strong>${errors.P1?.long || 0}</strong></div>
            ${(errors.P1?.unspecified || 0) > 0 ? `<div class="flex justify-between text-[11px] text-slate-400"><span>🎾 Other / Baseline:</span> <strong>${errors.P1?.unspecified}</strong></div>` : ''}
            <div class="flex justify-between text-[11px] text-slate-400 pt-0.5 border-t border-slate-900"><span>🚫 Double Faults:</span> <strong>${errors.P1?.doubleFaults || 0}</strong></div>
          </div>

          <!-- P2 Pressure Errors -->
          <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <div class="font-bold text-indigo-400 mb-1 truncate">${config.p2Name} (${errors.P2?.totalUE || 0} UEs)</div>
            <div class="flex justify-between text-[11px]"><span>🕸️ Net Misses:</span> <strong>${errors.P2?.net || 0}</strong></div>
            <div class="flex justify-between text-[11px]"><span>⬅️ Wide Left:</span> <strong>${errors.P2?.wide_left || 0}</strong></div>
            <div class="flex justify-between text-[11px]"><span>➡️ Wide Right:</span> <strong>${errors.P2?.wide_right || 0}</strong></div>
            <div class="flex justify-between text-[11px]"><span>⬆️ Long Out:</span> <strong>${errors.P2?.long || 0}</strong></div>
            ${(errors.P2?.unspecified || 0) > 0 ? `<div class="flex justify-between text-[11px] text-slate-400"><span>🎾 Other / Baseline:</span> <strong>${errors.P2?.unspecified}</strong></div>` : ''}
            <div class="flex justify-between text-[11px] text-slate-400 pt-0.5 border-t border-slate-900"><span>🚫 Double Faults:</span> <strong>${errors.P2?.doubleFaults || 0}</strong></div>
          </div>
        </div>

        <!-- 1-TAP FILTER ALL PRESSURE POINTS -->
        <div class="pt-1 text-center">
          <button id="btn-view-pressure-points-log" class="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5">
            <span>⚡ View All Pressure Points in Log →</span>
          </button>
        </div>
      </section>
    `;
  }

  // --- TAB 4: DIAGNOSTICS & ERROR TAB ---
  renderDiagnosticsTab(stats, config) {
    const p1 = stats.P1 || {};
    const p2 = stats.P2 || {};
    const p1Loc = p1.unforcedErrorsByLocation || { net: 0, wide_left: 0, wide_right: 0, long: 0 };
    const p2Loc = p2.unforcedErrorsByLocation || { net: 0, wide_left: 0, wide_right: 0, long: 0 };
    const p1Cause = p1.errorsByCause || { spacing: 0, let_ball: 0, above_shoulder: 0, mindset: 0 };
    const p2Cause = p2.errorsByCause || { spacing: 0, let_ball: 0, above_shoulder: 0, mindset: 0 };

    return `
      <!-- UNFORCED ERROR MISS LOCATIONS (Net, Wide Left, Wide Right, Long Out) -->
      <section class="bg-slate-900 rounded-2xl p-3 border border-slate-800 space-y-2.5">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800 flex justify-between items-center">
          <span>Unforced Error Miss Locations</span>
          <span class="text-[10px] text-rose-400 font-semibold">Net vs Wide vs Long</span>
        </h3>

        <div class="grid grid-cols-2 gap-2">
          <!-- Player 1 Misses -->
          <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
            <div class="font-bold text-emerald-400 mb-1 truncate">${config.p1Name} (${p1.unforcedErrorsTotal || 0} UEs)</div>
            <div class="flex justify-between"><span>🕸️ Net:</span> <strong class="text-slate-200">${p1Loc.net || 0} (${p1.unforcedErrorsTotal > 0 ? Math.round(((p1Loc.net || 0) / p1.unforcedErrorsTotal) * 100) : 0}%)</strong></div>
            <div class="flex justify-between"><span>⬅️ Wide Left:</span> <strong class="text-slate-200">${p1Loc.wide_left || 0} (${p1.unforcedErrorsTotal > 0 ? Math.round(((p1Loc.wide_left || 0) / p1.unforcedErrorsTotal) * 100) : 0}%)</strong></div>
            <div class="flex justify-between"><span>➡️ Wide Right:</span> <strong class="text-slate-200">${p1Loc.wide_right || 0} (${p1.unforcedErrorsTotal > 0 ? Math.round(((p1Loc.wide_right || 0) / p1.unforcedErrorsTotal) * 100) : 0}%)</strong></div>
            <div class="flex justify-between"><span>⬆️ Long Out:</span> <strong class="text-slate-200">${p1Loc.long || 0} (${p1.unforcedErrorsTotal > 0 ? Math.round(((p1Loc.long || 0) / p1.unforcedErrorsTotal) * 100) : 0}%)</strong></div>
          </div>

          <!-- Player 2 Misses -->
          <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
            <div class="font-bold text-indigo-400 mb-1 truncate">${config.p2Name} (${p2.unforcedErrorsTotal || 0} UEs)</div>
            <div class="flex justify-between"><span>🕸️ Net:</span> <strong class="text-slate-200">${p2Loc.net || 0} (${p2.unforcedErrorsTotal > 0 ? Math.round(((p2Loc.net || 0) / p2.unforcedErrorsTotal) * 100) : 0}%)</strong></div>
            <div class="flex justify-between"><span>⬅️ Wide Left:</span> <strong class="text-slate-200">${p2Loc.wide_left || 0} (${p2.unforcedErrorsTotal > 0 ? Math.round(((p2Loc.wide_left || 0) / p2.unforcedErrorsTotal) * 100) : 0}%)</strong></div>
            <div class="flex justify-between"><span>➡️ Wide Right:</span> <strong class="text-slate-200">${p2Loc.wide_right || 0} (${p2.unforcedErrorsTotal > 0 ? Math.round(((p2Loc.wide_right || 0) / p2.unforcedErrorsTotal) * 100) : 0}%)</strong></div>
            <div class="flex justify-between"><span>⬆️ Long Out:</span> <strong class="text-slate-200">${p2Loc.long || 0} (${p2.unforcedErrorsTotal > 0 ? Math.round(((p2Loc.long || 0) / p2.unforcedErrorsTotal) * 100) : 0}%)</strong></div>
          </div>
        </div>
      </section>

      <!-- ERROR CAUSES (Spacing, Let ball, Above Shoulder, Mindset) -->
      <section class="bg-slate-900 rounded-2xl p-3 border border-slate-800 space-y-2.5">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800 flex justify-between items-center">
          <span>Error Root Causes</span>
          <span class="text-[10px] text-amber-400 font-semibold">Technical & Tactical</span>
        </h3>

        <div class="grid grid-cols-2 gap-2">
          <!-- Player 1 Causes -->
          <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
            <div class="font-bold text-emerald-400 mb-1 truncate">${config.p1Name}</div>
            <div class="flex justify-between"><span>Spacing:</span> <strong class="text-slate-200">${p1Cause.spacing || 0}</strong></div>
            <div class="flex justify-between"><span>Let ball:</span> <strong class="text-slate-200">${p1Cause.let_ball || 0}</strong></div>
            <div class="flex justify-between"><span>Above Shoulder:</span> <strong class="text-slate-200">${p1Cause.above_shoulder || 0}</strong></div>
            <div class="flex justify-between"><span>Mindset:</span> <strong class="text-slate-200">${p1Cause.mindset || 0}</strong></div>
          </div>

          <!-- Player 2 Causes -->
          <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
            <div class="font-bold text-indigo-400 mb-1 truncate">${config.p2Name}</div>
            <div class="flex justify-between"><span>Spacing:</span> <strong class="text-slate-200">${p2Cause.spacing || 0}</strong></div>
            <div class="flex justify-between"><span>Let ball:</span> <strong class="text-slate-200">${p2Cause.let_ball || 0}</strong></div>
            <div class="flex justify-between"><span>Above Shoulder:</span> <strong class="text-slate-200">${p2Cause.above_shoulder || 0}</strong></div>
            <div class="flex justify-between"><span>Mindset:</span> <strong class="text-slate-200">${p2Cause.mindset || 0}</strong></div>
          </div>
        </div>
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
    `;
  }

  // --- TAB 5: POINTS LOG TAB ---
  renderPointsLogTab(config) {
    const allPoints = this.engine.points;

    return `
      <!-- CHRONOLOGICAL POINT LOG WITH MULTI-CRITERIA AND-FILTERING -->
      <section class="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 space-y-3">
        <div class="flex items-center justify-between pb-1 border-b border-slate-800">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">📋 Filterable Points Log & Patterns</h3>
          <span id="log-match-counter" class="text-[10px] text-emerald-400 font-mono font-bold"></span>
        </div>

        <!-- QUICK FILTER CHIPS -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button class="btn-quick-chip px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${this.activeFilter.quick === 'all' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800'}" data-quick="all">
            All Points
          </button>
          <button class="btn-quick-chip px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${this.activeFilter.quick === 'starred' ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'bg-slate-950 text-slate-400 border-slate-800'}" data-quick="starred">
            ⭐ Starred Only
          </button>
          <button class="btn-quick-chip px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${this.activeFilter.quick === 'pressure' ? 'bg-orange-500/20 text-orange-300 border-orange-500' : 'bg-slate-950 text-slate-400 border-slate-800'}" data-quick="pressure">
            ⚡ Pressure Points
          </button>
          <button class="btn-quick-chip px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${this.activeFilter.quick === 'winners' ? 'bg-sky-500/20 text-sky-300 border-sky-500' : 'bg-slate-950 text-slate-400 border-slate-800'}" data-quick="winners">
            🎯 Winners
          </button>
          <button class="btn-quick-chip px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${this.activeFilter.quick === 'ues' ? 'bg-rose-500/20 text-rose-300 border-rose-500' : 'bg-slate-950 text-slate-400 border-slate-800'}" data-quick="ues">
            ⚠️ UEs
          </button>
        </div>

        <!-- MULTI-CRITERIA AND FILTERS -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <!-- Event Player Filter -->
          <div>
            <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Event Player (Hitter/Error)</label>
            <select id="filter-player" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] text-white">
              <option value="all">All Event Players</option>
              <option value="P1" ${this.activeFilter.player === 'P1' ? 'selected' : ''}>${config.p1Name}</option>
              <option value="P2" ${this.activeFilter.player === 'P2' ? 'selected' : ''}>${config.p2Name}</option>
            </select>
          </div>

          <!-- Serve Filter (1st In vs 2nd) -->
          <div>
            <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Serve Attempt</label>
            <select id="filter-serve" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] text-white">
              <option value="all">All Serves</option>
              <option value="1st" ${this.activeFilter.serve === '1st' ? 'selected' : ''}>1st Serve In</option>
              <option value="2nd" ${this.activeFilter.serve === '2nd' ? 'selected' : ''}>2nd Serve</option>
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

          <!-- Miss Location Filter -->
          <div>
            <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Miss Location</label>
            <select id="filter-location" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] text-white">
              <option value="all">All Misses</option>
              <option value="net" ${this.activeFilter.errorLocation === 'net' ? 'selected' : ''}>🕸️ Net</option>
              <option value="wide_left" ${this.activeFilter.errorLocation === 'wide_left' ? 'selected' : ''}>⬅️ Wide Left</option>
              <option value="wide_right" ${this.activeFilter.errorLocation === 'wide_right' ? 'selected' : ''}>➡️ Wide Right</option>
              <option value="long" ${this.activeFilter.errorLocation === 'long' ? 'selected' : ''}>⬆️ Long Out</option>
            </select>
          </div>

          <!-- Cause / Diagnostic Filter -->
          <div>
            <label class="block text-[10px] text-slate-400 font-semibold mb-0.5">Cause / Error Reason</label>
            <select id="filter-cause" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] text-white">
              <option value="all">All Causes</option>
              <option value="spacing" ${this.activeFilter.errorCause === 'spacing' ? 'selected' : ''}>Spacing</option>
              <option value="let_ball" ${this.activeFilter.errorCause === 'let_ball' ? 'selected' : ''}>Let ball</option>
              <option value="above_shoulder" ${this.activeFilter.errorCause === 'above_shoulder' ? 'selected' : ''}>Above Shoulder</option>
              <option value="mindset" ${this.activeFilter.errorCause === 'mindset' ? 'selected' : ''}>Mindset</option>
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

        <div id="filtered-points-container" class="space-y-1.5 max-h-96 overflow-y-auto">
          ${this.renderPointLogHtml(allPoints, config)}
        </div>
      </section>
    `;
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
      if (pt.type === 'score_jump' || pt.isUntracked) return false;

      // 0. Quick filter chip
      if (f.quick === 'starred' && !pt.isStarred) return false;
      if (f.quick === 'pressure' && !pt.isPressurePoint) return false;
      if (f.quick === 'winners' && pt.outcome !== 'winner' && pt.outcome !== 'ace' && pt.outcome !== 'service_winner') return false;
      if (f.quick === 'ues' && pt.outcome !== 'unforced_error' && pt.outcome !== 'double_fault') return false;

      // 1. Level Filter (Set / Game / TB)
      if (f.level === 'set' && pt.setIndex !== f.setIndex) return false;
      if (f.level === 'game' && (pt.setIndex !== f.setIndex || pt.gameIndex !== f.gameIndex)) return false;
      if (f.level === 'tiebreak' && !pt.isTiebreak) return false;

      // 2. Event Player filter (Who hit the shot / made the error)
      if (f.player !== 'all') {
        const eventPlayer = pt.eventPlayer || (pt.outcome === 'unforced_error' || pt.outcome === 'forced_error' || pt.outcome === 'double_fault' ? (pt.winnerPlayer === 'P1' ? 'P2' : 'P1') : pt.winnerPlayer);
        if (eventPlayer !== f.player) return false;
      }

      // Serve Filter
      if (f.serve !== 'all') {
        const is2nd = (pt.serve === '2nd' || pt.outcome === 'double_fault');
        if (f.serve === '1st' && is2nd) return false;
        if (f.serve === '2nd' && !is2nd) return false;
      }

      // 3. Outcome filter
      if (f.outcome !== 'all' && pt.outcome !== f.outcome) return false;

      // 4. Shot Type filter
      if (f.shotType !== 'all' && pt.shotType !== f.shotType) return false;

      // 5. Court Position filter
      if (f.courtPosition !== 'all' && pt.courtPosition !== f.courtPosition) return false;

      // 6. Rally Length filter
      if (f.rallyLength !== 'all' && pt.rallyLength !== f.rallyLength) return false;

      // Miss Location Filter
      if (f.errorLocation !== 'all' && pt.errorLocation !== f.errorLocation) return false;

      // 7. Error Cause filter
      if (f.errorCause !== 'all' && pt.errorCause !== f.errorCause) return false;

      // 8. Text Search filter (ANDed)
      if (filterText) {
        const matchesComment = pt.comment && pt.comment.toLowerCase().includes(filterText);
        const matchesOutcome = pt.outcome && pt.outcome.toLowerCase().includes(filterText);
        const matchesShot = pt.shotType && pt.shotType.toLowerCase().includes(filterText);
        const matchesCause = pt.errorCause && pt.errorCause.toLowerCase().includes(filterText);
        const matchesLoc = pt.errorLocation && pt.errorLocation.toLowerCase().includes(filterText);
        if (!matchesComment && !matchesOutcome && !matchesShot && !matchesCause && !matchesLoc) return false;
      }

      return true;
    });
  }

  updateLogCounter() {
    const trackedPoints = this.engine.points.filter(p => !p.isUntracked && p.type !== 'score_jump');
    const total = trackedPoints.length;
    const filtered = this.getFilteredPoints(trackedPoints).length;
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
    const trackedPoints = points.filter(p => !p.isUntracked && p.type !== 'score_jump');
    if (trackedPoints.length === 0) {
      return '<div class="text-xs text-slate-400 italic text-center py-4">No points logged yet.</div>';
    }

    const filtered = this.getFilteredPoints(trackedPoints);
    if (filtered.length === 0) {
      return '<div class="text-xs text-amber-400 italic text-center py-4">No points match the selected filter combination.</div>';
    }

    return filtered.slice().reverse().map(pt => {
      const p1Name = config.p1Name || 'P1';
      const p2Name = config.p2Name || 'P2';
      const winnerName = pt.winnerPlayer === 'P1' ? p1Name : p2Name;
      const loserName = pt.winnerPlayer === 'P1' ? p2Name : p1Name;
      const serverName = pt.server === 'P1' ? p1Name : (pt.server === 'P2' ? p2Name : 'Server');
      const isP1Won = pt.winnerPlayer === 'P1';
      const ptNum = pt.trackedIndex || (pt.index + 1);
      const is2nd = (pt.serve === '2nd' || pt.outcome === 'double_fault');
      const isStar = pt.isStarred || false;
      const isPressure = TennisStats.isPointPressure(pt);

      // Determine Event Player (who hit the winner or committed the error)
      const isWinnerOutcome = (pt.outcome === 'winner' || pt.outcome === 'ace' || pt.outcome === 'service_winner');
      let eventPlayerName = '';
      if (pt.eventPlayer) {
        eventPlayerName = pt.eventPlayer === 'P1' ? p1Name : p2Name;
      } else {
        eventPlayerName = isWinnerOutcome ? winnerName : loserName;
      }

      // Point score context before the point was played
      const isTB = Boolean(pt.isTiebreak);
      const setNum = (pt.setIndex || 0) + 1;
      const gameNum = (pt.gameIndex || 0) + 1;
      const sBefore = pt.scoreBefore || {};
      const gameScore = `${sBefore.p1Games || 0}-${sBefore.p2Games || 0}`;
      const ptScore = `${sBefore.p1Display || '0'}-${sBefore.p2Display || '0'}`;

      let scoreContextLabel = '';
      if (isTB) {
        scoreContextLabel = `S${setNum} Match TB (${ptScore})`;
      } else {
        scoreContextLabel = `S${setNum} G${gameNum} [${gameScore}] • At ${ptScore}`;
      }

      return `
        <div class="p-2.5 rounded-xl bg-slate-950 border ${isStar ? 'border-amber-500/60 shadow-amber-950/20' : (isPressure ? 'border-orange-500/40' : 'border-slate-800/80')} text-xs space-y-2 transition-all">
          
          <!-- TOP HEADER ROW: POINT #, GAME/POINT SCORE, STAR & PRESSURE -->
          <div class="flex items-center justify-between border-b border-slate-900 pb-1.5">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[11px] font-mono font-bold text-slate-300">Pt #${ptNum}</span>
              <span class="text-slate-600">•</span>
              <span class="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/60">
                ${scoreContextLabel}
              </span>
              ${isPressure ? '<span class="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold text-orange-300 bg-orange-950/70 border border-orange-800">⚡ Pressure</span>' : ''}
            </div>
            
            <div class="flex items-center gap-2 shrink-0">
              <!-- STAR TOGGLE BUTTON -->
              <button 
                class="btn-toggle-pt-star text-base hover:scale-125 transition-transform" 
                data-pt-id="${pt.id}"
                title="${isStar ? 'Remove star' : 'Star point'}"
              >
                ${isStar ? '⭐️' : '☆'}
              </button>
            </div>
          </div>

          <!-- MIDDLE ROW: SERVER, EVENT ACTION, POINT WINNER -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px] bg-slate-900/70 p-2 rounded-lg border border-slate-800/60">
            <!-- Server -->
            <div class="flex items-center gap-1 text-slate-300">
              <span class="text-slate-400 font-semibold text-[10px]">🎾 Server:</span>
              <span class="font-bold text-white">${serverName}</span>
              <span class="text-[9px] px-1 py-0.2 rounded font-mono ${is2nd ? 'text-amber-400 bg-amber-950/60 border border-amber-800' : 'text-emerald-400 bg-emerald-950/60 border border-emerald-800'}">${is2nd ? '2nd' : '1st In'}</span>
            </div>

            <!-- Action & Event Player -->
            <div class="flex items-center gap-1 text-slate-300">
              <span class="text-slate-400 font-semibold text-[10px]">Action:</span>
              <span class="font-bold text-amber-300">${this.formatOutcomeDetailed(pt.outcome, eventPlayerName)}</span>
            </div>

            <!-- Point Winner -->
            <div class="flex items-center gap-1 sm:justify-end">
              <span class="text-slate-400 font-semibold text-[10px]">🏆 Winner:</span>
              <span class="font-extrabold ${isP1Won ? 'text-emerald-400' : 'text-indigo-400'}">${winnerName}</span>
            </div>
          </div>

          <!-- BOTTOM ROW: SHOT TYPE, POSITION, RALLY, MISS LOCATION, ERROR CAUSE -->
          <div class="flex items-center gap-1.5 text-[10px] text-slate-400 flex-wrap pt-0.5">
            ${pt.shotType ? `<span class="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-semibold text-slate-300 capitalize">${pt.shotType}</span>` : ''}
            ${pt.courtPosition ? `<span class="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">${this.formatPositionName(pt.courtPosition)}</span>` : ''}
            ${pt.rallyLength ? `<span class="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">Rally: ${pt.rallyLength}</span>` : ''}
            ${pt.errorLocation ? `<span class="bg-rose-950/60 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800/60">${TennisStats.formatLocation(pt.errorLocation)}</span>` : ''}
            ${pt.errorCause ? `<span class="bg-amber-950/60 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/60">${TennisStats.formatCause(pt.errorCause)}</span>` : ''}
          </div>

          <!-- COMMENTS / COACH OBSERVATIONS -->
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

  formatOutcomeDetailed(outcome, playerName) {
    const map = {
      'ace': `⚡ Ace by ${playerName}`,
      'service_winner': `🎾 Service Winner by ${playerName}`,
      'double_fault': `🚫 Double Fault by ${playerName}`,
      'winner': `🎯 Winner by ${playerName}`,
      'unforced_error': `⚠️ UE by ${playerName}`,
      'forced_error': `🛡️ Forced Error (${playerName})`,
    };
    return map[outcome] || `${outcome} by ${playerName}`;
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

    // Sub-tab Navigation (Overview, Wave, Pressure, Errors, Log)
    this.container.querySelectorAll('.btn-subtab').forEach(btn => {
      btn.onclick = () => {
        const tabKey = btn.getAttribute('data-tab');
        if (tabKey && this.activeTab !== tabKey) {
          this.activeTab = tabKey;
          this.render();
        }
      };
    });

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
      this.wirePointStarButtons();
    };

    // Quick chip buttons
    this.container.querySelectorAll('.btn-quick-chip').forEach(btn => {
      btn.onclick = () => {
        this.activeFilter.quick = btn.getAttribute('data-quick') || 'all';
        this.container.querySelectorAll('.btn-quick-chip').forEach(b => {
          b.className = `btn-quick-chip px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${b === btn ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800'}`;
        });
        updateFilteredLog();
      };
    });

    // Wave Mode Switches (Games vs Points)
    const btnModeGames = this.container.querySelector('#btn-wave-mode-games');
    if (btnModeGames) {
      btnModeGames.onclick = () => {
        this.momentumViewMode = 'games';
        this.render();
      };
    }

    const btnModePoints = this.container.querySelector('#btn-wave-mode-points');
    if (btnModePoints) {
      btnModePoints.onclick = () => {
        this.momentumViewMode = 'points';
        this.render();
      };
    }

    // Toggle Wide / Full Screen Wave
    const btnFullScreen = this.container.querySelector('#btn-toggle-fullscreen-wave');
    if (btnFullScreen) {
      btnFullScreen.onclick = () => {
        this.isFullScreenWave = !this.isFullScreenWave;
        this.render();
      };
    }

    // Game range preset chips
    this.container.querySelectorAll('.btn-game-range-chip').forEach(chip => {
      chip.onclick = () => {
        this.momentumGameFilter = chip.getAttribute('data-range') || 'all';
        this.render();
      };
    });

    // Custom game range selects
    const selStart = this.container.querySelector('#sel-wave-game-start');
    const selEnd = this.container.querySelector('#sel-wave-game-end');
    if (selStart && selEnd) {
      const handleGameSelect = () => {
        const s = parseInt(selStart.value, 10);
        const e = parseInt(selEnd.value, 10);
        if (s <= e) {
          this.momentumGameFilter = `${s}-${e}`;
        } else {
          this.momentumGameFilter = `${e}-${s}`;
        }
        this.render();
      };
      selStart.onchange = handleGameSelect;
      selEnd.onchange = handleGameSelect;
    }

    // Momentum dot click/hover listener (Both Touch & Mouse Support)
    const banner = this.container.querySelector('#momentum-detail-banner');
    this.container.querySelectorAll('.momentum-wave-dot').forEach(dot => {
      const handleDot = (e) => {
        e.stopPropagation();
        const type = dot.getAttribute('data-type');
        const winner = dot.getAttribute('data-winner');
        const val = dot.getAttribute('data-val');
        const desc = dot.getAttribute('data-desc') || '';
        const winnerName = winner === 'P1' ? this.engine.config.p1Name : this.engine.config.p2Name;
        const winnerColor = winner === 'P1' ? 'text-emerald-400' : 'text-indigo-400';

        if (banner) {
          if (type === 'game') {
            const gNum = dot.getAttribute('data-game-num');
            const srv = dot.getAttribute('data-srv');
            const p1Pts = dot.getAttribute('data-p1-pts');
            const p2Pts = dot.getAttribute('data-p2-pts');
            const p1W = dot.getAttribute('data-p1-w');
            const p2W = dot.getAttribute('data-p2-w');
            const p1UE = dot.getAttribute('data-p1-ue');
            const p2UE = dot.getAttribute('data-p2-ue');

            banner.innerHTML = `
              <div class="space-y-1 w-full">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-cyan-300 font-mono">Game #${gNum}</span>
                    <span class="font-bold ${winnerColor}">${winnerName} Held/Broke</span>
                    <span class="text-slate-400">(${desc})</span>
                  </div>
                  <div class="font-mono text-xs font-bold ${Number(val) >= 0 ? 'text-emerald-400' : 'text-indigo-400'}">
                    Momentum: ${Number(val) > 0 ? '+' : ''}${val}
                  </div>
                </div>
                <div class="flex items-center gap-3 text-[10px] text-slate-300 pt-0.5 border-t border-slate-900">
                  <span>🎾 Server: <strong class="text-white">${srv}</strong></span>
                  <span>Score: <strong class="text-emerald-400">${this.engine.config.p1Name} ${p1Pts}</strong> - <strong class="text-indigo-400">${this.engine.config.p2Name} ${p2Pts}</strong></span>
                  <span>Drivers: ${this.engine.config.p1Name} (${p1W}W / ${p1UE}UE) vs ${this.engine.config.p2Name} (${p2W}W / ${p2UE}UE)</span>
                </div>
              </div>
            `;
          } else {
            const ptNum = dot.getAttribute('data-pt-num');
            const outcome = dot.getAttribute('data-outcome') || '';

            banner.innerHTML = `
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2 text-slate-200">
                  <span class="font-bold text-amber-400 font-mono">Pt #${ptNum}</span>
                  <span class="font-bold ${winnerColor}">${winnerName} won</span>
                  <span class="text-slate-400">${this.formatOutcomeFull(outcome)}</span>
                  <span class="font-mono text-slate-300">${desc}</span>
                </div>
                <div class="font-mono text-xs font-bold ${Number(val) >= 0 ? 'text-emerald-400' : 'text-indigo-400'}">
                  Momentum: ${Number(val) > 0 ? '+' : ''}${val}
                </div>
              </div>
            `;
          }
        }
      };

      dot.addEventListener('mouseenter', handleDot);
      dot.addEventListener('click', handleDot);
      dot.addEventListener('touchstart', handleDot, { passive: true });
    });

    // Phase drilldown buttons
    this.container.querySelectorAll('.btn-drilldown-phase').forEach(btn => {
      btn.onclick = () => {
        const startIdx = parseInt(btn.getAttribute('data-start'), 10);
        const endIdx = parseInt(btn.getAttribute('data-end'), 10);
        this.activeTab = 'points';
        this.activeFilter.quick = 'all';
        this.render();
      };
    });

    // Button from Pressure tab to Points Log
    const btnViewPressureLog = this.container.querySelector('#btn-view-pressure-points-log');
    if (btnViewPressureLog) {
      btnViewPressureLog.onclick = () => {
        this.activeTab = 'points';
        this.activeFilter.quick = 'pressure';
        this.render();
      };
    }

    // Filter dropdowns
    const selPlayer = this.container.querySelector('#filter-player');
    if (selPlayer) selPlayer.onchange = (e) => { this.activeFilter.player = e.target.value; updateFilteredLog(); };

    const selServe = this.container.querySelector('#filter-serve');
    if (selServe) selServe.onchange = (e) => { this.activeFilter.serve = e.target.value; updateFilteredLog(); };

    const selOutcome = this.container.querySelector('#filter-outcome');
    if (selOutcome) selOutcome.onchange = (e) => { this.activeFilter.outcome = e.target.value; updateFilteredLog(); };

    const selShot = this.container.querySelector('#filter-shot');
    if (selShot) selShot.onchange = (e) => { this.activeFilter.shotType = e.target.value; updateFilteredLog(); };

    const selPos = this.container.querySelector('#filter-pos');
    if (selPos) selPos.onchange = (e) => { this.activeFilter.courtPosition = e.target.value; updateFilteredLog(); };

    const selRally = this.container.querySelector('#filter-rally');
    if (selRally) selRally.onchange = (e) => { this.activeFilter.rallyLength = e.target.value; updateFilteredLog(); };

    const selLoc = this.container.querySelector('#filter-location');
    if (selLoc) selLoc.onchange = (e) => { this.activeFilter.errorLocation = e.target.value; updateFilteredLog(); };

    const selCause = this.container.querySelector('#filter-cause');
    if (selCause) selCause.onchange = (e) => { this.activeFilter.errorCause = e.target.value; updateFilteredLog(); };

    const searchInput = this.container.querySelector('#input-search-comments');
    if (searchInput) searchInput.oninput = (e) => { this.activeFilter.searchComment = e.target.value; updateFilteredLog(); };

    const btnReset = this.container.querySelector('#btn-reset-filters');
    if (btnReset) {
      btnReset.onclick = () => {
        this.activeFilter.quick = 'all';
        this.activeFilter.player = 'all';
        this.activeFilter.serve = 'all';
        this.activeFilter.outcome = 'all';
        this.activeFilter.shotType = 'all';
        this.activeFilter.courtPosition = 'all';
        this.activeFilter.rallyLength = 'all';
        this.activeFilter.errorLocation = 'all';
        this.activeFilter.errorCause = 'all';
        this.activeFilter.searchComment = '';
        this.render();
      };
    }

    // Point star toggle buttons in points log
    this.wirePointStarButtons();

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

  wirePointStarButtons() {
    this.container.querySelectorAll('.btn-toggle-pt-star').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const ptId = btn.getAttribute('data-pt-id');
        if (ptId) {
          this.engine.togglePointStar(ptId);
          // Persist if needed
          if (this.engine.config.id && typeof TennisStorage !== 'undefined') {
            TennisStorage.saveMatch(this.engine.config, this.engine.points, this.engine.matchDurationMs);
          }
          this.render();
        }
      };
    });
  }
}
