/**
 * recommendationService.js
 * Centralized logic for stream-aware personalization and item ranking.
 */

const streamMap = {
    'Computers & Allied Courses': ['Animation & Multimedia', 'Electronics & Mechatronics', 'Management'],
    'Management': ['Journalism & Mass Communication', 'Computers & Allied Courses', 'Hotel Management & Tourism'],
    'Electronics & Mechatronics': ['Computers & Allied Courses', 'Electrical Engineering', 'Mechanical Engineering'],
    'Mechanical Engineering': ['Electrical Engineering', 'Civil Engineering', 'Electronics & Mechatronics'],
    'Civil Engineering': ['Mechanical Engineering', 'Architecture', 'Electrical Engineering'],
    'Electrical Engineering': ['Electronics & Mechatronics', 'Mechanical Engineering', 'Computers & Allied Courses'],
    'Biotechnology': ['Pharmaceutical Sciences', 'Biotechnology', 'Health Sciences'],
    'Pharmaceutical Sciences': ['Biotechnology', 'Health Sciences'],
    'Law': ['Management', 'Journalism & Mass Communication'],
    'Design': ['Fashion Design', 'Animation & Multimedia', 'Architecture'],
    'Hotel Management & Tourism': ['Management', 'Journalism & Mass Communication'],
    'Journalism & Mass Communication': ['Management', 'Law', 'Design'],
    'Fashion Design': ['Design', 'Animation & Multimedia'],
    'Animation & Multimedia': ['Computers & Allied Courses', 'Design', 'Fashion Design']
};

/**
 * Bootstraps a user preference profile based on registration data.
 */
const generateInitialProfile = (userData) => {
    const stream = userData.stream || '';
    const related = streamMap[stream] || [];

    return {
        primaryStream: stream,
        relatedStreams: related,
        inferredDomains: [stream, ...(userData.specialization ? [userData.specialization] : [])],
        skillVector: {}, // Initial empty vector, will be populated by signals
        recommendationWeights: {
            stream: 0.6,
            skills: 0.2,
            recency: 0.2
        },
        allowCrossStream: true
    };
};

/**
 * Common skill match utility. Returns matching percentage (0-100).
 */
const calculateSkillMatch = (userSkills = [], requiredSkills = []) => {
    if (!requiredSkills || requiredSkills.length === 0) return 100; // If no skills required, it's a match
    if (!userSkills || userSkills.length === 0) return 0;

    const lowerUserSkills = userSkills.map(s => s.toLowerCase().trim());
    let matchCount = 0;

    requiredSkills.forEach(reqSkill => {
        const lowerReq = reqSkill.toLowerCase().trim();
        if (lowerUserSkills.some(us => us.includes(lowerReq) || lowerReq.includes(us))) {
            matchCount++;
        }
    });

    return (matchCount / requiredSkills.length) * 100;
};

/**
 * calculateJobScore
 * Rules: Stream (60/35), Skills (25), Program (10), Experience (5)
 */
const calculateJobScore = (job, user) => {
    let score = 0;
    const userDepartment = user.department || '';
    const userStream = user.stream || '';
    const userPrimary = userDepartment || userStream;

    // Check both combinations
    const relatedStreams = streamMap[userDepartment] || streamMap[userStream] || [];

    // 1. Stream Match (Max 60)
    let isCrossStream = false;
    let streamMatched = false;

    // Check if job targets the user's stream OR if job has no restrictions
    const jobStreams = job.department ? [job.department, job.stream].filter(Boolean) : [];

    // Exact Match (60 pts)
    const exactMatch = jobStreams.some(s =>
        s.toLowerCase() === userDepartment.toLowerCase() ||
        s.toLowerCase() === userStream.toLowerCase()
    );

    if (exactMatch && userPrimary) {
        score += 60;
        streamMatched = true;
    } else if (jobStreams.some(s => relatedStreams.includes(s)) && relatedStreams.length > 0) {
        // Related Stream Match (35 pts)
        score += 35;
        streamMatched = true;
    } else if (jobStreams.length === 0 || jobStreams.some(s => s.toLowerCase().includes('all') || s.toLowerCase() === 'any')) {
        // Open to all or missing data - Drops into Explore More
        score += 20;
        streamMatched = true; // Allow skills check
        isCrossStream = true; // Force into Explore More to not pollute "Good Matches"
    } else {
        isCrossStream = true;
        score += 0;
    }

    // 2. Skill Overlap (Max 25)
    if (streamMatched || isCrossStream) {
        const skillMatchPercent = calculateSkillMatch(user.skills, job.skills);
        score += (skillMatchPercent / 100) * 25;
    }

    // 3. Program/Degree Match (Max 10) - Optional placeholder assuming we have it
    // if (job.degree === user.program) score += 10;

    // 4. Recency (Max 5)
    if (job.createdAt) {
        const daysOld = (new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 5 - Math.floor(daysOld / 5)); // Decays 1 point every 5 days
    }

    return {
        score: Math.min(100, Math.round(score)),
        isCrossStream: isCrossStream
    };
};

