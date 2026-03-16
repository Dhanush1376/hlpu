/**
 * verify_incubation.js
 * Verification script for Startup Incubation Studio.
 */

const startupService = require('./services/startupService');

async function verifyScoring() {
    console.log('--- Verifying Startup Scoring Logic ---');

    const evaluationData = {
        innovationScore: 80,
        marketSize: 70,
        technicalFeasibility: 60,
        teamStrength: 90,
        problemClarity: 75,
        scalability: 85
    };

    const score = startupService.calculateStartupScore(evaluationData);
    console.log(`Calculated Startup Score: ${score}`);

    // Weights: Innovation (25%), Market (20%), Technical (15%), Team (15%), Problem (15%), Scalability (10%)
    // (80*0.25) + (70*0.20) + (60*0.15) + (90*0.15) + (75*0.15) + (85*0.10)
    // 20 + 14 + 9 + 13.5 + 11.25 + 8.5 = 76.25 -> 76

    if (score === 76) {
        console.log('✅ Scoring calculation is accurate.');
    } else {
        console.error(`❌ Scoring mismatch. Expected 76, got ${score}`);
    }

    console.log('\n--- Verifying Investor Readiness Logic ---');
    const readinessData = {
        pitchDeckUploaded: true,
        tractionMetrics: false,
        revenueModel: true,
        teamComplete: true,
        mvpReady: false
    };

    const readinessScore = startupService.calculateReadinessScore(readinessData);
    console.log(`Calculated Readiness Score: ${readinessScore}%`);
    // 20 (pitch) + 0 (traction) + 20 (revenue) + 15 (team) + 0 (mvp) = 55

    if (readinessScore === 55) {
        console.log('✅ Readiness calculation is accurate.');
    } else {
        console.error(`❌ Readiness mismatch. Expected 55, got ${readinessScore}`);
    }
}

verifyScoring();
