/**
 * startupService.js
 * Logic for startup scoring, evaluation, and mentor matching.
 */

/**
 * Auto-calculate startup evaluation score (0-100)
 */
exports.calculateStartupScore = (evaluationData) => {
    const {
        innovationScore = 0,
        marketSize = 0,
        technicalFeasibility = 0,
        teamStrength = 0,
        problemClarity = 0,
        scalability = 0
    } = evaluationData;

    // Weights: Innovation (25%), Market (20%), Technical (15%), Team (15%), Problem (15%), Scalability (10%)
    const weightedScore =
        (innovationScore * 0.25) +
        (marketSize * 0.20) +
        (technicalFeasibility * 0.15) +
        (teamStrength * 0.15) +
        (problemClarity * 0.15) +
        (scalability * 0.10);

    return Math.round(weightedScore);
};

/**
 * Auto-calculate investor readiness percentage (0-100%)
 */
exports.calculateReadinessScore = (readinessData) => {
    const {
        pitchDeckUploaded = false,
        tractionMetrics = false,
        revenueModel = false,
        teamComplete = false,
        mvpReady = false
    } = readinessData;

    let points = 0;
    if (pitchDeckUploaded) points += 20;
    if (tractionMetrics) points += 25;
    if (revenueModel) points += 20;
    if (teamComplete) points += 15;
    if (mvpReady) points += 20;

    return points;
};

/**
 * Auto-match best mentors for a startup
 */
exports.autoMatchMentors = async (startupDomain, mentors) => {
    // Basic domain-based matching
    return mentors
        .map(m => {
            let score = 0;
            if (m.mentorProfile && m.mentorProfile.domain) {
                const mentorDomains = m.mentorProfile.domain.split(',').map(d => d.trim().toLowerCase());
                if (mentorDomains.includes(startupDomain.toLowerCase())) {
                    score += 50;
                }
            }
            // Add other signals: availability, previous successes, etc.
            return { mentor: m, matchScore: score };
        })
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 3); // Return top 3 matches
};
