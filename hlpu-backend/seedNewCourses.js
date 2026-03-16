const API_URL = 'http://localhost:5000/api';
const ADMIN_EMAIL = 'hlpuscholar@gmail.com';
const ADMIN_PASSWORD = 'admin123';

const courses = [
    {
        title: "Full Stack Web Development",
        summaryLine: "Become a proficient developer by mastering both frontend and backend technologies.",
        description: "This comprehensive course tracks your journey from HTML/CSS to advanced React, Node.js, and Cloud deployment. You will build production-ready applications, understand scalable architectures, and master DevOps fundamentals. Ideal for aspiring software engineers looking to build modern web ecosystems.",
        category: "Web Dev",
        skillsRequired: ["JavaScript (ES6+)", "React.js", "Node.js", "Express.js", "MongoDB", "PostgreSQL", "Docker", "AWS", "GitHub Actions", "Unit Testing"],
        jobRoles: ["Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "Web Architect", "SDE I"],
        topCompanies: ["Amazon", "Google", "Meta", "Flipkart", "Paytm", "Zomato"],
        eligibleYears: [1, 2, 3, 4],
        level: "intermediate",
        durationEstimate: "6 Months",
        isTrending: true
    },
    {
        title: "Data Structures & Algorithms Mastery",
        summaryLine: "Crank up your problem-solving skills for top-tier product company interviews.",
        description: "Focused on core algorithmic logic, this course covers everything from Arrays and Linked Lists to Dynamic Programming and Advanced Graph Algorithms. Learn to analyze time complexity and write optimized code that passes all test cases on LeetCode and Codeforces.",
        category: "Core Engineering",
        skillsRequired: ["C++", "Java", "Python", "Space Complexity Analysis", "Dynamic Programming", "Recursion", "Trees & Graphs", "Sorting Algorithms", "Systematic Debugging"],
        jobRoles: ["SDE I", "Member Technical Staff", "Competitive Programmer", "Technical Consultant"],
        topCompanies: ["Microsoft", "Adobe", "Directi", "Uber", "Oracle", "Goldman Sachs"],
        eligibleYears: [1, 2, 3],
        level: "advanced",
        durationEstimate: "4 Months",
        isTrending: true
    },
    {
        title: "Machine Learning Fundamentals",
        summaryLine: "Unlock the power of data by building intelligent predictive models.",
        description: "Dive deep into the mathematical foundations and practical implementations of supervised and unsupervised learning. From Linear Regression to Random Forests and Gradient Boosting, learn how to handle real-world datasets and deliver actionable insights using Python's ecosystem.",
        category: "AI & Data",
        skillsRequired: ["Python", "NumPy", "Pandas", "Matplotlib", "Scikit-Learn", "Statics", "Linear Algebra", "Data Cleaning", "Model Evaluation"],
        jobRoles: ["Data Scientist", "ML Engineer", "Data Analyst", "Research Assistant", "Business Intelligence Developer"],
        topCompanies: ["IBM", "Intel", "NVIDIA", "Tesla", "Infosys", "Wipro"],
        eligibleYears: [2, 3, 4],
        level: "intermediate",
        durationEstimate: "5 Months",
        isTrending: false
    },
    {
        title: "Generative AI Engineering",
        summaryLine: "Master Large Language Models and build the next generation of AI agents.",
        description: "The cutting edge of AI. Learn to work with GPT-4, Llama, and Diffusion models. Master prompt engineering, Fine-tuning, RAG (Retrieval Augmented Generation), and deploying AI agents that can solve complex real-world tasks. Stay ahead of the curve in the GenAI revolution.",
        category: "AI & Data",
        skillsRequired: ["OpenAI API", "Langchain", "Hugging Face", "Vector Databases", "PyTorch", "Prompt Engineering", "NLP", "Deployment"],
        jobRoles: ["AI Engineer", "GenAI Specialist", "NLP Engineer", "AI Product Manager"],
        topCompanies: ["OpenAI", "Anthropic", "Mistral AI", "Microsoft", "Google DeepMind"],
        eligibleYears: [3, 4],
        level: "advanced",
        durationEstimate: "4 Months",
        isTrending: true
    },
    {
        title: "Cloud Computing with AWS",
        summaryLine: "Design and deploy scalable, fault-tolerant systems in the cloud.",
        description: "Learn to architect highly available solutions using Amazon Web Services. Covers EC2, S3, Lambda, VPC, and CloudFormation. Understand the shared responsibility model and master the art of cost-effective cloud infrastructure management.",
        category: "Core Engineering",
        skillsRequired: ["AWS Management Console", "Terraform", "Cloud Security", "Serverless Architecture", "Identity & Access Management (IAM)", "Networking"],
        jobRoles: ["Cloud Architect", "Cloud Engineer", "Solutions Architect", "SysOps Administrator"],
        topCompanies: ["Amazon Web Services", "Accenture", "TCS", "Cognizant", "HCLTech"],
        eligibleYears: [3, 4],
        level: "intermediate",
        durationEstimate: "3 Months",
        isTrending: false
    },
    {
        title: "DevOps & CI/CD Pipeline",
        summaryLine: "Streamline software delivery with automation and reliable infrastructure.",
        description: "Bridge the gap between development and operations. Master Docker, Kubernetes, Jenkins, and Ansible. Learn to build automated pipelines that ensure zero-downtime deployments and high system reliability in high-stakes production environments.",
        category: "Core Engineering",
        skillsRequired: ["Docker", "Kubernetes", "Jenkins", "GitLab CI", "Ansible", "Linux Shell Scripting", "Monitoring (Prometheus/Grafana)", "Terraform"],
        jobRoles: ["DevOps Engineer", "Site Reliability Engineer (SRE)", "Build & Release Engineer", "Infrastructure Automation Engineer"],
        topCompanies: ["Red Hat", "Square", "Spotify", "Netflix", "Salesforce"],
        eligibleYears: [2, 3, 4],
        level: "advanced",
        durationEstimate: "5 Months",
        isTrending: false
    },
    {
        title: "Android App Development",
        summaryLine: "Create high-performance mobile applications for millions of users.",
        description: "Master modern Android development using Kotlin and Jetpack Compose. Learn dependency injection, MVVM architecture, and how to integrate third-party APIs. From UI design to publishing on Play Store, this course covers the full mobile lifecycle.",
        category: "Web Dev",
        skillsRequired: ["Kotlin", "Android Studio", "Jetpack Compose", "Coroutines", "Retrofit", "Firebase", "Room Database", "Material Design"],
        jobRoles: ["Mobile App Developer", "Android Engineer", "App Designer", "Product Engineer"],
        topCompanies: ["Swiggy", "Zomato", "Myntra", "PhonePe", "Snapchat", "WhatsApp"],
        eligibleYears: [1, 2, 3],
        level: "beginner",
        durationEstimate: "4 Months",
        isTrending: false
    },
    {
        title: "Cybersecurity Essentials",
        summaryLine: "Protect digital assets and defend against sophisticated cyber threats.",
        description: "Learn the fundamentals of network security, ethical hacking, and digital forensics. Understand common vulnerabilities like SQL Injection and XSS, and learn how to implement robust security protocols to safeguard sensitive data in an increasingly dangerous digital world.",
        category: "Core Engineering",
        skillsRequired: ["Networking Basics", "Ethical Hacking", "Cryptography", "Penetration Testing", "Security Auditing", "Kali Linux", "Wireshark", "Incidence Response"],
        jobRoles: ["Security Analyst", "Ethical Hacker", "Security Consultant", "Network Security Engineer", "SOC Analyst"],
        topCompanies: ["Cisco", "Palo Alto Networks", "CrowdStrike", "IBM Security", "Quick Heal"],
        eligibleYears: [1, 2, 3, 4],
        level: "beginner",
        durationEstimate: "6 Months",
        isTrending: false
    },
    {
        title: "Data Analytics with Python",
        summaryLine: "Transform raw data into meaningful business stories and visualizations.",
        description: "Master the tools used by professional data analysts. Learn complex SQL queries, advanced Excel techniques, and how to create interactive dashboards with Tableau and Power BI. Focus on storytelling with data and making data-driven business decisions.",
        category: "AI & Data",
        skillsRequired: ["SQL", "Excel", "Tableau", "Power BI", "Python (NumPy/Pandas)", "Data Storytelling", "Statistics", "A/B Testing"],
        jobRoles: ["Data Analyst", "Business Analyst", "Marketing Analyst", "Data Journalist", "Product Analyst"],
        topCompanies: ["Deloitte", "KPMG", "PwC", "EY", "BCG", "McKinsey"],
        eligibleYears: [1, 2, 3, 4],
        level: "beginner",
        durationEstimate: "3 Months",
        isTrending: false
    },
    {
        title: "System Design for Interviews",
        summaryLine: "Learn to architect massive-scale systems like Netflix and Uber.",
        description: "Essential for senior-level placements. Learn about load balancing, caching, sharding, microservices, and CAP theorem. Understand the trade-offs in building resilient, highly scalable distributed systems that can handle billions of request per day.",
        category: "Product & Design",
        skillsRequired: ["Scalability Concepts", "Load Balancing", "Caching (Redis/Memcached)", "Database Sharding", "Message Queues (Kafka/RabbitMQ)", "Microservices Architecture", "API Design"],
        jobRoles: ["Senior SDE", "Systems Architect", "Lead Engineer", "Technical Architect"],
        topCompanies: ["Facebook", "Netflix", "Google", "Amazon", "Uber", "Lyft"],
        eligibleYears: [3, 4],
        level: "advanced",
        durationEstimate: "2 Months",
        isTrending: true
    }
];

async function seed() {
    console.log('--- hLPU Course Seeding Engine ---\n');

    try {
        console.log(`Authenticating as ${ADMIN_EMAIL}...`);
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });

        const loginData = await loginRes.json();
        if (!loginData.token) {
            throw new Error('Authentication failed. Check your credentials.');
        }

        const token = loginData.token;
        console.log('Authentication Successful.\n');

        let createdCount = 0;
        const categories = new Set();
        const years = new Set();

        for (const course of courses) {
            // Generate Slack & Placeholder PDF
            const slug = course.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
            const courseData = {
                ...course,
                slug,
                roadmapPdfUrl: `/assets/sample-roadmaps/${slug}.pdf`,
                viewCount: Math.floor(Math.random() * 451) + 50,
                downloadCount: Math.floor(Math.random() * 191) + 10,
                isActive: true
            };

            console.log(`[SEED] Creating: ${course.title}...`);
            const res = await fetch(`${API_URL}/admin/courses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(courseData)
            });

            const result = await res.json();
            if (result.success) {
                console.log(`[OK] Created "${course.title}" successfully.`);
                createdCount++;
                categories.add(course.category);
                course.eligibleYears.forEach(y => years.add(y));
            } else {
                console.log(`[FAIL] Could not create "${course.title}": ${result.message}`);
            }
        }

        console.log('\n--- SEEDING COMPLETE ---');
        console.log(`Total Courses Created: ${createdCount}`);
        console.log(`Categories Covered: ${Array.from(categories).join(', ')}`);
        console.log(`Year Coverage: ${Array.from(years).sort().join(', ')}`);
        console.log('------------------------\n');

    } catch (err) {
        console.error('Fatal Seeding Error:', err.message);
    }
}

seed();
