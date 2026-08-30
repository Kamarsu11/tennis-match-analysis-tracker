/**
 * Tennis Match Statistical Calculation Engine
 * Provides comprehensive hierarchical analytics at Match, Set, Game, and Tie-Break levels.
 */

export class TennisStats {
  /**
   * Calculate full analytics for a given list of points and match config
   * @param {Array} points - Array of point records from TennisEngine
   * @param {Object} config - Match configuration object
   * @param {Object} filter - Optional { setIndex?: number, gameIndex?: number, isTiebreak?: boolean }
   */
  static calculate(points, config, filter = {}) {
    let filteredPoints = (points || []).filter(p => !p.isUntracked && p.type !== 'score_jump');

    if (filter.setIndex !== undefined) {
      filteredPoints = filteredPoints.filter(p => p.setIndex === filter.setIndex);
    }
    if (filter.gameIndex !== undefined) {
      filteredPoints = filteredPoints.filter(p => p.gameIndex === filter.gameIndex);
    }
    if (filter.isTiebreak !== undefined) {
      filteredPoints = filteredPoints.filter(p => p.isTiebreak === filter.isTiebreak);
    }

    const p1Stats = this.initPlayerStats(config.p1Name || 'Player 1');
    const p2Stats = this.initPlayerStats(config.p2Name || 'Player 2');

    const matchSummary = {
      totalPoints: filteredPoints.length,
      p1PointsWon: 0,
      p2PointsWon: 0,
      rallyDistribution: {
        '1-4': { total: 0, p1Won: 0, p2Won: 0, p1Winners: 0, p2Winners: 0, p1UEs: 0, p2UEs: 0, p1FEs: 0, p2FEs: 0 },
        '5-8': { total: 0, p1Won: 0, p2Won: 0, p1Winners: 0, p2Winners: 0, p1UEs: 0, p2UEs: 0, p1FEs: 0, p2FEs: 0 },
        '9+':  { total: 0, p1Won: 0, p2Won: 0, p1Winners: 0, p2Winners: 0, p1UEs: 0, p2UEs: 0, p1FEs: 0, p2FEs: 0 },
        'unspecified': { total: 0, p1Won: 0, p2Won: 0 }
      },
      P1: p1Stats,
      P2: p2Stats,
    };

    filteredPoints.forEach(pt => {
      const winner = pt.winnerPlayer;
      const loser = winner === 'P1' ? 'P2' : 'P1';
      const server = pt.server;
      const receiver = pt.receiver;
      const winnerStats = winner === 'P1' ? p1Stats : p2Stats;
      const loserStats = loser === 'P1' ? p1Stats : p2Stats;
      const serverStats = server === 'P1' ? p1Stats : p2Stats;
      const receiverStats = receiver === 'P1' ? p1Stats : p2Stats;

      // Basic point totals
      if (winner === 'P1') matchSummary.p1PointsWon++;
      else matchSummary.p2PointsWon++;

      winnerStats.totalPointsWon++;
      loserStats.totalPointsLost++;

      // Serving & Returning Totals
      serverStats.servePointsTotal++;
      receiverStats.returnPointsTotal++;

      // 1st vs 2nd Serve tracking
      // (Double faults are always 2nd serve faults; otherwise check pt.serve === '2nd')
      const isSecondServe = (pt.serve === '2nd' || pt.outcome === 'double_fault');
      const isFirstServeIn = !isSecondServe;

      if (isFirstServeIn) {
        serverStats.firstServesIn++;
        if (winner === server) {
          serverStats.firstServePointsWon++;
        } else {
          receiverStats.firstServeReturnPointsWon++;
        }
      } else {
        serverStats.secondServesTotal++;
        if (winner === server) {
          serverStats.secondServePointsWon++;
        } else {
          receiverStats.secondServeReturnPointsWon++;
        }
      }

      if (winner === server) {
        serverStats.servePointsWon++;
      } else {
        receiverStats.returnPointsWon++;
      }

      // Break Points
      if (pt.isBreakPoint) {
        serverStats.breakPointsFaced++;
        receiverStats.breakPointsOpportunities++;

        if (winner === server) {
          serverStats.breakPointsSaved++;
        } else {
          receiverStats.breakPointsConverted++;
        }
      }

      // Rally Bracket Handling
      const rallyBracket = pt.rallyLength || (pt.outcome === 'ace' || pt.outcome === 'double_fault' || pt.outcome === 'service_winner' ? '1-4' : 'unspecified');
      if (matchSummary.rallyDistribution[rallyBracket]) {
        const rDist = matchSummary.rallyDistribution[rallyBracket];
        rDist.total++;
        if (winner === 'P1') rDist.p1Won++;
        else rDist.p2Won++;

        if (pt.outcome === 'winner' || pt.outcome === 'ace') {
          if (winner === 'P1') rDist.p1Winners++;
          else rDist.p2Winners++;
        } else if (pt.outcome === 'unforced_error') {
          if (loser === 'P1') rDist.p1UEs++;
          else rDist.p2UEs++;
        } else if (pt.outcome === 'forced_error') {
          if (loser === 'P1') rDist.p1FEs++;
          else rDist.p2FEs++;
        }
      }

      // Net Approach Stats
      if (pt.netApproach && pt.netApproach !== 'none') {
        if (pt.netApproach === 'P1' || pt.netApproach === 'both') {
          p1Stats.netApproaches++;
          if (winner === 'P1') p1Stats.netPointsWon++;
        }
        if (pt.netApproach === 'P2' || pt.netApproach === 'both') {
          p2Stats.netApproaches++;
          if (winner === 'P2') p2Stats.netPointsWon++;
        }
      }

      // Outcome Detailed Classification
      const outcome = pt.outcome;
      const shot = pt.shotType || 'forehand';
      const pos = pt.courtPosition || 'baseline';
      const cause = pt.errorCause || 'normal_execution';

      switch (outcome) {
        case 'ace':
          serverStats.aces++;
          serverStats.winnersTotal++;
          serverStats.winnersByShot.serve++;
          break;

        case 'service_winner':
          serverStats.serviceWinners++;
          serverStats.winnersTotal++;
          serverStats.winnersByShot.serve++;
          break;

        case 'double_fault':
          serverStats.doubleFaults++;
          serverStats.unforcedErrorsTotal++;
          serverStats.unforcedErrorsByShot.serve++;
          break;

        case 'winner':
          winnerStats.winnersTotal++;
          if (winnerStats.winnersByShot[shot] !== undefined) {
            winnerStats.winnersByShot[shot]++;
          }
          if (winnerStats.winnersByPosition[pos] !== undefined) {
            winnerStats.winnersByPosition[pos]++;
          }
          break;

        case 'unforced_error':
          // The player who made the UE is the loser of the point
          loserStats.unforcedErrorsTotal++;
          if (loserStats.unforcedErrorsByShot[shot] !== undefined) {
            loserStats.unforcedErrorsByShot[shot]++;
          }
          if (loserStats.unforcedErrorsByPosition[pos] !== undefined) {
            loserStats.unforcedErrorsByPosition[pos]++;
          }

          // Error Location (Net, Wide Left, Wide Right, Long Out)
          const errorLoc = pt.errorLocation;
          if (errorLoc && loserStats.unforcedErrorsByLocation[errorLoc] !== undefined) {
            loserStats.unforcedErrorsByLocation[errorLoc]++;
          }

          // Error Cause
          if (cause && loserStats.errorsByCause[cause] !== undefined) {
            loserStats.errorsByCause[cause]++;
          }

          // Hierarchical Diagnostic Aggregation: shot -> position -> cause
          if (!loserStats.errorDiagnosticHierarchy[shot]) {
            loserStats.errorDiagnosticHierarchy[shot] = { total: 0, positions: {}, causes: {} };
          }
          loserStats.errorDiagnosticHierarchy[shot].total++;
          loserStats.errorDiagnosticHierarchy[shot].positions[pos] = (loserStats.errorDiagnosticHierarchy[shot].positions[pos] || 0) + 1;
          loserStats.errorDiagnosticHierarchy[shot].causes[cause] = (loserStats.errorDiagnosticHierarchy[shot].causes[cause] || 0) + 1;
          break;

        case 'forced_error':
          // The loser was forced into an error; the winner forced it
          loserStats.forcedErrorsTotal++;
          winnerStats.forcedErrorsInduced++;

          if (loserStats.forcedErrorsByShot[shot] !== undefined) {
            loserStats.forcedErrorsByShot[shot]++;
          }

          if (!loserStats.forcedErrorHierarchy[shot]) {
            loserStats.forcedErrorHierarchy[shot] = { total: 0, causes: {} };
          }
          loserStats.forcedErrorHierarchy[shot].total++;
          loserStats.forcedErrorHierarchy[shot].causes[cause] = (loserStats.forcedErrorHierarchy[shot].causes[cause] || 0) + 1;
          break;
      }
    });

    // Final Derived Metrics & Percentages
    this.computeDerivedMetrics(p1Stats, p2Stats, matchSummary.totalPoints);

    return matchSummary;
  }

