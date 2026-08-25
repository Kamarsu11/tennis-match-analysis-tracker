/**
 * Saved Matches & History Component
 */

import { TennisStorage } from '../db/storage.js';

export class MatchHistoryComponent {
  constructor(container, onResumeMatch, onNavigate) {
    this.container = container;
    this.onResumeMatch = onResumeMatch;
    this.onNavigate = onNavigate;
    this.matches = [];
  }

  async init() {
    this.matches = await TennisStorage.getAllMatches();
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="history-root flex flex-col h-full bg-slate-950 text-slate-100 select-none">
        
        <!-- HEADER -->
        <header class="bg-slate-900 border-b border-slate-800 px-4 py-3 shrink-0 flex items-center justify-between">
          <button id="btn-back-setup" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 active:scale-95">
            ← New Match
          </button>
          <h1 class="text-base font-extrabold text-white">Match History & Archives</h1>
          <div></div>
        </header>

        <!-- MATCH LIST -->
        <main class="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
          ${this.matches.length === 0 ? `
            <div class="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <span class="text-4xl">📂</span>
              <p class="text-sm text-slate-400">No saved matches yet.</p>
              <button id="btn-start-first-match" class="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg active:scale-95">
                + Create First Match
              </button>
            </div>
          ` : this.matches.map(m => this.renderMatchCard(m)).join('')}
        </main>
      </div>
    `;

    this.attachEventListeners();
  }

  renderMatchCard(match) {
    const config = match.config || {};
    const ptsCount = (match.points || []).filter(p => !p.isUntracked && p.type !== 'score_jump').length;
    const isComplete = match.state?.matchComplete || false;
    const dateStr = new Date(match.updatedAt || Date.now()).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return `
      <div class="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3 shadow-md">
        <div class="flex items-center justify-between">
          <span class="text-[11px] text-slate-400 font-medium">${dateStr} ${config.tournament ? `• ${config.tournament}` : ''}</span>
          ${isComplete ? '<span class="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-800">Final</span>' : '<span class="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-800 animate-pulse">In Progress</span>'}
        </div>

        <div class="space-y-1">
          <div class="text-base font-extrabold text-white flex items-center justify-between">
            <span class="truncate">${config.p1Name} ${config.p1Child ? '⭐️' : ''} vs ${config.p2Name} ${config.p2Child ? '⭐️' : ''}</span>
          </div>
          <div class="text-xs text-slate-400">
            ${config.name || 'Custom Match'} • ${ptsCount} points logged
          </div>
        </div>

        <div class="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs">
          <button data-resume-id="${match.id}" class="btn-resume-match flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-center active:scale-95">
            ${isComplete ? '📊 View Analytics' : '🎾 Resume Match'}
          </button>
          <button data-csv-id="${match.id}" class="btn-download-match-csv px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold active:scale-95" title="Download CSV">
            📥 CSV
          </button>
          <button data-delete-id="${match.id}" class="btn-delete-match p-2 rounded-xl bg-rose-950/40 text-rose-400 border border-rose-900/60 hover:bg-rose-900/60 font-semibold active:scale-95" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const btnBack = this.container.querySelector('#btn-back-setup');
    if (btnBack) btnBack.onclick = () => this.onNavigate('setup');

    const btnFirst = this.container.querySelector('#btn-start-first-match');
    if (btnFirst) btnFirst.onclick = () => this.onNavigate('setup');

    // Resume / View
    this.container.querySelectorAll('.btn-resume-match').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-resume-id');
        const match = this.matches.find(m => m.id === id);
        if (match) this.onResumeMatch(match);
      };
    });

    // CSV Download
    this.container.querySelectorAll('.btn-download-match-csv').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-csv-id');
        const match = this.matches.find(m => m.id === id);
        if (match) {
          const csv = TennisStorage.generateMatchCSV(match);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const p1 = (match.config.p1Name || 'P1').replace(/\s+/g, '_');
          const p2 = (match.config.p2Name || 'P2').replace(/\s+/g, '_');
          a.download = `Tennis_${p1}_vs_${p2}_${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }
      };
    });

    // Delete Match
    this.container.querySelectorAll('.btn-delete-match').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-delete-id');
        if (confirm('Are you sure you want to delete this match record?')) {
          await TennisStorage.deleteMatch(id);
          this.init();
        }
      };
    });
  }
}
