import { TennisEngine, FORMAT_PRESETS } from '../js/engine/TennisEngine.js';
import { TennisStats } from '../js/engine/TennisStats.js';

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ Assertion Failed: ${msg}`);
    process.exit(1);
  }
}

console.log('🧪 Starting TennisEngine & Stats Automated Test Suite...');

// Test 1: Standard Best of 3 with Deuce & Advantage
{
  const engine = new TennisEngine({
    ...FORMAT_PRESETS.STANDARD_BEST_OF_3,
    p1Name: 'Alex',
    p2Name: 'Ben',
    firstServer: 'P1',
  });

  // P1 serves 15-0, 30-0, 40-0, Game
  engine.addPoint({ winnerPlayer: 'P1', outcome: 'ace' });
  let sb = engine.getScoreboard();
  assert(sb.p1Point === '15' && sb.p2Point === '0', 'P1 should be 15-0');
  assert(sb.server === 'P1' && sb.servingSide === 'ad', 'Next point served from Ad side');

  engine.addPoint({ winnerPlayer: 'P1', outcome: 'winner', shotType: 'forehand', rallyLength: '1-4' });
  engine.addPoint({ winnerPlayer: 'P1', outcome: 'winner', shotType: 'backhand', rallyLength: '5-8' });
  sb = engine.getScoreboard();
  assert(sb.isGamePoint === true, 'P1 should have Game Point at 40-0');
  assert(sb.isBreakPoint === false, 'Server has game point, not break point');

  engine.addPoint({ winnerPlayer: 'P1', outcome: 'unforced_error' }); // P2 made UE, so P1 wins
  sb = engine.getScoreboard();
  assert(sb.sets[0].p1 === 1 && sb.sets[0].p2 === 0, 'P1 should lead 1-0 in games');
  assert(sb.server === 'P2', 'P2 should serve Game 2');
  assert(sb.shouldChangeEnds === true, 'Odd game (1-0), should change ends');
  console.log('✅ Test 1 Passed: Standard Game & Hold');
}

// Test 2: Deuce / Advantage Logic & Undo
{
  const engine = new TennisEngine({
    ...FORMAT_PRESETS.STANDARD_BEST_OF_3,
    advantageScoring: true,
  });

  // 0-0 -> 40-40 (3 pts each)
  for (let i = 0; i < 3; i++) engine.addPoint({ winnerPlayer: 'P1', outcome: 'winner' });
  for (let i = 0; i < 3; i++) engine.addPoint({ winnerPlayer: 'P2', outcome: 'winner' });
  let sb = engine.getScoreboard();
  assert(sb.p1Point === '40' && sb.p2Point === '40', 'Should be Deuce (40-40)');
  assert(sb.servingSide === 'deuce', 'Deuce is served from Deuce side');

  // P1 Advantage
  engine.addPoint({ winnerPlayer: 'P1', outcome: 'winner' });
  sb = engine.getScoreboard();
  assert(sb.p1Point === 'Ad' && sb.p2Point === '40', 'Should be P1 Ad');
  assert(sb.isGamePoint === true, 'P1 has Game Point on Ad');

  // Undo back to Deuce
  engine.undoLastPoint();
  sb = engine.getScoreboard();
  assert(sb.p1Point === '40' && sb.p2Point === '40', 'Undone back to Deuce');

  // P2 Break Point
  engine.addPoint({ winnerPlayer: 'P2', outcome: 'winner' });
  sb = engine.getScoreboard();
  assert(sb.p2Point === 'Ad', 'Should be P2 Ad');
  assert(sb.isBreakPoint === true, 'P2 (receiver) has Break Point');
  console.log('✅ Test 2 Passed: Deuce, Ad & Undo');
}

// Test 3: Format C (Junior Shortened - Start 2-2, 3rd Set 10-pt Match TB)
{
  const engine = new TennisEngine({
    ...FORMAT_PRESETS.FORMAT_C_START_2_2,
    p1Name: 'Leo',
    p2Name: 'Max',
  });

  let sb = engine.getScoreboard();
  assert(sb.sets[0].p1 === 2 && sb.sets[0].p2 === 2, 'Set 1 should start at 2-2 games');

  // Play P1 to win 4 consecutive games to win Set 1 (6-2)
  for (let g = 0; g < 4; g++) {
    for (let p = 0; p < 4; p++) {
      engine.addPoint({ winnerPlayer: 'P1', outcome: 'winner' });
    }
  }

  sb = engine.getScoreboard();
  assert(sb.sets[0].isComplete === true && sb.sets[0].p1 === 6, 'P1 wins Set 1 (6-2)');
  assert(sb.currentSet === 2, 'Should move to Set 2');
  assert(sb.sets[1].p1 === 2 && sb.sets[1].p2 === 2, 'Set 2 should also start at 2-2');

  // Play P2 to win 4 games to win Set 2 (6-2)
  for (let g = 0; g < 4; g++) {
    for (let p = 0; p < 4; p++) {
      engine.addPoint({ winnerPlayer: 'P2', outcome: 'winner' });
    }
  }

  sb = engine.getScoreboard();
  assert(sb.sets[1].isComplete === true && sb.sets[1].p2 === 6, 'P2 wins Set 2 (6-2)');
  assert(sb.currentSet === 3, 'Should move to Set 3 Deciding Match Tie-Break');
  assert(sb.isTiebreak === true, 'Set 3 should be a direct Match Tiebreak');

  // Play Match Tiebreak to 10 points
  for (let p = 0; p < 10; p++) {
    engine.addPoint({ winnerPlayer: 'P1', outcome: 'winner' });
  }

  sb = engine.getScoreboard();
  assert(sb.matchComplete === true, 'Match should be complete after 10-pt TB');
  assert(sb.matchWinner === 'P1', 'P1 should be match winner');
  console.log('✅ Test 3 Passed: Format C (Start 2-2 + 3rd Set 10-pt TB)');
}

// Test 4: Tiebreak ABBA Serving Rotation & 6-point Side Change
{
  const engine = new TennisEngine({
    ...FORMAT_PRESETS.SINGLE_TIEBREAK,
    firstServer: 'P1',
  });

  // Pt 1: P1 serves (deuce)
  assert(engine.state.currentGame.server === 'P1' && engine.state.currentGame.servingSide === 'deuce', 'Pt 1: P1 deuce');
  engine.addPoint({ winnerPlayer: 'P1', outcome: 'ace' });

  // Pt 2: P2 serves (ad)
  assert(engine.state.currentGame.server === 'P2' && engine.state.currentGame.servingSide === 'ad', 'Pt 2: P2 ad');
  engine.addPoint({ winnerPlayer: 'P2', outcome: 'ace' });

  // Pt 3: P2 serves (deuce)
  assert(engine.state.currentGame.server === 'P2' && engine.state.currentGame.servingSide === 'deuce', 'Pt 3: P2 deuce');
  engine.addPoint({ winnerPlayer: 'P1', outcome: 'winner' });

  // Pt 4: P1 serves (ad)
  assert(engine.state.currentGame.server === 'P1' && engine.state.currentGame.servingSide === 'ad', 'Pt 4: P1 ad');
  engine.addPoint({ winnerPlayer: 'P1', outcome: 'winner' });

  // Pt 5: P1 serves (deuce)
  assert(engine.state.currentGame.server === 'P1' && engine.state.currentGame.servingSide === 'deuce', 'Pt 5: P1 deuce');
  engine.addPoint({ winnerPlayer: 'P1', outcome: 'winner' });

  // Pt 6: P2 serves (ad) - total 6 pts -> Change ends!
  assert(engine.state.currentGame.server === 'P2' && engine.state.currentGame.servingSide === 'ad', 'Pt 6: P2 ad');
  engine.addPoint({ winnerPlayer: 'P2', outcome: 'winner' });
  assert(engine.state.shouldChangeEnds === true, 'At 6 total points in TB, players change ends');
  console.log('✅ Test 4 Passed: Tie-break ABBA Rotation & End Change');
}

// Test 5: TennisStats & Hierarchical Diagnostic Calculations
{
  const engine = new TennisEngine(FORMAT_PRESETS.STANDARD_BEST_OF_3);

  // Add a structured sequence of points
  engine.addPoint({ winnerPlayer: 'P1', outcome: 'ace' });
  engine.addPoint({ winnerPlayer: 'P1', outcome: 'winner', shotType: 'forehand', courtPosition: 'baseline', rallyLength: '5-8' });
  engine.addPoint({ winnerPlayer: 'P2', outcome: 'unforced_error', shotType: 'backhand', courtPosition: 'baseline', errorCause: 'high_heavy', rallyLength: '5-8' }); // P1 made UE
  engine.addPoint({ winnerPlayer: 'P1', outcome: 'forced_error', shotType: 'forehand', errorCause: 'depth', rallyLength: '9+' }); // P2 forced error by P1's deep ball

  const stats = TennisStats.calculate(engine.points, engine.config);
  assert(stats.totalPoints === 4, 'Total points should be 4');
  assert(stats.P1.aces === 1, 'P1 should have 1 Ace');
  assert(stats.P1.winnersTotal === 2, 'P1 should have 2 winners (1 Ace + 1 FH)');
  assert(stats.P1.unforcedErrorsTotal === 1, 'P1 should have 1 UE');
  assert(stats.P1.forcedErrorsInduced === 1, 'P1 induced 1 forced error on P2');
  assert(stats.rallyDistribution['5-8'].total === 2, '2 points in 5-8 rally bracket');
  assert(stats.rallyDistribution['9+'].total === 1, '1 point in 9+ rally bracket');
  console.log('✅ Test 5 Passed: Statistical & Diagnostic Engine');
}

// Test 6: Set Exact Score (Mid-Match Jump) & Preservation of Prior Tracked Points
{
  const engine = new TennisEngine(FORMAT_PRESETS.STANDARD_BEST_OF_3);

  // User tracks 3 points at the beginning of the match
  engine.addPoint({ winnerPlayer: 'P1', outcome: 'ace' });
  engine.addPoint({ winnerPlayer: 'P2', outcome: 'winner', shotType: 'forehand' });
  engine.addPoint({ winnerPlayer: 'P1', outcome: 'unforced_error', shotType: 'backhand' });

  assert(engine.points.length === 3, 'Initial points count is 3');

  // User misses games and jumps score to 6-2, 3-1 (15-30)
  engine.setExactScore({
    sets: [
      { p1: 6, p2: 2 }, // Set 1 complete (6-2)
      { p1: 3, p2: 1 }  // Set 2 in progress (3-1)
    ],
    p1GamePoints: 1, // 15
    p2GamePoints: 2  // 30
  });

  const sb = engine.getScoreboard();
  assert(sb.currentSet === 2, 'Should be in Set 2');
  assert(sb.sets[0].p1 === 6 && sb.sets[0].p2 === 2, 'Set 1 is 6-2');
  assert(sb.sets[1].p1 === 3 && sb.sets[1].p2 === 1, 'Set 2 is 3-1');
  assert(sb.p1Point === '15' && sb.p2Point === '30', 'Game score is 15-30');
  
  // Tracked points should still be 3 (not 51 dummy points!)
  assert(sb.trackedPoints === 3, 'Tracked points count must remain 3');

  // Statistics must ONLY reflect the 3 real points
  const stats = TennisStats.calculate(engine.points, engine.config);
  assert(stats.totalPoints === 3, 'Total points in stats must be 3');
  assert(stats.P1.aces === 1, 'P1 should have 1 Ace');
  assert(stats.P2.winnersTotal === 1, 'P2 should have 1 FH winner');

  // User adds Point #4 after the jump
  engine.addPoint({ winnerPlayer: 'P1', outcome: 'winner', shotType: 'forehand' });
  const sbAfter = engine.getScoreboard();
  assert(sbAfter.trackedPoints === 4, 'Tracked points count is now 4');
  assert(sbAfter.p1Point === '30' && sbAfter.p2Point === '30', 'Game score advances from 15-30 to 30-30');

  // Undo Point #4 returns to 15-30
  engine.undoLastPoint();
  assert(engine.getScoreboard().trackedPoints === 3, 'Tracked points back to 3');
  assert(engine.getScoreboard().p1Point === '15' && engine.getScoreboard().p2Point === '30', 'Game score returns to 15-30');

  // Undo the Score Jump returns to state right after first 3 points
  engine.undoLastPoint();
  assert(engine.getScoreboard().trackedPoints === 3, 'Tracked points still 3');
  assert(engine.getScoreboard().currentSet === 1, 'Back in Set 1');
  assert(engine.getScoreboard().sets[0].p1 === 0 && engine.getScoreboard().sets[0].p2 === 0, 'Set 1 is 0-0');

  console.log('✅ Test 6 Passed: Set Exact Score (Mid-Match Jump & Tracked Point Preservation)');
}

console.log('🎉 ALL ENGINE & STATS TESTS PASSED PERFECTLY!');