  static initPlayerStats(name) {
    return {
      name,
      totalPointsWon: 0,
      totalPointsLost: 0,
      
      // Serve
      servePointsTotal: 0,
      firstServesIn: 0,
      firstServePct: 0,
      firstServePointsWon: 0,
      firstServeWonPct: 0,
      secondServesTotal: 0,
      secondServePointsWon: 0,
      secondServeWonPct: 0,
      servePointsWon: 0,
      servePointsWonPct: 0,
      aces: 0,
      doubleFaults: 0,
      doubleFaultPct: 0,
      serviceWinners: 0,
      breakPointsFaced: 0,
      breakPointsSaved: 0,
      breakPointsSavedPct: 0,

      // Return
      returnPointsTotal: 0,
      returnPointsWon: 0,
      returnPointsWonPct: 0,
      firstServeReturnPointsWon: 0,
      firstServeReturnWonPct: 0,
      secondServeReturnPointsWon: 0,
      secondServeReturnWonPct: 0,
      breakPointsOpportunities: 0,
      breakPointsConverted: 0,
      breakPointsConvertedPct: 0,

      // Net
      netApproaches: 0,
      netPointsWon: 0,
      netEfficiencyPct: 0,

      // Winners & Errors
      winnersTotal: 0,
      unforcedErrorsTotal: 0,
      forcedErrorsTotal: 0,
      forcedErrorsInduced: 0,
      winnerToUERatio: 0,
      aggressiveMarginPct: 0,
      dominanceRatio: 0,

      unforcedErrorsByLocation: {
        net: 0,
        wide_left: 0,
        wide_right: 0,
        long: 0,
      },

      errorsByCause: {
        spacing: 0,
        let_ball: 0,
        above_shoulder: 0,
        mindset: 0,
      },

      winnersByShot: {
        serve: 0,
        forehand: 0,
        backhand: 0,
        volley: 0,
        overhead: 0,
        drop_shot: 0,
        return: 0,
      },
      winnersByPosition: {
        deep_baseline: 0,
        baseline: 0,
        mid_court: 0,
        net: 0,
      },
      unforcedErrorsByShot: {
        serve: 0,
        forehand: 0,
        backhand: 0,
        volley: 0,
        overhead: 0,
        drop_shot: 0,
        return: 0,
      },
      unforcedErrorsByPosition: {
        deep_baseline: 0,
        baseline: 0,
        mid_court: 0,
        net: 0,
      },
      forcedErrorsByShot: {
        forehand: 0,
        backhand: 0,
        volley: 0,
        overhead: 0,
        return: 0,
      },

      // Hierarchical Trees
      errorDiagnosticHierarchy: {}, // { forehand: { total: 8, positions: { baseline: 5 }, causes: { high_heavy: 3 } } }
      forcedErrorHierarchy: {},
    };
  }

