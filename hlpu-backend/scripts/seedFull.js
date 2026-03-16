require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const User = require('../models/User');
const Job = require('../models/Job');
const MentorRequest = require('../models/MentorRequest');
const MockInterview = require('../models/MockInterview');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Course = require('../models/Course');
const LaunchProject = require('../models/LaunchProject');
const LaunchApplication = require('../models/LaunchApplication');

// Connect to DB Config
const connectDB = require('../config/db');

// --- CONSTANTS & HELPERS ---
const SEED_DOMAIN = 'seed.hlpu.dummy';
const NUM_STUDENTS = 25;
const NUM_ALUMNI = 25;

const STREAMS = ['CSE', 'ECE', 'Mechanical', 'Civil', 'EEE', 'IT', 'AI/DS', 'MBA'];
const DEPARTMENTS = {
    'CSE': 'B.Tech Computer Science',
    'ECE': 'B.Tech Electronics',
    'Mechanical': 'B.Tech Mechanical',
    'Civil': 'B.Tech Civil',
    'EEE': 'B.Tech Electrical',
    'IT': 'B.Tech Information Technology',
    'AI/DS': 'B.Tech Artificial Intelligence',
    'MBA': 'Master of Business Admin'
};

const SKILLS_POOL = {
    'CSE': ['JavaScript', 'React', 'Node.js', 'Python', 'Machine Learning', 'SQL', 'MongoDB', 'Docker', 'AWS'],
    'IT': ['Java', 'Spring Boot', 'C++', 'Networking', 'Cybersecurity', 'Cloud Computing', 'Linux', 'SQL'],
    'AI/DS': ['Python', 'TensorFlow', 'PyTorch', 'Data Analysis', 'Deep Learning', 'NLP', 'SQL', 'Tableau'],
    'ECE': ['VLSI', 'Embedded Systems', 'IoT', 'C', 'Verilog', 'Matlab', 'PCB Design'],
    'Mechanical': ['AutoCAD', 'SolidWorks', 'Thermodynamics', 'ANSYS', 'Manufacturing', 'Robotics'],
    'Civil': ['AutoCAD', 'STAAD.Pro', 'Surveying', 'Structural Analysis', 'Project Management'],
    'EEE': ['Power Systems', 'Control Systems', 'Matlab', 'Circuit Design', 'IoT'],
    'MBA': ['Market Research', 'Financial Analysis', 'Business Strategy', 'Sales', 'Agile', 'Team Leadership']
};

const JOB_TITLES = {
    'CSE': ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Engineer'],
    'IT': ['Systems Analyst', 'Cloud Engineer', 'Network Administrator', 'Security Analyst'],
    'AI/DS': ['Data Scientist', 'Machine Learning Engineer', 'Data Analyst', 'AI Researcher'],
    'ECE': ['Embedded Software Engineer', 'VLSI Design Engineer', 'Hardware Engineer'],
    'Mechanical': ['Design Engineer', 'Mechanical Engineer', 'Manufacturing Specialist'],
    'Civil': ['Site Engineer', 'Structural Engineer', 'Project Coordinator'],
    'EEE': ['Electrical Engineer', 'Power Systems Engineer', 'Control Systems Engineer'],
    'MBA': ['Business Analyst', 'Product Manager', 'Marketing Manager', 'Strategy Consultant']
};

const INDIAN_FIRST_NAMES = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Dhruv', 'Kabir', 'Rishi', 'Karan', 'Rahil', 'Rohan', 'Pranav', 'Dev', 'Saisha', 'Aditi', 'Diya', 'Ananya', 'Riya', 'Aisha', 'Avni', 'Sneha', 'Shruti', 'Priya', 'Neha', 'Kavya', 'Rachana', 'Nandini', 'Meera', 'Tarun', 'Vikram', 'Anil', 'Sanjay', 'Rahul', 'Nikhil', 'Pooja', 'Deepa', 'Swati', 'Anjali', 'Kiran', 'Anita', 'Bhavya', 'Chirag', 'Gautam'];
const INDIAN_LAST_NAMES = ['Sharma', 'Verma', 'Singh', 'Patel', 'Kumar', 'Reddy', 'Rao', 'Gupta', 'Jain', 'Das', 'Roy', 'Choudhury', 'Nair', 'Menon', 'Iyer', 'Pillai', 'Gowda', 'Shetty', 'Desai', 'Joshi', 'Mishra', 'Pandey', 'Tiwari', 'Yadav', 'Thakur', 'Kapoor', 'Chopra', 'Malhotra', 'Bhatia', 'Agarwal'];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomSubset = (arr, count) => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

