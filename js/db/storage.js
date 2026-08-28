/**
 * Local-First IndexedDB Storage & CSV/JSON Backup/Restore Layer
 */

const DB_NAME = 'TennisMatchAnalysisDB';
const DB_VERSION = 1;

export class TennisStorage {
  static dbInstance = null;

  static async getDB() {
    if (this.dbInstance) return this.dbInstance;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Matches store
        if (!db.objectStoreNames.contains('matches')) {
          const matchStore = db.createObjectStore('matches', { keyPath: 'id' });
          matchStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          matchStore.createIndex('p1Name', 'config.p1Name', { unique: false });
          matchStore.createIndex('p2Name', 'config.p2Name', { unique: false });
        }

        // Players directory
        if (!db.objectStoreNames.contains('players')) {
          const playerStore = db.createObjectStore('players', { keyPath: 'id' });
          playerStore.createIndex('name', 'name', { unique: true });
        }

        // App settings & preferences
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.dbInstance = event.target.result;
        resolve(this.dbInstance);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  static async saveMatch(matchData) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['matches'], 'readwrite');
      const store = tx.objectStore('matches');
      const record = {
        ...matchData,
        updatedAt: Date.now(),
      };
      const request = store.put(record);
      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  }

  static async getMatch(id) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['matches'], 'readonly');
      const store = tx.objectStore('matches');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  static async getAllMatches() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['matches'], 'readonly');
      const store = tx.objectStore('matches');
      const request = store.getAll();
      request.onsuccess = () => {
        const matches = (request.result || []).sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(matches);
      };
      request.onerror = () => reject(request.error);
    });
  }

  static async deleteMatch(id) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['matches'], 'readwrite');
      const store = tx.objectStore('matches');
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all matches and players (wipe database)
   */
  static async clearAllData() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['matches', 'players', 'settings'], 'readwrite');
      tx.objectStore('matches').clear();
      tx.objectStore('players').clear();
      tx.objectStore('settings').clear();
      tx.oncomplete = () => {
        localStorage.removeItem('activeTennisMatchId');
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  static async savePlayer(player) {
    if (!player || !player.name || !player.name.trim()) return null;
    const db = await this.getDB();
    const cleanName = player.name.trim();

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(['players'], 'readwrite');
        const store = tx.objectStore('players');
        const index = store.index('name');
        const getReq = index.get(cleanName);

        getReq.onsuccess = () => {
          const existing = getReq.result;
          const record = {
            id: existing ? existing.id : (player.id || `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`),
            name: cleanName,
            isChild: player.isChild !== undefined ? player.isChild : (existing?.isChild || false),
            hand: player.hand || existing?.hand || 'right',
            updatedAt: Date.now(),
          };
          const putReq = store.put(record);
          putReq.onsuccess = () => resolve(record);
          putReq.onerror = () => resolve(null);
        };

        getReq.onerror = () => resolve(null);
        tx.onerror = () => resolve(null);
      } catch (err) {
        console.warn('Could not save player to directory:', err);
        resolve(null);
      }
    });
  }

  static async getAllPlayers() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['players'], 'readonly');
      const store = tx.objectStore('players');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // --- CSV & JSON EXPORT / IMPORT ---

  /**
   * Convert point records to detailed CSV string
   */
  static generateMatchCSV(match) {
    const headers = [
      'Point #',
      'Set',
      'Game',
      'Score Before P1',
      'Score Before P2',
      'Server',
      'Receiver',
      'Serving Side',
      'Is Break Point',
      'Is Game Point',
      'Is Set Point',
      'Is Match Point',
      'Point Winner',
      'Outcome',
      'Shot Type',
      'Court Position',
      'Rally Length',
      'Net Approach',
      'Error / Forcing Cause',
      'Comment',
      'Timestamp',
    ];

    const rows = (match.points || []).map((pt, idx) => {
      if (pt.type === 'score_jump' || pt.isUntracked) {
        return [
          idx + 1,
          (pt.setIndex || 0) + 1,
          (pt.gameIndex || 0) + 1,
          '""',
          '""',
          '""',
          '""',
          '',
          'NO',
          'NO',
          'NO',
          'NO',
          '""',
          'SCORE_JUMP',
          '',
          '',
          '',
          '',
          '""',
          `"${(pt.summary || pt.comment || 'Score Jump').replace(/"/g, '""')}"`,
          new Date(pt.timestamp || Date.now()).toISOString(),
        ].join(',');
      }

      const winnerName = pt.winnerPlayer === 'P1' ? match.config.p1Name : match.config.p2Name;
      const serverName = pt.server === 'P1' ? match.config.p1Name : match.config.p2Name;
      const receiverName = pt.receiver === 'P1' ? match.config.p1Name : match.config.p2Name;

      return [
        idx + 1,
        (pt.setIndex || 0) + 1,
        (pt.gameIndex || 0) + 1,
        pt.scoreBefore ? `"${pt.scoreBefore.p1Display}"` : '""',
        pt.scoreBefore ? `"${pt.scoreBefore.p2Display}"` : '""',
        `"${serverName}"`,
        `"${receiverName}"`,
        pt.servingSide || '',
        pt.isBreakPoint ? 'YES' : 'NO',
        pt.isGamePoint ? 'YES' : 'NO',
        pt.isSetPoint ? 'YES' : 'NO',
        pt.isMatchPoint ? 'YES' : 'NO',
        `"${winnerName}"`,
        pt.outcome || '',
        pt.shotType || '',
        pt.courtPosition || '',
        pt.rallyLength || '',
        pt.netApproach || '',
        pt.errorCause ? `"${pt.errorCause}"` : '',
        pt.comment ? `"${pt.comment.replace(/"/g, '""')}"` : '""',
        new Date(pt.timestamp || Date.now()).toISOString(),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Convert all matches in database to a single consolidated CSV string
   */
  static generateAllMatchesCSV(matches) {
    const headers = [
      'Match ID',
      'Match Date',
      'Tournament',
      'Surface',
      'Environment',
      'Player 1',
      'P1 Is Child',
      'Player 2',
      'P2 Is Child',
      'Match Format',
      'Match Complete',
      'Match Winner',
      'Point #',
      'Set',
      'Game',
      'Score Before P1',
      'Score Before P2',
      'Server',
      'Receiver',
      'Serving Side',
      'Is Break Point',
      'Is Game Point',
      'Is Set Point',
      'Is Match Point',
      'Event Player',
      'Point Winner',
      'Outcome',
      'Shot Type',
      'Court Position',
      'Rally Length',
      'Net Approach',
      'Error / Forcing Cause',
      'Comment',
      'Timestamp',
    ];

    const rows = [];

    (matches || []).forEach(match => {
      const config = match.config || {};
      const p1Name = config.p1Name || 'Player 1';
      const p2Name = config.p2Name || 'Player 2';
      const matchWinnerName = match.state?.matchWinner ? (match.state.matchWinner === 'P1' ? p1Name : p2Name) : '';

      (match.points || []).forEach((pt, idx) => {
        const winnerName = pt.winnerPlayer === 'P1' ? p1Name : p2Name;
        const serverName = pt.server === 'P1' ? p1Name : p2Name;
        const receiverName = pt.receiver === 'P1' ? p1Name : p2Name;
        const eventPlayerCode = pt.eventPlayer || (pt.outcome === 'unforced_error' || pt.outcome === 'forced_error' || pt.outcome === 'double_fault' ? (pt.winnerPlayer === 'P1' ? 'P2' : 'P1') : pt.winnerPlayer);
        const eventPlayerName = eventPlayerCode === 'P1' ? p1Name : p2Name;

        rows.push([
          `"${match.id}"`,
          `"${config.matchDate || ''}"`,
          `"${config.tournament ? config.tournament.replace(/"/g, '""') : ''}"`,
          `"${config.surface || ''}"`,
          `"${config.environment || ''}"`,
          `"${p1Name.replace(/"/g, '""')}"`,
          config.p1Child ? 'YES' : 'NO',
          `"${p2Name.replace(/"/g, '""')}"`,
          config.p2Child ? 'YES' : 'NO',
          `"${config.name || 'Standard'}"`,
          match.state?.matchComplete ? 'YES' : 'NO',
          `"${matchWinnerName}"`,
          idx + 1,
          (pt.setIndex || 0) + 1,
          (pt.gameIndex || 0) + 1,
          pt.scoreBefore ? `"${pt.scoreBefore.p1Display}"` : '""',
          pt.scoreBefore ? `"${pt.scoreBefore.p2Display}"` : '""',
          `"${serverName}"`,
          `"${receiverName}"`,
          pt.servingSide || '',
          pt.isBreakPoint ? 'YES' : 'NO',
          pt.isGamePoint ? 'YES' : 'NO',
          pt.isSetPoint ? 'YES' : 'NO',
          pt.isMatchPoint ? 'YES' : 'NO',
          `"${eventPlayerName}"`,
          `"${winnerName}"`,
          pt.outcome || '',
          pt.shotType || '',
          pt.courtPosition || '',
          pt.rallyLength || '',
          pt.netApproach || '',
          pt.errorCause ? `"${pt.errorCause}"` : '',
          pt.comment ? `"${pt.comment.replace(/"/g, '""')}"` : '""',
          new Date(pt.timestamp || Date.now()).toISOString(),
        ].join(','));
      });
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Export all database records to JSON string
   */
  static async exportFullBackupJSON() {
    const matches = await this.getAllMatches();
    const players = await this.getAllPlayers();

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      appName: 'TennisMatchAnalysis',
      matches,
      players,
    };

    return JSON.stringify(backup, null, 2);
  }

  /**
   * Restore all database records from JSON
   */
  static async importFullBackupJSON(jsonString) {
    const data = JSON.parse(jsonString);
    if (!data || !Array.isArray(data.matches)) {
      throw new Error('Invalid backup file format.');
    }

    const db = await this.getDB();
    const tx = db.transaction(['matches', 'players'], 'readwrite');
    const matchStore = tx.objectStore('matches');
    const playerStore = tx.objectStore('players');

    for (const match of data.matches) {
      matchStore.put(match);
    }

    if (Array.isArray(data.players)) {
      for (const player of data.players) {
        playerStore.put(player);
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve({ matchesCount: data.matches.length });
      tx.onerror = () => reject(tx.error);
    });
  }
}