  static computeDerivedMetrics(p1, p2, totalMatchPoints) {
    [p1, p2].forEach(p => {
      // Serve %
      p.firstServePct = p.servePointsTotal > 0 ? Math.round((p.firstServesIn / p.servePointsTotal) * 100) : 0;
      p.firstServeWonPct = p.firstServesIn > 0 ? Math.round((p.firstServePointsWon / p.firstServesIn) * 100) : 0;
      p.secondServeWonPct = p.secondServesTotal > 0 ? Math.round((p.secondServePointsWon / p.secondServesTotal) * 100) : 0;
      p.servePointsWonPct = p.servePointsTotal > 0 ? Math.round((p.servePointsWon / p.servePointsTotal) * 100) : 0;
      p.doubleFaultPct = p.servePointsTotal > 0 ? Math.round((p.doubleFaults / p.servePointsTotal) * 100) : 0;
      p.breakPointsSavedPct = p.breakPointsFaced > 0 ? Math.round((p.breakPointsSaved / p.breakPointsFaced) * 100) : 0;

      // Return %
      p.returnPointsWonPct = p.returnPointsTotal > 0 ? Math.round((p.returnPointsWon / p.returnPointsTotal) * 100) : 0;
      p.breakPointsConvertedPct = p.breakPointsOpportunities > 0 ? Math.round((p.breakPointsConverted / p.breakPointsOpportunities) * 100) : 0;

      // Net %
      p.netEfficiencyPct = p.netApproaches > 0 ? Math.round((p.netPointsWon / p.netApproaches) * 100) : 0;

      // Winner / UE Ratio
      p.winnerToUERatio = p.unforcedErrorsTotal > 0 ? Number((p.winnersTotal / p.unforcedErrorsTotal).toFixed(2)) : p.winnersTotal;

      // Aggressive Margin %: ((Winners + Opponent FE) - UE) / Total Points
      if (totalMatchPoints > 0) {
        const netPositiveAggression = (p.winnersTotal + p.forcedErrorsInduced) - p.unforcedErrorsTotal;
        p.aggressiveMarginPct = Number(((netPositiveAggression / totalMatchPoints) * 100).toFixed(1));
      } else {
        p.aggressiveMarginPct = 0;
      }
    });

    // Opponent serve return won percentages
    p1.firstServeReturnWonPct = p2.firstServesIn > 0 ? Math.round((p1.firstServeReturnPointsWon / p2.firstServesIn) * 100) : 0;
    p1.secondServeReturnWonPct = p2.secondServesTotal > 0 ? Math.round((p1.secondServeReturnPointsWon / p2.secondServesTotal) * 100) : 0;
    p2.firstServeReturnWonPct = p1.firstServesIn > 0 ? Math.round((p2.firstServeReturnPointsWon / p1.firstServesIn) * 100) : 0;
    p2.secondServeReturnWonPct = p1.secondServesTotal > 0 ? Math.round((p2.secondServeReturnPointsWon / p1.secondServesTotal) * 100) : 0;

    // Dominance Ratio: (Return Points Won %) / (Opponent Return Points Won %)
    if (p2.returnPointsTotal > 0 && p2.returnPointsWonPct > 0) {
      p1.dominanceRatio = Number((p1.returnPointsWonPct / p2.returnPointsWonPct).toFixed(2));
    } else {
      p1.dominanceRatio = p1.returnPointsWonPct > 0 ? 2.0 : 1.0;
    }

    if (p1.returnPointsTotal > 0 && p1.returnPointsWonPct > 0) {
      p2.dominanceRatio = Number((p2.returnPointsWonPct / p1.returnPointsWonPct).toFixed(2));
    } else {
      p2.dominanceRatio = p2.returnPointsWonPct > 0 ? 2.0 : 1.0;
    }
  }

