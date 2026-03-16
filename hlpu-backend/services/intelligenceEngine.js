/**
 * Intelligence Engine Service
 *
 * Provides Recruiter Smart Shortlisting and Student Placement Probability scoring.
 * Built to be fast (<300ms), explainable, and ready for future ML model integration.
 */

const User = require('../models/User');
const Job = require('../models/Job');

// ----------------------------------------------------------------------------------
// PLACEMENT PROBABILITY ENGINE (HEURISTIC)
// ----------------------------------------------------------------------------------

/**
 * Computes a placement probability score (0-100) for a student.
 * Expected to be run periodically or on major profile updates.
 *
 * @param {Object} student - The populated user/student object
 * @returns {Object} - { score: Number, bucket: String }
 */
const calculatePlacementScore = (student) => {
    let score = 0;

    // 1. Skill Strength (Max 25)
    // We assume 10 skills is a "good" solid baseline for a fresher
    const skillCount = Array.isArray(student.skills) ? student.skills.length : 0;
    score += Math.min(25, (skillCount / 10) * 25);

    // 2. Profile Completeness (Max 15)
    let completeness = 0;
    if (student.about && student.about.length > 20) completeness += 3;
    if (Array.isArray(student.education) && student.education.length > 0) completeness += 4;
    if (student.profilePic || student.profilePicture) completeness += 2;
    if (student.contact && (student.contact.linkedin || student.contact.github)) completeness += 3;
    if (student.resumeTemplate) completeness += 3;
    score += Math.min(15, completeness);

    // 3. Project Strength (Max 15)
    // Assume 3 projects is great
    const projectCount = Array.isArray(student.projects) ? student.projects.length : 0;
    score += Math.min(15, (projectCount / 3) * 15);

    // 4. Mock Interview Performance (Max 15)
    // If we have stats.opportunities or similar activity that represents readiness
    // Using an existing field or hardcoded baseline for cold-starts
    let mockScore = 5; // Default modest baseline to prevent cold start 0
    // In future: Tie this to actual MockInterview model results
    score += mockScore;

    // 5. Activity Consistency & stream demand (Max 20)
    // A fresh tech stream might have a baseline demand.
    let streamDemand = 5;
    if (student.stream && ['CSE', 'ECE', 'IT', 'Software'].some(s => student.stream.toUpperCase().includes(s))) {
        streamDemand = 10;
    }
    score += streamDemand;

    // Consistency (e.g. recent logins, updates)
    let consistency = 5; // Baseline
    // In actual implementation, check last login or updatedAt
    if (student.updatedAt) {
        const daysSinceUpdate = (new Date() - new Date(student.updatedAt)) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 7) consistency = 10;
        else if (daysSinceUpdate < 30) consistency = 7;
    }
    score += consistency;

    // Normalize and bucket
    const finalScore = Math.min(100, Math.round(score));

    let bucket = 'Needs Improvement';
    if (finalScore >= 75) bucket = 'High Chance';
    else if (finalScore >= 50) bucket = 'Moderate';

    return { score: finalScore, bucket };
};

/**
 * Calculates missing skills between a student and a list of required target skills.
 *
 * @param {Array<String>} userSkills
 * @param {Array<String>} targetSkills
 * @param {Number} maxGaps
 * @returns {Array<String>}
 */
const calculateSkillGaps = (userSkills = [], targetSkills = [], maxGaps = 5) => {
    const userS = new Set(userSkills.map(s => s.toLowerCase().trim()));
    const gaps = targetSkills
        .map(s => s.toLowerCase().trim())
        .filter(s => !userS.has(s));

    // Return the top 'maxGaps' missing skills
    return gaps.slice(0, maxGaps);
};

// ----------------------------------------------------------------------------------
// RECRUITER SMART SHORTLISTING
// ----------------------------------------------------------------------------------

/**
 * Ranks applicant profiles for a specific job based on multiple matching heuristics.
 *
 * @param {Object} job - The Job object with `skills`, `department`, `experienceLevel`
 * @param {Array<Object>} applicants - List of applicant objects (must include populated student profile)
 * @returns {Array<Object>} Ranked applicant list with new insights
 */
