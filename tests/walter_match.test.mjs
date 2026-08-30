import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TennisEngine } from '../js/engine/TennisEngine.js';
import { TennisStats } from '../js/engine/TennisStats.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Running Tennis Scoring & Merged Match Validation Suite...');

// 1. Unit Test for 5-6 -> 5-7 vs 6-6 Tiebreak scoring rules
console.log('\n--- Test 1: Standard Set Scoring at 5-5 and 5-6 ---');
const config = {
  bestOf: 3,
  gamesPerSet: 6,
  tiebreakAt: 6,
  tiebreakTarget: 7,
  tiebreakWinBy2: true,
  finalSetType: 'tiebreak',
  finalSetTiebreakTarget: 10,
  startGamesP1: 0,
  startGamesP2: 0,
  advantageScoring: false,
  firstServer: 'P1',
  p1Name: 'Player A',
  p2Name: 'Player B'
};

const engine = new TennisEngine(config);

// Simulate game wins to 5-5 (10 games)
for (let g = 0; g < 5; g++) {
  // P1 wins game
  for (let pt = 0; pt < 4; pt++) engine.addPoint({ winnerPlayer: 'P1', outcome: 'winner' });
  // P2 wins game
  for (let pt = 0; pt < 4; pt++) engine.addPoint({ winnerPlayer: 'P2', outcome: 'winner' });
}

console.log(`Score after 10 games: ${engine.state.setScores[0].p1Games}-${engine.state.setScores[0].p2Games} (Is complete: ${engine.state.setScores[0].isComplete})`);
if (engine.state.setScores[0].p1Games !== 5 || engine.state.setScores[0].p2Games !== 5 || engine.state.setScores[0].isComplete) {
  throw new Error('Score at 5-5 should not be complete!');
}

// P2 wins 11th game -> 5-6
for (let pt = 0; pt < 4; pt++) engine.addPoint({ winnerPlayer: 'P2', outcome: 'winner' });
console.log(`Score after 11 games: ${engine.state.setScores[0].p1Games}-${engine.state.setScores[0].p2Games} (Is complete: ${engine.state.setScores[0].isComplete})`);
if (engine.state.setScores[0].p1Games !== 5 || engine.state.setScores[0].p2Games !== 6 || engine.state.setScores[0].isComplete) {
  throw new Error('Score at 5-6 should NOT be complete! Set must continue to 12th game.');
}

// Case A: P2 wins 12th game -> 5-7 (Set complete!)
for (let pt = 0; pt < 4; pt++) engine.addPoint({ winnerPlayer: 'P2', outcome: 'winner' });
console.log(`Score after 12 games: ${engine.state.setScores[0].p1Games}-${engine.state.setScores[0].p2Games} (Is complete: ${engine.state.setScores[0].isComplete}, Winner: ${engine.state.setScores[0].winner})`);
if (engine.state.setScores[0].p1Games !== 5 || engine.state.setScores[0].p2Games !== 7 || !engine.state.setScores[0].isComplete || engine.state.setScores[0].winner !== 'P2') {
  throw new Error('Set should be complete at 5-7 won by P2!');
}
console.log('✅ Test 1 Passed: 5-6 correctly continues to 5-7 for set completion.');

// 2. Unit Test for 6-6 -> 7-6 (7-point tiebreak with win by 2)
console.log('\n--- Test 2: 6-6 Tiebreak Trigger & 7-point Win-by-2 ---');
const engine2 = new TennisEngine(config);
// 5-5
for (let g = 0; g < 5; g++) {
  for (let pt = 0; pt < 4; pt++) engine2.addPoint({ winnerPlayer: 'P1', outcome: 'winner' });
  for (let pt = 0; pt < 4; pt++) engine2.addPoint({ winnerPlayer: 'P2', outcome: 'winner' });
}
// 6-5 (P1 wins game)
for (let pt = 0; pt < 4; pt++) engine2.addPoint({ winnerPlayer: 'P1', outcome: 'winner' });
// 6-6 (P2 wins game -> triggers tiebreak)
for (let pt = 0; pt < 4; pt++) engine2.addPoint({ winnerPlayer: 'P2', outcome: 'winner' });

console.log(`Score at 6-6: isTiebreak=${engine2.state.currentGame.isTiebreak}, isSetComplete=${engine2.state.setScores[0].isComplete}`);
if (!engine2.state.currentGame.isTiebreak || engine2.state.setScores[0].isComplete) {
  throw new Error('At 6-6, tiebreak must be triggered and set not yet complete!');
}

