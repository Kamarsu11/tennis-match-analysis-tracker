import { TennisEngine, FORMAT_PRESETS } from '../js/engine/TennisEngine.js';
import { TennisStats } from '../js/engine/TennisStats.js';
import { TennisStorage } from '../js/db/storage.js';

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ Assertion Failed: ${msg}`);
    process.exit(1);
  }
}

console.log('🎾 Starting End-to-End Match Simulation Test...');

// 1. Initialize match
const engine = new TennisEngine({
  ...FORMAT_PRESETS.FORMAT_B_MATCH_TB,
  p1Name: 'Leo (Child)',
  p2Name: 'Noah',
  p1Child: true,
  p2Child: false,
  firstServer: 'P1',
});

// 2. Play Set 1: Leo wins 6-4
// Simulate 10 games
for (let g = 0; g < 10; g++) {
  const winner = (g % 2 === 0 || g === 9) ? 'P1' : 'P2';
  for (let pt = 0; pt < 4; pt++) {
    engine.addPoint({
      winnerPlayer: winner,
      outcome: pt === 0 ? 'winner' : (pt === 1 ? 'unforced_error' : 'winner'),
      shotType: pt % 2 === 0 ? 'forehand' : 'backhand',
      courtPosition: 'baseline',
      rallyLength: pt === 0 ? '1-4' : (pt === 1 ? '5-8' : '9+'),
      errorCause: pt === 1 ? 'depth' : undefined,
      comment: pt === 3 ? 'Crucial game point conversion' : '',
    });
  }
}

let sb = engine.getScoreboard();
assert(sb.sets[0].p1 === 6 && sb.sets[0].p2 === 4, 'Set 1 should be 6-4 to Leo');
assert(sb.currentSet === 2, 'Should be in Set 2');

// 3. Play Set 2: Noah wins 6-3
for (let g = 0; g < 9; g++) {
  const winner = (g === 1 || g === 5 || g === 7) ? 'P1' : 'P2';
  for (let pt = 0; pt < 4; pt++) {
    engine.addPoint({
      winnerPlayer: winner,
      outcome: pt === 0 ? 'ace' : 'winner',
      shotType: 'forehand',
      courtPosition: 'baseline',
      rallyLength: '1-4',
    });
  }
}

sb = engine.getScoreboard();
assert(sb.sets[1].p1 === 3 && sb.sets[1].p2 === 6, 'Set 2 should be 3-6 to Noah');
assert(sb.currentSet === 3, 'Should move to 3rd set Deciding Tie-Break');
assert(sb.isTiebreak === true, 'Set 3 is a 10-pt match tiebreak');

// 4. Play Set 3: 10-pt Match Tie-break (Leo wins 10-7)
for (let p = 0; p < 7; p++) {
  engine.addPoint({ winnerPlayer: 'P1', outcome: 'winner', shotType: 'forehand', rallyLength: '5-8' });
  engine.addPoint({ winnerPlayer: 'P2', outcome: 'winner', shotType: 'backhand', rallyLength: '5-8' });
}
// Leo wins next 3 points to reach 10-7
for (let p = 0; p < 3; p++) {
  engine.addPoint({ winnerPlayer: 'P1', outcome: 'winner', shotType: 'forehand', rallyLength: '1-4' });
}

sb = engine.getScoreboard();
assert(sb.matchComplete === true, 'Match should be complete');
assert(sb.matchWinner === 'P1', 'Leo should be the match winner');
console.log('✅ End-to-End Match Scoring Completed (6-4, 3-6, [10-7])');

// 5. Test Statistics
const matchStats = TennisStats.calculate(engine.points, engine.config);
assert(matchStats.totalPoints === engine.points.length, 'Total points match points array length');
assert(matchStats.P1.totalPointsWon + matchStats.P2.totalPointsWon === matchStats.totalPoints, 'Sum of player points equals total match points');
assert(matchStats.P1.aggressiveMarginPct !== 0, 'Aggressive Margin calculated');
assert(matchStats.rallyDistribution['1-4'].total > 0, 'Rally 1-4 points counted');
assert(matchStats.rallyDistribution['5-8'].total > 0, 'Rally 5-8 points counted');
console.log('✅ Performance Statistics Verified');

// 6. Test CSV Generation
const csvOutput = TennisStorage.generateMatchCSV({
  config: engine.config,
  points: engine.points,
});
assert(csvOutput.includes('Point #,Set,Game'), 'CSV headers present');
assert(csvOutput.includes('Leo (Child)'), 'Player 1 name present in CSV');
assert(csvOutput.includes('Noah'), 'Player 2 name present in CSV');
assert(csvOutput.split('\n').length === engine.points.length + 1, 'CSV has 1 row per point + header');
console.log('✅ CSV Export Generation Verified');

// 7. Test JSON Serialization & Reconstruction
const serialized = engine.toJSON();
const restored = TennisEngine.fromJSON(serialized);
assert(restored.points.length === engine.points.length, 'Restored point count matches');
assert(restored.state.matchComplete === true, 'Restored match complete flag matches');
assert(restored.state.matchWinner === 'P1', 'Restored winner matches');
console.log('✅ JSON Serialization & State Restoration Verified');

console.log('🎉 ALL END-TO-END TESTS PASSED SUCCESSFULLY!');