/**
 * calculateMentorScore
 * Rules: Stream (50/30), Skills (25), Role/Domain (10)
 */
const calculateMentorScore = (mentor, user) => {
    let score = 0;
    const userDepartment = user.department || '';
    const userStream = user.stream || '';
    const relatedStreams = streamMap[userDepartment] || streamMap[userStream] || [];
    let isCrossStream = false;

    // 1. Stream
    const exactMatch = (mentor.stream === userDepartment || mentor.stream === userStream);
    if (exactMatch && (userDepartment || userStream)) {
        score += 50;
    } else if (relatedStreams.includes(mentor.stream)) {
        score += 30;
    } else {
        isCrossStream = true;
    }

    // 2. Skills Overlap (Max 25)
    const skillMatchPercent = calculateSkillMatch(user.skills, mentor.skills);
    score += (skillMatchPercent / 100) * 25;

    // 3. Domain Check (Max 10)
    if (mentor.department === user.department) { // Approximated property
        score += 10;
    }

    // Availability Boost (Max 15)
    if (mentor.isMentorAvailable) score += 15;

    return {
        score: Math.min(100, Math.round(score)),
        isCrossStream
    };
};

/**
 * calculateCourseScore
 * Rules: Stream match, Skill gap match, Career goal match
 */
const calculateCourseScore = (course, user) => {
    let score = 0;
    const userDepartment = user.department || '';
    const userStream = user.stream || '';
    const relatedStreams = streamMap[userDepartment] || streamMap[userStream] || [];
    let isCrossStream = false;

    // 1. Stream Match
    const courseStream = course.category || course.department || '';
    const exactMatch = (courseStream.toLowerCase() === userDepartment.toLowerCase() ||
        courseStream.toLowerCase() === userStream.toLowerCase());

    if (exactMatch && courseStream) {
        score += 50;
    } else if (relatedStreams.some(s => s.toLowerCase() === courseStream.toLowerCase())) {
        score += 30;
    } else {
        isCrossStream = true;
    }

    // 2. Skill Match
    const skillMatchPercent = calculateSkillMatch(user.skills, course.skillsRequired || course.skills || []);
    // However, for generic recommendation we'll just use it directly for now.
    score += (skillMatchPercent / 100) * 30;

    // 3. Level Match
    // Simplistic year-based level match if course has difficulty
    score += 20;

    return {
        score: Math.min(100, Math.round(score)),
        isCrossStream
    };
};

/**
 * calculateMockScore
 * Rules: Target Role match, Required Skills match, Stream relevance
 */
const calculateMockScore = (mock, alumni) => {
    let score = 0;
    const alumniStream = alumni.stream || alumni.department || '';
    const relatedStreams = streamMap[alumniStream] || [];
    let isCrossStream = false;

    // 1. Role Match
    const requested = (mock.roleRequested || '').toLowerCase();
    if (requested && (
        (alumni.currentRole || '').toLowerCase() === requested ||
        (alumni.specialization || '').toLowerCase() === requested ||
        (alumni.title || '').toLowerCase() === requested ||
        (alumni.interviewExpertise?.primaryArea || '').toLowerCase() === requested
    )) {
        score += 40;
    }

    // 2. Stream Match (Alumni vs Student)
    const studentStream = (mock.student && mock.student.department) ? mock.student.department :
        (mock.student && mock.student.stream) ? mock.student.stream : '';

    if (!studentStream || alumniStream === studentStream) {
        score += 30;
    } else if (relatedStreams.includes(studentStream)) {
        score += 15;
    } else {
        isCrossStream = true;
    }

    // 3. Skill Match
    const skillMatchPercent = calculateSkillMatch(alumni.skills, mock.skills || []);
    score += (skillMatchPercent / 100) * 30;

    return {
        score: Math.min(100, Math.round(score)),
        isCrossStream
    };
};

const rankItems = (items, profile) => {
    if (!profile) return items;

    return items
        .map(item => ({
            ...item,
            _score: calculateScore(item, profile) // Old fallback mechanism
        }))
        .sort((a, b) => b._score - a._score);
};

module.exports = {
    generateInitialProfile,
    calculateJobScore,
    calculateMentorScore,
    calculateCourseScore,
    calculateMockScore,
    calculateSkillMatch,
    rankItems,
    streamMap
};
