/**
 * Pre-Match Setup & Configuration Component
 */

import { FORMAT_PRESETS } from '../engine/TennisEngine.js';
import { TennisStorage } from '../db/storage.js';

export class MatchSetupComponent {
  constructor(container, onStartMatch, onNavigate) {
    this.container = container;
    this.onStartMatch = onStartMatch;
    this.onNavigate = onNavigate;

    this.selectedPresetKey = 'STANDARD_BEST_OF_3';
    this.formData = {
      p1Name: '',
      p2Name: '',
      p1Child: false,
      p2Child: false,
      firstServer: 'P1',
      matchDate: new Date().toISOString().slice(0, 10),
      tournament: '',
      surface: 'hard', // hard, clay, grass, synthetic
      environment: 'outdoor',
      notes: '',
      // Rule overrides from preset
      ...FORMAT_PRESETS.STANDARD_BEST_OF_3,
    };
    this.savedPlayers = [];
  }

  async init() {
    this.savedPlayers = await TennisStorage.getAllPlayers();
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="setup-root flex flex-col h-full bg-slate-950 text-slate-100 select-none">
        
        <!-- HEADER -->
        <header class="bg-slate-900 border-b border-slate-800 px-4 py-3 shrink-0 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xl">🎾</span>
            <h1 class="text-base font-extrabold text-white">New Tennis Match Setup</h1>
          </div>
          <div class="flex items-center gap-1.5">
            <button id="btn-to-history" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 active:scale-95">
              📂 History
            </button>
            <button id="btn-to-backup-from-setup" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-semibold flex items-center gap-1 active:scale-95" title="Backup & Restore">
              💾 Backup
            </button>
          </div>
        </header>

        <!-- FORM SCROLLER -->
        <main class="flex-1 overflow-y-auto p-4 space-y-5 pb-28">
          
          <!-- PLAYERS CARD -->
          <section class="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-4">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Players Information</h2>

            <!-- Player 1 -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-slate-300">Player 1 Name *</label>
              <div class="flex items-center gap-2">
                <input id="input-p1-name" type="text" placeholder="e.g. Leo Smith" value="${this.formData.p1Name}" list="player-list" class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-bold">
                <button id="btn-toggle-p1-child" type="button" class="px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all active:scale-95 ${this.formData.p1Child ? 'bg-sky-900/60 border-sky-400 text-sky-200' : 'bg-slate-950 border-slate-800 text-slate-400'}">
                  ${this.formData.p1Child ? '⭐️ My Child' : 'Child?'}
                </button>
              </div>
            </div>

            <!-- Player 2 -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-slate-300">Player 2 Name *</label>
              <div class="flex items-center gap-2">
                <input id="input-p2-name" type="text" placeholder="e.g. Max Davis" value="${this.formData.p2Name}" list="player-list" class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-bold">
                <button id="btn-toggle-p2-child" type="button" class="px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all active:scale-95 ${this.formData.p2Child ? 'bg-sky-900/60 border-sky-400 text-sky-200' : 'bg-slate-950 border-slate-800 text-slate-400'}">
                  ${this.formData.p2Child ? '⭐️ My Child' : 'Child?'}
                </button>
              </div>
            </div>

            <datalist id="player-list">
              ${this.savedPlayers.map(p => `<option value="${p.name}">`).join('')}
            </datalist>

            <!-- First Server -->
            <div class="pt-2 border-t border-slate-800">
              <label class="block text-xs font-semibold text-slate-300 mb-2">Who Serves First?</label>
              <div class="grid grid-cols-2 gap-2">
                <button id="btn-server-p1" type="button" class="py-2.5 px-3 rounded-xl border text-xs font-bold transition-all active:scale-95 ${this.formData.firstServer === 'P1' ? 'bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-950 border-slate-800 text-slate-300'}">
                  🎾 ${this.formData.p1Name || 'Player 1'}
                </button>
                <button id="btn-server-p2" type="button" class="py-2.5 px-3 rounded-xl border text-xs font-bold transition-all active:scale-95 ${this.formData.firstServer === 'P2' ? 'bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-950 border-slate-800 text-slate-300'}">
                  🎾 ${this.formData.p2Name || 'Player 2'}
                </button>
              </div>
            </div>
          </section>

          <!-- MATCH FORMAT PRESETS -->
          <section class="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Match & Scoring Format</h2>

            <div class="space-y-2">
              ${Object.entries(FORMAT_PRESETS).map(([key, preset]) => `
                <button type="button" data-preset="${key}" class="btn-preset-select w-full p-3 rounded-xl border text-left transition-all active:scale-[0.99] ${this.selectedPresetKey === key ? 'bg-emerald-950/60 border-emerald-500 text-white ring-1 ring-emerald-500/40' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold">${preset.name}</span>
                    ${this.selectedPresetKey === key ? '<span class="text-emerald-400 text-xs font-bold">Selected ✓</span>' : ''}
                  </div>
                  <div class="text-[11px] text-slate-400 mt-1">
                    ${preset.bestOf > 1 ? `Best of ${preset.bestOf} sets` : '1 Set'} • ${preset.gamesPerSet} games per set • ${preset.advantageScoring ? 'Advantage Scoring' : 'No-Ad Scoring'}
                    ${preset.startGamesP1 > 0 ? ` • Starts ${preset.startGamesP1}-${preset.startGamesP2}` : ''}
                    ${preset.finalSetType === 'tiebreak' ? ` • Set ${preset.bestOf} is ${preset.finalSetTiebreakTarget}-pt Match TB` : ''}
                  </div>
                </button>
              `).join('')}
            </div>

            <!-- Custom Rule Options Toggles -->
            <div class="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
              <button id="btn-toggle-advantage" type="button" class="p-2.5 rounded-xl border font-semibold flex items-center justify-between ${this.formData.advantageScoring ? 'bg-indigo-950 border-indigo-500 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400'}">
                <span>Advantage Scoring</span>
                <span>${this.formData.advantageScoring ? 'ON' : 'NO-AD'}</span>
              </button>

              <button id="btn-toggle-tbwin2" type="button" class="p-2.5 rounded-xl border font-semibold flex items-center justify-between ${this.formData.tiebreakWinBy2 ? 'bg-indigo-950 border-indigo-500 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-400'}">
                <span>TB Win By 2</span>
                <span>${this.formData.tiebreakWinBy2 ? 'YES' : 'NO'}</span>
              </button>
            </div>
          </section>

          <!-- OPTIONAL CONTEXT (Date, Tournament, Surface) -->
          <section class="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Match Details</h2>

            <div class="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label class="block text-slate-400 mb-1 font-semibold">Match Date</label>
                <input id="input-match-date" type="date" value="${this.formData.matchDate}" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white">
              </div>

              <div>
                <label class="block text-slate-400 mb-1 font-semibold">Tournament / Event</label>
                <input id="input-tournament" type="text" placeholder="e.g. Junior Open U14" value="${this.formData.tournament}" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label class="block text-slate-400 mb-1 font-semibold">Court Surface</label>
                <select id="select-surface" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white">
                  <option value="hard" ${this.formData.surface === 'hard' ? 'selected' : ''}>Hard Court</option>
                  <option value="clay" ${this.formData.surface === 'clay' ? 'selected' : ''}>Clay</option>
                  <option value="grass" ${this.formData.surface === 'grass' ? 'selected' : ''}>Grass</option>
                  <option value="synthetic" ${this.formData.surface === 'synthetic' ? 'selected' : ''}>Synthetic / Astro</option>
                </select>
              </div>

              <div>
                <label class="block text-slate-400 mb-1 font-semibold">Environment</label>
                <select id="select-env" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white">
                  <option value="outdoor" ${this.formData.environment === 'outdoor' ? 'selected' : ''}>Outdoor</option>
                  <option value="indoor" ${this.formData.environment === 'indoor' ? 'selected' : ''}>Indoor</option>
                </select>
              </div>
            </div>
          </section>

        </main>

        <!-- START MATCH BUTTON -->
        <footer class="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur border-t border-slate-800 max-w-md mx-auto z-20">
          <button id="btn-start-match" type="button" class="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-base shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-2">
            <span>🚀 Start Live Match Tracking</span>
          </button>
        </footer>

      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    // Navigate to history & backup
    const btnHist = this.container.querySelector('#btn-to-history');
    if (btnHist) btnHist.onclick = () => this.onNavigate('history');

    const btnBackup = this.container.querySelector('#btn-to-backup-from-setup');
    if (btnBackup) btnBackup.onclick = () => this.onNavigate('backup');

    // Inputs
    const p1In = this.container.querySelector('#input-p1-name');
    if (p1In) p1In.oninput = (e) => {
      this.formData.p1Name = e.target.value;
      this.updateServerLabels();
    };

    const p2In = this.container.querySelector('#input-p2-name');
    if (p2In) p2In.oninput = (e) => {
      this.formData.p2Name = e.target.value;
      this.updateServerLabels();
    };

    // Child toggles
    const p1ChildBtn = this.container.querySelector('#btn-toggle-p1-child');
    if (p1ChildBtn) p1ChildBtn.onclick = () => {
      this.formData.p1Child = !this.formData.p1Child;
      this.render();
    };

    const p2ChildBtn = this.container.querySelector('#btn-toggle-p2-child');
    if (p2ChildBtn) p2ChildBtn.onclick = () => {
      this.formData.p2Child = !this.formData.p2Child;
      this.render();
    };

    // Server choice
    const s1Btn = this.container.querySelector('#btn-server-p1');
    if (s1Btn) s1Btn.onclick = () => {
      this.formData.firstServer = 'P1';
      this.render();
    };

    const s2Btn = this.container.querySelector('#btn-server-p2');
    if (s2Btn) s2Btn.onclick = () => {
      this.formData.firstServer = 'P2';
      this.render();
    };

    // Preset selector
    this.container.querySelectorAll('.btn-preset-select').forEach(btn => {
      btn.onclick = () => {
        const key = btn.getAttribute('data-preset');
        this.selectedPresetKey = key;
        const preset = FORMAT_PRESETS[key];
        this.formData = {
          ...this.formData,
          ...preset,
        };
        this.render();
      };
    });

    // Rule toggles
    const advBtn = this.container.querySelector('#btn-toggle-advantage');
    if (advBtn) advBtn.onclick = () => {
      this.formData.advantageScoring = !this.formData.advantageScoring;
      this.render();
    };

    const tbWin2Btn = this.container.querySelector('#btn-toggle-tbwin2');
    if (tbWin2Btn) tbWin2Btn.onclick = () => {
      this.formData.tiebreakWinBy2 = !this.formData.tiebreakWinBy2;
      this.render();
    };

    // Start match
    const startBtn = this.container.querySelector('#btn-start-match');
    if (startBtn) {
      startBtn.onclick = async () => {
        const p1 = (this.formData.p1Name || '').trim() || 'Player 1';
        const p2 = (this.formData.p2Name || '').trim() || 'Player 2';

        // Auto save players to directory
        await TennisStorage.savePlayer({ name: p1, isChild: this.formData.p1Child });
        await TennisStorage.savePlayer({ name: p2, isChild: this.formData.p2Child });

        const matchConfig = {
          ...this.formData,
          p1Name: p1,
          p2Name: p2,
          matchDate: this.container.querySelector('#input-match-date')?.value || this.formData.matchDate,
          tournament: this.container.querySelector('#input-tournament')?.value || '',
          surface: this.container.querySelector('#select-surface')?.value || 'hard',
          environment: this.container.querySelector('#select-env')?.value || 'outdoor',
        };

        this.onStartMatch(matchConfig);
      };
    }
  }

  updateServerLabels() {
    const s1 = this.container.querySelector('#btn-server-p1');
    const s2 = this.container.querySelector('#btn-server-p2');
    if (s1) s1.innerHTML = `🎾 ${this.formData.p1Name || 'Player 1'}`;
    if (s2) s2.innerHTML = `🎾 ${this.formData.p2Name || 'Player 2'}`;
  }
}
