/**
 * Tennis Match Scoring Engine
 * Deterministic state machine supporting all standard and junior tennis scoring formats:
 * - Best of 1, 3, 5 sets
 * - Custom starting game score (e.g. 2-2)
 * - Custom games per set (e.g. 4 for Fast4, 6 for regular, 8 for Pro-Set)
 * - Final set format (Regular set, Match Tie-Break to 7/10/custom)
 * - Advantage vs No-Ad (deciding point at deuce)
 * - Tie-break win-by-2 vs sudden death
 * - Serving rotation (regular and ABBA tie-break sequence)
 * - Court end change tracking (odd games, tie-break 6-point changeovers)
 * - Full point replay / undo / edit / manual score override
 */

export const FORMAT_PRESETS = {
  STANDARD_BEST_OF_3: {
    id: 'STANDARD_BEST_OF_3',
    name: 'Standard Best of 3 (6 Games, 7-pt TB)',
    bestOf: 3,
    gamesPerSet: 6,
    tiebreakAt: 6,
    tiebreakTarget: 7,
    tiebreakWinBy2: true,
    finalSetType: 'regular', // 'regular' | 'tiebreak'
    finalSetTiebreakTarget: 7,
    startGamesP1: 0,
    startGamesP2: 0,
    advantageScoring: true,
  },
  FORMAT_B_MATCH_TB: {
    id: 'FORMAT_B_MATCH_TB',
    name: 'Best of 3 (Set 3 is 10-pt Match TB)',
    bestOf: 3,
    gamesPerSet: 6,
    tiebreakAt: 6,
    tiebreakTarget: 7,
    tiebreakWinBy2: true,
    finalSetType: 'tiebreak',
    finalSetTiebreakTarget: 10,
    startGamesP1: 0,
    startGamesP2: 0,
    advantageScoring: true,
  },
  FORMAT_C_START_2_2: {
    id: 'FORMAT_C_START_2_2',
    name: 'Junior Short Set (Start 2-2, 3rd Set 10-pt TB)',
    bestOf: 3,
    gamesPerSet: 6,
    tiebreakAt: 6,
    tiebreakTarget: 7,
    tiebreakWinBy2: true,
    finalSetType: 'tiebreak',
    finalSetTiebreakTarget: 10,
    startGamesP1: 2,
    startGamesP2: 2,
    advantageScoring: false, // No-Ad common in junior shortened
  },
  FAST_4: {
    id: 'FAST_4',
    name: 'Fast4 (4 Games, TB at 3-3, No-Ad, 3rd Set TB)',
    bestOf: 3,
    gamesPerSet: 4,
    tiebreakAt: 3,
    tiebreakTarget: 5,
    tiebreakWinBy2: false,
    finalSetType: 'tiebreak',
    finalSetTiebreakTarget: 7,
    startGamesP1: 0,
    startGamesP2: 0,
    advantageScoring: false,
  },
  PRO_SET_8: {
    id: 'PRO_SET_8',
    name: 'Pro Set (1 Set to 8 Games, 7-pt TB at 8-8)',
    bestOf: 1,
    gamesPerSet: 8,
    tiebreakAt: 8,
    tiebreakTarget: 7,
    tiebreakWinBy2: true,
    finalSetType: 'regular',
    finalSetTiebreakTarget: 7,
    startGamesP1: 0,
    startGamesP2: 0,
    advantageScoring: true,
  },
  SINGLE_TIEBREAK: {
    id: 'SINGLE_TIEBREAK',
    name: 'Single 10-point Match Tie-Break',
    bestOf: 1,
    gamesPerSet: 1,
    tiebreakAt: 0,
    tiebreakTarget: 10,
    tiebreakWinBy2: true,
    finalSetType: 'tiebreak',
    finalSetTiebreakTarget: 10,
    startGamesP1: 0,
    startGamesP2: 0,
    advantageScoring: true,
  }
};

export class TennisEngine {
  constructor(matchConfig) {
    this.config = {
      bestOf: 3,
      gamesPerSet: 6,
      tiebreakAt: 6,
      tiebreakTarget: 7,
      tiebreakWinBy2: true,
      finalSetType: 'regular',
      finalSetTiebreakTarget: 10,
      startGamesP1: 0,
      startGamesP2: 0,
      advantageScoring: true,
      firstServer: 'P1',
      p1Name: 'Player 1',
      p2Name: 'Player 2',
      matchDate: new Date().toISOString().slice(0, 10),
      ...matchConfig
    };

    this.points = [];
    this.state = this.getInitialState();
  }