// Play tiebreak up to 6-6
for (let pt = 0; pt < 6; pt++) engine2.addPoint({ winnerPlayer: 'P1', outcome: 'winner' });
for (let pt = 0; pt < 6; pt++) engine2.addPoint({ winnerPlayer: 'P2', outcome: 'winner' });
console.log(`Tiebreak at 6-6: Score=${engine2.getPointDisplay('P1')}-${engine2.getPointDisplay('P2')}, SetComplete=${engine2.state.setScores[0].isComplete}`);
if (engine2.state.setScores[0].isComplete) {
  throw new Error('Tiebreak at 6-6 requires win by 2, should not be complete!');
}

// P1 wins next 2 points -> 8-6 (wins tiebreak and set 7-6)
engine2.addPoint({ winnerPlayer: 'P1', outcome: 'winner' });
engine2.addPoint({ winnerPlayer: 'P1', outcome: 'winner' });
console.log(`Score after tiebreak win: Set 1 = ${engine2.state.setScores[0].p1Games}-${engine2.state.setScores[0].p2Games} (Tiebreak won ${engine2.state.setScores[0].tiebreak.p1Points}-${engine2.state.setScores[0].tiebreak.p2Points}, Winner: ${engine2.state.setScores[0].winner})`);
if (engine2.state.setScores[0].p1Games !== 7 || engine2.state.setScores[0].p2Games !== 6 || !engine2.state.setScores[0].isComplete || engine2.state.setScores[0].winner !== 'P1') {
  throw new Error('Set should be complete at 7-6 won by P1 with 8-6 tiebreak!');
}
console.log('✅ Test 2 Passed: 6-6 triggers 7-point tiebreak with win-by-2 and completes at 7-6.');

// 3. Test Merged Devagna vs Walter Fejer Match from Backup
console.log('\n--- Test 3: Merged Devagna vs Walter Fejer Match Verification ---');
const backupPath = path.join(__dirname, '../Matches-Backup/Tennis_Match_Analysis_Backup_2026-08-30 2.json');
const rawBackup = fs.readFileSync(backupPath, 'utf8');
const backupData = JSON.parse(rawBackup);

const walterMatch = backupData.matches.find(m => m.config.p1Name === 'Devagna' && m.config.p2Name === 'Walter Fejer');
if (!walterMatch) throw new Error('Walter match not found in backup!');

console.log(`Loaded Merged Match: ${walterMatch.config.p1Name} vs ${walterMatch.config.p2Name}`);
console.log(`Total Points: ${walterMatch.points.length}`);
console.log(`Set Scores: Set 1: ${walterMatch.state.setScores[0].p1Games}-${walterMatch.state.setScores[0].p2Games}, Set 2: ${walterMatch.state.setScores[1].p1Games}-${walterMatch.state.setScores[1].p2Games}`);
console.log(`Match Complete: ${walterMatch.state.matchComplete}, Winner: ${walterMatch.state.matchWinner}`);

if (walterMatch.points.length !== 139) {
  throw new Error(`Expected 139 points, found ${walterMatch.points.length}`);
}
if (walterMatch.state.setScores[0].p1Games !== 5 || walterMatch.state.setScores[0].p2Games !== 7) {
  throw new Error('Set 1 score should be 5-7');
}
if (walterMatch.state.setScores[1].p1Games !== 3 || walterMatch.state.setScores[1].p2Games !== 6) {
  throw new Error('Set 2 score should be 3-6');
}

// 4. Test Analytics on Merged Match
const stats = TennisStats.calculate(walterMatch.points, walterMatch.config);
const momentum = TennisStats.calculateMomentumSeries(walterMatch.points, walterMatch.config);
const pressure = TennisStats.calculatePressureMetrics(walterMatch.points, walterMatch.config);

console.log(`\nMatch Stats: Devagna ${stats.P1.totalPointsWon} pts (${stats.P1.winnersTotal}W / ${stats.P1.unforcedErrorsTotal}UE) | Walter ${stats.P2.totalPointsWon} pts (${stats.P2.winnersTotal}W / ${stats.P2.unforcedErrorsTotal}UE)`);
console.log(`Momentum Game Blocks: ${momentum.gameBlocks.length} games (Set 1: G1–12, Set 2: G13–21)`);
console.log(`Pressure Points: ${pressure.pressureTotal} pressure points`);
console.log(`Devagna Clutch Index: ${pressure.P1.clutchDiff > 0 ? '+' : ''}${pressure.P1.clutchDiff}% | Walter Clutch Index: ${pressure.P2.clutchDiff > 0 ? '+' : ''}${pressure.P2.clutchDiff}%`);

console.log('\n🎉 ALL SCORING LOGIC & MERGED BACKUP TESTS PASSED PERFECTLY!');