const rankApplicants = (job, applicants) => {
    if (!applicants || applicants.length === 0) return [];

    const jobSkills = (job.skills || []).map(s => s.toLowerCase().trim());
    const jobSkillsCount = Math.max(jobSkills.length, 1);
    const jobDept = typeof job.department === 'string' ? job.department.toLowerCase().trim() : '';

    const scoredApplicants = applicants.map(app => {
        const student = app.student || app.user || app;
        if (!student) return null;

        let applicantScore = 0;

        // 1. Stream/Department Eligibility (+40)
        let streamOverlap = 0;
        const studentDept = typeof student.department === 'string' ? student.department.toLowerCase().trim() : '';
        const studentStream = typeof student.stream === 'string' ? student.stream.toLowerCase().trim() : '';

        if (jobDept && (jobDept === studentDept || jobDept.includes(studentDept) || studentDept.includes(jobDept))) {
            streamOverlap = 40;
        } else if (jobDept && studentStream && (jobDept.includes(studentStream) || studentStream.includes(jobDept))) {
            streamOverlap = 25; // Partial match via broader stream
        } else if (!jobDept) {
            streamOverlap = 20; // Open to all, give baseline
        }
        applicantScore += streamOverlap;

        // 2. Skill Overlap Ratio (+30)
        const studentSkills = Array.isArray(student.skills) ? student.skills : [];
        const missingCriticalSkills = calculateSkillGaps(studentSkills, jobSkills, 3);
        const matchCount = jobSkills.length - missingCriticalSkills.length;
        const skillMatchPercent = Math.round((matchCount / jobSkillsCount) * 100);

        applicantScore += (skillMatchPercent / 100) * 30;

        // 3. Experience Level Match (+15)
        // Simplified heuristic: If job wants specific experience, check user's yoE or default to 0
        const yoE = student.yearsOfExperience || 0;
        let expScore = 5; // Baseline
        if (job.experienceLevel) {
            if (job.experienceLevel.includes('No Exp') || job.experienceLevel === 'Fresher') {
                expScore = yoE === 0 ? 15 : 10; // Freshers preferred, slightly penalize experienced
            } else if (job.experienceLevel.includes('1-3')) {
                expScore = (yoE >= 1 && yoE <= 3) ? 15 : (yoE > 3 ? 10 : 5);
            } else if (job.experienceLevel.includes('3+')) {
                expScore = yoE >= 3 ? 15 : 0;
            }
        } else {
            expScore = 15; // Unspecified, no penalty
        }
        applicantScore += expScore;

        // 4. Placement Probability Weight (+10)
        const cachedPlacement = (student.careerInsights && student.careerInsights.placementProbability) || 50; // default 50
        applicantScore += Math.min(10, (cachedPlacement / 100) * 10);

        // 5. Activity Freshness (+5)
        // More recently applied or updated profile
        const appliedAt = app.appliedAt ? new Date(app.appliedAt) : new Date();
        const daysSinceApply = (new Date() - appliedAt) / (1000 * 60 * 60 * 24);
        const freshnessScore = daysSinceApply < 2 ? 5 : (daysSinceApply < 7 ? 3 : 1);
        applicantScore += freshnessScore;

        // Ensure within 0-100
        applicantScore = Math.min(100, Math.round(applicantScore));

        // Determine Shortlist Tier
        let shortlistTier = 'Other Applicants';
        if (applicantScore >= 75) {
            shortlistTier = '🥇 Top Matches';
        } else if (applicantScore >= 50) {
            shortlistTier = '🥈 Good Fits';
        }

        return {
            ...app,
            matchScore: applicantScore,
            skillMatchPercent,
            missingCriticalSkills,
            shortlistTier,
            placementProbability: cachedPlacement
        };
    }).filter(Boolean);

    // Sort heavily by score descending
    scoredApplicants.sort((a, b) => b.matchScore - a.matchScore);

    return scoredApplicants;
};

module.exports = {
    calculatePlacementScore,
    calculateSkillGaps,
    rankApplicants
};
