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
      servePointsWon: 0,
      servePointsWonPct: 0,
      aces: 0,
      doubleFaults: 0,
      serviceWinners: 0,
      breakPointsFaced: 0,
      breakPointsSaved: 0,
      breakPointsSavedPct: 0,

      // Return
      returnPointsTotal: 0,
      returnPointsWon: 0,
      returnPointsWonPct: 0,
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
      p.servePointsWonPct = p.servePointsTotal > 0 ? Math.round((p.servePointsWon / p.servePointsTotal) * 100) : 0;
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
