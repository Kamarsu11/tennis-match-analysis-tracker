/**
 * Main Application Orchestrator & Router
 */

import { TennisEngine } from './engine/TennisEngine.js';
import { TennisStorage } from './db/storage.js';
import { MatchSetupComponent } from './components/MatchSetup.js';
import { PointTrackerComponent } from './components/PointTracker.js';
import { AnalyticsViewComponent } from './components/AnalyticsView.js';
import { MatchHistoryComponent } from './components/MatchHistory.js';
import { BackupRestoreComponent } from './components/BackupRestore.js';

class TennisApp {
  constructor() {
    this.appContainer = document.getElementById('app');
    this.currentView = 'setup'; // 'setup' | 'tracker' | 'analytics' | 'history' | 'backup'
    this.activeMatchId = null;
    this.activeEngine = null;

    this.init();
  }

  async init() {
    // Check if there is an in-progress match stored in local session
    const lastMatchId = localStorage.getItem('activeTennisMatchId');
    if (lastMatchId) {
      const match = await TennisStorage.getMatch(lastMatchId);
      if (match && !match.state?.matchComplete) {
        this.resumeMatch(match);
        return;
      }
    }

    this.navigate('setup');
  }

  async startNewMatch(matchConfig) {
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    this.activeMatchId = matchId;
    this.activeEngine = new TennisEngine(matchConfig);

    localStorage.setItem('activeTennisMatchId', matchId);
    await this.persistActiveMatch();

    this.navigate('tracker');
  }

  async resumeMatch(matchRecord) {
    this.activeMatchId = matchRecord.id;
    this.activeEngine = new TennisEngine(matchRecord.config);
    if (Array.isArray(matchRecord.points)) {
      matchRecord.points.forEach(pt => this.activeEngine.addPoint(pt));
    }

    localStorage.setItem('activeTennisMatchId', matchRecord.id);
    
    if (this.activeEngine.state.matchComplete) {
      this.navigate('analytics');
    } else {
      this.navigate('tracker');
    }
  }

  async persistActiveMatch() {
    if (!this.activeMatchId || !this.activeEngine) return;

    const matchRecord = {
      id: this.activeMatchId,
      config: this.activeEngine.config,
      points: this.activeEngine.points,
      state: this.activeEngine.state,
      updatedAt: Date.now(),
    };

    await TennisStorage.saveMatch(matchRecord);
  }

  navigate(viewName) {
    this.currentView = viewName;
    this.appContainer.innerHTML = '';

    switch (viewName) {
      case 'setup': {
        const setup = new MatchSetupComponent(
          this.appContainer,
          (config) => this.startNewMatch(config),
          (view) => this.navigate(view)
        );
        setup.init();
        break;
      }

      case 'tracker': {
        if (!this.activeEngine) {
          this.navigate('setup');
          return;
        }
        const tracker = new PointTrackerComponent(
          this.appContainer,
          this.activeEngine,
          async () => {
            await this.persistActiveMatch();
          },
          (view) => this.navigate(view)
        );
        tracker.render();
        break;
      }

      case 'analytics': {
        if (!this.activeEngine) {
          this.navigate('setup');
          return;
        }
        const analytics = new AnalyticsViewComponent(
          this.appContainer,
          this.activeEngine,
          (view) => this.navigate(view)
        );
        analytics.render();
        break;
      }

      case 'history': {
        const history = new MatchHistoryComponent(
          this.appContainer,
          (match) => this.resumeMatch(match),
          (view) => this.navigate(view)
        );
        history.init();
        break;
      }

      case 'backup': {
        const backup = new BackupRestoreComponent(
          this.appContainer,
          (view) => this.navigate(view)
        );
        backup.render();
        break;
      }
    }
  }
}

// Bootstrap on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.tennisApp = new TennisApp();
    });
  } else {
    window.tennisApp = new TennisApp();
  }
}