  /**
   * Helper to extract individual game blocks from match points
   */
  static extractGameBlocks(points, config) {
    const trackedPoints = (points || []).filter(p => !p.isUntracked && p.type !== 'score_jump' && p.type !== 'server_switch');
    const games = [];
    let currentGame = null;

    trackedPoints.forEach((pt) => {
      const isTB = Boolean(pt.isTiebreak);
      const setIdx = pt.setIndex || 0;
      const gameIdx = pt.gameIndex || 0;
      const key = `${setIdx}_${gameIdx}_${isTB ? 'tb' : 'g'}`;

      if (!currentGame || currentGame.key !== key) {
        if (currentGame) games.push(currentGame);
        currentGame = {
          key,
          gameNumber: games.length + 1,
          setIndex: setIdx,
          gameIndex: gameIdx,
          setNumber: setIdx + 1,
          isTiebreak: isTB,
          server: pt.server,
          p1Points: 0,
          p2Points: 0,
          p1Winners: 0,
          p2Winners: 0,
          p1UEs: 0,
          p2UEs: 0,
          p1ScoreBefore: pt.scoreBefore?.p1Games || 0,
          p2ScoreBefore: pt.scoreBefore?.p2Games || 0,
          points: [],
          winner: null,
        };
      }

      currentGame.points.push(pt);
      if (pt.winnerPlayer === 'P1') {
        currentGame.p1Points++;
        if (pt.outcome === 'winner' || pt.outcome === 'ace' || pt.outcome === 'service_winner') currentGame.p1Winners++;
      } else {
        currentGame.p2Points++;
        if (pt.outcome === 'winner' || pt.outcome === 'ace' || pt.outcome === 'service_winner') currentGame.p2Winners++;
      }

      if (pt.outcome === 'unforced_error') {
        if (pt.winnerPlayer === 'P1') currentGame.p2UEs++;
        else currentGame.p1UEs++;
      }
    });

    if (currentGame) games.push(currentGame);

    // Compute winners and momentum rating for each game
    let rollingP1 = 0;
    let rollingP2 = 0;

    games.forEach((g, idx) => {
      const lastPt = g.points[g.points.length - 1];
      g.winner = lastPt?.winnerPlayer || (g.p1Points >= g.p2Points ? 'P1' : 'P2');
      g.p1GamesAfter = lastPt?.scoreAfter?.p1Games ?? (g.winner === 'P1' ? g.p1ScoreBefore + 1 : g.p1ScoreBefore);
      g.p2GamesAfter = lastPt?.scoreAfter?.p2Games ?? (g.winner === 'P2' ? g.p2ScoreBefore + 1 : g.p2ScoreBefore);

      // Game momentum: rolling window of 4 games
      const start = Math.max(0, idx - 3);
      const slice = games.slice(start, idx + 1);
      let gScore = 0;
      slice.forEach((sg, sIdx) => {
        const weight = 1 + (sIdx / slice.length);
        const ptDiffBonus = (sg.p1Points - sg.p2Points) * 0.15;
        gScore += ((sg.winner === 'P1' ? 1 : -1) + ptDiffBonus) * weight;
      });
      const maxPossible = slice.reduce((acc, _, sIdx) => acc + (1.6 * (1 + (sIdx / slice.length))), 0);
      g.momentum = Math.max(-100, Math.min(100, Math.round((gScore / maxPossible) * 100)));
    });

    return games;
  }

  /**
   * Calculates rolling momentum curve, swing points, and identified momentum phases
   */
  static calculateMomentumSeries(points, config, windowSize = 6) {
    const trackedPoints = (points || []).filter(p => !p.isUntracked && p.type !== 'score_jump' && p.type !== 'server_switch');
    if (trackedPoints.length === 0) {
      return { series: [], phases: [], p1LeadPct: 50, p2LeadPct: 50 };
    }

    const series = [];
    let p1LeadCount = 0;
    let p2LeadCount = 0;

    for (let i = 0; i < trackedPoints.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const slice = trackedPoints.slice(start, i + 1);
      let score = 0;

      slice.forEach((p, idx) => {
        const weight = 1 + (idx / slice.length); // recent points carry higher weight
        const isP1 = p.winnerPlayer === 'P1';
        const bonus = (p.outcome === 'winner' || p.outcome === 'ace') ? 0.25 : 0;
        score += (isP1 ? (1 + bonus) : -(1 + bonus)) * weight;
      });

      const maxPossible = slice.reduce((acc, _, idx) => acc + (1.25 * (1 + (idx / slice.length))), 0);
      const normalized = Math.max(-100, Math.min(100, Math.round((score / maxPossible) * 100)));

      if (normalized > 5) p1LeadCount++;
      else if (normalized < -5) p2LeadCount++;

      const pt = trackedPoints[i];
      series.push({
        index: pt.trackedIndex || (i + 1),
        pointId: pt.id,
        setIndex: pt.setIndex,
        gameIndex: pt.gameIndex,
        set: (pt.setIndex || 0) + 1,
        game: (pt.gameIndex || 0) + 1,
        isTiebreak: Boolean(pt.isTiebreak),
        p1Score: pt.scoreBefore?.p1Display || '0',
        p2Score: pt.scoreBefore?.p2Display || '0',
        p1Games: pt.scoreBefore?.p1Games || 0,
        p2Games: pt.scoreBefore?.p2Games || 0,
        winner: pt.winnerPlayer,
        outcome: pt.outcome,
        shotType: pt.shotType,
        isBreakPoint: pt.isBreakPoint,
        isGamePoint: pt.isGamePoint,
        isSetPoint: pt.isSetPoint,
        isMatchPoint: pt.isMatchPoint,
        isPressurePoint: pt.isPressurePoint,
        isStarred: pt.isStarred,
        momentum: normalized, // +100 (P1 peak) to -100 (P2 peak)
      });
    }

    const totalCalculated = p1LeadCount + p2LeadCount || 1;
    const p1LeadPct = Math.round((p1LeadCount / totalCalculated) * 100);
    const p2LeadPct = 100 - p1LeadPct;

    // Detect Major Momentum Phases & Runs
    const phases = this.detectMomentumPhases(series, trackedPoints, config);
    const gameBlocks = this.extractGameBlocks(trackedPoints, config);

    // Attach gameNumber directly to every point in series
    gameBlocks.forEach(g => {
      g.points.forEach(pt => {
        const sPt = series.find(s => s.pointId === pt.id || s.index === (pt.trackedIndex || (pt.index + 1)));
        if (sPt) {
          sPt.gameNumber = g.gameNumber;
        }
      });
    });

    return {
      series,
      phases,
      gameBlocks,
      p1LeadPct,
      p2LeadPct,
    };
  }

