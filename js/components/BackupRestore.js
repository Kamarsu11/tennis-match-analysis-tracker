/**
 * Backup & Restore Component
 * Allows exporting the full IndexedDB database to a single JSON file and restoring it safely.
 */

import { TennisStorage } from '../db/storage.js';

export class BackupRestoreComponent {
  constructor(container, onNavigate) {
    this.container = container;
    this.onNavigate = onNavigate;
  }

  render() {
    this.container.innerHTML = `
      <div class="backup-root flex flex-col h-full bg-slate-950 text-slate-100 select-none">
        
        <!-- HEADER -->
        <header class="bg-slate-900 border-b border-slate-800 px-4 py-3 shrink-0 flex items-center justify-between">
          <button id="btn-back-setup" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 active:scale-95">
            ← Match Setup
          </button>
          <h1 class="text-base font-extrabold text-white">Data Backup & Export</h1>
          <div></div>
        </header>

        <!-- CONTENT -->
        <main class="flex-1 overflow-y-auto p-4 space-y-5 pb-16">
          
          <!-- CSV EXPORT (ALL MATCHES) -->
          <section class="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
            <div class="flex items-center gap-2">
              <span class="text-xl">📊</span>
              <h2 class="text-sm font-bold text-white">Export All Matches (Consolidated CSV)</h2>
            </div>
            <p class="text-xs text-slate-400">
              Download every point from all recorded matches across the entire application into a single consolidated CSV file for Excel, Pandas, or Python analysis.
            </p>
            <button id="btn-download-all-csv" class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2">
              <span>📥 Export All Matches Combined (CSV)</span>
            </button>
          </section>

          <!-- JSON BACKUP SECTION -->
          <section class="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
            <div class="flex items-center gap-2">
              <span class="text-xl">💾</span>
              <h2 class="text-sm font-bold text-white">Full Database Backup (JSON)</h2>
            </div>
            <p class="text-xs text-slate-400">
              Download a complete offline backup of all your saved matches, points, player profiles, and notes into a single JSON file.
            </p>
            <button id="btn-download-backup" class="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2">
              <span>📥 Download Full JSON Backup</span>
            </button>
          </section>

          <!-- RESTORE SECTION -->
          <section class="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
            <div class="flex items-center gap-2">
              <span class="text-xl">🔄</span>
              <h2 class="text-sm font-bold text-white">Restore from Backup File</h2>
            </div>
            <p class="text-xs text-slate-400">
              Select a previously exported JSON backup file to restore your matches. Existing matches with the same ID will be updated.
            </p>
            <label class="block">
              <input id="input-restore-file" type="file" accept=".json" class="hidden">
              <div class="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs text-center cursor-pointer active:scale-95">
                📂 Select JSON File to Restore
              </div>
            </label>
            <div id="restore-status" class="text-xs text-center font-semibold text-emerald-400 hidden"></div>
          </section>

          <!-- CLEAR ALL DATA SECTION -->
          <section class="bg-rose-950/30 rounded-2xl p-4 border border-rose-900/60 space-y-3">
            <div class="flex items-center gap-2">
              <span class="text-xl">🗑️</span>
              <h2 class="text-sm font-bold text-rose-300">Clear All Match Data (Reset)</h2>
            </div>
            <p class="text-xs text-rose-200/70">
              Permanently delete all matches, recorded points, and player history from this device (useful when you want to clear test data).
            </p>
            <button id="btn-wipe-all-data" class="w-full py-2.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-white font-bold text-xs border border-rose-700 shadow-md active:scale-95">
              ⚠️ Wipe All Data & Reset Application
            </button>
          </section>

          <!-- PWA INSTALL INFO -->
          <section class="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2 text-xs text-slate-400">
            <h3 class="font-bold text-slate-200 flex items-center gap-1.5">
              <span>📱</span> iOS Home Screen Installation
            </h3>
            <p>1. Open this website in Safari on your iPhone.</p>
            <p>2. Tap the <strong>Share</strong> button (box with upward arrow) at the bottom.</p>
            <p>3. Select <strong>Add to Home Screen</strong>.</p>
            <p>4. Launch the app directly from your home screen for full-screen offline courtside analysis!</p>
          </section>

        </main>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const btnBack = this.container.querySelector('#btn-back-setup');
    if (btnBack) btnBack.onclick = () => this.onNavigate('setup');

    // Download All Matches CSV
    const btnAllCsv = this.container.querySelector('#btn-download-all-csv');
    if (btnAllCsv) {
      btnAllCsv.onclick = async () => {
        const matches = await TennisStorage.getAllMatches();
        if (!matches || matches.length === 0) {
          alert('No matches found to export.');
          return;
        }
        const csv = TennisStorage.generateAllMatchesCSV(matches);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `All_Tennis_Matches_Consolidated_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      };
    }

    // Download JSON
    const btnDownload = this.container.querySelector('#btn-download-backup');
    if (btnDownload) {
      btnDownload.onclick = async () => {
        const json = await TennisStorage.exportFullBackupJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Tennis_Match_Analysis_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      };
    }

    // Restore JSON
    const fileInput = this.container.querySelector('#input-restore-file');
    const statusDiv = this.container.querySelector('#restore-status');
    if (fileInput) {
      fileInput.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
          const text = await file.text();
          const res = await TennisStorage.importFullBackupJSON(text);
          if (statusDiv) {
            statusDiv.textContent = `✓ Successfully restored ${res.matchesCount} matches!`;
            statusDiv.classList.remove('hidden');
          }
        } catch (err) {
          alert(`Failed to restore: ${err.message}`);
        }
      };
    }

    // Wipe all data
    const btnWipe = this.container.querySelector('#btn-wipe-all-data');
    if (btnWipe) {
      btnWipe.onclick = async () => {
        if (confirm('Are you sure you want to PERMANENTLY delete all recorded matches and data? This cannot be undone.')) {
          await TennisStorage.clearAllData();
          alert('All match data and history has been cleared.');
          this.onNavigate('setup');
        }
      };
    }
  }
}
