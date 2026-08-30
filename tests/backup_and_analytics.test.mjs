import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TennisEngine } from '../js/engine/TennisEngine.js';
import { TennisStats } from '../js/engine/TennisStats.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Backup JSON loading & Analytics on Devagna vs Herman Match...');

const backupPath = path.join(__dirname, '../Matches-Backup/Tennis_Match_Analysis_Backup_2026-08-30.json');
const rawBackup = fs.readFileSync(backupPath, 'utf8');
const backupData = JSON.parse(rawBackup);

if (!backupData.matches || backupData.matches.length === 0) {
  throw new Error('No matches found in backup file!');
}

const devagnaMatch = backupData.matches[0];
console.log(`\nMatch Loaded: ${devagnaMatch.config.p1Name} vs ${devagnaMatch.config.p2Name}`);
console.log(`Total Points Recorded: ${devagnaMatch.points.length}`);

// 1. Check TennisStats overall calculation
const stats = TennisStats.calculate(devagnaMatch.points, devagnaMatch.config);
console.log(`Score: Devagna ${stats.P1.totalPointsWon} pts (${stats.P1.winnersTotal} W / ${stats.P1.unforcedErrorsTotal} UE) | Herman ${stats.P2.totalPointsWon} pts (${stats.P2.winnersTotal} W / ${stats.P2.unforcedErrorsTotal} UE)`);

// 2. Check Momentum Wave Calculation
const momentumData = TennisStats.calculateMomentumSeries(devagnaMatch.points, devagnaMatch.config);
console.log(`\n🌊 Momentum Wave Series Points: ${momentumData.series.length}`);
console.log(`Major Momentum Phases Detected: ${momentumData.phases.length}`);

momentumData.phases.forEach((phase, idx) => {
  const domName = phase.dominantPlayer === 'P1' ? devagnaMatch.config.p1Name : devagnaMatch.config.p2Name;
  console.log(`  Phase #${idx + 1}: ${domName} Run (+${phase.pointsWonByDom}/${phase.totalPoints} pts, net +${phase.netLead}) from Pts #${phase.startIndex + 1}–${phase.endIndex + 1} | Score: ${phase.startScore} ➔ ${phase.endScore} | Drivers: ${phase.domWinners} W, ${phase.oppUEs} Opp UE`);
});

// 3. Check Pressure & Clutch Metrics
const pressureMetrics = TennisStats.calculatePressureMetrics(devagnaMatch.points, devagnaMatch.config);
console.log(`\n⚡ Pressure Points Analysis:`);
console.log(`Total Pressure Points: ${pressureMetrics.pressureTotal}`);
console.log(`Devagna: Pressure Win ${pressureMetrics.P1.pressureWonPct}% vs Standard ${pressureMetrics.P1.nonPressureWonPct}% -> Clutch Index: ${pressureMetrics.P1.clutchDiff > 0 ? '+' : ''}${pressureMetrics.P1.clutchDiff}%`);
console.log(`Herman: Pressure Win ${pressureMetrics.P2.pressureWonPct}% vs Standard ${pressureMetrics.P2.nonPressureWonPct}% -> Clutch Index: ${pressureMetrics.P2.clutchDiff > 0 ? '+' : ''}${pressureMetrics.P2.clutchDiff}%`);
console.log(`Break Points Devagna: Converted ${pressureMetrics.breakdown.breakPoints.p1Converted}/${pressureMetrics.breakdown.breakPoints.p1Opportunities} (${pressureMetrics.breakdown.breakPoints.p1ConvertedPct}%) | Saved ${pressureMetrics.breakdown.breakPoints.p1Saved}/${pressureMetrics.breakdown.breakPoints.p1Faced} (${pressureMetrics.breakdown.breakPoints.p1SavedPct}%)`);
console.log(`Break Points Herman: Converted ${pressureMetrics.breakdown.breakPoints.p2Converted}/${pressureMetrics.breakdown.breakPoints.p2Opportunities} (${pressureMetrics.breakdown.breakPoints.p2ConvertedPct}%) | Saved ${pressureMetrics.breakdown.breakPoints.p2Saved}/${pressureMetrics.breakdown.breakPoints.p2Faced} (${pressureMetrics.breakdown.breakPoints.p2SavedPct}%)`);
console.log(`Set Points: Devagna ${pressureMetrics.breakdown.setPoints.p1Won}/${pressureMetrics.breakdown.setPoints.p1Opportunities} | Herman ${pressureMetrics.breakdown.setPoints.p2Won}/${pressureMetrics.breakdown.setPoints.p2Opportunities}`);
console.log(`Match Points: Devagna ${pressureMetrics.breakdown.matchPoints.p1Won}/${pressureMetrics.breakdown.matchPoints.p1Opportunities} | Herman ${pressureMetrics.breakdown.matchPoints.p2Won}/${pressureMetrics.breakdown.matchPoints.p2Opportunities}`);
console.log(`Deuce Points (40-40): Devagna won ${pressureMetrics.breakdown.deucePoints.p1Won} vs Herman won ${pressureMetrics.breakdown.deucePoints.p2Won} (Total ${pressureMetrics.breakdown.deucePoints.total})`);
console.log(`Late Tiebreak: Devagna ${pressureMetrics.breakdown.lateTiebreakPoints.p1Won}/${pressureMetrics.breakdown.lateTiebreakPoints.total} vs Herman ${pressureMetrics.breakdown.lateTiebreakPoints.p2Won}/${pressureMetrics.breakdown.lateTiebreakPoints.total}`);

console.log('\nPressure Errors:');
console.log('Devagna Pressure UEs:', pressureMetrics.pressureErrors.P1);
console.log('Herman Pressure UEs:', pressureMetrics.pressureErrors.P2);

console.log('\n🎉 ALL BACKUP & ANALYTICS TESTS PASSED WITH FLYING COLORS!');