  getInitialState() {
    const isFirstSetTiebreakOnly = this.config.bestOf === 1 && this.config.finalSetType === 'tiebreak';
    
    return {
      matchComplete: false,
      matchWinner: null,
      currentSetIndex: 0, // 0-based
      setScores: [{
        p1Games: this.config.startGamesP1,
        p2Games: this.config.startGamesP2,
        isComplete: false,
        winner: null,
        tiebreak: null, // { p1Points: 0, p2Points: 0, target: 7 }
      }],
      currentGame: {
        gameIndexInSet: 0,
        server: this.config.firstServer,
        receiver: this.config.firstServer === 'P1' ? 'P2' : 'P1',
        p1PointsRaw: 0, // 0, 1, 2, 3, 4 (Ad)
        p2PointsRaw: 0,
        isTiebreak: isFirstSetTiebreakOnly,
        tiebreakTarget: isFirstSetTiebreakOnly ? this.config.finalSetTiebreakTarget : this.config.tiebreakTarget,
        servingSide: 'deuce', // 'deuce' | 'ad'
        isBreakPoint: false,
        isGamePoint: false,
        isSetPoint: false,
        isMatchPoint: false,
      },
      setsWon: { P1: 0, P2: 0 },
      serverRotation: [this.config.firstServer, this.config.firstServer === 'P1' ? 'P2' : 'P1'],
      totalGamesPlayed: 0,
      shouldChangeEnds: false, // true right after a game/TB interval where end change is needed
      lastPointSummary: null,
    };
  }

