/**
 * aiCareerService.js
 * Lightweight AI / Heuristic engine for career insights and trajectory prediction.
 */

// Simple keyword to role mapping for predictions
const ROLE_HEURISTICS = {
    'Backend Engineer': ['node.js', 'java', 'spring', 'python', 'django', 'express', 'mongodb', 'sql', 'api', 'docker', 'aws'],
    'Frontend Engineer': ['react', 'vue', 'angular', 'javascript', 'html', 'css', 'typescript', 'ui', 'ux', 'tailwind'],
    'Full Stack Engineer': ['react', 'node.js', 'mongodb', 'express', 'fullstack', 'next.js', 'vue', 'django', 'aws'],
    'Data Scientist': ['python', 'machine learning', 'data analysis', 'pandas', 'sql', 'tensorflow', 'pytorch', 'statistics', 'math'],
    'Data Analyst': ['excel', 'sql', 'powerbi', 'tableau', 'python', 'statistics', 'data visualization'],
    'Machine Learning Engineer': ['python', 'tensorflow', 'keras', 'pytorch', 'nlp', 'computer vision', 'deep learning'],
    'DevOps Engineer': ['docker', 'kubernetes', 'aws', 'azure', 'ci/cd', 'jenkins', 'linux', 'bash', 'terraform'],
    'Product Manager': ['agile', 'scrum', 'jira', 'product management', 'roadmap', 'communication', 'leadership'],
    'Business Analyst': ['sql', 'excel', 'requirements gathering', 'agile', 'communication', 'data analysis'],
    'Mechanical Design Engineer': ['autocad', 'solidworks', 'ansys', 'catia', 'creo', 'cad', 'cam'],
    'Embedded Systems Engineer': ['c', 'c++', 'microcontrollers', 'arduino', 'raspberry pi', 'embedded c', 'iot', 'rtos'],
    'Civil Structural Engineer': ['autocad', 'staad pro', 'revit', 'etabs', 'structural analysis'],
    'Electrical Engineer': ['matlab', 'plc', 'scada', 'autocad electrical', 'circuit design', 'power systems'],
    'Marketing Manager': ['seo', 'sem', 'content marketing', 'social media', 'google analytics', 'campaign management'],
    'Financial Analyst': ['excel', 'financial modeling', 'valuation', 'accounting', 'finance'],
    'HR Specialist': ['recruitment', 'employee relations', 'talent acquisition', 'payroll', 'hris']
};

/**
 * Predict best suited job roles based on user's skills and stream.
 * @param {Array<string>} userSkills Array of user's skills
 * @param {string} userStream User's primary stream
 * @returns {Array<object>} Array of { role, score } sorted by score
 */
const predictRoles = (userSkills = [], userStream = '') => {
    if (!userSkills.length) return [];

    const lowerSkills = userSkills.map(s => s.toLowerCase());
    const predictions = [];

    for (const [role, roleKeywords] of Object.entries(ROLE_HEURISTICS)) {
        let matchCount = 0;

        // Check skill overlap
        lowerSkills.forEach(skill => {
            if (roleKeywords.some(kw => kw.includes(skill) || skill.includes(kw))) {
                matchCount++;
            }
        });

        if (matchCount > 0) {
            // Calculate a confidence score (max out around 95% for heuristics)
            let score = Math.min(95, Math.round((matchCount / Math.min(roleKeywords.length, 5)) * 100)); // Consider 5 matches as excellent
            predictions.push({ role, score });
        }
    }

    // Boost roles based on stream mapping if no strong skill matches exist, or just as a slight bump
    // (Future enhancement: Integrate streamMap logic to bump roles tied to specific streams)

    return predictions.sort((a, b) => b.score - a.score).slice(0, 3); // Return top 3
};

/**
 * Identify missing skills for a target role based on current skills.
 */
const predictSkillGaps = (userSkills = [], targetRole = '') => {
    if (!targetRole || !ROLE_HEURISTICS[targetRole]) return [];

    const lowerUserSkills = userSkills.map(s => s.toLowerCase());
    const requiredSkills = ROLE_HEURISTICS[targetRole];

    const gaps = requiredSkills.filter(reqSkill =>
        !lowerUserSkills.some(userSkill => userSkill.includes(reqSkill) || reqSkill.includes(userSkill))
    );

    return gaps.slice(0, 5); // Return up to 5 gaps
};

/**
 * Calculate placement probability (mock logic for AI brain).
 */
const calculatePlacementProbability = (profileCompletePercent = 0, jobsApplied = 0, mockScoreAvg = 0, coursesCompleted = 0) => {
    // Highly heuristic generic formula
    let prob = 30; // base
    prob += (profileCompletePercent * 0.2); // max +20
    prob += Math.min(20, jobsApplied * 2); // max +20
    prob += (mockScoreAvg * 0.2); // max +20 (assuming score out of 100)
    prob += Math.min(10, coursesCompleted * 2); // max +10

    return Math.min(99, Math.round(prob)) + '%';
};

/**
 * Generate the full career insights object.
 */
const generateCareerInsights = (user) => {
    const topRoles = predictRoles(user.skills, user.stream);
    const primaryRole = topRoles.length > 0 ? topRoles[0].role : 'Explorer';
    const skillGaps = topRoles.length > 0 ? predictSkillGaps(user.skills, primaryRole) : [];

    // In a real scenario, these would come from the database
    const profileCompleteness = user.skills?.length > 3 && user.education?.length > 0 ? 80 : 40;
    const probability = calculatePlacementProbability(profileCompleteness, 0, 0, 0);

    return {
        bestSuitedRoles: topRoles,
        primaryTargetRole: primaryRole,
        skillGaps: skillGaps,
        placementProbability: probability,
        lastUpdated: new Date()
    };
};

module.exports = {
    predictRoles,
    predictSkillGaps,
    calculatePlacementProbability,
    generateCareerInsights
};