  /**
   * Identifies meaningful major momentum runs & turning points across the match
   */
  static detectMomentumPhases(series, points, config) {
    if (series.length < 8) return [];

    const rawPhases = [];
    let phaseStart = 0;
    let currentDom = series[0].momentum >= 0 ? 'P1' : 'P2';

    for (let i = 1; i < series.length; i++) {
      const cur = series[i];
      const prev = series[i - 1];
      const isSetBoundary = cur.set !== prev.set;
      
      const isP1Dominant = cur.momentum >= 20;
      const isP2Dominant = cur.momentum <= -20;
      const newDom = isP1Dominant ? 'P1' : (isP2Dominant ? 'P2' : currentDom);
      const isMajorFlip = (newDom !== currentDom) && (i - phaseStart >= 8) && (Math.abs(cur.momentum - series[phaseStart].momentum) >= 40);

      if (isSetBoundary || isMajorFlip) {
        if (i - phaseStart >= 6) {
          rawPhases.push({ startIndex: phaseStart, endIndex: i - 1, dom: currentDom });
          phaseStart = i;
          currentDom = newDom;
        }
      }
    }

    if (series.length - phaseStart >= 4) {
      rawPhases.push({ startIndex: phaseStart, endIndex: series.length - 1, dom: currentDom });
    }

    // Filter and enrich only major runs with meaningful match impact
    return rawPhases.map(p => this.enrichPhaseData(p, series, points, config));
  }

  static enrichPhaseData(phase, series, points, config) {
    const phaseSlice = points.slice(phase.startIndex, phase.endIndex + 1);
    const firstPt = phaseSlice[0] || {};
    const lastPt = phaseSlice[phaseSlice.length - 1] || {};

    let p1Pts = 0;
    let p2Pts = 0;
    let p1UE = 0;
    let p2UE = 0;
    let p1W = 0;
    let p2W = 0;
    let p1ServTotal = 0;
    let p1ServWon = 0;
    let p2ServTotal = 0;
    let p2ServWon = 0;

    const causes = { P1: {}, P2: {} };
    const locations = { P1: {}, P2: {} };

    phaseSlice.forEach(pt => {
      const winner = pt.winnerPlayer;
      const loser = winner === 'P1' ? 'P2' : 'P1';

      if (winner === 'P1') {
        p1Pts++;
        if (pt.outcome === 'winner' || pt.outcome === 'ace' || pt.outcome === 'service_winner') p1W++;
      } else {
        p2Pts++;
        if (pt.outcome === 'winner' || pt.outcome === 'ace' || pt.outcome === 'service_winner') p2W++;
      }

      if (pt.server === 'P1') {
        p1ServTotal++;
        if (winner === 'P1') p1ServWon++;
      } else {
        p2ServTotal++;
        if (winner === 'P2') p2ServWon++;
      }

      if (pt.outcome === 'unforced_error') {
        if (loser === 'P1') {
          p1UE++;
          if (pt.errorCause) causes.P1[pt.errorCause] = (causes.P1[pt.errorCause] || 0) + 1;
          if (pt.errorLocation) locations.P1[pt.errorLocation] = (locations.P1[pt.errorLocation] || 0) + 1;
        } else {
          p2UE++;
          if (pt.errorCause) causes.P2[pt.errorCause] = (causes.P2[pt.errorCause] || 0) + 1;
          if (pt.errorLocation) locations.P2[pt.errorLocation] = (locations.P2[pt.errorLocation] || 0) + 1;
        }
      }
    });

    const isTB = Boolean(firstPt.isTiebreak || lastPt.isTiebreak);
    const set1 = (firstPt.setIndex || 0) + 1;
    const set2 = (lastPt.setIndex || 0) + 1;
    const g1 = (firstPt.gameIndex || 0) + 1;
    const g2 = (lastPt.gameIndex || 0) + 1;

    let gameLabel = '';
    if (isTB) {
      gameLabel = `Set ${set1} Match Tiebreak`;
    } else if (set1 !== set2) {
      gameLabel = `Set ${set1} G${g1} ➔ Set ${set2} G${g2}`;
    } else if (g1 === g2) {
      gameLabel = `Set ${set1}, Game ${g1}`;
    } else {
      gameLabel = `Set ${set1}, Games ${g1}–${g2}`;
    }

    const domPlayer = p1Pts >= p2Pts ? 'P1' : 'P2';
    const domPlayerName = domPlayer === 'P1' ? config.p1Name : config.p2Name;
    const dominantPts = domPlayer === 'P1' ? p1Pts : p2Pts;
    const oppPts = domPlayer === 'P1' ? p2Pts : p1Pts;

    const startScore = firstPt.scoreBefore 
      ? (firstPt.isTiebreak ? `TB ${firstPt.scoreBefore.p1Display}-${firstPt.scoreBefore.p2Display}` : `S${set1} ${firstPt.scoreBefore.p1Games}-${firstPt.scoreBefore.p2Games}`) 
      : `Pt #${phase.startIndex + 1}`;

    let endScore = '';
    if (lastPt.scoreAfter) {
      endScore = lastPt.isTiebreak ? `TB ${lastPt.scoreAfter.p1Display}-${lastPt.scoreAfter.p2Display}` : `S${set2} ${lastPt.scoreAfter.p1Games}-${lastPt.scoreAfter.p2Games}`;
    } else if (lastPt.scoreBefore) {
      endScore = lastPt.isTiebreak ? `TB ${lastPt.scoreBefore.p1Display}-${lastPt.scoreBefore.p2Display}` : `S${set2} ${lastPt.scoreBefore.p1Games}-${lastPt.scoreBefore.p2Games}`;
    } else {
      endScore = `Pt #${phase.endIndex + 1}`;
    }

    return {
      phaseId: `phase_${phase.startIndex}_${phase.endIndex}`,
      startIndex: phase.startIndex,
      endIndex: phase.endIndex,
      startPtNum: series[phase.startIndex]?.index || (phase.startIndex + 1),
      endPtNum: series[phase.endIndex]?.index || (phase.endIndex + 1),
      dominantPlayer: domPlayer,
      dominantPlayerName: domPlayerName,
      pointsWonByDom: dominantPts,
      totalPoints: phaseSlice.length,
      netLead: dominantPts - oppPts,
      domWinners: domPlayer === 'P1' ? p1W : p2W,
      oppUEs: domPlayer === 'P1' ? p2UE : p1UE,
      startScore,
      endScore,
      label: `${gameLabel}: ${domPlayerName} (+${dominantPts - oppPts} pts)`,
      gameLabel,
      p1PtsWon: p1Pts,
      p2PtsWon: p2Pts,
      p1Winners: p1W,
      p2Winners: p2W,
      p1UEs: p1UE,
      p2UEs: p2UE,
      p1ServeWonPct: p1ServTotal > 0 ? Math.round((p1ServWon / p1ServTotal) * 100) : 0,
      p2ServeWonPct: p2ServTotal > 0 ? Math.round((p2ServWon / p2ServTotal) * 100) : 0,
      causes,
      locations,
      points: phaseSlice,
    };
  }