  /**
   * Process a new point and update the match state.
   */
  addPoint(pointData) {
    if (this.state.matchComplete) {
      throw new Error("Match is already complete.");
    }

    const currentStateSnapshot = JSON.parse(JSON.stringify(this.state));
    const winner = pointData.winnerPlayer; // 'P1' | 'P2'

    // Enrich point with context before state transitions
    const enrichedPoint = {
      id: pointData.id || `pt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      index: this.points.length,
      setIndex: this.state.currentSetIndex,
      gameIndex: this.state.currentGame.gameIndexInSet,
      server: this.state.currentGame.server,
      receiver: this.state.currentGame.receiver,
      servingSide: this.state.currentGame.servingSide,
      isTiebreak: this.state.currentGame.isTiebreak,
      scoreBefore: {
        p1Display: this.getPointDisplay('P1'),
        p2Display: this.getPointDisplay('P2'),
        p1Games: this.state.setScores[this.state.currentSetIndex].p1Games,
        p2Games: this.state.setScores[this.state.currentSetIndex].p2Games,
        setsP1: this.state.setsWon.P1,
        setsP2: this.state.setsWon.P2,
      },
      isBreakPoint: this.state.currentGame.isBreakPoint,
      isGamePoint: this.state.currentGame.isGamePoint,
      isSetPoint: this.state.currentGame.isSetPoint,
      isMatchPoint: this.state.currentGame.isMatchPoint,
      ...pointData,
      timestamp: pointData.timestamp || Date.now(),
    };

    this.points.push(enrichedPoint);
    this.recalculateStateFromPoints();
    return enrichedPoint;
  }

  /**
   * Undo last point
   */
  undoLastPoint() {
    if (this.points.length === 0) return null;
    const removed = this.points.pop();
    this.recalculateStateFromPoints();
    return removed;
  }

  /**
   * Edit a specific point by ID or index
   */
  editPoint(pointIdOrIndex, updatedFields) {
    let index = -1;
    if (typeof pointIdOrIndex === 'number') {
      index = pointIdOrIndex;
    } else {
      index = this.points.findIndex(p => p.id === pointIdOrIndex);
    }

    if (index < 0 || index >= this.points.length) {
      throw new Error(`Point not found at index ${pointIdOrIndex}`);
    }

    this.points[index] = {
      ...this.points[index],
      ...updatedFields,
    };

    this.recalculateStateFromPoints();
    return this.points[index];
  }

  /**
   * Replays all points from index 0 to reconstruct deterministic state.
   */
  recalculateStateFromPoints() {
    this.state = this.getInitialState();

    let trackedCount = 0;
    for (let i = 0; i < this.points.length; i++) {
      const pt = this.points[i];
      // update point index metadata
      pt.index = i;

      if (pt.type === 'score_jump') {
        this.applyScoreJumpTransition(pt);
      } else if (pt.type === 'server_switch') {
        this.state.currentGame.server = pt.server;
        this.state.currentGame.receiver = pt.receiver;
      } else {
        trackedCount++;
        pt.trackedIndex = trackedCount;
        pt.setIndex = this.state.currentSetIndex;
        pt.gameIndex = this.state.currentGame.gameIndexInSet;
        pt.server = this.state.currentGame.server;
        pt.receiver = this.state.currentGame.receiver;
        pt.servingSide = this.state.currentGame.servingSide;
        pt.isTiebreak = this.state.currentGame.isTiebreak;
        
        pt.scoreBefore = {
          p1Display: this.getPointDisplay('P1'),
          p2Display: this.getPointDisplay('P2'),
          p1Games: this.state.setScores[this.state.currentSetIndex]?.p1Games || 0,
          p2Games: this.state.setScores[this.state.currentSetIndex]?.p2Games || 0,
          setsP1: this.state.setsWon.P1,
          setsP2: this.state.setsWon.P2,
        };

        this.applyPointTransition(pt);
      }
      
      // Compute leverage flags for the NEXT point
      this.computeLeveragePoints();
    }
  }

  /**
   * Directly sets engine state to match a jump / mid-match exact score specification
   */
  applyScoreJumpTransition(jump) {
    const rawSets = (jump.sets && jump.sets.length > 0) ? jump.sets : [{ p1: this.config.startGamesP1 || 0, p2: this.config.startGamesP2 || 0 }];
    const gamesReq = this.config.gamesPerSet;
    const tbAt = this.config.tiebreakAt;
    const bestOf = this.config.bestOf;
    const setsToWin = Math.ceil(bestOf / 2);

    this.state.setScores = [];
    this.state.setsWon = { P1: 0, P2: 0 };
    this.state.matchComplete = false;
    this.state.matchWinner = null;
    this.state.totalGamesPlayed = 0;

    rawSets.forEach((setScore, sIdx) => {
      const p1G = Math.max(0, parseInt(setScore.p1 || 0, 10));
      const p2G = Math.max(0, parseInt(setScore.p2 || 0, 10));
      this.state.totalGamesPlayed += (p1G + p2G);

      const isDecidingTB = this.isFinalSetMatchTiebreak(sIdx);
      let isComplete = false;
      let winner = null;

      if (sIdx < rawSets.length - 1) {
        // Earlier sets are treated as complete
        isComplete = true;
        winner = p1G > p2G ? 'P1' : (p2G > p1G ? 'P2' : null);
        if (winner) this.state.setsWon[winner]++;
      } else {
        // Last set: check if win condition met
        if (isDecidingTB) {
          if (p1G >= 1 && p1G > p2G) {
            isComplete = true;
            winner = 'P1';
            this.state.setsWon.P1++;
          } else if (p2G >= 1 && p2G > p1G) {
            isComplete = true;
            winner = 'P2';
            this.state.setsWon.P2++;
          }
        } else {
          if (p1G >= gamesReq && (p1G - p2G >= 2 || (p1G === gamesReq && p2G < tbAt) || (p1G === tbAt + 1 && p2G === tbAt))) {
            isComplete = true;
            winner = 'P1';
            this.state.setsWon.P1++;
          } else if (p2G >= gamesReq && (p2G - p1G >= 2 || (p2G === gamesReq && p1G < tbAt) || (p2G === tbAt + 1 && p1G === tbAt))) {
            isComplete = true;
            winner = 'P2';
            this.state.setsWon.P2++;
          }
        }
      }

      this.state.setScores.push({
        p1Games: p1G,
        p2Games: p2G,
        isComplete: isComplete,
        winner: winner,
        tiebreak: null,
      });
    });

    if (this.state.setsWon.P1 >= setsToWin) {
      this.state.matchComplete = true;
      this.state.matchWinner = 'P1';
      this.state.currentSetIndex = this.state.setScores.length - 1;
    } else if (this.state.setsWon.P2 >= setsToWin) {
      this.state.matchComplete = true;
      this.state.matchWinner = 'P2';
      this.state.currentSetIndex = this.state.setScores.length - 1;
    } else {
      const lastSet = this.state.setScores[this.state.setScores.length - 1];
      if (lastSet.isComplete) {
        const nextSetIndex = this.state.setScores.length;
        const isFinalMatchTb = this.isFinalSetMatchTiebreak(nextSetIndex);
        this.state.setScores.push({
          p1Games: isFinalMatchTb ? 0 : (this.config.startGamesP1 || 0),
          p2Games: isFinalMatchTb ? 0 : (this.config.startGamesP2 || 0),
          isComplete: false,
          winner: null,
          tiebreak: null,
        });
        this.state.currentSetIndex = nextSetIndex;
      } else {
        this.state.currentSetIndex = this.state.setScores.length - 1;
      }
    }

    const curSetIndex = this.state.currentSetIndex;
    const curSet = this.state.setScores[curSetIndex];
    const isMatchTB = this.isFinalSetMatchTiebreak(curSetIndex);
    const isSetTB = (curSet.p1Games === tbAt && curSet.p2Games === tbAt);
    const isTiebreak = isMatchTB || isSetTB;

    let completedGamesBefore = 0;
    for (let s = 0; s < curSetIndex; s++) {
      completedGamesBefore += (this.state.setScores[s].p1Games + this.state.setScores[s].p2Games);
    }
    const gameIndexInSet = curSet.p1Games + curSet.p2Games;
    const totalGameIdx = completedGamesBefore + gameIndexInSet;

    const firstServer = this.config.firstServer || 'P1';
    const secondServer = firstServer === 'P1' ? 'P2' : 'P1';

    let currentServer = (totalGameIdx % 2 === 0) ? firstServer : secondServer;
    let currentReceiver = currentServer === 'P1' ? 'P2' : 'P1';

    const p1Pts = Math.max(0, parseInt(jump.p1GamePoints || 0, 10));
    const p2Pts = Math.max(0, parseInt(jump.p2GamePoints || 0, 10));

    if (isTiebreak) {
      const totalTbPts = p1Pts + p2Pts;
      if (totalTbPts >= 1) {
        const block = Math.floor((totalTbPts - 1) / 2);
        currentServer = (block % 2 === 0) ? secondServer : firstServer;
        currentReceiver = currentServer === 'P1' ? 'P2' : 'P1';
      }
    }

    let servingSide = ((p1Pts + p2Pts) % 2 === 0) ? 'deuce' : 'ad';
    if (this.config.advantageScoring && p1Pts >= 3 && p2Pts >= 3) {
      if (p1Pts === p2Pts) {
        servingSide = 'deuce';
      } else {
        servingSide = 'ad';
      }
    }

    this.state.currentGame = {
      gameIndexInSet: gameIndexInSet,
      server: currentServer,
      receiver: currentReceiver,
      p1PointsRaw: p1Pts,
      p2PointsRaw: p2Pts,
      isTiebreak: isTiebreak,
      tiebreakTarget: isTiebreak && isMatchTB ? this.config.finalSetTiebreakTarget : this.config.tiebreakTarget,
      servingSide: servingSide,
      isBreakPoint: false,
      isGamePoint: false,
      isSetPoint: false,
      isMatchPoint: false,
    };

    if (isTiebreak) {
      const changeInterval = (this.config.id === 'FAST_4' || this.config.gamesPerSet === 4) ? 4 : 6;
      this.state.shouldChangeEnds = ((p1Pts + p2Pts) > 0 && (p1Pts + p2Pts) % changeInterval === 0);
    } else {
      this.state.shouldChangeEnds = (gameIndexInSet % 2 === 1 && (p1Pts + p2Pts === 0));
    }

    const setSummaries = this.state.setScores.map(s => `${s.p1Games}-${s.p2Games}`);
    let ptSummary = '';
    if (p1Pts > 0 || p2Pts > 0) {
      ptSummary = ` (${this.getPointDisplay('P1')}-${this.getPointDisplay('P2')})`;
    }
    jump.summary = `${setSummaries.join(', ')}${ptSummary}`;
  }

  /**
   * Internal transition logic for a single point
   */
  applyPointTransition(point) {
    const winner = point.winnerPlayer;
    const loser = winner === 'P1' ? 'P2' : 'P1';
    const curSet = this.state.setScores[this.state.currentSetIndex];
    const curGame = this.state.currentGame;

    if (curGame.isTiebreak) {
      // --- TIEBREAK SCORING ---
      if (winner === 'P1') curGame.p1PointsRaw++;
      else curGame.p2PointsRaw++;

      const target = curGame.tiebreakTarget;
      const p1Pts = curGame.p1PointsRaw;
      const p2Pts = curGame.p2PointsRaw;
      const diff = Math.abs(p1Pts - p2Pts);
      const winBy2 = this.config.tiebreakWinBy2;

      const tbWonByP1 = p1Pts >= target && (!winBy2 || diff >= 2);
      const tbWonByP2 = p2Pts >= target && (!winBy2 || diff >= 2);

      if (tbWonByP1 || tbWonByP2) {
        // Tiebreak complete
        const setWinner = tbWonByP1 ? 'P1' : 'P2';
        curSet.tiebreak = {
          p1Points: p1Pts,
          p2Points: p2Pts,
          target: target,
          winner: setWinner,
        };

        if (this.isFinalSetMatchTiebreak(this.state.currentSetIndex)) {
          // It was a standalone match tiebreak
          if (tbWonByP1) curSet.p1Games = 1;
          else curSet.p2Games = 1;
        } else {
          // Regular set tiebreak (e.g. 7-6)
          if (tbWonByP1) curSet.p1Games++;
          else curSet.p2Games++;
        }

        this.completeSet(setWinner);
      } else {
        // Tiebreak continues: update tie-break server and serving side
        const totalTbPts = p1Pts + p2Pts;
        // Serving rule: Server 1 serves 1st point (from deuce).
        // Then servers alternate every 2 points (Points 2&3 by Server 2, 4&5 by Server 1, etc.)
        const initialServer = this.getGameInitialServer(this.state.currentSetIndex, curGame.gameIndexInSet);
        const secondServer = initialServer === 'P1' ? 'P2' : 'P1';
        
        let activeServer = initialServer;
        if (totalTbPts >= 1) {
          const block = Math.floor((totalTbPts - 1) / 2);
          activeServer = (block % 2 === 0) ? secondServer : initialServer;
        }
        
        curGame.server = activeServer;
        curGame.receiver = activeServer === 'P1' ? 'P2' : 'P1';
        curGame.servingSide = (totalTbPts % 2 === 0) ? 'deuce' : 'ad';
        
        // Change ends every 6 points in standard TB (or 4 in Fast4)
        const changeInterval = (this.config.id === 'FAST_4' || this.config.gamesPerSet === 4) ? 4 : 6;
        this.state.shouldChangeEnds = (totalTbPts % changeInterval === 0);
      }
    } else {
      // --- REGULAR GAME SCORING ---
      if (winner === 'P1') curGame.p1PointsRaw++;
      else curGame.p2PointsRaw++;

      const p1P = curGame.p1PointsRaw;
      const p2P = curGame.p2PointsRaw;

      let gameWon = false;
      let gameWinner = null;

      if (this.config.advantageScoring) {
        // Standard Advantage
        if (p1P >= 4 && p1P - p2P >= 2) {
          gameWon = true;
          gameWinner = 'P1';
        } else if (p2P >= 4 && p2P - p1P >= 2) {
          gameWon = true;
          gameWinner = 'P2';
        }
      } else {
        // No-Ad (Sudden death at 40-40, i.e., 4th point won wins game)
        if (p1P >= 4) {
          gameWon = true;
          gameWinner = 'P1';
        } else if (p2P >= 4) {
          gameWon = true;
          gameWinner = 'P2';
        }
      }

      if (gameWon) {
        this.completeGame(gameWinner);
      } else {
        // Game continues: toggle serving side (0-0 deuce, 15-0 ad, 15-15 deuce, etc.)
        const totalPts = p1P + p2P;
        // In advantage, deuce / Ad handling
        if (this.config.advantageScoring && p1P >= 3 && p2P >= 3) {
          if (p1P === p2P) {
            curGame.servingSide = 'deuce';
          } else {
            curGame.servingSide = 'ad';
          }
        } else {
          curGame.servingSide = (totalPts % 2 === 0) ? 'deuce' : 'ad';
        }
      }
    }
  }

  completeGame(gameWinner) {
    const curSet = this.state.setScores[this.state.currentSetIndex];
    if (gameWinner === 'P1') curSet.p1Games++;
    else curSet.p2Games++;

    this.state.totalGamesPlayed++;
    const totalSetGames = curSet.p1Games + curSet.p2Games;
    // Odd game change ends
    this.state.shouldChangeEnds = (totalSetGames % 2 === 1);

    const p1G = curSet.p1Games;
    const p2G = curSet.p2Games;
    const gamesReq = this.config.gamesPerSet;
    const tbAt = this.config.tiebreakAt;

    let setWon = false;
    let setWinner = null;
    let startTiebreak = false;

    // Check tiebreak condition (e.g. 6-6 in regular, 3-3 in Fast4)
    if (p1G === tbAt && p2G === tbAt) {
      startTiebreak = true;
    } else if (p1G >= gamesReq && (p1G - p2G >= 2 || (p1G === gamesReq && p2G < tbAt))) {
      // Set won by P1 (e.g. 6-4, 6-3, 7-5)
      setWon = true;
      setWinner = 'P1';
    } else if (p2G >= gamesReq && (p2G - p1G >= 2 || (p2G === gamesReq && p1G < tbAt))) {
      // Set won by P2
      setWon = true;
      setWinner = 'P2';
    }

    if (setWon) {
      this.completeSet(setWinner);
    } else {
      // Start next game in current set
      const nextGameIndex = this.state.currentGame.gameIndexInSet + 1;
      const nextServer = this.state.currentGame.server === 'P1' ? 'P2' : 'P1';

      this.state.currentGame = {
        gameIndexInSet: nextGameIndex,
        server: nextServer,
        receiver: nextServer === 'P1' ? 'P2' : 'P1',
        p1PointsRaw: 0,
        p2PointsRaw: 0,
        isTiebreak: startTiebreak,
        tiebreakTarget: this.config.tiebreakTarget,
        servingSide: 'deuce',
        isBreakPoint: false,
        isGamePoint: false,
        isSetPoint: false,
        isMatchPoint: false,
      };
    }
  }

  completeSet(setWinner) {
    const curSet = this.state.setScores[this.state.currentSetIndex];
    curSet.isComplete = true;
    curSet.winner = setWinner;
    this.state.setsWon[setWinner]++;

    const setsToWin = Math.ceil(this.config.bestOf / 2);
    if (this.state.setsWon[setWinner] >= setsToWin) {
      // Match Complete!
      this.state.matchComplete = true;
      this.state.matchWinner = setWinner;
      return;
    }

    // Start Next Set
    const nextSetIndex = this.state.currentSetIndex + 1;
    this.state.currentSetIndex = nextSetIndex;

    const isFinalMatchTb = this.isFinalSetMatchTiebreak(nextSetIndex);
    const nextServer = this.state.currentGame.server === 'P1' ? 'P2' : 'P1';

    this.state.setScores.push({
      p1Games: isFinalMatchTb ? 0 : this.config.startGamesP1,
      p2Games: isFinalMatchTb ? 0 : this.config.startGamesP2,
      isComplete: false,
      winner: null,
      tiebreak: null,
    });

    this.state.currentGame = {
      gameIndexInSet: 0,
      server: nextServer,
      receiver: nextServer === 'P1' ? 'P2' : 'P1',
      p1PointsRaw: 0,
      p2PointsRaw: 0,
      isTiebreak: isFinalMatchTb,
      tiebreakTarget: isFinalMatchTb ? this.config.finalSetTiebreakTarget : this.config.tiebreakTarget,
      servingSide: 'deuce',
      isBreakPoint: false,
      isGamePoint: false,
      isSetPoint: false,
      isMatchPoint: false,
    };
  }

  isFinalSetMatchTiebreak(setIndex) {
    const isDecidingSet = (setIndex === this.config.bestOf - 1);
    return isDecidingSet && (this.config.finalSetType === 'tiebreak');
  }

  getGameInitialServer(setIndex, gameIndex) {
    // Alternate from firstServer across all games
    let totalGamesBefore = 0;
    for (let s = 0; s < setIndex; s++) {
      const set = this.state.setScores[s];
      totalGamesBefore += (set.p1Games + set.p2Games);
    }
    const totalGameIndex = totalGamesBefore + gameIndex;
    return (totalGameIndex % 2 === 0) ? this.config.firstServer : (this.config.firstServer === 'P1' ? 'P2' : 'P1');
  }

  /**
   * Compute break point / game point / set point / match point flags
   */
  computeLeveragePoints() {
    if (this.state.matchComplete) return;

    const curGame = this.state.currentGame;
    const curSet = this.state.setScores[this.state.currentSetIndex];
    const server = curGame.server;
    const receiver = curGame.receiver;
    const setsToWin = Math.ceil(this.config.bestOf / 2);

    let p1CanWinGame = false;
    let p2CanWinGame = false;

    if (curGame.isTiebreak) {
      const target = curGame.tiebreakTarget;
      const p1P = curGame.p1PointsRaw;
      const p2P = curGame.p2PointsRaw;
      const winBy2 = this.config.tiebreakWinBy2;

      p1CanWinGame = (p1P >= target - 1) && (!winBy2 || p1P - p2P >= 1);
      p2CanWinGame = (p2P >= target - 1) && (!winBy2 || p2P - p1P >= 1);
    } else {
      const p1P = curGame.p1PointsRaw;
      const p2P = curGame.p2PointsRaw;

      if (this.config.advantageScoring) {
        if (p1P >= 3 && p1P - p2P >= 1) p1CanWinGame = true;
        if (p2P >= 3 && p2P - p1P >= 1) p2CanWinGame = true;
      } else {
        // No-Ad: At 40-40 (3-3), BOTH have game point!
        if (p1P === 3 && p2P === 3) {
          p1CanWinGame = true;
          p2CanWinGame = true;
        } else {
          if (p1P === 3 && p2P < 3) p1CanWinGame = true;
          if (p2P === 3 && p1P < 3) p2CanWinGame = true;
        }
      }
    }

    curGame.isGamePoint = (server === 'P1' && p1CanWinGame) || (server === 'P2' && p2CanWinGame);
    curGame.isBreakPoint = (receiver === 'P1' && p1CanWinGame) || (receiver === 'P2' && p2CanWinGame);

    // Check Set Point / Match Point
    curGame.isSetPoint = false;
    curGame.isMatchPoint = false;

    const testWinnerWinsSet = (player) => {
      if (curGame.isTiebreak) return true;
      const p1Games = curSet.p1Games + (player === 'P1' ? 1 : 0);
      const p2Games = curSet.p2Games + (player === 'P2' ? 1 : 0);
      const targetG = this.config.gamesPerSet;
      if (player === 'P1') {
        return p1Games >= targetG && (p1Games - p2Games >= 2 || (p1Games === targetG && p2Games < this.config.tiebreakAt));
      } else {
        return p2Games >= targetG && (p2Games - p1Games >= 2 || (p2Games === targetG && p1Games < this.config.tiebreakAt));
      }
    };

    if (p1CanWinGame && testWinnerWinsSet('P1')) {
      curGame.isSetPoint = true;
      if (this.state.setsWon.P1 + 1 >= setsToWin) {
        curGame.isMatchPoint = true;
      }
    }
    if (p2CanWinGame && testWinnerWinsSet('P2')) {
      curGame.isSetPoint = true;
      if (this.state.setsWon.P2 + 1 >= setsToWin) {
        curGame.isMatchPoint = true;
      }
    }
  }

  /**
   * Returns human-readable score string for player (e.g. "0", "15", "30", "40", "Ad", or TB "4")
   */
  getPointDisplay(player) {
    const curGame = this.state.currentGame;
    if (curGame.isTiebreak) {
      return player === 'P1' ? `${curGame.p1PointsRaw}` : `${curGame.p2PointsRaw}`;
    }

    const p1P = curGame.p1PointsRaw;
    const p2P = curGame.p2PointsRaw;

    if (this.config.advantageScoring) {
      if (p1P >= 3 && p2P >= 3) {
        if (p1P === p2P) return "40"; // Deuce
        if (p1P > p2P) return player === 'P1' ? "Ad" : "40";
        if (p2P > p1P) return player === 'P2' ? "Ad" : "40";
      }
    } else {
      // No-Ad Deciding point
      if (p1P === 3 && p2P === 3) return "40*"; // Deciding point marked with star
    }

    const ptsMap = ["0", "15", "30", "40"];
    const pts = player === 'P1' ? p1P : p2P;
    return ptsMap[pts] || "40";
  }

  /**
   * Current scoreboard snapshot for UI
   */
  getScoreboard() {
    const trackedPoints = this.points.filter(p => !p.isUntracked && p.type !== 'score_jump');

    return {
      p1Name: this.config.p1Name,
      p2Name: this.config.p2Name,
      p1Child: this.config.p1Child || false,
      p2Child: this.config.p2Child || false,
      server: this.state.currentGame.server,
      receiver: this.state.currentGame.receiver,
      servingSide: this.state.currentGame.servingSide,
      isTiebreak: this.state.currentGame.isTiebreak,
      currentSet: this.state.currentSetIndex + 1,
      totalSets: this.config.bestOf,
      p1Point: this.getPointDisplay('P1'),
      p2Point: this.getPointDisplay('P2'),
      sets: this.state.setScores.map(s => ({
        p1: s.p1Games,
        p2: s.p2Games,
        isComplete: s.isComplete,
        tiebreak: s.tiebreak,
      })),
      matchComplete: this.state.matchComplete,
      matchWinner: this.state.matchWinner,
      isBreakPoint: this.state.currentGame.isBreakPoint,
      isGamePoint: this.state.currentGame.isGamePoint,
      isSetPoint: this.state.currentGame.isSetPoint,
      isMatchPoint: this.state.currentGame.isMatchPoint,
      shouldChangeEnds: this.state.shouldChangeEnds,
      totalPoints: this.points.length,
      trackedPoints: trackedPoints.length,
    };
  }

  /**
   * Sets match score directly to match a specific multi-set & game score state.
   * Preserves previously tracked points and avoids injecting synthetic dummy points.
   */
  setExactScore({ sets, p1GamePoints = 0, p2GamePoints = 0 }) {
    const jumpEvent = {
      id: `jump_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'score_jump',
      isUntracked: true,
      sets: (sets || []).map(s => ({ p1: parseInt(s.p1 || 0, 10), p2: parseInt(s.p2 || 0, 10) })),
      p1GamePoints: parseInt(p1GamePoints || 0, 10),
      p2GamePoints: parseInt(p2GamePoints || 0, 10),
      timestamp: Date.now(),
      comment: 'Score jump / sync',
    };

    this.points.push(jumpEvent);
    this.recalculateStateFromPoints();
    return jumpEvent;
  }