// Return a random date within the last 'days'
const randomDate = (days) => {
    return new Date(Date.now() - Math.floor(Math.random() * days * 24 * 60 * 60 * 1000));
};

// ----------------------------------------------------------------------------------
// GENERATOR FUNCTIONS
// ----------------------------------------------------------------------------------

const generateFakeUser = async (role, stream) => {
    const firstName = getRandom(INDIAN_FIRST_NAMES);
    const lastName = getRandom(INDIAN_LAST_NAMES);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}@${SEED_DOMAIN}`;
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('password', salt);

    const skillsPool = SKILLS_POOL[stream] || SKILLS_POOL['CSE'];

    const user = {
        name: `${firstName} ${lastName}`,
        email,
        password,
        role,
        stream,
        department: DEPARTMENTS[stream],
        isVerified: true, // For both
        verificationStatus: 'approved',
        skills: getRandomSubset(skillsPool, Math.floor(Math.random() * (skillsPool.length - 4)) + 4), // 4 to max
        about: `Hi, I am ${firstName}. I am passionate about ${stream} and solving real-world problems.`,
        contact: { location: getRandom(['Bangalore', 'Hyderabad', 'Pune', 'Mumbai', 'Chennai', 'Delhi']) },

        // Activity signals
        accountStatus: { isActive: true, status: 'active' },
        createdAt: randomDate(100),
        updatedAt: randomDate(10),
        stats: {
            mentees: role === 'alumni' ? Math.floor(Math.random() * 5) : 0,
            opportunities: 0
        },
        settings: {
            notifications: { jobAlerts: true, mentorMessages: true, eventReminders: true, applicationUpdates: true },
            privacy: { profileVisibility: 'public', showEmail: true, dataSharing: true },
            preferences: { dashboardView: 'standard', autoSaveForms: true, showOnlineStatus: true }
        }
    };

    if (role === 'student') {
        user.year = getRandom([1, 2, 3, 4]);
        user.graduationYear = 2024 + (4 - user.year);
        user.profileStrength = Math.round(50 + Math.random() * 50);
        user.careerInsights = {
            placementProbability: Math.round(40 + Math.random() * 50),
            placementBucket: getRandom(['High Chance', 'Moderate']),
            skillGaps: getRandomSubset(skillsPool, 2),
            lastCalculated: new Date()
        };
    } else if (role === 'alumni') {
        user.yearsOfExperience = Math.floor(Math.random() * 10) + 1;
        user.company = getRandom(['TCS', 'Infosys', 'Wipro', 'Amazon', 'Microsoft', 'Google', 'Deloitte', 'Accenture', 'L&T', 'Meta', 'Netflix']);
        user.currentRole = getRandom(JOB_TITLES[stream]);
        user.isMentorAvailable = Math.random() > 0.3; // 70% available
        user.maxMentees = 5;
        user.graduationYear = new Date().getFullYear() - user.yearsOfExperience;
    }

    return user;
};

// ----------------------------------------------------------------------------------
// MAIN SEED SCRIPT
// ----------------------------------------------------------------------------------

const seedDatabase = async () => {
    console.log('🚧 Starting Data Seeding...');

    if (process.env.NODE_ENV !== 'development' && process.argv[2] !== '--force') {
        console.error('🚨 ERROR: Seeding is only allowed in development environment. Set NODE_ENV=development or pass --force');
        process.exit(1);
    }

    try {
        await connectDB();

        // 1. CLEAN UP EXISITNG SEED DATA
        console.log('🧹 Cleaning up old seed data...');
        const deleteUsersResult = await User.deleteMany({ email: { $regex: `@${SEED_DOMAIN}$` } });
        console.log(`   Deleted ${deleteUsersResult.deletedCount} old seeded users.`);

        // Note: For related entities (Jobs, Messages), we rely on cascading or we delete those authored by seeded users.
        const seedUserIds = (await User.find({ email: { $regex: `@${SEED_DOMAIN}$` } }).select('_id')).map(u => u._id);
        if (seedUserIds.length > 0) {
            await Job.deleteMany({ postedBy: { $in: seedUserIds } });
            await MentorRequest.deleteMany({ $or: [{ student: { $in: seedUserIds } }, { alumni: { $in: seedUserIds } }] });
            await MockInterview.deleteMany({ $or: [{ student: { $in: seedUserIds } }, { alumni: { $in: seedUserIds } }] });

            // Conversations and Messages are trickier, but we can delete where participants include seed users
            const convs = await Conversation.find({ participants: { $in: seedUserIds } }).select('_id');
            const convIds = convs.map(c => c._id);
            await Message.deleteMany({ conversationId: { $in: convIds } });
            await Conversation.deleteMany({ _id: { $in: convIds } });

            // Cleanup Launchpad and Courses
            await Course.deleteMany({ createdBy: { $in: seedUserIds } });
            const launchProjects = await LaunchProject.find({ postedBy: { $in: seedUserIds } }).select('_id');
            const projectIds = launchProjects.map(p => p._id);
            await LaunchApplication.deleteMany({ $or: [{ project: { $in: projectIds } }, { applicant: { $in: seedUserIds } }] });
            await LaunchProject.deleteMany({ _id: { $in: projectIds } });
        }


        // 2. GENERATE USERS
        console.log(`\n👥 Generating ${NUM_STUDENTS} Students & ${NUM_ALUMNI} Alumni...`);
        const usersToInsert = [];

        for (let i = 0; i < NUM_STUDENTS; i++) {
            usersToInsert.push(await generateFakeUser('student', getRandom(STREAMS)));
        }
        for (let i = 0; i < NUM_ALUMNI; i++) {
            usersToInsert.push(await generateFakeUser('alumni', getRandom(STREAMS)));
        }

        const insertedUsers = await User.insertMany(usersToInsert);
        const students = insertedUsers.filter(u => u.role === 'student');
        const alumni = insertedUsers.filter(u => u.role === 'alumni');

        console.log(`   ✅ ${students.length} students created`);
        console.log(`   ✅ ${alumni.length} alumni created`);

        // 3. GENERATE JOBS
        console.log(`\n💼 Generating Jobs for Alumni...`);
        const jobsToInsert = [];
        for (const alum of alumni) {
            const numJobs = Math.floor(Math.random() * 3) + 1; // 1 to 3 jobs per alum
            for (let j = 0; j < numJobs; j++) {
                const isExpired = Math.random() < 0.2; // 20% jobs expired
                jobsToInsert.push({
                    title: getRandom(JOB_TITLES[alum.stream]),
                    company: alum.company,
                    companyName: alum.company,
                    description: `We are looking for an experienced professional in ${alum.stream} to join our dynamic team. Strong foundation in ${getRandom(SKILLS_POOL[alum.stream])} is required.`,
                    department: DEPARTMENTS[alum.stream],
                    location: alum.contact.location,
                    jobType: getRandom(['Full Time', 'Full Time', 'Internship', 'Part Time']),
                    experienceLevel: getRandom(['No Experience', '0-1 Years', '1-3 Years', '3+ Years']),
                    workMode: getRandom(['Remote', 'Hybrid', 'Onsite']),
                    skills: getRandomSubset(SKILLS_POOL[alum.stream], 4),
                    postedBy: alum._id,
                    status: isExpired ? 'expired' : 'active',
                    createdAt: randomDate(30),
                    expiresAt: isExpired ? randomDate(5) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Future or past
                    applicants: [] // Will fill later
                });
            }
        }

        const insertedJobs = await Job.insertMany(jobsToInsert);
        const activeJobs = insertedJobs.filter(j => j.status === 'active');
        console.log(`   ✅ ${insertedJobs.length} jobs posted`);

        // 4. GENERATE APPLICATIONS
        console.log(`\n📥 Generating Job Applications...`);
        let totalApplications = 0;

        for (const student of students) {
            // Student applies to 2-6 jobs matching their stream loosely
            const eligibleJobs = activeJobs.filter(j => DEPARTMENTS[student.stream].includes(j.department) || j.department.includes(DEPARTMENTS[student.stream]) || Math.random() < 0.1); // 10% chance out of stream

            const jobsToApply = getRandomSubset(eligibleJobs, Math.floor(Math.random() * 5) + 2);

            for (const job of jobsToApply) {
                job.applicants.push({
                    student: student._id,
                    status: getRandom(['pending', 'pending', 'accepted', 'rejected']),
                    appliedAt: randomDate(15)
                });
                totalApplications++;
            }
        }

        // Save jobs with their new applicants manually since we modified them in memory
        for (const job of activeJobs) {
            if (job.applicants.length > 0) {
                await Job.findByIdAndUpdate(job._id, { applicants: job.applicants });
            }
        }
        console.log(`   ✅ ${totalApplications} applications created`);

        // 5. GENERATE MENTORSHIP & CHATS
        console.log(`\n🧑‍🏫 Generating Mentorship & Conversations...`);
        let mentorLinks = 0;
        let messagesSeeded = 0;

        const availableMentors = alumni.filter(a => a.isMentorAvailable);

        for (const student of students) {
            // 60% chance student asks for a mentor
            if (Math.random() > 0.4 && availableMentors.length > 0) {
                // Find mentor in same stream
                const matchingMentors = availableMentors.filter(a => a.stream === student.stream);
                const mentor = matchingMentors.length > 0 ? getRandom(matchingMentors) : getRandom(availableMentors);

                const status = getRandom(['pending', 'accepted', 'rejected']);

                await MentorRequest.create({
                    student: student._id,
                    alumni: mentor._id,
                    message: `Hi ${mentor.name}, I am a student in ${student.stream} and I would love your guidance.`,
                    preferredDomain: student.stream,
                    preferredMode: getRandom(['Chat', 'Video Call']),
                    status,
                    createdAt: randomDate(20)
                });

                if (status === 'accepted') {
                    mentorLinks++;
                    // Create a conversation
                    const conv = await Conversation.create({
                        participants: [student._id, mentor._id],
                        type: 'mentorship',
                        status: 'approved',
                        createdAt: randomDate(15)
                    });

                    // Generate 5-15 messages
                    const numMessages = Math.floor(Math.random() * 10) + 5;
                    const messages = [];

                    messages.push({ conversationId: conv._id, sender: student._id, text: `Thank you for accepting my request!`, createdAt: new Date(conv.createdAt.getTime() + 1000 * 60) });
                    messages.push({ conversationId: conv._id, sender: mentor._id, text: `Happy to help! How's your semester going?`, createdAt: new Date(conv.createdAt.getTime() + 1000 * 120) });

                    for (let m = 2; m < numMessages; m++) {
                        const sender = Math.random() > 0.5 ? student._id : mentor._id;
                        messages.push({
                            conversationId: conv._id,
                            sender,
                            text: getRandom(['I am working on a new project.', 'Can you review my resume?', 'Sure, send it over.', 'Have you looked into Docker?', 'Thanks for the advice!']),
                            createdAt: new Date(conv.createdAt.getTime() + 1000 * 60 * 10 * m)
                        });
                        messagesSeeded++;
                    }

                    await Message.insertMany(messages);

                    conv.lastMessage = {
                        text: messages[messages.length - 1].text,
                        sender: messages[messages.length - 1].sender,
                        createdAt: messages[messages.length - 1].createdAt
                    };
                    conv.lastMessageAt = messages[messages.length - 1].createdAt;
                    await conv.save();
                }
            }
        }
        console.log(`   ✅ ${mentorLinks} mentorship links created`);
        console.log(`   ✅ ${messagesSeeded} messages seeded`);

        // 6. GENERATE MOCK INTERVIEWS
        console.log(`\n🎤 Generating Mock Interviews...`);
        let mocksSeeded = 0;

        for (const student of students) {
            if (Math.random() > 0.5 && availableMentors.length > 0) { // 50% chance
                const mentor = getRandom(availableMentors);
                const status = getRandom(['pending', 'accepted', 'completed', 'completed']); // Bias to completed to test ML heuristics
                const scheduledDate = new Date(Date.now() + (Math.random() > 0.5 ? 1 : -1) * Math.random() * 10 * 24 * 60 * 60 * 1000); // Past or future

                await MockInterview.create({
                    student: student._id,
                    alumni: mentor._id,
                    roleRequested: getRandom(JOB_TITLES[student.stream] || ['Software Engineer']),
                    skills: getRandomSubset(SKILLS_POOL[student.stream], 3),
                    interviewType: getRandom(['HR', 'Technical', 'Behavioral']),
                    preferredDate: randomDate(10),
                    scheduledDate: status !== 'pending' ? scheduledDate : null,
                    status,
                    createdAt: randomDate(20),
                    feedbackGiven: status === 'completed',
                    feedback: status === 'completed' ? `Great candidate, solid fundamentals in ${student.stream}. Needs to work on communication.` : null
                });
                mocksSeeded++;
            }
        }
        console.log(`   ✅ ${mocksSeeded} mock interviews created`);

        // 7. GENERATE COURSES
        console.log(`\n📚 Generating Courses...`);
        const coursesToInsert = [];
        let totalCourseInteractions = 0;

        // Let's create 1 course per stream authored by a random alumni
        for (const stream of STREAMS) {
            const streamAlumni = alumni.filter(a => a.stream === stream);
            if (streamAlumni.length > 0) {
                const author = getRandom(streamAlumni);
                const title = `Advanced ${stream} Masterclass`;

                coursesToInsert.push({
                    title,
                    slug: title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
                    summaryLine: `A comprehensive guide to mastering ${stream} for professionals.`,
                    description: `This course covers everything you need to know about ${stream} including ${getRandomSubset(SKILLS_POOL[stream], 3).join(', ')}.`,
                    category: stream,
                    skillsRequired: getRandomSubset(SKILLS_POOL[stream], 4),
                    jobRoles: JOB_TITLES[stream].slice(0, 2),
                    topCompanies: ['Google', 'Microsoft', 'Amazon'],
                    level: getRandom(['beginner', 'intermediate', 'advanced']),
                    durationEstimate: '4 weeks',
                    eligibleYears: [1, 2, 3, 4],
                    createdBy: author._id,
                    viewCount: Math.floor(Math.random() * 500) + 50,
                    downloadCount: Math.floor(Math.random() * 100) + 10
                });
            }
        }

        const insertedCourses = await Course.insertMany(coursesToInsert);
        console.log(`   ✅ ${insertedCourses.length} courses created with simulated interactions.`);

        // 8. GENERATE LAUNCHPAD PROJECTS & APPLICATIONS
        console.log(`\n🚀 Generating Launchpad Projects...`);
        let projectsSeeded = 0;
        let launchAppsSeeded = 0;

        // 20% of students will create a startup project
        for (const student of students) {
            if (Math.random() > 0.8) {
                const project = await LaunchProject.create({
                    title: `${getRandom(['AI', 'Eco', 'Fin', 'Health', 'Edu', 'Tech'])}${getRandom(['Sphere', 'Flow', 'Nova', 'Sync', 'Hub'])}`,
                    description: `A revolutionary platform tackling issues in ${student.stream}. Looking for co-founders!`,
                    domain: student.stream,
                    projectType: getRandom(['idea', 'prototype', 'startup']),
                    skillsRequired: getRandomSubset(SKILLS_POOL[student.stream], 3),
                    teamSizeNeeded: getRandom([2, 3, 4]),
                    postedBy: student._id,
                    status: 'open',
                    isApproved: true,
                    stage: getRandom(['idea_submitted', 'under_review', 'incubating']),
                    team: [{ user: student._id, role: 'Founder' }]
                });
                projectsSeeded++;

                // Other students from same or related streams apply to it
                const eligibleApplicants = students.filter(s => s._id.toString() !== student._id.toString() && (s.stream === student.stream || Math.random() > 0.7));
                const applicantsToApply = getRandomSubset(eligibleApplicants, Math.floor(Math.random() * 4) + 1); // 1 to 4 apps

                for (const applicant of applicantsToApply) {
                    await LaunchApplication.create({
                        project: project._id,
                        applicant: applicant._id,
                        message: `Hi, I really like your vision and I have skills in ${getRandom(applicant.skills)}. Let's build this!`,
                        status: getRandom(['pending', 'accepted', 'rejected'])
                    });
                    launchAppsSeeded++;
                }
            }
        }

        console.log(`   ✅ ${projectsSeeded} launchpad projects created`);
        console.log(`   ✅ ${launchAppsSeeded} launchpad applications created`);

        console.log(`\n🎉 SEEDING COMPLETE! You can now safely run the server.`);
        process.exit(0);
    } catch (err) {
        console.error('🚨 Seeding Failed:', err);
        process.exit(1);
    }
};

seedDatabase();