  /**
   * Evaluates whether a point qualifies as a high-leverage pressure point (backward compatible)
   */
  static isPointPressure(pt) {
    if (pt.isPressurePoint !== undefined) return Boolean(pt.isPressurePoint);
    if (pt.isBreakPoint || pt.isGamePoint || pt.isSetPoint || pt.isMatchPoint) return true;
    if (pt.scoreBefore && pt.scoreBefore.p1Display === '40' && pt.scoreBefore.p2Display === '40' && !pt.isTiebreak) return true;
    if (pt.isTiebreak) {
      const p1Pts = parseInt(pt.scoreBefore?.p1Display || '0', 10);
      const p2Pts = parseInt(pt.scoreBefore?.p2Display || '0', 10);
      if (p1Pts >= 4 && p2Pts >= 4) return true;
    }
    return false;
  }

  /**
   * Computes Pressure Points & Clutch Performance Metrics
   */
  static calculatePressureMetrics(points, config, filter = {}) {
    let filteredPoints = (points || []).filter(p => !p.isUntracked && p.type !== 'score_jump' && p.type !== 'server_switch');

    if (filter.setIndex !== undefined) {
      filteredPoints = filteredPoints.filter(p => p.setIndex === filter.setIndex);
    }
    if (filter.gameIndex !== undefined) {
      filteredPoints = filteredPoints.filter(p => p.gameIndex === filter.gameIndex);
    }

    const p1Name = config.p1Name || 'Player 1';
    const p2Name = config.p2Name || 'Player 2';

    const pressurePoints = filteredPoints.filter(p => this.isPointPressure(p));
    const nonPressurePoints = filteredPoints.filter(p => !this.isPointPressure(p));

    let p1PressureWon = 0;
    let p2PressureWon = 0;
    let p1NonPressureWon = 0;
    let p2NonPressureWon = 0;

    // Detailed Conversion Stats
    const breakdown = {
      breakPoints: {
        p1Faced: 0, p1Saved: 0, p1SavedPct: 0, p1Opportunities: 0, p1Converted: 0, p1ConvertedPct: 0,
        p2Faced: 0, p2Saved: 0, p2SavedPct: 0, p2Opportunities: 0, p2Converted: 0, p2ConvertedPct: 0,
      },
      gamePoints: {
        p1Opportunities: 0, p1Won: 0, p1WonPct: 0,
        p2Opportunities: 0, p2Won: 0, p2WonPct: 0,
      },
      setPoints: {
        p1Opportunities: 0, p1Won: 0, p1WonPct: 0,
        p2Opportunities: 0, p2Won: 0, p2WonPct: 0,
      },
      matchPoints: {
        p1Opportunities: 0, p1Won: 0, p1WonPct: 0,
        p2Opportunities: 0, p2Won: 0, p2WonPct: 0,
      },
      deucePoints: {
        total: 0, p1Won: 0, p2Won: 0, p1WonPct: 0, p2WonPct: 0,
      },
      lateTiebreakPoints: {
        total: 0, p1Won: 0, p2Won: 0, p1WonPct: 0, p2WonPct: 0,
      },
    };

    // Errors under pressure
    const pressureErrors = {
      P1: { totalUE: 0, net: 0, wide_left: 0, wide_right: 0, long: 0, unspecified: 0, doubleFaults: 0, spacing: 0, mindset: 0, above_shoulder: 0, let_ball: 0 },
      P2: { totalUE: 0, net: 0, wide_left: 0, wide_right: 0, long: 0, unspecified: 0, doubleFaults: 0, spacing: 0, mindset: 0, above_shoulder: 0, let_ball: 0 },
    };

    filteredPoints.forEach(pt => {
      const winner = pt.winnerPlayer;
      const loser = winner === 'P1' ? 'P2' : 'P1';
      const isPressure = this.isPointPressure(pt);
      const isTB = Boolean(pt.isTiebreak);
      const setIdx = pt.setIndex || 0;
      const sBefore = pt.scoreBefore || {};
      const p1G = sBefore.p1Games || 0;
      const p2G = sBefore.p2Games || 0;
      const p1D = sBefore.p1Display || '0';
      const p2D = sBefore.p2Display || '0';
      const server = pt.server;

      if (isPressure) {
        if (winner === 'P1') p1PressureWon++;
        else p2PressureWon++;

        // Track pressure errors
        if (pt.outcome === 'unforced_error') {
          const loserErr = pressureErrors[loser];
          loserErr.totalUE++;
          if (pt.errorLocation && loserErr[pt.errorLocation] !== undefined) {
            loserErr[pt.errorLocation]++;
          } else {
            loserErr.unspecified++;
          }
          if (pt.errorCause && loserErr[pt.errorCause] !== undefined) {
            loserErr[pt.errorCause]++;
          }
        } else if (pt.outcome === 'double_fault') {
          if (pt.server && pressureErrors[pt.server]) {
            pressureErrors[pt.server].doubleFaults++;
          }
        }
      } else {
        if (winner === 'P1') p1NonPressureWon++;
        else p2NonPressureWon++;
      }

      // Tiebreak Pressure Analysis
      if (isTB) {
        const p1Pts = parseInt(p1D, 10) || 0;
        const p2Pts = parseInt(p2D, 10) || 0;
        const isFinalSet = (setIdx === 2) || (config.bestOf === 1);
        const tbTarget = isFinalSet && config.finalSetTiebreakTarget ? config.finalSetTiebreakTarget : (config.tiebreakTarget || 7);

        // Late Tiebreak Points: >= 4-4 across all tiebreaks (crucial late-stage leverage)
        if (p1Pts >= 4 && p2Pts >= 4) {
          breakdown.lateTiebreakPoints.total++;
          if (winner === 'P1') breakdown.lateTiebreakPoints.p1Won++;
          else breakdown.lateTiebreakPoints.p2Won++;
        }

        // Set / Match Points in Tiebreak
        if (p1Pts >= tbTarget - 1 && p1Pts > p2Pts) {
          if (isFinalSet) {
            breakdown.matchPoints.p1Opportunities++;
            if (winner === 'P1') breakdown.matchPoints.p1Won++;
          } else {
            breakdown.setPoints.p1Opportunities++;
            if (winner === 'P1') breakdown.setPoints.p1Won++;
          }
        } else if (p2Pts >= tbTarget - 1 && p2Pts > p1Pts) {
          if (isFinalSet) {
            breakdown.matchPoints.p2Opportunities++;
            if (winner === 'P2') breakdown.matchPoints.p2Won++;
          } else {
            breakdown.setPoints.p2Opportunities++;
            if (winner === 'P2') breakdown.setPoints.p2Won++;
          }
        }
      } else {
        // Standard Game Pressure Analysis
        const isP1DAd = p1D.toLowerCase() === 'ad';
        const isP2DAd = p2D.toLowerCase() === 'ad';
        const isP1GamePt = pt.isGamePoint !== undefined ? (server === 'P1' && pt.isGamePoint) : (server === 'P1' && ((p1D === '40' && p2D !== '40' && !isP2DAd) || isP1DAd));
        const isP2GamePt = pt.isGamePoint !== undefined ? (server === 'P2' && pt.isGamePoint) : (server === 'P2' && ((p2D === '40' && p1D !== '40' && !isP1DAd) || isP2DAd));
        const isP1BreakPt = pt.isBreakPoint !== undefined ? (server === 'P2' && pt.isBreakPoint) : (server === 'P2' && ((p1D === '40' && p2D !== '40' && !isP2DAd) || isP1DAd));
        const isP2BreakPt = pt.isBreakPoint !== undefined ? (server === 'P1' && pt.isBreakPoint) : (server === 'P1' && ((p2D === '40' && p1D !== '40' && !isP1DAd) || isP2DAd));

        // Game Points
        if (isP1GamePt) {
          breakdown.gamePoints.p1Opportunities++;
          if (winner === 'P1') breakdown.gamePoints.p1Won++;
        }
        if (isP2GamePt) {
          breakdown.gamePoints.p2Opportunities++;
          if (winner === 'P2') breakdown.gamePoints.p2Won++;
        }

        // Break Points
        if (isP1BreakPt) {
          breakdown.breakPoints.p1Opportunities++;
          breakdown.breakPoints.p2Faced++;
          if (winner === 'P1') breakdown.breakPoints.p1Converted++;
          else breakdown.breakPoints.p2Saved++;
        }
        if (isP2BreakPt) {
          breakdown.breakPoints.p2Opportunities++;
          breakdown.breakPoints.p1Faced++;
          if (winner === 'P2') breakdown.breakPoints.p2Converted++;
          else breakdown.breakPoints.p1Saved++;
        }

        // Set Points / Match Points in standard games
        const p1CanWinSet = (isP1GamePt || isP1BreakPt) && ((p1G === 5 && p2G <= 4) || (p1G >= 6 && p1G > p2G));
        const p2CanWinSet = (isP2GamePt || isP2BreakPt) && ((p2G === 5 && p1G <= 4) || (p2G >= 6 && p2G > p1G));

        const isDecidingSet = (setIdx === 2) || (config.bestOf === 1);

        if (p1CanWinSet) {
          if (isDecidingSet) {
            breakdown.matchPoints.p1Opportunities++;
            if (winner === 'P1') breakdown.matchPoints.p1Won++;
          } else {
            breakdown.setPoints.p1Opportunities++;
            if (winner === 'P1') breakdown.setPoints.p1Won++;
          }
        }
        if (p2CanWinSet) {
          if (isDecidingSet) {
            breakdown.matchPoints.p2Opportunities++;
            if (winner === 'P2') breakdown.matchPoints.p2Won++;
          } else {
            breakdown.setPoints.p2Opportunities++;
            if (winner === 'P2') breakdown.setPoints.p2Won++;
          }
        }

        // Deuce Points (40-40)
        if (p1D === '40' && p2D === '40') {
          breakdown.deucePoints.total++;
          if (winner === 'P1') breakdown.deucePoints.p1Won++;
          else breakdown.deucePoints.p2Won++;
        }
      }
    });

    // Compute conversion percentages
    const bp = breakdown.breakPoints;
    bp.p1SavedPct = bp.p1Faced > 0 ? Math.round((bp.p1Saved / bp.p1Faced) * 100) : 0;
    bp.p2SavedPct = bp.p2Faced > 0 ? Math.round((bp.p2Saved / bp.p2Faced) * 100) : 0;
    bp.p1ConvertedPct = bp.p1Opportunities > 0 ? Math.round((bp.p1Converted / bp.p1Opportunities) * 100) : 0;
    bp.p2ConvertedPct = bp.p2Opportunities > 0 ? Math.round((bp.p2Converted / bp.p2Opportunities) * 100) : 0;

    const gp = breakdown.gamePoints;
    gp.p1WonPct = gp.p1Opportunities > 0 ? Math.round((gp.p1Won / gp.p1Opportunities) * 100) : 0;
    gp.p2WonPct = gp.p2Opportunities > 0 ? Math.round((gp.p2Won / gp.p2Opportunities) * 100) : 0;

    const sp = breakdown.setPoints;
    sp.p1WonPct = sp.p1Opportunities > 0 ? Math.round((sp.p1Won / sp.p1Opportunities) * 100) : 0;
    sp.p2WonPct = sp.p2Opportunities > 0 ? Math.round((sp.p2Won / sp.p2Opportunities) * 100) : 0;

    const mp = breakdown.matchPoints;
    mp.p1WonPct = mp.p1Opportunities > 0 ? Math.round((mp.p1Won / mp.p1Opportunities) * 100) : 0;
    mp.p2WonPct = mp.p2Opportunities > 0 ? Math.round((mp.p2Won / mp.p2Opportunities) * 100) : 0;

    const dp = breakdown.deucePoints;
    dp.p1WonPct = dp.total > 0 ? Math.round((dp.p1Won / dp.total) * 100) : 0;
    dp.p2WonPct = dp.total > 0 ? Math.round((dp.p2Won / dp.total) * 100) : 0;

    const ltb = breakdown.lateTiebreakPoints;
    ltb.p1WonPct = ltb.total > 0 ? Math.round((ltb.p1Won / ltb.total) * 100) : 0;
    ltb.p2WonPct = ltb.total > 0 ? Math.round((ltb.p2Won / ltb.total) * 100) : 0;

    // Clutch Ratings
    const p1PressurePct = pressurePoints.length > 0 ? Math.round((p1PressureWon / pressurePoints.length) * 100) : 0;
    const p2PressurePct = pressurePoints.length > 0 ? Math.round((p2PressureWon / pressurePoints.length) * 100) : 0;

    const p1NonPressurePct = nonPressurePoints.length > 0 ? Math.round((p1NonPressureWon / nonPressurePoints.length) * 100) : 0;
    const p2NonPressurePct = nonPressurePoints.length > 0 ? Math.round((p2NonPressureWon / nonPressurePoints.length) * 100) : 0;

    const p1ClutchDiff = p1PressurePct - p1NonPressurePct;
    const p2ClutchDiff = p2PressurePct - p2NonPressurePct;

    return {
      pressureTotal: pressurePoints.length,
      nonPressureTotal: nonPressurePoints.length,
      totalPoints: filteredPoints.length,
      P1: {
        name: p1Name,
        pressureWon: p1PressureWon,
        pressureWonPct: p1PressurePct,
        nonPressureWon: p1NonPressureWon,
        nonPressureWonPct: p1NonPressurePct,
        clutchDiff: p1ClutchDiff,
      },
      P2: {
        name: p2Name,
        pressureWon: p2PressureWon,
        pressureWonPct: p2PressurePct,
        nonPressureWon: p2NonPressureWon,
        nonPressureWonPct: p2NonPressurePct,
        clutchDiff: p2ClutchDiff,
      },
      breakdown,
      pressureErrors,
    };
  }

  /**
   * Helper to format human friendly location label
   */
  static formatLocation(loc) {
    const map = {
      'net': 'Net',
      'wide_left': 'Wide Left',
      'wide_right': 'Wide Right',
      'long': 'Long Out',
    };
    return map[loc] || loc;
  }

  /**
   * Helper to format human friendly cause label
   */
  static formatCause(cause) {
    const map = {
      'spacing': 'Spacing',
      'let_ball': 'Let ball',
      'above_shoulder': 'Above Shoulder',
      'above_sholder': 'Above Shoulder',
      'mindset': 'Mindset',
      // Backward compatibility for existing data
      'normal_execution': 'Execution / Timing',
      'depth': 'Opponent Deep Ball',
      'pace_rushed': 'Heavy Pace / Rushed',
      'high_heavy': 'High / Heavy Topspin',
      'low_slice': 'Low Ball / Slice',
      'wide': 'Wide / Stretched',
      'poor_footwork': 'Footwork / Balance',
      'net_cord': 'Net Cord Deflection',
      'short_angle': 'Short Angle Pull',
    };
    return map[cause] || cause;
  }
}