  /**
   * Updates player names and child flags mid-match
   */
  updatePlayers({ p1Name, p2Name, p1Child, p2Child }) {
    if (p1Name !== undefined) this.config.p1Name = (p1Name || '').trim() || 'Player 1';
    if (p2Name !== undefined) this.config.p2Name = (p2Name || '').trim() || 'Player 2';
    if (p1Child !== undefined) this.config.p1Child = Boolean(p1Child);
    if (p2Child !== undefined) this.config.p2Child = Boolean(p2Child);
  }

  /**
   * Updates overarching match notes mid-match
   */
  updateMatchNotes(notes) {
    this.config.notes = (notes !== undefined && notes !== null) ? String(notes).trim() : '';
  }

  /**
   * Switches or explicitly sets the active server for the current game
   */
  switchServer(targetServer) {
    const newServer = (targetServer === 'P1' || targetServer === 'P2')
      ? targetServer
      : (this.state.currentGame.server === 'P1' ? 'P2' : 'P1');
    const newReceiver = newServer === 'P1' ? 'P2' : 'P1';

    if (this.points.length === 0) {
      this.config.firstServer = newServer;
      this.state = this.getInitialState();
      return;
    }

    const lastPt = this.points[this.points.length - 1];
    if (lastPt && lastPt.type === 'server_switch') {
      lastPt.server = newServer;
      lastPt.receiver = newReceiver;
      lastPt.comment = `Server set to ${newServer === 'P1' ? this.config.p1Name : this.config.p2Name}`;
    } else {
      this.points.push({
        id: `srv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'server_switch',
        isUntracked: true,
        server: newServer,
        receiver: newReceiver,
        timestamp: Date.now(),
        comment: `Server set to ${newServer === 'P1' ? this.config.p1Name : this.config.p2Name}`,
      });
    }

    this.recalculateStateFromPoints();
  }

  /**
   * Serialize entire match state for persistence
   */
  toJSON() {
    return {
      config: this.config,
      points: this.points,
      state: this.state,
    };
  }

  /**
   * Restore from serialized JSON
   */
  static fromJSON(data) {
    const engine = new TennisEngine(data.config);
    if (Array.isArray(data.points)) {
      data.points.forEach(pt => {
        engine.addPoint(pt);
      });
    }
    return engine;
  }
}
