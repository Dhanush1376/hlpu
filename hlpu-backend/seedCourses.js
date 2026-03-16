const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Course = require('./models/Course');
const User = require('./models/User');

dotenv.config();

const coursesData = [
    {
        id: "cse",
        title: "Computer Science Engineering",
        category: "engineering",
        roles: [
            {
                title: "Machine Learning Engineer",
                salary: "₹8L - ₹30L",
                difficulty: 4,
                description: "Develop algorithms that enable machines to learn from and make predictions on data. Work on cutting-edge AI applications.",
                technologies: ["Python", "TensorFlow", "PyTorch", "SQL", "Scikit-learn", "Computer Vision"],
                roadmap: [
                    { year: "Year 1", content: "Master Python fundamentals, learn OOP, basic algorithms, and mathematics (linear algebra, calculus)" },
                    { year: "Year 2", content: "Study data structures, databases, statistics, and introductory ML concepts" },
                    { year: "Year 3", content: "Specialize in ML/DL electives, build portfolio projects, participate in Kaggle competitions" },
                    { year: "Year 4", content: "Industry internship, research papers, advanced specializations, placement preparation" }
                ],
                frontendCategory: "Data Science"
            },
            {
                title: "Full Stack Developer",
                salary: "₹5L - ₹20L",
                difficulty: 3,
                description: "Develop both client-side and server-side components of web applications. End-to-end product development.",
                technologies: ["JavaScript/TypeScript", "React.js", "Node.js", "MongoDB", "Express", "AWS"],
                roadmap: [
                    { year: "Year 1", content: "Master HTML5, CSS3, JavaScript ES6+ fundamentals" },
                    { year: "Year 2", content: "Learn React, Node.js basics, and version control with Git" },
                    { year: "Year 3", content: "Build full-stack projects, learn databases, deployment, and testing" },
                    { year: "Year 4", content: "Internship, contribute to open source, system design, interview prep" }
                ],
                frontendCategory: "Software Engineering"
            }
        ]
    },
    {
        id: "it",
        title: "Information Technology",
        category: "engineering",
        roles: [
            {
                title: "Cybersecurity Analyst",
                salary: "₹6L - ₹25L",
                difficulty: 4,
                description: "Protect systems and networks from cyber threats, implement security measures, and conduct vulnerability assessments.",
                technologies: ["SIEM tools", "Firewalls", "Kali Linux", "Wireshark", "Metasploit", "Nmap"],
                roadmap: [
                    { year: "Year 1", content: "Networking fundamentals, OS basics, programming (Python)" },
                    { year: "Year 2", content: "Security fundamentals, cryptography, operating systems security" },
                    { year: "Year 3", content: "Advanced security, ethical hacking, certifications, CTF competitions" },
                    { year: "Year 4", content: "Security internships, specialized tracks, job preparation" }
                ],
                frontendCategory: "Cybersecurity"
            },
            {
                title: "DevOps Engineer",
                salary: "₹7L - ₹22L",
                difficulty: 4,
                description: "Bridge development and operations, automate deployment pipelines, and manage cloud infrastructure.",
                technologies: ["Docker", "Kubernetes", "Jenkins", "AWS/Azure", "Terraform", "Ansible"],
                roadmap: [
                    { year: "Year 1", content: "Linux fundamentals, scripting (Python/Bash), version control" },
                    { year: "Year 2", content: "Containerization with Docker, CI/CD basics, cloud fundamentals" },
                    { year: "Year 3", content: "Orchestration with Kubernetes, infrastructure as code, monitoring" },
                    { year: "Year 4", content: "Advanced cloud architecture, site reliability engineering, internships" }
                ],
                frontendCategory: "Software Engineering"
            }
        ]
    },
    {
        id: "mba",
        title: "MBA (General)",
        category: "management",
        roles: [
            {
                title: "Business Analyst",
                salary: "₹7L - ₹20L",
                difficulty: 3,
                description: "Analyze business processes, identify improvement opportunities, and bridge the gap between IT and business.",
                technologies: ["Excel", "SQL", "Tableau", "Power BI", "SAP", "JIRA"],
                roadmap: [
                    { year: "Year 1", content: "Core business fundamentals (Marketing, Finance, Operations, HR)" },
                    { year: "Year 2", content: "Specialization in Business Analytics, electives, certifications" },
                    { year: "Summer", content: "Summer internship in consulting, analytics, or corporate roles" },
                    { year: "Final", content: "Capstone project, placement preparation, networking" }
                ],
                frontendCategory: "Business"
            }
        ]
    },
    {
        id: "llb",
        title: "LLB (Hons)",
        category: "law",
        roles: [
            {
                title: "Corporate Lawyer",
                salary: "₹5L - ₹30L",
                difficulty: 4,
                description: "Handle legal matters for businesses including contracts, mergers, acquisitions, and compliance.",
                technologies: ["Legal Research Tools", "Contract Lifecycle Management", "Compliance Software"],
                roadmap: [
                    { year: "Year 1", content: "Foundational law courses, legal writing, and research methods" },
                    { year: "Year 2", content: "Contract law, constitutional law, criminal law, internships" },
                    { year: "Year 3", content: "Corporate law, taxation, intellectual property, moot courts" },
                    { year: "Year 4-5", content: "Specialization, bar exam preparation, legal clinic, placements" }
                ],
                frontendCategory: "Business"
            }
        ]
    },
    {
        id: "design",
        title: "Graphic Design",
        category: "arts",
        roles: [
            {
                title: "UI/UX Designer",
                salary: "₹4L - ₹15L",
                difficulty: 3,
                description: "Create intuitive and engaging user interfaces and experiences for web and mobile applications.",
                technologies: ["Figma", "Adobe XD", "Sketch", "Illustrator", "Photoshop", "Principle"],
                roadmap: [
                    { year: "Year 1", content: "Design fundamentals, color theory, typography, composition" },
                    { year: "Year 2", content: "Master design tools, learn UI/UX principles, create first portfolio pieces" },
                    { year: "Year 3", content: "Build comprehensive portfolio, real-world projects, design internships" },
                    { year: "Year 4", content: "Specialize in UX research or UI engineering, job preparation" }
                ],
                frontendCategory: "Design"
            }
        ]
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for Course Seeding...');

        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.error('Admin user not found. Cannot seed.');
            process.exit(1);
        }

        // Optional: Clear existing courses to avoid duplicates
        // await Course.deleteMany({});

        const coursesToInsert = [];

        coursesData.forEach(dept => {
            dept.roles.forEach(role => {
                const slug = role.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

                let level = 'intermediate';
                if (role.difficulty <= 2) level = 'beginner';
                else if (role.difficulty >= 4) level = 'advanced';

                coursesToInsert.push({
                    title: role.title,
                    slug: slug,
                    category: role.frontendCategory || dept.category,
                    description: role.description + ` Average Salary: ${role.salary}`,
                    level: level,
                    durationEstimate: '4 Years Program',
                    skillsCovered: role.technologies,
                    roadmapContent: role.roadmap.map(r => ({
                        label: r.year,
                        title: "Strategic Learning Path",
                        description: r.content
                    })),
                    createdBy: admin._id,
                    isActive: true
                });
            });
        });

        for (const courseData of coursesToInsert) {
            // Check for duplicates before inserting
            const existing = await Course.findOne({ slug: courseData.slug });
            if (!existing) {
                await Course.create(courseData);
                console.log(`Successfully seeded: ${courseData.title}`);
            } else {
                console.log(`Skipping duplicate: ${courseData.title}`);
            }
        }

        console.log('Seeding completed successfully');
        process.exit();
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seedDB();
